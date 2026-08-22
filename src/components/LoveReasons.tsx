import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Sparkles, ChevronDown } from 'lucide-react';
import { LoveReason } from '../types';
import { INITIAL_LOVE_REASONS } from '../data/initialData';
import { useTheme } from '../context/ThemeContext';

interface LoveReasonsProps {
  onOpenSky: () => void;
}

export const LoveReasons: React.FC<LoveReasonsProps> = ({ onOpenSky }) => {
  const { theme } = useTheme();
  const [reasons] = useState<LoveReason[]>(INITIAL_LOVE_REASONS);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const toggleReason = (id: string) => {
    setSelectedReason(selectedReason === id ? null : id);
  };

  const displayedReasons = showAll ? reasons : reasons.slice(0, 3);

  return (
    <section id="reasons-section" className="w-full max-w-5xl mx-auto px-4 py-16 text-center font-vazir">
      {/* Eyebrow */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <span className="w-6 h-[1.5px] rounded-full" style={{ backgroundColor: theme.primaryColor }} />
        <span className="text-xs font-semibold" style={{ color: theme.accentColor }}>چرا دوست دارم</span>
        <span className="w-6 h-[1.5px] rounded-full" style={{ backgroundColor: theme.primaryColor }} />
      </div>

      {/* Main Title */}
      <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
        دلایلی که دوستت دارم
      </h2>

      {/* Subtitle */}
      <p className="text-xs sm:text-sm text-neutral-400 mb-12 max-w-md mx-auto">
        هزاران دلیل برای دوست داشتنت وجود داره، این کارت ها فقط چندتاشونه...
      </p>

      {/* 3 Dashed Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <AnimatePresence>
          {displayedReasons.map((reason) => {
            const isExpanded = selectedReason === reason.id;
            return (
              <div
                key={reason.id}
                onClick={() => toggleReason(reason.id)}
                style={{
                  backgroundColor: isExpanded ? theme.cardBg : 'rgba(0, 0, 0, 0.4)',
                  borderColor: isExpanded ? theme.primaryColor : theme.cardBorder,
                }}
                className="group relative rounded-2xl p-8 cursor-pointer transition-all duration-300 border border-dashed backdrop-blur-sm flex flex-col items-center justify-center min-h-[190px] shadow-lg hover:scale-[1.02]"
              >
                {/* Heart Icon */}
                <div
                  className="w-12 h-12 mb-5 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                  style={{ color: theme.primaryColor }}
                >
                  <Heart className="w-7 h-7 stroke-[1.5] group-hover:fill-current" />
                </div>

                {/* Reason Text */}
                <p className="text-sm sm:text-base text-neutral-200 leading-relaxed font-medium">
                  {reason.text}
                </p>

                {/* Expanded note if clicked */}
                {isExpanded && reason.expandedNote && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 pt-4 border-t border-white/10 text-xs leading-relaxed"
                    style={{ color: theme.accentColor }}
                  >
                    {reason.expandedNote}
                  </motion.div>
                )}

                <span
                  className="mt-3 text-[10px] opacity-70 group-hover:opacity-100 transition-opacity"
                  style={{ color: theme.accentColor }}
                >
                  {isExpanded ? 'بستن یادداشت' : 'برای جزئیات لمس کنید'}
                </span>
              </div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Show more toggle */}
      {reasons.length > 3 && (
        <div className="mb-8">
          <button
            onClick={() => setShowAll(!showAll)}
            style={{ color: theme.accentColor }}
            className="text-xs hover:underline inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>{showAll ? 'نمایش ۳ دلیل اصلی' : `مشاهده دلایل بیشتر (${reasons.length - 3}+)`}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAll ? 'rotate-180' : ''}`} />
          </button>
        </div>
      )}

      {/* Enter Sky Button */}
      <motion.div
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
        className="inline-block"
      >
        <button
          id="enter-sky-btn"
          onClick={onOpenSky}
          className={`px-8 py-3.5 rounded-full bg-gradient-to-r ${theme.buttonGradient} text-white font-semibold text-sm shadow-xl hover:shadow-2xl flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 border border-white/20`}
        >
          <Sparkles className="w-4 h-4 animate-spin" style={{ animationDuration: '4s' }} />
          <span>ورود به آسمان (خانه)</span>
          <Heart className="w-3.5 h-3.5 fill-white" />
        </button>
      </motion.div>
    </section>
  );
};

