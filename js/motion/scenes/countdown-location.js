// scenes/countdown-location.js -- motion for the two slides added after the PSD
// delivery (client feedback 2026-10-23): countdown (before the RSVP slide) and location (last).
// Edit ONLY this file and css/scenes/countdown-location.css. Contract: js/motion/kit.js.
// Neither slide has PSD layers: one painted base (tools/make_scene_art.py) + live HTML.
// The headings are ordinary .tb text (reveal.js cascades them); the tiles / venue cards
// rise in from CSS on .is-entered; js/countdown.js ticks the numbers.
//
//   countdown  ambient  the lamp tower's and the floating diyas' flames flicker (small
//                       glow sprites on the painted flames), a few stars twinkle
//              tap      the river (or the "Tap to float a diya" pill) -> a diya is set
//                       on the water with a ripple and drifts downstream, fading out
//   location   ambient  golden-hour light breathes behind the Taj Mahal
//              (no pill: the two "Open in Maps" buttons are the slide's action)
//              the "Designed by Shagun Studio India" credit under the cards rises in
//              after them (claimed here, timed in the CSS)
//
// All loops run only while their slide is on screen (.cl-live). Reduced motion:
// nothing is built -- the painted frame, the live text and the live numbers only.
import { onScene, reduced, sceneEl, stageOf, unit, tapAction, ease, claim } from "../kit.js";

const DIYA = new URL("../../../assets/fx/countdown/diya.webp", import.meta.url).href;

// Painted flames on assets/layers/countdown/base.webp, design px [x, y, glow size].
// Found as the brightest warm blobs of the base (top of each flame, not its reflection).
const FLAMES = [
  [33, 1028, 64], [97, 1024, 64], [56, 1088, 64], [111, 1090, 64], [50, 1155, 64], [98, 1153, 64],
  [31, 1222, 64], [117, 1223, 64], [28, 1287, 64], [101, 1286, 64], [47, 1354, 64], [104, 1355, 64],
  [17, 1422, 64], [106, 1422, 64],                                   // the brass deepstambh
  [350, 1528, 76], [427, 1603, 84], [500, 1513, 70], [782, 1580, 84], [869, 1682, 92],
  [980, 1530, 64], [1055, 1553, 64],                                 // floating diyas
  [152, 1543, 80], [393, 1706, 84], [951, 1815, 110], [1049, 1834, 110],   // diyas on the ghat
];
// Faint stars in the open sky, kept off the text block (y 230..960) except at the edges.
const STARS = [
  [140, 120], [262, 78], [418, 150], [610, 96], [742, 168], [880, 112], [990, 236],
  [72, 312], [1012, 420], [46, 610], [1030, 700], [86, 880],
];
const RIVER_TOP = 1190;          // taps below this line set a diya on the water
const MAX_DIYAS = 24;

export function init() {
  if (reduced) return;
  countdown();
  location();
}

function live(slug) {
  onScene(slug, {
    show: (s) => s.classList.add("cl-live"),
    hide: (s) => s.classList.remove("cl-live"),
  });
}

function spot(stage, cls, x, y, vars) {
  const el = document.createElement("span");
  el.className = cls;
  el.setAttribute("aria-hidden", "true");
  el.style.left = `calc(${x} * var(--u))`;
  el.style.top = `calc(${y} * var(--u))`;
  for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v);
  stage.appendChild(el);
  return el;
}

