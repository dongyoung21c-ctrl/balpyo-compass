/** 숫자·영문으로 끝날 때 받침이 있는 읽기 (0 영, 1 일, 3 삼, 6 육, 7 칠, 8 팔 / m n l …) */
const FINAL_DIGITS = new Set(['0', '1', '3', '6', '7', '8']);
const FINAL_LATIN = new Set(['l', 'm', 'n', 'r']);

function hasFinalConsonant(word: string): boolean {
  const last = word.trim().replace(/[^0-9A-Za-z가-힣]+$/, '').slice(-1);
  if (!last) return false;
  const code = last.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 !== 0;
  if (/[0-9]/.test(last)) return FINAL_DIGITS.has(last);
  return FINAL_LATIN.has(last.toLowerCase());
}

type Pair = '을/를' | '이/가' | '과/와' | '은/는';

/** josa('5학년 3반', '을/를') → '5학년 3반을' */
export function josa(word: string, pair: Pair): string {
  const [withFinal, withoutFinal] = pair.split('/') as [string, string];
  return word + (hasFinalConsonant(word) ? withFinal : withoutFinal);
}
