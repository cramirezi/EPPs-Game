// Sonido del juego, generado en vivo con Web Audio (sin archivos externos):
// efectos, música de fondo que se acelera cuando queda poco tiempo, y voz en español.
const MUTE_KEY = 'mision-epp.muted';
let ctx = null;
let master = null;
let muted = false;
try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch { /* sin almacenamiento */ }
const listeners = new Set();

function ac() {
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 1;
      master.connect(ctx.destination);
    } catch { return null; }
  }
  if (ctx.state === 'suspended') ctx.resume().then(notify).catch(() => {});
  return ctx;
}

// Los navegadores solo habilitan el audio tras una interacción real (clic, toque o tecla).
['pointerdown', 'keydown'].forEach((ev) => addEventListener(ev, () => ac(), { passive: true }));

function notify() { listeners.forEach((fn) => fn()); }

function tone(freq, dur = 0.12, type = 'sine', when = 0, gain = 0.18) {
  const a = ac();
  if (!a || a.state !== 'running') return;
  const t = a.currentTime + when;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

// Ruido corto (para el "golpe" de la batería de la música).
function noise(dur = 0.05, when = 0, gain = 0.05) {
  const a = ac();
  if (!a || a.state !== 'running') return;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = a.createBufferSource();
  const g = a.createGain();
  g.gain.value = gain;
  s.buffer = buf;
  s.connect(g).connect(master);
  s.start(a.currentTime + when);
}

export const sfx = {
  click: () => tone(660, 0.08, 'triangle'),
  hover: () => tone(1320, 0.03, 'sine', 0, 0.04),
  good: () => { tone(660, 0.1, 'triangle'); tone(990, 0.16, 'triangle', 0.08); },
  bad: () => { tone(220, 0.22, 'sawtooth', 0, 0.12); tone(160, 0.28, 'sawtooth', 0.1, 0.12); },
  tick: () => tone(1200, 0.05, 'square', 0, 0.06),
  shuffle: () => [400, 600, 500, 700].forEach((f, i) => tone(f, 0.06, 'square', i * 0.05, 0.05)),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, 'triangle', i * 0.12)),
  fanfare: () => [523, 523, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i === 7 ? 0.6 : 0.16, 'triangle', i * 0.14, 0.16)),
  lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, 'sawtooth', i * 0.2, 0.09)),
  count: () => tone(880, 0.12, 'square', 0, 0.08),
  go: () => tone(1320, 0.3, 'square', 0, 0.1),
};

// ---------- Música de fondo ----------
// Patrón simple de bajo + arpegio; el tempo sube en niveles altos y cuando queda poco tiempo.
const BASS = [110, 110, 146.8, 130.8];             // La, La, Re, Do
const ARP = [0, 4, 7, 12, 7, 4, 0, 7];               // semitonos sobre el bajo
let musicTimer = null;
let step = 0;
let bpm = 110;
let urgent = false;

export const music = {
  start(level = 1) {
    this.stop();
    bpm = 100 + level * 8;
    urgent = false;
    step = 0;
    const tick = () => {
      const tempo = urgent ? bpm * 1.35 : bpm;
      const bass = BASS[Math.floor(step / 8) % BASS.length];
      if (step % 4 === 0) { tone(bass, 0.25, 'triangle', 0, 0.1); noise(0.04, 0, 0.04); }
      tone(bass * 2 * 2 ** (ARP[step % 8] / 12), 0.09, 'square', 0, urgent ? 0.035 : 0.025);
      step++;
      musicTimer = setTimeout(tick, 60000 / tempo / 2);
    };
    tick();
  },
  urgent(on) { urgent = on; },
  stop() { clearTimeout(musicTimer); musicTimer = null; },
};

// ---------- Voz en español ----------
let voice = null;
function pickVoice() {
  const voices = window.speechSynthesis?.getVoices() || [];
  voice = voices.find((v) => /^es[-_](MX|US|419|PE|CO|CL)/i.test(v.lang)) || voices.find((v) => /^es/i.test(v.lang)) || null;
}
if (window.speechSynthesis) {
  pickVoice();
  speechSynthesis.onvoiceschanged = pickVoice;
}

export function speak(text) {
  if (muted || !window.speechSynthesis) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = voice?.lang || 'es-ES';
  if (voice) u.voice = voice;
  u.rate = 1.05;
  speechSynthesis.speak(u);
}

// ---------- Silencio ----------
export const sound = {
  get muted() { return muted; },
  get locked() { return !ctx || ctx.state !== 'running'; },   // el navegador aún no permite sonido
  toggle() {
    ac();
    muted = !muted;
    try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch { /* sin almacenamiento */ }
    if (master) master.gain.value = muted ? 0 : 1;
    if (muted) window.speechSynthesis?.cancel();
    notify();
  },
  onChange(fn) { listeners.add(fn); },
};
