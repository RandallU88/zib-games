/* Turkey Escape 2: Feather Force. A Thanksgiving platformer. Plain JS + Canvas, no libraries, no network. */
(() => {
'use strict';

// ---------- constants ----------
const VH = 540, T = 40, ROWS = 13;
let OY = VH - ROWS * T; // world-to-screen offset; raised a little in touch landscape so the floor sits above the thumb buttons
const GRAV = 2100, JUMP_V = -780, JUMP_CUT = -240, WALK = 215, MAXFALL = 900, CLIMB = 150;
const MAXHP = 10, INV_T = 1.3, STEP = 1 / 120;
const SAVE_KEY = 'turkeyEscape.v2';
const E = 0, SOLID = 1, ONE = 2, LAD = 3, HOT = 4;
const TEST = /[?&]test=1/.test(location.search);

const WEAPONS = [
  { id: 'berry', name: 'Cranberry Popper', short: 'BERRY', col: '#c8102e', cd: 0.2, max: 3, info: 'Fast straight shots.' },
  { id: 'corn', name: 'Corn Spread', short: 'CORN', col: '#f2c14e', cd: 0.36, max: 9, info: 'Three kernels fan out. Great for hopping peas and flying lids.' },
  { id: 'pie', name: 'Pie Toss', short: 'PIE', col: '#d98a3a', cd: 0.55, max: 2, info: 'Lobs a heavy pie in an arc. Big damage.' },
  { id: 'butter', name: 'Butter Bounce', short: 'BUTTER', col: '#ffe066', cd: 0.4, max: 3, info: 'Bounces along the floor. Hits low enemies.' }
];
const STAGES = [
  { name: 'Farmhouse Kitchen', boss: 'Chef Gus', gives: 1, weak: 3, theme: 'kitchen', scarf: '#c0392b', hat: 1.0, bhp: 18,
    blurb: 'Slow chef. Throws one knife at a time.' },
  { name: 'Suburban House', boss: 'Chef Marie', gives: 2, weak: 1, theme: 'house', scarf: '#2e6f9e', hat: 1.15, bhp: 22,
    blurb: 'Lobs cleavers. Watch the red target.' },
  { name: 'Backyard Cookout', boss: 'Grill Master Hank', gives: 3, weak: 2, theme: 'yard', scarf: '#2f7d32', hat: 0.8, bhp: 24,
    blurb: 'Bouncing hot potatoes and big stomps.' },
  { name: 'Big Mansion', boss: 'Head Chef Bram', gives: -1, weak: 3, theme: 'mansion', scarf: '#6a2c8c', hat: 1.45, bhp: 30,
    blurb: 'The head chef and his helper Pip.' }
];
const PAL = {
  kitchen: { wall: '#c98b4f', wall2: '#b97a40', trim: '#6b3d1d', blk: '#8a5a32', blk2: '#7a4a26', top: '#e8c99a', top2: '#d6b07a', bg: '#3a1f12' },
  house: { wall: '#f0d9a8', wall2: '#e6c98f', trim: '#8a4b2a', blk: '#b5523b', blk2: '#a3452f', top: '#d9d0c0', top2: '#c4b9a5', bg: '#3a1f12' },
  yard: { wall: '#f6a35c', wall2: '#fde3b4', trim: '#6b3d1d', blk: '#7a4a26', blk2: '#6a3f20', top: '#7f9a3a', top2: '#6a8530', bg: '#3a1f12' },
  mansion: { wall: '#efe3cf', wall2: '#e2d3b8', trim: '#b8892f', blk: '#d8d2c8', blk2: '#c5bdb0', top: '#9b2c2c', top2: '#7e2222', bg: '#2a1810' }
};

// ---------- save ----------
function defaultSave() { return { cleared: [false, false, false, false], weapons: [true, false, false, false], feathers: [0, 0, 0, 0], muted: false }; }
function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!s || !Array.isArray(s.cleared)) return defaultSave();
    const d = defaultSave();
    for (let i = 0; i < 4; i++) { d.cleared[i] = !!s.cleared[i]; d.weapons[i] = i === 0 || !!(s.weapons && s.weapons[i]); d.feathers[i] = (s.feathers && +s.feathers[i]) || 0; }
    d.muted = !!s.muted; return d;
  } catch (e) { return defaultSave(); }
}
let save = loadSave();
function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* ignore */ } }
const mansionOpen = () => save.cleared[0] && save.cleared[1] && save.cleared[2];

// ---------- canvas / layout ----------
const cvs = document.getElementById('game');
const ctx = cvs.getContext('2d');
let VW = 960, scale = 1, offX = 0, offY = 0, dpr = 1, cssW = 0, cssH = 0, portrait = false;
const safe = { t: 0, r: 0, b: 0, l: 0 };
const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || /[?&]touch=1/.test(location.search);
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
  const availH = cssH - safe.t - safe.b, availW = cssW - safe.l - safe.r;
  if (portrait) {
    VW = 720; scale = availW / VW; offX = safe.l;
    offY = safe.t + Math.max(8, Math.min(60, (availH - VH * scale) * 0.08));
  } else {
    VW = Math.max(720, Math.min(1200, VH * (cssW / cssH)));
    scale = Math.min(cssW / VW, cssH / VH);
    offX = (cssW - VW * scale) / 2; offY = (cssH - VH * scale) / 2;
  }
  OY = isTouch && !portrait ? -20 : VH - ROWS * T;
  layoutTouch();
}
const tb = {
  pad: document.getElementById('pad'), S: document.getElementById('bShoot'), J: document.getElementById('bJump'),
  W: document.getElementById('bSwap'), P: document.getElementById('bPause'), wrap: document.getElementById('touch'),
  rot: document.getElementById('rot'), knob: document.getElementById('knob'),
  ar: { U: document.getElementById('aU'), D: document.getElementById('aD'), L: document.getElementById('aL'), R: document.getElementById('aR') }
};
function place(el, x, y, w, h) { el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.width = w + 'px'; el.style.height = (h || w) + 'px'; }
function layoutTouch() {
  const m = 14;
  let ps, bs;
  if (portrait) {
    ps = Math.min(200, Math.max(140, cssW * 0.36)); bs = Math.min(112, Math.max(78, cssW * 0.2));
    const gameBottom = offY + VH * scale;
    const y = Math.max(gameBottom + 64, cssH - safe.b - ps - 24);
    place(tb.pad, safe.l + m, y, ps);
    place(tb.J, cssW - safe.r - m - bs, y + ps * 0.05, bs);
    place(tb.S, cssW - safe.r - m - bs * 2 - 14, y + ps * 0.42, bs);
    place(tb.W, cssW - safe.r - m - bs * 2 - 14, y + ps * 0.42 - 56, bs * 0.9, 42);
    tb.rot.style.top = (gameBottom + 74) + 'px';
  } else {
    ps = Math.min(190, Math.max(128, cssH * 0.32)); bs = Math.min(112, Math.max(70, cssH * 0.17));
    const yb = cssH - safe.b - m;
    place(tb.pad, safe.l + m + 4, yb - ps, ps);
    place(tb.J, cssW - safe.r - m - bs, yb - bs - bs * 0.45, bs);
    place(tb.S, cssW - safe.r - m - bs * 2 - 16, yb - bs, bs);
    place(tb.W, cssW - safe.r - m - bs * 2 - 16 + bs * 0.05, yb - bs - 56, bs * 0.9, 42);
  }
  [tb.S, tb.J].forEach(b => { b.style.fontSize = Math.round(bs * 0.2) + 'px'; });
  tb.W.style.fontSize = '14px';
  for (const k in tb.ar) tb.ar[k].style.fontSize = Math.round(ps * 0.15) + 'px';
  const pz = 52;
  tb.P.style.left = (cssW - safe.r - pz - 12) + 'px'; tb.P.style.top = (portrait ? offY + VH * scale + 8 : safe.t + 10) + 'px';
  tb.P.style.width = pz + 'px'; tb.P.style.height = pz + 'px'; tb.P.style.fontSize = '20px';
}
window.addEventListener('resize', layout);
window.addEventListener('orientationchange', () => setTimeout(layout, 120));

// block page gestures: no double-tap zoom, no pinch, no scroll bounce
['gesturestart', 'gesturechange', 'gestureend', 'dblclick', 'contextmenu', 'selectstart'].forEach(ev =>
  document.addEventListener(ev, e => e.preventDefault(), { passive: false }));
document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
document.addEventListener('touchstart', e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
let lastTouchEnd = 0;
document.addEventListener('touchend', e => { const n = Date.now(); if (n - lastTouchEnd < 350) e.preventDefault(); lastTouchEnd = n; }, { passive: false });
document.addEventListener('wheel', e => e.preventDefault(), { passive: false });

// ---------- audio (created on first input) ----------
let actx = null;
function initAudio() {
  if (actx) { if (actx.state === 'suspended') actx.resume(); return; }
  try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; }
}
function tone(f0, f1, dur, type, vol, delay) {
  if (!actx || save.muted || turbo > 1) return;
  const t = actx.currentTime + (delay || 0);
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type || 'square';
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
  g.gain.setValueAtTime(vol || 0.08, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + dur + 0.02);
}
const sfx = {
  jump: () => tone(320, 640, 0.12, 'square', 0.05),
  shoot: () => tone(880, 440, 0.06, 'square', 0.035),
  pie: () => tone(300, 180, 0.12, 'triangle', 0.07),
  hitE: () => tone(500, 260, 0.06, 'square', 0.05),
  pop: () => { tone(700, 1400, 0.08, 'sine', 0.06); tone(1000, 500, 0.1, 'triangle', 0.04, 0.05); },
  hurt: () => tone(220, 80, 0.3, 'sawtooth', 0.08),
  heal: () => { [660, 880, 1100].forEach((f, i) => tone(f, f, 0.07, 'sine', 0.06, i * 0.06)); },
  feather: () => { tone(880, 1320, 0.08, 'sine', 0.07); tone(1320, 1760, 0.08, 'sine', 0.05, 0.06); },
  warn: () => tone(660, 660, 0.07, 'square', 0.035),
  throw: () => tone(900, 300, 0.12, 'triangle', 0.04),
  flag: () => { tone(523, 523, 0.1, 'square', 0.05); tone(784, 784, 0.16, 'square', 0.05, 0.1); },
  door: () => { tone(120, 90, 0.4, 'sawtooth', 0.06); },
  boss: () => { [196, 262, 330, 392].forEach((f, i) => tone(f, f, 0.16, 'square', 0.05, i * 0.1)); },
  stomp: () => tone(140, 50, 0.35, 'triangle', 0.12),
  win: () => { [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, f, 0.18, 'square', 0.06, i * 0.12)); },
  lose: () => { [392, 330, 262, 196].forEach((f, i) => tone(f, f * 0.98, 0.2, 'triangle', 0.08, i * 0.15)); },
  click: () => tone(600, 800, 0.05, 'square', 0.04),
  swap: () => tone(500, 900, 0.08, 'square', 0.04)
};

// ---------- input ----------
const input = { L: false, R: false, U: false, D: false, jump: false, shoot: false, jumpQ: false, swapQ: false };
const keys = {};
const touch = { L: false, R: false, U: false, D: false, J: false, S: false };
const KJ = ['z', 'Z', ' ', 'Spacebar', 'k', 'K'], KS = ['x', 'X', 'j', 'J'];
window.addEventListener('keydown', e => {
  initAudio();
  const k = e.key;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Spacebar'].includes(k)) e.preventDefault();
  if (keys[k]) return; keys[k] = true;
  if (state === 'play') {
    if (KJ.includes(k)) input.jumpQ = true;
    if (k === 'c' || k === 'C' || k === 'q' || k === 'Q' || k === 'e' || k === 'E') input.swapQ = true;
    if (k >= '1' && k <= '4') pickWeapon(+k - 1);
    if (k === 'p' || k === 'P' || k === 'Escape') setState('pause');
  } else menuKey(k);
  syncKeys();
});
window.addEventListener('keyup', e => { keys[e.key] = false; syncKeys(); });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; for (const k in touch) touch[k] = false; syncKeys(); });
function anyKey(list) { return list.some(k => keys[k]); }
function syncKeys() {
  input.L = anyKey(['ArrowLeft', 'a', 'A']) || touch.L;
  input.R = anyKey(['ArrowRight', 'd', 'D']) || touch.R;
  input.U = anyKey(['ArrowUp', 'w', 'W']) || touch.U;
  input.D = anyKey(['ArrowDown', 's', 'S']) || touch.D;
  input.jump = anyKey(KJ) || touch.J;
  input.shoot = anyKey(KS) || touch.S;
  tb.ar.L.classList.toggle('on', touch.L); tb.ar.R.classList.toggle('on', touch.R);
  tb.ar.U.classList.toggle('on', touch.U); tb.ar.D.classList.toggle('on', touch.D);
}
// on-screen d-pad: one finger, direction from where it sits on the pad (slide your thumb around)
const padPtrs = new Map();
function padUpdate() {
  touch.L = touch.R = touch.U = touch.D = false;
  let kx = 0, ky = 0;
  for (const [, p] of padPtrs) {
    const r = tb.pad.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, rad = r.width / 2;
    const dx = (p.x - cx) / rad, dy = (p.y - cy) / rad;
    if (dx < -0.28) touch.L = true; if (dx > 0.28) touch.R = true;
    if (dy < -0.5) touch.U = true; if (dy > 0.5) touch.D = true;
    const d = Math.hypot(dx, dy), cl = Math.min(1, d) / (d || 1);
    kx = dx * cl * 0.33 * r.width; ky = dy * cl * 0.33 * r.height;
  }
  tb.knob.style.transform = `translate(${kx}px, ${ky}px)`;
  syncKeys();
}
tb.pad.addEventListener('pointerdown', e => {
  e.preventDefault(); initAudio();
  try { tb.pad.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
  padPtrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); padUpdate();
}, { passive: false });
tb.pad.addEventListener('pointermove', e => { if (padPtrs.has(e.pointerId)) { e.preventDefault(); padPtrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); padUpdate(); } }, { passive: false });
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => tb.pad.addEventListener(ev, e => { if (padPtrs.delete(e.pointerId)) padUpdate(); }));
function bindHold(el, id, onDown) {
  const ptrs = new Set();
  el.addEventListener('pointerdown', e => {
    e.preventDefault(); initAudio();
    try { el.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ }
    ptrs.add(e.pointerId); touch[id] = true; el.classList.add('on'); if (onDown) onDown(); syncKeys();
  }, { passive: false });
  const up = e => { if (!ptrs.delete(e.pointerId)) return; if (!ptrs.size) { touch[id] = false; el.classList.remove('on'); } syncKeys(); };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
  el.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
}
[tb.pad].forEach(el => el.addEventListener('touchstart', e => e.preventDefault(), { passive: false }));
bindHold(tb.J, 'J', () => { input.jumpQ = true; });
bindHold(tb.S, 'S');
tb.W.addEventListener('pointerdown', e => { e.preventDefault(); initAudio(); input.swapQ = true; tb.W.classList.add('on'); setTimeout(() => tb.W.classList.remove('on'), 120); }, { passive: false });
tb.P.addEventListener('pointerdown', e => { e.preventDefault(); initAudio(); if (state === 'play') setState('pause'); else if (state === 'pause') setState('play'); }, { passive: false });

