import type { Method } from './types';

export interface RunStep {
  readonly title: string;
  readonly desc: string;
  readonly sec: number;
  /** 0이면 라운드와 상관없는 단계 */
  readonly round: number;
  readonly stepIndex: number;
}

/**
 * 방법의 단계를 실제 진행 순서로 펼친다.
 * 첫 반복 단계부터 마지막 반복 단계까지를 라운드 수만큼 되풀이하고,
 * 'between' 단계는 마지막 라운드 뒤에서 빠진다.
 */
export function buildSequence(method: Method, rounds: number, secs?: readonly number[]): RunStep[] {
  const steps = method.steps.map((s, i) => ({ title: s.title, desc: s.desc, sec: secs?.[i] ?? s.sec, repeat: s.repeat, stepIndex: i }));
  const first = steps.findIndex((s) => s.repeat !== 'once');
  const plain = (s: (typeof steps)[number], round: number): RunStep => ({ title: s.title, desc: s.desc, sec: s.sec, round, stepIndex: s.stepIndex });
  if (first < 0) return steps.map((s) => plain(s, 0));

  let last = steps.length - 1;
  while (steps[last]?.repeat === 'once') last--;

  const total = Math.max(1, Math.floor(rounds));
  const loop = steps.slice(first, last + 1);
  const repeated = Array.from({ length: total }, (_, r) => r + 1).flatMap((round) =>
    loop.filter((s) => !(s.repeat === 'between' && round === total)).map((s) => plain(s, round)),
  );
  return [
    ...steps.slice(0, first).map((s) => plain(s, 0)),
    ...repeated,
    ...steps.slice(last + 1).map((s) => plain(s, 0)),
  ];
}

export function totalSeconds(seq: readonly RunStep[]): number {
  return seq.reduce((sum, s) => sum + s.sec, 0);
}

export function hasRounds(method: Method): boolean {
  return method.steps.some((s) => s.repeat !== 'once');
}

/** 카드에 보여 줄 대략적인 소요 시간(분). 수동 단계뿐이면 method.minutes, 그것도 없으면 3분. */
export function estimateMinutes(method: Method): number {
  const secs = totalSeconds(buildSequence(method, method.rounds ?? 1));
  return Math.max(method.minutes ?? 0, Math.round(secs / 60)) || 3;
}
