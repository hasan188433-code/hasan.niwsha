import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Star, Heart, Plus, Moon } from 'lucide-react';
import { StarMessage } from '../types';
import { STAR_MESSAGES } from '../data/initialData';

interface StarrySkyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StarrySkyModal: React.FC<StarrySkyModalProps> = ({ isOpen, onClose }) => {
  const [stars, setStars] = useState<StarMessage[]>(STAR_MESSAGES);
  const [selectedStar, setSelectedStar] = useState<StarMessage | null>(null);
  const [isAddingStar, setIsAddingStar] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newMessage, setNewMessage] = useState('');

  // Close on Escape key
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAddStar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newMessage.trim()) return;

    const newStar: StarMessage = {
      id: `star-${Date.now()}`,
      title: newTitle.trim(),
      message: newMessage.trim(),
      x: 15 + Math.random() * 70,
      y: 20 + Math.random() * 60,
      size: 26 + Math.floor(Math.random() * 8),
    };

    setStars((prev) => [...prev, newStar]);
    setSelectedStar(newStar);
    setNewTitle('');
    setNewMessage('');
    setIsAddingStar(false);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl overflow-y-auto cursor-pointer font-vazir"
    >
      {/* Background Animated Stars Canvas */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 60 }).map((_, i) => {
          const top = (i * 17) % 100;
          const left = (i * 23) % 100;
          const size = (i % 3) + 1;
          const duration = 2 + (i % 4);
          return (
            <div
              key={i}
              className="absolute rounded-full bg-white animate-pulse"
              style={{
                top: `${top}%`,
                left: `${left}%`,
                width: `${size}px`,
                height: `${size}px`,
                animationDuration: `${duration}s`,
                opacity: 0.3 + (i % 5) * 0.15,
              }}
            />
          );
        })}
      </div>

      {/* Moon decorative glow */}
      <div className="absolute top-10 right-12 w-28 h-28 rounded-full bg-rose-200/10 blur-xl pointer-events-none" />
      <Moon className="absolute top-12 right-14 w-12 h-12 text-rose-200/40 pointer-events-none" />

      {/* Main Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl h-[88dvh] sm:h-[85vh] rounded-3xl border border-rose-900/50 bg-[#0d050f]/80 p-4 sm:p-6 flex flex-col justify-between overflow-hidden shadow-[0_0_50px_rgba(225,29,72,0.2)] cursor-default my-auto"
      >
        {/* Top Bar */}
        <div className="flex items-center justify-between z-20 pb-3 sm:pb-4 border-b border-rose-900/40 gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400 animate-spin" style={{ animationDuration: '6s' }} />
            <h3 className="text-xs sm:text-lg font-bold text-white font-vazir truncate">
              آسمان عشق حسن و نیوشا ✨
            </h3>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <button
              onClick={() => setIsAddingStar(!isAddingStar)}
              className="px-2.5 sm:px-3.5 py-1.5 rounded-full bg-rose-950/60 border border-rose-800 text-rose-300 text-[11px] sm:text-xs hover:bg-rose-900/80 transition-all flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>کاشتن ستاره</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-full bg-neutral-900/80 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Sky Interactive Area */}
        <div className="relative flex-1 w-full my-2 sm:my-4">
          <p className="absolute top-1 sm:top-2 left-1/2 -translate-x-1/2 text-[11px] sm:text-xs text-rose-300/60 text-center pointer-events-none z-10 w-full px-2">
            روی هر ستاره کلیک کن تا راز یا حرف دلی که برات گذاشته شده رو بخونی
          </p>

          {/* Interactive Stars */}
          {stars.map((star) => (
            <motion.button
              key={star.id}
              onClick={() => setSelectedStar(star)}
              whileHover={{ scale: 1.3 }}
              whileTap={{ scale: 0.9 }}
              style={{
                top: `${star.y}%`,
                left: `${star.x}%`,
              }}
              className="absolute group -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 p-2"
            >
              <div className="relative">
                <Star className="w-5 h-5 sm:w-6 sm:h-6 text-amber-200 fill-amber-300/80" />
                <span className="absolute -bottom-5 right-1/2 translate-x-1/2 whitespace-nowrap text-[10px] text-pink-200 bg-black/70 px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity border border-rose-500/30 pointer-events-none">
                  {star.title}
                </span>
              </div>
            </motion.button>
          ))}

          {/* Form to add a new star */}
          <AnimatePresence>
            {isAddingStar && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute inset-x-2 sm:inset-x-4 top-6 sm:top-10 max-w-md mx-auto z-30 p-4 sm:p-6 rounded-2xl bg-[#1a0818] border border-rose-700/60 shadow-2xl backdrop-blur-lg"
              >
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-300 fill-amber-300" />
                    <span>کاشتن ستاره آرزو در آسمان</span>
                  </h4>
                  <button
                    onClick={() => setIsAddingStar(false)}
                    className="text-neutral-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleAddStar} className="space-y-3">
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="نام ستاره (مثلاً ستاره همیشگی من)"
                    className="w-full bg-[#120511] border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500"
                  />
                  <textarea
                    rows={3}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="پیام یا آرزویی که درون ستاره ثبت میشه..."
                    className="w-full bg-[#120511] border border-neutral-700 rounded-xl p-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500 resize-none"
                  />
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                  >
                    درخشان کردن ستاره در آسمان
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Selected Star Message Box */}
          <AnimatePresence>
            {selectedStar && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute inset-x-2 sm:inset-x-4 bottom-2 sm:bottom-4 max-w-lg mx-auto z-30 p-4 sm:p-6 rounded-2xl bg-[#1c081a]/95 border border-rose-500/50 shadow-2xl backdrop-blur-md text-center max-h-[60vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400 fill-rose-400" />
                    <h4 className="text-xs sm:text-sm font-bold text-rose-300 font-vazir">
                      {selectedStar.title}
                    </h4>
                  </div>
                  <button
                    onClick={() => setSelectedStar(null)}
                    className="p-1 rounded-full text-neutral-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed text-justify mb-2">
                  {selectedStar.message}
                </p>

                <span className="text-[10px] text-rose-400/70 font-script text-base">
                  Forever with love, Hasan & Newsha ❤️
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Bar */}
        <div className="text-center pt-3 border-t border-rose-900/30 text-[11px] text-neutral-400 flex items-center justify-center gap-1">
          <span>این آسمان همیشه روشن خواهد ماند</span>
          <Heart className="w-3 h-3 text-rose-500 fill-rose-500 inline" />
        </div>
      </div>
    </div>
  );
};
