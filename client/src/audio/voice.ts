import { hash } from '../sim/rng';

let voices: SpeechSynthesisVoice[] = [];

function loadVoices() {
  if (typeof speechSynthesis === 'undefined') return;
  voices = speechSynthesis.getVoices();
}

if (typeof speechSynthesis !== 'undefined') {
  loadVoices();
  speechSynthesis.addEventListener('voiceschanged', loadVoices);
}

export function speak(name: string, text: string, k: number, muted: boolean) {
  if (muted || typeof speechSynthesis === 'undefined') return;
  // self-limiting: if the queue is backed up, drop the line
  if (speechSynthesis.pending || speechSynthesis.speaking) {
    if (Math.random() > 0.35) return;
  }
  if (Math.random() > 0.35 + 0.5 * k) return;

  const u = new SpeechSynthesisUtterance(text);
  const h = hash(name);
  u.pitch = 0.75 + ((h % 100) / 100) * 1.05;
  u.rate = 1.05 + ((hash(name + 'r') % 40) / 100);
  u.volume = 0.9;
  if (voices.length) u.voice = voices[h % voices.length];
  speechSynthesis.speak(u);
}

export function cutVoices() {
  if (typeof speechSynthesis === 'undefined') return;
  speechSynthesis.cancel();
}

let drone: HTMLAudioElement | null = null;
let chitter: HTMLAudioElement | null = null;

/** Procedurally generated loops — no asset files needed. */
function makeToneLoop(freqs: number[], seconds: number, gain: number): HTMLAudioElement {
  const rate = 22050;
  const n = rate * seconds;
  const buf = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    let v = 0;
    for (const f of freqs) v += Math.sin((2 * Math.PI * f * i) / rate);
    v /= freqs.length;
    // fade edges so the loop does not click
    const fade = Math.min(1, Math.min(i, n - i) / (rate * 0.05));
    buf[i] = Math.max(-1, Math.min(1, v * gain * fade)) * 32767;
  }
  const header = new ArrayBuffer(44);
  const dv = new DataView(header);
  const write = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) dv.setUint8(off + i, s.charCodeAt(i));
  };
  write(0, 'RIFF');
  dv.setUint32(4, 36 + buf.byteLength, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  dv.setUint32(16, 16, true);
  dv.setUint16(20, 1, true);
  dv.setUint16(22, 1, true);
  dv.setUint32(24, rate, true);
  dv.setUint32(28, rate * 2, true);
  dv.setUint16(32, 2, true);
  dv.setUint16(34, 16, true);
  write(36, 'data');
  dv.setUint32(40, buf.byteLength, true);
  const blob = new Blob([header, buf], { type: 'audio/wav' });
  const el = new Audio(URL.createObjectURL(blob));
  el.loop = true;
  el.volume = 0;
  return el;
}

export function initAudio() {
  if (drone) return;
  drone = makeToneLoop([38, 57, 76.5], 4, 0.5);
  chitter = makeToneLoop([2200, 3100, 4300], 2, 0.05);
  drone.play().catch(() => {});
  chitter.play().catch(() => {});
}

export function setAudioLevels(k: number, muted: boolean) {
  if (drone) drone.volume = muted ? 0 : 0.35 * k;
  if (chitter) chitter.volume = muted ? 0 : 0.25 * (1 - k);
}
