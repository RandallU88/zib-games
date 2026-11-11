/* Maze Muncher: gobble every glow dot, dodge the Glooms, grab a power gem to turn the tables. */
(function () {
  'use strict';
  var MAP = [
    '###################',
    '#........#........#',
    '#o##.###.#.###.##o#',
    '#.................#',
    '#.##.#.#####.#.##.#',
    '#....#...#...#....#',
    '####.###.#.###.####',
    '####.#.......#.####',
    '####.#.##-##.#.####',
    '.......#GGG#.......',
    '####.#.#####.#.####',
    '####.#.......#.####',
    '####.#.#####.#.####',
    '#........#........#',
    '#.##.###.#.###.##.#',
    '#o.#.....P.....#.o#',
    '##.#.#.#####.#.#.##',
    '#....#...#...#....#',
    '#.######.#.######.#',
    '#.................#',
    '###################'
  ];
  var COLS = 19, ROWS = 21, T = 18, HUD = 36, FOOT = 24, W = COLS * T, H = ROWS * T + HUD + FOOT;
  var DV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }, OPP = { up: 'down', down: 'up', left: 'right', right: 'left' }, ORDER = ['up', 'left', 'down', 'right'];
  var GCOL = ['#e0503c', '#e98ac8', '#3fb3b0', '#e8823a'];
  var DOOR = { x: 9, y: 8 }, EXIT = { x: 9, y: 7 };
  var G = {};

  function wall(x, y, who) {
    if (y === 9 && (x < 0 || x >= COLS)) return false;
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return true;
    var ch = MAP[y][x];
    if (ch === '#') return true;
    if (ch === '-' || ch === 'G') return who !== 'eyes';
    return false;
  }
  function resetDots() { G.dots = {}; G.dotCount = 0; for (var y = 0; y < ROWS; y++) for (var x = 0; x < COLS; x++) { var ch = MAP[y][x]; if (ch === '.' || ch === 'o') { G.dots[y * COLS + x] = ch === 'o' ? 2 : 1; G.dotCount++; } } G.dotTotal = G.dotCount; }
  function pSpeed() { return Math.min(7.4, 5.6 + (G.level - 1) * 0.25); }
  function gSpeed(h) { if (h.mode === 'eyes') return 11; if (G.fright > 0 && h.scared) return 3.2; var s = Math.min(7.6, 4.4 + (G.level - 1) * 0.4); if (h.y === 9 && (h.x < 4 || h.x > 14)) s *= 0.6; return s; }
  function resetActors() {
    G.p = { x: 9, y: 15, dir: 'left', want: 'left', mouth: 0 };
    G.haunts = [0, 1, 2, 3].map(function (i) { return { i: i, x: i === 0 ? EXIT.x : 8 + (i - 1), y: i === 0 ? EXIT.y : 9, dir: 'left', mode: i === 0 ? 'out' : 'home', release: [0, 2.5, 5, 7.5][i] * Math.max(0.4, 1 - (G.level - 1) * 0.15), scared: false }; });
    G.fright = 0; G.modeT = 0; G.chase = false; G.combo = 0; G.dying = 0; G.ready = 1.6;
  }
  function startLevel() { resetDots(); resetActors(); G.fruit = null; G.fruitDone = false; G.clear = 0; }
  function frightTime() { return Math.max(1.6, 7 - (G.level - 1) * 0.8); }

  /* move an actor along the grid; chooser(actor) picks a dir at tile centers */
  function step(a, dist, chooser, who) {
    var guard = 0;
    while (dist > 1e-6 && guard++ < 10) {
      var cx = Math.round(a.x), cy = Math.round(a.y), d;
      if (Math.abs(a.x - cx) < 1e-4 && Math.abs(a.y - cy) < 1e-4) {
        a.x = cx; a.y = cy;
        var nd = chooser(a, cx, cy); if (nd) a.dir = nd;
        d = DV[a.dir];
        if (wall(cx + d[0], cy + d[1], who)) { a.stopped = true; return; }
        a.stopped = false;
        var m = Math.min(dist, 1); a.x += d[0] * m; a.y += d[1] * m; dist -= m;
      } else {
        d = DV[a.dir];
        var pos = d[0] ? a.x : a.y, sgn = d[0] || d[1];
        var rem = sgn > 0 ? Math.ceil(pos) - pos : pos - Math.floor(pos);
        if (rem < 1e-4) rem = 1;
        var m2 = Math.min(dist, rem);
        if (d[0]) a.x += sgn * m2; else a.y += sgn * m2;
        dist -= m2;
        if (m2 === rem) { a.x = Math.round(a.x); a.y = Math.round(a.y); }
      }
      if (a.x < -0.5) a.x += COLS; else if (a.x > COLS - 0.5) a.x -= COLS;
    }
  }
  function playerChoose(a, cx, cy) {
    var w = DV[a.want];
    if (!wall(cx + w[0], cy + w[1], 'p')) return a.want;
    return a.dir;
  }
  function targetFor(h) {
    var p = G.p, px = Math.round(p.x), py = Math.round(p.y);
    if (h.mode === 'eyes') return EXIT;
    if (!G.chase) return [{ x: 17, y: 0 }, { x: 1, y: 0 }, { x: 18, y: 20 }, { x: 0, y: 20 }][h.i];
    if (h.i === 0) return { x: px, y: py };
    if (h.i === 1) { var d = DV[p.dir]; return { x: px + d[0] * 4, y: py + d[1] * 4 }; }
    if (h.i === 2) { var r = G.haunts[0]; return { x: 2 * px - Math.round(r.x), y: 2 * py - Math.round(r.y) }; }
    var dd = Math.hypot(h.x - px, h.y - py); return dd > 7 ? { x: px, y: py } : { x: 0, y: 20 };
  }
  function hauntChoose(h, cx, cy) {
    var opts = ORDER.filter(function (d) { return d !== OPP[h.dir] && !wall(cx + DV[d][0], cy + DV[d][1], h.mode === 'eyes' ? 'eyes' : 'g'); });
    if (!opts.length) return OPP[h.dir];
    if (G.fright > 0 && h.scared && h.mode !== 'eyes') return opts[Math.floor(Math.random() * opts.length)];
    var t = targetFor(h), best = opts[0], bd = 1e9;
    opts.forEach(function (d) { var nx = cx + DV[d][0], ny = cy + DV[d][1], dd = (nx - t.x) * (nx - t.x) + (ny - t.y) * (ny - t.y); if (dd < bd) { bd = dd; best = d; } });
    return best;
  }

  var cfg = {
    id: 'maze', title: 'Maze Muncher', width: W, height: H,
    tagline: 'Gobble every glow dot in the maze. Grab a power gem and the Glooms get scared, so chase them down for big points.',
    help: { touch: 'Swipe on the maze or use the arrows. You can turn early and Muncher will take the next turn.', keys: 'Arrow keys or WASD to steer. P or Esc pauses.' },
    controls: { pad: 'cross', buttons: [] }, swipe: true,
    start: function () { G.level = 1; G.score = 0; G.lives = 3; G.eatenGhosts = 0; G.popups = []; startLevel(); },
    onDir: function (d) { G.p.want = d; if (d === OPP[G.p.dir]) G.p.dir = d; },
    ai: function () {
      if (G.ready > 0 || G.dying > 0) return;
      var p = G.p, px = Math.round(p.x), py = Math.round(p.y);
      var danger = {};
      G.haunts.forEach(function (h) { if (h.mode === 'home' || h.mode === 'eyes' || (G.fright > 0 && h.scared)) return; var hx = Math.round(h.x), hy = Math.round(h.y); var hd = DV[h.dir]; for (var dy = -3; dy <= 3; dy++) for (var dx = -3; dx <= 3; dx++) { var md = Math.abs(dx) + Math.abs(dy), ahead = dx * hd[0] + dy * hd[1] > 0; if (md <= 2 || (md <= 4 && ahead)) danger[(hy + dy) * COLS + ((hx + dx + COLS) % COLS)] = 1; } });
      function bfs(avoid) {
        var start = py * COLS + px, prev = {}, q = [[px, py]], seen = {}; seen[start] = 1;
        while (q.length) {
          var c = q.shift(), k = c[1] * COLS + c[0];
          if (G.dots[k] && k !== start) { var cur = k, first = null; while (prev[cur]) { first = prev[cur][1]; if (prev[cur][0] === start) break; cur = prev[cur][0]; } return first; }
          for (var i = 0; i < 4; i++) { var d = ORDER[i], nx = (c[0] + DV[d][0] + COLS) % COLS, ny = c[1] + DV[d][1], nk = ny * COLS + nx; if (seen[nk] || wall(nx, ny, 'p') || (avoid && danger[nk])) continue; seen[nk] = 1; prev[nk] = [k, d]; q.push([nx, ny]); }
        }
        return null;
      }
      var mv = bfs(true);
      if (!mv) {
        /* no safe dot: run to the reachable tile farthest from every Gloom */
        var best = null, bd = -1;
        ORDER.forEach(function (d) { var nx = (px + DV[d][0] + COLS) % COLS, ny = py + DV[d][1]; if (wall(nx, ny, 'p')) return; var md = 99; G.haunts.forEach(function (h) { if (h.mode === 'out' && !(G.fright > 0 && h.scared)) md = Math.min(md, Math.abs(wrapDx(h.x - nx)) + Math.abs(h.y - ny)); }); if (md > bd) { bd = md; best = d; } });
        mv = best || bfs(false);
      }
      if (mv) { p.want = mv; if (mv === OPP[p.dir]) p.dir = mv; }
    },
    update: function (dt, K) {
      G.popups = G.popups.filter(function (q) { q.t -= dt; return q.t > 0; });
      if (G.clear > 0) { G.clear -= dt; if (G.clear <= 0) { G.level++; K.sfx('level'); startLevel(); } return; }
      if (G.ready > 0) { G.ready -= dt; return; }
      if (G.dying > 0) {
        G.dying -= dt;
        if (G.dying <= 0) { G.lives--; if (G.lives <= 0) { K.gameOver(G.score, { note: 'You reached Level ' + G.level + '.' }); return; } resetActors(); }
        return;
      }
      G.modeT += dt;
      var phase = G.modeT % 27; G.chase = phase > 7;
      if (G.fright > 0) { G.fright -= dt; if (G.fright <= 0) G.haunts.forEach(function (h) { h.scared = false; }); }
      var p = G.p;
      step(p, pSpeed() * dt, playerChoose, 'p');
      p.mouth += dt * (p.stopped ? 0 : 12);
      var k = Math.round(p.y) * COLS + ((Math.round(p.x) + COLS) % COLS);
      if (G.dots[k] && Math.abs(p.x - Math.round(p.x)) < 0.35 && Math.abs(p.y - Math.round(p.y)) < 0.35) {
        var v = G.dots[k]; delete G.dots[k]; G.dotCount--;
        if (v === 2) { G.score += 50; G.fright = frightTime(); G.combo = 0; K.sfx('power'); G.haunts.forEach(function (h) { if (h.mode !== 'eyes') { h.scared = true; if (h.mode === 'out') h.dir = OPP[h.dir]; } }); }
        else { G.score += 10; K.sfx('chomp'); }
        if (!G.fruitDone && G.dotCount < G.dotTotal - 70) { G.fruit = { x: 9, y: 11, t: 9 }; G.fruitDone = true; }
        if (G.dotCount <= 0) { G.clear = 1.6; K.sfx('level'); return; }
      }
      if (G.fruit) { G.fruit.t -= dt; if (G.fruit.t <= 0) G.fruit = null; else if (Math.abs(p.x - G.fruit.x) < 0.6 && Math.abs(p.y - G.fruit.y) < 0.6) { var fv = 200 + G.level * 100; G.score += fv; G.popups.push({ x: G.fruit.x, y: G.fruit.y, s: fv, t: 1 }); G.fruit = null; K.sfx('power'); } }
      G.haunts.forEach(function (h) {
        if (h.mode === 'home') { h.release -= dt; h.bob = (h.bob || 0) + dt; if (h.release <= 0) { h.mode = 'out'; h.x = EXIT.x; h.y = EXIT.y; h.dir = Math.random() < 0.5 ? 'left' : 'right'; } return; }
        step(h, gSpeed(h) * dt, hauntChoose, h.mode === 'eyes' ? 'eyes' : 'g');
        if (h.mode === 'eyes' && Math.abs(h.x - EXIT.x) < 0.1 && Math.abs(h.y - EXIT.y) < 0.1) { h.mode = 'home'; h.x = 9; h.y = 9; h.release = 1; h.scared = false; }
        if (h.mode === 'out' && Math.hypot(wrapDx(h.x - p.x), h.y - p.y) < 0.62) {
          if (G.fright > 0 && h.scared) { h.mode = 'eyes'; h.scared = false; G.combo++; var pts = 200 * Math.pow(2, G.combo - 1); G.score += pts; G.eatenGhosts++; G.popups.push({ x: h.x, y: h.y, s: pts, t: 1 }); K.sfx('eat'); }
          else if (!K.invincible) { G.dying = 1.3; K.sfx('hit'); }
        }
      });
    },
    render: function (c, K) {
      if (!G.dots) { G.level = 1; G.score = 0; G.lives = 3; G.popups = []; startLevel(); G.ready = 0; }
      c.fillStyle = '#05040a'; c.fillRect(0, 0, W, H);
      c.save(); c.translate(0, HUD);
      var flash = G.clear > 0 && Math.floor(G.clear * 6) % 2;
      for (var y = 0; y < ROWS; y++) for (var x = 0; x < COLS; x++) {
        var ch = MAP[y][x];
        if (ch === '#') { c.fillStyle = flash ? '#f6e3a6' : '#2a1e0e'; c.fillRect(x * T, y * T, T, T); c.strokeStyle = flash ? '#fff' : '#C9A04A'; c.lineWidth = 1.5;
          var e = function (dx, dy) { var nx = x + dx, ny = y + dy; return nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || MAP[ny][nx] === '#'; };
          c.beginPath(); if (!e(0, -1)) { c.moveTo(x * T, y * T + 1); c.lineTo(x * T + T, y * T + 1); } if (!e(0, 1)) { c.moveTo(x * T, y * T + T - 1); c.lineTo(x * T + T, y * T + T - 1); } if (!e(-1, 0)) { c.moveTo(x * T + 1, y * T); c.lineTo(x * T + 1, y * T + T); } if (!e(1, 0)) { c.moveTo(x * T + T - 1, y * T); c.lineTo(x * T + T - 1, y * T + T); } c.stroke(); }
        else if (ch === '-') { c.fillStyle = '#e98ac8'; c.fillRect(x * T, y * T + T / 2 - 2, T, 4); }
        var v = G.dots[y * COLS + x];
        if (v === 1) { c.fillStyle = '#f6e3a6'; c.fillRect(x * T + T / 2 - 2, y * T + T / 2 - 2, 4, 4); }
        else if (v === 2 && Math.floor(K.t * 4) % 2) { c.fillStyle = '#7fd6ff'; c.save(); c.translate(x * T + T / 2, y * T + T / 2); c.rotate(Math.PI / 4); c.fillRect(-5, -5, 10, 10); c.restore(); }
      }
      if (G.fruit) { var fx = G.fruit.x * T + T / 2, fy = G.fruit.y * T + T / 2; c.fillStyle = '#d8402f'; c.beginPath(); c.arc(fx, fy + 1, 6.5, 0, 7); c.fill(); c.fillStyle = '#ffd34d'; c.fillRect(fx - 1, fy - 8, 2, 4); c.fillStyle = '#5fae4a'; c.fillRect(fx + 1, fy - 8, 4, 3); }
      muncher(c, G.p, K);
      G.haunts.forEach(function (h) { gloom(c, h, K); });
      G.popups.forEach(function (q) { K.text(String(q.s), q.x * T + T / 2, q.y * T + T / 2 - (1 - q.t) * 10, 12, '#7fd6ff', 'center'); });
      if (G.ready > 0 && K.state === 'play') K.text(G.level > 1 && G.ready > 0 ? 'LEVEL ' + G.level + '  READY' : 'READY', W / 2, 11 * T + T / 2, 18, '#ffd34d', 'center');
      c.restore();
      c.fillStyle = '#1a140c'; c.fillRect(0, 0, W, HUD); c.fillStyle = '#C9A04A'; c.fillRect(0, HUD - 2, W, 2);
      K.text('SCORE ' + G.score, 8, HUD / 2, 15, '#f6e3a6');
      K.text('LV ' + G.level, W / 2, HUD / 2, 15, '#E2C06E', 'center');
      K.text('BEST ' + Math.max(K.best, G.score), W - 8, HUD / 2, 15, '#cbb896', 'right');
      for (var l = 0; l < G.lives; l++) muncher(c, { x: 0, y: 0, dir: 'right', mouth: 1 }, K, 14 + l * 22, HUD + ROWS * T + FOOT / 2, 0.75);
    }
  };
  function wrapDx(d) { if (d > COLS / 2) d -= COLS; if (d < -COLS / 2) d += COLS; return d; }
  function muncher(c, p, K, ox, oy, sc) {
    var x = ox != null ? ox : p.x * T + T / 2, y = oy != null ? oy : p.y * T + T / 2, r = 7.5 * (sc || 1);
    var dying = ox == null && G.dying > 0;
    c.save(); c.translate(x, y);
    if (dying) { c.scale(1, Math.max(0.05, G.dying / 1.3)); c.rotate((1.3 - G.dying) * 8); }
    c.fillStyle = '#ffcf4a'; c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill();
    c.fillStyle = '#e0a52e'; c.beginPath(); c.arc(0, r * 0.25, r * 0.8, 0.2, Math.PI - 0.2); c.fill();
    var d = DV[p.dir], ex = d[0] * r * 0.3, ey = d[1] * r * 0.3;
    c.fillStyle = '#fff'; c.beginPath(); c.arc(-r * 0.35 + ex, -r * 0.25 + ey, r * 0.28, 0, 7); c.arc(r * 0.35 + ex, -r * 0.25 + ey, r * 0.28, 0, 7); c.fill();
    c.fillStyle = '#1a1208'; c.beginPath(); c.arc(-r * 0.35 + ex * 1.4, -r * 0.25 + ey * 1.4, r * 0.13, 0, 7); c.arc(r * 0.35 + ex * 1.4, -r * 0.25 + ey * 1.4, r * 0.13, 0, 7); c.fill();
    var open = Math.abs(Math.sin(p.mouth)) * r * 0.35 + r * 0.08;
    c.fillStyle = '#5a1c10'; c.beginPath(); c.ellipse(ex, r * 0.4 + ey * 0.6, r * 0.38, open, 0, 0, 7); c.fill();
    c.restore();
  }
  function gloom(c, h, K) {
    var x = h.x * T + T / 2, y = h.y * T + T / 2 + (h.mode === 'home' ? Math.sin((h.bob || 0) * 6) * 2 : 0), r = 8;
    var scared = G.fright > 0 && h.scared && h.mode !== 'eyes';
    if (h.mode !== 'eyes') {
      var col = scared ? ((G.fright < 1.5 && Math.floor(K.t * 8) % 2) ? '#f5efe2' : '#3550c8') : GCOL[h.i];
      c.fillStyle = col;
      c.beginPath(); c.moveTo(x - r, y + r); c.lineTo(x - r, y - r * 0.2); c.lineTo(x - r * 0.9, y - r * 1.15); c.lineTo(x - r * 0.4, y - r * 0.75); c.lineTo(x + r * 0.4, y - r * 0.75); c.lineTo(x + r * 0.9, y - r * 1.15); c.lineTo(x + r, y - r * 0.2); c.lineTo(x + r, y + r); c.closePath(); c.fill();
      c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(x - r, y + r - 3, 2 * r, 3);
    }
    var d = DV[h.dir];
    if (scared) { c.fillStyle = '#f6e3a6'; c.fillRect(x - 4, y - 2, 2, 2); c.fillRect(x + 2, y - 2, 2, 2); c.fillRect(x - 4, y + 3, 8, 1.5); return; }
    c.fillStyle = '#fff'; c.fillRect(x - 6, y - 4, 5, 6); c.fillRect(x + 1, y - 4, 5, 6);
    c.fillStyle = '#1a1208'; c.fillRect(x - 5 + d[0] * 1.5, y - 2 + d[1] * 1.5, 2.5, 2.5); c.fillRect(x + 2 + d[0] * 1.5, y - 2 + d[1] * 1.5, 2.5, 2.5);
  }
  var K = window.UrwinArcade(cfg);
  if (K.test) K.G = function () { return G; };
})();
