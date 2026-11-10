// scenes/monogram-names.js -- per-scene motion for: monogram (PDF p1) + names (PDF p2).
// OWNER: the monogram-names motion agent. Edit ONLY this file and css/scenes/monogram-names.css
// (+ sprites in assets/fx/monogram-names/, made by tools/make_monogram_names_fx.py).
// Contract: js/motion/kit.js. Layer ids: README.md ("Scene -> layer ids").
//
// Both sections are claimed WHOLE (kit.claim(section)): the generic reveal / ambient /
// touch modules skip them, and css/scenes/monogram-names.css arms what this file reveals.
//
// MONOGRAM (p1)
//   entrance  Shiva's and Parvati's hands rest a little apart behind the veil and drift
//             together onto their PSD frame (1.7 s, ease-out); a soft light blooms where
//             they meet -> the VI monogram glows in -> "VANSH & ISHIKA" settles (tracking
//             in), the "&" gets a blush bloom + sparkles -> a golden halo with slow rays
//             wakes behind the Shivling -> the five basin diyas light one by one ->
//             a glint sweeps the monogram while sparkles answer on its ring icons.
//   ambient   monogram breathes (1.2 %) + a glint every ~6 s + a sparkle on a ring icon
//             every 1.4-2.8 s; hands float +/-3u out of phase (only ever away from their
//             cut edges); halo pulses, rays turn; diya flames flicker with their glow and
//             water reflections; light streaks shimmer on the water; a ripple ring
//             spreads from the Shivling's base every 4.5-7 s; the dupatta waves about its
//             top edge; tree / vine / flower bed sway; rose, marigold and offering
//             blossoms drift slowly down the slide.
//   interact  Shivling + basin = a real <button>: every flame flares, two big ripples,
//             golden sparks rise, the halo swells, a few blossoms are offered. Tap the
//             vine / flower bed / tree: it rustles and sheds petals. Deities never shake.
//
// NAMES (p2)
//   entrance  Ganesha settles on a golden halo (rests faint, slow rays) -> shloka ->
//             parents' lines -> "Vansh" hand-writes (a pen-light rides the nib) ->
//             grand-son line -> "&" pops with a blush bloom -> "Ishika" hand-writes ->
//             bride's family lines -> divider draws from the centre with two glints.
//             When the river first comes into view the aarti swells (glow + embers +
//             a ripple pair).
//   ambient   light streaks drift on the Ganga, glints twinkle on it, the aarti fires
//             flicker with embers rising and reflections in the water, the bokeh glow
//             breathes, the seven pandits sway in a slow staggered aarti, floating diyas
//             bob and drift with flickering flames, step diyas flicker, lotuses bob,
//             the banyan's canopy sways, Shiva-Parvati breathe (0.4 % scaleY, feet fixed),
//             a ripple now and then circles a floating diya.
//   interact  tap the river: ripple rings at the tap + nearby diyas bob harder.
//
// Resting frame: one-shot entrances are WAAPI with fill "backwards", cancelled on finish;
// every loop is a full cycle that starts and ends on identity, so every layer's rest is
// its exact PSD frame. Reduced motion: init() does nothing and no CSS here is armed.
import { onScene, reduced, claim, layer, layers, sceneEl, stageOf, routeClear, tapAction } from "../kit.js";
import { burst } from "../petals.js";

// ---------------------------------------------------------------- constants
const PEN = "cubic-bezier(0.37, 0.1, 0.45, 1)";
const OUT = "cubic-bezier(0.22, 1, 0.36, 1)";
const SOFT = "cubic-bezier(0.25, 0.46, 0.45, 0.94)";
const SINE = "cubic-bezier(0.37, 0, 0.63, 1)";

const FX = (n) => new URL(`../../../assets/fx/monogram-names/${n}.webp`, import.meta.url).href;
const DRIFT_SPRITES = ["blossom-1", "blossom-2", "blossom-3", "rose-petal-1", "marigold-1", "marigold-2"].map(FX);
const STAR = '<svg viewBox="-12 -12 24 24" aria-hidden="true"><path d="M0-12C.9-3.6 3.6-.9 12 0 3.6.9.9 3.6 0 12-.9 3.6-3.6.9-12 0-3.6-.9-.9-3.6 0-12Z"/></svg>';

// ---- monogram geometry (design px, measured on the shipped layers -- see
//      tools/make_monogram_names_fx.py for the sprites; positions read off the layers)
const LOGO = { x: 321, y: 134, w: 438, h: 479 };
// ring icons baked into monogram.webp (layer px -> + LOGO.x/y)
const RING_ICONS = [
  [260, 22], [180, 30], [315, 72], [385, 106], [410, 186], [398, 240], [370, 325],
  [125, 368], [72, 352], [55, 248], [42, 150], [70, 82], [220, 126], [225, 205], [265, 215], [210, 432],
].map(([x, y], i) => ({ x: LOGO.x + x, y: LOGO.y + y, s: i % 3 ? 30 : 42 }));
const TOUCH = { x: 522, y: 1060 };                       // where the two hands meet
const HAND_FROM = { shiva: [-70, 14], parvati: [64, -8] }; // = the armed CSS offsets
const HALO = { cx: 544, cy: 1352 };                      // behind the Shivling
const WATER = { x: 135, y: 1588, w: 812, h: 230 };       // basin water ellipse (blue pixels)
const RIPPLE = { cx: 544, cy: 1672, rx: 420, ry: 116 };  // from the Shivling platform's foot
const BASIN_FLAMES = [[347, 1607, 1649], [260, 1675, 1722], [395, 1714, 1760], [793, 1615, 1659], [720, 1716, 1764]]; // cx, tip, wick
const SHRINE_BTN = { x: 150, y: 1225, w: 780, h: 590 };

// ---- names geometry
const GANESHA = { cx: 540, cy: 241 };
const AURA_Z = 39;                                        // under every text block (40+)
const FLOAT_FLAMES = {                                    // flame blob per floating diya: cx, top, bottom
  1: [124.8, 1209, 1211], 2: [128.6, 1202, 1204], 3: [147, 1273, 1275], 4: [202.5, 1343, 1349],
  5: [261.5, 1199, 1200], 6: [268, 1316, 1320], 7: [371, 1390, 1395], 8: [535.5, 1245, 1248],
  9: [541, 1269, 1273], 10: [771, 1292, 1296], 11: [792, 1279, 1283], 12: [822, 1380, 1386], 13: [998, 1428, 1437],
};
const STEP_FLAMES = [[1002, 1727, 1755], [908, 1705, 1732], [1010, 1658, 1680], [67, 1785, 1815],
  [199, 1743, 1767], [75, 1719, 1740], [173, 1688, 1705]];
const AARTI = { "aarti-flame-1": [700, 1193, 34], "aarti-flame-2": [788, 1245, 54], "aarti-flame-3": [924, 1194, 50] }; // cx, cy, glow d
const AARTI_REFLECT = [[788, 1302, 46], [924, 1318, 56], [700, 1296, 30]];  // x, y, w on visible water
const BOKEH = [[906, 1112, 74], [861, 1125, 46], [980, 1112, 46], [835, 1146, 30]];
const RIVER = { x: 0, y: 1190, w: 1080, h: 430 };
// visible-water light streaks (x, y, w) and glint points: sampled where the Ganga is
// not covered by any layer above it (ghats, lotus, couple, tree ...)
const STREAKS = [[255, 1242, 80], [146, 1245, 60], [207, 1263, 60], [309, 1269, 100], [158, 1294, 60], [300, 1295, 60],
  [279, 1312, 100], [195, 1335, 100], [810, 1336, 130], [748, 1358, 80], [317, 1363, 60], [866, 1422, 60],
  [818, 1437, 130], [916, 1459, 100], [891, 1493, 130], [868, 1508, 60], [1001, 1533, 60], [838, 1538, 80],
  [963, 1553, 100], [999, 1568, 60]];
const GLINTS = [[238, 1352], [1035, 1418], [168, 1307], [385, 1306], [961, 1551], [1035, 1587], [161, 1252], [299, 1466],
  [233, 1258], [875, 1469], [881, 1344], [293, 1338], [1075, 1505], [838, 1511], [1072, 1561], [817, 1312],
  [342, 1528], [387, 1256], [871, 1413], [780, 1363], [200, 1379], [822, 1454], [296, 1277], [985, 1497],
  [933, 1324], [953, 1435], [351, 1343], [803, 1404], [708, 1288], [343, 1409], [436, 1336], [265, 1219],
  [387, 1384], [819, 1559], [1004, 1335], [467, 1249], [337, 1254], [880, 1553], [1074, 1366], [430, 1284]];
