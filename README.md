# Royal Wedding Gate Invitation & Animation

A complete reproduction of the **Temple Gate Opening Ritual** and layered interactive wedding invitation seen on [vansh-ishika.pages.dev](https://vansh-ishika.pages.dev/).

---

## 🚀 Quick Start

Because modern browsers require an HTTP server to load ES Modules (`<script type="module">`), run this locally using any static web server:

### Option 1: Double-Click
Simply double-click **`start.bat`** in this folder. It will start a local server and automatically open `http://localhost:3000` in your default browser.

### Option 2: Command Line (Python)
```bash
python -m http.server 3000
```
Then navigate to: `http://localhost:3000`

### Option 3: Node / npx
```bash
npx serve .
```

---

## 🎬 Animation Choreography Breakdown

| Timing | Event | Mechanism |
|---|---|---|
| **0 ms** | Tap / Click gesture | Audio unblocks and plays immediately; tap pill fades. |
| **0 - 2600 ms** | Bell swings | Damped harmonic pendulum oscillation (`16° -> -12° -> 8° -> -5° -> 0°`). |
| **0 - 260 ms** | Latch unlatches | Rapid rattle vibration on both door leaves. |
| **260 - 1800 ms** | 3D Door Swing | Inward `rotateY` with 3D perspective and subtle overshoot (`83° -> 77°`). Left leaf leads, right trails by 30ms. |
| **250 - 1500 ms** | Sanctum Bloom | Warm golden radiance blooms from behind the parting doors. |
| **520 - 3000 ms** | Petal Shower | 3D marigold and rose petals burst forward toward the camera, scaling up and drifting down. |
| **1100 - 3250 ms**| Camera Push | Entire camera viewport smoothly zooms `scale(2.9)` through the open portal. |
| **1800 - 2400 ms**| Golden Bloom | Warm golden flash envelops the screen. |
| **2350 ms** | Slide Dissolve | Gate fades out (`opacity: 0` over 900ms) and unlocks scroll onto the invitation slides. |

---

## 📁 Project Structure

- **`index.html`**: Complete wedding invitation markup and gate overlay.
- **`start.bat`**: One-click local launch script.
- **`css/`**:
  - `intro.css`: 3D door layout, bell styling, ambient lighting, seam pulses, and golden bloom.
  - `stage.css` & `base.css`: Stage containers, responsive viewport scaling, and aspect ratios.
  - `motion/`: Reveal, ambient, hint, and card transition stylesheets.
  - `scenes/`: Styling for Haldi, Mehendi, Tilak, Wedding, and Location scenes.
- **`js/`**:
  - `intro.js`: Core WAAPI orchestration for the gate opening, bell swing, and camera push.
  - `motion/kit.js`: Motion engine lifecycle and transition coordination.
  - `motion/petals.js`: 3D particle physics for flying and falling flower petals.
  - `audio.js`: Audio playback manager.
- **`assets/`**:
  - `gate/`: High-resolution doors (`door-left.webp`, `door-right.webp`), base, bell, toran, marigolds.
  - `music.mp3`: Background wedding instrumental.
  - `fonts/`: Cormorant Garamond, Hello Bride, and Maginia web fonts.
  - `layers/`: Illustrated parallax layers for each wedding event.

---

## 🎨 How to Customize

1. **Names & Details**: Open `index.html` and search for "Vansh" or "Ishika" to update couple names, dates, and venue information.
2. **Music**: Replace `assets/music.mp3` with your own audio track.
3. **Doors & Gate**: Replace graphics in `assets/gate/` to customize the temple doors, arch, or bell.
