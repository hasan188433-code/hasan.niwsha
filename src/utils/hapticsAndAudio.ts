// Web Audio and Haptic Vibration Engine for Synchronized Heartbeat & Messenger

let audioCtx: AudioContext | null = null;
let isAudioUnlocked = false;

export function isVibrationSupported(): boolean {
  return typeof window !== 'undefined' && 'vibrate' in navigator;
}

export function isIosDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Unlock AudioContext & mobile vibration permissions on user gesture
 */
export function unlockAudioAndHaptics(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        ctx
          .resume()
          .then(() => {
            isAudioUnlocked = true;
            triggerHaptic(40);
            resolve(true);
          })
          .catch(() => resolve(false));
      } else {
        // Play micro silent buffer to prime mobile audio hardware
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
        isAudioUnlocked = true;
        triggerHaptic(40);
        resolve(true);
      }
    } catch {
      resolve(false);
    }
  });
}

// Global auto-unlock listeners on first touch/click
if (typeof window !== 'undefined') {
  const handleFirstInteraction = () => {
    unlockAudioAndHaptics();
  };
  window.addEventListener('touchstart', handleFirstInteraction, { passive: true, once: true });
  window.addEventListener('touchend', handleFirstInteraction, { passive: true, once: true });
  window.addEventListener('click', handleFirstInteraction, { passive: true, once: true });
  window.addEventListener('mousedown', handleFirstInteraction, { passive: true, once: true });
}

/**
 * Trigger native mobile haptic vibration with queue reset for maximum Android Chrome reliability
 */
export function triggerHaptic(pattern: number | number[] = [90, 80, 110]) {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      // 1. Reset pending vibrations to avoid queue locks on Android
      navigator.vibrate(0);
      // 2. Fire clean solid vibration
      navigator.vibrate(pattern);
    } catch {
      // Ignore vibration unsupported errors
    }
  }
}

/**
 * Biological Heartbeat Audio: Lub (ventricular systole) and Dub (semilunar closure)
 */
export function playBiologicalHeartbeat(
  phase: 'lub' | 'dub',
  soundEnabled = true,
  subBassVolume = 0.95
) {
  try {
    const ctx = getAudioContext();
    const t0 = ctx.currentTime;

    // 1. Sub-Bass Acoustic Rumble (Creates physical speaker resonance/vibration on phones)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(phase === 'lub' ? 44 : 52, t0);
    subOsc.frequency.exponentialRampToValueAtTime(18, t0 + 0.16);

    subGain.gain.setValueAtTime(0.01, t0);
    subGain.gain.linearRampToValueAtTime(subBassVolume, t0 + 0.02);
    subGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.16);

    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(t0);
    subOsc.stop(t0 + 0.16);

    // 2. Audible acoustic heartbeat sound
    if (soundEnabled) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(phase === 'lub' ? 120 : 155, t0);

      const freq = phase === 'lub' ? 64 : 82;
      const duration = phase === 'lub' ? 0.12 : 0.1;
      const volume = phase === 'lub' ? 0.65 : 0.5;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      osc.frequency.exponentialRampToValueAtTime(32, t0 + duration);

      gain.gain.setValueAtTime(0.01, t0);
      gain.gain.linearRampToValueAtTime(volume, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t0);
      osc.stop(t0 + duration);
    }
  } catch (e) {
    console.warn('Audio play error:', e);
  }
}

/**
 * Play a full two-stage Lub-Dub heartbeat cycle with robust vibration
 */
export function playFullHeartbeatCycle(soundEnabled = true) {
  // Clear and trigger solid double-thump vibration: Lub (85ms), pause (65ms), Dub (110ms)
  triggerHaptic([85, 65, 110]);
  playBiologicalHeartbeat('lub', soundEnabled);
  setTimeout(() => {
    playBiologicalHeartbeat('dub', soundEnabled);
  }, 130);
}

/**
 * Realistic Kiss Sound (صدای بوسه و ماچ طبیعی با افکت مکش و پاپ لب‌ها)
 */