// Tap-on-river mask: 20u cells from y = 1180, 54 per row; 1 = the Ganga is the top surface
// there (lotus and floating diyas count as river).
const TAP_Y0 = 1180, TAP_CELL = 20;
const TAP_MASK = [
  "000000000000000000000000000000000000000000000000000000",
  "000001110000000000000000000000000000000000000000000000",
  "000001111111111111111100000000000000000000000000000000",
  "000001111111111111111111110000000000000000000000000000",
  "000000111111111111111111111000000000000000000000000000",
  "000000111111111111111111100000000011111100000000000000",
  "000000011111111111111111000000000000011111111110000000",
  "000000001111111111111110000000000000011111111111111110",
  "000000000111111111111110000000000000011111111111111111",
  "000000000111111111111110000000000000011111111111111111",
  "000000000111111111111100000000000000001111111111111111",
  "000000000011111111111000000000000000000111111111111111",
  "000000000011111111100000000000000000000111111111111111",
  "000000000001111111000000000000000000000011111111111111",
  "000000000000111111000000000000000000000011111111111111",
  "000000000000011111000000000000000000000011111111111111",
  "000000000000001111000000000000000000000011111111111111",
  "000000000000000111000000000000000000000011111111111111",
  "000000000000000111000000000000000000000011111111111111",
  "000000000000000000000000000000000000000001111110111111",
  "000000000000000000000000000000000000000000000000001111",
];

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[(Math.random() * a.length) | 0];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const fsOf = (el) => parseFloat(el.style.getPropertyValue("--fs")) || 40;
const baseOf = (tl) => parseFloat(tl.style.getPropertyValue("--b")) || 0;
const runsOf = (tl) => [...tl.querySelectorAll(".r")];
const zOf = (el) => parseInt(el.style.zIndex, 10) || 10;

const live = new Set();       // one-shot entrance animations (cancelled on pagehide)
const state = new Map();      // scene element -> per-scene state

// ---------------------------------------------------------------- init
export function init() {
  if (reduced) return;
  const mono = sceneEl("monogram");
  const names = sceneEl("names");
  if (mono) {
    claim(mono); makeShrineButton(st(mono)); listenTaps(st(mono), monogramTap);
    tapAction("monogram", () => lightDiyas(st(mono)));          // the slide's "Tap to ..." pill
  }
  if (names) {
    claim(names); listenTaps(st(names), riverTap);
    tapAction("names", () => {
      const s = st(names);
      if (!s.scene.classList.contains("is-entered") || !s.ex.river) return;
      const f = frame(s.stage);
      rippleAt(s, f, 968, 1318);
      setTimeout(() => rippleAt(s, f, 560, 1120), 380);
    });
  }
  onScene(["monogram", "names"], { enter, show, hide });
  window.addEventListener("pagehide", releaseAll);
  window.addEventListener("beforeprint", releaseAll);
}

function st(scene) {
  let s = state.get(scene);
  if (!s) {
    s = { scene, stage: stageOf(scene), visible: false, ready: false, loops: [], tickers: [], ex: {} };
    s.ly = (id) => layer(scene, id);
    state.set(scene, s);
  }
  return s;
}

// ---------------------------------------------------------------- lifecycle
function enter(scene) {
  const s = st(scene);
  if (scene.dataset.scene === "monogram") enterMonogram(s);
  else enterNames(s);
}

function show(scene) {
  const s = st(scene);
  s.visible = true;
  scene.classList.remove("mn-away");
  for (const a of s.loops) a.play();
  if (s.ready) runTickers(s);
}

function hide(scene) {
  const s = st(scene);
  s.visible = false;
  scene.classList.add("mn-away");
  for (const a of s.loops) a.pause();
  stopTickers(s);
  clearDrift(s);
}

function whenReady(s, ms, fn) {
  setTimeout(() => {
    s.ready = true;
    fn();
    if (s.visible) runTickers(s);
  }, ms);
}

// An infinite ambient animation, paused while its scene is off screen.
function loop(s, el, frames, opts) {
  if (!el) return null;
  const a = el.animate(frames, { iterations: Infinity, ...opts });
  if (!s.visible) a.pause();
  s.loops.push(a);
  return a;
}

function ticker(s, fn, min, max) { s.tickers.push({ fn, min, max, id: 0 }); }
function runTickers(s) {
  for (const t of s.tickers) {
    clearTimeout(t.id);
    const next = () => {
      t.id = setTimeout(() => {
        if (!s.visible) return;
        try { t.fn(); } catch (e) { console.error("[motion] monogram-names ticker", e); }
        next();
      }, rnd(t.min, t.max));
    };
    next();
  }
}
function stopTickers(s) { for (const t of s.tickers) clearTimeout(t.id); }

// ---------------------------------------------------------------- primitives
function frame(stage) {
  const R = stage.getBoundingClientRect();
  const u = R.width / 1080 || 1;
  return { R, u };
}

// One-shot entrance: first keyframe held through the delay, cancelled on finish so the
// element falls back to its CSS (= PSD) frame with no inline residue.
function once(el, frames, opts, done) {
  if (!el) return null;
  const a = el.animate(frames, { fill: "backwards", ...opts });
  live.add(a);
  const end = () => {
    if (!live.has(a)) return;
    live.delete(a);
    a.cancel();
    if (done) done();
  };
  a.addEventListener("finish", end, { once: true });
  a.addEventListener("cancel", end, { once: true });
  return a;
}

// Transient overlay animation; the node is removed by timer too (hidden tabs freeze
// animations, and a frozen spark must still go).
function flash(el, frames, opts) {
  let a = null;
  try { a = el.animate(frames, { fill: "both", ...opts }); } catch (e) { /* old engine */ }
  setTimeout(() => { if (a) a.cancel(); el.remove(); }, (opts.delay || 0) + opts.duration + 80);
  return a;
}

function place(el, r) {
  el.style.left = `calc(${r.x.toFixed(1)} * var(--u))`;
  el.style.top = `calc(${r.y.toFixed(1)} * var(--u))`;
  el.style.width = `calc(${r.w.toFixed(1)} * var(--u))`;
  el.style.height = `calc(${r.h.toFixed(1)} * var(--u))`;
}
// Overlay node in design px (relative to `parent`, default the stage), never larger
// than the stage. `after` / `before` put it next to a layer in paint order.
function fx(parent, cls, r, z, where) {
  const d = document.createElement("div");
  d.className = cls;
  d.setAttribute("aria-hidden", "true");
  place(d, r);
  if (z != null) d.style.zIndex = String(z);
  if (where && where.after) where.after.after(d);
  else if (where && where.before) where.before.before(d);
  else parent.appendChild(d);
  return d;
}

function spark(parent, x, y, size, z, where) {
  const d = fx(parent, "mn-spark", { x: x - size / 2, y: y - size / 2, w: size, h: size }, z, where);
  d.innerHTML = STAR;
  return d;
}

function twinkle(parent, x, y, size, z, delay = 0, dur = 1100, where) {
  const d = spark(parent, x, y, size, z, where);
  const r0 = rnd(-30, 0);
  flash(d, [
    { opacity: 0, transform: `scale(0) rotate(${r0}deg)` },
    { opacity: 1, transform: `scale(1) rotate(${r0 + 25}deg)`, offset: 0.42 },
    { opacity: 0.9, transform: `scale(0.82) rotate(${r0 + 40}deg)`, offset: 0.62 },
    { opacity: 0, transform: `scale(0) rotate(${r0 + 70}deg)` },
  ], { duration: dur, delay, easing: "ease-out" });
}

