// scenes/rsvp.js -- per-scene motion for: rsvp (slide 7, "Last Slide.psd").
// OWNER: the rsvp motion agent. Edit ONLY this file and css/scenes/rsvp.css (sprites:
// assets/fx/rsvp/, cut from the shipped layers by tools/make_rsvp_fx.py).
// Contract: js/motion/kit.js. Layer ids: README.md ("Scene -> layer ids").
//
// Claimed: both text blocks, the two wisterias, the fountain and every plant (trees,
// topiaries, shrubs, roses, planters, foliage, flower borders). The palace and the lawn
// rest on their PSD frame; the palace only gets light laid OVER it.
//
//   enter     "Rsvp" hand-writes (a warm nib rides the pen) and two gold sparkles catch
//             its swashes -> "KHANDELWAL" / "FAMILY" and the firm lines rise in. A breeze reaches the
//             wisteria: both corners swing from their top attachment (each cluster on
//             its own phase -- the layers are split into two exact row pieces).
//   garden    (when the fountain is on screen, or 2.6 s after enter at the latest)
//             topiaries, shrubs, roses and planters grow up from the lawn in a wave,
//             a first gust runs through the trees / foliage / borders, the fountain turns
//             on (canvas: a jet from the crown, fine spray off the dome, water spilling
//             over the lotus bowl into the basin, sparkles, ripples in the pools), and a
//             golden-hour light sweeps across the palace facade (masked to the palace's
//             own pixels) leaving a warm wash; the windows catch a lamp glow at the end.
//   closing   ~5 s into the garden: a stream of gold sparkles drifts up off the fountain.
//   ambient   wisteria sway (4 clusters, 4 periods), a wind gust rolls left -> right
//             through the garden every 9 s, fountain, the facade sweep every 16 s,
//             windows breathe, a lilac / pink wisteria petal drifts down past the edges
//             every few seconds, a gold mote now and then.
//   tap       the fountain -> splash burst; a plant -> it shivers + blossoms (petals.js);
//             anywhere else on the slide -> a few wisteria petals from the finger.
//             No buttons, links or new controls: the slide stays exactly as designed.
//
// Edge safety: plants and wisteria cut by a stage edge only ever move their cut edge
// outward (skew) or stretch away from it (scale with the cut edge as the origin), so no
// sliver of what is under them ever shows. Every loop is a full cycle that starts and
// ends on the PSD frame; one-shots use fill "backwards" and are cancelled on finish.
// Reduced motion: init() returns before touching anything -- the exact PSD frame.
import { onScene, reduced, claim, layer, sceneEl, stageOf, unit, rectOf, ease, routeClear, tapAction } from "../kit.js";
import { burst } from "../petals.js";

const FX = (n) => new URL(`../../../assets/fx/rsvp/${n}`, import.meta.url).href;

// ------------------------------------------------------------------ geometry (design px)
// tools/make_rsvp_fx.py prints these rects.
const WIST = {
  left: { side: -1, pieces: [
    { src: "wisteria-left-top.webp", r: [0, 0, 448, 366], a: 2.0, s: 0.035, ms: 6400, d: 0 },
    { src: "wisteria-left-bottom.webp", r: [0, 366, 441, 491], a: 2.4, s: 0.045, ms: 7600, d: 700 },
  ] },
  right: { side: 1, pieces: [
    { src: "wisteria-right-top.webp", r: [638, 0, 442, 366], a: 2.0, s: 0.035, ms: 6900, d: 1300 },
    { src: "wisteria-right-bottom.webp", r: [641, 366, 439, 491], a: 2.4, s: 0.045, ms: 8100, d: 400 },
  ] },
};
// where petals leave each wisteria (raceme tips), left side; the right art is its mirror
const DRIFT_FROM = [[118, 352], [96, 300], [64, 222], [174, 190], [30, 820], [66, 790], [112, 828], [22, 660]];
const PETALS = [[18, 25], [30, 29], [16, 24], [30, 29]].map(([w, h], i) => ({ src: FX(`petal-${i + 1}.webp`), w, h }));
const SHEEN = [0, 902, 1080, 720];          // palace rows 0..720: the facades
const PALACE_H = 1018;
const WINDOWS = [15, 1041, 1065, 489];      // palace-windows.webp
const WINDOW_GLINTS = [[842, 1290], [1020, 1302], [515, 1450], [962, 1452]];
const F = {                                 // the fountain (layer: 33,1570 634x206)
  canvas: [80, 1440, 540, 330],
  spout: [347, 1574],
  dome: { cx: 347, hw: 44, top: 1572, base: 1620 },
  bowl: { x0: 266, x1: 433, y: 1626 },
  basin: { x0: 229, x1: 472, y: 1653 },
  pools: [{ x0: 106, x1: 192, y: 1722 }, { x0: 508, x1: 590, y: 1720 }],
  front: { x0: 244, x1: 446, y0: 1716, y1: 1742 },
  ground: 1768,
  hit: [33, 1470, 634, 306],
};
const MOTES_FROM = [300, 400, 1565, 1600];  // x0 x1 y0 y1
// plants: grow = rises from the lawn in the garden wave; mode = how it sways
// (skew: free plant, leans about its foot; stretchL: cut by the left edge, scaleX from it;
//  skewR: cut by the right edge, only ever leans right; bob: full-width border, scaleY only)
const PLANTS = {
  "tree-left": { mode: "stretchL", a: 0.03 },
  "tree-right": { mode: "skewR", a: 2.4 },
  "topiary-1": { grow: 1, mode: "skew", a: 4.5 }, "topiary-2": { grow: 1, mode: "skew", a: 4.5 },
  "topiary-3": { grow: 1, mode: "skew", a: 5 }, "topiary-4": { grow: 1, mode: "skew", a: 4 },
  "shrub-1": { grow: 1, mode: "skew", a: 6, with: ["roses-1", "roses-2"] },
  "shrub-2": { grow: 1, mode: "skew", a: 6, with: ["roses-3", "roses-4"] },
  "shrub-3": { grow: 1, mode: "skew", a: 5.5, with: ["roses-5", "roses-6"] },
  "planter-1": { grow: 1, mode: "skew", a: 3.6 }, "planter-2": { grow: 1, mode: "skew", a: 3.6 },
  "planter-3": { grow: 1, mode: "skew", a: 3.6 }, "planter-4": { grow: 1, mode: "skew", a: 3.6 },
  "foliage-1": { mode: "stretchL", a: 0.05 }, "foliage-2": { mode: "stretchL", a: 0.05 },
  "flower-border-1": { mode: "bob", a: 0.07 }, "flower-border-2": { mode: "bob", a: 0.06 },
};
const ROSES = ["roses-1", "roses-2", "roses-3", "roses-4", "roses-5", "roses-6"];
const GUST_MS = 9000, WAVE_MS = 1100;

