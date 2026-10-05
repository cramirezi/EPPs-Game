import { EPPS, AREAS, LEVELS, SCORE } from './data.js';
import { Vision } from './vision.js';
import { sfx, music, speak, sound } from './audio.js';

const $ = (sel) => document.querySelector(sel);
const screen = $('#screen');
const hud = $('#hud');
const IDLE_RESET_MS = 75000;   // sin manos ni mouse por este tiempo → vuelve al inicio (modo kiosko)
const STORE_KEY = 'mision-epp.scores';

const state = {
  level: 0,
  total: 0,
  doneAreas: new Set(),
  run: null,       // misión en curso
  timer: null,
  lastActivity: performance.now(),
  camera: 'loading',
};

// ---------- Cámara / visión ----------
const vision = new Vision({
  video: $('#cam'),
  canvas: $('#overlay'),
  arCanvas: $('#ar'),
  onStatus: setCamStatus,
});

function setCamStatus(kind, text) {
  state.camera = kind;
  const el = $('#cam-status');
  el.className = kind;
  $('#cam-text').textContent = text;
  const note = document.getElementById('cam-note');
  if (note) note.textContent = camNote();
}

function camNote() {
  if (state.camera === 'ok') return 'Cámara lista: levanta la mano y apunta con tu dedo índice.';
  if (state.camera === 'err') return 'No se pudo usar la cámara. Puedes jugar con el mouse o la pantalla táctil.';
  return 'Activando cámara y visión por computadora… (acepta el permiso del navegador)';
}

vision.start().catch((e) => {
  console.error(e);
  const msg = e?.name === 'NotAllowedError' ? 'Permiso de cámara denegado' : 'Cámara no disponible';
  setCamStatus('err', `${msg} · juega con mouse/táctil`);
});

// ---------- Utilidades ----------
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function html(strings, ...vals) {
  return strings.reduce((acc, s, i) => acc + s + (i < vals.length ? vals[i] : ''), '');
}

function show(markup, { playing = false } = {}) {
  clearInterval(state.timer);
  state.timer = null;
  document.body.classList.toggle('playing', playing);
  hud.hidden = !playing;
  if (!playing) { vision.setEquipped([]); music.stop(); }
  screen.innerHTML = markup;
}

// Delegación de clics: funciona igual con mano (click sintético), mouse o pantalla táctil.
screen.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  const { action, arg } = el.dataset;
  actions[action]?.(arg, el);
});

let toastTimer = null;
function toast(text, kind = '') {
  const t = $('#toast');
  t.textContent = text;
  t.className = kind;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 2200);
}

// ---------- Pantallas ----------
function introScreen() {
  state.level = 0;
  state.total = 0;
  state.doneAreas.clear();
  show(html`
    <div class="center">
      <span class="tag">Safety Week 2026</span>
      <h1 class="title">Misión <span>EPP</span></h1>
      <p class="subtitle">Elige tu área de trabajo y equípate con el Equipo de Protección Personal correcto antes de que se acabe el tiempo.</p>
      <div class="howto">
        <div><b>☝️</b>Apunta con tu <strong>dedo índice</strong> a la pantalla para mover el cursor.</div>
        <div><b>✋</b>Mantén el dedo sobre un botón hasta que se llene, <strong>o haz una pinza</strong> 👌 para tocarlo.</div>
        <div><b>⏱️</b>5 niveles: cada uno con menos tiempo, más opciones y menos errores permitidos.</div>
      </div>
      <button class="btn" data-hand data-action="start">▶ Comenzar</button>
      <p class="subtitle" id="cam-note">${camNote()}</p>
    </div>`);
}

