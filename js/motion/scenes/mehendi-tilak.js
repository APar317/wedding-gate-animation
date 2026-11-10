// scenes/mehendi-tilak.js -- per-scene motion for: mehendi (slide 3) + tilak (slide 4).
// OWNER: the mehendi-tilak motion agent. Edit ONLY this file and css/scenes/mehendi-tilak.css
// (+ sprites in assets/fx/mehendi-tilak/, made by tools/make_mehendi_tilak_fx.py).
// Contract: js/motion/kit.js. Reduced motion -> init() returns, nothing is built, both
// slides are the exact PSD frames. Layers only ever get transform / opacity; overlays are
// small nodes (or one bounded canvas, DPR <= 2, stopped when hidden).
//
// MEHENDI  sandstone courtyard, open sky above, couple on a cane sofa
//   enter   the sun comes through the skylight (sky glow, five shafts fan in, dust motes,
//           a pool of light on the platform); a breeze wakes the plants left -> right;
//           the lanterns catch; the couple rises softly into the PSD frame.
//   ambient shafts breathe and drift, motes float in them, lanterns flicker + glow pulse,
//           bougainvillea sways from its ledge and drops magenta bracts now and then,
//           palms / shrubs / tuberose / rose + lotus bowls sway on staggered phases and a
//           breeze ripples through them every ~11 s, the couple breathes.
//   tap     anywhere off the text: a henna paisley draws itself in henna-brown near the
//           finger (never over the text or the faces), then fades; rose petals and
//           bougainvillea bracts burst from it; the plant under the finger rustles.
//
// TILAK  carved sandstone arch, starry night in the window, toran with bells
//   enter   the stars light up one by one, the toran settles on its rail (decaying swing),
//           the couple rises softly into frame, one small welcome firework in the window.
//   ambient star specks twinkle, a slow shooting star crosses the window every ~9 s,
//           the toran sways as a pendulum from its top (bells glint, pearl beads glow),
//           a glint keeps catching the ring between their hands, the diya flickers,
//           plants sway on staggered phases + breeze, the couple breathes.
//   tap     a gold sparkle + glitter burst at the finger, and 2-3 small golden fireworks
//           bloom inside the night window only (the canvas sits BEHIND the arch, so the
//           arch is the window mask; the couple stays in front; dimmed behind the text).
import { onScene, reduced, claim, layer, sceneEl, stageOf, ease, unit, routeClear, tapAction } from "../kit.js";

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[(Math.random() * a.length) | 0];
const U = (n) => `calc(${Math.round(n * 100) / 100} * var(--u))`;
const SWING = "cubic-bezier(0.45, 0, 0.55, 1)";
const SPRITE = (n) => new URL(`../../../assets/fx/mehendi-tilak/${n}.webp`, import.meta.url).href;
const BRACTS = [1, 2, 3].map((i) => SPRITE(`bract-${i}`));
const ROSES = [1, 2].map((i) => SPRITE(`rose-petal-${i}`));

// ------------------------------------------------------------------ tiny toolkit
function fx(cls, box, z, tag = "div") {
  const n = document.createElement(tag);
  n.className = `mt-fx ${cls}`;
  n.setAttribute("aria-hidden", "true");
  if (box) place(n, box);
  if (z != null) n.style.zIndex = String(z);
  return n;
}
function place(n, [x, y, w, h]) {
  Object.assign(n.style, { left: U(x), top: U(y), width: U(w), height: U(h) });
}
// a node inside a layer wrapper, positioned in % of that layer's PSD rect
function inLayer(cls, [x, y, w, h], r) {
  const n = document.createElement("span");
  n.className = `mt-fx ${cls}`;
  n.setAttribute("aria-hidden", "true");
  Object.assign(n.style, {
    left: `${((x - r[0]) / r[2]) * 100}%`, top: `${((y - r[1]) / r[3]) * 100}%`,
    width: `${(w / r[2]) * 100}%`, height: `${(h / r[3]) * 100}%`,
  });
  return n;
}
function rectOf(ly) {
  const pc = (k) => parseFloat(ly.style[k]) / 100 || 0;
  return [pc("left") * 1080, pc("top") * 1920, pc("width") * 1080, pc("height") * 1920];
}

function state(scene) {
  return { scene, stage: stageOf(scene), visible: false, entered: false, loops: [], tickers: [], engines: [], tbx: null };
}
// A one-shot that rests on the CSS value afterwards (no fill forwards, no inline styles).
function once(el, frames, opts) {
  const a = el.animate(frames, { fill: "backwards", ...opts });
  a.addEventListener("finish", () => a.cancel(), { once: true });
  return a;
}
// An endless loop owned by the scene: paused while the scene is off screen.
function loop(st, el, frames, opts) {
  const a = el.animate(frames, { iterations: Infinity, ...opts });
  st.loops.push(a);
  if (!st.visible) a.pause();
  return a;
}
function later(fn, ms) { setTimeout(fn, ms); }
// A spawner that only ticks while the scene is visible.
function every(st, ms, fn) {
  const t = { ms, fn, id: 0 };
  st.tickers.push(t);
  if (st.visible) t.id = setInterval(fn, ms);
}
function showSt(st) {
  st.visible = true;
  st.scene.classList.remove("mt-away");
  for (const a of st.loops) a.play();
  for (const t of st.tickers) if (!t.id) t.id = setInterval(t.fn, t.ms);
  for (const e of st.engines) e.resume();
}
function hideSt(st) {
  st.visible = false;
  st.scene.classList.add("mt-away");
  for (const a of st.loops) a.pause();
  for (const t of st.tickers) { clearInterval(t.id); t.id = 0; }
  for (const e of st.engines) e.pause();
}

// Entrances wait (briefly) for the slide's claimed art to decode.
function ready(scene, fn) {
  const imgs = [...scene.querySelectorAll('[data-motion="custom"] img')];
  const dec = imgs.map((i) => (i.decode ? i.decode().catch(() => {}) : null));
  let done = false;
  const go = () => { if (!done) { done = true; fn(); } };
  Promise.all(dec).then(go);
  setTimeout(go, 900);
}

// Tap -> design px. Click (not pointerup): a scroll never fires one.
function tapPoint(st, e) {
  const r = st.stage.getBoundingClientRect();
  const k = 1080 / r.width;
  return [(e.clientX - r.left) * k, (e.clientY - r.top) * k];
}
// Live text boxes in design px (measured once, lazily, after the fonts settled).
function textBoxes(st) {
  if (st.tbx) return st.tbx;
  const r = st.stage.getBoundingClientRect();
  const k = 1080 / r.width;
  const out = [];
  for (const run of st.stage.querySelectorAll(".tb .r")) {
    const b = run.getBoundingClientRect();
    if (!b.width) continue;
    out.push([(b.left - r.left) * k - 22, (b.top - r.top) * k - 12, (b.right - r.left) * k + 22, (b.bottom - r.top) * k + 10]);
  }
  return (st.tbx = out);
}
const inBox = (x, y, [x0, y0, x1, y1], m = 0) => x > x0 - m && x < x1 + m && y > y0 - m && y < y1 + m;
// The nearest spot to (x, y) where a square of half-size `half` sits on the stage clear
// of every box (rings of candidates, nearest first); null if there is none.
function freeSpot(x, y, boxes, half) {
  const ok = (cx, cy) => cx - half > 8 && cx + half < 1072 && cy - half > 8 && cy + half < 1912 &&
    !boxes.some(([x0, y0, x1, y1]) => cx + half > x0 && cx - half < x1 && cy + half > y0 && cy - half < y1);
  if (ok(x, y)) return [x, y];
  for (let r = 30; r < 1000; r += 30) {
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      const cx = x + Math.cos(a) * r, cy = y + Math.sin(a) * r;
      if (ok(cx, cy)) return [cx, cy];
    }
  }
  return null;
}
const box4 = ([x, y, w, h]) => [x, y, x + w, y + h];

