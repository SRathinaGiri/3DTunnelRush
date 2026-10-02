/* ==========================================================================
   3D TUNNEL RUSH - 4-WAY INPUT & CONTROLS HANDLER (KEYBOARD, TOUCH, GYRO)
   Version: v4.0.0
   ========================================================================== */

export class ControlsHandler {
  constructor() {
    this.keys = {
      left: false,
      right: false,
      up: false,
      down: false
    };

    this.touchActive = false;
    this.touchStartX = 0;
    this.touchStartY = 0;

    // Gyroscope / Device Orientation State
    this.gyroEnabled = false;
    this.gyroAvailable = (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window);
    this.gyroCalibrated = false;
    this.gyroFrames = 0;
    this.gyroBaseRoll = 0;
    this.gyroBasePitch = 0;
    this.smoothedRoll = 0;
    this.smoothedPitch = 0;

    this.handleOrientation = this.handleOrientation.bind(this);

    this.onPauseToggle = null;
    this.initKeyboardListeners();
  }

  toggleGyroscope(onStateChange) {
    if (!this.gyroAvailable) {
      alert('Gyroscope / Device Orientation sensor is not supported on this device or browser.');
      return false;
    }

    if (!this.gyroEnabled) {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
          .then(permissionState => {
            if (permissionState === 'granted') {
              this.enableGyroscope(onStateChange);
            } else {
              alert('Permission to access motion/gyroscope sensors was denied.');
            }
          })
          .catch(err => {
            console.warn('[ControlsHandler] Gyro permission error:', err);
            this.enableGyroscope(onStateChange);
          });
      } else {
        this.enableGyroscope(onStateChange);
      }
    } else {
      this.disableGyroscope(onStateChange);
    }
  }

  enableGyroscope(onStateChange) {
    this.gyroEnabled = true;
    this.gyroCalibrated = false;
    this.gyroFrames = 0;
    this.gyroBaseRoll = 0;
    this.gyroBasePitch = 0;
    this.smoothedRoll = 0;
    this.smoothedPitch = 0;

    window.addEventListener('deviceorientation', this.handleOrientation, true);
    console.log('[ControlsHandler] Calibrated Gyroscope tilt steering ENABLED.');
    if (onStateChange) onStateChange(true);
  }

  disableGyroscope(onStateChange) {
    this.gyroEnabled = false;
    window.removeEventListener('deviceorientation', this.handleOrientation, true);
    this.reset();
    console.log('[ControlsHandler] Gyroscope tilt steering DISABLED.');
    if (onStateChange) onStateChange(false);
  }

  handleOrientation(event) {
    if (!this.gyroEnabled || !event) return;

    let rawBeta = event.beta || 0;   // [-180, 180]
    let rawGamma = event.gamma || 0; // [-90, 90]

    // Detect screen orientation angle (Portrait 0/180 vs Landscape 90/-90)
    let orientationAngle = 0;
    if (typeof window.orientation !== 'undefined') {
      orientationAngle = window.orientation;
    } else if (window.screen && window.screen.orientation && typeof window.screen.orientation.angle !== 'undefined') {
      orientationAngle = window.screen.orientation.angle;
    }

    let rawRoll = 0;  // Left/Right tilt
    let rawPitch = 0; // Forward/Back tilt

    if (orientationAngle === 90) {
      // Landscape Left
      rawRoll = rawBeta;
      rawPitch = -rawGamma;
    } else if (orientationAngle === -90 || orientationAngle === 270) {
      // Landscape Right
      rawRoll = -rawBeta;
      rawPitch = rawGamma;
    } else if (orientationAngle === 180) {
      // Upside down Portrait
      rawRoll = -rawGamma;
      rawPitch = -rawBeta;
    } else {
      // Standard Portrait (0 deg)
      rawRoll = rawGamma;
      rawPitch = rawBeta;
    }

    // Auto-calibration zero-point offset during first 5 frames
    if (!this.gyroCalibrated) {
      this.gyroFrames++;
      this.gyroBaseRoll += rawRoll;
      this.gyroBasePitch += rawPitch;
      if (this.gyroFrames >= 5) {
        this.gyroBaseRoll /= 5;
        this.gyroBasePitch /= 5;
        this.gyroCalibrated = true;
        console.log(`[ControlsHandler] Gyro auto-calibrated neutral zero: Roll=${this.gyroBaseRoll.toFixed(1)}, Pitch=${this.gyroBasePitch.toFixed(1)}`);
      }
      return;
    }

    // Exponential moving average smoothing (low-pass filter) to eliminate jitter
    const deltaRoll = rawRoll - this.gyroBaseRoll;
    const deltaPitch = rawPitch - this.gyroBasePitch;

    this.smoothedRoll = THREE.MathUtils.lerp(this.smoothedRoll, deltaRoll, 0.25);
    this.smoothedPitch = THREE.MathUtils.lerp(this.smoothedPitch, deltaPitch, 0.25);

    // Deadzone & Proportional thresholding
    const deadzoneX = 4.5; // 4.5 degrees deadzone for Roll
    const deadzoneY = 5.0; // 5.0 degrees deadzone for Pitch

    if (this.smoothedRoll < -deadzoneX) {
      this.keys.left = true;
      this.keys.right = false;
    } else if (this.smoothedRoll > deadzoneX) {
      this.keys.right = true;
      this.keys.left = false;
    } else {
      this.keys.left = false;
      this.keys.right = false;
    }

    if (this.smoothedPitch < -deadzoneY) {
      // Tilting phone forward -> FLY UP
      this.keys.up = true;
      this.keys.down = false;
    } else if (this.smoothedPitch > deadzoneY) {
      // Tilting phone backward -> FLY DOWN
      this.keys.down = true;
      this.keys.up = false;
    } else {
      this.keys.up = false;
      this.keys.down = false;
    }
  }

  initKeyboardListeners() {
    window.addEventListener('keydown', (e) => {
      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          this.keys.left = true;
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.keys.right = true;
          break;
        case 'ArrowUp':
        case 'KeyW':
          this.keys.up = true;
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.keys.down = true;
          break;
        case 'KeyP':
        case 'Escape':
          if (this.onPauseToggle) this.onPauseToggle();
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          this.keys.left = false;
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.keys.right = false;
          break;
        case 'ArrowUp':
        case 'KeyW':
          this.keys.up = false;
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.keys.down = false;
          break;
      }
    });
  }

  bindVirtualKeypad() {
    const btnLeft = document.getElementById('vkLeft');
    const btnRight = document.getElementById('vkRight');
    const btnUp = document.getElementById('vkUp');
    const btnDown = document.getElementById('vkDown');

    const addTouchEvents = (element, keyProp) => {
      if (!element) return;
      const start = (e) => {
        if (e.cancelable) e.preventDefault();
        this.keys[keyProp] = true;
      };
      const end = (e) => {
        if (e.cancelable) e.preventDefault();
        this.keys[keyProp] = false;
      };

      element.addEventListener('touchstart', start, { passive: false });
      element.addEventListener('touchend', end, { passive: false });
      element.addEventListener('mousedown', start);
      element.addEventListener('mouseup', end);
      element.addEventListener('mouseleave', end);
    };

    addTouchEvents(btnLeft, 'left');
    addTouchEvents(btnRight, 'right');
    addTouchEvents(btnUp, 'up');
    addTouchEvents(btnDown, 'down');
  }

  bindCanvasTouchSwipe(canvasElement) {
    if (!canvasElement) return;

    canvasElement.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        this.touchActive = true;
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    canvasElement.addEventListener('touchmove', (e) => {
      if (!this.touchActive || e.touches.length === 0) return;
      const dx = e.touches[0].clientX - this.touchStartX;
      const dy = e.touches[0].clientY - this.touchStartY;
      const threshold = 10;

      this.keys.left = dx < -threshold;
      this.keys.right = dx > threshold;
      this.keys.up = dy < -threshold;   // Swiping UP decreases Y
      this.keys.down = dy > threshold;  // Swiping DOWN increases Y
    }, { passive: true });

    canvasElement.addEventListener('touchend', () => {
      this.touchActive = false;
      this.keys.left = false;
      this.keys.right = false;
      this.keys.up = false;
      this.keys.down = false;
    });
  }

  reset() {
    this.keys.left = false;
    this.keys.right = false;
    this.keys.up = false;
    this.keys.down = false;
  }
}
