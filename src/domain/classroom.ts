import type { ClassRoom } from './types';

/** 기록에서 이름으로 값을 읽는다. "constructor" 같은 이름이 Object.prototype 값을 읽지 않게 한다. */
export function ownValue(rec: Readonly<Record<string, number>>, name: string): number | undefined {
  return Object.hasOwn(rec, name) ? rec[name] : undefined;
}

export function createClass(id: string, name: string, students: readonly string[] = []): ClassRoom {
  return { id, name, students: [...students], counts: {}, last: {} };
}

export function recordTalk(c: ClassRoom, name: string, now: number): ClassRoom {
  return {
    ...c,
    counts: { ...c.counts, [name]: (ownValue(c.counts, name) ?? 0) + 1 },
    last: { ...c.last, [name]: now },
  };
}

/** 발표 횟수를 직접 고친다(0 아래로는 내려가지 않는다). */
export function adjustCount(c: ClassRoom, name: string, delta: number): ClassRoom {
  const next = Math.max(0, (ownValue(c.counts, name) ?? 0) + delta);
  return { ...c, counts: { ...c.counts, [name]: next } };
}

/** 명단을 바꾼다. 남아 있는 학생의 기록은 그대로 두고, 빠진 학생의 기록은 지운다. */
export function setStudents(c: ClassRoom, students: readonly string[]): ClassRoom {
  const keep = <T>(rec: Readonly<Record<string, T>>) =>
    Object.fromEntries(Object.entries(rec).filter(([n]) => students.includes(n)));
  return { ...c, students: [...students], counts: keep(c.counts), last: keep(c.last) };
}

export function renameClass(c: ClassRoom, name: string): ClassRoom {
  const trimmed = name.trim();
  return trimmed ? { ...c, name: trimmed } : c;
}

export function resetCounts(c: ClassRoom): ClassRoom {
  return { ...c, counts: {}, last: {} };
}

export interface ClassStats {
  readonly total: number;
  readonly neverSpoke: number;
  readonly average: number;
  readonly max: number;
  /** 적게 발표한 순서. 같으면 마지막 발표가 오래된 순서. */
  readonly rows: readonly { readonly name: string; readonly count: number }[];
}

export function classStats(c: ClassRoom): ClassStats {
  const rows = c.students
    .map((name) => ({ name, count: ownValue(c.counts, name) ?? 0, last: ownValue(c.last, name) ?? 0 }))
    .sort((a, b) => a.count - b.count || a.last - b.last)
    .map(({ name, count }) => ({ name, count }));
  const total = rows.reduce((a, r) => a + r.count, 0);
  return {
    total,
    neverSpoke: rows.filter((r) => r.count === 0).length,
    average: rows.length ? total / rows.length : 0,
    max: Math.max(1, ...rows.map((r) => r.count)),
    rows,
  };
}
