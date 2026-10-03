/* ==========================================================================
   3D TUNNEL RUSH - 4-WAY PLAYER SHIP WITH VISUAL AURAS & LIVES SYSTEM
   Version: v4.18.0
   ========================================================================== */

import { getTunnelCenter, getTunnelSlope } from './tunnel.js';

export class PlayerShip {
  constructor(scene) {
    this.scene = scene;

    // Position Parameters (4-Way track inside R=8.0 tunnel)
    this.x = 0;
    this.y = -2.8; // Initial position near tunnel floor
    this.z = 0;
    this.trackWidth = 4.4; // Left/Right boundary [-4.4, +4.4]
    this.yMin = -4.0;      // Floor boundary (well inside R=8.0 tunnel)
    this.yMax = 4.0;       // Ceiling boundary (well inside R=8.0 tunnel)

    this.effectiveX = 0;
    this.effectiveY = -2.8;

    this.baseSpeed = 0.075; // Starting flight speed (approx 75 km/h)
    this.currentSpeed = this.baseSpeed;
    this.level = 1;
    this.currentIncline = 0;

    // Level Warp Roller Coaster Transition State
    this.isLevelTransitioning = false;
    this.transitionTimer = 0;
    this.transitionDuration = 3.5;

    // Energy Boost State (Collecting Energy Crystals triggers 5s 2x Double Score Boost)
    this.energyBoostActive = false;
    this.energyBoostTimer = 0;

    // Health, Lives & Gem Collection System
    this.shield = 100;
    this.lives = 3;
    this.gemsCollected = 0;
    this.gemsForExtraLife = 0;
    this.invulnerableTimer = 0;
    this.score = 0;
    this.multiplier = 1;
    this.distanceTraveled = 0;

    // Visual Aura Flash State
    this.auraTimer = 0;
    this.auraMaxDuration = 1.0;

    // Mesh setup
    this.mesh = this.createShipMesh();
    this.scene.add(this.mesh);

    this.tiltX = 0;
    this.tiltZ = 0;
  }

