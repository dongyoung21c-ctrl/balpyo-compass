import type { AppData } from '../domain/types';
import { emptyData, parseAppData, parseClass, parseRecipe } from './schema';

export const STORAGE_KEY = 'balpyo-compass/v2';
const LEGACY_PREFIX = 'bn.';

/** localStorage와 같은 모양. 테스트에서 바꿔 끼운다. */
export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>;

export interface LoadResult {
  readonly data: AppData;
  /** 프로토타입에서 옮겨 온 데이터가 있었는지 */
  readonly migrated: boolean;
  /** 저장소를 읽지 못했거나 망가져 있었을 때의 안내 */
  readonly warning?: string;
  /** true면 저장하지 않는다(더 새 버전이 쓴 데이터나 옮겨 두지 못한 데이터를 지키기 위해). */
  readonly readOnly?: boolean;
}

/** 읽지 못한 원래 값을 따로 남겨 두는 키 접두어 */
export const UNREADABLE_PREFIX = `${STORAGE_KEY}.unreadable-`;
const UNREADABLE_WARNING = '저장된 데이터를 읽지 못해 새로 시작해요. 원래 데이터는 브라우저에 따로 남겨 두었어요. 백업 파일이 있다면 불러오세요.';

function readJson(store: KeyValueStore, key: string): unknown {
  const raw = store.getItem(key);
  return raw === null ? undefined : JSON.parse(raw);
}

/** 프로토타입이 처음 넣어 둔 예시 명단. 선생님이 명단을 바꿨다면 예시가 아니므로 옮긴다. */
const PROTOTYPE_SAMPLE_ROSTERS: readonly string[] = [
  '김민준 이서연 박도윤 최하윤 정시우 강지아 조하준 윤서아 장은우 임지유 한예준 오수아 서지호 신채원 권유준 황다은 안주원 송하린 전건우 홍예린 문우진 양소율 배시윤 백나은',
  '강서준 김나윤 남도현 류시은 박준서 서하은 오민재 유채아 이재윤 전소윤 정유찬 최지안 한서우 황예나',
];

const isPrototypeSampleClass = (v: unknown): boolean => {
  const c = v as { name?: unknown; students?: unknown };
  return typeof v === 'object' && v !== null && String(c.name).endsWith('(예시)') &&
    Array.isArray(c.students) && PROTOTYPE_SAMPLE_ROSTERS.includes(c.students.join(' '));
};

const isPrototypeSampleRecipe = (v: unknown): boolean =>
  typeof v === 'object' && v !== null && (v as { id?: unknown }).id === 'r1' &&
  String((v as { name?: unknown }).name).endsWith('(예시)');

export function migrateLegacy(store: KeyValueStore): AppData | null {
  const classesRaw = readJson(store, `${LEGACY_PREFIX}classes`);
  const recipesRaw = readJson(store, `${LEGACY_PREFIX}recipes`);
  const loveRaw = readJson(store, `${LEGACY_PREFIX}love`);
  const curRaw = readJson(store, `${LEGACY_PREFIX}cur`);
  if (classesRaw === undefined && recipesRaw === undefined && loveRaw === undefined) return null;

  const classes = Array.isArray(classesRaw)
    ? classesRaw.filter((c) => !isPrototypeSampleClass(c)).map(parseClass).filter((c) => c !== null)
    : [];
  const recipes = Array.isArray(recipesRaw)
    ? recipesRaw.filter((r) => !isPrototypeSampleRecipe(r)).map(parseRecipe).filter((r) => r !== null)
    : [];
  return parseAppData({
    ...emptyData(),
    classes,
    recipes,
    currentClassId: curRaw,
    ...(Array.isArray(loveRaw) ? { loveConditions: loveRaw } : {}),
  });
}

export function loadData(store: KeyValueStore | null): LoadResult {
  if (!store) {
    return { data: emptyData(), migrated: false, warning: '이 브라우저에서는 저장할 수 없어요. 창을 닫으면 명단과 기록이 사라져요.' };
  }
  const raw = safeGet(store, STORAGE_KEY);
  if (raw !== null) {
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      return keepUnreadable(store, raw);
    }
    const parsed = parseAppData(value);
    if (parsed) return { data: parsed, migrated: false };
    const version = (value as { version?: unknown } | null)?.version;
    if (typeof version === 'number' && version > 2) {
      return {
        data: emptyData(),
        migrated: false,
        readOnly: true,
        warning: '더 새 버전의 발표나침반이 저장한 데이터예요. 기록을 지키려고 이 화면에서는 저장하지 않아요. 최신 버전을 열어 주세요.',
      };
    }
    return keepUnreadable(store, raw);
  }
  try {
    const legacy = migrateLegacy(store);
    if (legacy) return { data: legacy, migrated: legacy.classes.length > 0 || legacy.recipes.length > 0 };
  } catch {
    /* 프로토타입 데이터가 망가졌으면 옮기지 않고 새로 시작한다 */
  }
  return { data: emptyData(), migrated: false };
}

function safeGet(store: KeyValueStore, key: string): string | null {
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

/** 읽지 못한 값을 다른 키에 옮겨 두고 새로 시작한다. 옮기지 못하면 덮어쓰지 않도록 저장을 막는다. */
function keepUnreadable(store: KeyValueStore, raw: string): LoadResult {
  try {
    store.setItem(`${UNREADABLE_PREFIX}${Date.now()}`, raw);
    return { data: emptyData(), migrated: false, warning: UNREADABLE_WARNING };
  } catch {
    return { data: emptyData(), migrated: false, readOnly: true, warning: '저장된 데이터를 읽지 못했어요. 원래 데이터를 지키려고 이 화면에서는 저장하지 않아요.' };
  }
}

/** 저장에 성공하면 true. 저장 공간이 꽉 찼거나 막혀 있으면 false. */
export function saveData(store: KeyValueStore | null, data: AppData): boolean {
  if (!store) return false;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

/** localStorage에 접근할 수 없는 환경(일부 사생활 보호 모드)에서는 null */
export function browserStore(): KeyValueStore | null {
  try {
    const s = window.localStorage;
    const probe = `${STORAGE_KEY}/probe`;
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}
