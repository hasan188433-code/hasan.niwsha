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
  Pill,
  Apple,
  FileText,
  Flame,
} from 'lucide-react';
import { CycleLog, CyclePhase } from '../types/period';
import { calculateCycleStatus, PHASE_MEDICAL_DATA, CLINICAL_ANALGESICS } from '../utils/periodCalculations';
import { toPersianDigits, formatToPersianShamsiDate } from '../utils/dateCalculations';
import { sendTelegramMessage } from '../utils/telegram';
import { PeriodAIChat } from './PeriodAIChat';
import { ShamsiDatePickerModal } from './ShamsiDatePickerModal';
import { subscribePeriodSettings, savePeriodSettingsRealtime, subscribeCareLogs, addCareLogRealtime, CareLogItem } from '../services/realtimeSync';
import { useTheme } from '../context/ThemeContext';
import { ThemeSelector } from './ThemeSelector';

interface PeriodCareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STORAGE_KEY_LAST_PERIOD = 'niosha_period_last_start';
const STORAGE_KEY_CYCLE_LEN = 'niosha_period_cycle_len';
const STORAGE_KEY_PERIOD_LEN = 'niosha_period_period_len';

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

const FLOW_LEVELS = [
  { id: 'spotting', label: 'لکه‌بینی خفیف 💧' },
  { id: 'light', label: 'خونریزی سبک 🩸' },
  { id: 'medium', label: 'متوسط و نرمال 🩸🩸' },
  { id: 'heavy', label: 'شدید و پرفشار 🩸🩸🩸' },
];

const INITIAL_CARE_COUPONS = [
  { id: '1', title: 'کوپن ماساژ مخصوص کمر و شانه 💆‍♀️', desc: 'بدون قید و شرط، توسط حسن در هر ساعتی', icon: '💆‍♀️' },
  { id: '2', title: 'کوپن شکلات، بستنی و دمنوش گرم ☕🍫', desc: 'سفارش یا آماده‌سازی خوراکی‌های مورد علاقه نیوشا', icon: '🍫' },
  { id: '3', title: 'کوپن معافیت از هرگونه توضیح و بحث 🕊️', desc: 'حق با نیوشاست، هرچی بگه همونه!', icon: '👑' },
  { id: '4', title: 'کوپن بغل طولانی و نوازش مو 🫂', desc: 'بغل محکم و آرامش‌بخش تا خوابت ببره', icon: '🧸' },
  { id: '5', title: 'کوپن عشق‌بازی و شیطنت دونفره 🔥💋', desc: 'هر موقع نیوشا اراده کنه، حسن با تمام وجود در خدمته!', icon: '💋' },
];

