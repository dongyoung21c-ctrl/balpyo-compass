import { useState } from 'preact/hooks';
import { CATEGORIES, GROUP_LABELS } from '../../data/labels';
import { findMethod, METHODS } from '../../data/methods';
import { buildSequence, estimateMinutes, totalSeconds } from '../../domain/sequence';
import { formatClock } from '../../domain/time';
import type { Burden, CategoryId, GroupForm, LessonStage, Method, Recipe } from '../../domain/types';
import { useAppStore } from '../../state/AppStore';
import { BurdenDots, CategoryLabel, Chips, EmptyState } from '../common';
import { useToast } from '../Toast';
import { EMPTY_FILTER, filterMethods, isFiltered, type CatalogFilter } from './filter';

interface Props {
  readonly onOpen: (methodId: string) => void;
  readonly onRunRecipe: (r: Recipe) => void;
  readonly onEditRecipe: (r: Recipe) => void;
}

const CAT_OPTIONS = (Object.keys(CATEGORIES) as CategoryId[]).map((value) => ({ value, label: CATEGORIES[value] }));
const GROUP_OPTIONS = (Object.keys(GROUP_LABELS) as GroupForm[]).map((value) => ({ value, label: GROUP_LABELS[value] }));
const STAGE_OPTIONS: { value: LessonStage; label: string }[] = [
  { value: '도입', label: '도입' },
  { value: '전개', label: '전개' },
  { value: '정리', label: '정리' },
];
const BURDEN_OPTIONS: { value: Burden; label: string }[] = [
  { value: 1, label: '낮은 것만' },
  { value: 2, label: '보통까지' },
];

export function Catalog({ onOpen, onRunRecipe, onEditRecipe }: Props) {
  const [f, setF] = useState<CatalogFilter>(EMPTY_FILTER);
  const list = filterMethods(METHODS, f);
  const set = <K extends keyof CatalogFilter>(k: K) => (v: CatalogFilter[K]) => setF((prev) => ({ ...prev, [k]: v }));

  return (
    <section aria-label="발표 방법 도감">
      <RecipeShelf onRun={onRunRecipe} onEdit={onEditRecipe} />
      <div class="filters">
        <input
          class="search"
          type="search"
          value={f.q}
          onInput={(e) => set('q')(e.currentTarget.value)}
          placeholder="방법 이름이나 설명으로 찾기 (예: 짝, 모둠, 박수)"
          aria-label="방법 찾기"
        />
        <FilterRow label="분류"><Chips label="분류" options={CAT_OPTIONS} value={f.cat} onChange={set('cat')} /></FilterRow>
        <FilterRow label="형태"><Chips label="형태" options={GROUP_OPTIONS} value={f.group} onChange={set('group')} /></FilterRow>
        <FilterRow label="수업 단계"><Chips label="수업 단계" options={STAGE_OPTIONS} value={f.stage} onChange={set('stage')} /></FilterRow>
        <FilterRow label="발표 부담"><Chips label="발표 부담" options={BURDEN_OPTIONS} value={f.maxBurden} onChange={set('maxBurden')} /></FilterRow>
      </div>
      <div class="count-row">
        <p class="count" aria-live="polite">{list.length}개 방법</p>
        {isFiltered(f) && (
          <button type="button" class="btn ghost small" onClick={() => setF(EMPTY_FILTER)}>
            조건 모두 지우기
          </button>
        )}
      </div>
      {list.length === 0 ? (
        <EmptyState title="조건에 맞는 방법이 없어요">
          <p>조건을 하나씩 풀어 보세요.</p>
        </EmptyState>
      ) : (
        <ul class="grid">
          {list.map((m) => (
            <li key={m.id}>
              <MethodCard method={m} onOpen={onOpen} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function FilterRow({ label, children }: { label: string; children: preact.ComponentChildren }) {
  return (
    <div class="frow">
      <span class="label">{label}</span>
      {children}
    </div>
  );
}

function MethodCard({ method: m, onOpen }: { method: Method; onOpen: (id: string) => void }) {
  return (
    <button type="button" class="card" onClick={() => onOpen(m.id)} style={{ '--cc': `var(--c-${m.cat})` }}>
      <CategoryLabel cat={m.cat} />
      <h3>{m.name}</h3>
      <p>{m.summary}</p>
      <span class="meta">
        <span>{GROUP_LABELS[m.group]}</span>
        <span>약 {estimateMinutes(m)}분</span>
        <span>
          부담 <BurdenDots level={m.burden} />
        </span>
        {m.rounds && <span class="tag">라운드</span>}
        {m.tool && <span class="tag">도구</span>}
      </span>
    </button>
  );
}

function RecipeShelf({ onRun, onEdit }: { onRun: (r: Recipe) => void; onEdit: (r: Recipe) => void }) {
  const { data, dispatch } = useAppStore();
  const toast = useToast();
  if (data.recipes.length === 0) return null;
  return (
    <section class="recipes" aria-label="내 수업 레시피">
      <h2 class="label">내 수업 레시피</h2>
      <ul class="recipe-list">
        {data.recipes.map((r) => {
          const m = findMethod(r.methodId);
          if (!m) return null;
          const total = totalSeconds(buildSequence(m, r.rounds, r.secs));
          return (
            <li key={r.id} class="rcp">
              <span class="rcp-text">
                <b>{r.name}</b>
                <small>
                  {m.name} · {formatClock(total)}
                </small>
              </span>
              <button type="button" class="btn primary" onClick={() => onRun(r)}>
                ▶ 바로 진행
              </button>
              <button type="button" class="btn ghost" onClick={() => onEdit(r)}>
                고치기
              </button>
              <button
                type="button"
                class="btn ghost icon"
                aria-label={`${r.name} 레시피 삭제`}
                onClick={() => {
                  dispatch({ type: 'deleteRecipe', id: r.id });
                  toast(`“${r.name}” 레시피를 지웠어요`, { label: '되돌리기', run: () => dispatch({ type: 'saveRecipe', recipe: r }) });
                }}
              >
                ✕
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
