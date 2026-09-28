import { act, fireEvent, screen, within } from '@testing-library/preact';
import { vi } from 'vitest';
import { playEnd, sfx } from '../../audio/sounds';
import type { Recipe } from '../../domain/types';
import { renderApp, dataWithClass, savedData } from '../../test-utils';
import { AUTO_NEXT_DELAY_MS } from './useRunner';

vi.mock('../../audio/sounds');

const recipe = (over: Partial<Recipe> = {}): Recipe => ({
  id: 'r1', name: 'TPS', methodId: 'tps', rounds: 1, secs: [60, 0, 30], autoNext: false, warn: true, sound: 'xylo', ...over,
});

function openBoard(r: Recipe) {
  renderApp({ data: dataWithClass({ recipes: [r] }) });
  fireEvent.click(screen.getByRole('button', { name: '▶ 바로 진행' }));
  return screen.getByRole('dialog', { name: /진행$/ });
}

const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

describe('진행 화면', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('시간이 흐르고, 30초 전 알림과 종료음이 울린다', () => {
    const board = openBoard(recipe());
    const clock = () => within(board).getByRole('timer').textContent;
    expect(clock()).toBe('1:00');
    advance(31_000);
    expect(sfx.warn).toHaveBeenCalledTimes(1);
    advance(30_000);
    expect(clock()).toBe('시간 끝!');
    expect(playEnd).toHaveBeenCalledWith('xylo');
    // 자동 넘김이 꺼져 있으면 그대로 머문다
    advance(AUTO_NEXT_DELAY_MS * 2);
    expect(within(board).getByRole('heading').textContent).toBe('혼자 생각하기');
  });

  it('자동 넘김이 켜져 있으면 다음 단계로 간다', () => {
    const board = openBoard(recipe({ autoNext: true }));
    advance(61_000 + AUTO_NEXT_DELAY_MS);
    expect(within(board).getByRole('heading').textContent).toBe('짝과 나누기');
    expect(within(board).getByText('준비되면 다음으로')).toBeTruthy();
  });

  it('멈춤·계속, 시간 더하기·빼기', () => {
    const board = openBoard(recipe());
    fireEvent.click(within(board).getByRole('button', { name: '일시정지' }));
    advance(20_000);
    expect(within(board).getByRole('timer').textContent).toBe('1:00');
    fireEvent.click(within(board).getByRole('button', { name: '계속 ▶' }));
    fireEvent.click(within(board).getByRole('button', { name: '+1분' }));
    expect(within(board).getByRole('timer').textContent).toBe('2:00');
    fireEvent.click(within(board).getByRole('button', { name: '−30초' }));
    advance(400);
    expect(within(board).getByRole('timer').textContent).toBe('1:30');
  });

  it('키보드로 조작하고, 마지막 단계 뒤에는 마침 화면이 나온다', () => {
    const board = openBoard(recipe());
    fireEvent.keyDown(board, { key: ' ' });
    expect(within(board).getByRole('button', { name: '계속 ▶' })).toBeTruthy();
    fireEvent.keyDown(board, { key: 'ArrowRight' });
    fireEvent.keyDown(board, { key: 'ArrowRight' });
    expect(within(board).getByRole('heading').textContent).toBe('전체 나누기');
    fireEvent.keyDown(board, { key: 'ArrowLeft' });
    expect(within(board).getByRole('heading').textContent).toBe('짝과 나누기');
    fireEvent.click(within(board).getByRole('button', { name: /전체 나누기/ }));
    fireEvent.click(within(board).getByRole('button', { name: '마치기' }));
    expect(within(board).getByText('활동을 모두 마쳤어요 👏')).toBeTruthy();
    fireEvent.click(within(board).getByRole('button', { name: '처음부터 다시' }));
    expect(within(board).getByRole('heading').textContent).toBe('혼자 생각하기');
  });

  it('Esc는 끝낼지 묻고, 계속 진행을 누르면 남는다', () => {
    const board = openBoard(recipe());
    fireEvent.keyDown(board, { key: 'Escape' });
    expect(within(board).getByText('진행을 끝낼까요?')).toBeTruthy();
    fireEvent.click(within(board).getByRole('button', { name: '계속 진행' }));
    fireEvent.click(within(board).getByRole('button', { name: '끝내기 ✕' }));
    fireEvent.click(within(board).getByRole('button', { name: '끝내기' }));
    expect(screen.queryByRole('dialog', { name: /진행$/ })).toBeNull();
    expect(document.body.classList.contains('board-open')).toBe(false);
  });

  it('진행 중에 발표자를 뽑아 기록한다', () => {
    const board = openBoard(recipe());
    fireEvent.click(within(board).getByRole('button', { name: '발표자 뽑기' }));
    advance(2_000);
    const layer = within(board).getByRole('dialog', { name: '발표자 뽑기' });
    fireEvent.click(within(layer).getByRole('button', { name: '발표함 ✓ 기록' }));
    expect(Object.values(savedData().classes[0]?.counts ?? {})).toEqual([1]);
    expect(within(layer).getByRole('button', { name: '기록했어요' })).toBeTruthy();
    fireEvent.click(within(layer).getByRole('button', { name: '다시 뽑기' }));
    advance(2_000);
    fireEvent.keyDown(board, { key: 'Escape' });
    expect(within(board).queryByRole('dialog', { name: '발표자 뽑기' })).toBeNull();
  });
});
