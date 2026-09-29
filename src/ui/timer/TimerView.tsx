import { useRef, useState } from 'preact/hooks';
import { SOUND_LABELS } from '../../data/labels';
import { elapsedMs } from '../../domain/stopwatch';
import { formatClock, parseClock } from '../../domain/time';
import { progress, WARN_BEFORE_MS } from '../../domain/timer';
import type { SoundId } from '../../domain/types';
import { useWakeLock } from '../board/useRunner';
import type { ClassTimer } from './useClassTimer';

const PRESETS = [30, 60, 3 * 60, 5 * 60, 10 * 60, 15 * 60] as const;
const ADD_MS = 60_000;
const SUBTRACT_MS = -30_000;

const presetLabel = (sec: number) => (sec < 60 ? `${sec}초` : `${sec / 60}분`);

export function TimerView({ timer }: { timer: ClassTimer }) {
  const stage = useRef<HTMLDivElement>(null);
  const running = timer.countdown?.status === 'running' || timer.stopwatch.running;

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void stage.current?.requestFullscreen?.().catch(() => undefined);
  };

  return (
    <section aria-label="타이머">
      <div class="stage timer-stage" ref={stage}>
        {running && <KeepAwake />}
        <div class="seg" role="group" aria-label="종류">
          <button type="button" aria-pressed={timer.mode === 'down'} onClick={() => timer.setMode('down')}>타이머</button>
          <button type="button" aria-pressed={timer.mode === 'up'} onClick={() => timer.setMode('up')}>스톱워치</button>
        </div>
        {timer.mode === 'down' ? <Countdown timer={timer} /> : <StopwatchPanel timer={timer} />}
        {'requestFullscreen' in document.documentElement && (
          <button type="button" class="bbtn" onClick={toggleFullscreen}>전체 화면</button>
        )}
      </div>
    </section>
  );
}

/** 타이머가 흐르는 동안 화면이 꺼지지 않게 한다 */
function KeepAwake() {
  useWakeLock();
  return null;
}

function Countdown({ timer }: { timer: ClassTimer }) {
  const t = timer.countdown;
  if (!t) return <CountdownSetup timer={timer} />;
  const warn = t.status === 'running' && t.remainingMs <= WARN_BEFORE_MS;
  const cls = `clock${t.status === 'finished' ? ' over' : warn ? ' warn' : ''}${t.status === 'paused' ? ' paused' : ''}`;
  return (
    <>
      <p class={cls} role="timer">
        {t.status === 'finished' ? '시간 끝!' : formatClock(Math.ceil(t.remainingMs / 1000))}
      </p>
      <div class="pbar" aria-hidden="true">
        <i style={{ width: `${progress(t) * 100}%` }} />
      </div>
      <div class="row center">
        <button type="button" class="bbtn" onClick={() => timer.addTime(SUBTRACT_MS)} disabled={t.status === 'finished'}>−30초</button>
        {t.status === 'finished' ? (
          <button type="button" class="bbtn main" onClick={timer.start}>다시 시작</button>
        ) : (
          <button type="button" class="bbtn main" onClick={timer.toggle}>{t.status === 'running' ? '일시정지' : '계속 ▶'}</button>
        )}
        <button type="button" class="bbtn" onClick={() => timer.addTime(ADD_MS)}>+1분</button>
        <button type="button" class="bbtn" onClick={timer.reset}>시간 다시 정하기</button>
      </div>
    </>
  );
}

function CountdownSetup({ timer }: { timer: ClassTimer }) {
  const [draft, setDraft] = useState('');
  const [invalid, setInvalid] = useState(false);

  const apply = () => {
    const sec = parseClock(draft);
    if (sec === null || sec <= 0) {
      setInvalid(true);
      return;
    }
    timer.setTargetSec(sec);
    setInvalid(false);
    setDraft('');
  };

  return (
    <>
      <p class="clock paused">{formatClock(timer.targetSec)}</p>
      <div class="row center" role="group" aria-label="자주 쓰는 시간">
        {PRESETS.map((sec) => (
          <button key={sec} type="button" class="bbtn" aria-pressed={timer.targetSec === sec} onClick={() => timer.setTargetSec(sec)}>
            {presetLabel(sec)}
          </button>
        ))}
      </div>
      <form class="row center" onSubmit={(e) => { e.preventDefault(); apply(); }}>
        <input
          type="text"
          inputMode="decimal"
          value={draft}
          onInput={(e) => { setDraft(e.currentTarget.value); setInvalid(false); }}
          placeholder="직접 입력 (7 또는 2:30)"
          aria-label="시간 직접 입력"
          aria-invalid={invalid}
          maxLength={5}
        />
        <button type="submit" class="bbtn">맞추기</button>
      </form>
      {invalid && <p class="hint" role="alert">분(예: 7) 또는 분:초(예: 2:30)로 적어 주세요. 최대 99분이에요.</p>}
      <div class="row center">
        <label>
          끝나는 소리{' '}
          <select value={timer.sound} onChange={(e) => timer.setSound(e.currentTarget.value as SoundId)}>
            {(Object.keys(SOUND_LABELS) as SoundId[]).map((id) => (
              <option key={id} value={id}>{SOUND_LABELS[id]}</option>
            ))}
          </select>
        </label>
        <label>
          <input type="checkbox" checked={timer.warn} onChange={(e) => timer.setWarn(e.currentTarget.checked)} /> 30초 전 알림
        </label>
      </div>
      <button type="button" class="bbtn main" onClick={timer.start}>▶ 시작</button>
    </>
  );
}

function StopwatchPanel({ timer }: { timer: ClassTimer }) {
  const s = timer.stopwatch;
  const started = s.running || s.baseMs > 0;
  return (
    <>
      <p class={`clock${s.running ? '' : ' paused'}`} role="timer">
        {formatClock(Math.floor(elapsedMs(s, timer.now) / 1000))}
      </p>
      <div class="row center">
        <button type="button" class="bbtn main" onClick={timer.toggle}>{s.running ? '멈추기' : started ? '계속 ▶' : '▶ 시작'}</button>
        <button type="button" class="bbtn" onClick={timer.reset} disabled={!started}>0으로</button>
      </div>
    </>
  );
}
