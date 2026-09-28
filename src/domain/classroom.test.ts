import { createClass, recordTalk, adjustCount, setStudents, renameClass, resetCounts, classStats } from './classroom';

describe('classroom', () => {
  const base = createClass('c1', '5-3', ['가', '나', '다']);

  it('발표를 기록해도 원본은 그대로다', () => {
    const next = recordTalk(base, '가', 1000);
    expect(next.counts).toEqual({ 가: 1 });
    expect(next.last).toEqual({ 가: 1000 });
    expect(base.counts).toEqual({});
  });

  it('횟수는 0 아래로 내려가지 않는다', () => {
    expect(adjustCount(base, '나', -1).counts.나).toBe(0);
    expect(adjustCount(recordTalk(base, '나', 1), '나', 2).counts.나).toBe(3);
  });

  it('명단을 바꾸면 빠진 학생 기록만 지운다', () => {
    const c = setStudents(recordTalk(recordTalk(base, '가', 1), '다', 2), ['가', '라']);
    expect(c.students).toEqual(['가', '라']);
    expect(c.counts).toEqual({ 가: 1 });
    expect(c.last).toEqual({ 가: 1 });
  });

  it('빈 이름으로는 바꾸지 않는다', () => {
    expect(renameClass(base, '  ')).toBe(base);
    expect(renameClass(base, ' 6-1 ').name).toBe('6-1');
  });

  it('기록 초기화', () => {
    expect(resetCounts(recordTalk(base, '가', 1)).counts).toEqual({});
  });

  it('통계는 적게 한 순서, 같으면 오래전에 한 순서', () => {
    let c = recordTalk(base, '가', 5);
    c = recordTalk(c, '나', 1);
    c = recordTalk(c, '나', 2);
    const s = classStats(recordTalk(c, '다', 9));
    expect(s.rows.map((r) => r.name)).toEqual(['가', '다', '나']);
    expect(s.total).toBe(4);
    expect(s.neverSpoke).toBe(0);
    expect(s.max).toBe(2);
    expect(classStats(createClass('x', 'x')).average).toBe(0);
  });
});
