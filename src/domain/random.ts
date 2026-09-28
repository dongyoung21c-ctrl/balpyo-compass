/** 0 이상 1 미만의 난수를 돌려주는 함수. 테스트에서 바꿔 끼운다. */
export type Rng = () => number;

export const defaultRng: Rng = Math.random;

export function pickOne<T>(items: readonly T[], rng: Rng = defaultRng): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(rng() * items.length)];
}

export function shuffle<T>(items: readonly T[], rng: Rng = defaultRng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

/** 주어진 값을 차례로 되풀이하는 가짜 난수 (테스트용) */
export function sequenceRng(values: readonly number[]): Rng {
  let i = 0;
  return () => values[i++ % values.length] ?? 0;
}
