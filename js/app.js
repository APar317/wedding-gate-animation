/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Pragya & Yatharth — Wedding Invitation Experience & Guest Portal
 * ─────────────────────────────────────────────────────────────────────────────
 *  Sequence:
 *    1. Temple Gate with live ambient animation (swaying bell, breathing light, motes)
 *    2. Tap to Open -> Gate swings open + Sacred Shehnai/flute music plays + Petals burst
 *    3. Name Flash -> Auspicious Ganesha shloka + Grand couple names (Pragya & Yatharth)
 *    4. Guest Portal -> Exact replica of target portal (#wa-app)
 *       - Home tab: Hero art, countdown to 25 Nov 2026, invitation note, blessings card
 *       - Events tab: Single Wedding Ceremony on 25 Nov 2026, KNCC Resort, Agra
 *       - Blessings tab: Interactive form with live word count, relations, prompts,
 *         and 3D flip blessings wall backed by localStorage
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function () {
  "use strict";

  const W = window.WEDDING || {};
  const html = document.documentElement;
  const TZ = "Asia/Kolkata";
  const both = (W.couple?.first || "Pragya") + " & " + (W.couple?.second || "Yatharth");
  const TABS = ["home", "events", "blessings"]; // Only 3 tabs as requested!

  // ---------------------------------------------------------------- Helpers
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function fmt(d, opts) {
    opts = opts || {};
    opts.timeZone = TZ;
    return new Intl.DateTimeFormat("en-IN", opts).format(d);
  }

  const dayName = (d) => fmt(d, { weekday: "long", day: "numeric", month: "long" });
  const timeOf = (d) => fmt(d, { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();
  const pad = (n) => String(n).padStart(2, "0");

  const ICON = {
    home: '<path d="M4 21V10.5L12 4l8 6.5V21"/><path d="M9.5 21v-5a2.5 2.5 0 0 1 5 0v5"/>',
    events: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    blessings: '<path d="M3.5 13.5h17a8.5 6.5 0 0 1-17 0z"/><path d="M12 3.2c2.1 2.4 2.5 4.3 0 6.8-2.5-2.5-2.1-4.4 0-6.8z"/>',
    pin: '<path d="M12 21.5s-6.5-6.1-6.5-11.2a6.5 6.5 0 0 1 13 0c0 5.1-6.5 11.2-6.5 11.2z"/><circle cx="12" cy="10.2" r="2.3"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4M12 12.5v5M9.5 15h5"/>',
    reply: '<path d="M4 5.5h16v10.5H10l-4.5 3.5V16H4z"/><path d="M8.5 11l2.3 2.2 4.7-4.6"/>',
    phone: '<path d="M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 4.5 5.5a2 2 0 0 1 2-2z"/>',
    list: '<path d="M8.5 6.5h11M8.5 12h11M8.5 17.5h11"/><path d="M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01"/>',
    play: '<circle cx="12" cy="12" r="8.5"/><path d="M10.2 8.6l5 3.4-5 3.4z"/>',
    next: '<path d="M9 5.5l6.5 6.5L9 18.5"/>',
    shuffle: '<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 20v-4h-4"/>',
  };

  function icon(name) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name] || ""}</svg>`;
  }

  let toastEl, toastTimer;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "wa-toast";
      toastEl.setAttribute("role", "status");
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.classList.remove("is-on"); }, 2800);
  }

  // ---------------------------------------------------------------- Audio Controller
  let audioInstance = null;
  function initAudio() {
    const audioBtn = document.querySelector("[data-audio]");
    if (!audioBtn) return;

    function ensureAudio() {
      if (!audioInstance) {
        audioInstance = new Audio("assets/music.mp3");
        audioInstance.loop = true;
        window._weddingAudio = audioInstance;
      }
      return audioInstance;
    }

    window.playWeddingMusic = function () {
      const a = ensureAudio();
      a.play().then(() => {
        audioBtn.setAttribute("aria-pressed", "true");
        audioBtn.classList.add("is-on", "vi-audio--on");
      }).catch(() => {});
    };

    audioBtn.addEventListener("click", () => {
      const a = ensureAudio();
      if (a.paused) {
        a.play().then(() => {
          audioBtn.setAttribute("aria-pressed", "true");
          audioBtn.classList.add("is-on", "vi-audio--on");
        }).catch(() => {});
      } else {
        a.pause();
        audioBtn.setAttribute("aria-pressed", "false");
        audioBtn.classList.remove("is-on", "vi-audio--on");
      }
    });
  }

  // ---------------------------------------------------------------- Events Data
  const events = (W.events || []).map((e) => {
    let t = e.start ? new Date(e.start) : null;
    if (t && isNaN(t)) t = null;
    return Object.assign({}, e, {
      t: t,
      end: t ? new Date(t.getTime() + (e.hours || 5) * 36e5) : null,
    });
  });
  const dated = events.filter((e) => e.t && e.end);

  function place(e) { return [e.venue, e.area].filter(Boolean).join(", "); }

  function calLink(e) {
    const z = (d) => d.toISOString().replace(/[-:]|\.\d{3}/g, "");
    return {
      href: "https://calendar.google.com/calendar/render?action=TEMPLATE" +
        "&text=" + encodeURIComponent(e.name + ": " + both) +
        "&dates=" + z(e.t) + "/" + z(e.end) +
        "&location=" + encodeURIComponent(place(e)) +
        "&details=" + encodeURIComponent("Wedding Ceremony of " + both + " at " + place(e)),
      attrs: ' target="_blank" rel="noopener"',
    };
  }

  function eventActions(e) {
    let out = "";
    if (e.map) {
      out += `<a class="wa-btn" href="${esc(e.map)}" target="_blank" rel="noopener">${icon("pin")}Directions</a>`;
    }
    if (e.t) {
      const c = calLink(e);
      out += `<a class="wa-btn wa-btn--quiet" href="${esc(c.href)}"${c.attrs}>${icon("cal")}Add to calendar</a>`;
    }
    return out ? `<div class="wa-actions">${out}</div>` : "";
  }

  // ---------------------------------------------------------------- Call Host Modal (2 numbers: 7060428904, 9045429680)
  let modalBackdrop = null;
  function showCallHostModal() {
    if (!modalBackdrop) {
      modalBackdrop = document.createElement("div");
      modalBackdrop.className = "wa-modal-backdrop";
      modalBackdrop.innerHTML = `
        <div class="wa-modal" role="dialog" aria-modal="true" aria-labelledby="wa-modal-title">
          <h2 class="wa-modal__title" id="wa-modal-title">Call Host</h2>
          <p class="wa-modal__sub">${esc(W.host?.name || "Vishal Singh")}</p>
          <div class="wa-modal__list">
            <a class="wa-modal__item" href="tel:+917060428904">
              <span>+91 70604 28904</span>
              ${icon("phone")}
            </a>
            <a class="wa-modal__item" href="tel:+919045429680">
              <span>+91 90454 29680</span>
              ${icon("phone")}
            </a>
          </div>
          <button class="wa-modal__close" type="button">Close</button>
        </div>
      `;
      modalBackdrop.addEventListener("click", (e) => {
        if (e.target === modalBackdrop || e.target.closest(".wa-modal__close")) {
          modalBackdrop.classList.remove("is-open");
        }
      });
      document.body.appendChild(modalBackdrop);
    }
    requestAnimationFrame(() => modalBackdrop.classList.add("is-open"));
  }

  // ---------------------------------------------------------------- Pages HTML Generators
  function homePage() {
    return (
      `<header class="wa-hero" style="background-image:url(assets/app/hero.webp)">` +
        `<div class="wa-hero__text">` +
          `<h1 class="wa-hero__names">${esc(W.couple.first)}<span>&amp;</span>${esc(W.couple.second)}</h1>` +
          `<p class="wa-hero__when">${esc(W.dates)}, ${esc(W.city)}</p>` +
        `</div>` +
      `</header>` +
      `<section class="wa-next" data-next aria-live="off" style="background-image:url(assets/app/dusk.webp)"></section>` +
      `<div class="wa-quick">` +
        `<a class="wa-quick__item" data-act="rsvp" href="https://wa.me/917060428904?text=${encodeURIComponent('Namaste! Attending wedding of ' + both + ' on 25 Nov 2026.')}" target="_blank" rel="noopener">${icon("reply")}RSVP</a>` +
        `<a class="wa-quick__item" href="#events">${icon("list")}All events</a>` +
        `<a class="wa-quick__item" data-act="call" href="#call">${icon("phone")}Call host</a>` +
      `</div>` +
      `<section class="wa-invite">` +
        `<div class="wa-rule"></div>` +
        `<p>${esc(W.invitation)}</p>` +
        `<div class="wa-rule"></div>` +
      `</section>` +
      `<nav class="wa-more" aria-label="More for guests">` +
        `<a class="wa-card wa-more__item" href="#blessings">${icon("blessings")}<div><b>Blessings Corner</b><span>Leave a note for ${esc(W.couple.first)} and ${esc(W.couple.second)}</span></div>${icon("next")}</a>` +
      `</nav>` +
      `<footer class="wa-foot">` +
        `<button class="wa-replay" type="button" data-act="replay">${icon("play")}Replay the invitation</button><br>` +
        `<a class="wa-credit" href="${esc(W.credit.url)}">${esc(W.credit.text)}</a>` +
      `</footer>`
    );
  }

  function eventCard(e) {
    const facts = e.t
      ? `<p class="wa-fact">${icon("clock")}<span><b>${esc(timeOf(e.t))}</b> onwards</span></p>` +
        (e.venue ? `<p class="wa-fact">${icon("pin")}<span><b>${esc(e.venue)}</b>${e.area ? ", " + esc(e.area) : ""}</span></p>` : "")
      : `<p class="wa-fact">${icon("clock")}<span>Date, time and venue To be added</span></p>`;

    return (
      `<li class="wa-card wa-event" id="event-${esc(e.id)}">` +
        (e.image ? `<img class="wa-event__art" src="${esc(e.image)}" alt="" loading="eager" decoding="async" width="900" height="517">` : "") +
        `<div class="wa-event__body">` +
          `<h3 class="wa-event__name">${esc(e.name)}</h3>` +
          `<div class="wa-event__facts">${facts}</div>` +
          eventActions(e) +
        `</div>` +
      `</li>`
    );
  }

  function eventsPage() {
    return (
      `<header class="wa-head"><h1 class="wa-script">The Celebrations</h1>` +
        `<p class="wa-kicker">${esc(W.dates)}, ${esc(W.city)}</p><div class="wa-rule"></div></header>` +
      `<section class="wa-day"><h2 class="wa-day__title">Wednesday, 25 November</h2><ul>${events.map(eventCard).join("")}</ul></section>`
    );
  }

  // ---------------------------------------------------------------- Blessings System (LocalStorage Powered)
  const MAX_WORDS = (W.blessings && W.blessings.maxWords) || 300;
  const BLESSINGS_KEY = "wa_blessings_pragya_yatharth";

  const INITIAL_BLESSINGS = [
    {
      name: "Uncle & Aunty (Rajiv & Sunita)",
      relation: "Family of Groom",
      prompt: "A blessing for eternal happiness and love",
      content: "Wishing both of you a lifetime of laughter, shared dreams, and abundant blessings as you embark on this beautiful sacred journey together! Sada sukhi raho.",
    },
    {
      name: "Aarav Sharma",
      relation: "Friend of Groom",
      prompt: "A special wish for the couple",
      content: "Can't wait to dance at the baraat! Wishing Yatharth and Pragya all the love and happiness in the world. May your marriage be filled with endless adventures and joy!",
    },
    {
      name: "Pooja & Rohan Gupta",
      relation: "Friend of Bride",
      prompt: "Advice for a lifetime of love and togetherness",
      content: "Heartiest congratulations Pragya & Yatharth! You two make the most wonderful pair. Always keep laughing together and supporting one another through every step of life.",
    },
    {
      name: "Dadi & Babaji",
      relation: "Family of Bride",
      prompt: "A blessing for eternal happiness and love",
      content: "Hamara dher saara aashirwaad Pragya aur Yatharth ke saath hai. Bhagwan Radha Krishna ki kripa sadaiv dono par bani rahe.",
    },
  ];

  function getLocalBlessings() {
    try {
      const stored = localStorage.getItem(BLESSINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return INITIAL_BLESSINGS;
  }

  function saveLocalBlessings(list) {
    try {
      localStorage.setItem(BLESSINGS_KEY, JSON.stringify(list));
    } catch (_) {}
  }

  function blessingsPage() {
    return (
      `<header class="wa-head"><h1 class="wa-script">Blessings Corner</h1>` +
        `<p class="wa-kicker">A note for ${esc(W.couple.first)} and ${esc(W.couple.second)}</p><div class="wa-rule"></div></header>` +
      `<p class="wa-lede">Write a few words for the couple. Every blessing is kept on the wall below.</p>` +
      `<form class="wa-card wa-panel" data-bless novalidate>` +
        `<label class="wa-field"><span>Your name</span><input name="name" type="text" autocomplete="name" maxlength="60" required placeholder="Enter your full name"></label>` +
        `<label class="wa-field"><span>How do you know them?</span>` +
          `<select name="relation" required>` +
            `<option value="">Choose one</option>` +
            `<option value="Family of Bride">Family of Bride</option>` +
            `<option value="Family of Groom">Family of Groom</option>` +
            `<option value="Friend of Bride">Friend of Bride</option>` +
            `<option value="Friend of Groom">Friend of Groom</option>` +
            `<option value="Colleague">Colleague</option>` +
            `<option value="Well-wisher">Well-wisher</option>` +
          `</select></label>` +
        `<div class="wa-prompts" data-prompts>` +
          `<div class="wa-prompts__head">` +
            `<p class="wa-prompts__label" id="wa-prompts-label">Kya likhein? Ek sawaal chuniye.</p>` +
            `<button class="wa-prompts__more" type="button" data-prompt-more aria-label="Show different prompts">${icon("shuffle")}Aur sawaal</button>` +
          `</div>` +
          `<div class="wa-prompts__list" data-prompt-list role="group" aria-labelledby="wa-prompts-label"></div>` +
          `<p class="wa-prompts__note">Ya apne mann se likhiye.</p>` +
        `</div>` +
        `<label class="wa-field wa-field--note"><span>Your blessing</span>` +
          `<em class="wa-chosen" data-chosen hidden></em>` +
          `<textarea name="note" required placeholder="Write your warm wishes and blessings here..."></textarea>` +
          `<p class="wa-field__count" data-count-wrap><span data-count>0</span> of ${MAX_WORDS} words</p></label>` +
        `<button class="wa-btn wa-btn--wide" type="submit" data-bless-send>${icon("blessings")}Add my blessing</button>` +
      `</form>` +
      `<section class="wa-wall" aria-labelledby="wa-wall-title">` +
        `<header class="wa-head wa-head--sub"><h2 class="wa-script" id="wa-wall-title">The Blessings Wall</h2>` +
          `<p class="wa-kicker">Tap a blessing to see who wrote it</p></header>` +
        `<ul class="wa-wall__list" data-wall aria-live="polite"></ul>` +
      `</section>`
    );
  }

  function initBlessings(pageEl) {
    const form = pageEl.querySelector("[data-bless]");
    if (!form) return;
    const wall = pageEl.querySelector("[data-wall]");
    const promptList = form.querySelector("[data-prompt-list]");
    const moreBtn = form.querySelector("[data-prompt-more]");
    const chosenEl = form.querySelector("[data-chosen]");
    const count = form.querySelector("[data-count]");
    const countWrap = form.querySelector("[data-count-wrap]");

    let chosenPrompt = "";
    const PROMPTS = [
      "A heartfelt wish for their new beginning",
      "Advice for a lifetime of love and togetherness",
      "Your favorite memory with Pragya or Yatharth",
      "A blessing for peace, health, and prosperity",
      "What makes this couple so special together?",
      "A message for their golden future",
    ];
    let promptIndex = 0;

    function renderPrompts() {
      const items = [
        PROMPTS[promptIndex % PROMPTS.length],
        PROMPTS[(promptIndex + 1) % PROMPTS.length],
        PROMPTS[(promptIndex + 2) % PROMPTS.length],
      ];
      promptList.innerHTML = items.map((p) => {
        return `<button class="wa-chip" type="button" aria-pressed="${p === chosenPrompt}" data-prompt="${esc(p)}">${esc(p)}</button>`;
      }).join("");
    }

    renderPrompts();

    moreBtn.addEventListener("click", () => {
      promptIndex += 3;
      renderPrompts();
    });

    promptList.addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-prompt]");
      if (!b) return;
      const p = b.getAttribute("data-prompt");
      chosenPrompt = p === chosenPrompt ? "" : p;
      chosenEl.textContent = chosenPrompt;
      chosenEl.hidden = !chosenPrompt;
      promptList.querySelectorAll("[data-prompt]").forEach((el) => {
        el.setAttribute("aria-pressed", String(el.getAttribute("data-prompt") === chosenPrompt));
      });
      if (chosenPrompt) form.note.focus();
    });

    function words(s) {
      const t = s.trim();
      return t ? t.split(/\s+/).length : 0;
    }

    form.note.addEventListener("input", () => {
      const n = words(form.note.value);
      count.textContent = n;
      countWrap.classList.toggle("is-over", n > MAX_WORDS);
    });

    function card(b) {
      const who = b.name ? esc(b.name) : "A well-wisher";
      const rel = b.relation ? esc(b.relation) : "";
      return (
        `<li><button class="wa-bc" type="button" aria-pressed="false" data-flip>` +
          `<span class="wa-bc__inner">` +
            `<span class="wa-bc__face wa-bc__front">` +
              (b.prompt ? `<span class="wa-bc__prompt">${esc(b.prompt)}</span>` : "") +
              `<span class="wa-bc__text">${esc(b.content)}</span>` +
              `<span class="wa-bc__hint">Tap to see who wrote this</span>` +
            `</span>` +
            `<span class="wa-bc__face wa-bc__back" aria-hidden="true">` +
              `<span class="wa-bc__from">With love from</span>` +
              `<span class="wa-bc__name">${who}</span>` +
              (rel ? `<span class="wa-bc__rel">${rel}</span>` : "") +
            `</span>` +
          `</span>` +
        `</button></li>`
      );
    }

    // Load initial or stored blessings
    let currentBlessings = getLocalBlessings();
    wall.innerHTML = currentBlessings.map(card).join("");

    // Submit handler
    form.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const name = form.name.value.trim();
      const relation = form.relation.value;
      const note = form.note.value.trim();

      if (!name) { toast("Please add your name."); form.name.focus(); return; }
      if (!relation) { toast("Please choose how you know the couple."); form.relation.focus(); return; }
      if (!note) { toast("Write your blessing first."); form.note.focus(); return; }
      if (words(note) > MAX_WORDS) { toast(`Please keep it under ${MAX_WORDS} words.`); form.note.focus(); return; }

      const newBlessing = {
        name: name,
        relation: relation,
        content: note,
        prompt: chosenPrompt || undefined,
      };

      currentBlessings.unshift(newBlessing);
      saveLocalBlessings(currentBlessings);

      wall.insertAdjacentHTML("afterbegin", card(newBlessing));
      const first = wall.firstElementChild;
      if (first) {
        first.classList.add("is-new");
        first.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      form.note.value = "";
      form.name.value = "";
      form.relation.value = "";
      count.textContent = "0";
      countWrap.classList.remove("is-over");
      chosenPrompt = "";
      chosenEl.textContent = "";
      chosenEl.hidden = true;
      renderPrompts();

      toast("Thank you. Your blessing is on the wall.");
    });

    // Flip card handler
    wall.addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-flip]");
      if (!b) return;
      const on = b.getAttribute("aria-pressed") !== "true";
      b.setAttribute("aria-pressed", String(on));
      b.querySelector(".wa-bc__front").setAttribute("aria-hidden", String(on));
      b.querySelector(".wa-bc__back").setAttribute("aria-hidden", String(!on));
    });
  }

  // ---------------------------------------------------------------- Next Celebration Countdown
  let nextBox, cdTimer = 0, shownKey = "";
  function pickNext(now) {
    for (let i = 0; i < dated.length; i++) {
      if (now < dated[i].end) return dated[i];
    }
    return null;
  }

  function renderNext() {
    if (!nextBox) return;
    const now = Date.now();
    const e = pickNext(now);
    const live = e && now >= e.t.getTime();
    const key = e ? e.id + (live ? ":live" : ":soon") : "done";

    if (key !== shownKey) {
      shownKey = key;
      if (!e) {
        nextBox.innerHTML =
          `<p class="wa-next__label">With love and gratitude</p>` +
          `<h2 class="wa-next__name">Thank you</h2>` +
          `<p class="wa-next__meta">for celebrating with ${esc(W.couple.first)} and ${esc(W.couple.second)}.</p>`;
      } else {
        nextBox.innerHTML =
          `<p class="wa-next__label">${live ? "Happening now" : "Next celebration"}</p>` +
          `<h2 class="wa-next__name">${esc(e.name)}</h2>` +
          `<p class="wa-next__meta"><b>${esc(dayName(e.t))}</b>, ${esc(timeOf(e.t))} onwards<br>${esc(place(e))}</p>` +
          (live
            ? `<p class="wa-next__now">The celebration has begun. We are waiting for you.</p>`
            : `<div class="wa-cd" role="timer">` +
                ["d", "h", "m", "s"].map((u) => {
                  return `<span class="wa-cd__tile"><span class="wa-cd__num" data-u="${u}">00</span><span class="wa-cd__lbl">${{ d: "Days", h: "Hours", m: "Min", s: "Sec" }[u]}</span></span>`;
                }).join("") +
              `</div>`) +
          eventActions(e);
      }
    }

    if (e && !live) {
      const s = Math.max(0, Math.floor((e.t.getTime() - now) / 1000));
      const v = {
        d: Math.floor(s / 86400),
        h: Math.floor((s % 86400) / 3600),
        m: Math.floor((s % 3600) / 60),
        s: s % 60,
      };
      nextBox.querySelectorAll("[data-u]").forEach((el) => {
        const val = pad(v[el.getAttribute("data-u")]);
        if (el.textContent !== val) el.textContent = val;
      });
    }
  }

  function tick() {
    clearTimeout(cdTimer);
    if (document.hidden || !html.classList.contains("wa-on")) return;
    renderNext();
    cdTimer = setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
  }
  document.addEventListener("visibilitychange", tick);

  // ---------------------------------------------------------------- Build & Routing
  let built = false, pages = {}, tabsEl, rootEl;
  function build() {
    if (built) return;
    built = true;

    rootEl = document.getElementById("wa-app");
    if (!rootEl) return;
    rootEl.setAttribute("data-theme", W.theme || "radha-krishna");
    rootEl.setAttribute("data-style", W.style || "traditional");

    const make = { home: homePage, events: eventsPage, blessings: blessingsPage };
    TABS.forEach((t) => {
      const s = document.createElement("main");
      s.className = "wa-page";
      s.id = `page-${t}`;
      s.tabIndex = -1;
      s.innerHTML = make[t]();
      pages[t] = s;
      rootEl.appendChild(s);
    });
    nextBox = rootEl.querySelector("[data-next]");

    // Tab Bar (ONLY 3 TABS)
    tabsEl = document.createElement("nav");
    tabsEl.className = "wa-tabs";
    tabsEl.setAttribute("aria-label", "Wedding pages");
    const LABEL = { home: "Home", events: "Events", blessings: "Blessings" };
    tabsEl.innerHTML = TABS.map((t) => {
      return `<a href="#${t}" data-tab="${t}">${icon(t)}<span>${LABEL[t]}</span></a>`;
    }).join("");
    document.body.appendChild(tabsEl);

    rootEl.addEventListener("click", onAppClick);
    initBlessings(pages.blessings);
  }

  function onAppClick(ev) {
    const el = ev.target.closest("[data-act]");
    if (!el) return;
    const act = el.getAttribute("data-act");
    if (act === "replay") {
      location.hash = "";
      location.reload();
    } else if (act === "call") {
      ev.preventDefault();
      showCallHostModal();
    }
  }

  let currentTab = "";
  function route(first) {
    const h = location.hash.replace(/^#/, "");
    const tab = TABS.indexOf(h) !== -1 ? h : (/^event-/.test(h) ? "events" : "home");
    if (tab !== currentTab) {
      currentTab = tab;
      TABS.forEach((t) => { pages[t].classList.toggle("is-on", t === tab); });
      tabsEl.querySelectorAll("a").forEach((a) => {
        if (a.getAttribute("data-tab") === tab) {
          a.setAttribute("aria-current", "page");
        } else {
          a.removeAttribute("aria-current");
        }
      });
      window.scrollTo(0, 0);
      if (!first && pages[tab]) pages[tab].focus({ preventScroll: true });
    }
    const anchor = /^event-/.test(h) && document.getElementById(h);
    if (anchor) anchor.scrollIntoView();
  }

  window.addEventListener("hashchange", () => {
    if (html.classList.contains("wa-on")) route(false);
  });

  function enterApp() {
    build();
    html.classList.remove("is-locked", "gate-armed");
    html.classList.add("wa-on");
    route(true);
    tick();
  }

  // ---------------------------------------------------------------- Gate + Name Flash Sequence
  function initGateSequence() {
    const gate = document.querySelector(".gate[data-intro]");
    const flash = document.getElementById("name-flash");
    if (!gate) {
      enterApp();
      return;
    }

    const openBtn = gate.querySelector("[data-intro-open]");
    let opened = false;

    // Preload gate assets readiness
    const need = [...gate.querySelectorAll("img[data-gate-need]")];
    let readyCount = 0;
    need.forEach((img) => {
      if (img.complete) readyCount++;
      else {
        img.addEventListener("load", () => {
          readyCount++;
          if (readyCount >= need.length) gate.classList.add("is-ready");
        });
        img.addEventListener("error", () => {
          readyCount++;
          if (readyCount >= need.length) gate.classList.add("is-ready");
        });
      }
    });
    if (readyCount >= need.length) gate.classList.add("is-ready");
    setTimeout(() => gate.classList.add("is-ready"), 1500);

    function startSequence() {
      if (opened) return;
      opened = true;

      // 1. Play music immediately
      if (typeof window.playWeddingMusic === "function") {
        window.playWeddingMusic();
      }

      gate.classList.add("is-opening");

      // Animate gate leaves open
      const leafL = gate.querySelector(".gate__leaf--l");
      const leafR = gate.querySelector(".gate__leaf--r");
      const seam = gate.querySelector(".gate__seam");
      const glow = gate.querySelector(".gate__sanctum-glow");
      const cam = gate.querySelector(".gate__cam");
      const bell = gate.querySelector(".gate__bell");

      if (seam) {
        seam.animate([
          { opacity: 1, transform: "scaleX(1)" },
          { opacity: 1, transform: "scaleX(2.8)", offset: 0.35 },
          { opacity: 0, transform: "scaleX(4)" },
        ], { duration: 900, easing: "cubic-bezier(0.22, 0.61, 0.36, 1)", fill: "both" });
      }

      if (bell) {
        bell.animate([0, 12, -9, 6, -4, 2, 0].map((d) => ({ transform: `rotate(${d}deg)` })), {
          duration: 2200,
          easing: "ease-in-out",
        });
      }

      if (leafL) {
        leafL.animate([
          { offset: 0, transform: "rotateY(0deg)" },
          { offset: 0.1, transform: "rotateY(1deg)" },
          { offset: 0.8, transform: "rotateY(82deg)" },
          { offset: 1, transform: "rotateY(77deg)" },
        ], { duration: 1800, fill: "both", easing: "cubic-bezier(0.4, 0, 0.2, 1)" });
      }

      if (leafR) {
        leafR.animate([
          { offset: 0, transform: "rotateY(0deg)" },
          { offset: 0.1, transform: "rotateY(-1deg)" },
          { offset: 0.8, transform: "rotateY(-82deg)" },
          { offset: 1, transform: "rotateY(-77deg)" },
        ], { duration: 1800, delay: 60, fill: "both", easing: "cubic-bezier(0.4, 0, 0.2, 1)" });
      }

      if (glow) {
        glow.animate([
          { opacity: 0, transform: "scale(0.6)" },
          { opacity: 0.8, transform: "scale(1.2)", offset: 0.6 },
          { opacity: 0.6, transform: "scale(1)" },
        ], { duration: 1500, delay: 250, fill: "both" });
      }

      if (cam) {
        cam.animate([
          { transform: "scale(1)" },
          { transform: "scale(2.8)" },
        ], { duration: 2200, delay: 1000, fill: "both", easing: "cubic-bezier(0.45, 0, 0.7, 0.4)" });
      }

      // 2. NAME FLASH sequence at t = 1600ms (doors fully open)
      setTimeout(() => {
        if (flash) {
          flash.classList.add("is-active");
        }
      }, 1600);

      // 3. FADE OUT Gate
      setTimeout(() => {
        gate.classList.add("is-leaving");
      }, 2300);

      setTimeout(() => {
        gate.remove();
      }, 3400);

      // 4. TRANSITION from Name Flash to Website after 5.4 seconds of Name Flash (at t = 7000ms)
      setTimeout(() => {
        if (flash) {
          flash.classList.add("is-leaving");
        }
        enterApp();
      }, 7000);

      // 5. Cleanup Name Flash
      setTimeout(() => {
        if (flash) flash.remove();
      }, 8000);
    }

    if (openBtn) openBtn.addEventListener("click", startSequence);
    gate.addEventListener("click", startSequence);
  }

  // ---------------------------------------------------------------- Bootstrap
  document.addEventListener("DOMContentLoaded", () => {
    initAudio();
    initGateSequence();
  });
})();
