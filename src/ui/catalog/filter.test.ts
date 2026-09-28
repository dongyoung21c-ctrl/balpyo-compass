import { filterMethods, isFiltered, EMPTY_FILTER } from './filter';
import { METHODS } from '../../data/methods';

describe('filterMethods', () => {
  it('조건이 없으면 전부', () => {
    expect(filterMethods(METHODS, EMPTY_FILTER)).toHaveLength(METHODS.length);
    expect(isFiltered(EMPTY_FILTER)).toBe(false);
  });

  it('띄어쓰기와 상관없이 이름·설명·단계에서 찾는다', () => {
    const ids = filterMethods(METHODS, { q: '월드 카페' }).map((m) => m.id);
    expect(ids).toEqual(['worldcafe']);
    expect(filterMethods(METHODS, { q: '호스트 요약' }).map((m) => m.id)).toContain('worldcafe');
    expect(filterMethods(METHODS, { q: 'think' }).map((m) => m.id)).toEqual(['tps']);
  });

  it('조건을 함께 건다', () => {
    const r = filterMethods(METHODS, { q: '', group: '모둠', stage: '정리', maxBurden: 2 });
    expect(r.length).toBeGreaterThan(0);
    for (const m of r) {
      expect(m.group).toBe('모둠');
      expect(m.stages).toContain('정리');
      expect(m.burden).toBeLessThanOrEqual(2);
    }
    expect(isFiltered({ q: '', maxBurden: 1 })).toBe(true);
  });

  it('분류로 거른다', () => {
    expect(filterMethods(METHODS, { q: '', cat: 'pick' }).every((m) => m.cat === 'pick')).toBe(true);
  });
});
