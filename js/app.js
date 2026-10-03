/* ==========================================================================
   3D TUNNEL RUSH - MAIN APPLICATION ENTRY POINT
   Version: v4.17.0
   ========================================================================== */

import { StereoRenderEngine } from './renderer.js';
import { TunnelEngine, getTunnelCenter, getTunnelSlope } from './tunnel.js';
import { PlayerShip } from './player.js';
import { ControlsHandler } from './controls.js';
import { soundEngine } from './audio.js';
import { UIManager } from './ui.js';
import { HUD3DEngine } from './hud3d.js';

class GameApp {
  constructor() {
    this.version = '4.16.0';
    console.log(`[3D Tunnel Rush v${this.version}] Initializing main application...`);

    this.state = 'MENU'; // 'MENU', 'WARMUP', 'PLAYING', 'PAUSED', 'GAMEOVER'
    this.viewMode = 'CHASE'; // 'CHASE' (3rd person) or 'COCKPIT' (1st person pilot view)
    this.warmupTimer = 5;
    this.swRegistration = null;

    // Core Three.js Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020617);

    // Subsystems
    const canvas = document.getElementById('gameCanvas');
    this.renderer = new StereoRenderEngine(canvas);
    this.tunnel = new TunnelEngine(this.scene);
    this.player = new PlayerShip(this.scene);
    this.controls = new ControlsHandler();
    this.audio = soundEngine;
    this.hud3d = new HUD3DEngine(this.scene, this.renderer.mainCamera);
    this.ui = new UIManager(this);

    // Setup input bindings
    this.controls.bindVirtualKeypad();
    this.controls.bindCanvasTouchSwipe(canvas);
    this.controls.onPauseToggle = () => this.togglePause();

    // Register Service Worker for PWA Offline functionality & Internet Update Awareness
    this.registerServiceWorker();

    // Initial render setup & loop launch
    this.player.reset();
    this.tunnel.reset();
    this.ui.showMenuPage();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);

