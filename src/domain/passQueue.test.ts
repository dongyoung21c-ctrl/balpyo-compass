import { startPassQueue, currentSpeaker, speak, pass, canStartSecondRound, startSecondRound, isFinished } from './passQueue';

describe('줄줄이·패스 명단', () => {
  it('통과한 친구는 두 번째 바퀴에 차례가 온다', () => {
    let q = startPassQueue(['가', '나', '다']);
    q = speak(q);
    q = pass(q);
    q = speak(q);
    expect(currentSpeaker(q)).toBeUndefined();
    expect(q.passed).toEqual(['나']);
    expect(canStartSecondRound(q)).toBe(true);
    expect(isFinished(q)).toBe(false);

    q = startSecondRound(q);
    expect(q.phase).toBe(2);
    expect(currentSpeaker(q)).toBe('나');
    q = pass(q);
    expect(q.passed).toEqual([]);
    expect(isFinished(q)).toBe(true);
    expect(q.spoken).toBe(2);
  });

  it('통과한 사람이 없으면 한 바퀴로 끝난다', () => {
    const q = speak(startPassQueue(['가']));
    expect(canStartSecondRound(q)).toBe(false);
    expect(startSecondRound(q)).toBe(q);
    expect(isFinished(q)).toBe(true);
  });

  it('끝난 뒤에는 발표·통과를 눌러도 바뀌지 않는다', () => {
    const q = startPassQueue([]);
    expect(speak(q)).toBe(q);
    expect(pass(q)).toBe(q);
  });
});
