import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Edit2, Trash2, Check } from 'lucide-react';
import { DiaryEntry } from '../types';
import { useTheme } from '../context/ThemeContext';
import { formatToPersianShamsiDate } from '../utils/dateCalculations';

interface DiarySectionProps {
  entries: DiaryEntry[];
  onAddEntry: (author: string, content: string, date: string) => void;
  onDeleteEntry: (id: string) => void;
  onUpdateEntry: (id: string, newContent: string) => void;
}

export const DiarySection: React.FC<DiarySectionProps> = ({
  entries,
  onAddEntry,
  onDeleteEntry,
  onUpdateEntry,
}) => {
  const { theme } = useTheme();
  const [author, setAuthor] = useState<'حسن' | 'نیوشا' | string>('حسن');
  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    // Generate Persian date representation for today with Persian digits
    const todayPersian = formatToPersianShamsiDate(new Date().toISOString());

    onAddEntry(author.trim() || 'حسن', content.trim(), todayPersian);
    setContent('');
  };

  const handleStartEdit = (entry: DiaryEntry) => {
    setEditingId(entry.id);
    setEditContent(entry.content);
  };

  const handleSaveEdit = (id: string) => {
    if (editContent.trim()) {
      onUpdateEntry(id, editContent.trim());
    }
    setEditingId(null);
  };

  return (
    <section id="diary-section" className="w-full max-w-5xl mx-auto px-4 py-16 font-vazir">
      {/* Eyebrow and Section Titles */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="w-6 h-[1.5px] rounded-full" style={{ backgroundColor: theme.primaryColor }} />
          <span className="text-xs font-semibold" style={{ color: theme.accentColor }}>دفترچه خاطرات</span>
          <span className="w-6 h-[1.5px] rounded-full" style={{ backgroundColor: theme.primaryColor }} />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
          ثبت لحظات زیبای ما
        </h2>
        <p className="text-xs sm:text-sm text-neutral-400 max-w-lg mx-auto leading-relaxed">
          اینجا مکانیه برای من و تو که خاطرات، حس‌ها و حرف‌های دلمون رو برای همیشه ثبت کنیم.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Timeline Notes List */}
        <div className="lg:col-span-7 space-y-6 relative">
          {/* Vertical subtle timeline line */}
          <div
            className="absolute top-6 bottom-6 right-5 w-[1.5px] hidden sm:block opacity-40"
            style={{
              backgroundImage: `linear-gradient(to bottom, ${theme.primaryColor}, transparent)`,
            }}
          />

          <AnimatePresence>
            {entries.map((entry) => {
              const isNiosha = entry.author.includes('نیوشا');
              const isEditing = editingId === entry.id;

              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4 }}
                  className="relative sm:pr-10"
                >
                  {/* Timeline connector dot */}
                  <div
                    style={{ backgroundColor: theme.primaryColor }}
                    className="absolute top-5 right-3.5 w-3 h-3 rounded-full border-2 border-black shadow-lg hidden sm:block z-10"
                  />

                  {/* Note Card */}
                  <div
                    style={{
                      backgroundColor: theme.cardBg,
                      borderColor: theme.cardBorder,
                    }}
                    className="rounded-2xl border p-5 sm:p-6 shadow-xl backdrop-blur-md transition-all"
                  >
                    {/* Top Row: Author Avatar, Name, Date, Action icons */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white shadow-inner ${
                            isNiosha
                              ? 'bg-gradient-to-tr from-pink-600 to-rose-400'
                              : `bg-gradient-to-tr ${theme.buttonGradient}`
                          }`}
                        >
                          {entry.author.charAt(0)}
                        </div>
                        <div>
                          <h4 className="text-sm sm:text-base font-bold text-white">
                            {entry.author}
                          </h4>
                          <span className="text-[10px] text-neutral-400">
                            {formatToPersianShamsiDate(entry.date || entry.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 text-neutral-400">
                        {isEditing ? (
                          <button
                            onClick={() => handleSaveEdit(entry.id)}
                            style={{ color: theme.accentColor }}
                            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                            title="ذخیره ویرایش"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStartEdit(entry)}
                            className="p-1.5 rounded-lg hover:bg-neutral-800/80 hover:text-white transition-colors cursor-pointer"
                            title="ویرایش خاطره"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => onDeleteEntry(entry.id)}
                          className="p-1.5 rounded-lg hover:bg-neutral-800/80 hover:text-red-400 transition-colors cursor-pointer"
                          title="حذف خاطره"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Note Content */}
                    {isEditing ? (
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        style={{
                          backgroundColor: 'rgba(0, 0, 0, 0.4)',
                          borderColor: theme.primaryColor,
                        }}
                        className="w-full border rounded-xl p-3 text-xs sm:text-sm text-neutral-200 focus:outline-none resize-none min-h-[80px]"
                      />
                    ) : (
                      <p className="text-xs sm:text-sm text-neutral-200/90 leading-relaxed text-justify whitespace-pre-wrap">
                        {entry.content}
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {entries.length === 0 && (
            <div
              style={{
                backgroundColor: theme.cardBg,
                borderColor: theme.cardBorder,
              }}
              className="text-center py-12 rounded-2xl border border-dashed text-neutral-400 text-xs"
            >
              هنوز خاطره‌ای ثبت نشده است. اولین نفری باشید که می‌نویسید!
            </div>
          )}
        </div>

        {/* New Note Form Card */}
        <div className="lg:col-span-5">
          <div
            style={{
              backgroundColor: theme.cardBg,
              borderColor: theme.cardBorder,
            }}
            className="rounded-2xl border p-6 sm:p-7 shadow-xl sticky top-6 backdrop-blur-md"
          >
            <h3 className="text-base sm:text-lg font-bold text-white mb-6 text-center">
              نوشتن خاطره جدید
            </h3>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Author select */}
              <div>
                <label className="block text-xs text-neutral-400 mb-2 font-medium">
                  نویسنده
                </label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setAuthor('حسن')}
                    style={{
                      backgroundColor: author === 'حسن' ? theme.pillBg : 'rgba(0, 0, 0, 0.3)',
                      borderColor: author === 'حسن' ? theme.primaryColor : 'rgba(255, 255, 255, 0.1)',
                      color: author === 'حسن' ? '#ffffff' : '#a3a3a3',
                    }}
                    className="py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer"
                  >
                    حسن 🤵
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthor('نیوشا')}
                    style={{
                      backgroundColor: author === 'نیوشا' ? theme.pillBg : 'rgba(0, 0, 0, 0.3)',
                      borderColor: author === 'نیوشا' ? theme.primaryColor : 'rgba(255, 255, 255, 0.1)',
                      color: author === 'نیوشا' ? '#ffffff' : '#a3a3a3',
                    }}
                    className="py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer"
                  >
                    نیوشا 👰
                  </button>
                </div>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="حسن یا نیوشا..."
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                  }}
                  className="w-full border rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Textarea */}
              <div>
                <label className="block text-xs text-neutral-400 mb-2 font-medium">
                  متن خاطره
                </label>
                <textarea
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="امروز چه احساسی داشتی؟ چه اتفاق قشنگی افتاد؟"
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                  }}
                  className="w-full border rounded-xl p-4 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none transition-colors resize-none leading-relaxed"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!content.trim()}
                className="w-full py-3 rounded-full bg-white text-black font-bold text-xs sm:text-sm hover:bg-neutral-200 transition-all shadow-lg active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
              >
                <span>ثبت در دفترچه</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