let buttons = [];
cvs.addEventListener('pointerdown', e => {
  e.preventDefault(); initAudio();
  const vx = (e.clientX - offX) / scale, vy = (e.clientY - offY) / scale;
  for (const b of buttons) {
    if (vx >= b.x && vx <= b.x + b.w && vy >= b.y && vy <= b.y + b.h) { if (!b.disabled) { sfx.click(); b.action(); } return; }
  }
  if (state === 'title') setState('select');
}, { passive: false });

// ---------- level building (hand-built layouts) ----------
let B = null;
function newMap(cols) { const g = []; for (let r = 0; r < ROWS; r++) g.push(new Uint8Array(cols)); B = { cols, g, ents: [], picks: [], cps: [], movers: [] }; }
function fill(x0, x1, r0, r1, v) { for (let x = x0; x <= x1; x++) for (let r = r0; r <= r1; r++) if (x >= 0 && x < B.cols && r >= 0 && r < ROWS) B.g[r][x] = v; }
function ground(x0, x1, top) { fill(x0, x1, top == null ? 11 : top, ROWS - 1, SOLID); }
function shelf(x, r, w) { fill(x, x + w - 1, r, r, ONE); }
function block(x, r, w, h) { fill(x, x + w - 1, r, r + h - 1, SOLID); }
function ladder(x, r0, r1) { fill(x, x, r0, r1, LAD); }
function hot(x0, x1, r) { fill(x0, x1, r, r, HOT); }
function en(type, x, r, o) { B.ents.push(Object.assign({ type, sx: x * T + T / 2, sy: r * T }, o || {})); }
function pk(type, x, r) { B.picks.push({ type, x: x * T + T / 2, y: r * T + T / 2 }); }
function cp(x, r) { B.cps.push({ x: x * T + T / 2, y: (r == null ? 11 : r) * T }); }
function mover(x0, x1, r, w, speed) { B.movers.push({ ax: x0 * T, bx: (x1 - w + 1) * T, y: r * T, w: w * T, speed, x: x0 * T, dir: 1, dx: 0, wait: 0 }); }
function bossRoom(x0) { ground(x0, x0 + 17); fill(x0 + 17, x0 + 17, 0, 10, SOLID); B.door = x0; cp(x0 - 2, 11); B.roomX = x0 * T; B.roomW = 18 * T; }

const BUILD = [
  function kitchen() {
    newMap(160);
    ground(0, 20); shelf(5, 8, 3); pk('feather', 6, 7); en('pin', 15, 11);
    ground(23, 27); ground(28, 31, 10); ground(32, 35, 9); en('pea', 33, 9); pk('corn', 34, 8); ground(36, 40, 10);
    ground(44, 62); shelf(47, 8, 3); pk('feather', 48, 7); hot(51, 52, 11); en('chef', 58, 11);
    cp(61);
    ground(63, 101); ladder(72, 5, 10); block(73, 5, 4, 6); pk('pie', 75, 4); shelf(79, 7, 3); pk('feather', 80, 6);
    en('lid', 86, 8); en('toast', 91, 11); en('pea', 97, 11);
    mover(102, 108, 11, 3, 70); pk('feather', 105, 8);
    ground(109, 129); cp(111); en('pin', 115, 11); en('pea', 120, 11); pk('corn', 123, 10); en('chef', 127, 11);
    ground(132, 141); shelf(134, 8, 3); pk('feather', 135, 7);
    bossRoom(142);
  },
  function house() {
    newMap(184);
    ground(0, 16); en('pea', 11, 11); shelf(5, 8, 2); pk('feather', 6, 7);
    ground(17, 19, 10); ground(20, 22, 9); ground(23, 30, 8); en('pin', 27, 8);
    ground(34, 48); shelf(37, 7, 3); pk('feather', 38, 6); en('chef', 45, 11); en('lid', 47, 7);
    ground(49, 100); cp(51); en('pin', 56, 11); en('toast', 61, 11);
    ladder(65, 4, 10); block(66, 4, 14, 7); pk('corn', 68, 3); en('pea', 72, 4); pk('feather', 74, 2); en('chef', 78, 4);
    en('lid', 87, 8); en('pin', 92, 11); pk('pie', 96, 10);
    mover(101, 107, 11, 3, 75);
    ground(108, 124); cp(110); en('pea', 115, 11); en('pea', 118, 11); en('toast', 122, 11);
    mover(125, 131, 11, 3, 85); pk('feather', 128, 8);
    ground(132, 165); en('chef', 140, 11); shelf(144, 8, 4); pk('feather', 145, 7); pk('corn', 150, 10); en('lid', 156, 8); en('pin', 160, 11);
    bossRoom(166);
  },
  function yard() {
    newMap(174);
    ground(0, 30); en('pea', 9, 11); block(15, 9, 2, 2); en('pin', 20, 11); block(24, 8, 3, 3); pk('feather', 25, 7);
    ground(34, 52); en('lid', 40, 8); en('toast', 46, 11); en('pea', 50, 11);
    ground(55, 72); cp(57); shelf(60, 8, 3); shelf(64, 6, 3); pk('feather', 65, 5); en('chef', 70, 11);
    ground(73, 100); ladder(74, 5, 10); block(75, 5, 5, 6); en('pea', 78, 5); pk('corn', 77, 4); pk('feather', 79, 4);
    en('pin', 86, 11); en('lid', 91, 8); hot(95, 96, 11);
    mover(101, 107, 11, 3, 80);
    ground(108, 140); cp(110); en('pea', 114, 11); en('chef', 120, 11); block(124, 9, 2, 2); pk('pie', 125, 8); en('toast', 130, 11); en('pin', 135, 11);
    ground(144, 155); en('lid', 150, 8); pk('feather', 152, 10);
    bossRoom(156);
  },
  function mansion() {
    newMap(190);
    ground(0, 18); en('pin', 12, 11); shelf(5, 8, 3); pk('feather', 6, 7);
    ground(19, 21, 10); ground(22, 24, 9); ground(25, 40, 8); en('chef', 32, 8); en('lid', 39, 5);
    ground(44, 60); en('pea', 48, 11); en('pea', 51, 11); en('toast', 56, 11); pk('corn', 58, 10);
    ground(61, 104); cp(62); ladder(66, 4, 10); block(67, 4, 12, 7); pk('feather', 72, 3); en('chef', 76, 4);
    en('pin', 84, 11); en('lid', 90, 8); hot(93, 94, 11); en('pea', 97, 11); pk('pie', 100, 10);
    mover(105, 111, 11, 3, 80);
    ground(112, 130); cp(114); en('chef', 122, 11); en('toast', 127, 11);
    mover(131, 138, 11, 3, 90); pk('feather', 134, 8);
    ground(139, 171); en('pin', 144, 11); shelf(148, 8, 3); pk('feather', 149, 7); en('lid', 154, 8); en('pea', 158, 11); en('chef', 164, 11); pk('corn', 167, 10);
    bossRoom(172);
  }
];

// ---------- game state ----------
let state = 'title', stateT = 0, time = 0, turbo = 1;
let stageIdx = 0, ST = null, M = null, P = null, camX = 0;
let ents = [], shots = [], eshots = [], picks = [], parts = [], movers = [], cps = [];
let boss = null, bossPhase = 'none', gateClosed = false, banner = { text: '', sub: '', t: 0 }, shake = 0;
let feathersGot = 0, feathersTotal = 0, tries = 0, stageTime = 0, selIdx = 0, pauseSel = 0, curW = 0, lastClear = null;
const stats = { hits: 0, deaths: 0, falls: 0, shotsFired: 0, enemiesBeaten: 0, cpRespawns: 0 };

// ---------- tile physics ----------
function tileAt(c, r) { if (r < 0 || r >= ROWS) return E; if (c < 0 || c >= M.cols) return SOLID; return M.g[r][c]; }
const isSolid = t => t === SOLID || t === HOT;
function solidPt(x, y) { return isSolid(tileAt(Math.floor(x / T), Math.floor(y / T))); }
function colHit(x, y0, y1) { const c = Math.floor(x / T); for (let r = Math.floor(y0 / T); r <= Math.floor(y1 / T); r++) if (isSolid(tileAt(c, r))) return true; return false; }
function rowHit(y, x0, x1) { const r = Math.floor(y / T); for (let c = Math.floor(x0 / T); c <= Math.floor(x1 / T); c++) if (isSolid(tileAt(c, r))) return true; return false; }
function moveBody(b, dt, oneWay) {
  b.hitWall = 0;
  if (b.vx) {
    b.x += b.vx * dt;
    if (b.vx > 0) { const rx = b.x + b.w; if (colHit(rx, b.y + 1, b.y + b.h - 1)) { b.x = Math.floor(rx / T) * T - b.w - 0.001; b.hitWall = 1; } }
    else if (colHit(b.x, b.y + 1, b.y + b.h - 1)) { b.x = (Math.floor(b.x / T) + 1) * T; b.hitWall = -1; }
  }
  const prevB = b.y + b.h;
  b.y += b.vy * dt; b.onGround = false; b.gTile = E; b.onMover = null;
  if (b.vy >= 0) {
    const bot = b.y + b.h, r = Math.floor(bot / T);
    const c0 = Math.floor((b.x + 1) / T), c1 = Math.floor((b.x + b.w - 1) / T);
    let land = false, gt = E;
    for (let c = c0; c <= c1; c++) {
      const t = tileAt(c, r);
      if (isSolid(t)) { land = true; if (t === HOT) gt = HOT; else if (gt === E) gt = SOLID; }
      else if (oneWay && (t === ONE || (t === LAD && tileAt(c, r - 1) !== LAD)) && prevB <= r * T + 1) { land = true; if (gt === E) gt = ONE; }
    }
    if (land) { b.y = r * T - b.h; b.vy = 0; b.onGround = true; b.gTile = gt; }
    else if (oneWay) {
      for (const m of movers) {
        if (b.x + b.w > m.x + 2 && b.x < m.x + m.w - 2 && prevB <= m.y + 1 && bot >= m.y) { b.y = m.y - b.h; b.vy = 0; b.onGround = true; b.onMover = m; break; }
      }
    }
  } else if (rowHit(b.y, b.x + 1, b.x + b.w - 1)) { b.y = (Math.floor(b.y / T) + 1) * T; b.vy = 0; }
}
const cxOf = b => b.x + b.w / 2;
function overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
function circRect(s, b) { const nx = Math.max(b.x, Math.min(s.x, b.x + b.w)), ny = Math.max(b.y, Math.min(s.y, b.y + b.h)); return (s.x - nx) ** 2 + (s.y - ny) ** 2 <= s.r * s.r; }
function pbox() { return { x: P.x + 3, y: P.y + 6, w: P.w - 6, h: P.h - 8 }; }
function ladderAt(c, y0, y1) { for (let r = Math.floor(y0 / T); r <= Math.floor(y1 / T); r++) if (tileAt(c, r) === LAD) return true; return false; }
function ladderTopY(c, r) { while (tileAt(c, r - 1) === LAD) r--; return r * T; }

// ---------- stage start / respawn ----------
const EDEF = {
  pin: { w: 40, h: 28, hp: 2, dmg: 2 }, pea: { w: 26, h: 26, hp: 1, dmg: 1 }, lid: { w: 34, h: 24, hp: 1, dmg: 2 },
  toast: { w: 44, h: 34, hp: 3, dmg: 2 }, chef: { w: 30, h: 74, hp: 4, dmg: 2 }, pip: { w: 30, h: 50, hp: 2, dmg: 2 }
};
function makeEnt(d) {
  const s = EDEF[d.type];
  return { type: d.type, x: d.sx - s.w / 2, y: d.sy - s.h, by: d.sy - s.h, w: s.w, h: s.h, hp: s.hp, dmg: s.dmg, vx: 0, vy: 0,
    dir: -1, face: -1, t: Math.random() * 0.8, st: 'idle', active: false, dead: false, flash: 0, onGround: false };
}
function startStage(i) {
  stageIdx = i; ST = STAGES[i]; BUILD[i](); M = B;
  movers = M.movers; cps = M.cps.slice().sort((a, b) => a.x - b.x).map(c => Object.assign({ on: false }, c));
  picks = M.picks.map(p => Object.assign({ got: false, ph: Math.random() * 6 }, p));
  feathersTotal = picks.filter(p => p.type === 'feather').length; feathersGot = 0;
  tries = 0; stageTime = 0; curW = 0; lastClear = null;
  for (const k in stats) stats[k] = 0;
  P = { x: 2 * T, y: 11 * T - 50, w: 30, h: 50, vx: 0, vy: 0, face: 1, onGround: false, climb: false, hp: MAXHP, inv: 0, hurtT: 0, kb: 0,
    coy: 0, jbuf: 0, cd: 0, shootT: 0, cpIdx: -1, safeX: 2 * T, safeY: 11 * T - 50, dead: false, deadT: 0, anim: 0, jumpHeldT: 0 };
  respawn(true);
  banner = { text: 'READY!', sub: ST.name, t: 1.6 };
  setState('play');
}
function respawn(first) {
  // reopen the boss gate and reset enemies, boss, and shots. Pickups already taken stay taken.
  for (let r = 0; r <= 10; r++) M.g[r][M.door] = E;
  gateClosed = false; boss = null; bossPhase = 'none';
  ents = M.ents.map(makeEnt); shots = []; eshots = []; parts = [];
  for (const m of movers) { m.x = m.ax; m.dir = 1; m.dx = 0; m.wait = 0.4; }
  const c = P.cpIdx >= 0 ? cps[P.cpIdx] : null;
  P.x = c ? c.x - P.w / 2 : 2 * T; P.y = (c ? c.y : 11 * T) - P.h;
  P.vx = P.vy = 0; P.hp = MAXHP; P.inv = first ? 0 : 1.2; P.dead = false; P.deadT = 0; P.climb = false; P.face = 1; P.hurtT = 0;
  P.safeX = P.x; P.safeY = P.y;
  camX = Math.max(0, P.x - VW * 0.42);
  if (!first) { tries++; stats.cpRespawns++; banner = { text: 'Try again!', sub: c ? 'Back at the flag' : '', t: 1.2 }; }
}

