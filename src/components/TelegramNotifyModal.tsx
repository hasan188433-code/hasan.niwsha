import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Send, Sparkles, X, CheckCircle2, MessageCircle, AlertCircle } from 'lucide-react';
import { sendTelegramAlertToHasan } from '../utils/telegram';
import { useTheme } from '../context/ThemeContext';

interface TelegramNotifyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TelegramNotifyModal: React.FC<TelegramNotifyModalProps> = ({ isOpen, onClose }) => {
  const { theme } = useTheme();
  const [customNote, setCustomNote] = useState('');
  const [targetUser, setTargetUser] = useState<'hasan' | 'niosha'>('hasan');
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSend = async () => {
    setIsSending(true);
    setErrorMessage(null);

    const result = await sendTelegramAlertToHasan(customNote, targetUser);
    setIsSending(false);

    if (result.success) {
      setSentSuccess(true);
    } else {
      setErrorMessage(result.error || 'ارسال پیام با مشکل مواجه شد.');
    }
  };

  const handleResetAndClose = () => {
    setSentSuccess(false);
    setErrorMessage(null);
    setCustomNote('');
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleResetAndClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          style={{
            backgroundColor: theme.cardBg,
            borderColor: theme.cardBorder,
          }}
          className="relative w-full max-w-lg max-h-[92dvh] overflow-y-auto rounded-3xl border p-5 sm:p-8 shadow-2xl z-10 text-right font-vazir my-auto"
        >
          {/* Ambient Glow */}
          <div
            className="absolute -top-20 -right-20 w-60 h-60 rounded-full blur-3xl pointer-events-none opacity-20"
            style={{ backgroundColor: theme.primaryColor }}
          />

          {/* Close button */}
          <button
            onClick={handleResetAndClose}
            className="absolute top-5 left-5 p-2 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {!sentSuccess ? (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg"
                  style={{
                    backgroundColor: theme.primaryColor,
                    boxShadow: `0 0 20px ${theme.primaryColor}40`,
                  }}
                >
                  <Heart className="w-6 h-6 fill-white animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">
                    پیام با ربات 🤖💬✨
                  </h3>
                  <p className="text-xs text-neutral-300">
                    ارسال مستقیم پیام به تلگرام حسن یا نیوشا
                  </p>
                </div>
              </div>

              {/* Recipient Selection Toggle */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-black/40 border border-white/10 rounded-2xl mb-4 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setTargetUser('hasan')}
                  className={`py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    targetUser === 'hasan'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <span>ارسال به حسن 👨‍💼</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTargetUser('niosha')}
                  className={`py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    targetUser === 'niosha'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <span>ارسال به نیوشا 👩‍🦰</span>
                </button>
              </div>

              {/* Romantic 2-Line Header Text as Requested */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-950/60 via-purple-950/40 to-pink-950/60 border border-rose-500/30 mb-5 text-xs sm:text-sm text-pink-100 leading-relaxed text-center font-medium shadow-md">
                «عشق و همدلی یعنی هیچ فاصله‌ای بینمون نیست... هر وقت دلت گرفت یا نیاز به همراهی داشتی، فقط یک لمس تا آغوش و حضور من فاصله داری 💕✨»
              </div>

              {/* Optional Custom Note */}
              <div className="space-y-2 mb-5">
                <label className="block text-xs font-semibold text-neutral-300">
                  {targetUser === 'hasan' ? 'پیام برای تلگرام حسن:' : 'پیام برای تلگرام نیوشا:'}
                </label>
                <textarea
                  rows={3}
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder={targetUser === 'hasan' ? 'مثلاً: دلم گرفته، دوست دارم صداتو بشنوم...' : 'مثلاً: سلام نیوشای قشنگم، دوستت دارم...'}
                  className="w-full bg-black/40 border border-white/15 rounded-2xl p-3.5 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-rose-400 transition-colors resize-none"
                />
              </div>

              {/* Error warning if any */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2 mb-4">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  disabled={isSending}
                  onClick={handleSend}
                  className={`flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r ${theme.buttonGradient} text-white font-bold text-sm shadow-lg hover:shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isSending ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin" />
                      <span>{targetUser === 'hasan' ? 'در حال ارسال پیام به تلگرام حسن...' : 'در حال ارسال پیام به تلگرام نیوشا...'}</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>{targetUser === 'hasan' ? 'ارسال فوری پیام به تلگرام حسن 💌' : 'ارسال فوری پیام به تلگرام نیوشا 💌'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="py-3 px-4 rounded-2xl bg-white/10 text-neutral-300 hover:bg-white/15 text-xs font-medium transition-colors cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </>
          ) : (
            /* Success State */
            <div className="py-6 flex flex-col items-center text-center space-y-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 12 }}
                className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.4)]"
              >
                <CheckCircle2 className="w-10 h-10" />
              </motion.div>

              <h3 className="text-xl font-bold text-white">
                {targetUser === 'hasan' ? 'پیام به تلگرام حسن ارسال شد! ❤️' : 'پیام به تلگرام نیوشا ارسال شد! ❤️'}
              </h3>

              <p className="text-sm text-neutral-200 leading-relaxed max-w-md">
                {targetUser === 'hasan'
                  ? 'الان روی گوشی حسن اعلان رفت. هر کجای دنیا که باشه تمام فکر و قلبش پیش توئه و به زودی بهت پیام میده یا باهات تماس می‌گیره.'
                  : 'الان روی گوشی نیوشا اعلان رفت. پیام با عشق برات فرستاده شد و به زودی با لبخند پیامتو می‌بینه 💕'}
              </p>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-rose-300/90 leading-relaxed">
                «هیچ چیزی توی این دنیا ارزش ناراحتی شما رو نداره، همیشه کنار هم باشید... ✨»
              </div>

              <div className="pt-2 w-full flex gap-3">
                <button
                  onClick={handleResetAndClose}
                  className={`w-full py-3 rounded-2xl bg-gradient-to-r ${theme.buttonGradient} text-white text-xs font-bold shadow-lg transition-all cursor-pointer`}
                >
                  متشکرم، حالم بهتر میشه ✨
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
