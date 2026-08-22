import React from 'react';
import { motion } from 'motion/react';
import { Plus, ZoomIn, Edit3, Trash2 } from 'lucide-react';
import { MemoryPhoto } from '../types';
import { useTheme } from '../context/ThemeContext';

interface PhotoGalleryProps {
  memories: MemoryPhoto[];
  onSelectPhoto: (photo: MemoryPhoto) => void;
  onOpenAddModal: () => void;
  onEditPhoto: (photo: MemoryPhoto) => void;
  onDeletePhoto: (id: string) => void;
}

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({
  memories,
  onSelectPhoto,
  onOpenAddModal,
  onEditPhoto,
  onDeletePhoto,
}) => {
  const { theme } = useTheme();

  return (
    <section id="photos-section" className="w-full max-w-6xl mx-auto px-4 py-16 font-vazir">
      {/* Header */}
      <div className="text-center mb-12">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
          خاطرات تصویری ما
        </h2>
        <p className="text-xs sm:text-sm text-neutral-400">
          خاطراتی که تا به الان جا مونده از خوشحالی هات
        </p>

        <div className="mt-4 flex justify-center">
          <button
            onClick={onOpenAddModal}
            style={{
              backgroundColor: theme.pillBg,
              borderColor: theme.pillBorder,
              color: theme.accentColor,
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs hover:scale-105 transition-all cursor-pointer shadow-md"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ثبت عکس جدید</span>
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {memories.map((photo) => (
          <div
            key={photo.id}
            style={{
              backgroundColor: theme.cardBg,
              borderColor: theme.cardBorder,
            }}
            className="group relative rounded-2xl overflow-hidden border transition-all duration-500 flex flex-col shadow-xl hover:scale-[1.02]"
          >
            {/* Top Action Buttons (Edit / Delete) */}
            <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditPhoto(photo);
                }}
                className="w-8 h-8 rounded-full bg-black/75 hover:bg-black text-rose-300 hover:text-white border border-white/20 flex items-center justify-center backdrop-blur-md transition-all shadow-md cursor-pointer hover:scale-110"
                title="ویرایش عکس و متن"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`آیا از حذف عکس «${photo.title}» مطمئن هستید؟`)) {
                    onDeletePhoto(photo.id);
                  }
                }}
                className="w-8 h-8 rounded-full bg-black/75 hover:bg-red-950/80 text-neutral-300 hover:text-red-400 border border-white/20 flex items-center justify-center backdrop-blur-md transition-all shadow-md cursor-pointer hover:scale-110"
                title="حذف خاطره"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Image Container */}
            <div
              className="relative aspect-square sm:aspect-[4/3] w-full overflow-hidden cursor-pointer bg-neutral-900"
              onClick={() => onSelectPhoto(photo)}
            >
              <img
                src={photo.imageUrl}
                alt={photo.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                referrerPolicy="no-referrer"
                loading="lazy"
              />

              {/* Hover overlay with zoom icon */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white">
                  <ZoomIn className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Content Container */}
            <div className="p-5 text-center flex-1 flex flex-col justify-center">
              <h3 className="text-base sm:text-lg font-bold text-white mb-2 transition-colors">
                {photo.title}
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed line-clamp-2">
                {photo.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};