export function playRealisticKissSound(soundEnabled = true) {
  // Tactile lip-touch vibration: small prep, smack punch, release linger
  triggerHaptic([40, 25, 110, 40, 160]);

  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    const t0 = ctx.currentTime;

    // --- Component A: Noise Smack / Lip Suction Pop ---
    const bufferSize = ctx.sampleRate * 0.12;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.025));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(800, t0);
    noiseFilter.frequency.exponentialRampToValueAtTime(2800, t0 + 0.04);
    noiseFilter.frequency.exponentialRampToValueAtTime(600, t0 + 0.11);
    noiseFilter.Q.setValueAtTime(3.5, t0);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.01, t0);
    noiseGain.gain.linearRampToValueAtTime(0.55, t0 + 0.015);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.11);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(t0);

    // --- Component B: Formant "Mwah" Suction Pitch Sweep ---
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(360, t0);
    osc.frequency.exponentialRampToValueAtTime(1450, t0 + 0.035);
    osc.frequency.exponentialRampToValueAtTime(420, t0 + 0.14);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1600, t0);
    filter.frequency.exponentialRampToValueAtTime(3200, t0 + 0.04);
    filter.frequency.exponentialRampToValueAtTime(800, t0 + 0.14);

    gain.gain.setValueAtTime(0.01, t0);
    gain.gain.linearRampToValueAtTime(0.45, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.15);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.16);

    // --- Component C: Sweet Romantic Resonance Chime (Harmonic Bell) ---
    const chimeOsc = ctx.createOscillator();
    const chimeGain = ctx.createGain();
    chimeOsc.type = 'sine';
    chimeOsc.frequency.setValueAtTime(1046.5, t0 + 0.05); // High C
    chimeOsc.frequency.exponentialRampToValueAtTime(1318.5, t0 + 0.28); // E6

    chimeGain.gain.setValueAtTime(0.01, t0 + 0.05);
    chimeGain.gain.linearRampToValueAtTime(0.18, t0 + 0.09);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.35);

    chimeOsc.connect(chimeGain);
    chimeGain.connect(ctx.destination);
    chimeOsc.start(t0 + 0.05);
    chimeOsc.stop(t0 + 0.36);
  } catch (e) {
    console.warn('Kiss audio error:', e);
  }
}

/**
 * Play warm deep Hug (آغوش گرم با لرزش طولانی و ارتعاش قفسه سینه)
 */
export function playHugSound(soundEnabled = true) {
  // Long warm wrapping vibration
  triggerHaptic([140, 50, 200, 50, 260]);

  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    const t0 = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(85, t0);
    osc1.frequency.linearRampToValueAtTime(130, t0 + 0.35);
    osc1.frequency.linearRampToValueAtTime(95, t0 + 0.7);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(170, t0);
    osc2.frequency.linearRampToValueAtTime(260, t0 + 0.35);
    osc2.frequency.linearRampToValueAtTime(190, t0 + 0.7);

    gain.gain.setValueAtTime(0.01, t0);
    gain.gain.linearRampToValueAtTime(0.35, t0 + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.75);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(t0);
    osc2.start(t0);
    osc1.stop(t0 + 0.75);
    osc2.stop(t0 + 0.75);
  } catch (e) {
    console.warn('Hug audio error:', e);
  }
}

/**
 * Play Passion Flame (شور و حرارت عشق با ریتم سریع)
 */
export function playFlameSound(soundEnabled = true) {
  triggerHaptic([60, 30, 90, 30, 120, 30, 150]);

  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    const t0 = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(240, t0);
    osc.frequency.exponentialRampToValueAtTime(750, t0 + 0.2);
    osc.frequency.exponentialRampToValueAtTime(120, t0 + 0.45);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, t0);
    filter.frequency.exponentialRampToValueAtTime(1800, t0 + 0.2);

    gain.gain.setValueAtTime(0.01, t0);
    gain.gain.linearRampToValueAtTime(0.25, t0 + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.45);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t0);
    osc.stop(t0 + 0.46);
  } catch (e) {
    console.warn('Flame audio error:', e);
  }
}

/**
 * Play Gentle Touch / Sparkle (نوازش پروانه‌ای و درخشان)
 */
export function playSparkleSound(soundEnabled = true) {
  triggerHaptic([40, 40, 50, 40, 60]);

  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    const t0 = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = t0 + index * 0.06;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.01, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.36);
    });
  } catch (e) {
    console.warn('Sparkle audio error:', e);
  }
}

/**
 * Dispatcher for all romantic touch reactions
 */
export function playReactionBurst(
  type: 'kiss' | 'hug' | 'flame' | 'sparkle' | 'heart',
  soundEnabled = true
) {
  switch (type) {
    case 'kiss':
      playRealisticKissSound(soundEnabled);
      break;
    case 'hug':
      playHugSound(soundEnabled);
      break;
    case 'flame':
      playFlameSound(soundEnabled);
      break;
    case 'sparkle':
      playSparkleSound(soundEnabled);
      break;
    default:
      playFullHeartbeatCycle(soundEnabled);
      break;
  }
}

/**
 * Message send / receive gentle chime
 */
export function playMessageChime(type: 'send' | 'receive', soundEnabled = true) {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === 'send') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, t0);
      osc.frequency.exponentialRampToValueAtTime(820, t0 + 0.09);
      gain.gain.setValueAtTime(0.18, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.09);
      triggerHaptic(30);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(650, t0);
      osc.frequency.setValueAtTime(880, t0 + 0.07);
      gain.gain.setValueAtTime(0.22, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.16);
      triggerHaptic([45, 45, 55]);
    }

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.17);
  } catch {
    // Audio fallback
  }
}
