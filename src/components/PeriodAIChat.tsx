import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send,
  Bot,
  User,
  Sparkles,
  Heart,
  RefreshCw,
  Zap,
  Globe,
  Brain,
  ExternalLink,
  Search,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { CycleStatus } from '../types/period';
import { useTheme } from '../context/ThemeContext';

export type GeminiChatMode = 'fast' | 'research_thinking';

interface Citation {
  title: string;
  uri: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  mode?: GeminiChatMode;
  citations?: Citation[];
}

interface PeriodAIChatProps {
  cycleStatus: CycleStatus;
  onOpenCoupons?: () => void;
  initialRole?: 'niosha' | 'hasan';
}

const QUICK_QUESTIONS_NIOSHA = [
  'به حسن بگو بیاد پیشم سکس و عشق‌بازی کنیم / دلم تنشو می‌خواد 🔥💋',
  'به حسن بگو بیاد محکم بغلم کنه و لوسم کنه 🫂❤️',
  'به حسن بگو برام شکلات و خوراکی خوشمزه بگیره 🍫💌',
  'علمی بگو چطور دل‌درد و اسپاسم الانم رو فوری آروم کنم؟ 😣💊',
  'چرا این روزها بدنم حساس شده و نوسان هورمونی دارم؟ 🧬🌸',
  'چه دمنوش یا رژیم غذایی برای این فازم عالیه؟ ☕🌱',
];

const QUICK_QUESTIONS_HASAN = [
  'نیوشا الان روز چنده و دقیقا چطور هواشو داشته باشم؟ 🌸',
  'یه پیام داغ، لوس و عاشقانه برام بنویس که بفرستم تلگرامش 🔥💋',
  'چطور دل‌درد، اسپاسم و بی‌حوصلگیش رو فوری تسکین بدم؟ 💆‍♂️',
  'چه دمنوش یا شام رمانتیکی برام راحته تا الان براش بپزم؟ ☕🍲',
  'راهنمای کامل اختیارات محلی (Localhost) و تنظیمات سیستم چیه؟ ⚙️',
  'چطور خودمم صبور، ریلکس و پرانرژی باشم؟ 🧘‍♂️',
];

const INITIAL_GREETING_NIOSHA: ChatMessage = {
  id: 'init-niosha-1',
  role: 'model',
  text: `سلام نیوشای قشنگم، پرنسس خوشگل حسن! 🌸✨
من همدم و دستیار هوشمند و اختصاصی تو هستم که حسن با تمام عشقش من رو برای تو طراحی کرده. 

💡 **امکانات تو:**
۱. 🔬 **حالت پیشرفته (تحقیق در وب و تفکر عمیق):** جستجوی زنده در مقالات علمی پزشکی و هورمونی
۲. ⚡ **حالت سریع و سبک:** پاسخ آنی
۳. 💌 **مخابره آنی:** ارسال پیام‌های دلتنگی، خوراکی، و حتی پیام‌های داغ و صریح به تلگرام حسن! 🔥💋`,
  timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
  mode: 'research_thinking',
};

const INITIAL_GREETING_HASAN: ChatMessage = {
  id: 'init-hasan-1',
  role: 'model',
  text: `سلام حسن جان، داداش گل و عاشق! 👑❤️
من مشاور و دستیار هوشمند اختصاصی تو هستم تا در مراقبت از نیوشا جان و مدیریت سیستم همراهت باشم.

💡 **امکانات اختصاصی تو:**
- دریافت راهکارهای عملی و علمی برای تسکین دل‌درد و حواست به نیوشا بودن
- تولید متن‌های عاشقانه، صریح و داغ برای ارسال مستقیم به تلگرام نیوشا 🔥
- آموزش پخت دمنوش‌ها، تکنیک‌های ماساژ و مدیریت احساسات
- راهنمای ابزارهای محلی (Localhost) و اختیارات مدیریتی برنامه

هر سوالی داری با خیال راحت بپرس!`,
  timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
  mode: 'research_thinking',
};

