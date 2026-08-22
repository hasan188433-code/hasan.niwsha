/**
 * Accurate Relationship Age and Counter Calculator
 * Start Date: 17 Ordibehesht 1405 at 04:00 AM (May 7, 2026 04:00:00)
 */

export interface RelationshipDuration {
  totalMilliseconds: number;
  totalDays: number;
  totalHours: number;
  totalMinutes: number;
  totalSeconds: number;
  // Display breakdown for 4 boxes
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  // Breakdown in Persian calendar (Years, Months, Days)
  years: number;
  months: number;
  remainingDays: number;
  heartbeats: number;
  ageText: string;
  isUpcoming: boolean;
}

// 17 Ordibehesht 1405 at 04:00:00 AM (May 7, 2026 04:00:00)
export const DEFAULT_START_DATE = new Date('2026-05-07T04:00:00');

export function calculateRelationshipAge(startDate: Date = DEFAULT_START_DATE, now: Date = new Date()): RelationshipDuration {
  const startMs = startDate.getTime();
  const nowMs = now.getTime();
  const diffMs = nowMs - startMs;

  const isUpcoming = diffMs < 0;
  const absDiffMs = Math.abs(diffMs);

  const totalSeconds = Math.floor(absDiffMs / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays = Math.floor(totalHours / 24);

  // Time components for 4 live cards
  const days = totalDays;
  const hours = totalHours % 24;
  const minutes = totalMinutes % 60;
  const seconds = totalSeconds % 60;

  // Approximate solar months (average 30.4375 days per month)
  let years = Math.floor(totalDays / 365);
  let months = Math.floor((totalDays % 365) / 30.4375);
  let remainingDays = Math.floor((totalDays % 365) % 30.4375);

  // Human friendly Persian text for relationship age
  const parts: string[] = [];
  if (years > 0) {
    parts.push(`${toPersianDigits(years)} سال`);
  }
  if (months > 0 || years > 0) {
    parts.push(`${toPersianDigits(months)} ماه`);
  }
  parts.push(`${toPersianDigits(remainingDays)} روز`);
  parts.push(`${toPersianDigits(hours)} ساعت`);
  parts.push(`${toPersianDigits(minutes)} دقیقه`);
  parts.push(`${toPersianDigits(seconds)} ثانیه`);

  const ageText = parts.join(' و ');

  // Estimated combined heartbeats for BOTH hearts (Hasan + Niousha = 2 hearts * 80 bpm)
  // For 80 bpm per person: totalMinutes * 80 * 2
  const heartbeats = Math.floor(totalMinutes * 80 * 2);

  return {
    totalMilliseconds: diffMs,
    totalDays,
    totalHours,
    totalMinutes,
    totalSeconds,
    days,
    hours,
    minutes,
    seconds,
    years,
    months,
    remainingDays,
    heartbeats,
    ageText,
    isUpcoming,
  };
}

export function toPersianDigits(n: number | string): string {
  const farsiDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return n
    .toString()
    .replace(/\d/g, (x) => farsiDigits[parseInt(x, 10)]);
}

/**
 * Format any date string or timestamp into full Persian Shamsi date with Persian numbers
 * Example: '2026-08-16' or timestamp -> '۲۵ مرداد ۱۴۰۵'
 */
export function formatToPersianShamsiDate(dateInput?: string | number): string {
  if (!dateInput) {
    const now = new Date();
    try {
      const formatted = new Intl.DateTimeFormat('fa-IR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Asia/Tehran',
      }).format(now);
      return toPersianDigits(formatted);
    } catch {
      return 'امروز';
    }
  }

  // If already in Persian format with Persian month names
  const persianMonths = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
  if (typeof dateInput === 'string' && persianMonths.some(m => dateInput.includes(m))) {
    return toPersianDigits(dateInput);
  }

  try {
    let dateObj: Date;
    if (typeof dateInput === 'number') {
      dateObj = new Date(dateInput);
    } else if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
      dateObj = new Date(`${dateInput.trim()}T09:00:00Z`);
    } else {
      dateObj = new Date(dateInput);
    }

    if (isNaN(dateObj.getTime())) {
      return toPersianDigits(String(dateInput));
    }

    const formatter = new Intl.DateTimeFormat('fa-IR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Tehran',
    });
    
    const formatted = formatter.format(dateObj);
    return toPersianDigits(formatted);
  } catch {
    return toPersianDigits(String(dateInput));
  }
}