// ---------- weapons ----------
function pickWeapon(i) { if (save.weapons[i] && i !== curW) { curW = i; sfx.swap(); popText(WEAPONS[i].name, P.x + 15, P.y - 30, WEAPONS[i].col); } }
function nextWeapon() { for (let k = 1; k <= 4; k++) { const i = (curW + k) % 4; if (save.weapons[i]) { pickWeapon(i); return; } } }
function fire() {
  const w = WEAPONS[curW];
  if (P.cd > 0 || shots.filter(s => s.wi === curW).length >= w.max) return;
  const cx = P.x + P.w / 2 + P.face * 18, cy = P.y + P.h - 26, f = P.face;
  if (curW === 0) shots.push({ wi: 0, x: cx, y: cy, vx: f * 540, vy: 0, g: 0, r: 7, dmg: 1, life: 1.2 });
  else if (curW === 1) for (const a of [-0.24, 0, 0.24]) shots.push({ wi: 1, x: cx, y: cy, vx: f * Math.cos(a) * 480, vy: Math.sin(a) * 480, g: 0, r: 6, dmg: 1, life: 0.85 });
  else if (curW === 2) shots.push({ wi: 2, x: cx, y: cy - 6, vx: f * 330, vy: -430, g: 1300, r: 12, dmg: 3, life: 2 });
  else shots.push({ wi: 3, x: cx, y: cy, vx: f * 300, vy: -120, g: 1500, r: 8, dmg: 2, life: 2.2 });
  P.cd = w.cd; P.shootT = 0.16; stats.shotsFired++;
  if (curW === 2) sfx.pie(); else sfx.shoot();
}

// ---------- particles ----------
const LEAF_COLS = ['#d9531e', '#e8892b', '#f2b134', '#b8361f', '#a8571c'];
function popText(s, x, y, col) { parts.push({ k: 'text', s, x, y, vy: -40, t: 1.1, col: col || '#fff3dc' }); }
function burst(x, y, n, cols, spd) {
  for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = (spd || 200) * (0.4 + Math.random() * 0.8);
    parts.push({ k: 'bit', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, t: 0.5 + Math.random() * 0.5, c: cols[i % cols.length], s: 3 + Math.random() * 4, r: Math.random() * 6 }); }
}
function featherBurst(x, y, n) {
  for (let i = 0; i < n; i++) parts.push({ k: 'feather', x, y, vx: (Math.random() - 0.5) * 420, vy: -200 - Math.random() * 300, t: 1.4 + Math.random(), c: LEAF_COLS[i % 5], s: 7 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - 0.5) * 6 });
}
function updateParts(dt) {
  for (const p of parts) {
    p.t -= dt;
    if (p.k === 'text') p.y += p.vy * dt;
    else if (p.k === 'bit') { p.vy += 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += dt * 8; }
    else if (p.k === 'feather') { p.vy += 500 * dt; p.vx *= 0.98; p.x += p.vx * dt; p.y += Math.min(p.vy, 110) * dt; p.r += p.vr * dt; }
  }
  parts = parts.filter(p => p.t > 0);
  if (parts.length > 400) parts.splice(0, parts.length - 400);
}

// ---------- player ----------
function hurt(d, sx) {
  if (P.inv > 0 || P.dead || bossPhase === 'dead') return;
  stats.hits++;
  if (TE.invincible) { P.inv = 0.6; popText('blocked', P.x + 15, P.y - 10, '#bde0ff'); return; }
  P.hp = Math.max(0, P.hp - d); P.inv = INV_T; P.hurtT = 0.22; P.kb = (P.x + P.w / 2 < sx ? -1 : 1) * 170; P.vy = -280; P.climb = false;
  shake = 0.25; sfx.hurt(); burst(P.x + 15, P.y + 20, 8, ['#d9531e', '#f2b134', '#8b4a24'], 180);
  if (P.hp <= 0) die();
}
function die() { P.dead = true; P.deadT = 1.1; stats.deaths++; featherBurst(P.x + 15, P.y + 20, 18); sfx.lose(); }
function updatePlayer(dt) {
  const p = P;
  if (p.dead) { p.deadT -= dt; if (p.deadT <= 0) setState('lose'); return; }
  p.inv = Math.max(0, p.inv - dt); p.cd = Math.max(0, p.cd - dt); p.shootT = Math.max(0, p.shootT - dt); p.hurtT = Math.max(0, p.hurtT - dt);
  if (input.jumpQ) { p.jbuf = 0.13; input.jumpQ = false; } else p.jbuf = Math.max(0, p.jbuf - dt);
  if (input.swapQ) { input.swapQ = false; nextWeapon(); }
  const locked = bossPhase === 'intro' || bossPhase === 'dead' || banner.lock;
  const L = !locked && input.L, R = !locked && input.R, U = !locked && input.U, D = !locked && input.D;
  const col = Math.floor((p.x + p.w / 2) / T);
  if (p.climb) {
    if (L) p.face = -1; if (R) p.face = 1;
    p.vx = 0; p.vy = U ? -CLIMB : (D ? CLIMB : 0);
    if (p.shootT > 0) p.vy = 0;
    p.x = col * T + T / 2 - p.w / 2;
    p.y += p.vy * dt;
    p.anim += Math.abs(p.vy) * dt * 0.05;
    const feetR = Math.floor((p.y + p.h - 1) / T);
    if (!ladderAt(col, p.y + 4, p.y + p.h - 1)) {
      // walked off the top: stand on the ladder top
      const r = Math.floor((p.y + p.h) / T);
      if (tileAt(col, r) === LAD) { p.y = ladderTopY(col, r) - p.h; p.onGround = true; }
      p.climb = false; p.vy = 0;
    } else if (U && tileAt(col, feetR) === LAD && tileAt(col, feetR - 1) !== LAD && p.y + p.h <= ladderTopY(col, feetR) + 6) {
      p.y = ladderTopY(col, feetR) - p.h; p.climb = false; p.vy = 0; p.onGround = true;
    } else if (D && solidPt(p.x + p.w / 2, p.y + p.h + 1)) { p.climb = false; }
    if (p.jbuf > 0 && p.climb) { p.climb = false; p.jbuf = 0; p.vy = 0; }
  } else {
    if (p.hurtT > 0) p.vx = p.kb;
    else { p.vx = (R ? WALK : 0) - (L ? WALK : 0); if (R && !L) p.face = 1; else if (L && !R) p.face = -1; }
    if (p.onGround) p.coy = 0.09; else p.coy = Math.max(0, p.coy - dt);
    if (p.jbuf > 0 && p.coy > 0 && p.hurtT <= 0 && !locked) { p.vy = JUMP_V; p.jbuf = 0; p.coy = 0; p.onGround = false; TE.jumps++; sfx.jump(); }
    if (!input.jump && p.vy < JUMP_CUT) p.vy = JUMP_CUT;
    p.vy = Math.min(MAXFALL, p.vy + GRAV * dt);
    // grab a ladder
    if (U && ladderAt(col, p.y + 6, p.y + p.h - 2) && Math.abs(p.x + p.w / 2 - (col * T + T / 2)) < 18) { p.climb = true; p.vy = 0; }
    else if (D && p.onGround && tileAt(col, Math.floor((p.y + p.h + 2) / T)) === LAD) { p.climb = true; p.y += 6; p.vy = 0; }
    if (!p.climb) {
      if (p.onMover) { p.x += p.onMover.dx; }
      moveBody(p, dt, true);
      if (p.onGround && p.vx) p.anim += dt * 12; else if (p.onGround) p.anim = 0;
    }
  }
  if (p.y < -60) p.y = -60;
  if (!locked && input.shoot) fire();
  // hot stove tiles
  if (p.onGround && p.gTile === HOT) { hurt(2, p.x + p.w / 2 - p.face * 20); if (!p.dead) { p.vy = -520; p.onGround = false; } }
  // safe ground for pit recovery
  if (p.onGround && !p.onMover && p.gTile === SOLID && solidPt(p.x + 1, p.y + p.h + 2) && solidPt(p.x + p.w - 1, p.y + p.h + 2) && !solidPt(p.x + p.w / 2, p.y + p.h - 2)) { p.safeX = p.x; p.safeY = p.y; }
  // fell in a pit: costs 3 health, pops back to the last safe ground
  if (p.y > ROWS * T + 60) {
    stats.falls++;
    if (TE.invincible) { p.x = p.safeX; p.y = p.safeY; p.vy = 0; p.inv = 1; }
    else { p.hp = Math.max(0, p.hp - 3); sfx.hurt(); if (p.hp <= 0) { p.y = ROWS * T; die(); } else { p.x = p.safeX; p.y = p.safeY; p.vx = p.vy = 0; p.inv = INV_T; popText('Oops! -3', p.x + 15, p.y - 20, '#ffd2a0'); } }
  }
  // pickups
  const pb = { x: p.x, y: p.y, w: p.w, h: p.h };
  for (const k of picks) {
    if (k.got) continue;
    if (Math.abs(k.x - (p.x + p.w / 2)) < 30 && k.y > p.y - 14 && k.y < p.y + p.h + 14) {
      k.got = true;
      if (k.type === 'feather') { feathersGot++; sfx.feather(); popText('Golden feather!', k.x, k.y - 20, '#ffe27a'); burst(k.x, k.y, 10, ['#ffe27a', '#fff1a8'], 160); }
      else { const h = k.type === 'pie' ? 6 : 2; p.hp = Math.min(MAXHP, p.hp + h); sfx.heal(); popText('+' + h + ' health', k.x, k.y - 20, '#bff59a'); }
    }
  }
  // checkpoints
  cps.forEach((c, i) => { if (i > p.cpIdx && p.x + p.w / 2 > c.x - 10) { p.cpIdx = i; c.on = true; sfx.flag(); if (i < cps.length - 1) popText('Checkpoint!', c.x, c.y - 110, '#fff3dc'); } });
  // boss gate
  if (!gateClosed && M.roomX && p.x > M.roomX + T * 1.3) {
    gateClosed = true; for (let r = 0; r <= 10; r++) M.g[r][M.door] = SOLID;
    boss = makeBoss(); bossPhase = 'intro'; boss.t = 0; sfx.door(); setTimeout(() => sfx.boss(), 300);
    eshots = []; ents.forEach(e => { if (e.x > M.roomX - VW) e.dead = true; });
  }
  void pb;
}

