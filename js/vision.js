// Visión por computadora: cámara + MediaPipe (manos y rostro).
// - Las manos controlan el juego: el dedo índice es el cursor. Se "toca" un botón
//   manteniendo el dedo encima (dwell) o haciendo una pinza con pulgar e índice.
// - El rostro y el cuerpo (pose) se usan para "ponerle" al jugador, en la imagen de la
//   cámara, los EPPs que va eligiendo: casco en la cabeza, chaleco en el torso, etc.
import { FilesetResolver, HandLandmarker, FaceLandmarker, PoseLandmarker } from '../vendor/mediapipe/vision_bundle.mjs';
import { EPPS } from './data.js';

const DWELL_MS = 900;         // tiempo con la mano encima para seleccionar
const PINCH_ON = 0.33;        // distancia pulgar-índice / tamaño de la mano
const PINCH_OFF = 0.45;
const COOLDOWN_MS = 500;      // pausa tras cada selección para evitar clics en cadena al cambiar de pantalla

const HAND_LINKS = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
];

export class Vision {
  constructor({ video, canvas, arCanvas, onStatus }) {
    this.video = video;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.arCanvas = arCanvas;
    this.arCtx = arCanvas.getContext('2d');
    this.onStatus = onStatus || (() => {});
    this.hands = null;
    this.face = null;
    this.handResult = null;
    this.faceResult = null;
    this.lastVideoTime = -1;
    this.frame = 0;
    this.cursors = [];              // estado por mano: {x, y, target, since, pinched, locked}
    this.equipped = [];             // ids de EPP a dibujar sobre el jugador
    this.anims = [];                // EPPs "volando" desde la tarjeta hacia el cuerpo
    this.pose = null;
    this.poseResult = null;
    this.ready = false;
    this.cooldownUntil = 0;
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    for (const [cv, cx] of [[this.canvas, this.ctx], [this.arCanvas, this.arCtx]]) {
      cv.width = innerWidth * dpr;
      cv.height = innerHeight * dpr;
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  async start() {
    this.onStatus('loading', 'Solicitando cámara…');
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    this.video.srcObject = stream;
    await new Promise((r) => (this.video.readyState >= 2 ? r() : (this.video.onloadeddata = r)));
    await this.video.play().catch(() => {});

    this.onStatus('loading', 'Cargando modelos de visión…');
    const fileset = await FilesetResolver.forVisionTasks(new URL('../vendor/mediapipe/wasm', import.meta.url).href);
    const base = (path) => ({ modelAssetPath: new URL(path, import.meta.url).href });
    const create = async (Task, options) => {
      try {
        return await Task.createFromOptions(fileset, { ...options, baseOptions: { ...options.baseOptions, delegate: 'GPU' } });
      } catch (e) {
        console.warn('GPU no disponible, usando CPU', e);
        return Task.createFromOptions(fileset, { ...options, baseOptions: { ...options.baseOptions, delegate: 'CPU' } });
      }
    };
    this.hands = await create(HandLandmarker, {
      baseOptions: base('../vendor/models/hand_landmarker.task'),
      runningMode: 'VIDEO',
      numHands: 2,
      minHandDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    // El rostro es opcional: si falla, el juego sigue funcionando solo con manos.
    try {
      this.face = await create(FaceLandmarker, {
        baseOptions: base('../vendor/models/face_landmarker.task'),
        runningMode: 'VIDEO',
        numFaces: 1,
      });
    } catch (e) {
      console.warn('No se pudo cargar el detector de rostro', e);
    }
    // La pose ubica torso, muñecas y tobillos (chaleco, overol, arnés, calzado). También opcional.
    try {
      this.pose = await create(PoseLandmarker, {
        baseOptions: base('../vendor/models/pose_landmarker_lite.task'),
        runningMode: 'VIDEO',
        numPoses: 1,
      });
    } catch (e) {
      console.warn('No se pudo cargar el detector de pose', e);
    }
    this.ready = true;
    this.onStatus('ok', 'Cámara activa · usa tu dedo índice');
    this.loop();
  }

  setEquipped(ids) { this.equipped = ids.slice(); this.anims = []; }

  // Agrega un EPP con animación: sale desde la tarjeta elegida y "vuela" a su lugar en el cuerpo.
  equip(id, fromEl) {
    if (this.equipped.includes(id)) return;
    this.equipped.push(id);
    const r = fromEl?.getBoundingClientRect();
    const from = r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: innerWidth / 2, y: innerHeight / 2 };
    this.anims.push({ id, from, start: performance.now() });
  }

  // Convierte coordenadas normalizadas del video (0..1) a pixeles de pantalla,
  // considerando object-fit: cover y el espejo horizontal.
  toScreen(p) {
    const vw = this.video.videoWidth || 1280;
    const vh = this.video.videoHeight || 720;
    const s = Math.max(innerWidth / vw, innerHeight / vh);
    const ox = (innerWidth - vw * s) / 2;
    const oy = (innerHeight - vh * s) / 2;
    return { x: (1 - p.x) * vw * s + ox, y: p.y * vh * s + oy };
  }

  loop() {
    requestAnimationFrame(() => this.loop());
    const now = performance.now();
    if (this.video.readyState >= 2 && this.video.currentTime !== this.lastVideoTime) {
      this.lastVideoTime = this.video.currentTime;
      this.frame++;
      try {
        this.handResult = this.hands.detectForVideo(this.video, now);
        // El rostro se procesa en cuadros alternos para ahorrar CPU.
        if (this.face && this.frame % 2 === 0) this.faceResult = this.face.detectForVideo(this.video, now);
        if (this.pose && this.frame % 3 === 1) this.poseResult = this.pose.detectForVideo(this.video, now);
      } catch (e) {
        console.warn(e);
      }
    }
    this.updateCursors(now);
    this.draw(now);
  }

  updateCursors(now) {
    const hands = this.handResult?.landmarks || [];
    const next = [];
    hands.forEach((lm, i) => {
      const prev = this.cursors[i] || { since: now, target: null, pinched: false, locked: null };
      const tip = this.toScreen(lm[8]);
      // Suavizado ligero del cursor
      const x = prev.x == null ? tip.x : prev.x * 0.45 + tip.x * 0.55;
      const y = prev.y == null ? tip.y : prev.y * 0.45 + tip.y * 0.55;

      const size = dist(lm[0], lm[9]) || 1;
      const pinchRatio = dist(lm[4], lm[8]) / size;
      const pinched = prev.pinched ? pinchRatio < PINCH_OFF : pinchRatio < PINCH_ON;

      const el = document.elementFromPoint(x, y)?.closest('[data-hand]:not([disabled])') || null;
      const c = { ...prev, x, y, pinched, lm };
      if (el !== prev.target) {
        c.target = el;
        c.since = now;
        if (prev.locked && prev.locked !== el) c.locked = null;
      }
      if (now < this.cooldownUntil) c.since = now;   // el dwell recién empieza tras la pausa
      if (el && el !== c.locked) {
        const progress = Math.min(1, (now - c.since) / DWELL_MS);
        c.progress = progress;
        const pinchTap = pinched && !prev.pinched;
        if (now >= this.cooldownUntil && (progress >= 1 || pinchTap)) {
          c.locked = el;       // no repetir hasta que la mano salga del botón
          c.progress = 0;
          this.cooldownUntil = now + COOLDOWN_MS;
          el.click();
        }
      } else {
        c.progress = 0;
      }
      next.push(c);
    });

    // Actualizar estilos de hover / progreso
    const active = new Map();
    next.forEach((c) => { if (c.target && c.target !== c.locked) active.set(c.target, Math.max(active.get(c.target) || 0, c.progress)); });
    document.querySelectorAll('[data-hand].hover').forEach((el) => {
      if (!active.has(el)) { el.classList.remove('hover'); el.style.removeProperty('--dwell'); }
    });
    active.forEach((p, el) => { el.classList.add('hover'); el.style.setProperty('--dwell', p.toFixed(3)); });
    this.cursors = next;
  }

  draw(now) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    this.arCtx.clearRect(0, 0, innerWidth, innerHeight);
    this.drawEquipment(this.arCtx);

    for (const c of this.cursors) {
      // Esqueleto de la mano
      const pts = c.lm.map((p) => this.toScreen(p));
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.55)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (const [a, b] of HAND_LINKS) { ctx.moveTo(pts[a].x, pts[a].y); ctx.lineTo(pts[b].x, pts[b].y); }
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      for (const p of pts) { ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill(); }

      // Cursor con anillo de progreso
      const r = c.pinched ? 14 : 20;
      ctx.beginPath();
      ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
      ctx.fillStyle = c.pinched ? 'rgba(34,197,94,0.85)' : 'rgba(250,204,21,0.35)';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#fff';
      ctx.stroke();
      if (c.progress > 0) {
        ctx.beginPath();
        ctx.arc(c.x, c.y, r + 9, -Math.PI / 2, -Math.PI / 2 + c.progress * Math.PI * 2);
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 7;
        ctx.stroke();
      }
    }
  }

  // Calcula dónde va cada parte del cuerpo en la pantalla, usando rostro, pose y manos.
  // Devuelve { slot: [{ x, y, size, spread }] } (varias entradas = se dibuja en cada una, ej. dos manos).
  anchors() {
    const out = {};
    const add = (slot, x, y, size, spread = size * 0.9) => (out[slot] ||= []).push({ x, y, size, spread });
    const face = this.faceResult?.faceLandmarks?.[0];
    const pose = this.poseResult?.landmarks?.[0];
    const seen = (p) => p && (p.visibility ?? 1) > 0.5;
    const S = (p) => this.toScreen(p);

    let fw = 0;
    if (face) {
      const P = (i) => S(face[i]);
      const top = P(10), chin = P(152), left = P(234), right = P(454), mouth = P(13);
      const eyeL = P(33), eyeR = P(263);
      fw = Math.hypot(right.x - left.x, right.y - left.y);
      const fh = Math.hypot(chin.x - top.x, chin.y - top.y);
      const cx = (left.x + right.x) / 2;
      add('face', cx, (top.y + chin.y) / 2, fw * 1.25);
      add('head', top.x, top.y - fh * 0.22, fw * 0.95, fw * 0.6);
      add('eyes', (eyeL.x + eyeR.x) / 2, (eyeL.y + eyeR.y) / 2, fw * 0.6, fw * 0.35);
      add('mouth', mouth.x, mouth.y + fh * 0.05, fw * 0.5, fw * 0.3);
      const side = left.x < right.x ? -1 : 1;
      add('ears', left.x + side * fw * 0.05, left.y, fw * 0.32, -side * fw * 0.2);
      add('ears', right.x - side * fw * 0.05, right.y, fw * 0.32, side * fw * 0.2);
      out._chin = { x: chin.x, y: chin.y, fh };
    } else if (pose && seen(pose[0])) {
      // Sin malla facial: aproximar la cabeza con los puntos de la pose.
      const nose = S(pose[0]), earL = S(pose[7]), earR = S(pose[8]);
      fw = Math.max(40, Math.hypot(earR.x - earL.x, earR.y - earL.y) * 1.1);
      add('face', nose.x, nose.y, fw * 1.25);
      add('head', nose.x, nose.y - fw * 0.85, fw * 0.95, fw * 0.6);
      add('eyes', nose.x, nose.y - fw * 0.15, fw * 0.6, fw * 0.35);
      add('mouth', nose.x, nose.y + fw * 0.3, fw * 0.5, fw * 0.3);
      add('ears', earL.x, earL.y, fw * 0.32, fw * 0.2);
      add('ears', earR.x, earR.y, fw * 0.32, -fw * 0.2);
    }

    if (pose && seen(pose[11]) && seen(pose[12])) {
      const shL = S(pose[11]), shR = S(pose[12]);
      const sw = Math.hypot(shR.x - shL.x, shR.y - shL.y);
      const mid = { x: (shL.x + shR.x) / 2, y: (shL.y + shR.y) / 2 };
      const hips = seen(pose[23]) && seen(pose[24]) ? { x: (S(pose[23]).x + S(pose[24]).x) / 2, y: (S(pose[23]).y + S(pose[24]).y) / 2 } : { x: mid.x, y: mid.y + sw * 1.2 };
      add('chest', mid.x + (hips.x - mid.x) * 0.3, mid.y + (hips.y - mid.y) * 0.3, sw * 0.7);
      add('body', mid.x + (hips.x - mid.x) * 0.65, mid.y + (hips.y - mid.y) * 0.65, sw * 0.5, sw * 0.55);
      fw = fw || sw * 0.45;
    } else if (out._chin) {
      const { x, y, fh } = out._chin;
      add('chest', x, y + fh * 0.75, fw * 0.9);
      add('body', x, y + fh * 1.5, fw * 0.75);
    }

    // Manos: puntos de la mano si se ven; si no, las muñecas de la pose.
    const hands = this.handResult?.landmarks || [];
    if (hands.length) {
      hands.forEach((lm) => {
        const w = S(lm[0]), m = S(lm[9]);
        const size = Math.max(36, Math.hypot(m.x - w.x, m.y - w.y) * 0.9);
        add('hands', w.x, w.y + size * 0.4, size);
      });
    } else if (pose) {
      [15, 16].filter((i) => seen(pose[i])).forEach((i) => { const w = S(pose[i]); add('hands', w.x, w.y, Math.max(40, fw * 0.45)); });
    }

    // Pies: solo si los tobillos aparecen en cámara (si no, el calzado se ve en la lista de la misión).
    if (pose && seen(pose[27]) && seen(pose[28])) {
      [27, 28].forEach((i) => { const a = S(pose[i]); add('feet', a.x, a.y, Math.max(40, fw * 0.5)); });
    }
    delete out._chin;
    return out;
  }

  // Realidad aumentada: dibuja los EPPs elegidos sobre el jugador.
  drawEquipment(ctx) {
    if (!this.equipped.length) return;
    const now = performance.now();
    const A = this.anchors();
    const FLY_MS = 650;
    const flying = new Set(this.anims.filter((a) => now - a.start < FLY_MS).map((a) => a.id));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const font = (size) => `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;

    // EPPs ya colocados, agrupados por parte del cuerpo
    const slots = {};
    for (const id of this.equipped) {
      const slot = EPPS[id]?.slot;
      if (slot && !flying.has(id)) (slots[slot] ||= []).push(id);
    }
    for (const [slot, ids] of Object.entries(slots)) {
      for (const a of A[slot] || []) {
        ctx.font = font(a.size);
        ctx.globalAlpha = slot === 'face' ? 0.55 : 1;
        ids.forEach((id, i) => {
          const dx = (i - (ids.length - 1) / 2) * a.spread;
          const anim = this.anims.find((x) => x.id === id);
          const t = anim ? (now - anim.start - FLY_MS) / 400 : 1;
          if (t < 1) this.sparkle(ctx, a.x + dx, a.y, a.size, t);   // destello al llegar
          ctx.fillText(EPPS[id].icon, a.x + dx, a.y);
        });
        ctx.globalAlpha = 1;
      }
    }

    // EPPs volando desde la tarjeta hasta el cuerpo
    for (const anim of this.anims) {
      const t = (now - anim.start) / FLY_MS;
      if (t >= 1) continue;
      const slot = EPPS[anim.id].slot;
      const target = A[slot]?.[0] || { x: innerWidth / 2, y: innerHeight - 90, size: 60 };   // sin ancla: vuela a la lista
      const e = 1 - (1 - t) ** 3;
      const x = anim.from.x + (target.x - anim.from.x) * e;
      const y = anim.from.y + (target.y - anim.from.y) * e - Math.sin(t * Math.PI) * 80;
      const size = 60 + (target.size - 60) * e;
      ctx.font = font(size);
      ctx.fillText(EPPS[anim.id].icon, x, y);
    }
    this.anims = this.anims.filter((a) => now - a.start < FLY_MS + 400);
  }

  sparkle(ctx, x, y, size, t) {
    ctx.save();
    ctx.globalAlpha = 1 - t;
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(x, y, size * (0.5 + t * 0.6), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
