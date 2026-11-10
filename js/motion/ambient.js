// ambient.js -- GENERIC idle life: flower sway + scroll parallax (ported from suryanshu-rajvi).
// See js/motion/kit.js for the contract. Properties written here (unclaimed flora only):
//   .ly[data-role=flora] > img   rotate (+ transform-origin)   idle sway (WAAPI)
//   .ly[data-role=flora]         translate                      scroll parallax
//
// RESTING FRAME. Sway loops are full sine cycles 0 -> +a -> 0 -> -a -> 0, so every
// cycle starts and ends on the PSD frame; parallax is 0 when the scene is centred.
//
// EDGES. Many florals are cut by the artboard edge and have no bleed. Anything that
// pulls a cut edge inward shows a sliver of what is under it, so sway amplitude is
// capped by how far the cut edge reaches from the pivot, and parallax for a layer
// cut at the top/bottom edge is one-sided (only ever pushes the cut edge off-stage).
// Parallax runs only on the paper slides (scenes with no "scenery" layer: logo,
// names, venue) -- in the illustrated scenes a drifting plant would float off the
// floor it stands on; their scene modules own any depth motion there.
import { reduced, onScene, stemOrigin, layers, stageOf, rectOf, free } from "./kit.js";

const ENTRANCE_MS = 2600;      // reveal.js one-shot entrance; ambient starts after it
const PARALLAX_MAX = 16;       // design px
const PARALLAX_K = 300;
const SWAY_TIP = [8, 12];      // target tip travel, design px
const SWAY_DEG = [0.4, 1.2];
const SWAY_EDGE_GAP = 5;       // max design px a cut edge may pull inward

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const OUT = "cubic-bezier(0.61, 1, 0.88, 1)";
const IN = "cubic-bezier(0.12, 0, 0.39, 0)";

const state = new WeakMap();
const visible = new Set();

export function init() {
  if (reduced) return;
  onScene("*", { enter, show, hide });
  window.addEventListener("scroll", requestParallax, { passive: true });
  window.addEventListener("resize", requestParallax, { passive: true });
}

const flora = (scene) => layers(scene, '[data-role="flora"]').filter(free);

function pivot(ly, g) {
  const [ox, oy] = stemOrigin(ly).split(" ").map((v) => parseFloat(v) / 100);
  return { px: g.x + ox * g.w, py: g.y + oy * g.h };
}

function swayAmplitude(ly, g) {
  const { px, py } = pivot(ly, g);
  const far = Math.max(...[[g.x, g.y], [g.x + g.w, g.y], [g.x, g.y + g.h], [g.x + g.w, g.y + g.h]]
    .map(([cx, cy]) => Math.hypot(cx - px, cy - py)));
  let deg = (rnd(...SWAY_TIP) / Math.max(far, 1)) * 180 / Math.PI;
  let edge = 0;
  if (g.top || g.bottom) edge = Math.max(edge, Math.abs(g.x - px), Math.abs(g.x + g.w - px));
  if (g.left || g.right) edge = Math.max(edge, Math.abs(g.y - py), Math.abs(g.y + g.h - py));
  if (edge) deg = Math.min(deg, (SWAY_EDGE_GAP / edge) * 180 / Math.PI);
  return clamp(deg, 0.25, SWAY_DEG[1]);
}

// big beds / frames do not sway (a stage-sized animated layer costs iOS GPU memory)
const sways = (scene) => flora(scene).filter((ly) => {
  const g = rectOf(ly);
  return !g.full && g.w * g.h < 1080 * g.H * 0.3;
});

// ---------------------------------------------------------------- lifecycle
function st(scene) {
  let s = state.get(scene);
  if (!s) state.set(scene, (s = { enteredAt: 0, visible: false, timer: 0, anims: null }));
  return s;
}

function enter(scene) {
  const s = st(scene);
  s.enteredAt = performance.now();
  if (s.visible) schedule(scene, s);
}

function show(scene) {
  const s = st(scene);
  s.visible = true;
  visible.add(scene);
  requestParallax();
  if (s.enteredAt) schedule(scene, s);
}

function hide(scene) {
  const s = st(scene);
  s.visible = false;
  visible.delete(scene);
  clearTimeout(s.timer);
  if (s.anims) for (const a of s.anims) a.pause();
}

function schedule(scene, s) {
  clearTimeout(s.timer);
  const w = Math.max(0, s.enteredAt + ENTRANCE_MS - performance.now());
  s.timer = setTimeout(() => run(scene, s), w);
}

function run(scene, s) {
  if (!s.visible) return;
  if (!s.anims) s.anims = sways(scene).map(startSway);
  else for (const a of s.anims) a.play();
}

// ---------------------------------------------------------------- sway
function startSway(ly) {
  const img = ly.querySelector("img");
  const a = swayAmplitude(ly, rectOf(ly)) * (Math.random() < 0.5 ? -1 : 1);
  img.style.transformOrigin = stemOrigin(ly);
  return img.animate([
    { rotate: "0deg", easing: OUT },
    { rotate: `${a.toFixed(3)}deg`, easing: IN },
    { rotate: "0deg", easing: OUT },
    { rotate: `${(-a).toFixed(3)}deg`, easing: IN },
    { rotate: "0deg" },
  ], { duration: rnd(5000, 9000), delay: rnd(0, 1800), iterations: Infinity });
}

// ---------------------------------------------------------------- parallax
let raf = 0;
function requestParallax() {
  if (!raf && visible.size) raf = requestAnimationFrame(parallax);
}

function parallax() {
  raf = 0;
  const vh = window.innerHeight;
  for (const scene of visible) {
    const stage = stageOf(scene);
    if (!stage) continue;
    const list = scene._plx || (scene._plx = plxLayers(scene));
    if (!list.length) continue;
    const r = stage.getBoundingClientRect();
    if (!r.width) continue;
    const u = r.width / 1080;
    const n = clamp((vh / 2 - (r.top + r.height / 2)) / ((vh + r.height) / 2), -1, 1);
    for (const p of list) {
      let ty = p.mode === "lin" ? -n * p.depth * PARALLAX_K : p.mode * n * n * p.depth * PARALLAX_K;
      ty = clamp(ty, -PARALLAX_MAX, PARALLAX_MAX) * u;
      if (Math.abs(ty - p.last) < 0.1) continue;
      p.last = ty;
      p.ly.style.translate = `0 ${ty.toFixed(2)}px`;
    }
  }
}

function plxLayers(scene) {
  if (layers(scene, '[data-role="scenery"]').length) return [];
  const list = flora(scene)
    .map((ly) => ({ ly, g: rectOf(ly), z: parseInt(ly.style.zIndex, 10) || 0 }))
    .filter(({ g }) => !g.full && !(g.top && g.bottom));
  list.sort((a, b) => a.z - b.z);
  return list.map(({ ly, g }, i) => ({
    ly,
    depth: 0.02 + 0.035 * (list.length > 1 ? i / (list.length - 1) : 0.5),
    mode: g.top ? -1 : g.bottom ? 1 : "lin",
    last: NaN,
  }));
}
