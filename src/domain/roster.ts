/**
 * 붙여 넣은 명단을 이름 목록으로 바꾼다.
 * 줄바꿈·쉼표·탭으로 나눈 경우에는 이름 안의 띄어쓰기를 살리고,
 * 한 줄로 띄어 쓴 명단("김민준 이서연")이면 띄어쓰기로 나눈다.
 * "1. 김민준", "3) 이서연"처럼 앞에 붙은 번호는 지운다. 중복은 한 번만 남긴다.
 */
export function parseRoster(text: string): string[] {
  return [...new Set(splitNames(text))];
}

/** 명단에 두 번 이상 나온 이름. 같은 이름은 한 명으로 합쳐지므로 선생님께 알려 준다. */
export function duplicateNames(text: string): string[] {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const n of splitNames(text)) (seen.has(n) ? dup : seen).add(n);
  return [...dup];
}

function splitNames(text: string): string[] {
  const hasSeparators = /[\n,\t]/.test(text.trim());
  return text
    .split(hasSeparators ? /[\n,\t]+/ : /\s+/)
    .map((p) => p.replace(/^\s*\d+\s*[.)]?\s*/, '').replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 0);
}
