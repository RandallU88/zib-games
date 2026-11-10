/* Turkey Escape: a Thanksgiving side-scroller prototype. Plain JS + Canvas, no build step. */
(() => {
'use strict';

// ---------- constants ----------
const VH = 540, GROUND = 450;
const GRAV = 2400, JUMP_V = -900;
const HOVER_MAX = 1.25, HOVER_FALL = 90, HOVER_CEILING = GROUND - 200;
const SAVE_KEY = 'turkeyEscape.v1';
const TEST = /[?&]test=1/.test(location.search);
const ZONE_NAMES = ['Kitchen', 'House', 'Backyard', 'Open Field'];
const ZONE_BANNERS = ['Escape the Kitchen!', 'Into the House!', 'Out the Back Door!', 'The Open Field! Run for it!'];
const ZONE_FRACS = [0, 0.27, 0.53, 0.8, 1];

const OBS = {
  // low: jump over. high: slide under.
  stool: { low: true, w: 44, h: 50 }, crate: { low: true, w: 58, h: 56 }, sack: { low: true, w: 54, h: 44 },
  pumpkin: { low: true, w: 56, h: 46 }, basket: { low: true, w: 60, h: 44 }, toybox: { low: true, w: 64, h: 50 },
  ottoman: { low: true, w: 70, h: 42 }, hay: { low: true, w: 78, h: 54 }, gnome: { low: true, w: 34, h: 52 },
  hedge: { low: true, w: 78, h: 54 }, vase: { low: true, w: 40, h: 60 }, bucket: { low: true, w: 42, h: 42 },
  potrack: { low: false, w: 90 }, table: { low: false, w: 130 }, shelf: { low: false, w: 100 },
  chandelier: { low: false, w: 96 }, sheet: { low: false, w: 120 }, branch: { low: false, w: 130 },
  banner: { low: false, w: 120 }
};
const HIGH_BOTTOM = GROUND - 46, HIGH_TOP = GROUND - 300;

const LEVELS = [
  {
    name: 'Farmhouse', chef: 'Chef Gus', blurb: 'Slow chef. One straight knife at a time.',
    length: 7400, base: 300, seed: 11, chefCatch: 30,
    zones: [['stool', 'crate', 'sack', 'pumpkin', 'potrack', 'table'], ['basket', 'crate', 'table', 'shelf'],
            ['hay', 'bucket', 'pumpkin', 'sheet', 'branch'], ['hay']],
    pal: { wall: '#c98b4f', wall2: '#b97a40', trim: '#6b3d1d', floor: '#7a4a26', floor2: '#6a3f20',
           hwall: '#d9a066', hwall2: '#cf9258', sky1: '#f6a35c', sky2: '#fde3b4', grass: '#8b8f36', hill: '#c27a2c' },
    chefs: [{ kind: 'straight', name: 'Chef Gus', scarf: '#c0392b', hat: 1.0 }]
  },
  {
    name: 'Suburban House', chef: 'Chef Marie', blurb: 'Lobs cleavers in arcs and throws knife bursts.',
    length: 8400, base: 320, seed: 23, chefCatch: 30,
    zones: [['stool', 'pumpkin', 'bucket', 'potrack', 'table'], ['toybox', 'basket', 'ottoman', 'table', 'shelf'],
            ['gnome', 'hedge', 'pumpkin', 'sheet', 'branch'], ['hay']],
    pal: { wall: '#f0d9a8', wall2: '#e6c98f', trim: '#8a4b2a', floor: '#9a6a44', floor2: '#8a5c38',
           hwall: '#b5523b', hwall2: '#a3452f', sky1: '#f08a4b', sky2: '#ffe2b8', grass: '#7f9a3a', hill: '#b8612a' },
    chefs: [{ kind: 'arcburst', name: 'Chef Marie', scarf: '#2e6f9e', hat: 1.15 }]
  },
  {
    name: 'Big Mansion', chef: 'Head Chef Bram and Sous Chef Pip', blurb: 'Two chefs. One sprints up, flashes a warning, then throws.',
    length: 9400, base: 335, seed: 37, chefCatch: 30,
    zones: [['crate', 'vase', 'bucket', 'potrack', 'table'], ['ottoman', 'vase', 'chandelier', 'table'],
            ['hedge', 'gnome', 'banner', 'branch'], ['hay']],
    pal: { wall: '#efe3cf', wall2: '#e2d3b8', trim: '#b8892e', floor: '#e8e0d0', floor2: '#4a3b35',
           hwall: '#6e2a2a', hwall2: '#5e2323', sky1: '#c0574a', sky2: '#f7c59f', grass: '#6f8a34', hill: '#9c4f2a' },
    chefs: [{ kind: 'arcburst', name: 'Head Chef Bram', scarf: '#d4a73a', hat: 1.3, fast: true },
            { kind: 'chaser', name: 'Sous Chef Pip', scarf: '#7d3c98', hat: 0.9 }]
  }
];

// ---------- save ----------
function defaultSave() { return { unlocked: LEVELS.map((_, i) => i === 0), best: LEVELS.map(() => 0), stars: LEVELS.map(() => 0), muted: false }; }
function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s && Array.isArray(s.unlocked)) {
      const d = defaultSave();
      for (let i = 0; i < LEVELS.length; i++) {
        d.unlocked[i] = !!s.unlocked[i] || i === 0;
        d.best[i] = +(s.best && s.best[i]) || 0;
        d.stars[i] = +(s.stars && s.stars[i]) || 0;
      }
      d.muted = !!s.muted;
      return d;
    }
  } catch (e) { /* ignore */ }
  return defaultSave();
}
let save = loadSave();
function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* ignore */ } }

// ---------- canvas / layout ----------
const cvs = document.getElementById('game');
const ctx = cvs.getContext('2d');
let VW = 960, scale = 1, offX = 0, offY = 0, dpr = 1, cssW = 0, cssH = 0, portrait = false;
const safe = { t: 0, r: 0, b: 0, l: 0 };
const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

function readSafe() {
  const cs = getComputedStyle(document.getElementById('safe'));
  safe.t = parseFloat(cs.paddingTop) || 0; safe.r = parseFloat(cs.paddingRight) || 0;
  safe.b = parseFloat(cs.paddingBottom) || 0; safe.l = parseFloat(cs.paddingLeft) || 0;
}

function layout() {
  readSafe();
  cssW = window.innerWidth; cssH = window.innerHeight;
  dpr = Math.min(2, window.devicePixelRatio || 1);
  cvs.width = Math.round(cssW * dpr); cvs.height = Math.round(cssH * dpr);
  portrait = cssH > cssW * 1.05;
  const availH = cssH - safe.t - safe.b;
  const availW = cssW - safe.l - safe.r;
  if (portrait) {
    VW = 720;
    scale = availW / VW;
    offX = safe.l;
    offY = safe.t + Math.max(8, Math.min(60, (availH - VH * scale) * 0.08));
  } else {
    VW = Math.max(720, Math.min(1200, VH * (cssW / cssH)));
    scale = Math.min(cssW / VW, cssH / VH);
    offX = (cssW - VW * scale) / 2;
    offY = (cssH - VH * scale) / 2;
  }
  layoutTouch();
}

const tb = {
  L: document.getElementById('bL'), R: document.getElementById('bR'),
  S: document.getElementById('bSlide'), J: document.getElementById('bJump'),
  H: document.getElementById('bHover'),
  P: document.getElementById('bPause'), wrap: document.getElementById('touch')
};
function place(el, x, y, s) { el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.width = s + 'px'; el.style.height = s + 'px'; el.style.fontSize = Math.round(s * 0.3) + 'px'; }
function layoutTouch() {
  const m = 14;
  let s, hs;
  if (portrait) {
    s = Math.min(100, Math.max(72, cssW * 0.18));
    hs = Math.round(s * 0.82);
    const gameBottom = offY + VH * scale;
    const y = Math.max(gameBottom + 70, cssH - safe.b - s - 28);
    place(tb.L, safe.l + m, y, s); place(tb.R, safe.l + m + s + 12, y, s);
    const jx = cssW - safe.r - m - s;
    const sx = cssW - safe.r - m - 2 * s - 12;
    place(tb.S, sx, y, s);
    place(tb.J, jx, y - s * 0.35, s);
    place(tb.H, jx + (s - hs) / 2, y - s * 0.35 - hs - 8, hs);
  } else {
    s = Math.min(110, Math.max(66, cssH * 0.155));
    hs = Math.round(s * 0.82);
    const y = cssH - safe.b - s - m;
    place(tb.L, safe.l + m + 6, y, s * 0.85); place(tb.R, safe.l + m + 6 + s * 0.85 + 12, y, s * 0.85);
    const jx = cssW - safe.r - m - s;
    place(tb.S, cssW - safe.r - m - 2 * s - 14, y + s * 0.1, s * 0.9);
    place(tb.J, jx, y - s * 0.22, s);
    place(tb.H, jx + (s - hs) / 2, y - s * 0.22 - hs - 8, hs);
  }
  const ps = 52;
  tb.P.style.left = (cssW - safe.r - ps - 12) + 'px'; tb.P.style.top = (portrait ? offY + VH * scale + 12 : safe.t + 10) + 'px';
  tb.P.style.width = ps + 'px'; tb.P.style.height = ps + 'px'; tb.P.style.fontSize = '20px';
}
window.addEventListener('resize', layout);
window.addEventListener('orientationchange', () => setTimeout(layout, 120));

// block page gestures: no double-tap zoom, no pinch, no scroll bounce
['gesturestart', 'gesturechange', 'gestureend', 'dblclick', 'contextmenu'].forEach(ev =>
  document.addEventListener(ev, e => e.preventDefault(), { passive: false }));
document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
let lastTouchEnd = 0;
document.addEventListener('touchend', e => { const n = Date.now(); if (n - lastTouchEnd < 350) e.preventDefault(); lastTouchEnd = n; }, { passive: false });

// ---------- audio (created on first gesture) ----------
let actx = null;
function initAudio() {
  if (actx) { if (actx.state === 'suspended') actx.resume(); return; }
  try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; }
}
function tone(f0, f1, dur, type, vol, delay) {
  if (!actx || save.muted) return;
  const t = actx.currentTime + (delay || 0);
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type || 'square';
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
  g.gain.setValueAtTime(vol || 0.08, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + dur + 0.02);
}
const sfx = {
  jump: () => tone(320, 640, 0.14, 'square', 0.06),
  flap: () => tone(480, 300, 0.1, 'sine', 0.03),
  slide: () => tone(260, 120, 0.18, 'triangle', 0.08),
  feather: () => { tone(880, 1320, 0.08, 'sine', 0.07); tone(1320, 1760, 0.08, 'sine', 0.05, 0.06); },
  hit: () => { tone(200, 70, 0.3, 'sawtooth', 0.09); },
  throw: () => tone(900, 300, 0.12, 'triangle', 0.04),
  warn: () => tone(660, 660, 0.08, 'square', 0.04),
  zone: () => { tone(523, 523, 0.1, 'square', 0.05); tone(784, 784, 0.14, 'square', 0.05, 0.1); },
  win: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, f, 0.18, 'square', 0.06, i * 0.12)); },
  lose: () => { [392, 330, 262, 196].forEach((f, i) => tone(f, f * 0.98, 0.2, 'triangle', 0.08, i * 0.15)); },
  click: () => tone(600, 800, 0.05, 'square', 0.04)
};

// ---------- rng ----------
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let rng = mulberry(1);
const fxRand = Math.random;