export const PeriodCareModal: React.FC<PeriodCareModalProps> = ({ isOpen, onClose }) => {
  const { theme } = useTheme();

  // User Role Switcher: 'niosha' vs 'hasan'
  const [userRole, setUserRole] = useState<'niosha' | 'hasan'>('niosha');

  // Care Logs Real-time State
  const [careLogs, setCareLogs] = useState<CareLogItem[]>([]);
  const [careLogNotice, setCareLogNotice] = useState<string | null>(null);

  // Custom Coupons created by Hasan
  const [couponsList, setCouponsList] = useState(() => {
    const saved = localStorage.getItem('niosha_custom_coupons');
    if (saved) {
      try { return [...INITIAL_CARE_COUPONS, ...JSON.parse(saved)]; } catch {}
    }
    return INITIAL_CARE_COUPONS;
  });
  const [newCouponTitle, setNewCouponTitle] = useState('');
  const [newCouponDesc, setNewCouponDesc] = useState('');
  const [newCouponIcon, setNewCouponIcon] = useState('🎁');
  const [couponAddedNotice, setCouponAddedNotice] = useState(false);

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

  const [activeTab, setActiveTab] = useState<'status' | 'chat' | 'hasan_hub' | 'analgesic' | 'calendar' | 'nutrition' | 'symptoms' | 'coupons'>('status');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [selectedFlow, setSelectedFlow] = useState<string>('medium');
  const [painLevel, setPainLevel] = useState<number>(2);
  const [moodNote, setMoodNote] = useState<string>('');
  const [isSendingTelegram, setIsSendingTelegram] = useState(false);
  const [telegramSuccess, setTelegramSuccess] = useState(false);
  const [selectedCouponUsed, setSelectedCouponUsed] = useState<string | null>(null);

  // Hasan's quick custom telegram message input
  const [hasanCustomMessage, setHasanCustomMessage] = useState('');
  const [hasanMessageSuccess, setHasanMessageSuccess] = useState(false);

  // Real-time Firestore synchronization for period settings & care logs
  useEffect(() => {
    if (activeTab === 'hasan_hub') {
      setUserRole('hasan');
    } else {
      setUserRole('niosha');
    }
  }, [activeTab]);

  useEffect(() => {
    const unsubSettings = subscribePeriodSettings((data) => {
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

    const unsubLogs = subscribeCareLogs((logs) => {
      setCareLogs(logs);
    });

    return () => {
      unsubSettings();
      unsubLogs();
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

    const flowLabel = FLOW_LEVELS.find((f) => f.id === selectedFlow)?.label || 'متوسط';

    const message = `🌸 **گزارش جامع وضعیت سلامت نیوشا:**\n\n` +
      `📅 فاز فعلی: ${phaseInfo.title}\n` +
      `⏳ روز ${toPersianDigits(currentDayInCycle)} از چرخه (روزهای مانده تا پریود بعدی: ${toPersianDigits(daysUntilNextPeriod)})\n` +
      `🩸 شدت خونریزی: ${flowLabel}\n` +
      `😣 شدت درد/اسپاسم: ${painLevel} از ۵\n` +
      (symptomLabels ? `\nعلائم و احساسات ثبت‌شده:\n• ${symptomLabels}\n` : '') +
      (moodNote ? `\n💬 یادداشت صمیمانه نیوشا: "${moodNote}"\n` : '') +
      `\n💌 حسن جان، الان وقتشه که با تمام وجود حواست به پرنسست باشه و لوسش کنی! ❤️`;

    const result = await sendTelegramMessage(message);
    setIsSendingTelegram(false);
    if (result.success) {
      setTelegramSuccess(true);
      setTimeout(() => setTelegramSuccess(false), 4000);
    }
  };

  const handleRedeemCoupon = async (couponTitle: string) => {
    setSelectedCouponUsed(couponTitle);
    const message = `👑 **نیوشا کوپن عشق را فعال کرد!**\n\n` +
      `🎟️ عنوان کوپن: ${couponTitle}\n\n` +
      `❤️ حسن جان، سریعاً باید به وظیفه عاشقانه‌ات عمل کنی و هوای پرنسس‌ات رو داشته باشی! 🥰`;

    await sendTelegramMessage(message);
    setTimeout(() => setSelectedCouponUsed(null), 3500);
  };

  const handleLogHasanCareAction = async (action: string, icon: string) => {
    setCareLogNotice(`اقدام "${action}" ثبت شد ❤️`);
    await addCareLogRealtime(action, icon, 'hasan');
    setTimeout(() => setCareLogNotice(null), 3000);
  };

  const handleAddCustomCoupon = () => {
    if (!newCouponTitle.trim()) return;
    const newCoupon = {
      id: `custom-${Date.now()}`,
      title: newCouponTitle.trim(),
      desc: newCouponDesc.trim() || 'کوپن سفارشی ویژه نیوشا از طرف حسن',
      icon: newCouponIcon || '🎁',
    };
    const updated = [...couponsList, newCoupon];
    setCouponsList(updated);
    const customOnly = updated.filter(c => c.id.startsWith('custom-'));
    localStorage.setItem('niosha_custom_coupons', JSON.stringify(customOnly));
    setNewCouponTitle('');
    setNewCouponDesc('');
    setCouponAddedNotice(true);
    setTimeout(() => setCouponAddedNotice(false), 3000);
  };

  const handleSendHasanCustomTelegram = async () => {
    if (!hasanCustomMessage.trim()) return;
    setIsSendingTelegram(true);
    const msg = `👑 **پیام مستقیم حسن برای نیوشا:**\n\n` +
      `"${hasanCustomMessage.trim()}"\n\n` +
      `💖 حسن کنارته و هواتو داره!`;
    const res = await sendTelegramMessage(msg);
    setIsSendingTelegram(false);
    if (res.success) {
      setHasanMessageSuccess(true);
      setHasanCustomMessage('');
      setTimeout(() => setHasanMessageSuccess(false), 3000);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto cursor-pointer font-vazir"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: theme.cardBg,
          borderColor: theme.cardBorder,
        }}
        className="relative w-full max-w-2xl max-h-[92dvh] overflow-y-auto border rounded-3xl p-3.5 sm:p-5 shadow-2xl cursor-default my-auto text-white"
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div
              style={{ backgroundColor: theme.primaryColor }}
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg text-white"
            >
              <span className="text-xl">{userRole === 'hasan' ? '🛡️' : '🌸'}</span>
            </div>
            <div className="text-right">
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                <span>{userRole === 'hasan' ? 'پانل مراقبت، مدیریت و اختیارات حسن 👑' : 'کلینیک تخصصی و پایش سلامت نیوشا'}</span>
              </h2>
              <p className="text-[10px] sm:text-xs" style={{ color: theme.accentColor }}>
                {userRole === 'hasan' 
                  ? 'اختیارات لوکال، ثبت اقدامات مراقبتی، چت با جمینای و تنظیمات سیستم'
                  : 'راهنمای پزشکی، دارویی، تغذیه فازمحور و همراهی هوشمند حسن'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeSelector compact />
            <button
              onClick={onClose}
              className="p-2 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800/80 transition-colors cursor-pointer"
              title="بستن"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between gap-1 mt-3 p-1 rounded-2xl bg-black/40 border border-white/10 overflow-x-auto text-xs scrollbar-none">
          <button
            onClick={() => setActiveTab('status')}
            style={activeTab === 'status' ? { backgroundColor: theme.primaryColor } : {}}
            className={`py-2 px-2.5 rounded-xl font-medium transition-all whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'status'
                ? 'text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>وضعیت امروز</span>
          </button>

          <button
            onClick={() => setActiveTab('hasan_hub')}
            className={`py-2 px-2.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'hasan_hub'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-amber-400 hover:text-white bg-amber-950/30 border border-amber-800/40'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-300" />
            <span>پانل حسن 👑</span>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            style={
              activeTab === 'chat'
                ? { backgroundColor: theme.primaryColor }
                : { backgroundColor: theme.pillBg, color: theme.accentColor }
            }
            className={`py-2 px-2.5 rounded-xl font-medium transition-all whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'chat'
                ? 'text-white shadow-md'
                : 'hover:text-white'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>دستیار جمینای</span>
          </button>

          <button
            onClick={() => setActiveTab('analgesic')}
            style={activeTab === 'analgesic' ? { backgroundColor: theme.primaryColor } : {}}
            className={`py-2 px-2.5 rounded-xl font-medium transition-all whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'analgesic'
                ? 'text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Pill className="w-3.5 h-3.5" />
            <span>دارو و مسکن 💊</span>
          </button>

          <button
            onClick={() => setActiveTab('calendar')}
            style={activeTab === 'calendar' ? { backgroundColor: theme.primaryColor } : {}}
            className={`py-2 px-2.5 rounded-xl font-medium transition-all whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'calendar'
                ? 'text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>تقویم و ۴ فاز</span>
          </button>

          <button
            onClick={() => setActiveTab('nutrition')}
            style={activeTab === 'nutrition' ? { backgroundColor: theme.primaryColor } : {}}
            className={`py-2 px-2.5 rounded-xl font-medium transition-all whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'nutrition'
                ? 'text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Apple className="w-3.5 h-3.5" />
            <span>تغذیه</span>
          </button>

          <button
            onClick={() => setActiveTab('coupons')}
            style={activeTab === 'coupons' ? { backgroundColor: theme.primaryColor } : {}}
            className={`py-2 px-2.5 rounded-xl font-medium transition-all whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'coupons'
                ? 'text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>کوپن‌ها</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-4 space-y-4">
          {/* 1. STATUS TAB */}
          {activeTab === 'status' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3.5"
            >
              {/* Quick Shamsi Date Card / One-Tap Picker */}
              <div
                style={{ backgroundColor: theme.pillBg, borderColor: theme.cardBorder }}
                className="p-3 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md"
              >
                <div className="flex items-center gap-2.5 text-right w-full sm:w-auto">
                  <div
                    style={{ backgroundColor: theme.cardBg, borderColor: theme.pillBorder, color: theme.accentColor }}
                    className="p-2 rounded-xl border"
                  >
                    <CalendarIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] text-neutral-400">تاریخ شروع آخرین پریود (خورشیدی):</div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5 mt-0.5">
                      <span>🌸</span>
                      <span>{formatToPersianShamsiDate(startDateStr)}</span>
                      <span className="text-[10px] text-neutral-400 font-normal">
                        ({toPersianDigits(cycleStatus.currentDayInCycle)} روز قبل)
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setIsShamsiPickerOpen(true)}
                  style={{ backgroundColor: theme.pillBg, borderColor: theme.pillBorder }}
                  className="w-full sm:w-auto py-1.5 px-3 rounded-xl hover:brightness-125 border text-neutral-200 hover:text-white text-xs font-bold transition-all shadow cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>تغییر با تقویم شمسی 📅</span>
                </button>
              </div>

              {/* AI Chat Quick Entry Banner */}
              <div
                style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}
                className="p-3 rounded-2xl border shadow-lg flex flex-col sm:flex-row items-center justify-between gap-2.5"
              >
                <div className="flex items-center gap-2.5 text-right w-full sm:w-auto">
                  <div
                    style={{ backgroundColor: theme.primaryColor }}
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-md text-white"
                  >
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>دستیار چت صمیمی و پزشکی نیوشا</span>
                      <span>🌸✨</span>
                    </div>
                    <div className="text-[10px] text-neutral-300">
                      هر درخواستی، تسکین درد، یا پیامی که می‌خوای صریح به حسن بفرستی بگو...
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('chat')}
                  style={{ backgroundColor: theme.primaryColor }}
                  className="w-full sm:w-auto py-1.5 px-3 rounded-xl hover:brightness-110 text-white font-bold text-xs shadow-md transition-all shrink-0 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>شروع چت با جمینای</span>
                </button>
              </div>

              {/* Current Phase Main Card */}
              <div
                style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}
                className="relative rounded-2xl p-4 sm:p-5 border shadow-xl overflow-hidden"
              >
                <div
                  className="absolute top-0 left-0 w-32 h-32 rounded-full blur-2xl pointer-events-none opacity-20"
                  style={{ backgroundColor: theme.primaryColor }}
                />
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl sm:text-3xl">{phaseInfo.icon}</span>
                    <div>
                      <div className="text-[11px] font-semibold" style={{ color: theme.accentColor }}>{phaseInfo.subtitle}</div>
                      <h3 className="text-sm sm:text-base font-bold text-white mt-0.5">{phaseInfo.title}</h3>
                    </div>
                  </div>
                  <div
                    style={{ backgroundColor: theme.pillBg, borderColor: theme.pillBorder, color: theme.accentColor }}
                    className="px-2.5 py-1 rounded-full border text-[11px] font-bold self-end sm:self-auto"
                  >
                    روز {toPersianDigits(currentDayInCycle)} از {toPersianDigits(cycleLength)} چرخه
                  </div>
                </div>

                <p className="text-xs text-neutral-200 mt-2.5 leading-relaxed text-justify">
                  {phaseInfo.description}
                </p>

                {/* Hormone & Biology Gauges */}
                <div className="grid grid-cols-3 gap-2 mt-3.5 pt-3 border-t border-white/10 text-center text-xs">
                  <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-[10px] text-neutral-400 block mb-0.5">استروژن (Estrogen)</span>
                    <span className="font-bold text-[11px]" style={{ color: theme.accentColor }}>
                      {phaseInfo.hormones.estrogen === 'low' && '🔻 سطح پایه'}
                      {phaseInfo.hormones.estrogen === 'rising' && '📈 در حال افزایش'}
                      {phaseInfo.hormones.estrogen === 'peak' && '🔥 در اوج درخشش'}
                      {phaseInfo.hormones.estrogen === 'dropping' && '📉 در حال افت'}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-[10px] text-neutral-400 block mb-0.5">پروژسترون (Progesterone)</span>
                    <span className="font-bold text-[11px]" style={{ color: theme.accentColor }}>
                      {phaseInfo.hormones.progesterone === 'low' && '🔻 سطح پایه'}
                      {phaseInfo.hormones.progesterone === 'rising' && '📈 در حال ترشح'}
                      {phaseInfo.hormones.progesterone === 'peak' && '🌕 غالب و در اوج'}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-[10px] text-neutral-400 block mb-0.5">سطح انرژی و توان</span>
                    <span className="font-bold text-emerald-300 text-[11px]">
                      {phaseInfo.hormones.energyLevel === 'low' && '😴 نیاز به آرامش'}
                      {phaseInfo.hormones.energyLevel === 'rising' && '⚡ پرانرژی و شاداب'}
                      {phaseInfo.hormones.energyLevel === 'high' && '🌟 اوج جذابیت'}
                      {phaseInfo.hormones.energyLevel === 'declining' && '🛋️ آرامش‌طلب'}
                    </span>
                  </div>
                </div>

                {/* Days until next period pill */}
                <div
                  style={{ backgroundColor: theme.pillBg, borderColor: theme.pillBorder }}
                  className="mt-3.5 p-2.5 rounded-xl border flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2 text-neutral-200">
                    <Clock className="w-4 h-4 flex-shrink-0" style={{ color: theme.accentColor }} />
                    <span>تخمین شروع دوره بعدی: <strong>{formatToPersianShamsiDate(cycleStatus.nextPeriodDate.toISOString().slice(0, 10))}</strong></span>
                  </div>
                  <span
                    style={{ backgroundColor: theme.primaryColor }}
                    className="px-2 py-0.5 rounded-full text-white font-bold text-[10px]"
                  >
                    {toPersianDigits(daysUntilNextPeriod)} روز مانده
                  </span>
                </div>
              </div>

              {/* Hasan Special Message for this phase */}
              <div
                style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}
                className="p-3.5 rounded-2xl border shadow-md"
              >
                <div className="flex items-center gap-2 mb-1.5 text-xs font-bold" style={{ color: theme.accentColor }}>
                  <Heart className="w-4 h-4 fill-current" />
                  <span>راهنمای ویژه حسن برای این روزهای نیوشا:</span>
                </div>
                <p className="text-xs text-neutral-200 leading-relaxed">
                  {phaseInfo.partnerCareAdvice}
                </p>
              </div>

              {/* Quick Action to Telegram */}
              <div className="text-center pt-0.5">
                <button
                  onClick={() => setActiveTab('symptoms')}
                  style={{ backgroundColor: theme.primaryColor }}
                  className="w-full py-2.5 rounded-2xl hover:brightness-110 text-white font-bold text-xs sm:text-sm shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>ثبت احوال و ارسال مستقیم به تلگرام حسن 💬</span>
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
                initialRole={userRole}
              />
            </motion.div>
          )}

          {/* HASAN CONTROL & CARE HUB TAB */}
          {activeTab === 'hasan_hub' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 font-vazir"
            >
              {/* Care Log Success Banner */}
              {careLogNotice && (
                <div className="p-3 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-bold flex items-center gap-2 shadow-lg animate-pulse">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>{careLogNotice}</span>
                </div>
              )}

              {/* 1. Live Niusha Status Monitor Card */}
              <div
                style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}
                className="p-4 rounded-2xl border shadow-xl space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2 font-bold text-xs text-amber-400">
                    <ShieldAlert className="w-4 h-4" />
                    <span>داشبورد پایش زنده وضعیت نیوشا:</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                    آنلاین و همگام‌سازی ابری ⚡
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
                    <div className="text-[10px] text-neutral-400">فاز زیستی فعال:</div>
                    <div className="font-bold text-white flex items-center gap-1">
                      <span>{phaseInfo.icon}</span>
                      <span>{phaseInfo.title}</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
                    <div className="text-[10px] text-neutral-400">روز چرخه:</div>
                    <div className="font-bold text-amber-300">
                      روز {toPersianDigits(currentDayInCycle)} از {toPersianDigits(cycleLength)}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
                    <div className="text-[10px] text-neutral-400">شدت درد ثبت‌شده:</div>
                    <div className="font-bold text-rose-300 flex items-center gap-1">
                      <span>😣</span>
                      <span>{toPersianDigits(painLevel)} از ۵</span>
                    </div>
                  </div>
                </div>

                {/* Selected Symptoms list */}
                {selectedSymptoms.length > 0 && (
                  <div className="pt-2 border-t border-white/10">
                    <div className="text-[10px] text-neutral-400 mb-1 font-bold">علائم و حس‌های فعلی نیوشا:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedSymptoms.map((symId) => {
                        const tag = SYMPTOM_TAGS.find((s) => s.id === symId);
                        return (
                          <span
                            key={symId}
                            className="px-2 py-1 rounded-lg bg-rose-950/40 border border-rose-800/40 text-rose-200 text-[11px]"
                          >
                            {tag?.label || symId}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {moodNote && (
                  <div className="p-2.5 rounded-xl bg-rose-950/20 border border-rose-900/30 text-xs text-rose-200">
                    <strong className="text-white">💬 یادداشت نیوشا برای حسن:</strong> "{moodNote}"
                  </div>
                )}
              </div>

              {/* 2. Quick Care Action Logger by Hasan */}
              <div
                style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}
                className="p-4 rounded-2xl border shadow-xl space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Heart className="w-4 h-4 text-rose-400" />
                    <span>ثبت اقدامات مراقبتی انجام‌شده توسط حسن:</span>
                  </h4>
                  <span className="text-[10px] text-neutral-400">یک کلیک برای ثبت و اطلاع نیوشا</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    onClick={() => handleLogHasanCareAction('برایش دمنوش گرم و چای نبات آورد', '☕')}
                    className="p-2.5 rounded-xl bg-amber-950/30 hover:bg-amber-900/50 border border-amber-800/40 text-amber-200 text-xs font-bold transition-all text-right flex items-center gap-2 cursor-pointer"
                  >
                    <span className="text-lg">☕</span>
                    <span>دمنوش گرم بپز</span>
                  </button>

                  <button
                    onClick={() => handleLogHasanCareAction('شکم و کمر نیوشا را با روغن گرم ماساژ داد', '💆‍♂️')}
                    className="p-2.5 rounded-xl bg-purple-950/30 hover:bg-purple-900/50 border border-purple-800/40 text-purple-200 text-xs font-bold transition-all text-right flex items-center gap-2 cursor-pointer"
                  >
                    <span className="text-lg">💆‍♂️</span>
                    <span>کمر/شکم ماساژ بده</span>
                  </button>

                  <button
                    onClick={() => handleLogHasanCareAction('خوراکی، شکلات یا بستنی محبوبش را خرید', '🍫')}
                    className="p-2.5 rounded-xl bg-rose-950/30 hover:bg-rose-900/50 border border-rose-800/40 text-rose-200 text-xs font-bold transition-all text-right flex items-center gap-2 cursor-pointer"
                  >
                    <span className="text-lg">🍫</span>
                    <span>خوراکی/شکلات بخر</span>
                  </button>

                  <button
                    onClick={() => handleLogHasanCareAction('محکم در آغوش گرفت و نازش کرد', '🫂')}
                    className="p-2.5 rounded-xl bg-pink-950/30 hover:bg-pink-900/50 border border-pink-800/40 text-pink-200 text-xs font-bold transition-all text-right flex items-center gap-2 cursor-pointer"
                  >
                    <span className="text-lg">🫂</span>
                    <span>محکم بغلش کن</span>
                  </button>

                  <button
                    onClick={() => handleLogHasanCareAction('قرص مسکن و لیوان آب آماده کرد', '💊')}
                    className="p-2.5 rounded-xl bg-blue-950/30 hover:bg-blue-900/50 border border-blue-800/40 text-blue-200 text-xs font-bold transition-all text-right flex items-center gap-2 cursor-pointer"
                  >
                    <span className="text-lg">💊</span>
                    <span>مسکن آماده کن</span>
                  </button>

                  <button
                    onClick={() => handleLogHasanCareAction('کیسه آب گرم آماده کرد و روی دلش گذاشت', '🔥')}
                    className="p-2.5 rounded-xl bg-orange-950/30 hover:bg-orange-900/50 border border-orange-800/40 text-orange-200 text-xs font-bold transition-all text-right flex items-center gap-2 cursor-pointer"
                  >
                    <span className="text-lg">🔥</span>
                    <span>کیسه آب‌گرم بگذار</span>
                  </button>
                </div>

                {/* History of recent care logs */}
                {careLogs.length > 0 && (
                  <div className="pt-2 border-t border-white/10 space-y-1.5">
                    <div className="text-[10px] text-neutral-400 font-bold">تاریخچه اقدامات ثبت‌شده حسن:</div>
                    <div className="max-h-32 overflow-y-auto space-y-1 scrollbar-thin">
                      {careLogs.map((log) => (
                        <div
                          key={log.id}
                          className="p-1.5 rounded-lg bg-black/40 border border-white/5 text-[11px] text-neutral-200 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{log.icon}</span>
                            <span>{log.action}</span>
                          </div>
                          <span className="text-[9px] text-neutral-400">{log.timestamp}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Send Direct Custom Message to Niusha Telegram */}
              <div
                style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}
                className="p-4 rounded-2xl border shadow-xl space-y-2.5"
              >
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Send className="w-4 h-4 text-emerald-400" />
                  <span>مخابره مستقیم پیام عاشقانه یا حمایتی به تلگرام نیوشا:</span>
                </h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={hasanCustomMessage}
                    onChange={(e) => setHasanCustomMessage(e.target.value)}
                    placeholder="مثلا: پرنسسم الان برات دمنوش آماده می‌کنم میام پیشت..."
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none"
                  />
                  <button
                    onClick={handleSendHasanCustomTelegram}
                    disabled={isSendingTelegram || !hasanCustomMessage.trim()}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>ارسال</span>
                  </button>
                </div>
                {hasanMessageSuccess && (
                  <div className="text-[11px] text-emerald-300 font-bold">
                    ✓ پیام شما با موفقیت به تلگرام نیوشا مخابره شد!
                  </div>
                )}
              </div>

              {/* 4. Custom Coupon Creator by Hasan */}
              <div
                style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}
                className="p-4 rounded-2xl border shadow-xl space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>افزودن کوپن مراقبت جدید و اختصاصی برای نیوشا:</span>
                  </h4>
                  {couponAddedNotice && (
                    <span className="text-[10px] text-emerald-300 font-bold">✓ کوپن جدید اضافه شد</span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <input
                    type="text"
                    value={newCouponTitle}
                    onChange={(e) => setNewCouponTitle(e.target.value)}
                    placeholder="عنوان کوپن (مثلا: کوپن پیتزا و فیلم)"
                    className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-neutral-500"
                  />
                  <input
                    type="text"
                    value={newCouponDesc}
                    onChange={(e) => setNewCouponDesc(e.target.value)}
                    placeholder="توضیحات (مثلا: پیتزا پپرونی با کولا)"
                    className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-neutral-500"
                  />
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={newCouponIcon}
                      onChange={(e) => setNewCouponIcon(e.target.value)}
                      placeholder="آیکون (🍕)"
                      className="w-16 bg-black/40 border border-white/10 rounded-xl text-center text-base"
                    />
                    <button
                      onClick={handleAddCustomCoupon}
                      className="flex-1 py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-all cursor-pointer shadow-md"
                    >
                      افزودن کوپن 🎁
                    </button>
                  </div>
                </div>
              </div>

              {/* 5. Hasan's Dedicated AI Assistant */}
              <div className="pt-2">
                <div className="text-xs font-bold text-neutral-300 mb-2 flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-amber-400" />
                  <span>چت اختصاصی جمینای برای مشاوره به حسن:</span>
                </div>
                <PeriodAIChat cycleStatus={cycleStatus} initialRole="hasan" />
              </div>
            </motion.div>
          )}

          {/* 2. CLINICAL ANALGESICS TAB */}
          {activeTab === 'analgesic' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3.5"
            >
              <div
                style={{ backgroundColor: theme.pillBg, borderColor: theme.cardBorder }}
                className="p-3.5 rounded-2xl border text-xs leading-relaxed"
              >
                <div className="flex items-center gap-2 font-bold mb-1" style={{ color: theme.accentColor }}>
                  <ShieldAlert className="w-4 h-4" />
                  <span>پروتکل علمی تسکین دردهای قاعدگی (دیسمنوره اولیه):</span>
                </div>
                <p className="text-neutral-300 text-[11px] text-justify">
                  علت اصلی دردهای پریود، ترشح ماده‌ای به نام <strong>پروستاگلاندین (PGF2α)</strong> در دیواره رحم است که باعث انقباض عضلانی و کاهش موقت جریان خون می‌شود. داروهای ضدالتهاب غیراستروئیدی (NSAIDs) مستقیماً تولید این ماده را متوقف می‌کنند.
                </p>
              </div>

              {/* Analgesics Comparison Cards */}
              <div className="space-y-3">
                {CLINICAL_ANALGESICS.map((med, idx) => (
                  <div
                    key={idx}
                    style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}
                    className="p-3.5 rounded-2xl border shadow-md space-y-2"
                  >
                    <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                      <div>
                        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Pill className="w-3.5 h-3.5" style={{ color: theme.accentColor }} />
                          <span>{med.name}</span>
                        </h4>
                        <div className="text-[10px] text-neutral-400">{med.genericName} • {med.category}</div>
                      </div>
                      <div
                        style={{ backgroundColor: theme.pillBg, borderColor: theme.pillBorder, color: theme.accentColor }}
                        className="text-[10px] px-2 py-0.5 rounded-full border font-bold"
                      >
                        قدرت تسکین: {'★'.repeat(med.rating)}
                      </div>
                    </div>

                    <div className="text-[11px] text-neutral-200 space-y-1.5">
                      <div>
                        <strong className="text-white">🧬 مکانیزم اثر:</strong> {med.mechanism}
                      </div>
                      <div>
                        <strong className="text-white">⏱️ زمان‌بندی طلایی مصرف:</strong> {med.timing}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[10px]">
                        <div className="p-1.5 rounded-lg bg-black/40 border border-white/5">
                          <strong className="text-emerald-300">💊 دوز معمول:</strong> {med.dosage}
                        </div>
                        <div className="p-1.5 rounded-lg bg-black/40 border border-white/5">
                          <strong className="text-amber-300">⚠️ نکات ایمنی:</strong> {med.warnings}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Golden Rule of Pain Relief */}
              <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-800/40 text-amber-200 text-[11px] space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span>قانون طلایی پیشگیری از دل‌درد شدید:</span>
                </div>
                <p className="leading-relaxed text-justify">
                  بهترین زمان مصرف مسکن‌هایی مثل مفنامیک اسید یا ناپروکسن، <strong>۱۲ تا ۲۴ ساعت قبل از اوج گرفتن درد یا به محض دیدن اولین قطره لکه‌بینی</strong> است. اگر قبل از ترشح انبوه پروستاگلاندین‌ها دارو مصرف شود، گیرنده‌ها مهار شده و درد شدید اصلاً شکل نمی‌گیرد!
                </p>
              </div>
            </motion.div>
          )}

          {/* 3. CALENDAR & PHASES TAB */}
          {activeTab === 'calendar' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3.5"
            >
              {/* Settings Form */}
              <div
                style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}
                className="p-3.5 rounded-2xl border space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <h4 className="text-xs font-bold flex items-center gap-1.5" style={{ color: theme.accentColor }}>
                    <CalendarIcon className="w-4 h-4" />
                    <span>تنظیم تاریخ و مشخصات چرخه نیوشا:</span>
                  </h4>
                  <div className="text-[10px] text-neutral-400 flex items-center gap-1">
                    <Globe className="w-3 h-3" style={{ color: theme.accentColor }} />
                    <span>همگام‌سازی ابری</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  {/* Interactive Shamsi Picker Trigger */}
                  <div>
                    <label className="block text-neutral-300 mb-1 font-medium text-[11px]">تاریخ شروع آخرین پریود:</label>
                    <button
                      type="button"
                      onClick={() => setIsShamsiPickerOpen(true)}
                      style={{ backgroundColor: theme.pillBg, borderColor: theme.pillBorder }}
                      className="w-full border rounded-xl px-2.5 py-2 text-white font-bold transition-all text-right flex items-center justify-between cursor-pointer shadow-sm hover:brightness-125 text-xs"
                    >
                      <span style={{ color: theme.accentColor }}>{formatToPersianShamsiDate(startDateStr)}</span>
                      <CalendarIcon className="w-3.5 h-3.5" style={{ color: theme.accentColor }} />
                    </button>
                    <span className="text-[9px] text-neutral-400 mt-0.5 block">لمس کنید تا تقویم باز شود</span>
                  </div>

                  <div>
                    <label className="block text-neutral-300 mb-1 font-medium text-[11px]">طول کل چرخه (روز):</label>
                    <input
                      type="number"
                      min={20}
                      max={45}
                      value={cycleLength}
                      onChange={(e) => handleUpdateCycleLength(Number(e.target.value))}
                      style={{ backgroundColor: theme.pillBg, borderColor: theme.pillBorder }}
                      className="w-full border rounded-xl px-2.5 py-1.5 text-white focus:outline-none font-bold text-xs"
                    />
                    <span className="text-[9px] text-neutral-400 mt-0.5 block">استاندارد: ۲۸ روز</span>
                  </div>

                  <div>
                    <label className="block text-neutral-300 mb-1 font-medium text-[11px]">طول خونریزی (روز):</label>
                    <input
                      type="number"
                      min={3}
                      max={10}
                      value={periodLength}
                      onChange={(e) => handleUpdatePeriodLength(Number(e.target.value))}
                      style={{ backgroundColor: theme.pillBg, borderColor: theme.pillBorder }}
                      className="w-full border rounded-xl px-2.5 py-1.5 text-white focus:outline-none font-bold text-xs"
                    />
                    <span className="text-[9px] text-neutral-400 mt-0.5 block">استاندارد: ۵ تا ۷ روز</span>
                  </div>
                </div>
              </div>

              {/* All 4 Phases Detailed Roadmap */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-neutral-300">نقشه ۴ فاز زیستی چرخه بانوان:</h4>
                
                {(['menstrual', 'follicular', 'ovulation', 'luteal'] as CyclePhase[]).map((pKey) => {
                  const pData = PHASE_MEDICAL_DATA[pKey];
                  const isCurrent = currentPhase === pKey;
                  return (
                    <div
                      key={pKey}
                      style={
                        isCurrent
                          ? { backgroundColor: theme.pillBg, borderColor: theme.primaryColor }
                          : { backgroundColor: 'rgba(0,0,0,0.3)', borderColor: 'rgba(255,255,255,0.1)' }
                      }
                      className={`p-3 rounded-xl border transition-all ${
                        isCurrent
                          ? 'shadow-md ring-1'
                          : ''
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold">
                        <div className="flex items-center gap-2">
                          <span>{pData.icon}</span>
                          <span style={isCurrent ? { color: theme.accentColor } : {}} className={!isCurrent ? 'text-white' : ''}>{pData.title}</span>
                        </div>
                        {isCurrent && (
                          <span
                            style={{ backgroundColor: theme.primaryColor }}
                            className="px-2 py-0.5 rounded-full text-white text-[10px]"
                          >
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

          {/* 4. NUTRITION & HERBAL TAB */}
          {activeTab === 'nutrition' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3.5"
            >
              {/* Nutrition & Herbal recommendations */}
              <div
                style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}
                className="p-4 rounded-2xl border space-y-2.5"
              >
                <h4 className="text-xs sm:text-sm font-bold flex items-center gap-2" style={{ color: theme.accentColor }}>
                  <Coffee className="w-4 h-4" />
                  <span>دمنوش‌ها و خوراکی‌های توصیه‌شده برای فاز فعلی:</span>
                </h4>
                <ul className="space-y-1.5 text-xs text-neutral-200">
                  {phaseInfo.nutritionTips.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-2 leading-relaxed">
                      <span className="mt-0.5" style={{ color: theme.accentColor }}>🌱</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Seed Cycling Guide (تغذیه دانه‌ها) */}
              <div
                style={{ backgroundColor: theme.pillBg, borderColor: theme.cardBorder }}
                className="p-3.5 rounded-2xl border space-y-2"
              >
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <Apple className="w-4 h-4" style={{ color: theme.accentColor }} />
                  <span>پروتکل تعادل هورمونی با دانه‌ها (Seed Cycling):</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-neutral-300">
                  <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                    <strong className="text-emerald-300 block mb-0.5">روز ۱ تا ۱۴ (فاز فولیکولار):</strong>
                    ۱ قاشق تخم کتان + ۱ قاشق تخم کدو برای بالانس استروژن و تامین روی.
                  </div>
                  <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                    <strong className="text-amber-300 block mb-0.5">روز ۱۵ تا ۲۸ (فاز لوتئال):</strong>
                    ۱ قاشق کنجد + ۱ قاشق تخم آفتابگردان برای تقویت پروژسترون و کاهش PMS.
                  </div>
                </div>
              </div>

              {/* Self-care & Mental health */}
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                <h4 className="text-xs font-bold flex items-center gap-2" style={{ color: theme.accentColor }}>
                  <Sparkles className="w-4 h-4" />
                  <span>مراقبت عاطفی، روانی و استراحت:</span>
                </h4>
                <ul className="space-y-1 text-xs text-neutral-300">
                  {phaseInfo.careTips.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span style={{ color: theme.accentColor }}>✨</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}

          {/* 5. SYMPTOMS & MOOD LOG TAB */}
          {activeTab === 'symptoms' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3.5"
            >
              {/* Flow Selector */}
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: theme.accentColor }}>
                  شدت جریان خونریزی امروز:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {FLOW_LEVELS.map((flow) => {
                    const isSelected = selectedFlow === flow.id;
                    return (
                      <button
                        key={flow.id}
                        type="button"
                        onClick={() => setSelectedFlow(flow.id)}
                        style={
                          isSelected
                            ? { backgroundColor: theme.primaryColor, borderColor: theme.accentColor }
                            : { backgroundColor: 'rgba(0,0,0,0.3)', borderColor: 'rgba(255,255,255,0.1)' }
                        }
                        className={`p-2 rounded-xl border text-[11px] text-center transition-all cursor-pointer ${
                          isSelected ? 'text-white font-bold shadow-md' : 'text-neutral-300'
                        }`}
                      >
                        {flow.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: theme.accentColor }}>
                  علائم بدنی و حسی امروزت (انتخاب کن تا حسن بدونه چطور کمکت کنه):
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {SYMPTOM_TAGS.map((sym) => {
                    const isSelected = selectedSymptoms.includes(sym.id);
                    return (
                      <button
                        key={sym.id}
                        type="button"
                        onClick={() => toggleSymptom(sym.id)}
                        style={
                          isSelected
                            ? { backgroundColor: theme.primaryColor, borderColor: theme.accentColor }
                            : { backgroundColor: 'rgba(0,0,0,0.3)', borderColor: 'rgba(255,255,255,0.1)' }
                        }
                        className={`p-2.5 rounded-xl border text-xs text-right transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'text-white font-bold shadow-md'
                            : 'text-neutral-300 hover:border-white/30'
                        }`}
                      >
                        <span>{sym.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Pain Scale Slider */}
              <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-bold text-neutral-200">میزان درد و دل‌پیچه امروز:</span>
                  <span className="font-bold" style={{ color: theme.accentColor }}>
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
                  className="w-full cursor-pointer"
                  style={{ accentColor: theme.primaryColor }}
                />
              </div>

              {/* Personal Note */}
              <div>
                <label className="block text-xs text-neutral-300 mb-1 font-medium">
                  پیام یا خواسته ویژه از حسن (مثلاً: دلم خوراکی می‌خواد، تنم بغل می‌خواد، یا دل‌درد دارم):
                </label>
                <textarea
                  rows={2}
                  value={moodNote}
                  onChange={(e) => setMoodNote(e.target.value)}
                  placeholder="حسن جونم، الان دلم می‌خواد که..."
                  style={{ backgroundColor: theme.pillBg, borderColor: theme.pillBorder }}
                  className="w-full border rounded-xl p-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none resize-none transition-colors"
                />
              </div>

              {/* Submit to Telegram */}
              <div>
                <button
                  onClick={handleSendStatusToHasan}
                  disabled={isSendingTelegram}
                  style={{ backgroundColor: theme.primaryColor }}
                  className="w-full py-2.5 rounded-2xl hover:brightness-110 text-white font-bold text-xs sm:text-sm shadow-xl transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSendingTelegram ? 'در حال ارسال به ربات تلگرام... 🤖' : 'ارسال مستقیم وضعیت به پیوی حسن 🤖💬✨'}</span>
                </button>

                {telegramSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 p-2 rounded-xl bg-emerald-950/60 border border-emerald-600/60 text-emerald-200 text-xs text-center font-bold flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>پیام وضعیت با موفقیت به تلگرام حسن فرستاده شد! الان هواتو داره 🌸</span>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* 6. COUPONS TAB */}
          {activeTab === 'coupons' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className="text-xs mb-1.5 text-justify" style={{ color: theme.accentColor }}>
                نیوشای عزیزم، این کوپن‌ها برای تو همیشه فعال و لازم‌الاجراست. هر کدوم رو که لمس کنی، مستقیم به تلگرام حسن فرستاده میشه تا اجراش کنه! 👑❤️
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {couponsList.map((coupon) => (
                  <div
                    key={coupon.id}
                    style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}
                    className="p-3.5 rounded-2xl border shadow-md flex flex-col justify-between"
                  >
                    <div>
                      <div className="text-2xl mb-1">{coupon.icon}</div>
                      <h4 className="text-xs sm:text-sm font-bold text-white mb-0.5">{coupon.title}</h4>
                      <p className="text-[11px] text-neutral-300">{coupon.desc}</p>
                    </div>

                    <button
                      onClick={() => handleRedeemCoupon(coupon.title)}
                      style={{ backgroundColor: theme.primaryColor }}
                      className="mt-2.5 py-1.5 px-3 rounded-xl hover:brightness-110 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
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
                  style={{ backgroundColor: theme.pillBg, borderColor: theme.primaryColor, color: theme.accentColor }}
                  className="p-2.5 rounded-xl border text-xs text-center font-bold"
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

