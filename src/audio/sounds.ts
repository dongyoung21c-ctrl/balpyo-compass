import type { SoundId } from '../domain/types';

/* 효과음은 모두 Web Audio로 합성한다. 파일을 따로 받지 않아서 인터넷 없이도 난다. */

let ctx: AudioContext | null = null;

/** 브라우저는 사용자가 한 번 누른 뒤에야 소리를 허락하므로, 버튼을 누를 때 불러 둔다. */
export function unlockAudio(): AudioContext | null {
  if (!ctx) {
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      ctx = Ctor ? new Ctor() : null;
    } catch {
      ctx = null;
    }
  }
  if (ctx?.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.25, delay = 0): void {
  const a = unlockAudio();
  if (!a) return;
  const t = a.currentTime + delay;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(t);
  osc.stop(t + dur);
}

export function clap(): void {
  const a = unlockAudio();
  if (!a) return;
  const len = Math.floor(a.sampleRate * 0.12);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  const src = a.createBufferSource();
  const filter = a.createBiquadFilter();
  const gain = a.createGain();
  filter.type = 'bandpass';
  filter.frequency.value = 1400;
  gain.gain.value = 0.8;
  src.buffer = buf;
  src.connect(filter).connect(gain).connect(a.destination);
  src.start();
}

const END_SOUNDS: Record<SoundId, () => void> = {
  bell: () => {
    tone(880, 1.6, 'sine', 0.28);
    tone(1320, 1.2, 'sine', 0.12);
    tone(2200, 0.6, 'sine', 0.05);
  },
  dingdong: () => {
    tone(784, 0.7, 'triangle', 0.3);
    tone(622, 1.1, 'triangle', 0.3, 0.45);
  },
  xylo: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.4, 'triangle', 0.25, i * 0.12)),
  none: () => undefined,
};

export const playEnd = (id: SoundId): void => END_SOUNDS[id]();

export const sfx = {
  warn: () => {
    tone(660, 0.15, 'triangle', 0.18);
    tone(660, 0.15, 'triangle', 0.18, 0.22);
  },
  tick: () => tone(1200, 0.03, 'square', 0.03),
  reveal: () => {
    tone(988, 0.25, 'triangle', 0.25);
    tone(1319, 0.4, 'triangle', 0.2, 0.12);
  },
  pop: (step = 0) => tone(600 + step * 100, 0.12, 'triangle', 0.2),
  chime: () => tone(880, 0.3, 'sine', 0.2),
  beat: () => tone(523, 0.08, 'triangle', 0.12),
};