function sparkBurst(parent, f, x, y, n, spread, z) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd(-0.35, 0.35);
    const dist = spread * rnd(0.55, 1);
    const d = spark(parent, x, y, rnd(16, 28), z);
    const tx = Math.cos(a) * dist * f.u, ty = Math.sin(a) * dist * f.u * 0.8;
    flash(d, [
      { opacity: 0, transform: "translate(0,0) scale(0.2) rotate(0deg)" },
      { opacity: 1, transform: `translate(${tx * 0.55}px, ${ty * 0.55}px) scale(1.05) rotate(40deg)`, offset: 0.35 },
      { opacity: 0, transform: `translate(${tx}px, ${ty + 10 * f.u}px) scale(0.3) rotate(110deg)` },
    ], { duration: rnd(850, 1200), delay: rnd(0, 90), easing: "cubic-bezier(0.2, 0.7, 0.4, 1)" });
  }
}

// A soft radial bloom (small node, removed after).
function bloom(stage, cls, cx, cy, d, z, where, delay, dur, peak = 0.85) {
  const g = fx(stage, cls, { x: cx - d / 2, y: cy - d / 2, w: d, h: d }, z, where);
  flash(g, [
    { opacity: 0, transform: "scale(0.35)" },
    { opacity: peak, transform: "scale(1)", offset: 0.38 },
    { opacity: peak * 0.5, transform: "scale(1.08)", offset: 0.7 },
    { opacity: 0, transform: "scale(1.16)" },
  ], { duration: dur, delay, easing: "ease-out" });
  return g;
}

// A flickering flame over a painted one: glow + sprite, anchored at the wick.
// CSS keyframes run it (paused with the scene via .mn-away). Returns the wrapper.
function flame(parent, cx, tip, wick, z, where, k = 1) {
  const h = Math.max(5, (wick - tip) * 1.25) * k;
  const w = h * 0.42;
  const wrap = fx(parent, "mn-flame", { x: cx - w / 2, y: wick - h, w, h }, z, where);
  const glow = document.createElement("i");
  glow.className = "mn-flame-glow";
  const core = document.createElement("i");
  core.className = "mn-flame-core";
  wrap.append(glow, core);
  core.style.animationDuration = `${rnd(0.9, 1.5).toFixed(2)}s`;
  core.style.animationDelay = `${(-rnd(0, 1.5)).toFixed(2)}s`;
  glow.style.animationDuration = `${rnd(2.0, 3.2).toFixed(2)}s`;
  glow.style.animationDelay = `${(-rnd(0, 3)).toFixed(2)}s`;
  return wrap;
}

function lightFlame(wrap, delay) {
  once(wrap, [
    { opacity: 0, transform: "scale(0.2)" },
    { opacity: 1, transform: "scale(1.25)", offset: 0.45 },
    { opacity: 1, transform: "none" },
  ], { duration: 900, delay, easing: OUT });
}

function flare(wrap, delay = 0, k = 1.55) {
  wrap.animate([
    { transform: "none" },
    { transform: `scale(${k})`, offset: 0.25 },
    { transform: `scale(${1 + (k - 1) * 0.6})`, offset: 0.6 },
    { transform: "none" },
  ], { duration: 1600, delay, easing: "ease-in-out" });
}

// Alpha map of a layer image (cached), for tap hit tests.
const alphaCache = new WeakMap();
function alphaAt(ly, cx, cy) {
  const r = ly.getBoundingClientRect();
  if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) return 0;
  let map = alphaCache.get(ly);
  if (map === undefined) {
    const img = ly.querySelector("img");
    if (!img || !img.complete || img.naturalWidth <= 1 || img.dataset.src) return 0;
    const k = Math.min(1, 160 / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * k)), h = Math.max(1, Math.round(img.naturalHeight * k));
    try {
      const cv = document.createElement("canvas");
      cv.width = w; cv.height = h;
      const ctx = cv.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;
      const a = new Uint8Array(w * h);
      for (let i = 0; i < a.length; i++) a[i] = data[i * 4 + 3];
      map = { w, h, a };
      cv.width = cv.height = 0;
    } catch (e) { map = null; }
    alphaCache.set(ly, map);
  }
  if (!map) return 0;
  const x = Math.min(map.w - 1, Math.floor(((cx - r.left) / r.width) * map.w));
  const y = Math.min(map.h - 1, Math.floor(((cy - r.top) / r.height) * map.h));
  return map.a[y * map.w + x];
}

// A tap = pointerup within 10 px / 450 ms of its pointerdown, not on a control.
function listenTaps(s, fn) {
  let down = null;
  const stage = s.stage;
  stage.addEventListener("pointerdown", (e) => {
    down = e.isPrimary && e.button <= 0 && !e.target.closest("button, a")
      ? { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId } : null;
  }, { passive: true });
  stage.addEventListener("pointercancel", () => { down = null; }, { passive: true });
  stage.addEventListener("pointerup", (e) => {
    const d = down;
    down = null;
    if (!d || e.pointerId !== d.id || !s.scene.classList.contains("is-entered")) return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 10 || performance.now() - d.t > 450) return;
    const f = frame(stage);
    fn(s, f, e.clientX, e.clientY, (e.clientX - f.R.left) / f.u, (e.clientY - f.R.top) / f.u);
  }, { passive: true });
}

// ---------------------------------------------------------------- text motion
function handwrite(s, f, tl, delay) {
  const runs = runsOf(tl);
  if (!runs.length) return 0;
  const fs = Math.max(...runs.map(fsOf));
  const t = tl.getBoundingClientRect();
  const rs = runs.map((r) => r.getBoundingClientRect());
  const l = Math.min(...rs.map((q) => q.left)) - t.left;
  const r = Math.max(...rs.map((q) => q.right)) - t.left;
  const W = t.width;
  const over = fs * 0.55 * f.u;
  const x0 = Math.max(0, l - over), x1 = Math.min(W, r + over);
  const e = Math.max(10 * f.u, (x1 - x0) * 0.16);
  tl.style.setProperty("--mn-mi", `linear-gradient(90deg, #000 ${W}px, rgba(0,0,0,0) ${W + e}px)`);
  tl.style.setProperty("--mn-ms", `${W + e}px 100%`);
  tl.classList.add("mn-ink");
  const prop = CSS.supports("mask-position", "0px 0px") ? "maskPosition" : "webkitMaskPosition";
  const D = clamp(380 + ((x1 - x0) / f.u) * 1.1, 700, 1050);
  once(tl, [
    { [prop]: `${x0 - W - e}px 0px` },
    { [prop]: `${x1 - W}px 0px` },
  ], { duration: D, delay, easing: PEN }, () => {
    tl.classList.remove("mn-ink");
    tl.style.removeProperty("--mn-mi");
    tl.style.removeProperty("--mn-ms");
  });
  // the nib: a warm point of light riding the wipe's leading edge
  const left = (t.left - f.R.left) / f.u;
  const xa = left + (x0 + e * 0.2) / f.u;
  const xb = left + (x1 - over * 0.7) / f.u;
  const size = clamp(fs * 0.42, 22, 48);
  const y = baseOf(tl) - fs * 0.38;
  const pen = fx(s.stage, "mn-pen", { x: xa - size / 2, y: y - size / 2, w: size, h: size }, zOf(tl.closest(".tb")) + 1);
  const dx = (xb - xa) * f.u, w = fs * 0.14 * f.u;
  const P = (k, yy, o) => ({ offset: k, opacity: o, transform: `translate(${(dx * k).toFixed(1)}px, ${(yy * w).toFixed(1)}px)` });
  flash(pen, [P(0, 0, 0), P(0.08, -0.6, 1), P(0.3, 0.7, 1), P(0.52, -0.8, 1), P(0.74, 0.5, 1), P(0.9, -0.2, 0.8), P(1, 0, 0)],
    { duration: D, delay, easing: PEN });
  return D;
}

function rise(tl, f, delay, dy = 14, dur = 720) {
  once(tl, [
    { opacity: 0, transform: `translateY(${dy * f.u}px)` },
    { opacity: 1, transform: "none" },
  ], { duration: dur, delay, easing: OUT });
}

function inkOf(tl, f, runs = runsOf(tl)) {
  const t = tl.getBoundingClientRect();
  const rs = runs.map((r) => r.getBoundingClientRect());
  const l = Math.min(...rs.map((q) => q.left)), r = Math.max(...rs.map((q) => q.right));
  return { ox: (l + r) / 2 - t.left, l: (l - f.R.left) / f.u, r: (r - f.R.left) / f.u, top: t.top };
}

