/* Urwin Comic Book: shelf and page-flip reader. Local static preview. */
(function () {
  "use strict";

  var ASSETS = "assets/";
  var data = null;
  var byId = {};
  var current = null; /* { comic, index } */
  var thumbsVisible = true;
  var chromeVisible = true;
  var scale = 1;
  var panX = 0;
  var panY = 0;
  var pointers = new Map();
  var pinchStart = null;
  var swipe = null;
  var SWIPE_MIN = 50;
  var lastTap = { t: 0, x: 0, y: 0 };
  var suppressClick = false;

  var els = {};

  function $(id) { return document.getElementById(id); }

  function pageSrc(page, kind) {
    if (kind === "jpg") return ASSETS + page.jpg;
    if (kind === "thumb") return ASSETS + page.thumb;
    if (kind === "thumbJpg") return ASSETS + page.thumbJpg;
    return ASSETS + page.webp;
  }

  function coverCard(comic) {
    var pages = comic.pageCount === 1 ? "1 page" : comic.pageCount + " pages";
    var a = document.createElement("a");
    a.className = "cover";
    a.href = "#" + comic.id + "/1";
    a.dataset.comic = comic.id;
    a.innerHTML =
      '<span class="cover-art"><picture>' +
      '<source type="image/webp" srcset="' + ASSETS + comic.cover + '">' +
      '<img src="' + ASSETS + comic.coverJpg + '" alt="" width="900" height="1200" loading="lazy">' +
      "</picture></span>" +
      '<span class="cover-body">' +
      '<span class="cover-kicker">' + escapeHtml(comic.kicker) + "</span>" +
      '<span class="cover-title">' + escapeHtml(comic.title) + "</span>" +
      '<span class="cover-meta">' + pages + "</span>" +
      "</span>";
    return a;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderShelf() {
    var singles = $("covers");
    var seriesCovers = $("series-covers");
    singles.innerHTML = "";
    seriesCovers.innerHTML = "";
    var seriesIds = {};
    (data.series || []).forEach(function (s) {
      (s.parts || []).forEach(function (id) { seriesIds[id] = true; });
    });
    data.comics.forEach(function (comic) {
      if (seriesIds[comic.id]) return;
      singles.appendChild(coverCard(comic));
    });
    if (data.series && data.series.length) {
      var series = data.series[0];
      var block = $("series-block");
      block.hidden = false;
      $("series-heading").textContent = series.title;
      $("series-blurb").textContent = series.blurb || "";
      series.parts.forEach(function (id) {
        if (byId[id]) seriesCovers.appendChild(coverCard(byId[id]));
      });
      var actions = $("series-actions");
      actions.innerHTML = "";
      if (series.completeId && data.complete) {
        var link = document.createElement("a");
        link.className = "btn-complete";
        link.href = "#" + series.completeId + "/1";
        link.dataset.comic = series.completeId;
        link.textContent = "Read all " + data.complete.pageCount + " pages";
        actions.appendChild(link);
      }
    }
  }

  function parseHash() {
    var raw = (location.hash || "").replace(/^#/, "").trim();
    if (!raw) return null;
    var parts = raw.split("/");
    var id = decodeURIComponent(parts[0] || "");
    var page = parseInt(parts[1], 10);
    if (!id || !byId[id]) return null;
    if (!isFinite(page) || page < 1) page = 1;
    if (page > byId[id].pages.length) page = byId[id].pages.length;
    return { id: id, page: page };
  }

  function setHash(id, page, replace) {
    var hash = "#" + id + "/" + page;
    if (replace) history.replaceState(null, "", hash);
    else if (location.hash !== hash) history.pushState(null, "", hash);
  }

  function showShelf(opts) {
    var skipHistory = opts && opts.skipHistory;
    current = null;
    resetZoom();
    $("reader").hidden = true;
    $("shelf").hidden = false;
    document.body.classList.remove("reading");
    if (!skipHistory && location.hash) {
      history.pushState(null, "", location.pathname + location.search);
    }
  }

  function openReader(id, page, replace) {
    var comic = byId[id];
    if (!comic) return;
    var index = Math.max(0, Math.min(comic.pages.length - 1, (page || 1) - 1));
    var firstOpen = !current || current.comic.id !== id;
    current = { comic: comic, index: index };
    setHash(id, index + 1, replace || !firstOpen);
    $("shelf").hidden = true;
    $("reader").hidden = false;
    document.body.classList.add("reading");
    $("reader-title").textContent = comic.title;
    if (firstOpen) {
      thumbsVisible = true;
      chromeVisible = true;
      $("reader").classList.remove("is-thumbs-hidden", "is-chrome-hidden");
      $("btn-thumbs").setAttribute("aria-pressed", "true");
      buildThumbs(comic);
    }
    showPage(index, { animate: !firstOpen });
  }

  function buildThumbs(comic) {
    var wrap = $("thumbs");
    wrap.innerHTML = "";
    comic.pages.forEach(function (page, i) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("role", "listitem");
      btn.dataset.index = String(i);
      btn.setAttribute("aria-label", "Page " + (i + 1));
      btn.innerHTML =
        '<img src="' + pageSrc(page, "thumb") + '" alt="" width="54" height="72">' +
        '<span class="tnum">' + (i + 1) + "</span>";
      btn.addEventListener("click", function () {
        if (!current) return;
        resetZoom();
        openReader(current.comic.id, i + 1, true);
      });
      wrap.appendChild(btn);
    });
  }

  function showPage(index, opts) {
    if (!current) return;
    var comic = current.comic;
    index = Math.max(0, Math.min(comic.pages.length - 1, index));
    var dir = 0;
    if (opts && opts.animate && current.index !== index) dir = index > current.index ? 1 : -1;
    current.index = index;
    var page = comic.pages[index];
    var img = $("page-img");
    var webp = $("page-webp");
    var n = index + 1;
    var total = comic.pages.length;
    img.alt = comic.title + ", page " + n + " of " + total;
    img.width = page.width || 900;
    img.height = page.height || 1200;
    webp.srcset = pageSrc(page, "webp");
    img.src = pageSrc(page, "jpg");
    $("page-counter").textContent = "Page " + n + " of " + total;
    $("edge-left").disabled = index === 0;
    $("edge-right").disabled = index === total - 1;
    var thumbs = $("thumbs").querySelectorAll("button");
    thumbs.forEach(function (btn, i) {
      if (i === index) {
        btn.setAttribute("aria-current", "page");
        if (btn.scrollIntoView) btn.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
      } else {
        btn.removeAttribute("aria-current");
      }
    });
    resetZoom();
    if (dir && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      var stage = $("stage");
      stage.style.setProperty("--flip-from", dir > 0 ? "40px" : "-40px");
      stage.style.setProperty("--flip-rot", dir > 0 ? "-10deg" : "10deg");
      stage.classList.remove("turning");
      void stage.offsetWidth;
      stage.classList.add("turning");
      window.setTimeout(function () { stage.classList.remove("turning"); }, 300);
    }
    preloadNeighbors(comic, index);
    setHash(comic.id, n, true);
  }

  function preloadNeighbors(comic, index) {
    [index - 1, index + 1, index + 2].forEach(function (i) {
      if (i < 0 || i >= comic.pages.length) return;
      var pre = new Image();
      pre.src = pageSrc(comic.pages[i], "webp");
    });
  }

  function goDelta(delta) {
    if (!current) return;
    var next = current.index + delta;
    if (next < 0 || next >= current.comic.pages.length) return;
    showPage(next, { animate: true });
  }

  function resetZoom() {
    scale = 1;
    panX = 0;
    panY = 0;
    applyZoom();
  }

  function applyZoom() {
    var el = $("page-zoom");
    if (scale <= 1.02) {
      scale = 1;
      panX = 0;
      panY = 0;
    }
    el.style.transform = "translate(" + panX + "px, " + panY + "px) scale(" + scale + ")";
  }

  function toggleChrome() {
    chromeVisible = !chromeVisible;
    $("reader").classList.toggle("is-chrome-hidden", !chromeVisible);
  }

  function toggleThumbs() {
    thumbsVisible = !thumbsVisible;
    $("reader").classList.toggle("is-thumbs-hidden", !thumbsVisible);
    $("btn-thumbs").setAttribute("aria-pressed", thumbsVisible ? "true" : "false");
  }

  function toggleFullscreen() {
    var root = document.documentElement;
    if (!document.fullscreenElement) {
      if (root.requestFullscreen) root.requestFullscreen().catch(function () {});
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }

  function onFullscreenChange() {
    var on = !!document.fullscreenElement;
    $("btn-full").textContent = on ? "Exit" : "Full";
    $("btn-full").setAttribute("aria-label", on ? "Exit fullscreen" : "Enter fullscreen");
  }

  function pointInside(el, x, y) {
    var r = el.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }

  function bindReaderGestures() {
    var stage = $("stage");

    stage.addEventListener("pointerdown", function (e) {
      if (!current) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        var pts = Array.from(pointers.values());
        var dx = pts[1].x - pts[0].x;
        var dy = pts[1].y - pts[0].y;
        pinchStart = {
          dist: Math.hypot(dx, dy) || 1,
          scale: scale,
          midX: (pts[0].x + pts[1].x) / 2,
          midY: (pts[0].y + pts[1].y) / 2,
          panX: panX,
          panY: panY
        };
        swipe = null;
      } else if (pointers.size === 1) {
        swipe = { x: e.clientX, y: e.clientY, t: Date.now(), moved: false, id: e.pointerId };
        try { stage.setPointerCapture(e.pointerId); } catch (err) {}
      }
    });

    stage.addEventListener("pointermove", function (e) {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size >= 2 && pinchStart) {
        var pts = Array.from(pointers.values());
        var dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y) || 1;
        scale = Math.max(1, Math.min(4, pinchStart.scale * (dist / pinchStart.dist)));
        applyZoom();
        return;
      }
      if (swipe && e.pointerId === swipe.id) {
        var dx = e.clientX - swipe.x;
        var dy = e.clientY - swipe.y;
        if (Math.abs(dx) > 6 || Math.abs(dy) > 6) swipe.moved = true;
        if (scale > 1.02) {
          panX += e.movementX || (pointers.has(e.pointerId) ? dx - (swipe._lastDx || 0) : 0);
          panY += e.movementY || 0;
          swipe._lastDx = dx;
          swipe._lastDy = dy;
          applyZoom();
        }
      }
    });

    function endPointer(e) {
      var wasSwipe = swipe && e.pointerId === swipe.id ? swipe : null;
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchStart = null;
      if (!wasSwipe) return;
      swipe = null;
      var dx = e.clientX - wasSwipe.x;
      var dy = e.clientY - wasSwipe.y;
      var dt = Date.now() - wasSwipe.t;
      if (scale > 1.02) return;
      if (Math.abs(dx) >= SWIPE_MIN && Math.abs(dx) > Math.abs(dy) * 1.15) {
        suppressClick = true;
        if (dx < 0) goDelta(1);
        else goDelta(-1);
        return;
      }
      if (!wasSwipe.moved && dt < 350) {
        var now = Date.now();
        if (now - lastTap.t < 320 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 28) {
          lastTap.t = 0;
          if (scale > 1) resetZoom();
          else {
            scale = 2;
            applyZoom();
          }
          return;
        }
        lastTap = { t: now, x: e.clientX, y: e.clientY };
        var rec = stage.getBoundingClientRect();
        var rel = (e.clientX - rec.left) / rec.width;
        if (rel < 0.22) { suppressClick = true; goDelta(-1); }
        else if (rel > 0.78) { suppressClick = true; goDelta(1); }
        else toggleChrome();
      }
    }

    stage.addEventListener("pointerup", endPointer);
    stage.addEventListener("pointercancel", function (e) {
      pointers.delete(e.pointerId);
      pinchStart = null;
      swipe = null;
    });

    stage.addEventListener("wheel", function (e) {
      if (!current) return;
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        var next = scale * (e.deltaY < 0 ? 1.08 : 0.92);
        scale = Math.max(1, Math.min(4, next));
        applyZoom();
      }
    }, { passive: false });
  }

  function bind() {
    $("btn-shelf").addEventListener("click", function () { showShelf(); });
    $("btn-thumbs").addEventListener("click", toggleThumbs);
    $("btn-full").addEventListener("click", toggleFullscreen);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    $("edge-left").addEventListener("click", function (e) { e.stopPropagation(); goDelta(-1); });
    $("edge-right").addEventListener("click", function (e) { e.stopPropagation(); goDelta(1); });

    document.addEventListener("keydown", function (e) {
      if (!current) return;
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        goDelta(1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        goDelta(-1);
      } else if (e.key === "Escape") {
        if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen();
        else if (scale > 1) resetZoom();
        else showShelf();
      } else if (e.key === "Home" && (e.metaKey || e.ctrlKey) === false && e.target === document.body) {
        e.preventDefault();
        showPage(0, { animate: false });
      } else if (e.key === "End") {
        e.preventDefault();
        showPage(current.comic.pages.length - 1, { animate: false });
      }
    });

    function applyRoute() {
      var route = parseHash();
      if (!route) showShelf({ skipHistory: true });
      else openReader(route.id, route.page, true);
    }
    window.addEventListener("hashchange", applyRoute);
    window.addEventListener("popstate", applyRoute);

    bindReaderGestures();
    document.addEventListener("click", function (e) {
      if (!suppressClick) return;
      suppressClick = false;
      e.preventDefault();
      e.stopPropagation();
    }, true);
  }

  function boot() {
    els.covers = $("covers");
    return fetch("comics.json")
      .then(function (r) {
        if (!r.ok) throw new Error("Could not load comics.json");
        return r.json();
      })
      .then(function (json) {
        data = json;
        (data.comics || []).forEach(function (c) { byId[c.id] = c; });
        if (data.complete) byId[data.complete.id] = data.complete;
        renderShelf();
        bind();
        var route = parseHash();
        if (route) openReader(route.id, route.page, true);
      })
      .catch(function (err) {
        console.error(err);
        $("covers").innerHTML = "<p class='series-blurb'>The comics list could not be loaded.</p>";
      });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
