import { elapsedMs, STOPWATCH_ZERO, toggleStopwatch } from './stopwatch';

describe('stopwatch', () => {
  it('처음에는 0이고 흐르지 않는다', () => {
    expect(elapsedMs(STOPWATCH_ZERO, 99_000)).toBe(0);
  });

  it('흐르는 동안 시간이 쌓이고, 멈추면 그대로다', () => {
    const on = toggleStopwatch(STOPWATCH_ZERO, 1_000);
    expect(elapsedMs(on, 4_000)).toBe(3_000);
    const off = toggleStopwatch(on, 5_000);
    expect(off.running).toBe(false);
    expect(elapsedMs(off, 60_000)).toBe(4_000);
  });

  it('다시 켜면 이어서 센다', () => {
    const off = toggleStopwatch(toggleStopwatch(STOPWATCH_ZERO, 0), 2_000);
    const again = toggleStopwatch(off, 10_000);
    expect(elapsedMs(again, 11_000)).toBe(3_000);
  });
});
