import { pickSpeaker } from './picker';
import { makeGroups } from './groups';
import { parseRoster, duplicateNames } from './roster';
import { pickOne, shuffle, sequenceRng } from './random';

describe('pickSpeaker', () => {
  const names = ['가', '나', '다'];

  it('명단이 비면 null', () => {
    expect(pickSpeaker([], {}, new Set(), true)).toBeNull();
  });

  it('공정 모드가 아니면 고르게 뽑는다', () => {
    expect(pickSpeaker(names, {}, new Set(['가']), false, () => 0)?.name).toBe('가');
  });

  it('이미 뽑힌 학생은 빼고 뽑는다', () => {
    const r = pickSpeaker(names, {}, new Set(['가', '나']), true, () => 0);
    expect(r).toEqual({ name: '다', restarted: false });
  });

  it('모두 뽑혔으면 처음부터 다시 돈다', () => {
    const r = pickSpeaker(names, {}, new Set(names), true, () => 0);
    expect(r?.restarted).toBe(true);
  });

  it('적게 발표한 학생에게 가중치를 준다', () => {
    // 가중치: 가(0회)=1, 나(1회)=0.25, 다(2회)=1/9 → 합 ≈ 1.361
    const counts = { 나: 1, 다: 2 };
    expect(pickSpeaker(names, counts, new Set(), true, () => 0.7)?.name).toBe('가');
    expect(pickSpeaker(names, counts, new Set(), true, () => 0.8)?.name).toBe('나');
    expect(pickSpeaker(names, counts, new Set(), true, () => 0.99)?.name).toBe('다');
  });

  it('통계적으로도 0회 학생이 훨씬 자주 뽑힌다', () => {
    let seed = 1;
    const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const hits: Record<string, number> = {};
    for (let i = 0; i < 3000; i++) {
      const n = pickSpeaker(['a', 'b'], { b: 3 }, new Set(), true, rng)?.name ?? '';
      hits[n] = (hits[n] ?? 0) + 1;
    }
    expect(hits.a ?? 0).toBeGreaterThan((hits.b ?? 0) * 8);
  });
});

describe('makeGroups', () => {
  const kids = Array.from({ length: 25 }, (_, i) => `학생${i + 1}`);

  it('인원 차이가 최대 1명이고 빠지는 학생이 없다', () => {
    const g = makeGroups(kids, 4, sequenceRng([0.3, 0.7, 0.1]));
    expect(g).toHaveLength(6);
    const sizes = g.map((x) => x.length);
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
    expect(g.flat().sort()).toEqual([...kids].sort());
  });

  it('짝 편성에서 홀수여도 혼자 남는 학생이 없다', () => {
    const g = makeGroups(kids, 2);
    expect(g).toHaveLength(12);
    expect(Math.min(...g.map((x) => x.length))).toBe(2);
    expect(Math.max(...g.map((x) => x.length))).toBe(3);
    const seven = makeGroups(kids.slice(0, 7), 5);
    expect(seven.map((x) => x.length)).toEqual([7]);
    expect(makeGroups(kids, 4).map((x) => x.length).sort()).toEqual([4, 4, 4, 4, 4, 5]);
  });

  it('학생이 없으면 빈 목록, 적으면 한 모둠', () => {
    expect(makeGroups([], 4)).toEqual([]);
    expect(makeGroups(['a'], 4)).toHaveLength(1);
  });
});

describe('parseRoster', () => {
  it('줄마다 한 명, 번호와 중복은 지운다', () => {
    expect(parseRoster('1. 김민준\n2) 이서연\n\n김민준\n  박 도윤 ')).toEqual(['김민준', '이서연', '박 도윤']);
  });
  it('한 줄로 띄어 쓴 명단은 띄어쓰기로 나눈다', () => {
    expect(parseRoster('김민준 이서연  박도윤')).toEqual(['김민준', '이서연', '박도윤']);
  });
  it('쉼표나 탭(스프레드시트)도 나눈다', () => {
    expect(parseRoster('김민준, 이서연\t박도윤')).toEqual(['김민준', '이서연', '박도윤']);
  });
  it('겹치는 이름을 찾는다', () => {
    expect(duplicateNames('김민준\n이서연\n김민준\n김민준')).toEqual(['김민준']);
    expect(duplicateNames('가 나')).toEqual([]);
  });
  it('빈 입력은 빈 목록', () => {
    expect(parseRoster('   ')).toEqual([]);
  });
});

describe('random 도우미', () => {
  it('pickOne은 빈 배열에서 undefined', () => {
    expect(pickOne([])).toBeUndefined();
    expect(pickOne(['x'], () => 0.5)).toBe('x');
  });
  it('shuffle은 원본을 바꾸지 않는다', () => {
    const a = [1, 2, 3, 4];
    const b = shuffle(a, () => 0);
    expect(a).toEqual([1, 2, 3, 4]);
    expect([...b].sort()).toEqual(a);
  });
});