// Four-point glint at a design-px point (removes itself).
function spark(parent, x, y, size, z, dur = 750, gold = false, box = null) {
  const s = box ? inLayer("mt-spark", [x - size / 2, y - size / 2, size, size], box) : fx("mt-spark", [x - size / 2, y - size / 2, size, size], z);
  if (gold) s.classList.add("mt-spark--gold");
  s.appendChild(document.createElement("i"));
  parent.appendChild(s);
  const r = rnd(-25, 25);
  s.animate([
    { opacity: 0, transform: `scale(0.2) rotate(${r}deg)` },
    { opacity: 1, transform: `scale(1) rotate(${r + 25}deg)`, offset: 0.4 },
    { opacity: 0, transform: `scale(0.3) rotate(${r + 55}deg)` },
  ], { duration: dur, easing: "ease-out", fill: "both" });
  setTimeout(() => s.remove(), dur + 80);
}

// ------------------------------------------------------------------ plants
// [id, mode, origin, amp deg, side, period ms]
//   mode  x = skewX about the foot (tops sway, the foot never moves -- a grounded plant)
//         y = skewY about the cut side (leaves reaching in from a stage edge bob; the edge
//             column never moves)     r = rotate about the attachment (a hanging creeper)
//   side  0 = both ways; +1 / -1 = only ever toward that side: a layer cut by the stage
//         edge only bends OUT, so its cut edge never pulls in and shows a sliver.
const tf = (mode, v) => mode === "y" ? `skewY(${v.toFixed(3)}deg)` : mode === "r" ? `rotate(${v.toFixed(3)}deg)` : `skewX(${v.toFixed(3)}deg)`;
// a smooth full cycle that starts and ends on the PSD frame
function swayFrames(mode, amp, side, n = 24) {
  const ph = rnd(0, 6.28);
  const f = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const v = side
      ? side * amp * ((1 - Math.cos(2 * Math.PI * t)) / 2) * (0.82 + 0.18 * Math.sin(4 * Math.PI * t + ph))
      : amp * (0.78 * Math.sin(2 * Math.PI * t) + 0.22 * Math.sin(6 * Math.PI * t));
    f.push({ transform: tf(mode, v) });
  }
  return f;
}
// a decaying gust: starts and ends at 0 (one-sided for cut layers)
function gustFrames(mode, amp, side, { cycles = 2.2, decay = 2.6, n = 36 } = {}) {
  const f = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const env = amp * Math.exp(-decay * t) * (1 - t * t);
    const v = side ? side * env * (1 - Math.cos(2 * Math.PI * cycles * t)) / 2 : env * Math.sin(2 * Math.PI * cycles * t);
    f.push({ transform: tf(mode, v) });
  }
  return f;
}
function plants(st, scene, cfg) {
  const list = [];
  for (const [id, mode, origin, amp, side, period] of cfg) {
    const ly = layer(scene, id);
    if (!ly) continue;
    claim(ly);
    const img = ly.querySelector("img");
    ly.style.transformOrigin = origin;
    img.style.transformOrigin = origin;
    const r = rectOf(ly);
    list.push({ ly, img, mode, amp, side, period, cx: r[0] + r[2] / 2, box: box4(r), last: 0 });
  }
  return list;
}
function gust(p, k = 1.5, delay = 0) {
  const now = performance.now();
  if (now - p.last < 900) return;
  p.last = now + delay;
  once(p.ly, gustFrames(p.mode, p.amp * k, p.side), { duration: rnd(2300, 2900), delay, easing: "linear" });
}
// the breeze crosses the slide from one side
function breeze(list, k = 1.2, dir = 1) {
  for (const p of list) gust(p, k, ((dir > 0 ? p.cx : 1080 - p.cx) / 1080) * 900);
}
function startSway(st, list) {
  list.forEach((p, i) => loop(st, p.img, swayFrames(p.mode, p.amp, p.side), {
    duration: p.period, delay: (i % 5) * 380 + rnd(0, 400), easing: "linear",
  }));
}

// The couple: rises softly into the PSD frame, then only breathes (on the wrapper, so
// anything parented to it -- the ring glint -- breathes with it).
function coupleIn(ly, u, delay) {
  ly.style.transformOrigin = "50% 100%";
  once(ly, [
    { opacity: 0, transform: `translateY(${(38 * u).toFixed(2)}px) scale(0.985)` },
    { opacity: 1, offset: 0.55 },
    { opacity: 1, transform: "none" },
  ], { duration: 1700, delay, easing: ease.out });
}
function coupleBreathe(st, ly, u) {
  loop(st, ly, [
    { transform: "none", easing: SWING },
    { transform: `translateY(${(-1.6 * u).toFixed(2)}px) scale(1.0045)`, easing: SWING },
    { transform: "none" },
  ], { duration: 5200 });
}

// Falling sprites (petals / bracts) in an overlay; transform + opacity only.
const ptf = (x, y, r, sx, sc) => `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${r.toFixed(1)}deg) scale(${(sx * sc).toFixed(3)}, ${sc.toFixed(3)})`;
function sprite(o, src, size, x, y, frames, opts, cap = 60) {
  if (o.childElementCount >= cap) return;
  const img = document.createElement("img");
  img.className = "mt-petal";
  img.alt = "";
  img.decoding = "async";
  img.src = src;
  img.style.width = U(size);
  img.style.left = U(x - size / 2);
  img.style.top = U(y - size / 2);
  o.appendChild(img);
  let a = null;
  try { a = img.animate(frames, { fill: "both", ...opts }); } catch (e) { /* old engine */ }
  setTimeout(() => { if (a) a.cancel(); img.remove(); }, (opts.delay || 0) + opts.duration + 120);
}
function petalBurst(o, u, x, y, n, srcs, spread = 150) {
  for (let i = 0; i < n; i++) {
    const a = (-90 + rnd(-85, 85)) * Math.PI / 180;
    const dist = spread * rnd(0.4, 1);
    const ox = Math.cos(a) * dist, oy = Math.sin(a) * dist * 0.8;
    const fall = rnd(240, 420) * (spread / 150) ** 0.6, drift = rnd(-70, 70);
    const r0 = rnd(0, 360), spin = rnd(160, 420) * (Math.random() < 0.5 ? -1 : 1);
    const sc = rnd(0.7, 1.05);
    const P = (k, dx, dy, t, flip, s, op) => ({ offset: k, transform: ptf(dx * u, dy * u, r0 + spin * t, flip, s), opacity: op });
    sprite(o, pick(srcs), rnd(32, 46), x + rnd(-10, 10), y + rnd(-10, 10), [
      P(0, 0, 0, 0, 1, sc * 0.35, 0),
      P(0.08, ox * 0.35, oy * 0.35, 0.08, 0.8, sc * 0.9, 1),
      P(0.28, ox * 0.9, oy * 0.95, 0.28, 0.45, sc, 1),
      P(0.5, ox + drift * 0.4, oy + fall * 0.3, 0.5, -0.7, sc, 1),
      P(0.75, ox + drift * 0.8, oy + fall * 0.65, 0.75, 0.35, sc, 0.85),
      P(1, ox + drift, oy + fall, 1, 0.9, sc, 0),
    ], { duration: rnd(1800, 2700), delay: rnd(0, 180), easing: "cubic-bezier(0.25, 0.6, 0.4, 1)" }, 96);
  }
}