    window.addEventListener('resize', () => this.renderer.handleResize());
  }

  startGame() {
    console.log(`[3D Tunnel Rush v${this.version}] Starting game session with 5s focus warmup.`);
    if (this.warmupInterval) clearInterval(this.warmupInterval);

    // Check for software update ONCE when game starts (if online)
    if (this.swRegistration && navigator.onLine) {
      console.log(`[SW v${this.version}] Checking for latest software update on game start...`);
      this.swRegistration.update();
    }

    // Reset player, tunnel, and force Theme 1 (Cyberpunk Neon) on every start / restart
    this.player.reset();
    this.tunnel.reset();
    this.tunnel.setThemeByLevel(1);
    this.controls.reset();
    this.ui.showGamePage();

    this.state = 'WARMUP';
    this.player.currentSpeed = 0.01; // Ultra slow drift for eye focus
    this.audio.startAmbientMusic();

    this.warmupTimer = 5;
    this.hud3d.showCountdown('5');

    this.warmupInterval = setInterval(() => {
      this.warmupTimer--;
      if (this.warmupTimer > 0) {
        this.hud3d.showCountdown(this.warmupTimer.toString());
      } else {
        this.hud3d.showCountdown('GO!');
      }

      if (this.warmupTimer <= 0) {
        clearInterval(this.warmupInterval);
        setTimeout(() => {
          this.hud3d.hideCenterBanner();
          if (this.state === 'WARMUP') {
            this.state = 'PLAYING';
            this.player.currentSpeed = this.player.baseSpeed;
          }
        }, 500);
      }
    }, 1000);
  }

  onLevelUp(newLevel) {
    console.log(`[3D Tunnel Rush v${this.version}] Level Up! Reached Level ${newLevel} (Roller Coaster Hyper-Warp Activated)`);
    const themeName = this.tunnel.setThemeByLevel(newLevel);
    this.hud3d.showLevelUpNotice(newLevel, themeName);
    if (this.audio && typeof this.audio.playCollectSound === 'function') {
      this.audio.playCollectSound();
    }
  }

  togglePause() {
    if (this.state === 'PLAYING' || this.state === 'WARMUP') {
      this.state = 'PAUSED';
      this.hud3d.showPauseBanner();
      this.ui.togglePauseScreen(true);
      this.audio.stopAmbientMusic();
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      this.hud3d.hideCenterBanner();
      this.ui.togglePauseScreen(false);
      this.audio.startAmbientMusic();
    }
  }

  stopGame() {
    console.log(`[3D Tunnel Rush v${this.version}] Game stopped by user.`);
    if (this.warmupInterval) clearInterval(this.warmupInterval);
    this.state = 'MENU';
    this.player.reset();
    this.tunnel.reset();
    this.audio.stopAmbientMusic();
    this.hud3d.hideCenterBanner();
    this.hud3d.hideEnergyBoostNotice();
    this.ui.showMenuPage();
  }

  restartGame() {
    this.startGame();
  }

  gameOver() {
    this.state = 'GAMEOVER';
    this.audio.stopAmbientMusic();
    this.audio.playExplosionSound();
    this.hud3d.showGameOverBanner(this.player.score, this.player.distanceTraveled);
    this.ui.showGameOver(this.player.score, this.player.distanceTraveled);
  }

  toggleViewMode() {
    this.viewMode = (this.viewMode === 'CHASE') ? 'COCKPIT' : 'CHASE';
    console.log(`[3D Tunnel Rush v${this.version}] View mode toggled to: ${this.viewMode}`);
    return this.viewMode;
  }

  updateCamera() {
    const slope = getTunnelSlope(this.player.z);
    const shipX = (this.player.effectiveX !== undefined) ? this.player.effectiveX : this.player.x;
    const shipY = (this.player.effectiveY !== undefined) ? this.player.effectiveY : this.player.y;

    if (this.viewMode === 'COCKPIT') {
      // 1ST-PERSON PILOT COCKPIT VIEW
      const shipCenter = getTunnelCenter(this.player.z);
      const lookZ = this.player.z - 25.0;
      const lookCenter = getTunnelCenter(lookZ);

      // Camera positioned inside the pilot cockpit window
      const camX = shipCenter.x + shipX;
      const camY = shipCenter.y + shipY + 0.35; // Pilot eye height
      const camZ = this.player.z - 0.2;         // In front of ship origin

      this.renderer.mainCamera.position.set(camX, camY, camZ);

      // Aim camera straight down the curved tunnel ahead with steering tilt reaction
      const lookX = lookCenter.x + shipX + (this.player.tiltZ * -2.0);
      const lookY = lookCenter.y + shipY + (this.player.tiltX * 2.0);
      this.renderer.mainCamera.lookAt(new THREE.Vector3(lookX, lookY, lookZ));

      // Roll bank with flight inclination & steering roll
      let bankRoll = (-slope.dx * 0.35) - (this.player.tiltZ * 0.45);
      if (this.player.isLevelTransitioning) {
        const transitionTime = 3.5 - this.player.transitionTimer;
        bankRoll += Math.sin(transitionTime * 6.5) * 0.25;
      }
      this.renderer.mainCamera.rotation.z += bankRoll;

      // In Cockpit View, hide exterior ship mesh and show 3D pilot cockpit frame & crosshair reticle
      if (this.player.mesh) this.player.mesh.visible = false;
      if (this.hud3d) this.hud3d.setCockpitVisible(true);
    } else {
      // 3RD-PERSON CHASE CAMERA VIEW
      if (this.player.mesh) this.player.mesh.visible = true;
      if (this.hud3d) this.hud3d.setCockpitVisible(false);

      const camZ = this.player.z + 7.0;
      const lookZ = this.player.z - 3.0;

      const camCenter = getTunnelCenter(camZ);
      const lookCenter = getTunnelCenter(lookZ);

      const camX = camCenter.x + (shipX * 0.70);
      const camY = camCenter.y + (shipY * 0.70) + 0.9;
      this.renderer.mainCamera.position.set(camX, camY, camZ);

      const lookX = lookCenter.x + (shipX * 0.85);
      const lookY = lookCenter.y + (shipY * 0.85) + 0.2;
      this.renderer.mainCamera.lookAt(new THREE.Vector3(lookX, lookY, lookZ));

      let bankRoll = (-slope.dx * 0.30) - (this.player.tiltZ * 0.35);
      if (this.player.isLevelTransitioning) {
        const transitionTime = 3.5 - this.player.transitionTimer;
        bankRoll += Math.sin(transitionTime * 6.5) * 0.22;
      }
      this.renderer.mainCamera.rotation.z += bankRoll;
    }

    // Sync 3D Scene HUD transform with Camera
    if (this.hud3d) this.hud3d.updateCameraTransform(this.renderer.mainCamera, 0.016);
  }

  animate(timestamp) {
    requestAnimationFrame(this.animate);

    const delta = 0.016;

    if (this.state === 'PLAYING' || this.state === 'WARMUP') {
      // Update Player & Controls
      this.player.update(this.controls, delta);

      // Update Procedural Tunnel & Obstacles
      this.tunnel.update(this.player.currentSpeed, this.player.z, this.player.isLevelTransitioning);

      // Collisions (active during PLAYING state)
      if (this.state === 'PLAYING') {
        this.player.checkObstacleCollisions(this.tunnel.obstacles, (remainingShield, remainingLives) => {
          this.audio.playHitSound();
          if (remainingLives <= 0) {
            this.gameOver();
          }
        });

        this.player.checkGemCollisions(this.tunnel.gems, (score, mult, totalGems, gemsNext, extraLifeGained) => {
          this.audio.playCollectSound();
          if (extraLifeGained) {
            this.hud3d.showExtraLifeNotice();
          }
        });
      }

      // Speed & Slope Indicator
      let speedPrefix = '⚡ ';
      if (this.player.isLevelTransitioning) speedPrefix = '🚀 WARP ';
      else if (this.player.currentIncline > 0.08) speedPrefix = '▲ ';
      else if (this.player.currentIncline < -0.08) speedPrefix = '▼ ';

      const speedStr = speedPrefix + (this.player.currentSpeed * 1000).toFixed(0) + ' km/h';
      const levelStr = `L${this.player.level}: ${this.tunnel.currentTheme.name}`;

      // Update Solid Block HUD (Underneath 3D Viewport)
      this.ui.updateSolidBlockHUD(
        this.player.score,
        this.player.distanceTraveled,
        speedStr,
        this.player.shield + '%',
        'x' + this.player.multiplier,
        this.player.lives,
        levelStr
      );

      // Update 3D Scene HUD values (if any 3D elements remain)
      this.hud3d.updateHUD(
        this.player.score,
        this.player.distanceTraveled,
        speedStr,
        this.player.shield + '%',
        'x' + this.player.multiplier,
        this.player.lives,
        this.player.gemsForExtraLife
      );

      this.updateCamera();
    } else {
      // Idle view on menu screen (Following tunnel curve at z=8.5)
      const center = getTunnelCenter(8.5);
      const slope = getTunnelSlope(8.5);
      this.renderer.mainCamera.position.set(center.x, center.y - 1.8, 8.5);
      this.renderer.mainCamera.rotation.set(-slope.pitch, -slope.yaw, 0);
      this.hud3d.updateCameraTransform(this.renderer.mainCamera);
    }

    // Render Scene with active Stereoscopic mode (2D, Parallel, Cross, Anaglyph)
    this.renderer.render(this.scene);
  }

  showUpdatePrompt(waitingWorker) {
    const banner = document.getElementById('updateBanner');
    const installBtn = document.getElementById('installUpdateBtn');
    const closeBtn = document.getElementById('closeUpdateBtn');
    const versionTag = document.getElementById('updateVersionTag');

    if (versionTag) versionTag.textContent = `v${this.version}`;

    if (banner) {
      banner.classList.remove('hidden');
      banner.style.display = 'flex';
      banner.style.opacity = '1';
    }

    if (closeBtn) {
      closeBtn.onclick = (e) => {
        if (e) e.preventDefault();
        if (banner) {
          banner.classList.add('hidden');
          banner.style.display = 'none';
        }
      };
    }

    if (installBtn) {
      installBtn.onclick = (e) => {
        if (e) e.preventDefault();
        console.log(`[SW v${this.version}] User requested install software update...`);
        installBtn.textContent = '⏳ Updating...';
        if (waitingWorker) {
          waitingWorker.postMessage({ type: 'SKIP_WAITING' });
        }
      };
    }
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });

      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js?v=4.9.4').then((reg) => {
          console.log(`[SW v${this.version}] Registered successfully with scope:`, reg.scope);
          this.swRegistration = reg;

          if (reg.waiting) {
            this.showUpdatePrompt(reg.waiting);
          }

          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log(`[SW v${this.version}] New version found! Prompting update.`);
                  this.showUpdatePrompt(newWorker);
                }
              });
            }
          });
        }).catch((err) => {
          console.warn(`[SW v${this.version}] Registration failed:`, err);
        });
      });
    }
  }
}

// Instantiate App on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new GameApp();
});
