// audio.js -- background-music toggle (ported from suryanshu-rajvi js/audio.js).
// Autoplay needs a user gesture, so the <audio> is created lazily inside the SAME
// tap that opens the invite ([data-intro], the temple gate): zero network cost for a
// guest who never opens the invite. Listens to the gate's pointerup / click / keydown
// and never touches intro.js's own flow. A tap that lands before this file has loaded
// (slow network) is caught by the inline <head> script (tools/build.py GATE_BOOT),
// which starts the same track in that gesture; it is adopted here (VI.audioEl).
// The floating [data-audio] button flips one on/off state; off -> on also creates
// the audio if the intro tap never fired. A hidden tab pauses and shows "off";
// returning does NOT auto-resume (deliberate: no surprise audio on refocus).
// pagehide pauses as a safety net for iOS Safari's bfcache.
(function () {
  "use strict";
  window.VI = window.VI || {};

  var button = document.querySelector("[data-audio]");
  if (!button) return;

  var intro = document.querySelector("[data-intro]");
  var src = button.getAttribute("data-audio-src");

  var audioEl = null;
  var on = false;
  var introActivated = false;
  window.VI.audioBound = true;

  function syncButton() {
    button.setAttribute("aria-pressed", String(on));
    button.setAttribute("aria-label", on ? "Mute music" : "Play music");
    button.classList.toggle("is-on", on);
  }

  function ensureAudio() {
    if (!audioEl) {
      audioEl = new Audio(src);
      audioEl.loop = true;
      window.VI.audioEl = audioEl; // QA hook
    }
    return audioEl;
  }

  // Never throws: a rejected play() just leaves the button "off".
  function playAudio() {
    ensureAudio();
    var p;
    try {
      p = audioEl.play();
    } catch (e) {
      p = null;
    }
    if (p && typeof p.catch === "function") {
      p.then(function () {
        // play() can settle after the tab was hidden: honour the auto-mute.
        if (document.hidden) {
          audioEl.pause();
          on = false;
          syncButton();
          return;
        }
        on = true;
        syncButton();
      }).catch(function () {
        on = false;
        syncButton();
      });
    } else {
      on = true;
      syncButton();
    }
  }

  function onIntroActivate() {
    if (introActivated) return;
    introActivated = true;
    playAudio();
  }

  // Adopt the track the <head> script started in an early gate tap.
  if (window.VI.audioEl) {
    audioEl = window.VI.audioEl;
    introActivated = true;
    var early = window.VI.audioPlay;
    if (early && typeof early.then === "function") {
      early.then(function () { on = !audioEl.paused; syncButton(); }, function () { on = false; syncButton(); });
    } else {
      on = !audioEl.paused;
    }
    syncButton();
  }

  if (intro) {
    intro.addEventListener("pointerup", function (e) {
      if (e.button != null && e.button !== 0) return;
      onIntroActivate();
    });
    intro.addEventListener("click", onIntroActivate);
    intro.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar" || e.code === "Space") {
        onIntroActivate();
      }
    });
  }

  button.addEventListener("click", function () {
    if (on) {
      if (audioEl) audioEl.pause();
      on = false;
      syncButton();
    } else {
      playAudio();
    }
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden && on) {
      if (audioEl) audioEl.pause();
      on = false;
      syncButton();
    }
  });

  window.addEventListener("pagehide", function () {
    if (audioEl) {
      try {
        audioEl.pause();
      } catch (e) {}
    }
  });
})();