function levelScreen() {
  const L = LEVELS[state.level];
  const rules = [
    `⏱️ ${L.time} segundos`,
    `🃏 ${L.cards} opciones en pantalla`,
    L.lives ? `❤️ ${L.lives} errores permitidos` : '❤️ Errores ilimitados',
    L.penalty ? `⚠️ Cada error resta ${L.penalty} s` : '🙂 Sin penalidad de tiempo',
    L.showCount ? '🔢 Te mostramos cuántos EPP necesitas' : '🙈 No te diremos cuántos EPP necesitas',
  ];
  if (L.shuffleEvery) rules.push(`🔀 Las tarjetas cambian de lugar cada ${L.shuffleEvery} s`);
  show(html`
    <div class="center">
      <span class="tag">Nivel ${L.n} de ${LEVELS.length}</span>
      <h1 class="title">${L.name}</h1>
      <div class="howto">${rules.map((r) => `<div>${r}</div>`).join('')}</div>
      <p class="subtitle">Puntaje acumulado: <strong>${state.total}</strong></p>
      <button class="btn" data-hand data-action="areas">Elegir área ▶</button>
    </div>`);
  speak(`Nivel ${L.n}: ${L.name}. Tienes ${L.time} segundos por misión.`);
}

function areasScreen() {
  show(html`
    <div class="center">
      <span class="tag">Nivel ${LEVELS[state.level].n} · ${LEVELS[state.level].name}</span>
      <h2 class="title" style="font-size:clamp(1.8rem,4vw,3.4rem)">¿En qué área vas a trabajar hoy?</h2>
      <div class="areas">
        ${AREAS.map((a) => html`
          <button class="area" style="--c:${a.color}" data-hand data-action="pickArea" data-arg="${a.id}">
            ${state.doneAreas.has(a.id) ? '<span class="done">✅</span>' : ''}
            <span class="big">${a.icon}</span>
            <span class="name">${a.name}</span>
            <span class="hazard">${a.hazard}</span>
          </button>`).join('')}
      </div>
    </div>`);
}

function pickMission(area, level) {
  // La misión más difícil disponible para el nivel actual.
  const ok = area.missions.filter((m) => m.diff <= level.maxDiff);
  const top = Math.max(...ok.map((m) => m.diff));
  return shuffle(ok.filter((m) => m.diff === top))[0];
}

function buildCards(required, count) {
  const others = Object.keys(EPPS).filter((id) => !required.includes(id));
  // Priorizar distractores "tramposos": mismo lugar del cuerpo que un EPP requerido.
  const reqSlots = new Set(required.map((id) => EPPS[id].slot));
  const tricky = shuffle(others.filter((id) => reqSlots.has(EPPS[id].slot)));
  const rest = shuffle(others.filter((id) => !reqSlots.has(EPPS[id].slot)));
  const nDistract = Math.max(0, count - required.length);
  const pool = [...tricky.slice(0, Math.ceil(nDistract * 0.6)), ...rest];
  const extra = [...pool, ...tricky].filter((id, i, a) => a.indexOf(id) === i).slice(0, nDistract);
  return shuffle([...required, ...extra]).map((id) => ({ id, status: 'idle' }));
}

function briefingScreen(areaId) {
  const area = AREAS.find((a) => a.id === areaId);
  const level = LEVELS[state.level];
  const mission = pickMission(area, level);
  state.run = {
    area, level, mission,
    cards: buildCards(mission.required, level.cards),
    found: [],
    wrong: [],
    score: 0,
    endAt: 0,
    lastShuffle: 0,
  };
  let n = 3;
  show(html`
    <div class="center">
      <span class="tag" style="background:${area.color}">${area.icon} ${area.name}</span>
      <h2 class="title" style="font-size:clamp(1.8rem,4.5vw,3.8rem)">${mission.title}</h2>
      <p class="subtitle">${mission.text}</p>
      <div class="countdown" id="countdown">${n}</div>
    </div>`);
  sfx.count();
  speak(`${area.name}. ${mission.title}. ${mission.text}`);
  state.timer = setInterval(() => {
    n--;
    if (n <= 0) return playScreen();
    const el = $('#countdown');
    el.textContent = n;
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
    sfx.count();
  }, 1200);
}