// ---------- enemies ----------
const onScreen = (x, w, pad) => x + w > camX - (pad || 0) && x < camX + VW + (pad || 0);
function knife(x, y, dir, spd) { eshots.push({ k: 'knife', x: x - 18, y: y - 6, w: 36, h: 12, vx: dir * spd, vy: 0, g: 0, hp: 1, dmg: 2, life: 5 }); sfx.throw(); TE.throws++; }
function updateEnts(dt) {
  const pcx = P.x + P.w / 2;
  for (const e of ents) {
    if (e.dead) continue;
    if (!e.active) { if (onScreen(e.x, e.w, 40)) e.active = true; else continue; }
    e.flash = Math.max(0, e.flash - dt); e.t += dt;
    const ecx = e.x + e.w / 2, dx = pcx - ecx;
    if (e.type === 'pin') {
      if (!onScreen(e.x, e.w, 200)) continue;
      e.vx = e.dir * 85; e.vy = Math.min(MAXFALL, e.vy + GRAV * dt); moveBody(e, dt, true);
      const fx = e.dir > 0 ? e.x + e.w + 2 : e.x - 2;
      if (e.hitWall || (e.onGround && !solidPt(fx, e.y + e.h + 4) && tileAt(Math.floor(fx / T), Math.floor((e.y + e.h + 4) / T)) !== ONE)) e.dir *= -1;
    } else if (e.type === 'pea') {
      if (!onScreen(e.x, e.w, 200)) continue;
      e.vy = Math.min(MAXFALL, e.vy + GRAV * dt);
      if (e.onGround) { e.vx = 0; if (e.t > 1.3) { e.vy = -520; e.vx = Math.sign(dx || 1) * 105; e.t = 0; } }
      moveBody(e, dt, true);
      if (e.y > ROWS * T + 40) e.dead = true;
    } else if (e.type === 'lid') {
      if (!e.go) { e.go = true; e.dir = dx < 0 ? -1 : 1; e.t = 0; }
      e.x += e.dir * 100 * dt; e.y = e.by + Math.sin(e.t * 3) * 34;
      if (!onScreen(e.x, e.w, 260)) e.dead = true;
    } else if (e.type === 'toast') {
      if (!onScreen(e.x, e.w, 0)) { e.t = Math.min(e.t, 1.2); continue; }
      e.st = e.t > 2.0 ? 'rattle' : 'idle';
      if (e.t > 2.7) {
        if (Math.abs(dx) < 460) {
          const vx = Math.max(-240, Math.min(240, dx / 1.0));
          eshots.push({ k: 'toast', x: ecx - 12, y: e.y - 10, w: 24, h: 20, vx, vy: -600, g: 1200, hp: 1, dmg: 2, life: 3 }); sfx.throw();
          e.t = 0;
        } else e.t = 2.0;
      }
    } else if (e.type === 'chef') {
      e.face = dx < 0 ? -1 : 1;
      const near = Math.abs(dx) < 600 && onScreen(e.x, e.w, 0) && Math.abs((P.y + P.h) - (e.y + e.h)) < 200;
      if (e.st === 'idle') { if (!near) e.t = Math.min(e.t, 1.4); if (e.t > 2.3) { e.st = 'wind'; e.t = 0; sfx.warn(); } }
      else if (e.st === 'wind') { if (e.t > 0.9) { knife(ecx + e.face * 20, e.y + e.h - 26, e.face, 205); e.st = 'rest'; e.t = 0; } }
      else if (e.st === 'rest' && e.t > 0.4) { e.st = 'idle'; e.t = 0; }
    } else if (e.type === 'pip') {
      if (e.st === 'ready') { if (e.t > 0.75) { e.st = 'run'; e.t = 0; } }
      else { e.x += e.dir * 235 * dt; if (e.x < M.roomX + T - 10 || e.x + e.w > M.roomX + 17 * T + 10) e.dead = true; }
    }
    if (!P.dead && e.st !== 'ready' && overlap(e, pbox())) hurt(e.dmg, ecx);
  }
  ents = ents.filter(e => !(e.dead && e.type === 'pip'));
}
function updateEshots(dt) {
  for (const s of eshots) {
    s.life -= dt;
    if (s.k === 'cleaver' && s.stuck) { s.stuck -= dt; if (s.stuck <= 0) s.life = 0; continue; }
    s.vy += (s.g || 0) * dt; s.x += s.vx * dt; s.y += s.vy * dt;
    if (s.k === 'knife') { const fx = s.vx > 0 ? s.x + s.w : s.x; if (solidPt(fx, s.y + s.h / 2)) { s.life = 0; burst(fx, s.y + 6, 5, ['#dde2e8', '#8f99a3'], 120); } }
    else if (s.k === 'toast') { if (solidPt(s.x + s.w / 2, s.y + s.h) || solidPt(s.vx > 0 ? s.x + s.w : s.x, s.y + s.h / 2)) { s.life = 0; burst(s.x + 12, s.y + 10, 6, ['#d9a35a', '#8a5a2a'], 120); } }
    else if (s.k === 'potato') {
      if (s.vy > 0 && solidPt(s.x + s.w / 2, s.y + s.h)) { s.y = Math.floor((s.y + s.h) / T) * T - s.h; s.vy = -400; }
      if (solidPt(s.vx > 0 ? s.x + s.w : s.x, s.y + s.h / 2)) s.life = 0;
    } else if (s.k === 'cleaver') {
      s.rot = (s.rot || 0) + dt * 12;
      if (s.vy > 0 && s.y + s.h >= s.ly) { s.y = s.ly - s.h; s.stuck = 0.6; s.rot = 0.4; sfx.warn(); burst(s.x + 15, s.ly, 5, ['#cfd5dc', '#e8c99a'], 100); }
    } else if (s.k === 'shock') { if (solidPt(s.vx > 0 ? s.x + s.w : s.x, s.y + s.h / 2)) s.life = 0; }
    if (s.life > 0 && !P.dead && !(s.k === 'cleaver' && s.stuck) && overlap(s, pbox())) { hurt(s.dmg, s.x + s.w / 2); if (s.k !== 'shock') s.life = 0; }
  }
  eshots = eshots.filter(s => s.life > 0);
}
function updateShots(dt) {
  for (const s of shots) {
    s.life -= dt; s.vy += s.g * dt; s.x += s.vx * dt; s.y += s.vy * dt;
    if (s.wi === 3) {
      if (s.vy > 0 && solidPt(s.x, s.y + s.r)) { s.y = Math.floor((s.y + s.r) / T) * T - s.r; s.vy = -420; }
      if (solidPt(s.x + Math.sign(s.vx) * s.r, s.y)) s.life = 0;
    } else if (solidPt(s.x, s.y)) { s.life = 0; burst(s.x, s.y, 4, [WEAPONS[s.wi].col], 90); }
    if (s.x < camX - 40 || s.x > camX + VW + 40) s.life = 0;
    if (s.life <= 0) continue;
    for (const e of eshots) {
      if (e.hp && e.life > 0 && circRect(s, e)) { e.life = 0; s.life = s.wi === 2 ? s.life : 0; burst(e.x + e.w / 2, e.y + e.h / 2, 6, ['#dde2e8', '#fff3dc'], 140); popText('Blocked!', e.x, e.y - 10, '#bde0ff'); sfx.hitE(); break; }
    }
    if (s.life <= 0) continue;
    for (const e of ents) {
      if (e.dead || !e.active || e.st === 'ready' || !circRect(s, e)) continue;
      e.hp -= s.dmg; e.flash = 0.12; s.life = 0; sfx.hitE();
      if (e.hp <= 0) { e.dead = true; stats.enemiesBeaten++; sfx.pop(); burst(e.x + e.w / 2, e.y + e.h / 2, 12, enemyCols(e.type), 220); }
      break;
    }
    if (s.life > 0 && boss && bossPhase === 'fight' && circRect(s, boss)) {
      const weak = s.wi === ST.weak, d = weak ? s.dmg * 2 : s.dmg;
      boss.hp = Math.max(0, boss.hp - d); boss.flash = 0.12; s.life = 0; sfx.hitE();
      if (weak && time - (boss.weakT || 0) > 0.8) { boss.weakT = time; popText('WEAK SPOT!', boss.x + boss.w / 2, boss.y - 20, '#ffe27a'); }
      if (boss.hp <= 0) bossDefeated();
    }
  }
  shots = shots.filter(s => s.life > 0);
}
function enemyCols(t) { return { pin: ['#d9a35a', '#a8743a'], pea: ['#6bbf3a', '#3f8f22'], lid: ['#b8c0c8', '#7c858e'], toast: ['#c0c6cc', '#d9a35a'], chef: ['#ffffff', '#f1c27d'], pip: ['#ffffff', '#f1c27d'] }[t] || ['#fff']; }
function updateMovers(dt) {
  for (const m of movers) {
    m.dx = 0;
    if (m.wait > 0) { m.wait -= dt; continue; }
    let nx = m.x + m.dir * m.speed * dt;
    if (nx >= m.bx) { nx = m.bx; m.dir = -1; m.wait = 0.7; } else if (nx <= m.ax) { nx = m.ax; m.dir = 1; m.wait = 0.7; }
    m.dx = nx - m.x; m.x = nx;
  }
}

// ---------- bosses ----------
const FLOOR = 11 * T;
function makeBoss() {
  const s = ST, b = { name: s.boss, x: M.roomX + 13 * T, y: 0, w: 50, h: 118, vx: 0, vy: 0, face: -1, hp: s.bhp, max: s.bhp,
    st: 'idle', t: 0, n: 0, flash: 0, onGround: true, scarf: s.scarf, hat: s.hat, say: '', sayT: 0, fill: 0, scale: 0.85, land: null };
  if (stageIdx === 2) { b.w = 58; b.h = 108; b.scale = 0.8; }
  if (stageIdx === 3) { b.h = 128; b.scale = 0.9; }
  b.y = FLOOR - b.h;
  return b;
}
function bossSay(s) { boss.say = s; boss.sayT = 1.4; }
function lobCleaver(tx) {
  const b = boss, sx = b.x + b.w / 2 + b.face * 20, sy = b.y + 10, g = 1000, tt = 1.15;
  tx = Math.max(M.roomX + T + 20, Math.min(M.roomX + 17 * T - 20, tx));
  const ly = FLOOR, vy = (ly - 30 - sy - 0.5 * g * tt * tt) / tt;
  eshots.push({ k: 'cleaver', x: sx - 15, y: sy, w: 30, h: 30, vx: (tx - sx) / tt, vy, g, ly, tx, hp: 0, dmg: 2, life: 4 }); sfx.throw(); TE.throws++;
}
function bossJumpTo(tx, vy) { const b = boss, ft = 2 * -vy / GRAV; b.vy = vy; b.vx = (tx - (b.x + b.w / 2)) / ft; b.land = tx; b.onGround = false; }
function updateBoss(dt) {
  const b = boss; if (!b) return;
  b.flash = Math.max(0, b.flash - dt); b.sayT = Math.max(0, b.sayT - dt);
  if (bossPhase === 'intro') { b.t += dt; b.fill = Math.min(1, b.t / 1.4); if (b.t > 1.7) { bossPhase = 'fight'; b.t = 0; bossSay(['Back in the pot, bird!', 'Dinner, come here!', 'Time for the grill!', 'Pip! Catch that turkey!'][stageIdx]); } return; }
  if (bossPhase === 'dead') { b.t += dt; if (b.t > 2.4) clearStage(); return; }
  if (P.dead) return;
  b.t += dt;
  const pcx = P.x + P.w / 2, bcx = b.x + b.w / 2, half = b.hp <= b.max / 2;
  if (b.onGround && b.st !== 'jump' && b.st !== 'hop' && b.st !== 'leap') b.face = pcx < bcx ? -1 : 1;
  const k = stageIdx;
  const rest = half ? 0.75 : 1.05;
  if (k === 0) { // Chef Gus: one slow knife at a time, a short hop every third move
    if (b.st === 'idle' && b.t > rest) { b.n++; b.t = 0; b.st = b.n % 3 === 0 ? 'crouch' : 'wind'; if (b.st === 'wind') sfx.warn(); }
    else if (b.st === 'wind' && b.t > 1.0) { knife(bcx + b.face * 34, FLOOR - 26, b.face, half ? 230 : 200); b.t = 0; b.st = half && !b.two ? 'wind' : 'idle'; b.two = b.st === 'wind'; if (b.st === 'wind') b.t = 0.35; }
    else if (b.st === 'crouch' && b.t > 0.55) { const side = pcx < bcx ? 1 : -1; bossJumpTo(pcx + side * 150, -700); b.st = 'hop'; b.t = 0; }
  } else if (k === 1) { // Chef Marie: cleaver lobs with a red target, 3 knife bursts, jumps across
    const pat = ['lob', 'burst', 'lob', 'jump'];
    if (b.st === 'idle' && b.t > rest) { b.st = pat[b.n % 4]; b.n++; b.t = 0; if (b.st !== 'jump') { b.st += 'W'; sfx.warn(); } }
    else if (b.st === 'lobW' && b.t > 0.9) { lobCleaver(pcx); if (half) lobCleaver(pcx + (Math.random() < 0.5 ? -1 : 1) * 150); b.st = 'idle'; b.t = 0; }
    else if (b.st === 'burstW' && b.t > 0.8) { b.st = 'burst'; b.t = 0; b.cnt = 0; }
    else if (b.st === 'burst' && b.t > 0.55) { knife(bcx + b.face * 34, FLOOR - 26, b.face, 195); b.t = 0; if (++b.cnt >= 3) b.st = 'idle'; }
    else if (b.st === 'jump') { const tx = bcx < M.roomX + 9 * T ? M.roomX + 13.5 * T : M.roomX + 3.5 * T; bossJumpTo(tx, -820); b.st = 'hop'; b.t = 0; }
  } else if (k === 2) { // Grill Master Hank: bouncing hot potatoes, then a stomp that sends ground waves
    if (b.st === 'idle' && b.t > rest + 0.1) { b.n++; b.t = 0; b.st = b.n % 2 ? 'wind' : 'crouch'; sfx.warn(); }
    else if (b.st === 'wind' && b.t > 0.8) {
      for (const sp of half ? [130, 200, 270] : [150, 230]) eshots.push({ k: 'potato', x: bcx - 11, y: b.y + 30, w: 22, h: 20, vx: b.face * sp, vy: -350, g: 1300, hp: 1, dmg: 2, life: 4.5 });
      sfx.throw(); TE.throws++; b.st = 'idle'; b.t = 0;
    } else if (b.st === 'crouch' && b.t > 0.7) { bossJumpTo(Math.max(M.roomX + 2.5 * T, Math.min(M.roomX + 15.5 * T, pcx)), -900); b.st = 'leap'; b.t = 0; }
  } else { // Head Chef Bram: double cleavers, knife pairs, and sends Pip running in phase two
    const pat = half ? ['lob', 'burst', 'pip', 'lob', 'jump', 'pip'] : ['lob', 'burst', 'lob', 'jump'];
    if (b.st === 'idle' && b.t > rest) { b.st = pat[b.n % pat.length]; b.n++; b.t = 0; if (b.st === 'lob' || b.st === 'burst') { b.st += 'W'; sfx.warn(); } }
    else if (b.st === 'lobW' && b.t > 0.9) { lobCleaver(pcx); lobCleaver(pcx + (pcx < M.roomX + 9 * T ? 1 : -1) * 160); b.st = 'idle'; b.t = 0; }
    else if (b.st === 'burstW' && b.t > 0.8) { b.st = 'burst'; b.t = 0; b.cnt = 0; }
    else if (b.st === 'burst' && b.t > 0.65) { knife(bcx + b.face * 34, FLOOR - 26, b.face, 215); b.t = 0; if (++b.cnt >= 2) b.st = 'idle'; }
    else if (b.st === 'pip') {
      const fromLeft = pcx > M.roomX + 9 * T, pe = makeEnt({ type: 'pip', sx: fromLeft ? M.roomX + 1.6 * T : M.roomX + 16.4 * T, sy: FLOOR });
      pe.st = 'ready'; pe.t = 0; pe.active = true; pe.dir = fromLeft ? 1 : -1; pe.face = pe.dir; ents.push(pe); bossSay('Go, Pip!'); sfx.warn();
      b.st = 'idle'; b.t = -0.4;
    } else if (b.st === 'jump') { const tx = bcx < M.roomX + 9 * T ? M.roomX + 13.5 * T : M.roomX + 3.5 * T; bossJumpTo(tx, -820); b.st = 'hop'; b.t = 0; }
  }
  if (!b.onGround || b.vy < 0) {
    b.vy = Math.min(MAXFALL, b.vy + GRAV * dt); moveBody(b, dt, false);
    if (b.onGround) {
      b.vx = 0; b.land = null; shake = 0.2; burst(bcx, FLOOR, 8, ['#c9a26a', '#8a6a3a'], 140);
      if (b.st === 'leap') { sfx.stomp(); shake = 0.4; for (const d of [-1, 1]) eshots.push({ k: 'shock', x: bcx - 15 + d * 30, y: FLOOR - 24, w: 30, h: 24, vx: d * 250, vy: 0, g: 0, hp: 0, dmg: 2, life: 3 }); }
      b.st = 'idle'; b.t = 0;
    }
  } else { b.vy = 0; b.y = FLOOR - b.h; }
  b.x = Math.max(M.roomX + T, Math.min(M.roomX + 17 * T - b.w, b.x));
  if (overlap(b, pbox())) hurt(2, bcx);
}
function bossDefeated() {
  bossPhase = 'dead'; boss.t = 0; sfx.win(); shake = 0.5;
  featherBurst(boss.x + boss.w / 2, boss.y + 40, 40); burst(boss.x + boss.w / 2, boss.y + 50, 30, ['#ffffff', '#f2c14e', '#d9531e'], 300);
  eshots = []; ents.forEach(e => { if (e.type === 'pip') e.dead = true; });
  bossSay(['Fine, I will make soup.', 'You win, little bird!', 'Hot dogs it is!', 'Pip, order a pizza.'][stageIdx]);
}
function clearStage() {
  const first = !save.cleared[stageIdx];
  save.cleared[stageIdx] = true;
  if (ST.gives >= 0) save.weapons[ST.gives] = true;
  save.feathers[stageIdx] = Math.max(save.feathers[stageIdx], feathersGot);
  writeSave();
  lastClear = { first, gives: ST.gives, feathers: feathersGot, total: feathersTotal, time: stageTime, tries };
  TE.clears.push({ stage: stageIdx, time: +stageTime.toFixed(1), tries, hits: stats.hits, deaths: stats.deaths, falls: stats.falls, invincible: TE.invincible });
  setState(stageIdx === 3 ? 'ending' : 'clear');
}

