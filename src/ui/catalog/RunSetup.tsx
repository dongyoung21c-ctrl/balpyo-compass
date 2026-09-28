import { useState } from 'preact/hooks';
import { playEnd, unlockAudio } from '../../audio/sounds';
import { SOUND_LABELS } from '../../data/labels';
import { findMethod } from '../../data/methods';
import { buildSequence, totalSeconds } from '../../domain/sequence';
import { clampStep, formatClock, parseClock } from '../../domain/time';
import type { Method, Recipe, RunConfig, SoundId } from '../../domain/types';
import { newId } from '../../state/appReducer';
import { useAppStore } from '../../state/AppStore';
import { MAX_ROUNDS } from '../../storage/schema';
import { Dialog } from '../Dialog';
import { useToast } from '../Toast';

export interface SetupRequest {
  readonly methodId: string;
  /** 저장한 레시피를 고칠 때 */
  readonly recipe?: Recipe;
}

interface Props {
  readonly request: SetupRequest | null;
  readonly onClose: () => void;
  readonly onStart: (cfg: RunConfig) => void;
}

const STEP_DELTA = 30;

export function defaultConfig(m: Method): RunConfig {
  return { methodId: m.id, rounds: m.rounds ?? 1, secs: m.steps.map((s) => s.sec), autoNext: false, warn: true, sound: 'bell' };
}

export function RunSetup({ request, onClose, onStart }: Props) {
  const m = request ? findMethod(request.methodId) : undefined;
  return (
    <Dialog open={Boolean(m)} onClose={onClose} label="초시계 맞추기">
      {m && request && <SetupForm key={request.recipe?.id ?? m.id} method={m} recipe={request.recipe} onStart={onStart} />}
    </Dialog>
  );
}