const STAR = '<svg viewBox="-12 -12 24 24" aria-hidden="true" focusable="false"><path d="M0-12C.9-3.6 3.6-.9 12 0 3.6.9.9 3.6 0 12-.9 3.6-3.6.9-12 0-3.6-.9-.9-3.6 0-12Z"/></svg>';
const PEN = "cubic-bezier(0.37, 0.1, 0.45, 1)";
const SINE = "cubic-bezier(0.37, 0, 0.63, 1)";

const D = (n) => `calc(${n} * var(--u))`;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[(Math.random() * a.length) | 0];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// ------------------------------------------------------------------ DOM / animation helpers
function mk(tag, cls, parent, opts = {}) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  n.setAttribute("aria-hidden", "true");
  if (opts.before) parent.insertBefore(n, opts.before);
  else parent.appendChild(n);
  return n;
}
function box(n, x, y, w, h) {
  Object.assign(n.style, { left: D(x), top: D(y), width: D(w), height: D(h) });
  return n;
}
const live = new Set();
// one-shot: first keyframe holds through the delay; cancelled on finish -> CSS resting value
function once(el, frames, opts, done) {
  const a = el.animate(frames, { fill: "backwards", ...opts });
  live.add(a);
  let over = false;
  const end = () => { if (over) return; over = true; live.delete(a); a.cancel(); if (done) done(); };
  a.addEventListener("finish", end, { once: true });
  a.addEventListener("cancel", end, { once: true });
  return a;
}
// transient overlay node: animate, then remove (setTimeout too -- hidden tabs freeze animations)
function fleeting(node, frames, opts) {
  let a = null;
  try { a = node.animate(frames, { fill: "both", ...opts }); } catch (e) { /* old engine */ }
  setTimeout(() => { if (a) a.cancel(); node.remove(); }, (opts.delay || 0) + opts.duration + 80);
  return a;
}

// ------------------------------------------------------------------ state
const S = {
  sc: null, stage: null, fx: null, entered: false, visible: false, garden: false,
  loops: [], timers: [], fountain: null, sheen: null, wist: [], plants: [], gardenAt: 0,
};

export function init() {
  if (reduced) return;
  const sc = sceneEl("rsvp");
  if (!sc) return;
  try {
    setup(sc);
  } catch (e) {
    console.error("[motion] rsvp setup failed -- it rests on its PSD frame", e);
    sc.dataset.motion = "custom";
    sc.classList.remove("rs-wait");
    sc.classList.add("is-entered", "rs-garden");
  }
}

function setup(sc) {
  const stage = stageOf(sc);
  const L = (id) => layer(sc, id);
  const ids = Object.keys(PLANTS).concat(ROSES, ["wisteria-left", "wisteria-right", "fountain", "palace"]);
  for (const id of ids) if (!L(id)) throw new Error(`rsvp: layer ${id} missing`);
  const texts = [...sc.querySelectorAll('[data-text="rsvp.rsvp"], [data-text="rsvp.khandelwal-family"]')];
  if (texts.length !== 2) throw new Error("rsvp: text block missing");
  const firm = sc.querySelector('[data-text="rsvp.firm"]');      // family firm (content.json relayout)
  if (firm) texts.push(firm);
  Object.assign(S, { sc, stage });

  claim(texts, L("wisteria-left"), L("wisteria-right"), L("fountain"), Object.keys(PLANTS).map(L), ROSES.map(L));

  // plants: pivots + which grow in (armed hidden in css only through data-rs-grow)
  for (const [id, p] of Object.entries(PLANTS)) {
    const ly = L(id);
    const r = rectOf(ly);
    const members = [ly, ...(p.with || []).map(L)];
    const pv = p.mode === "stretchL" ? [r.x, r.y + r.h] : [r.x + r.w / 2, r.y + r.h];   // stage design px
    for (const m of members) {
      const mr = rectOf(m);
      const o = `${D(pv[0] - mr.x)} ${D(pv[1] - mr.y)}`;
      m.querySelector("img").style.transformOrigin = o;
      m.style.transformOrigin = o;
      if (p.grow) m.dataset.rsGrow = "";
    }
    S.plants.push({ id, ly, members, p, r, cx: r.x + r.w / 2 });
  }
  S.plants.sort((a, b) => a.cx - b.cx);

  // wisteria: two exact row pieces per side, shown only once both have decoded
  for (const [name, w] of Object.entries(WIST)) {
    const ly = L(`wisteria-${name}`);
    const pieces = w.pieces.map((pc) => {
      const im = mk("img", "rs-wpiece", stage, { before: ly.nextSibling });
      im.alt = "";
      im.loading = "lazy";                     // fetched as the slide approaches, like the layers
      im.decoding = "async";
      im.draggable = false;
      im.style.zIndex = ly.style.zIndex;
      im.style.transformOrigin = w.side < 0 ? "0 0" : "100% 0";
      box(im, ...pc.r);
      im.src = FX(pc.src);
      im.addEventListener("load", () => syncWisteria(), { passive: true });
      return { im, pc };
    });
    pieces[0].im.after(pieces[1].im);            // paint order: layer, top piece, bottom piece
    S.wist.push({ name, ly, side: w.side, pieces });
  }

  // golden-hour light over the palace (masked to its own pixels)
  const palace = L("palace");
  const sheen = mk("div", "rs-sheen", stage, { before: palace.nextSibling });
  sheen.style.zIndex = palace.style.zIndex;
  box(sheen, ...SHEEN);
  const pSrc = new URL(palace.querySelector("img").getAttribute("src"), document.baseURI).href;
  sheen.style.setProperty("--rs-mask", `url("${pSrc}")`);
  sheen.style.setProperty("--rs-mask-h", `${((PALACE_H / SHEEN[3]) * 100).toFixed(3)}%`);
  const wash = mk("span", "rs-sheen__wash", sheen);
  const win = mk("img", "rs-sheen__win", sheen);
  win.alt = "";
  win.loading = "lazy";
  win.decoding = "async";
  box(win, WINDOWS[0] - SHEEN[0], WINDOWS[1] - SHEEN[1], WINDOWS[2], WINDOWS[3]);
  win.src = FX("palace-windows.webp");
  const band = mk("span", "rs-sheen__band", sheen);
  S.sheen = { el: sheen, wash, win, band };

  // transient fx layer (petals, motes, sparkles): stage-sized, under the text
  S.fx = mk("div", "rs-fx", stage);
  S.fx.style.zIndex = L("wisteria-left").style.zIndex;
  S.fountain = fountainFx(stage, L("fountain"));

  onScene("rsvp", { enter, show, hide });
  // the slide's pill: wake the garden if it is still asleep, then the fountain splashes
  tapAction("rsvp", () => {
    if (!S.entered) return;
    if (!S.garden) garden();
    if (S.fountain.running()) S.fountain.splash();
    else later(450, () => S.fountain.running() && S.fountain.splash(), true);
  });

  // the garden wakes when the fountain itself is on screen
  if (typeof IntersectionObserver === "function") {
    const io = new IntersectionObserver((es) => {
      for (const e of es) if (e.isIntersecting && e.intersectionRatio >= 0.35 && S.entered) { garden(); io.disconnect(); }
    }, { threshold: [0, 0.35, 0.6] });
    io.observe(L("fountain"));
    S.gardenIO = io;
  }
  document.addEventListener("pointerdown", onDown, { passive: true });
  document.addEventListener("pointerup", onUp, { passive: true });
  document.addEventListener("pointercancel", () => { down = null; }, { passive: true });
  window.addEventListener("resize", () => S.fountain && S.fountain.resized(), { passive: true });
  window.addEventListener("pagehide", () => {
    for (const a of [...live]) a.cancel();
    sc.classList.remove("rs-wait");
  });
}

