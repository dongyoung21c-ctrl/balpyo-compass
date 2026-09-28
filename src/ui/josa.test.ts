import { josa } from './josa';

describe('josa', () => {
  it('받침에 따라 조사를 고른다', () => {
    expect(josa('5학년 3반', '을/를')).toBe('5학년 3반을');
    expect(josa('예시 반', '과/와')).toBe('예시 반과');
    expect(josa('새 모둠', '이/가')).toBe('새 모둠이');
    expect(josa('나무', '을/를')).toBe('나무를');
    expect(josa('철수', '은/는')).toBe('철수는');
  });
  it('숫자·영문·괄호로 끝나도 읽는 소리를 따른다', () => {
    expect(josa('6-1', '을/를')).toBe('6-1을');
    expect(josa('5-2', '을/를')).toBe('5-2를');
    expect(josa('Team', '이/가')).toBe('Team이');
    expect(josa('월드카페 (4)', '을/를')).toBe('월드카페 (4)를');
    expect(josa('', '을/를')).toBe('를');
  });
});