// "&": scale-pop about its own centre + blush bloom + sparks.
function ampPop(s, f, tl, run, delay) {
  const k = inkOf(tl, f, [run]);
  const fs = fsOf(run);
  const b = baseOf(tl);
  const cx = (k.l + k.r) / 2 + 2, cy = b - fs * 0.34;
  const tb = tl.closest(".tb");
  bloom(s.stage, "mn-blush", cx, cy, fs * 2.6, zOf(tb) - 1, { before: tb }, delay + 80, 1500, 0.8);
  setTimeout(() => sparkBurst(s.stage, f, cx, cy, 6, fs * 1.0, zOf(tb) + 1), delay + 380);
  return { cx, cy, k };
}

// ================================================================ MONOGRAM (p1)
function logoSrc(s) {
  const img = s.ly("monogram").querySelector("img");
  return new URL(img.dataset.src || img.getAttribute("src"), document.baseURI).href;
}

function enterMonogram(s) {
  const { stage } = s;
  const f = frame(stage);
  const logo = s.ly("monogram"), shiva = s.ly("shiva-hand"), parvati = s.ly("parvati-hand");
  const zLogo = zOf(logo);

  // 1. The hands drift together onto their PSD frame (start = the armed CSS offset).
  const handIn = (ly, [dx, dy], delay) => once(ly, [
    { transform: `translate(${dx * f.u}px, ${dy * f.u}px)` },
    { transform: "none" },
  ], { duration: 1700, delay, easing: OUT });
  handIn(shiva, HAND_FROM.shiva, 120);
  handIn(parvati, HAND_FROM.parvati, 220);
  bloom(stage, "mn-touch", TOUCH.x, TOUCH.y, 300, zOf(parvati), { after: parvati }, 1250, 2600, 0.75);
  [[-46, -18, 26], [38, 10, 22], [-6, 30, 18]].forEach(([dx, dy, sz], i) =>
    twinkle(stage, TOUCH.x + dx, TOUCH.y + dy, sz, zOf(parvati), 1450 + i * 170, 1000, { after: parvati }));

  // 2. The monogram glows in.
  bloom(stage, "mn-glow", LOGO.x + LOGO.w / 2, LOGO.y + LOGO.h / 2 - 20, 720, zLogo, { before: logo }, 150, 3000, 0.9);
  once(logo, [
    { opacity: 0, transform: `translateY(${14 * f.u}px) scale(0.94)` },
    { opacity: 1, offset: 0.5 },
    { opacity: 1, transform: "none" },
  ], { duration: 1700, delay: 250, easing: SOFT });

  // 3. "VANSH & ISHIKA" tracks in; the "&" blooms.
  const tl = stage.querySelector('[data-text="monogram.vansh-ishika"] .tl');
  if (tl) {
    const k = inkOf(tl, f);
    const origin = `${k.ox.toFixed(1)}px 50%`;
    once(tl, [
      { opacity: 0, transform: `translateY(${10 * f.u}px) scaleX(1.1)`, transformOrigin: origin },
      { opacity: 1, offset: 0.55, transformOrigin: origin },
      { opacity: 1, transform: "none", transformOrigin: origin },
    ], { duration: 1250, delay: 550, easing: OUT });   // readable by ~1.8 s after open
    const amp = runsOf(tl).find((r) => /Hello Bride/.test(r.style.fontFamily));
    if (amp) ampPop(s, f, tl, amp, 1050);
  }

  // 4. Halo behind the Shivling (persists faint), the diyas light one by one.
  const vine = s.ly("vine");
  const halo = fx(stage, "mn-halo", { x: HALO.cx - 300, y: HALO.cy - 300, w: 600, h: 600 }, zOf(vine), { after: vine });
  const rays = fx(stage, "mn-rays", { x: HALO.cx - 330, y: HALO.cy - 330, w: 660, h: 660 }, zOf(vine), { after: vine });
  s.ex.halo = halo; s.ex.rays = rays;
  once(halo, [
    { opacity: 0, transform: "scale(0.4)" },
    { opacity: 1, transform: "scale(1.1)", offset: 0.4 },
    { opacity: 0.7, transform: "none" },
  ], { duration: 2400, delay: 500, easing: "ease-in-out" });
  once(rays, [
    { opacity: 0, transform: "scale(0.6) rotate(-25deg)" },
    { opacity: 0.85, transform: "scale(1.04) rotate(0deg)", offset: 0.45 },
    { opacity: 0.45, transform: "none" },
  ], { duration: 2600, delay: 650, easing: OUT });

  const basin = s.ly("basin");
  const water = fx(stage, "mn-water", WATER, zOf(basin), { after: basin });
  s.ex.water = water;
  makeWater(s, water);
  s.ex.flames = BASIN_FLAMES.map(([cx, tip, wick], i) => {
    const w = flame(stage, cx, tip, wick, zOf(basin), { after: water });
    lightFlame(w, 800 + i * 190);
    return w;
  });
  s.scene.classList.add("mn-on");
  setTimeout(() => ripple(s, 1, 0.85), 1900);

  // 5. Light finds the monogram; the ring icons answer.
  setTimeout(() => glint(s), 2000);
  RING_ICONS.forEach((p, i) => twinkle(stage, p.x, p.y, p.s, zLogo, 1900 + i * 95, 1100, { after: logo }));

  // drift petals live under the monogram, over the flower bed
  s.ex.drift = fx(stage, "mn-drift", { x: 0, y: 0, w: 1080, h: 1920 }, zLogo, { before: logo });

  whenReady(s, 2600, () => monogramAmbient(s, f));
}

function makeWater(s, water) {
  const { x: X, y: Y } = WATER;
  // light streaks on the water (CSS loops)
  [[230, 1700, 70], [600, 1758, 90], [835, 1712, 60], [470, 1786, 70], [180, 1745, 50], [700, 1795, 60]]
    .forEach(([x, y, w], i) => {
      const d = fx(water, "mn-streak", { x: x - X - w / 2, y: y - Y - 3, w, h: 6 }, null);
      d.style.animationDuration = `${rnd(5, 8).toFixed(1)}s`;
      d.style.animationDelay = `${(-rnd(0, 8)).toFixed(1)}s`;
      d.style.setProperty("--dx", `calc(${(i % 2 ? 1 : -1) * rnd(10, 22)} * var(--u))`);
    });
  // the diyas' reflections tremble below them
  for (const [cx, , wick] of BASIN_FLAMES) {
    const d = fx(water, "mn-reflect", { x: cx - X - 16, y: wick - Y + 30, w: 32, h: 10 }, null);
    d.style.animationDuration = `${rnd(1.6, 2.6).toFixed(2)}s`;
    d.style.animationDelay = `${(-rnd(0, 2)).toFixed(2)}s`;
  }
}

// A ripple ring spreading from the Shivling's foot, clipped to the water ellipse.
function ripple(s, k = 1, peak = 0.7, delay = 0) {
  const water = s.ex.water;
  if (!water) return;
  const { cx, cy, rx, ry } = RIPPLE;
  const d = fx(water, "mn-ripple", { x: cx - rx - WATER.x, y: cy - ry - WATER.y, w: rx * 2, h: ry * 2 }, null);
  const f = frame(s.stage);
  flash(d, [
    { opacity: 0, transform: "translateY(0) scale(0.47)" },
    { opacity: peak, transform: `translateY(${4 * f.u}px) scale(0.56)`, offset: 0.12 },
    { opacity: peak * 0.55, transform: `translateY(${18 * f.u}px) scale(${0.8 * k})`, offset: 0.55 },
    { opacity: 0, transform: `translateY(${30 * f.u}px) scale(${1.04 * k})` },
  ], { duration: 4200 * (0.85 + 0.15 * k), delay, easing: "cubic-bezier(0.2, 0.55, 0.35, 1)" });
}

// A golden glint sweeps diagonally across the monogram (masked to its own pixels).
function glint(s, dur = 1500) {
  if (!s.visible && s.ready) return;
  const logo = s.ly("monogram");
  const foil = fx(s.stage, "mn-foil", LOGO, zOf(logo), { after: logo });
  foil.style.setProperty("--mn-src", `url("${logoSrc(s)}")`);
  const band = document.createElement("div");
  band.className = "mn-foil-band";
  foil.appendChild(band);
  flash(band, [
    { opacity: 0, transform: "translate(-70%, -30%)" },
    { opacity: 1, offset: 0.2 },
    { opacity: 1, offset: 0.78 },
    { opacity: 0, transform: "translate(70%, 30%)" },
  ], { duration: dur, easing: "cubic-bezier(0.45, 0, 0.3, 1)" });
  setTimeout(() => foil.remove(), dur + 100);
  // the trident tip catches the light as the band passes
  const p = RING_ICONS[12];
  twinkle(s.stage, p.x, p.y - 4, 44, zOf(logo), dur * 0.45, 1000, { after: foil });
}