// ------------------------------------------------------------------ lifecycle
function enter(sc) {
  S.entered = true;
  sc.classList.add("rs-wait");                 // plants stay armed until the garden wave
  const u = unit(S.stage);
  textIn(u);
  syncWisteria();
  wisteriaBreeze();
  later(2900, () => { startWisteriaLoops(); spawners(); }, true);
  later(2600, garden, true);                  // fallback: never wait on the observer
  if (S.gardenIO) {
    // already on screen at enter (desktop: the slide is one screen)
    const r = layer(sc, "fountain").getBoundingClientRect();
    if (r.top < window.innerHeight - r.height * 0.35 && r.bottom > 0) later(700, garden, true);
  }
}

function show() {
  S.visible = true;
  syncWisteria();
  for (const a of S.loops) a.play();
  if (S.garden) S.fountain.start(false);
  if (S.closingPending) later(600, closing);
  spawners();
}

function hide() {
  S.visible = false;
  S.spawning = false;
  for (const a of S.loops) a.pause();
  for (const t of S.timers) clearTimeout(t);
  S.timers.length = 0;
  S.fountain.stop();
}

// timers that belong to the entrance run even while hidden (sticky); spawners do not
function later(ms, fn, sticky) {
  const t = setTimeout(() => { try { fn(); } catch (e) { console.error("[motion] rsvp", e); } }, ms);
  if (!sticky) S.timers.push(t);
  return t;
}
function every(fn, lo, hi) {
  const tick = () => { if (!S.visible) return; fn(); S.timers.push(setTimeout(tick, rnd(lo, hi))); };
  S.timers.push(setTimeout(tick, rnd(lo * 0.4, hi * 0.7)));
}
// ambient spawners: started once the entrance has played, cleared by hide(), restarted by show()
function spawners() {
  if (!S.visible || S.spawning || !S.wistLoops) return;
  S.spawning = true;
  every(() => driftPetal(), 2200, 4300);
  if (S.gardenLoops) every(() => motes(2, 900), 6500, 11000);
}

// ------------------------------------------------------------------ text
function textIn(u) {
  const sc = S.sc;
  const rs = sc.querySelector('[data-text="rsvp.rsvp"] .tl');
  // the family firm rises as the lines after FAMILY
  const fam = [...sc.querySelectorAll('[data-text="rsvp.khandelwal-family"] .tl, [data-text="rsvp.firm"] .tl')];
  // all text readable within ~1.7 s of enter (kit enters once ~15 % of the text is in)
  const D1 = rs ? handwrite(rs, u, 100) : 0;
  fam.forEach((tl, i) => once(tl, [
    { opacity: 0, transform: `translateY(${22 * u}px) scale(0.975)` },
    { opacity: 1, offset: 0.6 },
    { opacity: 1, transform: "none" },
  ], { duration: 800, delay: 100 + D1 * 0.55 + i * 120, easing: ease.out }));
}

