/* ==========================================================================
   3D TUNNEL RUSH - DYNAMIC CURVED 3D TUNNEL & TRACK OBSTACLE ENGINE
   Version: v4.28.0
   ========================================================================== */

export function getTunnelCenter(z) {
  // Thrilling 3D Roller-Coaster Tunnel Trajectory (Dynamic turns + Steep vertical drops & climbs)
  const x = Math.sin(z * 0.018) * 14.0 + Math.sin(z * 0.042) * 6.0 + Math.cos(z * 0.008) * 8.0;
  const y = Math.sin(z * 0.022) * 16.0 + Math.cos(z * 0.048) * 8.0 + Math.sin(z * 0.009) * 12.0;
  return { x, y };
}

export function getTunnelSlope(z) {
  const delta = 1.0;
  const pBehind = getTunnelCenter(z + delta);
  const pAhead  = getTunnelCenter(z - delta);

  const dx = pAhead.x - pBehind.x;
  const dy = pAhead.y - pBehind.y;

  const pitch = Math.atan2(dy, delta * 2.0);
  const yaw = Math.atan2(dx, delta * 2.0);
  const incline = dy / (delta * 2.0);

  return { dx, dy, pitch, yaw, incline };
}

export function getTunnelTangent(z) {
  const delta = 1.0;
  const pBehind = getTunnelCenter(z + delta);
  const pAhead  = getTunnelCenter(z - delta);

  return new THREE.Vector3(
    pAhead.x - pBehind.x,
    pAhead.y - pBehind.y,
    -delta * 2.0
  ).normalize();
}

export function getTunnelCurvature(z) {
  const delta = 10.0;
  const sAhead  = getTunnelSlope(z - delta);
  const sBehind = getTunnelSlope(z + delta);
  const dYaw = Math.abs(sAhead.yaw - sBehind.yaw);
  const dPitch = Math.abs(sAhead.pitch - sBehind.pitch);
  return dYaw + dPitch;
}

export class TunnelEngine {
  constructor(scene) {
    this.scene = scene;
    this.tunnelRadius = 8.0; // Roomy tunnel radius
    this.totalLength = 2400.0; // 2400 units continuous cylinder

    this.tunnelRings = [];
    this.obstacles = [];
    this.gems = [];
    this.lightFixtures = [];
    this.speedLines = null;
    this.tunnelWallMesh = null;
    this.longitudinalLinesGroup = null;
    this.originalWallPositions = null;
    this.particleOffsets = null;

    this.nextSpawnZ = -120;
    this.nextLightZ = 0;

    this.themeIndex = 0;
    this.themes = [
      {
        name: 'Cyberpunk Neon',
        type: 'grid',
        primary: '#00f0ff',
        secondary: '#ec4899',
        wallBg: '#0b1936',
        pPrimary: 0x00f0ff,
        pSecondary: 0xec4899
      },
      {
        name: 'Wooden Catacomb',
        type: 'wood',
        primary: '#b45309',
        secondary: '#78350f',
        wallBg: '#2a160c',
        pPrimary: 0xf59e0b,
        pSecondary: 0xb45309
      },
      {
        name: 'Ancient Stone Ruins',
        type: 'stone',
        primary: '#64748b',
        secondary: '#334155',
        wallBg: '#0f172a',
        pPrimary: 0x38bdf8,
        pSecondary: 0x22c55e
      },
      {
        name: 'Pre-Historic Lava Cave',
        type: 'lava',
        primary: '#ef4444',
        secondary: '#f97316',
        wallBg: '#1c1917',
        pPrimary: 0xef4444,
        pSecondary: 0xf97316
      },
      {
        name: 'Futuristic Vault',
        type: 'futuristic_hex',
        primary: '#06b6d4',
        secondary: '#3b82f6',
        wallBg: '#09152b',
        pPrimary: 0x06b6d4,
        pSecondary: 0x3b82f6
      },
      {
        name: 'Synthwave Sunset',
        type: 'grid',
        primary: '#a855f7',
        secondary: '#f59e0b',
        wallBg: '#240b33',
        pPrimary: 0xa855f7,
        pSecondary: 0xf59e0b
      }
    ];

    this.initTunnelGeometry();
    this.initTunnelRings();
    this.initParticles();
  }