function monogramAmbient(s, f) {
  const u = f.u;
  const img = (id) => { const l = s.ly(id); return l && l.querySelector("img"); };

  // monogram breathes (scale about its centre)
  loop(s, img("monogram"), [{ scale: "1" }, { scale: "1.012" }, { scale: "1" }], { duration: 9000, easing: SINE });

  // devotional float: slow, out of phase, never toward a cut edge
  loop(s, img("shiva-hand"), [
    { translate: "0 0" }, { translate: `${-2 * u}px ${-3 * u}px` }, { translate: "0 0" },
    { translate: `${-1 * u}px ${2.5 * u}px` }, { translate: "0 0" },
  ], { duration: 8200, easing: SINE });
  loop(s, img("parvati-hand"), [
    { translate: "0 0" }, { translate: `${2 * u}px ${2.5 * u}px` }, { translate: "0 0" },
    { translate: `${1 * u}px ${-2.5 * u}px` }, { translate: "0 0" },
  ], { duration: 9400, delay: 600, easing: SINE });

  // halo pulse, rays turn
  loop(s, s.ex.halo, [{ opacity: 0.7, scale: "1" }, { opacity: 0.95, scale: "1.06" }, { opacity: 0.7, scale: "1" }],
    { duration: 5600, easing: SINE });
  loop(s, s.ex.rays, [{ rotate: "0deg" }, { rotate: "360deg" }], { duration: 120000, easing: "linear" });

  // dupatta: cloth wave about its top edge (only ever outward, off the cut right edge)
  loop(s, img("dupatta"), [
    { transform: "none" }, { transform: "skewX(0.45deg)", offset: 0.3 }, { transform: "skewX(0.12deg)", offset: 0.55 },
    { transform: "skewX(0.32deg)", offset: 0.78 }, { transform: "none" },
  ], { duration: 7600, easing: SINE });
  loop(s, s.ly("dupatta"), [{ scale: "1 1" }, { scale: "0.986 1" }, { scale: "1 1" }], { duration: 5300, delay: 900, easing: SINE });

  // tree (cut top + left): skew only pushes those edges off-stage
  loop(s, img("tree"), [
    { transform: "none" }, { transform: "skewX(-1.1deg) skewY(-0.5deg)", offset: 0.35 },
    { transform: "skewX(-0.4deg) skewY(-1.1deg)", offset: 0.7 }, { transform: "none" },
  ], { duration: 6800, easing: SINE });
  // vine (cut left): vertical shear + reach, left edge stays on the stage edge
  loop(s, img("vine"), [
    { transform: "none" }, { transform: "skewY(-1.4deg) scaleX(1.05)", offset: 0.3 },
    { transform: "skewY(0.6deg) scaleX(1.01)", offset: 0.62 }, { transform: "skewY(-0.5deg) scaleX(1.03)", offset: 0.82 },
    { transform: "none" },
  ], { duration: 6200, easing: SINE });
  loop(s, s.ly("vine"), [{ translate: "0 0" }, { translate: `0 ${-3 * u}px` }, { translate: "0 0" }], { duration: 4700, easing: SINE });
  // flower bed (cut left/right/bottom): rustle from its foot; the slight widening keeps
  // both cut edges covered at every skew
  loop(s, img("flower-bed"), [
    { transform: "none" }, { transform: "scale(1.008, 1.03) skewX(1deg)", offset: 0.28 },
    { transform: "scale(1.004, 1.01)", offset: 0.5 }, { transform: "scale(1.008, 1.025) skewX(-1deg)", offset: 0.75 },
    { transform: "none" },
  ], { duration: 5200, easing: SINE });

  ticker(s, () => glint(s), 5600, 6800);
  ticker(s, () => {
    const p = pick(RING_ICONS);
    twinkle(s.stage, p.x + rnd(-8, 8), p.y + rnd(-8, 8), p.s * rnd(0.75, 1.05), zOf(s.ly("monogram")), 0, rnd(1000, 1500), { after: s.ly("monogram") });
  }, 1400, 2800);
  ticker(s, () => ripple(s, 1, rnd(0.5, 0.7)), 4500, 7000);
  ticker(s, () => driftPetal(s), 2300, 3800);
  driftPetal(s);
}

// ---- petals drifting down the slide (slow; removed on hide)
function driftPetal(s, x0) {
  const box = s.ex.drift;
  if (!box || !s.visible || box.childElementCount >= 8) return;
  const f = frame(s.stage);
  const u = f.u;
  const H = f.R.height / u;
  const size = rnd(42, 66);
  const dist = H + size * 2;
  // never across the names line (kit.routeClear): mostly down the side columns; a petal
  // that would meet the text fades out above it instead
  const path = routeClear(s.stage, () => {
    const x = x0 != null ? x0 + rnd(-30, 30) : (Math.random() < 0.75 ? pick([rnd(40, 200), rnd(880, 1040)]) : rnd(330, 750));
    const sway = rnd(30, 90) * (Math.random() < 0.5 ? -1 : 1);
    const drift = rnd(-60, 60);
    return { x, r: size * 0.6, pos: (k) => [x + Math.sin(k * Math.PI * 2.4) * sway + drift * k, -size / 2 + dist * k] };
  });
  if (!path) return;
  const { x, run } = path;
  const img = document.createElement("img");
  img.className = "mn-petal";
  img.alt = "";
  img.decoding = "async";
  img.src = pick(DRIFT_SPRITES);
  img.style.width = `${size * u}px`;
  img.style.left = `${(x - size / 2) * u}px`;
  img.style.top = `${-size * u}px`;
  box.appendChild(img);
  const r0 = rnd(0, 360), spin = rnd(160, 380) * (Math.random() < 0.5 ? -1 : 1);
  const dur = rnd(15000, 21000) * run;
  const N = Math.max(8, Math.round(24 * run));
  const frames = [];
  for (let i = 0; i <= N; i++) {
    const o = i / N, k = o * run;
    const [px, py] = path.pos(k);
    const flip = Math.cos(k * Math.PI * 3.2);
    frames.push({
      offset: o,
      transform: `translate(${((px - x) * u).toFixed(1)}px, ${((py + size / 2) * u).toFixed(1)}px) rotate(${(r0 + spin * k).toFixed(1)}deg) scale(${(0.35 + 0.65 * Math.abs(flip)).toFixed(3)}, 1)`,
      opacity: i === 0 || i === N ? 0 : run < 1 ? (o > 0.75 ? 0.95 * (1 - o) / 0.25 : 0.95) : k > 0.85 ? 0.75 : 0.95,
    });
  }
  let a = null;
  try { a = img.animate(frames, { duration: dur, easing: "linear", fill: "both" }); } catch (e) { /* old engine */ }
  const done = () => { if (a) a.cancel(); img.remove(); };
  if (a) a.addEventListener("finish", done, { once: true });
  img._mnDone = done;
}

function clearDrift(s) {
  const box = s.ex.drift;
  if (!box) return;
  for (const el of [...box.children]) (el._mnDone || (() => el.remove()))();
}

// ---- Shivling / basin: a real button (keyboard too)
function makeShrineButton(s) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "mn-shrine-btn";
  b.setAttribute("aria-label", "Light the diyas around the Shivling");
  place(b, SHRINE_BTN);
  b.style.zIndex = "11";
  b.addEventListener("click", (e) => {
    if (lightDiyas(s) && e.detail) fingerSpark(s, e.clientX, e.clientY);
  });
  s.stage.appendChild(b);
}

// Every flame flares (throttled); true when it fired.
function lightDiyas(s) {
  const now = performance.now();
  if (now - (s.lastShrine || 0) < 700 || !s.scene.classList.contains("is-entered") || !s.ex.flames) return false;
  s.lastShrine = now;
  shrineTap(s);
  return true;
}