// Handwriting: a soft-edged mask on the .tl sweeps left -> right past the ink (Hello Bride
// swashes overhang their advances; .tl--script bottom padding keeps them in the mask box),
// a warm nib rides the leading edge, two sparkles catch the swashes as it lifts.
function handwrite(tl, u, delay) {
  const runs = [...tl.querySelectorAll(".r")];
  if (!runs.length) return 0;
  const fs = Math.max(...runs.map((r) => parseFloat(r.style.getPropertyValue("--fs")) || 40));
  const st = S.stage.getBoundingClientRect();
  const t = tl.getBoundingClientRect();
  const rr = runs.map((r) => r.getBoundingClientRect());
  const l = Math.min(...rr.map((q) => q.left)) - t.left;
  const r = Math.max(...rr.map((q) => q.right)) - t.left;
  const W = t.width;
  const over = fs * 0.55 * u;
  const x0 = Math.max(0, l - over), x1 = Math.min(W, r + over);
  const e = Math.max(10 * u, (x1 - x0) * 0.16);
  tl.style.setProperty("--rs-mi", `linear-gradient(90deg, #000 ${W}px, rgba(0,0,0,0) ${W + e}px)`);
  tl.style.setProperty("--rs-ms", `${W + e}px 100%`);
  tl.classList.add("rs-ink");
  const prop = CSS.supports("mask-position", "0px 0px") ? "maskPosition" : "webkitMaskPosition";
  const Dur = clamp(420 + ((x1 - x0) / u) * 0.9, 750, 1050);
  once(tl, [{ [prop]: `${x0 - W - e}px 0px` }, { [prop]: `${x1 - W}px 0px` }],
    { duration: Dur, delay, easing: PEN }, () => {
      tl.classList.remove("rs-ink");
      tl.style.removeProperty("--rs-mi");
      tl.style.removeProperty("--rs-ms");
    });
  once(tl, [{ opacity: 0.99 }, { opacity: 1 }], { duration: Dur, delay });
  // the nib
  const base = parseFloat(tl.style.getPropertyValue("--b")) || 0;
  const tx = (t.left - st.left) / u;
  const xa = tx + (x0 + e * 0.2) / u, xb = tx + (x1 - over * 0.7) / u;
  const size = clamp(fs * 0.42, 24, 56);
  const y = base - fs * 0.36;
  const pen = box(mk("span", "rs-pen", S.fx), xa - size / 2, y - size / 2, size, size);
  const dx = (xb - xa) * u, wv = fs * 0.15 * u;
  const P = (k, yy, o) => ({ offset: k, opacity: o, transform: `translate(${(dx * k).toFixed(1)}px, ${(yy * wv).toFixed(1)}px)` });
  fleeting(pen, [P(0, 0, 0), P(0.08, -0.7, 1), P(0.3, 0.8, 1), P(0.52, -0.9, 1), P(0.74, 0.6, 1), P(0.9, -0.2, 0.8), P(1, 0, 0)],
    { duration: Dur, delay, easing: PEN });
  // sparkles on the R's top swash and the p's tail
  const L0 = tx + l / u, R0 = tx + r / u;
  twinkle(L0 + fs * 0.18, base - fs * 0.78, 40, delay + Dur * 0.35, 1100);
  twinkle(R0 - fs * 0.12, base + fs * 0.12, 34, delay + Dur * 0.95, 1100);
  twinkle((L0 + R0) / 2 + fs * 0.1, base - fs * 0.62, 26, delay + Dur * 0.7, 1000);
  return Dur;
}

function twinkle(x, y, size, delay = 0, dur = 1000) {
  const n = box(mk("span", "rs-spark", S.fx), x - size / 2, y - size / 2, size, size);
  n.innerHTML = STAR;
  const r0 = rnd(-30, 0);
  fleeting(n, [
    { opacity: 0, transform: `scale(0) rotate(${r0}deg)` },
    { opacity: 1, transform: `scale(1) rotate(${r0 + 30}deg)`, offset: 0.4 },
    { opacity: 0.85, transform: `scale(0.8) rotate(${r0 + 45}deg)`, offset: 0.62 },
    { opacity: 0, transform: `scale(0) rotate(${r0 + 80}deg)` },
  ], { duration: dur, delay, easing: "ease-out" });
}

// ------------------------------------------------------------------ wisteria
function syncWisteria() {
  for (const w of S.wist) {
    const ok = w.pieces.every(({ im }) => im.complete && im.naturalWidth > 1 && !im.dataset.src);
    const changed = ok !== !!w.split;
    w.split = ok;
    w.ly.classList.toggle("rs-split", ok);
    for (const { im } of w.pieces) im.classList.toggle("is-on", ok);
    if (changed && S.wistLoops) wisteriaLoops(w);   // the sway follows whatever is showing
  }
}
// what sways for one piece: the sprite when split, else the whole layer's img (top piece only)
const wTargets = (w) => (w.split ? w.pieces.map(({ im, pc }) => ({ el: im, pc })) : [{ el: w.ly.querySelector("img"), pc: w.pieces[1].pc, whole: true }]);

// outward lean (skew about the top) / inward via a stretch away from the cut edge
const wf = (side, sk, sx) => `skewX(${(side * sk).toFixed(3)}deg) scaleX(${sx.toFixed(4)})`;

function wisteriaBreeze() {
  S.wist.forEach((w, i) => wTargets(w).forEach(({ el, pc, whole }, j) => {
    if (whole) el.style.transformOrigin = w.side < 0 ? "0 0" : "100% 0";
    const a = pc.a * 1.5, s = pc.s * 1.3;
    once(el, [
      { transform: wf(w.side, 0, 1), easing: SINE },
      { transform: wf(w.side, a, 1), offset: 0.22, easing: SINE },
      { transform: wf(w.side, 0, 1 + s), offset: 0.45, easing: SINE },
      { transform: wf(w.side, a * 0.45, 1), offset: 0.66, easing: SINE },
      { transform: wf(w.side, 0, 1 + s * 0.35), offset: 0.84, easing: SINE },
      { transform: wf(w.side, 0, 1) },
    ], { duration: 2700, delay: 120 + i * 160 + j * 240 });
  }));
}

function startWisteriaLoops() {
  if (S.wistLoops) return;
  S.wistLoops = true;
  for (const w of S.wist) wisteriaLoops(w);
}
function wisteriaLoops(w) {
  for (const a of w.loops || []) { a.cancel(); S.loops.splice(S.loops.indexOf(a), 1); }
  w.loops = wTargets(w).map(({ el, pc, whole }) => {
    if (whole) el.style.transformOrigin = w.side < 0 ? "0 0" : "100% 0";
    const a = el.animate([
      { transform: wf(w.side, 0, 1), easing: SINE },
      { transform: wf(w.side, pc.a, 1), offset: 0.27, easing: SINE },
      { transform: wf(w.side, pc.a * 0.15, 1 + pc.s * 0.5), offset: 0.5, easing: SINE },
      { transform: wf(w.side, 0, 1 + pc.s), offset: 0.68, easing: SINE },
      { transform: wf(w.side, pc.a * 0.4, 1 + pc.s * 0.2), offset: 0.86, easing: SINE },
      { transform: wf(w.side, 0, 1) },
    ], { duration: pc.ms, delay: pc.d, iterations: Infinity });
    S.loops.push(a);
    if (!S.visible) a.pause();
    return a;
  });
}