  get currentTheme() {
    const t = this.themes[this.themeIndex];
    const isAnaglyph = (window.app && window.app.renderer && window.app.renderer.mode === 'anaglyph');
    if (!isAnaglyph) return t;

    // Return Anaglyph-balanced colors (Replaces eye-straining pure Cyan and pure Red with balanced Gold, Orange & Purple)
    return {
      ...t,
      primary: (t.primary === '#00f0ff' || t.primary === '#06b6d4') ? '#f59e0b' : ((t.primary === '#ef4444') ? '#f97316' : t.primary),
      secondary: (t.secondary === '#00f0ff' || t.secondary === '#06b6d4') ? '#a855f7' : ((t.secondary === '#ec4899') ? '#d946ef' : t.secondary),
      pPrimary: (t.pPrimary === 0x00f0ff || t.pPrimary === 0x06b6d4) ? 0xf59e0b : ((t.pPrimary === 0xef4444) ? 0xf97316 : t.pPrimary),
      pSecondary: (t.pSecondary === 0x00f0ff || t.pSecondary === 0x06b6d4) ? 0xa855f7 : t.pSecondary
    };
  }

  nextTheme() {
    this.themeIndex = (this.themeIndex + 1) % this.themes.length;
    this.applyTheme();
    return this.currentTheme.name;
  }

  setThemeByLevel(level) {
    this.themeIndex = (level - 1) % this.themes.length;
    this.applyTheme();
    return this.currentTheme.name;
  }

  createGridTexture(theme) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const type = theme ? theme.type : 'grid';