// ---------- drawing helpers (art carried over from v1) ----------
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

function drawTurkey(x, y, slide, t, alpha, scl) {
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
  ctx.save(); ctx.translate(-4, -30); ctx.rotate(Math.sin(t * 2) * 0.2 - 0.2); ell(0, 0, 15, 9, '#4a2812'); ctx.restore();
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

function drawGoldFeather(x, y, r) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(r - 0.5);
  ctx.fillStyle = 'rgba(255,220,100,0.25)'; ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createLinearGradient(0, -16, 0, 16); g.addColorStop(0, '#fff1a8'); g.addColorStop(1, '#e0a020');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -2, 7, 15, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#a06a10'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(0, 17); ctx.stroke();
  ctx.restore();
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

function wrapText(s, x, y, maxW, size, col) {
  ctx.font = 'bold ' + size + 'px "Trebuchet MS", system-ui, sans-serif';
  const words = s.split(' '); const lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur);
  lines.forEach((ln, i) => text(ln, x, y + i * (size + 4), size, col));
}
const mod = (a, n) => ((a % n) + n) % n;

// ---------- falling leaves ----------
const leaves = [];
for (let i = 0; i < 30; i++) leaves.push({ x: Math.random() * 1200, y: Math.random() * VH, s: 6 + Math.random() * 8, vx: -15 - Math.random() * 25, vy: 30 + Math.random() * 40, r: Math.random() * 6, vr: (Math.random() - 0.5) * 3, ph: Math.random() * 6, c: LEAF_COLS[i % 5] });
function updateLeaves(dt) {
  for (const l of leaves) {
    l.ph += dt * 2; l.x += (l.vx + Math.sin(l.ph) * 25) * dt; l.y += l.vy * dt; l.r += l.vr * dt;
    if (l.y > VH + 20 || l.x < -30) { l.y = -20 - Math.random() * 60; l.x = Math.random() * (VW + 200); }
  }
}

