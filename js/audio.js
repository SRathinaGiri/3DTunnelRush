/* ==========================================================================
   3D TUNNEL RUSH - WEB AUDIO SYNTHESIZER
   Version: v1.0.0
   ========================================================================== */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.initialized = false;
    this.bgMusicNode = null;
    this.bgMusicGain = null;
    this.isPlayingMusic = false;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.initialized = true;
      console.log('[AudioEngine v1.0.0] Web Audio API initialized successfully.');
    } catch (e) {
      console.warn('[AudioEngine v1.0.0] Web Audio API not supported:', e);
    }
  }

  ensureContext() {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted && this.bgMusicGain) {
      this.bgMusicGain.gain.setValueAtTime(0, this.ctx.currentTime);
    } else if (!this.muted && this.bgMusicGain) {
      this.bgMusicGain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    }
    return this.muted;
  }

  // Gem Picked Up (Pleasant Arpeggio Chime)
  playCollectSound() {
    if (this.muted || !this.ctx) return;
    try {
      this.ensureContext();
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

      notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.05);

        gain.gain.setValueAtTime(0.15, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.15);
      });
    } catch (err) {
      console.warn('[AudioEngine] playCollectSound error:', err);
    }
  }

  // Speed Boost Sound Effect
  playBoostSound() {
    if (this.muted || !this.ctx) return;
    this.ensureContext();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.4);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  // Collision / Hit Sound
  playHitSound() {
    if (this.muted || !this.ctx) return;
    this.ensureContext();
    const now = this.ctx.currentTime;

    const bufferSize = this.ctx.sampleRate * 0.25;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(50, now + 0.25);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    whiteNoise.start(now);
    whiteNoise.stop(now + 0.25);
  }

  // Game Over Explosion Sound
  playExplosionSound() {
    if (this.muted || !this.ctx) return;
    this.ensureContext();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.8);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.8);

    this.playHitSound();
  }

  // Ambient Synth Background Music Loop
  startAmbientMusic() {
    if (this.isPlayingMusic || !this.ctx) return;
    this.ensureContext();
    this.isPlayingMusic = true;

    const scheduleSeq = () => {
      if (!this.isPlayingMusic || this.muted) return;
      const now = this.ctx.currentTime;
      const bassNotes = [110, 110, 130.81, 146.83]; // A2, C3, D3
      bassNotes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.5);

        gain.gain.setValueAtTime(0.08, now + idx * 0.5);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.5 + 0.45);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.5);
        osc.stop(now + idx * 0.5 + 0.45);
      });
    };

    scheduleSeq();
    this.musicInterval = setInterval(scheduleSeq, 2000);
  }

  stopAmbientMusic() {
    this.isPlayingMusic = false;
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
    }
  }
}

export const soundEngine = new SoundEngine();
