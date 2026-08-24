import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  X, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Send, 
  Smartphone
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { toPersianDigits } from '../utils/dateCalculations';
import { sendTelegramMessage } from '../utils/telegram';

interface HugExperienceModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalDays: number;
}

const DEFAULT_HUG_VOICE_URL = 'https://uploadkon.ir/uploads/adc620_26%D8%A8%D8%BA%D9%84.mp3';

const DEFAULT_TRANSCRIPT = [
  { start: 0, end: 8, text: 'قربونت برم... فکر کن الان روبرومی... میخوام بغلت کنم...' },
  { start: 8, end: 20, text: 'چشماتو ببند خیلی آروم... آفرین... حالا موبایلو جوری که انگار میخوای بغلش کنی بچسبون به سینت... باریکلا...' },
  { start: 20, end: 32, text: 'ببین بچه، سرت روی سینه‌هامه خب؟ قربونت برم... حالا سرتو بذار رو سینه‌هام... باریکلا...' },
  { start: 32, end: 38, text: '💓 صدای نبضمو می‌شنوی؟ دورت بگردم...' },
  { start: 38, end: 52, text: 'خیلی دوستت دارم خب؟ بابت همه چی... بابت همه‌ی این روزها... بابت خوشحالی‌هایی که برام ساختی... عاشقتم دخترم...' },
  { start: 52, end: 68, text: 'این صدای قلبمو می‌شنوی؟ این صدا قلبیه که چندین وقته داره برای تو می‌تپه... قربونت برم... عاشقتم دخترم...' },
];

