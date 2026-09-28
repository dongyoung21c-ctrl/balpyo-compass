import { recommend, isEmptyQuery } from './recommend';
import { METHODS } from '../data/methods';

describe('recommend', () => {
  it('아무것도 고르지 않으면 추천하지 않는다', () => {
    expect(isEmptyQuery({})).toBe(true);
    expect(recommend(METHODS, {})).toEqual([]);
  });

  it('조건에 맞는 방법 3개를 이유와 함께 준다', () => {
    const r = recommend(METHODS, { group: '짝', stage: '전개', mood: 'shy' });
    expect(r).toHaveLength(3);
    // 전개 단계에 부담 낮은 짝 활동은 둘뿐이라 앞의 둘만 짝이다
    expect(r.slice(0, 2).map((x) => x.method.id).sort()).toEqual(['pair', 'tps']);
    expect(r[0]?.reasons).toEqual(['짝', '전개', '부담 낮음']);
  });

  it('같은 조건이면 늘 같은 결과(결정적)', () => {
    const q = { time: 'long', group: '모둠' } as const;
    expect(recommend(METHODS, q).map((x) => x.method.id)).toEqual(recommend(METHODS, q).map((x) => x.method.id));
  });

  it('짧은 시간이면 긴 방법을 피한다', () => {
    const r = recommend(METHODS, { time: 'short' });
    expect(r.map((x) => x.method.id)).not.toContain('jigsaw');
    expect(r[0]?.reasons).toContain('5분 안팎');
  });

  it('발표를 잘하는 반이면 부담 있는 방법을 올린다', () => {
    const r = recommend(METHODS, { mood: 'confident', group: '개인' });
    expect(r[0]?.method.burden).toBeGreaterThanOrEqual(2);
    expect(r[0]?.reasons).toContain('도전해 볼 만함');
  });

  it('limit만큼 돌려준다', () => {
    expect(recommend(METHODS, { group: '모둠', time: 'medium' }, 34)).toHaveLength(34);
  });
});
