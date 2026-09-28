import { formatClock, parseClock, clampStep, MAX_STEP_SECONDS } from './time';

describe('formatClock', () => {
  it('분:초 두 자리로 표시한다', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(65)).toBe('1:05');
    expect(formatClock(600)).toBe('10:00');
  });
  it('음수는 0으로, 소수는 반올림한다', () => {
    expect(formatClock(-5)).toBe('0:00');
    expect(formatClock(59.6)).toBe('1:00');
  });
});

describe('parseClock', () => {
  it('분:초 형식을 읽는다', () => {
    expect(parseClock('1:30')).toBe(90);
    expect(parseClock(' 0:45 ')).toBe(45);
  });
  it('숫자만 쓰면 분으로 읽는다', () => {
    expect(parseClock('3')).toBe(180);
    expect(parseClock('0.5')).toBe(30);
  });
  it('빈 값은 0(수동 단계)이다', () => {
    expect(parseClock('')).toBe(0);
  });
  it('읽을 수 없으면 null', () => {
    expect(parseClock('abc')).toBeNull();
    expect(parseClock('1:2:3')).toBeNull();
    expect(parseClock('-1')).toBeNull();
  });
  it('최대 99분으로 자른다', () => {
    expect(parseClock('200')).toBe(MAX_STEP_SECONDS);
    expect(clampStep(-10)).toBe(0);
  });
});