    if (type === 'wood') {
      // Deep mahogany timber wood grain
      ctx.fillStyle = (theme && theme.wallBg) || '#2a160c';
      ctx.fillRect(0, 0, 512, 512);

      // Vertical wood planks & seams
      ctx.strokeStyle = '#180a04';
      ctx.lineWidth = 6;
      const plankW = 512 / 8;
      for (let i = 0; i <= 8; i++) {
        ctx.beginPath();
        ctx.moveTo(i * plankW, 0); ctx.lineTo(i * plankW, 512);
        ctx.stroke();
      }

      // Wavy wood grain lines
      ctx.strokeStyle = 'rgba(120, 53, 15, 0.45)';
      ctx.lineWidth = 3;
      for (let y = 0; y < 512; y += 14) {
        ctx.beginPath();
        ctx.moveTo(0, y + Math.sin(y * 0.04) * 6);
        ctx.lineTo(512, y + Math.sin(y * 0.04 + 2) * 6);
        ctx.stroke();
      }

      // Glowing brass hoop reinforcements
      ctx.strokeStyle = (theme && theme.primary) || '#b45309';
      ctx.lineWidth = 8;
      ctx.shadowColor = (theme && theme.primary) || '#f59e0b';
      ctx.shadowBlur = 10;
      for (let j = 0; j < 512; j += 128) {
        ctx.beginPath();
        ctx.moveTo(0, j); ctx.lineTo(512, j);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    } else if (type === 'stone') {
      // Dark granite slate blocks
      ctx.fillStyle = (theme && theme.wallBg) || '#0f172a';
      ctx.fillRect(0, 0, 512, 512);

      // Staggered stone brick grid
      ctx.strokeStyle = '#020617';
      ctx.lineWidth = 6;
      const blockH = 512 / 8;
      const blockW = 512 / 4;

      for (let r = 0; r <= 8; r++) {
        const y = r * blockH;
        ctx.beginPath();
        ctx.moveTo(0, y); ctx.lineTo(512, y);
        ctx.stroke();

        const xOffset = (r % 2 === 0) ? 0 : blockW / 2;
        for (let c = -1; c <= 5; c++) {
          const x = c * blockW + xOffset;
          ctx.beginPath();
          ctx.moveTo(x, y); ctx.lineTo(x, y + blockH);
          ctx.stroke();
        }
      }

      // Glowing bio-luminescent moss accents
      ctx.fillStyle = 'rgba(34, 197, 94, 0.65)';
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 8;
      for (let k = 0; k < 45; k++) {
        const rx = (k * 73) % 512;
        const ry = (k * 113) % 512;
        ctx.fillRect(rx, ry, 12, 4);
      }
      ctx.shadowBlur = 0;
    } else if (type === 'lava') {
      // Obsidian volcanic basalt
      ctx.fillStyle = (theme && theme.wallBg) || '#1c1917';
      ctx.fillRect(0, 0, 512, 512);

      // Fiery glowing magma veins
      ctx.strokeStyle = (theme && theme.primary) || '#ef4444';
      ctx.lineWidth = 6;
      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = 14;

      for (let i = 0; i < 6; i++) {
        const startX = (i / 6) * 512;
        ctx.beginPath();
        ctx.moveTo(startX, 0);
        ctx.bezierCurveTo(startX + 40, 150, startX - 30, 350, startX + 20, 512);
        ctx.stroke();
      }

      // Horizontal molten lava rings
      ctx.strokeStyle = (theme && theme.secondary) || '#f97316';
      ctx.lineWidth = 4;
      for (let j = 0; j < 512; j += 96) {
        ctx.beginPath();
        ctx.moveTo(0, j);
        ctx.lineTo(512, j + Math.sin(j * 0.1) * 15);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    } else if (type === 'futuristic_hex') {
      // Metallic titanium steel base
      ctx.fillStyle = (theme && theme.wallBg) || '#09152b';
      ctx.fillRect(0, 0, 512, 512);

      // Glowing cyan/blue hexagonal honeycomb grid
      ctx.strokeStyle = (theme && theme.primary) || '#06b6d4';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#3b82f6';
      ctx.shadowBlur = 8;

      const r = 32;
      const a = 2 * Math.PI / 6;
      for (let y = -r; y < 512 + r * 2; y += r * 1.5) {
        const rowIdx = Math.floor(y / (r * 1.5));
        for (let x = -r; x < 512 + r * 2; x += r * Math.sqrt(3)) {
          const cx = x + ((rowIdx % 2) * (r * Math.sqrt(3) / 2));
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const px = cx + r * Math.sin(a * i);
            const py = y + r * Math.cos(a * i);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
        }
      }
      ctx.shadowBlur = 0;
    } else {
      // Classic Cyber Grid
      ctx.fillStyle = (theme && theme.wallBg) || '#0b1936';
      ctx.fillRect(0, 0, 512, 512);

      ctx.strokeStyle = (theme && theme.primary) || '#00f0ff';
      ctx.lineWidth = 8;
      const cols = 12;
      const rows = 12;
      const cellW = 512 / cols;
      const cellH = 512 / rows;

      for (let i = 0; i <= cols; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cellW, 0); ctx.lineTo(i * cellW, 512);
        ctx.stroke();
      }

      ctx.strokeStyle = (theme && theme.secondary) || '#ec4899';
      ctx.lineWidth = 6;
      for (let j = 0; j <= rows; j++) {
        ctx.beginPath();
        ctx.moveTo(0, j * cellH); ctx.lineTo(512, j * cellH);
        ctx.stroke();
      }

      ctx.fillStyle = '#ffffff';
      for (let i = 0; i <= cols; i++) {
        for (let j = 0; j <= rows; j++) {
          ctx.beginPath();
          ctx.arc(i * cellW, j * cellH, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    const primaryColor = (theme && theme.primary) || '#00f0ff';

    // Horizontal Glowing LED Hoop Rings across Texture (Every 128px)
    ctx.shadowColor = primaryColor;
    ctx.shadowBlur = 10;
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 6;
    for (let j = 0; j <= 512; j += 128) {
      ctx.beginPath();
      ctx.moveTo(0, j); ctx.lineTo(512, j);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(6, 60);
    return texture;
  }

  initTunnelGeometry() {
    const theme = this.currentTheme;

    // 1. Continuous 2400-unit Tunnel Cylinder (DoubleSide guarantees it NEVER disappears)
    const wallGeo = new THREE.CylinderGeometry(
      this.tunnelRadius,
      this.tunnelRadius,
      this.totalLength,
      36,
      120,
      true
    );
    wallGeo.rotateX(-Math.PI / 2);
    wallGeo.translate(0, 0, -this.totalLength / 2 + 200);

    const posAttr = wallGeo.attributes.position;
    this.originalWallPositions = new Float32Array(posAttr.array.length);
    this.originalWallPositions.set(posAttr.array);

    this.gridTexture = this.createGridTexture(theme);

    // 100% Solid & Opaque Tunnel Wall (Zero transparency, zero distant obstacle clutter!)
    const wallMat = new THREE.MeshBasicMaterial({
      map: this.gridTexture,
      side: THREE.DoubleSide
    });

    this.tunnelWallMesh = new THREE.Mesh(wallGeo, wallMat);
    this.scene.add(this.tunnelWallMesh);

    // 2. 16 Curved Longitudinal Depth Lines (Disabled to prevent static line Z-fighting over scrolling texture)
    this.longitudinalLinesGroup = new THREE.Group();
    this.longitudinalLinesGroup.visible = false;
  }

  initTunnelRings() {
    // Rigid TorusGeometry meshes removed to eliminate wall-clipping crescents;
    // glowing horizontal rings are seamlessly rendered on the curved cylinder wall texture.
    this.tunnelRings = [];
  }

  initParticles() {
    const particleCount = 75;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    this.particleOffsets = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      const angle = Math.random() * Math.PI * 2;
      const rad = Math.random() * (this.tunnelRadius - 1.0);
      this.particleOffsets[i] = Math.cos(angle) * rad;
      this.particleOffsets[i + 1] = Math.sin(angle) * rad;
      // Local Z offset relative to player: from -220 (ahead) to +20 (behind camera)
      this.particleOffsets[i + 2] = 20 - Math.random() * 240;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const particleMat = new THREE.PointsMaterial({
      color: 0x00f0ff,
      size: 0.20,
      transparent: true,
      opacity: 0.60
    });

    this.speedLines = new THREE.Points(particleGeo, particleMat);
    this.speedLines.frustumCulled = false;
    this.scene.add(this.speedLines);
  }

  applyTheme() {
    const theme = this.currentTheme;

    this.gridTexture = this.createGridTexture(theme);
    if (this.tunnelWallMesh) {
      this.tunnelWallMesh.material.map = this.gridTexture;
      this.tunnelWallMesh.material.needsUpdate = true;
    }

    if (this.longitudinalLinesGroup) {
      this.longitudinalLinesGroup.children.forEach(line => {
        line.material.color.setHex(theme.pPrimary);
      });
    }

    this.tunnelRings.forEach((ring, idx) => {
      const isKeyRing = idx % 3 === 0;
      ring.material.color.setHex(isKeyRing ? theme.pPrimary : theme.pSecondary);
    });

    if (this.speedLines) {
      this.speedLines.material.color.setHex(theme.pPrimary);
    }

    this.scene.background.setHex(0x020617);
  }

  triggerParticleBurst(position, hexColor = 0x00ff66, count = 25) {
    const pGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      const phi = Math.random() * Math.PI * 2;
      const theta = Math.random() * Math.PI;
      const speed = 4.0 + Math.random() * 8.0;

      velocities.push(new THREE.Vector3(
        Math.sin(theta) * Math.cos(phi) * speed,
        Math.sin(theta) * Math.sin(phi) * speed,
        Math.cos(theta) * speed
      ));
    }

    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pMat = new THREE.PointsMaterial({
      color: hexColor,
      size: 0.35,
      transparent: true,
      opacity: 1.0,
      depthWrite: false
    });

    const pMesh = new THREE.Points(pGeo, pMat);
    this.scene.add(pMesh);
    this.particleBursts.push({
      mesh: pMesh,
      velocities: velocities,
      life: 0.6,
      maxLife: 0.6
    });
  }

  spawnObstacle(zDistance, forceBoss = false) {
    const isBoss = forceBoss || (Math.random() < 0.06); // 6% chance for Giant Boss Mine
    const obsGroup = new THREE.Group();

    if (isBoss) {
      // GIANT SPIKED BOSS MINE (50% Energy Damage!)
      const coreGeo = new THREE.IcosahedronGeometry(1.8, 2);
      const coreMat = new THREE.MeshBasicMaterial({ color: 0x9900ff });
      obsGroup.add(new THREE.Mesh(coreGeo, coreMat));

      const shellGeo = new THREE.IcosahedronGeometry(2.4, 1);
      const shellMat = new THREE.MeshBasicMaterial({ color: 0xff0066, wireframe: true, transparent: true, opacity: 0.9 });
      obsGroup.add(new THREE.Mesh(shellGeo, shellMat));

      const spikeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      for (let i = 0; i < 12; i++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.2, 5), spikeMat);
        const phi = Math.random() * Math.PI * 2;
        const theta = Math.random() * Math.PI;
        spike.position.set(Math.sin(theta) * Math.cos(phi) * 2.0, Math.sin(theta) * Math.sin(phi) * 2.0, Math.cos(theta) * 2.0);
        spike.rotation.set(phi, theta, 0);
        obsGroup.add(spike);
      }
    } else {
      // Normal Red Space Mine
      const coreGeo = new THREE.IcosahedronGeometry(0.9, 2);
      const coreMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });
      obsGroup.add(new THREE.Mesh(coreGeo, coreMat));

      const shellGeo = new THREE.IcosahedronGeometry(1.2, 1);
      const shellMat = new THREE.MeshBasicMaterial({ color: 0xff3366, wireframe: true, transparent: true, opacity: 0.85 });
      obsGroup.add(new THREE.Mesh(shellGeo, shellMat));

      const spikeMat = new THREE.MeshBasicMaterial({ color: 0xff0022 });
      const spikeDirections = [
        { pos: [ 1.1,  0.0,  0.0], rot: [0, 0, -Math.PI / 2] },
        { pos: [-1.1,  0.0,  0.0], rot: [0, 0,  Math.PI / 2] },
        { pos: [ 0.0,  1.1,  0.0], rot: [0, 0, 0] },
        { pos: [ 0.0, -1.1,  0.0], rot: [Math.PI, 0, 0] },
        { pos: [ 0.0,  0.0,  1.1], rot: [Math.PI / 2, 0, 0] },
        { pos: [ 0.0,  0.0, -1.1], rot: [-Math.PI / 2, 0, 0] }
      ];

      spikeDirections.forEach(dir => {
        const spikeMesh = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.1, 5), spikeMat);
        spikeMesh.position.set(...dir.pos);
        spikeMesh.rotation.set(...dir.rot);
        obsGroup.add(spikeMesh);
      });

