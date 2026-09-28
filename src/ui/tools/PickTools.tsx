import { useEffect, useRef, useState } from 'preact/hooks';
import { sfx, unlockAudio } from '../../audio/sounds';
import { pickOne } from '../../domain/random';
import { useAppStore } from '../../state/AppStore';
import { useRecordTalk, useSession } from '../../state/session';
import { josa } from '../josa';
import { usePickAnimation } from './usePickAnimation';

const WAIT_OPTIONS = [0, 5, 10, 15] as const;

export function PickTool() {
  const { current } = useAppStore();
  const { session, update } = useSession();
  const record = useRecordTalk();
  const { phase, start, reset } = usePickAnimation();
  const [fair, setFair] = useState(true);
  const [wait, setWait] = useState(5);
  const [recorded, setRecorded] = useState<string | null>(null);
  const busy = phase.kind === 'thinking' || phase.kind === 'rolling';
  const total = current?.students.length ?? 0;

  return (
    <>
      <p class="hint">
        {fair ? '발표를 적게 한 친구가 더 잘 뽑히고, 이번 시간에 뽑힌 친구는 다시 나오지 않아요.' : '모두 같은 확률로 뽑아요.'}
        {fair && session.picked.size > 0 && ` (이번 시간 ${session.picked.size}/${total}명)`}
      </p>
      <div class="pick-out" aria-live="polite">
        {phase.kind === 'idle' && <p class="mid">누가 발표할까요?</p>}
        {phase.kind === 'thinking' && (
          <>
            <p class="hint">생각하는 시간이에요. 선생님은 아직 뽑지 않아요.</p>
            <p class="huge">{phase.left}</p>
          </>
        )}
        {phase.kind === 'rolling' && <p class="huge shake">{phase.shown}</p>}
        {phase.kind === 'done' && (
          <>
            <p class="huge">{phase.name}</p>
            {phase.restarted && <p class="hint">모두 한 번씩 뽑혀서 처음부터 다시 돌아요.</p>}
            <button
              type="button"
              class="bbtn main"
              disabled={recorded === phase.name}
              onClick={() => {
                record(phase.name);
                setRecorded(phase.name);
              }}
            >
              {recorded === phase.name ? '기록했어요' : '발표함 ✓ 기록'}
            </button>
          </>
        )}
      </div>
      <div class="row center">
        <label>
          <input type="checkbox" checked={fair} onChange={(e) => setFair(e.currentTarget.checked)} /> 공정 모드
        </label>
        <label>
          생각하는 시간{' '}
          <select value={wait} onChange={(e) => setWait(Number(e.currentTarget.value))}>
            {WAIT_OPTIONS.map((v) => (
              <option key={v} value={v}>{v ? `${v}초` : '없음'}</option>
            ))}
          </select>
        </label>
      </div>
      <div class="row center">
        <button type="button" class="bbtn main" disabled={busy} onClick={() => { setRecorded(null); start(fair, wait); }}>
          뽑기
        </button>
        {session.picked.size > 0 && (
          <button type="button" class="bbtn" disabled={busy} onClick={() => { update((s) => ({ ...s, picked: new Set() })); reset(); }}>
            뽑힌 친구 비우기
          </button>
        )}
      </div>
    </>
  );
}

const HANDS = [
  { emoji: '✌️', name: '가위' },
  { emoji: '✊', name: '바위' },
  { emoji: '🖐', name: '보' },
] as const;
const RPS_CALL = ['가위', '바위', '보!'];
const RPS_BEAT_MS = 450;

export function RpsTool() {
  const [shown, setShown] = useState<{ text: string; hand?: (typeof HANDS)[number] }>({ text: '✊ ✌️ 🖐' });
  const [busy, setBusy] = useState(false);
  const timer = useRef<number>();
  useEffect(() => () => window.clearInterval(timer.current), []);

  const play = () => {
    unlockAudio();
    setBusy(true);
    let k = 0;
    timer.current = window.setInterval(() => {
      if (k < RPS_CALL.length) {
        setShown({ text: RPS_CALL[k] ?? '' });
        sfx.pop(k);
        k++;
        return;
      }
      window.clearInterval(timer.current);
      const hand = pickOne(HANDS) ?? HANDS[0];
      setShown({ text: hand.emoji, hand });
      sfx.reveal();
      setBusy(false);
    }, RPS_BEAT_MS);
  };

  return (
    <>
      <p class="hint">화면이 선생님 손이에요. 화면과 똑같이 낸 학생이 발표해요.</p>
      <div aria-live="polite">
        <p class="huge rps">{shown.text}</p>
        {shown.hand && <p class="mid">{josa(shown.hand.name, '을/를')} 낸 친구 발표!</p>}
      </div>
      <button type="button" class="bbtn main" disabled={busy} onClick={play}>가위 바위 보!</button>
    </>
  );
}

export function LoveTool() {
  const { data, dispatch } = useAppStore();
  const [cond, setCond] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const list = data.loveConditions;

  const add = () => {
    const v = draft.trim();
    if (!v || list.includes(v)) return;
    dispatch({ type: 'setLoveConditions', list: [...list, v] });
    setDraft('');
  };

  return (
    <>
      <p class="hint">“선생님은 …를 사랑합니다!” 해당하는 친구가 일어나 발표해요.</p>
      <p class="mid" aria-live="polite">
        선생님은<br />
        <span class="chalk-hi">{cond ?? '?'}</span>{cond ? josa(cond, '을/를').slice(cond.length) : '를'}<br />
        사랑합니다{cond ? '!' : ''}
      </p>
      <button
        type="button"
        class="bbtn main"
        disabled={list.length === 0}
        onClick={() => {
          unlockAudio();
          const others = list.filter((c) => c !== cond);
          setCond(pickOne(others.length ? others : list) ?? null);
          sfx.chime();
        }}
      >
        조건 뽑기
      </button>
      <form class="row center" onSubmit={(e) => { e.preventDefault(); add(); }}>
        <input type="text" value={draft} onInput={(e) => setDraft(e.currentTarget.value)} placeholder="조건 추가 (예: 수학을 좋아하는 친구)" aria-label="새 조건" maxLength={40} />
        <button type="submit" class="bbtn">추가</button>
      </form>
      <ul class="passq">
        {list.map((c) => (
          <li key={c}>
            {c}
            <button type="button" class="x-mini" aria-label={`${c} 삭제`} onClick={() => dispatch({ type: 'setLoveConditions', list: list.filter((x) => x !== c) })}>
              ✕
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

const ARROW_MIN = 5;
const ARROW_RANGE = 8;

export function ArrowTool() {
  const { current } = useAppStore();
  const [shot, setShot] = useState<{ from: string; n: number } | null>(null);
  return (
    <>
      <p class="hint">모두 친구 한 명을 손가락으로 가리키세요. 시작할 친구부터 숫자만큼 화살표를 따라가요.</p>
      <p class="mid" aria-live="polite">
        {shot ? (
          <>
            <span class="chalk-hi">{shot.from}</span>부터 시작!
            <br />
            발표 숫자는 <span class="chalk-hi">{shot.n}</span>
          </>
        ) : (
          '“발표 화살표를 쏘세요!”'
        )}
      </p>
      <button
        type="button"
        class="bbtn main"
        onClick={() => {
          unlockAudio();
          setShot({ from: pickOne(current?.students ?? []) ?? '', n: ARROW_MIN + Math.floor(Math.random() * ARROW_RANGE) });
          sfx.pop(1);
        }}
      >
        시작 친구와 숫자 정하기
      </button>
    </>
  );
}
