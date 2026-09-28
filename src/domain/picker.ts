import { ownValue } from './classroom';
import { defaultRng, pickOne, type Rng } from './random';

export interface PickResult {
  readonly name: string;
  /** 이번 시간에 모두 한 번씩 뽑혀서 처음부터 다시 돌기 시작했는지 */
  readonly restarted: boolean;
}

/**
 * 발표자를 뽑는다.
 * fair가 켜져 있으면 이번 시간에 이미 뽑힌 학생은 빼고, 발표를 적게 한 학생일수록 잘 뽑힌다
 * (가중치 1/(1+횟수)²: 0회는 1, 1회는 1/4, 2회는 1/9).
 */
export function pickSpeaker(
  students: readonly string[],
  counts: Readonly<Record<string, number>>,
  alreadyPicked: ReadonlySet<string>,
  fair: boolean,
  rng: Rng = defaultRng,
): PickResult | null {
  if (students.length === 0) return null;
  if (!fair) return { name: pickOne(students, rng) as string, restarted: false };

  const remaining = students.filter((n) => !alreadyPicked.has(n));
  const restarted = remaining.length === 0;
  const pool = restarted ? students : remaining;
  const weights = pool.map((n) => 1 / (1 + (ownValue(counts, n) ?? 0)) ** 2);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i] as number;
    if (r < 0) return { name: pool[i] as string, restarted };
  }
  return { name: pool[pool.length - 1] as string, restarted };
}
