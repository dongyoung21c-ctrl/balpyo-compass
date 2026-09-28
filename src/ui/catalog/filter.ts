import type { Burden, CategoryId, GroupForm, LessonStage, Method } from '../../domain/types';

export interface CatalogFilter {
  readonly q: string;
  readonly cat?: CategoryId;
  readonly group?: GroupForm;
  readonly stage?: LessonStage;
  /** 이 부담 이하만 */
  readonly maxBurden?: Burden;
}

export const EMPTY_FILTER: CatalogFilter = { q: '' };

/** 띄어쓰기·대소문자와 상관없이 찾는다. "짝 발표" → "짝발표" */
const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, '');

export function filterMethods(methods: readonly Method[], f: CatalogFilter): Method[] {
  const q = normalize(f.q);
  return methods.filter(
    (m) =>
      (!f.cat || m.cat === f.cat) &&
      (!f.group || m.group === f.group) &&
      (!f.stage || m.stages.includes(f.stage)) &&
      (!f.maxBurden || m.burden <= f.maxBurden) &&
      (!q || normalize(`${m.name} ${m.summary} ${m.steps.map((s) => s.title).join(' ')}`).includes(q)),
  );
}

export function isFiltered(f: CatalogFilter): boolean {
  return Boolean(f.q.trim() || f.cat || f.group || f.stage || f.maxBurden);
}
