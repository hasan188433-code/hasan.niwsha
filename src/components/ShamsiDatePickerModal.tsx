import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, ChevronRight, ChevronLeft, Calendar as CalendarIcon, Check, Sparkles } from 'lucide-react';
import {
  PERSIAN_MONTHS,
  PERSIAN_WEEK_DAYS,
  getJalaliMonthDays,
  gregorianToJalali,
  jalaliToGregorian,
  dateToISODateString,
  getJalaliWeekday,
  formatJalaliToString,
} from '../utils/jalali';
import { toPersianDigits } from '../utils/dateCalculations';

interface ShamsiDatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDateStr: string; // ISO format 'YYYY-MM-DD'
  onSelectDate: (isoDateStr: string) => void;
  title?: string;
}

export const ShamsiDatePickerModal: React.FC<ShamsiDatePickerModalProps> = ({
  isOpen,
  onClose,
  selectedDateStr,
  onSelectDate,
  title = 'انتخاب تاریخ شروع پریود در تقویم شمسی',
}) => {
  // Parse initial date
  const initialDate = selectedDateStr ? new Date(selectedDateStr) : new Date();
  const initialJalali = gregorianToJalali(
    initialDate.getFullYear(),
    initialDate.getMonth() + 1,
    initialDate.getDate()
  );

  const today = new Date();
  const todayJalali = gregorianToJalali(
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate()
  );

  const [viewYear, setViewYear] = useState<number>(initialJalali.jy);
  const [viewMonth, setViewMonth] = useState<number>(initialJalali.jm);
  const [tempSelected, setTempSelected] = useState<{ jy: number; jm: number; jd: number }>(initialJalali);

  if (!isOpen) return null;

  const daysInCurrentMonth = getJalaliMonthDays(viewYear, viewMonth);
  const startDayOfWeek = getJalaliWeekday(viewYear, viewMonth, 1);

  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const handleSelectDay = (dayNumber: number) => {
    setTempSelected({ jy: viewYear, jm: viewMonth, jd: dayNumber });
  };

  const handleConfirm = () => {
    const { gy, gm, gd } = jalaliToGregorian(tempSelected.jy, tempSelected.jm, tempSelected.jd);
    const dateObj = new Date(gy, gm - 1, gd, 12, 0, 0);
    const isoStr = dateToISODateString(dateObj);
    onSelectDate(isoStr);
    onClose();
  };

  const handleQuickSelectDaysAgo = (daysAgo: number) => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - daysAgo);
    const jalali = gregorianToJalali(
      targetDate.getFullYear(),
      targetDate.getMonth() + 1,
      targetDate.getDate()
    );
    setViewYear(jalali.jy);
    setViewMonth(jalali.jm);
    setTempSelected(jalali);
  };

  // Generate blank spaces for days before the 1st of month
  const blanks = Array.from({ length: startDayOfWeek }, (_, i) => i);
  const days = Array.from({ length: daysInCurrentMonth }, (_, i) => i + 1);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 font-vazir"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#160613] border border-rose-600/50 rounded-3xl p-4 sm:p-6 shadow-2xl text-white relative overflow-hidden"
      >
        {/* Header Ambient Glow */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-48 bg-rose-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-rose-900/40 relative z-10">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-rose-600 to-pink-600 shadow-md">
              <CalendarIcon className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{title}</h3>
              <p className="text-[11px] text-rose-300">لمس مستقیم روز شروع در تقویم خورشیدی</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Selection Presets */}
        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] text-neutral-400 shrink-0">دسترسی سریع:</span>
          <button
            onClick={() => handleQuickSelectDaysAgo(0)}
            className="px-2.5 py-1 rounded-full bg-rose-950/60 hover:bg-rose-900 border border-rose-700/40 text-rose-200 hover:text-white text-[11px] transition-all shrink-0 cursor-pointer"
          >
            امروز ({toPersianDigits(todayJalali.jd)} {PERSIAN_MONTHS[todayJalali.jm - 1]})
          </button>
          <button
            onClick={() => handleQuickSelectDaysAgo(1)}
            className="px-2.5 py-1 rounded-full bg-rose-950/60 hover:bg-rose-900 border border-rose-700/40 text-rose-200 hover:text-white text-[11px] transition-all shrink-0 cursor-pointer"
          >
            دیروز
          </button>
          <button
            onClick={() => handleQuickSelectDaysAgo(2)}
            className="px-2.5 py-1 rounded-full bg-rose-950/60 hover:bg-rose-900 border border-rose-700/40 text-rose-200 hover:text-white text-[11px] transition-all shrink-0 cursor-pointer"
          >
            ۲ روز پیش
          </button>
          <button
            onClick={() => handleQuickSelectDaysAgo(4)}
            className="px-2.5 py-1 rounded-full bg-rose-950/60 hover:bg-rose-900 border border-rose-700/40 text-rose-200 hover:text-white text-[11px] transition-all shrink-0 cursor-pointer"
          >
            ۴ روز پیش
          </button>
        </div>

        {/* Month & Year Navigation Header */}
        <div className="mt-4 flex items-center justify-between bg-black/40 border border-rose-900/40 rounded-2xl px-3 py-2">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-900 text-rose-200 hover:text-white transition-all cursor-pointer flex items-center gap-1 text-xs"
            title="ماه قبل"
          >
            <ChevronRight className="w-4 h-4" />
            <span className="text-[11px] hidden sm:inline">ماه قبل</span>
          </button>

          <div className="text-center">
            <div className="text-sm font-bold text-white flex items-center justify-center gap-1.5">
              <span>{PERSIAN_MONTHS[viewMonth - 1]}</span>
              <span className="text-rose-300 font-bold">{toPersianDigits(viewYear)}</span>
            </div>
          </div>

          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-900 text-rose-200 hover:text-white transition-all cursor-pointer flex items-center gap-1 text-xs"
            title="ماه بعد"
          >
            <span className="text-[11px] hidden sm:inline">ماه بعد</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Week Days Header */}
        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-rose-300/80 py-1 border-b border-rose-900/30">
          {PERSIAN_WEEK_DAYS.map((wd, i) => (
            <div key={i} className={`py-0.5 ${i === 6 ? 'text-pink-400 font-bold' : ''}`}>
              {wd}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="mt-2 grid grid-cols-7 gap-1 sm:gap-1.5 text-center">
          {blanks.map((_, i) => (
            <div key={`blank-${i}`} className="h-9 sm:h-10 rounded-xl" />
          ))}

          {days.map((day) => {
            const isSelected =
              tempSelected.jy === viewYear &&
              tempSelected.jm === viewMonth &&
              tempSelected.jd === day;

            const isToday =
              todayJalali.jy === viewYear &&
              todayJalali.jm === viewMonth &&
              todayJalali.jd === day;

            return (
              <button
                key={`day-${day}`}
                type="button"
                onClick={() => handleSelectDay(day)}
                className={`h-9 sm:h-10 rounded-xl text-xs sm:text-sm font-bold transition-all flex flex-col items-center justify-center relative cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-lg scale-105 ring-2 ring-pink-400'
                    : isToday
                    ? 'bg-rose-950/80 text-rose-200 border border-rose-500 hover:bg-rose-900'
                    : 'bg-white/5 hover:bg-rose-950/60 text-neutral-200 hover:text-white border border-transparent hover:border-rose-800/40'
                }`}
              >
                <span>{toPersianDigits(day)}</span>
                {isToday && (
                  <span className="text-[8px] -mt-1 text-pink-300 font-normal">امروز</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Date Summary & Confirm Action */}
        <div className="mt-4 pt-3 border-t border-rose-900/40 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-right w-full sm:w-auto">
            <div className="text-[10px] text-neutral-400">تاریخ انتخاب شده:</div>
            <div className="text-xs font-bold text-rose-200 flex items-center gap-1.5">
              <span>🌸</span>
              <span>
                {toPersianDigits(tempSelected.jd)} {PERSIAN_MONTHS[tempSelected.jm - 1]} {toPersianDigits(tempSelected.jy)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-neutral-300 hover:text-white text-xs font-medium transition-all cursor-pointer"
            >
              انصراف
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>تأیید و ذخیره تاریخ</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
