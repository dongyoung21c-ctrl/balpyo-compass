import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { playEnd, sfx, unlockAudio } from '../../audio/sounds';
import { elapsedMs, STOPWATCH_ZERO, toggleStopwatch, type Stopwatch } from '../../domain/stopwatch';
import { formatClock } from '../../domain/time';
import { addTime as addTimeTo, pause, resume, startTimer, tick, type TimerState } from '../../domain/timer';
import type { SoundId } from '../../domain/types';

const TICK_MS = 200;
const DEFAULT_SECONDS = 5 * 60;

/** down: 정한 시간부터 거꾸로, up: 0부터 올라가는 스톱워치 */
export type TimerMode = 'down' | 'up';

export interface ClassTimer {
  readonly mode: TimerMode;
  readonly setMode: (m: TimerMode) => void;
  /** 타이머를 시작할 때 쓸 시간(초) */
  readonly targetSec: number;
  readonly setTargetSec: (sec: number) => void;
  /** null이면 아직 시작하지 않은 상태 */
  readonly countdown: TimerState | null;
  readonly stopwatch: Stopwatch;
  readonly now: number;
  readonly sound: SoundId;
  readonly setSound: (s: SoundId) => void;
  readonly warn: boolean;
  readonly setWarn: (w: boolean) => void;
  readonly start: () => void;
  /** 흐르면 멈추고, 멈췄으면 이어서 흐른다 */
  readonly toggle: () => void;
  readonly addTime: (ms: number) => void;
  readonly reset: () => void;
  /** 메뉴 탭에 띄울 짧은 시간 표시. 쓰고 있지 않으면 null */
  readonly badge: string | null;
}

/**
 * 타이머 탭의 상태. 다른 탭으로 옮겨 가도 계속 흐르고 끝나면 소리가 나도록 App에서 한 번만 부른다.
 */
export function useClassTimer(): ClassTimer {
  const [mode, setMode] = useState<TimerMode>('down');
  const [targetSec, setTargetSec] = useState(DEFAULT_SECONDS);
  const [countdown, setCountdown] = useState<TimerState | null>(null);
  const [stopwatch, setStopwatch] = useState<Stopwatch>(STOPWATCH_ZERO);
  const [now, setNow] = useState(() => Date.now());
  const [sound, setSound] = useState<SoundId>('bell');
  const [warn, setWarn] = useState(true);
  const ref = useRef(countdown);

  const commit = useCallback((next: TimerState | null) => {
    ref.current = next;
    setCountdown(next);
  }, []);

  const active = countdown?.status === 'running' || stopwatch.running;
  useEffect(() => {
    if (!active) return undefined;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      const cur = ref.current;
      if (!cur) return;
      const { state, events } = tick(cur, t, warn);
      if (state === cur) return;
      commit(state);
      if (events.includes('warn')) sfx.warn();
      if (events.includes('finish')) playEnd(sound);
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [active, warn, sound, commit]);

  const start = useCallback(() => {
    if (targetSec <= 0) return;
    unlockAudio();
    commit(startTimer(targetSec, Date.now()));
  }, [targetSec, commit]);

  const toggle = useCallback(() => {
    unlockAudio();
    const t = Date.now();
    setNow(t);
    if (mode === 'up') {
      setStopwatch((s) => toggleStopwatch(s, t));
      return;
    }
    const cur = ref.current;
    if (!cur) return;
    if (cur.status === 'running') commit(pause(cur, t));
    else if (cur.status === 'paused') commit(resume(cur, t));
  }, [mode, commit]);

  const addTime = useCallback(
    (ms: number) => {
      const cur = ref.current;
      if (cur) commit(addTimeTo(cur, ms, Date.now()));
    },
    [commit],
  );

  const reset = useCallback(() => {
    if (mode === 'up') setStopwatch(STOPWATCH_ZERO);
    else commit(null);
  }, [mode, commit]);

  // 보고 있는 쪽을 먼저 보여 주되, 안 쓰고 있으면 다른 쪽이라도 보여 준다
  const badge = useMemo(() => {
    const swStarted = stopwatch.running || stopwatch.baseMs > 0;
    const sw = formatClock(Math.floor(elapsedMs(stopwatch, now) / 1000));
    if (mode === 'up' && swStarted) return sw;
    if (countdown) return countdown.status === 'finished' ? '끝!' : formatClock(Math.ceil(countdown.remainingMs / 1000));
    return swStarted ? sw : null;
  }, [mode, stopwatch, countdown, now]);

  return {
    mode, setMode, targetSec, setTargetSec, countdown, stopwatch, now,
    sound, setSound, warn, setWarn, start, toggle, addTime, reset, badge,
  };
}