// A small sparkle where the finger landed (above the text and the art).
function fingerSpark(s, cx, cy) {
  const f = frame(s.stage);
  const x = (cx - f.R.left) / f.u, y = (cy - f.R.top) / f.u;
  twinkle(s.stage, x, y, 40, 66, 0, 900);
  twinkle(s.stage, x + rnd(-26, 26), y + rnd(-26, 10), 22, 66, 140, 800);
}

function shrineTap(s) {
  const f = frame(s.stage);
  (s.ex.flames || []).forEach((w, i) => flare(w, i * 60));
  ripple(s, 1.12, 0.95);
  ripple(s, 1.2, 0.75, 450);
  if (s.ex.halo) {
    s.ex.halo.animate([{ scale: "1", opacity: 0.75 }, { scale: "1.22", opacity: 1, offset: 0.3 }, { scale: "1", opacity: 0.75 }],
      { duration: 1800, easing: "ease-in-out" });
  }
  // golden sparks rise softly from the lingam and the basin's diyas
  const z = zOf(s.ly("monogram"));
  const where = { before: s.ex.drift };
  const sources = [[544, 1260], [520, 1330], [570, 1330], ...BASIN_FLAMES.map(([x, t]) => [x, t])];
  for (let i = 0; i < 16; i++) {
    const [sx, sy] = sources[i % sources.length];
    const x = sx + rnd(-26, 26), y = sy + rnd(-10, 14);
    const d = i % 2 ? spark(s.stage, x, y, rnd(20, 32), z, where) : fx(s.stage, "mn-ember", { x: x - 11, y: y - 11, w: 22, h: 22 }, z, where);
    const up = rnd(170, 330) * f.u, side = rnd(-40, 40) * f.u, wob = rnd(8, 18) * f.u;
    flash(d, [
      { opacity: 0, transform: "translate(0,0) scale(0.5)" },
      { opacity: 1, transform: `translate(${(side * 0.25 + wob).toFixed(1)}px, ${(-up * 0.22).toFixed(1)}px) scale(1)`, offset: 0.2 },
      { opacity: 0.85, transform: `translate(${(side * 0.6 - wob).toFixed(1)}px, ${(-up * 0.6).toFixed(1)}px) scale(0.85)`, offset: 0.6 },
      { opacity: 0, transform: `translate(${side.toFixed(1)}px, ${(-up).toFixed(1)}px) scale(0.5)` },
    ], { duration: rnd(1700, 2600), delay: rnd(0, 420), easing: "cubic-bezier(0.25, 0.6, 0.45, 1)" });
  }
  [0, 1, 2].forEach((i) => twinkle(s.stage, 544 + rnd(-60, 60), 1250 + rnd(-40, 30), rnd(26, 38), z, 150 + i * 220, 1000, where));
  burst(s.stage, { x: 544, y: 1240, count: 6, spread: 120 });
}

// ---- vine / flower bed / tree: rustle + petals (claimed here, so not the generic touch)
// A tap anywhere: the diyas flare + a sparkle at the finger; a flower under it rustles too.
function monogramTap(s, f, cx, cy, x, y) {
  for (const id of ["flower-bed", "vine", "tree"]) {
    const ly = s.ly(id);
    if (!ly || alphaAt(ly, cx, cy) < 40) continue;
    const img = ly.querySelector("img");
    const k = id === "flower-bed" ? "scale(1.008, 1.04) skewX(1.4deg)" : id === "vine" ? "skewY(-2deg) scaleX(1.06)" : "skewX(-1.6deg) skewY(-1deg)";
    img.animate([{ transform: "none" }, { transform: k, offset: 0.3 }, { transform: "none" }],
      { duration: 900, easing: "ease-in-out", composite: "add" });
    burst(s.stage, { x, y, count: 8, spread: 130 });
    for (let i = 0; i < 2; i++) driftPetal(s, x + rnd(-40, 40));
    break;
  }
  lightDiyas(s);
  fingerSpark(s, cx, cy);
}

// ================================================================ NAMES (p2)
// Text first: every line, both hand-written names and the divider are done by ~2.9 s
// after the slide enters (kit enters it once ~15 % of the text block is on screen).
const NT = { ganesha: 0, shloka: 150, parents: 350, groom: 550, groomFam: 1150, amp: 1300, bride: 1500,
  brideFam: 1950, divider: 2050 };

function enterNames(s) {
  const { stage } = s;
  const f = frame(stage);
  const lines = (id) => {
    const tb = stage.querySelector(`[data-text="names.${id}"]`);
    return tb ? [...tb.querySelectorAll(".tl")] : [];
  };

  ganeshaIn(s, f, NT.ganesha);
  lines("om-shri-ganeshay-namah-om-sa").forEach((l, i) => once(l, [
    { opacity: 0, transform: "scaleX(1.14)", transformOrigin: "50% 100%" },
    { opacity: 1, offset: 0.6, transformOrigin: "50% 100%" },
    { opacity: 1, transform: "none", transformOrigin: "50% 100%" },
  ], { duration: 800, delay: NT.shloka + i * 120, easing: OUT }));
  lines("mrs-anjana-khandelwal-mr-alo").forEach((l, i) => rise(l, f, NT.parents + i * 120, 14, 650));
  const groom = lines("vansh")[0];
  if (groom) handwrite(s, f, groom, NT.groom);
  lines("grand-s-o-late-smt-muni-devi").forEach((l, i) => rise(l, f, NT.groomFam + i * 120, 12, 650));
  const amp = lines("ampersand")[0];
  if (amp) {
    const run = runsOf(amp)[0];
    const { k } = ampPop(s, f, amp, run, NT.amp);
    const fs = fsOf(run), b = baseOf(amp);
    const origin = `${k.ox.toFixed(1)}px ${((b - fs * 0.34) * f.u - (k.top - f.R.top)).toFixed(1)}px`;
    once(amp, [
      { opacity: 0, transform: "scale(0.4) rotate(-14deg)", transformOrigin: origin },
      { opacity: 1, transform: "scale(1.08) rotate(2.5deg)", transformOrigin: origin, offset: 0.55 },
      { opacity: 1, transform: "scale(0.98) rotate(-0.8deg)", transformOrigin: origin, offset: 0.8 },
      { opacity: 1, transform: "none", transformOrigin: origin },
    ], { duration: 800, delay: NT.amp, easing: "cubic-bezier(0.3, 0.75, 0.4, 1)" });
  }
  const bride = lines("ishika")[0];
  if (bride) handwrite(s, f, bride, NT.bride);
  lines("d-o-mrs-parul-goyal-mr-panka").forEach((l, i) => rise(l, f, NT.brideFam + i * 120, 12, 650));
  dividerIn(s, f, NT.divider);

  buildRiver(s);
  s.scene.classList.add("mn-on");
  whenReady(s, 1200, () => namesAmbient(s, f));
  watchRiver(s);
}

function ganeshaIn(s, f, delay) {
  const g = s.ly("ganesha");
  if (!g) return;
  const sp = s.ly("shiva-parvati");
  const { cx, cy } = GANESHA;
  const halo = fx(s.stage, "mn-ghalo", { x: cx - 130, y: cy - 130, w: 260, h: 260 }, AURA_Z, { after: sp });
  const rays = fx(s.stage, "mn-grays", { x: cx - 170, y: cy - 170, w: 340, h: 340 }, AURA_Z, { after: sp });
  s.ex.ghalo = halo; s.ex.grays = rays;
  once(halo, [
    { opacity: 0, transform: "scale(0.3)" },
    { opacity: 1, transform: "scale(1.12)", offset: 0.32 },
    { opacity: 0.55, transform: "scale(1)", offset: 0.52 },
    { opacity: 1, transform: "scale(1.2)", offset: 0.7 },
    { opacity: 0.42, transform: "scale(1)" },
  ], { duration: 2900, delay, easing: "ease-in-out" });
  once(rays, [
    { opacity: 0, transform: "scale(0.5) rotate(-20deg)" },
    { opacity: 0.9, transform: "scale(1.05) rotate(0deg)", offset: 0.4 },
    { opacity: 0.38, transform: "scale(1) rotate(8deg)" },
  ], { duration: 2600, delay: delay + 200, easing: OUT });
  once(g, [
    { opacity: 0, transform: `translateY(${(10 * f.u).toFixed(1)}px) scale(0.72)` },
    { opacity: 1, offset: 0.5 },
    { opacity: 1, transform: "scale(1.04)", offset: 0.72 },
    { opacity: 1, transform: "none" },
  ], { duration: 1400, delay: delay + 160, easing: OUT });
}