// Bounded canvas engine (design-px drawing; DPR <= 2; rAF only while visible AND busy).
function engine(st, canvas, box, draw, busy) {
  const ctx = canvas.getContext("2d");
  let raf = 0, last = 0, k = 1, paused = !st.visible;
  const size = () => {
    const w = canvas.getBoundingClientRect().width;
    if (!w) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.round(w * dpr), H = Math.round(w * dpr * box[3] / box[2]);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    k = W / box[2];
  };
  const frame = (now) => {
    raf = 0;
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(k, 0, 0, k, -box[0] * k, -box[1] * k);
    draw(ctx, dt, now);
    if (!paused && busy()) raf = requestAnimationFrame(frame);
    else { last = 0; if (!busy()) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); } }
  };
  const e = {
    kick() { if (!raf && !paused) { size(); raf = requestAnimationFrame(frame); } },
    pause() { paused = true; if (raf) cancelAnimationFrame(raf); raf = 0; last = 0; },
    resume() { paused = false; if (busy()) e.kick(); },
  };
  window.addEventListener("resize", () => { if (raf) size(); }, { passive: true });
  st.engines.push(e);
  return e;
}
function dotSprite([r, g, b]) {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const x = c.getContext("2d");
  const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(0.18, `rgba(${r},${g},${b},0.9)`);
  gr.addColorStop(0.45, `rgba(${r},${g},${b},0.28)`);
  gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
  x.fillStyle = gr;
  x.fillRect(0, 0, 32, 32);
  return c;
}

export function init() {
  if (reduced) return;
  const m = sceneEl("mehendi");
  const t = sceneEl("tilak");
  const mod = new Map();
  if (m) { const x = initMehendi(m); if (x) mod.set(m, x); }
  if (t) { const x = initTilak(t); if (x) mod.set(t, x); }
  // fail-safe (print / bfcache): never leave the armed couple hidden
  window.addEventListener("pagehide", () => [m, t].forEach((s) => s && s.classList.add("mt-go")));
  onScene(["mehendi", "tilak"], {
    enter(scene) { const x = mod.get(scene); if (x) ready(scene, () => { scene.classList.add("mt-go"); x.enter(); }); },
    show(scene) { const x = mod.get(scene); if (x) showSt(x.st); },
    hide(scene) { const x = mod.get(scene); if (x) hideSt(x.st); },
  });
}

// ===================================================================== MEHENDI
const M_PLANTS = [
  ["bougainvillea-left", "r", "18% 4%", 2.4, 0, 6400],
  ["bougainvillea-right", "r", "82% 4%", 2.4, 0, 7100],
  ["palm-small-left", "x", "50% 100%", 1.5, 0, 6800],
  ["palm-small-right", "x", "50% 100%", 1.25, 1, 7600],
  ["shrub-left", "x", "50% 100%", 1.8, -1, 5600],
  ["shrub-right", "x", "50% 100%", 1.7, 1, 6100],
  ["palm-pot-left", "x", "50% 100%", 1.35, 0, 7300],
  ["palm-pot-right", "x", "50% 100%", 1.35, 0, 6700],
  ["tuberose-pot-left", "x", "50% 100%", 1.5, -1, 5200],
  ["tuberose-pot-right", "x", "50% 100%", 1.5, 1, 5800],
  ["lotus-bowl-left", "x", "50% 100%", 1.5, -1, 6200],
  ["lotus-bowl-right", "x", "50% 100%", 1.5, 1, 6900],
  ["rose-bowl-left", "x", "50% 100%", 2.1, 0, 4800],
  ["rose-bowl-right", "x", "50% 100%", 2.1, 0, 5300],
];
// sun shafts from the skylight (its lower lip is y ~205, x 300-775): [x0, y0, w, len, deg, peak]
// The two long ones fan out over the pillars; the three short ones fade out above "20th".
const M_BEAMS = [
  [322, 196, 150, 800, 13, 1],
  [432, 204, 96, 300, 5, 0.75],
  [545, 204, 156, 270, 0, 0.62],
  [656, 204, 96, 300, -6, 0.75],
  [758, 196, 160, 800, -12, 1],
];
const M_LANTERNS = [["lantern-1", 167, 1629], ["lantern-2", 233, 1711], ["lantern-3", 806, 1711], ["lantern-4", 871, 1629]];
const M_FACES = [[452, 990, 192, 112]];          // both faces + hair (couple layer, design px)
// couple + sofa + mehendi tray (data/scenes.json rects, union) padded 16: the henna never
// touches the bride's dupatta, the sofa or the couple -- open wall / steps only
const M_COUPLE = [208 - 16, 991 - 16, 870 + 16, 1522 + 16];
const M_BOUG = [[170, 330, 120, 250], [750, 915, 120, 260]];   // bract drop zones [x0, x1, y0, y1]
// Henna motif, drawn in a 300x300 viewBox: a large paisley (lower left), a small mirrored
// paisley (upper right) joined to it by a vine, two dot-ringed flowers, dot borders.
// The paisley paths are authored in a 200-unit box and placed by a group transform.
const PAISLEY = "M150 42 C122 18 66 30 52 78 C38 126 68 170 113 168 C158 166 178 122 160 96 C146 76 118 82 120 104 C122 121 141 121 144 107";
const PAISLEY_IN = "M140 56 C116 42 82 54 71 86 C61 118 82 150 112 152 C138 154 152 132 146 116";
const PAISLEY_FLOWER = "M98 128 C92 118 98 108 106 112 C114 104 122 114 116 122 C124 128 118 140 108 136 C104 146 90 142 94 134 C86 132 88 122 98 128 Z";
const PAISLEY_DOTS = [[37, 82], [36, 104], [42, 127], [55, 149], [75, 167], [100, 179], [127, 181], [153, 172], [173, 152], [185, 127], [185, 100]];
const G_MAIN = { tx: -4, ty: 60, k: 1.15, flip: 1 };
const G_SMALL = { tx: 296, ty: 4, k: 0.52, flip: -1 };
const gmap = (g, [x, y]) => [g.tx + g.flip * g.k * x, g.ty + g.k * y];
// a flower: n teardrop petals around (cx, cy), from radius r0 to r1
function flowerPath(cx, cy, r0, r1, n) {
  let d = "";
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, w = Math.PI / n * 0.9;
    const P = (r, t) => `${(cx + Math.cos(t) * r).toFixed(1)} ${(cy + Math.sin(t) * r).toFixed(1)}`;
    d += `M${P(r0, a)} Q${P(r1 * 0.8, a - w)} ${P(r1, a)} Q${P(r1 * 0.8, a + w)} ${P(r0, a)} `;
  }
  return d;
}
const ring = (cx, cy, r, n, ph = 0) => Array.from({ length: n }, (_, i) => {
  const a = ph + (i / n) * Math.PI * 2;
  return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
});
// [d, group, delay ms, duration ms, kind]  kind: line = paste + wet shine, fine = single line
const HENNA = [
  [PAISLEY, G_MAIN, 0, 1450, "line"],
  [PAISLEY_IN, G_MAIN, 520, 1050, "fine"],
  [PAISLEY_FLOWER, G_MAIN, 1150, 700, "fine"],
  ["M60 95 C70 92 74 100 70 106", G_MAIN, 1350, 260, "fine"],
  ["M64 128 C74 126 80 134 74 140", G_MAIN, 1450, 260, "fine"],
  ["M168 108 C190 124 214 118 232 98", null, 1400, 520, "line"],
  ["M206 120 C204 108 212 100 220 104 C220 114 214 120 206 120 Z", null, 1700, 300, "fine"],
  [PAISLEY, G_SMALL, 1800, 950, "line"],
  [PAISLEY_IN, G_SMALL, 2250, 600, "fine"],
  [flowerPath(72, 52, 9, 27, 8), null, 1500, 900, "fine"],
  [flowerPath(256, 248, 6, 19, 6), null, 2300, 650, "fine"],
];
const HENNA_DOTS = [
  ...PAISLEY_DOTS.map((p) => [...gmap(G_MAIN, p), 4.2, 1650]),
  ...ring(72, 52, 38, 14, 0.2).map((p) => [...p, 3.4, 2000]),
  [72, 52, 5.5, 2000],
  ...ring(256, 248, 28, 10).map((p) => [...p, 3, 2550]),
  [256, 248, 4.5, 2550],
  ...[[150, 190], [134, 204], [120, 214]].map((p) => [...p, 3.4, 2400]),
];
const HENNA_END = 4300;                           // fully drawn by ~3.0 s, holds, then fades

