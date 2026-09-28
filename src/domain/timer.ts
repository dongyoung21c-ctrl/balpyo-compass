import type { RunStep } from './sequence';

/** 끝나기 몇 ms 전에 알릴지 */
export const WARN_BEFORE_MS = 30_000;
/** 이보다 짧은 단계는 미리 알림을 하지 않는다 */
const WARN_MIN_DURATION_MS = 45_000;
const MIN_REMAINING_MS = 1_000;

export type TimerStatus = 'manual' | 'running' | 'paused' | 'finished';

export interface TimerState {
  readonly index: number;
  readonly status: TimerStatus;
  readonly durationMs: number;
  readonly remainingMs: number;
  /** running일 때만 의미가 있다 */
  readonly endsAt: number;
  readonly warned: boolean;
}

export type TimerEvent = 'warn' | 'finish';

export function enterStep(seq: readonly RunStep[], index: number, now: number): TimerState {
  const i = Math.max(0, Math.min(seq.length - 1, index));
  const ms = (seq[i]?.sec ?? 0) * 1000;
  return {
    index: i,
    status: ms > 0 ? 'running' : 'manual',
    durationMs: ms,
    remainingMs: ms,
    endsAt: now + ms,
    warned: false,
  };
}

export function tick(state: TimerState, now: number, warnEnabled: boolean): { state: TimerState; events: TimerEvent[] } {
  if (state.status !== 'running') return { state, events: [] };
  const remainingMs = Math.max(0, state.endsAt - now);
  const events: TimerEvent[] = [];
  let warned = state.warned;
  if (warnEnabled && !warned && remainingMs > 0 && remainingMs <= WARN_BEFORE_MS && state.durationMs > WARN_MIN_DURATION_MS) {
    warned = true;
    events.push('warn');
  }
  if (remainingMs === 0) {
    events.push('finish');
    return { state: { ...state, remainingMs, warned, status: 'finished' }, events };
  }
  return { state: { ...state, remainingMs, warned }, events };
}

export function pause(state: TimerState, now: number): TimerState {
  if (state.status !== 'running') return state;
  return { ...state, status: 'paused', remainingMs: Math.max(0, state.endsAt - now) };
}

export function resume(state: TimerState, now: number): TimerState {
  if (state.status !== 'paused') return state;
  return { ...state, status: 'running', endsAt: now + state.remainingMs };
}

/** 남은 시간을 늘리거나 줄인다. 끝난 단계에 시간을 더하면 다시 흐른다. */
export function addTime(state: TimerState, deltaMs: number, now: number): TimerState {
  if (state.status === 'manual') return state;
  const base = state.status === 'running' ? Math.max(0, state.endsAt - now) : state.remainingMs;
  const remainingMs = Math.max(MIN_REMAINING_MS, base + deltaMs);
  const status = state.status === 'finished' ? 'running' : state.status;
  return {
    ...state,
    status,
    remainingMs,
    durationMs: Math.max(state.durationMs, remainingMs),
    endsAt: now + remainingMs,
    warned: remainingMs > WARN_BEFORE_MS ? false : state.warned,
  };
}

/** 0~1 진행률 */
export function progress(state: TimerState): number {
  if (state.durationMs <= 0) return 0;
  return Math.min(1, Math.max(0, 1 - state.remainingMs / state.durationMs));
}
