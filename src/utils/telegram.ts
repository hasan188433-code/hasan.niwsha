// Telegram Bot API Service for Niosha & Hasan
export const TELEGRAM_CONFIG = {
  botToken: '8862334189:AAEA5ETL6RQcsP3VUDLDLFo7YP7621CIBQo',
  hasanChatId: '7727131610',
  nioshaChatId: '6119619827',
  chatId: '7727131610', // Default fallback for Hasan
};

export interface TelegramSendResult {
  success: boolean;
  message: string;
  error?: string;
}

export async function sendTelegramAlertToHasan(customNote?: string, targetUser: 'hasan' | 'niosha' = 'hasan'): Promise<TelegramSendResult> {
  const timeString = new Intl.DateTimeFormat('fa-IR', {
    dateStyle: 'full',
    timeStyle: 'medium',
  }).format(new Date());

  const isNiosha = targetUser === 'niosha';
  const targetChatId = isNiosha ? TELEGRAM_CONFIG.nioshaChatId : TELEGRAM_CONFIG.hasanChatId;
  const recipientName = isNiosha ? 'نیوشا جان' : 'حسن جان';

  const noteText = customNote && customNote.trim().length > 0 
    ? `\n\n💬 **متن پیام:**\n«${customNote.trim()}»` 
    : '';

  const messageText = isNiosha
    ? `🚨❤️ **پیام ویژه از طرف حسن برای نیوشا جان**\n\n` +
      `نیوشا جانم، حسن یک پیام مستقیم در وب‌سایت اختصاصی‌تون برات فرستاد!\n` +
      noteText +
      `\n\n⏰ **زمان ارسال:** ${timeString}\n` +
      `✨ با عشق برای تو 💕`
    : `🚨❤️ **پیام ویژه از طرف نیوشا برای حسن جان**\n\n` +
      `حسن جان، نیوشا یک پیام مستقیم در وب‌سایت اختصاصی‌تون ثبت کرد!\n` +
      noteText +
      `\n\n⏰ **زمان ارسال:** ${timeString}\n` +
      `✨ لطفا بررسی کن و پیشش باش! 💕`;

  // 1. Try sending via backend endpoint first
  try {
    const serverRes = await fetch('/api/telegram-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        note: customNote,
        message: messageText,
        chatId: targetChatId,
        botToken: TELEGRAM_CONFIG.botToken,
        targetUser,
      }),
    });

    if (serverRes.ok) {
      const data = await serverRes.json();
      if (data.success) {
        return { success: true, message: `پیام با موفقیت به تلگرام ${recipientName} فرستاده شد ❤️` };
      }
    }
  } catch {
    // Fallback to direct Telegram API if backend fails
  }

  // 2. Direct Telegram API fallback
  try {
    const tgUrl = `https://api.telegram.org/bot${TELEGRAM_CONFIG.botToken}/sendMessage`;
    const tgRes = await fetch(tgUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: targetChatId,
        text: messageText,
        parse_mode: 'Markdown',
      }),
    });

    const tgData = await tgRes.json();
    if (tgData.ok) {
      return { success: true, message: `پیام با موفقیت به تلگرام ${recipientName} فرستاده شد ❤️` };
    } else {
      return {
        success: false,
        message: 'خطا در ارتباط با تلگرام',
        error: tgData.description || 'نامشخص',
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: 'خطا در ارسال پیام به تلگرام',
      error: err?.message || 'Network error',
    };
  }
}

export async function sendTelegramMessage(text: string, chatId?: string): Promise<TelegramSendResult> {
  try {
    const targetChatId = chatId || TELEGRAM_CONFIG.hasanChatId;
    const tgUrl = `https://api.telegram.org/bot${TELEGRAM_CONFIG.botToken}/sendMessage`;
    const tgRes = await fetch(tgUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: targetChatId,
        text: text,
        parse_mode: 'Markdown',
      }),
    });

    const tgData = await tgRes.json();
    if (tgData.ok) {
      return { success: true, message: 'پیام ارسال شد ❤️' };
    }
    return { success: false, message: 'خطا در ارسال', error: tgData.description };
  } catch (err: any) {
    return { success: false, message: 'خطا در ارتباط', error: err?.message };
  }
}
