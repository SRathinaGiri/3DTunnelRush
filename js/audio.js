/* ==========================================================================
   3D TUNNEL RUSH - WEB AUDIO SYNTHESIZER
   Version: v4.14.0
   ========================================================================== */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.initialized = false;
    this.bgMusicNode = null;
    this.bgMusicGain = null;
    this.isPlayingMusic = false;
    this.consecutivePickups = 0;
    this.lastPickupTime = 0;
  }

  init() {
    if (this.initialized && this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.initialized = true;
        console.log(`[AudioEngine v4.21.0] Web Audio API initialized (state: ${this.ctx.state}).`);
      }
    } catch (e) {
      console.warn('[AudioEngine v4.21.0] Web Audio API not supported:', e);
    }
  }

  ensureContext() {
    if (!this.initialized || !this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(e => console.warn('[AudioEngine] Resume error:', e));
    }
    return this.ctx;
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted && this.bgMusicGain) {
      this.bgMusicGain.gain.setValueAtTime(0, this.ctx ? this.ctx.currentTime : 0);
    } else if (!this.muted && this.bgMusicGain && this.ctx) {
      this.bgMusicGain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    }
    return this.muted;
  }

  // Gem Picked Up (Pleasant Sci-Fi Arpeggio Chime with Pitch-Climbing Chords)
  playCollectSound(isSuper = false) {
    this.ensureContext();
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      if (now - this.lastPickupTime < 1.5) {
        this.consecutivePickups++;
      } else {
        this.consecutivePickups = 0;
      }
      this.lastPickupTime = now;

      const pitchShift = 1.0 + Math.min(8, this.consecutivePickups) * 0.08;
      const baseNotes = isSuper
        ? [523.25, 659.25, 783.99, 1046.50, 1318.51] // Super Booster Rainbow Chord
        : [523.25, 659.25, 783.99, 1046.50];

      baseNotes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = isSuper ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq * pitchShift, now + i * 0.04);

        gain.gain.setValueAtTime(isSuper ? 0.25 : 0.18, now + i * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.18);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + i * 0.04);
        osc.stop(now + i * 0.04 + 0.18);
      });
    } catch (err) {
      console.warn('[AudioEngine] playCollectSound error:', err);
    }
  }

  // Hyper-Warp Level Roller Coaster Sound Effect (Resonant Synth Sweep)
  playWarpSweepSound() {
    this.ensureContext();
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 1.2);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(300, now);
      filter.frequency.exponentialRampToValueAtTime(3500, now + 1.2);
      filter.Q.value = 6;

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 1.2);
    } catch (err) {
      console.warn('[AudioEngine] playWarpSweepSound error:', err);
    }
  }

  // Speed Boost Sound Effect (Pitch Sweep)
  playBoostSound() {
    this.ensureContext();
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(750, now + 0.35);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (err) {
      console.warn('[AudioEngine] playBoostSound error:', err);
    }
  }

  // Collision / Spiked Mine Hit Sound
  playHitSound() {
    this.ensureContext();
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.25);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, now);
      filter.frequency.exponentialRampToValueAtTime(60, now + 0.25);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      whiteNoise.start(now);
      whiteNoise.stop(now + 0.25);
    } catch (err) {
      console.warn('[AudioEngine] playHitSound error:', err);
    }
  }

  // Game Over Explosion Sound
  playExplosionSound() {
    this.ensureContext();
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(25, now + 0.85);

      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.85);

      this.playHitSound();
    } catch (err) {
      console.warn('[AudioEngine] playExplosionSound error:', err);
    }
  }

  // Ambient Synth Background Music Loop
  startAmbientMusic() {
    this.ensureContext();
    if (this.isPlayingMusic || !this.ctx) return;
    this.isPlayingMusic = true;

    const scheduleSeq = () => {
      if (!this.isPlayingMusic || this.muted || !this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        const bassNotes = [110.0, 110.0, 130.81, 146.83, 164.81, 130.81]; // A2, C3, D3, E3, C3
        bassNotes.forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now + idx * 0.35);

          // Low-pass filter for smooth synthwave warmth
          const filter = this.ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(450, now + idx * 0.35);

          gain.gain.setValueAtTime(0.06, now + idx * 0.35);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.35 + 0.32);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(now + idx * 0.35);
          osc.stop(now + idx * 0.35 + 0.32);
        });
      } catch (err) {
        console.warn('[AudioEngine] Ambient music error:', err);
      }
    };

    scheduleSeq();
    this.musicInterval = setInterval(scheduleSeq, 2100);
  }

  stopAmbientMusic() {
    this.isPlayingMusic = false;
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
    }
  }
}

export const soundEngine = new SoundEngine();