function playScreen() {
  const r = state.run;
  show('', { playing: true });
  $('#hud-level').textContent = `${r.level.n}`;
  $('#hud-mission').textContent = `${r.area.icon} ${r.area.name} · ${r.mission.title}`;
  r.endAt = performance.now() + r.level.time * 1000;
  r.lastShuffle = performance.now();
  renderPlay();
  updateHud();
  sfx.go();
  music.start(r.level.n);
  let lastSec = r.level.time;
  state.timer = setInterval(() => {
    const now = performance.now();
    const left = Math.max(0, (r.endAt - now) / 1000);
    updateTimer(left);
    const sec = Math.ceil(left);
    if (sec !== lastSec && sec <= 5 && sec > 0) sfx.tick();
    lastSec = sec;
    music.urgent(left <= 10);
    if (left <= 0) return finish(false, 'time');
    if (r.level.shuffleEvery && now - r.lastShuffle > r.level.shuffleEvery * 1000) {
      r.lastShuffle = now;
      const idle = r.cards.filter((c) => c.status === 'idle');
      const shuffled = shuffle(idle);
      r.cards = r.cards.map((c) => (c.status === 'idle' ? shuffled.shift() : c));
      renderPlay(true);
      sfx.shuffle();
      toast('🔀 ¡Las tarjetas cambiaron de lugar!');
    }
  }, 100);
}

function renderPlay(moved = false) {
  const r = state.run;
  const half = Math.ceil(r.cards.length / 2);
  const cols = [r.cards.slice(0, half), r.cards.slice(half)];
  const perCol = half > 6 ? 2 : 1;
  const card = (c) => {
    const e = EPPS[c.id];
    const cls = c.status === 'ok' ? 'ok' : c.status === 'bad' ? 'bad' : moved ? 'moving' : '';
    return `<button class="card ${cls}" data-hand data-action="pick" data-arg="${c.id}" ${c.status !== 'idle' ? 'disabled' : ''}>
      <span class="ico">${e.icon}</span><span class="lbl">${e.name}</span></button>`;
  };
  const side = perCol === 2 ? '34vw' : '22vw';
  const count = r.level.showCount
    ? `<div class="count">EPP colocados: ${r.found.length} / ${r.mission.required.length}</div>`
    : `<div class="count">EPP colocados: ${r.found.length}</div>`;
  screen.innerHTML = html`
    <div class="play" style="--side:${side}">
      <div class="column" style="grid-template-columns:repeat(${perCol},1fr)">${cols[0].map(card).join('')}</div>
      <div class="mission-box">
        <div class="area-name" style="color:${r.area.color}">${r.area.icon} ${r.area.name} · ${r.area.hazard}</div>
        <p>${r.mission.text}</p>
        ${count}
      </div>
      <div class="column" style="grid-template-columns:repeat(${perCol},1fr)">${cols[1].map(card).join('')}</div>
    </div>`;
}

function updateTimer(left) {
  const r = state.run;
  const pct = Math.max(0, left / r.level.time) * 100;
  const fill = $('#timer-fill');
  fill.style.width = `${pct}%`;
  fill.style.background = pct > 50 ? 'var(--ok)' : pct > 25 ? 'var(--accent)' : 'var(--bad)';
  $('#timer-text').textContent = `${Math.ceil(left)} s`;
}

function updateHud() {
  const r = state.run;
  $('#hud-score').textContent = state.total + r.score;
  $('#hud-lives').textContent = r.level.lives
    ? '❤️'.repeat(Math.max(0, r.level.lives - r.wrong.length)) + '🤍'.repeat(Math.min(r.level.lives, r.wrong.length))
    : '∞';
}

function pick(id) {
  const r = state.run;
  if (!r || r.over) return;
  const card = r.cards.find((c) => c.id === id);
  if (!card || card.status !== 'idle') return;
  const e = EPPS[id];
  if (r.mission.required.includes(id)) {
    card.status = 'ok';
    r.found.push(id);
    r.score += SCORE.correct;
    vision.setEquipped(r.found);
    sfx.good();
    speak(e.name);
    toast(`✓ ${e.icon} ${e.name}: ${e.why}`, 'ok');
    if (r.found.length === r.mission.required.length) {
      clearInterval(state.timer);   // detener el reloj mientras se celebra
      r.frozenLeft = (r.endAt - performance.now()) / 1000;
      renderPlay();
      updateHud();
      return setTimeout(() => finish(true), 700);
    }
  } else {
    card.status = 'bad';
    r.wrong.push(id);
    r.score += SCORE.wrong;
    if (r.level.penalty) r.endAt -= r.level.penalty * 1000;
    sfx.bad();
    const reason = e.distractor ? e.why : 'No es necesario para esta tarea.';
    speak(`No. ${reason}`);
    toast(`✗ ${e.icon} ${e.name}: ${reason}${r.level.penalty ? `  (−${r.level.penalty} s)` : ''}`, 'bad');
    if (r.level.lives && r.wrong.length > r.level.lives) {
      renderPlay();
      updateHud();
      return finish(false, 'errors');
    }
  }
  renderPlay();
  updateHud();
}

