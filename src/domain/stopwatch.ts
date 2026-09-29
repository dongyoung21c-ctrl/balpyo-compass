/** 0부터 올라가는 초시계(스톱워치). 멈췄다 이어 셀 수 있다. */
export interface Stopwatch {
  readonly running: boolean;
  /** 지금까지 멈춰 둔 구간까지 쌓인 시간 */
  readonly baseMs: number;
  /** running일 때만 의미가 있다 */
  readonly startedAt: number;
}

export const STOPWATCH_ZERO: Stopwatch = { running: false, baseMs: 0, startedAt: 0 };

export function elapsedMs(s: Stopwatch, now: number): number {
  return s.running ? s.baseMs + Math.max(0, now - s.startedAt) : s.baseMs;
}

/** 흐르면 멈추고, 멈췄으면 이어서 흐른다. */
export function toggleStopwatch(s: Stopwatch, now: number): Stopwatch {
  return s.running
    ? { running: false, baseMs: elapsedMs(s, now), startedAt: 0 }
    : { running: true, baseMs: s.baseMs, startedAt: now };
}
