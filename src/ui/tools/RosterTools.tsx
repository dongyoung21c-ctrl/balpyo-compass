import { useEffect, useRef, useState } from 'preact/hooks';
import { clap, sfx, unlockAudio } from '../../audio/sounds';
import { ownValue } from '../../domain/classroom';
import { makeGroups } from '../../domain/groups';
import { canStartSecondRound, currentSpeaker, isFinished, pass, speak, startPassQueue, startSecondRound } from '../../domain/passQueue';
import { useAppStore } from '../../state/AppStore';
import { useRecordTalk, useSession } from '../../state/session';

const BEATS = [
  { label: '말', clap: false },
  { label: '말', clap: false },
  { label: '짝', clap: true },
  { label: '짝', clap: true },
] as const;
const BPM_MIN = 60;
const BPM_MAX = 160;

export function BeatTool() {
  const { current } = useAppStore();
  const students = current?.students ?? [];
  const [bpm, setBpm] = useState(100);
  const [on, setOn] = useState(false);
  const [beat, setBeat] = useState(-1);
  const [turn, setTurn] = useState(0);
  const state = useRef({ beat: -1, turn: -1 });
  const wasOn = useRef(false);

  useEffect(() => {
    if (!on) {
      wasOn.current = false;
      return undefined;
    }
    const step = () => {
      const s = state.current;
      s.beat = (s.beat + 1) % BEATS.length;
      if (s.beat === 0) {
        s.turn++;
        sfx.beat();
        setTurn(s.turn);
      } else if (BEATS[s.beat]?.clap) {
        clap();
      }
      setBeat(s.beat);
    };
    // 켤 때만 바로 한 박을 친다. 빠르기만 바꿀 때는 간격만 다시 맞춘다.
    if (!wasOn.current) step();
    wasOn.current = true;
    const id = window.setInterval(step, 60_000 / bpm);
    return () => window.clearInterval(id);
  }, [on, bpm]);

  const reset = () => {
    setOn(false);
    state.current = { beat: -1, turn: -1 };
    setBeat(-1);
    setTurn(0);
  };

  return (
    <>
      <p class="hint">한 명이 말하고 다 함께 “짝짝”. 박자에 맞춰 이름이 넘어가요.</p>
      <p class="huge">{students[Math.max(0, turn) % Math.max(1, students.length)]}</p>
      <div class="beats" aria-hidden="true">
        {BEATS.map((b, i) => (
          <i key={i} class={`${b.clap ? 'clap' : ''}${i === beat ? ' on' : ''}`}>{b.label}</i>
        ))}
      </div>
      <label>
        빠르기 <input type="range" min={BPM_MIN} max={BPM_MAX} value={bpm} onInput={(e) => setBpm(Number(e.currentTarget.value))} /> {bpm} BPM
      </label>
      <div class="row center">
        <button type="button" class="bbtn main" onClick={() => { unlockAudio(); setOn(!on); }}>{on ? '멈추기' : '시작'}</button>
        <button type="button" class="bbtn" onClick={reset}>처음부터</button>
      </div>
    </>
  );
}