// ---------- input ----------
const input = { left: false, right: false, slide: false, jumpQ: false, slideQ: false, hover: false };
const keys = {};
window.addEventListener('keydown', e => {
  initAudio();
  const k = e.key;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Spacebar'].includes(k)) e.preventDefault();
  if (keys[k]) return; keys[k] = true;
  if (state === 'play') {
    if (k === 'ArrowUp' || k === 'w' || k === 'W' || k === ' ' || k === 'Spacebar') input.jumpQ = true;
    if (k === 'ArrowDown' || k === 's' || k === 'S') { input.slide = true; input.slideQ = true; }
    if (k === 'p' || k === 'P' || k === 'Escape') setState('pause');
  } else menuKey(k);
  syncKeys();
});
window.addEventListener('keyup', e => { keys[e.key] = false; syncKeys(); });
function syncKeys() {
  input.left = !!(keys.ArrowLeft || keys.a || keys.A) || touchHeld.L;
  input.right = !!(keys.ArrowRight || keys.d || keys.D) || touchHeld.R;
  input.slide = !!(keys.ArrowDown || keys.s || keys.S) || touchHeld.S;
  input.hover = !!(keys.ArrowUp || keys.w || keys.W || keys[' '] || keys.Spacebar) || touchHeld.H || (touchHeld.J && P && !P.onGround);
}
const touchHeld = { L: false, R: false, S: false, J: false, H: false };
function bindHold(el, id, onDown) {
  const down = e => { e.preventDefault(); initAudio(); touchHeld[id] = true; el.classList.add('on'); if (onDown) onDown(); syncKeys(); };
  const up = e => { e.preventDefault(); touchHeld[id] = false; el.classList.remove('on'); syncKeys(); };
  el.addEventListener('pointerdown', down, { passive: false });
  el.addEventListener('pointerup', up, { passive: false });
  el.addEventListener('pointercancel', up, { passive: false });
  el.addEventListener('pointerleave', up, { passive: false });
  el.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
}
bindHold(tb.L, 'L'); bindHold(tb.R, 'R');
bindHold(tb.S, 'S', () => { input.slideQ = true; });
bindHold(tb.J, 'J', () => { input.jumpQ = true; });
bindHold(tb.H, 'H');
tb.P.addEventListener('pointerdown', e => { e.preventDefault(); initAudio(); if (state === 'play') setState('pause'); else if (state === 'pause') setState('play'); });

let buttons = [];
cvs.addEventListener('pointerdown', e => {
  e.preventDefault(); initAudio();
  const vx = (e.clientX - offX) / scale, vy = (e.clientY - offY) / scale;
  for (const b of buttons) {
    if (vx >= b.x && vx <= b.x + b.w && vy >= b.y && vy <= b.y + b.h) { if (!b.disabled) { sfx.click(); b.action(); } return; }
  }
  if (state === 'title') setState('select');
}, { passive: false });

// ---------- game state ----------
let state = 'title', stateT = 0, time = 0;
let levelIdx = 0, L = null, obstacles = [], feathers = [], projectiles = [], particles = [], chefs = [];
let P = null, camX = 0, zone = 0, banner = { text: '', t: 0 }, shake = 0;
let score = 0, collected = 0, totalFeathers = 0, loseReason = '', winInfo = null, chefsStopped = false, gateX = 0;
let selIdx = 0, pauseSel = 0;
const zoneStart = z => ZONE_FRACS[z] * L.length;
function zoneOf(x) { for (let z = 3; z >= 0; z--) if (x >= zoneStart(z)) return z; return 0; }

function goSiteHome() { location.href = '../'; }
function syncSiteHome() {
  const el = document.querySelector('[data-hs-home]');
  if (!el) return;
  el.hidden = (state === 'play');
  el.setAttribute('data-hs-playing', '0');
}
function setState(s) {
  state = s; stateT = 0;
  const playing = s === 'play';
  tb.wrap.classList.toggle('show', playing && isTouch);
  tb.P.classList.toggle('show', playing || s === 'pause');
  tb.P.textContent = s === 'pause' ? '\u25B6' : 'II';
  if (!playing) { touchHeld.L = touchHeld.R = touchHeld.S = touchHeld.J = touchHeld.H = false; [tb.L, tb.R, tb.S, tb.J, tb.H].forEach(b => b.classList.remove('on')); syncKeys(); }
  if (s === 'select') selIdx = Math.max(0, Math.min(selIdx, LEVELS.length - 1));
  syncSiteHome();
}

function genLevel() {
  rng = mulberry(L.seed);
  obstacles = []; feathers = [];
  const len = L.length;
  let x = 760;
  const fieldStart = zoneStart(3);
  while (x < fieldStart - 260) {
    const z = zoneOf(x);
    const nearBoundary = [1, 2, 3].some(b => Math.abs(x - zoneStart(b)) < 170);
    if (nearBoundary) { x += 180; continue; }
    const pool = L.zones[z];
    const kind = pool[Math.floor(rng() * pool.length)];
    const d = OBS[kind];
    const o = { kind, x, w: d.w, low: d.low, h: d.low ? d.h : 0, hit: false };
    obstacles.push(o);
    const r = rng();
    if (r < 0.55) {
      if (d.low) { for (let i = 0; i < 3; i++) feathers.push({ x: x + d.w / 2 + (i - 1) * 46, y: GROUND - 120 - (i === 1 ? 40 : 0), got: false }); }
      else { for (let i = 0; i < 3; i++) feathers.push({ x: x + 20 + i * 40, y: GROUND - 22, got: false }); }
    } else if (r < 0.7) {
      feathers.push({ x: x + d.w + 140, y: GROUND - 40, got: false });
    }
    const gap = (560 - z * 70) + rng() * (300 - z * 40);
    x += d.w + gap;
  }
  for (let i = 0; i < 3; i++) {
    const hx = fieldStart + 420 + i * 520;
    if (hx < len - 300) obstacles.push({ kind: 'hay', x: hx, w: 78, low: true, h: 54, hit: false });
  }
  for (let fx = fieldStart + 200; fx < len - 150; fx += 170) feathers.push({ x: fx, y: GROUND - 50 - Math.sin(fx * 0.01) * 30, got: false });
  totalFeathers = feathers.length;
  gateX = fieldStart;
}

function makeChef(def, i) {
  return Object.assign({}, def, {
    idx: i, gap: def.kind === 'chaser' ? 520 : 230, t: def.kind === 'chaser' ? 6 : 2.2, st: 'run',
    wind: 0, lane: 'low', burst: 0, mode: 'arc', worldX: 0, anim: fxRand() * 10, say: '', sayT: 0
  });
}

function startLevel(i) {
  levelIdx = i; L = LEVELS[i];
  genLevel();
  P = { x: 200, y: GROUND, vy: 0, onGround: true, sliding: false, slideT: 0, speed: L.base, inv: 0, stun: 0, lives: 3, anim: 0, hover: HOVER_MAX, hovering: false, flapT: 0 };
  chefs = L.chefs.map(makeChef);
  projectiles = []; particles = [];
  score = 0; collected = 0; zone = 0; chefsStopped = false; shake = 0; winInfo = null;
  banner = { text: ZONE_BANNERS[0], t: 2.2 };
  input.jumpQ = input.slideQ = false;
  setState('play');
}

// ---------- update ----------
function cruise() { return L.base + zone * 18; }
function chefSpeed(c) { return cruise() - (c.fast ? 18 : 32); }

function pbox() {
  if (P.sliding) return { x: P.x - 30, y: P.y - 34, w: 60, h: 33 };
  return { x: P.x - 20, y: P.y - 62, w: 42, h: 60 };
}
function overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
function obsBox(o) { return o.low ? { x: o.x + 4, y: GROUND - o.h + 4, w: o.w - 8, h: o.h - 4 } : { x: o.x + 6, y: HIGH_TOP, w: o.w - 12, h: HIGH_BOTTOM - HIGH_TOP }; }

function hurt(src) {
  if (P.inv > 0 || TE.invincible) return;
  TE.hitLog.push({ src, x: Math.round(P.x), y: Math.round(P.y), sliding: P.sliding });
  P.lives--; P.inv = 1.4; P.stun = 0.38; P.speed = 70; shake = 0.35;
  sfx.hit(); TE.hits++;
  for (let i = 0; i < 9; i++) particles.push({ kind: 'feather', x: P.x, y: P.y - 40, vx: (fxRand() - 0.5) * 300, vy: -fxRand() * 350 - 80, r: fxRand() * 6, vr: (fxRand() - 0.5) * 8, t: 1.6, c: ['#8b4a24', '#e0702a', '#b33a1e', '#f2a93b'][i % 4] });
  if (P.lives <= 0) { loseReason = 'feathers'; endLevel(false); }
}

function lanesY(lane) { return lane === 'low' ? GROUND - 20 : GROUND - 54; }

function throwKnife(c, lane, rel) {
  projectiles.push({ type: 'knife', x: c.worldX + 26, y: lanesY(lane), vx: P.speed + rel, lane });
  sfx.throw(); TE.throws++;
}
function lobCleaver(c) {
  const T = 1.05;
  let tx = P.x + Math.max(P.speed, 200) * T + (rng() - 0.3) * 70;
  for (let k = 0; k < 4; k++) { const o = obstacleNear(tx, 120); if (!o || o.low) break; tx = o.x + o.w + 150; }
  projectiles.push({ type: 'cleaver', x0: c.worldX + 20, y0: GROUND - 110, tx, t: 0, T, x: c.worldX, y: GROUND - 110, spin: 0 });
  sfx.throw(); TE.throws++;
}

// Pick the knife lane so it never forces a jump and a slide at the same moment:
// near a low obstacle the knife flies low (one jump clears both), near a high one it flies high.
function obstacleNear(x, range) {
  for (const o of obstacles) { if (o.x + o.w < x - range) continue; if (o.x > x + range) break; return o; }
  return null;
}
function pickLane(c, rel, wind) {
  const tArrive = wind + Math.max(60, c.gap) / rel;
  const o = obstacleNear(P.x + P.speed * tArrive, 170);
  if (o) return o.low ? 'low' : 'high';
  return rng() < 0.5 ? 'low' : 'high';
}
function anyWinding(except) { return chefs.some(c => c !== except && (c.st === 'wind' || c.st === 'sprint' || c.st === 'burst')); }

function updateChefs(dt) {
  const ramp = 1 - 0.14 * zone;
  for (const c of chefs) {
    c.anim += dt * (chefsStopped ? 4 : 12);
    if (c.sayT > 0) c.sayT -= dt;
    if (chefsStopped) { c.st = 'stop'; continue; }
    if (c.kind !== 'chaser') {
      c.gap += (P.speed - chefSpeed(c)) * dt;
      c.gap = Math.min(c.gap, 250);
    } else if (c.st === 'run') c.gap += (560 - c.gap) * Math.min(1, dt * 2);
    c.worldX = P.x - c.gap;
    if (c.kind !== 'chaser' && c.gap < L.chefCatch && !TE.invincible) { loseReason = 'caught'; c.say = 'Gotcha!'; c.sayT = 2; endLevel(false); return; }
    if (P.x < 520) continue; // grace period at the start
    c.t -= dt;
    if (c.st === 'run' && c.t <= 0) {
      if (anyWinding(c)) { c.t = 0.6; continue; }
      if (c.kind === 'chaser') { c.st = 'sprint'; c.wind = 0; }
      else {
        c.st = 'wind';
        c.wind = c.kind === 'straight' ? 0.9 : (c.fast ? 0.62 : 0.72);
        c.lane = pickLane(c, 290, c.wind + 0.25);
        c.mode = c.kind === 'arcburst' ? (rng() < 0.5 ? 'arc' : 'burst') : 'single';
        sfx.warn();
      }
    } else if (c.st === 'sprint') {
      c.gap += (95 - c.gap) * Math.min(1, dt * 3.2);
      if (c.gap < 110) { c.st = 'wind'; c.wind = 0.8; c.lane = pickLane(c, 470, 0.8); c.mode = 'single'; sfx.warn(); c.say = 'Here it comes!'; c.sayT = 0.9; }
    } else if (c.st === 'wind') {
      if (c.kind === 'chaser') c.gap += (95 - c.gap) * Math.min(1, dt * 3);
      c.wind -= dt;
      if (c.wind <= 0) {
        if (c.mode === 'single') { throwKnife(c, c.lane, c.kind === 'chaser' ? 470 : 280); c.st = 'run'; }
        else if (c.mode === 'arc') { lobCleaver(c); if (c.fast) { c.mode = 'arc2'; c.wind = 0.45; } else c.st = 'run'; }
        else if (c.mode === 'arc2') { lobCleaver(c); c.st = 'run'; }
        else if (c.mode === 'burst') { c.burst = 3; c.st = 'burst'; c.wind = 0; }
        if (c.st === 'run') c.t = (c.kind === 'straight' ? 2.7 : c.kind === 'chaser' ? 4.2 : (c.fast ? 2.0 : 2.3)) * ramp + rng() * 0.6;
      }
    } else if (c.st === 'burst') {
      c.wind -= dt;
      if (c.wind <= 0) {
        throwKnife(c, c.lane, 300); c.burst--; c.wind = 0.26;
        if (c.burst <= 0) { c.st = 'run'; c.t = (c.fast ? 2.1 : 2.5) * ramp + rng() * 0.6; }
      }
    }
  }
}

