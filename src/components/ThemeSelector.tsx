import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Palette, Check, Sparkles } from 'lucide-react';
import { useTheme, THEMES, ThemeMode } from '../context/ThemeContext';

interface ThemeSelectorProps {
  compact?: boolean;
  className?: string;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ compact = false, className = '' }) => {
  const { theme, themeMode, setThemeMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const themeOptions: ThemeMode[] = ['rose', 'sapphire', 'amethyst'];

  return (
    <div className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        id="theme-selector-btn"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 transition-all duration-300 backdrop-blur-md cursor-pointer shadow-lg active:scale-90 ${
          compact
            ? 'px-2.5 py-1.5 rounded-xl border text-xs'
            : 'px-3.5 py-2 sm:py-2.5 rounded-2xl border text-xs'
        }`}
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderColor: 'rgba(255, 255, 255, 0.2)',
          color: '#ffffff',
        }}
        title="تغییر تم و رنگ‌بندی سایت"
      >
        <Palette className="w-3.5 h-3.5" style={{ color: theme.primaryColor }} />
        {!compact && <span className="text-[11px] font-bold tracking-tight">تم: {theme.name}</span>}
        {compact && <span className="text-[10px] font-bold">{theme.name.split(' ')[0]}</span>}
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop click to close */}
            <div
              className="fixed inset-0 z-30"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              style={{
                backgroundColor: theme.cardBg,
                borderColor: theme.cardBorder,
              }}
              className="absolute top-11 right-0 z-40 w-64 max-w-[calc(100vw-24px)] p-3 rounded-2xl border shadow-2xl backdrop-blur-xl text-right font-vazir"
            >
              <div className="flex items-center justify-between mb-2.5 px-1 border-b border-white/10 pb-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>انتخاب رنگ تم سایت</span>
                </span>
                <span className="text-[10px] text-neutral-400">۳ رنگ اختصاصی</span>
              </div>

              <div className="space-y-1.5">
                {themeOptions.map((mode) => {
                  const item = THEMES[mode];
                  const isSelected = themeMode === mode;

                  return (
                    <button
                      key={mode}
                      onClick={() => {
                        setThemeMode(mode);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-white/15 text-white font-bold shadow-inner'
                          : 'hover:bg-white/5 text-neutral-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {/* Theme preview swatch */}
                        <div
                          className="w-4 h-4 rounded-full border border-white/30 shadow-md flex items-center justify-center"
                          style={{ backgroundColor: item.primaryColor }}
                        />
                        <div className="flex flex-col text-right">
                          <span className="text-xs font-semibold">{item.badge}</span>
                          <span className="text-[10px] text-neutral-400">{item.subtitle}</span>
                        </div>
                      </div>

                      {isSelected && (
                        <Check className="w-4 h-4 text-emerald-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
