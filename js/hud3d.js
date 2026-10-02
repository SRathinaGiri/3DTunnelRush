/* ==========================================================================
   3D TUNNEL RUSH - 100% SCENE-BASED STEREOSCOPIC 3D HUD ENGINE
   Version: v4.3.1
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
    // 1. In-canvas 3D HUD Sprite rendered inside 3D Scene with 0 parallax stereo depth
    this.topHudSprite = this.createCanvasSprite(500, 140);
    this.topHudSprite.scale.set(3.1, 0.868, 1);
    this.topHudSprite.position.set(0, 1.85, -3.5);
    this.topHudSprite.visible = false;
    this.hudGroup.add(this.topHudSprite);

    // 2. High Score Banner (Positioned at top of viewport during menus/warmup)
    this.highScoreSprite = this.createCanvasSprite(400, 60);
    this.highScoreSprite.scale.set(1.8, 0.27, 1);
    this.highScoreSprite.position.set(0, 1.70, -3.5);
    this.highScoreSprite.visible = false;
    this.hudGroup.add(this.highScoreSprite);

    // 3. Energy Boost Notification (Center High)
    this.boostNoticeSprite = this.createCanvasSprite(500, 70);
    this.boostNoticeSprite.scale.set(2.6, 0.364, 1);
    this.boostNoticeSprite.position.set(0, 0.85, -3.5);
    this.boostNoticeSprite.visible = false;
    this.hudGroup.add(this.boostNoticeSprite);

    // 4. Center Banner (Countdown, Pause, Game Over)
    this.centerBannerSprite = this.createCanvasSprite(500, 200);
    this.centerBannerSprite.scale.set(2.8, 1.12, 1);
    this.centerBannerSprite.position.set(0, 0, -3.5);
    this.hudGroup.add(this.centerBannerSprite);

    this.updateHUD(0, 0, '40 km/h', '100%', 'x1', 3, 0);
    this.updateHighScore(this.highScore);
    this.hideCenterBanner();
  }

  updateCameraTransform(camera) {
    this.hudGroup.position.copy(camera.position);
    this.hudGroup.quaternion.copy(camera.quaternion);
  }

  // Backward compatibility alias for single updates
  updateScore(score, dist) {
    this.currentScore = score;
    this.currentDist = dist;
    this.renderTopHud();
  }

  updateStats(speedStr, shieldStr, multStr) {
    this.currentSpeedStr = speedStr;
    this.currentShieldStr = shieldStr;
    this.currentMultStr = multStr;
    this.renderTopHud();
  }

  updateHUD(score, dist, speedStr, shieldStr, multStr, lives, gemsForExtraLife) {
    const roundedDist = Math.round(dist || 0);
    const hudKey = `${score}_${roundedDist}_${speedStr}_${shieldStr}_${multStr}_${lives}_${gemsForExtraLife}`;
    if (this.lastHudKey === hudKey) return;
    this.lastHudKey = hudKey;

    this.currentScore = score;
    this.currentDist = dist;
    this.currentSpeedStr = speedStr;
    this.currentShieldStr = shieldStr;
    this.currentMultStr = multStr;
    this.currentLives = lives !== undefined ? lives : 3;
    this.currentGemsForExtraLife = gemsForExtraLife || 0;
    this.renderTopHud();
  }

  renderTopHud() {
    const obj = this.topHudSprite.userData;
    const ctx = obj.ctx;
    ctx.clearRect(0, 0, 500, 140);

    // Transparent Floating Sci-Fi Glass Panel
    ctx.fillStyle = 'rgba(2, 6, 23, 0.25)';
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.85)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(6, 6, 488, 128, 16);
    ctx.fill();
    ctx.stroke();

    // Subtle section dividers
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    // Vertical dividers
    ctx.moveTo(155, 12); ctx.lineTo(155, 128);
    ctx.moveTo(345, 12); ctx.lineTo(345, 128);
    // Horizontal divider across center section
    ctx.moveTo(155, 70); ctx.lineTo(345, 70);
    ctx.stroke();

    // Enable glowing text shadows for weightless floating effect
    ctx.shadowColor = 'rgba(0, 240, 255, 0.7)';
    ctx.shadowBlur = 6;

    // 1. Left Section: Score & Gems Counter
    ctx.textAlign = 'left';
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('SCORE', 18, 28);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px monospace';
    ctx.fillText((this.currentScore || 0).toString(), 18, 58);

    ctx.fillStyle = '#00ff66';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`💎 ${this.currentGemsForExtraLife || 0}/100`, 18, 106);

    // 2. Center Section: Lives, Shield, Speed, Multiplier
    ctx.textAlign = 'center';

    // Top row: Lives & Shield
    ctx.font = 'bold 17px sans-serif';
    ctx.fillStyle = '#ff0055';
    ctx.fillText(`❤️ ${this.currentLives !== undefined ? this.currentLives : 3}`, 200, 44);

    ctx.fillStyle = '#ec4899';
    ctx.fillText(`🛡️ ${this.currentShieldStr || '100%'}`, 300, 44);

    // Bottom row: Speed & Boost Multiplier
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#00f0ff';
    ctx.fillText(this.currentSpeedStr || '40 km/h', 215, 104);

    ctx.fillStyle = '#f59e0b';
    ctx.fillText('🔥 ' + (this.currentMultStr || 'x1'), 305, 104);

    // 3. Right Section: Distance
    ctx.textAlign = 'right';
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('DISTANCE', 482, 28);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px monospace';
    ctx.fillText(Math.round(this.currentDist || 0) + 'm', 482, 58);

    // Reset shadow
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