function endLevel(won) {
  if (state !== 'play') return;
  if (won) {
    const lifeBonus = P.lives * 200;
    score += lifeBonus;
    let stars = 1;
    if (P.lives >= 2) stars++;
    if (collected >= totalFeathers * 0.6) stars++;
    const newly = levelIdx + 1 < LEVELS.length && !save.unlocked[levelIdx + 1];
    if (levelIdx + 1 < LEVELS.length) save.unlocked[levelIdx + 1] = true;
    const best = score > save.best[levelIdx];
    save.best[levelIdx] = Math.max(save.best[levelIdx], Math.round(score));
    save.stars[levelIdx] = Math.max(save.stars[levelIdx], stars);
    writeSave();
    winInfo = { stars, lifeBonus, newly, best };
    sfx.win();
    setState('win');
  } else {
    sfx.lose();
    setState('lose');
  }
}

function autopilot() {
  // simple scripted runner used by the automated tests, including hover over low knives
  const sp = P.speed, px = P.x;
  let wantJump = false, wantSlide = false, wantRight = false, wantHover = false;
  for (const o of obstacles) {
    const d = o.x - (px + 22);
    if (o.x + o.w < px - 32) continue;
    if (d > sp * 0.7) break;
    if (o.low && d > 0 && d < sp * 0.16 + 10) wantJump = true;
    if (!o.low && d < sp * 0.28) wantSlide = true;
  }
  for (const pr of projectiles) {
    if (pr.type === 'knife') {
      const rel = pr.vx - sp, d = (px - 22) - (pr.x + 18);
      if (pr.lane === 'low') {
        if (d > -70 && d < rel * 0.34 + 18) wantJump = true;
        if (d > -80 && d < rel * 0.6 + 40) wantHover = true;
      } else if (d > -60 && d < rel * 0.2 + 10) wantSlide = true;
    } else if (pr.type === 'cleaver') {
      const rem = pr.T - pr.t, pred = px + sp * rem;
      if (Math.abs(pred - pr.tx) < 90) {
        wantRight = true;
        if (rem < 0.55) { wantJump = true; wantHover = true; }
      }
    } else if (pr.type === 'stuck') {
      const d = pr.x - 17 - (px + 22);
      if (d > 0 && d < sp * 0.2 + 16) { wantJump = true; wantHover = true; }
    }
  }
  const main = chefs.find(c => c.kind !== 'chaser');
  if (main && main.gap < 140) wantRight = true;
  if (wantSlide) wantHover = false;
  touchHeld.R = wantRight; touchHeld.L = false; touchHeld.S = wantSlide; touchHeld.H = wantHover && !P.onGround; syncKeys();
  if (!wantSlide && wantJump && P.onGround) input.jumpQ = true;
}

function update(dt) {
  time += dt; stateT += dt;
  updateLeaves(dt);
  if (state !== 'play') { updateParticles(dt); return; }
  if (TE.autopilot) autopilot();

  let target = cruise() + 30 + (input.right ? 120 : 0) - (input.left ? 130 : 0);
  if (P.stun > 0) { P.stun -= dt; target = 60; }
  P.speed += (target - P.speed) * Math.min(1, dt * (P.stun > 0 ? 10 : 3.5));
  P.x += P.speed * dt;
  P.anim += P.speed * dt * 0.05;
  if (P.inv > 0) P.inv -= dt;

  if (input.jumpQ) {
    input.jumpQ = false;
    if (P.onGround && P.stun <= 0) { P.vy = JUMP_V; P.onGround = false; P.sliding = false; P.slideT = 0; sfx.jump(); TE.jumps++; }
  }
  if (input.slideQ) { input.slideQ = false; if (P.onGround && !P.sliding) { sfx.slide(); TE.slides++; } P.slideT = 0.5; }
  if (P.slideT > 0) P.slideT -= dt;
  if (P.onGround) {
    P.hover = HOVER_MAX;
    P.hovering = false;
  }
  if (!P.onGround) {
    syncKeys();
    const canHover = input.hover && P.hover > 0 && P.stun <= 0 && !input.slide && P.y > HOVER_CEILING;
    if (input.slide) P.vy += 6000 * dt;
    if (canHover && P.vy >= 0) {
      P.hovering = true;
      P.hover = Math.max(0, P.hover - dt);
      if (P.vy > HOVER_FALL) P.vy = HOVER_FALL;
      else P.vy += 180 * dt;
      if (P.vy > HOVER_FALL) P.vy = HOVER_FALL;
      P.flapT -= dt;
      if (P.flapT <= 0) { sfx.flap(); P.flapT = 0.16; TE.flaps++; }
    } else {
      P.hovering = false;
      P.vy += GRAV * dt;
    }
    P.y += P.vy * dt;
    if (P.y >= GROUND) { P.y = GROUND; P.vy = 0; P.onGround = true; P.hover = HOVER_MAX; P.hovering = false; }
  }
  P.sliding = P.onGround && (input.slide || P.slideT > 0);

  const z = zoneOf(P.x);
  if (z !== zone) {
    zone = z; banner = { text: ZONE_BANNERS[z], t: 2.4 }; sfx.zone();
    if (z === 3 && !chefsStopped) {
      chefsStopped = true;
      for (const c of chefs) { c.worldX = Math.min(c.worldX, gateX - 70 - c.idx * 60); c.say = c.idx === 0 ? 'Come back here!' : 'No fair!'; c.sayT = 3; }
      projectiles = projectiles.filter(p => p.type === 'stuck');
    }
  }
  updateChefs(dt);
  if (state !== 'play') return;

  const pb = pbox();
  for (const o of obstacles) {
    if (o.x > P.x + 80) break;
    if (o.x + o.w < P.x - 60) continue;
    if (!o.hit && overlap(pb, obsBox(o))) { o.hit = true; hurt(o.kind); if (state !== 'play') return; }
  }
  for (const f of feathers) {
    if (f.got || Math.abs(f.x - P.x) > 60) continue;
    if (overlap(pb, { x: f.x - 16, y: f.y - 18, w: 32, h: 36 })) {
      f.got = true; collected++; score += 50; sfx.feather();
      particles.push({ kind: 'text', x: f.x, y: f.y - 20, vy: -60, t: 0.8, s: '+50' });
      if (collected % 15 === 0 && P.lives < 3) { P.lives++; particles.push({ kind: 'text', x: P.x, y: P.y - 110, vy: -40, t: 1.4, s: '+1 feather!' }); sfx.zone(); }
    }
  }
  for (const pr of projectiles) {
    if (pr.type === 'knife') {
      pr.x += pr.vx * dt;
      if (overlap(pb, { x: pr.x - 18, y: pr.y - 4, w: 36, h: 8 })) { pr.dead = true; hurt('knife-' + pr.lane); }
      if (pr.x > camX + VW + 100) { pr.dead = true; score += 10; TE.dodges++; }
    } else if (pr.type === 'cleaver') {
      pr.t += dt; pr.spin += dt * 14;
      const k = Math.min(1, pr.t / pr.T);
      pr.x = pr.x0 + (pr.tx - pr.x0) * k;
      pr.y = pr.y0 + (GROUND - 14 - pr.y0) * k - Math.sin(k * Math.PI) * 190;
      if (k > 0.5 && overlap(pb, { x: pr.x - 14, y: pr.y - 14, w: 28, h: 28 })) { pr.dead = true; hurt('cleaver'); }
      else if (k >= 1) { pr.dead = true; projectiles.push({ type: 'stuck', x: pr.tx, y: GROUND - 14, t: 1.0 }); }
    } else if (pr.type === 'stuck') {
      pr.t -= dt;
      if (!pr.hitDone && overlap(pb, { x: pr.x - 14, y: GROUND - 30, w: 28, h: 30 })) { pr.hitDone = true; hurt('stuck'); }
      if (pr.t <= 0) { pr.dead = true; if (!pr.hitDone) TE.dodges++; }
    }
    if (state !== 'play') return;
  }
  projectiles = projectiles.filter(p => !p.dead);

  score += P.speed * dt * 0.1;
  if (banner.t > 0) banner.t -= dt;
  if (shake > 0) shake -= dt;
  updateParticles(dt);
  if (P.x >= L.length) endLevel(true);
}

function updateParticles(dt) {
  for (const p of particles) {
    p.t -= dt;
    if (p.kind === 'feather') { p.vy += 500 * dt; p.vx *= 0.98; p.x += p.vx * dt; p.y += Math.min(p.vy, 120) * dt; p.r += p.vr * dt; }
    else if (p.kind === 'text') p.y += p.vy * dt;
  }
  particles = particles.filter(p => p.t > 0);
}

// ---------- falling leaves ----------
const LEAF_COLS = ['#d9531e', '#e8892b', '#f2b134', '#b8361f', '#a8571c'];
const leaves = [];
for (let i = 0; i < 34; i++) leaves.push({ x: Math.random() * 1200, y: Math.random() * VH, s: 6 + Math.random() * 8, vx: -20 - Math.random() * 30, vy: 30 + Math.random() * 40, r: Math.random() * 6, vr: (Math.random() - 0.5) * 3, ph: Math.random() * 6, c: LEAF_COLS[i % 5] });
function updateLeaves(dt) {
  const drift = state === 'play' && P ? P.speed * 0.35 : 0;
  for (const l of leaves) {
    l.ph += dt * 2; l.x += (l.vx - drift + Math.sin(l.ph) * 25) * dt; l.y += l.vy * dt; l.r += l.vr * dt;
    if (l.y > VH + 20 || l.x < -30) { l.y = -20 - Math.random() * 60; l.x = Math.random() * (VW + 200); }
  }
}
function drawLeaf(x, y, s, r, c) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(r); ctx.fillStyle = c;
  ctx.beginPath(); ctx.moveTo(0, -s); ctx.quadraticCurveTo(s * 0.9, -s * 0.2, 0, s); ctx.quadraticCurveTo(-s * 0.9, -s * 0.2, 0, -s); ctx.fill();
  ctx.strokeStyle = 'rgba(80,30,10,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(0, s + 3); ctx.stroke();
  ctx.restore();
}
function drawLeaves(alpha) { ctx.globalAlpha = alpha; for (const l of leaves) drawLeaf(l.x, l.y, l.s, l.r, l.c); ctx.globalAlpha = 1; }

