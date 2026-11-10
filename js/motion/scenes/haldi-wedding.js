// scenes/haldi-wedding.js -- per-scene motion for: haldi (slide 5) + wedding (slide 6).
// OWNER: the haldi-wedding motion agent. Edit ONLY this file, css/scenes/haldi-wedding.css,
// assets/fx/haldi-wedding/ and tools/make_haldi_wedding_fx.py (sprites + the geometry
// tables below). Contract: js/motion/kit.js. Layer ids: README.md ("Scene -> layer ids").
//
// HALDI  entrance: the parasols and marigold strings (each its own sprite, split from the
//        two strand layers) and the three wicker lamps drop in from above, left -> right,
//        and settle with a damped swing; the canopy rustles, the flowers bloom from their
//        stems, the string lights flicker on, the couple rises softly into place.
//        Ambient: every hanging thing swings on its own string in a passing breeze (baked
//        multi-sine pendulums, compositor-driven), the canopy / flowers / tulips / stands
//        sway, the string lights breathe and a chase of light runs along the bulbs, the haze
//        pulses warm, the peacock nods now and then and glints run over its tail eyes, a
//        marigold now and then lets go of a string, the couple breathes.
//        Tap anywhere: a burst of yellow haldi + pink gulal powder clouds, dust and marigold
//        petals from the tap point. The clouds are pushed around the live text block and
//        the couple's faces, never over them.
// WEDDING entrance: the 25 garlands are lowered from the canopy in a wave and swing to
//        rest; the fairy lights switch on far -> near; the candles ignite down the aisle;
//        the couple walks the last steps up the aisle into the PSD frame.
//        Ambient: garlands swing in a breeze that travels across the canopy; the canopy
//        breathes; stars twinkle in the empty navy sky; fairy lights breathe and twinkle;
//        every candle flickers with a glow; light sweeps and glints run along the water;
//        lotuses bob; elephants sway (<= 0.9 deg, about their feet, out of phase); a rose
//        petal now and then drifts down from a garland.
//        Tap anywhere: a blessing shower of rose + marigold petals from the canopy, and 2-3
//        golden fireworks bloom in the navy sky (behind all the art and dimmed behind the
//        text); the candles flare.
//
// RESTING FRAME. Every loop is a full cycle that starts and ends at identity; entrances are
// fill:"backwards" and cancelled on finish. Split sprites (parasol strands, peacock) are
// lossless cuts that tile the layer exactly, so at rest the stack is the PSD frame.
// Reduced motion: init() returns before building anything (and the armed CSS needs
// .hw-armed, set only here) -> the exact PSD frame.
// PERF (iOS): transform / opacity only; overlays are small nodes; the two-three canvases
// are stage-sized at most, DPR <= 2, allocated on the first tap and released when idle;
// every loop / spawner / rAF pauses in hide().
import { onScene, reduced, claim, layer, sceneEl, stageOf, ease, routeClear, tapAction } from "../kit.js";

const FX = (n) => new URL(`../../../assets/fx/haldi-wedding/${n}`, import.meta.url).href;

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[(Math.random() * a.length) | 0];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const pc = (v, of) => `${((v / of) * 100).toFixed(4)}%`;
const U = (n) => `calc(${Math.round(n * 100) / 100} * var(--u))`;
const now = () => performance.now();
const TAU = Math.PI * 2;

// ---------------------------------------------------------------- geometry
// Measured by tools/make_haldi_wedding_fx.py (design px, stage coords unless noted).
const STRANDS = {   // part boxes [x, y, w, h, px] in LAYER px; px = where the string leaves the top
  "parasol-strand-1": [[0, 0, 141, 274, 75.5], [63, 0, 191, 436, 172], [220, 0, 41, 271, 244.2]],
  "parasol-strand-2": [[0, 0, 141, 134, 70], [63, 0, 191, 296, 168], [223, 0, 38, 131, 248.5]],
};
const PEACOCK = { pivot: [142, 36] };                      // neck cut (layer px); head = rows above it
const PEACOCK_EYES = [
  [117,75], [128,81], [95,87], [48,85], [60,87], [73,94], [91,103], [37,106], [60,105], [113,116], [80,117], [42,122],
  [101,130], [22,134], [59,133], [128,144], [75,143], [42,144], [92,155], [27,158], [11,168], [114,170], [53,168], [78,175],
  [140,176], [31,184], [107,197], [72,200], [137,202], [12,208], [50,214], [95,219], [126,234], [73,238], [28,238], [104,255],
  [51,258]];
const HALDI_BULBS = {
  "string-lights-left": [
    [0,1166], [0,1231], [2,1142], [16,1174], [26,1206], [34,1153], [40,1134], [45,1190], [56,1206], [59,1190], [65,1126], [74,1181],
    [86,1184], [89,1145], [96,1122], [100,1192], [105,1144], [113,1099], [115,1177], [122,1132], [128,1180], [130,1100], [139,1162], [151,1086],
    [156,1191], [159,1142], [167,1073], [170,1189], [172,1137], [182,1177], [184,1129], [206,1119], [208,1184], [215,1101], [223,1182], [226,1088],
    [238,1165], [250,1118], [255,1174], [284,1165], [285,1104], [301,1147], [325,1152], [349,1131], [378,1129]],
  "string-lights-right": [
    [686,1129], [716,1131], [739,1152], [764,1147], [782,1104], [782,1165], [812,1174], [815,1118], [827,1165], [841,1088], [843,1182], [851,1101],
    [859,1184], [860,1119], [882,1177], [883,1129], [900,1073], [904,1142], [906,1191], [916,1086], [928,1162], [937,1100], [939,1180], [943,1132],
    [951,1099], [951,1177], [962,1144], [967,1192], [970,1122], [978,1145], [980,1188], [990,1181], [999,1126], [1007,1206], [1017,1190], [1023,1134],
    [1033,1153], [1041,1206], [1048,1174], [1063,1142], [1068,1229], [1072,1156], [1079,1184]],
};
const HALDI_FACES = [350, 1270, 650, 1418];                    // both faces (x0, y0, x1, y1)

const WATER_PTS = [
  [181,1917], [202,1851], [212,1769], [218,1898], [247,1799], [248,1860], [281,1834], [284,1782], [296,1735], [345,1665], [401,1655], [698,1651],
  [744,1656], [781,1707], [794,1766], [811,1814], [812,1864], [846,1770], [849,1843], [851,1919], [866,1880], [891,1917], [941,1771]];
const STARS = [
  [53,39], [187,94], [732,110], [887,125], [112,129], [92,208], [229,228], [772,256], [876,268], [43,273], [574,273], [682,276],
  [182,324], [87,338], [864,370], [77,413], [168,441], [924,477], [33,480], [137,531], [223,584], [191,652], [92,658], [879,732],
  [1028,772], [931,791], [1042,881], [982,955], [876,969], [782,992], [648,1000], [328,1030], [493,1036], [585,1069]];
const SKY = [0, 0, 1080, 1100];
// candles: glow centre + radius, and flame-cup centres for the flicker tips (front ones)
const CANDLES = {
  "candelabra-left-1": [[381,1790], [366,1791], [346,1744], [322,1787], [338,1785], [336,1686]],
  "candelabra-left-2": [[425,1679], [446,1679], [460,1683]],
  "candelabra-left-3": [[499,1538], [467,1562], [514,1586], [469,1587]],
  "candelabra-right-1": [[615,1587], [601,1537]],
  "candelabra-right-2": [[657,1681], [602,1681], [668,1649], [620,1646], [638,1683]],
  "candelabra-right-3": [[744,1790], [760,1789], [719,1791], [702,1786], [666,1791], [739,1688]],
  "candelabra-far-left": [[22,1408], [27,1347], [68,1339], [24,1376], [46,1377], [86,1376]],
  "candelabra-far-right": [[993,1413], [1019,1354], [1047,1378], [1006,1413]],
  "candle-left-1": [[132,1529], [97,1529], [120,1529], [127,1488], [129,1507]],
  "candle-left-2": [[193,1499], [192,1465], [162,1480]],
  "candle-left-3": [[226,1460], [231,1475], [239,1441], [251,1461], [246,1475], [251,1449]],
  "candle-left-4": [[291,1413], [285,1429], [283,1444], [305,1413]],
  "candle-left-5": [[339,1412], [337,1425], [361,1425], [344,1400]],
  "candle-left-6": [[400,1409], [381,1398]],
  "candle-left-7": [[439,1390]],
  "candle-left-8": [[462,1379]],
  "candle-right-1": [[619,1369]],
  "candle-right-2": [[657,1391]],
  "candle-right-3": [[682,1398]],
  "candle-right-4": [[723,1399], [738,1403], [718,1412]],
  "candle-right-5": [[773,1427], [787,1413], [794,1429]],
  "candle-right-6": [[840,1442], [851,1450], [827,1475]],
  "candle-right-7": [[919,1500], [911,1479], [885,1466], [892,1479]],
  "candle-right-8": [[975,1508], [956,1528], [979,1530]],
};
const FAIRY_BULBS = [
  [8,1420], [30,1422], [53,1426], [63,1427], [75,1425], [97,1426], [120,1425], [142,1425], [164,1422], [186,1419], [197,1420], [209,1416],
  [230,1412], [252,1408], [264,1406], [274,1402], [295,1396], [317,1388], [328,1388], [339,1381], [355,1379], [8,1388], [29,1394], [50,1398],
  [61,1403], [73,1405], [95,1408], [116,1412], [138,1417], [160,1419], [183,1423], [193,1424], [205,1422], [227,1423], [250,1422], [272,1422],
  [294,1419], [316,1416], [327,1417], [339,1413], [360,1409], [382,1405], [394,1403], [404,1399], [425,1393], [447,1385], [458,1385], [469,1378],
  [485,1376], [204,1130], [224,1137], [234,1141], [245,1144], [265,1149], [285,1153], [295,1158], [307,1160], [327,1163], [348,1166], [369,1171],
  [390,1173], [412,1177], [422,1178], [432,1176], [453,1177], [475,1176], [497,1176], [517,1173], [538,1170], [560,1168], [581,1163], [602,1159],
  [612,1158], [622,1154], [643,1148], [662,1141], [684,1134], [700,1132], [292,1082], [312,1089], [322,1093], [333,1096], [353,1101], [373,1105],
  [383,1110], [395,1112], [415,1115], [436,1118], [457,1123], [478,1125], [500,1129], [510,1130], [520,1128], [541,1129], [563,1128], [585,1128],
  [605,1125], [626,1122], [648,1120], [669,1115], [690,1111], [700,1110], [710,1106], [731,1100], [750,1093], [772,1086], [788,1084], [384,1130],
  [404,1137], [414,1141], [425,1144], [445,1149], [465,1153], [475,1158], [487,1160], [507,1163], [528,1166], [549,1171], [570,1173], [592,1177],
  [602,1178], [612,1176], [633,1177], [655,1176], [677,1176], [697,1173], [718,1170], [740,1168], [761,1163], [782,1159], [792,1158], [802,1154],
  [823,1148], [842,1141], [864,1134], [880,1132], [606,1374], [628,1381], [649,1388], [670,1394], [691,1398], [702,1403], [714,1405], [736,1408],
  [757,1412], [779,1417], [801,1419], [824,1423], [834,1424], [846,1422], [868,1423], [891,1422], [913,1422], [935,1419], [957,1416], [968,1417],
  [980,1413], [1001,1409], [1023,1405], [1035,1403], [1045,1399], [1066,1393], [733,1382], [755,1389], [776,1396], [797,1402], [818,1406], [829,1411],
  [841,1413], [863,1416], [884,1420], [906,1425], [928,1427], [951,1431], [961,1432], [973,1430], [995,1431], [1018,1430], [1040,1430], [1062,1427],
  [1079,1427]];