function initMehendi(scene) {
  const st = state(scene);
  const stage = st.stage;
  const L = (id) => layer(scene, id);
  const couple = L("couple");
  const arch = L("arch-1"), pillar = L("pillar-1"), wall = L("wall");
  if (!couple || !arch || !pillar || !wall) return null;
  claim(couple);
  const list = plants(st, scene, M_PLANTS);

  // ---- sunlight: sky glow behind the arch, shafts + motes in front of the pillars,
  //      a pool of light on the platform (all below the sofa, couple and text)
  const sun = fx("mt-sun", [330, -150, 420, 420], 2);
  wall.after(sun);
  const pool = fx("mt-pool", [190, 1388, 700, 190], 3);
  arch.after(pool);
  const beams = M_BEAMS.map(([x, y, w, len, deg, peak]) => {
    const b = fx("mt-beam", [x - w / 2, y, w, len], 12);
    b.style.transform = `rotate(${deg}deg)`;
    b.style.setProperty("--pk", String(peak));
    b._deg = deg; b._peak = peak;
    return b;
  });
  const motes = [];
  for (let i = 0; i < 14; i++) {
    const side = i % 3;                            // left shaft / right shaft / under the skylight
    const x = side === 0 ? rnd(200, 330) : side === 1 ? rnd(750, 880) : rnd(380, 700);
    const y = side === 2 ? rnd(230, 400) : rnd(260, 820);
    const d = rnd(5, 10);
    motes.push(fx("mt-mote", [x - d / 2, y - d / 2, d, d], 12));
  }
  pillar.after(...beams, ...motes);

  // ---- lanterns: a flickering flame + a warm glow on the steps (with each lantern)
  const lamps = M_LANTERNS.map(([id, x, y]) => {
    const ly = L(id);
    if (!ly) return null;
    claim(ly);
    const glow = fx("mt-lglow", [x - 150, y - 138, 300, 300], parseInt(ly.style.zIndex, 10));
    const flame = fx("mt-flame", [x - 15, y - 24, 30, 44], parseInt(ly.style.zIndex, 10));
    ly.after(glow, flame);
    return { glow, flame };
  }).filter(Boolean);

  // ---- falling bracts, tap petals + henna: above the couple, below the text
  const fall = fx("mt-layer", null, parseInt(couple.style.zIndex, 10));
  fall.style.inset = "0";
  couple.after(fall);

  function enter() {
    st.entered = true;
    const u = unit(stage);
    // the sun comes in
    once(sun, [{ opacity: 0, transform: "scale(0.7)" }, { opacity: 1, transform: "none" }], { duration: 1800, easing: ease.soft });
    beams.forEach((b, i) => once(b, [
      { opacity: 0, transform: `rotate(${b._deg + (b._deg >= 0 ? 4 : -4)}deg) scaleY(0.6)` },
      { opacity: b._peak, transform: `rotate(${b._deg}deg)` },
    ], { duration: 1900, delay: 150 + i * 140, easing: ease.out }));
    once(pool, [{ opacity: 0, transform: "scaleX(0.6)" }, { opacity: 1, transform: "none" }], { duration: 1600, delay: 900, easing: ease.soft });
    motes.forEach((n) => once(n, [{ opacity: 0 }, { opacity: 0.85 }], { duration: 900, delay: 700 + rnd(0, 900) }));
    // lanterns catch
    lamps.forEach(({ glow, flame }, i) => {
      const d = 500 + i * 180;
      once(flame, [
        { opacity: 0, transform: "scale(0.3)" }, { opacity: 1, transform: "scale(1.2)", offset: 0.25 },
        { opacity: 0.5, offset: 0.4 }, { opacity: 1, transform: "none" },
      ], { duration: 900, delay: d });
      once(glow, [{ opacity: 0, transform: "scale(0.5)" }, { opacity: 1, transform: "none" }], { duration: 1200, delay: d + 100, easing: ease.out });
    });
    // the couple rises into frame; a breeze wakes the plants left -> right
    coupleIn(couple, u, 250);
    breeze(list, 1.6, 1);
    later(() => ambient(u), 2100);
    later(() => drop(), 1600);
  }

  function ambient(u) {
    startSway(st, list);
    coupleBreathe(st, couple, u);
    loop(st, sun, [{ opacity: 1, transform: "none" }, { opacity: 0.62, transform: "scale(1.06)" }, { opacity: 1, transform: "none" }],
      { duration: 7000, easing: "ease-in-out" });
    loop(st, pool, [{ opacity: 1 }, { opacity: 0.55 }, { opacity: 1 }], { duration: 6400, delay: 800, easing: "ease-in-out" });
    beams.forEach((b, i) => {
      const d = b._deg, pk = b._peak, k = 1.3 * (i % 2 ? -1 : 1);
      loop(st, b, [
        { transform: `rotate(${d}deg)`, opacity: pk, easing: SWING },
        { transform: `rotate(${d + k}deg)`, opacity: pk * 0.45, offset: 0.35, easing: SWING },
        { transform: `rotate(${d - k * 0.4}deg)`, opacity: pk * 0.85, offset: 0.7, easing: SWING },
        { transform: `rotate(${d}deg)`, opacity: pk },
      ], { duration: 6200 + i * 900, delay: i * 500 });
    });
    for (const n of motes) {
      const dx = rnd(-34, 34) * u, dy = rnd(30, 90) * u;
      loop(st, n, [
        { transform: "none", opacity: 0.85 },
        { transform: `translate(${dx * 0.5}px, ${dy * 0.4}px)`, opacity: 0.25, offset: 0.4 },
        { transform: `translate(${dx}px, ${dy}px)`, opacity: 0.9, offset: 0.75 },
        { transform: "none", opacity: 0.85 },
      ], { duration: rnd(7000, 11000), delay: rnd(0, 2000), easing: "ease-in-out" });
    }
    lamps.forEach(({ glow, flame }, i) => {
      loop(st, flame, [
        { opacity: 1, transform: "none" }, { opacity: 0.78, transform: "scale(0.92, 1.06)", offset: 0.12 },
        { opacity: 1, transform: "scale(1.05, 0.96)", offset: 0.2 }, { opacity: 0.86, transform: "scale(0.96, 1.08) skewX(2deg)", offset: 0.38 },
        { opacity: 1, transform: "none", offset: 0.5 }, { opacity: 0.7, transform: "scale(0.94, 1.04) skewX(-2deg)", offset: 0.66 },
        { opacity: 0.95, transform: "scale(1.04, 0.98)", offset: 0.8 }, { opacity: 1, transform: "none" },
      ], { duration: 1500 + i * 230, easing: "ease-in-out" });
      loop(st, glow, [
        { opacity: 1, transform: "none" }, { opacity: 0.6, transform: "scale(0.94)", offset: 0.45 },
        { opacity: 0.85, offset: 0.55 }, { opacity: 1, transform: "none" },
      ], { duration: 2800 + i * 420, delay: i * 300, easing: "ease-in-out" });
    });
    every(st, 11000, () => breeze(list, 1.15, Math.random() < 0.5 ? 1 : -1));
    every(st, 2300, () => { if (Math.random() < 0.8) drop(); });
  }

  // a bougainvillea bract lets go of the creeper and drifts down beside its pillar
  function drop() {
    if (!st.visible) return;
    const u = unit(stage);
    const size = rnd(30, 40);
    // routed clear of the text (kit.routeClear): down the side bands, or faded out above it
    const path = routeClear(stage, () => {
      const left = Math.random() < 0.5;
      const [x0, x1, y0, y1] = M_BOUG[left ? 0 : 1];
      const x = rnd(x0, x1), y = rnd(y0, y1);
      const dist = rnd(560, 820), dx = (left ? -1 : 1) * rnd(40, 150), sway = rnd(26, 50);
      return { x, y, r: size * 0.6, pos: (k) => [x + dx * k + Math.sin(k * Math.PI * 3) * sway, y + dist * k] };
    });
    if (!path) return;
    const { x, y, run } = path;
    const r0 = rnd(0, 360), spin = rnd(200, 480) * (Math.random() < 0.5 ? -1 : 1), sc = rnd(0.85, 1.15);
    const N = 20;
    const frames = Array.from({ length: N + 1 }, (_, j) => {
      const o = j / N, k = o * run;
      const [px, py] = path.pos(k);
      return {
        offset: o,
        transform: ptf((px - x) * u, (py - y) * u, r0 + spin * k, Math.cos(k * Math.PI * 4), sc),
        opacity: j === 0 ? 0 : o > 0.85 ? (1 - o) / 0.15 : 1,
      };
    });
    sprite(fall, pick(BRACTS), size, x, y, frames, { duration: rnd(6500, 9000) * run, easing: "linear" }, 24);
  }

  // ---- tap: henna + petals (+ rustle the plant under the finger)
  let lastTap = 0;
  stage.addEventListener("click", (e) => {
    if (!st.entered || (e.target.closest && e.target.closest("a, button"))) return;
    const [x, y] = tapPoint(st, e);
    tapAt(x, y);
  });
  tapAction("mehendi", () => { if (st.entered) tapAt(540, 1606); });   // the slide's pill
  function tapAt(x, y) {
    const tb = textBoxes(st);
    const now = performance.now();
    if (now - lastTap < 350) return;
    lastTap = now;
    for (const p of list) if (inBox(x, y, p.box)) gust(p, 1.4);
    // a tap anywhere (the text included) draws the henna in the nearest open spot
    const spot = hennaSpot(x, y, [...tb, ...M_FACES.map(box4), M_COUPLE]);
    if (!spot) return;
    const [hx, hy, S] = spot;
    henna(hx, hy, S);
    petalBurst(fall, unit(stage), hx, hy, 12, ROSES, 300);
    petalBurst(fall, unit(stage), hx, hy, 8, BRACTS, 300);
  }

  // The open wall / floor areas the motif fits in: [centre x, centre y, size S] in design px.
  // The steps between the lanterns and the rose bowls (below the couple + sofa box) and
  // the wall beside the pillar tops either side of the skylight take a 320 px motif. The
  // clear square is 0.48 S (the motif's reach once rotated), so it never meets the text
  // (incl. script swashes), the faces or the couple + sofa.
  const SPOTS = [[540, 1716, 320], [180, 380, 320], [900, 380, 320]];
  function hennaSpot(x, y, boxes) {
    const ok = (cx, cy, S) => freeSpot(cx, cy, boxes, S * 0.48)?.[0] === cx;
    const cands = SPOTS.filter(([cx, cy, S]) => ok(cx, cy, S))
      .sort((a, b) => Math.hypot(a[0] - x, a[1] - y) - Math.hypot(b[0] - x, b[1] - y));
    if (!cands.length) return null;
    const [cx, cy, S] = cands[0];
    for (const k of [0.2, 0.1]) {                         // lean a little toward the finger if it still fits
      const px = cx + (x - cx) * k, py = cy + (y - cy) * k;
      if (ok(px, py, S)) return [px, py, S];
    }
    return [cx, cy, S];
  }

  function henna(x, y, S) {
    const NS = "http://www.w3.org/2000/svg";
    const wrap = fx("mt-henna", [x - S / 2, y - S / 2, S, S]);
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 300 300");
    wrap.style.transform = `rotate(${rnd(-12, 12).toFixed(1)}deg) scale(${Math.random() < 0.5 ? -1 : 1}, 1)`;
    wrap.appendChild(svg);
    fall.appendChild(wrap);
    const PEN = "cubic-bezier(0.3, 0.05, 0.55, 1)";       // a near-even pen speed
    for (const [d, g, delay, dur, kind] of HENNA) {
      let host = svg;
      if (g) {
        host = document.createElementNS(NS, "g");
        host.setAttribute("transform", `translate(${g.tx} ${g.ty}) scale(${g.flip * g.k} ${g.k})`);
        svg.appendChild(host);
      }
      const k = g ? g.k : 1;
      for (const cls of kind === "line" ? ["mt-h-paste", "mt-h-shine"] : ["mt-h-fine"]) {
        const p = document.createElementNS(NS, "path");
        p.setAttribute("d", d);
        p.setAttribute("class", cls);
        const w = cls === "mt-h-paste" ? 7.2 : cls === "mt-h-shine" ? 2 : 4.2;
        p.style.strokeWidth = String(w / k);              // same line weight at any group scale
        host.appendChild(p);
        const len = p.getTotalLength();
        p.style.strokeDasharray = `${len} ${len}`;
        p.style.strokeDashoffset = String(len);
        p.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: dur, delay, easing: PEN, fill: "forwards" });
      }
    }
    HENNA_DOTS.forEach(([cx, cy, r, at], i) => {
      const c = document.createElementNS(NS, "circle");
      c.setAttribute("cx", cx.toFixed(1)); c.setAttribute("cy", cy.toFixed(1)); c.setAttribute("r", r);
      c.setAttribute("class", "mt-h-dot");
      c.style.transformOrigin = `${cx.toFixed(1)}px ${cy.toFixed(1)}px`;
      svg.appendChild(c);
      c.animate([{ opacity: 0, transform: "scale(0)" }, { opacity: 1, transform: "scale(1.35)", offset: 0.6 }, { opacity: 1, transform: "none" }],
        { duration: 240, delay: at + (i % 14) * 45, fill: "both", easing: "ease-out" });
    });
    const T = HENNA_END + 900;
    wrap.animate([{ opacity: 1 }, { opacity: 1, offset: HENNA_END / T }, { opacity: 0 }], { duration: T, easing: "ease-in", fill: "both" });
    setTimeout(() => wrap.remove(), T + 100);
  }

  return { st, enter };
}

