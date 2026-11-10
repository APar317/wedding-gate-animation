// touch.js -- tap a flower and it shivers and sheds a few petals (ported from suryanshu-rajvi).
// Only unclaimed [data-role=flora] layers (kit.free); a scene module that claims a
// flower owns its taps.
// See js/motion/kit.js for the contract. Writes only `.ly > img` transform (the
// shiver; ends at identity) and calls petals.burst. Decorative: keyboard users
// get nothing extra, reduced motion gets nothing.
//
// .ly has pointer-events:none, so taps land on the stage. A tap is a pointerup
// that moved <= 10 px and lasted <= 450 ms (anything else was a scroll/drag) and
// did not start on a link, button or other interactive element. The flower under the
// finger is found top-down by sampling each candidate layer's own alpha (drawn
// once into a small offscreen canvas, cached per layer).
import { reduced, stemOrigin, rectOf, free } from "./kit.js";
import { burst } from "./petals.js";

const MOVE_PX = 10;
const TAP_MS = 450;
const ALPHA_HIT = 40;
const SAMPLE_MAX = 160;         // offscreen alpha map, longest side (px)
const SHIVER_MS = 700;

const alphaCache = new WeakMap();
let down = null;

export function init() {
  if (reduced) return;
  document.addEventListener("pointerdown", onDown, { passive: true });
  document.addEventListener("pointerup", onUp, { passive: true });
  document.addEventListener("pointercancel", () => { down = null; }, { passive: true });
}

const interactive = (el) => el.closest("a, button, canvas, input, textarea, select, [role='button'], .hit");

function onDown(e) {
  if (!e.isPrimary || e.button > 0) { down = null; return; }
  const stage = e.target.closest && e.target.closest("[data-scene] .stage");
  down = stage && !interactive(e.target)
    ? { stage, x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId }
    : null;
}

function onUp(e) {
  const d = down;
  down = null;
  if (!d || e.pointerId !== d.id) return;
  if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > MOVE_PX) return;
  if (performance.now() - d.t > TAP_MS) return;
  if (interactive(e.target)) return;
  const ly = hitFlower(d.stage, e.clientX, e.clientY);
  if (!ly) return;
  const r = d.stage.getBoundingClientRect();
  const u = r.width / 1080;
  if (!isLarge(ly)) shiver(ly);
  burst(d.stage, { x: (e.clientX - r.left) / u, y: (e.clientY - r.top) / u, count: 8, spread: 130 });
}

// Large beds / frames: no wobble (would expose the cut edges and create a big GPU
// layer); they still shed petals.
function isLarge(ly) {
  const g = rectOf(ly);
  return g.full || g.w * g.h >= 1080 * g.H * 0.3;
}

function hitFlower(stage, cx, cy) {
  const cands = [...stage.querySelectorAll(':scope > .ly[data-role="flora"]')].filter(free)
    .sort((a, b) => (parseInt(b.style.zIndex, 10) || 0) - (parseInt(a.style.zIndex, 10) || 0));
  for (const ly of cands) {
    const r = ly.getBoundingClientRect();          // includes reveal/parallax offsets
    if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) continue;
    const map = alphaMap(ly);
    if (!map) continue;
    const x = Math.min(map.w - 1, Math.floor(((cx - r.left) / r.width) * map.w));
    const y = Math.min(map.h - 1, Math.floor(((cy - r.top) / r.height) * map.h));
    if (map.a[y * map.w + x] > ALPHA_HIT) return ly;
  }
  return null;
}

function alphaMap(ly) {
  if (alphaCache.has(ly)) return alphaCache.get(ly);
  const img = ly.querySelector("img");
  // released by memory.js (1x1 placeholder) or not decoded yet: try again next tap
  if (!img || !img.complete || img.naturalWidth <= 1 || img.dataset.src) return null;
  const k = Math.min(1, SAMPLE_MAX / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * k));
  const h = Math.max(1, Math.round(img.naturalHeight * k));
  let map = null;
  try {
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    const a = new Uint8Array(w * h);
    for (let i = 0; i < a.length; i++) a[i] = data[i * 4 + 3];
    map = { w, h, a };
    cv.width = cv.height = 0;                      // drop the backing store now
  } catch (err) {
    map = null;                                    // tainted canvas (file://): no hit-test
  }
  alphaCache.set(ly, map);
  return map;
}

// Decaying spring wobble about the stem; first and last frames are identity.
function shiver(ly) {
  const img = ly.querySelector("img");
  if (!img) return;
  if (img._shiver && img._shiver.playState === "running") return;
  const r = ly.getBoundingClientRect();
  const diag = Math.hypot(r.width, r.height) / (ly.closest(".stage").getBoundingClientRect().width / 1080);
  const a0 = Math.max(1, Math.min(3, (22 / diag) * 180 / Math.PI)) * (Math.random() < 0.5 ? -1 : 1);
  const steps = [0, 1, -0.72, 0.48, -0.3, 0.16, -0.07, 0];
  img.style.transformOrigin = stemOrigin(ly);
  img._shiver = img.animate(
    steps.map((s) => ({ transform: `rotate(${(a0 * s).toFixed(3)}deg)`, easing: "ease-in-out" })),
    { duration: SHIVER_MS, easing: "linear" },
  );
}
