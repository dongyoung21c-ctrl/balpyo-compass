import { defaultRng, pickOne, type Rng } from './random';

/**
 * 발표할 모둠을 하나 뽑는다. 모둠 번호는 1부터 센다.
 * noRepeat이면 이번 시간에 이미 뽑힌 모둠은 빼고 뽑고, 모두 뽑혔으면 처음부터 다시 돈다.
 */
export function pickGroup(
  count: number,
  picked: readonly number[],
  noRepeat: boolean,
  rng: Rng = defaultRng,
): { group: number; restarted: boolean } | null {
  if (count < 1) return null;
  const all = Array.from({ length: count }, (_, i) => i + 1);
  const left = noRepeat ? all.filter((g) => !picked.includes(g)) : all;
  const restarted = left.length === 0;
  const group = pickOne(restarted ? all : left, rng);
  return group === undefined ? null : { group, restarted };
}
