import { createContext, type ComponentChildren } from 'preact';
import { useCallback, useContext, useEffect, useMemo, useState } from 'preact/hooks';
import { ownValue } from '../domain/classroom';
import type { PassQueue } from '../domain/passQueue';
import { useToast } from '../ui/Toast';
import { useAppStore } from './AppStore';

export interface RelayEntry {
  readonly name: string;
  readonly classId: string;
  /** 되돌릴 때 쓰는, 기록 전 마지막 발표 시각 */
  readonly prevLast: number | undefined;
}

/**
 * 이번 수업 시간 동안만 기억하는 도구 상태. 반을 바꾸거나 새로고침하면 사라진다.
 * (발표 횟수처럼 남겨야 하는 것은 AppStore에 저장한다.)
 */
export interface ToolSession {
  readonly picked: ReadonlySet<string>;
  readonly relay: readonly RelayEntry[];
  readonly pass: PassQueue | null;
  readonly groups: readonly (readonly string[])[] | null;
  /** 모둠 뽑기에서 뽑힌 모둠 번호(1부터), 뽑힌 순서대로 */
  readonly groupPicks: readonly number[];
}

const EMPTY: ToolSession = { picked: new Set(), relay: [], pass: null, groups: null, groupPicks: [] };

interface SessionApi {
  readonly session: ToolSession;
  readonly update: (fn: (s: ToolSession) => ToolSession) => void;
}

const SessionContext = createContext<SessionApi | null>(null);

export function SessionProvider({ children }: { children: ComponentChildren }) {
  const { current } = useAppStore();
  const [session, setSession] = useState<ToolSession>(EMPTY);
  const classId = current?.id;
  const roster = current?.students.join('\n');

  useEffect(() => setSession(EMPTY), [classId, roster]);

  const update = useCallback((fn: (s: ToolSession) => ToolSession) => setSession(fn), []);
  const value = useMemo(() => ({ session, update }), [session, update]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionApi {
  const s = useContext(SessionContext);
  if (!s) throw new Error('SessionProvider 안에서만 쓸 수 있어요');
  return s;
}

/** 발표를 기록하고 "되돌리기"가 있는 알림을 띄운다. */
export function useRecordTalk(): (name: string) => void {
  const { current, dispatch } = useAppStore();
  const toast = useToast();
  return useCallback(
    (name: string) => {
      if (!current?.students.includes(name)) return;
      const prevLast = ownValue(current.last, name);
      const classId = current.id;
      dispatch({ type: 'recordTalk', name, now: Date.now() });
      toast(`${name} 발표 기록 ✓`, { label: '되돌리기', run: () => dispatch({ type: 'undoTalk', classId, name, prevLast }) });
    },
    [current, dispatch, toast],
  );
}
