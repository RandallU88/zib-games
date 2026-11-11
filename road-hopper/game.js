/* Road Hopper: help Pip the chick cross the road and the river to reach all five nests. */
(function () {
  'use strict';
  var COLS = 13, ROWS = 13, T = 28, HUD = 36, FOOT = 26, W = COLS * T, H = HUD + ROWS * T + FOOT;
  var START_ROW = 12, MED_ROW = 6, HOPF = 7, STEPF = 9, SPAN = COLS + 6;
  var NESTS = [1, 3.5, 6, 8.5, 11];
  var CARCOL = ['#e0503c', '#4b8fe0', '#e9b23f', '#8a6be0', '#3fb3b0', '#e98ac8'];
  var BASE = {
    1: { kind: 'log', dir: 1, sp: 1.3, len: 3, n: 3 },
    2: { kind: 'raft', dir: -1, sp: 1.1, len: 3, n: 3 },
    3: { kind: 'log', dir: 1, sp: 1.7, len: 4, n: 2 },
    4: { kind: 'raft', dir: -1, sp: 1.4, len: 2, n: 4 },
    5: { kind: 'log', dir: 1, sp: 0.9, len: 3, n: 3 },
    7: { kind: 'car', dir: -1, sp: 1.8, len: 1, n: 3 },
    8: { kind: 'truck', dir: 1, sp: 1.0, len: 2, n: 2 },
    9: { kind: 'car', dir: -1, sp: 2.3, len: 1, n: 2 },
    10: { kind: 'car', dir: 1, sp: 1.5, len: 1, n: 3 },
    11: { kind: 'car', dir: -1, sp: 1.1, len: 1, n: 3 }
  };
  var G = {};
  var DV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

  function buildLanes() {
    G.lanes = {};
    var mult = Math.min(2.3, 1 + (G.level - 1) * 0.16);
    for (var r in BASE) {
      var b = BASE[r], n = b.n, len = b.len;
      if (b.kind === 'car' && G.level >= 3) n = Math.min(4, n + 1);
      if ((b.kind === 'log' || b.kind === 'raft') && G.level >= 4) len = Math.max(2, len - 1);
      var objs = [];
      for (var i = 0; i < n; i++) objs.push({ x0: i * SPAN / n + (r * 1.7) % 3, len: len, col: CARCOL[(i + +r) % CARCOL.length] });
      G.lanes[r] = { kind: b.kind, dir: b.dir, v: b.dir * b.sp * mult, objs: objs, river: +r >= 1 && +r <= 5 };
    }
  }
  function objX(o, lane, f) { var b = o.x0 + lane.v * f / 60; return ((b % SPAN) + SPAN) % SPAN - 3.5; }
  /* advance one frame of player physics; returns new state (pure) */
  function sim(P, f) {
    var Q = { x: P.x, row: P.row, hop: P.hop, dead: P.dead, home: P.home };
    if (Q.dead || Q.home >= 0) return Q;
    if (Q.hop > 0) {
      Q.hop--;
      if (Q.hop === 0 && Q.row === 0) {
        var ni = nestAt(Q.x);
        if (ni < 0 || G.filled[ni]) Q.dead = 'hedge'; else Q.home = ni;
        return Q;
      }
    }
    var lane = G.lanes[Q.row];
    if (!lane) return Q;
    if (lane.river) {
      if (Q.hop > 0) return Q;
      var on = false;
      for (var i = 0; i < lane.objs.length; i++) { var x = objX(lane.objs[i], lane, f); if (Q.x >= x - 0.15 && Q.x <= x + lane.objs[i].len + 0.15) { on = true; break; } }
      if (!on) { Q.dead = 'splash'; return Q; }
      Q.x += lane.v / 60;
      if (Q.x < -0.5 || Q.x > COLS - 0.5) Q.dead = 'splash';
    } else {
      for (var j = 0; j < lane.objs.length; j++) { var cx = objX(lane.objs[j], lane, f); if (Q.x + 0.3 > cx + 0.08 && Q.x - 0.3 < cx + lane.objs[j].len - 0.08) { Q.dead = 'bonk'; break; } }
    }
    return Q;
  }
  function nestAt(x) { for (var i = 0; i < NESTS.length; i++) if (Math.abs(x - NESTS[i]) < 0.6) return i; return -1; }
  function applyHop(P, d) {
    var Q = { x: P.x, row: P.row, hop: P.hop, dead: P.dead, home: P.home };
    var nx = Q.x + DV[d][0], nr = Q.row + DV[d][1];
    if (nr < 0 || nr > START_ROW || nx < -0.4 || nx > COLS - 0.6) return null;
    Q.x = nx; Q.row = nr; Q.hop = HOPF;
    if (!G.lanes[nr] || !G.lanes[nr].river) { if (nr !== 0) Q.x = Math.round(Q.x); }
    return Q;
  }
  function newLife() { G.p = { x: 6, row: START_ROW, hop: 0, dead: false, home: -1, face: 'up' }; G.best = START_ROW; G.clock = Math.max(18, 32 - (G.level - 1) * 2); G.deadT = 0; G.plan = []; }
  function startLevel() { G.filled = [false, false, false, false, false]; buildLanes(); newLife(); G.levelMsg = 1.6; }
  function hop(d, K) {
    if (G.p.dead || G.p.home >= 0 || G.p.hop > 0) { G.buffer = d; return; }
    var Q = applyHop(G.p, d); if (!Q) return;
    Q.face = d; G.p = Q; G.p.face = d; K.sfx('hop');
  }

  /* lookahead planner used by the test bot (and only by it) */
  function plan() {
    var start = { x: G.p.x, row: G.p.row, hop: G.p.hop, dead: false, home: -1 }, f0 = G.frame;
    var open = [{ s: start, f: f0, path: [], pr: 0 }], seen = {}, exp = 0;
    while (open.length && exp < 9000) {
      var bi = 0; for (var i = 1; i < open.length; i++) if (open[i].pr < open[bi].pr) bi = i;
      var n = open.splice(bi, 1)[0]; exp++;
      if (n.path.length > 70) continue;
      var acts = ['up', 'wait', 'left', 'right', 'down'];
      for (var a = 0; a < acts.length; a++) {
        var s = acts[a] === 'wait' ? n.s : applyHop(n.s, acts[a]);
        if (!s) continue;
        var f = n.f, ok = true;
        for (var k = 0; k < STEPF; k++) { s = sim(s, f); f++; if (s.dead) { ok = false; break; } if (s.home >= 0) break; }
        if (!ok) continue;
        var p2 = n.path.concat([acts[a]]);
        if (s.home >= 0) return p2;
        var key = s.row + '|' + Math.round(s.x * 6) + '|' + (f - f0);
        if (seen[key]) continue; seen[key] = 1;
        open.push({ s: s, f: f, path: p2, pr: p2.length + s.row * 2.2 });
      }
    }
    return ['wait'];
  }

  var cfg = {
    id: 'hopper', title: 'Road Hopper', width: W, height: H,
    tagline: 'Pip the chick has to cross a busy road and a fast river to reach the five nests. Fill every nest to clear the level.',
    help: { touch: 'Swipe or tap the arrows to hop. Ride the logs and rafts across the river.', keys: 'Arrow keys or WASD to hop. P or Esc pauses.' },
    controls: { pad: 'cross', buttons: [] }, swipe: true,
    start: function () { G.level = 1; G.score = 0; G.lives = 3; G.frame = 0; G.crossings = 0; G.buffer = null; startLevel(); },
    onDir: function (d, K) { hop(d, K); },
    onTap: function (p, K) { hop('up', K); },
    ai: function (K) {
      if (G.p.dead || G.p.home >= 0 || G.levelMsg > 0) { G.plan = []; G.aiF = 0; return; }
      if (G.aiF > 0) { G.aiF--; return; }
      if (!G.plan.length) G.plan = plan();
      var a = G.plan.shift();
      if (a !== 'wait') hop(a, K);
      G.aiF = STEPF - 1;
    },
    update: function (dt, K) {
      if (G.levelMsg > 0) G.levelMsg -= dt;
      G.frame++;
      if (G.p.dead) {
        G.deadT += dt;
        if (G.deadT > 1.1) { G.lives--; if (G.lives <= 0) { K.gameOver(G.score, { note: 'You reached Level ' + G.level + ' and filled ' + G.crossings + ' nests.' }); return; } newLife(); }
        return;
      }
      if (G.p.home >= 0) {
        G.deadT += dt;
        if (G.deadT > 0.7) {
          G.filled[G.p.home] = true; G.crossings++;
          if (G.filled.every(Boolean)) { G.score += 1000; G.level++; K.sfx('level'); startLevel(); }
          else newLife();
        }
        return;
      }
      G.clock -= dt;
      var face = G.p.face;
      var Q = sim(G.p, G.frame - 1); Q.face = face; G.p = Q;
      if (G.p.hop === 0 && G.buffer) { var b = G.buffer; G.buffer = null; hop(b, K); }
      if (G.p.row < G.best && !G.p.dead) { G.best = G.p.row; G.score += 10; }
      if (G.p.home >= 0) { G.score += 50 + Math.max(0, Math.floor(G.clock)) * 5; G.deadT = 0; K.sfx('eat'); }
      if (G.clock <= 0 && !G.p.dead) G.p.dead = 'time';
      if (G.p.dead) { G.deadT = 0; K.sfx('hit'); }
    },
    render: function (c, K) {
      if (!G.lanes) { G.level = 1; G.score = 0; G.lives = 3; G.frame = 0; G.crossings = 0; startLevel(); G.levelMsg = 0; }
      c.fillStyle = '#05040a'; c.fillRect(0, 0, W, H);
      c.save(); c.translate(0, HUD);
      c.fillStyle = '#1d3d1a'; c.fillRect(0, 0, W, T);
      NESTS.forEach(function (nx, i) { var x = (nx + 0.5) * T; c.fillStyle = '#0d1a0b'; c.fillRect(x - T * 0.62, 3, T * 1.24, T - 3); c.fillStyle = '#8a6424'; c.beginPath(); c.ellipse(x, T * 0.62, T * 0.42, T * 0.22, 0, 0, 7); c.fill(); if (G.filled[i]) chick(c, x, T * 0.5, 'up', 0.8); });
      c.fillStyle = '#1b4f8a'; c.fillRect(0, T, W, 5 * T);
      c.strokeStyle = 'rgba(255,255,255,.12)'; for (var wy = 1; wy <= 5; wy++) for (var wx = 0; wx < W; wx += 24) { c.beginPath(); c.arc(wx + ((G.frame / 4 + wy * 7) % 24), wy * T + T / 2 + 6, 5, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
      c.fillStyle = '#3a5a2a'; c.fillRect(0, MED_ROW * T, W, T); c.fillStyle = '#4b7036'; for (var gx = 0; gx < W; gx += 14) c.fillRect(gx, MED_ROW * T + 4 + (gx % 28 ? 6 : 0), 3, 6);
      c.fillStyle = '#26221e'; c.fillRect(0, 7 * T, W, 5 * T);
      c.fillStyle = '#E2C06E'; for (var ly = 8; ly <= 11; ly++) for (var lx = 0; lx < W; lx += 28) c.fillRect(lx + 6, ly * T - 1, 14, 2);
      c.fillStyle = '#3a5a2a'; c.fillRect(0, START_ROW * T, W, T);
      for (var r in G.lanes) {
        var lane = G.lanes[r];
        lane.objs.forEach(function (o) { drawObj(c, lane, o, (objX(o, lane, G.frame) + 0.5) * T, r * T); });
      }
      var p = G.p, px = (p.x + 0.5) * T, py = p.row * T + T / 2;
      if (p.hop > 0) { var d = DV[p.face || 'up'], k = p.hop / HOPF; px -= d[0] * T * k; py -= d[1] * T * k; py -= Math.sin((1 - k) * Math.PI) * 6; }
      if (p.dead) { var a = Math.max(0, 1 - G.deadT); c.globalAlpha = a; if (p.dead === 'splash') { c.strokeStyle = '#bfe6ff'; c.lineWidth = 2; c.beginPath(); c.arc(px, py, 6 + G.deadT * 14, 0, 7); c.stroke(); } else { c.fillStyle = '#ffd34d'; for (var s = 0; s < 8; s++) { var an = s * Math.PI / 4; c.fillRect(px + Math.cos(an) * G.deadT * 26 - 2, py + Math.sin(an) * G.deadT * 26 - 2, 4, 4); } } c.globalAlpha = 1; }
      else if (p.home < 0) chick(c, px, py, p.face || 'up', 1);
      c.restore();
      c.fillStyle = '#1a140c'; c.fillRect(0, 0, W, HUD); c.fillStyle = '#C9A04A'; c.fillRect(0, HUD - 2, W, 2);
      K.text('SCORE ' + G.score, 8, HUD / 2, 15, '#f6e3a6');
      K.text('LV ' + G.level, W / 2, HUD / 2, 15, '#E2C06E', 'center');
      K.text('BEST ' + Math.max(K.best, G.score), W - 8, HUD / 2, 15, '#cbb896', 'right');
      var fy = HUD + ROWS * T;
      for (var l = 0; l < G.lives; l++) chick(c, 14 + l * 22, fy + FOOT / 2, 'up', 0.55);
      var tw = 120, tf = Math.max(0, G.clock / Math.max(18, 32 - (G.level - 1) * 2));
      K.text('TIME', W - tw - 14, fy + FOOT / 2, 12, '#cbb896', 'right');
      c.fillStyle = '#2a1e0e'; c.fillRect(W - tw - 8, fy + 8, tw, 10); c.fillStyle = tf < 0.25 ? '#e0503c' : '#C9A04A'; c.fillRect(W - tw - 8, fy + 8, tw * tf, 10);
      if (G.levelMsg > 0 && K.state === 'play') K.text('LEVEL ' + G.level, W / 2, HUD + MED_ROW * T + T / 2, 26, '#ffd34d', 'center');
    }
  };
  function drawObj(c, lane, o, x, y) {
    var w = o.len * T;
    if (lane.kind === 'log') { c.fillStyle = '#7a4e26'; rr(c, x + 1, y + 4, w - 2, T - 8, 9); c.fill(); c.fillStyle = '#9b6a38'; c.fillRect(x + 8, y + 9, w - 16, 3); c.fillStyle = '#5a361a'; c.beginPath(); c.ellipse(x + w - 6, y + T / 2, 4, 8, 0, 0, 7); c.fill(); }
    else if (lane.kind === 'raft') { for (var i = 0; i < o.len; i++) { c.fillStyle = '#4f9a4a'; c.beginPath(); c.arc(x + i * T + T / 2, y + T / 2, T * 0.42, 0.3, Math.PI * 2 - 0.3 + 0.3); c.fill(); c.fillStyle = '#6fbf5f'; c.beginPath(); c.arc(x + i * T + T / 2 - 3, y + T / 2 - 3, T * 0.16, 0, 7); c.fill(); } }
    else { var dir = lane.dir; c.fillStyle = o.col; rr(c, x + 2, y + 5, w - 4, T - 10, 5); c.fill(); c.fillStyle = 'rgba(200,235,255,.8)'; if (dir > 0) c.fillRect(x + w - 11, y + 8, 5, T - 16); else c.fillRect(x + 6, y + 8, 5, T - 16); if (lane.kind === 'truck') { c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(dir > 0 ? x + 4 : x + 16, y + 7, w - 22, T - 14); } c.fillStyle = '#111'; c.fillRect(x + 5, y + 3, 6, 3); c.fillRect(x + w - 11, y + 3, 6, 3); c.fillRect(x + 5, y + T - 6, 6, 3); c.fillRect(x + w - 11, y + T - 6, 6, 3); }
  }
  function chick(c, x, y, face, s) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = '#ffd34d'; c.beginPath(); c.arc(0, 2, 10, 0, 7); c.fill();
    c.beginPath(); c.arc(0, -6, 7, 0, 7); c.fill();
    c.fillStyle = '#e0a52e'; c.beginPath(); c.ellipse(-8, 3, 4, 6, 0.4, 0, 7); c.ellipse(8, 3, 4, 6, -0.4, 0, 7); c.fill();
    c.fillStyle = '#1a1208'; c.fillRect(-4, -8, 2.5, 2.5); c.fillRect(1.5, -8, 2.5, 2.5);
    c.fillStyle = '#e8823a'; c.beginPath(); c.moveTo(-3, -4); c.lineTo(3, -4); c.lineTo(0, face === 'down' ? 1 : -0.5); c.fill();
    c.fillStyle = '#ffeaa0'; c.beginPath(); c.moveTo(-2, -13); c.lineTo(0, -17); c.lineTo(2, -13); c.fill();
    c.restore();
  }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  var K = window.UrwinArcade(cfg);
  if (K.test) K.G = function () { return G; };
})();
