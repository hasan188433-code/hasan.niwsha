import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Heart, X, Send, Calendar, Check, Lock, Unlock, History, ArrowRight, RefreshCw, PenLine } from 'lucide-react';
import { DailyMessage } from '../types';
import { useTheme } from '../context/ThemeContext';

interface DailyMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DailyMessageModal: React.FC<DailyMessageModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { theme } = useTheme();
  const [messageData, setMessageData] = useState<DailyMessage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Authentication for Hasan to edit
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [passError, setPassError] = useState(false);

  const fetchDailyMessage = () => {
    setIsLoading(true);
    fetch('/api/daily-message')
      .then((res) => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then((data: DailyMessage) => {
        setMessageData(data);
        if (data.text) {
          setEditText(data.text);
        }
      })
      .catch((err) => {
        console.error('Error loading daily message:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    if (isOpen) {
      fetchDailyMessage();
      setIsEditing(false);
      setShowHistory(false);
      setSaveSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'امروز';
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('fa-IR', {
        dateStyle: 'full',
        timeStyle: 'short',
      }).format(date);
    } catch {
      return 'امروز';
    }
  };

  const handleStartEdit = () => {
    if (isUnlocked) {
      setEditText(messageData?.text || '');
      setIsEditing(true);
    } else {
      setShowPassModal(true);
      setPasscode('');
      setPassError(false);
    }
  };

  const handleVerifyPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    // Convert Persian / Arabic numerals to English numerals
    const normalized = passcode
      .trim()
      .replace(/[۰-۹]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1728))
      .replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1584));

    if (normalized === '1386') {
      setIsUnlocked(true);
      setShowPassModal(false);
      setEditText(messageData?.text || '');
      setIsEditing(true);
    } else {
      setPassError(true);
    }
  };

  const handleSaveMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editText.trim()) return;

    setIsSaving(true);
    try {
      const res = await fetch('/api/daily-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editText.trim() }),
      });
      const data = await res.json();
      if (data.success && data.dailyMessage) {
        setMessageData(data.dailyMessage);
        setSaveSuccess(true);
        setIsEditing(false);
        setTimeout(() => setSaveSuccess(false), 3500);
      }
    } catch (err) {
      console.error('Error saving daily message:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-4 font-vazir cursor-pointer overflow-y-auto"
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 15 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-gradient-to-b from-[#240a1d] via-[#1a0715] to-[#0e030c] border border-rose-500/40 p-5 sm:p-7 rounded-3xl shadow-2xl relative text-white cursor-default overflow-hidden my-auto"
      >
        {/* Top Glowing Edge */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-rose-500 via-pink-400 to-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.8)]" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 rounded-full bg-black/40 hover:bg-black/70 text-neutral-300 hover:text-white transition-all cursor-pointer border border-white/10 z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Badge & Title */}
        <div className="flex flex-col items-center text-center mb-5 mt-1">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold mb-2.5 shadow-md">
            <Sparkles className="w-3.5 h-3.5 text-rose-400" />
            <span>پیغام اختصاصی روزانه حسن برای نیوشا 💕</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center justify-center gap-2">
            <span>نامه و حرف‌های امروز حسن</span>
            <Heart className="w-5 h-5 text-rose-500 fill-rose-500 animate-pulse" />
          </h2>

          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center gap-1.5 text-[11px] text-rose-200/90 bg-black/40 px-3 py-1 rounded-full border border-white/10">
              <Calendar className="w-3.5 h-3.5 text-rose-400" />
              <span>
                {messageData ? formatDate(messageData.updatedAt) : 'در حال بارگذاری...'}
              </span>
            </div>

            {messageData?.isNewDay && (
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full font-bold">
                روز تازه 🌅
              </span>
            )}
          </div>
        </div>

        {/* Success Alert */}
        <AnimatePresence>
          {saveSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-3 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-bold text-center flex items-center justify-center gap-2 shadow-lg"
            >
              <Check className="w-4 h-4 text-emerald-400" />
              <span>پیغام جدید امروز با موفقیت روی هاست ذخیره شد و برای نیوشا ثبت گردید!</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* History Sub-view */}
        {showHistory ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-300">
                <History className="w-4 h-4 text-rose-400" />
                <span>آرشیو پیام‌های روزهای گذشته</span>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="text-xs text-neutral-300 hover:text-white flex items-center gap-1 cursor-pointer bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg transition-colors"
              >
                <span>بازگشت به پیام امروز</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-2.5 pr-1">
              {messageData?.history && messageData.history.length > 0 ? (
                messageData.history.map((hist, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-1.5 text-right"
                  >
                    <div className="flex items-center justify-between text-[11px] text-neutral-400">
                      <span>پیام پیشین #{messageData.history!.length - idx}</span>
                      <span>{formatDate(hist.updatedAt)}</span>
                    </div>
                    <p className="text-xs text-rose-100 font-medium whitespace-pre-line leading-relaxed">
                      {hist.text}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-neutral-400 text-xs">
                  هنوز تاریخچه پیامی ذخیره نشده است. اولین پیام‌های ثبت‌شده به مرور به اینجا اضافه می‌شوند.
                </div>
              )}
            </div>
          </div>
        ) : !isEditing ? (
          /* Normal View Mode: The Love Letter Envelope/Card */
          <div className="space-y-5">
            <div className="relative p-5 sm:p-7 rounded-3xl bg-gradient-to-br from-[#fffdfa] via-[#fff8fa] to-[#ffeef2] text-neutral-900 border-2 border-rose-300 shadow-2xl text-center font-vazir leading-relaxed text-sm sm:text-base font-bold">
              {/* Wax Seal Graphic Badge */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-rose-600 text-white flex items-center gap-1.5 shadow-lg border-2 border-white text-[11px] font-extrabold tracking-wide">
                <Heart className="w-3.5 h-3.5 fill-white" />
                <span>مخصوص نیوشام</span>
              </div>

              {isLoading ? (
                <div className="py-8 flex flex-col items-center justify-center gap-2 text-rose-900">
                  <RefreshCw className="w-5 h-5 animate-spin text-rose-600" />
                  <span className="text-xs font-normal">در حال دریافت نامه امروز...</span>
                </div>
              ) : (
                <p className="text-rose-950 pt-3 pb-2 whitespace-pre-line leading-loose text-base sm:text-lg">
                  {messageData?.text || 'نیوشای قشنگم، امروز هم بی‌نهایت دوستت دارم ❤️'}
                </p>
              )}

              {/* Letter Footer Sign */}
              <div className="mt-3 pt-2 border-t border-rose-200/80 flex items-center justify-between text-[11px] text-rose-800 font-medium">
                <span>همیشه عاشق و در کنارتم</span>
                <span className="font-script text-lg text-rose-700">Hasan</span>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleStartEdit}
                  className="px-3.5 py-2 rounded-2xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-200 hover:text-white border border-rose-700/50 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {isUnlocked ? <Unlock className="w-3.5 h-3.5 text-emerald-400" /> : <PenLine className="w-3.5 h-3.5 text-rose-400" />}
                  <span>{isUnlocked ? 'ویرایش نامه امروز (حسن)' : 'نوشتن/ویرایش نامه امروز (حسن)'}</span>
                </button>

                {messageData?.history && messageData.history.length > 0 && (
                  <button
                    onClick={() => setShowHistory(true)}
                    className="p-2 rounded-2xl bg-black/40 hover:bg-black/70 text-neutral-300 hover:text-white border border-white/10 text-xs transition-all cursor-pointer"
                    title="مشاهده آرشیو نامه‌های قبلی"
                  >
                    <History className="w-4 h-4" />
                  </button>
                )}
              </div>

              <button
                onClick={onClose}
                className="px-5 py-2 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-bold shadow-lg transition-all cursor-pointer mr-auto"
              >
                بستن ❤️
              </button>
            </div>
          </div>
        ) : (
          /* Edit Form Mode for Hasan */
          <form onSubmit={handleSaveMessage} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-rose-300">
                  متن نامه امروز برای نیوشا جان (ذخیره مستقیم روی هاست):
                </label>
                <span className="text-[10px] text-neutral-400">ذخیره خودکار در آرشیو</span>
              </div>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={6}
                placeholder="نیوشای قشنگم، امروز میخوام بهت بگم که چقدر برام باارزشی و..."
                className="w-full p-3.5 rounded-2xl bg-black/60 border border-rose-500/40 text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-rose-400 transition-all font-vazir leading-relaxed"
                required
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold transition-all cursor-pointer"
              >
                انصراف
              </button>

              <button
                type="submit"
                disabled={isSaving || !editText.trim()}
                className="px-5 py-2 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-bold shadow-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSaving ? 'در حال ذخیره در هاست...' : 'ثبت و ذخیره نامه امروز'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Password Modal to verify Hasan */}
        {showPassModal && (
          <div className="absolute inset-0 bg-black/92 backdrop-blur-md rounded-3xl p-6 flex flex-col items-center justify-center text-center z-20">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-3 border border-rose-500/30 shadow-inner">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">ورود به بخش ویرایش نامه (حسن)</h3>
            <p className="text-xs text-neutral-300 mb-4 max-w-xs leading-relaxed">
              جهت نوشتن یا ویرایش نامه روزانه نیوشا، لطفاً رمز عبور را وارد کنید:
            </p>

            <form onSubmit={handleVerifyPasscode} className="w-full max-w-xs space-y-3">
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="رمز عبور ۴ رقمی"
                className="w-full px-4 py-2.5 rounded-xl bg-black/70 border border-white/25 text-white text-center text-sm focus:outline-none focus:border-rose-500 tracking-widest font-mono"
                autoFocus
              />
              {passError && <p className="text-xs text-rose-400 font-bold">رمز عبور نادرست است</p>}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPassModal(false)}
                  className="flex-1 py-2 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-bold hover:bg-neutral-700 transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md transition-colors"
                >
                  ورود و نوشتن
                </button>
              </div>
            </form>
          </div>
        )}
      </motion.div>
    </div>
  );
};