export const PeriodAIChat: React.FC<PeriodAIChatProps> = ({ cycleStatus, initialRole = 'niosha' }) => {
  const { theme } = useTheme();
  
  // Active User Role: 'niosha' vs 'hasan'
  const [activeRole, setActiveRole] = useState<'niosha' | 'hasan'>(initialRole);

  // Selected AI Mode: 'research_thinking' vs 'fast'
  const [selectedMode, setSelectedMode] = useState<GeminiChatMode>(() => {
    const savedMode = localStorage.getItem('niosha_gemini_chat_mode');
    return (savedMode as GeminiChatMode) || 'research_thinking';
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const storageKey = activeRole === 'hasan' ? 'hasan_period_chat_history' : 'niosha_period_chat_history';
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return activeRole === 'hasan' ? [INITIAL_GREETING_HASAN] : [INITIAL_GREETING_NIOSHA];
      }
    }
    return activeRole === 'hasan' ? [INITIAL_GREETING_HASAN] : [INITIAL_GREETING_NIOSHA];
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);

  // Switch role handler
  const handleSwitchRole = (role: 'niosha' | 'hasan') => {
    setActiveRole(role);
    const storageKey = role === 'hasan' ? 'hasan_period_chat_history' : 'niosha_period_chat_history';
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch {
        setMessages(role === 'hasan' ? [INITIAL_GREETING_HASAN] : [INITIAL_GREETING_NIOSHA]);
      }
    } else {
      setMessages(role === 'hasan' ? [INITIAL_GREETING_HASAN] : [INITIAL_GREETING_NIOSHA]);
    }
  };

  // Save selected mode
  const handleModeChange = (newMode: GeminiChatMode) => {
    setSelectedMode(newMode);
    localStorage.setItem('niosha_gemini_chat_mode', newMode);
  };

  // Auto-scroll ONLY the chat container to bottom
  const scrollToBottom = () => {
    if (chatScrollContainerRef.current) {
      chatScrollContainerRef.current.scrollTop = chatScrollContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Persist messages in local storage
  useEffect(() => {
    if (messages.length > 0) {
      const storageKey = activeRole === 'hasan' ? 'hasan_period_chat_history' : 'niosha_period_chat_history';
      localStorage.setItem(storageKey, JSON.stringify(messages.slice(-20)));
    }
  }, [messages, activeRole]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      mode: selectedMode,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Build history payload for context
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const contextPayload = {
        currentPhase: cycleStatus.phaseInfo.title,
        dayInCycle: cycleStatus.currentDayInCycle,
        daysUntilNextPeriod: cycleStatus.daysUntilNextPeriod,
        isPeriodToday: cycleStatus.isPeriodToday,
      };

      const res = await fetch('/api/period-ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history: historyPayload,
          context: contextPayload,
          mode: selectedMode,
          userRole: activeRole,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to fetch from server');
      }

      const data = await res.json();
      const botReply: ChatMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        text: data.reply || (activeRole === 'hasan' ? 'حسن جان، همیشه همراهت هستم 👑' : 'نیوشای عزیزم، همیشه همراهت هستم 🌸'),
        timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        mode: data.mode || selectedMode,
        citations: data.citations || [],
      };

      setMessages((prev) => [...prev, botReply]);
    } catch (err: any) {
      console.error('Chat error:', err);
      // Informative and helpful response if the backend server/Gemini API is unreachable on static hosting (like Cloudflare Pages)
      const fallbackReply: ChatMessage = {
        id: `model-err-${Date.now()}`,
        role: 'model',
        text: activeRole === 'hasan' 
          ? `⚠️ **ارتباط با سرور هوش مصنوعی جمینای برقرار نشد:**\nدرخواست به سرور بک‌اند ارسال شد اما پاسخی دریافت نشد (در هاست‌های استاتیک مانند Cloudflare Pages نیاز به اجرای بک‌اند Node.js یا تنظیم متغیر GEMINI_API_KEY است).\n\n💡 **پاسخ آفلاین:** برای تسکین درد نیوشا جان یک کیسه آب گرم و دمنوش بابونه یا نبات دارچین آماده کن و آروم شکمش رو ماساژ بده! 💖🫂`
          : `نیوشای عزیزم، ارتباط با سرور هوش مصنوعی برقرار نشد، اما برای آرامش و تسکین فوری، حتماً یک کیسه آب گرم ملایم روی دل یا پایین کمرت بذار و یک دمنوش بابونه یا دارچین با نبات بنوش. 🌸\nیادت نره حسن دوست‌داشتنی‌ات عاشقانه هواتو داره و هر کاری بگی برات انجام میده! ❤️`,
        timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        mode: selectedMode,
        citations: [],
      };
      setMessages((prev) => [...prev, fallbackReply]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    const defaultMsg = activeRole === 'hasan' ? INITIAL_GREETING_HASAN : INITIAL_GREETING_NIOSHA;
    setMessages([defaultMsg]);
    const storageKey = activeRole === 'hasan' ? 'hasan_period_chat_history' : 'niosha_period_chat_history';
    localStorage.removeItem(storageKey);
  };

  return (
    <div
      style={{
        backgroundColor: theme.cardBg,
        borderColor: theme.cardBorder,
      }}
      className="flex flex-col h-[68vh] sm:h-[580px] min-h-[460px] max-h-[82vh] rounded-2xl border overflow-hidden shadow-2xl"
    >
      {/* Chat Sub-Header */}
      <div className="px-3.5 py-3 bg-white/5 border-b border-white/10 backdrop-blur-md flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              style={{ backgroundColor: theme.primaryColor }}
              className="relative w-8 h-8 rounded-full flex items-center justify-center shadow-md shrink-0"
            >
              <Bot className="w-4 h-4 text-white" />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-black" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5 flex-wrap">
                <span>{activeRole === 'hasan' ? 'دستیار مشاور و مربی هوشمند حسن' : 'دستیار هوشمند سلامت و آرامش نیوشا'}</span>
                <span
                  style={{ backgroundColor: theme.pillBg, borderColor: theme.pillBorder, color: theme.accentColor }}
                  className="text-[10px] px-1.5 py-0.5 rounded-full border font-medium"
                >
                  {activeRole === 'hasan' ? 'ویژه حسن 👑' : 'پشتیبان حسن ❤️'}
                </span>
              </div>
              <div className="text-[10px] text-neutral-400">
                {activeRole === 'hasan' 
                  ? 'مشاوره مراقبت از نیوشا، تولید پیام‌های رمانتیک/داغ و راهنمای لوکال'
                  : 'مشاوره پزشکی و هورمونی، پاسخ‌های علمی و مخابره آنی به حسن'}
              </div>
            </div>
          </div>

          <button
            onClick={handleClearChat}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-[11px] flex items-center gap-1 shrink-0"
            title="شروع مجدد گفتگو"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">پاک کردن</span>
          </button>
        </div>

        {/* ROLE TOGGLE + AI MODEL SELECTOR */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5">
          {/* User Persona Switcher */}
          <div
            style={{ backgroundColor: theme.pillBg, borderColor: theme.pillBorder }}
            className="p-1 rounded-xl border flex items-center gap-1 flex-1"
          >
            <button
              type="button"
              onClick={() => handleSwitchRole('niosha')}
              className={`flex-1 py-1 px-2 rounded-lg text-xs transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activeRole === 'niosha'
                  ? 'bg-rose-600 text-white font-bold shadow-sm'
                  : 'text-neutral-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>🌸 نیوشا (پرنسس)</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchRole('hasan')}
              className={`flex-1 py-1 px-2 rounded-lg text-xs transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activeRole === 'hasan'
                  ? 'bg-amber-600 text-white font-bold shadow-sm'
                  : 'text-neutral-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>🛡️ حسن (همراه)</span>
            </button>
          </div>

          {/* AI MODEL SELECTOR TOGGLE */}
          <div
            style={{ backgroundColor: theme.pillBg, borderColor: theme.pillBorder }}
            className="p-1 rounded-xl border flex items-center gap-1 flex-1"
          >
            {/* Option 1: Research & Deep Thinking */}
            <button
              type="button"
              onClick={() => handleModeChange('research_thinking')}
              style={
                selectedMode === 'research_thinking'
                  ? {
                      backgroundColor: theme.primaryColor,
                      color: '#ffffff',
                    }
                  : {}
              }
              className={`flex-1 py-1 px-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 cursor-pointer ${
                selectedMode === 'research_thinking'
                  ? 'shadow-md font-bold'
                  : 'text-neutral-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Brain className="w-3 h-3 shrink-0" />
              <span className="truncate">تحقیق و تفکر عمیق</span>
            </button>

            {/* Option 2: Fast & Responsive */}
            <button
              type="button"
              onClick={() => handleModeChange('fast')}
              style={
                selectedMode === 'fast'
                  ? {
                      backgroundColor: theme.primaryColor,
                      color: '#ffffff',
                    }
                  : {}
              }
              className={`flex-1 py-1 px-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 cursor-pointer ${
                selectedMode === 'fast'
                  ? 'shadow-md font-bold'
                  : 'text-neutral-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Zap className="w-3 h-3 shrink-0" />
              <span className="truncate">پاسخ سریع</span>
            </button>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div ref={chatScrollContainerRef} className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-3.5 scrollbar-thin">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                style={
                  isUser
                    ? { backgroundColor: theme.primaryColor }
                    : { backgroundColor: theme.pillBg, borderColor: theme.pillBorder, color: theme.accentColor }
                }
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow text-white border border-transparent mt-1"
              >
                {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>

              {/* Bubble */}
              <div
                style={
                  isUser
                    ? { backgroundColor: theme.primaryColor }
                    : { backgroundColor: theme.pillBg, borderColor: theme.pillBorder }
                }
                className={`max-w-[88%] sm:max-w-[80%] rounded-2xl p-3 sm:p-3.5 text-xs sm:text-[13px] leading-relaxed shadow-lg ${
                  isUser
                    ? 'text-white rounded-tr-none'
                    : 'border text-neutral-100 rounded-tl-none'
                }`}
              >
                {/* Mode Indicator badge for assistant */}
                {!isUser && msg.mode && (
                  <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-white/10 text-[10px] text-neutral-400">
                    {msg.mode === 'research_thinking' ? (
                      <>
                        <Brain className="w-3 h-3 text-purple-400" />
                        <Globe className="w-3 h-3 text-blue-400" />
                        <span className="text-purple-300 font-medium">تحلیل عمیق و جستجو در منابع وب</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3 h-3 text-amber-400" />
                        <span className="text-amber-300 font-medium">پاسخ سریع جمینای</span>
                      </>
                    )}
                  </div>
                )}

                <div className="whitespace-pre-line break-words font-vazir">{msg.text}</div>

                {/* Citations list if available */}
                {!isUser && msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-white/10 space-y-1.5">
                    <div className="text-[10px] font-bold text-neutral-400 flex items-center gap-1">
                      <Search className="w-3 h-3 text-blue-400" />
                      <span>منابع و ارجاعات علمی کشف‌شده:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.citations.map((cite, cIdx) => (
                        <a
                          key={cIdx}
                          href={cite.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            backgroundColor: theme.cardBg,
                            borderColor: theme.cardBorder,
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[10px] text-blue-300 hover:text-blue-200 hover:border-blue-400 transition-colors"
                        >
                          <Globe className="w-2.5 h-2.5" />
                          <span className="max-w-[150px] truncate">{cite.title}</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div
                  className={`mt-1.5 text-[9px] ${
                    isUser ? 'text-white/80 text-left' : 'text-neutral-400 text-right'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>
            </motion.div>
          );
        })}

        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2.5"
          >
            <div
              style={{ backgroundColor: theme.pillBg, color: theme.accentColor }}
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
            >
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div
              style={{ backgroundColor: theme.pillBg, borderColor: theme.pillBorder }}
              className="border rounded-2xl rounded-tl-none p-3 text-xs flex flex-col gap-1.5"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: theme.primaryColor, animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: theme.primaryColor, animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: theme.primaryColor, animationDelay: '300ms' }} />
                <span className="text-[11px] text-neutral-300 mr-1 font-medium">
                  {selectedMode === 'research_thinking'
                    ? 'در حال جستجو در وب، مطالعه مقالات علمی و تفکر عمیق...'
                    : 'در حال نوشتن پاسخ صمیمی برای نیوشا...'}
                </span>
              </div>
              {selectedMode === 'research_thinking' && (
                <div className="text-[10px] text-neutral-400 flex items-center gap-1.5 pr-4">
                  <Globe className="w-3 h-3 text-blue-400 animate-spin" />
                  <span>Google Search Grounding & Deep Reasoning فعال است</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Quick Questions Pill Bar */}
      <div className="px-3 py-2 bg-black/40 border-t border-white/10 overflow-x-auto scrollbar-none flex items-center gap-1.5">
        <span className="text-[10px] text-neutral-400 whitespace-nowrap shrink-0 flex items-center gap-1">
          <Sparkles className="w-3 h-3" style={{ color: theme.accentColor }} />
          <span>پیشنهاد گفتگو:</span>
        </span>
        {(activeRole === 'hasan' ? QUICK_QUESTIONS_HASAN : QUICK_QUESTIONS_NIOSHA).map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(q)}
            disabled={isLoading}
            style={{ backgroundColor: theme.pillBg, borderColor: theme.pillBorder }}
            className="shrink-0 px-2.5 py-1 rounded-full hover:brightness-125 border text-neutral-200 hover:text-white text-[11px] transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Chat Input Field */}
      <div className="p-3 bg-black/60 border-t border-white/10">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              activeRole === 'hasan'
                ? 'سوال از جمینای درباره مراقبت از نیوشا، متن پیام عاشقانه یا اختیارات لوکال...'
                : selectedMode === 'research_thinking'
                  ? 'سوال علمی، دارویی، روحی یا درخواستی از حسن داری بپرس (با جستجو در وب)...'
                  : 'پیام یا سوالت رو بنویس...'
            }
            disabled={isLoading}
            style={{ backgroundColor: theme.pillBg, borderColor: theme.pillBorder }}
            className="flex-1 border rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none transition-colors"
          />

          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            style={{ backgroundColor: theme.primaryColor }}
            className="p-2.5 rounded-xl hover:brightness-110 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-md flex items-center justify-center shrink-0"
            title="ارسال پیام"
          >
            <Send className="w-4 h-4 rotate-180" />
          </button>
        </form>
      </div>
    </div>
  );
};
