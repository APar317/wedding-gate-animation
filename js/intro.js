// intro.js -- the opening temple gate on the Kashi ghat: a one-move ritual.
// DOM: tools/build.py (from data/gate.json); styles + states: css/intro.css;
// sprites: tools/make_gate.py.
//
// FIRST PAINT. The inline <head> script (build.py GATE_BOOT) adds html.gate-armed
// before the body parses, so the first paint is the closed gate (its inlined poster).
// It also catches a tap that lands before this module has loaded (slow network): the
// music starts in that tap and VI.tapped is set, which activate() picks up below.
//
// WAITING. Diya flames flicker, the seam light breathes, the bell sways, Ganga glints,
// motes drift (all CSS, css/intro.css). The art fades in over the poster and the
// "Tap to open" pill rises only once the base, the leaves, the toran and the bell have
// decoded (.is-ready); the whole gate is the tap target, the pill is the labelled one.
//
// THE TAP (one gesture; t = ms after it)
//   0          the music starts in this same gesture (js/audio.js listens on
//              [data-intro]; iOS only allows audio inside a user gesture); pill retires
//   0-2600     the bell swings: a damped pendulum from its hook
//   0-900      the seam light flares, then thins as the leaves part
//   0-260      unlatch: both leaves rattle
//   260-1800   the leaves swing INWARD (rotateY away from the guest, hinged at the
//              jambs, perspective), overshoot, settle at OPEN_DEG; the right one trails
//   250-1500   the sanctum glow blooms behind them; the threshold and the doorway's
//              surround take the light
//   520-3000   marigold + rose petals drift out of the doorway toward the guest
//   1100-3250  the camera pushes through the doorway (scale toward its centre)
//   1800-2400  a warm golden bloom fills the frame
//   2350       DISSOLVE: "invite:open" (js/motion/kit.js -- the one dispatch), scroll
//              unlocks, the gate fades (--gate-fade 900 ms) onto slide 1, already
//              rendered beneath; the node is removed at ~3.3 s.
//
// REDUCED MOTION: the still painting (no ambient); the tap starts the music and the
// gate fades in 250 ms (suryanshu-rajvi's intro behaviour). NO JS: no gate at all.
// REPLAY: nothing is stored -- every load (refresh included) shows the closed gate.
// Every path ends in dismiss(): a stalled decode, a hidden tab or an error can never
// trap the guest.
const OPEN_DEG = 77;
const T_DISSOLVE = 2350;
const FADE_MS = 900;                 // = --gate-fade in css/intro.css
const FADE_REDUCED_MS = 250;         // = the reduced-motion --gate-fade
const REMOVE_SLACK_MS = 400;         // transitionend safety net: fade + this
const WAIT_CAP_MS = 8000;            // tapped before the art decoded: wait at most this
const PILL_SAFETY_MS = 10000;        // show the pill even if decoding stalls
const PUSH_SCALE = 2.9;

const rnd = (a, b) => a + Math.random() * (b - a);

