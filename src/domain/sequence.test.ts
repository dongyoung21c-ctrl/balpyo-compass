import { buildSequence, totalSeconds, estimateMinutes, hasRounds } from './sequence';
import { findMethod, METHODS } from '../data/methods';
import type { Method } from './types';

const method = (id: string): Method => {
  const m = findMethod(id);
  if (!m) throw new Error(id);
  return m;
};

describe('buildSequence', () => {
  it('반복 없는 방법은 단계를 그대로 쓴다', () => {
    const seq = buildSequence(method('tps'), 5);
    expect(seq.map((s) => s.title)).toEqual(['혼자 생각하기', '짝과 나누기', '전체 나누기']);
    expect(seq.every((s) => s.round === 0)).toBe(true);
  });

  it('라운드마다 반복하고 라운드 사이 단계는 마지막 뒤에서 뺀다', () => {
    const seq = buildSequence(method('worldcafe'), 3);
    expect(seq.map((s) => `${s.title}#${s.round}`)).toEqual([
      '주제·규칙 안내#0',
      '테이블 대화#1', '자리 이동#1',
      '테이블 대화#2', '자리 이동#2',
      '테이블 대화#3',
      '호스트 요약#0', '전체 공유#0',
    ]);
  });

  it('1라운드면 사이 단계가 없다', () => {
    const seq = buildSequence(method('gallery'), 1);
    expect(seq.map((s) => s.title)).toEqual(['작품 게시', '감상하고 피드백', '우리 작품 피드백 읽기']);
  });

  it('여러 단계가 매 라운드 반복된다', () => {
    const seq = buildSequence(method('tableau'), 2);
    expect(seq.filter((s) => s.round === 2).map((s) => s.title)).toEqual(['정지 장면 보여주기', '추측하고 인터뷰']);
  });

  it('사용자가 정한 시간을 쓴다', () => {
    const m = method('tps');
    expect(buildSequence(m, 1, [10, 20, 30]).map((s) => s.sec)).toEqual([10, 20, 30]);
  });

  it('라운드 수가 0 이하이면 1로 본다', () => {
    expect(buildSequence(method('roundrobin'), 0).filter((s) => s.round > 0)).toHaveLength(1);
  });
});

describe('시간 계산', () => {
  it('총 시간은 단계 합이다', () => {
    expect(totalSeconds(buildSequence(method('tps'), 1))).toBe(360);
  });
  it('수동 단계뿐이면 지정한 분이나 3분', () => {
    expect(estimateMinutes(method('nunchi'))).toBe(5);
    expect(estimateMinutes(method('relay'))).toBe(5);
    expect(estimateMinutes({ ...method('arrow'), minutes: undefined })).toBe(3);
  });
  it('반복 여부를 안다', () => {
    expect(hasRounds(method('worldcafe'))).toBe(true);
    expect(hasRounds(method('tps'))).toBe(false);
  });
});

describe('방법 데이터', () => {
  it('34개이고 id가 겹치지 않는다', () => {
    expect(METHODS).toHaveLength(34);
    expect(new Set(METHODS.map((m) => m.id)).size).toBe(34);
  });
  it('rounds를 가진 방법은 반복 단계가 있고, 반대도 같다', () => {
    for (const m of METHODS) expect(hasRounds(m)).toBe(m.rounds !== undefined);
  });
  it('없는 id는 undefined', () => {
    expect(findMethod('nope')).toBeUndefined();
  });
});