export function PassTool() {
  const { current } = useAppStore();
  const { session, update } = useSession();
  const record = useRecordTalk();
  const q = session.pass ?? startPassQueue(current?.students ?? []);
  const who = currentSpeaker(q);
  const set = (fn: typeof speak) => update((s) => ({ ...s, pass: fn(s.pass ?? q) }));

  return (
    <>
      <p class="hint">
        {q.phase === 1 ? '한 바퀴째 · 자리 순서대로' : '두 바퀴째 · 통과했던 친구 차례'} (발표 {q.spoken}명 · {Math.min(q.index + 1, q.order.length)}/{q.order.length})
      </p>
      <div aria-live="polite">
        {who && <p class="huge">{who}</p>}
        {!who && canStartSecondRound(q) && <p class="mid">한 바퀴 끝! 통과한 친구 차례로 넘어가요</p>}
        {isFinished(q) && <p class="mid">모두 끝났어요 👏</p>}
      </div>
      {who && (
        <div class="row center">
          <button type="button" class="bbtn main" onClick={() => { record(who); set(speak); }}>발표 ✓</button>
          <button type="button" class="bbtn" onClick={() => set(pass)}>{q.phase === 1 ? '통과 (나중에)' : '다음 기회에'}</button>
        </div>
      )}
      {canStartSecondRound(q) && (
        <button type="button" class="bbtn main" onClick={() => set(startSecondRound)}>통과한 친구 시작</button>
      )}
      {q.phase === 1 && q.passed.length > 0 && (
        <div>
          <p class="hint">통과한 친구</p>
          <ul class="passq">{q.passed.map((n) => <li key={n}>{n}</li>)}</ul>
        </div>
      )}
      <button type="button" class="bbtn" onClick={() => update((s) => ({ ...s, pass: null }))}>처음부터</button>
    </>
  );
}

export function RelayTool() {
  const { current, dispatch } = useAppStore();
  const { session, update } = useSession();
  const chain = session.relay;
  const used = new Set(chain.map((e) => e.name));

  // 릴레이는 "마지막 취소"로 되돌리므로 알림 없이 바로 기록한다
  const add = (name: string) => {
    update((s) => ({ ...s, relay: [...s.relay, { name, classId: current?.id ?? '', prevLast: current ? ownValue(current.last, name) : undefined }] }));
    dispatch({ type: 'recordTalk', name, now: Date.now() });
  };
  const undo = () => {
    const last = chain[chain.length - 1];
    if (!last) return;
    dispatch({ type: 'undoTalk', classId: last.classId, name: last.name, prevLast: last.prevLast });
    update((s) => ({ ...s, relay: s.relay.slice(0, -1) }));
  };

  return (
    <>
      <p class="hint">발표자가 부른 친구를 누르면 순서와 발표가 기록돼요. ({chain.length}명 발표)</p>
      <p class="chain" aria-live="polite">
        {chain.length === 0 ? <em>첫 발표자를 누르세요</em> : chain.map((e, i) => (
          <span key={i}>{i > 0 && <em aria-hidden="true">→</em>}<span class="link">{e.name}</span></span>
        ))}
      </p>
      <div class="namegrid">
        {(current?.students ?? []).map((n) => (
          <button key={n} type="button" class={used.has(n) ? 'used' : ''} aria-pressed={used.has(n)} onClick={() => add(n)}>
            {n}
          </button>
        ))}
      </div>
      <div class="row center">
        <button type="button" class="bbtn" onClick={undo} disabled={chain.length === 0}>마지막 취소</button>
        <button type="button" class="bbtn" onClick={() => update((s) => ({ ...s, relay: [] }))}>새 릴레이</button>
      </div>
    </>
  );
}

const GROUP_SIZES = [2, 3, 4, 5, 6] as const;

export function GroupsTool() {
  const { current } = useAppStore();
  const { session, update } = useSession();
  const [size, setSize] = useState(4);
  const groups = session.groups;

  return (
    <>
      <div class="row center">
        <label>
          모둠 인원{' '}
          <select value={size} onChange={(e) => setSize(Number(e.currentTarget.value))}>
            {GROUP_SIZES.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>{' '}
          명
        </label>
        <button type="button" class="bbtn main" onClick={() => update((s) => ({ ...s, groups: makeGroups(current?.students ?? [], size), groupPicks: [] }))}>
          {groups ? '다시 섞기' : '모둠 만들기'}
        </button>
      </div>
      {groups ? (
        <ol class="groups">
          {groups.map((g, i) => (
            <li key={i}>
              <b>{i + 1}모둠</b>
              {g.join(', ')}
            </li>
          ))}
        </ol>
      ) : (
        <p class="hint">인원을 고르고 모둠 만들기를 누르세요. 인원이 딱 나누어떨어지지 않으면 한 명씩 더 들어가는 모둠이 생겨요.</p>
      )}
    </>
  );
}
