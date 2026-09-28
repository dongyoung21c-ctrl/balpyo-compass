import { GROUP_LABELS } from '../data/labels';
import { estimateMinutes } from './sequence';
import type { GroupForm, LessonStage, Method } from './types';

export type TimeBudget = 'short' | 'medium' | 'long';
export type Mood = 'shy' | 'confident';

export interface RecommendQuery {
  readonly time?: TimeBudget;
  readonly group?: GroupForm;
  readonly stage?: LessonStage;
  readonly mood?: Mood;
}

export interface Recommendation {
  readonly method: Method;
  readonly score: number;
  /** 왜 추천했는지 (맞은 조건) */
  readonly reasons: readonly string[];
}

export function isEmptyQuery(q: RecommendQuery): boolean {
  return !q.time && !q.group && !q.stage && !q.mood;
}

const TIME_LABEL: Record<TimeBudget, string> = { short: '5분 안팎', medium: '10~15분', long: '20분 이상' };

function timeScore(minutes: number, time: TimeBudget): number {
  if (time === 'short') return minutes <= 6 ? 3 : minutes <= 10 ? 1 : -2;
  if (time === 'medium') return minutes > 6 && minutes <= 18 ? 3 : minutes <= 6 ? 1 : 0;
  return minutes > 15 ? 3 : minutes > 8 ? 1 : -1;
}

function scoreMethod(m: Method, q: RecommendQuery): Recommendation {
  let score = 0;
  const reasons: string[] = [];
  if (q.time) {
    const s = timeScore(estimateMinutes(m), q.time);
    score += s;
    if (s >= 3) reasons.push(TIME_LABEL[q.time]);
  }
  if (q.group) {
    if (m.group === q.group) {
      score += 3;
      reasons.push(GROUP_LABELS[q.group]);
    } else if (m.group === '전체' && q.group !== '개인') {
      score += 1;
    }
  }
  if (q.stage) {
    const fits = m.stages.includes(q.stage);
    score += fits ? 2 : -1;
    if (fits) reasons.push(q.stage);
  }
  if (q.mood === 'shy') {
    score += m.burden === 1 ? 2 : m.burden === 3 ? -3 : 0;
    if (m.burden === 1) reasons.push('부담 낮음');
  }
  if (q.mood === 'confident' && m.burden >= 2) {
    score += 2;
    reasons.push('도전해 볼 만함');
  }
  return { method: m, score, reasons };
}

/** 조건에 가장 잘 맞는 방법을 limit개 고른다. 점수가 같으면 도감 순서를 따른다. */
export function recommend(methods: readonly Method[], q: RecommendQuery, limit = 3): Recommendation[] {
  if (isEmptyQuery(q)) return [];
  return methods
    .map((m, i) => ({ r: scoreMethod(m, q), i }))
    .sort((a, b) => b.r.score - a.r.score || b.r.reasons.length - a.r.reasons.length || a.i - b.i)
    .slice(0, limit)
    .map(({ r }) => r);
}