// ===================================================================== TILAK
const T_PLANTS = [
  ["palm-small-left", "y", "0% 50%", 2.6, 0, 6200],
  ["palm-small-right", "x", "50% 100%", 1.25, 1, 7200],
  ["tuberose-pot-left", "x", "50% 100%", 1.7, 0, 5400],
  ["tuberose-pot-right", "x", "50% 100%", 1.6, 1, 5900],
  ["lotus-bowl-left", "x", "50% 100%", 1.6, -1, 6300],
  ["lotus-bowl-right", "x", "50% 100%", 1.6, 1, 6800],
  ["rose-bowl-left", "x", "50% 100%", 2.2, 0, 4900],
  ["rose-bowl-right", "x", "50% 100%", 2.2, 0, 5500],
];
const T_WIN = [284, 326, 518, 820];               // the night window (behind the arch), x y w h
// the star specks of the stars layer (local maxima, brightest first), design px
const T_STARS = [[378, 1030], [296, 438], [297, 469], [572, 601], [400, 444], [604, 343], [514, 336], [532, 376], [690, 580],
  [652, 343], [414, 408], [490, 418], [751, 571], [601, 382], [416, 368], [405, 340], [428, 343], [441, 361], [510, 412], [302, 671],
  [384, 649], [538, 469], [553, 632], [421, 425], [572, 626], [443, 505], [584, 474], [536, 424], [566, 562], [358, 638], [774, 608],
  [590, 459], [648, 1028], [507, 611], [372, 612], [319, 743], [310, 481], [526, 538], [615, 456], [323, 558], [590, 586], [563, 494],
  [316, 688], [346, 687], [526, 982], [785, 949], [792, 553], [298, 799], [732, 704], [667, 400], [393, 766], [669, 723], [380, 810]];