const FAIRY_ORDER = [4, 3, 5, 2, 6, 1, 7];       // far (top) strings first

// ---------------------------------------------------------------- runtime
const states = new Map();      // scene -> state
const live = new Set();        // entrance animations (cancelled on pagehide)

function newState(scene) {
  return { scene, stage: stageOf(scene), undo: [], loops: [], tickers: [], visible: false, entered: false, enter() {} };
}

export function init() {
  if (reduced || typeof window.IntersectionObserver !== "function") return;   // kit would enterAll()
  for (const [slug, build] of [["haldi", buildHaldi], ["wedding", buildWedding]]) {
    const scene = sceneEl(slug);
    if (!scene) continue;
    const st = newState(scene);
    try {
      build(scene, st);
      scene.classList.add("hw-armed");
      st.undo.push(() => scene.classList.remove("hw-armed"));
      // fail-safe: a scene marked entered (kit.enterAll) whose entrance never ran shows
      // its PSD frame instead of keeping the armed layers hidden
      new MutationObserver((_, mo) => {
        if (!scene.classList.contains("is-entered")) return;
        mo.disconnect();
        setTimeout(() => scene.classList.add("hw-go"), 1500);
      }).observe(scene, { attributes: true, attributeFilter: ["class"] });
      states.set(scene, st);
    } catch (e) {
      st.undo.reverse().forEach((f) => { try { f(); } catch (_) { /* best effort */ } });
      console.error(`[motion] ${slug} scene setup failed -- static frame kept`, e);
    }
  }
  if (!states.size) return;
  onScene(["haldi", "wedding"], {
    enter(scene) {
      const st = states.get(scene);
      if (st) ready(scene, () => { st.entered = true; scene.classList.add("hw-go"); st.enter(); });
    },
    show(scene) { const st = states.get(scene); if (st) show(st); },
    hide(scene) { const st = states.get(scene); if (st) hide(st); },
  });
  const settle = () => {
    for (const a of [...live]) a.cancel();
    for (const st of states.values()) { hide(st); st.scene.classList.add("hw-go"); }
  };
  window.addEventListener("pagehide", settle);
  window.addEventListener("beforeprint", settle);
}

// Entrances wait (briefly) for the scene's claimed art to decode: a fast scroll lands on a
// slide whose lazy images are still loading, and a drop-in of a blank layer is lost.
// The armed CSS holds until .hw-go, so nothing shows at its PSD spot in the meantime.
function ready(scene, fn) {
  const im = [...scene.querySelectorAll('[data-motion="custom"] img')];
  let done = false;
  const go = () => { if (!done) { done = true; fn(); } };
  Promise.all(im.map((i) => (i.decode ? i.decode().catch(() => {}) : null))).then(go);
  setTimeout(go, 900);
}

function show(st) {
  st.visible = true;
  for (const a of st.loops) a.play();
  if (st.entered) for (const t of st.tickers) t.start();
}

function hide(st) {
  st.visible = false;
  for (const a of st.loops) a.pause();
  for (const t of st.tickers) t.stop();
}

// One-shot entrance: first keyframe holds through the delay, cancelled on finish.
function once(el, frames, opts) {
  const a = el.animate(frames, { fill: "backwards", ...opts });
  live.add(a);
  a.addEventListener("finish", () => { live.delete(a); a.cancel(); }, { once: true });
  a.addEventListener("cancel", () => live.delete(a), { once: true });
  return a;
}

// Infinite loop, paused while the scene is off screen.
function loop(st, el, frames, opts) {
  const a = el.animate(frames, { iterations: Infinity, ...opts });
  if (!st.visible) a.pause();
  st.loops.push(a);
  return a;
}

// Transient node animation; the node is removed by timer too (hidden tabs freeze anims).
function fleeting(node, frames, opts) {
  let a = null;
  try { a = node.animate(frames, { fill: "both", ...opts }); } catch (e) { /* old engine */ }
  setTimeout(() => { if (a) a.cancel(); node.remove(); }, (opts.delay || 0) + opts.duration + 80);
  return a;
}

// Jittered repeating spawner, started/stopped with the scene's visibility.
function spawner(fn, lo, hi) {
  let t = 0, on = false;
  const tick = () => { if (!on) return; fn(); t = setTimeout(tick, rnd(lo, hi)); };
  return {
    start() { if (on) return; on = true; t = setTimeout(tick, rnd(lo * 0.3, hi * 0.6)); },
    stop() { on = false; clearTimeout(t); },
  };
}

function mk(tag, cls, parent, before = null) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  n.setAttribute("aria-hidden", "true");
  if (tag === "img") { n.alt = ""; n.decoding = "async"; n.draggable = false; }
  parent.insertBefore(n, before);
  return n;
}
// stage-level overlay sharing a layer's z, placed right after it (or before it)
function beside(st, ly, cls, after = true, tag = "div") {
  const n = mk(tag, cls, ly.parentNode, after ? ly.nextSibling : ly);
  n.style.zIndex = ly.style.zIndex;
  st.undo.push(() => n.remove());
  return n;
}
function box(n, x, y, w, h) {
  Object.assign(n.style, { left: U(x), top: U(y), width: U(w), height: U(h) });
  return n;
}
function rectOf(ly) {          // PSD rect in design px from the inline % style
  const pcv = (k) => parseFloat(ly.style[k]) / 100 || 0;
  return { x: pcv("left") * 1080, y: pcv("top") * 1920, w: pcv("width") * 1080, h: pcv("height") * 1920 };
}
const zOf = (ly) => parseInt(ly.style.zIndex, 10) || 1;
const imgOf = (ly) => ly.querySelector(":scope > img");
function hideImg(st, img) {
  img.style.visibility = "hidden";
  st.undo.push(() => { img.style.visibility = ""; });
}
function preload(srcs) { for (const s of srcs) { const i = new Image(); i.decoding = "async"; i.src = s; } }
function imgs(srcs) { return srcs.map((s) => { const i = new Image(); i.decoding = "async"; i.src = s; return i; }); }

// ---------------------------------------------------------------- pendulums
// A swinging element: rotate (visible top: a string hanging from a point) or skewX (cut by
// the stage top: the cut edge never moves). lean: undefined = both ways, "left"/"right" =
// only that way (an edge-cut layer only ever leans OUT, so no sliver shows).
// hang: the moving end is below the origin (hangings) or above it (plants).
function tf(mode, a) { return mode === "skew" ? `skewX(${a.toFixed(3)}deg)` : `rotate(${a.toFixed(3)}deg)`; }
function leanSign(mode, hang, lean) {
  // sign that moves the free end to the RIGHT
  const right = mode === "rotate" ? (hang ? -1 : 1) : (hang ? 1 : -1);
  return lean === "left" ? -right : right;
}

// Breeze: `cycles` swings of period P under a slow gust envelope, sampled into linear
// keyframes (compositor-driven). Starts and ends at 0 -> loops seamlessly from the PSD frame.
function breezeFrames(mode, amp, { cycles = 4, n = 14, oneSide = 0 } = {}) {
  const N = cycles * n, out = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const gust = 0.72 + 0.28 * Math.sin(TAU * t + 0.6);
    let v;
    if (oneSide) v = oneSide * amp * gust * (1 - Math.cos(TAU * t * cycles)) / 2;
    else v = amp * (gust * Math.sin(TAU * t * cycles) + 0.16 * Math.sin(TAU * t * 3));
    out.push({ transform: tf(mode, i === 0 || i === N ? 0 : v) });
  }
  return out;
}
// Damped swing for an entrance: starts at a0, decays to 0 (one-sided: bounces on one side).
function dampedFrames(mode, a0, period, dur, { n = 36, oneSide = 0 } = {}) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, c = Math.cos((TAU * t * dur) / period), e = Math.exp(-3.6 * t);
    const v = i === n ? 0 : oneSide ? oneSide * Math.abs(a0) * e * Math.abs(c) : a0 * e * c;
    out.push({ transform: tf(mode, v) });
  }
  return out;
}