// ---------- world drawing ----------
const wy = y => y + OY; // world y to screen y
function drawBg() {
  const th = ST.theme, pal = PAL[th];
  if (th === 'yard') {
    const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#f08a4b'); g.addColorStop(0.65, '#fde3b4'); g.addColorStop(1, '#fde3b4');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    ell(VW * 0.75 - camX * 0.02, 120, 46, 46, 'rgba(255,240,190,0.9)');
    repeat(520, 0.25, (sx, i) => ell(sx + 260, wy(400), 330, 150 + mod(i, 3) * 30, mod(i, 2) ? '#c97a3a' : '#b8612a'));
    repeat(300, 0.5, (sx, i) => { ctx.fillStyle = '#5a321a'; ctx.fillRect(sx + 140, wy(250), 16, 200); ell(sx + 148, wy(230), 70, 58, LEAF_COLS[mod(i, 5)]); ell(sx + 112, wy(262), 40, 32, LEAF_COLS[mod(i + 2, 5)]); ell(sx + 190, wy(256), 36, 30, LEAF_COLS[mod(i + 3, 5)]); });
    repeat(60, 0.7, sx => { ctx.fillStyle = '#e8d2a8'; ctx.fillRect(sx + 6, wy(360), 14, 82); ctx.beginPath(); ctx.moveTo(sx + 6, wy(360)); ctx.lineTo(sx + 13, wy(350)); ctx.lineTo(sx + 20, wy(360)); ctx.fill(); });
    ctx.fillStyle = '#d8bf92'; ctx.fillRect(0, wy(378), VW, 8); ctx.fillRect(0, wy(414), VW, 8);
    return;
  }
  const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, pal.wall); g.addColorStop(1, pal.wall2);
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  if (th === 'house') { repeat(36, 0.5, (sx, i) => { if (i % 2) { ctx.fillStyle = 'rgba(160,90,50,0.08)'; ctx.fillRect(sx, 0, 18, VH); } }); }
  if (th === 'mansion') { repeat(320, 0.5, sx => { ctx.fillStyle = 'rgba(184,137,47,0.25)'; ctx.fillRect(sx + 20, 0, 34, VH); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(sx + 26, 0, 6, VH); }); }
  // wainscot
  ctx.fillStyle = th === 'mansion' ? '#7e2222' : pal.trim; ctx.globalAlpha = 0.35; ctx.fillRect(0, wy(300), VW, 140); ctx.globalAlpha = 1;
  ctx.fillStyle = pal.trim; ctx.fillRect(0, wy(296), VW, 6);
  repeat(480, 0.5, (sx, i) => {
    const x = sx + 80;
    if (th === 'mansion' && i % 2) { // portrait in a gold frame
      ctx.fillStyle = '#b8892f'; rr(x, wy(90), 120, 150, 6); ctx.fill(); ctx.fillStyle = '#3a4a5a'; ctx.fillRect(x + 12, wy(102), 96, 126);
      ctx.save(); ctx.beginPath(); ctx.rect(x + 12, wy(102), 96, 126); ctx.clip();
      drawChef({ st: 'stop', kind: 'straight', scarf: '#6a2c8c', hat: 1.4 }, x + 60, wy(290), 0); ctx.restore();
      ctx.fillStyle = '#b8892f'; ctx.fillRect(x - 4, wy(228), 128, 14);
      return;
    }
    // window with a fall view
    const wg = ctx.createLinearGradient(0, wy(80), 0, wy(240)); wg.addColorStop(0, '#f6a35c'); wg.addColorStop(1, '#fde3b4');
    ctx.fillStyle = pal.trim; rr(x - 8, wy(72), 156, 176, 8); ctx.fill();
    ctx.fillStyle = wg; ctx.fillRect(x, wy(80), 140, 160);
    ell(x + 40, wy(210), 50, 26, '#c2622a'); ell(x + 110, wy(220), 60, 24, '#b5552a');
    ctx.fillStyle = pal.trim; ctx.fillRect(x + 67, wy(80), 6, 160); ctx.fillRect(x, wy(157), 140, 6);
    ctx.fillStyle = th === 'kitchen' ? '#c0392b' : '#2e6f9e'; ctx.globalAlpha = 0.8;
    ctx.beginPath(); ctx.moveTo(x - 10, wy(70)); ctx.lineTo(x + 30, wy(70)); ctx.quadraticCurveTo(x + 6, wy(160), x - 10, wy(250)); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 150, wy(70)); ctx.lineTo(x + 110, wy(70)); ctx.quadraticCurveTo(x + 134, wy(160), x + 150, wy(250)); ctx.fill(); ctx.globalAlpha = 1;
    if (th === 'kitchen') { // hanging pots
      for (let k = 0; k < 3; k++) { const px = x + 230 + k * 50; ctx.strokeStyle = '#6b3d1d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, wy(60 + k * 14)); ctx.stroke(); ell(px, wy(80 + k * 14), 18, 16, '#b86a34'); ctx.fillStyle = '#d98a4a'; ctx.fillRect(px - 18, wy(66 + k * 14), 36, 6); }
    } else if (th === 'house') { // picture frame
      ctx.fillStyle = '#8a4b2a'; rr(x + 230, wy(110), 90, 70, 4); ctx.fill(); ctx.fillStyle = '#f2b134'; ctx.fillRect(x + 238, wy(118), 74, 54); ell(x + 275, wy(150), 22, 14, '#d9531e');
    } else { // chandelier
      ctx.strokeStyle = '#b8892f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 290, 0); ctx.lineTo(x + 290, wy(50)); ctx.stroke();
      ctx.fillStyle = '#e0b04a'; rr(x + 240, wy(50), 100, 14, 6); ctx.fill();
      for (let k = 0; k < 5; k++) { ell(x + 248 + k * 21, wy(42), 4, 8, '#fff1a8'); }
    }
  });
}
function drawTile(t, c, r, sx, sy) {
  const th = ST.theme, pal = PAL[th];
  if (t === SOLID) {
    const topOpen = r > 0 && !isSolid(tileAt(c, r - 1));
    ctx.fillStyle = (c + r) % 2 ? pal.blk : pal.blk2; ctx.fillRect(sx, sy, T, T);
    if (th === 'kitchen') { ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 2; ctx.strokeRect(sx + 4, sy + 4, T - 8, T - 8); ell(sx + T - 10, sy + T / 2, 2.5, 2.5, '#e8c99a'); }
    else if (th === 'house') { ctx.fillStyle = 'rgba(255,230,200,0.25)'; ctx.fillRect(sx, sy + 19, T, 2); ctx.fillRect(sx + (r % 2 ? 10 : 30), sy, 2, 19); ctx.fillRect(sx + (r % 2 ? 30 : 10), sy + 21, 2, 19); }
    else if (th === 'yard') { ell(sx + 10 + (c * 7) % 20, sy + 14 + (r * 11) % 16, 3, 2, 'rgba(40,20,8,0.3)'); }
    else { ctx.strokeStyle = 'rgba(120,110,100,0.35)'; ctx.lineWidth = 1; ctx.strokeRect(sx + 0.5, sy + 0.5, T - 1, T - 1); ctx.beginPath(); ctx.moveTo(sx + 6, sy + 30); ctx.quadraticCurveTo(sx + 20, sy + 12, sx + 34, sy + 18); ctx.stroke(); }
    if (topOpen) {
      ctx.fillStyle = pal.top; ctx.fillRect(sx, sy, T, 10); ctx.fillStyle = pal.top2; ctx.fillRect(sx, sy + 10, T, 3);
      if (th === 'yard') { ctx.fillStyle = pal.top; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(sx + k * 10, sy); ctx.lineTo(sx + k * 10 + 5, sy - 6); ctx.lineTo(sx + k * 10 + 10, sy); ctx.fill(); } }
    }
  } else if (t === ONE) {
    ctx.fillStyle = th === 'yard' ? '#a8743a' : pal.trim; ctx.fillRect(sx, sy, T, 12); ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(sx, sy, T, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(sx + 16, sy + 12, 8, 10);
  } else if (t === LAD) {
    ctx.fillStyle = '#8a5a2a'; ctx.fillRect(sx + 6, sy, 5, T); ctx.fillRect(sx + T - 11, sy, 5, T);
    ctx.fillStyle = '#b07a3a'; for (let k = 0; k < 3; k++) ctx.fillRect(sx + 6, sy + 6 + k * 13, T - 12, 4);
  } else if (t === HOT) {
    ctx.fillStyle = '#3a3a40'; ctx.fillRect(sx, sy, T, T); ctx.fillStyle = '#55555e'; ctx.fillRect(sx, sy, T, 8);
    const fl = 0.6 + 0.4 * Math.sin(time * 9 + c);
    ctx.strokeStyle = `rgba(255,${Math.round(90 + 80 * fl)},30,1)`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(sx + T / 2, sy + 4, 14, 4, 0, 0, Math.PI * 2); ctx.stroke();
    for (let k = 0; k < 3; k++) { const fx = sx + 8 + k * 12, fh = 8 + 6 * Math.sin(time * 12 + k * 2 + c); ctx.fillStyle = 'rgba(255,170,40,0.85)'; ctx.beginPath(); ctx.moveTo(fx - 4, sy); ctx.quadraticCurveTo(fx, sy - fh * 1.6, fx + 4, sy); ctx.fill(); }
  }
}
function drawTiles() {
  const c0 = Math.floor(camX / T) - 1, c1 = Math.ceil((camX + VW) / T) + 1;
  for (let c = c0; c <= c1; c++) {
    const sx = c * T - camX;
    if (c < 0 || c >= M.cols) { ctx.fillStyle = PAL[ST.theme].blk2; ctx.fillRect(sx, 0, T + 1, VH); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(sx, 0, T + 1, VH); continue; }
    for (let r = 0; r < ROWS; r++) { const t = M.g[r][c]; if (t) drawTile(t, c, r, sx, wy(r * T)); }
  }
  if (gateClosed) { // boss gate shutter
    const sx = M.door * T - camX; ctx.fillStyle = '#5a5a64'; ctx.fillRect(sx, 0, T, wy(11 * T));
    ctx.fillStyle = '#7a7a86'; for (let y = 0; y < wy(11 * T); y += 14) ctx.fillRect(sx, y, T, 6);
  } else if (M.roomX) { // open gate with a sign
    const sx = M.door * T - camX; if (sx > -80 && sx < VW + 80) { ctx.fillStyle = '#5a5a64'; ctx.fillRect(sx, 0, T, wy(5 * T)); ctx.fillStyle = '#fff3dc'; rr(sx - 30, wy(5 * T) + 8, 100, 30, 8); ctx.fill(); text('BOSS', sx + 20, wy(5 * T) + 24, 18, '#c8321e'); }
  }
}
function drawMovers() {
  for (const m of movers) {
    const sx = m.x - camX; if (sx > VW || sx + m.w < 0) continue;
    const y = wy(m.y);
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(sx + 4, y + 18, m.w - 8, 6);
    ctx.fillStyle = '#c9a26a'; rr(sx, y, m.w, 16, 5); ctx.fill(); ctx.fillStyle = '#e8c99a'; ctx.fillRect(sx + 4, y + 2, m.w - 8, 4);
    ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 2; ctx.stroke();
    ell(sx + 16, y + 20, 7, 7, '#5a5a64'); ell(sx + m.w - 16, y + 20, 7, 7, '#5a5a64');
    text(ST.theme === 'yard' ? 'WAGON' : 'CART', sx + m.w / 2, y + 9, 10, '#6b3d1d');
  }
}
function drawFlag(c, sx) {
  const y = wy(c.y);
  ctx.fillStyle = '#6b3d1d'; ctx.fillRect(sx - 3, y - 86, 6, 86);
  ell(sx, y - 88, 6, 6, '#f2c14e');
  const wave = Math.sin(time * 6) * 4;
  ctx.fillStyle = c.on ? '#d9531e' : '#9a8a78';
  ctx.beginPath(); ctx.moveTo(sx + 3, y - 84); ctx.quadraticCurveTo(sx + 24, y - 80 + wave, sx + 44, y - 72); ctx.lineTo(sx + 3, y - 58); ctx.fill();
  if (c.on) ell(sx + 18, y - 72, 5, 5, '#f2c14e');
}
function drawPick(k, sx) {
  const y = wy(k.y) + Math.sin(time * 3 + k.ph) * 4;
  if (k.type === 'feather') drawGoldFeather(sx, y, Math.sin(time * 2 + k.ph) * 0.3);
  else if (k.type === 'corn') {
    ctx.save(); ctx.translate(sx, y); ctx.rotate(0.5);
    ell(0, 0, 8, 16, '#f2c14e'); ctx.fillStyle = '#d9a020'; for (let i = -2; i <= 2; i++) ctx.fillRect(-6, i * 5 - 1, 12, 1.5);
    ctx.fillStyle = '#6f8a34'; ctx.beginPath(); ctx.moveTo(-9, 16); ctx.quadraticCurveTo(-14, 0, -4, -10); ctx.lineTo(0, 16); ctx.fill();
    ctx.beginPath(); ctx.moveTo(9, 16); ctx.quadraticCurveTo(14, 0, 4, -10); ctx.lineTo(0, 16); ctx.fill(); ctx.restore();
    text('+2', sx, y - 24, 12, '#fff3dc', 'center', '#3a1f12');
  } else {
    ctx.fillStyle = 'rgba(255,240,200,0.3)'; ctx.beginPath(); ctx.arc(sx, y, 22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e0a050'; ctx.beginPath(); ctx.moveTo(sx - 18, y + 10); ctx.lineTo(sx + 18, y + 10); ctx.lineTo(sx + 6, y - 14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d9731e'; ctx.beginPath(); ctx.moveTo(sx - 13, y + 6); ctx.lineTo(sx + 13, y + 6); ctx.lineTo(sx + 5, y - 9); ctx.closePath(); ctx.fill();
    ell(sx + 2, y - 2, 6, 3, '#fff8ea');
    text('+6', sx, y - 26, 12, '#fff3dc', 'center', '#3a1f12');
  }
}
function bang(x, y) { const pulse = 0.6 + 0.4 * Math.sin(time * 20); ctx.fillStyle = `rgba(255,${Math.round(200 * pulse)},40,1)`; rr(x - 14, y - 16, 28, 32, 9); ctx.fill(); text('!', x, y + 1, 26, '#3a1f12'); }
function drawEnt(e) {
  const sx = e.x - camX, y = wy(e.y), cx = sx + e.w / 2;
  if (sx > VW + 60 || sx + e.w < -60) return;
  if (e.flash > 0) ctx.globalAlpha = 0.5;
  if (e.type === 'pin') {
    ctx.save(); ctx.translate(cx, y + e.h / 2);
    ctx.fillStyle = '#8a5a2a'; rr(-26, -5, 10, 10, 4); ctx.fill(); rr(16, -5, 10, 10, 4); ctx.fill();
    ctx.fillStyle = '#e0b070'; rr(-18, -14, 36, 28, 12); ctx.fill(); ctx.strokeStyle = '#a8743a'; ctx.lineWidth = 2; ctx.stroke();
    const sp = (e.x * 0.15) % 12; ctx.strokeStyle = 'rgba(140,90,40,0.5)'; for (let k = -12; k < 18; k += 12) { ctx.beginPath(); ctx.moveTo(k + sp - 6, -12); ctx.lineTo(k + sp - 6, 12); ctx.stroke(); }
    ell(-6 * -e.dir + 0, -3, 4, 4.5, '#fff'); ell(6 * -e.dir + 0, -3, 4, 4.5, '#fff');
    ell(-6 * -e.dir + e.dir * 1.5, -2, 2, 2.4, '#2a1a10'); ell(6 * -e.dir + e.dir * 1.5, -2, 2, 2.4, '#2a1a10');
    ctx.strokeStyle = '#3a1f12'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10, -9); ctx.lineTo(-3, -7); ctx.moveTo(10, -9); ctx.lineTo(3, -7); ctx.stroke();
    ctx.restore();
  } else if (e.type === 'pea') {
    const sq = e.onGround ? 1 + Math.max(0, e.t - 1.0) * 0.5 : 0.85;
    ctx.save(); ctx.translate(cx, y + e.h); ctx.scale(sq, 1 / sq);
    ell(0, -13, 13, 13, '#6bbf3a'); ell(-4, -18, 4, 3, 'rgba(255,255,255,0.5)');
    ell(-4, -14, 3.2, 3.6, '#fff'); ell(4, -14, 3.2, 3.6, '#fff'); ell(-4 + Math.sign(P.x - e.x), -13, 1.6, 2, '#1a2a10'); ell(4 + Math.sign(P.x - e.x), -13, 1.6, 2, '#1a2a10');
    ctx.fillStyle = '#3f8f22'; ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(6, -32); ctx.lineTo(3, -25); ctx.fill();
    ctx.restore();
  } else if (e.type === 'lid') {
    ctx.save(); ctx.translate(cx, y + e.h / 2); ctx.rotate(Math.sin(time * 6) * 0.15);
    ell(0, 4, 19, 8, '#7c858e'); ell(0, 0, 19, 9, '#b8c0c8'); ell(-6, -3, 8, 3, 'rgba(255,255,255,0.5)'); ell(0, -9, 6, 4, '#3a3a40');
    ell(-6, 2, 3, 3.4, '#fff'); ell(6, 2, 3, 3.4, '#fff'); ell(-6 + e.dir, 2.5, 1.5, 1.8, '#111'); ell(6 + e.dir, 2.5, 1.5, 1.8, '#111');
    ctx.restore();
  } else if (e.type === 'toast') {
    const rat = e.st === 'rattle' ? Math.sin(time * 50) * 2 : 0;
    ctx.save(); ctx.translate(cx + rat, y);
    ctx.fillStyle = '#c0c6cc'; rr(-22, 0, 44, 34, 10); ctx.fill(); ctx.strokeStyle = '#7c858e'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#3a3a40'; ctx.fillRect(-14, 2, 28, 5);
    if (e.st === 'rattle') { ctx.fillStyle = '#d9a35a'; rr(-11, -8 - (e.t - 2) * 10, 22, 14, 4); ctx.fill(); bang(0, -34); }
    ell(-8, 18, 3.4, 3.8, '#fff'); ell(8, 18, 3.4, 3.8, '#fff'); ell(-8, 19, 1.7, 2, '#111'); ell(8, 19, 1.7, 2, '#111');
    ctx.fillStyle = '#3a3a40'; ctx.fillRect(20, 12, 6, 4);
    ctx.restore();
  } else if (e.type === 'chef' || e.type === 'pip') {
    const s = e.type === 'pip' ? 0.36 : 0.5, run = e.type === 'pip' && e.st === 'run';
    ctx.save(); ctx.translate(cx, y + e.h); ctx.scale(e.face * s, s);
    drawChef({ st: e.st === 'wind' ? 'wind' : (run ? 'run' : 'stop'), kind: 'straight', scarf: e.type === 'pip' ? '#e07b20' : '#7a4a26', hat: e.type === 'pip' ? 0.8 : 0.9 }, 0, 0, run ? time * 14 : time * 2);
    ctx.restore();
    if (e.st === 'wind' || e.st === 'ready') bang(cx, y - 22);
  }
  ctx.globalAlpha = 1;
}
function drawBoss() {
  const b = boss, sx = b.x - camX, cx = sx + b.w / 2, y = wy(b.y + b.h);
  if (b.land != null) { // landing shadow so you know where they will come down
    const lx = b.land - camX, pulse = 0.5 + 0.5 * Math.sin(time * 18);
    ctx.fillStyle = `rgba(200,40,20,${0.25 + 0.25 * pulse})`; ctx.beginPath(); ctx.ellipse(lx, wy(FLOOR) - 2, 46, 9, 0, 0, Math.PI * 2); ctx.fill();
  }
  if (bossPhase === 'dead') { ctx.globalAlpha = Math.max(0, 1 - b.t / 1.2); }
  else if (b.flash > 0) ctx.globalAlpha = 0.55;
  const winding = /W$|wind|burst|crouch/.test(b.st);
  const fake = { st: winding ? 'wind' : (b.onGround ? 'stop' : 'run'), kind: stageIdx === 1 || stageIdx === 3 ? 'arcburst' : 'straight', mode: /lob/.test(b.st) ? 'arc' : '', scarf: b.scarf, hat: b.hat };
  ctx.save(); ctx.translate(cx, y); ctx.scale(b.face * b.scale, b.scale * (b.st === 'crouch' ? 0.9 : 1));
  drawChef(fake, 0, 0, b.onGround ? time * 2 : time * 10);
  if (stageIdx === 2) { ctx.fillStyle = '#c0392b'; rr(-18, -72, 36, 42, 6); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-8, -60); ctx.lineTo(8, -60); ctx.moveTo(-8, -50); ctx.lineTo(8, -50); ctx.stroke(); }
  ctx.restore();
  ctx.globalAlpha = 1;
  if (bossPhase === 'fight' && winding) bang(cx, wy(b.y) - 26);
  if (b.sayT > 0 && b.say) {
    ctx.font = 'bold 17px "Trebuchet MS", sans-serif'; const w = ctx.measureText(b.say).width + 20, bx = Math.max(10, Math.min(VW - w - 10, cx - w / 2));
    ctx.fillStyle = '#fffaf0'; rr(bx, wy(b.y) - 70, w, 30, 10); ctx.fill(); ctx.strokeStyle = '#3a1f12'; ctx.lineWidth = 2; ctx.stroke();
    text(b.say, bx + w / 2, wy(b.y) - 55, 17, '#3a1f12');
  }
}
function drawEshot(s) {
  const sx = s.x - camX, y = wy(s.y);
  if (s.k === 'knife') { ctx.save(); ctx.translate(sx + s.w / 2, y + s.h / 2); if (s.vx < 0) ctx.scale(-1, 1); drawKnifeShape('knife', 1); ctx.restore(); }
  else if (s.k === 'cleaver') {
    if (!s.stuck) { const tx = s.tx - camX, pulse = 0.5 + 0.5 * Math.sin(time * 20); ctx.strokeStyle = `rgba(220,30,20,${0.6 + 0.4 * pulse})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(tx, wy(s.ly) - 3, 30, 8, 0, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(tx - 12, wy(s.ly) - 3); ctx.lineTo(tx + 12, wy(s.ly) - 3); ctx.stroke(); }
    ctx.save(); ctx.translate(sx + 15, y + 15); ctx.rotate(s.rot || 0); if (s.stuck) ctx.globalAlpha = 0.7; drawKnifeShape('cleaver', 0.9); ctx.restore(); ctx.globalAlpha = 1;
  } else if (s.k === 'toast') { ctx.save(); ctx.translate(sx + 12, y + 10); ctx.rotate(time * 8); ctx.fillStyle = '#d9a35a'; rr(-11, -9, 22, 18, 5); ctx.fill(); ctx.fillStyle = '#f2d9a0'; rr(-7, -5, 14, 10, 3); ctx.fill(); ctx.restore(); }
  else if (s.k === 'potato') { ell(sx + 11, y + 10, 12, 10, '#a8743a'); ell(sx + 7, y + 7, 2, 2, '#6b4a20'); ell(sx + 14, y + 12, 2, 2, '#6b4a20'); ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; for (let k = 0; k < 2; k++) { ctx.beginPath(); ctx.moveTo(sx + 6 + k * 9, y - 2); ctx.quadraticCurveTo(sx + 10 + k * 9, y - 8, sx + 6 + k * 9, y - 14); ctx.stroke(); } }
  else if (s.k === 'shock') { ctx.fillStyle = 'rgba(201,162,106,0.9)'; ctx.beginPath(); ctx.moveTo(sx, y + s.h); ctx.quadraticCurveTo(sx + s.w / 2, y - 10, sx + s.w, y + s.h); ctx.fill(); ell(sx + s.w / 2, y + s.h - 6, 10, 6, 'rgba(255,240,200,0.6)'); }
}
function drawShot(s) {
  const sx = s.x - camX, y = wy(s.y);
  if (s.wi === 0) { ell(sx, y, 7, 7, '#c8102e'); ell(sx - 2, y - 2, 2.5, 2.5, 'rgba(255,255,255,0.7)'); }
  else if (s.wi === 1) { ell(sx, y, 6, 5, '#f2c14e'); ell(sx - 1, y - 1, 2, 2, '#fff1a8'); }
  else if (s.wi === 2) { ell(sx, y, 12, 9, '#e0a050'); ell(sx, y - 2, 9, 6, '#d9731e'); ell(sx, y - 3, 4, 2, '#fff8ea'); }
  else { ctx.fillStyle = '#ffe066'; rr(sx - 8, y - 6, 16, 12, 3); ctx.fill(); ctx.fillStyle = '#fff6b0'; ctx.fillRect(sx - 6, y - 5, 10, 3); }
}
function drawPlayer() {
  const p = P; if (p.dead) return;
  if (p.inv > 0 && Math.floor(time * 14) % 2 === 0) return;
  const cx = p.x + p.w / 2 - camX, y = wy(p.y + p.h);
  ctx.save(); ctx.translate(cx, y); ctx.scale(p.face, 1);
  if (p.climb) { ctx.rotate(Math.sin(p.anim * 3) * 0.08); }
  drawTurkey(0, 0, false, p.onGround && Math.abs(p.vx) > 1 ? p.anim * 0.5 : (p.onGround ? 0 : 1.2), 1, 0.62);
  if (p.shootT > 0) { ell(26, -26, 7, 7, WEAPONS[curW].col); ell(26, -26, 4, 4, '#fff8ea'); }
  ctx.restore();
}
function threatTag() {
  // a JUMP! tag over the turkey while a knife is being wound up on the same floor
  const feet = P.y + P.h;
  let warn = false;
  for (const e of ents) if (e.active && !e.dead && e.type === 'chef' && e.st === 'wind' && Math.abs(e.y + e.h - feet) < 30 && onScreen(e.x, e.w, 0)) warn = true;
  if (boss && bossPhase === 'fight' && (boss.st === 'wind' && stageIdx === 0 || boss.st === 'burstW' || boss.st === 'burst')) warn = true;
  if (!warn || P.dead) return;
  const tx = P.x + P.w / 2 - camX, ty = wy(P.y) - 34, pulse = 0.5 + 0.5 * Math.sin(time * 22);
  ctx.fillStyle = `rgba(255,250,235,${0.75 + 0.25 * pulse})`; rr(tx - 40, ty - 15, 80, 30, 10); ctx.fill(); ctx.strokeStyle = '#c8321e'; ctx.lineWidth = 3; ctx.stroke();
  text('\u25B2 JUMP', tx, ty + 1, 15, '#c8321e');
}
function drawWorld() {
  drawBg();
  drawTiles(); drawMovers();
  for (const c of cps) { const sx = c.x - camX; if (sx > -60 && sx < VW + 60) drawFlag(c, sx); }
  for (const k of picks) { if (k.got) continue; const sx = k.x - camX; if (sx > -40 && sx < VW + 40) drawPick(k, sx); }
  for (const e of ents) if (!e.dead && e.active) drawEnt(e);
  if (boss) drawBoss();
  drawPlayer();
  for (const s of eshots) drawEshot(s);
  for (const s of shots) drawShot(s);
  for (const p of parts) {
    const sx = p.x - camX, y = wy(p.y);
    if (p.k === 'text') { ctx.globalAlpha = Math.min(1, p.t * 2); text(p.s, sx, y, 18, p.col, 'center', '#3a1f12'); ctx.globalAlpha = 1; }
    else if (p.k === 'bit') { ctx.fillStyle = p.c; ctx.fillRect(sx - p.s / 2, y - p.s / 2, p.s, p.s); }
    else drawLeaf(sx, y, p.s, p.r, p.c);
  }
  threatTag();
}

// ---------- HUD ----------
function safeV() { return { l: Math.max(0, (safe.l - offX) / scale), r: Math.max(0, (safe.r - (cssW - offX - VW * scale)) / scale), t: Math.max(0, (safe.t - offY) / scale) }; }
function weaponIcon(i, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s || 1, s || 1);
  if (i === 0) { ell(0, 0, 8, 8, '#c8102e'); ell(-2, -2, 3, 3, 'rgba(255,255,255,0.7)'); }
  else if (i === 1) { ell(-6, 3, 5, 4, '#f2c14e'); ell(0, -4, 5, 4, '#f2c14e'); ell(6, 3, 5, 4, '#f2c14e'); }
  else if (i === 2) { ell(0, 0, 11, 8, '#e0a050'); ell(0, -2, 8, 5, '#d9731e'); }
  else { ctx.fillStyle = '#ffe066'; rr(-9, -6, 18, 12, 3); ctx.fill(); }
  ctx.restore();
}
function drawHUD() {
  const sv = safeV(), lx = 14 + sv.l, ty = 10 + sv.t;
  ctx.fillStyle = 'rgba(40,20,10,0.6)'; rr(lx, ty, 400, 56, 14); ctx.fill();
  text('HEALTH', lx + 12, ty + 15, 12, '#ffd9a8', 'left');
  for (let i = 0; i < MAXHP; i++) {
    const on = i < P.hp, x = lx + 12 + i * 19;
    ctx.fillStyle = on ? (P.hp <= 3 ? '#ff7a4a' : '#f2b134') : 'rgba(255,255,255,0.15)'; rr(x, ty + 26, 15, 20, 4); ctx.fill();
    if (on) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x + 3, ty + 29, 9, 4); }
  }
  weaponIcon(curW, lx + 216, ty + 36, 1);
  text(WEAPONS[curW].short, lx + 230, ty + 36, 14, '#fff3dc', 'left');
  drawGoldFeather(lx + 376, ty + 22, 0.3);
  text(feathersGot + '/' + feathersTotal, lx + 376, ty + 46, 12, '#ffe27a');
  text(ST.name, lx + 216, ty + 15, 12, '#ffd9a8', 'left');
  if (boss && bossPhase !== 'none') {
    const bw = Math.max(120, Math.min(300, VW - lx - 430 - 80)), bx = Math.max(lx + 420, VW - bw - 80 - sv.r), by = ty;
    ctx.fillStyle = 'rgba(40,20,10,0.6)'; rr(bx - 10, by, bw + 20, 56, 14); ctx.fill();
    text(boss.name, bx, by + 15, 13, '#ffd9a8', 'left');
    const f = bossPhase === 'intro' ? boss.fill : boss.hp / boss.max;
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; rr(bx, by + 28, bw, 16, 6); ctx.fill();
    ctx.fillStyle = f < 0.5 ? '#e84a2a' : '#c8321e'; rr(bx, by + 28, Math.max(0, bw * f), 16, 6); ctx.fill();
  }
  if (banner.t > 0) {
    ctx.globalAlpha = Math.max(0, Math.min(1, banner.t * 2));
    text(banner.text, VW / 2, 170, 46, '#fff3dc', 'center', '#7a2e12');
    if (banner.sub) text(banner.sub, VW / 2, 214, 22, '#ffe27a', 'center', '#7a2e12');
    ctx.globalAlpha = 1;
  }
  if (bossPhase === 'intro') text(boss.name.toUpperCase(), VW / 2, 180, 40, '#ffe27a', 'center', '#7a2e12');
  if (stageIdx === 0 && P.x < 9 * T && !P.dead) {
    const msg = isTouch ? 'Pad: move   JUMP: hold to jump higher   SHOOT: hold to keep firing' : 'Arrows or A/D: move   Space or Z: jump   X or J: shoot   Up: climb   P: pause';
    text(msg, VW / 2, isTouch && !portrait ? 250 : 92 + sv.t, 16, '#fff3dc', 'center', '#3a1f12');
  }
  if (!isTouch) text('P: pause   C: swap weapon', VW - 12 - sv.r, VH - 14, 12, 'rgba(255,243,220,0.7)', 'right');
}

// ---------- screens ----------
function drawTitle() {
  const sc = camX; menuBg(); camX = sc;
  const cx = VW / 2;
  text('TURKEY ESCAPE 2', cx, 74, 64, '#fff3dc', 'center', '#7a2e12');
  text('FEATHER FORCE', cx, 134, 40, '#ffd25a', 'center', '#7a2e12');
  text('Beat the chefs, win their weapons, and escape before dinner.', cx, 180, 19, '#4a1e0c');
  ctx.save(); ctx.translate(cx + 150, VH - 84); ctx.scale(-1, 1); drawTurkey(0, 0, false, time * 3, 1, 1.15); ctx.restore();
  ctx.save(); ctx.translate(cx - 230, VH - 80); ctx.scale(1, 1); drawChef({ st: 'stop', kind: 'straight', scarf: '#c0392b', hat: 1.1 }, 0, 0, time * 2); ctx.restore();
  for (let i = 0; i < 3; i++) { const t = (time * 1.6 + i * 0.33) % 1; ell(cx + 100 - t * 230, VH - 130 - Math.sin(t * Math.PI) * 30, 8, 8, '#c8102e'); }
  button('PLAY', cx - 110, 216, 220, 70, () => setState('select'), { hot: true, size: 32 });
  button(save.muted ? 'Sound: OFF' : 'Sound: ON', cx + 134, 229, 150, 44, () => { save.muted = !save.muted; writeSave(); }, { size: 18 });
  text(isTouch ? 'Tap PLAY to start' : 'Press Enter to start', cx, 310, 18, '#5a2a10');
}
function drawSelect() {
  const sc = camX; menuBg(); camX = sc;
  ctx.fillStyle = 'rgba(40,20,10,0.4)'; ctx.fillRect(0, 0, VW, VH);
  text('Pick a Chef to Beat', VW / 2, 34, 32, '#fff3dc', 'center', '#7a2e12');
  button('Back', 14 + safeV().l, 12, 90, 40, () => setState('title'), { size: 18 });
  const gap = 16, cw = Math.min(300, (VW - 40 - 2 * gap) / 3), ch = 262, x0 = VW / 2 - (3 * cw + 2 * gap) / 2, y0 = 66;
  const card = (i, x, y, w, h) => {
    const s = STAGES[i], hot = i === selIdx, open = i < 3 || mansionOpen(), done = save.cleared[i];
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; rr(x, y + 6, w, h, 18); ctx.fill();
    ctx.fillStyle = open ? (hot ? '#fff3dc' : '#f6e2c0') : '#8a7a6a'; rr(x, y, w, h, 18); ctx.fill();
    ctx.strokeStyle = hot ? '#e8742f' : 'rgba(80,40,20,0.4)'; ctx.lineWidth = hot ? 5 : 2; ctx.stroke();
    ctx.save(); rr(x + 8, y + 8, w - 16, h - 16, 12); ctx.clip();
    const pal = PAL[s.theme]; ctx.fillStyle = pal.wall; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = pal.blk; ctx.fillRect(x, y + h - 70, w, 70); ctx.fillStyle = pal.top; ctx.fillRect(x, y + h - 76, w, 8);
    const portraitX = i === 3 ? x + 90 : x + w / 2, py = i === 3 ? y + h - 14 : y + h - 74;
    if (open) { ctx.save(); ctx.translate(portraitX, py); const ss = i === 3 ? 0.5 : 0.58; ctx.scale(-ss, ss); drawChef({ st: hot ? 'wind' : 'stop', kind: 'straight', scarf: s.scarf, hat: s.hat }, 0, 0, time * 3); ctx.restore(); }
    ctx.restore();
    if (!open) { ctx.fillStyle = 'rgba(40,20,10,0.72)'; rr(x, y, w, h, 18); ctx.fill(); }
    if (i < 3) {
      text(s.name, x + w / 2, y + 26, Math.min(22, w / 11), '#3a1f12');
      text(s.boss, x + w / 2, y + 50, 16, '#7a2e12');
      text(s.blurb, x + w / 2, y + 72, 12, '#5a2a10');
      ctx.fillStyle = 'rgba(40,20,10,0.75)'; rr(x + 14, y + h - 46, w - 28, 32, 10); ctx.fill();
      weaponIcon(s.gives, x + 32, y + h - 30, 1);
      text((done ? 'Got: ' : 'Win: ') + WEAPONS[s.gives].name, x + 46, y + h - 30, 13, '#fff3dc', 'left');
    } else {
      text(s.name + ': ' + s.boss, x + w / 2 + 60, y + 30, 22, open ? '#3a1f12' : '#e8dccb');
      text(open ? s.blurb : 'Beat all 3 chefs to open the Mansion', x + w / 2 + 60, y + 60, 15, open ? '#7a2e12' : '#fff3dc');
    }
    if (done) { ctx.fillStyle = '#2f7d32'; rr(x + w - 104, y + h - (i === 3 ? 46 : 92), 92, 28, 10); ctx.fill(); text('CLEARED', x + w - 58, y + h - (i === 3 ? 32 : 78), 14, '#fff'); }
    if (done && save.feathers[i]) { drawGoldFeather(x + 26, y + (i === 3 ? 30 : 96), 0.3); text('x' + save.feathers[i], x + 40, y + (i === 3 ? 32 : 98), 13, '#7a4a10', 'left'); }
    buttons.push({ x, y, w, h, disabled: !open, label: s.name, action: () => { selIdx = i; startStage(i); } });
  };
  for (let i = 0; i < 3; i++) card(i, x0 + i * (cw + gap), y0, cw, ch);
  const mw = 3 * cw + 2 * gap; card(3, x0, y0 + ch + 14, mw, 120);
  const owned = WEAPONS.filter((w, i) => save.weapons[i]).map(w => w.name).join(', ');
  text('Weapons: ' + owned, VW / 2, VH - 22, 14, '#fff3dc', 'center', '#3a1f12');
}
function overlayPanel(w, h) { ctx.fillStyle = 'rgba(30,15,8,0.6)'; ctx.fillRect(0, 0, VW, VH); const x = VW / 2 - w / 2, y = VH / 2 - h / 2; ctx.fillStyle = '#fff3dc'; rr(x, y, w, h, 22); ctx.fill(); ctx.strokeStyle = '#c8481a'; ctx.lineWidth = 4; ctx.stroke(); return { x, y }; }
function drawPause() {
  const { x, y } = overlayPanel(500, 500), cx = VW / 2;
  text('Paused', cx, y + 32, 32, '#7a2e12');
  const items = [['Keep playing', () => setState('play')], ['Back to last flag', () => { respawn(false); setState('play'); }], ['Stage select', () => setState('select')], [save.muted ? 'Sound: OFF' : 'Sound: ON', () => { save.muted = !save.muted; writeSave(); }], ['Urwin Homeschool home', goSiteHome]];
  items.forEach((it, i) => button(it[0], cx - 150, y + 60 + i * 54, 300, 46, it[1], { hot: i === pauseSel, size: i === 4 ? 16 : 18 }));
  text('Weapons (tap to pick):', cx, y + 340, 15, '#5a2a10');
  const own = WEAPONS.map((w, i) => i).filter(i => save.weapons[i]);
  own.forEach((wi, k) => { const bx = cx - (own.length * 96) / 2 + k * 96 + 4; button(WEAPONS[wi].short, bx, y + 356, 88, 40, () => { pickWeapon(wi); }, { hot: wi === curW, size: 14 }); });
}
function drawLose() {
  const { x, y } = overlayPanel(500, 300), cx = VW / 2;
  text('Oh no! Out of health.', cx, y + 46, 32, '#7a2e12');
  text('No worries. You go back to your last flag.', cx, y + 90, 17, '#5a2a10');
  ctx.save(); ctx.translate(cx + 170, y + 150); drawTurkey(0, 0, false, time * 2, 1, 0.5); ctx.restore();
  button('Try again', cx - 150, y + 130, 300, 58, () => { respawn(false); setState('play'); }, { hot: pauseSel === 0, size: 24 });
  button('Stage select', cx - 150, y + 206, 300, 50, () => setState('select'), { hot: pauseSel === 1, size: 20 });
}
function drawClear() {
  const sc = camX; menuBg(); camX = sc;
  const cx = VW / 2, c = lastClear || { gives: 1, feathers: 0, total: 0, time: 0 };
  text('STAGE CLEAR!', cx, 56, 50, '#fff3dc', 'center', '#7a2e12');
  text('You beat ' + ST.boss + '!', cx, 104, 24, '#4a1e0c');
  ctx.fillStyle = 'rgba(40,20,10,0.75)'; rr(cx - 260, 130, 520, 120, 18); ctx.fill();
  weaponIcon(c.gives, cx - 210, 190, 2.2);
  text('New weapon: ' + WEAPONS[c.gives].name, cx - 160, 172, 22, '#ffe27a', 'left');
  wrapTextL(WEAPONS[c.gives].info, cx - 160, 204, 330, 15, '#fff3dc');
  text('Golden feathers: ' + c.feathers + ' of ' + c.total + '    Time: ' + Math.round(c.time) + 's', cx, 276, 17, '#4a1e0c');
  if (mansionOpen() && stageIdx < 3 && !save.cleared[3]) text('The Big Mansion is open now!', cx, 306, 20, '#7a2e12');
  ctx.save(); ctx.translate(cx + 240, VH - 40); drawTurkey(0, -Math.abs(Math.sin(time * 5)) * 20, false, time * 5, 1, 1); ctx.restore();
  button('Stage select', cx - 130, 330, 260, 60, () => setState('select'), { hot: true, size: 24 });
}
function wrapTextL(s, x, y, maxW, size, col) {
  ctx.font = 'bold ' + size + 'px "Trebuchet MS", system-ui, sans-serif';
  const words = s.split(' '); const lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur);
  lines.forEach((ln, i) => text(ln, x, y + i * (size + 4), size, col, 'left'));
}
function drawEnding() {
  const sc = camX; menuBg(); camX = sc;
  const cx = VW / 2;
  text('YOU ESCAPED!', cx, 64, 56, '#fff3dc', 'center', '#7a2e12');
  text('All four chefs gave up. Happy Thanksgiving, turkey!', cx, 112, 21, '#4a1e0c');
  text('The chefs are having pizza this year.', cx, 142, 18, '#5a2a10');
  const tot = save.feathers.reduce((a, b) => a + b, 0);
  text('Golden feathers found: ' + tot, cx, 176, 18, '#7a2e12');
  for (let i = 0; i < 4; i++) { ctx.save(); ctx.translate(cx - 300 + i * 200, VH - 70); ctx.scale(i % 2 ? -0.6 : 0.6, 0.6); drawChef({ st: 'stop', kind: 'straight', scarf: STAGES[i].scarf, hat: STAGES[i].hat }, 0, 0, time); ctx.restore(); }
  ctx.save(); ctx.translate(cx, VH - 150); drawTurkey(0, -Math.abs(Math.sin(time * 5)) * 30, false, time * 5, 1, 1.1); ctx.restore();
  button('Stage select', cx - 130, 206, 260, 60, () => setState('select'), { hot: true, size: 24 });
  if (Math.random() < 0.05) featherBurst(camX + Math.random() * VW, -OY, 2);
}

// ---------- state ----------
function goSiteHome() { location.href = '../'; }
function syncSiteHome() {
  const el = document.querySelector('[data-hs-home]');
  if (!el) return;
  el.hidden = (state === 'play');
  el.setAttribute('data-hs-playing', '0');
}
function setState(s) {
  state = s; stateT = 0; pauseSel = 0;
  const playing = s === 'play' || s === 'pause';
  tb.wrap.classList.toggle('show', isTouch && s === 'play');
  tb.P.classList.toggle('show', isTouch && playing);
  tb.rot.classList.toggle('show', portrait && isTouch && s === 'play');
  if (s !== 'play') { for (const k in touch) touch[k] = false; padPtrs.clear(); padUpdate(); }
  if (s === 'select') selIdx = Math.min(selIdx, mansionOpen() ? 3 : 2);
  syncSiteHome();
}
function menuKey(k) {
  const enter = k === 'Enter' || k === ' ' || k === 'z' || k === 'Z';
  if (state === 'title') { if (enter) setState('select'); }
  else if (state === 'select') {
    if (k === 'ArrowRight' || k === 'd') selIdx = selIdx === 3 ? 3 : (selIdx + 1) % 3;
    if (k === 'ArrowLeft' || k === 'a') selIdx = selIdx === 3 ? 3 : (selIdx + 2) % 3;
    if ((k === 'ArrowDown' || k === 's') && mansionOpen()) selIdx = 3;
    if ((k === 'ArrowUp' || k === 'w') && selIdx === 3) selIdx = 1;
    if (enter && (selIdx < 3 || mansionOpen())) startStage(selIdx);
    if (k === 'Escape') setState('title');
  } else if (state === 'pause') {
    if (k === 'ArrowDown') pauseSel = (pauseSel + 1) % 5; if (k === 'ArrowUp') pauseSel = (pauseSel + 4) % 5;
    if (k === 'p' || k === 'P' || k === 'Escape') setState('play');
    if (enter) { const acts = [() => setState('play'), () => { respawn(false); setState('play'); }, () => setState('select'), () => { save.muted = !save.muted; writeSave(); }, goSiteHome]; acts[pauseSel](); }
  } else if (state === 'lose') {
    if (k === 'ArrowDown' || k === 'ArrowUp') pauseSel = 1 - pauseSel;
    if (enter) { if (pauseSel === 0) { respawn(false); setState('play'); } else setState('select'); }
    if (k === 'Escape') setState('select');
  } else if (state === 'clear' || state === 'ending') { if (enter || k === 'Escape') setState('select'); }
}

// ---------- autopilot (used only by the automated tests, never by players) ----------
const bot = { jHold: 0, last: 0 };
function botInput() {
  const p = P, I = { L: false, R: false, U: false, D: false, J: false, S: true };
  const pcx = p.x + p.w / 2, feet = p.y + p.h, myRow = Math.floor((feet + 2) / T), col = Math.floor(pcx / T);
  const anyT = (c, r) => tileAt(c, r) !== E;
  const pit = c => { for (let r = myRow; r < ROWS; r++) if (anyT(c, r)) return false; return true; };
  const hazard = c => tileAt(c, myRow) === HOT;
  const blocked = c => isSolid(tileAt(c, myRow - 1));
  const wallTop = c => { let r = myRow - 1; while (r > 0 && isSolid(tileAt(c, r - 1))) r--; return r; };
  if (boss) {
    if (save.weapons[ST.weak]) curW = ST.weak; else curW = 0;
    if (bossPhase !== 'fight') { I.S = false; return I; }
    const b = boss, bcx = b.x + b.w / 2, d = bcx - pcx, dir = Math.sign(d) || 1, lw = M.roomX + T + 30, rw = M.roomX + 17 * T - 30;
    let move = 0;
    if (Math.abs(d) < 170) move = -dir; else if (Math.abs(d) > 360) move = dir;
    if (move === -dir && (pcx < lw + 20 || pcx > rw - 20)) move = 0;
    for (const s of eshots) if (s.k === 'cleaver' && !s.stuck && Math.abs(s.tx - pcx) < 60) { move = pcx < s.tx ? -1 : 1; if (pcx < lw + 10) move = 1; if (pcx > rw - 10) move = -1; }
    if (b.land != null && Math.abs(b.land - pcx) < 80) { move = pcx < b.land ? -1 : 1; if (pcx < lw + 10) move = 1; if (pcx > rw - 10) move = -1; }
    if (move === 0 && p.face !== dir) move = dir;
    I.L = move < 0; I.R = move > 0;
    for (const s of eshots) {
      if (s.k === 'cleaver') continue;
      const sd = (s.x + s.w / 2) - pcx, toward = Math.sign(s.vx) === -Math.sign(sd);
      if (toward && Math.abs(sd) < (s.k === 'shock' ? 120 : 110) && s.y + s.h > p.y + 10) I.J = true;
    }
    for (const e of ents) if (e.type === 'pip' && !e.dead && e.st === 'run' && Math.abs(e.x + e.w / 2 - pcx) < 120 && Math.sign(e.dir) === -Math.sign(e.x - p.x)) I.J = true;
    return I;
  }
  curW = 0;
  I.R = true;
  if (p.climb) { I.U = true; I.R = false; return I; }
  const ahead = Math.floor((p.x + p.w + 4) / T);
  if (blocked(ahead)) {
    const rise = myRow - wallTop(ahead);
    if (rise <= 3) { if (p.onGround) I.J = true; }
    else {
      let lc = -1; for (let c = col + 1; c >= col - 4; c--) if (tileAt(c, myRow - 1) === LAD) { lc = c; break; }
      if (lc >= 0) { const tx = lc * T + T / 2; if (Math.abs(pcx - tx) > 4) { I.R = pcx < tx; I.L = pcx > tx; } else { I.R = false; I.U = true; } }
    }
  }
  if (p.onMover) { const m = p.onMover; I.R = m.x >= m.bx - 2; I.J = false; }
  else {
    const look = Math.floor((p.x + p.w + 14) / T);
    if (p.onGround && (pit(look) || hazard(look))) {
      let w = 0; while ((pit(look + w) || hazard(look + w)) && w < 14) w++;
      const m = movers.find(m => m.ax <= look * T + 4 && m.bx + m.w >= (look + w) * T - 4);
      if (w <= 3 || !m) { if (p.x + p.w >= look * T - 10) I.J = true; }
      else I.R = m.x <= m.ax + 6;
    }
  }
  // enemies ahead: stop and shoot the ground ones
  for (const e of ents) {
    if (e.dead || !e.active) continue;
    const dx = e.x - (p.x + p.w);
    const level = e.y < feet && e.y + e.h > feet - 46;
    if (dx > -10 && dx < 190 && level && (e.type === 'pin' || e.type === 'toast' || e.type === 'chef' || e.type === 'lid')) { if (!p.onMover && !I.J) I.R = false; }
    if (e.type === 'pea' && dx > -10 && dx < 60 && !e.onGround && p.onGround) I.J = true;
    if (e.type === 'pin' && dx > -5 && dx < 40 && p.onGround) I.J = true;
  }
  for (const s of eshots) {
    const sd = (s.x + s.w / 2) - pcx, toward = Math.sign(s.vx) === -Math.sign(sd);
    if (toward && Math.abs(sd) < 110 && s.y + s.h > p.y + 10 && s.y < feet && p.onGround && !p.onMover) I.J = true;
  }
  return I;
}
function applyBot(dt) {
  const I = botInput();
  if (I.J && !bot.prevJ) input.jumpQ = true;
  bot.prevJ = I.J;
  if (I.J) bot.jHold = 0.32; else bot.jHold = Math.max(0, bot.jHold - dt);
  input.L = I.L; input.R = I.R; input.U = I.U; input.D = I.D; input.shoot = I.S; input.jump = I.J || bot.jHold > 0;
}

// ---------- camera + update ----------
function updateCamera(dt) {
  let target;
  if (gateClosed) target = M.roomX + M.roomW / 2 - VW / 2;
  else { target = P.x + P.w / 2 - VW * 0.42; target = Math.max(0, Math.min(M.cols * T - VW, target)); }
  camX += (target - camX) * Math.min(1, dt * (gateClosed ? 4 : 9));
}
function update(dt) {
  time += dt; stateT += dt;
  updateLeaves(dt);
  if (state === 'ending') updateParts(dt);
  if (state !== 'play') return;
  if (TE.auto) applyBot(dt);
  stageTime += dt;
  if (banner.t > 0) banner.t -= dt;
  updateMovers(dt); updatePlayer(dt);
  if (state !== 'play') return;
  updateEnts(dt); updateEshots(dt); updateShots(dt); updateBoss(dt); updateParts(dt);
  updateCamera(dt);
  if (shake > 0) shake -= dt;
}

// ---------- render ----------
function render() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#2a160c'; ctx.fillRect(0, 0, cssW, cssH);
  ctx.save();
  ctx.translate(offX, offY); ctx.scale(scale, scale);
  ctx.beginPath(); ctx.rect(0, 0, VW, VH); ctx.clip();
  buttons = [];
  if (state === 'title') { drawTitle(); drawLeaves(0.9); }
  else if (state === 'select') { drawSelect(); drawLeaves(0.5); }
  else if (state === 'clear') { drawClear(); drawLeaves(0.8); }
  else if (state === 'ending') { drawEnding(); drawLeaves(0.9); for (const p of parts) if (p.k === 'feather') drawLeaf(p.x - camX, wy(p.y), p.s, p.r, p.c); }
  else {
    ctx.save();
    if (shake > 0 && state === 'play') ctx.translate((Math.random() - 0.5) * 10 * shake, (Math.random() - 0.5) * 10 * shake);
    drawWorld(); ctx.restore();
    if (ST.theme === 'yard') drawLeaves(0.8);
    drawHUD();
    if (state === 'pause') drawPause(); else if (state === 'lose') drawLose();
  }
  ctx.restore();
}

// ---------- loop ----------
let lastT = performance.now(), acc = 0, fpsAcc = 0, fpsN = 0, fps = 60;
const fpsLog = [];
function frame(now) {
  const dt = Math.min(0.1, Math.max(0, (now - lastT) / 1000)); lastT = now;
  fpsAcc += dt; fpsN++;
  if (fpsAcc >= 1) { fps = fpsN / fpsAcc; fpsLog.push(fps); if (fpsLog.length > 120) fpsLog.shift(); fpsAcc = 0; fpsN = 0; }
  acc += Math.min(dt, 0.05) * turbo;
  let n = 0;
  while (acc >= STEP && n < 60 * turbo) { update(STEP); acc -= STEP; n++; }
  render();
  requestAnimationFrame(frame);
}

// ---------- test hooks (only with ?test=1, used by the Playwright checks) ----------
const TE = window.TE = {
  auto: false, invincible: false, throws: 0, jumps: 0, clears: [],
  get state() { return state; }, get fps() { return fps; }, get fpsLog() { return fpsLog.slice(); },
  get player() { return P && { x: P.x, y: P.y, vx: P.vx, vy: P.vy, hp: P.hp, onGround: P.onGround, climb: P.climb, face: P.face, cpIdx: P.cpIdx, dead: P.dead, col: Math.floor((P.x + 15) / T) }; },
  get stage() { return M && { idx: stageIdx, name: ST.name, cols: M.cols, roomX: M.roomX, gateClosed, bossPhase, boss: boss && { hp: boss.hp, max: boss.max, st: boss.st }, cps: cps.map(c => ({ x: c.x, on: c.on })), feathersGot, feathersTotal, tries, stats: Object.assign({}, stats), time: stageTime }; },
  get shots() { return shots.length; }, get eshots() { return eshots.map(s => ({ k: s.k, x: s.x, vx: s.vx })); },
  get weapon() { return curW; }, get camX() { return camX; },
  get saveData() { return JSON.parse(JSON.stringify(save)); },
  get buttons() { return buttons.map(b => ({ label: b.label, x: b.x * scale + offX, y: b.y * scale + offY, w: b.w * scale, h: b.h * scale, disabled: !!b.disabled })); },
  get touchState() { return Object.assign({}, touch); },
  set speed(v) { turbo = Math.max(1, Math.min(16, v | 0)); }, get speed() { return turbo; },
  startStage: i => startStage(i), setState: s => setState(s), respawn: () => { respawn(false); setState('play'); },
  teleport: (col, row) => { if (P) { P.x = col * T + 5; P.y = row == null ? 0 : row * T - P.h; P.vy = 0; P.climb = false; camX = Math.max(0, P.x - VW * 0.42); } },
  hurtSelf: d => { if (P) { P.inv = 0; hurt(d, P.x - 10); } },
  unlockAll: () => { save.cleared = [true, true, true, false]; save.weapons = [true, true, true, true]; writeSave(); },
  resetSave: () => { save = defaultSave(); writeSave(); }, reloadSave: () => { save = loadSave(); },
  weaponNow: i => pickWeapon(i)
};
if (!TEST) { delete window.TE; }

layout();
setState('title');
requestAnimationFrame(frame);
})();