function dividerIn(s, f, delay) {
  const ly = s.ly("divider");
  if (!ly) return;
  once(ly, [
    { opacity: 0, transform: "scaleX(0)", transformOrigin: "50% 50%" },
    { opacity: 1, offset: 0.2, transformOrigin: "50% 50%" },
    { opacity: 1, transform: "none", transformOrigin: "50% 50%" },
  ], { duration: 850, delay, easing: OUT });
  const cx = 409 + 133, cy = 923 + 13.5, half = 133;
  for (const dir of [-1, 1]) {
    const d = fx(s.stage, "mn-dglint", { x: cx - 14, y: cy - 14, w: 28, h: 28 }, zOf(ly) + 1);
    flash(d, [
      { opacity: 0, transform: "translateX(0) scale(0.4)" },
      { opacity: 1, transform: `translateX(${dir * half * 0.2 * f.u}px) scale(1)`, offset: 0.2 },
      { opacity: 1, transform: `translateX(${dir * half * 0.94 * f.u}px) scale(0.9)`, offset: 0.85 },
      { opacity: 0, transform: `translateX(${dir * half * f.u}px) scale(0.3)` },
    ], { duration: 850, delay, easing: OUT });
  }
  twinkle(s.stage, cx, cy, 30, zOf(ly) + 1, delay + 400, 1000);
}

// ---- the river: shimmer, flames, glows (built at enter; CSS loops paused with the scene)
function buildRiver(s) {
  const { stage } = s;
  const ganga = s.ly("ganga");
  const river = fx(stage, "mn-river", RIVER, zOf(ganga), { after: ganga });
  s.ex.river = river;
  for (const [x, y, w] of STREAKS.filter((_, i) => i % 5 !== 2 && i % 5 !== 4)) {   // 12 of 20: enough shimmer, fewer loops
    const d = fx(river, "mn-streak mn-streak--river", { x: x - RIVER.x, y: y - RIVER.y - 2.5, w, h: 5 }, null);
    d.style.animationDuration = `${rnd(6, 10).toFixed(1)}s`;
    d.style.animationDelay = `${(-rnd(0, 10)).toFixed(1)}s`;
    d.style.setProperty("--dx", `calc(${(Math.random() < 0.5 ? -1 : 1) * rnd(12, 28)} * var(--u))`);
  }
  for (const [x, y, w] of AARTI_REFLECT) {
    const d = fx(river, "mn-reflect mn-reflect--aarti", { x: x - w / 2 - RIVER.x, y: y - RIVER.y - 5, w, h: 10 }, null);
    d.style.animationDuration = `${rnd(1.4, 2.2).toFixed(2)}s`;
    d.style.animationDelay = `${(-rnd(0, 2)).toFixed(2)}s`;
  }

  // floating diyas: a flame inside each wrapper so it bobs with its diya
  s.ex.diyas = [];
  for (const [n, [cx, top, bot]] of Object.entries(FLOAT_FLAMES)) {
    const ly = s.ly(`diya-float-${n}`);
    if (!ly) continue;
    const r = rectOf(ly);
    const h = Math.max(4, (bot - top) * 1.9 + 2);
    const w = flame(ly, 0, 0, 0, null, null);
    if (r.w < 12) w.querySelector(".mn-flame-core").remove();   // far specks: the glow alone reads
    w.style.left = `calc(${(cx - r.x - h * 0.21).toFixed(1)} * var(--u))`;
    w.style.top = `calc(${(bot + 1 - h - r.y).toFixed(1)} * var(--u))`;
    w.style.width = `calc(${(h * 0.42).toFixed(1)} * var(--u))`;
    w.style.height = `calc(${h.toFixed(1)} * var(--u))`;
    s.ex.diyas.push({ ly, r, size: Math.max(r.w, r.h), cx: r.x + r.w / 2, cy: r.y + r.h / 2 });
  }
  // step diyas
  for (const [cx, tip, wick] of STEP_FLAMES) {
    const ly = s.ly(cx > 540 ? "diya-cluster-right" : "diya-cluster-left");
    flame(stage, cx, tip, wick, zOf(ly), { after: ly }, 1.08);
  }
  // aarti fires: glow behind each bowl (above the pandits), embers above
  s.ex.aarti = [];
  for (const [id, [cx, cy, d]] of Object.entries(AARTI)) {
    const ly = s.ly(id);
    if (!ly) continue;
    const g = fx(stage, "mn-fireglow", { x: cx - d, y: cy - d, w: d * 2, h: d * 2 }, zOf(ly), { before: ly });
    g.style.animationDuration = `${rnd(1.6, 2.4).toFixed(2)}s`;
    g.style.animationDelay = `${(-rnd(0, 2)).toFixed(2)}s`;
    s.ex.aarti.push({ ly, cx, cy, d, g });
  }
  const glow = s.ly("aarti-glow");
  s.ex.bokeh = BOKEH.map(([x, y, d], i) => {
    const b = fx(stage, "mn-bokeh", { x: x - d, y: y - d, w: d * 2, h: d * 2 }, zOf(glow), { after: glow });
    b.style.animationDuration = `${(3 + i * 0.7).toFixed(1)}s`;
    b.style.animationDelay = `${(-i * 0.9).toFixed(1)}s`;
    return b;
  });
  s.ex.embers = fx(stage, "mn-embers", { x: 640, y: 1000, w: 340, h: 280 }, zOf(s.ly("aarti-flame-1")), { after: s.ly("aarti-flame-1") });
}

function rectOf(ly) {
  const pc = (k) => parseFloat(ly.style[k]) / 100 || 0;
  return { x: pc("left") * 1080, y: pc("top") * 1920, w: pc("width") * 1080, h: pc("height") * 1920 };
}

