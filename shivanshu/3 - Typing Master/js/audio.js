/**
 * TYPE//TANK - Audio Synthesizer Engine (Web Audio API)
 * Global: window.Sfx
 */

(function () {
  'use strict';

  // Audio Context and Master Gain
  let ctx = null;
  let masterGain = null;
  let isMuted = false;

  // Voice Limiter for Laser Shots (prevents clipping during 100+ WPM typing)
  const MAX_CONCURRENT_LASERS = 8;
  let activeLaserCount = 0;

  // Cached noise buffer for explosions and crunches
  let noiseBuffer = null;

  /**
   * Lazily initialize or resume AudioContext on first user interaction
   */
  function initAudio() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        console.warn('Web Audio API not supported in this browser environment.');
        return null;
      }
      ctx = new AudioCtx();
      masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(isMuted ? 0 : 0.8, ctx.currentTime);
      masterGain.connect(ctx.destination);
      generateNoiseBuffer();
    }

    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    return ctx;
  }

  /**
   * Generate 2-second white noise buffer for percussive explosions & crunch sounds
   */
  function generateNoiseBuffer() {
    if (!ctx) return;
    const bufferSize = ctx.sampleRate * 2;
    noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }

  /**
   * Safe helper to execute sound creation only if AudioContext is active and not muted
   */
  function canPlay() {
    initAudio();
    return ctx && ctx.state === 'running' && !isMuted;
  }

  const Sfx = {
    /**
     * Initialize audio context on initial user gesture
     */
    init() {
      initAudio();
    },

    /**
     * Mute / Unmute state
     */
    setMuted(muted) {
      isMuted = !!muted;
      if (masterGain && ctx) {
        masterGain.gain.setValueAtTime(isMuted ? 0 : 0.8, ctx.currentTime);
      }
    },

    isMuted() {
      return isMuted;
    },

    toggleMute() {
      this.setMuted(!isMuted);
      return isMuted;
    },

    /**
     * 1. Laser Shot: Fast downward square sweep
     */
    laser() {
      if (!canPlay()) return;
      if (activeLaserCount >= MAX_CONCURRENT_LASERS) return;

      activeLaserCount++;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.08);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(now);
      osc.stop(now + 0.08);

      osc.onended = () => {
        activeLaserCount = Math.max(0, activeLaserCount - 1);
      };
    },

    /**
     * 2. Word Explosion: Filtered noise burst + low sine thump
     */
    explosion() {
      if (!canPlay()) return;
      const now = ctx.currentTime;

      // Low sine thump
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(140, now);
      subOsc.frequency.exponentialRampToValueAtTime(30, now + 0.35);

      subGain.gain.setValueAtTime(0.4, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      subOsc.connect(subGain);
      subGain.connect(masterGain);
      subOsc.start(now);
      subOsc.stop(now + 0.35);

      // Noise burst with lowpass filter sweep
      if (noiseBuffer) {
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1800, now);
        filter.frequency.exponentialRampToValueAtTime(80, now + 0.4);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.35, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(masterGain);

        noise.start(now);
        noise.stop(now + 0.4);
      }
    },

    /**
     * 3. Crimson Target Spawn: High two-tone alert chime
     */
    crimsonSpawn() {
      if (!canPlay()) return;
      const now = ctx.currentTime;

      // Tone 1
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      gain1.gain.setValueAtTime(0.25, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc1.connect(gain1);
      gain1.connect(masterGain);
      osc1.start(now);
      osc1.stop(now + 0.18);

      // Tone 2 (higher)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(880, now + 0.12); // A5
      gain2.gain.setValueAtTime(0.3, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc2.connect(gain2);
      gain2.connect(masterGain);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.35);
    },

    /**
     * 4. Hull Breach Hit: Low sawtooth crunch + filtered noise
     */
    hullHit() {
      if (!canPlay()) return;
      const now = ctx.currentTime;

      const saw = ctx.createOscillator();
      const sawGain = ctx.createGain();
      saw.type = 'sawtooth';
      saw.frequency.setValueAtTime(90, now);
      saw.frequency.exponentialRampToValueAtTime(35, now + 0.3);

      sawGain.gain.setValueAtTime(0.5, now);
      sawGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      saw.connect(sawGain);
      sawGain.connect(masterGain);
      saw.start(now);
      saw.stop(now + 0.3);

      if (noiseBuffer) {
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(450, now);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.4, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(masterGain);

        noise.start(now);
        noise.stop(now + 0.3);
      }
    },

    /**
     * 5. Miss: Short dull error blip
     */
    miss() {
      if (!canPlay()) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.linearRampToValueAtTime(90, now + 0.07);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.07);
    },

    /**
     * 6. UI Navigation Click: Tiny square tick
     */
    uiClick() {
      if (!canPlay()) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(700, now);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.02);
    },

    /**
     * 7. Countdown Beeps: 3-2-1 countdown
     * @param {boolean} isGo If true, plays high pitch 'GO' chord
     */
    countdownBeep(isGo = false) {
      if (!canPlay()) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';

      if (isGo) {
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      } else {
        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      }

      osc.connect(gain);
      gain.connect(masterGain);
    },

    /**
     * 8. Level Up Arpeggio: Ascending 4-tone sequence
     */
    levelUp() {
      if (!canPlay()) return;
      const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
      const now = ctx.currentTime;

      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = now + i * 0.06;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.2, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(startTime);
        osc.stop(startTime + 0.15);
      });
    },

    /**
     * 9. Game Over: Descending heavy tones
     */
    gameOver() {
      if (!canPlay()) return;
      const notes = [220, 196, 174.61, 146.83];
      const now = ctx.currentTime;

      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = now + i * 0.14;

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.35, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(startTime);
        osc.stop(startTime + 0.25);
      });
    },

    /**
     * 10. Record Fanfare: Celebratory multi-note arpeggio
     */
    fanfare() {
      if (!canPlay()) return;
      const chordNotes = [
        { f: 523.25, t: 0.00 }, // C5
        { f: 659.25, t: 0.08 }, // E5
        { f: 783.99, t: 0.16 }, // G5
        { f: 1046.50, t: 0.26 }  // C6
      ];
      const now = ctx.currentTime;

      chordNotes.forEach(({ f, t }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = now + t;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, startTime);

        gain.gain.setValueAtTime(0.25, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(startTime);
        osc.stop(startTime + 0.45);
      });
    }
  };

  // Expose global namespace
  window.Sfx = Sfx;
})();
