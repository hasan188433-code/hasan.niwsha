/**
 * Accurate Jalali (Solar Hijri / Shamsi) <-> Gregorian conversion and utilities
 */

export const PERSIAN_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

export const PERSIAN_WEEK_DAYS = [
  'ش', // شنبه
  'ی', // یکشنبه
  'د', // دوشنبه
  'س', // سه‌شنبه
  'چ', // چهارشنبه
  'پ', // پنج‌شنبه
  'ج', // جمعه
];

export const PERSIAN_WEEK_DAYS_FULL = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنج‌شنبه',
  'جمعه',
];

export function isJalaliLeapYear(jy: number): boolean {
  const r = ((((jy - 474) % 2820) + 2820) % 2820) + 474;
  return (((r + 38) * 682) % 2816) < 682;
}

export function getJalaliMonthDays(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isJalaliLeapYear(jy) ? 30 : 29;
}

export function gregorianToJalali(gy: number, gm: number, gd: number): { jy: number; jm: number; jd: number } {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    355666 +
    (365 * gy) +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) +
    gd +
    g_d_m[gm - 1];
  let jy = -1595 + (33 * Math.floor(days / 12053));
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let jm: number;
  let jd: number;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }
  return { jy, jm, jd };
}

export function jalaliToGregorian(jy: number, jm: number, jd: number): { gy: number; gm: number; gd: number } {
  let jy2 = jy - 979;
  let j_day_no = 365 * jy2 + Math.floor(jy2 / 33) * 8 + Math.floor(((jy2 % 33) + 3) / 4);
  for (let i = 0; i < jm - 1; ++i) {
    j_day_no += (i < 6) ? 31 : 30;
  }
  j_day_no += jd - 1;

  let g_day_no = j_day_no + 79;

  let gy = 1600 + 400 * Math.floor(g_day_no / 146097); /* 146097 = 365*400 + 400/4 - 400/100 + 400/400 */
  g_day_no = g_day_no % 146097;

  let leap = true;
  if (g_day_no >= 36525) { /* 36525 = 365*100 + 100/4 */
    g_day_no--;
    gy += 100 * Math.floor(g_day_no / 36524); /* 36524 = 365*100 + 100/4 - 100/100 */
    g_day_no = g_day_no % 36524;

    if (g_day_no >= 365) {
      g_day_no++;
    } else {
      leap = false;
    }
  }

  gy += 4 * Math.floor(g_day_no / 1461); /* 1461 = 365*4 + 4/4 */
  g_day_no %= 1461;

  if (g_day_no >= 366) {
    leap = false;
    g_day_no--;
    gy += Math.floor(g_day_no / 365);
    g_day_no = g_day_no % 365;
  }

  const g_days_in_month = [31, (leap ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  while (gm < 12 && g_day_no >= g_days_in_month[gm]) {
    g_day_no -= g_days_in_month[gm];
    gm++;
  }
  return { gy, gm: gm + 1, gd: g_day_no + 1 };
}

export function dateToJalali(date: Date): { jy: number; jm: number; jd: number } {
  return gregorianToJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export function jalaliToDate(jy: number, jm: number, jd: number): Date {
  const { gy, gm, gd } = jalaliToGregorian(jy, jm, jd);
  return new Date(gy, gm - 1, gd, 12, 0, 0);
}

export function formatJalaliToString(jy: number, jm: number, jd: number): string {
  const m = PERSIAN_MONTHS[jm - 1];
  return `${jd} ${m} ${jy}`;
}

export function dateToISODateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Get weekday index in Persian week (0: Saturday / شنبه, 6: Friday / جمعه)
 */
export function getJalaliWeekday(jy: number, jm: number, jd: number): number {
  const d = jalaliToDate(jy, jm, jd);
  const day = d.getDay(); // 0 is Sunday, 6 is Saturday
  return (day + 1) % 7; // Now 0 is Saturday, 6 is Friday
}
