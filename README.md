# 🚀 3D Tunnel Rush PWA (Stereoscopic 3D Game)

[![Version](https://img.shields.io/badge/version-v4.20.0-00f0ff.svg)](./manifest.json)
[![PWA Ready](https://img.shields.io/badge/PWA-100%25%20Offline-ec4899.svg)](./sw.js)
[![WebGL](https://img.shields.io/badge/Three.js-WebGL%203D-a855f7.svg)](./js/renderer.js)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

🌐 **Live Playable Demo**: [srathinagiri.github.io/3DTunnelRush](https://srathinagiri.github.io/3DTunnelRush/)

An immersive, high-speed 3D stereoscopic tunnel rush Progressive Web App (PWA) built with **Three.js**, **WebGL**, and the **Web Audio API**. Relax your eyes, pop on 3D glasses or a VR headset, and maneuver your spacecraft through dynamic 3D roller-coaster tunnels, dodging spiked red space mines and collecting glowing emerald crystals!

---

## 🌟 Key Features

### 👓 1. Four 3D Viewing Modes
- **2D View**: Standard single-camera 3D viewport.
- **Parallel 3D (Side-by-Side)**: Designed for VR headsets, 3D viewers, or parallel eye relaxation.
- **Cross-Eye 3D (Side-by-Side)**: Designed for cross-eye 3D viewing—no hardware or glasses required!
- **Anaglyph 3D**: True 2-pass Red-Cyan 3D compositing—wear standard Red/Blue 3D glasses!
- **Real-time 3D Controls**: Adjust Eye Separation (IPD slider), Focal Convergence Plane, and Swap Left/Right Eyes on the fly.

### 🎥 2. Dual Camera Flight Modes
- **3rd-Person Chase View**: Flight ship moves dynamically inside the tunnel with a large 3D telemetry dashboard attached directly below the wings.
- **1st-Person Pilot Cockpit View**: Fly from inside the pilot cockpit window with a 50% semi-transparent tactical reticle crosshair and speedometer anchored deep at flight path depth ($Z = -10.0$).

### 🌌 3. Six Dynamic Sci-Fi Tunnel Themes & Hyper-Warp Transitions
- **Level 1 (0m - 999m)**: *Cyberpunk Neon* (Cyan & Pink grid)
- **Level 2 (1000m - 1999m)**: *Wooden Catacomb* (Deep amber timber planks)
- **Level 3 (2000m - 2999m)**: *Ancient Stone Ruins* (Granite slate blocks & bio-moss)
- **Level 4 (3000m - 3999m)**: *Pre-Historic Lava Cave* (Obsidian basalt & molten lava veins)
- **Level 5 (4000m - 4999m)**: *Futuristic Vault* (Metallic steel hex-grid & cyan circuit channels)
- **Level 6 (5000m+)**: *Synthwave Sunset* (Purple & Gold retrowave grid)
- **Level Warp Surge**: Reaching every 1,000 meters triggers a 3.5s 1.8x hyper-warp speed surge with glowing cyan energy shell flashes.

### 🎮 4. Flexible 4-Way Flight Controls
- **Keyboard**: Arrow Keys / `W`, `A`, `S`, `D` for 4-way steering.
- **Touch Virtual Keypad**: Large on-screen touch buttons (`LEFT`, `UP`, `DOWN`, `RIGHT`).
- **Touch Swipe**: Drag/swipe finger across canvas to steer.
- **Mobile Gyroscope**: Tilt smartphone up, down, left, or right for hands-free flight control.

### 🔊 5. Web Audio API Synthesizer (100% Zero-Asset Audio)
- Real-time procedural audio synthesis generated entirely in code using Web Audio API oscillators and filters:
  - **Synthwave Background Music**: Low-pass filtered pulsing bass sequence.
  - **Emerald Crystal Chime**: Ascending sci-fi arpeggio chime.
  - **Energy Boost Sweep**: Pitch-ascending laser warp sweep.
  - **Mine Collision & Game Over**: Impactful white noise explosion and bass rumble decay.

### 💾 6. Persistent Settings & State Storage
- Automatically saves and restores all user configurations (`localStorage`):
  - 3D Viewing Mode, Eye Distance (IPD), Focal Length, Swap Eyes
  - Flight View Mode (Chase / Cockpit), Sound Muted state, Gyroscope state, User Speed
  - Persistent High Score tracking.

### 📱 7. Progressive Web App (PWA) & Offline Play
- Fully installable on iOS, Android, macOS, and Windows.
- Self-contained Service Worker (`sw.js`) caches all assets locally for 100% offline play.

---

## 🎮 Controls Summary

| Control Action | Keyboard | Touch / Mobile |
| :--- | :--- | :--- |
| **Steer Left** | `Left Arrow` / `A` | `◄ LEFT` button / Swipe Left |
| **Steer Right** | `Right Arrow` / `D` | `RIGHT ►` button / Swipe Right |
| **Fly Up** | `Up Arrow` / `W` | `▲ UP` button / Swipe Up |
| **Fly Down** | `Down Arrow` / `S` | `▼ DOWN` button / Swipe Down |
| **Pause Game** | `P` / `Space` | `⏸️` Icon Button |
| **Toggle View** | `V` | `🎥` Icon Button |
| **Toggle Gyro** | - | `📱` Icon Button |
| **Toggle Audio** | `M` | `🔊` Icon Button |

---

## 🛠️ Installation & Local Setup

Since **3D Tunnel Rush PWA** is built with native ES6 Modules and Three.js, you can run it directly using any static web server:

### Option A: Using Python (Built-in HTTP Server)
```bash
python -m http.server 8085
```
Open your browser at `http://localhost:8085`.

### Option B: Using Node.js `npx http-server`
```bash
npx http-server -p 8085
```
Open your browser at `http://localhost:8085`.

---

## 🏗️ Project Architecture

```
3DTunnelRush/
├── index.html            # Main HTML5 App Entry & Controls Drawer
├── manifest.json         # PWA Manifest Configuration
├── sw.js                 # PWA Service Worker (Offline Cache)
├── css/
│   └── styles.css        # Responsive Design System & Layout
├── js/
│   ├── app.js            # Main Game Loop & Lifecycle Manager
│   ├── renderer.js       # Stereoscopic 3D Render Engine (2D, Parallel, Cross, Anaglyph)
│   ├── tunnel.js         # Procedural Curved 3D Tunnel & Obstacle Generator
│   ├── player.js         # Player Spacecraft Physics & Visual Auras
│   ├── hud3d.js          # 3D Scene HUD & Reticle Renderer
│   ├── controls.js       # Input Handler (Keyboard, Touch, Gyroscope)
│   ├── audio.js          # Web Audio Synthesizer
│   ├── ui.js             # UI Manager & Persistent Settings
│   └── lib/
│       └── three.min.js  # Local Self-Contained Three.js Dependency
└── assets/
    └── favicon.svg       # App Vector Favicon & Icon
```

---

## 📜 License

Distributed under the **MIT License**. See `LICENSE` for details.
