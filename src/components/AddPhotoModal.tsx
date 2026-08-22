import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import { MemoryPhoto } from '../types';
import { formatToPersianShamsiDate } from '../utils/dateCalculations';

interface AddPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPhoto: (photo: Omit<MemoryPhoto, 'id'>) => void;
}

export const AddPhotoModal: React.FC<AddPhotoModalProps> = ({
  isOpen,
  onClose,
  onAddPhoto,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [date, setDate] = useState(() => formatToPersianShamsiDate(new Date().toISOString()));

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, filename: file.name }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success && data.url) {
              setImageUrl(data.url);
            } else {
              setImageUrl(base64);
            }
          })
          .catch(() => setImageUrl(base64));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !imageUrl.trim()) return;

    let finalImageUrl = imageUrl.trim();

    if (finalImageUrl.startsWith('data:image')) {
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: finalImageUrl }),
        });
        const data = await res.json();
        if (data.success && data.url) {
          finalImageUrl = data.url;
        }
      } catch (err) {
        console.error('Error uploading image to server:', err);
      }
    }

    onAddPhoto({
      title: title.trim(),
      description: description.trim() || 'یک خاطره قشنگ و فراموش‌نشدنی',
      imageUrl: finalImageUrl,
      date: date.trim() || formatToPersianShamsiDate(new Date().toISOString()),
    });

    setTitle('');
    setDescription('');
    setImageUrl('');
    setDate(formatToPersianShamsiDate(new Date().toISOString()));
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto cursor-pointer font-vazir"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg max-h-[92dvh] overflow-y-auto bg-[#140812] border border-rose-900/60 rounded-3xl p-5 sm:p-7 shadow-2xl cursor-default my-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-white font-vazir flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-rose-400" />
            <span>افزودن خاطره تصویری جدید</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-neutral-400 mb-1.5 font-medium">
              عنوان خاطره (مثلاً: اولین قرار عاشقانه)
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="یک عنوان دلنشین..."
              className="w-full bg-[#1c0919] border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs text-neutral-400 mb-1.5 font-medium">
              تاریخ خاطره (مثلاً: ۲۰ مرداد ۱۴۰۵)
            </label>
            <input
              type="text"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              placeholder="مثلاً: ۲۰ مرداد ۱۴۰۵..."
              className="w-full bg-[#1c0919] border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs text-neutral-400 mb-1.5 font-medium">
              توضیح یا حس اون روز
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="درباره این لحظه و حس اون روز بنویس..."
              className="w-full bg-[#1c0919] border border-neutral-800 rounded-xl p-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs text-neutral-400 mb-1.5 font-medium">
              آدرس اینترنتی عکس یا بارگذاری فایل
            </label>
            <div className="flex flex-col gap-2">
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full bg-[#1c0919] border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500"
              />

              <label className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-dashed border-rose-900/60 bg-rose-950/20 hover:bg-rose-900/30 text-rose-300 text-xs cursor-pointer transition-colors">
                <Upload className="w-4 h-4" />
                <span>یا انتخاب عکس از دستگاه</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {imageUrl && (
              <div className="mt-3 relative aspect-[16/9] rounded-xl overflow-hidden border border-rose-800/40">
                <img
                  src={imageUrl}
                  alt="پیش نمایش"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={!title.trim() || !imageUrl.trim()}
              className="w-full py-3 rounded-full bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs sm:text-sm transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              افزودن به گالری خاطرات ما
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