// ---------- drawing helpers ----------
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function ell(x, y, rx, ry, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); }
function text(s, x, y, size, col, align, stroke) {
  ctx.font = 'bold ' + size + 'px "Trebuchet MS", system-ui, sans-serif';
  ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
  if (stroke) { ctx.lineWidth = Math.max(3, size / 7); ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
  ctx.fillStyle = col; ctx.fillText(s, x, y);
}
function repeat(period, par, fn) {
  const cam = camX * par;
  for (let wx = Math.floor(cam / period) * period - period; wx < cam + VW + period; wx += period) fn(wx - cam, Math.round(wx / period));
}

function drawTurkey(x, y, slide, t, alpha, scl, hovering) {
  ctx.save(); ctx.translate(x, y); ctx.globalAlpha = alpha == null ? 1 : alpha;
  const s = scl || 1; ctx.scale(s, s);
  if (slide) ctx.scale(1.2, 0.56);
  const bob = slide ? 0 : Math.abs(Math.sin(t * 2)) * 3;
  ctx.translate(0, -bob);
  if (!slide) {
    ctx.strokeStyle = '#e8a23a'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    for (let i = 0; i < 2; i++) {
      const a = Math.sin(t * 2 + i * Math.PI) * 0.7;
      ctx.beginPath(); ctx.moveTo(-2 + i * 6, -16); const fx = -2 + i * 6 + Math.sin(a) * 16, fy = -16 + Math.cos(a) * 16 + bob;
      ctx.lineTo(fx, fy); ctx.lineTo(fx + 7, fy); ctx.stroke();
    }
  }
  const tc = ['#8b3a1a', '#d9531e', '#f2a93b', '#8b4a24', '#e8892b', '#b33a1e', '#f2c14e'];
  for (let i = 0; i < 7; i++) {
    const th = (-1.25 + i * 0.22) + Math.sin(t * 2.5) * 0.04;
    ctx.save(); ctx.translate(-14, -32); ctx.rotate(th);
    ctx.fillStyle = tc[i]; ctx.beginPath(); ctx.ellipse(0, -30, 10, 28, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,200,0.55)'; ctx.beginPath(); ctx.ellipse(0, -48, 5, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  ell(0, -32, 27, 23, '#6e3f22');
  ell(-2, -28, 17, 14, '#5a321a');
  if (hovering && !slide) {
    const flap = Math.sin(t * 16) * 0.9;
    ctx.save(); ctx.translate(-6, -38); ctx.rotate(-0.95 + flap);
    ell(12, 0, 24, 10, '#4a2812'); ell(22, -3, 10, 5, '#8b5a36');
    ctx.fillStyle = 'rgba(255, 230, 160, 0.35)'; ctx.beginPath(); ctx.ellipse(16, 0, 18, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.translate(-2, -28); ctx.rotate(-0.4 - flap * 0.55);
    ell(10, 0, 16, 7, '#5a321a');
    ctx.restore();
  } else {
    ctx.save(); ctx.translate(-4, -30); ctx.rotate(Math.sin(t * 2) * 0.2 - 0.2); ell(0, 0, 15, 9, '#4a2812'); ctx.restore();
  }
  ell(20, -48, 8, 13, '#8c5a36');
  ell(25, -60, 11, 11, '#d9b38c');
  ctx.fillStyle = '#e89a2a'; ctx.beginPath(); ctx.moveTo(34, -63); ctx.lineTo(45, -59); ctx.lineTo(34, -56); ctx.fill();
  ell(33, -50, 4, 8, '#c8321e');
  ell(30, -71, 3, 5, '#c8321e');
  ell(28, -63, 4, 4.4, '#fff'); ell(29.3, -63, 2.1, 2.4, '#1a0f08');
  ctx.strokeStyle = '#3a1f12'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(23, -69); ctx.lineTo(32, -67); ctx.stroke();
  ctx.restore();
}

function drawChef(c, x, y, t) {
  ctx.save(); ctx.translate(x, y);
  const winding = c.st === 'wind' || c.st === 'burst';
  const run = c.st === 'stop' ? Math.sin(t * 0.5) * 0.2 : Math.sin(t);
  ctx.strokeStyle = '#2b2b33'; ctx.lineWidth = 9; ctx.lineCap = 'round';
  for (let i = 0; i < 2; i++) { const a = (i ? 1 : -1) * run * 0.6; ctx.beginPath(); ctx.moveTo(i * 8 - 4, -34); ctx.lineTo(i * 8 - 4 + Math.sin(a) * 22, -34 + Math.cos(a) * 30); ctx.stroke(); }
  ctx.fillStyle = '#f7f4ee'; rr(-22, -96, 44, 66, 12); ctx.fill();
  ctx.strokeStyle = '#c9c2b5'; ctx.lineWidth = 2; ctx.stroke();
  ell(-6, -78, 2.5, 2.5, '#8a7f70'); ell(-6, -64, 2.5, 2.5, '#8a7f70'); ell(6, -78, 2.5, 2.5, '#8a7f70'); ell(6, -64, 2.5, 2.5, '#8a7f70');
  ctx.fillStyle = c.scarf; rr(-14, -100, 28, 10, 4); ctx.fill();
  ell(0, -114, 16, 16, '#f1c27d');
  ell(-4, -116, 2.2, 2.6, '#2a1a10'); ell(7, -116, 2.2, 2.6, '#2a1a10');
  ctx.strokeStyle = '#3a2414'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-8, -123); ctx.lineTo(-1, -120); ctx.moveTo(11, -123); ctx.lineTo(4, -120); ctx.stroke();
  ctx.fillStyle = '#6b3e1f'; ctx.beginPath(); ctx.ellipse(1, -107, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
  ell(10, -110, 4, 3, '#e8a07a');
  const hh = 26 * c.hat;
  ctx.fillStyle = '#ffffff'; rr(-13, -128 - hh * 0.5, 26, hh * 0.5 + 2, 3); ctx.fill();
  ell(-9, -130 - hh * 0.55, 10, 10, '#fff'); ell(9, -130 - hh * 0.55, 10, 10, '#fff'); ell(0, -136 - hh * 0.7, 12, 12, '#fff');
  ctx.save(); ctx.translate(16, -86);
  const armA = winding ? -2.3 + Math.sin(t * 2) * 0.1 : 0.5 + run * 0.3;
  ctx.rotate(armA);
  ctx.strokeStyle = '#f7f4ee'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(26, 0); ctx.stroke();
  ell(28, 0, 6, 6, '#f1c27d');
  if (c.st !== 'stop') { ctx.translate(30, 0); drawKnifeShape(c.kind === 'arcburst' && c.mode && c.mode.startsWith('arc') ? 'cleaver' : 'knife', 0.8); }
  ctx.restore();
  ctx.restore();
  if (c.st === 'wind') {
    const pulse = 0.6 + 0.4 * Math.sin(time * 20);
    ctx.save(); ctx.translate(x, y - 175);
    ctx.fillStyle = `rgba(255,${Math.round(200 * pulse)},40,1)`; rr(-16, -18, 32, 36, 10); ctx.fill();
    text('!', 0, 1, 30, '#3a1f12'); ctx.restore();
  }
  if (c.sayT > 0 && c.say) {
    ctx.save(); ctx.font = 'bold 18px "Trebuchet MS", sans-serif'; const w = ctx.measureText(c.say).width + 20;
    ctx.fillStyle = '#fffaf0'; rr(x - w / 2, y - 210, w, 30, 10); ctx.fill(); ctx.strokeStyle = '#3a1f12'; ctx.lineWidth = 2; ctx.stroke();
    text(c.say, x, y - 195, 18, '#3a1f12'); ctx.restore();
  }
}

function drawKnifeShape(kind, s) {
  ctx.save(); ctx.scale(s, s);
  if (kind === 'cleaver') {
    ctx.fillStyle = '#6b3e1f'; rr(-22, -4, 18, 8, 3); ctx.fill();
    ctx.fillStyle = '#cfd5dc'; rr(-5, -14, 30, 24, 3); ctx.fill();
    ctx.strokeStyle = '#8f99a3'; ctx.lineWidth = 2; ctx.stroke();
    ell(18, -7, 3, 3, '#5d6670');
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(-2, 6, 26, 3);
  } else {
    ctx.fillStyle = '#6b3e1f'; rr(-20, -4, 16, 8, 3); ctx.fill();
    ell(-14, 0, 1.6, 1.6, '#e8c38a'); ell(-8, 0, 1.6, 1.6, '#e8c38a');
    ctx.fillStyle = '#dde2e8'; ctx.beginPath(); ctx.moveTo(-4, -5); ctx.lineTo(18, -4); ctx.lineTo(24, 0); ctx.lineTo(18, 4); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#8f99a3'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  ctx.restore();
}

// ---------- obstacles ----------
function hazardStripe(sx, w) { ctx.fillStyle = 'rgba(255,210,90,0.9)'; ctx.fillRect(sx, HIGH_BOTTOM - 3, w, 3); }
function drawObstacle(o, sx) {
  const g = GROUND, w = o.w, h = o.h, HB = HIGH_BOTTOM, HT = HIGH_TOP;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(sx + w / 2, g + 3, w / 2 + 4, 6, 0, 0, Math.PI * 2); ctx.fill();
  switch (o.kind) {
    case 'stool':
      ctx.fillStyle = '#8b5a2b'; ctx.fillRect(sx + 4, g - h + 10, 6, h - 10); ctx.fillRect(sx + w - 10, g - h + 10, 6, h - 10);
      ctx.fillRect(sx + 6, g - 18, w - 12, 5); ctx.fillStyle = '#a8703a'; rr(sx, g - h, w, 12, 4); ctx.fill(); break;
    case 'crate':
      ctx.fillStyle = '#b07a3e'; ctx.fillRect(sx, g - h, w, h); ctx.strokeStyle = '#6e4520'; ctx.lineWidth = 4; ctx.strokeRect(sx + 2, g - h + 2, w - 4, h - 4);
      ctx.beginPath(); ctx.moveTo(sx + 4, g - h + 4); ctx.lineTo(sx + w - 4, g - 4); ctx.stroke();
      text('APPLES', sx + w / 2, g - h / 2 - 12, 10, '#5a3416'); break;
    case 'sack':
      ctx.fillStyle = '#e8dcc0'; ctx.beginPath(); ctx.moveTo(sx + 6, g); ctx.quadraticCurveTo(sx - 4, g - h * 0.7, sx + w * 0.35, g - h); ctx.lineTo(sx + w * 0.65, g - h); ctx.quadraticCurveTo(sx + w + 4, g - h * 0.7, sx + w - 6, g); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#b8a888'; ctx.lineWidth = 2; ctx.stroke(); text('FLOUR', sx + w / 2, g - h * 0.4, 11, '#8a6a3a'); break;
    case 'pumpkin':
      for (let i = -1; i <= 1; i++) ell(sx + w / 2 + i * 14, g - h / 2 + 2, 16, h / 2 - 1, i ? '#e0702a' : '#f08a35');
      ctx.fillStyle = '#4a6b2a'; ctx.fillRect(sx + w / 2 - 3, g - h - 8, 6, 12); break;
    case 'basket':
      ctx.fillStyle = '#c8955a'; rr(sx, g - h, w, h, 8); ctx.fill(); ctx.strokeStyle = '#9a6a3a'; ctx.lineWidth = 2;
      for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(sx + 4, g - h + i * h / 4); ctx.lineTo(sx + w - 4, g - h + i * h / 4); ctx.stroke(); }
      ell(sx + 16, g - h, 10, 6, '#7aa0c8'); ell(sx + 38, g - h - 2, 12, 6, '#d9531e'); break;
    case 'toybox':
      ctx.fillStyle = '#3b7a8a'; rr(sx, g - h, w, h, 6); ctx.fill(); ctx.fillStyle = '#f2b134'; ctx.fillRect(sx, g - h + 12, w, 6);
      ell(sx + 18, g - h - 6, 9, 9, '#c0392b'); text('TOYS', sx + w / 2, g - 16, 12, '#fff'); break;
    case 'ottoman':
      ctx.fillStyle = '#7a2e3a'; rr(sx, g - h, w, h - 8, 12); ctx.fill(); ctx.fillStyle = '#4a1e24'; ctx.fillRect(sx + 8, g - 10, 6, 10); ctx.fillRect(sx + w - 14, g - 10, 6, 10);
      ell(sx + w / 2, g - h + 12, 3, 3, '#d4a73a'); break;
    case 'hay':
      ctx.fillStyle = '#e3b448'; rr(sx, g - h, w, h, 6); ctx.fill(); ctx.strokeStyle = '#7a5216'; ctx.lineWidth = 3; ctx.stroke(); ctx.strokeStyle = '#b98a2a'; ctx.lineWidth = 2;
      for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(sx + 3, g - h + i * h / 5); ctx.lineTo(sx + w - 3, g - h + i * h / 5 + 2); ctx.stroke(); }
      ctx.fillStyle = '#8a5a2a'; ctx.fillRect(sx + w * 0.3, g - h, 4, h); ctx.fillRect(sx + w * 0.7, g - h, 4, h); break;
    case 'gnome':
      ctx.fillStyle = '#3a6ea5'; rr(sx + 4, g - 26, w - 8, 26, 6); ctx.fill(); ell(sx + w / 2, g - 30, 10, 9, '#f1c27d');
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(sx + 6, g - 28); ctx.lineTo(sx + w - 6, g - 28); ctx.lineTo(sx + w / 2, g - 12); ctx.fill();
      ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.moveTo(sx + 5, g - 34); ctx.lineTo(sx + w - 5, g - 34); ctx.lineTo(sx + w / 2 + 3, g - h); ctx.fill(); break;
    case 'hedge':
      for (let i = 0; i < 4; i++) ell(sx + 12 + i * 18, g - h / 2 - (i % 2) * 6, 16, h / 2, i % 2 ? '#a0522d' : '#6b8e23');
      ell(sx + w / 2, g - h + 12, 26, 14, '#c97a2a'); break;
    case 'vase':
      ctx.fillStyle = '#2f5d8a'; ctx.beginPath(); ctx.moveTo(sx + 10, g); ctx.quadraticCurveTo(sx - 6, g - h * 0.5, sx + 12, g - h); ctx.lineTo(sx + w - 12, g - h); ctx.quadraticCurveTo(sx + w + 6, g - h * 0.5, sx + w - 10, g); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#d4a73a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx + 4, g - h * 0.5); ctx.lineTo(sx + w - 4, g - h * 0.5); ctx.stroke();
      ell(sx + w / 2 - 6, g - h - 8, 6, 8, '#d9531e'); ell(sx + w / 2 + 6, g - h - 10, 6, 8, '#f2b134'); break;
    case 'bucket':
      ctx.fillStyle = '#8f99a3'; ctx.beginPath(); ctx.moveTo(sx + 2, g - h); ctx.lineTo(sx + w - 2, g - h); ctx.lineTo(sx + w - 7, g); ctx.lineTo(sx + 7, g); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#5d6670'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx + w / 2, g - h, w / 2 - 2, Math.PI, 0); ctx.stroke();
      ell(sx + w / 2, g - h, w / 2 - 2, 4, '#e0702a'); break;
    // ---- high obstacles: slide under ----
    case 'potrack':
      ctx.strokeStyle = '#5a3416'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(sx + 10, 0); ctx.lineTo(sx + 10, HB - 70); ctx.moveTo(sx + w - 10, 0); ctx.lineTo(sx + w - 10, HB - 70); ctx.stroke();
      ctx.fillStyle = '#5a3416'; ctx.fillRect(sx, HB - 74, w, 8);
      for (let i = 0; i < 3; i++) { const px = sx + 16 + i * 28; ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, HB - 66); ctx.lineTo(px, HB - 50); ctx.stroke();
        ctx.fillStyle = i === 1 ? '#b87333' : '#3a3a42'; ctx.beginPath(); ctx.arc(px, HB - 26, 16, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(px - 2, HB - 50, 4, 10); }
      ctx.fillStyle = 'rgba(90,52,22,0.9)'; ctx.fillRect(sx + 8, HT, w - 16, HB - 76 - HT);
      ctx.fillStyle = '#e8c38a'; for (let i = 0; i < 4; i++) ctx.fillRect(sx + 14, HT + 20 + i * 40, w - 28, 4);
      hazardStripe(sx, w); break;
    case 'table':
      ctx.fillStyle = '#6b3a1e'; ctx.fillRect(sx + 4, HB, 8, g - HB); ctx.fillRect(sx + w - 12, HB, 8, g - HB);
      ctx.fillStyle = '#8a4b2a'; ctx.fillRect(sx, HB - 14, w, 14);
      ctx.fillStyle = '#e8d6b0'; ctx.fillRect(sx - 6, HB - 20, w + 12, 8);
      // a tall dish hutch on top so it reads as "too tall to jump"
      ctx.fillStyle = '#7a4a26'; ctx.fillRect(sx + 6, HT, w - 12, HB - 20 - HT);
      ctx.fillStyle = '#f6e7c8'; for (let i = 0; i < 3; i++) ctx.fillRect(sx + 14, HT + 18 + i * 74, w - 28, 54);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) ell(sx + 32 + j * ((w - 60) / 2), HT + 45 + i * 74, 14, 14, ['#2e6f9e', '#c0392b', '#f2b134'][(i + j) % 3]);
      hazardStripe(sx, w); break;
    case 'shelf':
      ctx.fillStyle = '#7a4a26'; ctx.fillRect(sx, HT, w, HB - HT);
      ctx.fillStyle = '#5a3416'; for (let i = 0; i < 5; i++) ctx.fillRect(sx, HT + 50 + i * 50, w, 6);
      for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) { ctx.fillStyle = ['#c0392b', '#2e6f9e', '#f2b134', '#6b8e23'][(i + j) % 4]; ctx.fillRect(sx + 8 + j * 22, HT + 24 + i * 50, 14, 26); }
      hazardStripe(sx, w); break;
    case 'chandelier':
      ctx.fillStyle = 'rgba(110,42,42,0.95)'; ctx.fillRect(sx, HT, w, HB - 60 - HT);
      ctx.strokeStyle = '#d4a73a'; ctx.lineWidth = 4; ctx.strokeRect(sx + 4, HT + 4, w - 8, HB - 68 - HT);
      ctx.fillStyle = '#d4a73a'; ctx.beginPath(); ctx.ellipse(sx + w / 2, HB - 30, w / 2, 24, 0, 0, Math.PI); ctx.fill(); ctx.fillRect(sx, HB - 34, w, 6);
      for (let i = 0; i < 5; i++) { ctx.fillStyle = '#fff6d8'; ctx.fillRect(sx + 8 + i * 20, HB - 56, 6, 22); ell(sx + 11 + i * 20, HB - 60, 4, 6, '#ffcf5a'); }
      for (let i = 0; i < 6; i++) ell(sx + 10 + i * 16, HB - 4, 3, 6, 'rgba(210,235,255,0.9)');
      hazardStripe(sx, w); break;
    case 'sheet':
      ctx.strokeStyle = '#5a3416'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(sx - 10, HT); ctx.lineTo(sx - 10, g); ctx.moveTo(sx + w + 10, HT); ctx.lineTo(sx + w + 10, g); ctx.stroke();
      ctx.strokeStyle = '#ddd'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx - 10, HT + 4); ctx.lineTo(sx + w + 10, HT + 8); ctx.stroke();
      ctx.fillStyle = '#f4efe2'; ctx.beginPath(); ctx.moveTo(sx, HT + 6); ctx.lineTo(sx + w / 2 - 2, HT + 7);
      for (let i = 0; i <= 6; i++) ctx.lineTo(sx + w / 2 - 2 - i * (w / 12), HB - (i % 2) * 8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e8892b'; ctx.beginPath(); ctx.moveTo(sx + w / 2 + 2, HT + 7); ctx.lineTo(sx + w, HT + 8);
      for (let i = 0; i <= 6; i++) ctx.lineTo(sx + w - i * (w / 12), HB - (i % 2) * 8); ctx.closePath(); ctx.fill();
      break;
    case 'branch':
      ctx.fillStyle = '#5a3416'; ctx.fillRect(sx + w / 2 - 14, 0, 28, HT + 30);
      for (let i = 0; i < 12; i++) ell(sx + 10 + (i % 4) * 36, HT + 20 + Math.floor(i / 4) * 80 + (i % 2) * 14, 30, 34, LEAF_COLS[i % 5]);
      ctx.strokeStyle = '#5a3416'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(sx, HB - 10); ctx.lineTo(sx + w, HB - 20); ctx.stroke();
      hazardStripe(sx, w); break;
    case 'banner':
      ctx.strokeStyle = '#3a2414'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(sx - 6, HT); ctx.lineTo(sx - 6, g); ctx.moveTo(sx + w + 6, HT); ctx.lineTo(sx + w + 6, g); ctx.stroke();
      ctx.fillStyle = '#d4a73a'; ctx.fillRect(sx, HT, w, HB - HT);
      ctx.fillStyle = '#6e2a2a'; ctx.fillRect(sx + 6, HT + 6, w - 12, HB - HT - 12);
      text('HAPPY', sx + w / 2, HB - 150, 18, '#f2d29b'); text('HARVEST', sx + w / 2, HB - 124, 18, '#f2d29b');
      for (let i = 0; i < 5; i++) { ctx.fillStyle = LEAF_COLS[i]; ctx.beginPath(); ctx.moveTo(sx + i * w / 5, HB - 6); ctx.lineTo(sx + (i + 1) * w / 5, HB - 6); ctx.lineTo(sx + (i + 0.5) * w / 5, HB + 8); ctx.fill(); }
      break;
  }
  ctx.restore();
}

