import { act, fireEvent, screen } from '@testing-library/preact';
import { vi } from 'vitest';
import { playEnd, sfx } from '../../audio/sounds';
import { dataWithClass, renderApp } from '../../test-utils';

vi.mock('../../audio/sounds');

const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
const click = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const clock = () => screen.getByRole('timer').textContent;
const timerTab = () => screen.getByRole('link', { name: '타이머' });

describe('타이머 탭', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(playEnd).mockClear();
    vi.mocked(sfx.warn).mockClear();
  });
  afterEach(() => vi.useRealTimers());

  it('자주 쓰는 시간을 골라 시작하면 줄어들고, 끝나면 소리가 난다', () => {
    renderApp({ data: dataWithClass(), hash: '#/timer' });
    click('1분');
    click('▶ 시작');
    expect(clock()).toBe('1:00');
    advance(20_000);
    expect(clock()).toBe('0:40');
    advance(41_000);
    expect(clock()).toBe('시간 끝!');
    expect(playEnd).toHaveBeenCalledWith('bell');
    click('다시 시작');
    expect(clock()).toBe('1:00');
  });

  it('멈추고, 시간을 더하고 빼고, 다시 정할 수 있다', () => {
    renderApp({ data: dataWithClass(), hash: '#/timer' });
    click('3분');
    click('▶ 시작');
    click('일시정지');
    advance(10_000);
    expect(clock()).toBe('3:00');
    click('+1분');
    expect(clock()).toBe('4:00');
    click('−30초');
    expect(clock()).toBe('3:30');
    click('계속 ▶');
    advance(5_000);
    expect(clock()).toBe('3:25');
    click('시간 다시 정하기');
    expect(screen.getByRole('button', { name: '▶ 시작' })).toBeTruthy();
  });

  it('직접 입력한 시간을 쓰고, 잘못 쓰면 알려 준다', () => {
    renderApp({ data: dataWithClass(), hash: '#/timer' });
    const input = screen.getByLabelText('시간 직접 입력');
    fireEvent.input(input, { target: { value: '말도 안 됨' } });
    click('맞추기');
    expect(screen.getByRole('alert').textContent).toMatch(/분:초/);
    fireEvent.input(input, { target: { value: '2:30' } });
    click('맞추기');
    click('▶ 시작');
    expect(clock()).toBe('2:30');
  });

  it('30초 전 알림과 끝나는 소리를 바꿀 수 있다', () => {
    renderApp({ data: dataWithClass(), hash: '#/timer' });
    fireEvent.change(screen.getByLabelText(/끝나는 소리/), { target: { value: 'xylo' } });
    click('1분');
    click('▶ 시작');
    advance(31_000);
    expect(sfx.warn).toHaveBeenCalledTimes(1);
    advance(30_000);
    expect(playEnd).toHaveBeenCalledWith('xylo');
  });

  it('다른 탭에 가도 계속 흐르고, 메뉴에 남은 시간이 보인다', () => {
    renderApp({ data: dataWithClass(), hash: '#/timer' });
    click('1분');
    click('▶ 시작');
    fireEvent.click(screen.getByRole('link', { name: '추천받기' }));
    advance(15_000);
    expect(timerTab().textContent).toMatch(/0:45/);
    advance(46_000);
    expect(playEnd).toHaveBeenCalled();
    expect(timerTab().textContent).toMatch(/끝!/);
  });

  it('스톱워치 화면을 보고 있어도 흐르는 타이머 시간은 메뉴에 남는다', () => {
    renderApp({ data: dataWithClass(), hash: '#/timer' });
    click('1분');
    click('▶ 시작');
    click('스톱워치');
    advance(10_000);
    expect(timerTab().textContent).toMatch(/0:50/);
  });

  it('스톱워치: 올라가고, 멈추고, 이어 세고, 0으로 돌린다', () => {
    renderApp({ data: dataWithClass(), hash: '#/timer' });
    click('스톱워치');
    expect(clock()).toBe('0:00');
    click('▶ 시작');
    advance(65_000);
    expect(clock()).toBe('1:05');
    click('멈추기');
    advance(10_000);
    expect(clock()).toBe('1:05');
    click('계속 ▶');
    advance(5_000);
    expect(clock()).toBe('1:10');
    expect(timerTab().textContent).toMatch(/1:10/);
    click('멈추기');
    click('0으로');
    expect(clock()).toBe('0:00');
    expect(timerTab().textContent).not.toMatch(/\d:\d\d/);
  });
});
