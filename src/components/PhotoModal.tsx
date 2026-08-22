import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Edit3 } from 'lucide-react';
import { MemoryPhoto } from '../types';

interface PhotoModalProps {
  photo: MemoryPhoto | null;
  onClose: () => void;
  onEditPhoto?: (photo: MemoryPhoto) => void;
}

export const PhotoModal: React.FC<PhotoModalProps> = ({ photo, onClose, onEditPhoto }) => {
  // Listen for Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!photo) return null;

  return (
    <AnimatePresence>
      <div
        id="photo-modal-backdrop"
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto font-vazir cursor-pointer select-none"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-2xl max-h-[92dvh] overflow-y-auto bg-[#140812] border border-rose-900/60 rounded-3xl shadow-2xl flex flex-col cursor-default select-text my-auto"
        >
          {/* Top Actions */}
          <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 flex items-center gap-2">
            {onEditPhoto && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditPhoto(photo);
                }}
                className="p-2 sm:p-2.5 rounded-full bg-black/70 hover:bg-black text-rose-300 hover:text-white transition-all cursor-pointer shadow-lg border border-white/10"
                title="ویرایش عکس"
              >
                <Edit3 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 sm:p-2.5 rounded-full bg-black/70 hover:bg-black text-neutral-300 hover:text-white transition-all cursor-pointer shadow-lg border border-white/10"
              title="بستن (Esc)"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Large Image */}
          <div className="relative aspect-[4/3] sm:aspect-[16/10] max-h-[55vh] w-full bg-black flex items-center justify-center">
            <img
              src={photo.imageUrl}
              alt={photo.title}
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Caption */}
          <div className="p-4 sm:p-6 bg-gradient-to-b from-[#140812] to-[#10060e]">
            <div className="mb-2 sm:mb-2.5">
              <h3 className="text-base sm:text-xl font-bold text-white">
                {photo.title}
              </h3>
            </div>

            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed text-justify">
              {photo.description}
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};


