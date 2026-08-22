import React from 'react';
import { motion } from 'motion/react';
import { Heart } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const Footer: React.FC = () => {
  const { theme } = useTheme();

  return (
    <footer className="w-full py-16 text-center relative overflow-hidden font-vazir">
      {/* Centered romantic message */}
      <div className="flex flex-col items-center justify-center space-y-4">
        <p
          style={{ color: theme.primaryColor }}
          className="text-sm sm:text-base md:text-lg font-bold flex items-center justify-center gap-2"
        >
          <span>این فقط 100 روز اول بود</span>
          <Heart className="w-4 h-4 text-rose-500 fill-rose-500 inline animate-pulse" />
          <span>تازه داستان شروع شده</span>
        </p>

        {/* 4 Dots matching theme */}
        <div className="flex items-center justify-center gap-2 pt-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.primaryColor }} />
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.primaryColor }} />
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.primaryColor }} />
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.primaryColor }} />
        </div>

        <span className="text-[11px] text-neutral-400/80 pt-4 font-script text-base tracking-wide">
          Hasan & Newsha Forever
        </span>
      </div>
    </footer>
  );
};

