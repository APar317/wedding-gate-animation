// interactive-features.js -- $10k Luxury Level interactive enhancements for Vansh & Ishika invite

document.addEventListener("DOMContentLoaded", () => {
  initDock();
  initDiyaPond();
  initWishes();
  initCalendar();
  initFireworks();
});

// -------------------------------------------------- Luxury Temple Chime Synth
function playTempleChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") ctx.resume();

    // Fundamental Bell Sine
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(1046.5, ctx.currentTime); // C6
    gain1.gain.setValueAtTime(0.18, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.5);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    osc1.stop(ctx.currentTime + 1.5);

    // Harmonic Overtone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1567.98, ctx.currentTime); // G6
    gain2.gain.setValueAtTime(0.1, ctx.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.0);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start();
    osc2.stop(ctx.currentTime + 1.0);
  } catch (e) {}
}

// -------------------------------------------------- 1. Royal Floating Quick Dock
function initDock() {
  const dock = document.getElementById("royalDock");
  if (!dock) return;

  const checkGate = setInterval(() => {
    if (!document.documentElement.classList.contains("is-locked") || !document.querySelector("[data-intro]")) {
      dock.classList.add("is-visible");
      clearInterval(checkGate);
    }
  }, 400);

  const btnBless = document.getElementById("dockBless");
  const btnVenues = document.getElementById("dockVenues");
  const btnCal = document.getElementById("dockCalendar");
  const btnShower = document.getElementById("dockShower");

  if (btnBless) {
    btnBless.addEventListener("click", () => {
      document.getElementById("aashirvaad")?.scrollIntoView({ behavior: "smooth" });
    });
  }

  if (btnVenues) {
    btnVenues.addEventListener("click", () => {
      document.querySelector(".scene--location")?.scrollIntoView({ behavior: "smooth" });
    });
  }

  if (btnCal) {
    btnCal.addEventListener("click", () => {
      document.getElementById("calendarSync")?.scrollIntoView({ behavior: "smooth" });
    });
  }

  if (btnShower) {
    btnShower.addEventListener("click", () => {
      playTempleChime();
      triggerPetalShower(18);
    });
  }
}

// -------------------------------------------------- 2. Interactive Diya Sanctuary
function initDiyaPond() {
  const pond = document.getElementById("diyaPond");
  const countBadge = document.getElementById("diyaCount");
  const btnCta = document.getElementById("btnLightDiya");
  if (!pond || !countBadge) return;

  let count = parseInt(localStorage.getItem("vi_diya_count") || "618", 10);
  countBadge.textContent = count.toLocaleString();

  function spawnDiya(x, y, playSound = true) {
    const diya = document.createElement("div");
    diya.className = "floating-diya";
    diya.style.left = `${x}px`;
    diya.style.top = `${y}px`;

    diya.innerHTML = `
      <div class="floating-diya__ripple"></div>
      <div class="floating-diya__flame"></div>
      <div class="floating-diya__bowl"></div>
    `;

    pond.appendChild(diya);

    count++;
    localStorage.setItem("vi_diya_count", count.toString());
    countBadge.textContent = count.toLocaleString();

    if (playSound) {
      playTempleChime();
      triggerPetalShower(6);
    }
  }

  // Pre-seed gentle floating diyas
  setTimeout(() => {
    const rect = pond.getBoundingClientRect();
    const w = rect.width || 340;
    spawnDiya(w * 0.25, 140, false);
    spawnDiya(w * 0.52, 110, false);
    spawnDiya(w * 0.78, 150, false);
  }, 300);

  // Direct CTA Button
  if (btnCta) {
    btnCta.addEventListener("click", (e) => {
      e.preventDefault();
      const rect = pond.getBoundingClientRect();
      const rx = 40 + Math.random() * (rect.width - 80);
      const ry = 70 + Math.random() * (rect.height - 110);
      spawnDiya(rx, ry, true);
    });
  }

  // Tap anywhere on water
  const handlePondTap = (e) => {
    const rect = pond.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : null);
    const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : null);
    if (clientX === null || clientY === null) return;

    const x = Math.max(25, Math.min(rect.width - 25, clientX - rect.left));
    const y = Math.max(50, Math.min(rect.height - 35, clientY - rect.top));
    spawnDiya(x, y, true);
  };

  pond.addEventListener("click", handlePondTap);
  pond.addEventListener("touchstart", (e) => {
    handlePondTap(e);
  }, { passive: true });
}

