/* Block Drop: stack the falling blocks, fill a row to clear it. Every 10 rows the drop speeds up. */
(function () {
  'use strict';
  var BC = 10, BR = 20, C = 22, BXo = 8, BYo = 14, W = 340, H = 470;
  var SHAPES = {
    I: [[0, 1], [1, 1], [2, 1], [3, 1]], O: [[1, 0], [2, 0], [1, 1], [2, 1]], T: [[1, 0], [0, 1], [1, 1], [2, 1]],
    S: [[1, 0], [2, 0], [0, 1], [1, 1]], Z: [[0, 0], [1, 0], [1, 1], [2, 1]], J: [[0, 0], [0, 1], [1, 1], [2, 1]], L: [[2, 0], [0, 1], [1, 1], [2, 1]]
  };
  var SIZE = { I: 4, O: 4, T: 3, S: 3, Z: 3, J: 3, L: 3 };
  var COL = { I: '#3fb3b0', O: '#e9b23f', T: '#8a6be0', S: '#59b86a', Z: '#e0503c', J: '#4b8fe0', L: '#e8823a' };
  var KICKS = [[0, 0], [-1, 0], [1, 0], [0, -1], [-2, 0], [2, 0], [-1, -1], [1, -1]];
  var G = {}, KK = null;

  function cells(type, rot) {
    var n = SIZE[type], out = SHAPES[type].map(function (p) { return [p[0], p[1]]; });
    if (type === 'O') return out;
    for (var r = 0; r < ((rot % 4) + 4) % 4; r++) out = out.map(function (p) { return [n - 1 - p[1], p[0]]; });
    return out;
  }
  function fits(type, rot, x, y) {
    var cs = cells(type, rot);
    for (var i = 0; i < 4; i++) { var cx = x + cs[i][0], cy = y + cs[i][1]; if (cx < 0 || cx >= BC || cy >= BR) return false; if (cy >= 0 && G.board[cy][cx]) return false; }
    return true;
  }
  function bag() { var b = Object.keys(SHAPES); for (var i = b.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = b[i]; b[i] = b[j]; b[j] = t; } return b; }
  function nextType() { if (G.queue.length < 4) G.queue = G.queue.concat(bag()); return G.queue.shift(); }
  function spawn(K) {
    var t = nextType();
    G.cur = { type: t, rot: 0, x: 3, y: t === 'I' ? -1 : 0 };
    G.lockT = 0; G.resets = 0; G.fall = 0; G.aiDone = false;
    if (!fits(t, 0, G.cur.x, G.cur.y)) { G.cur.y--; if (!fits(t, 0, G.cur.x, G.cur.y)) { K.gameOver(G.score, { note: G.lines + ' rows cleared, Level ' + G.level + '.' }); return false; } }
    return true;
  }
  function gravity() { return Math.max(0.04, 0.8 * Math.pow(0.82, G.level - 1)); }
  function move(dx, K) { var c = G.cur; if (c && fits(c.type, c.rot, c.x + dx, c.y)) { c.x += dx; touchLock(); if (K) K.sfx('blip'); return true; } return false; }
  function rotate(dir, K) {
    var c = G.cur; if (!c) return;
    var nr = c.rot + dir;
    for (var i = 0; i < KICKS.length; i++) { var k = KICKS[i]; if (fits(c.type, nr, c.x + k[0], c.y + k[1])) { c.x += k[0]; c.y += k[1]; c.rot = ((nr % 4) + 4) % 4; touchLock(); if (K) K.sfx('blip'); return true; } }
    return false;
  }
  function touchLock() { if (G.lockT > 0 && G.resets < 15) { G.lockT = 0; G.resets++; } }
  function lock(K) {
    var c = G.cur, cs = cells(c.type, c.rot), top = false;
    cs.forEach(function (p) { var y = c.y + p[1]; if (y < 0) top = true; else G.board[y][c.x + p[0]] = c.type; });
    G.cur = null;
    if (top) { K.gameOver(G.score, { note: G.lines + ' rows cleared, Level ' + G.level + '.' }); return; }
    var full = [];
    for (var y = 0; y < BR; y++) if (G.board[y].every(Boolean)) full.push(y);
    if (full.length) {
      G.flashRows = full; G.flashT = 0.25;
      G.score += [0, 100, 300, 500, 800][full.length] * G.level;
      G.lines += full.length; K.sfx('line');
      var nl = Math.floor(G.lines / 10) + 1;
      if (nl > G.level) { G.level = nl; G.levelMsg = 1.4; K.sfx('level'); }
    } else { K.sfx('chomp'); spawn(K); }
  }
  function hardDrop(K) { var c = G.cur; if (!c) return; var n = 0; while (fits(c.type, c.rot, c.x, c.y + 1)) { c.y++; n++; } G.score += n * 2; lock(K); }
  function ghostY() { var c = G.cur, y = c.y; while (fits(c.type, c.rot, c.x, y + 1)) y++; return y; }

  /* placement search used only by the test bot */
  function bestPlacement() {
    var c = G.cur, best = null;
    for (var r = 0; r < 4; r++) for (var x = -2; x < BC + 1; x++) {
      if (!fits(c.type, r, x, c.y)) continue;
      var y = c.y; while (fits(c.type, r, x, y + 1)) y++;
      var b = G.board.map(function (row) { return row.slice(); });
      cells(c.type, r).forEach(function (p) { if (y + p[1] >= 0) b[y + p[1]][x + p[0]] = 'x'; });
      var lines = 0; b = b.filter(function (row) { if (row.every(Boolean)) { lines++; return false; } return true; }); while (b.length < BR) b.unshift(new Array(BC).fill(null));
      var hs = [], holes = 0;
      for (var cx = 0; cx < BC; cx++) { var hgt = 0, seen = false; for (var cy = 0; cy < BR; cy++) { if (b[cy][cx]) { if (!seen) { hgt = BR - cy; seen = true; } } else if (seen) holes++; } hs.push(hgt); }
      var agg = hs.reduce(function (a, v) { return a + v; }, 0), bump = 0; for (var i = 0; i < BC - 1; i++) bump += Math.abs(hs[i] - hs[i + 1]);
      var sc = -0.51 * agg + 0.76 * lines - 0.36 * holes - 0.18 * bump;
      if (!best || sc > best.sc) best = { sc: sc, r: r, x: x };
    }
    return best;
  }

  var cfg = {
    id: 'blocks', title: 'Block Drop', width: W, height: H, keyRepeat: false,
    tagline: 'Seven kinds of blocks fall from the sky. Fit them together to fill whole rows and clear them. Every 10 rows the blocks fall faster.',
    help: { touch: 'Arrows move, up arrow or ROTATE turns, DROP slams it down. On the board: tap to rotate, swipe sideways to move, swipe down to drop.', keys: 'Left and Right move, Up or X rotates, Z rotates back, Down drops faster, Space slams. P or Esc pauses.' },
    controls: { pad: 'cross', buttons: [{ id: 'rot', label: 'ROTATE' }, { id: 'drop', label: 'DROP' }] },
    keys: { Space: 'drop', KeyX: 'rot', KeyZ: 'ccw', ArrowUp: 'rot', KeyW: 'rot' }, swipe: 'repeat',
    init: function (K) { KK = K; },
    start: function (K) {
      G.board = []; for (var y = 0; y < BR; y++) G.board.push(new Array(BC).fill(null));
      G.queue = []; G.score = 0; G.lines = 0; G.level = 1; G.flashRows = null; G.flashT = 0; G.das = { left: 0, right: 0 }; G.soft = 0; G.levelMsg = 1.2; G.lastSlam = 0; G.aiWait = 0;
      spawn(K);
    },
    onDir: function (d, K, src) {
      if (!G.cur) return;
      if (d === 'left') move(-1, K); else if (d === 'right') move(1, K);
      else if (d === 'up') rotate(1, K);
      else if (d === 'down') { if (src === 'swipe') { if (K.t - G.lastSlam > 0.35) { G.lastSlam = K.t; hardDrop(K); } } else if (fits(G.cur.type, G.cur.rot, G.cur.x, G.cur.y + 1)) { G.cur.y++; G.score += 1; G.fall = 0; } }
    },
    onButton: function (id, K) { if (!G.cur) return; if (id === 'rot') rotate(1, K); else if (id === 'ccw') rotate(-1, K); else if (id === 'drop') { G.lastSlam = K.t; hardDrop(K); } },
    onTap: function (p, K) { if (G.cur) rotate(1, K); },
    ai: function (K) {
      if (!G.cur || G.flashT > 0) return;
      if (G.aiWait > 0) { G.aiWait--; return; }
      var b = bestPlacement(); if (!b) { hardDrop(K); return; }
      var c = G.cur, guard = 0;
      while (c.rot !== b.r && guard++ < 4) if (!rotate(1)) break;
      guard = 0;
      while (c.x !== b.x && guard++ < 12) if (!move(c.x < b.x ? 1 : -1)) break;
      hardDrop(K); G.aiWait = 6;
    },
    update: function (dt, K) {
      if (G.levelMsg > 0) G.levelMsg -= dt;
      if (G.flashT > 0) {
        G.flashT -= dt;
        if (G.flashT <= 0) { G.flashRows.slice().sort(function (a, b) { return a - b; }).forEach(function (y) { G.board.splice(y, 1); G.board.unshift(new Array(BC).fill(null)); }); G.flashRows = null; spawn(K); }
        return;
      }
      if (!G.cur) return;
      ['left', 'right'].forEach(function (d) {
        if (K.input[d]) { G.das[d] += dt; if (G.das[d] > 0.17) { G.das[d] -= 0.05; move(d === 'left' ? -1 : 1); } } else G.das[d] = 0;
      });
      if (K.input.down) { G.soft += dt; if (G.soft > 0.035) { G.soft = 0; if (fits(G.cur.type, G.cur.rot, G.cur.x, G.cur.y + 1)) { G.cur.y++; G.score += 1; G.fall = 0; } } }
      var c = G.cur;
      if (fits(c.type, c.rot, c.x, c.y + 1)) {
        G.lockT = 0; G.fall += dt;
        if (G.fall >= gravity()) { G.fall = 0; c.y++; }
      } else {
        G.lockT += dt;
        if (G.lockT > 0.5) lock(K);
      }
    },
    render: function (c, K) {
      c.fillStyle = '#05040a'; c.fillRect(0, 0, W, H);
      if (!G.board) { G.board = []; for (var y0 = 0; y0 < BR; y0++) G.board.push(new Array(BC).fill(null)); G.score = 0; G.lines = 0; G.level = 1; G.queue = bag(); }
      c.fillStyle = '#0d0a07'; c.fillRect(BXo, BYo, BC * C, BR * C);
      c.strokeStyle = 'rgba(201,160,74,.08)'; c.lineWidth = 1;
      for (var gx = 1; gx < BC; gx++) { c.beginPath(); c.moveTo(BXo + gx * C, BYo); c.lineTo(BXo + gx * C, BYo + BR * C); c.stroke(); }
      for (var gy = 1; gy < BR; gy++) { c.beginPath(); c.moveTo(BXo, BYo + gy * C); c.lineTo(BXo + BC * C, BYo + gy * C); c.stroke(); }
      c.strokeStyle = '#C9A04A'; c.lineWidth = 2; c.strokeRect(BXo - 1, BYo - 1, BC * C + 2, BR * C + 2);
      for (var y = 0; y < BR; y++) for (var x = 0; x < BC; x++) if (G.board[y][x]) {
        var fl = G.flashRows && G.flashRows.indexOf(y) >= 0;
        block(c, BXo + x * C, BYo + y * C, fl ? '#fff6dc' : COL[G.board[y][x]], C);
      }
      if (G.cur && K.state !== 'title') {
        var gyy = ghostY();
        cells(G.cur.type, G.cur.rot).forEach(function (p) { var yy = gyy + p[1]; if (yy >= 0) { c.strokeStyle = COL[G.cur.type]; c.globalAlpha = 0.45; c.lineWidth = 2; c.strokeRect(BXo + (G.cur.x + p[0]) * C + 2, BYo + yy * C + 2, C - 4, C - 4); c.globalAlpha = 1; } });
        cells(G.cur.type, G.cur.rot).forEach(function (p) { var yy = G.cur.y + p[1]; if (yy >= 0) block(c, BXo + (G.cur.x + p[0]) * C, BYo + yy * C, COL[G.cur.type], C); });
      }
      var sx = BXo + BC * C + 14, sw = W - sx - 6;
      panel(c, sx, BYo, sw, 92, 'NEXT');
      var nt = G.queue && G.queue[0];
      if (nt) { var s = 18, cs = cells(nt, 0), minx = 9, maxx = -1, miny = 9, maxy = -1; cs.forEach(function (p) { minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]); miny = Math.min(miny, p[1]); maxy = Math.max(maxy, p[1]); }); var ox = sx + sw / 2 - (maxx - minx + 1) * s / 2, oy = BYo + 56 - (maxy - miny + 1) * s / 2; cs.forEach(function (p) { block(c, ox + (p[0] - minx) * s, oy + (p[1] - miny) * s, COL[nt], s); }); }
      stat(c, sx, BYo + 104, sw, 'SCORE', G.score);
      stat(c, sx, BYo + 166, sw, 'ROWS', G.lines);
      stat(c, sx, BYo + 228, sw, 'LEVEL', G.level);
      stat(c, sx, BYo + 290, sw, 'BEST', Math.max(K.best, G.score));
      if (G.levelMsg > 0 && K.state === 'play') { c.globalAlpha = Math.min(1, G.levelMsg); K.text('LEVEL ' + G.level, BXo + BC * C / 2, BYo + BR * C * 0.4, 30, '#f6e3a6', 'center'); c.globalAlpha = 1; }
    }
  };
  function panel(c, x, y, w, h, label) { c.fillStyle = '#1a140c'; c.fillRect(x, y, w, h); c.strokeStyle = 'rgba(201,160,74,.7)'; c.lineWidth = 1.5; c.strokeRect(x, y, w, h); KK.text(label, x + w / 2, y + 14, 12, '#E2C06E', 'center'); }
  function stat(c, x, y, w, label, v) { panel(c, x, y, w, 52, label); KK.text(String(v), x + w / 2, y + 35, 19, '#f6e3a6', 'center'); }
  function block(c, x, y, col, s) {
    c.fillStyle = col; c.fillRect(x + 1, y + 1, s - 2, s - 2);
    c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(x + 1, y + 1, s - 2, 3); c.fillRect(x + 1, y + 1, 3, s - 2);
    c.fillStyle = 'rgba(0,0,0,.28)'; c.fillRect(x + 1, y + s - 4, s - 2, 3); c.fillRect(x + s - 4, y + 1, 3, s - 2);
  }
  var K = window.UrwinArcade(cfg);
  if (K.test) K.G = function () { return G; };
})();
