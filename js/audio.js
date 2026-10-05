// Efectos de sonido simples con Web Audio (sin archivos externos).
let ctx = null;

function ac() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

// Los navegadores solo habilitan el audio tras una interacción real (clic o tecla).
['pointerdown', 'keydown'].forEach((ev) => addEventListener(ev, () => ac(), { once: false, passive: true }));

function tone(freq, dur = 0.12, type = 'sine', when = 0, gain = 0.18) {
  const a = ac();
  if (!a) return;
  const t = a.currentTime + when;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sfx = {
  click: () => tone(660, 0.08, 'triangle'),
  good: () => { tone(660, 0.1, 'triangle'); tone(990, 0.14, 'triangle', 0.08); },
  bad: () => { tone(220, 0.22, 'sawtooth', 0, 0.12); tone(160, 0.25, 'sawtooth', 0.1, 0.12); },
  tick: () => tone(1200, 0.05, 'square', 0, 0.06),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'triangle', i * 0.12)),
  lose: () => [392, 330, 262].forEach((f, i) => tone(f, 0.25, 'sawtooth', i * 0.18, 0.1)),
  count: () => tone(880, 0.12, 'square', 0, 0.08),
};
