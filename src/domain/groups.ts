import { defaultRng, shuffle, type Rng } from './random';

/**
 * 학생을 무작위로 섞어 모둠을 만든다. 모둠 인원 차이는 최대 1명.
 * 모둠 수는 (학생 수 ÷ 모둠 인원)을 내림한 값이라, 남는 학생은 한 명씩 다른 모둠에 더 들어간다.
 * 예) 25명, 4명씩 → 6모둠(5·4·4·4·4·4) / 25명, 2명씩 → 12모둠(3·2·…·2), 혼자 남는 학생이 없다.
 */
export function makeGroups(students: readonly string[], size: number, rng: Rng = defaultRng): string[][] {
  if (students.length === 0) return [];
  const count = Math.max(1, Math.floor(students.length / Math.max(1, size)));
  const groups: string[][] = Array.from({ length: count }, () => []);
  shuffle(students, rng).forEach((name, i) => groups[i % count]?.push(name));
  return groups;
}