function SetupForm({ method: m, recipe, onStart }: { method: Method; recipe?: Recipe; onStart: (c: RunConfig) => void }) {
  const { dispatch } = useAppStore();
  const toast = useToast();
  const [cfg, setCfg] = useState<RunConfig>(() => recipe ?? defaultConfig(m));
  const [name, setName] = useState(recipe?.name ?? '');
  const total = totalSeconds(buildSequence(m, cfg.rounds, cfg.secs));
  const hasLoop = m.rounds !== undefined;

  const setSec = (i: number, sec: number) => setCfg((c) => ({ ...c, secs: c.secs.map((s, j) => (j === i ? clampStep(sec) : s)) }));
  const setRounds = (r: number) => setCfg((c) => ({ ...c, rounds: Math.max(1, Math.min(MAX_ROUNDS, Math.round(r) || 1)) }));

  const save = () => {
    const fallback = `${m.name}${hasLoop ? ` ${cfg.rounds}라운드` : ''}`;
    const saved: Recipe = { ...cfg, id: recipe?.id ?? newId('r'), name: name.trim() || fallback };
    dispatch({ type: 'saveRecipe', recipe: saved });
    toast(recipe ? `“${saved.name}” 레시피를 고쳤어요` : `“${saved.name}” 레시피를 저장했어요. 도감 맨 위에서 바로 진행할 수 있어요`);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        unlockAudio();
        onStart(cfg);
      }}
    >
      <span class="label">초시계 맞추기</span>
      <h2>{m.name}</h2>
      <p class="small muted">단계마다 시간을 정하세요. “3”은 3분, “1:30”은 1분 30초예요. 0:00으로 두면 선생님이 직접 넘기는 단계가 돼요.</p>

      {hasLoop && (
        <div class="cfg-row">
          <span class="t">
            라운드 수<span class="sub">반복 단계를 몇 번 할지</span>
          </span>
          <Stepper
            label="라운드 수"
            value={String(cfg.rounds)}
            onMinus={() => setRounds(cfg.rounds - 1)}
            onPlus={() => setRounds(cfg.rounds + 1)}
            onCommit={(v) => setRounds(Number(v))}
          />
        </div>
      )}

      {m.steps.map((s, i) => (
        <div class="cfg-row" key={i}>
          <span class="t">
            {i + 1}. {s.title}
            {s.repeat !== 'once' && <span class="loopmark">{s.repeat === 'each' ? '라운드마다' : '라운드 사이'}</span>}
          </span>
          <Stepper
            label={`${s.title} 시간`}
            value={formatClock(cfg.secs[i] ?? 0)}
            onMinus={() => setSec(i, (cfg.secs[i] ?? 0) - STEP_DELTA)}
            onPlus={() => setSec(i, (cfg.secs[i] ?? 0) + STEP_DELTA)}
            onCommit={(v) => {
              const parsed = parseClock(v);
              if (parsed === null) toast('시간은 “3”이나 “1:30”처럼 적어 주세요');
              else setSec(i, parsed);
            }}
          />
        </div>
      ))}

      <div class="total">
        <span>
          예상 소요 시간<span class="sub">수동 단계 제외</span>
        </span>
        <b>{formatClock(total)}</b>
      </div>

      <fieldset class="opts">
        <legend class="sr-only">진행 설정</legend>
        <label>
          <input type="checkbox" checked={cfg.warn} onChange={(e) => setCfg((c) => ({ ...c, warn: e.currentTarget.checked }))} /> 끝나기 30초 전에 알림
        </label>
        <label>
          <input type="checkbox" checked={cfg.autoNext} onChange={(e) => setCfg((c) => ({ ...c, autoNext: e.currentTarget.checked }))} /> 시간이 끝나면 자동으로 다음 단계로
        </label>
        <label>
          종료음{' '}
          <select value={cfg.sound} onChange={(e) => setCfg((c) => ({ ...c, sound: e.currentTarget.value as SoundId }))}>
            {(Object.keys(SOUND_LABELS) as SoundId[]).map((k) => (
              <option key={k} value={k}>
                {SOUND_LABELS[k]}
              </option>
            ))}
          </select>
          <button type="button" class="btn ghost" onClick={() => playEnd(cfg.sound)}>
            들어 보기
          </button>
        </label>
      </fieldset>

      <div class="row">
        <button type="submit" class="btn primary big">▶ 시작</button>
        <button type="button" class="btn" onClick={() => setCfg({ ...defaultConfig(m), sound: cfg.sound })}>
          기본 시간으로
        </button>
      </div>
      <div class="row save-row">
        <input type="text" value={name} onInput={(e) => setName(e.currentTarget.value)} placeholder="레시피 이름 (예: 5-3 월드카페 4라운드)" aria-label="레시피 이름" maxLength={60}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              save();
            }
          }}
        />
        <button type="button" class="btn" onClick={save}>
          {recipe ? '레시피 고치기' : '레시피로 저장'}
        </button>
      </div>
    </form>
  );
}

interface StepperProps {
  readonly label: string;
  readonly value: string;
  readonly onMinus: () => void;
  readonly onPlus: () => void;
  readonly onCommit: (v: string) => void;
}

/** −/+ 버튼과 직접 입력 칸. 입력은 칸을 벗어나거나 Enter를 누를 때 반영한다. */
function Stepper({ label, value, onMinus, onPlus, onCommit }: StepperProps) {
  /** 입력 중인 글자. null이면 부모가 준 값을 그대로 보여 준다. */
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    if (draft !== value) onCommit(draft);
    setDraft(null);
  };
  return (
    <div class="stepper">
      <button type="button" onClick={onMinus} aria-label={`${label} 줄이기`}>−</button>
      <input
        type="text"
        inputMode="numeric"
        aria-label={label}
        value={draft ?? value}
        onInput={(e) => setDraft(e.currentTarget.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          }
        }}
      />
      <button type="button" onClick={onPlus} aria-label={`${label} 늘리기`}>+</button>
    </div>
  );
}
