/* ==========================================================================
   3D TUNNEL RUSH - 4-WAY INPUT & CONTROLS HANDLER (KEYBOARD, TOUCH, GYRO)
   Version: v4.24.0
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

    // Screen Wake Lock API State (keeps mobile screen awake during flight)
    this.wakeLock = null;
    this.wakeLockRequested = false;

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
    this.setupWakeLockAutoReacquire();
  }

  async requestWakeLock() {
    this.wakeLockRequested = true;
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try {
        if (this.wakeLock !== null) return;
        this.wakeLock = await navigator.wakeLock.request('screen');
        console.log('[ControlsHandler] Screen Wake Lock activated (screen kept awake).');
        this.wakeLock.addEventListener('release', () => {
          console.log('[ControlsHandler] Screen Wake Lock released.');
          this.wakeLock = null;
        });
      } catch (err) {
        console.warn('[ControlsHandler] Screen Wake Lock request failed:', err);
      }
    }
  }

  async releaseWakeLock() {
    this.wakeLockRequested = false;
    if (this.wakeLock !== null) {
      try {
        await this.wakeLock.release();
        this.wakeLock = null;
      } catch (err) {
        console.warn('[ControlsHandler] Screen Wake Lock release error:', err);
      }
    }
  }

  setupWakeLockAutoReacquire() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', async () => {
        if (document.visibilityState === 'visible' && this.wakeLockRequested) {
          await this.requestWakeLock();
        }
      });
    }
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
          e.preventDefault();
          this.keys.left = true;
          break;
        case 'ArrowRight':
        case 'KeyD':
          e.preventDefault();
          this.keys.right = true;
          break;
        case 'ArrowUp':
        case 'KeyW':
          e.preventDefault();
          this.keys.up = true;
          break;
        case 'ArrowDown':
        case 'KeyS':
          e.preventDefault();
          this.keys.down = true;
          break;
        case 'Space':
          e.preventDefault();
          break;
        case 'KeyP':
        case 'Escape':
          e.preventDefault();
          if (this.onPauseToggle) this.onPauseToggle();
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          e.preventDefault();
          this.keys.left = false;
          break;
        case 'ArrowRight':
        case 'KeyD':
          e.preventDefault();
          this.keys.right = false;
          break;
        case 'ArrowUp':
        case 'KeyW':
          e.preventDefault();
          this.keys.up = false;
          break;
        case 'ArrowDown':
        case 'KeyS':
          e.preventDefault();
          this.keys.down = false;
          break;
        case 'Space':
          e.preventDefault();
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

  bindScreenTouchControls(containerElement) {
    if (!containerElement) return;

    const touchMap = new Map();

    const updateKeysFromTouches = (e) => {
      let left = false;
      let right = false;
      let up = false;
      let down = false;

      const windowW = window.innerWidth;
      const windowH = window.innerHeight;

      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        const touchData = touchMap.get(touch.identifier);

        const curX = touch.clientX;
        const curY = touch.clientY;
        const startX = touchData ? touchData.startX : curX;
        const startY = touchData ? touchData.startY : curY;

        const deltaX = curX - startX;
        const deltaY = curY - startY;

        // 1. Horizontal steering: Left 50% screen OR swipe left -> LEFT; Right 50% screen OR swipe right -> RIGHT
        if (curX < windowW * 0.5 || deltaX < -15) {
          left = true;
        }
        if (curX >= windowW * 0.5 || deltaX > 15) {
          right = true;
        }

        // 2. Vertical steering: Top 40% screen OR swipe UP (deltaY < -12) -> UP; Bottom 40% screen OR swipe DOWN (deltaY > 12) -> DOWN
        if (curY < windowH * 0.40 || deltaY < -12) {
          up = true;
        } else if (curY > windowH * 0.60 || deltaY > 12) {
          down = true;
        }
      }

      this.keys.left = left;
      this.keys.right = right;
      this.keys.up = up;
      this.keys.down = down;
    };

    const handleTouchStart = (e) => {
      // Request Wake Lock on touch gesture to keep screen awake during play
      this.requestWakeLock();

      const targetBtn = e.target.closest('button, input, select, .modal-card, .modal-overlay, .icon-btn, .vk-btn-large');
      if (targetBtn) return;

      if (e.cancelable) e.preventDefault();

      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        touchMap.set(t.identifier, { startX: t.clientX, startY: t.clientY });
      }

      updateKeysFromTouches(e);
    };

    const handleTouchMove = (e) => {
      const targetBtn = e.target.closest('button, input, select, .modal-card, .modal-overlay, .icon-btn, .vk-btn-large');
      if (targetBtn) return;

      if (e.cancelable) e.preventDefault();

      updateKeysFromTouches(e);
    };

    const handleTouchEnd = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        touchMap.delete(t.identifier);
      }

      if (e.touches.length === 0) {
        this.reset();
      } else {
        updateKeysFromTouches(e);
      }
    };

    containerElement.addEventListener('touchstart', handleTouchStart, { passive: false });
    containerElement.addEventListener('touchmove', handleTouchMove, { passive: false });
    containerElement.addEventListener('touchend', handleTouchEnd, { passive: false });
    containerElement.addEventListener('touchcancel', handleTouchEnd, { passive: false });
  }

  bindCanvasTouchSwipe(element) {
    this.bindScreenTouchControls(element);
  }

  reset() {
    this.keys.left = false;
    this.keys.right = false;
    this.keys.up = false;
    this.keys.down = false;
  }
}
