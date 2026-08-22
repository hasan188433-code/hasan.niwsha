import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Bot, User, Sparkles, Heart, RefreshCw, MessageSquare, Coffee, ShieldAlert, Check, Share2 } from 'lucide-react';
import { CycleStatus } from '../types/period';
import { sendTelegramMessage } from '../utils/telegram';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

interface PeriodAIChatProps {
  cycleStatus: CycleStatus;
  onOpenCoupons?: () => void;
}

const QUICK_QUESTIONS = [
  'به حسن بگو برام شکلات بگیره و هوامو داشته باشه 💌',
  'حالم گرفته و خسته‌ام، باهام حرف بزن... 🥺',
  'چیکار کنم دل‌درد و کمردردم سریع‌تر آروم بشه؟ 😣',
  'الان چه دمنوش یا خوراکی خوشمزه برام خوبه؟ ☕',
  'از عشق حسن به من برام بگو ❤️',
];

const INITIAL_GREETING: ChatMessage = {
  id: 'init-1',
  role: 'model',
  text: `سلام نیوشای قشنگم، پرنسس مهربون! 🌸✨
من همدم هوشمند و اختصاصی تو هستم که حسن با تمام عشقش من رو برای تو طراحی کرده. 
اینجا می‌تونی درباره هر موضوعی با من حرف بزنی: درد دل، روزمرگی‌ها، حس و حالت، سوالاتت، یا مراقبت‌های ویژه در دوران پریود و تسکین دل‌درد!

حسن همیشه بهم یادآوری می‌کنه که چقدر عاشقته و چقدر خوشبختی تو براش مهمه. هرچیزی توی دلته بهم بگو، با تمام وجود بهت گوش میدم 🥰💖`,
  timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
};

export const PeriodAIChat: React.FC<PeriodAIChatProps> = ({ cycleStatus, onOpenCoupons }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('niosha_period_chat_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [INITIAL_GREETING];
      }
    }
    return [INITIAL_GREETING];
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Persist messages in local storage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('niosha_period_chat_history', JSON.stringify(messages.slice(-20)));
    }
  }, [messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
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
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to fetch from server');
      }

      const data = await res.json();
      const botReply: ChatMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        text: data.reply || 'نیوشای عزیزم، من همیشه در کنارت هستم 🌸 هر موقع خواستی بازهم بپرس.',
        timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botReply]);
    } catch (err) {
      console.error('Chat error:', err);
      // Friendly local fallback
      const fallbackReply: ChatMessage = {
        id: `model-err-${Date.now()}`,
        role: 'model',
        text: `نیوشای عزیزم، من همیشه اینجام تا آرومت کنم 🌸
برای آرامش و تسکین فوری، حتماً یک کیسه آب گرم ملایم روی دل یا پایین کمرت بذار و یک دمنوش بابونه یا دارچین با نبات بنوش.
یادت نره حسن دوست‌داشتنی‌ات عاشقانه هواتو داره و هر کاری بگی برات انجام میده! ❤️`,
        timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackReply]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([INITIAL_GREETING]);
    localStorage.removeItem('niosha_period_chat_history');
  };

  return (
    <div className="flex flex-col h-[520px] max-h-[70vh] rounded-2xl bg-gradient-to-b from-[#180a17]/90 to-[#0e040d]/95 border border-rose-700/40 overflow-hidden shadow-2xl">
      {/* Chat Sub-Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-rose-950/40 border-b border-rose-800/30 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="relative w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center shadow-md">
            <Bot className="w-4 h-4 text-white" />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#180a17]" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>دستیار هوشمند سلامت و آرامش نیوشا</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                پشتیبان هوشمند حسن ❤️
              </span>
            </div>
            <div className="text-[10px] text-neutral-400">
              پاسخ‌های علمی به زبان خودمانی و راهکارهای تسکین درد
            </div>
          </div>
        </div>

        <button
          onClick={handleClearChat}
          className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-[11px] flex items-center gap-1"
          title="شروع مجدد گفتگو"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">پاک کردن</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-3.5 scrollbar-thin">
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
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow ${
                  isUser
                    ? 'bg-gradient-to-tr from-rose-600 to-pink-500 text-white'
                    : 'bg-gradient-to-tr from-purple-700 to-pink-700 text-rose-200'
                }`}
              >
                {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>

              {/* Bubble */}
              <div
                className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-3 sm:p-3.5 text-xs sm:text-[13px] leading-relaxed shadow-lg ${
                  isUser
                    ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-tr-none'
                    : 'bg-[#230f21] border border-rose-700/40 text-neutral-100 rounded-tl-none'
                }`}
              >
                <div className="whitespace-pre-line break-words font-vazir">{msg.text}</div>
                <div
                  className={`mt-1.5 text-[9px] ${
                    isUser ? 'text-rose-200/80 text-left' : 'text-neutral-400 text-right'
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
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-700 to-pink-700 flex items-center justify-center shrink-0 text-rose-200">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="bg-[#230f21] border border-rose-700/40 rounded-2xl rounded-tl-none p-3 text-xs text-rose-300 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-rose-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-rose-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-rose-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              <span className="text-[11px] text-neutral-400 mr-1">در حال نوشتن راهکار علمی و آرامش‌بخش برای نیوشا...</span>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Questions Pill Bar */}
      <div className="px-3 py-2 bg-black/40 border-t border-rose-900/30 overflow-x-auto scrollbar-none flex items-center gap-1.5">
        <span className="text-[10px] text-neutral-400 whitespace-nowrap shrink-0 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-rose-400" />
          <span>سوالات سریع:</span>
        </span>
        {QUICK_QUESTIONS.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(q)}
            disabled={isLoading}
            className="shrink-0 px-2.5 py-1 rounded-full bg-rose-950/60 hover:bg-rose-900 border border-rose-700/40 text-rose-200 hover:text-white text-[11px] transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Chat Input Field */}
      <div className="p-3 bg-black/60 border-t border-rose-800/40">
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
            placeholder="سوالت در مورد پریود، دل‌درد، تغذیه یا حال روحی رو بنویس..."
            disabled={isLoading}
            className="flex-1 bg-[#1a0c18] border border-rose-800/50 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-400 transition-colors"
          />

          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-md flex items-center justify-center"
            title="ارسال پیام"
          >
            <Send className="w-4 h-4 rotate-180" />
          </button>
        </form>
      </div>
    </div>
  );
};
