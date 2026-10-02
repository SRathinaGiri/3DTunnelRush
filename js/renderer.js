/* ==========================================================================
   3D TUNNEL RUSH - STEREOSCOPIC 3D RENDER ENGINE (STEREO.JS ARCHITECTURE)
   Version: v4.3.1
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

    if (this.mode === '2d') {
      if (window.app && window.app.hud3d) window.app.hud3d.updateCameraTransform(this.mainCamera);
      this.renderer.setViewport(0, 0, width, height);
      this.renderer.setScissor(0, 0, width, height);
      this.renderer.render(scene, this.mainCamera);
    } else if (this.mode === 'parallel' || this.mode === 'cross') {
      const halfWidth = Math.floor(width / 2);
      const leftX = (this.mode === 'parallel') ? 0 : halfWidth;
      const rightX = (this.mode === 'parallel') ? halfWidth : 0;

      // Left Eye Viewport (HUD zero parallax aligned to screen plane)
      if (window.app && window.app.hud3d) window.app.hud3d.updateCameraTransform(leftCam);
      this.renderer.setViewport(leftX, 0, halfWidth, height);
      this.renderer.setScissor(leftX, 0, halfWidth, height);
      this.renderer.render(scene, leftCam);

      // Right Eye Viewport (HUD zero parallax aligned to screen plane)
      if (window.app && window.app.hud3d) window.app.hud3d.updateCameraTransform(rightCam);
      this.renderer.setViewport(rightX, 0, halfWidth, height);
      this.renderer.setScissor(rightX, 0, halfWidth, height);
      this.renderer.render(scene, rightCam);

      // Restore main camera transform for HUD tracking
      if (window.app && window.app.hud3d) window.app.hud3d.updateCameraTransform(this.mainCamera);
    } else if (this.mode === 'anaglyph') {
      this.renderer.setViewport(0, 0, width, height);
      this.renderer.setScissor(0, 0, width, height);
      this.renderer.clear();

      // Left Eye -> Red Channel (Zero Parallax HUD)
      if (window.app && window.app.hud3d) window.app.hud3d.updateCameraTransform(leftCam);
      this.renderer.colorMask(true, false, false, true);
      this.renderer.render(scene, leftCam);

      // Right Eye -> Cyan Channel (Zero Parallax HUD)
      if (window.app && window.app.hud3d) window.app.hud3d.updateCameraTransform(rightCam);
      this.renderer.clearDepth();
      this.renderer.colorMask(false, true, true, true);
      this.renderer.render(scene, rightCam);

      this.renderer.colorMask(true, true, true, true);
      if (window.app && window.app.hud3d) window.app.hud3d.updateCameraTransform(this.mainCamera);
    }

    this.renderer.setScissorTest(false);
  }

  handleResize() {
    const frameElement = document.getElementById('viewportFrame');
    if (!frameElement) return;

    const isDual = (this.mode === 'parallel' || this.mode === 'cross');

    // Reserved vertical height for header overlay, solid block HUD, virtual keypad & padding
    const reservedHeight = 220;
    const availH = Math.max(180, window.innerHeight - reservedHeight);
    const availW = Math.max(180, window.innerWidth - 24);

    let frameW = 500;
    let frameH = 500;

    if (isDual) {
      // Dual Viewport (Parallel / Cross 3D): EXACT 2:1 Aspect Ratio (2 x Square Eye Viewports)
      // Height constrained by availH in Landscape, Width constrained by availW in Portrait
      let eyeH = Math.min(availH, availW / 2);
      eyeH = Math.min(eyeH, 550); // Cap max eye height on ultra-wide screens
      frameH = Math.round(eyeH);
      frameW = Math.round(eyeH * 2);
    } else {
      // Single Viewport (2D / Anaglyph): EXACT 1:1 Aspect Ratio (Square)
      let squareS = Math.min(availW, availH);
      squareS = Math.min(squareS, 650); // Cap max square size
      frameW = Math.round(squareS);
      frameH = Math.round(squareS);
    }

    frameElement.style.width = `${frameW}px`;
    frameElement.style.height = `${frameH}px`;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(frameW, frameH, false);
  }
}