function finish(success, reason) {
  const r = state.run;
  if (r.over) return;
  r.over = true;
  clearInterval(state.timer);
  music.stop();
  const left = Math.max(0, Math.ceil(r.frozenLeft ?? (r.endAt - performance.now()) / 1000));
  const missing = r.mission.required.filter((id) => !r.found.includes(id));
  let points = r.found.length * SCORE.correct + r.wrong.length * SCORE.wrong + missing.length * SCORE.missing;
  const perfect = success && r.wrong.length === 0;
  if (success) points += left * SCORE.perSecond + (perfect ? SCORE.perfect : 0);
  points = Math.max(0, points);
  if (success) {
    state.total += points;
    state.doneAreas.add(r.area.id);
    sfx.win();
  } else {
    sfx.lose();
  }

  const items = [
    ...r.mission.required.map((id) => ({ id, cls: r.found.includes(id) ? 'ok' : 'miss', tag: r.found.includes(id) ? '✓ Correcto' : '⚠ Te faltó' })),
    ...r.wrong.map((id) => ({ id, cls: 'bad', tag: '✗ No correspondía' })),
  ];
  const title = success ? (perfect ? '¡Misión perfecta! 🏆' : '¡Misión cumplida! ✅')
    : reason === 'time' ? '⏰ Se acabó el tiempo' : '❌ Demasiados errores';
  const last = state.level === LEVELS.length - 1;

  show(html`
    <div class="center">
      <span class="tag" style="background:${r.area.color}">${r.area.icon} ${r.area.name} · Nivel ${r.level.n}</span>
      <h2 class="title" style="font-size:clamp(2rem,5vw,4rem)">${title}</h2>
      ${success
        ? `<p class="score-big">+${points} pts</p><p class="subtitle">${left} s restantes${perfect ? ` · bono perfecto +${SCORE.perfect}` : ''} · Total: <strong>${state.total}</strong></p>`
        : `<p class="subtitle">En planta, entrar sin el EPP completo pone en riesgo tu vida. ¡Inténtalo de nuevo!</p>`}
      <div class="result-grid">
        ${items.map(({ id, cls, tag }) => {
          const e = EPPS[id];
          const why = cls === 'bad' && !e.distractor ? 'No es necesario para esta tarea.' : e.why;
          return `<div class="result-item ${cls}"><span class="ico">${e.icon}</span><div><strong>${e.name}</strong><small>${tag} · ${why}</small></div></div>`;
        }).join('')}
      </div>
      <div class="btn-row">
        ${success
          ? `<button class="btn" data-hand data-action="${last ? 'final' : 'nextLevel'}">${last ? 'Ver resultado final 🏁' : 'Siguiente nivel ▶'}</button>`
          : `<button class="btn" data-hand data-action="retry">↻ Reintentar nivel</button>`}
        <button class="btn secondary" data-hand data-action="menu">Menú</button>
      </div>
    </div>`);
  speak(success ? `${perfect ? 'Misión perfecta' : 'Misión cumplida'}. Ganaste ${points} puntos.`
    : missing.length ? `${reason === 'time' ? 'Se acabó el tiempo' : 'Demasiados errores'}. Te faltó: ${missing.map((id) => EPPS[id].name).join(', ')}.`
    : 'Demasiados errores. Inténtalo de nuevo.');
}

