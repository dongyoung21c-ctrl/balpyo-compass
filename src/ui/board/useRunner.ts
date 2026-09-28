import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { playEnd, sfx } from '../../audio/sounds';
import type { RunStep } from '../../domain/sequence';
import { addTime as addTimeTo, enterStep, pause, resume, tick, type TimerState } from '../../domain/timer';
import type { RunConfig } from '../../domain/types';

const TICK_MS = 200;
/** 시간이 끝나고 자동으로 다음 단계로 넘어가기까지 기다리는 시간 */
export const AUTO_NEXT_DELAY_MS = 1800;

export interface Runner {
  readonly timer: TimerState;
  readonly ended: boolean;
  readonly go: (index: number) => void;
  readonly next: () => void;
  readonly prev: () => void;
  /** 흐르면 멈추고, 멈췄으면 흐르고, 끝났거나 수동 단계면 다음으로 */
  readonly primary: () => void;
  readonly addTime: (ms: number) => void;
  readonly restart: () => void;
}

export function useRunner(seq: readonly RunStep[], config: RunConfig): Runner {
  const [timer, setTimer] = useState<TimerState>(() => enterStep(seq, 0, Date.now()));
  const [ended, setEnded] = useState(false);
  const endedRef = useRef(false);
  const ref = useRef(timer);
  const autoNext = useRef<number>();

  const commit = useCallback((next: TimerState) => {
    ref.current = next;
    setTimer(next);
  }, []);

  const go = useCallback(
    (index: number) => {
      window.clearTimeout(autoNext.current);
      endedRef.current = false;
      setEnded(false);
      commit(enterStep(seq, index, Date.now()));
    },
    [seq, commit],
  );

  const next = useCallback(() => {
    if (ref.current.index >= seq.length - 1) {
      window.clearTimeout(autoNext.current);
      commit(pause(ref.current, Date.now()));
      endedRef.current = true;
      setEnded(true);
      return;
    }
    go(ref.current.index + 1);
  }, [go, seq.length, commit]);

  const prev = useCallback(() => go(Math.max(0, ref.current.index - 1)), [go]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const { state, events } = tick(ref.current, Date.now(), config.warn);
      if (state === ref.current) return;
      commit(state);
      if (events.includes('warn')) sfx.warn();
      if (events.includes('finish')) {
        playEnd(config.sound);
        if (config.autoNext && state.index < seq.length - 1) {
          autoNext.current = window.setTimeout(() => go(state.index + 1), AUTO_NEXT_DELAY_MS);
        }
      }
    }, TICK_MS);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(autoNext.current);
    };
  }, [config.warn, config.sound, config.autoNext, seq.length, go, commit]);

  const primary = useCallback(() => {
    // 마침 화면에서는 멈춰 둔 마지막 단계가 몰래 다시 흐르지 않게 한다
    if (endedRef.current) return;
    const t = ref.current;
    const now = Date.now();
    if (t.status === 'running') commit(pause(t, now));
    else if (t.status === 'paused') commit(resume(t, now));
    else next();
  }, [commit, next]);

  const addTime = useCallback(
    (ms: number) => {
      if (endedRef.current) return;
      window.clearTimeout(autoNext.current);
      commit(addTimeTo(ref.current, ms, Date.now()));
    },
    [commit],
  );

  const restart = useCallback(() => go(0), [go]);

  return useMemo(() => ({ timer, ended, go, next, prev, primary, addTime, restart }), [timer, ended, go, next, prev, primary, addTime, restart]);
}

/** 진행 화면이 켜져 있는 동안 화면이 꺼지지 않게 한다. 탭을 다시 보면 다시 요청한다. */
export function useWakeLock(): void {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    let alive = true;
    const request = () => {
      if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
      navigator.wakeLock
        .request('screen')
        .then((l) => {
          if (alive) lock = l;
          else void l.release();
        })
        .catch(() => undefined);
    };
    request();
    document.addEventListener('visibilitychange', request);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', request);
      void lock?.release().catch(() => undefined);
    };
  }, []);
}
