/* Brick Blitz: bounce the ball, break every brick, clear the wall to level up. */
(function () {
  'use strict';
  var W = 360, H = 520, HUD = 36, PY = 488, COLS = 10, BW = 32, BH = 14, GAP = 2, BX = (W - COLS * (BW + GAP)) / 2 + 1, BY = HUD + 40;
  var G = {};
  var ROWCOL = ['#e0503c', '#e8823a', '#e9b23f', '#c9d24a', '#59b86a', '#3fb3b0', '#4b8fe0', '#8a6be0', '#d96bc0'];

  function buildWall(level) {
    var rows = Math.min(9, 4 + level), pat = (level - 1) % 4, out = [];
    for (var r = 0; r < rows; r++) for (var c = 0; c < COLS; c++) {
      var on = true;
      if (pat === 1) on = (r + c) % 2 === 0 || r === 0;
      if (pat === 2) on = Math.abs(c - 4.5) <= r + 0.5;
      if (pat === 3) on = r % 2 === 0 || c % 3 !== 1;
      if (!on) continue;
      var hp = 1;
      if (level >= 2 && r < Math.min(rows - 1, level - 1)) hp = 2;
      if (level >= 4 && r === 0) hp = 3;
      out.push({ x: BX + c * (BW + GAP), y: BY + r * (BH + GAP), hp: hp, max: hp, col: ROWCOL[r % ROWCOL.length] });
    }
    return out;
  }
  function baseSpeed() { return Math.min(470, 250 + (G.level - 1) * 28); }
  function paddleW() { return Math.max(46, 70 - (G.level - 1) * 4) * (G.wide > 0 ? 1.5 : 1); }
  function resetBall() { G.balls = [{ x: G.px, y: PY - 8, vx: 0, vy: 0, stuck: true, r: 5.5 }]; G.stuckT = 0; }
  function launch(b) { if (!b.stuck) return; var a = (Math.random() * 0.6 - 0.3); var s = baseSpeed(); b.vx = Math.sin(a) * s; b.vy = -Math.cos(a) * s; b.stuck = false; }
  function startLevel() { G.bricks = buildWall(G.level); G.drops = []; G.wide = 0; resetBall(); G.levelMsg = 1.5; }

  var cfg = {
    id: 'breakout', title: 'Brick Blitz', width: W, height: H,
    tagline: 'Smash every brick in the wall to move up a level. Tough bricks take more than one hit.',
    help: { touch: 'Drag anywhere on the board to slide the paddle, or use the arrows. Tap or press GO to launch.', keys: 'Left and Right arrows (or A and D) move. Space launches. P or Esc pauses.' },
    controls: { pad: 'lr', buttons: [{ id: 'a', label: 'GO', aria: 'Launch ball' }] }, keys: { Space: 'a', Enter: 'a' },
    start: function (K) { G.level = 1; G.score = 0; G.lives = 3; G.px = W / 2; G.target = null; G.parts = []; G.bricksBroken = 0; startLevel(); },
    onButton: function (id) { if (id === 'a') G.balls.forEach(launch); },
    onTap: function () { G.balls.forEach(launch); },
    onDrag: function (p, phase) { if (phase !== 'end') G.target = p.x; else G.target = null; },
    ai: function () {
      var b = G.balls[0]; if (!b) return;
      if (b.stuck) { G.stuckT += 1 / 60; if (G.stuckT > 0.3) launch(b); return; }
      var low = G.balls.reduce(function (a, c) { return c.y > a.y && c.vy > 0 ? c : a; }, b);
      var tx = low.x;
      if (low.vy > 0) { var t = (PY - low.y) / low.vy, x = low.x + low.vx * t; while (x < 0 || x > W) { x = x < 0 ? -x : 2 * W - x; } tx = x; }
      G.target = tx + (G.bricks.length ? (G.bricks[0].x < tx ? 8 : -8) : 0);
    },
    update: function (dt, K) {
      if (G.levelMsg > 0) G.levelMsg -= dt;
      if (G.wide > 0) G.wide -= dt;
      var pw = paddleW(), sp = 420 + G.level * 10;
      if (G.target != null) { var d = G.target - G.px; G.px += Math.max(-sp * 1.6 * dt, Math.min(sp * 1.6 * dt, d)); }
      if (K.input.left) G.px -= sp * dt; if (K.input.right) G.px += sp * dt;
      G.px = Math.max(pw / 2, Math.min(W - pw / 2, G.px));
      for (var bi = G.balls.length - 1; bi >= 0; bi--) {
        var b = G.balls[bi];
        if (b.stuck) { b.x = G.px; b.y = PY - 8; continue; }
        var steps = Math.ceil(Math.hypot(b.vx, b.vy) * dt / 3);
        for (var s = 0; s < steps; s++) {
          b.x += b.vx * dt / steps; b.y += b.vy * dt / steps;
          if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); K.sfx('bounce'); }
          if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx); K.sfx('bounce'); }
          if (b.y < HUD + b.r) { b.y = HUD + b.r; b.vy = Math.abs(b.vy); K.sfx('bounce'); }
          if (b.vy > 0 && b.y + b.r >= PY - 5 && b.y - b.r <= PY + 5 && Math.abs(b.x - G.px) <= pw / 2 + b.r) {
            var off = (b.x - G.px) / (pw / 2), ang = Math.max(-1, Math.min(1, off)) * 1.05, spd = Math.min(baseSpeed() * 1.35, Math.hypot(b.vx, b.vy) * 1.012);
            b.vx = Math.sin(ang) * spd; b.vy = -Math.abs(Math.cos(ang) * spd); b.y = PY - 5 - b.r; K.sfx('bounce');
          }
          for (var i = G.bricks.length - 1; i >= 0; i--) {
            var k = G.bricks[i];
            var cx = Math.max(k.x, Math.min(b.x, k.x + BW)), cy = Math.max(k.y, Math.min(b.y, k.y + BH));
            var dx = b.x - cx, dy = b.y - cy;
            if (dx * dx + dy * dy > b.r * b.r) continue;
            if (Math.abs(dx) > Math.abs(dy)) b.vx = dx > 0 ? Math.abs(b.vx) : -Math.abs(b.vx); else b.vy = dy > 0 ? Math.abs(b.vy) : -Math.abs(b.vy);
            if (dx === 0 && dy === 0) b.vy = -b.vy;
            k.hp--;
            if (k.hp <= 0) {
              G.bricks.splice(i, 1); G.score += 10 * k.max + G.level * 2; G.bricksBroken++; K.sfx('brick');
              for (var n = 0; n < 6; n++) G.parts.push({ x: k.x + BW / 2, y: k.y + BH / 2, vx: (Math.random() - .5) * 160, vy: (Math.random() - .5) * 160, t: 0.5, col: k.col });
              if (Math.random() < 0.08) G.drops.push({ x: k.x + BW / 2, y: k.y, kind: Math.random() < 0.6 ? 'wide' : 'multi' });
            } else K.sfx('bounce');
            break;
          }
        }
        if (b.y > H + 10) G.balls.splice(bi, 1);
      }
      for (var j = G.drops.length - 1; j >= 0; j--) {
        var dr = G.drops[j]; dr.y += 110 * dt;
        if (dr.y > PY - 8 && dr.y < PY + 8 && Math.abs(dr.x - G.px) < pw / 2 + 8) {
          K.sfx('power');
          if (dr.kind === 'wide') G.wide = 12;
          else if (G.balls[0]) { var o = G.balls[0]; G.balls.push({ x: o.x, y: o.y, vx: -o.vx || 120, vy: o.vy || -baseSpeed(), stuck: o.stuck, r: o.r }); }
          G.drops.splice(j, 1);
        } else if (dr.y > H) G.drops.splice(j, 1);
      }
      G.parts = G.parts.filter(function (p) { p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; return p.t > 0; });
      if (!G.balls.length) {
        G.lives--; K.sfx('hit');
        if (G.lives <= 0) { K.gameOver(G.score, { note: 'You reached Level ' + G.level + '.' }); return; }
        resetBall();
      }
      if (!G.bricks.length) { G.level++; G.score += 100; K.sfx('level'); startLevel(); }
    },
    render: function (c, K) {
      var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#120d08'); g.addColorStop(1, '#070604');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      c.strokeStyle = 'rgba(201,160,74,0.07)'; for (var x = 0; x < W; x += 24) { c.beginPath(); c.moveTo(x, HUD); c.lineTo(x, H); c.stroke(); }
      hud(c, K);
      if (!G.bricks) { G.level = 1; G.bricks = buildWall(1); G.px = W / 2; G.balls = [{ x: W / 2, y: PY - 8, r: 5.5, stuck: true }]; G.parts = []; G.drops = []; G.lives = 3; G.score = 0; G.wide = 0; }
      G.bricks.forEach(function (k) {
        c.fillStyle = k.col; c.globalAlpha = k.hp < k.max ? 0.55 + 0.45 * (k.hp / k.max) : 1;
        c.fillRect(k.x, k.y, BW, BH); c.globalAlpha = 1;
        c.fillStyle = 'rgba(255,255,255,0.28)'; c.fillRect(k.x, k.y, BW, 3);
        c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(k.x, k.y + BH - 3, BW, 3);
        if (k.max > 1) { c.strokeStyle = '#f6e3a6'; c.lineWidth = 1.5; c.strokeRect(k.x + 1, k.y + 1, BW - 2, BH - 2); if (k.hp < k.max) { c.strokeStyle = 'rgba(0,0,0,.6)'; c.beginPath(); c.moveTo(k.x + 8, k.y + 2); c.lineTo(k.x + 14, k.y + 8); c.lineTo(k.x + 11, k.y + 12); c.stroke(); } }
      });
      G.drops.forEach(function (d) { c.fillStyle = d.kind === 'wide' ? '#E2C06E' : '#7fd6ff'; c.beginPath(); c.arc(d.x, d.y, 8, 0, 7); c.fill(); K.text(d.kind === 'wide' ? 'W' : '+', d.x, d.y + 1, 11, '#1a1208', 'center'); });
      G.parts.forEach(function (p) { c.globalAlpha = p.t * 2; c.fillStyle = p.col; c.fillRect(p.x - 2, p.y - 2, 4, 4); }); c.globalAlpha = 1;
      var pw = paddleW();
      var pg = c.createLinearGradient(0, PY - 6, 0, PY + 6); pg.addColorStop(0, '#f6e3a6'); pg.addColorStop(1, '#a37a2c');
      c.fillStyle = pg; rr(c, G.px - pw / 2, PY - 5, pw, 10, 5); c.fill();
      G.balls.forEach(function (b) { c.fillStyle = '#fff6dc'; c.shadowColor = '#E2C06E'; c.shadowBlur = 10; c.beginPath(); c.arc(b.x, b.y, b.r, 0, 7); c.fill(); c.shadowBlur = 0; });
      for (var l = 0; l < G.lives; l++) { c.fillStyle = '#C9A04A'; rr(c, 8 + l * 24, H - 14, 18, 6, 3); c.fill(); }
      if (G.balls[0] && G.balls[0].stuck && K.state === 'play') K.text(K.touch ? 'Tap to launch' : 'Press Space to launch', W / 2, PY - 60, 16, '#cbb896', 'center', '600 ');
      if (G.levelMsg > 0 && K.state === 'play') { c.globalAlpha = Math.min(1, G.levelMsg); K.text('LEVEL ' + G.level, W / 2, H * 0.62, 34, '#f6e3a6', 'center'); c.globalAlpha = 1; }
    }
  };
  function hud(c, K) {
    c.fillStyle = '#1a140c'; c.fillRect(0, 0, W, HUD); c.fillStyle = '#C9A04A'; c.fillRect(0, HUD - 2, W, 2);
    K.text('SCORE ' + (G.score || 0), 10, HUD / 2, 16, '#f6e3a6');
    K.text('LV ' + (G.level || 1), W / 2, HUD / 2, 16, '#E2C06E', 'center');
    K.text('BEST ' + Math.max(K.best, G.score || 0), W - 10, HUD / 2, 16, '#cbb896', 'right');
  }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  var K = window.UrwinArcade(cfg);
  if (K.test) K.G = function () { return G; };
})();
