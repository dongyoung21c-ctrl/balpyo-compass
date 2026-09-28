import { useState } from 'preact/hooks';
import { GROUP_LABELS } from '../data/labels';
import { METHODS } from '../data/methods';
import { recommend, type Mood, type RecommendQuery, type TimeBudget } from '../domain/recommend';
import { estimateMinutes } from '../domain/sequence';
import type { GroupForm, LessonStage } from '../domain/types';
import { BurdenDots, Chips } from './common';

interface Props {
  readonly onOpen: (methodId: string) => void;
  readonly onRun: (methodId: string) => void;
}

const TIME_OPTIONS: { value: TimeBudget; label: string }[] = [
  { value: 'short', label: '5분 안팎' },
  { value: 'medium', label: '10~15분' },
  { value: 'long', label: '20분 이상' },
];
const GROUP_OPTIONS = (Object.keys(GROUP_LABELS) as GroupForm[]).map((value) => ({ value, label: GROUP_LABELS[value] }));
const STAGE_OPTIONS: { value: LessonStage; label: string }[] = [
  { value: '도입', label: '도입 · 생각 열기' },
  { value: '전개', label: '전개 · 생각 나누기' },
  { value: '정리', label: '정리 · 배움 공유' },
];
const MOOD_OPTIONS: { value: Mood; label: string }[] = [
  { value: 'shy', label: '발표를 어려워해요' },
  { value: 'confident', label: '발표를 잘하는 편이에요' },
];

export function Recommend({ onOpen, onRun }: Props) {
  const [q, setQ] = useState<RecommendQuery>({});
  const set = <K extends keyof RecommendQuery>(k: K) => (v: RecommendQuery[K]) => setQ((prev) => ({ ...prev, [k]: v }));
  const results = recommend(METHODS, q);

  return (
    <section aria-label="추천받기" class="recommend">
      <p class="muted intro">질문에 답할수록 추천이 좁혀져요. 같은 답을 다시 누르면 선택이 풀려요.</p>
      <Question title="시간은 얼마나 있나요?"><Chips label="시간" options={TIME_OPTIONS} value={q.time} onChange={set('time')} /></Question>
      <Question title="어떤 형태로 할까요?"><Chips label="형태" options={GROUP_OPTIONS} value={q.group} onChange={set('group')} /></Question>
      <Question title="수업의 어느 부분인가요?"><Chips label="수업 단계" options={STAGE_OPTIONS} value={q.stage} onChange={set('stage')} /></Question>
      <Question title="학생들의 발표 분위기는요?"><Chips label="분위기" options={MOOD_OPTIONS} value={q.mood} onChange={set('mood')} /></Question>

      {results.length > 0 && (
        <div aria-live="polite">
          <h2 class="rec-title">이런 방법은 어떠세요?</h2>
          <ol class="rec-out">
            {results.map(({ method: m, reasons }, i) => (
              <li key={m.id} class="rec-item">
                <span class="rank" aria-hidden="true">{i + 1}</span>
                <div>
                  <h3>{m.name}</h3>
                  <p>{m.summary}</p>
                  <p class="small">
                    {GROUP_LABELS[m.group]} · 약 {estimateMinutes(m)}분 · 부담 <BurdenDots level={m.burden} />
                    {reasons.length > 0 && <span class="reasons"> · 맞는 조건: {reasons.join(', ')}</span>}
                  </p>
                </div>
                <div class="row">
                  <button type="button" class="btn" onClick={() => onOpen(m.id)}>자세히</button>
                  <button type="button" class="btn primary" onClick={() => onRun(m.id)}>▶ 진행</button>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

function Question({ title, children }: { title: string; children: preact.ComponentChildren }) {
  return (
    <div class="q">
      <h3>{title}</h3>
      {children}
    </div>
  );
}
