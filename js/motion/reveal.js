// reveal.js -- GENERIC per-scene entrance (baseline life for every slide).
// See js/motion/kit.js for the contract. One-shot, Web Animations API, no libraries.
// Ported from suryanshu-rajvi; scene modules (js/motion/scenes/*) layer their own
// choreography on top and claim() whatever they animate -- claimed nodes are
// skipped here and are not armed hidden by css/motion/reveal.css.
//
// css/motion/reveal.css arms the ROLES animated here (flora, divider, ganesha,
// logo) and every .tl at opacity 0 under `html.motion .scene:not(.is-entered)`.
// kit flips .is-entered and calls enter() in the same task; every animation here
// starts synchronously with fill "backwards", so the first keyframe is already
// applied when the armed CSS lets go -- no flash. Nothing uses fill "forwards":
// finished animations are cancelled, leaving the PSD resting frame, no inline styles.
// Everything else (scenery, figures, hangings, lights ...) rests on its PSD frame
// unless a scene module animates it.
//
// Per scene (focal point moves top -> bottom). The TEXT is the slide's information, so it
// leads: it starts ~80 ms after enter (kit enters a scene as soon as ~15 % of its text block
// is on screen) and every line is fully readable within ~1.7 s (date -> month -> title ->
// time -> venue, <=120 ms apart; a script title hand-writes in <=1.05 s and the next line
// follows 260 ms after the pen starts). Art entrances run alongside, never ahead of it.
//   ganesha              first: fade-up + a warm glow that blooms and settles to 0
//   logo                 glow + soft rise
//   flora (small)        bloom from the stem (kit.stemOrigin), unfurl +/-4deg
//   flora (large)        soft fade (never "grow" a whole flower bed from a corner)
//   text / dividers      one top-to-bottom cascade:
//       .tl            rise 14u + fade (560 ms), 90 ms per line
//       script lines   handwriting (Maginia, Hello Bride): soft-edged left-to-right mask wipe
//       dividers       draw out from the centre (scaleX 0 -> 1)

import { onScene, reduced, root, ease, stageOf, stemOrigin, rectOf, free } from "./kit.js";

const SCRIPT = /Maginia|Hello Bride/i;
const CASCADE_END = 1150;                       // ms: last cascade item STARTS by here
const TEXT_LEAD = 80;                           // ms after enter: the first line starts
const STEP = { line: 90, box: 90, divider: 90, script: 260 }; // ms to the next item's start
const PEN = "cubic-bezier(0.37, 0.1, 0.45, 1)"; // near-even pen speed, soft lift-off
const ROLES = /^(flora|divider|ganesha|logo)$/; // keep in sync with css/motion/reveal.css

const live = new Set();
const extras = new Set();

export function init() {
  if (reduced) return;
  onScene("*", { enter });
  window.addEventListener("pagehide", releaseAll);
  window.addEventListener("beforeprint", releaseAll);
}

function enter(scene) {
  if (!root.classList.contains("motion") || !free(scene)) return;
  try {
    play(build(scene));
  } catch (e) {
    releaseAll();
    throw e; // kit logs it
  }
}

// ---------------------------------------------------------------- measuring

function frame(scene) {
  const stage = stageOf(scene);
  const r = stage.getBoundingClientRect();
  const u = r.width / 1080 || 1;
  const box = (el) => {
    const b = el.getBoundingClientRect();
    return { x: (b.left - r.left) / u, y: (b.top - r.top) / u, w: b.width / u, h: b.height / u };
  };
  return { stage, u, box };
}

const runsOf = (tl) => [...tl.querySelectorAll(".r")];
const isScript = (tl) => runsOf(tl).some((r) => SCRIPT.test(r.style.fontFamily));
const fsOf = (tl) => Math.max(...runsOf(tl).map((r) => parseFloat(r.style.getPropertyValue("--fs")) || 40));
const baseline = (tl) => parseFloat(tl.style.getPropertyValue("--b")) || 0;

function lineItem(tl, f) {
  const b = baseline(tl);
  const fs = fsOf(tl);
  const runs = runsOf(tl);
  const x = runs.length ? f.box(runs[0]).x : 0;
  return { kind: isScript(tl) ? "script" : "line", el: tl, runs, y: b - fs * 0.72, x };
}

// ---------------------------------------------------------------- planning