// -------------------------------------------------- 3. Sacred Wishes Wall
function initWishes() {
  const wall = document.getElementById("wishesWall");
  const form = document.getElementById("wishForm");
  const input = document.getElementById("wishInput");
  const tags = document.querySelectorAll(".blessing-tag");

  const defaultWishes = [
    { text: "May your sacred union be blessed with love that grows deeper with every sunrise.", author: "Loved Ones" },
    { text: "Wishing Vansh & Ishika an eternity of laughter, health, and royal togetherness!", author: "Khandelwal Elders" },
    { text: "Sada Sukhi Raho! Can't wait to dance at the Sangeet & Haldi celebrations in Agra!", author: "Friends & Family" }
  ];

  let savedWishes = [];
  try {
    savedWishes = JSON.parse(localStorage.getItem("vi_guest_wishes") || "[]");
  } catch (e) {}

  const allWishes = [...defaultWishes, ...savedWishes];

  function renderWishes() {
    if (!wall) return;
    wall.innerHTML = "";
    allWishes.slice(-6).reverse().forEach(w => {
      const card = document.createElement("div");
      card.className = "wish-card";
      card.innerHTML = `
        <div class="wish-card__text">“${w.text}”</div>
        <div class="wish-card__author">— ${w.author || 'Well-wisher'}</div>
      `;
      wall.appendChild(card);
    });
  }

  renderWishes();

  function postWish(text, author = "Guest") {
    if (!text.trim()) return;
    const newWish = { text: text.trim(), author };
    allWishes.push(newWish);
    savedWishes.push(newWish);
    try {
      localStorage.setItem("vi_guest_wishes", JSON.stringify(savedWishes));
    } catch (e) {}
    renderWishes();
    playTempleChime();
    triggerPetalShower(14);
  }

  if (form && input) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (input.value.trim()) {
        postWish(input.value, "A Well-wisher");
        input.value = "";
      }
    });
  }

  tags.forEach(tag => {
    tag.addEventListener("click", () => {
      postWish(tag.textContent, "Blessing Guest");
    });
  });
}

