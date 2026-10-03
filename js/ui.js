/* ==========================================================================
   3D TUNNEL RUSH - USER INTERFACE & STATE MANAGER
   Version: v4.19.0
   ========================================================================== */

export class UIManager {
  constructor(gameApp) {
    this.app = gameApp;

    // Page Containers (2-Page Architecture)
    this.menuPage = document.getElementById('menuPage');
    this.gamePage = document.getElementById('gamePage');

    // Modals
    this.pauseScreen = document.getElementById('pauseScreen');
    this.gameOverScreen = document.getElementById('gameOverScreen');
    this.infoDrawer = document.getElementById('infoDrawer');

    // High Score
    this.highScore = parseInt(localStorage.getItem('tunnel_rush_highscore') || '0', 10);

    this.bindControls();
    this.bindSliders();
    
    // Load persistent user configuration from localStorage
    setTimeout(() => this.loadSettings(), 50);
  }

  bindAction(elementId, actionFn) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const handler = (e) => {
      if (e) e.preventDefault();
      if (this.app && this.app.audio) {
        this.app.audio.ensureContext();
      }
      actionFn();
    };

    el.addEventListener('click', handler);
    el.addEventListener('touchstart', handler, { passive: false });
  }

  bindControls() {
    // Menu & Game Control Buttons
    this.bindAction('menuStartBtn', () => this.app.startGame());
    this.bindAction('startBtn', () => this.app.startGame());
    
    // In-Game Overlay Bar Buttons
    this.bindAction('gamePauseBtn', () => this.app.togglePause());
    this.bindAction('gameStopBtn', () => this.app.stopGame());
    this.bindAction('gameBackBtn', () => this.app.stopGame());

    // Modal Buttons
    this.bindAction('restartBtn', () => this.app.restartGame());
    this.bindAction('resumeBtn', () => this.app.togglePause());
    this.bindAction('resetHighScoreBtn', () => this.resetHighScore());

    // Sound Mute Toggle (Shared across Menu & Game overlay)
    const toggleAudio = (e) => {
      if (e) e.preventDefault();
      const isMuted = this.app.audio.toggleMute();
      const btn1 = document.getElementById('audioToggle');
      const btn2 = document.getElementById('gameAudioBtn');
      if (btn1) btn1.textContent = isMuted ? '🔇 Muted' : '🔊 Sound';
      if (btn2) {
        btn2.textContent = isMuted ? '🔇' : '🔊';
        btn2.title = isMuted ? 'Sound: Muted' : 'Sound: ON';
        if (isMuted) btn2.classList.add('active');
        else btn2.classList.remove('active');
      }
    };
    
    const audioBtn = document.getElementById('audioToggle');
    if (audioBtn) {
      audioBtn.addEventListener('click', toggleAudio);
      audioBtn.addEventListener('touchstart', toggleAudio, { passive: false });
    }
    const gameAudioBtn = document.getElementById('gameAudioBtn');
    if (gameAudioBtn) {
      gameAudioBtn.addEventListener('click', toggleAudio);
      gameAudioBtn.addEventListener('touchstart', toggleAudio, { passive: false });
    }

    // Mobile Gyroscope Toggle Button (Shared across Menu & Game overlay)
    const toggleGyro = (e) => {
      if (e) e.preventDefault();
      this.app.controls.toggleGyroscope((enabled) => {
        const text = enabled ? 'Gyro: ON' : 'Gyro: OFF';
        const badge1 = document.getElementById('gyroBadge');
        const btn1 = document.getElementById('gyroToggle');
        const btn2 = document.getElementById('gameGyroBtn');
        if (badge1) badge1.textContent = text;
        if (btn1) {
          if (enabled) btn1.classList.add('active');
          else btn1.classList.remove('active');
        }
        if (btn2) {
          btn2.title = enabled ? 'Gyro: ON' : 'Gyro: OFF';
          if (enabled) btn2.classList.add('active');
          else btn2.classList.remove('active');
        }
      });
    };

    const gyroBtn = document.getElementById('gyroToggle');
    if (gyroBtn) {
      gyroBtn.addEventListener('click', toggleGyro);
      gyroBtn.addEventListener('touchstart', toggleGyro, { passive: false });
    }
    const gameGyroBtn = document.getElementById('gameGyroBtn');
    if (gameGyroBtn) {
      gameGyroBtn.addEventListener('click', toggleGyro);
      gameGyroBtn.addEventListener('touchstart', toggleGyro, { passive: false });
    }

    // View Mode Toggle (Chase Cam vs Pilot Cockpit View)
    const toggleView = (e) => {
      if (e) e.preventDefault();
      const mode = this.app.toggleViewMode();
      this.updateViewModeUI(mode);
    };

    const menuViewBtn = document.getElementById('menuViewModeBtn');
    if (menuViewBtn) {
      menuViewBtn.addEventListener('click', toggleView);
      menuViewBtn.addEventListener('touchstart', toggleView, { passive: false });
    }
    const gameViewBtn = document.getElementById('gameViewModeBtn');
    if (gameViewBtn) {
      gameViewBtn.addEventListener('click', toggleView);
      gameViewBtn.addEventListener('touchstart', toggleView, { passive: false });
    }

    // 3D Viewing Guide Drawer
    const helpBtn = document.getElementById('helpBtn');
    const closeInfoBtn = document.getElementById('closeInfoBtn');

    const openDrawer = (e) => {
      if (e) e.preventDefault();
      if (this.infoDrawer) {
        this.infoDrawer.classList.remove('hidden');
        this.infoDrawer.style.display = 'block';
        this.infoDrawer.style.opacity = '1';
        this.infoDrawer.style.pointerEvents = 'auto';
      }
    };

    const closeDrawer = (e) => {
      if (e) e.preventDefault();
      if (this.infoDrawer) {
        this.infoDrawer.classList.add('hidden');
        this.infoDrawer.style.display = 'none';
        this.infoDrawer.style.opacity = '0';
        this.infoDrawer.style.pointerEvents = 'none';
      }
    };

    if (helpBtn) {
      helpBtn.addEventListener('click', openDrawer);
      helpBtn.addEventListener('touchstart', openDrawer, { passive: false });
    }

    if (closeInfoBtn) {
      closeInfoBtn.addEventListener('click', closeDrawer);
      closeInfoBtn.addEventListener('touchstart', closeDrawer, { passive: false });
    }

    // 3D Stereo Mode Selectors
    const modeBtns = document.querySelectorAll('.mode-btn');
    modeBtns.forEach(btn => {
      const switchMode = (e) => {
        if (e) e.preventDefault();
        modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const selectedMode = btn.dataset.mode;
        
        const hudRight = document.getElementById('hudBlockRight');
        if (hudRight) {
          if (selectedMode === 'parallel' || selectedMode === 'cross') {
            hudRight.classList.remove('hidden');
          } else {
            hudRight.classList.add('hidden');
          }
        }

        this.app.renderer.setMode(selectedMode);
        this.saveSettings();
      };
      btn.addEventListener('click', switchMode);
      btn.addEventListener('touchstart', switchMode, { passive: false });
    });
  }

  bindSliders() {
    // Eye Distance (IPD) Slider
    const eyeSlider = document.getElementById('eyeDistSlider');
    const eyeVal = document.getElementById('eyeDistVal');
    if (eyeSlider) {
      eyeSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (eyeVal) eyeVal.textContent = val.toFixed(3);
        this.app.renderer.setEyeDistance(val);
        this.saveSettings();
      });
    }

    // Focal Length (Convergence) Slider
    const focalSlider = document.getElementById('focalSlider');
    const focalVal = document.getElementById('focalVal');
    if (focalSlider) {
      focalSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (focalVal) focalVal.textContent = val.toFixed(1);
        this.app.renderer.setFocalLength(val);
        this.saveSettings();
      });
    }

    // Eye Swap Toggle Button
    const swapBtn = document.getElementById('swapEyesBtn');
    if (swapBtn) {
      const toggleSwap = (e) => {
        if (e) e.preventDefault();
        this.app.renderer.swapEyes = !this.app.renderer.swapEyes;
        swapBtn.classList.toggle('active');
        this.saveSettings();
      };
      swapBtn.addEventListener('click', toggleSwap);
      swapBtn.addEventListener('touchstart', toggleSwap, { passive: false });
    }
  }

  resetHighScore() {
    console.log('[UIManager v4.0.0] High score reset by user.');
    localStorage.removeItem('tunnel_rush_highscore');
    this.highScore = 0;
    this.app.hud3d.updateHighScore(0);
  }

  showMenuPage() {
    if (this.gamePage) this.gamePage.classList.add('hidden');
    if (this.menuPage) this.menuPage.classList.remove('hidden');
    this.hideAllModals();
  }

  showGamePage() {
    if (this.menuPage) this.menuPage.classList.add('hidden');
    if (this.gamePage) this.gamePage.classList.remove('hidden');
    this.hideAllModals();
  }

  hideAllModals() {
    [this.pauseScreen, this.gameOverScreen].forEach(scr => {
      if (scr) {
        scr.classList.add('hidden');
        scr.style.display = 'none';
        scr.style.opacity = '0';
        scr.style.pointerEvents = 'none';
      }
    });
  }

  togglePauseScreen(isPaused) {
    if (isPaused) {
      if (this.pauseScreen) {
        this.pauseScreen.classList.remove('hidden');
        this.pauseScreen.style.display = 'flex';
        this.pauseScreen.style.opacity = '1';
        this.pauseScreen.style.pointerEvents = 'auto';
      }
    } else {
      if (this.pauseScreen) {
        this.pauseScreen.classList.add('hidden');
        this.pauseScreen.style.display = 'none';
        this.pauseScreen.style.opacity = '0';
        this.pauseScreen.style.pointerEvents = 'none';
      }
    }
  }

  showGameOver(finalScore, distance) {
    if (finalScore > this.highScore) {
      this.highScore = finalScore;
      localStorage.setItem('tunnel_rush_highscore', this.highScore.toString());
      this.app.hud3d.updateHighScore(this.highScore);
    }

    const finalScoreEl = document.getElementById('finalScore');
    const finalDistEl = document.getElementById('finalDistance');
    if (finalScoreEl) finalScoreEl.textContent = finalScore;
    if (finalDistEl) finalDistEl.textContent = Math.round(distance) + 'm';
    
    if (this.gameOverScreen) {
      this.gameOverScreen.classList.remove('hidden');
      this.gameOverScreen.style.display = 'flex';
      this.gameOverScreen.style.opacity = '1';
      this.gameOverScreen.style.pointerEvents = 'auto';
    }
  }

  updateSolidBlockHUD(score, distance, speedStr, shieldStr, multStr, lives, levelStr) {
    const scoreStr = score.toString().padStart(6, '0');
    const distStr = Math.round(distance) + 'm';
    const livesStr = '❤️'.repeat(Math.max(0, lives));

    // Left Eye / Single HUD Block
    const scoreEl = document.getElementById('hudScoreVal');
    const distEl = document.getElementById('hudDistVal');
    const speedEl = document.getElementById('hudSpeedVal');
    const shieldEl = document.getElementById('hudShieldVal');
    const multEl = document.getElementById('hudMultVal');
    const livesEl = document.getElementById('hudLivesVal');
    const levelEl = document.getElementById('hudLevelVal');

    if (scoreEl) scoreEl.textContent = scoreStr;
    if (distEl) distEl.textContent = distStr;
    if (speedEl) speedEl.textContent = speedStr;
    if (shieldEl) shieldEl.textContent = shieldStr;
    if (multEl) multEl.textContent = multStr;
    if (livesEl) livesEl.textContent = livesStr;
    if (levelEl) levelEl.textContent = levelStr;

    // Right Eye HUD Block (for 0-Parallax 3D Stereo)
    const scoreElR = document.getElementById('hudScoreValR');
    const distElR = document.getElementById('hudDistValR');
    const speedElR = document.getElementById('hudSpeedValR');
    const shieldElR = document.getElementById('hudShieldValR');
    const multElR = document.getElementById('hudMultValR');
    const livesElR = document.getElementById('hudLivesValR');
    const levelElR = document.getElementById('hudLevelValR');

    if (scoreElR) scoreElR.textContent = scoreStr;
    if (distElR) distElR.textContent = distStr;
    if (speedElR) speedElR.textContent = speedStr;
    if (shieldElR) shieldElR.textContent = shieldStr;
    if (multElR) multElR.textContent = multStr;
    if (livesElR) livesElR.textContent = livesStr;
    if (levelElR) levelElR.textContent = levelStr;
  }

  updateViewModeUI(mode) {
    const text = (mode === 'COCKPIT') ? '🧑‍✈️ View: Cockpit' : '🎥 View: Chase';
    const btn1 = document.getElementById('menuViewModeBtn');
    const btn2 = document.getElementById('gameViewModeBtn');
    if (btn1) {
      btn1.textContent = text;
      if (mode === 'COCKPIT') btn1.classList.add('active');
      else btn1.classList.remove('active');
    }
    if (btn2) {
      btn2.title = (mode === 'COCKPIT') ? 'View: Cockpit' : 'View: Chase';
      if (mode === 'COCKPIT') btn2.classList.add('active');
      else btn2.classList.remove('active');
    }
    this.saveSettings();
  }

  saveSettings() {
    try {
      const settings = {
        mode: this.app.renderer.mode,
        eyeDistance: this.app.renderer.eyeDistance,
        focalLength: this.app.renderer.focalLength,
        swapEyes: !!this.app.renderer.swapEyes,
        viewMode: this.app.viewMode,
        soundMuted: !!this.app.audio.muted,
        gyroEnabled: !!(this.app.controls && this.app.controls.gyroEnabled),
        userSpeed: this.app.player ? this.app.player.baseSpeed : 0.075
      };
      localStorage.setItem('3d_tunnel_rush_settings', JSON.stringify(settings));
    } catch (e) {
      console.warn('[UIManager] Failed to save settings:', e);
    }
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem('3d_tunnel_rush_settings');
      if (!saved) return;
      const settings = JSON.parse(saved);

      // 1. Stereo Mode (2d / parallel / cross / anaglyph)
      if (settings.mode) {
        const modeBtns = document.querySelectorAll('.mode-btn');
        modeBtns.forEach(btn => {
          if (btn.dataset.mode === settings.mode) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        });
        this.app.renderer.setMode(settings.mode);
      }

      // 2. Eye Distance Slider (IPD)
      if (settings.eyeDistance !== undefined) {
        const eyeSlider = document.getElementById('eyeDistSlider');
        const eyeVal = document.getElementById('eyeDistVal');
        if (eyeSlider) eyeSlider.value = settings.eyeDistance;
        if (eyeVal) eyeVal.textContent = parseFloat(settings.eyeDistance).toFixed(3);
        this.app.renderer.setEyeDistance(settings.eyeDistance);
      }

      // 3. Focal Length Slider
      if (settings.focalLength !== undefined) {
        const focalSlider = document.getElementById('focalSlider');
        const focalVal = document.getElementById('focalVal');
        if (focalSlider) focalSlider.value = settings.focalLength;
        if (focalVal) focalVal.textContent = parseFloat(settings.focalLength).toFixed(1);
        this.app.renderer.setFocalLength(settings.focalLength);
      }

      // 4. Swap Eyes Toggle
      if (settings.swapEyes !== undefined) {
        this.app.renderer.swapEyes = settings.swapEyes;
        const swapBtn = document.getElementById('swapEyesBtn');
        if (swapBtn) {
          if (settings.swapEyes) swapBtn.classList.add('active');
          else swapBtn.classList.remove('active');
        }
      }

      // 5. View Mode (CHASE / COCKPIT)
      if (settings.viewMode) {
        this.app.viewMode = settings.viewMode;
        this.updateViewModeUI(settings.viewMode);
      }

      // 6. Sound Muted State
      if (settings.soundMuted !== undefined && this.app.audio.muted !== settings.soundMuted) {
        const isMuted = this.app.audio.toggleMute();
        const btn1 = document.getElementById('audioToggle');
        const btn2 = document.getElementById('gameAudioBtn');
        if (btn1) btn1.textContent = isMuted ? '🔇 Muted' : '🔊 Sound';
        if (btn2) {
          btn2.textContent = isMuted ? '🔇' : '🔊';
          btn2.title = isMuted ? 'Sound: Muted' : 'Sound: ON';
          if (isMuted) btn2.classList.add('active');
          else btn2.classList.remove('active');
        }
      }

      // 7. Flight Base Speed
      if (settings.userSpeed !== undefined && this.app.player) {
        this.app.player.setUserSpeed(settings.userSpeed);
      }

      console.log('[UIManager] Restored persistent settings:', settings);
    } catch (e) {
      console.warn('[UIManager] Failed to load settings:', e);
    }
  }
}
