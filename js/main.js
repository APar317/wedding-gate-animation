// main.js -- single entry point. Each behaviour is a small module; motion modules
// share js/motion/kit.js (lifecycle + ownership contract -- read it first).
// Scene modules init BEFORE the generic ones so their kit.claim() calls are in
// place before reveal / ambient / touch look at a layer.
import { initIntro } from "./intro.js";
import { initMemory } from "./memory.js";
import { initCountdown } from "./countdown.js";
import { start, enterAll } from "./motion/kit.js";
import * as monogramNames from "./motion/scenes/monogram-names.js";
import * as mehendiTilak from "./motion/scenes/mehendi-tilak.js";
import * as haldiWedding from "./motion/scenes/haldi-wedding.js";
import * as rsvp from "./motion/scenes/rsvp.js";
import * as countdownLocation from "./motion/scenes/countdown-location.js";
import * as reveal from "./motion/reveal.js";
import * as ambient from "./motion/ambient.js";
import * as touch from "./motion/touch.js";
import * as petals from "./motion/petals.js";
import * as hints from "./motion/hints.js";

initIntro();
initMemory();
initCountdown();
for (const m of [monogramNames, mehendiTilak, haldiWedding, rsvp, countdownLocation]) {
  try { m.init(); } catch (e) { console.error("[motion] scene module setup failed", e); }
}
try {
  for (const m of [reveal, ambient, touch, petals, hints]) m.init();
  start();
} catch (e) {
  console.error("[motion] setup failed -- showing the static invite", e);
  enterAll();
}
