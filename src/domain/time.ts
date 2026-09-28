/** 초시계 한 단계의 최대 길이 (99분) */
export const MAX_STEP_SECONDS = 99 * 60;

/** 125 → "2:05" */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * 교사가 입력한 시간을 초로 바꾼다.
 * "1:30" → 90, "3" → 180(분으로 해석), "0.5" → 30, "" → 0. 해석할 수 없으면 null.
 */
export function parseClock(input: string): number | null {
  const v = input.trim();
  if (v === '') return 0;
  const clock = /^(\d{1,2}):(\d{1,2})$/.exec(v);
  if (clock) {
    const secs = Number(clock[1]) * 60 + Number(clock[2]);
    return clampStep(secs);
  }
  if (/^\d+(\.\d+)?$/.test(v)) return clampStep(Math.round(Number(v) * 60));
  return null;
}

export function clampStep(secs: number): number {
  return Math.max(0, Math.min(MAX_STEP_SECONDS, Math.round(secs)));
}
