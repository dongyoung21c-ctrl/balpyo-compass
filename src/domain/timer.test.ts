import { enterStep, tick, pause, resume, addTime, progress, WARN_BEFORE_MS } from './timer';
import type { RunStep } from './sequence';

const seq: RunStep[] = [
  { title: 'A', desc: '', sec: 120, round: 0, stepIndex: 0 },
  { title: 'B', desc: '', sec: 0, round: 0, stepIndex: 1 },
  { title: 'C', desc: '', sec: 30, round: 0, stepIndex: 2 },
];

describe('timer', () => {
  it('시간 있는 단계는 바로 흐르고, 0초 단계는 수동이다', () => {
    expect(enterStep(seq, 0, 0).status).toBe('running');
    expect(enterStep(seq, 1, 0).status).toBe('manual');
  });

  it('범위를 벗어난 단계 번호는 잘린다', () => {
    expect(enterStep(seq, 99, 0).index).toBe(2);
    expect(enterStep(seq, -3, 0).index).toBe(0);
  });

  it('30초 전에 한 번만 알리고, 끝나면 finish', () => {
    const s0 = enterStep(seq, 0, 0);
    const a = tick(s0, 120_000 - WARN_BEFORE_MS, true);
    expect(a.events).toEqual(['warn']);
    const b = tick(a.state, 100_000, true);
    expect(b.events).toEqual([]);
    const c = tick(b.state, 125_000, true);
    expect(c.events).toEqual(['finish']);
    expect(c.state.status).toBe('finished');
    expect(c.state.remainingMs).toBe(0);
  });

  it('알림을 끄거나 짧은 단계면 미리 알리지 않는다', () => {
    expect(tick(enterStep(seq, 0, 0), 100_000, false).events).toEqual([]);
    expect(tick(enterStep(seq, 2, 0), 10_000, true).events).toEqual([]);
  });

  it('멈춘 동안은 시간이 가지 않는다', () => {
    const p = pause(enterStep(seq, 0, 0), 20_000);
    expect(p.remainingMs).toBe(100_000);
    expect(tick(p, 500_000, true).state).toBe(p);
    const r = resume(p, 500_000);
    expect(tick(r, 510_000, true).state.remainingMs).toBe(90_000);
  });

  it('상태가 맞지 않으면 pause/resume은 그대로 돌려준다', () => {
    const m = enterStep(seq, 1, 0);
    expect(pause(m, 0)).toBe(m);
    expect(resume(m, 0)).toBe(m);
  });

  it('시간을 더하면 끝난 단계가 다시 흐른다', () => {
    const done = tick(enterStep(seq, 2, 0), 40_000, true).state;
    const more = addTime(done, 60_000, 40_000);
    expect(more.status).toBe('running');
    expect(more.remainingMs).toBe(60_000);
    expect(more.durationMs).toBe(60_000);
    expect(more.warned).toBe(false);
  });

  it('시간을 줄여도 1초 아래로는 가지 않는다', () => {
    const s = addTime(enterStep(seq, 2, 0), -90_000, 0);
    expect(s.remainingMs).toBe(1_000);
  });

  it('멈춘 상태에서 시간을 더해도 멈춰 있다', () => {
    const p = pause(enterStep(seq, 0, 0), 0);
    expect(addTime(p, 60_000, 0).status).toBe('paused');
  });

  it('수동 단계에는 시간을 더할 수 없다', () => {
    const m = enterStep(seq, 1, 0);
    expect(addTime(m, 60_000, 0)).toBe(m);
  });

  it('진행률', () => {
    const s = enterStep(seq, 0, 0);
    expect(progress(s)).toBe(0);
    expect(progress(tick(s, 60_000, false).state)).toBe(0.5);
    expect(progress(enterStep(seq, 1, 0))).toBe(0);
  });
});
