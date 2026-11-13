/* Shared arcade shell. Game pages load this one copy from ../arcade/. */
/* Urwin Arcade kit: canvas sizing, safe areas, touch controls, menus, sound, high score.
   Each game folder carries its own copy so the folder is self-contained. */
(function () {
  'use strict';
  var TEST = /[?&]test=1(&|$)/.test(location.search);
  var DIRS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', KeyA: 'left', KeyD: 'right', KeyW: 'up', KeyS: 'down' };
  var ICON_HOME = '<svg class="hs-home-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 3.2 2.8 11.2a1 1 0 0 0 1.3 1.52L5.2 11.7V20a1 1 0 0 0 1 1h4.3v-5.5h3V21h4.3a1 1 0 0 0 1-1v-8.3l1.1 1.02A1 1 0 1 0 21.2 11L12 3.2z"/></svg>';
  var ARROWS = { up: '&#9650;', down: '&#9660;', left: '&#9664;', right: '&#9654;' };

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, String(v)); } catch (e) { return null; } }

  /* ---------- sound ---------- */
  function Sound() {
    this.ctx = null; this.unlocked = false;
    this.muted = store('urwinArcade.muted') === '1';
  }
  Sound.prototype.unlock = function () {
    if (this.unlocked) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.gain.value = 0.22; this.master.connect(this.ctx.destination); this.unlocked = true; if (this.ctx.state === 'suspended') this.ctx.resume(); } catch (e) {}
  };
  Sound.prototype.tone = function (f, d, type, f2, vol, delay) {
    if (!this.unlocked || this.muted || !this.ctx) return;
    var c = this.ctx, t = c.currentTime + (delay || 0);
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + d);
    g.gain.setValueAtTime(vol || 0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + d + 0.02);
  };
  Sound.prototype.noise = function (d, vol) {
    if (!this.unlocked || this.muted || !this.ctx) return;
    var c = this.ctx, n = Math.floor(c.sampleRate * d), b = c.createBuffer(1, n, c.sampleRate), ch = b.getChannelData(0);
    for (var i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n);
    var s = c.createBufferSource(), g = c.createGain(); s.buffer = b; g.gain.value = vol || 0.4;
    s.connect(g); g.connect(this.master); s.start();
  };
  Sound.prototype.play = function (name) {
    switch (name) {
      case 'blip': this.tone(660, 0.06, 'square', 0, 0.3); break;
      case 'eat': this.tone(520, 0.07, 'square', 880, 0.35); break;
      case 'chomp': this.tone(300, 0.05, 'triangle', 180, 0.4); break;
      case 'bounce': this.tone(440, 0.05, 'square', 0, 0.3); break;
      case 'brick': this.tone(720, 0.06, 'square', 980, 0.3); break;
      case 'shoot': this.tone(900, 0.09, 'square', 300, 0.25); break;
      case 'hop': this.tone(380, 0.06, 'triangle', 620, 0.4); break;
      case 'boom': this.noise(0.25, 0.5); this.tone(160, 0.25, 'sawtooth', 50, 0.3); break;
      case 'hit': this.noise(0.4, 0.6); this.tone(220, 0.4, 'sawtooth', 40, 0.4); break;
      case 'power': this.tone(300, 0.3, 'square', 1200, 0.3); break;
      case 'line': this.tone(523, 0.08, 'square', 0, 0.3); this.tone(659, 0.08, 'square', 0, 0.3, 0.08); this.tone(784, 0.12, 'square', 0, 0.3, 0.16); break;
      case 'level': [523, 659, 784, 1047].forEach(function (f, i) { this.tone(f, 0.12, 'square', 0, 0.3, i * 0.1); }, this); break;
      case 'over': [392, 330, 262, 196].forEach(function (f, i) { this.tone(f, 0.2, 'triangle', 0, 0.45, i * 0.18); }, this); break;
      case 'start': this.tone(392, 0.08, 'square', 0, 0.3); this.tone(784, 0.12, 'square', 0, 0.3, 0.09); break;
    }
  };

  /* ---------- kit ---------- */
  window.UrwinArcade = function (cfg) {
    var K = {
      cfg: cfg, state: 'title', input: { left: false, right: false, up: false, down: false, btn: {} },
      sound: new Sound(), speed: 1, autoplay: false, test: TEST, t: 0,
      best: parseInt(store('urwinArcade.' + cfg.id + '.best') || '0', 10) || 0,
      view: { x: 0, y: 0, s: 1 }, W: 0, H: 0, layout: 'desk', touch: false
    };
    var root = document.body;
    var canvas = el('canvas'); canvas.id = 'game'; canvas.setAttribute('aria-label', cfg.title + ' game');
    var ctx = canvas.getContext('2d');
    var safe = el('div'); safe.id = 'safe';
    root.appendChild(canvas); root.appendChild(safe);

    var home = el('a', 'hs-home hs-home--float', ICON_HOME + '<span class="hs-home-label">Home</span>');
    home.href = '../'; home.setAttribute('data-hs-home', ''); home.setAttribute('aria-label', 'Urwin Homeschool home'); home.setAttribute('data-hs-playing', '0');
    root.appendChild(home);

    var topR = el('div', 'ua-topr');
    var muteBtn = el('button', 'ua-chip ua-mute'); muteBtn.setAttribute('aria-label', 'Sound on or off');
    var pauseBtn = el('button', 'ua-chip ua-pause', 'II'); pauseBtn.setAttribute('aria-label', 'Pause');
    topR.appendChild(muteBtn); topR.appendChild(pauseBtn); root.appendChild(topR);

    /* touch controls */
    var pad = el('div', 'ua-pad'), btns = el('div', 'ua-btns');
    var ctrl = cfg.controls || {};
    var padKeys = ctrl.pad === 'lr' ? ['left', 'right'] : ctrl.pad === false ? [] : ['up', 'left', 'right', 'down'];
    var padEls = {};
    padKeys.forEach(function (d) {
      var b = el('button', 'ua-tb ua-d-' + d, ARROWS[d]); b.setAttribute('aria-label', d); b.dataset.dir = d;
      pad.appendChild(b); padEls[d] = b;
    });
    pad.classList.add(ctrl.pad === 'lr' ? 'lr' : 'cross');
    var btnEls = {};
    (ctrl.buttons || []).forEach(function (bd) {
      var b = el('button', 'ua-tb ua-act', bd.label); b.dataset.btn = bd.id; b.setAttribute('aria-label', bd.aria || bd.label);
      btns.appendChild(b); btnEls[bd.id] = b;
    });
    root.appendChild(pad); root.appendChild(btns);

    function holdHandlers(b, on, off) {
      b.addEventListener('pointerdown', function (e) { e.preventDefault(); K.sound.unlock(); try { b.setPointerCapture(e.pointerId); } catch (x) {} b.classList.add('on'); on(); });
      var up = function (e) { b.classList.remove('on'); off(); };
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
      b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    }
    Object.keys(padEls).forEach(function (d) {
      holdHandlers(padEls[d], function () { K.input[d] = true; dirEvent(d, 'touch'); }, function () { K.input[d] = false; });
    });
    Object.keys(btnEls).forEach(function (id) {
      holdHandlers(btnEls[id], function () { K.input.btn[id] = true; btnEvent(id, 'touch'); }, function () { K.input.btn[id] = false; });
    });

    /* overlay menus */
    var ov = el('div', 'ua-ov'); var panel = el('div', 'ua-panel'); ov.appendChild(panel); root.appendChild(ov);

    function dirEvent(d, src) { if (K.state === 'play' && cfg.onDir) cfg.onDir(d, K, src); }
    function btnEvent(id, src) { if (K.state === 'play' && cfg.onButton) cfg.onButton(id, K, src); }

    /* keyboard */
    var keyMap = cfg.keys || {};
    window.addEventListener('keydown', function (e) {
      K.sound.unlock(); K.touchSeen = K.touchSeen;
      var code = e.code;
      if (code === 'KeyP' || code === 'Escape') { e.preventDefault(); if (K.state === 'play') K.pause(); else if (K.state === 'pause') K.resume(); return; }
      if (K.state !== 'play') {
        if (code === 'Enter' || code === 'Space') { e.preventDefault(); if (K.state === 'title' || K.state === 'over') K.newGame(); else if (K.state === 'pause') K.resume(); }
        return;
      }
      if (keyMap[code]) { e.preventDefault(); if (!e.repeat) { K.input.btn[keyMap[code]] = true; btnEvent(keyMap[code], 'key'); } return; }
      var d = DIRS[code];
      if (d) { e.preventDefault(); if (!e.repeat) { K.input[d] = true; dirEvent(d, 'key'); } else if (cfg.keyRepeat) dirEvent(d, 'repeat'); }
    });
    window.addEventListener('keyup', function (e) {
      var code = e.code;
      if (keyMap[code]) K.input.btn[keyMap[code]] = false;
      var d = DIRS[code]; if (d) K.input[d] = false;
    });

    /* canvas gestures: swipe, tap, drag (logical coords) */
    var g = null;
    function toLogical(cx, cy) { return { x: (cx - K.view.x) / K.view.s, y: (cy - K.view.y) / K.view.s }; }
    canvas.addEventListener('pointerdown', function (e) {
      e.preventDefault(); K.sound.unlock();
      if (e.pointerType === 'touch') markTouch();
      g = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), fired: false };
      try { canvas.setPointerCapture(e.pointerId); } catch (x) {}
      if (K.state === 'play' && cfg.onDrag) cfg.onDrag(toLogical(e.clientX, e.clientY), 'start', K);
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!g || g.id !== e.pointerId) return;
      if (K.state === 'play' && cfg.onDrag) cfg.onDrag(toLogical(e.clientX, e.clientY), 'move', K);
      var dx = e.clientX - g.x, dy = e.clientY - g.y, th = 26;
      if (cfg.swipe && !g.fired && (Math.abs(dx) > th || Math.abs(dy) > th)) {
        var d = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
        g.fired = true; dirEvent(d, 'swipe');
        if (cfg.swipe === 'repeat') { g.x = e.clientX; g.y = e.clientY; g.fired = false; }
      }
    });
    function endG(e) {
      if (!g || g.id !== e.pointerId) return;
      var dx = e.clientX - g.x, dy = e.clientY - g.y, dt = performance.now() - g.t;
      if (K.state === 'play') {
        if (cfg.onDrag) cfg.onDrag(toLogical(e.clientX, e.clientY), 'end', K);
        if (!g.fired && Math.abs(dx) < 12 && Math.abs(dy) < 12 && dt < 400 && cfg.onTap) cfg.onTap(toLogical(e.clientX, e.clientY), K);
      }
      g = null;
    }
    canvas.addEventListener('pointerup', endG); canvas.addEventListener('pointercancel', endG);
    ['touchstart', 'touchmove', 'gesturestart'].forEach(function (n) { document.addEventListener(n, function (e) { if (e.target === canvas) e.preventDefault(); }, { passive: false }); });

    function markTouch() { if (!K.touch) { K.touch = true; resize(); } }
    window.addEventListener('pointerdown', function (e) { if (e.pointerType === 'touch') markTouch(); K.sound.unlock(); }, true);

    /* menus */
    function syncMute() { muteBtn.innerHTML = K.sound.muted ? '&#128263;' : '&#128264;'; muteBtn.setAttribute('aria-pressed', K.sound.muted ? 'true' : 'false'); var m = panel.querySelector('[data-act=mute]'); if (m) m.textContent = 'Sound: ' + (K.sound.muted ? 'Off' : 'On'); }
    function toggleMute() { K.sound.unlock(); K.sound.muted = !K.sound.muted; store('urwinArcade.muted', K.sound.muted ? '1' : '0'); syncMute(); if (!K.sound.muted) K.sound.play('blip'); }
    muteBtn.addEventListener('click', toggleMute);
    pauseBtn.addEventListener('click', function () { if (K.state === 'play') K.pause(); else if (K.state === 'pause') K.resume(); });

    function helpHtml() {
      var h = cfg.help || {};
      return '<p class="ua-help">' + (K.touch ? (h.touch || '') : (h.keys || '')) + '</p>';
    }
    function menu(kind, extra) {
      var html = '<div class="ua-lights"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>';
      html += '<p class="ua-eyebrow">Urwin Arcade</p><h1 class="ua-title">' + cfg.title + '</h1>';
      if (kind === 'title') {
        html += '<p class="ua-tag">' + (cfg.tagline || '') + '</p>' + helpHtml();
        html += '<p class="ua-best">Best: <b data-best>' + K.best + '</b></p>';
        html += '<button class="ua-btn ua-primary" data-act="play">Play</button>';
        html += '<div class="ua-row"><button class="ua-btn" data-act="mute">Sound</button><a class="ua-btn" data-act="arcade" href="../arcade/">Back to Arcade</a></div>';
      } else if (kind === 'pause') {
        html += '<p class="ua-sub">Paused</p>' + helpHtml();
        html += '<button class="ua-btn ua-primary" data-act="resume">Resume</button>';
        html += '<div class="ua-row"><button class="ua-btn" data-act="restart">Restart</button><button class="ua-btn" data-act="mute">Sound</button></div>';
        html += '<a class="ua-btn" data-act="arcade" href="../arcade/">Back to Arcade</a>';
      } else if (kind === 'over') {
        html += '<p class="ua-sub">' + (extra.title || 'Game Over') + '</p>';
        html += '<p class="ua-score">Score <b data-final>' + extra.score + '</b></p>';
        html += '<p class="ua-best">' + (extra.newBest ? '<span class="ua-new">New best!</span> ' : '') + 'Best: <b data-best>' + K.best + '</b></p>';
        if (extra.note) html += '<p class="ua-help">' + extra.note + '</p>';
        html += '<button class="ua-btn ua-primary" data-act="play">Play Again</button>';
        html += '<div class="ua-row"><button class="ua-btn" data-act="mute">Sound</button><a class="ua-btn" data-act="arcade" href="../arcade/">Back to Arcade</a></div>';
      }
      panel.innerHTML = html;
      syncMute();
      ov.classList.add('show');
    }
    panel.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return;
      var a = b.getAttribute('data-act');
      K.sound.unlock();
      if (a === 'play' || a === 'restart') { e.preventDefault(); K.newGame(); }
      else if (a === 'resume') { e.preventDefault(); K.resume(); }
      else if (a === 'mute') { e.preventDefault(); toggleMute(); }
    });

    function setState(s) {
      K.state = s;
      home.hidden = (s === 'play');
      document.body.setAttribute('data-state', s);
      pauseBtn.textContent = s === 'pause' ? '\u25B6' : 'II';
      pauseBtn.style.display = (s === 'play' || s === 'pause') ? '' : 'none';
      var showCtl = s === 'play' && K.touch;
      pad.classList.toggle('show', showCtl); btns.classList.toggle('show', showCtl);
      if (s === 'play') ov.classList.remove('show');
      if (s !== 'play') { K.input.left = K.input.right = K.input.up = K.input.down = false; K.input.btn = {}; Array.prototype.forEach.call(document.querySelectorAll('.ua-tb.on'), function (b) { b.classList.remove('on'); }); }
    }
    K.newGame = function () { K.sound.unlock(); cfg.start(K); setState('play'); K.sound.play('start'); };
    K.pause = function () { if (K.state !== 'play') return; setState('pause'); menu('pause'); };
    K.resume = function () { if (K.state !== 'pause') return; setState('play'); };
    K.gameOver = function (score, opt) {
      opt = opt || {};
      var nb = score > K.best;
      if (nb) { K.best = score; store('urwinArcade.' + cfg.id + '.best', score); }
      K.lastScore = score;
      setState('over'); K.sound.play('over');
      menu('over', { score: score, newBest: nb && score > 0, title: opt.title, note: opt.note });
    };
    K.sfx = function (n) { K.sound.play(n); };
    K.storeKey = 'urwinArcade.' + cfg.id + '.best';
    document.addEventListener('visibilitychange', function () { if (document.hidden) K.pause(); });
    window.addEventListener('blur', function () { if (!TEST) K.pause(); });

    /* layout */
    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      var W = window.innerWidth, H = window.innerHeight; K.W = W; K.H = H;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); K.dpr = dpr;
      var cs = getComputedStyle(safe);
      var sa = { t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0 };
      K.safe = sa;
      var touch = K.touch;
      var hasBtns = (ctrl.buttons || []).length > 0, hasPad = padKeys.length > 0;
      var area = { x: sa.l + 8, y: sa.t + 8, w: W - sa.l - sa.r - 16, h: H - sa.t - sa.b - 16 };
      var layout = !touch ? 'desk' : (W > H * 1.15 ? 'side' : 'bottom');
      K.layout = layout; document.body.setAttribute('data-layout', layout);
      var bs, top = 52;
      if (layout === 'side') {
        var availH = H - sa.t - sa.b - 12, availW = W - sa.l - sa.r;
        var col = (availW - cfg.width * (availH / cfg.height)) / 2;
        col = Math.max(W >= 900 ? 230 : 150, Math.min(280, col));
        bs = Math.min(80, col / 3.25, Math.max(50, availH / 5.2));
        area = { x: sa.l + col, y: sa.t + 6, w: W - sa.l - sa.r - col * 2, h: H - sa.t - sa.b - 12 };
        var cy = H - sa.b - 16;
        placePad(sa.l + col / 2, cy - (padKeys.length === 2 ? bs * 0.6 : bs * 1.5), bs);
        placeBtns(W - sa.r - col / 2, cy, bs, 'col');
      } else if (layout === 'bottom') {
        bs = Math.min(72, Math.max(56, W / 6.2));
        var ch = padKeys.length === 4 ? bs * 3 + 16 : bs + 24;
        if (hasBtns && padKeys.length !== 4) ch = Math.max(ch, bs * ((ctrl.buttons.length > 1) ? 2.1 : 1) + 24);
        area = { x: sa.l + 6, y: sa.t + top, w: W - sa.l - sa.r - 12, h: H - sa.t - sa.b - top - ch - 8 };
        var pcx = hasBtns ? sa.l + 16 + (padKeys.length === 4 ? bs * 1.5 : bs * 1.1) : W / 2;
        placePad(pcx, H - sa.b - ch / 2 - 4, bs);
        placeBtns(W - sa.r - 16 - bs * 0.6, H - sa.b - 12, bs, 'stack');
      } else {
        area = { x: sa.l + 12, y: sa.t + top + 4, w: W - sa.l - sa.r - 24, h: H - sa.t - sa.b - top - 16 };
      }
      var s = Math.min(area.w / cfg.width, area.h / cfg.height);
      if (cfg.maxScale) s = Math.min(s, cfg.maxScale);
      K.view = { s: s, x: Math.round(area.x + (area.w - cfg.width * s) / 2), y: Math.round(area.y + (area.h - cfg.height * s) / 2) };
      if (layout !== 'side' || true) { /* keep HUD chips top right */ }
      if (!K.running) draw();
    }
    function placePad(cx, cy, bs) {
      pad.style.left = cx + 'px'; pad.style.top = cy + 'px';
      Object.keys(padEls).forEach(function (d) {
        var b = padEls[d], x = 0, y = 0;
        if (padKeys.length === 2) { x = d === 'left' ? -bs * 0.62 : bs * 0.62; }
        else { x = d === 'left' ? -bs : d === 'right' ? bs : 0; y = d === 'up' ? -bs : d === 'down' ? bs : 0; }
        b.style.width = b.style.height = bs + 'px';
        b.style.left = (x - bs / 2) + 'px'; b.style.top = (y - bs / 2) + 'px';
      });
    }
    function placeBtns(cx, bottom, bs, mode) {
      var list = Object.keys(btnEls);
      list.forEach(function (id, i) {
        var b = btnEls[id], sz = bs * 1.0;
        b.style.width = b.style.height = sz + 'px';
        var x, y;
        if (mode === 'col') { x = cx - sz / 2; y = bottom - sz - i * (sz + 14); }
        else { x = cx - sz / 2 - (list.length > 2 ? (i % 2) * (sz + 10) : 0); y = bottom - sz - (list.length > 2 ? Math.floor(i / 2) : i) * (sz + 12); }
        b.style.left = x + 'px'; b.style.top = y + 'px';
      });
    }
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', function () { setTimeout(resize, 120); });

    /* drawing helpers */
    K.ctx = ctx;
    function draw() {
      var dpr = K.dpr || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#070604'; ctx.fillRect(0, 0, K.W, K.H);
      var v = K.view, w = cfg.width * v.s, h = cfg.height * v.s;
      var gr = ctx.createRadialGradient(K.W / 2, -K.H * 0.1, 10, K.W / 2, 0, K.H);
      gr.addColorStop(0, 'rgba(201,160,74,0.16)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, K.W, K.H);
      ctx.strokeStyle = 'rgba(201,160,74,0.85)'; ctx.lineWidth = 2;
      ctx.strokeRect(v.x - 3, v.y - 3, w + 6, h + 6);
      ctx.strokeStyle = 'rgba(201,160,74,0.3)'; ctx.lineWidth = 1;
      ctx.strokeRect(v.x - 7, v.y - 7, w + 14, h + 14);
      ctx.save();
      ctx.setTransform(dpr * v.s, 0, 0, dpr * v.s, dpr * v.x, dpr * v.y);
      ctx.beginPath(); ctx.rect(0, 0, cfg.width, cfg.height); ctx.clip();
      cfg.render(ctx, K);
      ctx.restore();
    }
    K.draw = draw;
    K.text = function (s, x, y, size, color, align, font) {
      ctx.font = (font || '700 ') + size + 'px ui-rounded, "SF Pro Rounded", system-ui, -apple-system, "Segoe UI", sans-serif';
      ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = color || '#f3dfa8'; ctx.fillText(s, x, y);
    };
    K.rand = function (a, b) { return a + Math.random() * (b - a); };

    /* loop */
    var last = performance.now(), acc = 0, STEP = 1 / 60;
    function frame(now) {
      var dt = Math.min(0.1, (now - last) / 1000); last = now;
      K.t += dt;
      if (K.state === 'play') {
        acc += dt * K.speed;
        var n = 0;
        while (acc >= STEP && n < 600) { acc -= STEP; n++; if (cfg.ai && K.autoplay) cfg.ai(K); cfg.update(STEP, K); if (K.state !== 'play') { acc = 0; break; } }
      } else { acc = 0; if (cfg.idle) cfg.idle(dt, K); }
      draw();
      requestAnimationFrame(frame);
    }

    K.touch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.matchMedia && matchMedia('(pointer: coarse)').matches);
    cfg.init && cfg.init(K);
    setState('title'); menu('title'); resize(); K.running = true;
    requestAnimationFrame(frame);
    if (TEST) {
      window.__arcade = K;
      K.setSpeed = function (s) { K.speed = s; };
    }
    return K;
  };
})();