// shooting-star lanes through the open sky of the window (between / below the text lines)
const T_LANES = [[[792, 985], [600, 1095]], [[792, 570], [590, 612]], [[702, 398], [546, 450]], [[795, 758], [630, 800]]];
const T_TOP = [0, 0, 1080, 502];                  // toran rect
const T_BELLS = [[538, 122], [328, 226], [750, 226], [152, 309], [914, 307], [60, 471], [1007, 471]];   // glint spots (bell shoulders)
const T_BEADS = [[118, 35], [265, 38], [420, 38], [565, 38], [700, 38], [843, 38], [268, 80], [400, 82], [670, 72], [840, 80], [293, 110], [815, 110]];
const T_RING = [586, 1343];
const T_DIYA = [909, 1580];
const T_FACES = [[392, 1030, 140, 140], [690, 1208, 124, 132]];
// burst centres: the window's open sky bands (top arch, between the text blocks, below the text)
const T_FREE = [[540, 400], [450, 420], [640, 420], [680, 1040], [560, 1060], [380, 1000], [700, 780], [400, 780], [690, 575]];
const FW_COLS = [[255, 214, 120], [255, 236, 180], [255, 196, 96], [255, 250, 232]];

function initTilak(scene) {
  const st = state(scene);
  const stage = st.stage;
  const L = (id) => layer(scene, id);
  const couple = L("couple"), toran = L("toran"), stars = L("stars"), arch = L("arch");
  if (!couple || !toran || !stars || !arch) return null;
  claim(couple, toran);
  const list = plants(st, scene, T_PLANTS);

  // ---- the night window: twinkles, shooting star, fireworks -- all BEHIND the arch,
  //      so the carved arch is the window mask (and the couple stays in front)
  const sky = fx("mt-sky", T_WIN, 2);
  const W = (x, y, w, h) => [x - T_WIN[0], y - T_WIN[1], w, h];
  const twinkles = T_STARS.map(([x, y], i) => {
    const big = i < 12;
    const d = big ? rnd(30, 40) : rnd(14, 22);
    const n = fx(big ? "mt-star mt-star--big" : "mt-star", W(x - d / 2, y - d / 2, d, d));
    if (big) n.appendChild(document.createElement("i"));
    sky.appendChild(n);
    return n;
  });
  const shoot = fx("mt-shoot", W(0, 0, 230, 5));
  sky.appendChild(shoot);
  const canvas = fx("mt-canvas", [0, 0, T_WIN[2], T_WIN[3]], null, "canvas");
  sky.appendChild(canvas);
  stars.after(sky);

  // ---- toran: glints + pearl glows ride inside its wrapper (they sway with it)
  toran.style.transformOrigin = "50% 0";
  const beads = T_BEADS.map(([x, y]) => inLayer("mt-bead", [x - 20, y - 20, 40, 40], T_TOP));
  toran.append(...beads);
  // ---- ring glint rides inside the couple wrapper (it breathes with them)
  const cr = rectOf(couple);
  const halo = inLayer("mt-ring-halo", [T_RING[0] - 26, T_RING[1] - 26, 52, 52], cr);
  couple.appendChild(halo);
  // ---- the diya by the right pot (baked into the arch)
  const diyaGlow = fx("mt-lglow mt-lglow--diya", [T_DIYA[0] - 70, T_DIYA[1] - 62, 140, 140], 3);
  const diyaFlame = fx("mt-flame", [T_DIYA[0] - 12, T_DIYA[1] - 20, 24, 38], 3);
  arch.after(diyaGlow, diyaFlame);
  // ---- tap sparkle layer: above the toran, below the text
  const tapLayer = fx("mt-layer", null, parseInt(toran.style.zIndex, 10));
  tapLayer.style.inset = "0";
  toran.after(tapLayer);

  // ---- golden fireworks on the window canvas (design px). Each burst: a warm sky glow,
  //      a white-hot core flash, then stars with long glittering trails that shed sparkle
  //      dust. Peony ~220-280 px across at peak (~40-55 % of the 518 px window); willow
  //      droops in gold; ring = a two-colour double ring. Behind the text everything is
  //      drawn at 22 % (the glow at 40 %).
  const sprites = FW_COLS.map(dotSprite);
  const glowSprite = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const x = c.getContext("2d");
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,214,150,0.6)");
    g.addColorStop(0.4, "rgba(255,180,110,0.2)");
    g.addColorStop(1, "rgba(255,180,110,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    return c;
  })();
  const rockets = [], parts = [], glows = [];
  const CAP = 1100;
  const RAIL = 1150;
  let dimBoxes = [];
  const inText = (x, y) => dimBoxes.some((b) => inBox(x, y, b));
  const dim = (x, y) => (inText(x, y) ? 0.22 : 1);
  const add = (p) => { if (parts.length < CAP) parts.push(p); };
  const launch = (x, y, kind) => {
    if (!dimBoxes.length) dimBoxes = textBoxes(st);
    rockets.push({ x0: x + rnd(-40, 40), y0: RAIL, x, y, t: 0, dur: rnd(0.5, 0.7), kind, trail: [] });
    fwe.kick();
  };
  const star = (x, y, a, R, o) => {
    const c = o.c, life = o.life, v = (R * c) / (1 - Math.exp(-c * life * 0.85));
    add({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life, c, g: o.g, col: o.col, size: o.size, kind: o.kind, tr: [], tl: o.tl });
  };
  const explode = (r) => {
    const R = rnd(128, 162);
    glows.push({ x: r.x, y: r.y, t: 0, life: 0.9, s: R * 3.4 });
    add({ flash: true, x: r.x, y: r.y, t: 0, life: 0.32, s: 150 });
    add({ flash: true, x: r.x, y: r.y, t: 0, life: 0.14, s: 90 });
    const col = (Math.random() * 3) | 0;
    if (r.kind === "willow") {
      for (let i = 0; i < 56; i++) star(r.x, r.y, (i / 56) * 6.283 + rnd(-0.06, 0.06), R * rnd(0.85, 1),
        { c: 1.25, life: rnd(2.3, 2.9), g: 70, col: 2, size: 13, kind: "willow", tl: 30 });
    } else if (r.kind === "ring") {
      for (let i = 0; i < 44; i++) star(r.x, r.y, (i / 44) * 6.283, R, { c: 1.5, life: rnd(1.7, 2.0), g: 30, col, size: 15, kind: "peony", tl: 14 });
      for (let i = 0; i < 28; i++) star(r.x, r.y, (i / 28) * 6.283 + 0.1, R * 0.55, { c: 1.5, life: rnd(1.5, 1.8), g: 30, col: 3, size: 13, kind: "peony", tl: 10 });
    } else {
      for (let i = 0; i < 88; i++) {
        const outer = Math.random() < 0.78;
        star(r.x, r.y, (i / 88) * 6.283 + rnd(-0.04, 0.04), R * (outer ? rnd(0.9, 1) : rnd(0.35, 0.75)),
          { c: 1.55, life: rnd(1.7, 2.2), g: 42, col: Math.random() < 0.22 ? 3 : col, size: 15, kind: "peony", tl: 16 });
      }
    }
  };
  const fwe = engine(st, canvas, T_WIN, (ctx, dt) => {
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let i = glows.length - 1; i >= 0; i--) {          // warm sky glow behind each burst
      const g = glows[i];
      g.t += dt;
      const f = g.t / g.life;
      if (f >= 1) { glows.splice(i, 1); continue; }
      ctx.globalAlpha = (f < 0.12 ? f / 0.12 : (1 - f) / 0.88) * (inText(g.x, g.y) ? 0.4 : 0.85);
      const d = g.s * (0.7 + 0.4 * f);
      ctx.drawImage(glowSprite, g.x - d / 2, g.y - d / 2, d, d);
    }
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i];
      r.t += dt;
      const e = Math.min(1, r.t / r.dur), q = 1 - Math.pow(1 - e, 2.2);
      const x = r.x0 + (r.x - r.x0) * q, y = r.y0 + (r.y - r.y0) * q;
      r.trail.unshift([x, y]);
      if (r.trail.length > 16) r.trail.pop();
      r.trail.forEach(([tx, ty], j) => {
        ctx.globalAlpha = 0.9 * (1 - j / 16) * dim(tx, ty);
        const d = 18 - j * 0.9;
        ctx.drawImage(sprites[j ? 0 : 3], tx - d / 2, ty - d / 2, d, d);
      });
      if (Math.random() < 0.5) add({ dust: true, x: x + rnd(-3, 3), y, t: 0, life: rnd(0.25, 0.45), size: 7, col: 0, vy: 30 });
      if (e >= 1) { rockets.splice(i, 1); explode(r); }
    }
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.t += dt;
      const f = p.t / p.life;
      if (f >= 1) { parts.splice(i, 1); continue; }
      if (p.flash) {                                       // white-hot core
        ctx.globalAlpha = (1 - f) * (1 - f) * dim(p.x, p.y);
        const d = p.s * (0.45 + 0.8 * f);
        ctx.drawImage(sprites[3], p.x - d / 2, p.y - d / 2, d, d);
        continue;
      }
      if (p.dust) {                                        // sparkle dust shed by a trail
        p.y += p.vy * dt;
        ctx.globalAlpha = (1 - f) * (Math.random() < 0.5 ? 1 : 0.35) * dim(p.x, p.y);
        ctx.drawImage(sprites[p.col], p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        continue;
      }
      const drag = Math.exp(-p.c * dt);
      p.vx *= drag; p.vy = p.vy * drag + p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      let al = f < 0.6 ? 1 : (1 - f) / 0.4;
      if (p.kind === "willow") al = f < 0.25 ? 1 : 1 - (f - 0.25) / 0.75;
      if (f > 0.45) al *= 0.45 + 0.55 * Math.random();      // glitter as it dies
      if (f > 0.15 && f < 0.92 && Math.random() < 0.07) add({ dust: true, x: p.x, y: p.y, t: 0, life: rnd(0.35, 0.7), size: rnd(5, 8), col: p.col === 3 ? 3 : 1, vy: 16 });
      if (p.kind === "peony" && f > 0.62 && Math.random() < 0.025) add({ flash: true, x: p.x, y: p.y, t: 0, life: 0.1, s: 26 });
      al *= dim(p.x, p.y);
      const [cr2, cg, cb] = FW_COLS[p.col];
      ctx.strokeStyle = `rgb(${cr2},${cg},${cb})`;
      p.tr.unshift(p.x, p.y);
      if (p.tr.length > p.tl * 2) p.tr.length = p.tl * 2;
      if (p.tr.length > 2) {                               // the long trail, fading to its tail
        const n = p.tr.length / 2;
        const seg = Math.max(1, Math.ceil(n / 3));
        for (let s0 = 0; s0 < n - 1; s0 += seg) {
          const s1 = Math.min(n - 1, s0 + seg);
          ctx.globalAlpha = al * (p.kind === "willow" ? 0.5 : 0.6) * (1 - s0 / n);
          ctx.lineWidth = (p.kind === "willow" ? 2.2 : 2.8) * (1 - (0.5 * s0) / n);
          ctx.beginPath();
          ctx.moveTo(p.tr[s0 * 2], p.tr[s0 * 2 + 1]);
          for (let j = s0 + 1; j <= s1; j++) ctx.lineTo(p.tr[j * 2], p.tr[j * 2 + 1]);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = al;
      ctx.drawImage(sprites[p.col], p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }, () => rockets.length + parts.length + glows.length > 0);

  function enter() {
    st.entered = true;
    const u = unit(stage);
    // stars light up one by one
    twinkles.forEach((s) => once(s, [
      { opacity: 0, transform: "scale(0.2)" }, { opacity: 1, transform: "scale(1.3)", offset: 0.5 }, { opacity: 0.7, transform: "none" },
    ], { duration: 700, delay: 150 + rnd(0, 1600), easing: ease.out }));
    // the toran settles on its rail
    once(toran, toranSwing(0.9, 2.2, 2.1), { duration: 3600, delay: 100, easing: "linear" });
    beads.forEach((b) => once(b, [{ opacity: 0 }, { opacity: 0.9, offset: 0.5 }, { opacity: 0.35 }], { duration: 900, delay: 600 + rnd(0, 1200) }));
    coupleIn(couple, u, 300);
    list.forEach((p, i) => gust(p, 1.5, 200 + i * 90));
    once(diyaGlow, [{ opacity: 0, transform: "scale(0.5)" }, { opacity: 1, transform: "none" }], { duration: 1100, delay: 700, easing: ease.out });
    once(diyaFlame, [{ opacity: 0, transform: "scale(0.3)" }, { opacity: 1, transform: "scale(1.2)", offset: 0.3 }, { opacity: 1, transform: "none" }], { duration: 800, delay: 600 });
    later(() => { if (st.visible) launch(540, 382, "peony"); }, 1900);
    later(() => ambient(u), 2200);
  }

  // skew pendulum about the toran's top rail; scaleX grows with |skew| so the lower
  // corners never pull in from the cut side edges
  function toranSwing(amp, cycles, decay, n = 40) {
    const f = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const v = amp * Math.exp(-decay * t) * (1 - t * t) * Math.sin(2 * Math.PI * cycles * t);
      f.push({ transform: `skewX(${v.toFixed(3)}deg) scaleX(${(1 + Math.abs(v) * 0.011).toFixed(4)})` });
    }
    return f;
  }

  function ambient(u) {
    startSway(st, list);
    coupleBreathe(st, couple, u);
    // toran: a slow pendulum
    const n = 24, a = 0.55, f = [];
    for (let i = 0; i <= n; i++) {
      const v = a * Math.sin((2 * Math.PI * i) / n);
      f.push({ transform: `skewX(${v.toFixed(3)}deg) scaleX(${(1 + Math.abs(v) * 0.011).toFixed(4)})` });
    }
    loop(st, toran, f, { duration: 6400, delay: 1500, easing: "linear" });   // after the settle
    for (const s of twinkles) {
      const lo = rnd(0.08, 0.35);
      loop(st, s, [
        { opacity: 0.7, transform: "none" }, { opacity: lo, transform: "scale(0.55)", offset: 0.4 },
        { opacity: 1, transform: "scale(1.15)", offset: 0.6 }, { opacity: 0.7, transform: "none" },
      ], { duration: rnd(1800, 4600), delay: rnd(0, 3000), easing: "ease-in-out" });
    }
    beads.forEach((b) => loop(st, b, [{ opacity: 0.35 }, { opacity: rnd(0.75, 1) }, { opacity: 0.35 }],
      { duration: rnd(2400, 4200), delay: rnd(0, 2400), easing: "ease-in-out" }));
    loop(st, halo, [{ opacity: 0.2, transform: "scale(0.7)" }, { opacity: 1, transform: "scale(1.1)", offset: 0.12 }, { opacity: 0.2, transform: "scale(0.7)", offset: 0.4 }, { opacity: 0.2, transform: "scale(0.7)" }],
      { duration: 3000, easing: "ease-in-out" });
    loop(st, diyaFlame, [
      { opacity: 1, transform: "none" }, { opacity: 0.8, transform: "scale(0.92, 1.07)", offset: 0.15 },
      { opacity: 1, transform: "scale(1.05, 0.95) skewX(2deg)", offset: 0.35 }, { opacity: 0.75, transform: "scale(0.95, 1.05) skewX(-2deg)", offset: 0.65 },
      { opacity: 1, transform: "none" },
    ], { duration: 1400, easing: "ease-in-out" });
    loop(st, diyaGlow, [{ opacity: 1 }, { opacity: 0.65 }, { opacity: 0.95 }, { opacity: 1 }], { duration: 2600, easing: "ease-in-out" });
    // glints: a bell catches the light; the ring flashes in time with its halo
    every(st, 560, () => {
      const [x, y] = pick(T_BELLS);
      spark(toran, x + rnd(-6, 6), y + rnd(-5, 5), rnd(46, 62), null, rnd(700, 950), true, T_TOP);
    });
    every(st, 3000, () => spark(couple, T_RING[0], T_RING[1], 46, null, 900, false, cr));
    spark(couple, T_RING[0], T_RING[1], 46, null, 900, false, cr);
    let nextShoot = performance.now() + 2500;
    every(st, 500, () => {
      const now = performance.now();
      if (now < nextShoot) return;
      nextShoot = now + rnd(6500, 11000);
      shootingStar();
    });
    every(st, 12000, () => breeze(list, 1.15, Math.random() < 0.5 ? 1 : -1));
  }

  function shootingStar() {
    const [[x0, y0], [x1, y1]] = pick(T_LANES);
    const u = unit(stage);
    const ang = Math.atan2(y1 - y0, x1 - x0) * 180 / Math.PI;
    const len = Math.hypot(x1 - x0, y1 - y0);
    // the streak's head is its right end; place its tail at the lane start
    shoot.style.left = U(x0 - T_WIN[0] - 230);
    shoot.style.top = U(y0 - T_WIN[1] - 2.5);
    shoot.style.transformOrigin = "100% 50%";
    shoot.animate([
      { opacity: 0, transform: `rotate(${ang}deg) translateX(0px) scaleX(0.3)` },
      { opacity: 1, transform: `rotate(${ang}deg) translateX(${len * 0.3 * u}px) scaleX(1)`, offset: 0.3 },
      { opacity: 0, transform: `rotate(${ang}deg) translateX(${len * u}px) scaleX(0.6)` },
    ], { duration: 1500, easing: "cubic-bezier(0.3, 0.2, 0.5, 1)" });
  }

  // ---- tap: sparkle + glitter at the finger, golden fireworks in the window
  let lastFw = 0;
  stage.addEventListener("click", (e) => {
    if (!st.entered || (e.target.closest && e.target.closest("a, button"))) return;
    const [x, y] = tapPoint(st, e);
    tapAt(x, y);
  });
  tapAction("tilak", () => { if (st.entered) tapAt(null, null); });     // the slide's pill
  // A tap anywhere (the text included): glitter at the finger (off the faces / text),
  // and 2-4 fireworks in the window. From the pill (no finger): fireworks only.
  function tapAt(x, y) {
    const tb = textBoxes(st);
    const finger = x != null;
    const onText = finger && tb.some((b) => inBox(x, y, b));
    if (finger) for (const p of list) if (inBox(x, y, p.box)) gust(p, 1.4);
    const spot = finger && !onText && freeSpot(x, y, T_FACES.map(box4), 34);
    if (spot) glitter(spot[0], spot[1]);
    const now = performance.now();
    if (now - lastFw < 1100) return;
    lastFw = now;
    const pts = [];
    const inWin = finger && x > T_WIN[0] + 30 && x < T_WIN[0] + T_WIN[2] - 30 && y > T_WIN[1] + 40 && y < 1110;
    if (inWin && !tb.some((b) => inBox(x, y, b, 20))) pts.push([x, y]);
    const free = T_FREE.slice().sort(() => Math.random() - 0.5);
    const n = Math.random() < 0.5 ? 3 : 4;
    while (pts.length < n) pts.push(free.pop());
    const kinds = ["peony", pick(["willow", "ring"]), "peony", "ring"];
    pts.forEach(([px, py], i) => setTimeout(() => launch(px + rnd(-14, 14), py + rnd(-12, 12), kinds[i]), i * rnd(330, 460)));
  }

  function glitter(x, y) {
    const u = unit(stage);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + rnd(-0.3, 0.3);
      const d = rnd(50, 120);
      const sz = rnd(40, 58);
      const s = fx("mt-spark mt-spark--gold", [x - sz / 2, y - sz / 2, sz, sz]);
      s.appendChild(document.createElement("i"));
      tapLayer.appendChild(s);
      const dx = Math.cos(a) * d * u, dy = Math.sin(a) * d * u, r = rnd(0, 90), sc = rnd(0.6, 1.2);
      s.animate([
        { opacity: 0, transform: `translate(0,0) scale(0.2) rotate(${r}deg)` },
        { opacity: 1, transform: `translate(${dx * 0.6}px, ${dy * 0.6}px) scale(${sc}) rotate(${r + 40}deg)`, offset: 0.35 },
        { opacity: 0, transform: `translate(${dx}px, ${dy + 30 * u}px) scale(0.2) rotate(${r + 90}deg)` },
      ], { duration: rnd(800, 1100), easing: "cubic-bezier(0.2, 0.7, 0.4, 1)", fill: "both" });
      setTimeout(() => s.remove(), 1200);
    }
    for (let i = 0; i < 16; i++) {
      const d = rnd(6, 11);
      const g = fx(Math.random() < 0.6 ? "mt-glitter" : "mt-glitter mt-glitter--w", [x - d / 2, y - d / 2, d, d]);
      tapLayer.appendChild(g);
      const vx = rnd(-160, 160), vy = rnd(-200, -40), T = rnd(1.1, 1.6);
      const fr = [];
      for (let k = 0; k <= 6; k++) {
        const t = (k / 6) * T;
        fr.push({ transform: `translate(${(vx * t * 0.8) * u}px, ${(vy * t + 220 * t * t) * u}px)`, opacity: k === 0 ? 0 : k === 6 ? 0 : (k % 2 ? 1 : 0.45) });
      }
      g.animate(fr, { duration: T * 1000, easing: "linear", fill: "both" });
      setTimeout(() => g.remove(), T * 1000 + 80);
    }
  }

  return { st, enter };
}
