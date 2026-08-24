import { toPersianDigits } from './dateCalculations';
import { CoupleUser } from '../types';

export interface PresenceInfo {
  isOnline: boolean;
  statusText: string;
  badgeColor: 'emerald' | 'neutral';
  detailedText: string;
  relativeTime: string;
}

/**
 * Calculates exact real-time online status and last-seen text for partner in Persian
 */
export function getPartnerPresenceInfo(
  partnerName: CoupleUser,
  lastPingTimestamp: number | undefined
): PresenceInfo {
  const now = Date.now();
  const lastPing = lastPingTimestamp || 0;
  const diffMs = Math.max(0, now - lastPing);

  // Active within 12 seconds is considered actively Online
  const isOnline = lastPing > 0 && diffMs < 12000;

  const partnerTitle = partnerName === 'نیوشا' ? 'نیوشا جونم' : 'حسن جانم';
  const partnerShort = partnerName;

  if (isOnline) {
    return {
      isOnline: true,
      statusText: `${partnerTitle} همین الان آنلاین است 🟢`,
      badgeColor: 'emerald',
      detailedText: `${partnerTitle} هم‌اکنون داخل برنامه است و ضربان و پیام‌ها را زنده دریافت می‌کند`,
      relativeTime: 'هم‌اکنون',
    };
  }

  if (lastPing === 0) {
    return {
      isOnline: false,
      statusText: `${partnerShort} فعلاً آفلاین است (در انتظار ورود)`,
      badgeColor: 'neutral',
      detailedText: `${partnerShort} هنوز در این نشست وارد برنامه نشده است`,
      relativeTime: 'نامشخص',
    };
  }

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  let relativeTime = '';
  if (diffMin < 1) {
    relativeTime = 'چند لحظه پیش';
  } else if (diffMin < 60) {
    relativeTime = `${toPersianDigits(diffMin)} دقیقه پیش`;
  } else if (diffHour < 24) {
    const date = new Date(lastPing);
    const h = toPersianDigits(date.getHours().toString().padStart(2, '0'));
    const m = toPersianDigits(date.getMinutes().toString().padStart(2, '0'));
    relativeTime = `امروز ساعت ${h}:${m}`;
  } else {
    const date = new Date(lastPing);
    const h = toPersianDigits(date.getHours().toString().padStart(2, '0'));
    const m = toPersianDigits(date.getMinutes().toString().padStart(2, '0'));
    relativeTime = `${toPersianDigits(Math.floor(diffHour / 24))} روز پیش (${h}:${m})`;
  }

  return {
    isOnline: false,
    statusText: `آخرین حضور ${partnerShort}: ${relativeTime}`,
    badgeColor: 'neutral',
    detailedText: `آخرین تپش یا فعالیت ${partnerShort} در ${relativeTime} ثبت شده است`,
    relativeTime,
  };
}