function hanger(st, el, o) {
  const h = { el, mode: o.mode || "rotate", amp: o.amp, period: o.period, hang: o.hang !== false };
  h.side = o.lean ? leanSign(h.mode, h.hang, o.lean) : 0;
  el.style.transformOrigin = o.origin;
  h.swingIn = (delay, a0, dur = 3000) => once(el, dampedFrames(h.mode, a0, h.period, dur, { oneSide: h.side }),
    { duration: dur, delay, easing: "linear" });
  h.breeze = (delay = 0, cycles = 4) => loop(st, el, breezeFrames(h.mode, h.amp, { cycles, oneSide: h.side }),
    { duration: h.period * cycles, delay, easing: "linear" });
  return h;
}

// Wrapper drops in from above the stage and settles with a small overshoot.
function dropIn(ly, delay, dur = 1300) {
  const r = rectOf(ly);
  const from = -((r.y + r.h + 40) / r.h) * 100;
  return once(ly, [
    { translate: `0 ${from.toFixed(2)}%`, easing: "cubic-bezier(0.32, 0, 0.25, 1)" },
    { translate: `0 ${(5 / r.h * 100).toFixed(3)}%`, offset: 0.66, easing: ease.inOut },
    { translate: `0 ${(-1.6 / r.h * 100).toFixed(3)}%`, offset: 0.84, easing: ease.inOut },
    { translate: "0 0" },
  ], { duration: dur, delay });
}

// Plant bloom from its stem (wrapper), like the generic reveal but scene-timed.
function bloomIn(ly, delay, origin, rot = 0, dur = 1300) {
  return once(ly, [
    { opacity: 0, transform: `rotate(${rot}deg) scale(0.86)`, transformOrigin: origin, easing: ease.out },
    { opacity: 1, offset: 0.45, transformOrigin: origin },
    { opacity: 1, transform: "none", transformOrigin: origin },
  ], { duration: dur, delay });
}

// Sway of a plant's <img> about its foot (skewX keeps every row's height: a plant cut by
// a side edge leans only outward; one cut by the bottom never lifts off it).
function plantSway(st, ly, { amp, period, lean, origin = "50% 100%", delay = rnd(0, 1600) }) {
  const h = hanger(st, imgOf(ly), { mode: "skew", hang: false, amp, period, lean, origin });
  return h.breeze(delay, 2);
}

// ---------------------------------------------------------------- canvas engine
// A canvas over a design-px box of the stage. Its backing store (DPR <= 2) is allocated on
// the first kick and released 2 s after it goes idle; the rAF runs only while visible and
// busy. draw(ctx, dt) works in design px (dt = elapsed 60-fps frames).
function canvasEngine(st, cls, bx, z, beforeNode, draw, busy) {
  const c = mk("canvas", `hw-canvas ${cls}`, st.stage, beforeNode);
  Object.assign(c.style, { left: U(bx[0]), top: U(bx[1]), width: U(bx[2]), height: U(bx[3]), zIndex: String(z) });
  st.undo.push(() => c.remove());
  c.width = c.height = 0;                       // no backing store until the first kick
  const ctx = c.getContext("2d");
  let raf = 0, last = 0, on = false, idle = 0, k = 1;
  const size = () => {
    const w = st.stage.getBoundingClientRect().width * (bx[2] / 1080);
    if (!w) return false;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.round(w * dpr), H = Math.round(w * dpr * bx[3] / bx[2]);
    if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    k = W / bx[2];
    return true;
  };
  const release = () => { idle = 0; if (!raf) { c.width = 0; c.height = 0; } };
  const frame = (t) => {
    raf = 0;
    if (!on) return;
    const dt = clamp((t - last) / (1000 / 60), 0, 3);
    last = t;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.setTransform(k, 0, 0, k, -bx[0] * k, -bx[1] * k);
    draw(ctx, dt);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    if (busy()) raf = requestAnimationFrame(frame);
    else { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, c.width, c.height); idle = setTimeout(release, 2000); }
  };
  const e = {
    kick() {
      if (!on || raf) return;
      clearTimeout(idle);
      if (!size()) return;
      last = now();
      raf = requestAnimationFrame(frame);
    },
    start() { on = true; if (busy()) e.kick(); },
    stop() { on = false; if (raf) cancelAnimationFrame(raf); raf = 0; },
  };
  const onResize = () => { if (raf) size(); };
  window.addEventListener("resize", onResize, { passive: true });
  st.undo.push(() => window.removeEventListener("resize", onResize));
  st.tickers.push(e);
  return e;
}

