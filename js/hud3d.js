/* ==========================================================================
   3D TUNNEL RUSH - 100% SCENE-BASED STEREOSCOPIC 3D HUD ENGINE
   Version: v4.13.0
   ========================================================================== */

export class HUD3DEngine {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;

    // HUD Group attached to camera space
    this.hudGroup = new THREE.Group();
    this.scene.add(this.hudGroup);

    // 3D Sprites for stereo rendering
    this.topHudSprite = null;
    this.highScoreSprite = null;
    this.centerBannerSprite = null;
    this.boostNoticeSprite = null;

    this.highScore = parseInt(localStorage.getItem('tunnel_rush_highscore') || '0', 10);

    this.initHUD();
    this.initCockpitFrame();
  }

  createCanvasSprite(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    const mat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });

    const sprite = new THREE.Sprite(mat);
    sprite.userData = { canvas, ctx: canvas.getContext('2d'), texture };
    return sprite;
  }

  initHUD() {
    // 1. High Score Banner (Positioned at top of viewport during menus/warmup)
    this.highScoreSprite = this.createCanvasSprite(400, 60);
    this.highScoreSprite.scale.set(1.8, 0.27, 1);
    this.highScoreSprite.position.set(0, 1.70, -3.5);
    this.highScoreSprite.visible = false;
    this.hudGroup.add(this.highScoreSprite);

    // 2. Energy Boost Notification (Center High)
    this.boostNoticeSprite = this.createCanvasSprite(500, 70);
    this.boostNoticeSprite.scale.set(2.6, 0.364, 1);
    this.boostNoticeSprite.position.set(0, 0.85, -3.5);
    this.boostNoticeSprite.visible = false;
    this.hudGroup.add(this.boostNoticeSprite);

    // 3. Center Banner (Countdown, Pause, Game Over)
    this.centerBannerSprite = this.createCanvasSprite(500, 200);
    this.centerBannerSprite.scale.set(2.8, 1.12, 1);
    this.centerBannerSprite.position.set(0, 0, -3.5);
    this.hudGroup.add(this.centerBannerSprite);

    this.updateHUD(0, 0, '40 km/h', '100%', 'x1', 3, 0);
    this.updateHighScore(this.highScore);
    this.hideCenterBanner();
  }

  initCockpitFrame() {
    this.cockpitGroup = new THREE.Group();
    this.hudGroup.add(this.cockpitGroup);

    // 1. Cockpit Glass Aura Rim (Glows Red on mine hit, Green on crystal collect at Z = -7.02)
    const auraRimGeo = new THREE.RingGeometry(2.5, 3.5, 32);
    this.cockpitAuraMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.0,
      depthTest: false,
      depthWrite: false
    });
    this.cockpitAuraMesh = new THREE.Mesh(auraRimGeo, this.cockpitAuraMat);
    this.cockpitAuraMesh.position.set(0, 0, -7.02);
    this.cockpitGroup.add(this.cockpitAuraMesh);

    // 2. Cockpit View Reticle & Speedometer HUD positioned at exact flight depth in scene (Z = -7.0)
    this.cockpitHudSprite = this.createCanvasSprite(400, 200);
    this.cockpitHudSprite.scale.set(5.0, 2.5, 1);
    this.cockpitHudSprite.position.set(0, -0.50, -7.0);
    this.cockpitGroup.add(this.cockpitHudSprite);

    this.cockpitAuraTimer = 0;
    this.cockpitAuraMaxDuration = 1.0;
    this.isCockpitView = false;
    this.cockpitGroup.visible = false;
  }

  renderCockpitTelemetry(speedStr, shieldStr, distStr) {
    this.renderCockpitHud();
  }

  setCockpitVisible(visible) {
    this.isCockpitView = visible;
    if (this.cockpitGroup) {
      this.cockpitGroup.visible = visible;
    }
  }

  triggerCockpitAura(hexColor, durationSec = 1.0) {
    if (!this.cockpitAuraMat) return;
    this.cockpitAuraMat.color.setHex(hexColor);
    this.cockpitAuraTimer = durationSec;
    this.cockpitAuraMaxDuration = durationSec;
    this.cockpitAuraMat.opacity = 0.90;
  }

  updateCameraTransform(camera, delta = 0.016) {
    // Always anchor HUD transform to mainCamera to maintain crossed front-of-screen stereo parallax
    const targetCam = (window.app && window.app.renderer && window.app.renderer.mainCamera) ? window.app.renderer.mainCamera : camera;
    this.hudGroup.position.copy(targetCam.position);
    this.hudGroup.quaternion.copy(targetCam.quaternion);

    if (this.cockpitAuraTimer > 0) {
      this.cockpitAuraTimer -= delta;
      const progress = Math.max(0, this.cockpitAuraTimer / (this.cockpitAuraMaxDuration || 1.0));
      if (this.cockpitAuraMat) {
        this.cockpitAuraMat.opacity = progress * 0.90;
      }
    }
  }

  // Backward compatibility alias for single updates
  updateScore(score, dist) {
    this.currentScore = score;
    this.currentDist = dist;
    this.renderBottomHud();
  }

  updateStats(speedStr, shieldStr, multStr) {
    this.currentSpeedStr = speedStr;
    this.currentShieldStr = shieldStr;
    this.currentMultStr = multStr;
    this.renderBottomHud();
  }

  updateHUD(score, dist, speedStr, shieldStr, multStr, lives, gemsForExtraLife) {
    const roundedDist = Math.round(dist || 0);
    const hudKey = `${score}_${roundedDist}_${speedStr}_${shieldStr}_${multStr}_${lives}_${gemsForExtraLife}_${this.isCockpitView}`;
    if (this.lastHudKey === hudKey) return;
    this.lastHudKey = hudKey;

    this.currentScore = score;
    this.currentDist = dist;
    this.currentSpeedStr = speedStr;
    this.currentShieldStr = shieldStr;
    this.currentMultStr = multStr;
    this.currentLives = lives !== undefined ? lives : 3;
    this.currentGemsForExtraLife = gemsForExtraLife || 0;

    // Render Chase View flight telemetry strip (attached directly below the player ship)
    if (window.app && window.app.player && window.app.player.shipHudSprite) {
      this.renderTelemetryStrip(window.app.player.shipHudSprite);
    }

    // Render Cockpit View reticle + speedometer HUD
    this.renderCockpitHud();
  }

  renderTopHud() {
    this.renderBottomHud();
  }

  renderBottomHud() {
    if (window.app && window.app.player && window.app.player.shipHudSprite) {
      this.renderTelemetryStrip(window.app.player.shipHudSprite);
    }
    this.renderCockpitHud();
  }

  renderTelemetryStrip(sprite) {
    if (!sprite) return;
    const obj = sprite.userData;
    const ctx = obj.ctx;
    ctx.clearRect(0, 0, 400, 50);

    // Sleek 90% Opaque Dark Background Container
    ctx.fillStyle = 'rgba(2, 6, 23, 0.90)';
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.65)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(8, 5, 384, 40, 18);
    ctx.fill();
    ctx.stroke();

    // Subtle Vertical Column Separators (3 dividers for 4 columns)
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(105, 10); ctx.lineTo(105, 40);
    ctx.moveTo(200, 10); ctx.lineTo(200, 40);
    ctx.moveTo(295, 10); ctx.lineTo(295, 40);
    ctx.stroke();

    ctx.shadowBlur = 4;

    // 1. KPI 1: SPEED (Center X = 57)
    ctx.shadowColor = 'rgba(0, 240, 255, 0.8)';
    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    const cleanSpeed = (this.currentSpeedStr || '40 km/h').toLowerCase();
    ctx.fillText(cleanSpeed, 57, 32);

    // 2. KPI 2: HEARTS / LIVES (Center X = 152)
    ctx.shadowColor = 'rgba(239, 68, 68, 0.8)';
    const lives = this.currentLives !== undefined ? this.currentLives : 3;
    let heartsText = '';
    if (lives >= 3) heartsText = '❤️ ❤️ ❤️';
    else if (lives === 2) heartsText = '❤️ ❤️ 🖤';
    else if (lives === 1) heartsText = '❤️ 🖤 🖤';
    else heartsText = '🖤 🖤 🖤';

    ctx.fillStyle = '#ff0055';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(heartsText, 152, 32);

    // 3. KPI 3: ENERGY LEVEL % (Center X = 247)
    const rawShield = parseInt(this.currentShieldStr || '100', 10);
    const energyVal = isNaN(rawShield) ? 100 : rawShield;
    let energyColor = '#22c55e'; // Green
    let energyGlow = 'rgba(34, 197, 94, 0.8)';
    if (energyVal <= 30) {
      energyColor = '#ef4444'; // Red
      energyGlow = 'rgba(239, 68, 68, 0.8)';
    } else if (energyVal <= 60) {
      energyColor = '#f59e0b'; // Yellow
      energyGlow = 'rgba(245, 158, 11, 0.8)';
    }

    ctx.shadowColor = energyGlow;
    ctx.fillStyle = energyColor;
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText((this.currentShieldStr || '100%'), 247, 32);

    // 4. KPI 4: DISTANCE IN METERS (Center X = 343)
    ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    const distText = Math.round(this.currentDist || 0) + ' m';
    ctx.fillText(distText, 343, 32);

    ctx.shadowBlur = 0;
    obj.texture.needsUpdate = true;
  }

  renderCockpitHud() {
    if (!this.cockpitHudSprite) return;
    const obj = this.cockpitHudSprite.userData;
    const ctx = obj.ctx;
    ctx.clearRect(0, 0, 400, 200);

    // Top Section: 50% Transparent Cockpit Sightline Reticle Box & Crosshair
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.50)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(140, 10, 120, 70, 10);
    ctx.stroke();

    // Corner Bracket Accent Ticks (50% transparent)
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.50)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(130, 25); ctx.lineTo(130, 5); ctx.lineTo(155, 5);
    ctx.moveTo(270, 25); ctx.lineTo(270, 5); ctx.lineTo(245, 5);
    ctx.moveTo(130, 65); ctx.lineTo(130, 85); ctx.lineTo(155, 85);
    ctx.moveTo(270, 65); ctx.lineTo(270, 85); ctx.lineTo(245, 85);
    ctx.stroke();

    // Crosshair Ticks (50% transparent)
    ctx.strokeStyle = 'rgba(236, 72, 153, 0.50)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(200, 25); ctx.lineTo(200, 40);
    ctx.moveTo(200, 50); ctx.lineTo(200, 65);
    ctx.moveTo(165, 45); ctx.lineTo(185, 45);
    ctx.moveTo(215, 45); ctx.lineTo(235, 45);
    ctx.stroke();

    // Bottom Section: 90% Opaque 4-KPI Telemetry Strip
    ctx.fillStyle = 'rgba(2, 6, 23, 0.90)';
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.65)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(10, 130, 380, 48, 18);
    ctx.fill();
    ctx.stroke();

    // Vertical Separators
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(105, 136); ctx.lineTo(105, 172);
    ctx.moveTo(200, 136); ctx.lineTo(200, 172);
    ctx.moveTo(295, 136); ctx.lineTo(295, 172);
    ctx.stroke();

    ctx.shadowBlur = 4;

    // 1. SPEED (Center X = 57)
    ctx.shadowColor = 'rgba(0, 240, 255, 0.8)';
    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    const cleanSpeed = (this.currentSpeedStr || '40 km/h').toLowerCase();
    ctx.fillText(cleanSpeed, 57, 162);

    // 2. HEARTS / LIVES (Center X = 152)
    ctx.shadowColor = 'rgba(239, 68, 68, 0.8)';
    const lives = this.currentLives !== undefined ? this.currentLives : 3;
    let heartsText = '';
    if (lives >= 3) heartsText = '❤️ ❤️ ❤️';
    else if (lives === 2) heartsText = '❤️ ❤️ 🖤';
    else if (lives === 1) heartsText = '❤️ 🖤 🖤';
    else heartsText = '🖤 🖤 🖤';

    ctx.fillStyle = '#ff0055';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(heartsText, 152, 162);

    // 3. ENERGY LEVEL % (Center X = 247)
    const rawShield = parseInt(this.currentShieldStr || '100', 10);
    const energyVal = isNaN(rawShield) ? 100 : rawShield;
    let energyColor = '#22c55e';
    let energyGlow = 'rgba(34, 197, 94, 0.8)';
    if (energyVal <= 30) {
      energyColor = '#ef4444';
      energyGlow = 'rgba(239, 68, 68, 0.8)';
    } else if (energyVal <= 60) {
      energyColor = '#f59e0b';
      energyGlow = 'rgba(245, 158, 11, 0.8)';
    }

    ctx.shadowColor = energyGlow;
    ctx.fillStyle = energyColor;
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText((this.currentShieldStr || '100%'), 247, 162);

    // 4. DISTANCE (Center X = 343)
    ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    const distText = Math.round(this.currentDist || 0) + ' m';
    ctx.fillText(distText, 343, 162);

    ctx.shadowBlur = 0;
    obj.texture.needsUpdate = true;
  }

  updateHighScore(val) {
    this.highScore = val;
    const obj = this.highScoreSprite.userData;
    obj.ctx.clearRect(0, 0, 400, 60);

    obj.ctx.fillStyle = 'rgba(2, 6, 23, 0.30)';
    obj.ctx.strokeStyle = '#f59e0b';
    obj.ctx.lineWidth = 2.5;
    obj.ctx.beginPath();
    obj.ctx.roundRect(6, 6, 388, 48, 12);
    obj.ctx.fill();
    obj.ctx.stroke();

    obj.ctx.shadowColor = 'rgba(245, 158, 11, 0.7)';
    obj.ctx.shadowBlur = 6;

    obj.ctx.textAlign = 'center';
    obj.ctx.fillStyle = '#f59e0b';
    obj.ctx.font = 'bold 17px sans-serif';
    obj.ctx.fillText('🏆 HIGH SCORE: ' + val, 200, 36);

    obj.ctx.shadowBlur = 0;
    obj.texture.needsUpdate = true;
  }

  showEnergyBoostNotice(remainingSec) {
    const secStr = remainingSec.toFixed(1);
    if (this.lastBoostSecStr === secStr && this.boostNoticeSprite.visible) return;
    this.lastBoostSecStr = secStr;

    const obj = this.boostNoticeSprite.userData;
    obj.userData.isEnergyBoost = true;
    obj.ctx.clearRect(0, 0, 500, 70);

    obj.ctx.fillStyle = 'rgba(2, 6, 23, 0.35)';
    obj.ctx.strokeStyle = '#f59e0b';
    obj.ctx.lineWidth = 2.5;
    obj.ctx.beginPath();
    obj.ctx.roundRect(8, 8, 484, 54, 12);
    obj.ctx.fill();
    obj.ctx.stroke();

    obj.ctx.shadowColor = 'rgba(245, 158, 11, 0.8)';
    obj.ctx.shadowBlur = 8;

    obj.ctx.textAlign = 'center';
    obj.ctx.fillStyle = '#f59e0b';
    obj.ctx.font = 'bold 20px sans-serif';
    obj.ctx.fillText(`⚡ ENERGY BOOST! 2X SCORE (${secStr}s) ⚡`, 250, 42);

    obj.ctx.shadowBlur = 0;
    obj.texture.needsUpdate = true;
    this.boostNoticeSprite.visible = true;
  }

  hideEnergyBoostNotice() {
    this.lastBoostSecStr = '';
    this.boostNoticeSprite.userData.isEnergyBoost = false;
    this.boostNoticeSprite.visible = false;
  }

  showExtraLifeNotice() {
    const obj = this.boostNoticeSprite.userData;
    obj.userData.isEnergyBoost = false;
    obj.ctx.clearRect(0, 0, 500, 70);

    obj.ctx.fillStyle = 'rgba(2, 6, 23, 0.40)';
    obj.ctx.strokeStyle = '#22c55e';
    obj.ctx.lineWidth = 3;
    obj.ctx.beginPath();
    obj.ctx.roundRect(8, 8, 484, 54, 12);
    obj.ctx.fill();
    obj.ctx.stroke();

    obj.ctx.shadowColor = 'rgba(34, 197, 94, 0.8)';
    obj.ctx.shadowBlur = 8;

    obj.ctx.textAlign = 'center';
    obj.ctx.fillStyle = '#22c55e';
    obj.ctx.font = 'bold 20px sans-serif';
    obj.ctx.fillText('💚 EXTRA LIFE GAINED! (+1 LIFE) 💚', 250, 42);

    obj.ctx.shadowBlur = 0;
    obj.texture.needsUpdate = true;
    this.boostNoticeSprite.visible = true;

    if (this.extraLifeTimeout) clearTimeout(this.extraLifeTimeout);
    this.extraLifeTimeout = setTimeout(() => {
      this.boostNoticeSprite.visible = false;
    }, 2500);
  }

  showLevelUpNotice(level, themeName) {
    const obj = this.boostNoticeSprite.userData;
    obj.userData.isEnergyBoost = false;
    obj.ctx.clearRect(0, 0, 500, 70);

    obj.ctx.fillStyle = 'rgba(2, 6, 23, 0.45)';
    obj.ctx.strokeStyle = '#00f0ff';
    obj.ctx.lineWidth = 3;
    obj.ctx.beginPath();
    obj.ctx.roundRect(8, 8, 484, 54, 12);
    obj.ctx.fill();
    obj.ctx.stroke();

    obj.ctx.shadowColor = 'rgba(0, 240, 255, 0.9)';
    obj.ctx.shadowBlur = 10;

    obj.ctx.textAlign = 'center';
    obj.ctx.fillStyle = '#00f0ff';
    obj.ctx.font = 'bold 15px sans-serif';
    obj.ctx.fillText(`🎢 ROLLER COASTER WARP! 🎢`, 250, 28);

    obj.ctx.fillStyle = '#f59e0b';
    obj.ctx.font = 'bold 18px sans-serif';
    obj.ctx.fillText(`🚀 LEVEL ${level}: ${(themeName || '').toUpperCase()} 🚀`, 250, 50);

    obj.ctx.shadowBlur = 0;
    obj.texture.needsUpdate = true;
    this.boostNoticeSprite.visible = true;

    if (this.levelUpTimeout) clearTimeout(this.levelUpTimeout);
    this.levelUpTimeout = setTimeout(() => {
      this.boostNoticeSprite.visible = false;
    }, 3500);
  }

  showCountdown(numberStr) {
    const obj = this.centerBannerSprite.userData;
    obj.ctx.clearRect(0, 0, 500, 200);

    obj.ctx.fillStyle = 'rgba(2, 6, 23, 0.35)';
    obj.ctx.strokeStyle = '#00f0ff';
    obj.ctx.lineWidth = 3;
    obj.ctx.beginPath();
    obj.ctx.roundRect(10, 10, 480, 180, 18);
    obj.ctx.fill();
    obj.ctx.stroke();

    obj.ctx.shadowColor = 'rgba(0, 240, 255, 0.8)';
    obj.ctx.shadowBlur = 8;

    obj.ctx.textAlign = 'center';
    obj.ctx.fillStyle = '#00f0ff';
    obj.ctx.font = 'bold 20px sans-serif';
    obj.ctx.fillText('👁️ ALIGN YOUR EYES FOR 3D 👁️', 250, 48);

    obj.ctx.fillStyle = '#ffffff';
    obj.ctx.font = 'bold 56px monospace';
    obj.ctx.fillText(numberStr, 250, 118);

    obj.ctx.fillStyle = '#f59e0b';
    obj.ctx.font = 'bold 16px sans-serif';
    obj.ctx.fillText(`🏆 HIGH SCORE TO BEAT: ${this.highScore}`, 250, 162);

    obj.ctx.shadowBlur = 0;
    obj.texture.needsUpdate = true;
    this.centerBannerSprite.visible = true;
  }

  showPauseBanner() {
    const obj = this.centerBannerSprite.userData;
    obj.ctx.clearRect(0, 0, 500, 200);

    obj.ctx.fillStyle = 'rgba(2, 6, 23, 0.35)';
    obj.ctx.strokeStyle = '#a855f7';
    obj.ctx.lineWidth = 3;
    obj.ctx.beginPath();
    obj.ctx.roundRect(10, 10, 480, 180, 18);
    obj.ctx.fill();
    obj.ctx.stroke();

    obj.ctx.shadowColor = 'rgba(168, 85, 247, 0.8)';
    obj.ctx.shadowBlur = 8;

    obj.ctx.textAlign = 'center';
    obj.ctx.fillStyle = '#ffffff';
    obj.ctx.font = 'bold 36px sans-serif';
    obj.ctx.fillText('⏸️ GAME PAUSED', 250, 95);

    obj.ctx.fillStyle = '#f59e0b';
    obj.ctx.font = 'bold 18px sans-serif';
    obj.ctx.fillText(`🏆 HIGH SCORE: ${this.highScore}`, 250, 150);

    obj.ctx.shadowBlur = 0;
    obj.texture.needsUpdate = true;
    this.centerBannerSprite.visible = true;
  }

  showGameOverBanner(finalScore, distance) {
    const obj = this.centerBannerSprite.userData;
    obj.ctx.clearRect(0, 0, 500, 200);

    const isNewHigh = finalScore > this.highScore && finalScore > 0;
    if (isNewHigh) {
      this.highScore = finalScore;
      localStorage.setItem('tunnel_rush_highscore', finalScore.toString());
    }

    obj.ctx.fillStyle = 'rgba(2, 6, 23, 0.40)';
    obj.ctx.strokeStyle = '#ec4899';
    obj.ctx.lineWidth = 3;
    obj.ctx.beginPath();
    obj.ctx.roundRect(10, 10, 480, 180, 18);
    obj.ctx.fill();
    obj.ctx.stroke();

    obj.ctx.shadowColor = 'rgba(236, 72, 153, 0.8)';
    obj.ctx.shadowBlur = 8;

    obj.ctx.textAlign = 'center';
    obj.ctx.fillStyle = '#ec4899';
    obj.ctx.font = 'bold 32px sans-serif';
    obj.ctx.fillText('GAME OVER', 250, 54);

    obj.ctx.fillStyle = '#ffffff';
    obj.ctx.font = 'bold 22px sans-serif';
    obj.ctx.fillText(`Score: ${finalScore}  |  Dist: ${Math.round(distance)}m`, 250, 105);

    if (isNewHigh) {
      obj.ctx.fillStyle = '#22c55e';
      obj.ctx.font = 'bold 18px sans-serif';
      obj.ctx.fillText(`🎉 NEW HIGH SCORE RECORD! 🎉`, 250, 155);
    } else {
      obj.ctx.fillStyle = '#f59e0b';
      obj.ctx.font = 'bold 18px sans-serif';
      obj.ctx.fillText(`🏆 HIGH SCORE: ${this.highScore}`, 250, 155);
    }

    obj.ctx.shadowBlur = 0;
    obj.texture.needsUpdate = true;
    this.centerBannerSprite.visible = true;
  }

  hideCenterBanner() {
    this.centerBannerSprite.visible = false;
  }
}
