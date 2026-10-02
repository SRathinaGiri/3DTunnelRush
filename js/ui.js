/* ==========================================================================
   3D TUNNEL RUSH - USER INTERFACE & STATE MANAGER
   Version: v3.3.0
   ========================================================================== */

export class UIManager {
  constructor(gameApp) {
    this.app = gameApp;

    // UI Elements
    this.startScreen = document.getElementById('startScreen');
    this.pauseScreen = document.getElementById('pauseScreen');
    this.gameOverScreen = document.getElementById('gameOverScreen');
    this.infoDrawer = document.getElementById('infoDrawer');

    this.highScore = parseInt(localStorage.getItem('tunnel_rush_highscore') || '0', 10);

    this.bindControls();
    this.bindSliders();
  }

  bindAction(elementId, actionFn) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const handler = (e) => {
      if (e) e.preventDefault();
      actionFn();
    };

    el.addEventListener('click', handler);
    el.addEventListener('touchstart', handler, { passive: false });
  }

  bindControls() {
    // Header Control Buttons
    this.bindAction('headerStartBtn', () => this.app.startGame());
    this.bindAction('headerPauseBtn', () => this.app.togglePause());
    this.bindAction('headerStopBtn', () => this.app.stopGame());
    this.bindAction('headerRestartBtn', () => this.app.restartGame());
    this.bindAction('resetHighScoreBtn', () => this.resetHighScore());

    // Modal Buttons
    this.bindAction('startBtn', () => this.app.startGame());
    this.bindAction('restartBtn', () => this.app.restartGame());
    this.bindAction('resumeBtn', () => this.app.togglePause());

    // Sound Mute Toggle
    const audioBtn = document.getElementById('audioToggle');
    if (audioBtn) {
      const toggleAudio = (e) => {
        if (e) e.preventDefault();
        const isMuted = this.app.audio.toggleMute();
        audioBtn.textContent = isMuted ? '🔇 Muted' : '🔊 Sound';
      };
      audioBtn.addEventListener('click', toggleAudio);
      audioBtn.addEventListener('touchstart', toggleAudio, { passive: false });
    }

    // Mobile Gyroscope Toggle Button
    const gyroBtn = document.getElementById('gyroToggle');
    const gyroBadge = document.getElementById('gyroBadge');
    if (gyroBtn) {
      const toggleGyro = (e) => {
        if (e) e.preventDefault();
        this.app.controls.toggleGyroscope((enabled) => {
          if (gyroBadge) gyroBadge.textContent = enabled ? 'Gyro: ON' : 'Gyro: OFF';
          if (enabled) gyroBtn.classList.add('active');
          else gyroBtn.classList.remove('active');
        });
      };
      gyroBtn.addEventListener('click', toggleGyro);
      gyroBtn.addEventListener('touchstart', toggleGyro, { passive: false });
    }

    // Theme Badge Display (Auto Level Theme Progression)
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
      const showThemeInfo = (e) => {
        if (e) e.preventDefault();
        const currentLevel = (this.app.player && this.app.player.level) || 1;
        const themeName = this.app.tunnel.currentTheme.name;
        const themeBadge = document.getElementById('themeBadge');
        if (themeBadge) themeBadge.textContent = `L${currentLevel}: ${themeName}`;
      };
      themeBtn.addEventListener('click', showThemeInfo);
      themeBtn.addEventListener('touchstart', showThemeInfo, { passive: false });
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
        this.app.renderer.setMode(selectedMode);
      };
      btn.addEventListener('click', switchMode);
      btn.addEventListener('touchstart', switchMode, { passive: false });
    });

    // Mobile Virtual Keypad Toggle
    const vkToggleBtn = document.getElementById('vkToggle');
    const keypadEl = document.getElementById('virtualKeypad');
    if (vkToggleBtn && keypadEl) {
      const toggleVK = (e) => {
        if (e) e.preventDefault();
        keypadEl.classList.toggle('hidden-keypad');
      };
      vkToggleBtn.addEventListener('click', toggleVK);
      vkToggleBtn.addEventListener('touchstart', toggleVK, { passive: false });
    }
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
      });
    }

    // Game Speed Slider
    const speedSlider = document.getElementById('speedSlider');
    const speedSettingVal = document.getElementById('speedSettingVal');
    if (speedSlider) {
      speedSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (speedSettingVal) speedSettingVal.textContent = val.toFixed(2);
        this.app.player.setUserSpeed(val);
      });
    }

    // Eye Swap Toggle Button
    const swapBtn = document.getElementById('swapEyesBtn');
    if (swapBtn) {
      const toggleSwap = (e) => {
        if (e) e.preventDefault();
        this.app.renderer.swapEyes = !this.app.renderer.swapEyes;
        swapBtn.classList.toggle('active');
      };
      swapBtn.addEventListener('click', toggleSwap);
      swapBtn.addEventListener('touchstart', toggleSwap, { passive: false });
    }
  }

  resetHighScore() {
    console.log('[UIManager v2.4.0] High score reset by user.');
    localStorage.removeItem('tunnel_rush_highscore');
    this.highScore = 0;
    this.app.hud3d.updateHighScore(0);
  }

  showStartScreen() {
    this.hideAllScreens();
    if (this.startScreen) {
      this.startScreen.classList.remove('hidden');
      this.startScreen.style.display = 'flex';
      this.startScreen.style.opacity = '1';
      this.startScreen.style.pointerEvents = 'auto';
    }
  }

  hideAllScreens() {
    [this.startScreen, this.pauseScreen, this.gameOverScreen].forEach(scr => {
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

    document.getElementById('finalScore').textContent = finalScore;
    document.getElementById('finalDistance').textContent = Math.round(distance) + 'm';
    
    if (this.gameOverScreen) {
      this.gameOverScreen.classList.remove('hidden');
      this.gameOverScreen.style.display = 'flex';
      this.gameOverScreen.style.opacity = '1';
      this.gameOverScreen.style.pointerEvents = 'auto';
    }
  }
}