function namesAmbient(s, f) {
  const u = f.u;
  const img = (id) => { const l = s.ly(id); return l && l.querySelector("img"); };

  if (s.ex.ghalo) loop(s, s.ex.ghalo, [{ opacity: 0.42, scale: "1" }, { opacity: 0.6, scale: "1.06" }, { opacity: 0.42, scale: "1" }], { duration: 6400, easing: SINE });
  if (s.ex.grays) loop(s, s.ex.grays, [{ rotate: "0deg" }, { rotate: "360deg" }], { duration: 90000, easing: "linear" });

  // Shiva-Parvati: the faintest breath, feet fixed
  loop(s, img("shiva-parvati"), [{ scale: "1 1" }, { scale: "1 1.004" }, { scale: "1 1" }], { duration: 5600, easing: SINE });

  // the seven pandits: one slow aarti sway, staggered along the line (left -> right)
  layers(s.scene, '[data-role="figure"][data-layer^="aarti-priest"]')
    .sort((a, b) => rectOf(a).x - rectOf(b).x)
    .forEach((ly, i) => loop(s, ly.querySelector("img"), [
      { rotate: "0deg" }, { rotate: "1.6deg" }, { rotate: "0deg" }, { rotate: "-1.6deg" }, { rotate: "0deg" },
    ], { duration: 4200, delay: i * 220, easing: SINE }));

  // aarti fires flicker; the bokeh layer breathes
  for (const { ly } of s.ex.aarti) {
    loop(s, ly.querySelector("img"), [
      { scale: "1 1", opacity: 0.92 }, { scale: "0.94 1.1", opacity: 1, offset: 0.22 }, { scale: "1.05 0.95", opacity: 0.86, offset: 0.48 },
      { scale: "0.97 1.12", opacity: 1, offset: 0.74 }, { scale: "1 1", opacity: 0.92 },
    ], { duration: rnd(900, 1300), easing: "ease-in-out" });
  }
  loop(s, img("aarti-glow"), [{ opacity: 1, scale: "1" }, { opacity: 0.78, scale: "1.03" }, { opacity: 1, scale: "1" }], { duration: 3400, easing: SINE });

  // floating diyas bob and drift (wrapper translate/rotate; the flame rides along)
  for (const d of s.ex.diyas) {
    const a = clamp(d.size * 0.07, 0.6, 2.4) * u;
    const sx = rnd(1, 3) * (d.size / 30 + 0.4) * u * (Math.random() < 0.5 ? -1 : 1);
    d.bob = loop(s, d.ly, [
      { translate: "0 0", rotate: "0deg" }, { translate: `${sx.toFixed(2)}px ${(-a).toFixed(2)}px`, rotate: "2.5deg" },
      { translate: "0 0", rotate: "0deg" }, { translate: `${(-sx * 0.6).toFixed(2)}px ${(a * 0.7).toFixed(2)}px`, rotate: "-2deg" },
      { translate: "0 0", rotate: "0deg" },
    ], { duration: rnd(4200, 6800), delay: -rnd(0, 4000), easing: SINE });
  }

  // lotuses bob (lotus-4 is cut by the right edge: vertical only)
  for (const id of ["lotus-1", "lotus-2", "lotus-3", "lotus-4"]) {
    const l = s.ly(id);
    if (!l) continue;
    const r = rectOf(l);
    const a = clamp(r.h * 0.025, 1, 3) * u;
    const rot = id === "lotus-4" ? 0 : 1.2;
    loop(s, l.querySelector("img"), [
      { translate: "0 0", rotate: "0deg" }, { translate: `0 ${(-a).toFixed(2)}px`, rotate: `${rot}deg` },
      { translate: "0 0", rotate: "0deg" }, { translate: `0 ${(a * 0.6).toFixed(2)}px`, rotate: `${-rot}deg` },
      { translate: "0 0", rotate: "0deg" },
    ], { duration: rnd(5200, 7400), delay: -rnd(0, 3000), easing: SINE });
  }

  // banyan canopy: one-sided lean (top cut + left cut both only ever move off-stage)
  loop(s, img("tree"), [
    { transform: "none" }, { transform: "skewX(0.32deg) skewY(-0.38deg)", offset: 0.45 },
    { transform: "skewX(0.12deg) skewY(-0.15deg)", offset: 0.7 }, { transform: "none" },
  ], { duration: 9800, easing: SINE });

  ticker(s, () => {
    const [x, y] = pick(GLINTS);
    twinkle(s.ex.river, x - RIVER.x, y - RIVER.y, rnd(18, 30), null, 0, rnd(900, 1400));
  }, 260, 700);
  ticker(s, () => embers(s, 2), 600, 1300);
  ticker(s, () => {
    const d = pick(s.ex.diyas.filter((q) => q.size > 14));
    if (d) riverRing(s, d.cx, d.cy + d.r.h * 0.3, d.size * 1.6, 0.5);
  }, 3200, 6000);
}

// Embers lift off the aarti bowls.
function embers(s, n) {
  const box = s.ex.embers;
  if (!box || !s.ex.aarti) return;
  const f = frame(s.stage);
  for (let i = 0; i < n; i++) {
    const { cx, cy } = pick(s.ex.aarti);
    const size = rnd(5, 9);
    const d = fx(box, "mn-ember mn-ember--small", { x: cx - 640 + rnd(-6, 6) - size / 2, y: cy - 1000 - 6 - size / 2, w: size, h: size }, null);
    const up = rnd(40, 95) * f.u, side = rnd(-14, 14) * f.u;
    flash(d, [
      { opacity: 0, transform: "translate(0,0) scale(0.6)" },
      { opacity: 1, transform: `translate(${(side * 0.3).toFixed(1)}px, ${(-up * 0.25).toFixed(1)}px) scale(1)`, offset: 0.2 },
      { opacity: 0, transform: `translate(${side.toFixed(1)}px, ${(-up).toFixed(1)}px) scale(0.4)` },
    ], { duration: rnd(1200, 2000), delay: rnd(0, 300), easing: "ease-out" });
  }
}

// A flat ripple ring on the river (in the river overlay, so everything above occludes it).
function riverRing(s, x, y, d, peak = 0.8, delay = 0, grow = 2.6) {
  const river = s.ex.river;
  if (!river) return;
  const el = fx(river, "mn-rring", { x: x - d / 2 - RIVER.x, y: y - d * 0.15 - RIVER.y, w: d, h: d * 0.3 }, null);
  flash(el, [
    { opacity: 0, transform: "scale(0.3)" },
    { opacity: peak, transform: "scale(0.6)", offset: 0.12 },
    { opacity: peak * 0.6, transform: `scale(${(0.6 + (grow - 0.6) * 0.55).toFixed(2)})`, offset: 0.5 },
    { opacity: 0, transform: `scale(${grow})` },
  ], { duration: 3000, delay, easing: "cubic-bezier(0.2, 0.6, 0.35, 1)" });
}

// The aarti swells once when the river first comes into view.
function watchRiver(s) {
  const ganga = s.ly("ganga");
  if (!ganga || typeof IntersectionObserver !== "function") return;
  const io = new IntersectionObserver((es) => {
    if (!es.some((e) => e.isIntersecting && e.intersectionRatio >= 0.35)) return;
    io.disconnect();
    for (const { g } of s.ex.aarti || []) {
      g.animate([{ scale: "1", opacity: 0.8 }, { scale: "1.4", opacity: 1, offset: 0.35 }, { scale: "1", opacity: 0.8 }],
        { duration: 2200, easing: "ease-in-out" });
    }
    embers(s, 8);
    const d = (s.ex.diyas || []).find((q) => q.size > 30);
    if (d) { riverRing(s, d.cx, d.cy + 8, 90, 0.85); riverRing(s, d.cx, d.cy + 8, 90, 0.6, 500); }
  }, { threshold: [0, 0.35, 0.6] });
  io.observe(ganga);
}

// ---- tap the river: rings at the tap + nearby diyas bob harder
// A tap anywhere: ripples on the river at the finger, or at the nearest river point when
// the finger is off the water (text, sky, ghats, the couple) + a sparkle at the finger.
function riverTap(s, f, cx, cy, x, y) {
  if (!s.ex.river) return;
  const row = TAP_MASK[Math.floor((y - TAP_Y0) / TAP_CELL)];
  const onWater = row && row[Math.floor(x / TAP_CELL)] === "1" && alphaAt(s.ly("shiva-parvati"), cx, cy) <= 40;
  if (onWater) return rippleAt(s, f, x, y);
  const [rx, ry] = nearestWater(x, y);
  fingerSpark(s, cx, cy);
  rippleAt(s, f, rx, ry);
}
function nearestWater(x, y) {
  let best = null, bd = Infinity;
  TAP_MASK.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      if (row[c] !== "1") continue;
      const px = c * TAP_CELL + TAP_CELL / 2, py = TAP_Y0 + r * TAP_CELL + TAP_CELL / 2;
      const d = (px - x) ** 2 + (py - y) ** 2;
      if (d < bd) { bd = d; best = [px, py]; }
    }
  });
  return best || [968, 1318];
}
function rippleAt(s, f, x, y) {
  riverRing(s, x, y, 110, 0.95, 0, 2.4);
  riverRing(s, x, y, 110, 0.7, 260, 3.2);
  riverRing(s, x, y, 110, 0.45, 560, 4.0);
  twinkle(s.ex.river, x - RIVER.x, y - RIVER.y - 6, 26, null, 60, 900);
  for (const d of s.ex.diyas || []) {
    const dist = Math.hypot(d.cx - x, (d.cy - y) * 1.6);
    if (dist > 260) continue;
    const k = 1 - dist / 260;
    const a = (2 + d.size * 0.12) * k * f.u;
    d.ly.animate([
      { transform: "none" }, { transform: `translateY(${(-a).toFixed(2)}px) rotate(${(5 * k).toFixed(2)}deg)`, offset: 0.2 },
      { transform: `translateY(${(a * 0.6).toFixed(2)}px) rotate(${(-4 * k).toFixed(2)}deg)`, offset: 0.45 },
      { transform: `translateY(${(-a * 0.3).toFixed(2)}px) rotate(${(2 * k).toFixed(2)}deg)`, offset: 0.7 },
      { transform: "none" },
    ], { duration: 1800, delay: dist * 1.5, easing: "ease-in-out" });
  }
}

// ---------------------------------------------------------------- fail-safe
function releaseAll() {
  for (const a of [...live]) a.cancel();
  document.querySelectorAll(".mn-ink").forEach((el) => {
    el.classList.remove("mn-ink");
    el.style.removeProperty("--mn-mi");
    el.style.removeProperty("--mn-ms");
  });
}
