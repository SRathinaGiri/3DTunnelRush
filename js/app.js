/* ==========================================================================
   3D TUNNEL RUSH - MAIN APPLICATION ENTRY POINT
   Version: v4.31.0
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
    this.version = '4.31.0';
    console.log(`[3D Tunnel Rush v${this.version}] Initializing main application...`);

    this.state = 'MENU'; // 'MENU', 'WARMUP', 'PLAYING', 'PAUSED', 'GAMEOVER'
    this.viewMode = 'CHASE'; // 'CHASE' (3rd person) or 'COCKPIT' (1st person pilot view)
    this.warmupTimer = 5;
    this.swRegistration = null;

    // Core Three.js Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020617);

    this.shakeTimer = 0;
    this.shakeIntensity = 0;

    // Subsystems
    const canvas = document.getElementById('gameCanvas');
    const gamePage = document.getElementById('gamePage') || canvas;
    this.renderer = new StereoRenderEngine(canvas);
    this.scene.add(this.renderer.cameraGroup);
    this.tunnel = new TunnelEngine(this.scene);
    this.player = new PlayerShip(this.scene);
    this.controls = new ControlsHandler();
    this.audio = soundEngine;
    this.hud3d = new HUD3DEngine(this.scene, this.renderer.mainCamera);
    this.ui = new UIManager(this);

    // Setup input bindings (virtual keypad + full-screen touch region steering)
    this.controls.bindVirtualKeypad();
    this.controls.bindScreenTouchControls(gamePage);
    this.controls.onPauseToggle = () => this.togglePause();

    // Check & setup WebXR Immersive VR Session for Meta Quest & VR headsets
    this.setupWebXR();

    // Register Service Worker for PWA Offline functionality & Internet Update Awareness
    this.registerServiceWorker();

    // Initial render setup & loop launch via Three.js setAnimationLoop (WebXR compatible)
    this.player.reset();
    this.tunnel.reset();
    this.ui.showMenuPage();
    this.animate = this.animate.bind(this);
    this.renderer.renderer.setAnimationLoop(this.animate);

    window.addEventListener('resize', () => this.renderer.handleResize());
  }

  setupWebXR() {
    if (typeof navigator !== 'undefined' && 'xr' in navigator) {
      navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
        if (supported) {
          console.log(`[3D Tunnel Rush v${this.version}] WebXR Immersive VR supported on this headset!`);
          const vrBtnHeader = document.getElementById('webxrHeaderBtn');
          const vrBtnMenu = document.getElementById('webxrMenuBtn');
          if (vrBtnHeader) vrBtnHeader.style.display = 'inline-flex';
          if (vrBtnMenu) vrBtnMenu.style.display = 'inline-flex';

          const enterVR = async () => {
            try {
              const session = await navigator.xr.requestSession('immersive-vr', {
                optionalFeatures: ['local-floor', 'bounded-floor']
              });
              await this.renderer.renderer.xr.setSession(session);
              console.log(`[3D Tunnel Rush v${this.version}] Entered WebXR Immersive VR Session.`);

              session.addEventListener('select', () => {
                if (this.state === 'MENU') {
                  this.startGame();
                } else if (this.state === 'GAMEOVER') {
                  this.restartGame();
                } else if (this.state === 'PAUSED') {
                  this.togglePause();
                }
              });

              if (this.state === 'MENU') {
                this.startGame();
              }
            } catch (err) {
              console.warn('[3D Tunnel Rush] WebXR request session error:', err);
            }
          };

          if (vrBtnHeader) vrBtnHeader.addEventListener('click', enterVR);
          if (vrBtnMenu) vrBtnMenu.addEventListener('click', enterVR);
        }
      }).catch(err => console.warn('[3D Tunnel Rush] WebXR check error:', err));
    }
  }

  triggerScreenShake(intensity = 0.35, duration = 0.4) {
    this.shakeIntensity = intensity;
    this.shakeTimer = duration;
  }

  startGame() {
    console.log(`[3D Tunnel Rush v${this.version}] Starting game session with 5s focus warmup.`);
    if (this.warmupInterval) clearInterval(this.warmupInterval);

    // Reset player, tunnel, and force Theme 1 (Cyberpunk Neon) on every start / restart
    this.player.reset();
    this.tunnel.reset();
    this.tunnel.setThemeByLevel(1);
    this.controls.reset();
    this.controls.requestWakeLock(); // Keep mobile screen active during gameplay
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
    try {
      const themeName = this.tunnel.setThemeByLevel(newLevel);
      if (this.hud3d && typeof this.hud3d.showLevelUpNotice === 'function') {
        this.hud3d.showLevelUpNotice(newLevel, themeName);
      }
      if (this.audio && typeof this.audio.playWarpSweepSound === 'function') {
        this.audio.playWarpSweepSound();
      }
    } catch (e) {
      console.warn('[3D Tunnel Rush] Exception during level transition:', e);
    }
  }

  togglePause() {
    if (this.state === 'PLAYING' || this.state === 'WARMUP') {
      this.state = 'PAUSED';
      this.hud3d.showPauseBanner();
      this.ui.togglePauseScreen(true);
      this.audio.stopAmbientMusic();
      this.controls.releaseWakeLock();
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      this.hud3d.hideCenterBanner();
      this.ui.togglePauseScreen(false);
      this.audio.startAmbientMusic();
      this.controls.requestWakeLock();
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
    this.controls.releaseWakeLock();
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
    this.controls.releaseWakeLock();
    this.ui.showGameOver(this.player.score, this.player.distanceTraveled);
  }

  toggleViewMode() {
    this.viewMode = (this.viewMode === 'CHASE') ? 'COCKPIT' : 'CHASE';
    console.log(`[3D Tunnel Rush v${this.version}] View mode toggled to: ${this.viewMode}`);
    return this.viewMode;
  }

  updateCamera() {
    const delta = this.lastDelta || 0.016;
    const slope = getTunnelSlope(this.player.z);
    const shipX = (this.player.effectiveX !== undefined) ? this.player.effectiveX : this.player.x;
    const shipY = (this.player.effectiveY !== undefined) ? this.player.effectiveY : this.player.y;

    // Dynamic Speed FOV Surge (75 FOV base -> up to 88 FOV during warp / top speed)
    const warpBonus = this.player.isLevelTransitioning ? 12.0 : 0.0;
    const speedRatio = Math.min(1.0, Math.max(0, (this.player.currentSpeed - 0.075) / 0.425));
    const targetFOV = 75.0 + (speedRatio * 8.0) + warpBonus;
    this.renderer.setFOV(THREE.MathUtils.lerp(this.renderer.fov, targetFOV, 0.10));

    // Reset local mainCamera transform relative to cameraGroup
    this.renderer.mainCamera.position.set(0, 0, 0);
    this.renderer.mainCamera.rotation.set(0, 0, 0);

    const isVR = (this.renderer && this.renderer.renderer && this.renderer.renderer.xr && this.renderer.renderer.xr.isPresenting === true);

    if (this.viewMode === 'COCKPIT') {
      // 1ST-PERSON PILOT COCKPIT VIEW
      const shipCenter = getTunnelCenter(this.player.z);
      const lookZ = this.player.z - 25.0; // Target look-ahead position down -Z
      const lookCenter = getTunnelCenter(lookZ);

      // In VR Cockpit Mode: position camera group inside pilot canopy (camZ = player.z + 0.65, camY = shipCenter.y + shipY + 0.50)
      // In 2D Cockpit Mode: position camera group at camZ = player.z - 0.2
      const camX = shipCenter.x + shipX;
      const camY = shipCenter.y + shipY + (isVR ? 0.50 : 0.35);
      const camZ = this.player.z + (isVR ? 0.65 : -0.2);

      this.renderer.cameraGroup.position.set(camX, camY, camZ);

      const camPos = new THREE.Vector3(camX, camY, camZ);
      const lookX = lookCenter.x + shipX + (this.player.tiltZ * -1.5);
      const lookY = lookCenter.y + shipY + (this.player.tiltX * 1.5);
      const lookPos = new THREE.Vector3(lookX, lookY, lookZ);

      // Point cameraGroup local negative Z axis directly down the flight path (forwardDir)
      const forwardDir = new THREE.Vector3().subVectors(lookPos, camPos).normalize();
      if (forwardDir.lengthSq() > 0.0001) {
        this.renderer.cameraGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), forwardDir);
      }

      if (!isVR) {
        let bankRoll = (-slope.dx * 0.35) - (this.player.tiltZ * 0.45);
        if (this.player.isLevelTransitioning) {
          const transitionTime = 3.5 - this.player.transitionTimer;
          bankRoll += Math.sin(transitionTime * 6.5) * 0.25;
        }
        const rollQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), bankRoll);
        this.renderer.cameraGroup.quaternion.multiply(rollQuat);
      }

      // Ship Mesh Visibility: Keep ship model visible in VR so pilot sees ship nose & wings ahead
      if (this.player.mesh) this.player.mesh.visible = true;
      if (this.hud3d) this.hud3d.setCockpitVisible(true);
    } else {
      // 3RD-PERSON CHASE CAMERA VIEW (Supports 2D, Parallel, Cross-Eye, Anaglyph, HSBS & WebXR VR!)
      if (this.player.mesh) this.player.mesh.visible = true;
      if (this.hud3d) this.hud3d.setCockpitVisible(false);

      const camZ = this.player.z + (isVR ? 7.5 : 7.0);
      const lookZ = this.player.z - 3.0;

      const camCenter = getTunnelCenter(camZ);
      const lookCenter = getTunnelCenter(lookZ);

      const camX = camCenter.x + (shipX * (isVR ? 1.0 : 0.70));
      const camY = camCenter.y + (shipY * (isVR ? 1.0 : 0.70)) + (isVR ? 1.4 : 0.9);
      this.renderer.cameraGroup.position.set(camX, camY, camZ);

      const lookX = lookCenter.x + (shipX * (isVR ? 1.0 : 0.85));
      const lookY = lookCenter.y + (shipY * (isVR ? 1.0 : 0.85)) + 0.2;
      const camPos = new THREE.Vector3(camX, camY, camZ);
      const lookPos = new THREE.Vector3(lookX, lookY, lookZ);

      // Point cameraGroup local negative Z axis directly down the flight path (forwardDir)
      const forwardDir = new THREE.Vector3().subVectors(lookPos, camPos).normalize();
      if (forwardDir.lengthSq() > 0.0001) {
        this.renderer.cameraGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), forwardDir);
      }

      if (!isVR) {
        let bankRoll = (-slope.dx * 0.30) - (this.player.tiltZ * 0.35);
        if (this.player.isLevelTransitioning) {
          const transitionTime = 3.5 - this.player.transitionTimer;
          bankRoll += Math.sin(transitionTime * 6.5) * 0.22;
        }
        const rollQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), bankRoll);
        this.renderer.cameraGroup.quaternion.multiply(rollQuat);
      }
    }

    // Screen Shake Camera Jitter
    if (this.shakeTimer > 0) {
      this.shakeTimer -= delta;
      this.renderer.cameraGroup.position.x += (Math.random() - 0.5) * this.shakeIntensity;
      this.renderer.cameraGroup.position.y += (Math.random() - 0.5) * this.shakeIntensity;
    }

    // Sync 3D Scene HUD transform with Camera
    if (this.hud3d) this.hud3d.updateCameraTransform(this.renderer.mainCamera, delta);
  }

  animate(timestamp) {
    if (!this.lastTime) this.lastTime = timestamp || performance.now();
    const rawDelta = (timestamp - this.lastTime) / 1000.0;
    this.lastTime = timestamp || performance.now();
    const delta = Math.min(Math.max(rawDelta, 0.001), 0.05);
    this.lastDelta = delta;

    // Poll WebXR VR Controllers (Meta Quest Touch Controllers & Triggers) on every frame
    if (this.controls && typeof this.controls.pollWebXRControllers === 'function') {
      this.controls.pollWebXRControllers(this.renderer);
    }

    if (this.state === 'PLAYING' || this.state === 'WARMUP') {
      // Update Player & Controls
      this.player.update(this.controls, delta);

      // Update Procedural Tunnel, Explosions & Obstacles
      this.tunnel.update(this.player.currentSpeed, this.player.z, this.player.isLevelTransitioning, delta);

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
        Math.round(this.player.shield) + '%',
        'x' + this.player.multiplier,
        this.player.lives,
        levelStr
      );

      // Update 3D Scene HUD values (if any 3D elements remain)
      this.hud3d.updateHUD(
        this.player.score,
        this.player.distanceTraveled,
        speedStr,
        Math.round(this.player.shield) + '%',
        'x' + this.player.multiplier,
        this.player.lives,
        this.player.gemsForExtraLife
      );

      this.updateCamera();
    } else {
      // Idle view on menu screen (Following tunnel curve at z=8.5)
      const center = getTunnelCenter(8.5);
      const slope = getTunnelSlope(8.5);
      this.renderer.cameraGroup.position.set(center.x, center.y - 1.8, 8.5);
      this.renderer.cameraGroup.rotation.set(-slope.pitch, -slope.yaw, 0);
      this.renderer.mainCamera.position.set(0, 0, 0);
      this.renderer.mainCamera.rotation.set(0, 0, 0);
      this.hud3d.updateCameraTransform(this.renderer.mainCamera);
    }

    // Render Scene with active Stereoscopic mode (2D, Parallel, Cross, Anaglyph, HSBS, or WebXR)
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
        if (!refreshing && this.state !== 'PLAYING' && this.state !== 'WARMUP') {
          refreshing = true;
          window.location.reload();
        }
      });

      window.addEventListener('load', () => {
        navigator.serviceWorker.register(`./sw.js?v=${this.version}`).then((reg) => {
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