  createShipMesh() {
    const shipGroup = new THREE.Group();

    // Main Cockpit Body
    const bodyGeo = new THREE.ConeGeometry(0.6, 1.8, 5);
    const bodyMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff
    });
    this.bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    this.bodyMesh.rotation.x = Math.PI / 2;
    shipGroup.add(this.bodyMesh);

    // Wings
    const wingGeo = new THREE.BufferGeometry();
    const wingVertices = new Float32Array([
      -1.6, -0.2, 0.4,
       1.6, -0.2, 0.4,
       0.0,  0.2, -0.7
    ]);
    wingGeo.setAttribute('position', new THREE.BufferAttribute(wingVertices, 3));
    const wingMat = new THREE.MeshBasicMaterial({ color: 0xec4899, side: THREE.DoubleSide });
    const wings = new THREE.Mesh(wingGeo, wingMat);
    shipGroup.add(wings);

    // Engine Glow Thruster
    const engineGeo = new THREE.SphereGeometry(0.3, 8, 8);
    this.engineMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
    const engine = new THREE.Mesh(engineGeo, this.engineMat);
    engine.position.set(0, 0, 0.8);
    shipGroup.add(engine);

    // 3D Visual Aura Energy Shell (Green for crystals, Red for damage, Cyan for warp)
    const auraGeo = new THREE.IcosahedronGeometry(1.6, 2);
    this.auraMat = new THREE.MeshBasicMaterial({
      color: 0x00ff66,
      wireframe: true,
      transparent: true,
      opacity: 0.0
    });
    this.auraMesh = new THREE.Mesh(auraGeo, this.auraMat);
    this.auraMesh.visible = false;
    shipGroup.add(this.auraMesh);

    // 3D Telemetry Dashboard Strip attached directly below ship wings (matching cockpit size)
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 50;
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    const mat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });

    this.shipHudSprite = new THREE.Sprite(mat);
    this.shipHudSprite.userData = { canvas, ctx: canvas.getContext('2d'), texture };
    this.shipHudSprite.position.set(0, -0.90, -0.15);
    this.shipHudSprite.scale.set(5.5, 0.6875, 1);
    shipGroup.add(this.shipHudSprite);

    return shipGroup;
  }

  setUserSpeed(val) {
    const parsed = parseFloat(val);
    this.userSpeedSetting = parsed;
    this.baseSpeed = parsed;
    this.currentSpeed = parsed;
  }

  triggerAura(hexColor, durationSec = 1.0) {
    if (!this.auraMat || !this.auraMesh) return;
    this.auraTimer = durationSec;
    this.auraMaxDuration = durationSec;
    this.auraMat.color.setHex(hexColor);
    this.auraMesh.visible = true;
    this.auraMat.opacity = 0.95;

    // Trigger 3D Pilot Cockpit Windshield Aura flash
    if (window.app && window.app.hud3d && typeof window.app.hud3d.triggerCockpitAura === 'function') {
      window.app.hud3d.triggerCockpitAura(hexColor, durationSec);
    }
  }

  activateEnergyBoost(durationSec = 5.0) {
    this.energyBoostActive = true;
    this.energyBoostTimer = durationSec;
    this.multiplier = 2; // 2X Double Score Multiplier
    if (this.engineMat) this.engineMat.color.setHex(0xffaa00);
  }

  triggerLevelTransition() {
    this.isLevelTransitioning = true;
    this.transitionTimer = this.transitionDuration;
    this.triggerAura(0x00ffff, this.transitionDuration);
    if (this.engineMat) this.engineMat.color.setHex(0x00ffff);
  }

  update(controls, rawDelta) {
    const delta = Math.min(rawDelta, 0.05); // Cap max delta to 50ms to prevent timer skipping on frame drops
    const moveSpeed = 8.0 * delta;

    // 1. Horizontal Left / Right movement
    if (controls.keys.left) {
      this.x = Math.max(-this.trackWidth, this.x - moveSpeed);
      this.tiltZ = THREE.MathUtils.lerp(this.tiltZ, 0.35, 0.15);
    } else if (controls.keys.right) {
      this.x = Math.min(this.trackWidth, this.x + moveSpeed);
      this.tiltZ = THREE.MathUtils.lerp(this.tiltZ, -0.35, 0.15);
    } else {
      this.tiltZ = THREE.MathUtils.lerp(this.tiltZ, 0, 0.1);
    }

    // 2. Vertical Up / Down movement (3D Flying Height)
    if (controls.keys.up) {
      this.y = Math.min(this.yMax, this.y + moveSpeed);
      this.tiltX = THREE.MathUtils.lerp(this.tiltX, -0.25, 0.15);
    } else if (controls.keys.down) {
      this.y = Math.max(this.yMin, this.y - moveSpeed);
      this.tiltX = THREE.MathUtils.lerp(this.tiltX, 0.25, 0.15);
    } else {
      this.tiltX = THREE.MathUtils.lerp(this.tiltX, 0, 0.1);
    }

    // 3. Level Warp Roller Coaster Transition Timer
    if (this.isLevelTransitioning) {
      this.transitionTimer -= delta;
      if (this.transitionTimer <= 0) {
        this.isLevelTransitioning = false;
        if (this.engineMat) this.engineMat.color.setHex(0x00ffcc);
      }
    }

    // 4. Timers: Invulnerability & Visual Aura Flash Decay
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= delta;
      // Pulse ship body visibility during invulnerability window
      if (this.bodyMesh) this.bodyMesh.visible = (Math.floor(this.invulnerableTimer * 12) % 2 === 0);
    } else {
      if (this.bodyMesh) this.bodyMesh.visible = true;
    }

    if (this.auraTimer > 0) {
      this.auraTimer -= delta;
      const progress = Math.max(0, this.auraTimer / this.auraMaxDuration);
      if (this.auraMat) this.auraMat.opacity = progress * 0.95;
      if (this.auraMesh) this.auraMesh.rotation.z += 0.05;
      if (this.auraTimer <= 0 && this.auraMesh) {
        this.auraMesh.visible = false;
      }
    }

    // 5. Calculate 3D Tunnel Slope & Gravity Physics
    const slope = getTunnelSlope(this.z);
    this.currentIncline = slope.incline;

    // Gentle incline pitch feedback (subtle speed sensation without steep drop!)
    const gravityMultiplier = 1.0 - slope.incline * 0.12;

    // Calculate level progression (Theme advances every 1000 meters)
    const newLevel = 1 + Math.floor(this.distanceTraveled / 1000);
    if (newLevel !== this.level) {
      this.level = newLevel;
      this.triggerLevelTransition();
      if (window.app && typeof window.app.onLevelUp === 'function') {
        window.app.onLevelUp(this.level);
      }
    }

    const levelBonus = (this.level - 1) * 0.008;
    const distanceBonus = (this.distanceTraveled / 100) * 0.003;
    const baseSetting = this.baseSpeed + levelBonus + distanceBonus;

    // Roller Coaster Hyper-Warp Speed Surge Multiplier during level transition
    const warpMultiplier = this.isLevelTransitioning ? 1.8 : 1.0;

    const nominalSpeed = baseSetting * gravityMultiplier * warpMultiplier;
    // Cap flight speed at 0.50 (Max 500 km/h) as requested by user!
    const targetSpeed = Math.min(0.50, Math.max(0.065, nominalSpeed));
    this.currentSpeed = THREE.MathUtils.lerp(this.currentSpeed, targetSpeed, 0.10);

    // 6. Flight Movement Along Curved Tunnel Trajectory (-Z)
    this.z -= this.currentSpeed;
    this.distanceTraveled += this.currentSpeed;
    this.score += Math.round(this.currentSpeed * 30 * this.multiplier);

    // Continuous Energy Depletion: 100% energy depletes over 250 meters of distance traveled
    const energyDepletion = (this.currentSpeed / 250.0) * 100.0;
    this.shield = Math.max(0, this.shield - energyDepletion);

    if (this.shield <= 0 && this.invulnerableTimer <= 0 && !this.isLevelTransitioning) {
      this.lives--;
      this.triggerAura(0xff0022, 1.0);
      if (this.lives > 0) {
        this.shield = 100;
        this.invulnerableTimer = 2.0;
      } else {
        this.shield = 0;
        if (window.app && typeof window.app.gameOver === 'function') {
          window.app.gameOver();
        }
      }
    }

    // 7. Direct User Navigation Position (Zero centrifugal drift - craft always 100% in view!)
    const center = getTunnelCenter(this.z);

    this.effectiveX = this.x;
    this.effectiveY = this.y;

    const targetX = center.x + this.x;
    const targetY = center.y + this.y;

    // Realistic roll bank into tunnel curve
    const bankRoll = -slope.dx * 0.35;

    this.mesh.position.set(targetX, targetY, this.z);
    this.mesh.rotation.set(-slope.pitch + this.tiltX, -slope.yaw, bankRoll + this.tiltZ);
  }

  checkObstacleCollisions(obstacles, onHit) {
    if (this.invulnerableTimer > 0 || this.isLevelTransitioning) return;

    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];
      if (obs.userData.hit) continue;

      // Precise 3D Euclidean distance (removes false rectangular AABB hits!)
      const dist = this.mesh.position.distanceTo(obs.position);
      if (dist < 1.45) {
        obs.userData.hit = true;
        obs.visible = false; // INSTANTLY CONSUME & VANISH RED MINE!

        // Red Aura & 25% Damage
        this.triggerAura(0xff0022, 1.0);
        this.shield -= 25;

        if (this.shield <= 0) {
          this.lives--;
          if (this.lives > 0) {
            // Refill shield & grant 2s invulnerability window (continuous flight!)
            this.shield = 100;
            this.invulnerableTimer = 2.0;
          } else {
            this.shield = 0;
          }
        }

        if (onHit) onHit(this.shield, this.lives);
        break;
      }
    }
  }

  checkGemCollisions(gems, onCollect) {
    for (let i = 0; i < gems.length; i++) {
      const gem = gems[i];
      if (gem.userData.collected) continue;

      const dist = this.mesh.position.distanceTo(gem.position);
      if (dist < 2.0) {
        gem.userData.collected = true;
        gem.visible = false; // INSTANTLY CONSUME & VANISH GREEN CRYSTAL!

        // Green Aura (Matches Red Aura pattern, green color!)
        this.triggerAura(0x00ff66, 1.0);

        // Green Mine / Gem collection restores +25% energy (up to 100%)
        this.shield = Math.min(100, this.shield + 25);

        this.gemsCollected++;
        this.gemsForExtraLife++;

        let extraLifeGained = false;
        if (this.gemsForExtraLife >= 100) {
          this.lives++;
          this.gemsForExtraLife -= 100;
          extraLifeGained = true;
        }

        this.score += 500 * this.multiplier;
        if (onCollect) onCollect(this.score, this.multiplier, this.gemsCollected, this.gemsForExtraLife, extraLifeGained);
      }
    }
  }

  reset() {
    this.x = 0;
    this.y = -3.2;
    this.z = 0;
    this.baseSpeed = 0.075;
    this.currentSpeed = 0.075;
    this.level = 1;
    this.currentIncline = 0;
    this.isLevelTransitioning = false;
    this.transitionTimer = 0;
    this.energyBoostActive = false;
    this.energyBoostTimer = 0;
    this.shield = 100;
    this.lives = 3;
    this.gemsCollected = 0;
    this.gemsForExtraLife = 0;
    this.invulnerableTimer = 0;
    this.auraTimer = 0;
    this.score = 0;
    this.multiplier = 1;
    this.distanceTraveled = 0;
    this.tiltX = 0;
    this.tiltZ = 0;

    if (this.auraMesh) this.auraMesh.visible = false;
    if (this.bodyMesh) this.bodyMesh.visible = true;

    const center = getTunnelCenter(0);
    const slope = getTunnelSlope(0);
    this.mesh.position.set(center.x, center.y - 3.2, 0);
    this.mesh.rotation.set(-slope.pitch, -slope.yaw, 0);
  }
}
