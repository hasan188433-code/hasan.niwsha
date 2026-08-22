import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Calendar as CalendarIcon,
  Heart,
  Activity,
  Sparkles,
  Droplet,
  ShieldAlert,
  Coffee,
  Smile,
  AlertCircle,
  HelpCircle,
  Clock,
  Send,
  Check,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Info,
  Thermometer,
  Zap,
  Bot,
  MessageSquare,
  Edit3,
  Globe,
} from 'lucide-react';
import { CycleLog, CyclePhase } from '../types/period';
import { calculateCycleStatus, PHASE_MEDICAL_DATA } from '../utils/periodCalculations';
import { toPersianDigits, formatToPersianShamsiDate } from '../utils/dateCalculations';
import { sendTelegramMessage } from '../utils/telegram';
import { PeriodAIChat } from './PeriodAIChat';
import { ShamsiDatePickerModal } from './ShamsiDatePickerModal';
import { subscribePeriodSettings, savePeriodSettingsRealtime } from '../services/realtimeSync';

interface PeriodCareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STORAGE_KEY_LAST_PERIOD = 'niosha_period_last_start';
const STORAGE_KEY_CYCLE_LEN = 'niosha_period_cycle_len';
const STORAGE_KEY_PERIOD_LEN = 'niosha_period_period_len';
const STORAGE_KEY_MOOD_LOGS = 'niosha_period_mood_logs';

const SYMPTOM_TAGS = [
  { id: 'cramps', label: 'دل‌درد و دل‌پیچه 😣', category: 'pain' },
  { id: 'backpain', label: 'کمردرد شدید 🩹', category: 'pain' },
  { id: 'headache', label: 'سردرد / میگرن 🤕', category: 'pain' },
  { id: 'bloating', label: 'نفخ و سنگینی شکم 🎈', category: 'body' },
  { id: 'breast_tenderness', label: 'حساسیت و تورم سینه‌ها 🌸', category: 'body' },
  { id: 'fatigue', label: 'خستگی و بی‌حالی 😴', category: 'energy' },
  { id: 'cravings', label: 'هوس شکلات و شیرینی 🍫', category: 'mood' },
  { id: 'sadness', label: 'بغض و حساسیت عاطفی 🥺', category: 'mood' },
  { id: 'anxiety', label: 'بی‌قراری و دلشوره 🫀', category: 'mood' },
  { id: 'acne', label: 'جوش هورمونی صورت ✨', category: 'skin' },
];

const CARE_COUPONS = [
  { id: '1', title: 'کوپن ماساژ مخصوص کمر و شانه 💆‍♀️', desc: 'بدون قید و شرط، توسط حسن در هر ساعتی', icon: '💆‍♀️' },
  { id: '2', title: 'کوپن شکلات، بستنی و دمنوش گرم ☕🍫', desc: 'سفارش یا آماده‌سازی خوراکی‌های مورد علاقه نیوشا', icon: '🍫' },
  { id: '3', title: 'کوپن معافیت از هرگونه توضیح و بحث 🕊️', desc: 'حق با نیوشاست، هرچی بگه همونه!', icon: '👑' },
  { id: '4', title: 'کوپن بغل طولانی و نوازش مو 🫂', desc: 'بغل محکم و آرامش‌بخش تا خوابت ببره', icon: '🧸' },
];

