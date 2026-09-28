import { findMethod } from '../data/methods';
import { DEFAULT_LOVE_CONDITIONS } from '../data/labels';
import { clampStep } from '../domain/time';
import type { AppData, ClassRoom, Recipe, SoundId } from '../domain/types';

export const MAX_ROUNDS = 12;
const SOUND_IDS: readonly SoundId[] = ['bell', 'dingdong', 'xylo', 'none'];
const MAX_NAME = 60;

export function emptyData(): AppData {
  return { version: 2, classes: [], currentClassId: null, recipes: [], loveConditions: [...DEFAULT_LOVE_CONDITIONS] };
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, max = MAX_NAME): string | null =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;
const strList = (v: unknown): string[] =>
  Array.isArray(v) ? [...new Set(v.map((x) => str(x)).filter((x): x is string => x !== null))] : [];

function numRecord(v: unknown, keys: readonly string[]): Record<string, number> {
  if (!isObj(v)) return {};
  return Object.fromEntries(
    keys.flatMap((k) => {
      const n = v[k];
      return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? [[k, Math.floor(n)]] : [];
    }),
  );
}

export function parseClass(v: unknown): ClassRoom | null {
  if (!isObj(v)) return null;
  const id = str(v.id);
  const name = str(v.name);
  if (!id || !name) return null;
  const students = strList(v.students);
  return { id, name, students, counts: numRecord(v.counts, students), last: numRecord(v.last, students) };
}

/** 새 형식(methodId)과 프로토타입 형식(mid)을 모두 읽는다. */
export function parseRecipe(v: unknown): Recipe | null {
  if (!isObj(v)) return null;
  const id = str(v.id);
  const name = str(v.name);
  const methodId = str(v.methodId) ?? str(v.mid);
  const method = methodId ? findMethod(methodId) : undefined;
  if (!id || !name || !method || !Array.isArray(v.secs)) return null;
  const secs = method.steps.map((s, i) => {
    const n = (v.secs as unknown[])[i];
    return typeof n === 'number' && Number.isFinite(n) ? clampStep(n) : s.sec;
  });
  const rounds = typeof v.rounds === 'number' ? Math.max(1, Math.min(MAX_ROUNDS, Math.round(v.rounds))) : method.rounds ?? 1;
  const sound = SOUND_IDS.includes(v.sound as SoundId) ? (v.sound as SoundId) : 'bell';
  return { id, name, methodId: method.id, rounds, secs, autoNext: v.autoNext === true, warn: v.warn !== false, sound };
}

/** 저장소나 백업 파일에서 읽은 값을 검증한다. 잘못된 항목은 버리고, 형식 자체가 틀리면 null. */
export function parseAppData(v: unknown): AppData | null {
  if (!isObj(v) || v.version !== 2 || !Array.isArray(v.classes)) return null;
  const classes = uniqueById(v.classes.map(parseClass).filter((c): c is ClassRoom => c !== null));
  const recipes = uniqueById(Array.isArray(v.recipes) ? v.recipes.map(parseRecipe).filter((r): r is Recipe => r !== null) : []);
  const love = strList(v.loveConditions);
  const cur = typeof v.currentClassId === 'string' && classes.some((c) => c.id === v.currentClassId) ? v.currentClassId : null;
  return {
    version: 2,
    classes,
    currentClassId: cur ?? classes[0]?.id ?? null,
    recipes,
    loveConditions: Array.isArray(v.loveConditions) ? love : [...DEFAULT_LOVE_CONDITIONS],
  };
}

function uniqueById<T extends { id: string }>(items: readonly T[]): T[] {
  const seen = new Set<string>();
  return items.filter((x) => !seen.has(x.id) && seen.add(x.id));
}