// ---------- backgrounds ----------
function floor(pal, checker) {
  if (checker) { repeat(50, 1, (sx, i) => { ctx.fillStyle = i % 2 ? pal.floor : pal.floor2; ctx.fillRect(sx, GROUND, 50, 45); ctx.fillStyle = i % 2 ? pal.floor2 : pal.floor; ctx.fillRect(sx, GROUND + 45, 50, VH - GROUND - 45); }); }
  else { ctx.fillStyle = pal.floor; ctx.fillRect(0, GROUND, VW, VH - GROUND); ctx.fillStyle = pal.floor2; repeat(120, 1, sx => { ctx.fillRect(sx, GROUND, 3, 30); ctx.fillRect(sx + 60, GROUND + 30, 3, VH - GROUND); }); ctx.fillRect(0, GROUND + 30, VW, 2); }
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, GROUND, VW, 4);
}
function drawZoneBg(z, pal) {
  const lvl = levelIdx;
  if (z === 0) {
    repeat(60, 1, (sx, i) => { ctx.fillStyle = i % 2 ? pal.wall2 : pal.wall; ctx.fillRect(sx, 0, 61, GROUND); });
    ctx.fillStyle = pal.trim; ctx.fillRect(0, 0, VW, 26);
    repeat(760, 1, sx => {
      ctx.fillStyle = '#6b3d1d'; ctx.fillRect(sx + 80, 70, 170, 140);
      const gr = ctx.createLinearGradient(0, 78, 0, 202); gr.addColorStop(0, pal.sky1); gr.addColorStop(1, pal.sky2);
      ctx.fillStyle = gr; ctx.fillRect(sx + 88, 78, 154, 124);
      ell(sx + 160, 150, 40, 34, '#d9531e'); ell(sx + 130, 160, 26, 22, '#f2b134'); ctx.fillStyle = '#5a3416'; ctx.fillRect(sx + 156, 170, 8, 32);
      ctx.fillStyle = '#6b3d1d'; ctx.fillRect(sx + 162, 78, 6, 124); ctx.fillRect(sx + 88, 136, 154, 6);
      ctx.fillStyle = pal.trim; rr(sx + 320, 50, 300, 120, 6); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; for (let k = 0; k < 3; k++) { rr(sx + 330 + k * 98, 60, 88, 100, 4); ctx.fill(); }
      ell(sx + 410, 150, 4, 4, '#e8c38a'); ell(sx + 508, 150, 4, 4, '#e8c38a');
      if (lvl === 0) { ctx.fillStyle = '#2a2a30'; ctx.fillRect(sx + 690, 26, 20, GROUND - 216); ctx.fillStyle = '#3a3a42'; rr(sx + 660, GROUND - 190, 80, 190, 8); ctx.fill(); ell(sx + 700, GROUND - 120, 22, 22, '#e0702a'); }
      if (lvl === 2) { ctx.fillStyle = '#c9c2b5'; rr(sx + 640, GROUND - 230, 100, 90, 8); ctx.fill(); ctx.fillStyle = '#8f99a3'; ctx.fillRect(sx + 650, GROUND - 220, 80, 50); }
    });
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(0, GROUND - 210, VW, 70);
    ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 1;
    repeat(28, 1, sx => { ctx.beginPath(); ctx.moveTo(sx, GROUND - 210); ctx.lineTo(sx, GROUND - 140); ctx.stroke(); });
    ctx.fillStyle = 'rgba(70,35,15,0.35)'; ctx.fillRect(0, GROUND - 140, VW, 140);
    ctx.fillStyle = 'rgba(255,245,225,0.35)'; ctx.fillRect(0, GROUND - 146, VW, 8);
    floor(pal, lvl === 2);
  } else if (z === 1) {
    ctx.fillStyle = pal.hwall; ctx.fillRect(0, 0, VW, GROUND);
    ctx.fillStyle = pal.hwall2; repeat(46, 1, sx => ctx.fillRect(sx, 0, 22, GROUND));
    ctx.fillStyle = pal.trim; ctx.fillRect(0, 0, VW, 22); ctx.fillRect(0, GROUND - 130, VW, 10);
    ctx.fillStyle = 'rgba(40,20,10,0.3)'; ctx.fillRect(0, GROUND - 120, VW, 120);
    repeat(640, 1, sx => {
      ctx.fillStyle = lvl === 2 ? '#d4a73a' : '#5a3416'; ctx.fillRect(sx + 60, 90, 130, 100);
      ctx.fillStyle = '#f6d7a0'; ctx.fillRect(sx + 70, 100, 110, 80); ell(sx + 125, 150, 26, 18, '#e0702a'); ctx.fillStyle = '#4a6b2a'; ctx.fillRect(sx + 122, 128, 6, 8);
      ctx.fillStyle = 'rgba(30,15,8,0.55)'; rr(sx + 300, GROUND - 270, 120, 270, 8); ctx.fill();
      ctx.strokeStyle = pal.trim; ctx.lineWidth = 8; ctx.strokeRect(sx + 300, GROUND - 270, 120, 270);
      if (lvl === 2) { ctx.fillStyle = '#e8dcc0'; ctx.fillRect(sx + 520, 22, 40, GROUND - 22); ctx.fillStyle = '#d4a73a'; ctx.fillRect(sx + 512, 22, 56, 14); ctx.fillRect(sx + 512, GROUND - 14, 56, 14); }
      else { ctx.fillStyle = '#3a2414'; ctx.fillRect(sx + 538, GROUND - 160, 6, 160); ctx.fillStyle = '#f2d29b'; ctx.beginPath(); ctx.moveTo(sx + 514, GROUND - 160); ctx.lineTo(sx + 568, GROUND - 160); ctx.lineTo(sx + 556, GROUND - 200); ctx.lineTo(sx + 526, GROUND - 200); ctx.fill(); }
    });
    if (lvl === 1) { ctx.fillStyle = 'rgba(120,40,30,0.5)'; ctx.fillRect(0, GROUND, VW, VH - GROUND); }
    floor(pal, lvl === 2);
  } else {
    const gr = ctx.createLinearGradient(0, 0, 0, GROUND); gr.addColorStop(0, pal.sky1); gr.addColorStop(1, pal.sky2);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, VW, GROUND);
    ell(VW * 0.75, z === 3 ? 250 : 120, 50, 50, 'rgba(255,230,150,0.9)');
    repeat(500, 0.2, (sx, i) => ell(sx + 250, GROUND - 40, 320, 120 + (i % 3) * 20, z === 3 ? '#d9a441' : pal.hill));
    if (z === 2) {
      repeat(300, 0.5, (sx, i) => {
        const k = ((i % 5) + 5) % 5;
        ctx.fillStyle = '#4a2a14'; ctx.fillRect(sx + 140, GROUND - 230, 16, 230);
        ell(sx + 148, GROUND - 260, 70, 60, LEAF_COLS[k]); ell(sx + 110, GROUND - 230, 40, 34, LEAF_COLS[(k + 2) % 5]); ell(sx + 190, GROUND - 236, 44, 36, LEAF_COLS[(k + 1) % 5]);
      });
      ctx.fillStyle = '#c9a77a'; ctx.fillRect(0, GROUND - 76, VW, 10); ctx.fillRect(0, GROUND - 36, VW, 10);
      ctx.fillStyle = '#e2c79c';
      repeat(34, 1, sx => { ctx.beginPath(); ctx.moveTo(sx + 4, GROUND); ctx.lineTo(sx + 4, GROUND - 96); ctx.lineTo(sx + 15, GROUND - 106); ctx.lineTo(sx + 26, GROUND - 96); ctx.lineTo(sx + 26, GROUND); ctx.fill(); });
      ctx.fillStyle = pal.grass; ctx.fillRect(0, GROUND, VW, VH - GROUND);
      repeat(24, 1, (sx, i) => { ctx.fillStyle = i % 3 ? '#6e7a2c' : '#a07a2c'; ctx.fillRect(sx, GROUND, 3, 8 + (((i % 4) + 4) % 4) * 3); });
    } else {
      ctx.strokeStyle = '#c08a2a'; ctx.lineWidth = 3;
      repeat(70, 0.6, (sx, i) => { const hgt = 70 + (((i % 3) + 3) % 3) * 10; ctx.beginPath(); ctx.moveTo(sx + 10, GROUND); ctx.lineTo(sx + 14, GROUND - hgt); ctx.stroke(); ell(sx + 15, GROUND - hgt - 6, 4, 10, '#e3b448'); });
      ctx.fillStyle = '#c9a24a'; ctx.fillRect(0, GROUND, VW, VH - GROUND);
      ctx.fillStyle = '#b08a3a'; ctx.fillRect(0, GROUND + 6, VW, 4);
    }
  }
}

