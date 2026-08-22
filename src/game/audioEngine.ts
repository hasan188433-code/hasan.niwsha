/**
 * Procedural Celestial Audio Synthesizer & Combat Sound Effects
 * Handles background romantic ambient drone, star twinkle chimes, moon arrival chords,
 * laser shots, boss attacks, explosions, coin rewards, and upgrade sounds.
 */

class CelestialAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private bgOsc1: OscillatorNode | null = null;
  private bgOsc2: OscillatorNode | null = null;
  private bgGain: GainNode | null = null;
  private isInitialized: boolean = false;
  private customAudio: HTMLAudioElement | null = null;
  private bossVoiceAudio: HTMLAudioElement | null = null;

  public init(musicUrl?: string) {
    if (this.isInitialized) return;

    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();

      if (musicUrl && musicUrl.trim().length > 0) {
        this.customAudio = new Audio(musicUrl);
        this.customAudio.loop = true;
        this.customAudio.volume = 0.4;
        this.customAudio.play().catch(() => {
          this.startSynthesizedAmbient();
        });
      } else {
        this.startSynthesizedAmbient();
      }

      this.isInitialized = true;
    } catch {
      // Audio not supported or blocked
    }
  }

  private startSynthesizedAmbient() {
    if (!this.ctx) return;
    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      this.bgGain = this.ctx.createGain();
      this.bgGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

      // Low warm pad (F2 / 87.31 Hz & C3 / 130.81 Hz)
      this.bgOsc1 = this.ctx.createOscillator();
      this.bgOsc1.type = 'sine';
      this.bgOsc1.frequency.setValueAtTime(87.31, this.ctx.currentTime);

      this.bgOsc2 = this.ctx.createOscillator();
      this.bgOsc2.type = 'triangle';
      this.bgOsc2.frequency.setValueAtTime(130.81, this.ctx.currentTime);

      // Soft filter
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(280, this.ctx.currentTime);

      this.bgOsc1.connect(filter);
      this.bgOsc2.connect(filter);
      filter.connect(this.bgGain);
      this.bgGain.connect(this.ctx.destination);

      this.bgOsc1.start();
      this.bgOsc2.start();
    } catch {
      // Ignore
    }
  }

  // Star message chime & Coin reward
  public playStarTwinkle() {
    if (!this.ctx || this.isMuted) return;
    try {
      if (this.ctx.state === 'suspended') this.ctx.resume();

      const now = this.ctx.currentTime;
      // Arpeggio notes: E5, G#5, B5, E6
      const freqs = [659.25, 830.61, 987.77, 1318.51];
      
      freqs.forEach((freq, i) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);

        gain.gain.setValueAtTime(0, now + i * 0.08);
        gain.gain.linearRampToValueAtTime(0.06, now + i * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 1.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 1.3);
      });
    } catch {
      // Ignore
    }
  }

  // Coin collection audio chime (bright dual chime)
  public playCoinSound() {
    if (!this.ctx || this.isMuted) return;
    try {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(987.77, now); // B5
      osc1.frequency.setValueAtTime(1318.51, now + 0.07); // E6

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1975.53, now + 0.07); // B6

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now + 0.07);
      osc1.stop(now + 0.4);
      osc2.stop(now + 0.4);
    } catch {
      // Ignore
    }
  }

  // Player Laser Shot Sound (Futuristic pew)
  public playPlayerLaser() {
    if (!this.ctx || this.isMuted) return;
    try {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.14);

      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, now);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.16);
    } catch {
      // Ignore
    }
  }

  // Boss Plasma Blast Sound (Deep metallic laser bolt)
  public playBossLaser() {
    if (!this.ctx || this.isMuted) return;
    try {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.22);

      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, now);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {
      // Ignore
    }
  }

  // Boss hit reaction sound
  public playEnemyHit() {
    if (!this.ctx || this.isMuted) return;
    try {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);

      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch {
      // Ignore
    }
  }

  // Player damaged sound
  public playPlayerHit() {
    if (!this.ctx || this.isMuted) return;
    try {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.18);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch {
      // Ignore
    }
  }

  // Boss Destroyed Epic Explosion
  public playBossExplosion() {
    if (!this.ctx || this.isMuted) return;
    try {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const now = this.ctx.currentTime;

      // Noise-like low rumble + high celestial victory chords
      for (let i = 0; i < 4; i++) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = i === 0 ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(180 - i * 35, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 1.2 + i * 0.2);

        gain.gain.setValueAtTime(0.15 / (i + 1), now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6 + i * 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 2.0);
      }
    } catch {
      // Ignore
    }
  }

  // Upgrade Purchased Sound
  public playUpgradeSound() {
    if (!this.ctx || this.isMuted) return;
    try {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const now = this.ctx.currentTime;
      const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

      freqs.forEach((f, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + idx * 0.06);

        gain.gain.setValueAtTime(0.08, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.35);
      });
    } catch {
      // Ignore
    }
  }

  public playMoonChime() {
    if (!this.ctx || this.isMuted) return;
    try {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const now = this.ctx.currentTime;
      // Rich celestial chord
      const freqs = [329.63, 440.0, 554.37, 659.25, 880.0];

      freqs.forEach((freq) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.0);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 3.2);
      });
    } catch {
      // Ignore
    }
  }

  // Play boss activation custom voice message
  public playBossVoice(url: string = 'https://uploadkon.ir/uploads/88d821_26Recording-6-.m4a') {
    if (this.isMuted) return;
    try {
      if (this.bossVoiceAudio) {
        this.bossVoiceAudio.pause();
        this.bossVoiceAudio.currentTime = 0;
      }
      this.bossVoiceAudio = new Audio(url);
      this.bossVoiceAudio.volume = 1.0;
      this.bossVoiceAudio.muted = this.isMuted;
      this.bossVoiceAudio.play().catch((err) => {
        console.warn('Boss voice audio playback failed:', err);
      });
    } catch (err) {
      console.warn('Boss voice init error:', err);
    }
  }

  // Play custom moon voice message when approaching the moon
  private moonVoiceAudio: HTMLAudioElement | null = null;

  public playMoonVoice(url: string = 'https://uploadkon.ir/uploads/e64321_26Recording-7-.m4a') {
    if (this.isMuted) return;
    try {
      if (this.moonVoiceAudio) {
        this.moonVoiceAudio.pause();
        this.moonVoiceAudio.currentTime = 0;
      }
      this.moonVoiceAudio = new Audio(url);
      this.moonVoiceAudio.volume = 1.0;
      this.moonVoiceAudio.muted = this.isMuted;
      this.moonVoiceAudio.play().catch((err) => {
        console.warn('Moon voice audio playback failed:', err);
      });
    } catch (err) {
      console.warn('Moon voice init error:', err);
    }
  }

  public stopMoonVoice() {
    if (this.moonVoiceAudio) {
      try {
        this.moonVoiceAudio.pause();
        this.moonVoiceAudio.currentTime = 0;
      } catch {
        // Ignore
      }
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.bgGain && this.ctx) {
      this.bgGain.gain.setValueAtTime(this.isMuted ? 0 : 0.04, this.ctx.currentTime);
    }
    if (this.customAudio) {
      this.customAudio.muted = this.isMuted;
    }
    if (this.bossVoiceAudio) {
      this.bossVoiceAudio.muted = this.isMuted;
    }
    if (this.moonVoiceAudio) {
      this.moonVoiceAudio.muted = this.isMuted;
    }
    return !this.isMuted;
  }

  public dispose() {
    try {
      if (this.bgOsc1) this.bgOsc1.stop();
      if (this.bgOsc2) this.bgOsc2.stop();
      if (this.customAudio) {
        this.customAudio.pause();
        this.customAudio = null;
      }
      if (this.bossVoiceAudio) {
        this.bossVoiceAudio.pause();
        this.bossVoiceAudio = null;
      }
      if (this.moonVoiceAudio) {
        this.moonVoiceAudio.pause();
        this.moonVoiceAudio = null;
      }
      if (this.ctx && this.ctx.state !== 'closed') {
        this.ctx.close();
      }
      this.ctx = null;
      this.isInitialized = false;
    } catch {
      // Ignore
    }
  }
}

export const celestialAudio = new CelestialAudioEngine();