// ------------------------------------------------------------------ garden
function plantTf(p, v) {             // v: lean in "amplitude units", +1 = the wind's way (right)
  const a = p.a;
  switch (p.mode) {
    case "skew": return `skewX(${(-v * a).toFixed(3)}deg)`;                 // -skewX: tops go right
    case "skewR": return `skewX(${(-Math.max(0, v) * a).toFixed(3)}deg)`;   // cut right: only ever right
    case "stretchL": return `scaleX(${(1 + v * a).toFixed(4)})`;             // cut left: stretch from it
    default: return `scaleY(${(1 + Math.abs(v) * a).toFixed(4)})`;          // bob
  }
}
// one gust: lean with the wind, recoil, settle, then a gentle idle sway (full cycle)
const GUST_IN = [[0, 0], [0.18, 1.25], [0.38, -0.5], [0.58, 0.42], [0.78, -0.14], [1, 0]];
const GUST = [[0, 0], [0.07, 1], [0.15, -0.42], [0.23, 0.38], [0.31, -0.12], [0.4, 0.16], [0.55, -0.14], [0.7, 0.13], [0.85, -0.08], [1, 0]];

function garden() {
  if (S.garden) return;
  S.garden = true;
  S.gardenAt = performance.now();
  const sc = S.sc;
  // plants grow up from the lawn, left -> right
  for (const pl of S.plants) {
    const delay = 120 + (pl.cx / 1080) * WAVE_MS;
    if (pl.p.grow) {
      once(pl.ly, [
        { opacity: 0, transform: "scale(0.82, 0.35)" },
        { opacity: 1, offset: 0.35 },
        { transform: "scale(1.02, 1.07)", offset: 0.68 },
        { opacity: 1, transform: "none" },
      ], { duration: 1150, delay, easing: ease.out });
      (pl.p.with || []).forEach((id, j) => once(layer(sc, id), [
        { opacity: 0, transform: "scale(0.2)" },
        { opacity: 1, transform: "scale(1.15)", offset: 0.6 },
        { opacity: 1, transform: "none" },
      ], { duration: 800, delay: delay + 520 + j * 110, easing: ease.out }));
    } else {
      // the big ones (trees, foliage, borders) take the first gust
      once(pl.ly.querySelector("img"), GUST_IN.map(([o, v]) => ({ offset: o, transform: plantTf(pl.p, v), easing: SINE })),
        { duration: 3000, delay });
    }
  }
  sc.classList.remove("rs-wait");
  sc.classList.add("rs-garden");
  // fountain on, light across the palace
  later(420, () => { if (S.visible) S.fountain.start(true); }, true);
  sweep(260, 3600);
  later(1300, () => S.sheen.wash.classList.add("is-on"), true);
  later(3000, () => {
    S.sheen.win.classList.add("is-on");
    WINDOW_GLINTS.forEach(([x, y], k) => twinkle(x, y, 30, 300 + k * 260, 1200));
  }, true);
  later(5200, () => { if (S.visible) closing(); else S.closingPending = true; }, true);
  later(3900, () => { startGardenLoops(); if (S.spawning) every(() => motes(2, 900), 6500, 11000); }, true);
}

function sweep(delay, dur) {
  once(S.sheen.band, [
    { transform: "translateX(-110%) skewX(-18deg)", opacity: 0 },
    { opacity: 1, offset: 0.15 },
    { opacity: 1, offset: 0.8 },
    { transform: "translateX(240%) skewX(-18deg)", opacity: 0 },
  ], { duration: dur, delay, easing: "cubic-bezier(0.45, 0, 0.4, 1)" });
}

function startGardenLoops() {
  if (S.gardenLoops) return;
  S.gardenLoops = true;
  const add = (a) => { S.loops.push(a); if (!S.visible) a.pause(); };
  for (const pl of S.plants) {
    const frames = GUST.map(([o, v]) => ({ offset: o, transform: plantTf(pl.p, v), easing: SINE }));
    const delay = (pl.cx / 1080) * WAVE_MS;
    for (const m of pl.members) add(m.querySelector("img").animate(frames, { duration: GUST_MS, delay, iterations: Infinity }));
  }
  // the facade sweep every 16 s; windows breathe; the warm wash breathes
  add(S.sheen.band.animate([
    { transform: "translateX(-110%) skewX(-18deg)", opacity: 0 },
    { opacity: 1, offset: 0.04 },
    { opacity: 1, offset: 0.19 },
    { transform: "translateX(240%) skewX(-18deg)", opacity: 0, offset: 0.24 },
    { transform: "translateX(240%) skewX(-18deg)", opacity: 0 },
  ], { duration: 16000, delay: 7000, iterations: Infinity, easing: "linear" }));
  add(S.sheen.win.animate([{ opacity: 0.8 }, { opacity: 0.5 }, { opacity: 0.8 }],
    { duration: 5200, iterations: Infinity, easing: SINE }));
  add(S.sheen.wash.animate([{ opacity: 1 }, { opacity: 0.7 }, { opacity: 1 }],
    { duration: 9000, delay: 1200, iterations: Infinity, easing: SINE }));
}

