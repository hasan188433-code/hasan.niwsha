import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Heart, BookOpen, Image as ImageIcon, MessageSquareHeart, Droplet, Trophy, Gamepad2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface QuickNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (sectionId: string) => void;
  onOpenPeriodCare: () => void;
  onOpenTelegramModal: () => void;
  onOpenHugModal: () => void;
  onOpenDailyMessage: () => void;
  onOpenQuiz: () => void;
  onOpenSky: () => void;
  onOpenHeartbeat?: () => void;
}

export const QuickNavDrawer: React.FC<QuickNavDrawerProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenPeriodCare,
  onOpenTelegramModal,
  onOpenHugModal,
  onOpenDailyMessage,
  onOpenQuiz,
  onOpenSky,
  onOpenHeartbeat,
}) => {
  const { theme } = useTheme();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] font-vazir">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm cursor-pointer"
          />

          {/* Drawer - Always firmly anchored to right side for RTL */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute top-0 right-0 bottom-0 w-full max-w-xs sm:max-w-sm h-full bg-[#120510] border-l border-rose-900/60 p-5 flex flex-col justify-between shadow-2xl overflow-y-auto cursor-default text-white"
          >
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="font-script text-2xl text-transparent bg-clip-text bg-gradient-to-r from-white via-rose-300 to-white">
                    Newsha & Hasan
                  </span>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Nav Items List */}
              <div className="mt-5 space-y-1.5">
                <span className="text-[11px] text-neutral-400 font-semibold px-2 block mb-2">
                  فهرست بخش‌های سایت
                </span>

                {/* 1. Period Care */}
                <button
                  onClick={() => {
                    onClose();
                    onOpenPeriodCare();
                  }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/10 text-neutral-200 hover:text-white text-xs font-medium transition-all text-right cursor-pointer"
                >
                  <Droplet className="w-4 h-4 text-pink-400 flex-shrink-0" />
                  <span>دستیار هوش مصنوعی و سلامت (پریودی) 🌸</span>
                </button>

                {/* 2. Story */}
                <button
                  onClick={() => {
                    onClose();
                    onNavigate('story-section');
                  }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/10 text-neutral-200 hover:text-white text-xs font-medium transition-all text-right cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>داستان شروع عاشقی...</span>
                </button>

                {/* 3. Reasons to love */}
                <button
                  onClick={() => {
                    onClose();
                    onNavigate('reasons-section');
                  }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/10 text-neutral-200 hover:text-white text-xs font-medium transition-all text-right cursor-pointer"
                >
                  <Heart className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span>دلایل دوست داشتنت</span>
                </button>

                {/* 4. Sky Game */}
                <button
                  onClick={() => {
                    onClose();
                    onOpenSky();
                  }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/10 text-neutral-200 hover:text-white text-xs font-medium transition-all text-right cursor-pointer"
                >
                  <Gamepad2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  <span>بازی آسمان پر‌ستاره (بازی سه‌بعدی) 🌌</span>
                </button>

                {/* 5. Quiz */}
                <button
                  onClick={() => {
                    onClose();
                    onOpenQuiz();
                  }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/10 text-neutral-200 hover:text-white text-xs font-medium transition-all text-right cursor-pointer"
                >
                  <Trophy className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                  <span>کوییز قلب‌ها (بازی دونفره)</span>
                </button>

                {/* 6. Photos Gallery */}
                <button
                  onClick={() => {
                    onClose();
                    onNavigate('photos-section');
                  }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/10 text-neutral-200 hover:text-white text-xs font-medium transition-all text-right cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>گالری عکس‌ها و خاطرات</span>
                </button>

                {/* 7. Shared Diary */}
                <button
                  onClick={() => {
                    onClose();
                    onNavigate('diary-section');
                  }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/10 text-neutral-200 hover:text-white text-xs font-medium transition-all text-right cursor-pointer"
                >
                  <MessageSquareHeart className="w-4 h-4 text-pink-400 flex-shrink-0" />
                  <span>دفترچه خاطرات مشترک</span>
                </button>
              </div>

              {/* Quick Actions */}
              <div className="mt-5 pt-4 border-t border-white/10 space-y-2">
                <span className="text-[11px] text-neutral-400 font-semibold px-2 block mb-1">
                  امکانات اختصاصی حسن و نیوشا
                </span>

                <button
                  onClick={() => {
                    onClose();
                    onOpenHeartbeat?.();
                  }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-gradient-to-r from-rose-900/80 via-pink-900/60 to-purple-900/70 hover:brightness-110 border border-rose-400/50 text-white text-xs font-bold transition-all text-right cursor-pointer shadow-lg animate-pulse"
                >
                  <span className="text-base">💓</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white">تپش قلب زنده و چت دو‌نفره</span>
                    <span className="text-[10px] text-rose-300 font-normal">ارسال ویبره همزمان + وویس و فایل 💬</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    onClose();
                    onOpenDailyMessage();
                  }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-gradient-to-r from-rose-950/70 via-pink-950/50 to-purple-950/60 hover:from-rose-900/80 hover:to-pink-900/70 border border-rose-500/50 text-rose-100 text-xs font-bold transition-all text-right cursor-pointer shadow-md"
                >
                  <span className="text-base">💌</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white">پیغام و نامه روزانه برای نیوشا</span>
                    <span className="text-[10px] text-rose-300 font-normal">پیام امروز حسن + ثبت نامه جدید</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    onClose();
                    onOpenHugModal();
                  }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-pink-950/30 hover:bg-pink-950/60 border border-pink-700/40 text-pink-200 text-xs font-medium transition-all text-right cursor-pointer"
                >
                  <span className="text-base">💕</span>
                  <span>بغل مجازی حسن</span>
                </button>

                <button
                  onClick={() => {
                    onClose();
                    onOpenTelegramModal();
                  }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-rose-950/30 hover:bg-rose-950/60 border border-rose-700/40 text-rose-200 text-xs font-medium transition-all text-right cursor-pointer"
                >
                  <span className="text-base">🤖</span>
                  <span>پیام با ربات 🤖💬✨</span>
                </button>
              </div>
            </div>

            {/* Footer in Drawer */}
            <div className="pt-4 border-t border-white/10 text-center text-[10px] text-neutral-400">
              تقدیم به نیوشای قشنگم ❤️ همیشه کنارت هستم
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
