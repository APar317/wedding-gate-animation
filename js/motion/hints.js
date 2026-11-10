// hints.js -- "Tap to ..." pills + target rings, so guests know every slide responds to a
// tap (ported from suryanshu-rajvi: sangeet-baraat makeCta, wedding-finale .wf-pill /
// .wf-tap / .wf-fountain-hint). Contract: js/motion/kit.js.
//
// One pill per slide, a real <button> (keyboard + aria-label) that runs the slide's own
// tap effect (registered by its scene module with kit.tapAction). It rises ~1 s after the
// slide's text has finished revealing, floats and pulses gently, and then STAYS for as
// long as the slide is on screen, however many times the guest taps (owner's ruling,
// 2026-10-22: the hint must remain). Some slides also keep a soft pulsing ring on the
// real tap target (Shivling basin, river, fountain).
// Placement (design px) is clear of the text block and the faces on every slide.
// Reduced motion: nothing is built (exact PSD frame), as in suryanshu-rajvi.
import { onScene, reduced, sceneEl, stageOf, tapActionOf } from "./kit.js";

// at = pill centre; ring = [cx, cy, d]; after = ms from enter until the text is done
const HINTS = {
  monogram: { label: "Tap to light the diyas", aria: "Light the diyas around the Shivling", at: [540, 1868], ring: [544, 1655, 250], after: 1800 },
  names:    { label: "Tap the Ganga", aria: "Send ripples across the Ganga", at: [500, 1098], ring: [968, 1318, 150], after: 2900 },
  countdown: { label: "Tap to float a diya", aria: "Float a diya on the Ganga", at: [640, 1330], after: 1700 },
  mehendi:  { label: "Tap for mehendi", aria: "Draw a mehendi design", at: [540, 1606], after: 1600 },
  tilak:    { label: "Tap for fireworks", aria: "Light fireworks in the night window", at: [540, 1862], after: 1700 },
  haldi:    { label: "Tap for Haldi colours", aria: "Throw Haldi colours", at: [540, 1072], after: 1600 },
  wedding:  { label: "Tap to shower blessings", aria: "Shower blessings on the couple", at: [540, 1030], after: 1600 },
  rsvp:     { label: "Tap the fountain", aria: "Splash the fountain", at: [380, 1852], ring: [347, 1612, 200], after: 1600 },
};
const RISE_AFTER_TEXT = 1000;
const U = (n) => `calc(${n} * var(--u))`;

export function init() {
  if (reduced) return;
  for (const [slug, h] of Object.entries(HINTS)) {
    const scene = sceneEl(slug);
    const act = tapActionOf(slug);
    if (scene && act) build(scene, h, act);
  }
}

function build(scene, h, act) {
  const stage = stageOf(scene);
  const st = { ready: false, visible: false };

  const pill = document.createElement("button");
  pill.type = "button";
  pill.className = "th-pill";
  pill.setAttribute("aria-label", h.aria);
  pill.innerHTML = '<span class="th-tap" aria-hidden="true"><span></span><span></span><i></i></span><span class="th-pill__t"></span>';
  pill.querySelector(".th-pill__t").textContent = h.label;
  Object.assign(pill.style, { left: U(h.at[0]), top: U(h.at[1]) });
  stage.appendChild(pill);

  let ring = null;
  if (h.ring) {
    const [cx, cy, d] = h.ring;
    ring = document.createElement("span");
    ring.className = "th-ring";
    ring.setAttribute("aria-hidden", "true");
    ring.innerHTML = "<span></span><span></span>";
    Object.assign(ring.style, { left: U(cx - d / 2), top: U(cy - d / 2), width: U(d), height: U(d) });
    stage.appendChild(ring);
  }

  const sync = () => {
    const on = st.ready && st.visible;
    pill.classList.toggle("is-on", on);
    if (ring) ring.classList.toggle("is-on", on);
  };
  pill.addEventListener("click", (e) => {
    e.stopPropagation();                // the slide's own tap handlers skip buttons anyway
    try { act(); } catch (err) { console.error("[motion] hint action", err); }
  });

  onScene(scene.dataset.scene, {
    enter() {
      setTimeout(() => { st.ready = true; sync(); }, h.after + RISE_AFTER_TEXT);
    },
    show() { st.visible = true; scene.classList.remove("th-away"); sync(); },
    hide() { st.visible = false; scene.classList.add("th-away"); sync(); },
  });
}