export const PeriodCareModal: React.FC<PeriodCareModalProps> = ({ isOpen, onClose }) => {
  // Cycle configuration state with sensible defaults
  const [startDateStr, setStartDateStr] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_LAST_PERIOD) || '2026-08-16';
  });
  const [cycleLength, setCycleLength] = useState<number>(() => {
    return Number(localStorage.getItem(STORAGE_KEY_CYCLE_LEN)) || 28;
  });
  const [periodLength, setPeriodLength] = useState<number>(() => {
    return Number(localStorage.getItem(STORAGE_KEY_PERIOD_LEN)) || 5;
  });

  const [isShamsiPickerOpen, setIsShamsiPickerOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncedRecently, setSyncedRecently] = useState(false);

  const [activeTab, setActiveTab] = useState<'status' | 'chat' | 'calendar' | 'medical' | 'symptoms' | 'coupons'>('status');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [painLevel, setPainLevel] = useState<number>(2);
  const [moodNote, setMoodNote] = useState<string>('');
  const [isSendingTelegram, setIsSendingTelegram] = useState(false);
  const [telegramSuccess, setTelegramSuccess] = useState(false);
  const [selectedCouponUsed, setSelectedCouponUsed] = useState<string | null>(null);

  // Real-time Firestore synchronization for period settings
  useEffect(() => {
    const unsub = subscribePeriodSettings((data) => {
      if (data) {
        if (data.lastPeriodDate) {
          setStartDateStr(data.lastPeriodDate);
          localStorage.setItem(STORAGE_KEY_LAST_PERIOD, data.lastPeriodDate);
        }
        if (typeof data.cycleLength === 'number') {
          setCycleLength(data.cycleLength);
          localStorage.setItem(STORAGE_KEY_CYCLE_LEN, data.cycleLength.toString());
        }
        if (typeof data.periodLength === 'number') {
          setPeriodLength(data.periodLength);
          localStorage.setItem(STORAGE_KEY_PERIOD_LEN, data.periodLength.toString());
        }
      }
    });

    return () => {
      unsub();
    };
  }, []);

  // Sync to Firestore and server
  const persistSettingsToServer = async (newDate: string, newCycle: number, newPeriod: number) => {
    setIsSyncing(true);
    try {
      localStorage.setItem(STORAGE_KEY_LAST_PERIOD, newDate);
      localStorage.setItem(STORAGE_KEY_CYCLE_LEN, newCycle.toString());
      localStorage.setItem(STORAGE_KEY_PERIOD_LEN, newPeriod.toString());

      await savePeriodSettingsRealtime({
        lastPeriodDate: newDate,
        cycleLength: newCycle,
        periodLength: newPeriod,
      });

      setSyncedRecently(true);
      setTimeout(() => setSyncedRecently(false), 3000);
    } catch (err) {
      console.error('Failed to sync period settings:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateStartDate = (newDateStr: string) => {
    setStartDateStr(newDateStr);
    persistSettingsToServer(newDateStr, cycleLength, periodLength);
  };

  const handleUpdateCycleLength = (newCycle: number) => {
    setCycleLength(newCycle);
    persistSettingsToServer(startDateStr, newCycle, periodLength);
  };

  const handleUpdatePeriodLength = (newPeriod: number) => {
    setPeriodLength(newPeriod);
    persistSettingsToServer(startDateStr, cycleLength, newPeriod);
  };

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isShamsiPickerOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isShamsiPickerOpen, onClose]);

  if (!isOpen) return null;

  const cycleStatus = calculateCycleStatus(startDateStr, cycleLength, periodLength);
  const { currentDayInCycle, currentPhase, phaseInfo, daysUntilNextPeriod, isPeriodToday } = cycleStatus;

  const toggleSymptom = (id: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSendStatusToHasan = async () => {
    setIsSendingTelegram(true);
    setTelegramSuccess(false);

    const symptomLabels = selectedSymptoms
      .map((id) => SYMPTOM_TAGS.find((t) => t.id === id)?.label)
      .filter(Boolean)
      .join('\n• ');

    const message = `🌸 گزارش وضعیت چرخه نیوشا:\n\n` +
      `📅 فاز فعلی: ${phaseInfo.title}\n` +
      `⏳ روز ${toPersianDigits(currentDayInCycle)} از چرخه (روزهای تا پریود بعدی: ${toPersianDigits(daysUntilNextPeriod)})\n` +
      `🩸 شدت درد/ناراحتی: ${painLevel}/5\n` +
      (symptomLabels ? `\nعلائم و حس و حال:\n• ${symptomLabels}\n` : '') +
      (moodNote ? `\nیادداشت نیوشا: "${moodNote}"\n` : '') +
      `\n💌 حسن جان، الان نیوشا به توجه، محبت و همراهی گرمت احتیاج داره! ❤️`;

    const result = await sendTelegramMessage(message);
    setIsSendingTelegram(false);
    if (result.success) {
      setTelegramSuccess(true);
      setTimeout(() => setTelegramSuccess(false), 4000);
    }
  };

  const handleRedeemCoupon = async (couponTitle: string) => {
    setSelectedCouponUsed(couponTitle);
    const message = `👑 نیوشا کوپن عشق را فعال کرد!\n\n` +
      `🎟️ کوپن: ${couponTitle}\n` +
      `❤️ حسن جان، سریعاً باید به وظیفه عاشقانه‌ات عمل کنی و هوای پرنسس‌ات رو داشته باشی! 🥰`;

    await sendTelegramMessage(message);
    setTimeout(() => setSelectedCouponUsed(null), 3500);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto cursor-pointer font-vazir"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[92dvh] overflow-y-auto bg-[#130712] border border-rose-800/60 rounded-3xl p-4 sm:p-6 shadow-2xl cursor-default my-auto text-white"
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 to-pink-500 flex items-center justify-center shadow-lg shadow-rose-900/40">
              <span className="text-xl">🌸</span>
            </div>
            <div className="text-right">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-1.5">
                <span>دستیار هوشمند و علمی سلامت نیوشا</span>
              </h2>
              <p className="text-[11px] sm:text-xs text-rose-300/80">
                پایش چرخه قاعدگی، هورمون‌ها و راهنمای مراقبت اختصاصی حسن
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800/80 transition-colors cursor-pointer"
            title="بستن"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between gap-1 mt-4 p-1 rounded-2xl bg-black/40 border border-white/10 overflow-x-auto text-xs scrollbar-none">
          <button
            onClick={() => setActiveTab('status')}
            className={`flex-1 py-2 px-2.5 rounded-xl font-medium transition-all whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'status'
                ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>وضعیت امروز</span>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-2 px-2.5 rounded-xl font-medium transition-all whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'chat'
                ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md'
                : 'text-rose-300 hover:text-white bg-rose-950/30'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>دستیار هوش مصنوعی 🌸</span>
          </button>

          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex-1 py-2 px-2.5 rounded-xl font-medium transition-all whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'calendar'
                ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>تقویم و فازها</span>
          </button>

          <button
            onClick={() => setActiveTab('medical')}
            className={`flex-1 py-2 px-2.5 rounded-xl font-medium transition-all whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'medical'
                ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>نکات پزشکی و تغذیه</span>
          </button>

          <button
            onClick={() => setActiveTab('symptoms')}
            className={`flex-1 py-2 px-2.5 rounded-xl font-medium transition-all whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'symptoms'
                ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Droplet className="w-3.5 h-3.5" />
            <span>ثبت احوال و علائم</span>
          </button>

          <button
            onClick={() => setActiveTab('coupons')}
            className={`flex-1 py-2 px-2.5 rounded-xl font-medium transition-all whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'coupons'
                ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>کوپن‌های حسن</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-4 space-y-4">
          {/* 1. STATUS TAB */}
          {activeTab === 'status' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Quick Shamsi Date Card / One-Tap Picker */}
              <div className="p-3.5 rounded-2xl bg-black/40 border border-rose-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-2.5 text-right w-full sm:w-auto">
                  <div className="p-2 rounded-xl bg-rose-950/80 border border-rose-700/50 text-rose-300">
                    <CalendarIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] text-neutral-400">تاریخ شروع آخرین پریود (خورشیدی):</div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5 mt-0.5">
                      <span className="text-rose-400">🌸</span>
                      <span>{formatToPersianShamsiDate(startDateStr)}</span>
                      <span className="text-[10px] text-neutral-400 font-normal">
                        ({toPersianDigits(cycleStatus.currentDayInCycle)} روز قبل)
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setIsShamsiPickerOpen(true)}
                  className="w-full sm:w-auto py-2 px-3.5 rounded-xl bg-gradient-to-r from-rose-950/80 to-pink-950/80 hover:from-rose-900 hover:to-pink-900 border border-rose-600/50 hover:border-rose-400 text-rose-200 hover:text-white text-xs font-bold transition-all shadow cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>تغییر با تقویم شمسی 📅</span>
                </button>
              </div>

              {/* AI Chat Quick Entry Banner */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-950/60 via-purple-950/40 to-pink-950/60 border border-rose-500/40 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-right w-full sm:w-auto">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center shrink-0 shadow-md">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>دستیار چت هوش مصنوعی سلامت نیوشا</span>
                      <span className="text-[10px] text-pink-300">🌸✨</span>
                    </div>
                    <div className="text-[11px] text-rose-200/80">
                      هر سوالی در مورد تسکین درد، دل‌درد، دمنوش و احوالت داری بپرس...
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('chat')}
                  className="w-full sm:w-auto py-1.5 px-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs shadow-md transition-all shrink-0 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>شروع چت با دستیار</span>
                </button>
              </div>
              {/* Current Phase Main Card */}
              <div className="relative rounded-2xl p-5 border border-rose-700/40 bg-gradient-to-br from-rose-950/40 via-purple-950/30 to-black/60 shadow-xl overflow-hidden">
                <div className="absolute top-0 left-0 w-32 h-32 bg-rose-600/10 rounded-full blur-2xl pointer-events-none" />
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{phaseInfo.icon}</span>
                    <div>
                      <div className="text-xs text-rose-300 font-semibold">{phaseInfo.subtitle}</div>
                      <h3 className="text-base sm:text-lg font-bold text-white mt-0.5">{phaseInfo.title}</h3>
                    </div>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-bold self-end sm:self-auto">
                    روز {toPersianDigits(currentDayInCycle)} از {toPersianDigits(cycleLength)} چرخه
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-neutral-200 mt-3 leading-relaxed text-justify">
                  {phaseInfo.description}
                </p>

                {/* Hormone & Biology Gauges */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/10 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-[10px] text-neutral-400 block mb-1">استروژن (Estrogen)</span>
                    <span className="font-bold text-rose-300 text-xs">
                      {phaseInfo.hormones.estrogen === 'low' && '🔻 سطح پایین'}
                      {phaseInfo.hormones.estrogen === 'rising' && '📈 در حال افزایش'}
                      {phaseInfo.hormones.estrogen === 'peak' && '🔥 در اوج'}
                      {phaseInfo.hormones.estrogen === 'dropping' && '📉 در حال افت'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-[10px] text-neutral-400 block mb-1">پروژسترون (Progesterone)</span>
                    <span className="font-bold text-purple-300 text-xs">
                      {phaseInfo.hormones.progesterone === 'low' && '🔻 سطح پایه'}
                      {phaseInfo.hormones.progesterone === 'rising' && '📈 در حال ترشح'}
                      {phaseInfo.hormones.progesterone === 'peak' && '🌕 غالب و در اوج'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-[10px] text-neutral-400 block mb-1">سطح انرژی و توان</span>
                    <span className="font-bold text-emerald-300 text-xs">
                      {phaseInfo.hormones.energyLevel === 'low' && '😴 نیاز به استراحت'}
                      {phaseInfo.hormones.energyLevel === 'rising' && '⚡ پرانرژی و شاداب'}
                      {phaseInfo.hormones.energyLevel === 'high' && '🌟 اوج درخشش و قدرت'}
                      {phaseInfo.hormones.energyLevel === 'declining' && '🛋️ آرامش‌طلب'}
                    </span>
                  </div>
                </div>

                {/* Days until next period pill */}
                <div className="mt-4 p-3 rounded-xl bg-rose-900/20 border border-rose-800/40 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-rose-200">
                    <Clock className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    <span>تخمین شروع دوره بعدی: <strong>{formatToPersianShamsiDate(cycleStatus.nextPeriodDate.toISOString().slice(0, 10))}</strong></span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-500/30 text-rose-100 font-bold text-[11px]">
                    {toPersianDigits(daysUntilNextPeriod)} روز مانده
                  </span>
                </div>
              </div>

              {/* Hasan Special Message for this phase */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-pink-950/40 to-rose-950/40 border border-pink-700/40 shadow-md">
                <div className="flex items-center gap-2 mb-2 text-pink-300 text-xs font-bold">
                  <Heart className="w-4 h-4 text-pink-500 fill-pink-500" />
                  <span>پیام و عهد ویژه حسن برای این روزهای نیوشا:</span>
                </div>
                <p className="text-xs sm:text-sm text-pink-100 leading-relaxed">
                  {phaseInfo.partnerCareAdvice}
                </p>
              </div>

              {/* Quick Action to Telegram */}
              <div className="text-center pt-1">
                <button
                  onClick={() => setActiveTab('symptoms')}
                  className="w-full py-3 rounded-full bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-rose-950/50 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>احوال امروزم رو به حسن بگو (ارسال وضعیت و علائم)</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* AI CHAT TAB */}
          {activeTab === 'chat' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <PeriodAIChat
                cycleStatus={cycleStatus}
                onOpenCoupons={() => setActiveTab('coupons')}
              />
            </motion.div>
          )}

          {/* 2. CALENDAR & PHASES TAB */}
          {activeTab === 'calendar' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Settings Form */}
              <div className="p-4 rounded-2xl bg-black/40 border border-rose-900/40 space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <h4 className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                    <CalendarIcon className="w-4 h-4" />
                    <span>تنظیم تاریخ و مشخصات چرخه نیوشا:</span>
                  </h4>
                  <div className="text-[10px] text-neutral-400 flex items-center gap-1">
                    <Globe className="w-3 h-3 text-rose-400" />
                    <span>ذخیره خودکار روی سرور برای همه دستگاه‌ها</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  {/* Interactive Shamsi Picker Trigger */}
                  <div>
                    <label className="block text-neutral-300 mb-1 font-medium">تاریخ شروع آخرین پریود:</label>
                    <button
                      type="button"
                      onClick={() => setIsShamsiPickerOpen(true)}
                      className="w-full bg-[#1c0919] hover:bg-[#280d24] border border-rose-700/60 hover:border-rose-400 rounded-xl px-3 py-2.5 text-white font-bold transition-all text-right flex items-center justify-between cursor-pointer shadow-sm"
                    >
                      <span className="text-rose-200">{formatToPersianShamsiDate(startDateStr)}</span>
                      <CalendarIcon className="w-4 h-4 text-rose-400" />
                    </button>
                    <span className="text-[10px] text-neutral-400 mt-1 block">لمس کنید تا تقویم شمسی باز شود</span>
                  </div>

                  <div>
                    <label className="block text-neutral-300 mb-1 font-medium">طول کل چرخه (روز):</label>
                    <input
                      type="number"
                      min={20}
                      max={45}
                      value={cycleLength}
                      onChange={(e) => handleUpdateCycleLength(Number(e.target.value))}
                      className="w-full bg-[#1c0919] border border-rose-900/60 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500 font-bold"
                    />
                    <span className="text-[10px] text-neutral-400 mt-1 block">معمولاً بین ۲۶ تا ۳۲ روز</span>
                  </div>

                  <div>
                    <label className="block text-neutral-300 mb-1 font-medium">طول دوران خونریزی (روز):</label>
                    <input
                      type="number"
                      min={3}
                      max={10}
                      value={periodLength}
                      onChange={(e) => handleUpdatePeriodLength(Number(e.target.value))}
                      className="w-full bg-[#1c0919] border border-rose-900/60 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500 font-bold"
                    />
                    <span className="text-[10px] text-neutral-400 mt-1 block">معمولاً بین ۴ تا ۷ روز</span>
                  </div>
                </div>
              </div>

              {/* All 4 Phases Detailed Roadmap */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-neutral-300">راهنمای ۴ فاز زیستی چرخه بانوان:</h4>
                
                {(['menstrual', 'follicular', 'ovulation', 'luteal'] as CyclePhase[]).map((pKey) => {
                  const pData = PHASE_MEDICAL_DATA[pKey];
                  const isCurrent = currentPhase === pKey;
                  return (
                    <div
                      key={pKey}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isCurrent
                          ? 'border-rose-500 bg-rose-950/40 shadow-md ring-1 ring-rose-500/50'
                          : 'border-white/10 bg-black/30'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold">
                        <div className="flex items-center gap-2">
                          <span>{pData.icon}</span>
                          <span className={isCurrent ? 'text-rose-300' : 'text-white'}>{pData.title}</span>
                        </div>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px]">
                            فاز فعال فعلی
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-300 mt-1 leading-relaxed">
                        {pData.subtitle} • {pData.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* 3. MEDICAL & NUTRITION TAB */}
          {activeTab === 'medical' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Evidence-based Medical Relief */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-950/30 to-purple-950/30 border border-rose-800/40 space-y-3">
                <h4 className="text-xs sm:text-sm font-bold text-rose-300 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span>تسکین علمی دردهای قاعدگی و گرفتگی عضلات:</span>
                </h4>
                <ul className="space-y-2 text-xs text-neutral-200">
                  {phaseInfo.medicalTips.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-2 leading-relaxed">
                      <span className="text-rose-400 mt-0.5">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Nutrition & Herbal recommendations */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/30 to-black/40 border border-emerald-800/40 space-y-3">
                <h4 className="text-xs sm:text-sm font-bold text-emerald-300 flex items-center gap-2">
                  <Coffee className="w-4 h-4 text-emerald-400" />
                  <span>تغذیه مناسب و دمنوش‌های توصیه‌شده برای این فاز:</span>
                </h4>
                <ul className="space-y-2 text-xs text-neutral-200">
                  {phaseInfo.nutritionTips.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-2 leading-relaxed">
                      <span className="text-emerald-400 mt-0.5">🌱</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Self-care & Mental tips */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2.5">
                <h4 className="text-xs font-bold text-purple-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>مراقبت فردی و بهداشت روان:</span>
                </h4>
                <ul className="space-y-1.5 text-xs text-neutral-300">
                  {phaseInfo.careTips.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-purple-400">✨</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}

          {/* 4. SYMPTOMS & MOOD LOG TAB */}
          {activeTab === 'symptoms' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-rose-300 mb-2">
                  علائم بدنی و حسی امروزت چیه؟ (انتخاب کن تا حسن بدونه چطور کمکت کنه):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SYMPTOM_TAGS.map((sym) => {
                    const isSelected = selectedSymptoms.includes(sym.id);
                    return (
                      <button
                        key={sym.id}
                        type="button"
                        onClick={() => toggleSymptom(sym.id)}
                        className={`p-2.5 rounded-xl border text-xs text-right transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-rose-600/30 border-rose-500 text-white font-bold shadow-md'
                            : 'bg-black/30 border-white/10 text-neutral-300 hover:border-white/30'
                        }`}
                      >
                        <span>{sym.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-rose-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Pain Scale Slider */}
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/10">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-bold text-neutral-200">میزان درد و دل‌پیچه امروز:</span>
                  <span className="text-rose-400 font-bold">
                    {painLevel === 0 && 'بدون درد (خوبم 🌸)'}
                    {painLevel === 1 && 'خیلی خفیف (۱ از ۵)'}
                    {painLevel === 2 && 'متوسط و قابل تحمل (۲ از ۵)'}
                    {painLevel === 3 && 'کمی زیاد و کلافه‌کننده (۳ از ۵)'}
                    {painLevel === 4 && 'شدید، نیاز به استراحت (۴ از ۵)'}
                    {painLevel === 5 && 'خیلی شدید، طاقت‌فرسا 😭 (۵ از ۵)'}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  value={painLevel}
                  onChange={(e) => setPainLevel(Number(e.target.value))}
                  className="w-full accent-rose-500 cursor-pointer"
                />
              </div>

              {/* Personal Note */}
              <div>
                <label className="block text-xs text-neutral-300 mb-1.5 font-medium">
                  پیام دلخواه برای حسن (مثلاً: دلم چی می‌خواد یا چه حسی دارم):
                </label>
                <textarea
                  rows={3}
                  value={moodNote}
                  onChange={(e) => setMoodNote(e.target.value)}
                  placeholder="حسن جونم، الان دلم می‌خواد..."
                  className="w-full bg-[#1c0919] border border-neutral-700 focus:border-rose-500 rounded-xl p-3 text-xs text-white placeholder-neutral-500 focus:outline-none resize-none transition-colors"
                />
              </div>

              {/* Submit to Telegram */}
              <div>
                <button
                  onClick={handleSendStatusToHasan}
                  disabled={isSendingTelegram}
                  className="w-full py-3 rounded-full bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs sm:text-sm shadow-xl transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSendingTelegram ? 'در حال ارسال به ربات... 🤖' : 'ارسال مستقیم وضعیت با ربات 🤖💬✨'}</span>
                </button>

                {telegramSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-600/60 text-emerald-200 text-xs text-center font-bold flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>پیام وضعیت با موفقیت به تلگرام حسن فرستاده شد! الان هواتو داره 🌸</span>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* 5. COUPONS TAB */}
          {activeTab === 'coupons' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className="text-xs text-rose-300/90 mb-2 text-justify">
                نیوشای عزیزم، در روزهای سخت و حساس ماه، این کوپن‌ها همیشه برای تو معتبرند. هر کدوم رو که بزنی، سریعاً به حسن خبر داده میشه تا اطاعت کنه! 👑❤️
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CARE_COUPONS.map((coupon) => (
                  <div
                    key={coupon.id}
                    className="p-4 rounded-2xl border border-rose-800/40 bg-gradient-to-br from-rose-950/30 to-purple-950/20 shadow-md flex flex-col justify-between"
                  >
                    <div>
                      <div className="text-2xl mb-1.5">{coupon.icon}</div>
                      <h4 className="text-xs sm:text-sm font-bold text-white mb-1">{coupon.title}</h4>
                      <p className="text-[11px] text-neutral-300">{coupon.desc}</p>
                    </div>

                    <button
                      onClick={() => handleRedeemCoupon(coupon.title)}
                      className="mt-3 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>فعال‌کردن این کوپن</span>
                    </button>
                  </div>
                ))}
              </div>

              {selectedCouponUsed && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-xl bg-pink-950/80 border border-pink-500 text-pink-200 text-xs text-center font-bold"
                >
                  🎉 «{selectedCouponUsed}» فعال شد و به تلگرام حسن پیام رفت!
                </motion.div>
              )}
            </motion.div>
          )}
        </div>

        {/* Interactive Shamsi Date Picker Modal */}
        <ShamsiDatePickerModal
          isOpen={isShamsiPickerOpen}
          onClose={() => setIsShamsiPickerOpen(false)}
          selectedDateStr={startDateStr}
          onSelectDate={handleUpdateStartDate}
        />
      </motion.div>
    </div>
  );
};
