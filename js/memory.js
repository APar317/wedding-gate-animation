// memory.js -- keep decoded artwork bounded on phones.
// All 7 slides decoded at once is well over 150 MB of bitmaps (base + every separate
// layer), enough to get an iOS Safari tab killed. Slides more than ~1 screen
// away release their images (src -> 1x1 GIF, real URL kept in data-src) and
// get them back before they scroll into view. Never removeAttribute("src") or
// set src="" -- the first fires error handling, the second refetches the page.
const BLANK = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

export function initMemory() {
  if (typeof window.IntersectionObserver !== "function") return;
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      for (const img of e.target.querySelectorAll("img")) {
        if (e.isIntersecting) {
          if (img.dataset.src) {
            img.src = img.dataset.src;
            delete img.dataset.src;
          }
        } else if (!img.dataset.src && img.complete && img.naturalWidth > 1) {
          img.dataset.src = img.getAttribute("src");
          img.src = BLANK;
        }
      }
    }
  }, { rootMargin: "100% 0px" });
  document.querySelectorAll("[data-scene]").forEach((s) => io.observe(s));
}
