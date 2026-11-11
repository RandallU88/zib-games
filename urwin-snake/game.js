/* Urwin Snake: eat apples, grow, dodge rocks. Gets faster every level. */
(function () {
  'use strict';
  var COLS = 20, ROWS = 22, T = 20, HUD = 40;
  var G = {};
  var OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
  var DV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

  function key(x, y) { return y * COLS + x; }
  function occupied(x, y, skipTail) {
    if (G.rocks[key(x, y)]) return true;
    for (var i = 0; i < G.body.length - (skipTail ? 1 : 0); i++) if (G.body[i].x === x && G.body[i].y === y) return true;
    return false;
  }
  function freeCell() {
    for (var n = 0; n < 500; n++) {
      var x = Math.floor(Math.random() * COLS), y = Math.floor(Math.random() * ROWS);
      if (!occupied(x, y) && !(G.apple && G.apple.x === x && G.apple.y === y)) return { x: x, y: y };
    }
    return { x: 0, y: 0 };
  }
  function interval() { return Math.max(0.055, 0.14 - (G.level - 1) * 0.011); }
  function addRocks() {
    var want = Math.min(26, Math.max(0, (G.level - 2) * 3));
    var h = G.body[0];
    var have = Object.keys(G.rocks).length;
    for (var n = 0; have < want && n < 400; n++) {
      var c = freeCell();
      if (Math.abs(c.x - h.x) + Math.abs(c.y - h.y) < 5) continue;
      if (c.y === h.y) continue;
      G.rocks[key(c.x, c.y)] = 1; have++;
    }
  }

  var cfg = {
    id: 'snake', title: 'Urwin Snake', width: COLS * T, height: ROWS * T + HUD,
    tagline: 'Eat the golden apples and grow as long as you can. Do not bite your tail or hit a wall.',
    help: { touch: 'Swipe on the board or use the arrows to turn. Rocks show up from Level 3.', keys: 'Arrow keys or WASD to turn. P or Esc pauses.' },
    controls: { pad: 'cross', buttons: [] }, swipe: true,
    start: function (K) {
      G.body = [{ x: 7, y: 11 }, { x: 6, y: 11 }, { x: 5, y: 11 }, { x: 4, y: 11 }];
      G.dir = 'right'; G.queue = []; G.rocks = {}; G.level = 1; G.score = 0; G.eaten = 0; G.timer = 0;
      G.apple = null; G.apple = freeCell(); G.bonus = null; G.grow = 0; G.flash = 0; G.dead = false; G.deadT = 0;
      G.levelMsg = 1.4;
    },
    onDir: function (d) {
      var lastDir = G.queue.length ? G.queue[G.queue.length - 1] : G.dir;
      if (d === lastDir || d === OPP[lastDir]) return;
      if (G.queue.length < 3) G.queue.push(d);
    },
    ai: function (K) {
      if (G.timer + 1 / 60 < interval() || G.dead) return;
      var h = G.body[0], target = G.bonus || G.apple;
      var prev = {}, q = [[h.x, h.y]], seen = {}; seen[key(h.x, h.y)] = 1; var found = null;
      while (q.length) {
        var c = q.shift();
        if (c[0] === target.x && c[1] === target.y) { found = c; break; }
        for (var d in DV) {
          var nx = c[0] + DV[d][0], ny = c[1] + DV[d][1];
          if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || seen[key(nx, ny)] || occupied(nx, ny, true)) continue;
          seen[key(nx, ny)] = 1; prev[key(nx, ny)] = [c[0], c[1], d]; q.push([nx, ny]);
        }
      }
      var move = null;
      if (found) { var cur = found; while (prev[key(cur[0], cur[1])]) { var p = prev[key(cur[0], cur[1])]; move = p[2]; if (p[0] === h.x && p[1] === h.y) break; cur = [p[0], p[1]]; } }
      if (!move) { for (var d2 in DV) { var ax = h.x + DV[d2][0], ay = h.y + DV[d2][1]; if (ax >= 0 && ay >= 0 && ax < COLS && ay < ROWS && !occupied(ax, ay, true)) { move = d2; break; } } }
      if (move && move !== OPP[G.dir]) { G.queue = [move]; }
    },
    update: function (dt, K) {
      if (G.levelMsg > 0) G.levelMsg -= dt;
      if (G.flash > 0) G.flash -= dt;
      if (G.dead) { G.deadT += dt; if (G.deadT > 0.9) K.gameOver(G.score, { note: 'Length ' + G.body.length + ', Level ' + G.level }); return; }
      if (G.bonus) { G.bonus.t -= dt; if (G.bonus.t <= 0) G.bonus = null; }
      G.timer += dt;
      if (G.timer < interval()) return;
      G.timer = 0;
      if (G.queue.length) G.dir = G.queue.shift();
      var h = G.body[0], nx = h.x + DV[G.dir][0], ny = h.y + DV[G.dir][1];
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || occupied(nx, ny, G.grow === 0)) { G.dead = true; K.sfx('hit'); return; }
      G.body.unshift({ x: nx, y: ny });
      if (G.grow > 0) G.grow--; else G.body.pop();
      if (nx === G.apple.x && ny === G.apple.y) {
        G.grow += 2; G.eaten++; G.score += 10 * G.level; K.sfx('eat'); G.apple = freeCell();
        if (G.eaten % 6 === 0) { G.level++; G.levelMsg = 1.4; addRocks(); K.sfx('level'); if (G.apple && G.rocks[key(G.apple.x, G.apple.y)]) G.apple = freeCell(); }
        if (!G.bonus && Math.random() < 0.18) { var b = freeCell(); G.bonus = { x: b.x, y: b.y, t: 6 }; }
      } else if (G.bonus && nx === G.bonus.x && ny === G.bonus.y) {
        G.score += 50 * G.level; G.bonus = null; G.grow += 1; G.flash = 0.3; K.sfx('power');
      }
    },
    render: function (c, K) {
      c.fillStyle = '#0d0a07'; c.fillRect(0, 0, cfg.width, cfg.height);
      for (var y = 0; y < ROWS; y++) for (var x = 0; x < COLS; x++) { c.fillStyle = (x + y) % 2 ? '#15110b' : '#120e09'; c.fillRect(x * T, HUD + y * T, T, T); }
      if (!G.body) { drawHud(c, K, 0, 1); return; }
      c.save(); c.translate(0, HUD);
      for (var k in G.rocks) { var rx = (k % COLS) * T, ry = Math.floor(k / COLS) * T; c.fillStyle = '#5b5248'; c.fillRect(rx + 2, ry + 2, T - 4, T - 4); c.fillStyle = '#7b7064'; c.fillRect(rx + 4, ry + 4, T - 10, 5); }
      apple(c, G.apple.x * T + T / 2, G.apple.y * T + T / 2, '#d8402f');
      if (G.bonus && (G.bonus.t > 1.5 || Math.floor(G.bonus.t * 8) % 2)) star(c, G.bonus.x * T + T / 2, G.bonus.y * T + T / 2);
      for (var i = G.body.length - 1; i >= 0; i--) {
        var s = G.body[i], f = i / Math.max(1, G.body.length);
        c.fillStyle = G.dead && Math.floor(G.deadT * 10) % 2 ? '#fff' : (i === 0 ? '#f6e3a6' : 'hsl(' + (44 - f * 10) + ',' + (70 - f * 20) + '%,' + (58 - f * 22) + '%)');
        rr(c, s.x * T + 1, s.y * T + 1, T - 2, T - 2, 5); c.fill();
      }
      var hd = G.body[0], ex = DV[G.dir][0], ey = DV[G.dir][1];
      c.fillStyle = '#1a1208';
      c.beginPath(); c.arc(hd.x * T + T / 2 + ex * 4 - ey * 4, hd.y * T + T / 2 + ey * 4 - ex * 4, 2.4, 0, 7); c.fill();
      c.beginPath(); c.arc(hd.x * T + T / 2 + ex * 4 + ey * 4, hd.y * T + T / 2 + ey * 4 + ex * 4, 2.4, 0, 7); c.fill();
      c.restore();
      if (G.flash > 0) { c.fillStyle = 'rgba(255,230,140,' + G.flash + ')'; c.fillRect(0, HUD, cfg.width, ROWS * T); }
      drawHud(c, K, G.score, G.level);
      if (G.levelMsg > 0 && K.state === 'play') { c.globalAlpha = Math.min(1, G.levelMsg); K.text('LEVEL ' + G.level, cfg.width / 2, HUD + ROWS * T / 2, 34, '#f6e3a6', 'center'); c.globalAlpha = 1; }
    }
  };
  function drawHud(c, K, score, level) {
    c.fillStyle = '#1a140c'; c.fillRect(0, 0, cfg.width, HUD);
    c.fillStyle = '#C9A04A'; c.fillRect(0, HUD - 2, cfg.width, 2);
    K.text('SCORE ' + score, 10, HUD / 2, 17, '#f6e3a6');
    K.text('LV ' + level, cfg.width / 2, HUD / 2, 17, '#E2C06E', 'center');
    K.text('BEST ' + Math.max(K.best, score), cfg.width - 10, HUD / 2, 17, '#cbb896', 'right');
  }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function apple(c, x, y, col) { c.fillStyle = col; c.beginPath(); c.arc(x, y + 1, 7.5, 0, 7); c.fill(); c.fillStyle = '#ffb3a6'; c.beginPath(); c.arc(x - 3, y - 2, 2, 0, 7); c.fill(); c.fillStyle = '#5fae4a'; c.fillRect(x, y - 9, 5, 3); c.fillStyle = '#6b4a22'; c.fillRect(x - 1, y - 9, 2, 4); }
  function star(c, x, y) { c.fillStyle = '#ffd34d'; c.beginPath(); for (var i = 0; i < 10; i++) { var r = i % 2 ? 4 : 9, a = -Math.PI / 2 + i * Math.PI / 5; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } c.closePath(); c.fill(); }
  var K = window.UrwinArcade(cfg);
  if (K.test) K.G = function () { return G; };
})();
