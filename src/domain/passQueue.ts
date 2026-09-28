/** 줄줄이 발표: 한 바퀴 돌며 발표하거나 통과하고, 두 번째 바퀴에 통과한 친구가 발표한다. */
export interface PassQueue {
  readonly phase: 1 | 2;
  readonly order: readonly string[];
  readonly index: number;
  readonly passed: readonly string[];
  readonly spoken: number;
}

export function startPassQueue(students: readonly string[]): PassQueue {
  return { phase: 1, order: [...students], index: 0, passed: [], spoken: 0 };
}

export function currentSpeaker(q: PassQueue): string | undefined {
  return q.order[q.index];
}

export function speak(q: PassQueue): PassQueue {
  if (!currentSpeaker(q)) return q;
  return { ...q, index: q.index + 1, spoken: q.spoken + 1 };
}

export function pass(q: PassQueue): PassQueue {
  const who = currentSpeaker(q);
  if (!who) return q;
  return { ...q, index: q.index + 1, passed: q.phase === 1 ? [...q.passed, who] : q.passed };
}

export function canStartSecondRound(q: PassQueue): boolean {
  return q.phase === 1 && !currentSpeaker(q) && q.passed.length > 0;
}

export function startSecondRound(q: PassQueue): PassQueue {
  if (!canStartSecondRound(q)) return q;
  return { ...q, phase: 2, order: q.passed, passed: [], index: 0 };
}

export function isFinished(q: PassQueue): boolean {
  return !currentSpeaker(q) && !canStartSecondRound(q);
}
