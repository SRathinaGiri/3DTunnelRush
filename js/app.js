/* ==========================================================================
   3D TUNNEL RUSH - MAIN APPLICATION ENTRY POINT
   Version: v3.2.0
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
    this.version = '3.2.0';
    console.log(`[3D Tunnel Rush v${this.version}] Initializing main application...`);

    this.state = 'MENU'; // 'MENU', 'WARMUP', 'PLAYING', 'PAUSED', 'GAMEOVER'
    this.warmupTimer = 5;

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
    this.tunnel.reset();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);

    window.addEventListener('resize', () => this.renderer.handleResize());
  }

  startGame() {
    console.log(`[3D Tunnel Rush v${this.version}] Starting game session with 5s focus warmup.`);
    if (this.warmupInterval) clearInterval(this.warmupInterval);

    this.player.reset();
    this.tunnel.reset();
    this.controls.reset();
    this.ui.hideAllScreens();

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
    const themeBadge = document.getElementById('themeBadge');
    if (themeBadge) {
      themeBadge.textContent = `L${newLevel}: ${themeName}`;
    }
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
    this.ui.showStartScreen();
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

  updateCamera() {
    // 3D Camera tightly tracks player ship coordinates (100% visible inside FOV on all up/down elevations!)
    const camTargetZ = this.player.z + 7.5;
    const camCenter = getTunnelCenter(camTargetZ);
    const slope = getTunnelSlope(this.player.z);

    // Tight 88% vertical & horizontal camera tracking ensures craft NEVER leaves sight
    const camTargetX = camCenter.x + (this.player.x * 0.88);
    const camTargetY = camCenter.y + (this.player.y * 0.88) + 0.6;

    let camPitch = -slope.pitch + (this.player.tiltX * 0.35);
    let camYaw = -slope.yaw;
    let camRoll = -this.player.tiltZ * 0.35;

    // Thrilling 3D Roller-Coaster Camera Dynamic Motion during Level Warp Transition
    if (this.player.isLevelTransitioning) {
      const transitionTime = 3.5 - this.player.transitionTimer;
      const bankOscillation = Math.sin(transitionTime * 6.5) * 0.22;
      const pitchDip = Math.cos(transitionTime * 5.0) * 0.10;
      camRoll += bankOscillation;
      camPitch += pitchDip;
    }

    this.renderer.mainCamera.position.set(camTargetX, camTargetY, camTargetZ);
    this.renderer.mainCamera.rotation.set(camPitch, camYaw, camRoll);

    // Sync 3D Scene HUD transform with Camera
    this.hud3d.updateCameraTransform(this.renderer.mainCamera);
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

      // Update 3D Scene HUD values
      this.hud3d.updateHUD(
        this.player.score,
        this.player.distanceTraveled,
        speedPrefix + (this.player.currentSpeed * 1000).toFixed(0) + ' km/h',
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
    const versionTag = document.getElementById('updateVersionTag');

    if (versionTag) versionTag.textContent = `v${this.version}`;

    if (banner) {
      banner.classList.remove('hidden');
      banner.style.display = 'flex';
      banner.style.opacity = '1';
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
        navigator.serviceWorker.register('./sw.js?v=3.2.0').then((reg) => {
          console.log(`[SW v${this.version}] Registered successfully with scope:`, reg.scope);

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

          setInterval(() => {
            if (navigator.onLine) {
              reg.update();
            }
          }, 60000);
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
