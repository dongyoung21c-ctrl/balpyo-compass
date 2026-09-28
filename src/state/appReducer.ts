import { adjustCount, createClass, recordTalk, renameClass, resetCounts, setStudents } from '../domain/classroom';
import type { AppData, ClassRoom, Recipe } from '../domain/types';

export type AppAction =
  | { type: 'selectClass'; id: string }
  | { type: 'addClass'; id: string; name: string; students: readonly string[] }
  | { type: 'updateClass'; id: string; name: string; students: readonly string[] }
  | { type: 'deleteClass'; id: string }
  | { type: 'recordTalk'; name: string; now: number }
  /** 방금 한 기록을 되돌린다. prevLast는 기록 전 마지막 발표 시각 */
  | { type: 'undoTalk'; classId: string; name: string; prevLast: number | undefined }
  | { type: 'adjustCount'; name: string; delta: number }
  | { type: 'resetCounts' }
  | { type: 'saveRecipe'; recipe: Recipe }
  | { type: 'deleteRecipe'; id: string }
  | { type: 'setLoveConditions'; list: readonly string[] }
  | { type: 'replaceAll'; data: AppData };

export function currentClass(data: AppData): ClassRoom | undefined {
  return data.classes.find((c) => c.id === data.currentClassId) ?? data.classes[0];
}

function mapClass(data: AppData, id: string, fn: (c: ClassRoom) => ClassRoom): AppData {
  return { ...data, classes: data.classes.map((c) => (c.id === id ? fn(c) : c)) };
}

function mapCurrent(data: AppData, fn: (c: ClassRoom) => ClassRoom): AppData {
  const cur = currentClass(data);
  return cur ? mapClass(data, cur.id, fn) : data;
}

/**
 * 다른 탭에서 저장한 데이터를 받아들인다. 지금 보고 있는 반은 탭마다 따로라서,
 * 그 반이 아직 있으면 그대로 둔다(다른 탭에서 반을 바꿔도 진행 중인 도구가 초기화되지 않게).
 */
export function mergeFromOtherTab(local: AppData, incoming: AppData): AppData {
  const keep = incoming.classes.some((c) => c.id === local.currentClassId);
  return keep ? { ...incoming, currentClassId: local.currentClassId } : incoming;
}

export function appReducer(data: AppData, action: AppAction): AppData {
  switch (action.type) {
    case 'selectClass':
      return data.classes.some((c) => c.id === action.id) ? { ...data, currentClassId: action.id } : data;
    case 'addClass':
      return {
        ...data,
        classes: [...data.classes, createClass(action.id, action.name.trim() || '새 반', action.students)],
        currentClassId: action.id,
      };
    case 'updateClass':
      return {
        ...data,
        classes: data.classes.map((c) => (c.id === action.id ? setStudents(renameClass(c, action.name), action.students) : c)),
      };
    case 'deleteClass': {
      const classes = data.classes.filter((c) => c.id !== action.id);
      const currentClassId = data.currentClassId === action.id ? classes[0]?.id ?? null : data.currentClassId;
      return { ...data, classes, currentClassId };
    }
    case 'recordTalk':
      return mapCurrent(data, (c) => (c.students.includes(action.name) ? recordTalk(c, action.name, action.now) : c));
    case 'undoTalk':
      return mapClass(data, action.classId, (c) => {
        const lowered = adjustCount(c, action.name, -1);
        const { [action.name]: _dropped, ...rest } = lowered.last;
        return { ...lowered, last: action.prevLast === undefined ? rest : { ...rest, [action.name]: action.prevLast } };
      });
    case 'adjustCount':
      return mapCurrent(data, (c) => adjustCount(c, action.name, action.delta));
    case 'resetCounts':
      return mapCurrent(data, resetCounts);
    case 'saveRecipe': {
      const exists = data.recipes.some((r) => r.id === action.recipe.id);
      const recipes = exists
        ? data.recipes.map((r) => (r.id === action.recipe.id ? action.recipe : r))
        : [...data.recipes, action.recipe];
      return { ...data, recipes };
    }
    case 'deleteRecipe':
      return { ...data, recipes: data.recipes.filter((r) => r.id !== action.id) };
    case 'setLoveConditions':
      return { ...data, loveConditions: [...action.list] };
    case 'replaceAll':
      return action.data;
  }
}

export function newId(prefix: string, now: number = Date.now()): string {
  return `${prefix}${now.toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
