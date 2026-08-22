import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Activity, X, Volume2, VolumeX, Sparkles, Send, Smartphone } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { toPersianDigits } from '../utils/dateCalculations';
import { sendTelegramMessage } from '../utils/telegram';

interface HeartbeatModalProps {
  isOpen: boolean;
  onClose: () => void;
  heartbeatsTotal: number;
  totalDays: number;
}

export const HeartbeatModal: React.FC<HeartbeatModalProps> = ({
  isOpen,
  onClose,
  heartbeatsTotal,
  totalDays,
}) => {
  const { theme } = useTheme();
  const [isActive, setIsActive] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [bpm] = useState(80); // 80 Beats Per Minute
  const [beatCount, setBeatCount] = useState(0);
  const [isSendingTelegram, setIsSendingTelegram] = useState(false);
  const [telegramSent, setTelegramSent] = useState(false);
  const [vibrationSupported, setVibrationSupported] = useState(true);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<number | null>(null);

  // Check vibration support
  useEffect(() => {
    if (typeof window !== 'undefined' && !('vibrate' in navigator)) {
      setVibrationSupported(false);
    }
  }, []);

  // Web Audio Synth for realistic Lub-Dub biological sound
  const playHeartSound = useCallback((phase: 'lub' | 'dub') => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(phase === 'lub' ? 90 : 120, ctx.currentTime);

      const freq = phase === 'lub' ? 52 : 68;
      const duration = phase === 'lub' ? 0.08 : 0.06;
      const volume = phase === 'lub' ? 0.35 : 0.25;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + duration);

      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio fallback
    }
  }, [soundEnabled]);

  // Trigger one biological Lub-Dub cycle with precise vibration pattern
  const triggerBeatCycle = useCallback(() => {
    setBeatCount((prev) => prev + 1);

    // 1. First beat (Lub)
    playHeartSound('lub');
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(45); // First thud 45ms
      } catch {
        // Ignored
      }
    }

    // 2. Second beat (Dub) 110ms later
    setTimeout(() => {
      playHeartSound('dub');
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate(55); // Second thud 55ms
        } catch {
          // Ignored
        }
      }
    }, 115);
  }, [playHeartSound]);

  // Handle active vibration loops
  useEffect(() => {
    const shouldRun = isActive || isHolding;
    if (shouldRun) {
      triggerBeatCycle();
      const cycleMs = (60 / bpm) * 1000; // ~800ms per full heartbeat cycle
      intervalRef.current = window.setInterval(() => {
        triggerBeatCycle();
      }, cycleMs);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate(0);
        } catch {
          // Ignored
        }
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, isHolding, bpm, triggerBeatCycle]);

  // Clean up on close
  useEffect(() => {
    if (!isOpen) {
      setIsActive(false);
      setIsHolding(false);
      setTelegramSent(false);
    }
  }, [isOpen]);

  const handleSendHeartbeatPing = async () => {
    setIsSendingTelegram(true);
    try {
      const message = `💓 *تپش قلب مشترک!*\n\nنیوشا همین الان در سایت تپش قلب مشترکتون رو لمس کرد و به یادت بود ❤️\n\nتعداد روزهای با هم بودن: ${toPersianDigits(totalDays)} روز`;
      await sendTelegramMessage(message);
      setTelegramSent(true);
      setTimeout(() => setTelegramSent(false), 4000);
    } catch {
      // Ignored
    } finally {
      setIsSendingTelegram(false);
    }
  };

  const singlePersonHeartbeats = Math.floor(heartbeatsTotal / 2);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto font-vazir">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-md my-auto rounded-3xl border p-5 sm:p-7 shadow-2xl overflow-hidden backdrop-blur-xl z-10 text-center"
          style={{
            backgroundColor: theme.cardBg,
            borderColor: theme.cardBorder,
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Sound toggle button */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`absolute top-4 right-4 p-2 rounded-full border text-xs transition-all cursor-pointer ${
              soundEnabled ? 'bg-white/15 text-white border-white/30' : 'bg-black/30 text-neutral-400 border-white/10'
            }`}
            title={soundEnabled ? 'قطع صدای تپش' : 'فعال‌سازی صدای ملایم تپش'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Title Header */}
          <div className="flex items-center justify-center gap-2 mb-1 mt-2">
            <Activity className="w-4 h-4 text-rose-500 animate-pulse" />
            <h3 className="text-lg sm:text-xl font-bold text-white">
              تپش قلب مشترک
            </h3>
          </div>
          <p className="text-xs text-neutral-300/80 mb-6">
            دقیقاً مثل یک قلب واقعی با ریتم علمی (Lub-Dub) و لرزش زنده
          </p>

          {/* Interactive Beating Heart Visual Area */}
          <div className="relative py-8 flex flex-col items-center justify-center">
            {/* Ambient Pulsing Rings */}
            <AnimatePresence>
              {(isActive || isHolding) && (
                <>
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0.8 }}
                    animate={{ scale: 1.8, opacity: 0 }}
                    transition={{ repeat: Infinity, duration: 0.9, ease: 'easeOut' }}
                    className="absolute w-36 h-36 rounded-full -z-10 pointer-events-none"
                    style={{ backgroundColor: `${theme.primaryColor}30` }}
                  />
                  <motion.div
                    initial={{ scale: 0.6, opacity: 0.9 }}
                    animate={{ scale: 1.4, opacity: 0 }}
                    transition={{ repeat: Infinity, duration: 0.9, delay: 0.12, ease: 'easeOut' }}
                    className="absolute w-36 h-36 rounded-full -z-10 pointer-events-none"
                    style={{ backgroundColor: `${theme.primaryColor}40` }}
                  />
                </>
              )}
            </AnimatePresence>

            {/* Central Giant Pulsing Heart Touch Button */}
            <button
              id="interactive-beating-heart-btn"
              onMouseDown={() => setIsHolding(true)}
              onMouseUp={() => setIsHolding(false)}
              onMouseLeave={() => setIsHolding(false)}
              onTouchStart={() => setIsHolding(true)}
              onTouchEnd={() => setIsHolding(false)}
              onClick={() => setIsActive(!isActive)}
              style={{
                background: `radial-gradient(circle, ${theme.primaryColor} 0%, rgba(225,29,72,0.7) 100%)`,
                boxShadow: (isActive || isHolding)
                  ? `0 0 45px ${theme.primaryColor}90`
                  : '0 0 20px rgba(225,29,72,0.3)',
              }}
              className={`w-32 h-32 sm:w-36 sm:h-36 rounded-full flex flex-col items-center justify-center transition-all duration-200 cursor-pointer select-none border-2 border-white/40 ${
                (isActive || isHolding) ? 'scale-105 animate-pulse' : 'hover:scale-105'
              }`}
            >
              <Heart
                className={`w-14 h-14 sm:w-16 sm:h-16 fill-white text-white drop-shadow-md transition-transform duration-100 ${
                  (isActive || isHolding) ? 'scale-110' : ''
                }`}
              />
              <span className="text-[11px] font-bold text-white mt-1 drop-shadow">
                {isHolding ? 'در حال تپش...' : isActive ? 'توقف تپش' : 'لمس یا نگه داشتن'}
              </span>
            </button>

            {/* Live BPM indicator */}
            <div className="mt-4 flex items-center gap-2 text-xs font-semibold" style={{ color: theme.accentColor }}>
              <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} />
              <span>ریتم نرمال عاشقانه: {toPersianDigits(bpm)} تپش در دقیقه (BPM)</span>
            </div>

            {beatCount > 0 && (
              <span className="text-[11px] text-neutral-400 mt-1">
                تعداد تپش حس شده در این نوبت: {toPersianDigits(beatCount)} بار
              </span>
            )}
          </div>

          {/* Scientific / Romance explanation box */}
          <div className="bg-black/40 border border-white/10 rounded-2xl p-3.5 text-right text-xs mb-5 space-y-2">
            <div className="flex items-center justify-between text-neutral-300 font-bold border-b border-white/10 pb-2">
              <span className="flex items-center gap-1.5 text-white">
                <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                محاسبه بر اساس ۸۰ ضربان در دقیقه:
              </span>
              <span className="text-emerald-400 font-mono">
                {toPersianDigits(totalDays)} روز
              </span>
            </div>

            <div className="text-[11px] text-neutral-300/90 leading-relaxed space-y-1.5 pt-1">
              <p>
                • <strong>قلب حسن:</strong> ~{toPersianDigits(singlePersonHeartbeats.toLocaleString())} تپش
              </p>
              <p>
                • <strong>قلب نیوشا:</strong> ~{toPersianDigits(singlePersonHeartbeats.toLocaleString())} تپش
              </p>
              <p className="text-amber-300 font-semibold pt-1 border-t border-white/5">
                • <strong>مجموع ضربان هر دو قلب با هم:</strong> ~{toPersianDigits(heartbeatsTotal.toLocaleString())} تپش
              </p>
            </div>

            {!vibrationSupported && (
              <div className="mt-2 pt-2 border-t border-white/10 flex items-center gap-1.5 text-[10px] text-amber-200">
                <Smartphone className="w-3 h-3 flex-shrink-0" />
                <span>در دستگاه شما، صدای شبیه‌سازی شدهٔ تپش قلب پخش می‌شود. در گوشی‌های همراه ویبره نیز فعال خواهد بود.</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <button
              onClick={() => setIsActive(!isActive)}
              className={`w-full py-2.5 rounded-full font-bold text-xs transition-all cursor-pointer border ${
                isActive
                  ? 'bg-rose-600 text-white border-rose-400 shadow-lg'
                  : 'bg-white text-black hover:bg-neutral-200 border-white'
              }`}
            >
              {isActive ? 'توقف ویبره و تپش' : 'شروع پخش پیوسته ضربان'}
            </button>

            <button
              onClick={handleSendHeartbeatPing}
              disabled={isSendingTelegram || telegramSent}
              className="w-full py-2.5 rounded-full bg-black/50 hover:bg-black/70 border border-white/20 text-white font-medium text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {telegramSent ? (
                <span className="text-emerald-400 font-bold">ارسال شد! ❤️</span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSendingTelegram ? 'در حال ارسال...' : 'ارسال تپش به حسن'}</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
