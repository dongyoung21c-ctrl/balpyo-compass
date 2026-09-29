import { useEffect, useRef, useState } from 'preact/hooks';
import { sfx, unlockAudio } from '../../audio/sounds';
import { pickGroup } from '../../domain/groupPick';
import { useSession } from '../../state/session';

const COUNT_MIN = 2;
const COUNT_MAX = 12;
const DEFAULT_COUNT = 6;
const ROLL_FRAMES = 12;
const ROLL_FRAME_MS = 80;

type Phase =
  | { kind: 'idle' }
  | { kind: 'rolling'; shown: number }
  | { kind: 'done'; group: number; restarted: boolean };

/**
 * 발표할 모둠을 뽑는다. 모둠 편성에서 만든 모둠이 있으면 그 모둠 수와 모둠원을 그대로 쓰고,
 * 없으면 모둠 수만 골라서 번호로 뽑는다. 명단이 없어도 쓸 수 있다.
 */
export function GroupPickTool() {
  const { session, update } = useSession();
  const [manualCount, setManualCount] = useState(DEFAULT_COUNT);
  const [noRepeat, setNoRepeat] = useState(true);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const timer = useRef<number>();
  useEffect(() => () => window.clearInterval(timer.current), []);

  const groups = session.groups;
  const count = groups?.length ?? manualCount;
  const picks = session.groupPicks;
  const busy = phase.kind === 'rolling';

  const clearPicks = () => {
    window.clearInterval(timer.current);
    update((s) => ({ ...s, groupPicks: [] }));
    setPhase({ kind: 'idle' });
  };

  const roll = () => {
    const result = pickGroup(count, picks, noRepeat);
    if (!result) return;
    unlockAudio();
    let frame = 0;
    timer.current = window.setInterval(() => {
      frame++;
      if (frame <= ROLL_FRAMES) {
        setPhase({ kind: 'rolling', shown: 1 + Math.floor(Math.random() * count) });
        sfx.tick();
        return;
      }
      window.clearInterval(timer.current);
      update((s) => ({ ...s, groupPicks: [...(result.restarted ? [] : s.groupPicks), result.group] }));
      sfx.reveal();
      setPhase({ kind: 'done', group: result.group, restarted: result.restarted });
    }, ROLL_FRAME_MS);
  };

  const members = phase.kind === 'done' ? groups?.[phase.group - 1] : undefined;

  return (
    <>
      <p class="hint">
        {groups
          ? `모둠 편성에서 만든 ${groups.length}모둠 중에서 뽑아요.`
          : '모둠 수를 고르고 뽑으세요. 모둠 편성에서 모둠을 만들면 모둠원 이름도 함께 보여 줘요.'}
      </p>
      <div class="pick-out" aria-live="polite">
        {phase.kind === 'idle' && <p class="mid">어느 모둠이 발표할까요?</p>}
        {phase.kind === 'rolling' && <p class="huge shake">{phase.shown}모둠</p>}
        {phase.kind === 'done' && (
          <>
            <p class="huge">{phase.group}모둠</p>
            {members && <p class="mid members">{members.join(', ')}</p>}
            {phase.restarted && <p class="hint">모든 모둠이 한 번씩 뽑혀서 처음부터 다시 돌아요.</p>}
          </>
        )}
      </div>
      <ol class="gchips" aria-label="모둠별 뽑힌 차례">
        {Array.from({ length: count }, (_, i) => i + 1).map((g) => {
          const order = picks.indexOf(g);
          return (
            <li key={g} class={order >= 0 ? 'used' : ''}>
              {g}모둠{order >= 0 && <small> · {order + 1}번째</small>}
            </li>
          );
        })}
      </ol>
      <div class="row center">
        {!groups && (
          <label>
            모둠 수{' '}
            <select
              value={manualCount}
              disabled={busy}
              onChange={(e) => {
                setManualCount(Number(e.currentTarget.value));
                clearPicks();
              }}
            >
              {Array.from({ length: COUNT_MAX - COUNT_MIN + 1 }, (_, i) => i + COUNT_MIN).map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </label>
        )}
        <label>
          <input type="checkbox" checked={noRepeat} onChange={(e) => setNoRepeat(e.currentTarget.checked)} /> 뽑힌 모둠 빼기
        </label>
      </div>
      <div class="row center">
        <button type="button" class="bbtn main" disabled={busy} onClick={roll}>모둠 뽑기</button>
        {picks.length > 0 && (
          <button type="button" class="bbtn" disabled={busy} onClick={clearPicks}>처음부터</button>
        )}
      </div>
    </>
  );
}