function drawWorld() {
  const pal = L.pal;
  camX = P.x - VW * 0.4;
  for (let z = 0; z < 4; z++) {
    const a = zoneStart(z) - camX, b = z === 3 ? VW + 10 : zoneStart(z + 1) - camX;
    if (b < 0 || a > VW) continue;
    ctx.save(); ctx.beginPath(); ctx.rect(Math.max(0, a), 0, Math.min(VW, b) - Math.max(0, a), VH); ctx.clip();
    drawZoneBg(z, pal); ctx.restore();
  }
  for (let z = 1; z < 4; z++) {
    const sx = zoneStart(z) - camX;
    if (sx < -200 || sx > VW + 200) continue;
    if (z < 3) {
      ctx.fillStyle = '#4a2812'; ctx.fillRect(sx - 20, 0, 16, GROUND); ctx.fillRect(sx + 4, 0, 16, GROUND);
      ctx.fillStyle = z === 1 ? '#8a5a2b' : '#3b6b4a'; ctx.beginPath(); ctx.moveTo(sx + 20, GROUND); ctx.lineTo(sx + 80, GROUND + 20); ctx.lineTo(sx + 80, GROUND - 250); ctx.lineTo(sx + 20, GROUND - 280); ctx.fill(); ell(sx + 68, GROUND - 130, 5, 5, '#e8c38a');
      ctx.fillStyle = '#2a7a3a'; rr(sx - 70, 60, 140, 34, 6); ctx.fill(); text(z === 1 ? 'TO HALLWAY' : 'BACK DOOR', sx, 77, 16, '#fff');
    } else {
      ctx.fillStyle = '#7a4a26'; ctx.fillRect(sx - 14, GROUND - 130, 14, 130); ctx.fillRect(sx + 80, GROUND - 130, 14, 130);
      ctx.fillStyle = '#c9a77a'; ctx.fillRect(sx + 94, GROUND - 110, 70, 12); ctx.fillRect(sx + 94, GROUND - 60, 70, 12);
      ctx.fillStyle = '#f7f4ee'; rr(sx - 80, 120, 160, 40, 8); ctx.fill(); text('OPEN FIELD', sx, 140, 20, '#6b3d1d');
    }
  }
  const gx = L.length - camX;
  if (gx > -200 && gx < VW + 300) {
    ctx.fillStyle = '#5a3416'; ctx.fillRect(gx - 6, GROUND - 200, 12, 200);
    ctx.fillStyle = '#fff6d8'; rr(gx - 120, GROUND - 240, 240, 80, 10); ctx.fill(); ctx.strokeStyle = '#6b3d1d'; ctx.lineWidth = 4; ctx.stroke();
    text('FREEDOM!', gx, GROUND - 214, 26, '#c8321e'); text('No Thanksgiving past here', gx, GROUND - 182, 14, '#6b3d1d');
  }
  for (const o of obstacles) { const sx = o.x - camX; if (sx > -320 && sx < VW + 80) drawObstacle(o, sx); }
  for (const f of feathers) { if (f.got) continue; const sx = f.x - camX; if (sx < -30 || sx > VW + 30) continue; drawGoldFeather(sx, f.y + Math.sin(time * 4 + f.x) * 4, Math.sin(time * 3 + f.x) * 0.3); }
  for (const pr of projectiles) {
    if (pr.type === 'cleaver') {
      const k = pr.t / pr.T; const sx = pr.tx - camX;
      ctx.fillStyle = `rgba(200,30,20,${0.2 + 0.4 * k})`; ctx.beginPath(); ctx.ellipse(sx, GROUND + 2, 10 + 22 * k, 5 + 3 * k, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,240,200,0.8)'; ctx.lineWidth = 2; ctx.stroke();
    } else if (pr.type === 'stuck') {
      ctx.save(); ctx.translate(pr.x - camX, GROUND - 10); ctx.rotate(-1.3); drawKnifeShape('cleaver', 1); ctx.restore();
    }
  }
  for (const c of chefs) {
    const sx = (chefsStopped ? c.worldX : P.x - c.gap) - camX;
    if (sx > -80 && sx < VW + 80) drawChef(c, sx, GROUND, c.anim);
    if (c.st === 'wind' && !chefsStopped) laneWarning(c, sx);
  }
  const blink = P.inv > 0 && Math.floor(time * 14) % 2 === 0;
  ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(P.x - camX, GROUND + 3, 26, 6, 0, 0, Math.PI * 2); ctx.fill();
  drawTurkey(P.x - camX, P.y, P.sliding, P.hovering ? time * 10 : P.anim, blink ? 0.35 : 1, 1, P.hovering);
  if (!P.onGround && state === 'play') {
    const tx = P.x - camX, my = P.y - 96;
    ctx.fillStyle = 'rgba(40,20,10,0.55)'; rr(tx - 24, my, 48, 8, 4); ctx.fill();
    ctx.fillStyle = P.hovering ? '#ffe27a' : '#c9a77a';
    const mw = 48 * Math.max(0, P.hover / HOVER_MAX);
    if (mw > 1) { rr(tx - 24, my, mw, 8, 4); ctx.fill(); }
  }
  if (P.sliding) { for (let i = 0; i < 3; i++) ell(P.x - camX - 40 - i * 14, GROUND - 6 - i * 3, 6 - i, 4 - i, 'rgba(240,220,180,0.6)'); }
  for (const pr of projectiles) {
    if (pr.type === 'knife') {
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pr.x - camX - 26, pr.y); ctx.lineTo(pr.x - camX - 70, pr.y); ctx.stroke();
      ctx.save(); ctx.translate(pr.x - camX, pr.y); drawKnifeShape('knife', 1.1); ctx.restore();
    } else if (pr.type === 'cleaver') { ctx.save(); ctx.translate(pr.x - camX, pr.y); ctx.rotate(pr.spin); drawKnifeShape('cleaver', 1); ctx.restore(); }
  }
  for (const p of particles) {
    if (p.kind === 'feather') { ctx.save(); ctx.globalAlpha = Math.min(1, p.t); ctx.translate(p.x - camX, p.y); ctx.rotate(p.r); ell(0, 0, 4, 11, p.c); ctx.restore(); }
    else if (p.kind === 'text') { ctx.globalAlpha = Math.min(1, p.t * 2); text(p.s, p.x - camX, p.y, 18, '#ffe27a', 'center', '#5a2a10'); ctx.globalAlpha = 1; }
  }
}

