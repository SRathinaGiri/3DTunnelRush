# 🚀 3D Tunnel Rush PWA (Stereoscopic 3D Game)

[![Version](https://img.shields.io/badge/version-v4.30.0-00f0ff.svg)](./manifest.json)
[![PWA Ready](https://img.shields.io/badge/PWA-100%25%20Offline-ec4899.svg)](./sw.js)
[![WebGL](https://img.shields.io/badge/Three.js-WebGL%203D-a855f7.svg)](./js/renderer.js)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

🌐 **Live Playable Demo**: [srathinagiri.github.io/3DTunnelRush](https://srathinagiri.github.io/3DTunnelRush/)

An immersive, high-speed 3D stereoscopic tunnel rush Progressive Web App (PWA) built with **Three.js**, **WebGL**, and the **Web Audio API**. Relax your eyes, pop on 3D glasses, smart glasses, or a VR headset, and maneuver your spacecraft through dynamic 3D roller-coaster tunnels, dodging spiked red space mines and collecting glowing emerald crystals!

---

## 🎬 Gameplay Demos & 3D Screenshots

| 🎥 Parallel 3D View Video | 🎥 Cross-Eye 3D View Video |
| :---: | :---: |
| [▶️ Watch Parallel 3D Demo Video](./assets/pview3dtunnel.mp4) | [▶️ Watch Cross-Eye 3D Demo Video](./assets/xview3dtunnel.mp4) |

### 📸 Screenshot Gallery

<p align="center">
  <img src="./assets/3DTunnel01.jpg" width="48%" alt="3D Tunnel Rush Gameplay 1" />
  <img src="./assets/3DTunnel02.jpg" width="48%" alt="3D Tunnel Rush Gameplay 2" />
  <br>
  <img src="./assets/3DTunnel03.jpg" width="48%" alt="3D Tunnel Rush Gameplay 3" />
  <img src="./assets/3DTunnel04.jpg" width="48%" alt="3D Tunnel Rush Gameplay 4" />
  <br>
  <img src="./assets/3DTunnel05.jpg" width="97%" alt="3D Tunnel Rush Gameplay 5" />
</p>

---

## 🌟 Key Features

### 👓 1. Five 3D Viewing Modes, Smart Glasses (HSBS) & Native WebXR VR
- **2D View**: Standard single-camera 3D viewport with dynamic FOV speed surges.
- **Parallel 3D (Side-by-Side)**: Dual off-axis stereo camera rendering (2:1 aspect ratio) for VR viewers, cardboard headsets, or parallel eye relaxation.
- **Cross-Eye 3D (Side-by-Side)**: Swapped stereo cameras for cross-eye 3D viewing—no hardware or glasses required!
- **Smart Glasses 3D (HSBS)**: Widescreen 16:9 Half Side-by-Side 3D output custom-tuned for **RayNeo Air, XREAL Air, Rokid, and TCL Smart Glasses** optical engines (squishing 16:9 camera aspect per eye so hardware optics stretch it back out into crisp, distortion-free 16:9 3D!).
- **Anaglyph 3D**: True 2-pass Red-Cyan 3D compositing—wear standard Red/Blue 3D glasses!
- **🥽 Native WebXR Immersive VR**: Integrated WebXR API (`renderer.xr.enabled = true`) allowing VR headset users to tap `🥽 VR (Meta Quest)` inside Meta Quest Browser for full **6DoF/3DoF immersive VR flight** with native headset-managed WebXR rendering, real-time head tracking, Meta Quest Touch Controller steering, in-headset score & sightline HUD, and one-touch view mode toggling!
- **Real-time 3D Controls**: Adjust Eye Separation (IPD slider), Focal Convergence Plane, and Swap Left/Right Eyes on the fly.

---

## 📱 Hardware Testing & Device Compatibility

| Category | Verified & Tested Hardware | Designed to Support |
| :--- | :--- | :--- |
| **🥽 Standalone WebXR VR** | **Meta Quest 3** (Meta Quest Browser) | Meta Quest 1, Quest 2, Quest Pro, Pico 4 & WebXR-compatible VR headsets |
| **👓 Smart Glasses (HSBS)** | **RayNeo Air** | XREAL Air, Rokid Max, TCL NxtWear & 16:9 HSBS glasses |
| **📱 Mobile & Desktop** | Android, iOS, Windows, macOS, Linux | Any modern WebGL / HTML5 browser |

---

## ⚠️ Health, Comfort & Photosensitivity Notice

> [!WARNING]
> **Photosensitivity & Visual Effects Advisory**: *3D Tunnel Rush PWA* features high-speed tunnel navigation, vibrant flashing light patterns during level warp transitions (1.8x speed surges every 1,000m), and stereoscopic 3D depth separation.
> - **Photosensitive Epilepsy**: Players prone to photosensitive seizures or visual migraines should exercise caution when playing.
> - **Motion Sickness & Eye Comfort**: If you experience eye strain, dizziness, or virtual motion discomfort, pause the flight immediately (`P` key or `⏸️` button) and lower the **IPD (Eye Distance)** slider in settings for a softer 3D depth effect.

---

## ℹ️ Technical Clarifications & Rendering Architecture

### 🥽 Native WebXR VR Engine (Meta Quest 3 & Standalone Headsets)
- **Native WebXR Immersive Session**: Tapping `🥽 VR (Meta Quest)` inside Meta Quest Browser requests an `immersive-vr` WebXR session (`navigator.xr.requestSession`). Three.js automatically manages native headset-managed WebXR rendering, dual lens distortion, IPD, and 6DoF head position/orientation tracking.
- **In-Headset 3D World-Anchored HUD**: The 3D scene HUD (`hud3d.js`) uses `targetCam.getWorldPosition()` and `targetCam.getWorldQuaternion()` to lock live **Score**, **Speed**, **Hearts/Lives**, **Shield Energy %**, **Distance**, and the **Sightline Crosshair Reticle** directly in front of your headset eyes at a comfortable `3.5m` focal depth.
- **Meta Quest Touch Controller Integration**:
  - **Thumbstick & Triggers**: Full 4-way analog steering with deadzone filtering and instant release detection.
  - **Index / Grip Triggers & Action Buttons (`A`/`X`)**: Start, restart, or unpause game sessions directly from inside VR.
  - **`B` / `Y` Button**: Toggle between **3rd-Person Chase View** (camera positioned 8.5m behind spacecraft) and **1st-Person Cockpit View** (sitting inside seat canopy looking out over the ship nose).

### 👓 Smart Glasses HSBS (Half Side-by-Side) Mode
- Smart glasses like RayNeo Air and XREAL Air split a 1080p frame into two halves and stretch each half horizontally by 2x back out to 16:9 for each lens.
- In **Smart Glasses 3D (HSBS)** mode, *3D Tunnel Rush* configures camera frustums at 16:9 aspect ratio and renders into half-width viewports. When processed by the glasses' hardware optics, the 3D tunnel displays in 100% natural, distortion-free 16:9 proportion with ultra-fast frame rates!

### 🔴🔵 Anaglyph 3D Shader & Retinal Rivalry Mitigation
- Anaglyph 3D mode uses a dedicated 2-pass matrix shader filter optimized for standard Red-Cyan 3D glasses.
- If minor ghosting or color spill occurs on highly saturated level themes, tune the live **IPD slider** in the pause menu to adjust horizontal channel separation for your specific glasses and screen color temperature.

### 📐 Dynamic Auto-Responsive Viewport Architecture
- The WebGL rendering engine (`js/renderer.js`) features **100% dynamic viewport auto-scaling** based on real-time element bounds and `window.devicePixelRatio`.
- Viewports dynamically adapt to mobile portrait, ultra-compact mobile landscape (reclaiming 90%+ vertical screen space), high-refresh desktop monitors, and VR browser windows up to 4K+ resolutions without static pixel locks.

---

## 🎮 Controls Summary

| Control Action | Keyboard | Touch / Mobile | Meta Quest VR Touch Controllers |
| :--- | :--- | :--- | :--- |
| **Steer Left** | `Left Arrow` / `A` | Touch Left Half Screen / `◄ LEFT` / Swipe Left | Push Left Thumbstick Left / Pull Left Trigger or Grip |
| **Steer Right** | `Right Arrow` / `D` | Touch Right Half Screen / `RIGHT ►` / Swipe Right | Push Right Thumbstick Right / Pull Right Trigger or Grip |
| **Fly Up** | `Up Arrow` / `W` | Touch Top 40% Screen / `▲ UP` / Drag Up | Push Thumbstick Forward / UP |
| **Fly Down** | `Down Arrow` / `S` | Touch Bottom 40% Screen / `▼ DOWN` / Drag Down | Pull Thumbstick Backward / DOWN |
| **Start / Restart / Resume** | `Space` / `Enter` | Touch Menu / Game Over Buttons | Pull Index Trigger / Press `A` / `X` Button |
| **Pause Game** | `P` / `Escape` | `⏸️` Icon Button | `P` key / Menu button |
| **Toggle View (Chase/Cockpit)** | `V` | `🎥` Icon Button | `🎥` Icon Button |
| **Toggle Gyro** | - | `📱` Icon Button | - |
| **Toggle Audio** | `M` | `🔊` Icon Button | - |

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
