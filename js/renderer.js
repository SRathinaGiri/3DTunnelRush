/* ==========================================================================
   3D TUNNEL RUSH - STEREOSCOPIC 3D RENDER ENGINE (STEREO.JS ARCHITECTURE)
   Version: v4.23.0
   ========================================================================== */

export class StereoRenderEngine {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(500, 500, false);

    // Stereo Settings (Adopted from proven 3D Spirograph StereoManager)
    this.mode = '2d'; // '2d', 'parallel', 'cross', 'anaglyph'
    this.eyeDistance = 1.50; // eyeSeparation (0.00 to 5.00)
    this.focalLength = 14.0; // focalDistance
    this.swapEyes = false;
    this.fov = 75;

    // Cameras
    this.mainCamera = new THREE.PerspectiveCamera(this.fov, 1, 0.1, 1000);
    this.mainCamera.rotation.order = 'YXZ';
    this.mainCamera.rotation.set(0, 0, 0); // Locked facing straight forward down -Z

    this.cameraL = new THREE.PerspectiveCamera(this.fov, 1, 0.1, 1000);
    this.cameraR = new THREE.PerspectiveCamera(this.fov, 1, 0.1, 1000);
    this.cameraL.rotation.order = 'YXZ';
    this.cameraR.rotation.order = 'YXZ';

    // Callbacks
    this.onModeChange = null;

