/* 코드 리뷰에서 찾은 버그가 다시 생기지 않도록 붙잡아 두는 테스트 */
import { act, fireEvent, screen, within } from '@testing-library/preact';
import { vi } from 'vitest';
import { classStats, createClass, recordTalk } from './domain/classroom';
import { pickSpeaker } from './domain/picker';
import type { Recipe } from './domain/types';
import { appReducer, mergeFromOtherTab } from './state/appReducer';
import { loadData, STORAGE_KEY, UNREADABLE_PREFIX } from './storage/repository';
import { emptyData } from './storage/schema';
import { toBackupJson } from './storage/backup';
import { dataWithClass, renderApp, savedData, STUDENTS } from './test-utils';

vi.mock('./audio/sounds');

describe('저장된 데이터를 지킨다', () => {
  it('읽지 못한 값은 따로 옮겨 두고 새로 시작한다', () => {
    localStorage.setItem(STORAGE_KEY, '{broken');
    renderApp();
    const kept = Object.keys(localStorage).filter((k) => k.startsWith(UNREADABLE_PREFIX));
    expect(kept).toHaveLength(1);
    expect(localStorage.getItem(kept[0] as string)).toBe('{broken');
    expect(screen.getByRole('alert').textContent).toMatch(/따로 남겨 두었어요/);
  });

  it('더 새 버전이 저장한 데이터는 덮어쓰지 않는다', () => {
    const newer = JSON.stringify({ version: 3, classes: [{ id: 'x' }] });
    localStorage.setItem(STORAGE_KEY, newer);
    renderApp({ hash: '#/class' });
    fireEvent.click(screen.getByRole('button', { name: '예시 반으로 먼저 둘러보기' }));
    expect(localStorage.getItem(STORAGE_KEY)).toBe(newer);
    expect(screen.getAllByRole('alert')[0]?.textContent).toMatch(/더 새 버전/);
  });

  it('따로 옮겨 둘 수도 없으면 저장을 막는다', () => {
    const store = { getItem: () => 'not json', setItem: vi.fn(() => { throw new Error('full'); }) };
    expect(loadData(store)).toMatchObject({ readOnly: true });
  });
});

describe('다른 탭과 맞추기', () => {
  it('지금 보는 반은 그대로 두고 내용만 받는다', () => {
    const local = { ...dataWithClass(), classes: [...dataWithClass().classes, createClass('c2', '6-1')], currentClassId: 'c2' };
    const incoming = { ...local, currentClassId: 'c1', recipes: [] };
    expect(mergeFromOtherTab(local, incoming).currentClassId).toBe('c2');
    expect(mergeFromOtherTab(local, { ...incoming, classes: [createClass('c1', 'x')] }).currentClassId).toBe('c1');
  });

  it('다른 탭에서 반을 바꿔도 이 탭의 반과 릴레이 기록이 유지된다', () => {
    const data = { ...dataWithClass(), classes: [...dataWithClass().classes, createClass('c2', '6-1', ['하늘'])] };
    renderApp({ data, hash: '#/tools/relay' });
    fireEvent.click(screen.getByRole('button', { name: '가온' }));
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: JSON.stringify({ ...savedData(), currentClassId: 'c2' }) }));
    });
    expect((screen.getByLabelText('지금 수업하는 반') as HTMLSelectElement).value).toBe('c1');
    expect(screen.getByText(/1명 발표/)).toBeTruthy();
  });
});

