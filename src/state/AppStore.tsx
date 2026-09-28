import { createContext, type ComponentChildren } from 'preact';
import { useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'preact/hooks';
import type { AppData, ClassRoom } from '../domain/types';
import { loadData, saveData, STORAGE_KEY, type KeyValueStore } from '../storage/repository';
import { parseAppData } from '../storage/schema';
import { appReducer, currentClass, mergeFromOtherTab, type AppAction } from './appReducer';

interface AppStore {
  readonly data: AppData;
  readonly current: ClassRoom | undefined;
  readonly dispatch: (a: AppAction) => void;
  /** 저장이 안 되는 상황을 알리는 문구. 없으면 undefined */
  readonly storageWarning: string | undefined;
  readonly migrated: boolean;
}

const StoreContext = createContext<AppStore | null>(null);

export function useAppStore(): AppStore {
  const s = useContext(StoreContext);
  if (!s) throw new Error('AppStoreProvider 안에서만 쓸 수 있어요');
  return s;
}

interface Props {
  readonly store: KeyValueStore | null;
  readonly children: ComponentChildren;
}

export function AppStoreProvider({ store, children }: Props) {
  const initial = useMemo(() => loadData(store), [store]);
  const [data, dispatch] = useReducer(appReducer, initial.data);
  const [saveFailed, setSaveFailed] = useState(false);
  const dataRef = useRef(data);
  dataRef.current = data;
  /** 마지막으로 저장했거나 다른 탭에서 받아 맞춘 값. 같으면 다시 저장하지 않는다(탭끼리 주고받기 방지). */
  const lastSynced = useRef<string | null>(null);

  useEffect(() => {
    if (initial.readOnly) return;
    const serialized = JSON.stringify(data);
    if (serialized === lastSynced.current) return;
    lastSynced.current = serialized;
    setSaveFailed(store !== null && !saveData(store, data));
  }, [data, store, initial.readOnly]);

  // 같은 컴퓨터에서 탭을 두 개 열었을 때 한쪽 기록이 덮어써지지 않도록 맞춘다
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || e.newValue === null) return;
      try {
        const next = parseAppData(JSON.parse(e.newValue));
        if (next) {
          const merged = mergeFromOtherTab(dataRef.current, next);
          lastSynced.current = JSON.stringify(merged);
          dispatch({ type: 'replaceAll', data: merged });
        }
      } catch {
        /* 다른 탭이 쓰다 만 값은 무시한다 */
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const stableDispatch = useCallback((a: AppAction) => dispatch(a), []);
  const warning = saveFailed ? '저장 공간이 부족해 기록을 저장하지 못했어요. 우리 반 탭에서 백업 파일을 내려받으세요.' : initial.warning;

  const value = useMemo<AppStore>(
    () => ({ data, current: currentClass(data), dispatch: stableDispatch, storageWarning: warning, migrated: initial.migrated }),
    [data, stableDispatch, warning, initial.migrated],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
