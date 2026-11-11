/* Star Defenders: hold the line against marching space drones. */
(function () {
  'use strict';
  var W = 360, H = 520, HUD = 36, SY = 482, GROUND = 500;
  var G = {};
  var TYPES = [
    { col: '#e0503c', pts: 40 }, { col: '#e9b23f', pts: 30 }, { col: '#59b86a', pts: 20 }, { col: '#4b8fe0', pts: 10 }, { col: '#8a6be0', pts: 10 }, { col: '#3fb3b0', pts: 10 }
  ];
  var stars = []; for (var i = 0; i < 60; i++) stars.push({ x: Math.random() * W, y: HUD + Math.random() * (H - HUD), s: Math.random() * 1.5 + 0.3, v: Math.random() * 12 + 4 });

  function startWave() {
    var rows = Math.min(6, 4 + Math.floor((G.level - 1) / 2)), cols = 8;
    G.drones = [];
    var top = HUD + 46 + Math.min(G.level - 1, 5) * 10;
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) G.drones.push({ cx: 30 + c * 36, cy: top + r * 30, type: TYPES[Math.min(r, TYPES.length - 1)], alive: true, r: r, c: c });
    G.total = G.drones.length; G.fx = 0; G.fy = 0; G.dir = 1; G.ebullets = []; G.bullets = []; G.levelMsg = 1.6; G.comet = null; G.cometT = 12;
    if (G.level === 1 || G.level % 3 === 1) buildBunkers();
  }
  function buildBunkers() {
    G.bunk = [];
    for (var b = 0; b < 4; b++) {
      var bx = 30 + b * 88, by = 420;
      for (var y = 0; y < 5; y++) for (var x = 0; x < 9; x++) {
        if (y === 0 && (x === 0 || x === 8)) continue;
        if (y >= 3 && x >= 3 && x <= 5) continue;
        G.bunk.push({ x: bx + x * 5, y: by + y * 5, hp: 2 });
      }
    }
  }
  function alive() { return G.drones.filter(function (d) { return d.alive; }); }
  function pos(d) { return { x: d.cx + G.fx, y: d.cy + G.fy }; }
  function fire(K) { if (G.cool > 0 || G.bullets.length >= 2 || G.respawn > 0) return; G.bullets.push({ x: G.sx, y: SY - 12 }); G.cool = 0.3; K.sfx('shoot'); }

  var cfg = {
    id: 'shooter', title: 'Star Defenders', width: W, height: H,
    tagline: 'Space drones are marching toward Urwin. Blast every one before they land. Each wave comes faster.',
    help: { touch: 'Arrows move your ship. Hold FIRE to shoot. Hide behind the shields.', keys: 'Left and Right arrows (or A and D) move. Space fires. P or Esc pauses.' },
    controls: { pad: 'lr', buttons: [{ id: 'a', label: 'FIRE', aria: 'Fire' }] }, keys: { Space: 'a', KeyX: 'a', KeyJ: 'a' },
    start: function () { G.level = 1; G.score = 0; G.lives = 3; G.sx = W / 2; G.cool = 0; G.respawn = 0; G.parts = []; G.kills = 0; G.target = null; startWave(); },
    onButton: function (id, K) { if (id === 'a') fire(K); },
    onDrag: function (p, phase) { G.target = phase === 'end' ? null : p.x; },
    onTap: function (p, K) { fire(K); },
    ai: function (K) {
      var a = alive(); if (!a.length) return;
      var best = null, bd = 1e9;
      a.forEach(function (d) { var p = pos(d); var dd = Math.abs(p.x - G.sx) - p.y * 0.2; if (dd < bd) { bd = dd; best = p; } });
      var tx = best.x;
      G.ebullets.forEach(function (b) { if (b.y > SY - 120 && Math.abs(b.x - G.sx) < 16) tx = G.sx + (b.x < G.sx ? 40 : -40); });
      G.aiTarget = Math.max(16, Math.min(W - 16, tx));
      K.input.left = G.aiTarget < G.sx - 3; K.input.right = G.aiTarget > G.sx + 3;
      if (Math.abs(best.x - G.sx) < 14) fire(K);
    },
    update: function (dt, K) {
      if (G.levelMsg > 0) G.levelMsg -= dt;
      stars.forEach(function (s) { s.y += s.v * dt; if (s.y > H) { s.y = HUD; s.x = Math.random() * W; } });
      G.cool -= dt;
      if (G.respawn > 0) { G.respawn -= dt; }
      else {
        var sp = 190;
        if (K.input.left) G.sx -= sp * dt; if (K.input.right) G.sx += sp * dt;
        if (G.target != null) { var d = G.target - G.sx; G.sx += Math.max(-sp * 1.4 * dt, Math.min(sp * 1.4 * dt, d)); }
        G.sx = Math.max(16, Math.min(W - 16, G.sx));
        if (K.input.btn.a) fire(K);
      }
      var a = alive();
      var frac = a.length / G.total;
      var vx = (16 + (1 - frac) * 70) * (1 + (G.level - 1) * 0.14);
      G.fx += G.dir * vx * dt;
      var minX = 1e9, maxX = -1e9, maxY = 0;
      a.forEach(function (d) { var p = pos(d); minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); });
      if ((G.dir > 0 && maxX > W - 16) || (G.dir < 0 && minX < 16)) { G.dir *= -1; G.fy += 12; K.sfx('blip'); }
      G.bunk = G.bunk.filter(function (b) { var hit = a.some(function (d) { var p = pos(d); return Math.abs(p.x - b.x - 2) < 14 && Math.abs(p.y - b.y - 2) < 12; }); return !hit; });
      if (maxY > SY - 18) { G.lives = 0; K.sfx('hit'); K.gameOver(G.score, { title: 'They Landed', note: 'You reached Wave ' + G.level + '.' }); return; }
      var rate = (0.7 + G.level * 0.25) * dt;
      if (Math.random() < rate && a.length) {
        var cols = {}; a.forEach(function (d) { if (!cols[d.c] || d.r > cols[d.c].r) cols[d.c] = d; });
        var ks = Object.keys(cols), sh = cols[ks[Math.floor(Math.random() * ks.length)]], p = pos(sh);
        G.ebullets.push({ x: p.x, y: p.y + 10, v: 130 + G.level * 14 });
      }
      G.cometT -= dt;
      if (!G.comet && G.cometT <= 0) { var fromL = Math.random() < 0.5; G.comet = { x: fromL ? -20 : W + 20, v: fromL ? 70 : -70 }; G.cometT = 14 + Math.random() * 8; }
      if (G.comet) { G.comet.x += G.comet.v * dt; if (G.comet.x < -30 || G.comet.x > W + 30) G.comet = null; }
      for (var i = G.bullets.length - 1; i >= 0; i--) {
        var b = G.bullets[i]; b.y -= 420 * dt; var gone = b.y < HUD;
        if (!gone) for (var j = 0; j < a.length; j++) { var p2 = pos(a[j]); if (Math.abs(p2.x - b.x) < 13 && Math.abs(p2.y - b.y) < 11) { a[j].alive = false; G.score += a[j].type.pts; G.kills++; boom(p2.x, p2.y, a[j].type.col); K.sfx('boom'); gone = true; break; } }
        if (!gone && G.comet && Math.abs(G.comet.x - b.x) < 18 && Math.abs(HUD + 18 - b.y) < 10) { G.score += 150; boom(G.comet.x, HUD + 18, '#ffd34d'); G.comet = null; K.sfx('power'); gone = true; }
        if (!gone) gone = hitBunker(b.x, b.y);
        if (gone) G.bullets.splice(i, 1);
      }
      for (var e = G.ebullets.length - 1; e >= 0; e--) {
        var eb = G.ebullets[e]; eb.y += eb.v * dt; var g2 = eb.y > GROUND;
        if (!g2) g2 = hitBunker(eb.x, eb.y);
        if (!g2 && G.respawn <= 0 && Math.abs(eb.x - G.sx) < 13 && eb.y > SY - 10 && eb.y < SY + 10) {
          g2 = true; G.lives--; boom(G.sx, SY, '#f6e3a6'); K.sfx('hit'); G.respawn = 1.2; G.ebullets = [];
          if (G.lives <= 0) { K.gameOver(G.score, { note: 'You reached Wave ' + G.level + '.' }); return; }
          break;
        }
        if (g2) G.ebullets.splice(e, 1);
      }
      G.parts = G.parts.filter(function (p) { p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; return p.t > 0; });
      if (!alive().length) { G.level++; G.score += 100 * G.level; K.sfx('level'); startWave(); }
    },
    render: function (c, K) {
      c.fillStyle = '#05040a'; c.fillRect(0, 0, W, H);
      stars.forEach(function (s) { c.fillStyle = 'rgba(246,227,166,' + (0.3 + s.s / 3) + ')'; c.fillRect(s.x, s.y, s.s, s.s); });
      if (!G.drones) { G.level = 1; G.score = 0; G.lives = 3; G.sx = W / 2; G.parts = []; G.respawn = 0; startWave(); G.levelMsg = 0; }
      var t = K.t;
      alive().forEach(function (d) { var p = pos(d); drone(c, p.x, p.y, d.type.col, d.r, t); });
      c.fillStyle = '#59b86a'; G.bunk.forEach(function (b) { c.globalAlpha = b.hp === 2 ? 1 : 0.55; c.fillRect(b.x, b.y, 5, 5); }); c.globalAlpha = 1;
      if (G.comet) { c.fillStyle = '#ffd34d'; c.beginPath(); c.ellipse(G.comet.x, HUD + 18, 16, 6, 0, 0, 7); c.fill(); c.fillStyle = '#fff6dc'; c.beginPath(); c.arc(G.comet.x, HUD + 14, 5, Math.PI, 0); c.fill(); }
      c.fillStyle = '#fff6dc'; G.bullets.forEach(function (b) { c.fillRect(b.x - 1.5, b.y - 7, 3, 10); });
      c.fillStyle = '#ff8a5c'; G.ebullets.forEach(function (b) { c.beginPath(); c.moveTo(b.x, b.y + 6); c.lineTo(b.x - 3, b.y - 4); c.lineTo(b.x + 3, b.y - 4); c.fill(); });
      if (G.respawn <= 0 || Math.floor(G.respawn * 10) % 2) ship(c, G.sx, SY);
      G.parts.forEach(function (p) { c.globalAlpha = Math.max(0, p.t * 2); c.fillStyle = p.col; c.fillRect(p.x - 1.5, p.y - 1.5, 3, 3); }); c.globalAlpha = 1;
      c.fillStyle = '#C9A04A'; c.fillRect(0, GROUND, W, 2);
      for (var l = 0; l < G.lives; l++) ship(c, 18 + l * 26, GROUND + 11, 0.55);
      c.fillStyle = '#1a140c'; c.fillRect(0, 0, W, HUD); c.fillStyle = '#C9A04A'; c.fillRect(0, HUD - 2, W, 2);
      K.text('SCORE ' + G.score, 10, HUD / 2, 16, '#f6e3a6');
      K.text('WAVE ' + G.level, W / 2, HUD / 2, 16, '#E2C06E', 'center');
      K.text('BEST ' + Math.max(K.best, G.score), W - 10, HUD / 2, 16, '#cbb896', 'right');
      if (G.levelMsg > 0 && K.state === 'play') { c.globalAlpha = Math.min(1, G.levelMsg); K.text('WAVE ' + G.level, W / 2, 330, 34, '#f6e3a6', 'center'); c.globalAlpha = 1; }
    }
  };
  function hitBunker(x, y) {
    for (var i = 0; i < G.bunk.length; i++) { var b = G.bunk[i]; if (x >= b.x - 1 && x <= b.x + 6 && y >= b.y - 4 && y <= b.y + 7) { b.hp--; if (b.hp <= 0) G.bunk.splice(i, 1); return true; } }
    return false;
  }
  function boom(x, y, col) { for (var n = 0; n < 12; n++) G.parts.push({ x: x, y: y, vx: (Math.random() - .5) * 200, vy: (Math.random() - .5) * 200, t: 0.45, col: col }); }
  function ship(c, x, y, s) {
    s = s || 1; c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = '#E2C06E'; c.beginPath(); c.moveTo(0, -13); c.lineTo(5, -4); c.lineTo(14, 6); c.lineTo(14, 10); c.lineTo(-14, 10); c.lineTo(-14, 6); c.lineTo(-5, -4); c.closePath(); c.fill();
    c.fillStyle = '#7fd6ff'; c.beginPath(); c.arc(0, -3, 3.5, 0, 7); c.fill();
    c.fillStyle = '#a37a2c'; c.fillRect(-12, 8, 6, 3); c.fillRect(6, 8, 6, 3);
    c.restore();
  }
  function drone(c, x, y, col, kind, t) {
    var wob = Math.sin(t * 6 + x * 0.1) * 1.5;
    c.save(); c.translate(x, y);
    c.fillStyle = col;
    if (kind % 3 === 0) { c.beginPath(); c.arc(0, 0, 9, Math.PI, 0); c.lineTo(9, 4); c.lineTo(-9, 4); c.fill(); c.fillRect(-11, 2 + wob * 0.5, 4, 5); c.fillRect(7, 2 - wob * 0.5, 4, 5); c.fillRect(-1, -14, 2, 5); c.beginPath(); c.arc(0, -14, 2, 0, 7); c.fill(); }
    else if (kind % 3 === 1) { c.beginPath(); c.moveTo(-12, -2 + wob); c.lineTo(-5, -7); c.lineTo(5, -7); c.lineTo(12, -2 - wob); c.lineTo(8, 6); c.lineTo(-8, 6); c.closePath(); c.fill(); }
    else { c.beginPath(); c.ellipse(0, 0, 11, 7, 0, 0, 7); c.fill(); c.fillRect(-8, 5, 3, 4 + wob); c.fillRect(5, 5, 3, 4 - wob); c.fillRect(-1.5, 5, 3, 3); }
    c.fillStyle = '#05040a'; c.fillRect(-5, -3, 3, 3); c.fillRect(2, -3, 3, 3);
    c.fillStyle = '#fff6dc'; c.fillRect(-4, -3, 1, 1); c.fillRect(3, -3, 1, 1);
    c.restore();
  }
  var K = window.UrwinArcade(cfg);
  if (K.test) K.G = function () { return G; };
})();
