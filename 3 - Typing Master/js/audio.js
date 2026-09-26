/**
 * TYPE//TANK - Web Audio API Procedural Synthesizer
 * Zero external audio assets. All sound effects synthesized procedurally.
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.isMuted = false;
    this.hasInitialized = false;

    // Load persisted mute preference
    const savedMute = localStorage.getItem("typetank_audio_muted");
    if (savedMute !== null) {
      this.isMuted = savedMute === "true";
    }
  }

  init() {
    if (this.hasInitialized && this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      this.hasInitialized = true;
    } catch (e) {
      console.warn("AudioContext init error:", e);
    }
  }

  ensureContext() {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.ensureContext();
    this.isMuted = !this.isMuted;
    localStorage.setItem("typetank_audio_muted", this.isMuted.toString());
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  setMuted(muted) {
    this.ensureContext();
    this.isMuted = !!muted;
    localStorage.setItem("typetank_audio_muted", this.isMuted.toString());
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
    }
  }

  /**
   * 1. High-frequency laser shot for normal keystrokes
   */
  playLaserShot() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    // Quick frequency sweep down
    osc.frequency.setValueAtTime(950, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.08);

    // Sharp attack and quick decay
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.085);
  }

  /**
   * 2. Heavy metallic thump / explosion on word elimination
   */
  playExplosion() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Sub oscillator for low punch
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = "sine";
    subOsc.frequency.setValueAtTime(140, t);
    subOsc.frequency.exponentialRampToValueAtTime(30, t + 0.35);

    subGain.gain.setValueAtTime(0.7, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    subOsc.connect(subGain);
    subGain.connect(this.masterGain);
    subOsc.start(t);
    subOsc.stop(t + 0.36);

    // Metallic crunch noise burst
    const bufferSize = this.ctx.sampleRate * 0.25;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.exponentialRampToValueAtTime(150, t + 0.25);
    filter.Q.setValueAtTime(3.0, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noise.start(t);
    noise.stop(t + 0.26);
  }

  /**
   * 3. High-pitched dual-tone chime on red bonus word spawn
   */
  playBonusSpawn() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const tone1 = this.ctx.createOscillator();
    const tone2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    tone1.type = "sine";
    tone1.frequency.setValueAtTime(1046.5, t); // C6
    tone1.frequency.setValueAtTime(1318.5, t + 0.1); // E6

    tone2.type = "triangle";
    tone2.frequency.setValueAtTime(1567.98, t); // G6
    tone2.frequency.setValueAtTime(2093.0, t + 0.1); // C7

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.linearRampToValueAtTime(0.4, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    tone1.connect(gain);
    tone2.connect(gain);
    gain.connect(this.masterGain);

    tone1.start(t);
    tone2.start(t);
    tone1.stop(t + 0.36);
    tone2.stop(t + 0.36);
  }

  /**
   * 4. Low crunch / screen shake buzz on damage impact
   */
  playDamage() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.linearRampToValueAtTime(45, t + 0.3);

    const distFilter = this.ctx.createBiquadFilter();
    distFilter.type = "lowpass";
    distFilter.frequency.setValueAtTime(450, t);

    gain.gain.setValueAtTime(0.65, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

    osc.connect(distFilter);
    distFilter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.33);
  }

  /**
   * 5. Multi-tone triumphant fanfare for new records
   */
  playFanfare() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [
      { freq: 523.25, time: 0.00, dur: 0.12 }, // C5
      { freq: 659.25, time: 0.12, dur: 0.12 }, // E5
      { freq: 783.99, time: 0.24, dur: 0.12 }, // G5
      { freq: 1046.5, time: 0.36, dur: 0.45 }  // C6
    ];

    notes.forEach(n => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(n.freq, t + n.time);

      g.gain.setValueAtTime(0.25, t + n.time);
      g.gain.exponentialRampToValueAtTime(0.001, t + n.time + n.dur);

      osc.connect(g);
      g.connect(this.masterGain);

      osc.start(t + n.time);
      osc.stop(t + n.time + n.dur + 0.05);
    });
  }

  /**
   * 6. Soft retro terminal click on UI buttons and menus
   */
  playClick() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.025);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.03);
  }

  /**
   * Subtle error buzz for mistyped character
   */
  playKeyError() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(110, t);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.065);
  }

  /**
   * Target lock chirp when a new word is acquired
   */
  playLockChirp() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.linearRampToValueAtTime(1200, t + 0.05);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.055);
  }
}

// Global instance
window.soundEngine = new SoundEngine();