function build(scene) {
  const f = frame(scene);
  const out = [];
  const lys = [...f.stage.querySelectorAll(":scope > .ly")].filter((l) => free(l) && ROLES.test(l.dataset.role));
  let t = 0;

  for (const g of lys.filter((l) => l.dataset.role === "ganesha")) {
    out.push({ at: 0, go: (at) => ganeshaIn(g, f, at) });
    t = 260;
  }
  for (const lg of lys.filter((l) => l.dataset.role === "logo")) {
    out.push({ at: 150, go: (at) => logoIn(lg, f, at) });
    t = Math.max(t, 400);
  }

  const flora = lys
    .filter((l) => l.dataset.role === "flora")
    .map((ly) => ({ ly, b: f.box(ly) }))
    .sort((a, b) => a.b.y - b.b.y || a.b.x - b.b.x);
  const k = flora.length > 12 ? 60 : 100;
  flora.forEach(({ ly }, i) => out.push({ at: t + 120 + i * k, go: (at) => floraIn(ly, at) }));

  const items = [];
  for (const tl of f.stage.querySelectorAll(".tl")) if (free(tl)) items.push(lineItem(tl, f));
  for (const ly of lys.filter((l) => l.dataset.role === "divider")) {
    const b = f.box(ly);
    items.push({ kind: "divider", el: ly, y: b.y + b.h / 2, x: b.x });
  }
  for (const sh of f.stage.querySelectorAll(":scope > .shape")) {
    if (!free(sh)) continue;
    const b = f.box(sh);
    items.push({ kind: "box", el: sh, y: b.y, x: b.x });
  }
  items.sort((a, b) => Math.abs(a.y - b.y) < 6 ? a.x - b.x : a.y - b.y);

  const start = TEXT_LEAD;
  let c = 0;
  const offs = items.map((it) => {
    const at = c;
    c += STEP[it.kind] || STEP.line;
    return at;
  });
  const last = offs.length ? offs[offs.length - 1] : 0;
  const kk = start + last > CASCADE_END && last ? (CASCADE_END - start) / last : 1;
  items.forEach((it, i) => out.push({ at: start + offs[i] * kk, go: (at) => itemIn(it, f, at) }));
  return out;
}

function play(plan) {
  for (const p of plan) p.go(Math.round(p.at));
}

// ---------------------------------------------------------------- primitives

function anim(el, frames, opts, done) {
  const a = el.animate(frames, { fill: "backwards", ...opts });
  a.id = "reveal";
  live.add(a);
  let over = false;
  const end = () => {
    if (over) return;
    over = true;
    live.delete(a);
    a.cancel();
    if (done) done();
  };
  a.addEventListener("finish", end, { once: true });
  a.addEventListener("cancel", end, { once: true });
  return a;
}

function floraIn(ly, delay) {
  const r = rectOf(ly);
  if (r.w * r.h > 1080 * r.H * 0.3) {          // large bed / frame: settle, never "grow"
    anim(ly, [{ opacity: 0 }, { opacity: 1 }], { duration: 1200, delay, easing: ease.soft });
    return;
  }
  const origin = stemOrigin(ly);
  const h = origin.split(" ")[0];
  const rot = h === "0%" ? -4 : h === "100%" ? 4 : 0;
  anim(ly, [
    { opacity: 0, transform: `rotate(${rot}deg) scale(0.85)`, transformOrigin: origin },
    { opacity: 1, transformOrigin: origin, offset: 0.45 },
    { opacity: 1, transform: "none", transformOrigin: origin },
  ], { duration: 1300, delay, easing: ease.out });
}

function ganeshaIn(ly, f, delay) {
  glowBehind(ly, f, delay, 3.2, 2300);
  anim(ly, [
    { opacity: 0, transform: `translateY(${12 * f.u}px)` },
    { opacity: 1, transform: "none" },
  ], { duration: 1100, delay: delay + 120, easing: ease.soft });
}

function logoIn(ly, f, delay) {
  glowBehind(ly, f, delay, 1.4, 2600);
  anim(ly, [
    { opacity: 0, transform: `translateY(${16 * f.u}px) scale(0.97)` },
    { opacity: 1, offset: 0.5 },
    { opacity: 1, transform: "none" },
  ], { duration: 1500, delay: delay + 160, easing: ease.soft });
}