// Soft dust sprite / organic powder puff, pre-rendered once per colour.
function softSprite(rgb, s = 24) {
  const off = document.createElement("canvas");
  off.width = off.height = s;
  const o = off.getContext("2d");
  const gr = o.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  const c = rgb.join(",");
  gr.addColorStop(0, `rgba(${c},1)`);
  gr.addColorStop(0.5, `rgba(${c},0.55)`);
  gr.addColorStop(1, `rgba(${c},0)`);
  o.fillStyle = gr;
  o.fillRect(0, 0, s, s);
  return off;
}
function puffSprite(rgb, s = 128) {
  const off = document.createElement("canvas");
  off.width = off.height = s;
  const o = off.getContext("2d");
  const c = rgb.join(","), h = s / 2;
  const lite = rgb.map((v) => Math.round(v + (255 - v) * 0.4)).join(",");
  const blob = (x, y, r, a, col) => {
    const gr = o.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(${col},${a})`);
    gr.addColorStop(0.45, `rgba(${col},${a * 0.6})`);
    gr.addColorStop(1, `rgba(${col},0)`);
    o.fillStyle = gr;
    o.beginPath(); o.arc(x, y, r, 0, TAU); o.fill();
  };
  blob(h, h, h * 0.7, 0.5, c);
  for (let i = 0; i < 16; i++) {                               // lumpy cauliflower rim
    const a = rnd(0, TAU), d = rnd(0.2, 0.62) * h;
    blob(h + Math.cos(a) * d, h + Math.sin(a) * d * 0.9, rnd(0.18, 0.38) * h, rnd(0.3, 0.6), c);
  }
  for (let i = 0; i < 3; i++) blob(h + rnd(-14, 14), h + rnd(-16, 4), h * rnd(0.2, 0.32), 0.32, lite);
  return off;
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

// A rotated, tumbling sprite at (x, y) in design px, without save()/restore(): the base
// transform (device px per design px) is read once and re-applied.
function drawSprite(ctx, img, x, y, rot, sx, size, ar) {
  const m = ctx.getTransform();
  const c = Math.cos(rot), sn = Math.sin(rot);
  ctx.transform(c * sx, sn * sx, -sn, c, x, y);
  ctx.drawImage(img, -size / 2, (-size * ar) / 2, size, size * ar);
  ctx.setTransform(m);
}

// The live text block's ink box in design px (measured when needed: fonts may load late).
function textBox(stage) {
  const r = stage.getBoundingClientRect();
  const u = r.width / 1080;
  if (!u) return null;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  stage.querySelectorAll(".tb .r").forEach((run) => {
    const b = run.getBoundingClientRect();
    if (!b.height || !b.width) return;
    const sw = /Maginia|Hello Bride/i.test(run.style.fontFamily) ? b.height * 0.25 : 0;   // script swashes overhang
    x0 = Math.min(x0, b.left - sw); y0 = Math.min(y0, b.top); x1 = Math.max(x1, b.right + sw); y1 = Math.max(y1, b.bottom);
  });
  if (x1 < x0) return null;
  return [(x0 - r.left) / u, (y0 - r.top) / u, (x1 - r.left) / u, (y1 - r.top) / u];
}

function onTap(st, fn) {
  let lastTap = 0;
  const h = (e) => {
    if (!st.entered || (e.target.closest && e.target.closest("a, button, input, select, textarea, [role='button']"))) return;
    const r = st.stage.getBoundingClientRect();
    const u = r.width / 1080;
    if (!u || now() - lastTap < 160) return;
    lastTap = now();
    fn((e.clientX - r.left) / u, (e.clientY - r.top) / u);
  };
  st.stage.addEventListener("click", h);
  st.undo.push(() => st.stage.removeEventListener("click", h));
}

// A pool of small light nodes reused for flashes (no node churn).
function flashPool(parent, cls, n) {
  const nodes = Array.from({ length: n }, () => mk("span", cls, parent));
  let i = 0;
  return (x, y, size, dur, peak = 1, kind = 0) => {
    const g = nodes[i++ % n];
    box(g, x - size / 2, y - size / 2, size, size);
    g.animate(kind ? [
      { opacity: 0, transform: "scale(0.3) rotate(0deg)" },
      { opacity: peak, transform: "scale(1) rotate(45deg)", offset: 0.4 },
      { opacity: 0, transform: "scale(0.5) rotate(90deg)" },
    ] : [
      { opacity: 0, transform: "scale(0.6)" },
      { opacity: peak, transform: "scale(1.05)", offset: 0.3 },
      { opacity: 0, transform: "scale(0.85)" },
    ], { duration: dur, easing: "ease-out" });
  };
}

// A petal drifting down on a DOM overlay (compositor-driven, removed by timer). from() gives
// a candidate start [x, y]; the path is routed clear of the live text (kit.routeClear: a few
// candidates, else the longest one that fades out before it reaches the text, else none).
function driftPetal(fx, src, from, fall, size = rnd(26, 38), dur = rnd(6500, 9000)) {
  if (fx.childElementCount >= 10) return;
  const stage = fx.closest(".stage");
  const u = fx.getBoundingClientRect().width / 1080;
  if (!u || !stage) return;
  const path = routeClear(stage, () => {
    const [x, y] = from();
    const sw = rnd(40, 90) * (Math.random() < 0.5 ? -1 : 1);
    return { x, y, sw, r: size * 0.6, pos: (k) => [x + Math.sin(k * Math.PI * 2.1) * sw + k * sw * 0.4, y + fall * k] };
  });
  if (!path) return;
  const { x, y, run } = path;
  const p = mk("img", "hw-petal", fx);
  p.src = src;
  box(p, x - size / 2, y - size / 2, size, size);
  const r0 = rnd(0, 360), spin = rnd(140, 320) * (Math.random() < 0.5 ? -1 : 1);
  const N = 20;
  const frames = Array.from({ length: N + 1 }, (_, i) => {
    const o = i / N, k = o * run;
    const [px, py] = path.pos(k);
    return {
      offset: o,
      opacity: i === 0 || i === N ? 0 : run < 1 ? (o > 0.75 ? 0.95 * (1 - o) / 0.25 : 0.95) : o > 0.85 ? 0.5 : 0.95,
      transform: `translate(${((px - x) * u).toFixed(1)}px, ${((py - y) * u).toFixed(1)}px) rotate(${(r0 + spin * k).toFixed(1)}deg) scale(${Math.cos(k * Math.PI * 3.2).toFixed(3)}, 1)`,
    };
  });
  fleeting(p, frames, { duration: dur * run, easing: "linear" });
}

// ================================================================ HALDI
function buildHaldi(scene, st) {
  const L = (id) => layer(scene, id);
  const ids = ["parasol-strand-1", "parasol-strand-2", "pendant-lamp-1", "pendant-lamp-2", "pendant-lamp-3",
    "string-lights-left", "string-lights-right", "haze", "tree-canopy", "flowers-left", "flowers-right",
    "tulip-pot-left", "tulip-pot-right", "flower-stand-1", "flower-stand-2", "peacock", "couple"];
  const ly = Object.fromEntries(ids.map((id) => [id, L(id)]));
  const missing = ids.filter((id) => !ly[id]);
  if (missing.length) throw new Error(`haldi: missing layers ${missing}`);
  claim(Object.values(ly));

  // -- strands: three hanging parts each, every one on its own string
  const hangers = [];      // { h, ly, x (stage), len }
  for (const id of ["parasol-strand-1", "parasol-strand-2"]) {
    const w = ly[id], r = rectOf(w);
    const cutTop = r.y < 2;
    hideImg(st, imgOf(w));
    STRANDS[id].forEach(([, y, , ph, px], j) => {
      const p = mk("img", "hw-part", w);       // full layer size: same resampling grid as the layer
      p.src = FX(`${id}-${j + 1}.webp`);
      st.undo.push(() => p.remove());
      const period = 2600 + Math.sqrt(ph / 300) * 1500 + rnd(-150, 150);
      const amp = cutTop ? 1.5 : clamp((15 / ph) * 57.3, 1.6, 3.4);
      hangers.push({
        ly: w, x: r.x + px, len: ph,
        h: hanger(st, p, { mode: cutTop ? "skew" : "rotate", amp, period, origin: `${pc(px, r.w)} ${pc(y, r.h)}` }),
      });
    });
  }
  // -- lamps: lamp-1 / lamp-3 are cut by the stage top (skew), lamp-2's cord top hides
  //    under lamp-3's shade (rotate about it)
  for (const [id, mode, amp] of [["pendant-lamp-1", "skew", 2.2], ["pendant-lamp-2", "rotate", 2.6], ["pendant-lamp-3", "skew", 2.4]]) {
    const w = ly[id], r = rectOf(w);
    hangers.push({
      ly: w, x: r.x + r.w / 2, len: r.h,
      h: hanger(st, imgOf(w), { mode, amp, period: 3000 + Math.sqrt(r.h / 300) * 1400 + rnd(-200, 200), origin: "50% 0%" }),
    });
  }

  // -- peacock: head on its own sprite (nods about the neck), glints over the tail eyes
  const pk = ly.peacock, pr = rectOf(pk);
  hideImg(st, imgOf(pk));
  const body = mk("img", "hw-part", pk);
  body.src = FX("peacock-body.webp");
  const head = mk("img", "hw-part", pk);       // full layer size, transparent but the head
  head.src = FX("peacock-head.webp");
  head.style.transformOrigin = `${pc(PEACOCK.pivot[0], pr.w)} ${pc(PEACOCK.pivot[1], pr.h)}`;
  st.undo.push(() => { body.remove(); head.remove(); });
  const pkFx = beside(st, pk, "hw-fx");
  const tailGlint = flashPool(pkFx, "hw-glint", 4);

  // -- string lights: chase + twinkle flashes over the bulbs
  const bulbs = {};
  for (const id of ["string-lights-left", "string-lights-right"]) {
    const fx = beside(st, ly[id], "hw-fx");
    bulbs[id] = { pool: flashPool(fx, "hw-bulb", 14), pts: [...HALDI_BULBS[id]].sort((a, b) => a[0] - b[0]) };
  }
  if (bulbs["string-lights-right"]) bulbs["string-lights-right"].pts.reverse();   // both chase outward-in

  // -- overlays: warm glow behind the couple; ambient petal layer; gulal canvas above the art
  const glow = beside(st, ly.couple, "hw-warm", false);
  box(glow, 160, 1060, 760, 760);
  const petalFx = beside(st, ly.couple, "hw-fx");
  const glowPulse = (peak, dur) => {
    try {
      glow.animate([
        { opacity: 0, transform: "scale(0.8)" },
        { opacity: peak, transform: "scale(1)", offset: 0.3 },
        { opacity: 0, transform: "scale(1.08)" },
      ], { duration: dur, easing: "ease-out" });
    } catch (e) { /* no WAAPI */ }
  };
  const gulal = haldiColours(st, ly.couple);
  onTap(st, (x, y) => { gulal.fire(x, y); glowPulse(0.55, 1500); });
  // the slide's pill: a burst of colour in front of the couple
  tapAction("haldi", () => { if (st.entered) { gulal.fire(540, 1240); glowPulse(0.55, 1500); } });

  const MARI = [1, 2, 3, 4].map((n) => FX(`marigold-${n}.webp`));
  const BLOSSOM = [FX("blossom-orange-1.webp"), FX("blossom-orange-2.webp")];
  preload([...MARI, ...BLOSSOM]);
  // a marigold now and then lets go of a string
  const dropPoints = [[37 + 244, 95 + 120], [37 + 60, 95 + 230], [412 + 248, 60], [412 + 170, 280], [37 + 160, 95 + 380]];
  st.tickers.push(spawner(() => {
    driftPetal(petalFx, pick(Math.random() < 0.6 ? MARI : BLOSSOM), () => {
      const [x, y] = pick(dropPoints);
      return [x + rnd(-10, 10), y];
    }, rnd(900, 1300), rnd(24, 34));
  }, 3200, 6000));
  // tail shimmer
  st.tickers.push(spawner(() => {
    const [x, y] = pick(PEACOCK_EYES);
    tailGlint(pr.x + x, pr.y + y, rnd(16, 24), rnd(700, 1000), rnd(0.7, 1), 1);
  }, 450, 1100));
  // bulbs: a chase runs along each string set, plus random twinkles
  for (const id of Object.keys(bulbs)) {
    const b = bulbs[id];
    let i = 0;
    st.tickers.push(spawner(() => {
      const [x, y] = b.pts[i++ % b.pts.length];
      b.pool(x, y, 30, 1100, 0.95);
    }, 95, 125));
    st.tickers.push(spawner(() => { const [x, y] = pick(b.pts); b.pool(x, y, rnd(30, 40), rnd(700, 1000), 1); }, 380, 900));
  }

  // armed (hidden until entrance): hangings, lights, plants, couple
  for (const id of ids) if (id !== "haze" && id !== "peacock") ly[id].classList.add("hw-arm");
  st.undo.push(() => ids.forEach((id) => ly[id].classList.remove("hw-arm")));

  // -------------------------------------------------- entrance
  st.enter = () => {
    if (st.visible) for (const t of st.tickers) t.start();
    // canopy rustles in; it is cut by the stage top + left, so it only leans left
    once(ly["tree-canopy"], [
      { opacity: 0, transform: "skewX(-2.2deg)", transformOrigin: "50% 0%", easing: ease.out },
      { opacity: 1, offset: 0.35, transformOrigin: "50% 0%" },
      { transform: "skewX(-0.6deg)", offset: 0.7, transformOrigin: "50% 0%", easing: ease.inOut },
      { opacity: 1, transform: "none", transformOrigin: "50% 0%" },
    ], { duration: 1500 });
    bloomIn(ly["flowers-left"], 250, "0% 100%", -4);
    bloomIn(ly["flowers-right"], 420, "100% 100%", 4);

    // hangings dropped in left -> right; each swings as it lands, then the breeze takes over
    const order = [...hangers].sort((a, b) => a.x - b.x);
    const wrappers = new Map();
    order.forEach((g, i) => {
      const at = 180 + i * 120;
      if (!wrappers.has(g.ly)) { wrappers.set(g.ly, at); dropIn(g.ly, at, 1350); }
      const t0 = wrappers.get(g.ly) + 650;          // the swing starts as it lands
      const a0 = (g.h.mode === "skew" ? 5 : clamp((70 / g.len) * 57.3, 6, 11)) * (i % 2 ? 1 : -1);
      g.h.swingIn(t0, a0, 3400);
      g.h.breeze(t0 + 3400, 4);                    // starts at 0 exactly where the swing ends
    });
    // string lights flicker on
    for (const [id, d] of [["string-lights-left", 900], ["string-lights-right", 1050]]) {
      once(ly[id], [
        { opacity: 0 }, { opacity: 0.85, offset: 0.12 }, { opacity: 0.15, offset: 0.2 }, { opacity: 1, offset: 0.34 },
        { opacity: 0.55, offset: 0.42 }, { opacity: 1 },
      ], { duration: 1100, delay: d, easing: "linear" });
    }
    // plants on the ground bloom, then the couple rises in a warm glow
    bloomIn(ly["tulip-pot-left"], 1100, "50% 100%", -3);
    bloomIn(ly["tulip-pot-right"], 1200, "50% 100%", 3);
    bloomIn(ly["flower-stand-1"], 1300, "50% 100%", -2);
    bloomIn(ly["flower-stand-2"], 1380, "50% 100%", 2);
    once(ly.couple, [
      { opacity: 0, transform: "translateY(4.5%) scale(0.975)", transformOrigin: "50% 100%", easing: ease.out },
      { opacity: 1, offset: 0.45, transformOrigin: "50% 100%" },
      { opacity: 1, transform: "none", transformOrigin: "50% 100%" },
    ], { duration: 1700, delay: 250 });            // the slide is never without its couple
    setTimeout(() => glowPulse(0.8, 2600), 200);

    // ambient once everything has landed
    setTimeout(() => {
      // canopy: cut by the stage top + left, so it sways about the top and only leans left
      imgOf(ly["tree-canopy"]).style.transformOrigin = "50% 0%";
      loop(st, imgOf(ly["tree-canopy"]), breezeFrames("skew", 0.9, { cycles: 2, oneSide: leanSign("skew", true, "left") }),
        { duration: 13000, easing: "linear" });
      plantSway(st, ly["flowers-left"], { amp: 1.4, period: 5200, lean: "left", origin: "0% 100%" });
      plantSway(st, ly["flowers-right"], { amp: 1.4, period: 5800, lean: "right", origin: "100% 100%" });
      plantSway(st, ly["tulip-pot-left"], { amp: 1.1, period: 4600 });
      plantSway(st, ly["tulip-pot-right"], { amp: 1.1, period: 5000 });
      plantSway(st, ly["flower-stand-1"], { amp: 0.8, period: 5600 });
      plantSway(st, ly["flower-stand-2"], { amp: 0.5, period: 6200 });
      // string lights + haze breathe
      loop(st, imgOf(ly["string-lights-left"]), [{ opacity: 1 }, { opacity: 0.72 }, { opacity: 1 }], { duration: 5200, easing: ease.inOut });
      loop(st, imgOf(ly["string-lights-right"]), [{ opacity: 1 }, { opacity: 0.72 }, { opacity: 1 }], { duration: 5200, delay: 2600, easing: ease.inOut });
      loop(st, imgOf(ly.haze), [{ opacity: 1, transform: "scale(1)" }, { opacity: 0.62, transform: "scale(1.035)" }, { opacity: 1, transform: "scale(1)" }],
        { duration: 7000, easing: ease.inOut });
      loop(st, glow, [{ opacity: 0 }, { opacity: 0.32 }, { opacity: 0 }], { duration: 7000, delay: 3500, easing: ease.inOut });
      // the couple breathes; the peacock nods now and then
      imgOf(ly.couple).style.transformOrigin = "50% 100%";
      loop(st, imgOf(ly.couple), [{ transform: "scale(1, 1)" }, { transform: "scale(1.003, 1.006)" }, { transform: "scale(1, 1)" }],
        { duration: 4400, easing: ease.inOut });
      loop(st, head, [
        { transform: "rotate(0deg)" }, { transform: "rotate(0deg)", offset: 0.55 },
        { transform: "rotate(-7deg)", offset: 0.62, easing: ease.inOut }, { transform: "rotate(2deg)", offset: 0.69, easing: ease.inOut },
        { transform: "rotate(-4deg)", offset: 0.75, easing: ease.inOut }, { transform: "rotate(0deg)", offset: 0.82 },
        { transform: "rotate(0deg)" },
      ], { duration: 5600, easing: "linear" });
    }, 3000);
  };
}

// Haldi colours: one shot = soft powder-cloud lobes (yellow haldi + pink gulal, mixed)
// launched from the tap point -- fast, braked hard by drag, billowing, drifting, fading over
// ~3 s -- plus a halo of fine dust and a fountain of marigold petals. Obstacles (the live
// text block and the couple's faces, padded) push clouds and dust out, so neither is ever
// covered. Drawn on one canvas above the art and under the text; cleared every frame.
function haldiColours(st, coupleLy) {
  const YEL = [[255, 206, 38], [250, 168, 22], [255, 186, 70]];
  const PINK = [[255, 96, 160], [236, 60, 122], [255, 130, 178]];
  const puffs = [...YEL, ...PINK].map((c) => [0, 1, 2].map(() => puffSprite(c)));
  const dust = [...YEL, ...PINK].map((c) => softSprite(c, 24));
  const petalImgs = imgs([1, 2, 3, 4].map((n) => FX(`marigold-${n}.webp`)).concat([FX("blossom-orange-1.webp"), FX("blossom-orange-2.webp")]));
  const lobes = [], specks = [], petals = [];
  let obstacles = [];
  const MAX_LOBES = 160, MAX_DUST = 360;

  const eng = canvasEngine(st, "hw-canvas--haldi", [0, 0, 1080, 1920], zOf(coupleLy), coupleLy.nextSibling, draw,
    () => lobes.length + specks.length + petals.length > 0);

  function measure() {
    const t = textBox(st.stage);
    obstacles = [HALDI_FACES];
    if (t) obstacles.push([t[0] - 22, t[1] - 22, t[2] + 22, t[3] + 22]);   // the text block, padded
  }
  // push a point (with radius) out of every obstacle along the shallowest side
  function repel(p, rad, kk) {
    for (const [x0, y0, x1, y1] of obstacles) {
      const L = x0 - rad, R = x1 + rad, T = y0 - rad, B = y1 + rad;
      if (p.x <= L || p.x >= R || p.y <= T || p.y >= B) continue;
      const dl = p.x - L, dr = R - p.x, dt = p.y - T, db = B - p.y;
      const m = Math.min(dl, dr, dt, db), f = Math.min(1, 0.32 * kk);
      if (m === dl) { p.x -= dl * f; if (p.vx > 0) p.vx *= 0.3; }
      else if (m === dr) { p.x += dr * f; if (p.vx < 0) p.vx *= 0.3; }
      else if (m === dt) { p.y -= dt * f; if (p.vy > 0) p.vy *= 0.3; }
      else { p.y += db * f; if (p.vy < 0) p.vy *= 0.3; }
    }
  }
  const inside = (x, y, m) => obstacles.some(([x0, y0, x1, y1]) => x > x0 - m && x < x1 + m && y > y0 - m && y < y1 + m);
  // a tap inside an obstacle bursts from its nearest outside edge
  function origin(x, y) {
    const p = { x, y, vx: 0, vy: 0 };
    for (let i = 0; i < 3; i++) repel(p, 30, 10);
    return p;
  }

  function fire(x, y) {
    if (lobes.length > MAX_LOBES - 12) return;
    measure();
    const o = origin(clamp(x, 30, 1050), clamp(y, 30, 1890));
    const pw = rnd(0.9, 1.1);
    const pinkFirst = Math.random() < 0.5;
    for (let i = 0; i < 24 && lobes.length < MAX_LOBES; i++) {
      const pink = (i % 2 === 0) === pinkFirst;
      const ci = (pink ? 3 : 0) + ((Math.random() * 3) | 0);
      // most lobes fly up and out; a few roll sideways / down
      const a = i < 18 ? -Math.PI / 2 + rnd(-1.4, 1.4) : rnd(0, TAU);
      const sp = (i < 5 ? rnd(18, 25) : rnd(9, 17)) * pw;
      lobes.push({
        x: o.x + rnd(-14, 14), y: o.y + rnd(-10, 10), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        r0: rnd(16, 26), rMax: rnd(80, 135) * pw, grow: rnd(22, 40), rot: rnd(0, TAU), spin: rnd(-0.01, 0.01),
        life: -i * 0.4, ttl: rnd(180, 230), peak: rnd(0.46, 0.62), hold: rnd(0.22, 0.32), spr: pick(puffs[ci]),
      });
    }
    for (let i = 0; i < 70 && specks.length < MAX_DUST; i++) {
      const a = rnd(0, TAU), sp = rnd(6, 24) * pw;
      specks.push({ x: o.x + rnd(-8, 8), y: o.y + rnd(-8, 8), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 4,
        r: rnd(2.4, 6), life: -rnd(0, 6), ttl: rnd(140, 230), ph: rnd(0, 6), c: (Math.random() * 6) | 0 });
    }
    for (let i = 0; i < 9 && petals.length < 40; i++) {
      const a = -Math.PI / 2 + rnd(-1.2, 1.2), sp = rnd(5, 11);
      petals.push({ x: o.x, y: o.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: rnd(0, TAU), vr: rnd(-0.12, 0.12),
        fl: rnd(0, TAU), vf: rnd(0.08, 0.16), size: rnd(26, 38), life: 0, ttl: rnd(120, 170), img: pick(petalImgs) });
    }
    try { if (navigator.vibrate) navigator.vibrate(8); } catch (e) { /* no haptics */ }
    eng.kick();
  }

  // 1 when a puff of radius r is clear of every obstacle, easing to 0 as its edge reaches one
  function near(x, y, r) {
    let m = 1;
    for (const [x0, y0, x1, y1] of obstacles) {
      const d = Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(y0 - y, 0, y - y1));
      m = Math.min(m, clamp((d - r * 0.55) / (r * 0.45), 0, 1));
    }
    return m;
  }
  function draw(ctx, k) {
    const wind = 0.1;
    // hard guarantee: nothing on this canvas ever paints inside an obstacle
    ctx.beginPath();
    ctx.rect(0, 0, 1080, 1920);
    for (const [x0, y0, x1, y1] of obstacles) ctx.rect(x1, y0, x0 - x1, y1 - y0);   // reversed winding
    ctx.save();
    ctx.clip("evenodd");
    drawAll(ctx, k, wind);
    ctx.restore();
  }
  function drawAll(ctx, k, wind) {
    for (let i = lobes.length - 1; i >= 0; i--) {
      const p = lobes[i];
      p.life += k;
      if (p.life < 0) continue;
      if (p.life >= p.ttl) { lobes.splice(i, 1); continue; }
      const drag = Math.pow(0.9, k);
      p.vx = p.vx * drag + wind * (1 - drag) * 4;
      p.vy = p.vy * drag - 0.004 * k;                       // warm air: a slow lift
      p.x += p.vx * k; p.y += p.vy * k;
      p.rot += p.spin * k;
      const r = p.r0 + (p.rMax - p.r0) * (1 - Math.exp(-p.life / p.grow));
      repel(p, r * 0.95, k);
      const f = p.life / p.ttl;
      const q = f < p.hold ? 0 : (f - p.hold) / (1 - p.hold);
      const a = p.peak * (f < 0.05 ? f / 0.05 : 1 - q * q * (3 - 2 * q)) * near(p.x, p.y, r);
      if (a <= 0.004) continue;
      ctx.globalAlpha = a;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.drawImage(p.spr, -r, -r, r * 2, r * 2);
      ctx.restore();
    }
    for (let i = specks.length - 1; i >= 0; i--) {
      const s = specks[i];
      s.life += k;
      if (s.life < 0) continue;
      if (s.life >= s.ttl) { specks.splice(i, 1); continue; }
      const drag = Math.pow(0.93, k);
      s.ph += 0.05 * k;
      s.vx = s.vx * drag + Math.sin(s.ph) * 0.02 * k + wind * 0.02 * k;
      s.vy = s.vy * drag + 0.02 * k;                          // hang, then sink slowly
      s.x += s.vx * k; s.y += s.vy * k;
      if (inside(s.x, s.y, 6)) s.life += 7 * k;                // dissolve, never line the edge
      const f = s.life / s.ttl;
      const a = 0.85 * (f < 0.05 ? f / 0.05 : 1 - Math.pow(f, 1.8));
      if (a <= 0.01) continue;
      ctx.globalAlpha = a;
      ctx.drawImage(dust[s.c], s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
    }
    for (let i = petals.length - 1; i >= 0; i--) {
      const p = petals[i];
      p.life += k;
      if (p.life >= p.ttl) { petals.splice(i, 1); continue; }
      const drag = Math.pow(0.975, k);
      p.vx = p.vx * drag; p.vy = p.vy * drag + 0.16 * k;
      p.vy = Math.min(p.vy, 3.2);                              // petals float down, never drop
      p.x += (p.vx + Math.sin(p.fl) * 0.6) * k; p.y += p.vy * k;
      p.rot += p.vr * k; p.fl += p.vf * k;
      const f = p.life / p.ttl;
      if (inside(p.x, p.y, 10)) p.ttl = Math.min(p.ttl, p.life + 14);   // fades, never sits on the text
      ctx.globalAlpha = (f < 0.06 ? f / 0.06 : f > 0.75 ? (1 - f) / 0.25 : 1) * (inside(p.x, p.y, 10) ? 0.35 : 1);
      if (!p.img.complete || !p.img.naturalWidth) continue;
      const ar = p.img.naturalHeight / p.img.naturalWidth;
      drawSprite(ctx, p.img, p.x, p.y, p.rot, Math.cos(p.fl) * 0.8 + (Math.cos(p.fl) < 0 ? -0.2 : 0.2), p.size, ar);
    }
  }

  return { fire };
}

// ================================================================ WEDDING
function buildWedding(scene, st) {
  const L = (id) => layer(scene, id);
  const G = Array.from({ length: 25 }, (_, i) => L(`garland-${i + 1}`)).filter(Boolean);
  const fairy = FAIRY_ORDER.map((n) => L(`fairy-lights-${n}`)).filter(Boolean);
  const canopy = ["flower-canopy-1", "flower-canopy-2"].map(L).filter(Boolean);
  const candles = Object.keys(CANDLES).map((id) => [id, L(id)]).filter(([, l]) => l);
  const lotus = ["lotus-1", "lotus-2", "lotus-3", "lotus-4", "lotus-5", "lotus-6", "lotus-bud-left", "lotus-bud-right"].map(L).filter(Boolean);
  const elephants = ["elephant-left", "elephant-right", "elephant-left-back", "elephant-right-back"].map(L).filter(Boolean);
  const couple = L("couple"), water = L("water"), pads = L("lotus-pads");
  if (G.length < 20 || fairy.length !== 7 || !couple || !water || elephants.length !== 4) throw new Error("wedding: missing layers");
  claim(G, fairy, canopy, candles.map(([, l]) => l), lotus, elephants, couple, water, pads);

  // -- garlands: pendulums from the canopy (skew when cut by the stage top)
  const garlands = G.map((g) => {
    const r = rectOf(g), cutTop = r.y < 2, cutR = r.x + r.w >= 1079;
    const tiny = r.h < 30;
    return {
      ly: g, r, tiny,
      h: hanger(st, imgOf(g), {
        mode: cutTop ? "skew" : "rotate", origin: "50% 0%", lean: cutR ? "right" : undefined,
        amp: cutTop ? rnd(1.3, 1.8) : clamp((9 / r.h) * 57.3, 0.9, 2.2), period: 3600 + Math.sqrt(r.h / 300) * 900 + rnd(-200, 200),
      }),
    };
  });

  // -- sky: stars behind all the art (z 0), fireworks canvas behind the art too
  const base = st.stage.querySelector(":scope > img.base");
  const sky = mk("div", "hw-fx hw-sky", st.stage, base.nextSibling);
  sky.style.zIndex = "0";
  st.undo.push(() => sky.remove());
  const stars = STARS.map(([x, y], i) => {
    const big = i % 4 === 0, d = big ? rnd(24, 32) : rnd(8, 13);
    const s = mk("span", big ? "hw-star hw-star--big" : "hw-star", sky);
    box(s, x - d / 2, y - d / 2, d, d);
    return s;
  });

  // -- fairy lights twinkle pool, candle glows + flame tips, water fx
  const fairyFx = beside(st, fairy[fairy.length - 1], "hw-fx");
  fairyFx.style.zIndex = String(Math.max(...fairy.map(zOf)));
  const twinkle = flashPool(fairyFx, "hw-bulb hw-bulb--fairy", 14);
  const fairyPts = FAIRY_BULBS;

  const glows = [], tips = [];
  for (const [id, l] of candles) {
    const cups = CANDLES[id], r = rectOf(l);
    const cx = cups.reduce((s, c) => s + c[0], 0) / cups.length, cy = cups.reduce((s, c) => s + c[1], 0) / cups.length;
    const spread = Math.max(...cups.map(([x, y]) => Math.hypot(x - cx, y - cy)));
    const d = clamp(spread * 2 + r.w * 0.9, 50, 260);
    const gl = beside(st, l, "hw-candle-glow", true, "span");
    box(gl, cx - d / 2, cy - d / 2, d, d);
    glows.push({ el: gl, y: cy });
    // flicker tips on the candelabras only (the small candles flicker through their glow)
    for (const [x, y] of cups.slice(0, /candelabra/.test(id) ? 3 : 0)) {
      const fw = clamp(r.w / 9, 5, 12);
      const t = beside(st, l, "hw-flame", true, "span");
      box(t, x - fw / 2, y - fw * 1.5, fw, fw * 2);
      tips.push({ el: t, y });
    }
  }
  const wr = rectOf(water);
  const waterFx = beside(st, water, "hw-fx hw-water");
  box(waterFx, wr.x, wr.y, wr.w, wr.h);
  const band = mk("span", "hw-water__band", waterFx);
  box(band, 0, 0, 260, wr.h);
  const waterGlint = flashPool(waterFx, "hw-glint hw-glint--water", 5);

  // -- tap: blessing shower (front canvas, under the text) + fireworks (back canvas)
  const shower = blessingShower(st, couple);
  const fireworks = skyFireworks(st, sky);
  const bless = () => {
    shower.fire();
    fireworks.volley(Math.random() < 0.5 ? 3 : 4);
    for (const g of glows) {
      try { g.el.animate([{ transform: "scale(1)" }, { transform: "scale(1.3)", offset: 0.25 }, { transform: "scale(1)" }], { duration: 1400, easing: "ease-out", composite: "add" }); } catch (e) { /* */ }
    }
  };
  onTap(st, bless);
  tapAction("wedding", () => { if (st.entered) bless(); });            // the slide's pill

  // ambient petal: a rose petal now and then lets go of a garland
  const petalFx = beside(st, couple, "hw-fx");
  const ROSES = [1, 2, 3].map((n) => FX(`rose-${n}.webp`));
  preload(ROSES);
  st.tickers.push(spawner(() => {
    const long = garlands.filter((x) => x.r.h > 120);
    driftPetal(petalFx, pick(ROSES), () => {
      const g = pick(long);
      return [g.r.x + g.r.w / 2 + rnd(-8, 8), g.r.y + g.r.h - 10];
    }, rnd(700, 1000), rnd(22, 30));
  }, 2600, 5200));
  st.tickers.push(spawner(() => { const [x, y] = pick(fairyPts); twinkle(x, y, rnd(26, 36), rnd(600, 950), 1); }, 110, 220));
  st.tickers.push(spawner(() => { const [x, y] = pick(WATER_PTS); waterGlint(x - wr.x, y - wr.y, rnd(18, 28), rnd(700, 1100), rnd(0.65, 0.95), 1); }, 380, 900));

  // armed (hidden until entrance)
  const armed = [...G, ...fairy, couple];
  for (const a of armed) a.classList.add("hw-arm");
  st.undo.push(() => armed.forEach((a) => a.classList.remove("hw-arm")));

  // -------------------------------------------------- entrance
  st.enter = () => {
    if (st.visible) for (const t of st.tickers) t.start();
    // stars come out
    stars.forEach((s, i) => {
      const peak = s.classList.contains("hw-star--big") ? 1 : rnd(0.55, 0.9);
      once(s, [{ opacity: 0, transform: "scale(0.4)" }, { opacity: peak, transform: "scale(1)" }],
        { duration: 900, delay: 200 + i * 45, easing: ease.out }).addEventListener("finish", () => {
        loop(st, s, [{ opacity: peak, transform: "scale(1)" }, { opacity: peak * 0.25, transform: "scale(0.7)", offset: 0.5 },
          { opacity: peak, transform: "scale(1)" }], { duration: rnd(2200, 4800), delay: rnd(0, 1500), easing: ease.inOut });
      }, { once: true });
      s.style.opacity = String(peak);
    });
    // garlands lowered from the canopy in a wave from the left; each swings as it lands
    for (const g of garlands) {
      const at = 120 + (g.r.x / 1080) * 900 + rnd(0, 120);
      dropIn(g.ly, at, 1200);
      if (!g.tiny) g.h.swingIn(at + 620, (g.h.mode === "skew" ? 4.5 : 6) * (Math.random() < 0.5 ? -1 : 1), 3000);
      // the breeze travels across the canopy left -> right (delay grows with x)
      g.h.breeze(at + 3620 + (g.r.x / 1080) * 1400, 4);
    }
    // fairy lights switch on far -> near
    fairy.forEach((f, i) => once(f, [
      { opacity: 0 }, { opacity: 0.9, offset: 0.14 }, { opacity: 0.2, offset: 0.24 }, { opacity: 1, offset: 0.4 },
      { opacity: 0.6, offset: 0.5 }, { opacity: 1 },
    ], { duration: 1000, delay: 700 + i * 170, easing: "linear" }));
    // candles ignite down the aisle (far = high on the page first), then flicker
    const order = [...glows].sort((a, b) => a.y - b.y);
    order.forEach((g, i) => {
      const d = 900 + i * 55;
      once(g.el, [{ opacity: 0, transform: "scale(0.3)" }, { opacity: 0.85, transform: "scale(1)" }], { duration: 700, delay: d, easing: ease.out });
      loop(st, g.el, [
        { opacity: 0.85, transform: "scale(1)" }, { opacity: 0.68, transform: "scale(0.95)", offset: 0.18 },
        { opacity: 0.9, transform: "scale(1.04)", offset: 0.33 }, { opacity: 0.74, transform: "scale(0.97)", offset: 0.52 },
        { opacity: 0.95, transform: "scale(1.03)", offset: 0.7 }, { opacity: 0.7, transform: "scale(0.96)", offset: 0.86 },
        { opacity: 0.85, transform: "scale(1)" },
      ], { duration: rnd(1600, 2600), delay: d + 700, easing: "ease-in-out" });
    });
    for (const t of tips) {
      const d = 900 + Math.max(0, (t.y - 1350)) * 1.2 + rnd(0, 200);
      once(t.el, [{ opacity: 0, transform: "scaleY(0.2)" }, { opacity: 0.8, transform: "scaleY(1)" }], { duration: 500, delay: d, easing: ease.out });
      loop(st, t.el, [
        { opacity: 0.8, transform: "scale(1, 1)" }, { opacity: 0.55, transform: "scale(0.9, 1.25)", offset: 0.22 },
        { opacity: 0.9, transform: "scale(1.06, 0.88)", offset: 0.45 }, { opacity: 0.6, transform: "scale(0.94, 1.18)", offset: 0.7 },
        { opacity: 0.8, transform: "scale(1, 1)" },
      ], { duration: rnd(520, 900), delay: d + 500, easing: "ease-in-out" });
    }
    // the couple walks the last steps up the aisle (from nearer the viewer: lower + larger)
    const steps = 4, dur = 2800;
    const walk = [];
    for (let i = 0; i <= 28; i++) {
      const p = i / 28, e = 1 - Math.pow(1 - p, 2.4);
      const ty = 11 * (1 - e), sc = 1 + 0.08 * (1 - e);
      const bob = -0.7 * Math.abs(Math.sin(Math.PI * steps * e)) * (1 - e);
      const tilt = 0.7 * Math.sin(Math.PI * steps * e) * (1 - e);
      walk.push({ transform: i === 28 ? "none" : `translateY(${(ty + bob).toFixed(3)}%) scale(${sc.toFixed(4)}) rotate(${tilt.toFixed(3)}deg)`,
        opacity: Math.min(1, p / 0.22), transformOrigin: "50% 100%" });
    }
    once(couple, walk, { duration: dur, delay: 1000, easing: "linear" });

    // ambient once everything has landed
    setTimeout(() => {
      for (const c of canopy) {
        const im = imgOf(c);
        im.style.transformOrigin = "50% 0%";
        loop(st, im, [{ transform: "scale(1)" }, { transform: "scale(1.008, 1.012)" }, { transform: "scale(1)" }],
          { duration: rnd(5200, 6400), delay: rnd(0, 1200), easing: ease.inOut });
      }
      fairy.forEach((f) => loop(st, imgOf(f), [{ opacity: 1 }, { opacity: rnd(0.62, 0.75) }, { opacity: 1 }],
        { duration: rnd(3800, 6000), delay: rnd(0, 2000), easing: ease.inOut }));
      // water: a slow sheen sweeps the channel
      loop(st, band, [
        { transform: `translateX(${U(-300)}) skewX(-28deg)`, opacity: 0 },
        { opacity: 1, offset: 0.12 }, { opacity: 1, offset: 0.48 },
        { transform: `translateX(${U(wr.w + 120)}) skewX(-28deg)`, opacity: 0, offset: 0.6 },
        { transform: `translateX(${U(wr.w + 120)}) skewX(-28deg)`, opacity: 0 },
      ], { duration: 9000, easing: "cubic-bezier(0.45, 0, 0.4, 1)" });
      // lotuses bob (edge-cut ones only rise and fall)
      for (const l of lotus) {
        const r = rectOf(l), cut = r.x < 2 || r.x + r.w > 1078;
        const im = imgOf(l);
        im.style.transformOrigin = "50% 85%";
        const a = cut ? 0 : rnd(1.2, 2.2), dy = rnd(2.5, 4);
        loop(st, im, [
          { transform: "translateY(0) rotate(0deg)" },
          { transform: `translateY(${U(-dy)}) rotate(${a}deg)`, offset: 0.25 },
          { transform: "translateY(0) rotate(0deg)", offset: 0.5 },
          { transform: `translateY(${U(dy * 0.6)}) rotate(${-a}deg)`, offset: 0.75 },
          { transform: "translateY(0) rotate(0deg)" },
        ], { duration: rnd(4200, 6000), delay: rnd(0, 2000), easing: ease.inOut });
      }
      // elephants: very slow, small sway about the feet, out of phase (edge-cut: outward only)
      elephants.forEach((el, i) => {
        const r = rectOf(el), im = imgOf(el);
        im.style.transformOrigin = "50% 96%";
        const lean = r.x < 2 ? -1 : r.x + r.w > 1078 ? 1 : 0;      // rotate sign that tips the top outward
        const A = rnd(0.55, 0.85);
        const frames = lean ? [{ rotate: "0deg" }, { rotate: `${lean * A}deg` }, { rotate: "0deg" }]
          : [{ rotate: "0deg" }, { rotate: `${A}deg`, offset: 0.25 }, { rotate: "0deg", offset: 0.5 }, { rotate: `${-A}deg`, offset: 0.75 }, { rotate: "0deg" }];
        loop(st, im, frames, { duration: lean ? rnd(6500, 8000) : rnd(11000, 13000), delay: i * 1700, easing: ease.inOut });
      });
    }, 3200);
  };
}


// Blessing shower: rose + marigold petals let go of the canopy across its width, flutter
// down (sway, tumble, spin) and fade before they reach the couple. Under the text; petals
// crossing the text block are drawn lighter so the lines stay readable.
function blessingShower(st, coupleLy) {
  const sprites = imgs([1, 2, 3].map((n) => FX(`rose-${n}.webp`)).concat([1, 2, 3, 4].map((n) => FX(`marigold-${n}.webp`))));
  const ps = [];
  let text = null;
  const eng = canvasEngine(st, "hw-canvas--shower", [0, 0, 1080, 1920], zOf(coupleLy), coupleLy.nextSibling, draw, () => ps.length > 0);
  function fire() {
    if (ps.length > 110) return;
    text = textBox(st.stage);
    const N = 54;
    for (let i = 0; i < N; i++) {
      const marigold = Math.random() < 0.4;
      const img = marigold ? sprites[3 + ((Math.random() * 4) | 0)] : sprites[(Math.random() * 3) | 0];
      ps.push({                                      // stratified across the full width
        img, x: ((i + Math.random()) / N) * 1080, y: rnd(-40, 230), delay: rnd(0, 96),
        vy: rnd(2.4, 3.8), sw: rnd(18, 42), w: rnd(0.03, 0.06), ph: rnd(0, TAU), rot: rnd(0, TAU), vr: rnd(-0.09, 0.09) || 0.05,
        fl: rnd(0, TAU), vf: rnd(0.08, 0.16), size: marigold ? rnd(40, 52) : rnd(36, 50), life: 0, floor: rnd(1240, 1400),
      });
    }
    eng.kick();
  }
  function draw(ctx, k) {
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      if (p.delay > 0) { p.delay -= k; continue; }
      p.life += k;
      p.y += p.vy * k;
      p.ph += p.w * k; p.rot += p.vr * k; p.fl += p.vf * k;
      const x = p.x + Math.sin(p.ph) * p.sw;
      let a = Math.min(1, p.life / 12);
      if (p.y > p.floor - 160) a *= clamp((p.floor - p.y) / 160, 0, 1);
      if (p.y > p.floor) { ps.splice(i, 1); continue; }
      if (text && x > text[0] && x < text[2] && p.y > text[1] && p.y < text[3]) a *= 0.55;
      if (a <= 0.01 || !p.img.complete || !p.img.naturalWidth) continue;
      const ar = p.img.naturalHeight / p.img.naturalWidth;
      ctx.globalAlpha = a;
      drawSprite(ctx, p.img, x, p.y, p.rot, Math.cos(p.fl) * 0.75 + (Math.cos(p.fl) < 0 ? -0.25 : 0.25), p.size, ar);
    }
  }
  return { fire };
}

// Fireworks in the navy sky: 3-4 shells per tap, staggered ~0.35 s -- one in each open band
// (left of the text, right of it, above "21st") plus a random extra. A rocket rises from
// behind the mandap / trees (hidden by the art until it clears it), bursts with a bright
// white-gold core flash and a warm sky glow into a gold or rose peony / willow whose stars
// drag long glittering trails, then glitter out. Shell radius 125-170 design px (~90-125
// CSS px across at 390 wide). Behind ALL the art (z 0), so the garlands and trees overlap it;
// anything passing behind the live text is dimmed (never shrunk).
function skyFireworks(st, sky) {
  // 0 gold, 1 pale gold, 2 rose, 3 white-gold, 4 deep rose
  const COLS = [[255, 206, 96], [255, 232, 170], [255, 136, 176], [255, 248, 228], [255, 96, 150]];
  const spr = COLS.map(dotSprite);
  const glowSprite = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const x = c.getContext("2d");
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,226,170,0.6)");
    g.addColorStop(0.4, "rgba(255,190,130,0.2)");
    g.addColorStop(1, "rgba(255,180,120,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    return c;
  })();
  const rockets = [], parts = [], glows = [];
  let text = null;
  const eng = canvasEngine(st, "hw-canvas--sky", SKY, 0, sky.nextSibling, draw, () => rockets.length + parts.length + glows.length > 0);
  const inText = (x, y) => text && x > text[0] - 20 && x < text[2] + 20 && y > text[1] - 20 && y < text[3] + 20;
  const add = (p) => { if (parts.length < 900) parts.push(p); };
  const star = (x, y, a, R, o) => {
    const c = o.c, life = o.life, v = (R * c) / (1 - Math.exp(-c * life * 0.85));
    add({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life, c, g: o.g, col: o.col, size: o.size,
      kind: o.kind, trail: [], tl: o.tl });
  };
  function explode(r) {
    const rose = r.rose, main = rose ? 2 : 0, alt = rose ? 4 : 1;
    glows.push({ x: r.x, y: r.y, t: 0, life: 0.75, s: 720 });
    add({ flash: true, x: r.x, y: r.y, t: 0, life: 0.18, s: 120, col: 3 });       // bright core
    add({ flash: true, x: r.x, y: r.y, t: 0, life: 0.32, s: 70, col: main });
    if (r.kind === "willow") {
      const R = rnd(130, 160);
      for (let i = 0; i < 64; i++) star(r.x, r.y, (i / 64) * TAU + rnd(-0.05, 0.05), R * rnd(0.9, 1),
        { c: 1.25, life: rnd(2.3, 2.9), g: 80, col: Math.random() < 0.3 ? 3 : main, size: 14, kind: "willow", tl: 26 });
    } else {
      const R = rnd(125, 170);
      for (let i = 0; i < 84; i++) {
        const ring = Math.random() < 0.8;
        star(r.x, r.y, (i / 84) * TAU + rnd(-0.04, 0.04), R * (ring ? rnd(0.9, 1) : rnd(0.35, 0.75)),
          { c: 1.5, life: rnd(1.6, 2.2), g: 50, col: Math.random() < 0.25 ? alt : Math.random() < 0.12 ? 3 : main, size: 18, kind: "peony", tl: 14 });
      }
    }
  }
  function launch(x, y, kind, rose, delay) {
    setTimeout(() => {
      rockets.push({ x0: x + rnd(-40, 40), y0: 1180, x, y, t: 0, dur: rnd(0.5, 0.65), kind, rose, trail: [] });
      eng.kick();
    }, delay);
  }
  // one shell per open band (+ a random extra), each jittered
  const BANDS = [[[110, 380], [140, 560], [130, 220]], [[905, 800], [880, 590], [930, 960]], [[560, 190], [760, 210], [360, 200]]];
  function volley(n) {
    text = textBox(st.stage);
    if (rockets.length > 2 || parts.length > 500) return;
    const pts = BANDS.map((b) => pick(b));
    const extra = pick(BANDS.flat().filter((p) => !pts.includes(p)));
    if (n > 3) pts.push(extra);
    pts.sort(() => Math.random() - 0.5).forEach(([x, y], j) => {
      launch(x + rnd(-25, 25), y + rnd(-25, 25), Math.random() < 0.35 ? "willow" : "peony", Math.random() < 0.45, j * rnd(320, 380));
    });
  }
  function draw(ctx, k) {
    const dt = k / 60;
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    for (let i = glows.length - 1; i >= 0; i--) {
      const g = glows[i];
      g.t += dt;
      const f = g.t / g.life;
      if (f >= 1) { glows.splice(i, 1); continue; }
      ctx.globalAlpha = (f < 0.12 ? f / 0.12 : (1 - f) / 0.88) * 0.9;
      const d = g.s * (0.75 + 0.35 * f);
      ctx.drawImage(glowSprite, g.x - d / 2, g.y - d / 2, d, d);
    }
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i];
      r.t += dt;
      const e = Math.min(1, r.t / r.dur), q = 1 - Math.pow(1 - e, 1.6);
      const x = r.x0 + (r.x - r.x0) * q, y = r.y0 + (r.y - r.y0) * q;
      r.trail.unshift([x, y]);
      if (r.trail.length > 10) r.trail.pop();
      r.trail.forEach(([tx, ty], j) => {
        ctx.globalAlpha = 0.45 * (1 - j / 10) * (inText(tx, ty) ? 0.3 : 1);
        const d = 13 - j * 0.8;
        ctx.drawImage(spr[1], tx - d / 2, ty - d / 2, d, d);
      });
      if (e >= 1) { rockets.splice(i, 1); explode(r); }
    }
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.t += dt;
      const f = p.t / p.life;
      if (f >= 1) { parts.splice(i, 1); continue; }
      const dim = inText(p.x, p.y) ? 0.3 : 1;
      if (p.flash) {
        ctx.globalAlpha = (1 - f) * (1 - f) * dim;
        const d = p.s * (0.45 + 0.9 * f);
        ctx.drawImage(spr[p.col], p.x - d / 2, p.y - d / 2, d, d);
        continue;
      }
      const drag = Math.exp(-p.c * dt);
      p.vx *= drag; p.vy = p.vy * drag + p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      let al = f < 0.6 ? 1 : (1 - f) / 0.4;
      if (p.kind === "willow") al = f < 0.25 ? 1 : 1 - (f - 0.25) / 0.75;
      const tw = f > 0.45 ? 0.35 + 0.65 * Math.random() : 1;                    // glitter as it dies
      if (p.kind === "peony" && f > 0.6 && Math.random() < 0.03) add({ flash: true, x: p.x + rnd(-6, 6), y: p.y + rnd(-6, 6), t: 0, life: rnd(0.08, 0.14), s: rnd(22, 32), col: 3 });
      // long glittering trail: a fading line + sparkles scattered along it
      p.trail.unshift(p.x, p.y);
      if (p.trail.length > p.tl * 2) p.trail.length = p.tl * 2;
      const [cr, cg, cb] = COLS[p.col];
      if (p.trail.length > 4) {
        ctx.strokeStyle = `rgb(${cr},${cg},${cb})`;
        ctx.globalAlpha = al * 0.32 * dim;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(p.trail[0], p.trail[1]);
        for (let j = 2; j < p.trail.length; j += 4) ctx.lineTo(p.trail[j], p.trail[j + 1]);
        ctx.stroke();
        const j = 2 * (2 + ((Math.random() * (p.trail.length / 2 - 2)) | 0));
        ctx.globalAlpha = al * 0.8 * dim * Math.random();
        ctx.drawImage(spr[3], p.trail[j] - 4, p.trail[j + 1] - 4, 8, 8);
      }
      ctx.globalAlpha = al * tw * dim;
      ctx.drawImage(spr[p.col], p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
  }
  return { volley };
}