// -------------------------------------------------- 4. 1-Click Calendar Sync
function initCalendar() {
  const btnGoogle = document.getElementById("btnCalGoogle");
  const btnIcal = document.getElementById("btnCalIcal");

  const title = encodeURIComponent("Vansh & Ishika Wedding Celebrations");
  const desc = encodeURIComponent("Join us to celebrate the royal wedding ceremonies of Vansh & Ishika in Agra.\n\nEvents:\n- Mehendi & Tilak: 20th November (DoubleTree by Hilton)\n- Haldi Carnival & Wedding Ceremony: 21st November (Raj Devam)");
  const loc = encodeURIComponent("Agra, Uttar Pradesh, India");
  const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=20261120T043000Z/20261121T183000Z&details=${desc}&location=${loc}`;

  if (btnGoogle) {
    btnGoogle.href = googleUrl;
  }

  if (btnIcal) {
    btnIcal.addEventListener("click", (e) => {
      e.preventDefault();
      const icsData = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Vansh & Ishika Wedding//EN",
        "CALSCALE:GREGORIAN",
        "BEGIN:VEVENT",
        "SUMMARY:Vansh & Ishika Wedding Celebrations",
        "DESCRIPTION:Celebrating the auspicious wedding of Vansh & Ishika in Agra.",
        "LOCATION:Agra, Uttar Pradesh, India",
        "DTSTART:20261120T100000",
        "DTEND:20261121T235900",
        "STATUS:CONFIRMED",
        "END:VEVENT",
        "END:VCALENDAR"
      ].join("\r\n");

      const blob = new Blob([icsData], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "vansh-ishika-wedding.ics";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }
}

// -------------------------------------------------- 5. Floating Petal Burst Effect
function triggerPetalShower(count = 12) {
  const box = document.createElement("div");
  box.style.position = "fixed";
  box.style.inset = "0";
  box.style.pointerEvents = "none";
  box.style.zIndex = "9999";
  document.body.appendChild(box);

  const colors = ["#ff5e7e", "#ffa23a", "#dfb260", "#c22b48"];

  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    const size = 12 + Math.random() * 16;
    const startX = window.innerWidth * (0.15 + Math.random() * 0.7);
    const endX = startX + (Math.random() - 0.5) * 200;
    const fallDist = 320 + Math.random() * 380;
    const rot = Math.random() * 360;

    p.style.position = "absolute";
    p.style.left = `${startX}px`;
    p.style.top = `${window.innerHeight * 0.35}px`;
    p.style.width = `${size}px`;
    p.style.height = `${size * 1.3}px`;
    p.style.borderRadius = "50% 0 50% 50%";
    p.style.background = colors[i % colors.length];
    p.style.opacity = "0";
    box.appendChild(p);

    p.animate([
      { transform: `translate(0, 0) rotate(0deg) scale(0.3)`, opacity: 0 },
      { transform: `translate(${(endX - startX) * 0.4}px, -60px) rotate(${rot * 0.5}deg) scale(1)`, opacity: 1, offset: 0.2 },
      { transform: `translate(${endX - startX}px, ${fallDist}px) rotate(${rot}deg) scale(0.8)`, opacity: 0, offset: 1 }
    ], {
      duration: 1800 + Math.random() * 800,
      easing: "cubic-bezier(0.2, 0.6, 0.35, 1)",
      fill: "forwards"
    });
  }

  setTimeout(() => box.remove(), 2800);
}

// -------------------------------------------------- 6. Grand Fireworks Finale
function initFireworks() {
  const canvas = document.getElementById("fireworksCanvas");
  const btn = document.getElementById("celebrateBtn");
  if (!canvas || !btn) return;

  const ctx = canvas.getContext("2d");
  let particles = [];
  let animId = null;

  function resize() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }
  window.addEventListener("resize", resize);
  resize();

  class Particle {
    constructor(x, y, color) {
      this.x = x;
      this.y = y;
      this.color = color;
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.alpha = 1;
      this.decay = Math.random() * 0.02 + 0.012;
      this.size = Math.random() * 3 + 1.5;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.vy += 0.08;
      this.alpha -= this.decay;
    }
    draw(ctx) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, this.alpha);
      ctx.fillStyle = this.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function launchRocket(x, y) {
    const palette = ["#ffe082", "#dfb260", "#ff5252", "#ffb300", "#ff79b0", "#ffffff"];
    for (let i = 0; i < 45; i++) {
      particles.push(new Particle(x, y, palette[i % palette.length]));
    }
  }

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.update();
      p.draw(ctx);
      if (p.alpha <= 0) particles.splice(i, 1);
    }
    if (particles.length > 0) {
      animId = requestAnimationFrame(loop);
    } else {
      animId = null;
    }
  }

  btn.addEventListener("click", () => {
    playTempleChime();
    resize();
    const w = canvas.width, h = canvas.height;
    launchRocket(w * 0.3, h * 0.35);
    setTimeout(() => launchRocket(w * 0.7, h * 0.28), 200);
    setTimeout(() => launchRocket(w * 0.5, h * 0.2), 450);
    setTimeout(() => launchRocket(w * 0.25, h * 0.25), 700);
    setTimeout(() => launchRocket(w * 0.75, h * 0.3), 900);

    triggerPetalShower(24);

    if (!animId) {
      animId = requestAnimationFrame(loop);
    }
  });
}