export function initIntro() {
  const gate = document.querySelector("[data-intro]");
  const root = document.documentElement;
  if (!gate) return;
  const V = (window.VI = window.VI || {});
  V.gateBound = true;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const q = (s) => gate.querySelector(s);
  const openBtn = q("[data-intro-open]");
  const frame = q(".gate__frame");
  const cam = q(".gate__cam");
  const stage = q(".gate__stage");

  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  root.classList.add("is-locked");
  window.scrollTo(0, 0);

  let ready = false, started = false, dismissed = false;
  let waitTimer = 0;

  // ---------------------------------------------------------------- readiness
  const need = [...gate.querySelectorAll("img[data-gate-need]")];
  const decodeOne = (img) => new Promise((res) => {
    const done = () => res();
    if (typeof img.decode === "function") img.decode().then(done, () => {
      // decode() rejects for a broken image AND (Safari) for one still loading
      if (img.complete) done();
      else { img.addEventListener("load", done, { once: true }); img.addEventListener("error", done, { once: true }); }
    });
    else if (img.complete) done();
    else { img.addEventListener("load", done, { once: true }); img.addEventListener("error", done, { once: true }); }
  });
  const readyP = Promise.all(need.map(decodeOne)).then(() => {
    ready = true;
    gate.classList.add("is-ready");
  });
  setTimeout(() => gate.classList.add("has-pill"), PILL_SAFETY_MS);

  // ---------------------------------------------------------------- dismiss
  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    clearTimeout(waitTimer);
    root.classList.remove("is-locked");
    window.scrollTo(0, 0);
    gate.setAttribute("aria-hidden", "true");
    const invite = document.getElementById("invite");
    if (invite) {
      invite.tabIndex = -1;
      invite.focus({ preventScroll: true });
    }
    document.dispatchEvent(new CustomEvent("invite:open"));   // the one dispatch

    let removed = false;
    const remove = () => {
      if (removed) return;
      removed = true;
      gate.remove();
    };
    gate.addEventListener("transitionend", (e) => {
      if (e.target === gate && e.propertyName === "opacity") remove();
    });
    requestAnimationFrame(() => gate.classList.add("is-leaving"));
    setTimeout(remove, (reduce ? FADE_REDUCED_MS : FADE_MS) + REMOVE_SLACK_MS);
  }

  // ---------------------------------------------------------------- the opening
  function run() {
    if (dismissed) return;
    const A = (el, frames, opts) => el && el.animate(frames, { fill: "both", ...opts });

    // camera origin = the doorway, a little low (toward the Shivling), in frame px;
    // the bloom is centred on the same point
    const fr = frame.getBoundingClientRect();
    const pr = q(".gate__portal").getBoundingClientRect();
    const ox = pr.left + pr.width / 2 - fr.left;
    const oy = pr.top + pr.height * 0.56 - fr.top;
    cam.style.transformOrigin = `${ox.toFixed(1)}px ${oy.toFixed(1)}px`;
    frame.style.setProperty("--ox", `${ox.toFixed(1)}px`);
    frame.style.setProperty("--oy", `${oy.toFixed(1)}px`);

    // 1. the bell rings: a damped pendulum (its idle sway runs on the wrapper)
    A(q(".gate__bell"), [0, 11, -8.5, 6, -4, 2.4, -1.3, 0.5, 0].map((d) => ({ transform: `rotate(${d}deg)` })),
      { duration: 2600, easing: "ease-in-out" });

    // 2. the seam flares, then thins away as the leaves part
    A(q(".gate__seam"), [
      { opacity: 1, transform: "scaleX(1)" },
      { opacity: 1, transform: "scaleX(2.6)", offset: 0.32 },
      { opacity: 0, transform: "scaleX(4)" },
    ], { duration: 900, easing: "cubic-bezier(0.22, 0.61, 0.36, 1)" });

    // 3. the leaves: unlatch rattle, swing inward, overshoot, settle
    for (const [sel, dir, lag] of [[".gate__leaf--l", 1, 0], [".gate__leaf--r", -1, 60]]) {
      const leaf = q(sel);
      const R = (deg) => `rotateY(${(dir * deg).toFixed(2)}deg)`;
      A(leaf, [
        { offset: 0, transform: R(0) },
        { offset: 0.04, transform: R(-1.2) },
        { offset: 0.09, transform: R(1.0) },
        { offset: 0.145, transform: R(0.2), easing: "cubic-bezier(0.45, 0, 0.25, 1)" },
        { offset: 0.78, transform: R(OPEN_DEG + 6), easing: "cubic-bezier(0.4, 0, 0.3, 1)" },
        { offset: 1, transform: R(OPEN_DEG) },
      ], { duration: 1800, delay: lag, easing: "linear" });
      A(leaf.querySelector("i"), [{ opacity: 0 }, { opacity: 0, offset: 0.18 }, { opacity: 1 }],
        { duration: 1600, delay: lag, easing: "ease-out" });
    }

    // 4. the sanctum's light answers: behind the leaves, on the threshold, round the doorway
    A(q(".gate__sanctum-glow"), [{ opacity: 0, transform: "scale(0.55)" }, { opacity: 0.62, transform: "scale(1.12)", offset: 0.6 }, { opacity: 0.45, transform: "scale(1)" }],
      { duration: 1500, delay: 250, easing: "cubic-bezier(0.16, 1, 0.3, 1)" });
    A(q(".gate__spill"), [{ opacity: 0, transform: "scaleY(0.4)" }, { opacity: 0.9, transform: "scaleY(1)" }],
      { duration: 1200, delay: 320, easing: "cubic-bezier(0.16, 1, 0.3, 1)" });
    A(q(".gate__halo"), [{ opacity: 0, transform: "scale(0.6)" }, { opacity: 0.5, transform: "scale(1)" }],
      { duration: 1300, delay: 420, easing: "cubic-bezier(0.22, 0.61, 0.36, 1)" });
    A(q(".gate__underglow"), [{ opacity: 0.6 }, { opacity: 1, offset: 0.3 }, { opacity: 0 }],
      { duration: 1100, easing: "ease-out" });

    // 5. petals out of the light
    setTimeout(petals, 520);

    // 6. push through the doorway into the bloom
    A(cam, [{ transform: "scale(1)" }, { transform: `scale(${PUSH_SCALE})` }],
      { duration: 2150, delay: 1100, easing: "cubic-bezier(0.45, 0, 0.7, 0.4)" });
    A(q(".gate__bloom"), [{ opacity: 0 }, { opacity: 0.95 }],
      { duration: 600, delay: 1800, easing: "cubic-bezier(0.5, 0, 0.75, 0.4)" });

    setTimeout(dismiss, T_DISSOLVE);
  }

  // Marigolds (cut from the toran) and rose blossoms (the site's own petals): born
  // small in the doorway (far), they grow as they come toward the guest, fan out and
  // drift down. transform / opacity only; removed by timer even in a hidden tab.
  function petals() {
    const art = q(".gate__art");
    const tpl = [...gate.querySelectorAll("[data-gate-petal]")].map((i) => i.getAttribute("src"));
    if (!art || !tpl.length) return;
    const sw = stage.getBoundingClientRect().width;
    const u = sw / 1520;                               // CSS px per source px
    const pr = q(".gate__portal");
    const cx = pr.offsetLeft + pr.offsetWidth / 2, cy = pr.offsetTop + pr.offsetHeight * 0.55;
    const box = document.createElement("div");
    box.className = "gate__petals";
    box.setAttribute("aria-hidden", "true");
    art.appendChild(box);
    let longest = 0;
    for (let i = 0; i < 16; i++) {
      const img = document.createElement("img");
      img.className = "gate__petal";
      img.alt = "";
      img.src = tpl[i % tpl.length];
      const size = rnd(34, 50) * u;
      img.style.width = `${size.toFixed(1)}px`;
      img.style.left = `${(cx - size / 2 + rnd(-110, 110) * u).toFixed(1)}px`;
      img.style.top = `${(cy - size / 2 + rnd(-260, 200) * u).toFixed(1)}px`;
      box.appendChild(img);
      const side = i % 2 ? 1 : -1;
      const dx = side * rnd(120, 420) * u, dy = rnd(-160, 120) * u, fall = rnd(260, 520) * u;
      const r0 = rnd(0, 360), spin = rnd(200, 480) * (Math.random() < 0.5 ? -1 : 1);
      const s1 = rnd(1.4, 2.1);
      const f = (k, x, y, s, op) => ({
        offset: k, opacity: op,
        transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${(r0 + spin * k).toFixed(1)}deg) scale(${s.toFixed(3)})`,
      });
      const dur = rnd(1900, 2600), delay = rnd(0, 420);
      longest = Math.max(longest, dur + delay);
      img.animate([
        f(0, 0, 0, 0.2, 0),
        f(0.12, dx * 0.25, dy * 0.25, s1 * 0.45, 1),
        f(0.45, dx * 0.8, dy * 0.8 + fall * 0.2, s1 * 0.85, 1),
        f(0.8, dx, dy + fall * 0.7, s1, 0.85),
        f(1, dx * 1.08, dy + fall, s1, 0),
      ], { duration: dur, delay, easing: "cubic-bezier(0.2, 0.65, 0.35, 1)", fill: "both" });
    }
    setTimeout(() => box.remove(), longest + 200);
  }

  // ---------------------------------------------------------------- the tap
  function activate() {
    if (started || dismissed) return;
    started = true;
    gate.classList.add("is-opening");
    gate.setAttribute("aria-label", "Opening the invitation");
    if (openBtn && document.activeElement === openBtn) openBtn.blur();
    if (reduce) { dismiss(); return; }
    if (ready) { run(); return; }
    // tapped before the art decoded: open as soon as it has, never wait forever
    waitTimer = setTimeout(dismiss, WAIT_CAP_MS);
    readyP.then(() => { if (!dismissed) { clearTimeout(waitTimer); run(); } });
  }

  // The pill is the labelled control; tapping anywhere on the gate does the same.
  if (openBtn) openBtn.addEventListener("click", activate);
  gate.addEventListener("click", activate);
  if (V.tapped) activate();          // a tap the <head> script caught before we loaded
}