      const ringGeo = new THREE.TorusGeometry(1.4, 0.07, 8, 24);
      const laserRing = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xff0000 }));
      laserRing.name = 'laserRing';
      obsGroup.add(laserRing);
    }

    const trackX = (Math.floor(Math.random() * 5) - 2) * 2.0;
    const ySlots = [-3.2, 0.0, 3.2];
    const trackY = ySlots[Math.floor(Math.random() * ySlots.length)];

    const center = getTunnelCenter(zDistance);
    const slope = getTunnelSlope(zDistance);

    obsGroup.position.set(center.x + trackX, center.y + trackY, zDistance);
    obsGroup.rotation.set(-slope.pitch, -slope.yaw, 0);

    const isMoving = !isBoss && (Math.random() < 0.35); // 35% of normal mines oscillate!
    obsGroup.userData = {
      zPos: zDistance,
      trackX: trackX,
      trackY: trackY,
      hit: false,
      isBoss: isBoss,
      isMoving: isMoving,
      moveAxis: Math.random() > 0.5 ? 'x' : 'y',
      moveSpeed: 1.8 + Math.random() * 1.5,
      movePhase: Math.random() * Math.PI * 2
    };

    this.scene.add(obsGroup);
    this.obstacles.push(obsGroup);
  }

  spawnGem(zDistance, forceSuper = false) {
    const isSuper = forceSuper || (Math.random() < 0.07); // 7% chance for Hyper Crystal Super Booster (+50% Energy!)
    const gemGroup = new THREE.Group();

    if (isSuper) {
      // RARE HYPER CRYSTAL PRISM SUPER BOOSTER (+50% ENERGY REFILL)
      const crystalGeo = new THREE.IcosahedronGeometry(1.2, 1);
      const crystalMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
      gemGroup.add(new THREE.Mesh(crystalGeo, crystalMat));

      const shellGeo = new THREE.IcosahedronGeometry(1.6, 1);
      const shellMat = new THREE.MeshBasicMaterial({ color: 0xff00ff, wireframe: true, transparent: true, opacity: 0.9 });
      gemGroup.add(new THREE.Mesh(shellGeo, shellMat));

      const haloGeo = new THREE.TorusGeometry(1.8, 0.08, 8, 24);
      const haloMesh = new THREE.Mesh(haloGeo, new THREE.MeshBasicMaterial({ color: 0x00ffff }));
      haloMesh.name = 'haloRing';
      gemGroup.add(haloMesh);
    } else {
      // Normal Emerald Crystal (+25% Energy)
      const crystalGeo = new THREE.OctahedronGeometry(0.85);
      const crystalMat = new THREE.MeshBasicMaterial({ color: 0x00ff66 });
      const crystalMesh = new THREE.Mesh(crystalGeo, crystalMat);
      crystalMesh.scale.set(0.85, 1.4, 0.85);
      gemGroup.add(crystalMesh);

      const shellGeo = new THREE.OctahedronGeometry(1.1);
      const shellMat = new THREE.MeshBasicMaterial({ color: 0x34d399, wireframe: true, transparent: true, opacity: 0.75 });
      const shellMesh = new THREE.Mesh(shellGeo, shellMat);
      shellMesh.scale.set(0.85, 1.4, 0.85);
      gemGroup.add(shellMesh);

      const haloGeo = new THREE.TorusGeometry(1.25, 0.06, 8, 24);
      const haloMesh = new THREE.Mesh(haloGeo, new THREE.MeshBasicMaterial({ color: 0x00ff88 }));
      haloMesh.rotation.x = Math.PI / 3;
      haloMesh.name = 'haloRing';
      gemGroup.add(haloMesh);
    }

    const trackX = (Math.floor(Math.random() * 5) - 2) * 2.0;
    const ySlots = [-3.2, 0.0, 3.2];
    const trackY = ySlots[Math.floor(Math.random() * ySlots.length)];

    const center = getTunnelCenter(zDistance);
    const slope = getTunnelSlope(zDistance);

    gemGroup.position.set(center.x + trackX, center.y + trackY, zDistance);
    gemGroup.rotation.set(-slope.pitch, -slope.yaw, 0);

    gemGroup.userData = {
      zPos: zDistance,
      trackX: trackX,
      trackY: trackY,
      collected: false,
      isSuper: isSuper
    };

    this.scene.add(gemGroup);
    this.gems.push(gemGroup);
  }

  spawnBarrierGate(zDistance) {
    const gateGroup = new THREE.Group();
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    const segments = 12;
    const openIndex = Math.floor(Math.random() * segments);

    for (let i = 0; i < segments; i++) {
      if (i === openIndex) continue; // Single passage gap!
      const angle = (i / segments) * Math.PI * 2;
      const arcGeo = new THREE.TorusGeometry(5.5, 0.25, 8, 8, Math.PI * 2 / segments * 0.85);
      const arcMesh = new THREE.Mesh(arcGeo, ringMat);
      arcMesh.rotation.z = angle;
      gateGroup.add(arcMesh);
    }

    const center = getTunnelCenter(zDistance);
    const slope = getTunnelSlope(zDistance);
    gateGroup.position.set(center.x, center.y, zDistance);
    gateGroup.rotation.set(-slope.pitch, -slope.yaw, 0);

    gateGroup.userData = { zPos: zDistance, isBarrier: true };
    this.scene.add(gateGroup);
    this.obstacles.push(gateGroup);
  }

  update(speed, playerZ, isTransitioning = false, delta = 0.016) {
    const now = performance.now() * 0.001;

    // 0. Update Explosive Particle Bursts
    for (let i = this.particleBursts.length - 1; i >= 0; i--) {
      const burst = this.particleBursts[i];
      burst.life -= delta;
      if (burst.life <= 0) {
        this.scene.remove(burst.mesh);
        this.particleBursts.splice(i, 1);
        continue;
      }
      const progress = burst.life / burst.maxLife;
      burst.mesh.material.opacity = progress;
      const positions = burst.mesh.geometry.attributes.position.array;
      for (let p = 0; p < burst.velocities.length; p++) {
        const vel = burst.velocities[p];
        positions[p * 3] += vel.x * delta;
        positions[p * 3 + 1] += vel.y * delta;
        positions[p * 3 + 2] += vel.z * delta;
      }
      burst.mesh.geometry.attributes.position.needsUpdate = true;
    }

    // 1. Dynamic Tunnel Wall Curved Deformation
    if (this.tunnelWallMesh && this.originalWallPositions) {
      this.tunnelWallMesh.position.z = playerZ;
      const posAttr = this.tunnelWallMesh.geometry.attributes.position;
      const arr = posAttr.array;
      const orig = this.originalWallPositions;

      for (let i = 0; i < orig.length; i += 3) {
        const localZ = orig[i + 2];
        const worldZ = playerZ + localZ;
        const center = getTunnelCenter(worldZ);

        arr[i] = orig[i] + center.x;
        arr[i + 1] = orig[i + 1] + center.y;
        arr[i + 2] = localZ;
      }
      posAttr.needsUpdate = true;

      if (this.gridTexture) {
        this.gridTexture.offset.y += speed * (isTransitioning ? 0.12 : 0.05);
      }
    }

    // 2. Dynamic Longitudinal Lines Deformation
    if (this.longitudinalLinesGroup) {
      this.longitudinalLinesGroup.position.z = playerZ;
      this.longitudinalLinesGroup.children.forEach(line => {
        const posAttr = line.geometry.attributes.position;
        const arr = posAttr.array;
        const radX = line.geometry.userData.radX;
        const radY = line.geometry.userData.radY;
        const segs = line.geometry.userData.segments;

        for (let s = 0; s <= segs; s++) {
          const localZ = 200 - (s / segs) * this.totalLength;
          const worldZ = playerZ + localZ;
          const center = getTunnelCenter(worldZ);

          arr[s * 3] = radX + center.x;
          arr[s * 3 + 1] = radY + center.y;
          arr[s * 3 + 2] = localZ;
        }
        posAttr.needsUpdate = true;
      });
    }

    // 3. Stream Ambient Space Dust Particles Past Player (Gentle natural speed)
    if (this.speedLines && this.particleOffsets) {
      const particleSpeedMult = isTransitioning ? 2.5 : 1.0;
      const positions = this.speedLines.geometry.attributes.position.array;

      for (let i = 0; i < this.particleOffsets.length; i += 3) {
        // Scroll particle Z relative to player (stream past camera towards +Z at natural speed)
        this.particleOffsets[i + 2] += speed * 2.2 * particleSpeedMult;

        // When particle streams behind camera (localZ > 20), recycle ahead to -220
        if (this.particleOffsets[i + 2] > 20.0) {
          this.particleOffsets[i + 2] -= 240.0;
        }

        const localZ = this.particleOffsets[i + 2];
        const worldZ = playerZ + localZ;
        const center = getTunnelCenter(worldZ);

        positions[i] = center.x + this.particleOffsets[i];
        positions[i + 1] = center.y + this.particleOffsets[i + 1];
        positions[i + 2] = worldZ;
      }
      this.speedLines.geometry.attributes.position.needsUpdate = true;
    }

    // 4. Update Obstacles along Curve & Rotate / Move Mines
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.rotation.z += 0.02;
      const laserRing = obs.getObjectByName('laserRing');
      if (laserRing) laserRing.rotation.x += 0.04;

      const zPos = obs.userData.zPos;
      const center = getTunnelCenter(zPos);
      let trackX = obs.userData.trackX;
      let trackY = obs.userData.trackY || -3.2;

      // Oscillating Moving Space Mines
      if (obs.userData.isMoving) {
        const offset = Math.sin(now * obs.userData.moveSpeed + obs.userData.movePhase) * 2.5;
        if (obs.userData.moveAxis === 'x') trackX += offset;
        else trackY += offset;
      }

      obs.position.x = center.x + trackX;
      obs.position.y = center.y + trackY;

      if (obs.position.z > playerZ + 30) {
        this.scene.remove(obs);
        this.obstacles.splice(i, 1);
      }
    }

    // 5. Update Gems along Curve & Rotate Halo Rings
    for (let i = this.gems.length - 1; i >= 0; i--) {
      const gem = this.gems[i];
      gem.rotation.y += 0.04;
      const haloRing = gem.getObjectByName('haloRing');
      if (haloRing) haloRing.rotation.z += 0.05;

      const zPos = gem.userData.zPos;
      const center = getTunnelCenter(zPos);
      const trackX = gem.userData.trackX;
      const trackY = gem.userData.trackY || -3.2;

      gem.position.x = center.x + trackX;
      gem.position.y = center.y + trackY;

      if (gem.position.z > playerZ + 30) {
        this.scene.remove(gem);
        this.gems.splice(i, 1);
      }
    }

    // 6. Infinite Dynamic Procedural Spawning Ahead of Player (SUPPRESSED during level warp transition!)
    while (this.nextSpawnZ > playerZ - 1200) {
      if (!isTransitioning) {
        if (Math.random() > 0.25) {
          this.spawnObstacle(this.nextSpawnZ);
        }
        if (Math.random() > 0.30) {
          this.spawnGem(this.nextSpawnZ - 14);
        }
      }
      this.nextSpawnZ -= 28;
    }
  }

  reset() {
    this.obstacles.forEach(obs => this.scene.remove(obs));
    this.gems.forEach(gem => this.scene.remove(gem));
    if (this.particleBursts) {
      this.particleBursts.forEach(b => this.scene.remove(b.mesh));
    }

    this.obstacles = [];
    this.gems = [];
    this.particleBursts = [];

    // Always reset to Level 1 (Theme 1: Cyberpunk Neon) on fresh start or restart
    this.themeIndex = 0;
    this.setThemeByLevel(1);

    this.nextSpawnZ = -120;
    while (this.nextSpawnZ > -1200) {
      if (Math.random() > 0.25) {
        this.spawnObstacle(this.nextSpawnZ);
      }
      if (Math.random() > 0.30) {
        this.spawnGem(this.nextSpawnZ - 14);
      }
      this.nextSpawnZ -= 28;
    }
  }
}
