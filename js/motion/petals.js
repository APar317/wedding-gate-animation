// petals.js -- falling blossoms. See js/motion/kit.js for the contract.
//
// API used by other modules:
//   burst(stage, { x, y, count, spread })  petals fly out from a design-px point, fall, fade
//   shower(stage, { count, duration })     petals rain across the whole stage once
// Both are no-ops under reduced motion and clean up their own nodes.
//
// Exported for scene modules too (e.g. a petal shower on the wedding slide).
// Sprites are cropped from the real PSD artwork by tools/make_petals.py
// (assets/fx/petal-*.webp) -- never drawn or generated.
//
// Each petal is a small <img> in one pointer-events:none overlay per stage
// (.fx-petals, inset 0 -> exactly stage-sized, never larger; the stage clips).
// Only transform + opacity animate. Nodes are removed by setTimeout, not only on
// "finish": hidden tabs freeze animations, and a frozen petal must still go.
import { reduced } from "./kit.js";

const SPRITES = [1, 2, 3].map((n) => new URL(`../../assets/fx/petal-${n}.webp`, import.meta.url).href);
const MAX_BURST = 14;
const MAX_SHOWER = 26;
const MAX_LIVE = 48;             // per stage: repeated taps can't pile up nodes

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[(Math.random() * a.length) | 0];

export function init() {
  if (reduced) return;
  // Warm the (tiny, ~4 KB each) sprites so the first burst isn't empty.
  for (const src of SPRITES) { const i = new Image(); i.decoding = "async"; i.src = src; }
}

function overlay(stage) {
  let o = stage.querySelector(":scope > .fx-petals");
  if (!o) {
    o = document.createElement("div");
    o.className = "fx-petals";
    o.setAttribute("aria-hidden", "true");
    stage.appendChild(o);
  }
  return o;
}

// One petal: size in design px, start point in design px, keyframes in CSS px.
function spawn(o, u, size, x, y, frames, opts) {
  if (o.childElementCount >= MAX_LIVE) return;
  const img = document.createElement("img");
  img.className = "fx-petal";
  img.alt = "";
  img.src = pick(SPRITES);
  img.decoding = "async";
  const s = size * u;
  img.style.width = `${s}px`;
  img.style.left = `${x * u - s / 2}px`;
  img.style.top = `${y * u - s / 2}px`;
  o.appendChild(img);
  const life = (opts.delay || 0) + opts.duration;
  let anim = null;
  try { anim = img.animate(frames, { fill: "both", ...opts }); } catch (e) { /* old engine: just remove */ }
  const done = () => { if (anim) anim.cancel(); img.remove(); };
  setTimeout(done, life + 120);
}

const tf = (x, y, r, sx, sc) => `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${r.toFixed(1)}deg) scale(${(sx * sc).toFixed(3)}, ${sc.toFixed(3)})`;

export function burst(stage, { x = 540, y = 960, count = 9, spread = 150 } = {}) {
  if (reduced || !stage) return;
  const n = Math.max(0, Math.min(MAX_BURST, count | 0));
  if (!n) return;
  const u = stage.getBoundingClientRect().width / 1080;
  if (!u) return;
  const o = overlay(stage);
  for (let i = 0; i < n; i++) {
    // Fan out, biased upward, then gravity takes over with a sideways drift.
    const a = (-90 + rnd(-75, 75)) * Math.PI / 180;
    const dist = spread * rnd(0.45, 1);
    const ox = Math.cos(a) * dist, oy = Math.sin(a) * dist * 0.75;
    const fall = rnd(220, 420) + spread * 0.6;
    const drift = rnd(-60, 60);
    const r0 = rnd(0, 360), spin = rnd(160, 420) * (Math.random() < 0.5 ? -1 : 1);
    const sc = rnd(0.7, 1.05);
    const P = (k, dx, dy, t, flip, s, op) => ({ offset: k, transform: tf(dx * u, dy * u, r0 + spin * t, flip, s), opacity: op });
    const frames = [
      P(0,    0,                 0,                    0,    1,    sc * 0.35, 0),
      P(0.08, ox * 0.35,         oy * 0.35,            0.08, 0.8,  sc * 0.9,  1),
      P(0.28, ox * 0.9,          oy * 0.95,            0.28, 0.45, sc,        1),
      P(0.5,  ox + drift * 0.4,  oy + fall * 0.3,      0.5,  -0.7, sc,        1),
      P(0.75, ox + drift * 0.8,  oy + fall * 0.65,     0.75, 0.35, sc,        0.85),
      P(1,    ox + drift,        oy + fall,            1,    0.9,  sc,        0),
    ];
    spawn(o, u, rnd(50, 74), x + rnd(-8, 8), y + rnd(-8, 8), frames, {
      duration: rnd(1500, 2300), delay: rnd(0, 120), easing: "cubic-bezier(0.25, 0.6, 0.4, 1)",
    });
  }
}

export function shower(stage, { count = 18, duration = 4200 } = {}) {
  if (reduced || !stage) return;
  const n = Math.max(0, Math.min(MAX_SHOWER, count | 0));
  if (!n) return;
  const r = stage.getBoundingClientRect();
  const u = r.width / 1080;
  if (!u) return;
  const H = r.height / u;                       // stage height in design px
  const o = overlay(stage);
  const spawnWindow = duration * 0.45;          // petals start across this window...
  const fallBase = (duration - spawnWindow) * Math.sqrt(H / 1920); // ...and fall for the rest
  for (let i = 0; i < n; i++) {
    const size = rnd(54, 80);
    const x = rnd(40, 1040);
    const y = -size;
    const dist = H + size * 2;
    const dur = fallBase * rnd(0.85, 1.1);
    const sway = rnd(40, 110) * (Math.random() < 0.5 ? -1 : 1);
    const r0 = rnd(0, 360), spin = rnd(180, 540) * (Math.random() < 0.5 ? -1 : 1);
    const sc = rnd(0.75, 1.05);
    const frames = [0, 0.2, 0.4, 0.6, 0.8, 1].map((k, j) => ({
      offset: k,
      transform: tf(Math.sin(k * Math.PI * 2.2) * sway * u, dist * k * u, r0 + spin * k, Math.cos(k * Math.PI * 3), sc),
      opacity: j === 0 ? 0 : j === 5 ? 0 : k > 0.8 ? 0.7 : 1,
    }));
    spawn(o, u, size, x, y, frames, { duration: dur, delay: (i / n) * spawnWindow + rnd(0, 150), easing: "linear" });
  }
}
