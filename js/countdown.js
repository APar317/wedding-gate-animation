// countdown.js -- the countdown slide's four tiles (days / hours / minutes / seconds)
// tick to the wedding. Target (with its IST offset) comes from data/content.json via
// .cd[data-countdown]; build.py writes the tiles. Works without motion: the reduced-
// motion page shows the same live numbers, just without the settle animation.
// Ticks only while the slide is near the screen and the tab is visible.
const pad = (n) => String(n).padStart(2, "0");

export function initCountdown() {
  const box = document.querySelector(".cd[data-countdown]");
  if (!box) return;
  const target = Date.parse(box.dataset.countdown);
  if (Number.isNaN(target)) return;
  const nums = Object.fromEntries([...box.querySelectorAll("[data-cd-unit]")].map((el) => [el.dataset.cdUnit, el]));
  const done = box.querySelector(".cd__done");
  const until = box.getAttribute("aria-label");          // "until Vansh weds Ishika"
  const motion = document.documentElement.classList.contains("motion");
  let timer = 0, near = false, spoken = "";

  function render(animate) {
    const ms = target - Date.now();
    if (ms <= 0) {
      box.classList.add("is-done");
      done.hidden = false;
      box.setAttribute("aria-label", done.textContent);
      stop();
      return;
    }
    const s = Math.floor(ms / 1000);
    const v = { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
    for (const [k, el] of Object.entries(nums)) {
      const t = pad(v[k]);
      if (el.textContent === t) continue;
      el.textContent = t;
      if (animate && motion) {
        el.classList.remove("is-tick");
        void el.offsetWidth;                              // restart the settle
        el.classList.add("is-tick");
      }
    }
    // screen readers: one sentence, refreshed when the minute changes (not every second)
    const say = `${v.d} days, ${v.h} hours and ${v.m} minutes ${until}`;
    if (say !== spoken) { spoken = say; box.setAttribute("aria-label", say); }
  }
  function start() {
    if (timer || document.hidden || !near) return;
    render(false);
    // align to the wall-clock second so all four tiles turn together
    timer = setTimeout(function tick() {
      render(true);
      timer = setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    }, 1000 - (Date.now() % 1000) + 5);
  }
  function stop() { clearTimeout(timer); timer = 0; }

  render(false);
  const scene = box.closest("[data-scene]");
  if (typeof window.IntersectionObserver === "function") {
    new IntersectionObserver((es) => {
      near = es.some((e) => e.isIntersecting);
      near ? start() : stop();
    }, { rootMargin: "50% 0px" }).observe(scene);
  } else {
    near = true;
    start();
  }
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
}