export const HugExperienceModal: React.FC<HugExperienceModalProps> = ({
  isOpen,
  onClose,
  totalDays,
}) => {
  const { theme } = useTheme();
  
  // Audio & Vibration Flow State
  const [isPlaying, setIsPlaying] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'voice_intro' | 'hugging_vibration' | 'completed'>('idle');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const vibrationIntensity = 'gentle';
  const [customAudioUrl] = useState<string>(() => {
    const saved = localStorage.getItem('hasan_custom_hug_voice');
    if (saved && (saved.startsWith('http://') || saved.startsWith('https://') || saved.startsWith('data:audio'))) {
      return saved;
    }
    return DEFAULT_HUG_VOICE_URL;
  });
  const voiceDelaySeconds = 32; // Exactly 32 seconds as requested
  const [isSendingTelegram, setIsSendingTelegram] = useState(false);
  const [telegramSent, setTelegramSent] = useState(false);
  const [vibrationSupported, setVibrationSupported] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(65);
  const [touchHolding, setTouchHolding] = useState(false);
  const [activeSubtitle, setActiveSubtitle] = useState<string>('');

  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const synthAudioCtxRef = useRef<AudioContext | null>(null);
  const vibrationIntervalRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  // Sync mute state to audio element
  useEffect(() => {
    if (audioElementRef.current) {
      audioElementRef.current.muted = !soundEnabled;
    }
  }, [soundEnabled]);

  // Pre-load audio when modal opens
  useEffect(() => {
    if (isOpen && audioElementRef.current) {
      audioElementRef.current.load();
    }
  }, [isOpen]);

  // Check vibration support
  useEffect(() => {
    if (typeof window !== 'undefined' && !('vibrate' in navigator)) {
      setVibrationSupported(false);
    }
  }, []);

  // Web Audio Synth for gentle, deep, relaxing warm Lub-Dub heartbeat sound & physical rumble
  const playHeartSound = useCallback((phaseName: 'lub' | 'dub') => {
    try {
      if (!synthAudioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        synthAudioCtxRef.current = new AudioContextClass();
      }
      const ctx = synthAudioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // 1. Tactile Sub-bass Physical Rumble for speaker/casing vibration
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(phaseName === 'lub' ? 36 : 44, ctx.currentTime);
      subOsc.frequency.exponentialRampToValueAtTime(18, ctx.currentTime + 0.14);
      subGain.gain.setValueAtTime(0.01, ctx.currentTime);
      subGain.gain.linearRampToValueAtTime(0.75, ctx.currentTime + 0.025);
      subGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.14);
      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start();
      subOsc.stop(ctx.currentTime + 0.14);

      // 2. Audible acoustic heartbeat sound if sound is enabled
      if (soundEnabled) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        // Warm low-pass filter for smooth, organic, non-harsh sound
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(phaseName === 'lub' ? 85 : 110, ctx.currentTime);

        const freq = phaseName === 'lub' ? 50 : 64;
        const soundDuration = phaseName === 'lub' ? 0.09 : 0.07;
        const volume = phaseName === 'lub' ? 0.35 : 0.25;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(28, ctx.currentTime + soundDuration);

        gain.gain.setValueAtTime(0.005, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + soundDuration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + soundDuration);
      }
    } catch {
      // Audio fallback
    }
  }, [soundEnabled]);

  // Native atomic vibration trigger
  const triggerNativeVibration = useCallback(() => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        // Dual-pulse heartbeat pattern: 50ms Lub, 80ms pause, 60ms Dub
        navigator.vibrate([50, 80, 60]);
      } catch (err) {
        console.log('Hug vibration note:', err);
      }
    }
  }, []);

  // Trigger biological Lub-Dub vibration & pulse with gentle, calm, warm cuddle feel
  const triggerBiologicalHeartbeat = useCallback(() => {
    triggerNativeVibration();

    // 1. First soft beat (Lub)
    playHeartSound('lub');

    // 2. Second beat (Dub) 130ms later
    setTimeout(() => {
      playHeartSound('dub');
    }, 130);
  }, [playHeartSound, triggerNativeVibration]);

  // Start continuous calm, steady vibration loop (~70-74 BPM: relaxing pulse every ~840ms)
  const startVibrationLoop = useCallback(() => {
    if (vibrationIntervalRef.current) return;
    triggerBiologicalHeartbeat();
    const intervalMs = 840; // Gentle, relaxing pulse interval
    vibrationIntervalRef.current = window.setInterval(() => {
      triggerBiologicalHeartbeat();
    }, intervalMs);
  }, [triggerBiologicalHeartbeat]);

  // Stop vibration loop
  const stopVibrationLoop = useCallback(() => {
    if (vibrationIntervalRef.current) {
      clearInterval(vibrationIntervalRef.current);
      vibrationIntervalRef.current = null;
    }
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(0);
      } catch {
        // Ignored
      }
    }
  }, []);

  // Update subtitle based on elapsed time
  const updateSubtitleForTime = useCallback((timeInSeconds: number) => {
    const currentSub = DEFAULT_TRANSCRIPT.find(
      (item) => timeInSeconds >= item.start && timeInSeconds < item.end
    );
    if (currentSub) {
      setActiveSubtitle(currentSub.text);
    } else if (timeInSeconds >= 65) {
      setActiveSubtitle('همیشه در آغوش منی... عاشقتم دخترم ❤️');
    }
  }, []);

  // Timer-based fallback engine for when no audio file is played
  useEffect(() => {
    if (isPlaying && !customAudioUrl) {
      const startTime = Date.now() - (currentTime * 1000);
      timerRef.current = window.setInterval(() => {
        const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
        setCurrentTime(elapsedSec);
        updateSubtitleForTime(elapsedSec);

        // At second 32 (or voiceDelaySeconds), start the rapid excited vibration!
        if (elapsedSec >= voiceDelaySeconds && phase === 'voice_intro') {
          setPhase('hugging_vibration');
          startVibrationLoop();
        }

        if (elapsedSec >= 70) {
          setPhase('hugging_vibration');
        }
      }, 500);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, customAudioUrl, currentTime, voiceDelaySeconds, phase, startVibrationLoop, updateSubtitleForTime]);

  // Start Experience
  const handleStartExperience = () => {
    setIsPlaying(true);
    setPhase('voice_intro');
    setCurrentTime(0);
    setActiveSubtitle(DEFAULT_TRANSCRIPT[0].text);

    // If custom recorded audio exists
    if (customAudioUrl && audioElementRef.current) {
      audioElementRef.current.currentTime = 0;
      audioElementRef.current.play().catch(() => {
        // Browser autoplay restriction fallback
      });
    }
  };

  // Pause / Stop Experience
  const handleStopExperience = () => {
    setIsPlaying(false);
    setPhase('idle');
    stopVibrationLoop();
    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  // Audio Time Update listener for accurate vibration trigger
  const handleTimeUpdate = () => {
    if (!audioElementRef.current) return;
    const curr = audioElementRef.current.currentTime;
    setCurrentTime(curr);
    updateSubtitleForTime(curr);
    
    // When current time reaches exactly 32s, trigger vibration
    if (curr >= voiceDelaySeconds && phase === 'voice_intro') {
      setPhase('hugging_vibration');
      startVibrationLoop();
    }
  };

  const handleAudioEnded = () => {
    setPhase('hugging_vibration');
  };

  // Holding touch hug directly
  useEffect(() => {
    if (touchHolding) {
      startVibrationLoop();
    } else if (!isPlaying) {
      stopVibrationLoop();
    }
  }, [touchHolding, isPlaying, startVibrationLoop, stopVibrationLoop]);

  // Clean up on modal close
  useEffect(() => {
    if (!isOpen) {
      handleStopExperience();
      setTelegramSent(false);
    }
    return () => {
      handleStopExperience();
    };
  }, [isOpen]);

  const handleSendHugNotification = async () => {
    setIsSendingTelegram(true);
    try {
      const message = `🫂 *بغل مجازی و تپش قلب حسن!*\n\nنیوشا همین الان بخش «بغل مجازی حسن» رو باز کرد و گوشیش رو به سینه‌ش چسبوند و تپش آرام قلبت رو حس کرد ❤️\n\nتعداد روزهای با هم بودن: ${toPersianDigits(totalDays)} روز`;
      await sendTelegramMessage(message);
      setTelegramSent(true);
      setTimeout(() => setTelegramSent(false), 4000);
    } catch {
      // Ignored
    } finally {
      setIsSendingTelegram(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto font-vazir">
        {/* Backdrop with dreamy romantic blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-lg"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 25 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 25 }}
          className="relative w-full max-w-lg my-auto rounded-3xl border p-5 sm:p-7 shadow-2xl overflow-hidden backdrop-blur-2xl z-10 text-center"
          style={{
            backgroundColor: theme.cardBg,
            borderColor: theme.cardBorder,
          }}
        >
          {/* HTML Audio Element for Hasan's custom voice */}
          <audio
            ref={audioElementRef}
            src={customAudioUrl || undefined}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={(e) => {
              if (e.currentTarget.duration) {
                setDuration(e.currentTarget.duration);
              }
            }}
            onEnded={handleAudioEnded}
            preload="auto"
            playsInline
          />

          {/* Top Control Bar */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 transition-colors cursor-pointer"
              title="بستن"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              {/* Sound Toggle */}
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2 rounded-full border transition-all cursor-pointer ${
                  soundEnabled
                    ? 'bg-white/15 text-white border-white/30'
                    : 'bg-black/40 text-neutral-400 border-white/10'
                }`}
                title={soundEnabled ? 'قطع صدا' : 'وصل صدا'}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Title & Romantic Subtitle */}
          <div className="space-y-1 mb-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>پروژه بغل مجازی و تپش سینه</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-white pt-2">
              «چشماتو ببند و منو بغل کن»
            </h3>
            <p className="text-xs text-neutral-300/80 max-w-sm mx-auto leading-relaxed">
              گوشی رو روی قلبت یا سینت بذار؛ صدای حسن پخش میشه و از ثانیه ۳۲ تپش آرام قلب روی سینه‌ات می‌لرزه ❤️
            </p>
          </div>

          {/* Interactive Visual & Hugging Action Area */}
          <div className="relative py-6 sm:py-8 flex flex-col items-center justify-center">
            {/* Animated Radiating Pulse Waves */}
            <AnimatePresence>
              {(isPlaying || touchHolding) && (
                <>
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0.8 }}
                    animate={{ scale: 2.2, opacity: 0 }}
                    transition={{ repeat: Infinity, duration: 1.1, ease: 'easeOut' }}
                    className="absolute w-40 h-40 rounded-full -z-10 pointer-events-none"
                    style={{ backgroundColor: `${theme.primaryColor}35` }}
                  />
                  <motion.div
                    initial={{ scale: 0.7, opacity: 0.9 }}
                    animate={{ scale: 1.7, opacity: 0 }}
                    transition={{ repeat: Infinity, duration: 1.1, delay: 0.15, ease: 'easeOut' }}
                    className="absolute w-40 h-40 rounded-full -z-10 pointer-events-none"
                    style={{ backgroundColor: `${theme.primaryColor}45` }}
                  />
                </>
              )}
            </AnimatePresence>

            {/* Central Main Interactive Hug Pill / Heart Button */}
            <button
              id="hug-touch-trigger-btn"
              onClick={isPlaying ? handleStopExperience : handleStartExperience}
              onTouchStart={() => {
                triggerNativeVibration();
                setTouchHolding(true);
              }}
              onTouchEnd={() => setTouchHolding(false)}
              onMouseDown={() => {
                triggerNativeVibration();
                setTouchHolding(true);
              }}
              onMouseUp={() => setTouchHolding(false)}
              onMouseLeave={() => setTouchHolding(false)}
              style={{
                background: `radial-gradient(circle, ${theme.primaryColor} 0%, rgba(225,29,72,0.85) 100%)`,
                boxShadow: (isPlaying || touchHolding)
                  ? `0 0 55px ${theme.primaryColor}`
                  : '0 0 25px rgba(225,29,72,0.4)',
              }}
              className={`w-36 h-36 sm:w-40 sm:h-40 rounded-full flex flex-col items-center justify-center transition-all duration-300 cursor-pointer select-none border-2 border-white/40 active:scale-95 ${
                (isPlaying && phase === 'hugging_vibration') || touchHolding
                  ? 'animate-pulse scale-105'
                  : 'hover:scale-105'
              }`}
            >
              <Heart
                className={`w-14 h-14 sm:w-16 sm:h-16 fill-white text-white drop-shadow-lg transition-transform duration-200 ${
                  (isPlaying && phase === 'hugging_vibration') || touchHolding ? 'scale-110' : ''
                }`}
              />
              <span className="text-xs font-bold text-white mt-1.5 drop-shadow px-2">
                {touchHolding
                  ? 'در آغوش منی...'
                  : isPlaying
                  ? (phase === 'voice_intro' ? 'در حال پخش صدای حسن...' : '💓 تپش آرام سینه...')
                  : 'شروع بغل و تپش'}
              </span>
            </button>

            {/* Direct Instant Vibration Test Button */}
            <button
              type="button"
              onClick={triggerBiologicalHeartbeat}
              className="mt-3 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-[11px] text-rose-300 font-medium transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Smartphone className="w-3 h-3 text-rose-400 animate-bounce" />
              <span>تست لرزش و تپش (ضربه بزنید)</span>
            </button>

            {/* Live Subtitle & Transcript Display */}
            {isPlaying && activeSubtitle && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                key={activeSubtitle}
                className="mt-5 px-4 py-2.5 rounded-2xl bg-black/60 border border-rose-500/30 max-w-sm backdrop-blur-md shadow-lg"
              >
                <p className="text-xs sm:text-sm font-semibold text-rose-200 leading-relaxed drop-shadow">
                  «{activeSubtitle}»
                </p>
              </motion.div>
            )}

            {/* Status indicator bar */}
            <div className="mt-4 flex flex-col items-center gap-1.5">
              <div className="flex items-center gap-2 text-xs font-medium" style={{ color: theme.accentColor }}>
                <span className={`w-2 h-2 rounded-full ${phase === 'hugging_vibration' ? 'bg-rose-500 animate-ping' : 'bg-amber-400'}`} />
                <span>
                  {phase === 'idle' && 'آماده برای لمس و احساس آغوش'}
                  {phase === 'voice_intro' && `پخش صدای حسن... (شروع تپش در ثانیه ۳۲)`}
                  {phase === 'hugging_vibration' && '💓 ویبرهٔ تپش آرام، عمیق و گرم قلب حسن فعال است'}
                </span>
              </div>

              {duration > 0 && isPlaying && (
                <span className="text-[11px] text-neutral-400 font-mono">
                  {toPersianDigits(Math.floor(currentTime))} ثانیه / {toPersianDigits(Math.floor(duration))} ثانیه
                </span>
              )}
            </div>
          </div>

          {/* Quick Instructions Step Card */}
          <div className="bg-black/40 border border-white/10 rounded-2xl p-4 text-right text-xs mb-5 space-y-2.5">
            <div className="flex items-center justify-between text-neutral-200 font-bold border-b border-white/10 pb-2">
              <span className="flex items-center gap-1.5 text-white">
                <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                سناریوی بغل و تپش قلب حسن:
              </span>
              <span className="text-[11px] text-rose-300 font-mono">ثانیه ۳۲: تپش آرام و دلنشین 💓</span>
            </div>

            <ol className="text-[11px] text-neutral-300/90 leading-relaxed space-y-1.5 pr-4 list-decimal">
              <li>دکمه شروع رو بزن و چشماتو آروم ببند.</li>
              <li>گوشیت رو بچسبون به سینه‌ات درست مثل این‌که سرت روی سینه حسنه.</li>
              <li>در ثانیه ۳۲ (وقتی حسن میگه <em>«صدای نبضمو می‌شنوی؟»</em>) تپش‌های ملایم و عمیق شروع به لرزیدن می‌کنند.</li>
            </ol>

            {!vibrationSupported && (
              <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-1.5 text-[10px] text-amber-200">
                <Smartphone className="w-3.5 h-3.5 flex-shrink-0" />
                <span>صدای تپش‌های ملایم فعال است؛ برای حس کامل لرزش از مرورگر موبایل استفاده نمایید.</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <button
              onClick={isPlaying ? handleStopExperience : handleStartExperience}
              className={`w-full py-2.5 rounded-full font-bold text-xs transition-all cursor-pointer border ${
                isPlaying
                  ? 'bg-rose-600 text-white border-rose-400 shadow-lg'
                  : 'bg-white text-black hover:bg-neutral-200 border-white'
              }`}
            >
              {isPlaying ? 'پایان بغل و توقف ویبره' : 'شروع تجربه بغل و تپش 🫂'}
            </button>

            <button
              onClick={handleSendHugNotification}
              disabled={isSendingTelegram || telegramSent}
              className="w-full py-2.5 rounded-full bg-black/50 hover:bg-black/70 border border-white/20 text-white font-medium text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {telegramSent ? (
                <span className="text-emerald-400 font-bold">به حسن پیام رفت! ❤️</span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSendingTelegram ? 'در حال ارسال...' : 'خبر بده که بغلش کردی'}</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
