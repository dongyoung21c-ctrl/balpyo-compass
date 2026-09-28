import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { findMethod } from '../../data/methods';
import { buildSequence, totalSeconds } from '../../domain/sequence';
import { formatClock } from '../../domain/time';
import { progress, WARN_BEFORE_MS } from '../../domain/timer';
import type { RunConfig } from '../../domain/types';
import { useAppStore } from '../../state/AppStore';
import { useRecordTalk } from '../../state/session';
import { usePickAnimation } from '../tools/usePickAnimation';
import { useRunner, useWakeLock } from './useRunner';

interface Props {
  readonly config: RunConfig;
  readonly onClose: () => void;
}

const ADD_MS = 60_000;
const SUBTRACT_MS = -30_000;

export function Board({ config, onClose }: Props) {
  const method = findMethod(config.methodId);
  const seq = useMemo(() => (method ? buildSequence(method, config.rounds, config.secs) : []), [method, config]);
  const runner = useRunner(seq, config);
  const [picking, setPicking] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useWakeLock();

  useEffect(() => {
    root.current?.focus();
    // 뒤 화면 스크롤을 막고, 알림이 조작 버튼을 가리지 않게 위쪽으로 옮긴다
    document.body.classList.add('board-open');
    return () => {
      document.body.classList.remove('board-open');
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    };
  }, []);

  const { timer, ended } = runner;
  const step = seq[timer.index];
  if (!method || !step) return null;
  const upcoming = seq[timer.index + 1];
  const warn = timer.status !== 'manual' && timer.remainingMs <= WARN_BEFORE_MS;

  const onKeyDown = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement).closest('input, select, textarea')) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      if (picking) setPicking(false);
      else setConfirmExit((v) => !v);
    } else if (picking || confirmExit || ended) {
      return;
    } else if (e.key === ' ') {
      e.preventDefault();
      runner.primary();
    } else if (e.key === 'ArrowRight') runner.next();
    else if (e.key === 'ArrowLeft') runner.prev();
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void root.current?.requestFullscreen?.().catch(() => undefined);
  };

  return (
    <div class="board" ref={root} role="dialog" aria-modal="true" aria-label={`${method.name} 진행`} tabIndex={-1} onKeyDown={onKeyDown}>
      <div class="board-bar">
        <div>
          <p class="board-name">{method.name}</p>
          <p class="board-pos">
            {timer.index + 1} / {seq.length} 단계 · 전체 {formatClock(totalSeconds(seq))}
          </p>
        </div>
        <div class="row">
          <button type="button" class="bbtn" onClick={() => setPicking(true)}>발표자 뽑기</button>
          {'requestFullscreen' in document.documentElement && (
            <button type="button" class="bbtn" onClick={toggleFullscreen}>전체 화면</button>
          )}
          <button type="button" class="bbtn" onClick={() => setConfirmExit(true)}>끝내기 ✕</button>
        </div>
      </div>

      {ended ? (
        <div class="board-center">
          <p class="board-title">활동을 모두 마쳤어요 👏</p>
          <div class="row center">
            <button type="button" class="bbtn main" onClick={onClose}>진행 끝내기</button>
            <button type="button" class="bbtn" onClick={runner.restart}>처음부터 다시</button>
            <button type="button" class="bbtn" onClick={() => runner.go(seq.length - 1)}>마지막 단계로</button>
          </div>
        </div>
      ) : (
        <div class="board-main">
          <div class="board-center" aria-live="polite">
            <p class="board-round">{step.round ? `라운드 ${step.round} / ${config.rounds}` : ''}</p>
            <h2 class="board-title">{step.title}</h2>
            <p class="board-desc">{step.desc}</p>
            {timer.status === 'manual' ? (
              <p class="clock manual">준비되면 다음으로</p>
            ) : (
              <p class={`clock${timer.status === 'finished' ? ' over' : warn ? ' warn' : ''}${timer.status === 'paused' ? ' paused' : ''}`} role="timer">
                {timer.status === 'finished' ? '시간 끝!' : formatClock(Math.ceil(timer.remainingMs / 1000))}
              </p>
            )}
            <div class="pbar" aria-hidden="true">
              <i style={{ width: `${progress(timer) * 100}%` }} />
            </div>
          </div>
          <ol class="rail" aria-label="단계 목록">
            {seq.map((s, j) => (
              <li key={j} class={j === timer.index ? 'on' : j < timer.index ? 'done' : ''}>
                <button type="button" onClick={() => runner.go(j)}>
                  <span>
                    {s.title}
                    {s.round ? ` · ${s.round}` : ''}
                  </span>
                  <span>{s.sec ? formatClock(s.sec) : '수동'}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}

      {!ended && (
        <div class="board-foot">
          <p class="board-next">
            {upcoming
              ? `다음: ${upcoming.title}${upcoming.round ? ` (라운드 ${upcoming.round})` : ''}${upcoming.sec ? ` · ${formatClock(upcoming.sec)}` : ''}`
              : '마지막 단계예요'}
          </p>
          <div class="row center">
            <button type="button" class="bbtn" onClick={runner.prev} disabled={timer.index === 0}>◀ 이전</button>
            <button type="button" class="bbtn" onClick={() => runner.addTime(SUBTRACT_MS)} disabled={timer.status === 'manual'}>−30초</button>
            <button type="button" class="bbtn main" onClick={runner.primary}>
              {timer.status === 'running' ? '일시정지' : timer.status === 'paused' ? '계속 ▶' : upcoming ? '다음 단계 ▶' : '마치기 ✓'}
            </button>
            <button type="button" class="bbtn" onClick={() => runner.addTime(ADD_MS)} disabled={timer.status === 'manual'}>+1분</button>
            <button type="button" class="bbtn" onClick={runner.next}>{upcoming ? '다음 ▶' : '마치기'}</button>
          </div>
          <p class="board-keys">스페이스: 멈춤·계속 · ←/→: 이전·다음 · Esc: 끝내기</p>
        </div>
      )}

      {picking && <BoardPick onClose={() => setPicking(false)} />}
      {confirmExit && (
        <div class="board-layer">
          <p class="board-title">진행을 끝낼까요?</p>
          <div class="row center">
            <button type="button" class="bbtn main" onClick={onClose}>끝내기</button>
            <button type="button" class="bbtn" onClick={() => setConfirmExit(false)} autoFocus>계속 진행</button>
          </div>
        </div>
      )}
    </div>
  );
}

function BoardPick({ onClose }: { onClose: () => void }) {
  const { current } = useAppStore();
  const record = useRecordTalk();
  const { phase, start } = usePickAnimation();
  const [recorded, setRecorded] = useState(false);
  const hasStudents = (current?.students.length ?? 0) > 0;

  useEffect(() => {
    if (hasStudents) start(true, 0);
    // 열 때 한 번만 뽑는다
  }, []);

  return (
    <div class="board-layer" role="dialog" aria-label="발표자 뽑기">
      {!hasStudents && <p class="board-title">우리 반 탭에서 명단을 먼저 넣어 주세요</p>}
      {phase.kind === 'rolling' && <p class="who shake">{phase.shown}</p>}
      {phase.kind === 'done' && <p class="who">{phase.name}</p>}
      <div class="row center">
        {phase.kind === 'done' && (
          <button
            type="button"
            class="bbtn main"
            disabled={recorded}
            onClick={() => {
              record(phase.name);
              setRecorded(true);
            }}
          >
            {recorded ? '기록했어요' : '발표함 ✓ 기록'}
          </button>
        )}
        {hasStudents && phase.kind === 'done' && (
          <button
            type="button"
            class="bbtn"
            onClick={() => {
              setRecorded(false);
              start(true, 0);
            }}
          >
            다시 뽑기
          </button>
        )}
        <button type="button" class="bbtn" onClick={onClose}>닫기</button>
      </div>
    </div>
  );
}
