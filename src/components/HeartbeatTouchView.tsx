import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heart,
  Activity,
  Sparkles,
  Radio,
  Send,
  Wifi,
  WifiOff,
  Volume2,
  Check,
  AlertCircle,
  Vibrate,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { CoupleUser, HeartbeatSyncData } from '../types';
import { toPersianDigits } from '../utils/dateCalculations';
import { getPartnerPresenceInfo } from '../utils/presenceHelper';
import {
  sendLiveHeartbeatPulse,
  updateHeartbeatTouchState,
  toggleContinuousSyncMode,
} from '../services/heartbeatMessengerService';
import {
  playBiologicalHeartbeat,
  playFullHeartbeatCycle,
  playReactionBurst,
  triggerHaptic,
  unlockAudioAndHaptics,
} from '../utils/hapticsAndAudio';
import { sendTelegramMessage } from '../utils/telegram';

interface HeartbeatTouchViewProps {
  currentUser: CoupleUser;
  onSwitchUser: (user: CoupleUser) => void;
  syncData: HeartbeatSyncData;
  isPartnerOnline: boolean;
  soundEnabled: boolean;
  totalDays: number;
  heartbeatsTotal: number;
}

export const HeartbeatTouchView: React.FC<HeartbeatTouchViewProps> = ({
  currentUser,
  onSwitchUser,
  syncData,
  isPartnerOnline,
  soundEnabled,
  totalDays,
  heartbeatsTotal,
}) => {
  const { theme } = useTheme();
  const partnerName: CoupleUser = currentUser === 'حسن' ? 'نیوشا' : 'حسن';

  const [isHolding, setIsHolding] = useState(false);
  const [localBeating, setLocalBeating] = useState(false);
  const [syncedBeating, setSyncedBeating] = useState(syncData.syncedMode || false);
  const [activeReactionAnim, setActiveReactionAnim] = useState<string | null>(null);
  const [isSendingTelegram, setIsSendingTelegram] = useState(false);
  const [telegramSent, setTelegramSent] = useState(false);
  const [beatCounter, setBeatCounter] = useState(0);

  // Visual pulse trigger on remote incoming heartbeat
  const [isRemotePulseFlashing, setIsRemotePulseFlashing] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);

  const syncIntervalRef = useRef<number | null>(null);
  const isPartnerTouching = !!syncData.touchState?.[partnerName];
  const isBothTouching = isHolding && isPartnerTouching;

  // Track last processed pulse ID and timestamp to handle any clock skew between devices
  const lastProcessedPulseIdRef = useRef<string | null>(null);
  const lastProcessedPulseTimeRef = useRef<number>(Date.now() - 3000);

  // Listen to remote pulse events sent by partner in real-time
  useEffect(() => {
    const pulse = syncData.lastBeatPulse;
    if (!pulse) return;

    const isNewById = pulse.pulseId && pulse.pulseId !== lastProcessedPulseIdRef.current;
    const isNewByTime = pulse.timestamp > lastProcessedPulseTimeRef.current;

    if (isNewById || isNewByTime) {
      if (pulse.pulseId) {
        lastProcessedPulseIdRef.current = pulse.pulseId;
      }
      lastProcessedPulseTimeRef.current = pulse.timestamp;

      // Only react if the pulse was dispatched by the partner
      if (pulse.sender !== currentUser) {
        setBeatCounter((prev) => prev + 1);

        // Flash visual glowing heart on remote arrival
        setIsRemotePulseFlashing(true);
        setTimeout(() => setIsRemotePulseFlashing(false), 500);

        if (pulse.type === 'reaction' && pulse.reactionType) {
          playReactionBurst(pulse.reactionType, soundEnabled);
          setActiveReactionAnim(pulse.reactionType);
          setTimeout(() => setActiveReactionAnim(null), 2500);
        } else {
          // Play dual lub-dub heartbeat sound and solid physical vibration
          playFullHeartbeatCycle(soundEnabled);
        }
      }
    }
  }, [syncData.lastBeatPulse, currentUser, soundEnabled]);

  // Handle continuous synced mode
  useEffect(() => {
    setSyncedBeating(!!syncData.syncedMode);
  }, [syncData.syncedMode]);

  // Synchronized beat loop if continuous sync mode, local holding, OR partner holding is active
  const triggerSingleBeat = useCallback(
    (isLocalUserTrigger = true) => {
      unlockAudioAndHaptics();
      setBeatCounter((prev) => prev + 1);
      triggerHaptic([85, 65, 110]);
      playBiologicalHeartbeat('lub', soundEnabled);
      setTimeout(() => {
        playBiologicalHeartbeat('dub', soundEnabled);
      }, 130);

      if (isLocalUserTrigger) {
        sendLiveHeartbeatPulse(currentUser, 'single');
      }
    },
    [currentUser, soundEnabled]
  );

  // When either user is holding the heart OR synced mode is ON, continuously vibrate and beat
  useEffect(() => {
    const shouldRun = localBeating || syncedBeating || isHolding || isPartnerTouching;

    if (shouldRun) {
      triggerSingleBeat(false);
      const bpm = syncData.syncedBpm || 80;
      const cycleMs = (60 / bpm) * 1000;

      syncIntervalRef.current = window.setInterval(() => {
        triggerSingleBeat(false);
      }, cycleMs);
    } else {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [localBeating, syncedBeating, isHolding, isPartnerTouching, syncData.syncedBpm, triggerSingleBeat]);

  // Touch Handlers for the Giant Heart
  const handleTouchStart = () => {
    unlockAudioAndHaptics();
    setIsHolding(true);
    updateHeartbeatTouchState(currentUser, true);
    triggerSingleBeat(true);
  };

  const handleTouchEnd = () => {
    setIsHolding(false);
    updateHeartbeatTouchState(currentUser, false);
  };

  const handleReactionClick = (type: 'kiss' | 'hug' | 'flame' | 'sparkle') => {
    unlockAudioAndHaptics();
    playReactionBurst(type, soundEnabled);
    sendLiveHeartbeatPulse(currentUser, 'reaction', type);
    setActiveReactionAnim(type);
    setTimeout(() => setActiveReactionAnim(null), 2500);
  };

  const handleToggleContinuous = async () => {
    unlockAudioAndHaptics();
    const nextState = !syncedBeating;
    setSyncedBeating(nextState);
    await toggleContinuousSyncMode(nextState, 80);
  };

  const handleTestHapticsAndAudio = async () => {
    await unlockAudioAndHaptics();
    playReactionBurst('kiss', true);
    setIsRemotePulseFlashing(true);
    setTestSuccess(true);
    setTimeout(() => {
      setIsRemotePulseFlashing(false);
      setTestSuccess(false);
    }, 2200);
  };

  const handleSendTelegramAlert = async () => {
    setIsSendingTelegram(true);
    try {
      const message = `💓 *تپش قلب آنلاین مشترک!*\n\n${currentUser} همین الان در بخش تپش قلب آنلاین منتظرته و قلبش برات می‌تپه! ❤️\nبیا داخل سایت تا با هم تپش رو لمس کنید:\nhttps://ais-pre-yx7yfaehsnijemzt3xg5cx-619614878207.europe-west1.run.app`;
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

  return (
    <div
      onClick={() => unlockAudioAndHaptics()}
      className="flex flex-col items-center justify-between text-center select-none"
    >
      {/* Identity Selector & Online Presence Indicator */}
      <div className="w-full bg-black/40 border border-white/10 rounded-2xl p-2.5 mb-3 flex flex-col sm:flex-row items-center justify-between gap-2">
        {/* User Identity Switcher */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-center">
          <span className="text-[11px] text-neutral-300 font-semibold ml-1">هویت این دستگاه:</span>
          <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                onSwitchUser('حسن');
                unlockAudioAndHaptics();
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                currentUser === 'حسن'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-neutral-300 hover:text-white'
              }`}
            >
              من حسنم 👨🏻
            </button>
            <button
              type="button"
              onClick={() => {
                onSwitchUser('نیوشا');
                unlockAudioAndHaptics();
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                currentUser === 'نیوشا'
                  ? 'bg-pink-600 text-white shadow-md'
                  : 'text-neutral-300 hover:text-white'
              }`}
            >
              من نیوشام 👧🏻
            </button>
          </div>
        </div>

        {/* Live Partner Status */}
        {(() => {
          const presence = getPartnerPresenceInfo(partnerName, syncData.lastPing?.[partnerName]);
          return (
            <div className="flex items-center gap-1.5 text-xs">
              {presence.isOnline ? (
                <span
                  className="flex items-center gap-1.5 text-emerald-400 font-semibold bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-full shadow-sm"
                  title={presence.detailedText}
                >
                  <Wifi className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span>{presence.statusText}</span>
                </span>
              ) : (
                <span
                  className="flex items-center gap-1.5 text-neutral-300 font-medium bg-white/10 border border-white/15 px-3 py-1 rounded-full text-[11px]"
                  title={presence.detailedText}
                >
                  <WifiOff className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{presence.statusText}</span>
                </span>
              )}
            </div>
          );
        })()}
      </div>

      {/* Role Tip Reminder & Hardware Test */}
      <div className="w-full bg-rose-500/10 border border-rose-500/20 rounded-xl p-2 mb-3 text-[11px] text-rose-200 text-right flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>
            روی لپ‌تاپ <strong>«من حسنم»</strong> و روی گوشی <strong>«من نیوشام»</strong> بگذارید.
          </span>
        </div>
        <button
          type="button"
          onClick={handleTestHapticsAndAudio}
          className="flex-shrink-0 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1 shadow-md active:scale-95"
        >
          {testSuccess ? <Check className="w-3 h-3 text-emerald-300" /> : <Vibrate className="w-3 h-3" />}
          <span>{testSuccess ? 'تست شد! 💋' : 'تست صدای بوسه و ویبره'}</span>
        </button>
      </div>

      {/* Real-time Interaction Banner */}
      <div className="min-h-[36px] flex items-center justify-center mb-2 px-2">
        {isBothTouching ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-rose-500/30 to-pink-500/30 border border-rose-400/50 text-white text-xs font-bold shadow-lg"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
            <span>💖 اتصال همزمان کامل! هر دو دست‌تان روی یک قلب است...</span>
          </motion.div>
        ) : isPartnerTouching ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold animate-pulse"
          >
            <Activity className="w-4 h-4 text-rose-400 animate-bounce" />
            <span>💓 {partnerName} قلب را نگه داشته و تپش مدام به گوشی‌تان ارسال می‌شود!</span>
          </motion.div>
        ) : isHolding ? (
          <div className="text-xs text-rose-300 font-medium flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-rose-400 animate-ping" />
            <span>در حال ارسال تپش و لرزش زنده به {partnerName}...</span>
          </div>
        ) : isRemotePulseFlashing ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-1.5 text-xs text-pink-300 font-bold bg-pink-500/20 border border-pink-500/40 px-3 py-1 rounded-full"
          >
            <Heart className="w-4 h-4 fill-pink-500 text-pink-500 animate-ping" />
            <span>تپش و حس زنده از {partnerName} دریافت شد!</span>
          </motion.div>
        ) : (
          <p className="text-xs text-neutral-300/80">
            قلب را لمس کنید یا نگه دارید تا ضربان و لرزش به گوشی {partnerName} منتقل شود.
          </p>
        )}
      </div>

      {/* Interactive Beating Heart Visual Area */}
      <div className="relative py-5 sm:py-7 flex flex-col items-center justify-center">
        {/* Ambient Pulsing Rings */}
        <AnimatePresence>
          {(isHolding || isPartnerTouching || localBeating || syncedBeating || isRemotePulseFlashing) && (
            <>
              <motion.div
                initial={{ scale: 0.8, opacity: 0.8 }}
                animate={{ scale: 2.2, opacity: 0 }}
                transition={{ repeat: Infinity, duration: 0.9, ease: 'easeOut' }}
                className="absolute w-40 h-40 rounded-full -z-10 pointer-events-none"
                style={{ backgroundColor: `${theme.primaryColor}30` }}
              />
              <motion.div
                initial={{ scale: 0.6, opacity: 0.9 }}
                animate={{ scale: 1.6, opacity: 0 }}
                transition={{ repeat: Infinity, duration: 0.9, delay: 0.12, ease: 'easeOut' }}
                className="absolute w-40 h-40 rounded-full -z-10 pointer-events-none"
                style={{ backgroundColor: `${theme.primaryColor}50` }}
              />
            </>
          )}
        </AnimatePresence>

        {/* Reaction Floating Animation Emojis */}
        <AnimatePresence>
          {activeReactionAnim && (
            <motion.div
              initial={{ y: 20, scale: 0.5, opacity: 0 }}
              animate={{ y: -70, scale: 1.6, opacity: 1 }}
              exit={{ y: -110, scale: 0.8, opacity: 0 }}
              transition={{ duration: 1.3, ease: 'easeOut' }}
              className="absolute -top-4 pointer-events-none z-30 text-5xl drop-shadow-2xl"
            >
              {activeReactionAnim === 'kiss' && '💋✨'}
              {activeReactionAnim === 'hug' && '🤗💖'}
              {activeReactionAnim === 'flame' && '🔥❤️'}
              {activeReactionAnim === 'sparkle' && '✨🌹'}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Central Giant Pulsing Heart Touch Button */}
        <button
          id="online-interactive-heart-btn"
          onMouseDown={handleTouchStart}
          onMouseUp={handleTouchEnd}
          onMouseLeave={handleTouchEnd}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={() => {
            triggerSingleBeat(true);
            setLocalBeating(!localBeating);
          }}
          style={{
            background: isBothTouching
              ? 'radial-gradient(circle, #f43f5e 0%, #ec4899 50%, #9333ea 100%)'
              : isRemotePulseFlashing
              ? 'radial-gradient(circle, #fb7185 0%, #f43f5e 60%, #e11d48 100%)'
              : `radial-gradient(circle, ${theme.primaryColor} 0%, rgba(225,29,72,0.75) 100%)`,
            boxShadow:
              isHolding || isPartnerTouching || isBothTouching || isRemotePulseFlashing
                ? `0 0 55px ${theme.primaryColor}, 0 0 90px rgba(244,63,94,0.6)`
                : '0 0 25px rgba(225,29,72,0.35)',
          }}
          className={`w-36 h-36 sm:w-40 sm:h-40 rounded-full flex flex-col items-center justify-center transition-all duration-200 cursor-pointer select-none border-2 border-white/50 active:scale-95 ${
            isHolding || isPartnerTouching || isBothTouching || isRemotePulseFlashing
              ? 'scale-110 animate-pulse'
              : 'hover:scale-105'
          }`}
        >
          <Heart
            className={`w-16 h-16 sm:w-20 sm:h-20 fill-white text-white drop-shadow-lg transition-transform duration-100 ${
              isHolding || isPartnerTouching || isRemotePulseFlashing ? 'scale-110' : ''
            }`}
          />
          <span className="text-[11px] font-bold text-white mt-1 drop-shadow">
            {isBothTouching
              ? 'تپش مشترک!'
              : isHolding
              ? 'در حال تپش...'
              : isPartnerTouching
              ? `${partnerName} لمس کرده!`
              : isRemotePulseFlashing
              ? `قلب ${partnerName} تپید!`
              : 'لمس یا نگه داشتن'}
          </span>
        </button>

        {/* Live Status & Beat counter */}
        <div className="mt-3 flex items-center gap-2 text-xs font-semibold" style={{ color: theme.accentColor }}>
          <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} />
          <span>ریتم عاشقانه: ۸۰ تپش در دقیقه (BPM)</span>
        </div>

        {beatCounter > 0 && (
          <span className="text-[11px] text-neutral-400 mt-1">
            تعداد تپش‌های مبادله شده: {toPersianDigits(beatCounter)} بار
          </span>
        )}
      </div>

      {/* Quick Love Touch Bursts (Instant Haptic & Sound Reactions) */}
      <div className="w-full mb-3">
        <span className="text-[11px] text-neutral-300 font-semibold block mb-2">
          ارسال حس و لرزش آنی به {partnerName}:
        </span>
        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => handleReactionClick('kiss')}
            className="flex flex-col items-center justify-center gap-1 p-2 rounded-2xl bg-rose-500/20 hover:bg-rose-500/35 border border-rose-400/30 text-white text-[11px] font-bold transition-all active:scale-90 cursor-pointer shadow-md hover:border-rose-400"
          >
            <span className="text-2xl animate-bounce">💋</span>
            <span className="text-rose-200">بوسه و ماچ</span>
          </button>

          <button
            type="button"
            onClick={() => handleReactionClick('hug')}
            className="flex flex-col items-center justify-center gap-1 p-2 rounded-2xl bg-indigo-500/20 hover:bg-indigo-500/35 border border-indigo-400/30 text-white text-[11px] font-bold transition-all active:scale-90 cursor-pointer shadow-md hover:border-indigo-400"
          >
            <span className="text-2xl">🤗</span>
            <span className="text-indigo-200">آغوش گرم</span>
          </button>

          <button
            type="button"
            onClick={() => handleReactionClick('flame')}
            className="flex flex-col items-center justify-center gap-1 p-2 rounded-2xl bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/30 text-white text-[11px] font-bold transition-all active:scale-90 cursor-pointer shadow-md hover:border-amber-400"
          >
            <span className="text-2xl">🔥</span>
            <span className="text-amber-200">شور عشق</span>
          </button>

          <button
            type="button"
            onClick={() => handleReactionClick('sparkle')}
            className="flex flex-col items-center justify-center gap-1 p-2 rounded-2xl bg-pink-500/20 hover:bg-pink-500/35 border border-pink-400/30 text-white text-[11px] font-bold transition-all active:scale-90 cursor-pointer shadow-md hover:border-pink-400"
          >
            <span className="text-2xl">✨</span>
            <span className="text-pink-200">نوازش</span>
          </button>
        </div>
      </div>

      {/* Scientific / Romantic stats box */}
      <div className="w-full bg-black/40 border border-white/10 rounded-2xl p-3 text-right text-xs mb-3 space-y-1.5">
        <div className="flex items-center justify-between text-neutral-300 font-bold border-b border-white/10 pb-1.5">
          <span className="flex items-center gap-1.5 text-white text-[11px]">
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            ضربان قلب‌های مشترک در طول {toPersianDigits(totalDays)} روز:
          </span>
          <span className="text-emerald-400 font-mono text-[11px]">
            ~{toPersianDigits(heartbeatsTotal.toLocaleString())} تپش
          </span>
        </div>
        <div className="text-[10px] text-neutral-400 flex items-center justify-between pt-0.5">
          <span>قلب حسن: ~{toPersianDigits(singlePersonHeartbeats.toLocaleString())}</span>
          <span>قلب نیوشا: ~{toPersianDigits(singlePersonHeartbeats.toLocaleString())}</span>
        </div>
      </div>

      {/* Action Buttons: Synchronized Continuous Beating & Telegram Notification */}
      <div className="w-full flex flex-col sm:flex-row items-center gap-2">
        <button
          type="button"
          onClick={handleToggleContinuous}
          className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer border flex items-center justify-center gap-1.5 ${
            syncedBeating
              ? 'bg-rose-600 text-white border-rose-400 shadow-lg animate-pulse'
              : 'bg-white text-black hover:bg-neutral-200 border-white'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>{syncedBeating ? 'توقف تپش پیوسته همگام' : 'فعال‌سازی تپش همگام دوطرفه'}</span>
        </button>

        <button
          type="button"
          onClick={handleSendTelegramAlert}
          disabled={isSendingTelegram || telegramSent}
          className="w-full py-2.5 rounded-xl bg-black/50 hover:bg-black/70 border border-white/20 text-white font-medium text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
        >
          {telegramSent ? (
            <span className="text-emerald-400 font-bold">پیام به تلگرام ارسال شد! ❤️</span>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span>{isSendingTelegram ? 'در حال ارسال...' : `خبر دادن به ${partnerName} در تلگرام`}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
