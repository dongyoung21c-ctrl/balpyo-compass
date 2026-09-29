import { act, fireEvent, screen, within } from '@testing-library/preact';
import { vi } from 'vitest';
import { renderApp, dataWithClass, savedData, STUDENTS } from '../../test-utils';
import { emptyData } from '../../storage/schema';

vi.mock('../../audio/sounds');

const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
const counts = () => savedData().classes[0]?.counts ?? {};
const stage = () => screen.getByRole('tabpanel');

describe('발표자 정하기 도구', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('명단이 없으면 우리 반 탭으로 안내한다', () => {
    renderApp({ data: emptyData(), hash: '#/tools/pick' });
    expect(screen.getByText('명단이 필요해요')).toBeTruthy();
    expect(screen.getByText(/아직 반이 없어요/)).toBeTruthy();
  });

  it('명단이 필요 없는 도구는 바로 쓸 수 있다', () => {
    renderApp({ data: emptyData(), hash: '#/tools/rps' });
    fireEvent.click(screen.getByRole('button', { name: '가위 바위 보!' }));
    advance(450 * 4);
    expect(within(stage()).getByText(/낸 친구 발표!/)).toBeTruthy();
  });

  it('공정 뽑기: 생각하는 시간 뒤 한 명을 뽑고 기록·되돌리기', () => {
    renderApp({ data: dataWithClass(), hash: '#/tools/pick' });
    fireEvent.click(within(stage()).getByRole('button', { name: '뽑기' }));
    expect(within(stage()).getByText('5')).toBeTruthy();
    advance(5_000 + 14 * 70 + 100);
    fireEvent.click(within(stage()).getByRole('button', { name: '발표함 ✓ 기록' }));
    expect(Object.values(counts())).toEqual([1]);
    expect(within(stage()).getByText(/이번 시간 1\/4명/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '되돌리기' }));
    expect(Object.values(counts())).toEqual([0]);
  });

  it('공정 뽑기: 모두 뽑히면 처음부터 다시 돌고, 비우기가 된다', () => {
    renderApp({ data: dataWithClass(), hash: '#/tools/pick' });
    fireEvent.change(within(stage()).getByLabelText(/생각하는 시간/), { target: { value: '0' } });
    const picked = new Set<string>();
    for (let i = 0; i < 4; i++) {
      fireEvent.click(within(stage()).getByRole('button', { name: '뽑기' }));
      advance(15 * 70 + 50);
      picked.add(within(stage()).getByText((_, el) => el?.classList.contains('huge') ?? false).textContent ?? '');
    }
    expect([...picked].sort()).toEqual([...STUDENTS].sort());
    fireEvent.click(within(stage()).getByRole('button', { name: '뽑기' }));
    advance(15 * 70 + 50);
    expect(within(stage()).getByText(/처음부터 다시 돌아요/)).toBeTruthy();
    fireEvent.click(within(stage()).getByRole('button', { name: '뽑힌 친구 비우기' }));
    expect(within(stage()).getByText('누가 발표할까요?')).toBeTruthy();
    fireEvent.click(within(stage()).getByLabelText('공정 모드'));
    expect(within(stage()).getByText(/모두 같은 확률로/)).toBeTruthy();
  });

  it('이웃을 사랑하십니까: 조건을 뽑고, 더하고, 지운다', () => {
    renderApp({ data: dataWithClass({ loveConditions: ['안경을 쓴 친구'] }), hash: '#/tools/love' });
    fireEvent.click(within(stage()).getByRole('button', { name: '조건 뽑기' }));
    expect(within(stage()).getAllByText('안경을 쓴 친구').length).toBe(2);
    fireEvent.input(within(stage()).getByLabelText('새 조건'), { target: { value: '수학을 좋아하는 친구' } });
    fireEvent.click(within(stage()).getByRole('button', { name: '추가' }));
    expect(savedData().loveConditions).toEqual(['안경을 쓴 친구', '수학을 좋아하는 친구']);
    fireEvent.click(within(stage()).getByRole('button', { name: '안경을 쓴 친구 삭제' }));
    expect(savedData().loveConditions).toEqual(['수학을 좋아하는 친구']);
  });

  it('발표 화살표: 시작 친구와 숫자를 정한다', () => {
    renderApp({ data: dataWithClass(), hash: '#/tools/arrow' });
    fireEvent.click(within(stage()).getByRole('button', { name: '시작 친구와 숫자 정하기' }));
    expect(within(stage()).getByText(/부터 시작!/)).toBeTruthy();
  });

  it('번개 박자: 네 박마다 다음 친구로 넘어간다', () => {
    renderApp({ data: dataWithClass(), hash: '#/tools/beat' });
    expect(within(stage()).getByText(STUDENTS[0] as string)).toBeTruthy();
    fireEvent.click(within(stage()).getByRole('button', { name: '시작' }));
    advance(600 * 4);
    expect(within(stage()).getByText(STUDENTS[1] as string)).toBeTruthy();
    fireEvent.click(within(stage()).getByRole('button', { name: '멈추기' }));
    fireEvent.click(within(stage()).getByRole('button', { name: '처음부터' }));
    expect(within(stage()).getByText(STUDENTS[0] as string)).toBeTruthy();
  });

  it('줄줄이·패스: 통과한 친구가 두 번째 바퀴에 발표한다', () => {
    renderApp({ data: dataWithClass(), hash: '#/tools/pass' });
    const talk = () => fireEvent.click(within(stage()).getByRole('button', { name: '발표 ✓' }));
    talk();
    fireEvent.click(within(stage()).getByRole('button', { name: '통과 (나중에)' }));
    talk();
    talk();
    expect(within(stage()).getByText('한 바퀴 끝! 통과한 친구 차례로 넘어가요')).toBeTruthy();
    fireEvent.click(within(stage()).getByRole('button', { name: '통과한 친구 시작' }));
    expect(within(stage()).getByText(STUDENTS[1] as string)).toBeTruthy();
    talk();
    expect(within(stage()).getByText('모두 끝났어요 👏')).toBeTruthy();
    expect(Object.values(counts()).reduce((a, b) => a + b, 0)).toBe(4);
    fireEvent.click(within(stage()).getByRole('button', { name: '처음부터' }));
    expect(within(stage()).getByText(STUDENTS[0] as string)).toBeTruthy();
  });

  it('릴레이: 부른 순서를 기록하고 마지막을 취소한다', () => {
    renderApp({ data: dataWithClass(), hash: '#/tools/relay' });
    fireEvent.click(within(stage()).getByRole('button', { name: '다솜' }));
    fireEvent.click(within(stage()).getByRole('button', { name: '가온' }));
    expect(counts()).toMatchObject({ 다솜: 1, 가온: 1 });
    expect(within(stage()).getByText(/2명 발표/)).toBeTruthy();
    fireEvent.click(within(stage()).getByRole('button', { name: '마지막 취소' }));
    expect(counts()).toMatchObject({ 다솜: 1, 가온: 0 });
    expect(savedData().classes[0]?.last.가온).toBeUndefined();
    fireEvent.click(within(stage()).getByRole('button', { name: '새 릴레이' }));
    expect(within(stage()).getByText('첫 발표자를 누르세요')).toBeTruthy();
  });

  it('모둠 편성: 모든 학생을 모둠에 넣는다', () => {
    renderApp({ data: dataWithClass(), hash: '#/tools/groups' });
    fireEvent.change(within(stage()).getByLabelText(/모둠 인원/), { target: { value: '2' } });
    fireEvent.click(within(stage()).getByRole('button', { name: '모둠 만들기' }));
    const groups = within(stage()).getAllByRole('listitem');
    expect(groups).toHaveLength(2);
    expect(within(stage()).getByRole('button', { name: '다시 섞기' })).toBeTruthy();
  });

  it('모둠 뽑기: 명단 없이 모둠 수만 골라 겹치지 않게 뽑는다', () => {
    renderApp({ data: emptyData(), hash: '#/tools/grouppick' });
    fireEvent.change(within(stage()).getByLabelText(/모둠 수/), { target: { value: '2' } });
    const draw = () => {
      fireEvent.click(within(stage()).getByRole('button', { name: '모둠 뽑기' }));
      advance(13 * 80 + 50);
      return within(stage()).getByText((_, el) => el?.classList.contains('huge') ?? false).textContent;
    };
    const first = draw();
    const second = draw();
    expect([first, second].sort()).toEqual(['1모둠', '2모둠']);
    expect(within(stage()).getByText(/2번째/)).toBeTruthy();
    draw();
    expect(within(stage()).getByText(/처음부터 다시 돌아요/)).toBeTruthy();
    fireEvent.click(within(stage()).getByRole('button', { name: '처음부터' }));
    expect(within(stage()).getByText('어느 모둠이 발표할까요?')).toBeTruthy();
    expect(within(stage()).queryByText(/번째/)).toBeNull();
  });

  it('모둠 뽑기: 모둠 편성에서 만든 모둠과 모둠원을 쓴다', () => {
    renderApp({ data: dataWithClass(), hash: '#/tools/groups' });
    fireEvent.change(within(stage()).getByLabelText(/모둠 인원/), { target: { value: '2' } });
    fireEvent.click(within(stage()).getByRole('button', { name: '모둠 만들기' }));
    fireEvent.click(screen.getByRole('tab', { name: /모둠 뽑기/ }));
    expect(within(stage()).getByText(/만든 2모둠 중에서/)).toBeTruthy();
    expect(within(stage()).queryByLabelText(/모둠 수/)).toBeNull();
    fireEvent.click(within(stage()).getByRole('button', { name: '모둠 뽑기' }));
    advance(13 * 80 + 50);
    const members = stage().querySelector('.members')?.textContent ?? '';
    expect(members.split(', ')).toHaveLength(2);
    expect(members.split(', ').every((n) => STUDENTS.includes(n))).toBe(true);
  });

  it('도구 탭을 누르면 주소가 바뀐다', () => {
    renderApp({ data: dataWithClass(), hash: '#/tools/pick' });
    fireEvent.click(screen.getByRole('tab', { name: /모둠 편성/ }));
    expect(window.location.hash).toBe('#/tools/groups');
  });
});