describe('기록', () => {
  it('되돌리기는 기록한 반에 적용된다', () => {
    let d = appReducer(dataWithClass(), { type: 'addClass', id: 'c2', name: '6-1', students: ['가온'] });
    d = appReducer(appReducer(d, { type: 'selectClass', id: 'c1' }), { type: 'recordTalk', name: '가온', now: 1 });
    d = appReducer(d, { type: 'selectClass', id: 'c2' });
    d = appReducer(d, { type: 'undoTalk', classId: 'c1', name: '가온', prevLast: undefined });
    expect(d.classes[0]?.counts.가온).toBe(0);
    expect(d.classes[1]?.counts).toEqual({});
  });

  it('“constructor” 같은 이름도 횟수가 숫자로 쌓이고 공정 뽑기가 고르게 된다', () => {
    const c = recordTalk(createClass('c', 'c', ['constructor', 'toString']), 'constructor', 1);
    expect(c.counts.constructor).toBe(1);
    expect(classStats(c).rows.map((r) => r.count)).toEqual([0, 1]);
    expect(pickSpeaker(['constructor', 'toString'], {}, new Set(), true, () => 0.1)?.name).toBe('constructor');
  });

  it('같은 이름이 있으면 알려 준다', () => {
    renderApp({ data: emptyData(), hash: '#/class' });
    fireEvent.input(screen.getByLabelText(/학생 명단/), { target: { value: '김민준\n김민준\n이서연' } });
    expect(screen.getByText(/같은 이름이 있어요\(김민준\)/)).toBeTruthy();
  });

  it('백업을 불러오면 명단 편집 칸도 새 명단으로 바뀐다', async () => {
    renderApp({ data: dataWithClass(), hash: '#/class' });
    const backup = toBackupJson({ ...dataWithClass(), classes: [{ id: 'c1', name: '5-3', students: ['하늘', '바다'], counts: {}, last: {} }] });
    await act(async () => {
      fireEvent.change(document.querySelector('input[type=file]') as HTMLInputElement, { target: { files: [new File([backup], 'b.json')] } });
    });
    await screen.findByText(/반 1개/);
    fireEvent.click(screen.getByRole('button', { name: '바꾸기' }));
    expect((screen.getByLabelText(/학생 명단/) as HTMLTextAreaElement).value).toBe('하늘\n바다');
    expect(screen.getByRole('button', { name: '저장됨' })).toBeTruthy();
  });

  it('너무 큰 파일은 읽기 전에 거절한다', async () => {
    renderApp({ data: dataWithClass(), hash: '#/class' });
    const big = new File(['x'], 'big.json');
    Object.defineProperty(big, 'size', { value: 10 * 1024 * 1024 });
    const text = vi.spyOn(big, 'text');
    await act(async () => {
      fireEvent.change(document.querySelector('input[type=file]') as HTMLInputElement, { target: { files: [big] } });
    });
    expect(screen.getByText(/파일이 너무 커요/)).toBeTruthy();
    expect(text).not.toHaveBeenCalled();
  });
});

describe('진행·도구', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());
  const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

  it('마침 화면에서 스페이스를 눌러도 숨은 초시계가 다시 흐르지 않는다', async () => {
    const { playEnd } = await import('./audio/sounds');
    const recipe: Recipe = { id: 'r', name: 'r', methodId: 'tps', rounds: 1, secs: [60, 60, 60], autoNext: false, warn: false, sound: 'bell' };
    renderApp({ data: dataWithClass({ recipes: [recipe] }) });
    fireEvent.click(screen.getByRole('button', { name: '▶ 바로 진행' }));
    const board = screen.getByRole('dialog', { name: /진행$/ });
    fireEvent.click(within(board).getByRole('button', { name: /전체 나누기/ }));
    fireEvent.click(within(board).getByRole('button', { name: '마치기' }));
    fireEvent.keyDown(board, { key: ' ' });
    fireEvent.keyDown(board, { key: 'ArrowRight' });
    advance(120_000);
    expect(playEnd).not.toHaveBeenCalled();
    expect(within(board).getByText('활동을 모두 마쳤어요 👏')).toBeTruthy();
  });

  it('번개 박자에서 빠르기를 바꿔도 친구를 건너뛰지 않는다', () => {
    renderApp({ data: dataWithClass(), hash: '#/tools/beat' });
    const stage = screen.getByRole('tabpanel');
    fireEvent.click(within(stage).getByRole('button', { name: '시작' }));
    const slider = within(stage).getByRole('slider');
    for (const v of [101, 102, 103, 104, 105, 106]) fireEvent.input(slider, { target: { value: String(v) } });
    expect(within(stage).getByText(STUDENTS[0] as string)).toBeTruthy();
  });

  it('레시피 이름 칸에서 Enter를 누르면 진행이 아니라 저장된다', () => {
    renderApp({ hash: '#/catalog/tps' });
    fireEvent.click(screen.getByRole('button', { name: '▶ 초시계 맞추고 진행' }));
    const name = screen.getByLabelText('레시피 이름');
    fireEvent.input(name, { target: { value: '엔터 레시피' } });
    fireEvent.keyDown(name, { key: 'Enter' });
    expect(savedData().recipes[0]?.name).toBe('엔터 레시피');
    expect(screen.queryByRole('dialog', { name: /진행$/ })).toBeNull();
  });
});
