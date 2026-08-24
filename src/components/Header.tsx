import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Music, VolumeX, Sparkles, Heart, Clock, Activity, Menu, Droplet, Upload, Lock, Image as ImageIcon } from 'lucide-react';
import { romanticAudio } from '../utils/audio';
import { calculateRelationshipAge, DEFAULT_START_DATE, toPersianDigits, RelationshipDuration } from '../utils/dateCalculations';
import { useTheme } from '../context/ThemeContext';
import { ThemeSelector } from './ThemeSelector';
import { TelegramNotifyModal } from './TelegramNotifyModal';
import { HeartbeatModal } from './HeartbeatModal';
import { HugExperienceModal } from './HugExperienceModal';
import { PeriodCareModal } from './PeriodCareModal';
import { DailyMessageModal } from './DailyMessageModal';
import { QuickNavDrawer } from './QuickNavDrawer';
import { QuizGame } from './QuizGame';

import { subscribeSiteLogo, saveSiteLogoRealtime } from '../services/realtimeSync';

interface HeaderProps {
  onNavigate: (sectionId: string) => void;
  onOpenSky?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigate, onOpenSky }) => {
  const { theme } = useTheme();
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [isHeartbeatModalOpen, setIsHeartbeatModalOpen] = useState(false);
  const [isHugModalOpen, setIsHugModalOpen] = useState(false);
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [isDailyMessageOpen, setIsDailyMessageOpen] = useState(false);
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState(false);

  // Custom Logo Upload & Automatic Background Removal State (Synced with Firestore & Server)
  const [customLogoUrl, setCustomLogoUrl] = useState<string | null>(() => {
    return localStorage.getItem('custom_header_logo') || null;
  });
  const [showLogoUpload, setShowLogoUpload] = useState<boolean>(() => {
    return localStorage.getItem('hide_logo_upload_btn') !== 'true';
  });
  const [isProcessingLogo, setIsProcessingLogo] = useState(false);
  const [uploadToast, setUploadToast] = useState<string | null>(null);
  const logoInputRef = React.useRef<HTMLInputElement>(null);

  // Real-time Firestore listener for site logo across all devices
  useEffect(() => {
    const unsubLogo = subscribeSiteLogo((data) => {
      if (data) {
        if (data.customLogoUrl !== undefined) {
          setCustomLogoUrl(data.customLogoUrl);
          if (data.customLogoUrl) {
            localStorage.setItem('custom_header_logo', data.customLogoUrl);
          } else {
            localStorage.removeItem('custom_header_logo');
          }
        }
        if (typeof data.showLogoUpload === 'boolean') {
          setShowLogoUpload(data.showLogoUpload);
          localStorage.setItem('hide_logo_upload_btn', data.showLogoUpload ? 'false' : 'true');
        }
      }
    });

    return () => {
      unsubLogo();
    };
  }, []);

  const saveLogo = async (logoUrl: string | null, uploadVisible: boolean) => {
    await saveSiteLogoRealtime({ customLogoUrl: logoUrl, showLogoUpload: uploadVisible });
  };

  const handleLogoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processAndSetLogo(file);
  };

  const processAndSetLogo = (file: File) => {
    setIsProcessingLogo(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const rawSrc = e.target?.result as string;
      if (!rawSrc) {
        setIsProcessingLogo(false);
        return;
      }
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = async () => {
        // Optimize dimensions for ultra crisp display and lightweight Firestore payload
        let maxW = 1000;
        let maxH = 500;
        let w = img.width;
        let h = img.height;
        if (w > maxW || h > maxH) {
          const ratio = Math.min(maxW / w, maxH / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setCustomLogoUrl(rawSrc);
          localStorage.setItem('custom_header_logo', rawSrc);
          setShowLogoUpload(false);
          localStorage.setItem('hide_logo_upload_btn', 'true');
          await saveLogo(rawSrc, false);
          setIsProcessingLogo(false);
          setUploadToast('لوگوی جدید با موفقیت در فایربیس ذخیره شد و دکمه حذف گردید! ✨');
          setTimeout(() => setUploadToast(null), 5000);
          return;
        }

        ctx.drawImage(img, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        // If file is not PNG or has plain white/light checkerboard, cleanly remove background
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          if (a === 0) continue;

          const maxC = Math.max(r, g, b);
          const minC = Math.min(r, g, b);
          const lightness = (maxC + minC) / 2;
          const diff = maxC - minC;

          // Preserve watercolor red/rose calligraphy letters
          const isRedishText = r > g + 18 && r > b + 15;

          if (!isRedishText) {
            // Strip out solid white or light grey backgrounds
            if (lightness > 240 && diff < 15) {
              data[i + 3] = 0; // Make 100% transparent
            } else if (r > 220 && g > 220 && b > 220 && diff < 10) {
              data[i + 3] = 0;
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);
        const cleanPng = canvas.toDataURL('image/png', 0.92);
        
        setCustomLogoUrl(cleanPng);
        localStorage.setItem('custom_header_logo', cleanPng);
        setShowLogoUpload(false);
        localStorage.setItem('hide_logo_upload_btn', 'true');
        
        // Save to Firebase Firestore & Server with showLogoUpload: false so the upload button disappears permanently!
        await saveLogo(cleanPng, false);
        setIsProcessingLogo(false);
        setUploadToast('لوگوی جدید با موفقیت در فایربیس ذخیره شد و دکمه حذف گردید! ✨');
        setTimeout(() => setUploadToast(null), 5000);
      };
      img.onerror = async () => {
        setCustomLogoUrl(rawSrc);
        localStorage.setItem('custom_header_logo', rawSrc);
        setShowLogoUpload(false);
        localStorage.setItem('hide_logo_upload_btn', 'true');
        await saveLogo(rawSrc, false);
        setIsProcessingLogo(false);
        setUploadToast('لوگوی جدید در فایربیس ذخیره شد! ✨');
        setTimeout(() => setUploadToast(null), 5000);
      };
      img.src = rawSrc;
    };
    reader.readAsDataURL(file);
  };
  
  // Fixed start date (17 Ordibehesht 1405 at 04:00 AM: 2026-05-07T04:00:00)
  const startDate = DEFAULT_START_DATE;

  const [duration, setDuration] = useState<RelationshipDuration>(() =>
    calculateRelationshipAge(startDate)
  );

  // Live ticking counter
  useEffect(() => {
    const tick = () => {
      setDuration(calculateRelationshipAge(startDate));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startDate]);

  const toggleMusic = () => {
    const active = romanticAudio.toggle();
    setIsPlayingMusic(active);
  };

  const formatNumber = (num: number) => {
    return num.toString().padStart(2, '0');
  };

  return (
    <header className="relative pt-20 sm:pt-24 pb-16 flex flex-col items-center text-center px-4 overflow-hidden font-vazir">
      {/* Background ambient glow lights */}
      <div
        className={`absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[380px] rounded-full blur-3xl pointer-events-none -z-10 transition-colors duration-700 ${theme.ambientLight1}`}
      />

      {/* Top Bar with Menu (3-line), Theme Switcher, and Music - Fixed/Sticky for better access */}
      <div className="fixed top-0 left-0 right-0 z-[50] flex items-center justify-between p-3 sm:p-6 pointer-events-auto bg-black/20 sm:bg-transparent backdrop-blur-lg sm:backdrop-blur-none border-b border-white/5 sm:border-none">
        {/* Right side: 3-line Menu Button & 3-Color Theme Switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            id="top-hamburger-menu-btn"
            onClick={() => setIsNavDrawerOpen(true)}
            className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all cursor-pointer shadow-lg active:scale-90"
            title="فهرست و دسترسی سریع"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <ThemeSelector />
        </div>

        {/* Left side: Music Toggle */}
        <div className="flex items-center gap-2">
          {/* Floating Music Button */}
          <button
            id="music-toggle-btn"
            onClick={toggleMusic}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border text-xs transition-all duration-300 backdrop-blur-md cursor-pointer shadow-lg active:scale-90 ${
              isPlayingMusic
                ? 'bg-rose-500/20 text-rose-200 border-rose-500/50'
                : 'bg-white/10 text-neutral-300 border-white/20 hover:text-white'
            }`}
            title={isPlayingMusic ? 'قطع موزیک ملایم' : 'پخش موزیک ملایم عاشقانه'}
          >
            {isPlayingMusic ? (
              <div className="relative">
                <Music className="w-4 h-4 animate-bounce" style={{ color: theme.primaryColor }} />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
              </div>
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
            <span className="text-[11px] font-bold tracking-tight">{isPlayingMusic ? 'موزیک روشن' : 'پخش موسیقی'}</span>
          </button>
        </div>
      </div>

      {/* Signature Logo "Newsha" - Image or Calligraphy Script */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="mb-4 sm:mb-6 relative mt-4 sm:mt-0 flex flex-col items-center justify-center"
      >
        <div className="relative inline-flex flex-col items-center">
          {customLogoUrl ? (
            <img
              src={customLogoUrl}
              alt="Newsha Logo"
              className="max-h-36 sm:max-h-52 md:max-h-64 max-w-[90vw] object-contain drop-shadow-[0_0_25px_rgba(255,255,255,0.5)] drop-shadow-[0_0_35px_rgba(244,63,94,0.4)] select-none hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <span
              className="font-script text-7xl sm:text-8xl md:text-9xl text-transparent bg-clip-text select-none drop-shadow-[0_0_20px_rgba(203,63,97,0.45)] tracking-wide font-normal px-2 py-1"
              style={{
                backgroundImage: `linear-gradient(135deg, #e4718a 0%, #d2486a 30%, #be3456 65%, #a12242 100%)`,
                fontFamily: "'Alex Brush', 'Great Vibes', cursive",
                WebkitBackgroundClip: 'text',
              }}
            >
              Newsha
            </span>
          )}

          {/* Subtle filigree ornament underneath */}
          <div className="flex items-center justify-center gap-2 mt-1 opacity-70">
            <span
              className="h-[1px] w-12"
              style={{
                backgroundImage: `linear-gradient(to right, transparent, ${theme.primaryColor}, transparent)`,
              }}
            />
            <Heart className="w-3 h-3 fill-current" style={{ color: theme.primaryColor }} />
            <span
              className="h-[1px] w-12"
              style={{
                backgroundImage: `linear-gradient(to right, transparent, ${theme.primaryColor}, transparent)`,
              }}
            />
          </div>
        </div>
      </motion.div>

      {/* Top message pill and Emergency Sad Alert Section */}
      <div className="flex flex-col items-center gap-2 mb-5 sm:mb-6 max-w-full px-2">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          style={{
            backgroundColor: theme.pillBg,
            borderColor: theme.pillBorder,
          }}
          className="inline-flex items-center justify-center px-4 sm:px-6 py-1.5 sm:py-2 rounded-full border backdrop-blur-sm text-[11px] sm:text-xs md:text-sm shadow-md text-center max-w-full"
        >
          <span>هر موقع حالت خوب نبود یا که غصه داشتی به اینا فکر کن</span>
        </motion.div>

        {/* If still sad / Telegram Bot button */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="flex flex-col items-center gap-2 mt-1 max-w-full"
        >
          <span className="text-[11px] sm:text-sm font-medium italic opacity-90">
            ولی اگه بازم حالت خوب نبود...
          </span>

          <button
            id="notify-hasan-btn"
            onClick={() => setIsTelegramModalOpen(true)}
            className={`px-4 sm:px-5 py-2 rounded-full bg-gradient-to-r ${theme.buttonGradient} text-white font-bold text-[11px] sm:text-xs shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer border border-white/20 text-center`}
            title="ارسال پیام اضطراری به تلگرام حسن"
          >
            <Heart className="w-3.5 h-3.5 fill-white animate-pulse flex-shrink-0" />
            <span>به حسن خبر بده که پیشت باشم 💌</span>
          </button>
        </motion.div>
      </div>

      {/* Dynamic Relationship Age Title */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.35 }}
        className="mb-5 sm:mb-6 px-2"
      >
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">
          {duration.days > 0 ? `${duration.days} روز عاشقی مشترکمون` : 'شروع روزهای قشنگمون'}
        </h1>
        <div className="flex items-center justify-center gap-2 text-xs sm:text-sm md:text-base font-normal opacity-90">
          <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" style={{ color: theme.accentColor, animationDuration: '8s' }} />
          <span>مبارک باشه خورشید من ❤️</span>
          <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" style={{ color: theme.accentColor, animationDuration: '8s' }} />
        </div>
      </motion.div>

      {/* Live Counting Up Cards: SECONDS, MINUTES, HOURS, DAYS */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="flex items-center justify-center gap-1.5 xs:gap-2.5 sm:gap-4 md:gap-6 mb-6 direction-ltr max-w-full px-1"
      >
        {/* SECONDS */}
        <div className="flex flex-col items-center">
          <div
            style={{
              backgroundColor: theme.cardBg,
              borderColor: theme.cardBorder,
            }}
            className="w-[4.2rem] xs:w-16 sm:w-20 md:w-24 h-16 xs:h-20 sm:h-24 md:h-28 rounded-xl sm:rounded-2xl border flex items-center justify-center shadow-xl backdrop-blur-md"
          >
            <span className="text-xl xs:text-2xl sm:text-3xl md:text-4xl font-extrabold text-white font-mono tracking-wider">
              {formatNumber(duration.seconds)}
            </span>
          </div>
          <span
            style={{ color: theme.accentColor }}
            className="mt-1.5 sm:mt-2 text-[9px] xs:text-[10px] sm:text-xs font-semibold tracking-wider sm:tracking-widest uppercase opacity-90"
          >
            SECONDS
          </span>
        </div>

        {/* MINUTES */}
        <div className="flex flex-col items-center">
          <div
            style={{
              backgroundColor: theme.cardBg,
              borderColor: theme.cardBorder,
            }}
            className="w-[4.2rem] xs:w-16 sm:w-20 md:w-24 h-16 xs:h-20 sm:h-24 md:h-28 rounded-xl sm:rounded-2xl border flex items-center justify-center shadow-xl backdrop-blur-md"
          >
            <span className="text-xl xs:text-2xl sm:text-3xl md:text-4xl font-extrabold text-white font-mono tracking-wider">
              {formatNumber(duration.minutes)}
            </span>
          </div>
          <span
            style={{ color: theme.accentColor }}
            className="mt-1.5 sm:mt-2 text-[9px] xs:text-[10px] sm:text-xs font-semibold tracking-wider sm:tracking-widest uppercase opacity-90"
          >
            MINUTES
          </span>
        </div>

        {/* HOURS */}
        <div className="flex flex-col items-center">
          <div
            style={{
              backgroundColor: theme.cardBg,
              borderColor: theme.cardBorder,
            }}
            className="w-[4.2rem] xs:w-16 sm:w-20 md:w-24 h-16 xs:h-20 sm:h-24 md:h-28 rounded-xl sm:rounded-2xl border flex items-center justify-center shadow-xl backdrop-blur-md"
          >
            <span className="text-xl xs:text-2xl sm:text-3xl md:text-4xl font-extrabold text-white font-mono tracking-wider">
              {formatNumber(duration.hours)}
            </span>
          </div>
          <span
            style={{ color: theme.accentColor }}
            className="mt-1.5 sm:mt-2 text-[9px] xs:text-[10px] sm:text-xs font-semibold tracking-wider sm:tracking-widest uppercase opacity-90"
          >
            HOURS
          </span>
        </div>

        {/* DAYS */}
        <div className="flex flex-col items-center">
          <div
            style={{
              backgroundColor: theme.cardBg,
              borderColor: theme.cardBorder,
            }}
            className="w-[4.2rem] xs:w-16 sm:w-20 md:w-24 h-16 xs:h-20 sm:h-24 md:h-28 rounded-xl sm:rounded-2xl border flex items-center justify-center shadow-xl backdrop-blur-md"
          >
            <span className="text-xl xs:text-2xl sm:text-3xl md:text-4xl font-extrabold text-white font-mono tracking-wider">
              {formatNumber(duration.days)}
            </span>
          </div>
          <span
            style={{ color: theme.accentColor }}
            className="mt-1.5 sm:mt-2 text-[9px] xs:text-[10px] sm:text-xs font-semibold tracking-wider sm:tracking-widest uppercase opacity-90"
          >
            DAYS
          </span>
        </div>
      </motion.div>

      {/* Relationship Age Detail Box (سن دقیق رابطه) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.45 }}
        style={{
          backgroundColor: theme.cardBg,
          borderColor: theme.cardBorder,
        }}
        className="w-full max-w-xl mx-auto mb-6 p-4 rounded-2xl border backdrop-blur-md shadow-lg"
      >
        <div className="flex items-center justify-center gap-1.5 mb-2 text-[11px] sm:text-xs font-semibold text-center" style={{ color: theme.accentColor }}>
          <Clock className="w-3.5 h-3.5 flex-shrink-0" />
          <span>سن دقیق رابطمون از ۱۷ اردیبهشت ۱۴۰۵ (ساعت ۴:۰۰ بامداد):</span>
        </div>

        <p className="text-xs sm:text-sm md:text-base font-bold text-white leading-relaxed text-center px-1">
          {duration.ageText}
        </p>

        {/* Mini stats */}
        <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap items-center justify-around gap-2 text-[10px] sm:text-[11px] text-neutral-400">
          <button
            id="open-heartbeat-modal-btn"
            type="button"
            onClick={() => setIsHeartbeatModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/15 border border-rose-500/40 text-rose-200 hover:text-white hover:bg-rose-500/25 transition-all cursor-pointer group shadow-sm"
            title="لمس تپش قلب زنده آنلاین و پیام‌رسان دو‌نفره اختصاصی"
          >
            <Activity className="w-3.5 h-3.5 text-rose-400 group-hover:animate-pulse flex-shrink-0" />
            <span className="font-semibold">تپش قلب زنده آنلاین و چت دو‌نفره 💓💬</span>
          </button>
          
          <div className="flex items-center gap-1.5 px-3 py-1.5">
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 flex-shrink-0" />
            <span>{toPersianDigits(duration.totalHours.toLocaleString())} ساعت با هم بودن</span>
          </div>
        </div>
      </motion.div>

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.48 }}
        className="mb-6 px-2 flex flex-wrap items-center justify-center gap-2.5"
      >
        <button
          id="hug-experience-btn"
          onClick={() => setIsHugModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-full border border-pink-500/50 bg-gradient-to-r from-rose-900/80 via-pink-900/70 to-purple-900/80 text-white text-xs sm:text-sm font-bold hover:border-pink-400 hover:scale-105 shadow-xl hover:shadow-rose-900/50 transition-all cursor-pointer backdrop-blur-md active:scale-95"
        >
          <span className="text-base">💕</span>
          <span>بغل مجازی حسن</span>
        </button>

        <button
          id="telegram-bot-msg-btn"
          onClick={() => setIsTelegramModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-full border border-rose-500/50 bg-gradient-to-r from-rose-800/80 via-purple-900/70 to-pink-900/80 text-white text-xs sm:text-sm font-bold hover:border-rose-400 hover:scale-105 shadow-xl hover:shadow-rose-900/50 transition-all cursor-pointer backdrop-blur-md active:scale-95"
        >
          <span className="text-base">🤖</span>
          <span>پیام با ربات 🤖💬✨</span>
        </button>
      </motion.div>

      {/* Subtitle phrase matching screenshot */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        className="text-xs sm:text-sm text-neutral-300/90 mb-6 sm:mb-8 max-w-md px-3 text-center"
      >
        خوش اومدی دختری که آرزوم شده خنده ی رو لبات
      </motion.p>



      {/* 3-Line Quick Navigation Drawer */}
      <QuickNavDrawer
        isOpen={isNavDrawerOpen}
        onClose={() => setIsNavDrawerOpen(false)}
        onNavigate={onNavigate}
        onOpenPeriodCare={() => setIsPeriodModalOpen(true)}
        onOpenTelegramModal={() => setIsTelegramModalOpen(true)}
        onOpenHugModal={() => setIsHugModalOpen(true)}
        onOpenDailyMessage={() => setIsDailyMessageOpen(true)}
        onOpenQuiz={() => setIsQuizOpen(true)}
        onOpenSky={() => onOpenSky?.()}
        onOpenHeartbeat={() => setIsHeartbeatModalOpen(true)}
      />

      {/* Daily Message from Hasan to Niosha Modal */}
      <DailyMessageModal
        isOpen={isDailyMessageOpen}
        onClose={() => setIsDailyMessageOpen(false)}
      />

      {/* Period & Menstrual Health Assistant Modal */}
      <PeriodCareModal
        isOpen={isPeriodModalOpen}
        onClose={() => setIsPeriodModalOpen(false)}
      />

      {/* Telegram Emergency Notification Modal */}
      <TelegramNotifyModal
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
      />

      {/* Shared Heartbeat Tactile Modal */}
      <HeartbeatModal
        isOpen={isHeartbeatModalOpen}
        onClose={() => setIsHeartbeatModalOpen(false)}
        heartbeatsTotal={duration.heartbeats}
        totalDays={duration.days}
      />

      {/* Hug Experience Modal with Voice & Vibration */}
      <HugExperienceModal
        isOpen={isHugModalOpen}
        onClose={() => setIsHugModalOpen(false)}
        totalDays={duration.days}
      />

      {isQuizOpen && (
        <QuizGame onClose={() => setIsQuizOpen(false)} />
      )}
    </header>
  );
};