// ------------------------------------------------------------------ petals & motes
function driftPetal() {
  if (!S.fx || S.fx.childElementCount > 24) return;
  const u = unit(S.stage);
  if (!u) return;
  const sp = pick(PETALS), k = rnd(1.15, 1.6);
  // routed clear of the text (kit.routeClear): down the side bands, or faded out above it
  const path = routeClear(S.stage, () => {
    const left = Math.random() < 0.5;
    const [px, py] = pick(DRIFT_FROM);
    const x = left ? px : 1080 - px;
    const dx = (left ? -1 : 1) * rnd(-90, 60), dy = rnd(420, 720), sway = rnd(24, 46);
    return { x, y: py, r: Math.max(sp.w, sp.h) * k * 0.6, pos: (t) => [x + dx * t + Math.sin(t * Math.PI * 3) * sway, py + dy * t] };
  });
  if (!path) return;
  const { x, y: py, run } = path;
  const w = box(mk("span", "rs-petal", S.fx), x - (sp.w * k) / 2, py - (sp.h * k) / 2, sp.w * k, sp.h * k);
  const im = mk("img", "", w);
  im.alt = "";
  im.src = sp.src;
  const dur = rnd(6500, 9500);
  const spin = rnd(160, 340) * (Math.random() < 0.5 ? -1 : 1);
  const N = 16;
  fleeting(w, Array.from({ length: N + 1 }, (_, i) => {
    const o = i / N, t = o * run;
    const [qx, qy] = path.pos(t);
    return {
      offset: o,
      transform: `translate(${((qx - x) * u).toFixed(1)}px, ${((qy - py) * u).toFixed(1)}px) rotate(${(spin * t).toFixed(0)}deg) scaleX(${Math.cos(t * 10).toFixed(2)})`,
      opacity: i === 0 || i === N ? 0 : run < 1 && o > 0.75 ? (1 - o) / 0.25 : 1,
    };
  }), { duration: dur * run, easing: "linear" });
}

function petalBurst(x, y, n) {
  const u = unit(S.stage);
  for (let i = 0; i < n; i++) {
    const sp = pick(PETALS), k = rnd(1.2, 1.7);
    const w = box(mk("span", "rs-petal", S.fx), x - (sp.w * k) / 2, y - (sp.h * k) / 2, sp.w * k, sp.h * k);
    const im = mk("img", "", w);
    im.alt = "";
    im.src = sp.src;
    const a = (-90 + rnd(-70, 70)) * Math.PI / 180, dist = rnd(50, 120);
    const ox = Math.cos(a) * dist, oy = Math.sin(a) * dist * 0.7;
    const fall = rnd(260, 460), drift = rnd(-50, 50), spin = rnd(200, 420) * (Math.random() < 0.5 ? -1 : 1);
    const T = (t, dxp, dyp, o, f) => ({ offset: t, opacity: o,
      transform: `translate(${(dxp * u).toFixed(1)}px, ${(dyp * u).toFixed(1)}px) rotate(${(spin * t).toFixed(0)}deg) scale(${f.toFixed(2)}, 1)` });
    fleeting(w, [
      T(0, 0, 0, 0, 0.4), T(0.1, ox * 0.5, oy * 0.5, 1, 0.9), T(0.3, ox, oy, 1, -0.6),
      T(0.6, ox + drift * 0.5, oy + fall * 0.45, 1, 0.5), T(1, ox + drift, oy + fall, 0, -0.9),
    ], { duration: rnd(1900, 2700), delay: i * 40, easing: "cubic-bezier(0.25, 0.6, 0.4, 1)" });
  }
}

// gold motes: drift up off the fountain, twinkling, gone above the palace roofs
function motes(n, spread) {
  if (!S.fx || S.fx.childElementCount > 30) return;
  const u = unit(S.stage);
  if (!u) return;
  for (let i = 0; i < n; i++) {
    const big = Math.random() < 0.4;
    const s = big ? rnd(26, 36) : rnd(12, 20);
    const n0 = mk("span", big ? "rs-mote rs-mote--star" : "rs-mote", S.fx);
    if (big) n0.innerHTML = STAR;
    box(n0, rnd(MOTES_FROM[0], MOTES_FROM[1]) - s / 2, rnd(MOTES_FROM[2], MOTES_FROM[3]) - s / 2, s, s);
    const rise = rnd(330, 540), dx = rnd(-80, 80), sway = rnd(12, 28), dur = rnd(4200, 6000), rot = rnd(60, 160);
    fleeting(n0, [0, 0.12, 0.3, 0.5, 0.7, 0.85, 1].map((t, j) => ({
      offset: t,
      transform: `translate(${((dx * t + Math.sin(t * Math.PI * 2.4) * sway) * u).toFixed(1)}px, ${(-rise * t * u).toFixed(1)}px) rotate(${(rot * t).toFixed(0)}deg) scale(${(j === 0 ? 0.3 : 0.75 + 0.3 * Math.sin(t * 14) ** 2).toFixed(2)})`,
      opacity: j === 0 || j === 6 ? 0 : j === 5 ? 0.55 : 1,
    })), { duration: dur, delay: (i / Math.max(1, n)) * spread + rnd(0, 140), easing: "cubic-bezier(0.3, 0.2, 0.5, 1)" });
  }
}

function closing() {
  S.closingPending = false;
  motes(13, 2600);
  S.fountain.gold(3800);
}