function laneWarning(c, sx) {
  const arc = c.mode === 'arc' || c.mode === 'arc2';
  const pulse = 0.5 + 0.5 * Math.sin(time * 22);
  const tx = P.x - camX, ty = GROUND - 150;
  if (!arc) {
    const y = lanesY(c.lane);
    ctx.save(); ctx.setLineDash([12, 10]); ctx.strokeStyle = `rgba(255,70,40,${0.45 + 0.4 * pulse})`; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(sx + 30, y); ctx.lineTo(tx + 80, y); ctx.stroke(); ctx.restore();
  }
  const label = arc ? 'CLEAVER!' : (c.lane === 'low' ? '\u25B2 JUMP' : '\u25BC SLIDE');
  const w = arc ? 110 : 96;
  ctx.fillStyle = `rgba(255,250,235,${0.75 + 0.25 * pulse})`; rr(tx - w / 2, ty - 20, w, 40, 12); ctx.fill(); ctx.strokeStyle = '#c8321e'; ctx.lineWidth = 3; ctx.stroke();
  text(label, tx, ty + 1, 17, '#c8321e');
}

function drawGoldFeather(x, y, r) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(r - 0.5);
  ctx.fillStyle = 'rgba(255,220,100,0.25)'; ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createLinearGradient(0, -16, 0, 16); g.addColorStop(0, '#fff1a8'); g.addColorStop(1, '#e0a020');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -2, 7, 15, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#a06a10'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(0, 17); ctx.stroke();
  ctx.restore();
}
function drawLifeFeather(x, y, on) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(0.35);
  ell(0, 0, 9, 18, on ? '#d9531e' : 'rgba(255,255,255,0.18)');
  if (on) ell(0, -8, 5, 7, '#f2b134');
  ctx.strokeStyle = on ? '#6b2a10' : 'rgba(255,255,255,0.3)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(0, 22); ctx.stroke();
  ctx.restore();
}

// ---------- HUD + screens ----------
const mod = (a, n) => ((a % n) + n) % n;
function safeV() { return { l: Math.max(0, (safe.l - offX) / scale), r: Math.max(0, (safe.r - (cssW - offX - VW * scale)) / scale), t: Math.max(0, (safe.t - offY) / scale) }; }

function drawHUD() {
  const sv = safeV(), lx = 18 + sv.l, ty = 14 + sv.t;
  ctx.fillStyle = 'rgba(40,20,10,0.55)'; rr(lx - 8, ty - 6, 300, 72, 14); ctx.fill();
  for (let i = 0; i < 3; i++) drawLifeFeather(lx + 14 + i * 26, ty + 22, i < P.lives);
  drawGoldFeather(lx + 106, ty + 22, 0.3);
  text('x' + collected, lx + 122, ty + 22, 20, '#ffe27a', 'left');
  text(Math.round(score).toString(), lx + 285, ty + 22, 22, '#fff3dc', 'right');
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; rr(lx, ty + 46, 160, 12, 6); ctx.fill();
  const hbar = 160 * Math.max(0, P.hover / HOVER_MAX);
  ctx.fillStyle = P.hovering ? '#ffe27a' : '#e8c38a';
  if (hbar > 1) { rr(lx, ty + 46, hbar, 12, 6); ctx.fill(); }
  text('HOVER', lx + 168, ty + 52, 12, '#ffe27a', 'left');
  const bw = Math.min(340, VW - lx - 300 - 110), bx = Math.max(lx + 310, VW / 2 - bw / 2), by = ty;
  ctx.fillStyle = 'rgba(40,20,10,0.55)'; rr(bx - 10, by - 6, bw + 20, 54, 14); ctx.fill();
  const zc = ['#b97a40', '#c0503a', '#6f8a34', '#e3b448'];
  for (let z = 0; z < 4; z++) { ctx.fillStyle = zc[z]; ctx.fillRect(bx + ZONE_FRACS[z] * bw, by + 2, (ZONE_FRACS[z + 1] - ZONE_FRACS[z]) * bw - 2, 8); }
  const main = chefs.find(c => c.kind !== 'chaser');
  if (main && !chefsStopped) { const cp = Math.max(0, (P.x - main.gap) / L.length); ell(bx + cp * bw, by + 6, 6, 6, '#ffffff'); }
  const prog = Math.min(1, P.x / L.length);
  ell(bx + prog * bw, by + 6, 7, 7, '#d9531e'); ctx.strokeStyle = '#fff3dc'; ctx.lineWidth = 2; ctx.stroke();
  text(L.name + ': ' + ZONE_NAMES[zone], bx + bw / 2, by + 30, 15, '#fff3dc');
  if (main && !chefsStopped && main.gap < 110) {
    const pulse = 0.5 + 0.5 * Math.sin(time * 16);
    text('Chef is close! Dash!', VW / 2, 96 + sv.t, 22, `rgba(255,${Math.round(120 + 100 * pulse)},80,1)`, 'center', '#3a1f12');
  }
  if (banner.t > 0) {
    ctx.globalAlpha = Math.max(0, Math.min(1, banner.t * 2));
    text(banner.text, VW / 2, 160, 40, '#fff3dc', 'center', '#7a2e12');
    ctx.globalAlpha = 1;
  }
  if (state === 'play' && P.x < 1100 && levelIdx === 0) {
    const msg = isTouch ? 'Tap JUMP or SLIDE. Hold HOVER to float over knives. Hold DASH to stay ahead of the chef.' : 'Space or Up: jump (hold to hover)   Down: slide   Right: dash   Left: slow   P: pause';
    text(msg, VW / 2, isTouch && !portrait ? 210 : VH - 28, 17, '#fff3dc', 'center', '#3a1f12');
  }
}

function button(label, x, y, w, h, action, opt) {
  opt = opt || {};
  const hot = opt.hot;
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; rr(x, y + 5, w, h, 16); ctx.fill();
  ctx.fillStyle = opt.disabled ? '#6b5a4a' : (hot ? '#f08a35' : '#c8481a'); rr(x, y, w, h, 16); ctx.fill();
  ctx.strokeStyle = hot ? '#fff3dc' : 'rgba(255,240,210,0.6)'; ctx.lineWidth = hot ? 4 : 2; ctx.stroke();
  text(label, x + w / 2, y + h / 2 + 1, opt.size || 24, '#fff8ea');
  buttons.push({ x, y, w, h, action, disabled: opt.disabled, label });
}

function menuBg() {
  const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#e8742f'); g.addColorStop(0.6, '#f6b26b'); g.addColorStop(1, '#fbe0b0');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  camX = time * 30;
  repeat(500, 0.4, (sx, i) => ell(sx + 250, VH - 70, 330, 140 + mod(i, 3) * 25, mod(i, 2) ? '#c2622a' : '#b5552a'));
  repeat(260, 0.8, (sx, i) => { ctx.fillStyle = '#4a2a14'; ctx.fillRect(sx + 120, VH - 210, 14, 140); ell(sx + 127, VH - 230, 60, 52, LEAF_COLS[mod(i, 5)]); ell(sx + 96, VH - 206, 34, 28, LEAF_COLS[mod(i + 2, 5)]); });
  ctx.fillStyle = '#c9a24a'; ctx.fillRect(0, VH - 80, VW, 80);
  ctx.strokeStyle = '#a8801f'; ctx.lineWidth = 3;
  repeat(60, 1, (sx, i) => { ctx.beginPath(); ctx.moveTo(sx + 10, VH - 80); ctx.lineTo(sx + 13, VH - 112 - mod(i, 3) * 8); ctx.stroke(); });
}

function drawTitle() {
  menuBg();
  const cx = VW / 2;
  text('TURKEY', cx, 80, 76, '#fff3dc', 'center', '#7a2e12');
  text('ESCAPE', cx, 148, 76, '#ffd25a', 'center', '#7a2e12');
  text('Dodge the chefs. Reach the open field. Skip Thanksgiving.', cx, 196, 20, '#4a1e0c');
  text(isTouch ? 'Hold HOVER to float over knives for a moment.' : 'Hold Up or Space in the air to hover over knives.', cx, 218, 16, '#6b2a10');
  drawTurkey(cx + 60 + Math.sin(time) * 30, VH - 84, false, time * 6, 1, 1.15);
  const fake = { st: 'run', kind: 'straight', scarf: '#c0392b', hat: 1.1 };
  drawChef(fake, cx - 260 + Math.sin(time) * 30, VH - 80, time * 9);
  const kx = cx - 200 + ((time * 240) % 200);
  ctx.save(); ctx.translate(kx, VH - 150); drawKnifeShape('knife', 1.1); ctx.restore();
  button('PLAY', cx - 110, 236, 220, 70, () => setState('select'), { hot: true, size: 32 });
  button(save.muted ? 'Sound: OFF' : 'Sound: ON', cx + 134, 249, 150, 44, () => { save.muted = !save.muted; writeSave(); }, { size: 18 });
  text(isTouch ? 'Tap PLAY to start' : 'Press Enter to start', cx, 328, 18, '#5a2a10');
}

function wrapText(s, x, y, maxW, size, col) {
  ctx.font = 'bold ' + size + 'px "Trebuchet MS", system-ui, sans-serif';
  const words = s.split(' '); const lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur);
  lines.forEach((ln, i) => text(ln, x, y + i * (size + 4), size, col));
}