// ------------------------------------------------------------------ countdown
function countdown() {
  const sc = sceneEl("countdown");
  if (!sc) return;
  const stage = stageOf(sc);
  FLAMES.forEach(([x, y, s], i) => spot(stage, "cl-glow", x, y, {
    "--s": s, "--t": `${(1.1 + ((i * 0.37) % 0.9)).toFixed(2)}s`, "--d": `${(-((i * 0.53) % 1.7)).toFixed(2)}s`, "z-index": 2,
  }));
  STARS.forEach(([x, y], i) => spot(stage, "cl-star", x, y, {
    "--t": `${(3.2 + ((i * 0.71) % 2.6)).toFixed(2)}s`, "--d": `${(-((i * 1.13) % 4)).toFixed(2)}s`, "z-index": 2,
  }));
  live("countdown");

  const live_ = new Set();
  const float = (x, y) => {
    if (live_.size >= MAX_DIYAS) {
      const first = live_.values().next().value;
      if (first) { live_.delete(first); first.remove(); }
    }
    const u = unit(stage);
    const wrap = document.createElement("span");
    wrap.className = "cl-diya";
    wrap.setAttribute("aria-hidden", "true");
    wrap.innerHTML = `<img src="${DIYA}" alt="" decoding="async">`;
    wrap.style.left = `calc(${x} * var(--u))`;
    wrap.style.top = `calc(${y} * var(--u))`;
    stage.appendChild(wrap);
    live_.add(wrap);
    // drifts downstream (right) and away (up the river, smaller), then fades
    // perspective: the painted diyas grow from ~60 design px mid-river to ~110 at the ghat
    const k = Math.min(1.05, Math.max(0.55, 0.55 + ((y - 1250) / 500) * 0.5));
    const dx = (150 + Math.random() * 120) * k * u, dy = -(70 + Math.random() * 50) * k * u;
    const a = wrap.animate([
      { opacity: 0, transform: `translate(0, 12%) scale(${0.75 * k})` },
      { opacity: 1, transform: `translate(0, 0) scale(${k})`, offset: 0.08 },
      { opacity: 1, transform: `translate(${dx * 0.6}px, ${dy * 0.6}px) scale(${0.88 * k})`, offset: 0.7 },
      { opacity: 0, transform: `translate(${dx}px, ${dy}px) scale(${0.8 * k})` },
    ], { duration: 9000, easing: "linear", fill: "both" });
    const end = () => { live_.delete(wrap); wrap.remove(); };
    a.addEventListener("finish", end, { once: true });
    a.addEventListener("cancel", end, { once: true });
    const ring = spot(stage, "cl-ripple", x, y + 22 * k, {});
    ring.animate([
      { opacity: 0.9, transform: `scale(${0.25 * k})` },
      { opacity: 0, transform: `scale(${1.5 * k})` },
    ], { duration: 1300, easing: ease.out, fill: "both" }).addEventListener("finish", () => ring.remove(), { once: true });
  };
  const randomSpot = () => [300 + Math.random() * 640, 1420 + Math.random() * 220];   // below the pill
  tapAction("countdown", () => float(...randomSpot()));

  // a tap on the river itself sets the diya where the finger landed
  let down = null;
  const interactive = (el) => el.closest && el.closest("a, button, input, textarea, select, [role='button']");
  document.addEventListener("pointerdown", (e) => {
    down = e.isPrimary && !interactive(e.target) && stage.contains(e.target)
      ? { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId } : null;
  }, { passive: true });
  document.addEventListener("pointerup", (e) => {
    const d = down;
    down = null;
    if (!d || e.pointerId !== d.id || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 12 || performance.now() - d.t > 600) return;
    const r = stage.getBoundingClientRect();
    const u = r.width / 1080;
    const x = (e.clientX - r.left) / u, y = (e.clientY - r.top) / u;
    if (y < RIVER_TOP) return;
    float(Math.min(1010, Math.max(240, x)), Math.min(1720, y));
  }, { passive: true });
  document.addEventListener("pointercancel", () => { down = null; }, { passive: true });
  onScene("countdown", { hide: () => live_.forEach((w) => w.getAnimations().forEach((a) => a.finish())) });
}

// ------------------------------------------------------------------ location
function location() {
  const sc = sceneEl("location");
  if (!sc) return;
  spot(stageOf(sc), "cl-sun", 0, 0, { "z-index": 2, left: "", top: "" });
  // the studio credit (build.py credit_html) rises in after the cards, from CSS
  claim(sc.querySelector('[data-text="location.credit"]'));
  live("location");
}
