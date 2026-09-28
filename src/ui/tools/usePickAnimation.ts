import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { sfx, unlockAudio } from '../../audio/sounds';
import { pickSpeaker } from '../../domain/picker';
import { pickOne } from '../../domain/random';
import { useAppStore } from '../../state/AppStore';
import { useSession } from '../../state/session';

const ROLL_FRAMES = 14;
const ROLL_FRAME_MS = 70;

export type PickPhase =
  | { kind: 'idle' }
  | { kind: 'thinking'; left: number }
  | { kind: 'rolling'; shown: string }
  | { kind: 'done'; name: string; restarted: boolean };

/**
 * 공정 뽑기 연출: (생각하는 시간 카운트다운) → 이름이 빠르게 바뀌다가 → 한 명 발표.
 * 뽑힌 학생은 이번 시간 동안 다시 뽑히지 않도록 세션에 남긴다.
 */
export function usePickAnimation() {
  const { current } = useAppStore();
  const { session, update } = useSession();
  const [phase, setPhase] = useState<PickPhase>({ kind: 'idle' });
  const timers = useRef<number[]>([]);

  const clear = () => {
    timers.current.forEach((t) => window.clearInterval(t));
    timers.current = [];
  };
  useEffect(() => clear, []);

  const start = useCallback(
    (fair: boolean, waitSeconds: number) => {
      const students = current?.students ?? [];
      if (students.length === 0) return;
      unlockAudio();
      clear();

      const roll = () => {
        let frame = 0;
        const id = window.setInterval(() => {
          frame++;
          if (frame <= ROLL_FRAMES) {
            setPhase({ kind: 'rolling', shown: pickOne(students) ?? '' });
            sfx.tick();
            return;
          }
          clear();
          const result = pickSpeaker(students, current?.counts ?? {}, session.picked, fair);
          if (!result) return;
          update((s) => ({ ...s, picked: new Set([...(result.restarted ? [] : s.picked), result.name]) }));
          sfx.reveal();
          setPhase({ kind: 'done', name: result.name, restarted: result.restarted });
        }, ROLL_FRAME_MS);
        timers.current.push(id);
      };

      if (waitSeconds <= 0) {
        roll();
        return;
      }
      let left = waitSeconds;
      setPhase({ kind: 'thinking', left });
      const id = window.setInterval(() => {
        left--;
        if (left > 0) {
          setPhase({ kind: 'thinking', left });
          return;
        }
        clear();
        roll();
      }, 1000);
      timers.current.push(id);
    },
    [current, session.picked, update],
  );

  const reset = useCallback(() => {
    clear();
    setPhase({ kind: 'idle' });
  }, []);

  return { phase, start, reset };
}