function drawSelect() {
  menuBg();
  ctx.fillStyle = 'rgba(40,20,10,0.35)'; ctx.fillRect(0, 0, VW, VH);
  text('Choose a Home to Escape', VW / 2, 48, 36, '#fff3dc', 'center', '#7a2e12');
  const n = LEVELS.length, gap = 18, cw = Math.min(290, (VW - 60 - (n - 1) * gap) / n), chh = 340;
  const total = n * cw + (n - 1) * gap, x0 = VW / 2 - total / 2;
  LEVELS.forEach((lv, i) => {
    const x = x0 + i * (cw + gap), y = 88, un = save.unlocked[i], hot = i === selIdx;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; rr(x, y + 6, cw, chh, 18); ctx.fill();
    ctx.fillStyle = un ? '#fff3dc' : '#8a7a6a'; rr(x, y, cw, chh, 18); ctx.fill();
    ctx.strokeStyle = hot ? '#ffd25a' : '#6b3d1d'; ctx.lineWidth = hot ? 6 : 3; ctx.stroke();
    const hx = x + cw / 2, hy = y + 120;
    ctx.save(); if (!un) ctx.globalAlpha = 0.45;
    const hw = [110, 140, 180][i], hc = ['#b5552a', '#d9a066', '#efe3cf'][i];
    ctx.fillStyle = hc; ctx.fillRect(hx - hw / 2, hy - 60, hw, 60);
    ctx.fillStyle = ['#6b2a10', '#5a3416', '#6e2a2a'][i]; ctx.beginPath(); ctx.moveTo(hx - hw / 2 - 12, hy - 58); ctx.lineTo(hx, hy - 108 - i * 8); ctx.lineTo(hx + hw / 2 + 12, hy - 58); ctx.fill();
    ctx.fillStyle = '#3a1f12'; ctx.fillRect(hx - 10, hy - 34, 20, 34);
    ctx.fillStyle = '#ffd25a'; for (let k = 0; k < 2 + i; k++) ctx.fillRect(hx - hw / 2 + 10 + k * ((hw - 34) / (1 + i)), hy - 50, 14, 12);
    if (i === 2) { ctx.fillStyle = '#fff'; ctx.fillRect(hx - 64, hy - 60, 8, 60); ctx.fillRect(hx + 56, hy - 60, 8, 60); }
    ctx.restore();
    text(lv.name, hx, y + 150, 24, un ? '#6b2a10' : '#3a2a20');
    if (un) {
      wrapText(lv.chef, hx, y + 180, cw - 24, 15, '#a0441c');
      wrapText(lv.blurb, hx, y + 222, cw - 30, 14, '#4a2a14');
      for (let s = 0; s < 3; s++) text('\u2605', hx - 30 + s * 30, y + 288, 26, s < save.stars[i] ? '#f2b134' : 'rgba(80,40,20,0.25)');
      text(save.best[i] ? 'Best: ' + save.best[i] : 'Not escaped yet', hx, y + 318, 14, '#6b3d1d');
      buttons.push({ x, y, w: cw, h: chh, action: () => { selIdx = i; startLevel(i); }, label: 'level' + i });
    } else {
      ctx.fillStyle = '#3a2a20'; rr(hx - 22, y + 196, 44, 36, 6); ctx.fill();
      ctx.strokeStyle = '#3a2a20'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(hx, y + 196, 14, Math.PI, 0); ctx.stroke();
      text('LOCKED', hx, y + 258, 18, '#2a1a10');
      wrapText('Escape the ' + LEVELS[i - 1].name + ' to unlock', hx, y + 290, cw - 30, 14, '#2a1a10');
      buttons.push({ x, y, w: cw, h: chh, action: () => {}, disabled: true, label: 'locked' + i });
    }
  });
  button('Back', 20 + safeV().l, VH - 84, 120, 50, () => setState('title'), { size: 20 });
  text(isTouch ? 'Tap a home to play' : 'Left or Right to choose, Enter to play', VW / 2, VH - 58, 16, '#fff3dc', 'center', '#3a1f12');
}

function panel(h) {
  ctx.fillStyle = 'rgba(30,15,8,0.6)'; ctx.fillRect(0, 0, VW, VH);
  const w = Math.min(580, VW - 40), x = VW / 2 - w / 2, y = VH / 2 - h / 2;
  ctx.fillStyle = '#fff3dc'; rr(x, y, w, h, 22); ctx.fill(); ctx.strokeStyle = '#d9531e'; ctx.lineWidth = 6; ctx.stroke();
  return { x, y, w };
}
function drawPause() {
  const p = panel(400);
  text('Paused', VW / 2, p.y + 40, 36, '#6b2a10');
  text(L.name + ', ' + ZONE_NAMES[zone], VW / 2, p.y + 78, 18, '#a0441c');
  const bw = 260;
  button('Resume', VW / 2 - bw / 2, p.y + 104, bw, 50, () => setState('play'), { hot: pauseSel === 0 });
  button('Restart', VW / 2 - bw / 2, p.y + 162, bw, 50, () => startLevel(levelIdx), { hot: pauseSel === 1 });
  button('Homes', VW / 2 - bw / 2, p.y + 220, bw, 50, () => setState('select'), { hot: pauseSel === 2 });
  button('Urwin Homeschool home', VW / 2 - bw / 2, p.y + 278, bw, 50, goSiteHome, { hot: pauseSel === 3, size: 18 });
}
function drawWin() {
  const p = panel(400);
  const last = levelIdx === LEVELS.length - 1;
  text('You Escaped!', VW / 2, p.y + 46, 44, '#2a7a3a');
  text('The ' + L.name + ' is behind you.', VW / 2, p.y + 88, 18, '#6b3d1d');
  for (let s = 0; s < 3; s++) { const on = s < winInfo.stars; const sc = on ? 1 + 0.08 * Math.sin(time * 6 + s) : 1; ctx.save(); ctx.translate(VW / 2 - 60 + s * 60, p.y + 138); ctx.scale(sc, sc); text('\u2605', 0, 0, 52, on ? '#f2b134' : 'rgba(80,40,20,0.2)'); ctx.restore(); }
  text('Score ' + Math.round(score) + (winInfo.best ? '  (new best!)' : ''), VW / 2, p.y + 190, 24, '#6b2a10');
  text('Golden feathers ' + collected + ' of ' + totalFeathers + '    Feathers left ' + P.lives, VW / 2, p.y + 222, 16, '#6b3d1d');
  if (winInfo.newly) text('New home unlocked: ' + LEVELS[levelIdx + 1].name + '!', VW / 2, p.y + 258, 20, '#c8321e');
  else if (last) text('You escaped every home. No turkey dinner this year!', VW / 2, p.y + 258, 18, '#c8321e');
  const bw = 160, y = p.y + 304;
  if (!last) {
    button('Next Home', VW / 2 - bw * 1.5 - 14, y, bw, 56, () => { selIdx = levelIdx + 1; startLevel(levelIdx + 1); }, { hot: true, size: 20 });
    button('Replay', VW / 2 - bw / 2, y, bw, 56, () => startLevel(levelIdx), { size: 20 });
    button('Homes', VW / 2 + bw / 2 + 14, y, bw, 56, () => setState('select'), { size: 20 });
  } else {
    button('Replay', VW / 2 - bw - 7, y, bw, 56, () => startLevel(levelIdx), { size: 20, hot: true });
    button('Homes', VW / 2 + 7, y, bw, 56, () => setState('select'), { size: 20 });
  }
}
function drawLose() {
  const p = panel(340);
  const main = L.chefs[0];
  text(loseReason === 'caught' ? 'Caught by ' + main.name + '!' : 'Out of Feathers!', VW / 2, p.y + 50, 38, '#c8321e');
  text(loseReason === 'caught' ? 'Hold DASH so the chef cannot catch up.' : 'Watch for JUMP and SLIDE. Hold HOVER to float over knives.', VW / 2, p.y + 94, 16, '#6b3d1d');
  text('Made it to the ' + ZONE_NAMES[zone] + '.  Score ' + Math.round(score), VW / 2, p.y + 130, 20, '#6b2a10');
  drawTurkey(VW / 2, p.y + 232, false, time * 3, 1, 0.9);
  const bw = 190;
  button('Try Again', VW / 2 - bw - 10, p.y + 260, bw, 56, () => startLevel(levelIdx), { hot: true });
  button('Homes', VW / 2 + 10, p.y + 260, bw, 56, () => setState('select'));
}

function menuKey(k) {
  if (state === 'title') { if (k === 'Enter' || k === ' ') { sfx.click(); setState('select'); } }
  else if (state === 'select') {
    if (k === 'ArrowLeft' || k === 'a') selIdx = (selIdx + LEVELS.length - 1) % LEVELS.length;
    if (k === 'ArrowRight' || k === 'd') selIdx = (selIdx + 1) % LEVELS.length;
    if ((k === 'Enter' || k === ' ') && save.unlocked[selIdx]) startLevel(selIdx);
    if (k === 'Escape') setState('title');
  } else if (state === 'pause') {
    if (k === 'ArrowUp') pauseSel = (pauseSel + 3) % 4;
    if (k === 'ArrowDown') pauseSel = (pauseSel + 1) % 4;
    if (k === 'p' || k === 'P' || k === 'Escape') setState('play');
    if (k === 'Enter' || k === ' ') { if (pauseSel === 0) setState('play'); else if (pauseSel === 1) startLevel(levelIdx); else if (pauseSel === 2) setState('select'); else goSiteHome(); }
  } else if (state === 'win') {
    if (k === 'Enter' || k === ' ') { if (levelIdx + 1 < LEVELS.length) { selIdx = levelIdx + 1; startLevel(levelIdx + 1); } else setState('select'); }
    if (k === 'Escape') setState('select');
  } else if (state === 'lose') {
    if (k === 'Enter' || k === ' ') startLevel(levelIdx);
    if (k === 'Escape') setState('select');
  }
}

// ---------- main render ----------
function render() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#2a160c'; ctx.fillRect(0, 0, cssW, cssH);
  ctx.save();
  ctx.translate(offX, offY); ctx.scale(scale, scale);
  ctx.beginPath(); ctx.rect(0, 0, VW, VH); ctx.clip();
  buttons = [];
  if (state === 'title') { drawTitle(); drawLeaves(0.9); }
  else if (state === 'select') { drawSelect(); drawLeaves(0.6); }
  else {
    ctx.save();
    if (shake > 0 && state === 'play') ctx.translate((Math.random() - 0.5) * 12 * shake, (Math.random() - 0.5) * 12 * shake);
    drawWorld(); ctx.restore();
    drawLeaves(zone >= 2 ? 0.95 : 0.45);
    drawHUD();
    if (state === 'pause') drawPause(); else if (state === 'win') drawWin(); else if (state === 'lose') drawLose();
  }
  ctx.restore();
  if (portrait) drawPortraitExtras();
}
function drawPortraitExtras() {
  const gb = offY + VH * scale, y = gb + 96;
  ctx.save();
  ctx.fillStyle = '#f6b26b'; ctx.font = 'bold 15px "Trebuchet MS", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.strokeStyle = '#f6b26b'; ctx.lineWidth = 2;
  ctx.save(); ctx.translate(cssW / 2 - 130, y); ctx.rotate(Math.sin(time * 2) * 0.6 - 0.6); ctx.strokeRect(-7, -12, 14, 24); ctx.restore();
  ctx.fillText('Turn sideways for a bigger view', cssW / 2 + 12, y);
  ctx.restore();
}

// ---------- loop ----------
let lastT = performance.now(), fpsAcc = 0, fpsN = 0, fps = 60;
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - lastT) / 1000)); lastT = now;
  fpsAcc += dt; fpsN++;
  if (fpsAcc >= 1) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
  update(dt);
  render();
  requestAnimationFrame(frame);
}

// ---------- test hooks (only with ?test=1, used by the Playwright checks) ----------
const TE = window.TE = {
  autopilot: false, invincible: false, hitLog: [], hits: 0, throws: 0, dodges: 0, jumps: 0, slides: 0, flaps: 0,
  get state() { return state; }, get fps() { return fps; },
  get player() { return P && { x: P.x, y: P.y, vy: P.vy, sliding: P.sliding, onGround: P.onGround, lives: P.lives, speed: P.speed, hover: P.hover, hovering: P.hovering }; },
  get hover() { return P && { stamina: P.hover, max: HOVER_MAX, hovering: P.hovering, vy: P.vy }; },
  spawnKnife: lane => { if (P) projectiles.push({ type: 'knife', x: P.x + 90, y: lanesY(lane || 'low'), vx: P.speed + 200, lane: lane || 'low' }); },
  get level() { return L && { idx: levelIdx, name: L.name, length: L.length, zone, chefs: chefs.map(c => ({ kind: c.kind, st: c.st, gap: c.gap })) }; },
  get projectiles() { return projectiles.map(p => ({ type: p.type, x: p.x, y: p.y, lane: p.lane })); },
  get saveData() { return JSON.parse(JSON.stringify(save)); },
  get buttons() { return buttons.map(b => ({ label: b.label, x: b.x * scale + offX, y: b.y * scale + offY, w: b.w * scale, h: b.h * scale, disabled: !!b.disabled })); },
  startLevel: i => startLevel(i), setState: s => setState(s),
  teleport: x => { if (P) P.x = x; },
  reloadSave: () => { save = loadSave(); }
};
if (!TEST) { delete window.TE; }

layout();
setState('title');
requestAnimationFrame(frame);
})();