// ------------------------------------------------------------------ the fountain
// A small bounded canvas over the fountain (DPR <= 2, <= 190 particles, rAF only while
// the slide is on screen). Jet from the crown, fine spray off the water dome, water
// spilling over the lotus bowl into the basin, dribbles down the front, sparkles,
// ripples in the basin and the side pools, a faint mist halo. Tap = splash burst.
function fountainFx(stage, fly) {
  const [CX, CY, CW, CH] = F.canvas;
  const cv = mk("canvas", "rs-fountain", stage, { before: fly.nextSibling });
  cv.style.zIndex = fly.style.zIndex;
  box(cv, CX, CY, CW, CH);
  const ctx = cv.getContext("2d");
  const P = [];
  const MAX = 190, G = 980;
  let raf = 0, lastT = 0, k = 1, intro = 0, boost = 0, goldUntil = 0, dirty = true;
  const acc = { jet: 0, spray: 0, spill: 0, drib: 0, spark: 0, ring: 0 };

  const add = (p) => { if (P.length < MAX) P.push(p); };
  const domeY = (x) => { const d = (x - F.dome.cx) / F.dome.hw; return F.dome.top + (F.dome.base - F.dome.top) * Math.min(1, d * d); };
  function floorAt(x) {
    if (Math.abs(x - F.dome.cx) < F.dome.hw) return { y: domeY(x), w: "dome" };
    if (x > F.bowl.x0 && x < F.bowl.x1) return { y: F.bowl.y, w: "bowl" };
    if (x > F.basin.x0 && x < F.basin.x1) return { y: F.basin.y, w: "water" };
    for (const p of F.pools) if (x > p.x0 && x < p.x1) return { y: p.y, w: "water" };
    return { y: F.ground, w: "lawn" };
  }
  function size() {
    const r = cv.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.max(1, Math.round(r.width * dpr)), H = Math.max(1, Math.round(r.height * dpr));
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    k = W / CW;
    dirty = false;
  }
  const isGold = () => goldUntil > performance.now() && Math.random() < 0.55;
  function drop(x, y, vx, vy, r, a = 0.95) { add({ kind: "drop", x, y, vx, vy, r, a, gold: false }); }
  function jet(power) {
    drop(F.spout[0] + rnd(-3, 3), F.spout[1], rnd(-55, 55) * power, -rnd(300, 390) * power, rnd(1.5, 2.6));
  }
  function spray(power) {
    const side = Math.random() < 0.5 ? -1 : 1;
    const x = F.dome.cx + side * rnd(18, F.dome.hw - 2);
    drop(x, domeY(x) - 2, side * rnd(70, 175) * power, -rnd(40, 140) * power, rnd(1.2, 2), 0.85);
  }
  function spill() {
    const left = Math.random() < 0.5;
    const x = left ? rnd(F.bowl.x0, F.bowl.x0 + 16) : rnd(F.bowl.x1 - 16, F.bowl.x1);
    add({ kind: "streak", x, y: F.bowl.y - rnd(0, 4), vx: (left ? -1 : 1) * rnd(12, 40), vy: rnd(10, 50), r: rnd(1.1, 1.8), floor: F.basin.y, a: 0.9 });
  }
  function dribble() {
    add({ kind: "streak", x: rnd(F.front.x0, F.front.x1), y: F.front.y0, vx: 0, vy: rnd(5, 25), r: rnd(0.9, 1.4), floor: F.front.y1, a: 0.55 });
  }
  function spark(x, y, s = 1) { add({ kind: "spark", x, y, t: 0, life: rnd(0.45, 0.85), s: rnd(5, 9) * s, gold: isGold() }); }
  function ring(x, y, s = 1) { add({ kind: "ring", x, y, t: 0, life: rnd(0.8, 1.3) * s, s: rnd(14, 24) * s }); }
  function mist(x, y, s) { add({ kind: "mist", x, y, t: 0, life: rnd(0.8, 1.2), s }); }
  const waterSpot = () => {
    const z = Math.random();
    if (z < 0.5) { const p = pick(F.pools); return [rnd(p.x0 + 8, p.x1 - 8), p.y + rnd(-14, 14)]; }
    return [Math.random() < 0.5 ? rnd(F.basin.x0 + 4, F.bowl.x0 - 2) : rnd(F.bowl.x1 + 2, F.basin.x1 - 4), F.basin.y + rnd(-4, 3)];
  };

  function step(t) {
    raf = requestAnimationFrame(step);
    const dt = Math.min(0.05, lastT ? (t - lastT) / 1000 : 0);
    lastT = t;
    if (dirty) size();
    const ramp = intro ? clamp((t - intro) / 1800, 0, 1) : 1;
    const hot = boost > t;
    const power = (0.35 + 0.65 * ramp) * (hot ? 1.3 : 1);
    acc.jet += dt * 34 * ramp * (hot ? 2.6 : 1);
    acc.spray += dt * 26 * ramp * (hot ? 2 : 1);
    acc.spill += dt * 24 * ramp;
    acc.drib += dt * 6 * ramp;
    acc.spark += dt * (goldUntil > t ? 16 : 7) * ramp;
    acc.ring += dt * 2.4 * ramp;
    while (acc.jet >= 1) { acc.jet--; jet(power); }
    while (acc.spray >= 1) { acc.spray--; spray(power); }
    while (acc.spill >= 1) { acc.spill--; spill(); }
    while (acc.drib >= 1) { acc.drib--; dribble(); }
    while (acc.ring >= 1) { acc.ring--; const [x, y] = waterSpot(); ring(x, y, 0.8); }
    while (acc.spark >= 1) {
      acc.spark--;
      const z = Math.random();
      if (z < 0.35) { const x = rnd(F.dome.cx - 34, F.dome.cx + 34); spark(x, domeY(x) + rnd(4, 22)); }
      else if (z < 0.6) spark(rnd(F.bowl.x0 + 6, F.bowl.x1 - 6), F.bowl.y + rnd(-3, 3));
      else { const [x, y] = waterSpot(); spark(x, y); }
    }

    ctx.clearRect(0, 0, cv.width, cv.height);
    // mist halo round the water dome
    const hx = (F.dome.cx - CX) * k, hy = (F.dome.top + 22 - CY) * k, hr = 74 * k;
    const ha = (0.14 + 0.05 * Math.sin(t / 700)) * ramp * (hot ? 1.8 : 1);
    const hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, hr);
    hg.addColorStop(0, `rgba(255, 255, 255, ${ha})`);
    hg.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = hg;
    ctx.fillRect(hx - hr, hy - hr, hr * 2, hr * 2);

    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      if (p.kind === "drop" || p.kind === "streak") {
        p.vy += G * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.vy > 0) {
          const fl = p.floor != null ? { y: p.floor, w: "water" } : floorAt(p.x);
          if (p.y >= fl.y) {
            if (fl.w === "water" && Math.random() < 0.22) ring(p.x, fl.y + rnd(-2, 3), 0.55);
            else if (fl.w !== "lawn" && Math.random() < 0.06) spark(p.x, fl.y);
            P.splice(i, 1);
            continue;
          }
        }
      } else {
        p.t += dt;
        if (p.t >= p.life) { P.splice(i, 1); continue; }
      }
      draw(p);
    }
  }
  function draw(p) {
    const x = (p.x - CX) * k, y = (p.y - CY) * k;
    if (p.kind === "drop") {
      ctx.fillStyle = "rgba(70, 108, 150, 0.32)";
      ctx.beginPath(); ctx.arc(x, y + 0.5 * k, (p.r + 0.7) * k, 0, 6.283); ctx.fill();
      ctx.fillStyle = `rgba(255, 255, 255, ${p.a})`;
      ctx.beginPath(); ctx.arc(x, y, p.r * k, 0, 6.283); ctx.fill();
    } else if (p.kind === "streak") {
      const len = Math.min(14, 3 + p.vy * 0.035) * k;
      const g = ctx.createLinearGradient(x, y - len, x, y);
      g.addColorStop(0, "rgba(255,255,255,0)");
      g.addColorStop(1, `rgba(255,255,255,${p.a})`);
      ctx.strokeStyle = g; ctx.lineWidth = p.r * k; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(x, y - len); ctx.lineTo(x, y); ctx.stroke();
    } else if (p.kind === "spark") {
      const a = Math.sin((p.t / p.life) * Math.PI), s = p.s * k * (0.5 + 0.5 * a);
      const c = p.gold ? "255, 214, 120" : "255, 255, 255";
      ctx.strokeStyle = `rgba(${c}, ${0.95 * a})`; ctx.lineWidth = 1.2 * k;
      ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.moveTo(x, y - s); ctx.lineTo(x, y + s); ctx.stroke();
      ctx.fillStyle = `rgba(${p.gold ? "255, 240, 200" : "255, 255, 255"}, ${a})`;
      ctx.beginPath(); ctx.arc(x, y, 1.5 * k, 0, 6.283); ctx.fill();
    } else if (p.kind === "mist") {
      const q = p.t / p.life, r = p.s * (0.4 + 0.6 * Math.sqrt(q)) * k;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255, 255, 255, ${0.6 * (1 - q)})`);
      g.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
    } else if (p.kind === "ring") {
      const q = p.t / p.life;
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.75 * (1 - q)})`; ctx.lineWidth = 1.3 * k;
      ctx.beginPath(); ctx.ellipse(x, y, p.s * (0.3 + q) * k, p.s * 0.24 * (0.3 + q) * k, 0, 0, 6.283); ctx.stroke();
    }
  }
  function splash() {
    if (!raf) return;
    boost = performance.now() + 1500;
    const [cx, cy] = [F.dome.cx, F.dome.top + 30];
    mist(cx, cy - 4, 120);
    mist(cx, F.bowl.y, 150);
    for (let i = 0; i < 54; i++) {
      const a = rnd(-Math.PI * 0.95, -Math.PI * 0.05), v = rnd(260, 540);
      drop(cx + rnd(-50, 50), cy + rnd(-10, 10), Math.cos(a) * v, Math.sin(a) * v, rnd(1.8, 3.4));
    }
    for (let i = 0; i < 16; i++) setTimeout(() => { if (raf) spark(cx + rnd(-150, 150), cy + rnd(-110, 70), 1.8); }, i * 45);
    for (let i = 0; i < 5; i++) setTimeout(() => { if (raf) { const [x, y] = waterSpot(); ring(x, y, 1.5); } }, i * 150);
  }
  return {
    start(first) {
      if (raf) return;
      dirty = true;
      if (first) intro = performance.now();
      lastT = 0;
      raf = requestAnimationFrame(step);
    },
    stop() {
      cancelAnimationFrame(raf);
      raf = 0;
      P.length = 0;
      if (cv.width) ctx.clearRect(0, 0, cv.width, cv.height);
    },
    resized() { dirty = true; },
    gold(ms) { goldUntil = performance.now() + ms; },
    splash,
    running: () => !!raf,
  };
}

