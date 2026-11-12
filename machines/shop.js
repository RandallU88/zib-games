/* Simple Machine Shop  -  interactive models.
   Ideal mechanical advantage from OpenStax Physics §9.3 (Urone and Hinrichs).
   No friction is assumed unless a note says otherwise. */
(function () {
  "use strict";

  const stage = document.getElementById("stage");
  const hintEl = document.getElementById("hint");
  const titleEl = document.getElementById("m-title");
  const explainEl = document.getElementById("explain");
  const readoutEl = document.getElementById("readout");
  const formulaEl = document.getElementById("formula");
  const tryBox = document.getElementById("try");
  const tryText = document.getElementById("try-text");
  const tryStatus = document.getElementById("try-status");
  const navBtns = [...document.querySelectorAll(".mnav")];

  const C = {
    wood: "#7A5330", woodDk: "#4A311E", woodLt: "#A07448",
    steel: "#9AA3AD", steelDk: "#3A4148", steelLt: "#D4DAE0",
    brass: "#B08D4F", brassLt: "#D7BE7A",
    rope: "#C4A882", ropeDk: "#8A6E49",
    paper: "#F3E6D0", ink: "#1A1612",
    rust: "#8C4A32", crate: "#6E4326",
    bg: "#2A2118", mark: "#F3DFA8"
  };

  let id = "lever";
  const S = {
    lever: { klass: 1, fulcrum: 0.46, load: 0.16, effort: 0.88, weight: 40 },
    pulley: { mode: "fixed", pull: 0 },
    wheel: { R: 18, r: 6, angle: 0, weight: 40 },
    plane: { height: 40, length: 120, t: 0, weight: 40 },
    wedge: { length: 24, thickness: 6, inset: 2 },
    screw: { r: 4, pitch: 0.5, turns: 0 }
  };

  const NAMES = {
    lever: "Lever",
    pulley: "Pulley",
    wheel: "Wheel and axle",
    plane: "Inclined plane",
    wedge: "Wedge",
    screw: "Screw"
  };

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function fmt(n, d) { const p = Math.pow(10, d); return String(Math.round(n * p) / p); }
  function el(name, attrs, kids) {
    const n = document.createElementNS("http://www.w3.org/2000/svg", name);
    for (const k in attrs) {
      if (attrs[k] == null) continue;
      if (k === "text") n.textContent = attrs[k];
      else n.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(c => n.appendChild(c));
    return n;
  }
  function svgRoot(vb, label) {
    return el("svg", {
      viewBox: vb, role: "img", "aria-label": label,
      preserveAspectRatio: "xMidYMid meet",
      width: "100%", height: "100%"
    });
  }
  function defsWood() {
    const d = el("defs", {});
    const p = el("pattern", { id: "wood", width: 18, height: 48, patternUnits: "userSpaceOnUse" });
    p.appendChild(el("rect", { width: 18, height: 48, fill: C.wood }));
    p.appendChild(el("path", { d: "M2 0c3 12 1 24 4 48M10 0c-2 16 3 28 0 48M16 0c1 14-2 30 1 48", stroke: C.woodDk, "stroke-width": 0.7, fill: "none", opacity: 0.45 }));
    d.appendChild(p);
    const shine = el("linearGradient", { id: "steelG", x1: "0", y1: "0", x2: "0", y2: "1" });
    shine.appendChild(el("stop", { offset: "0%", "stop-color": C.steelLt }));
    shine.appendChild(el("stop", { offset: "45%", "stop-color": C.steel }));
    shine.appendChild(el("stop", { offset: "100%", "stop-color": C.steelDk }));
    d.appendChild(shine);
    const brass = el("linearGradient", { id: "brassG", x1: "0", y1: "0", x2: "1", y2: "1" });
    brass.appendChild(el("stop", { offset: "0%", "stop-color": C.brassLt }));
    brass.appendChild(el("stop", { offset: "100%", "stop-color": C.brass }));
    d.appendChild(brass);
    return d;
  }
  function bench(w, h) {
    const g = el("g", { "pointer-events": "none" });
    g.appendChild(el("rect", { x: 0, y: 0, width: w, height: h, fill: C.bg }));
    g.appendChild(el("rect", { x: 0, y: h - 72, width: w, height: 72, fill: C.woodDk }));
    g.appendChild(el("rect", { x: 0, y: h - 80, width: w, height: 10, fill: C.wood }));
    g.appendChild(el("rect", { x: 0, y: h - 80, width: w, height: 2, fill: C.woodLt, opacity: 0.5 }));
    return g;
  }
  function crate(x, y, w, h, label) {
    const g = el("g", { transform: "translate(" + x + "," + y + ")", "pointer-events": "none" });
    g.appendChild(el("rect", { x: -w / 2, y: -h, width: w, height: h, rx: 2, fill: C.crate, stroke: C.woodDk, "stroke-width": 1.5 }));
    g.appendChild(el("rect", { x: -w / 2 + 4, y: -h + 5, width: w - 8, height: 6, fill: C.woodLt, opacity: 0.35 }));
    g.appendChild(el("path", { d: "M " + (-w / 2) + " " + (-h / 2) + " h " + w, stroke: C.woodDk, "stroke-width": 2 }));
    if (label) g.appendChild(el("text", { x: 0, y: -h / 2 + 5, "text-anchor": "middle", fill: C.paper, "font-size": 11, "font-family": "Source Sans 3,sans-serif", text: label }));
    return g;
  }
  function svgPoint(svg, ev) {
    const pt = svg.createSVGPoint();
    pt.x = ev.clientX; pt.y = ev.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    return pt.matrixTransform(ctm.inverse());
  }
  function makeHot(node, testid) {
    node.classList.add("hot");
    node.setAttribute("tabindex", "0");
    node.setAttribute("data-testid", testid);
    node.style.touchAction = "none";
    return node;
  }
  const dragHandlers = {};
  function onDrag(testid, fn) { dragHandlers[testid] = fn; }

  function stat(k, v, big) {
    const d = document.createElement("div");
    d.className = "stat";
    d.innerHTML = '<span class="k"></span><span class="v' + (big ? " big" : "") + '"></span>';
    d.firstChild.textContent = k;
    d.lastChild.textContent = v;
    return d;
  }
  function rangeCtrl(label, min, max, step, value, onIn) {
    const wrap = document.createElement("div");
    wrap.className = "ctrl";
    const lab = document.createElement("label");
    const inp = document.createElement("input");
    inp.type = "range"; inp.min = min; inp.max = max; inp.step = step; inp.value = value;
    inp.setAttribute("aria-label", label);
    const paint = () => { lab.textContent = label + ": " + inp.value; };
    paint();
    inp.addEventListener("input", () => { paint(); onIn(+inp.value); });
    wrap.append(lab, inp);
    return wrap;
  }
  function segs(opts, cur, onPick) {
    const d = document.createElement("div");
    d.className = "seg";
    opts.forEach(o => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = o.label;
      b.dataset.val = o.val;
      if (o.val === cur) b.classList.add("on");
      b.addEventListener("click", () => onPick(o.val));
      d.appendChild(b);
    });
    return d;
  }

  function leverMA() {
    const L = S.lever, bar = 1;
    const dL = Math.abs(L.load - L.fulcrum) * bar;
    const dE = Math.abs(L.effort - L.fulcrum) * bar;
    const ma = dL < 1e-6 ? 0 : dE / dL;
    return { ma, dL, dE, effortN: ma ? L.weight / ma : Infinity };
  }
  function pulleyN() {
    return S.pulley.mode === "fixed" ? 1 : S.pulley.mode === "movable" ? 2 : 4;
  }
  function wheelMA() { return S.wheel.r ? S.wheel.R / S.wheel.r : 0; }
  function planeMA() { return S.plane.height ? S.plane.length / S.plane.height : 0; }
  function wedgeMA() { return S.wedge.thickness ? S.wedge.length / S.wedge.thickness : 0; }
  function screwMA() { return S.screw.pitch ? (2 * Math.PI * S.screw.r) / S.screw.pitch : 0; }

  function currentMA() {
    if (id === "lever") return leverMA().ma;
    if (id === "pulley") return pulleyN();
    if (id === "wheel") return wheelMA();
    if (id === "plane") return planeMA();
    if (id === "wedge") return wedgeMA();
    if (id === "screw") return screwMA();
    return 0;
  }

  /* ---------- Lever ---------- */
  function drawLever() {
    const W = 800, H = 500;
    const svg = svgRoot("0 0 " + W + " " + H, "A first-class or adjustable lever on a workbench");
    svg.appendChild(defsWood());
    svg.appendChild(bench(W, H));
    const L = S.lever;
    const x0 = 80, x1 = 720, y = 300, len = x1 - x0;
    const xF = x0 + L.fulcrum * len, xL = x0 + L.load * len, xE = x0 + L.effort * len;
    const { ma, dL, dE, effortN } = leverMA();

    // beam
    const beam = el("g", {});
    beam.appendChild(el("rect", { x: x0 - 8, y: y - 16, width: len + 16, height: 32, rx: 4, fill: "url(#wood)", stroke: C.woodDk, "stroke-width": 2 }));
    beam.appendChild(el("rect", { x: x0 - 8, y: y - 16, width: len + 16, height: 6, fill: C.woodLt, opacity: 0.25 }));
    svg.appendChild(beam);

    // fulcrum
    const ful = el("g", {});
    ful.appendChild(el("rect", { x: xF - 48, y: 408, width: 96, height: 14, rx: 2, fill: C.wood, stroke: C.woodDk, "stroke-width": 1.2, "pointer-events": "none" }));
    ful.appendChild(el("path", { d: "M " + (xF - 28) + " 408 L " + xF + " " + (y + 16) + " L " + (xF + 28) + " 408 Z", fill: "url(#steelG)", stroke: C.steelDk, "stroke-width": 1.5 }));
    const fHot = el("rect", { x: xF - 28, y: y + 8, width: 56, height: 120, fill: "transparent" });
    makeHot(fHot, "lever-fulcrum");
    fHot.setAttribute("aria-label", "Fulcrum");
    ful.appendChild(fHot);
    svg.appendChild(ful);

    // load crate
    const load = crate(xL, y - 16, 56, 44, fmt(L.weight, 0) + " N");
    const lHot = el("rect", { x: xL - 36, y: y - 70, width: 72, height: 70, fill: "transparent" });
    makeHot(lHot, "lever-load");
    lHot.setAttribute("aria-label", "Load");
    svg.appendChild(load);
    svg.appendChild(lHot);

    // effort handle
    const eg = el("g", {});
    eg.appendChild(el("circle", { cx: xE, cy: y - 36, r: 16, fill: "url(#brassG)", stroke: C.woodDk, "stroke-width": 1.5 }));
    eg.appendChild(el("path", { d: "M " + xE + " " + (y - 16) + " V " + (y - 20), stroke: C.steelDk, "stroke-width": 3 }));
    eg.appendChild(el("text", { x: xE, y: y - 58, "text-anchor": "middle", fill: C.mark, "font-size": 13, "font-family": "Source Sans 3,sans-serif", text: "You push" }));
    const eHot = el("circle", { cx: xE, cy: y - 36, r: 28, fill: "transparent" });
    makeHot(eHot, "lever-effort");
    eHot.setAttribute("aria-label", "Effort");
    svg.appendChild(eg);
    svg.appendChild(eHot);

    // dimension arms
    const dimY = 456;
    function arm(xa, xb, label, fill) {
      const a = Math.min(xa, xb), b = Math.max(xa, xb);
      const g = el("g", { "pointer-events": "none" });
      g.appendChild(el("path", { d: "M " + a + " " + dimY + " H " + b, stroke: fill, "stroke-width": 1.6 }));
      g.appendChild(el("path", { d: "M " + a + " " + (dimY - 6) + " V " + (dimY + 6) + " M " + b + " " + (dimY - 6) + " V " + (dimY + 6), stroke: fill, "stroke-width": 1.6 }));
      g.appendChild(el("text", { x: (a + b) / 2, y: dimY + 20, "text-anchor": "middle", fill: fill, "font-size": 13, "font-family": "Source Sans 3,sans-serif", text: label }));
      return g;
    }
    svg.appendChild(arm(xF, xL, "Load arm " + fmt(dL * 100, 0) + " cm", "#E2C06E"));
    svg.appendChild(arm(xF, xE, "Effort arm " + fmt(dE * 100, 0) + " cm", "#9FD394"));

    const posOf = ev => clamp((svgPoint(svg, ev).x - x0) / len, 0.06, 0.94);
    onDrag("lever-fulcrum", (p) => {
      const v = clamp((p.x - x0) / len, 0.08, 0.92);
      if (L.klass === 1) {
        const lo = Math.min(L.load, L.effort) + 0.06;
        const hi = Math.max(L.load, L.effort) - 0.06;
        L.fulcrum = clamp(v, lo, hi);
      } else {
        const other = Math.min(L.load, L.effort);
        L.fulcrum = clamp(v, 0.06, other - 0.08);
      }
      render();
    });
    onDrag("lever-load", (p) => {
      const v = clamp((p.x - x0) / len, 0.06, 0.94);
      if (L.klass === 1) {
        if (L.effort > L.fulcrum) L.load = clamp(v, 0.06, L.fulcrum - 0.06);
        else L.load = clamp(v, L.fulcrum + 0.06, 0.94);
      } else if (L.klass === 2) {
        L.load = clamp(v, L.fulcrum + 0.08, L.effort - 0.08);
      } else {
        L.load = clamp(v, L.effort + 0.08, 0.94);
      }
      render();
    });
    onDrag("lever-effort", (p) => {
      const v = clamp((p.x - x0) / len, 0.06, 0.94);
      if (L.klass === 1) {
        if (L.load < L.fulcrum) L.effort = clamp(v, L.fulcrum + 0.06, 0.94);
        else L.effort = clamp(v, 0.06, L.fulcrum - 0.06);
      } else if (L.klass === 2) {
        L.effort = clamp(v, L.load + 0.08, 0.94);
      } else {
        L.effort = clamp(v, L.fulcrum + 0.08, L.load - 0.08);
      }
      render();
    });

    return {
      svg,
      hint: "Drag the fulcrum, the load, and the brass handle. The arms are measured from the fulcrum.",
      title: "Lever",
      explain: "A rigid bar that turns on a fulcrum. A class 1 lever has the fulcrum between you and the load (a crowbar or a seesaw). Class 2 puts the load in the middle (a wheelbarrow). Class 3 puts your effort in the middle (tongs). You gain force when your effort arm is longer than the load arm.",
      formula: "Ideal MA = effort arm ÷ load arm. That is also the load force divided by the effort you need, if there is no friction. The bar here is 100 cm long.",
      paintPanel(box) {
        box.appendChild(segs(
          [{ val: 1, label: "Class 1" }, { val: 2, label: "Class 2" }, { val: 3, label: "Class 3" }],
          L.klass,
          v => {
            L.klass = v;
            if (v === 1) { L.load = 0.16; L.fulcrum = 0.46; L.effort = 0.88; }
            if (v === 2) { L.fulcrum = 0.10; L.load = 0.38; L.effort = 0.90; }
            if (v === 3) { L.fulcrum = 0.10; L.effort = 0.38; L.load = 0.90; }
            render();
          }
        ));
        const { ma, dL, dE, effortN } = leverMA();
        box.appendChild(stat("Ideal MA", fmt(ma, 2), true));
        box.appendChild(stat("Effort arm", fmt(dE * 100, 0) + " cm"));
        box.appendChild(stat("Load arm", fmt(dL * 100, 0) + " cm"));
        box.appendChild(stat("Effort to hold " + fmt(L.weight, 0) + " N", fmt(effortN, 1) + " N"));
      },
      tryThis: {
        text: "Move the fulcrum (and keep class 1) until a 10 N push can hold the 40 N load. You need an ideal MA of 4 or more.",
        ok: () => L.klass === 1 && leverMA().ma >= 4
      }
    };
  }

  /* ---------- Pulley ---------- */
  function drawPulley() {
    const W = 800, H = 500, N = pulleyN();
    const svg = svgRoot("0 0 " + W + " " + H, "A pulley system you can pull");
    svg.appendChild(defsWood());
    svg.appendChild(bench(W, H));
    const P = S.pulley;
    const maxTravel = 110;
    const pull = clamp(P.pull, 0, maxTravel * N);
    P.pull = pull;
    const rise = pull / N;

    // ceiling beam and iron hangers
    svg.appendChild(el("rect", { x: 80, y: 28, width: 640, height: 22, rx: 2, fill: C.wood, stroke: C.woodDk, "stroke-width": 1.5, "pointer-events": "none" }));
    svg.appendChild(el("rect", { x: 80, y: 28, width: 640, height: 6, fill: C.woodLt, opacity: 0.3, "pointer-events": "none" }));

    function sheave(cx, cy, r) {
      const g = el("g", { "pointer-events": "none" });
      g.appendChild(el("circle", { cx, cy, r: r + 5, fill: C.woodDk }));
      g.appendChild(el("circle", { cx, cy, r, fill: C.woodLt, stroke: C.woodDk, "stroke-width": 2 }));
      g.appendChild(el("circle", { cx, cy, r: r - 6, fill: "none", stroke: C.ropeDk, "stroke-width": 3 }));
      g.appendChild(el("circle", { cx, cy, r: 4, fill: "url(#steelG)" }));
      return g;
    }

    const topY = 86;
    const loadY0 = 340;
    const loadY = loadY0 - rise;
    const cx = 400;
    svg.appendChild(el("rect", { x: cx - 8, y: 50, width: 16, height: topY - 52, fill: C.steelDk, "pointer-events": "none" }));

    if (P.mode === "fixed") {
      svg.appendChild(sheave(cx, topY, 28));
      const rope = el("path", {
        d: "M " + (cx - 22) + " " + topY + " V " + loadY + " M " + (cx + 22) + " " + topY + " V " + (140 + pull),
        fill: "none", stroke: C.rope, "stroke-width": 5, "stroke-linecap": "round", "pointer-events": "none"
      });
      svg.appendChild(rope);
      svg.appendChild(crate(cx - 22, loadY, 70, 52, "40 N"));
    } else if (P.mode === "movable") {
      svg.appendChild(sheave(cx, topY, 28));
      const my = loadY - 40;
      svg.appendChild(sheave(cx, my, 26));
      const rope = el("path", {
        d: "M " + (cx - 22) + " " + topY + " V " + my +
           " M " + (cx + 22) + " " + my + " V " + topY + " H " + (cx + 70) + " V " + (150 + pull),
        fill: "none", stroke: C.rope, "stroke-width": 5, "stroke-linecap": "round", "pointer-events": "none"
      });
      svg.appendChild(rope);
      svg.appendChild(el("path", { d: "M " + (cx - 22) + " 54 V " + topY, stroke: C.steel, "stroke-width": 4, "pointer-events": "none" }));
      svg.appendChild(crate(cx, loadY, 70, 52, "40 N"));
    } else {
      svg.appendChild(sheave(cx - 16, topY, 18));
      svg.appendChild(sheave(cx + 16, topY, 18));
      const my = loadY - 44;
      svg.appendChild(sheave(cx - 16, my, 18));
      svg.appendChild(sheave(cx + 16, my, 18));
      const rope = el("path", {
        d: "M " + (cx - 34) + " " + topY + " V " + my +
           " M " + (cx - 16 + 18) + " " + my + " V " + topY +
           " M " + (cx + 16 - 18) + " " + topY + " V " + my +
           " M " + (cx + 34) + " " + my + " V " + topY + " H " + (cx + 90) + " V " + (150 + pull),
        fill: "none", stroke: C.rope, "stroke-width": 4.5, "stroke-linecap": "round", "pointer-events": "none"
      });
      svg.appendChild(rope);
      svg.appendChild(crate(cx, loadY, 70, 52, "40 N"));
    }

    // pull handle
    const hx = P.mode === "fixed" ? cx + 22 : (P.mode === "movable" ? cx + 70 : cx + 90);
    const hy = 150 + pull;
    const handle = el("g", {});
    handle.appendChild(el("line", { x1: hx, y1: hy, x2: hx, y2: hy + 18, stroke: C.rope, "stroke-width": 5, "pointer-events": "none" }));
    handle.appendChild(el("rect", { x: hx - 22, y: hy + 14, width: 44, height: 36, rx: 8, fill: "url(#brassG)", stroke: C.woodDk, "stroke-width": 1.5 }));
    handle.appendChild(el("text", { x: hx, y: hy + 37, "text-anchor": "middle", fill: C.ink, "font-size": 11, "font-weight": "700", "font-family": "Source Sans 3,sans-serif", "pointer-events": "none", text: "PULL" }));
    const hHot = el("rect", { x: hx - 32, y: hy, width: 64, height: 60, fill: "transparent" });
    makeHot(hHot, "pulley-rope");
    hHot.setAttribute("aria-label", "Pull the rope");
    svg.appendChild(handle);
    svg.appendChild(hHot);
    onDrag("pulley-rope", (p, dx, dy) => {
      P.pull = clamp(P.pull + dy, 0, maxTravel * N);
      render();
    });

    svg.appendChild(el("text", { x: 40, y: 470, fill: C.mark, "font-size": 15, "font-family": "Source Sans 3,sans-serif", "pointer-events": "none", text: "You pull " + fmt(pull, 0) + " cm of rope" }));
    svg.appendChild(el("text", { x: 760, y: 470, "text-anchor": "end", fill: C.mark, "font-size": 15, "font-family": "Source Sans 3,sans-serif", "pointer-events": "none", text: "Load rises " + fmt(rise, 0) + " cm" }));

    const loadRise = rise;
    return {
      svg,
      hint: "Pull the brass handle. Watch how far the load rises compared with how far you pull.",
      title: "Pulley",
      explain: "A grooved wheel with a rope. A single fixed pulley only changes the direction of your pull (ideal MA = 1). A movable pulley, and a block and tackle, put more rope segments under the load, so you pull farther and the load feels lighter.",
      formula: "Ideal MA = N, the number of rope segments that support the load. To lift the load 1 cm you pull about N cm of rope. Ideal effort is the load divided by N.",
      paintPanel(box) {
        box.appendChild(segs(
          [{ val: "fixed", label: "Fixed" }, { val: "movable", label: "Movable" }, { val: "block", label: "Block and tackle" }],
          P.mode,
          v => { P.mode = v; P.pull = 0; render(); }
        ));
        box.appendChild(stat("Supporting segments (N)", String(N), true));
        box.appendChild(stat("Ideal MA", String(N)));
        box.appendChild(stat("You pulled", fmt(pull, 0) + " cm of rope"));
        box.appendChild(stat("Load rose", fmt(loadRise, 0) + " cm"));
        box.appendChild(stat("Ideal effort for 40 N", fmt(40 / N, 1) + " N"));
      },
      tryThis: {
        text: "Switch to the block and tackle, then lift the load 20 cm. You should pull about 80 cm of rope.",
        ok: () => P.mode === "block" && (P.pull / 4) >= 20
      }
    };
  }

  /* ---------- Wheel and axle ---------- */
  function drawWheel() {
    const W = 800, H = 500;
    const svg = svgRoot("0 0 " + W + " " + H, "A wheel and axle lifting a bucket");
    svg.appendChild(defsWood());
    svg.appendChild(bench(W, H));
    const w = S.wheel;
    const cx = 340, cy = 210;
    const scale = 8; // px per cm
    const R = w.R * scale, r = w.r * scale;
    const ang = w.angle;

    // timber A-frame
    svg.appendChild(el("polygon", { points: (cx-110)+",420 "+(cx-16)+","+(cy+8)+" "+(cx+16)+","+(cy+8)+" "+(cx+110)+",420", fill: C.woodDk, "pointer-events": "none" }));
    svg.appendChild(el("rect", { x: cx - 86, y: cy - 20, width: 100, height: 40, rx: 4, fill: C.wood, stroke: C.woodDk, "stroke-width": 1.5, "pointer-events": "none" }));

    const wheel = el("g", { transform: "rotate(" + (ang * 180 / Math.PI) + " " + cx + " " + cy + ")" });
    wheel.appendChild(el("circle", { cx, cy, r: R, fill: C.wood, stroke: C.woodDk, "stroke-width": 3 }));
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      wheel.appendChild(el("line", { x1: cx, y1: cy, x2: cx + Math.cos(a) * (R - 8), y2: cy + Math.sin(a) * (R - 8), stroke: C.woodDk, "stroke-width": 3 }));
    }
    wheel.appendChild(el("circle", { cx, cy, r: r, fill: "url(#steelG)", stroke: C.steelDk, "stroke-width": 2 }));
    wheel.appendChild(el("circle", { cx, cy, r: 5, fill: C.steelDk }));
    // grip
    wheel.appendChild(el("circle", { cx: cx, cy: cy - R + 8, r: 10, fill: "url(#brassG)", stroke: C.woodDk, "stroke-width": 1.2 }));
    svg.appendChild(wheel);

    const hit = el("circle", { cx, cy, r: R + 16, fill: "transparent", "pointer-events": "all" });
    makeHot(hit, "wheel-rim");
    hit.setAttribute("aria-label", "Turn the wheel");
    svg.appendChild(hit);
    onDrag("wheel-rim", (p, dx, dy, ev, session) => {
      const a = Math.atan2(p.y - cy, p.x - cx);
      if (session.lastAng == null && session.last) {
        session.lastAng = Math.atan2(session.last.y - cy, session.last.x - cx);
      }
      if (session.lastAng == null) { session.lastAng = a; return; }
      let da = a - session.lastAng;
      if (da > Math.PI) da -= 2 * Math.PI;
      if (da < -Math.PI) da += 2 * Math.PI;
      w.angle += da;
      session.lastAng = a;
      render();
    });

    // rope hangs off the axle drum, like a well winch
    const wound = Math.max(0, w.angle);
    const drop = 200 - (w.r * wound) * scale * 0.45;
    const bx = cx + r + 8;
    const by = cy + clamp(drop, 70, 230);
    svg.appendChild(el("path", { d: "M " + (cx + r) + " " + cy + " V " + by, stroke: C.rope, "stroke-width": 5, fill: "none", "stroke-linecap": "round", "pointer-events": "none" }));
    svg.appendChild(crate(bx, by, 64, 54, "40 N"));

    // radius callouts to the right, clear of the wheel
    const callX = cx + R + 28;
    svg.appendChild(el("path", { d: "M " + cx + " " + cy + " L " + (cx + R) + " " + cy, stroke: C.brassLt, "stroke-width": 1.8, "pointer-events": "none" }));
    svg.appendChild(el("path", { d: "M " + cx + " " + cy + " L " + cx + " " + (cy + r), stroke: "#9FD394", "stroke-width": 1.8, "pointer-events": "none" }));
    svg.appendChild(el("text", { x: cx + R + 8, y: cy - 8, fill: C.mark, "font-size": 15, "font-family": "Source Sans 3,sans-serif", "pointer-events": "none", text: "R " + fmt(w.R, 0) + " cm" }));
    svg.appendChild(el("text", { x: cx + 10, y: cy + r + 22, fill: "#9FD394", "font-size": 15, "font-family": "Source Sans 3,sans-serif", "pointer-events": "none", text: "r " + fmt(w.r, 0) + " cm" }));

    const ma = wheelMA();
    return {
      svg,
      hint: "Drag the wheel to turn it. The axle turns with it. Change the two radii below.",
      title: "Wheel and axle",
      explain: "Two cylinders that turn together around the same center. Force on the large wheel travels a longer arc than a rope wound on the smaller axle, so the axle can pull with a greater force. A steering wheel, a doorknob, and a well winch all work this way.",
      formula: "Ideal MA = R ÷ r, the wheel radius divided by the axle radius. One turn, you move 2πR at the rim and the axle winds 2πr of rope.",
      paintPanel(box) {
        box.appendChild(rangeCtrl("Wheel radius R (cm)", 8, 24, 1, w.R, v => { w.R = v; if (w.R <= w.r + 2) w.R = w.r + 2; render(); }));
        box.appendChild(rangeCtrl("Axle radius r (cm)", 3, 12, 1, w.r, v => { w.r = Math.min(v, w.R - 2); render(); }));
        box.appendChild(stat("Ideal MA", fmt(ma, 2), true));
        box.appendChild(stat("Ideal effort for 40 N", fmt(40 / ma, 1) + " N"));
        box.appendChild(stat("You have turned", fmt((w.angle * 180 / Math.PI) % 360, 0) + "°"));
      },
      tryThis: {
        text: "Set the wheel radius to twice the axle radius (MA = 2), then turn the wheel at least a quarter turn.",
        ok: () => Math.abs(wheelMA() - 2) < 0.05 && Math.abs(w.angle) >= Math.PI / 2
      }
    };
  }

  /* ---------- Inclined plane ---------- */
  function drawPlane() {
    const W = 800, H = 500;
    const svg = svgRoot("0 0 " + W + " " + H, "An inclined plane with a crate you can push");
    svg.appendChild(defsWood());
    svg.appendChild(bench(W, H));
    const P = S.plane;
    const L = P.length, h = P.height;
    const scale = Math.min(620 / L, 280 / h);
    const rw = L * scale, rh = h * scale;
    const baseX = 110, baseY = 400;

    const sx = baseX, sy = baseY - rh, ex = baseX + rw, ey = baseY;
    // platform and ramp body
    svg.appendChild(el("rect", { x: sx - 70, y: sy - 14, width: 80, height: rh + 14, fill: C.woodDk, "pointer-events": "none" }));
    svg.appendChild(el("rect", { x: sx - 80, y: sy - 22, width: 90, height: 16, fill: C.wood, stroke: C.woodDk, "pointer-events": "none" }));
    svg.appendChild(el("polygon", { points: sx + "," + sy + " " + ex + "," + ey + " " + sx + "," + ey, fill: C.wood, stroke: C.woodDk, "stroke-width": 2, "pointer-events": "none" }));
    svg.appendChild(el("line", { x1: sx, y1: sy, x2: ex, y2: ey, stroke: C.woodLt, "stroke-width": 8, "stroke-linecap": "square", "pointer-events": "none" }));

    // lift-straight dashed, labels kept off the slope
    svg.appendChild(el("line", { x1: sx - 10, y1: sy, x2: sx - 10, y2: ey, stroke: C.brassLt, "stroke-width": 1.6, "stroke-dasharray": "6 5", "pointer-events": "none" }));
    svg.appendChild(el("text", { x: sx - 16, y: (sy + ey) / 2, fill: C.mark, "font-size": 14, "text-anchor": "end", "font-family": "Source Sans 3,sans-serif", "pointer-events": "none", text: "Lift " + fmt(h, 0) + " cm" }));
    svg.appendChild(el("text", { x: (sx + ex) / 2, y: ey + 28, fill: C.mark, "font-size": 14, "text-anchor": "middle", "font-family": "Source Sans 3,sans-serif", "pointer-events": "none", text: "Ramp " + fmt(L, 0) + " cm" }));

    P.t = clamp(P.t, 0, 1);
    const cx = sx + (ex - sx) * P.t;
    const cy = sy + (ey - sy) * P.t;
    const ang = Math.atan2(ey - sy, ex - sx) * 180 / Math.PI;
    const cg = el("g", { transform: "translate(" + cx + "," + cy + ") rotate(" + ang + ")" });
    cg.appendChild(el("rect", { x: -28, y: -46, width: 56, height: 44, rx: 2, fill: C.crate, stroke: C.woodDk, "stroke-width": 1.5 }));
    cg.appendChild(el("text", { x: 0, y: -22, "text-anchor": "middle", fill: C.paper, "font-size": 11, "font-family": "Source Sans 3,sans-serif", text: "40 N" }));
    const hit = el("rect", { x: -36, y: -56, width: 72, height: 62, fill: "transparent" });
    makeHot(hit, "plane-crate");
    hit.setAttribute("aria-label", "Move the load along the ramp");
    cg.appendChild(hit);
    svg.appendChild(cg);
    onDrag("plane-crate", (p, dx) => {
      const along = dx / rw;
      P.t = clamp(P.t + along, 0, 1);
      render();
    });

    const ma = planeMA();
    return {
      svg,
      hint: "Drag the crate along the ramp. Change the ramp length or the height with the sliders.",
      title: "Inclined plane",
      explain: "A slope. You push the load along a longer path instead of lifting it straight up. The gentler the ramp, the smaller the ideal effort, and the farther you have to push.",
      formula: "Ideal MA = ramp length L ÷ height h. Ideal effort is the load times h ÷ L. (If you use the angle instead, that is the same as 1 ÷ sin θ, because sin θ = h ÷ L.)",
      paintPanel(box) {
        box.appendChild(rangeCtrl("Ramp length L (cm)", 50, 180, 2, P.length, v => { P.length = Math.max(v, P.height + 10); render(); }));
        box.appendChild(rangeCtrl("Height h (cm)", 16, 80, 2, P.height, v => { P.height = Math.min(v, P.length - 10); render(); }));
        box.appendChild(stat("Ideal MA", fmt(ma, 2), true));
        box.appendChild(stat("Ideal effort for 40 N", fmt(40 / ma, 1) + " N"));
        box.appendChild(stat("Angle", fmt(Math.asin(P.height / P.length) * 180 / Math.PI, 0) + "°"));
        box.appendChild(stat("Crate along the ramp", fmt(P.t * P.length, 0) + " cm"));
      },
      tryThis: {
        text: "Stretch the ramp (or lower the height) until the ideal effort is 20 N or less, half the 40 N load. That means MA of 2 or more.",
        ok: () => planeMA() >= 2
      }
    };
  }

  /* ---------- Wedge ---------- */
  function drawWedge() {
    const W = 800, H = 500;
    const svg = svgRoot("0 0 " + W + " " + H, "A wedge splitting a log");
    svg.appendChild(defsWood());
    svg.appendChild(bench(W, H));
    const w = S.wedge;
    const scale = 10;
    const L = w.length * scale, t = w.thickness * scale;
    const inset = w.inset * scale;
    const midX = 430, midY = 250;

    // log halves that open with inset
    const open = inset * 0.35;
    const log = el("g", { "pointer-events": "none" });
    log.appendChild(el("ellipse", { cx: midX - 8 - open, cy: midY - 10, rx: 150, ry: 78, fill: C.wood, stroke: C.woodDk, "stroke-width": 2, transform: "rotate(-8 " + (midX - 40) + " " + midY + ")" }));
    log.appendChild(el("ellipse", { cx: midX + 8 + open, cy: midY + 6, rx: 150, ry: 78, fill: C.woodDk, stroke: C.woodDk, "stroke-width": 2, transform: "rotate(8 " + (midX + 40) + " " + midY + ")" }));
    // rings
    log.appendChild(el("ellipse", { cx: midX - 150, cy: midY, rx: 22, ry: 70, fill: C.woodLt, stroke: C.woodDk, opacity: 0.9 }));
    svg.appendChild(log);

    // wedge points left, driven rightward into the split
    const tipX = midX - 40 + inset;
    const tipY = midY;
    const backX = tipX - L;
    const path = "M " + tipX + " " + tipY + " L " + backX + " " + (tipY - t / 2) + " L " + backX + " " + (tipY + t / 2) + " Z";
    const wedge = el("path", { d: path, fill: "url(#steelG)", stroke: C.steelDk, "stroke-width": 1.8 });
    svg.appendChild(wedge);
    // mallet / drive face
    svg.appendChild(el("rect", { x: backX - 18, y: tipY - 28, width: 18, height: 56, rx: 2, fill: "url(#brassG)", stroke: C.woodDk, "pointer-events": "none" }));
    const hit = el("rect", { x: backX - 30, y: tipY - t / 2 - 20, width: L + 50, height: t + 40, fill: "transparent" });
    makeHot(hit, "wedge-body");
    hit.setAttribute("aria-label", "Push the wedge");
    svg.appendChild(hit);
    onDrag("wedge-body", (p, dx) => {
      w.inset = clamp(w.inset + dx / scale, 0, w.length * 0.8);
      render();
    });

    svg.appendChild(el("text", { x: backX, y: tipY - t / 2 - 18, fill: C.mark, "font-size": 15, "font-family": "Source Sans 3,sans-serif", "pointer-events": "none", text: "Length " + fmt(w.length, 0) + " cm" }));
    svg.appendChild(el("text", { x: backX, y: tipY + t / 2 + 28, fill: C.mark, "font-size": 15, "font-family": "Source Sans 3,sans-serif", "pointer-events": "none", text: "Thickness " + fmt(w.thickness, 1) + " cm" }));
    svg.appendChild(el("text", { x: backX - 24, y: tipY + 6, "text-anchor": "end", fill: C.mark, "font-size": 14, "font-family": "Source Sans 3,sans-serif", "pointer-events": "none", text: "You push" }));

    const ma = wedgeMA();
    return {
      svg,
      hint: "Drag the wedge into the log. A longer, thinner wedge gives a larger ideal MA.",
      title: "Wedge",
      explain: "Two inclined planes back to back. You push the wedge in along its length, and it pushes out sideways. An axe, a chisel, and a doorstop are wedges. A thinner wedge multiplies force more, and also takes a longer push to get the same split.",
      formula: "Ideal MA = slope length L ÷ thickness t. Thickness is the width of the back of the wedge.",
      paintPanel(box) {
        box.appendChild(rangeCtrl("Slope length L (cm)", 12, 36, 1, w.length, v => { w.length = v; render(); }));
        box.appendChild(rangeCtrl("Thickness t (cm)", 2, 12, 0.5, w.thickness, v => { w.thickness = v; render(); }));
        box.appendChild(stat("Ideal MA", fmt(ma, 2), true));
        box.appendChild(stat("Driven in", fmt(w.inset, 1) + " cm"));
      },
      tryThis: {
        text: "Make a thinner or longer wedge so the ideal MA is 6 or more, then drive it at least 4 cm into the log.",
        ok: () => wedgeMA() >= 6 && w.inset >= 4
      }
    };
  }

  /* ---------- Screw ---------- */
  function drawScrew() {
    const W = 800, H = 500;
    const svg = svgRoot("0 0 " + W + " " + H, "A screw advancing through a block, with an unwrapped thread");
    svg.appendChild(defsWood());
    svg.appendChild(bench(W, H));
    const s = S.screw;
    const pitchPx = 18;
    const adv = s.turns * pitchPx;
    const cx = 260;
    const y0 = 90 + adv;

    // block
    svg.appendChild(el("rect", { x: 180, y: 260, width: 160, height: 140, rx: 4, fill: C.wood, stroke: C.woodDk, "stroke-width": 2, "pointer-events": "none" }));
    svg.appendChild(el("rect", { x: 188, y: 268, width: 144, height: 20, fill: C.woodLt, opacity: 0.25, "pointer-events": "none" }));

    // shaft with thread suggestion
    const shaft = el("g", { "pointer-events": "none" });
    shaft.appendChild(el("rect", { x: cx - 16, y: y0 + 28, width: 32, height: 260, rx: 2, fill: "url(#steelG)", stroke: C.steelDk }));
    for (let i = 0; i < 12; i++) {
      const y = y0 + 40 + i * pitchPx;
      shaft.appendChild(el("path", { d: "M " + (cx - 16) + " " + y + " Q " + cx + " " + (y + pitchPx / 2) + " " + (cx + 16) + " " + y, stroke: C.steelDk, "stroke-width": 2, fill: "none" }));
    }
    // tip
    shaft.appendChild(el("path", { d: "M " + (cx - 16) + " " + (y0 + 288) + " L " + cx + " " + (y0 + 318) + " L " + (cx + 16) + " " + (y0 + 288) + " Z", fill: C.steel, stroke: C.steelDk }));
    svg.appendChild(shaft);

    // head + handle (effort radius r)
    const head = el("g", { transform: "rotate(" + (s.turns * 360) + " " + cx + " " + (y0 + 16) + ")" });
    head.appendChild(el("rect", { x: cx - 28, y: y0, width: 56, height: 24, rx: 3, fill: "url(#brassG)", stroke: C.woodDk, "stroke-width": 1.5 }));
    head.appendChild(el("rect", { x: cx - s.r * 8, y: y0 + 6, width: s.r * 16, height: 12, rx: 6, fill: C.wood, stroke: C.woodDk }));
    svg.appendChild(head);
    const hit = el("circle", { cx: cx, cy: y0 + 16, r: 50, fill: "transparent" });
    makeHot(hit, "screw-head");
    hit.setAttribute("aria-label", "Turn the screw");
    svg.appendChild(hit);
    onDrag("screw-head", (p, dx, dy, ev, session) => {
      const a = Math.atan2(p.y - (y0 + 16), p.x - cx);
      if (session.lastAng == null && session.last) {
        session.lastAng = Math.atan2(session.last.y - (y0 + 16), session.last.x - cx);
      }
      if (session.lastAng == null) { session.lastAng = a; return; }
      let da = a - session.lastAng;
      if (da > Math.PI) da -= 2 * Math.PI;
      if (da < -Math.PI) da += 2 * Math.PI;
      s.turns = clamp(s.turns + da / (2 * Math.PI), 0, 6);
      session.lastAng = a;
      render();
    });

    // unwrapped inclined plane
    const ux = 500, uy = 120, uw = 240, uh = 200;
    svg.appendChild(el("rect", { x: ux, y: uy, width: uw, height: uh, rx: 8, fill: C.paper, stroke: C.woodDk, "pointer-events": "none" }));
    svg.appendChild(el("text", { x: ux + 12, y: uy + 22, fill: C.ink, "font-size": 13, "font-weight": "700", "font-family": "Source Sans 3,sans-serif", "pointer-events": "none", text: "One turn, unwrapped" }));
    const circ = 2 * Math.PI * s.r;
    const run = 200, rise = clamp((s.pitch / circ) * 200, 16, 90);
    svg.appendChild(el("polygon", { points: (ux + 20) + "," + (uy + uh - 24) + " " + (ux + 20 + run) + "," + (uy + uh - 24) + " " + (ux + 20 + run) + "," + (uy + uh - 24 - rise), fill: C.brass, opacity: 0.35, "pointer-events": "none" }));
    svg.appendChild(el("line", { x1: ux + 20, y1: uy + uh - 24, x2: ux + 20 + run, y2: uy + uh - 24 - rise, stroke: C.rust, "stroke-width": 3, "pointer-events": "none" }));
    svg.appendChild(el("text", { x: ux + 20, y: uy + uh - 8, fill: C.ink, "font-size": 12, "font-family": "Source Sans 3,sans-serif", "pointer-events": "none", text: "2πr = " + fmt(circ, 1) + " cm around" }));
    svg.appendChild(el("text", { x: ux + 20 + run, y: uy + uh - 24 - rise - 8, fill: C.ink, "font-size": 12, "text-anchor": "end", "font-family": "Source Sans 3,sans-serif", "pointer-events": "none", text: "pitch " + fmt(s.pitch, 2) + " cm" }));

    svg.appendChild(el("text", { x: cx, y: 70, "text-anchor": "middle", fill: C.mark, "font-size": 14, "font-family": "Source Sans 3,sans-serif", "pointer-events": "none", text: "Advanced " + fmt(s.turns * s.pitch, 2) + " cm  ·  " + fmt(s.turns, 2) + " turns" }));

    const ma = screwMA();
    return {
      svg,
      hint: "Drag the screw head to turn it. One full turn advances the screw by one pitch. The card on the right shows that thread unwrapped as a ramp.",
      title: "Screw",
      explain: "An inclined plane wrapped around a cylinder. You turn the handle through a circle of radius r, and the screw advances only one pitch. That is a long effort path for a short lift, so the ideal MA is large. Friction in a real screw is not a small correction. It can eat most of that advantage, which is also why a screw holds still when you let go.",
      formula: "Ideal MA = 2πr ÷ pitch. Here r is the radius where you apply the effort (the handle). OpenStax writes the same relation as 2πL ÷ P, with L for that effort radius and P for pitch.",
      paintPanel(box) {
        box.appendChild(rangeCtrl("Effort radius r (cm)", 2, 8, 0.5, s.r, v => { s.r = v; render(); }));
        box.appendChild(rangeCtrl("Pitch P (cm per turn)", 0.2, 1.2, 0.1, s.pitch, v => { s.pitch = v; render(); }));
        box.appendChild(stat("Ideal MA", fmt(ma, 1), true));
        box.appendChild(stat("Turns", fmt(s.turns, 2)));
        box.appendChild(stat("Advance", fmt(s.turns * s.pitch, 2) + " cm"));
        box.appendChild(stat("Path around (2πr)", fmt(2 * Math.PI * s.r, 1) + " cm"));
      },
      tryThis: {
        text: "Turn the screw at least one full turn. The shaft should advance by exactly one pitch.",
        ok: () => s.turns >= 1
      }
    };
  }

  const drawers = { lever: drawLever, pulley: drawPulley, wheel: drawWheel, plane: drawPlane, wedge: drawWedge, screw: drawScrew };

  function render() {
    for (const k of Object.keys(dragHandlers)) delete dragHandlers[k];
    const view = drawers[id]();
    stage.replaceChildren(view.svg);
    hintEl.textContent = view.hint;
    titleEl.textContent = view.title;
    explainEl.textContent = view.explain;
    formulaEl.innerHTML = view.formula.replace(/Ideal MA = /g, "<strong>Ideal MA</strong> = ");
    readoutEl.replaceChildren();
    const controls = document.createElement("div");
    controls.className = "controls";
    view.paintPanel(controls);
    // stats were appended into controls; move them into readout, keep sliders in controls
    const stats = [...controls.querySelectorAll(".stat")];
    const other = [...controls.children].filter(n => !n.classList.contains("stat"));
    readoutEl.replaceChildren(...other, ...stats);
    if (view.tryThis) {
      tryBox.hidden = false;
      tryText.textContent = view.tryThis.text;
      const ok = !!view.tryThis.ok();
      tryStatus.dataset.ok = ok ? "true" : "false";
      tryStatus.textContent = ok ? "Done" : "Not yet";
    } else {
      tryBox.hidden = true;
    }
    navBtns.forEach(b => {
      const on = b.dataset.machine === id;
      b.classList.toggle("on", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function show(next) {
    if (!drawers[next]) return;
    id = next;
    render();
  }

  navBtns.forEach(b => b.addEventListener("click", () => show(b.dataset.machine)));

  let session = null;
  stage.addEventListener("pointerdown", ev => {
    const t = ev.target.closest("[data-testid]");
    if (!t) return;
    const svg = stage.querySelector("svg");
    if (!svg) return;
    ev.preventDefault();
    try { stage.setPointerCapture(ev.pointerId); } catch (err) { /* synthetic or already-released pointer */ }

    session = { testid: t.getAttribute("data-testid"), lastAng: null, last: svgPoint(svg, ev) };
  });
  stage.addEventListener("pointermove", ev => {
    if (!session) return;
    const svg = stage.querySelector("svg");
    if (!svg) return;
    ev.preventDefault();
    const p = svgPoint(svg, ev);
    const fn = dragHandlers[session.testid];
    if (fn) fn(p, p.x - session.last.x, p.y - session.last.y, ev, session);
    session.last = p;
  });
  const end = () => { session = null; };
  stage.addEventListener("pointerup", end);
  stage.addEventListener("pointercancel", end);

  window.Shop = {
    show,
    id: () => id,
    getMA: () => currentMA(),
    state: S,
    names: NAMES,
    render,
    dragByTestId(testid, dx, dy) {
      const svg = stage.querySelector("svg");
      if (!svg || !dragHandlers[testid]) return false;
      const box = svg.getBoundingClientRect();
      const vb = (svg.getAttribute("viewBox") || "0 0 800 500").split(/\s+/).map(Number);
      const sx = vb[2] / Math.max(1, box.width), sy = vb[3] / Math.max(1, box.height);
      // Start off-center so rotation handles have a defined angle.
      const start = { x: vb[0] + vb[2] * 0.72, y: vb[1] + vb[3] * 0.4 };
      const sess = { testid, lastAng: null, last: start };
      const p1 = { x: start.x + dx * sx, y: start.y + dy * sy };
      const p2 = { x: p1.x + dx * sx, y: p1.y + dy * sy };
      dragHandlers[testid](p1, p1.x - start.x, p1.y - start.y, null, sess);
      sess.last = p1;
      dragHandlers[testid](p2, p2.x - p1.x, p2.y - p1.y, null, sess);
      return true;
    }
  };

  render();
})();