// A warm glow that blooms behind a layer and settles to nothing (small node).
function glowBehind(ly, f, delay, k, duration) {
  const b = f.box(ly);
  const d = Math.min(1080, Math.max(b.w, b.h) * k);
  const glow = document.createElement("div");
  glow.className = "rv-glow";
  glow.setAttribute("aria-hidden", "true");
  Object.assign(glow.style, {
    left: `calc(${b.x + b.w / 2 - d / 2} * var(--u))`,
    top: `calc(${b.y + b.h / 2 - d / 2} * var(--u))`,
    width: `calc(${d} * var(--u))`,
    height: `calc(${d} * var(--u))`,
    zIndex: String((parseInt(ly.style.zIndex, 10) || 10) - 1),
  });
  ly.before(glow);
  extras.add(glow);
  anim(glow, [
    { opacity: 0, transform: "scale(0.55)" },
    { opacity: 1, transform: "scale(1)", offset: 0.38 },
    { opacity: 0.55, transform: "scale(1.08)", offset: 0.7 },
    { opacity: 0, transform: "scale(1.15)" },
  ], { duration, delay, easing: "ease-out" }, () => { glow.remove(); extras.delete(glow); });
}

function itemIn(it, f, delay) {
  switch (it.kind) {
    case "divider":
      anim(it.el, [
        { opacity: 0, transform: "scaleX(0)", transformOrigin: "50% 50%" },
        { opacity: 1, transformOrigin: "50% 50%", offset: 0.25 },
        { opacity: 1, transform: "none", transformOrigin: "50% 50%" },
      ], { duration: 950, delay, easing: ease.out });
      return;
    case "box":
      anim(it.el, [
        { opacity: 0, transform: "scale(0.9)" },
        { opacity: 1, offset: 0.6 },
        { opacity: 1, transform: "none" },
      ], { duration: 650, delay, easing: ease.out });
      return;
    case "script": return handwrite(it, f, delay);
    default: return lineIn(it, f, delay);
  }
}

function inkBox(it) {
  const t = it.el.getBoundingClientRect();
  const rs = it.runs.map((r) => r.getBoundingClientRect());
  return {
    w: t.width,
    l: Math.min(...rs.map((q) => q.left)) - t.left,
    r: Math.max(...rs.map((q) => q.right)) - t.left,
  };
}

// Animating the .tl (not its runs) keeps glyphs pixel-identical when it lets go.
function lineIn(it, f, delay) {
  if (!it.runs.length) return;
  anim(it.el, [
    { opacity: 0, transform: `translateY(${14 * f.u}px)` },
    { opacity: 1, transform: "none" },
  ], { duration: 560, delay, easing: ease.out });
}

// Handwriting: a soft-edged mask on the .tl sweeps left -> right across the line.
// Script swashes overhang their advance boxes, so the sweep runs past the ink box.
function handwrite(it, f, delay) {
  if (!it.runs.length) return;
  const el = it.el;
  const fs = fsOf(el);
  const k = inkBox(it);
  const over = fs * 0.6 * f.u;
  const x0 = Math.max(0, k.l - over), x1 = Math.min(k.w, k.r + over);
  const e = Math.max(10 * f.u, (x1 - x0) * 0.16);
  const W = k.w;
  el.style.setProperty("--rv-mi", `linear-gradient(90deg, #000 ${W}px, rgba(0,0,0,0) ${W + e}px)`);
  el.style.setProperty("--rv-ms", `${W + e}px 100%`);
  el.classList.add("rv-ink");
  const posProp = CSS.supports("mask-position", "0px 0px") ? "maskPosition" : "webkitMaskPosition";
  const D = Math.min(1050, Math.max(600, 380 + ((x1 - x0) / f.u) * 0.75));
  anim(el, [
    { [posProp]: `${x0 - W - e}px 0px` },
    { [posProp]: `${x1 - W}px 0px` },
  ], { duration: D, delay, easing: PEN }, () => {
    el.classList.remove("rv-ink");
    for (const p of ["--rv-mi", "--rv-ms"]) el.style.removeProperty(p);
  });
  anim(el, [{ opacity: 0.99 }, { opacity: 1 }], { duration: D, delay });
}

function releaseAll() {
  for (const a of [...live]) a.cancel();
  for (const x of extras) x.remove();
  extras.clear();
  document.querySelectorAll(".rv-ink").forEach((el) => {
    el.classList.remove("rv-ink");
    for (const p of ["--rv-mi", "--rv-ms"]) el.style.removeProperty(p);
  });
}
