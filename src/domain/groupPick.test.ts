import { pickGroup } from './groupPick';
import { sequenceRng } from './random';

describe('pickGroup', () => {
  it('모둠이 없으면 뽑지 않는다', () => {
    expect(pickGroup(0, [], true)).toBeNull();
  });

  it('1모둠부터 센다', () => {
    expect(pickGroup(4, [], true, sequenceRng([0]))).toEqual({ group: 1, restarted: false });
    expect(pickGroup(4, [], true, sequenceRng([0.99]))).toEqual({ group: 4, restarted: false });
  });

  it('겹치지 않게 뽑으면 이미 뽑힌 모둠은 빠진다', () => {
    expect(pickGroup(3, [1, 2], true, sequenceRng([0]))).toEqual({ group: 3, restarted: false });
  });

  it('모두 뽑혔으면 처음부터 다시 돈다', () => {
    expect(pickGroup(2, [1, 2], true, sequenceRng([0]))).toEqual({ group: 1, restarted: true });
  });

  it('겹쳐도 되면 뽑힌 모둠도 다시 나올 수 있다', () => {
    expect(pickGroup(3, [1, 2], false, sequenceRng([0]))).toEqual({ group: 1, restarted: false });
  });
});