function loadScores() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch { return []; }
}
function saveScores(list) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(list)); } catch { /* sin almacenamiento */ }
}

function finalScreen(savedAt = -1) {
  const scores = loadScores();
  const best = scores[0]?.score ?? 0;
  show(html`
    <div class="center">
      <span class="tag">¡Completaste los ${LEVELS.length} niveles!</span>
      <h1 class="title">Experto en <span>EPP</span> 🦺</h1>
      <p class="score-big">${state.total} pts</p>
      <p class="subtitle">${state.total > best && savedAt < 0 ? '¡Nuevo récord!' : `Récord actual: ${best} pts`} · Áreas trabajadas: ${state.doneAreas.size} de ${AREAS.length}</p>
      ${savedAt < 0 ? `
        <input class="name-input" id="name" maxlength="20" placeholder="Tu nombre (opcional)">
        <button class="btn" data-hand data-action="save">💾 Guardar puntaje</button>` : ''}
      <div class="leader">
        <strong>🏆 Mejores puntajes</strong>
        <ol>${scores.slice(0, 10).map((s, i) => `<li class="${i === savedAt ? 'me' : ''}">${escapeHtml(s.name)}<span>${s.score}</span></li>`).join('') || '<li>Aún no hay puntajes</li>'}</ol>
      </div>
      <button class="btn secondary" data-hand data-action="menu">Jugar de nuevo ↻</button>
    </div>`);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------- Acciones ----------
const actions = {
  start: () => { sfx.click(); levelScreen(); },
  areas: () => { sfx.click(); areasScreen(); },
  pickArea: (id) => { sfx.click(); briefingScreen(id); },
  pick: (id) => pick(id),
  retry: () => { sfx.click(); levelScreen(); },
  nextLevel: () => { sfx.click(); state.level++; levelScreen(); },
  final: () => { sfx.fanfare(); finalScreen(); speak(`¡Felicitaciones! Completaste Misión EPP con ${state.total} puntos.`); },
  save: () => {
    sfx.click();
    const name = ($('#name')?.value || '').trim() || `Jugador ${new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`;
    const scores = loadScores();
    const entry = { name, score: state.total, at: Date.now() };
    scores.push(entry);
    scores.sort((a, b) => b.score - a.score);
    saveScores(scores.slice(0, 50));
    finalScreen(scores.indexOf(entry));
  },
  menu: () => { sfx.click(); introScreen(); },
};

// ---------- Modo kiosko: volver al inicio si nadie juega ----------
['pointermove', 'pointerdown', 'keydown'].forEach((ev) => addEventListener(ev, () => (state.lastActivity = performance.now()), { passive: true }));
setInterval(() => {
  if (vision.cursors.length) state.lastActivity = performance.now();
  const onIntro = !!document.getElementById('cam-note');
  if (!onIntro && performance.now() - state.lastActivity > IDLE_RESET_MS) introScreen();
}, 1000);

// Atajos de teclado para el facilitador
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') {
    if (e.key === 'Enter') actions.save();
    return;
  }
  if (e.key === 'Escape') introScreen();
  if (e.key === 'm' || e.key === 'M') sound.toggle();
  if (e.key === 'f' || e.key === 'F') document.documentElement.requestFullscreen?.().catch(() => {});
});

// ---------- Botón de sonido ----------
const soundBtn = $('#sound-btn');
function renderSoundBtn() {
  soundBtn.textContent = sound.muted ? '🔇 Sonido apagado' : sound.locked ? '🔈 Toca para activar sonido' : '🔊 Sonido';
}
// Si el navegador aún bloquea el audio, el primer clic real solo lo habilita.
let wasLocked = false;
soundBtn.addEventListener('pointerdown', () => { wasLocked = sound.locked && !sound.muted; });
soundBtn.addEventListener('click', () => {
  if (wasLocked) { wasLocked = false; setTimeout(renderSoundBtn, 150); return; }
  sound.toggle();
  sfx.click();
});
sound.onChange(renderSoundBtn);
renderSoundBtn();

introScreen();

// Acceso para depuración desde la consola del navegador.
window.misionEPP = { vision, state };