    // Anaglyph 3D Render Targets & Composite Pipeline
    this.renderTargetL = new THREE.WebGLRenderTarget(500, 500, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat
    });
    this.renderTargetR = new THREE.WebGLRenderTarget(500, 500, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat
    });

    this.anaglyphMaterial = new THREE.ShaderMaterial({
      uniforms: {
        mapLeft: { value: null },
        mapRight: { value: null }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D mapLeft;
        uniform sampler2D mapRight;
        varying vec2 vUv;
        void main() {
          vec4 colorL = texture2D(mapLeft, vUv);
          vec4 colorR = texture2D(mapRight, vUv);
          gl_FragColor = vec4(colorL.r, colorR.g, colorR.b, max(colorL.a, colorR.a));
        }
      `,
      depthTest: false,
      depthWrite: false
    });

    this.anaglyphScene = new THREE.Scene();
    this.anaglyphCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quadMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.anaglyphMaterial);
    this.anaglyphScene.add(quadMesh);
  }

  setMode(newMode) {
    if (!['2d', 'parallel', 'cross', 'anaglyph'].includes(newMode)) return;
    this.mode = newMode;

    const frameElement = document.getElementById('viewportFrame');
    const sbsDivider = document.getElementById('sbsDivider');

    if (newMode === 'parallel' || newMode === 'cross') {
      if (frameElement) {
        frameElement.classList.remove('mode-single');
        frameElement.classList.add('mode-dual');
      }
      if (sbsDivider) sbsDivider.style.display = 'block';
    } else { // '2d' or 'anaglyph'
      if (frameElement) {
        frameElement.classList.remove('mode-dual');
        frameElement.classList.add('mode-single');
      }
      if (sbsDivider) sbsDivider.style.display = 'none';
    }

    this.handleResize();
    if (window.app && window.app.tunnel) {
      window.app.tunnel.applyTheme();
    }
    if (this.onModeChange) this.onModeChange(newMode);
  }

  setEyeDistance(val) {
    this.eyeDistance = parseFloat(val);
  }

  setFocalLength(val) {
    this.focalLength = parseFloat(val);
  }

  setFOV(val) {
    this.fov = parseFloat(val);
    this.mainCamera.fov = this.fov;
    this.mainCamera.updateProjectionMatrix();
  }

  render(scene) {
    const renderSize = this.renderer.getSize(new THREE.Vector2());
    const width = renderSize.width;
    const height = renderSize.height;

    this.renderer.setScissorTest(true);

    const halfEye = this.eyeDistance / 2.0;
    const isDual = (this.mode === 'parallel' || this.mode === 'cross');
    const aspect = isDual ? ((width / 2) / height) : (width / height);

    // Update main camera projection matrix
    this.mainCamera.aspect = aspect;
    this.mainCamera.fov = this.fov;
    this.mainCamera.updateProjectionMatrix();
    this.mainCamera.updateMatrixWorld(true);

    // Prepare Left Camera (shifted -halfEye along X)
    this.cameraL.aspect = aspect;
    this.cameraL.fov = this.fov;
    this.cameraL.position.copy(this.mainCamera.position);
    this.cameraL.quaternion.copy(this.mainCamera.quaternion);
    this.cameraL.translateX(-halfEye);
    this.cameraL.updateMatrixWorld(true);
    this.cameraL.updateProjectionMatrix();

    // Prepare Right Camera (shifted +halfEye along X)
    this.cameraR.aspect = aspect;
    this.cameraR.fov = this.fov;
    this.cameraR.position.copy(this.mainCamera.position);
    this.cameraR.quaternion.copy(this.mainCamera.quaternion);
    this.cameraR.translateX(halfEye);
    this.cameraR.updateMatrixWorld(true);
    this.cameraR.updateProjectionMatrix();

    // Correct Off-Axis Stereo Projection Shift via Element 8
    // Left eye frustum shifts RIGHT (-= projectionShift)
    // Right eye frustum shifts LEFT (+= projectionShift)
    const focal = Math.max(0.001, this.focalLength);
    const projectionShift = (this.mainCamera.projectionMatrix.elements[0] * halfEye) / focal;

    this.cameraL.projectionMatrix.elements[8] -= projectionShift;
    this.cameraR.projectionMatrix.elements[8] += projectionShift;

    const leftCam = this.swapEyes ? this.cameraR : this.cameraL;
    const rightCam = this.swapEyes ? this.cameraL : this.cameraR;

    // Always update 3D HUD transform relative to mainCamera so stereoscopic eye views
    // calculate natural crossed/zero-parallax disparity in front of the screen.
    if (window.app && window.app.hud3d) {
      window.app.hud3d.updateCameraTransform(this.mainCamera);
    }

    if (this.mode === '2d') {
      this.renderer.setViewport(0, 0, width, height);
      this.renderer.setScissor(0, 0, width, height);
      this.renderer.render(scene, this.mainCamera);
    } else if (this.mode === 'parallel' || this.mode === 'cross') {
      const halfWidth = Math.floor(width / 2);
      const leftX = (this.mode === 'parallel') ? 0 : halfWidth;
      const rightX = (this.mode === 'parallel') ? halfWidth : 0;

      // Left Eye Viewport
      this.renderer.setViewport(leftX, 0, halfWidth, height);
      this.renderer.setScissor(leftX, 0, halfWidth, height);
      this.renderer.render(scene, leftCam);

      // Right Eye Viewport
      this.renderer.setViewport(rightX, 0, halfWidth, height);
      this.renderer.setScissor(rightX, 0, halfWidth, height);
      this.renderer.render(scene, rightCam);
    } else if (this.mode === 'anaglyph') {
      // 1. Render Left Eye Pass into RenderTarget L
      this.renderer.setRenderTarget(this.renderTargetL);
      this.renderer.clear();
      this.renderer.render(scene, leftCam);

      // 2. Render Right Eye Pass into RenderTarget R
      this.renderer.setRenderTarget(this.renderTargetR);
      this.renderer.clear();
      this.renderer.render(scene, rightCam);

      // 3. Composite Pass -> Output Red/Cyan 3D Shader onto Canvas
      this.renderer.setRenderTarget(null);
      this.renderer.setViewport(0, 0, width, height);
      this.renderer.setScissor(0, 0, width, height);
      this.renderer.clear();

      this.anaglyphMaterial.uniforms.mapLeft.value = this.renderTargetL.texture;
      this.anaglyphMaterial.uniforms.mapRight.value = this.renderTargetR.texture;

      this.renderer.render(this.anaglyphScene, this.anaglyphCamera);
    }

    this.renderer.setScissorTest(false);
  }

  handleResize() {
    const frameElement = document.getElementById('viewportFrame');
    if (!frameElement) return;

    const isDual = (this.mode === 'parallel' || this.mode === 'cross');
    const isMobileLandscape = window.innerHeight < 550;

    // Reserved vertical height for header/toolbar margins
    // On mobile landscape, reserve only 50px so 3D Viewport fills 90% of screen height for VR/Smart Glasses!
    const reservedHeight = isMobileLandscape ? 50 : (isDual ? 110 : 150);
    const availH = Math.max(160, window.innerHeight - reservedHeight);
    const availW = Math.max(160, window.innerWidth - 12);

    let frameW = 500;
    let frameH = 500;

    if (isDual) {
      // Dual Viewport (Parallel / Cross 3D): EXACT 2:1 Aspect Ratio (2 x Square Eye Viewports)
      let eyeH = Math.min(availH, availW / 2);
      eyeH = Math.min(eyeH, 650); // Cap max eye height
      frameH = Math.round(eyeH);
      frameW = Math.round(eyeH * 2);
    } else {
      // Single Viewport (2D / Anaglyph): EXACT 1:1 Aspect Ratio (Square)
      let squareS = Math.min(availW, availH);
      squareS = Math.min(squareS, 750); // Cap max square size
      frameW = Math.round(squareS);
      frameH = Math.round(squareS);
    }

    frameElement.style.width = `${frameW}px`;
    frameElement.style.height = `${frameH}px`;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(frameW, frameH, false);

    const targetW = Math.max(1, Math.round(frameW * dpr));
    const targetH = Math.max(1, Math.round(frameH * dpr));
    if (this.renderTargetL) this.renderTargetL.setSize(targetW, targetH);
    if (this.renderTargetR) this.renderTargetR.setSize(targetW, targetH);
  }
}