// ------------------------------------------------------------------ taps
// No controls are added: a tap is a pointerup that moved <= 10 px in <= 450 ms on the
// rsvp stage (not on a link / button). Fountain -> splash; a plant -> shiver + blossoms;
// anywhere else -> a few wisteria petals from the finger.
let down = null;
const interactive = (el) => el.closest && el.closest("a, button, input, textarea, select, [role='button']");
function onDown(e) {
  if (!S.entered || !e.isPrimary || e.button > 0) { down = null; return; }
  const st = e.target.closest && e.target.closest('[data-scene="rsvp"] .stage');
  down = st && !interactive(e.target) ? { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId } : null;
}
function onUp(e) {
  const d = down;
  down = null;
  if (!d || e.pointerId !== d.id || interactive(e.target)) return;
  if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 10 || performance.now() - d.t > 450) return;
  const r = S.stage.getBoundingClientRect();
  const u = r.width / 1080;
  if (!u) return;
  const x = (e.clientX - r.left) / u, y = (e.clientY - r.top) / u;
  const [hx, hy, hw, hh] = F.hit;
  if (x >= hx && x <= hx + hw && y >= hy && y <= hy + hh && (y >= 1570 || Math.abs(x - F.dome.cx) < 90)) {
    if (S.fountain.running()) { S.fountain.splash(); return; }
  }
  const pl = plantAt(x, y);
  if (pl) {
    if (pl.p.mode === "skew") shiver(pl);
    burst(S.stage, { x, y, count: 7, spread: 110 });
    return;
  }
  // anywhere else (sky, text, palace): petals + gold sparkles at the finger
  petalBurst(x, y, 10);
  twinkle(x, y, 46, 0, 950);
  twinkle(x + rnd(-40, 40), y + rnd(-40, 10), 26, 150, 850);
  twinkle(x + rnd(-40, 40), y + rnd(-10, 40), 22, 280, 800);
}
function plantAt(x, y) {
  const hits = S.plants.filter(({ members }) => members.some((m) => {
    const g = rectOf(m);
    return x >= g.x - 4 && x <= g.x + g.w + 4 && y >= g.y - 4 && y <= g.y + g.h + 4;
  }));
  hits.sort((a, b) => (parseInt(b.ly.style.zIndex, 10) || 0) - (parseInt(a.ly.style.zIndex, 10) || 0));
  return hits[0] || null;
}
// decaying wobble about the foot on the individual `rotate` property (composes with the
// sway loop's transform); first and last frames are identity
function shiver(pl) {
  const a0 = clamp(pl.p.a * 0.9, 2.5, 5) * (Math.random() < 0.5 ? -1 : 1);
  for (const m of pl.members) {
    const img = m.querySelector("img");
    if (img._shiver && img._shiver.playState === "running") continue;
    img._shiver = img.animate([0, 1, -0.72, 0.48, -0.3, 0.16, -0.07, 0].map((s) => ({ rotate: `${(a0 * s).toFixed(2)}deg` })),
      { duration: 760, easing: "ease-in-out" });
  }
}
