/* Logic Lane game. Data-driven from puzzles.js. Art paths live in art.js. */
(function () {
  "use strict";

  var ART = window.LOGIC_LANE_ART || {};
  var PUZZLES = window.LOGIC_LANE_PUZZLES || [];
  var PREFIX = "urwinArcade.logic.";
  var MARK = { 0: "blank", 1: "x", 2: "check" };

  var view = "picker";
  var current = null;
  var cells = {};
  var history = [];
  var autoX = true;
  var feedback = { text: "", kind: "" };
  var qPicks = {};
  var qMisses = 0;
  var qWrong = false;
  var lastStars = 0;

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function store(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k);
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, String(v));
    } catch (e) { return null; }
  }
  function bestOf(id) { return parseInt(store(PREFIX + "best." + id) || "0", 10) || 0; }
  function saveBest(id, stars) {
    var prev = bestOf(id);
    if (stars > prev) store(PREFIX + "best." + id, stars);
  }
  function savePlay() {
    if (!current) return;
    store(PREFIX + "play." + current.id, JSON.stringify({ cells: cells, qMisses: qMisses, qPicks: qPicks }));
  }
  function loadPlay(id) {
    try { return JSON.parse(store(PREFIX + "play." + id) || "null"); } catch (e) { return null; }
  }
  function clearPlay(id) { store(PREFIX + "play." + id, null); }

  function applyArt() {
    var css = $("ll-art-css");
    if (!css) return;
    css.textContent =
      ':root{--ll-bg-land:url("' + (ART.bgLandscape || "") + '");' +
      '--ll-bg-port:url("' + (ART.bgPortrait || "") + '");}';
  }

  function catIndex(p, id) {
    for (var i = 0; i < p.categories.length; i++) if (p.categories[i].id === id) return i;
    return -1;
  }
  function catById(p, id) {
    for (var i = 0; i < p.categories.length; i++) if (p.categories[i].id === id) return p.categories[i];
    return null;
  }
  function itemLabel(p, id) {
    for (var i = 0; i < p.categories.length; i++) {
      for (var j = 0; j < p.categories[i].items.length; j++) {
        if (p.categories[i].items[j].id === id) return p.categories[i].items[j].label;
      }
    }
    return id;
  }
  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  function cellKey(c1, i1, c2, i2) {
    var p = current;
    if (catIndex(p, c1) <= catIndex(p, c2)) return c1 + ":" + i1 + "|" + c2 + ":" + i2;
    return c2 + ":" + i2 + "|" + c1 + ":" + i1;
  }
  function getMark(c1, i1, c2, i2) { return cells[cellKey(c1, i1, c2, i2)] || 0; }
  function setMark(c1, i1, c2, i2, v) { cells[cellKey(c1, i1, c2, i2)] = v; }

  function snapshot() { history.push(JSON.stringify(cells)); if (history.length > 80) history.shift(); }
  function undo() {
    if (!history.length) return;
    try { cells = JSON.parse(history.pop() || "{}"); } catch (e) { cells = {}; }
    feedback = { text: "", kind: "" };
    render();
    savePlay();
  }
  function clearGrid() {
    snapshot();
    cells = {};
    feedback = { text: "", kind: "" };
    render();
    savePlay();
  }

  function applyAutoX(cA, iA, cB, iB) {
    var A = catById(current, cA), B = catById(current, cB);
    var i, item;
    for (i = 0; i < B.items.length; i++) {
      item = B.items[i];
      if (item.id !== iB) setMark(cA, iA, cB, item.id, 1);
    }
    for (i = 0; i < A.items.length; i++) {
      item = A.items[i];
      if (item.id !== iA) setMark(cA, item.id, cB, iB, 1);
    }
  }

  function tapCell(key) {
    var parts = key.split("|");
    var a = parts[0].split(":"), b = parts[1].split(":");
    var cA = a[0], iA = a[1], cB = b[0], iB = b[1];
    snapshot();
    var next = ((getMark(cA, iA, cB, iB) || 0) + 1) % 3;
    setMark(cA, iA, cB, iB, next);
    if (autoX && next === 2) applyAutoX(cA, iA, cB, iB);
    feedback = { text: "", kind: "" };
    render();
    savePlay();
  }

  function subgridStatus(catA, catB) {
    var p = current;
    var solPairs = {};
    var people = p.categories[0].items;
    var i, person, left, right, key, v, correct;
    if (catA.id === p.categories[0].id) {
      for (i = 0; i < people.length; i++) {
        person = people[i];
        solPairs[person.id + "|" + p.solution[person.id][catB.id]] = true;
      }
    } else {
      for (i = 0; i < people.length; i++) {
        person = people[i];
        left = p.solution[person.id][catA.id];
        right = p.solution[person.id][catB.id];
        solPairs[left + "|" + right] = true;
      }
    }
    var contradiction = false, complete = true, named = [];
    var rows = catA.items, cols = catB.items, r, c, rowWrong, rowComplete, hasCheck;
    for (r = 0; r < rows.length; r++) {
      rowWrong = false; rowComplete = false; hasCheck = false;
      for (c = 0; c < cols.length; c++) {
        v = getMark(catA.id, rows[r].id, catB.id, cols[c].id);
        key = rows[r].id + "|" + cols[c].id;
        correct = !!solPairs[key];
        if (v === 2) hasCheck = true;
        if (v === 2 && !correct) rowWrong = true;
        if (v === 1 && correct) rowWrong = true;
        if (v === 2 && correct) rowComplete = true;
      }
      if (!rowComplete) complete = false;
      if (rowWrong) {
        contradiction = true;
        named.push(rows[r].label);
      }
    }
    return { contradiction: contradiction, complete: complete, named: named };
  }

  function checkGrid() {
    var p = current;
    var people = p.categories[0];
    var others = p.categories.slice(1);
    var i, st, wrong = [], lower = [], allComplete = true, anyCon = false;
    for (i = 0; i < others.length; i++) {
      st = subgridStatus(people, others[i]);
      if (!st.complete) allComplete = false;
      if (st.contradiction) {
        anyCon = true;
        wrong = wrong.concat(st.named);
      }
    }
    if (others.length === 2) {
      st = subgridStatus(others[0], others[1]);
      if (!st.complete) allComplete = false;
      if (st.contradiction) {
        anyCon = true;
        lower.push(others[0].name + " and " + others[1].name);
      }
    }
    var text, kind;
    if (allComplete && !anyCon) {
      text = "The grid looks right. Now answer the question below.";
      kind = "ok";
    } else if (anyCon) {
      var bits = [];
      if (wrong.length) {
        var uniq = [];
        wrong.forEach(function (n) { if (uniq.indexOf(n) < 0) uniq.push(n); });
        bits.push("These rows still need a closer look: " + uniq.join(", ") + ".");
      }
      if (lower.length) bits.push("A few marks in the " + lower.join(" and ") + " grid don't fit yet.");
      text = bits.join(" ") || "A few marks don't fit yet. Check the clues and try again.";
      kind = "bad";
    } else {
      var any = Object.keys(cells).some(function (k) { return cells[k]; });
      text = any
        ? "Nothing is off so far. Fill in the rest of the grid."
        : "Mark the grid first. Use the clues, then check again.";
      kind = "";
    }
    feedback = { text: text, kind: kind };
    render();
    return { complete: allComplete, contradiction: anyCon };
  }

  function gridFullyCorrect() {
    var r = inspectGrid();
    return r.complete && !r.contradiction;
  }
  function inspectGrid() {
    var p = current;
    if (!p) return { complete: false, contradiction: true };
    var people = p.categories[0];
    var others = p.categories.slice(1);
    var allComplete = true, anyCon = false, i, st;
    for (i = 0; i < others.length; i++) {
      st = subgridStatus(people, others[i]);
      if (!st.complete) allComplete = false;
      if (st.contradiction) anyCon = true;
    }
    if (others.length === 2) {
      st = subgridStatus(others[0], others[1]);
      if (!st.complete) allComplete = false;
      if (st.contradiction) anyCon = true;
    }
    return { complete: allComplete, contradiction: anyCon };
  }

  function answerTargets(p) {
    var labels = [];
    p.categories.forEach(function (cat) {
      cat.items.forEach(function (it) {
        labels.push({ cat: cat, item: it, label: it.label });
      });
    });
    labels.sort(function (a, b) { return b.label.length - a.label.length; });
    var ans = p.answer;
    var used = {};
    var found = [];
    var remaining = ans;
    function tryMatch(lab, text) {
      return new RegExp("(^|[^A-Za-z0-9#])" + escapeRe(lab) + "([^A-Za-z0-9]|$)", "i").exec(text);
    }
    labels.forEach(function (L) {
      if (used[L.cat.id]) return;
      if (tryMatch(L.label, remaining) || tryMatch(L.label, ans)) {
        found.push(L);
        used[L.cat.id] = true;
        remaining = remaining.replace(new RegExp(escapeRe(L.label), "i"), " ");
      }
    });
    remaining.replace(/[,.\s]+/g, " ").trim().split(" ").forEach(function (tok) {
      if (!tok || tok.length < 3) return;
      labels.forEach(function (L) {
        if (used[L.cat.id]) return;
        if (L.label.toLowerCase().indexOf(tok.toLowerCase()) === 0) {
          found.push(L);
          used[L.cat.id] = true;
        }
      });
    });
    return found;
  }

  function questionCorrect() {
    var targets = answerTargets(current);
    if (!targets.length) return false;
    for (var i = 0; i < targets.length; i++) {
      if (qPicks[targets[i].cat.id] !== targets[i].item.id) return false;
    }
    return Object.keys(qPicks).length >= targets.length;
  }

  function pickOption(catId, itemId) {
    qPicks[catId] = itemId;
    qWrong = false;
    var targets = answerTargets(current);
    var ready = targets.every(function (t) { return qPicks[t.cat.id]; });
    if (ready) submitQuestion();
    else render();
  }

  function submitQuestion() {
    if (!questionCorrect()) {
      qMisses += 1;
      qWrong = true;
      feedback = { text: "Not that one. Check the grid and try again.", kind: "bad" };
      render();
      savePlay();
      return;
    }
    var stars = 3;
    if (qMisses > 0) stars = 1;
    else if (!gridFullyCorrect()) stars = 2;
    lastStars = stars;
    saveBest(current.id, stars);
    clearPlay(current.id);
    view = "win";
    render();
  }

  function starsHtml(n) {
    var s = "", i;
    for (i = 1; i <= 3; i++) s += i <= n ? "★" : "☆";
    return s;
  }

  function groupedPuzzles() {
    var kids = ["Logan", "Savannah"];
    var levels = ["Standard", "Advanced"];
    return kids.map(function (kid) {
      return {
        kid: kid,
        levels: levels.map(function (level) {
          return {
            level: level,
            puzzles: PUZZLES.filter(function (p) { return p.kid === kid && p.level === level; })
          };
        })
      };
    });
  }

  function renderPicker() {
    var html = '<div class="ll-hero">';
    if (ART.titleLogo) html += '<img src="' + esc(ART.titleLogo) + '" alt="Logic Lane">';
    else html += "<h1>Logic Lane</h1>";
    html += '<p class="ll-lead">Read the clues, mark the grid, and figure out who used what. Tap a box to cycle through blank, X, and a check. Each person matches one item in each group.</p></div>';
    groupedPuzzles().forEach(function (g) {
      html += '<section class="ll-group"><h2>' + esc(g.kid) + "</h2>";
      g.levels.forEach(function (lv) {
        if (!lv.puzzles.length) return;
        html += '<div class="ll-level"><h3>' + esc(lv.level) + '</h3><div class="ll-cards">';
        lv.puzzles.forEach(function (p) {
          var best = bestOf(p.id);
          var others = p.categories.slice(1).map(function (c) { return c.items.length; }).join(" x ");
          var shape = p.categories[0].items.length + " x " + others;
          html += '<button type="button" class="ll-card" data-puzzle-id="' + esc(p.id) + '">';
          html += '<span class="ll-card-kicker">' + esc(p.level) + " · " + esc(p.shape) + "</span>";
          html += '<span class="ll-card-title">' + esc(p.title) + "</span>";
          html += '<span class="ll-card-meta">' + esc(shape) + " grid · " + p.clues.length + " clues</span>";
          html += '<span class="ll-stars" data-best="' + best + '">' + (best ? starsHtml(best) : "") + "</span>";
          html += "</button>";
        });
        html += "</div></div>";
      });
      html += "</section>";
    });
    $("app").innerHTML = html;
    $("app").setAttribute("data-ll-view", "picker");
    document.querySelectorAll("[data-puzzle-id]").forEach(function (btn) {
      btn.addEventListener("click", function () { openPuzzle(btn.getAttribute("data-puzzle-id")); });
    });
  }

  function renderGrid() {
    var p = current;
    var people = p.categories[0];
    var others = p.categories.slice(1);
    var n = people.items.length;
    var html = '<div class="ll-grid-wrap"><table class="ll-grid" aria-label="Logic grid">';
    html += "<thead>";
    html += '<tr><th class="ll-corner" rowspan="2"></th>';
    others.forEach(function (cat) {
      html += '<th class="ll-cathead" colspan="' + cat.items.length + '">' + esc(cat.name) + "</th>";
    });
    html += "</tr><tr>";
    others.forEach(function (cat) {
      cat.items.forEach(function (it) {
        html += '<th class="ll-colhead"><span class="ll-emoji">' + (it.emoji ? esc(it.emoji) : "") +
          '</span><span class="ll-iname">' + esc(it.label) + "</span></th>";
      });
    });
    html += "</tr></thead><tbody>";
    people.items.forEach(function (person, pi) {
      html += "<tr>";
      html += '<th class="ll-rowhead"><span class="ll-emoji">' + (person.emoji ? esc(person.emoji) : "") +
        "</span> " + esc(person.label) + "</th>";
      others.forEach(function (cat) {
        cat.items.forEach(function (it) {
          html += cellButton(people.id, person.id, person.label, cat.id, it.id, it.label);
        });
      });
      html += "</tr>";
    });
    if (others.length === 2) {
      var A = others[0], B = others[1];
      A.items.forEach(function (aItem, ai) {
        html += "<tr>";
        html += '<th class="ll-rowhead"><span class="ll-emoji">' + (aItem.emoji ? esc(aItem.emoji) : "") +
          "</span> " + esc(aItem.label) + "</th>";
        html += '<td class="ll-blocked" colspan="' + n + '"></td>';
        B.items.forEach(function (bItem) {
          html += cellButton(A.id, aItem.id, aItem.label, B.id, bItem.id, bItem.label);
        });
        html += "</tr>";
      });
    }
    html += "</tbody></table></div>";
    return html;
  }

  function cellButton(cA, iA, lA, cB, iB, lB) {
    var key = cellKey(cA, iA, cB, iB);
    var v = getMark(cA, iA, cB, iB);
    var mark = MARK[v] || "blank";
    var icon = "";
    if (v === 2 && ART.markCheck) icon = '<img src="' + esc(ART.markCheck) + '" alt="">';
    else if (v === 1 && ART.markX) icon = '<img src="' + esc(ART.markX) + '" alt="">';
    var state = mark === "blank" ? "blank" : (mark === "x" ? "X" : "check");
    return '<td><button type="button" class="ll-cell" data-cell="' + esc(key) +
      '" data-mark="' + mark + '" aria-label="' + esc(lA + " and " + lB + ", " + state) +
      '">' + icon + "</button></td>";
  }

  function renderQuestion() {
    var p = current;
    var targets = answerTargets(p);
    var html = '<section class="ll-question"><h2>Question</h2><p class="ll-q-prompt">' + esc(p.question) + "</p>";
    targets.forEach(function (t) {
      html += '<div class="ll-q-part">';
      if (targets.length > 1) html += '<span class="ll-q-part-label">' + esc(t.cat.name) + "</span>";
      html += '<div class="ll-options">';
      t.cat.items.forEach(function (it) {
        var on = qPicks[t.cat.id] === it.id;
        var cls = "ll-option" + (qWrong && on ? " bad" : "");
        html += '<button type="button" class="' + cls + '" data-part="' + esc(t.cat.id) +
          '" data-option="' + esc(it.id) + '" aria-pressed="' + (on ? "true" : "false") + '">' +
          (it.emoji ? esc(it.emoji) + " " : "") + esc(it.label) + "</button>";
      });
      html += "</div></div>";
    });
    if (!targets.length) {
      html += '<p class="ll-help">This question could not be turned into choices. Tell Forge.</p>';
    }
    html += "</section>";
    return html;
  }

  function renderPuzzle() {
    var p = current;
    var wide = p.categories.length > 2 || p.categories[0].items.length >= 4;
    var html = '<button type="button" class="ll-back" data-act="back-puzzles">‹ All puzzles</button>';
    html += '<header class="ll-puzzle-head"><h1>' + esc(p.title) + "</h1>";
    html += '<p class="ll-story">' + esc(p.story) + "</p>";
    html += '<p class="ll-help">Tap a box to cycle through blank, X, and a check. Each person matches one item in each group.</p></header>';
    html += '<div class="ll-puzzle-body">';
    html += '<aside class="ll-clues"><h2>Clues</h2><ol>';
    p.clues.forEach(function (c) { html += "<li>" + esc(c.text) + "</li>"; });
    html += "</ol></aside>";
    html += '<div class="ll-grid-panel">';
    if (wide) html += '<p class="ll-grid-hint">Swipe the grid if you need more room.</p>';
    html += renderGrid() + "</div>";
    html += '<div class="ll-actions">';
    html += '<button type="button" class="ll-btn" data-act="undo">Undo</button>';
    html += '<button type="button" class="ll-btn" data-act="clear">Clear</button>';
    html += '<button type="button" class="ll-btn ll-primary" data-act="check">Check my grid</button>';
    html += '<button type="button" class="ll-btn" data-act="autoX" aria-pressed="' + (autoX ? "true" : "false") + '">Auto-X</button>';
    html += '<span class="ll-toggle-label">When on, a check fills the rest of that row and column with X marks.</span>';
    html += "</div>";
    html += '<p class="ll-feedback' + (feedback.kind ? " " + feedback.kind : "") + '" id="ll-feedback">' + esc(feedback.text) + "</p>";
    html += renderQuestion();
    html += "</div>";
    $("app").innerHTML = html;
    $("app").setAttribute("data-ll-view", "puzzle");
    wirePuzzle();
  }

  function wirePuzzle() {
    document.querySelectorAll(".ll-cell").forEach(function (btn) {
      btn.addEventListener("click", function () { tapCell(btn.getAttribute("data-cell")); });
    });
    document.querySelectorAll("[data-act]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var act = btn.getAttribute("data-act");
        if (act === "undo") undo();
        else if (act === "clear") clearGrid();
        else if (act === "check") checkGrid();
        else if (act === "autoX") {
          autoX = !autoX;
          if (current && current.level === "Standard") store(PREFIX + "autoX", autoX ? "1" : "0");
          render();
        } else if (act === "back-puzzles") {
          view = "picker";
          current = null;
          render();
        } else if (act === "play-another") {
          view = "picker";
          current = null;
          render();
        }
      });
    });
    document.querySelectorAll("[data-option]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        pickOption(btn.getAttribute("data-part"), btn.getAttribute("data-option"));
      });
    });
  }

  function renderWin() {
    var p = current;
    var html = '<div class="ll-win">';
    if (ART.winBadge) html += '<img class="ll-win-badge" src="' + esc(ART.winBadge) + '" alt="">';
    html += "<h1>You figured it out!</h1>";
    html += '<div class="ll-win-stars" data-stars="' + lastStars + '">' + starsHtml(lastStars) + "</div>";
    if (p.explain) {
      html += '<div class="ll-explain"><h2>How it fits</h2><p>' + esc(p.explain) + "</p></div>";
    }
    if (p.solution_text && p.solution_text.length) {
      html += '<div class="ll-recap"><h2>The full match-up</h2><ul>';
      p.solution_text.forEach(function (line) { html += "<li>" + esc(line) + "</li>"; });
      html += "</ul></div>";
    }
    html += '<div class="ll-win-actions">';
    html += '<button type="button" class="ll-btn ll-primary" data-act="play-another">Play another</button>';
    html += '<a class="ll-btn" href="../arcade/">Back to Arcade</a>';
    html += "</div></div>";
    $("app").innerHTML = html;
    $("app").setAttribute("data-ll-view", "win");
    wirePuzzle();
  }

  function openPuzzle(id) {
    var p = null;
    for (var i = 0; i < PUZZLES.length; i++) if (PUZZLES[i].id === id) p = PUZZLES[i];
    if (!p) return;
    current = p;
    view = "puzzle";
    history = [];
    feedback = { text: "", kind: "" };
    qPicks = {};
    qMisses = 0;
    qWrong = false;
    lastStars = 0;
    if (p.level === "Advanced") autoX = false;
    else autoX = store(PREFIX + "autoX") !== "0";
    var saved = loadPlay(id);
    if (saved && saved.cells && !bestNeedsFresh(saved)) {
      cells = saved.cells || {};
      qMisses = saved.qMisses || 0;
      qPicks = saved.qPicks || {};
    } else {
      cells = {};
    }
    render();
  }
  function bestNeedsFresh() { return false; }

  function render() {
    if (view === "picker") renderPicker();
    else if (view === "win") renderWin();
    else renderPuzzle();
  }

  function boot() {
    applyArt();
    var app = $("app");
    if (!app) return;
    if (!PUZZLES.length) {
      app.innerHTML = '<p class="ll-lead">No puzzles loaded.</p>';
      return;
    }
    view = "picker";
    render();
  }

  window.__logicLane = {
    get view() { return view; },
    get puzzle() { return current; },
    get cells() { return cells; },
    get autoX() { return autoX; },
    get qPicks() { return qPicks; },
    get lastStars() { return lastStars; },
    get feedback() { return feedback; },
    puzzles: PUZZLES,
    open: openPuzzle,
    checkGrid: checkGrid,
    answerTargets: answerTargets,
    gridFullyCorrect: function () { return current ? gridFullyCorrect() : false; }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
