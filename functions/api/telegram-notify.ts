export const onRequestPost = async (context: { request: Request }) => {
  try {
    const { request } = context;
    const body: any = await request.json();
    const { note, message, botToken, chatId, targetUser } = body;

    const token = botToken || '8862334189:AAEA5ETL6RQcsP3VUDLDLFo7YP7621CIBQo';
    const isNiosha = targetUser === 'niosha' || chatId === '6119619827';
    const targetChatId = chatId || (isNiosha ? '6119619827' : '7727131610');

    const timeString = new Intl.DateTimeFormat('fa-IR', {
      dateStyle: 'full',
      timeStyle: 'medium',
    }).format(new Date());

    let formattedText = '';
    if (message) {
      formattedText = message;
    } else {
      const notePart = note && note.trim().length > 0
        ? `\n\n💬 **متن پیام:**\n«${note.trim()}»`
        : '';

      if (isNiosha) {
        formattedText = `🚨❤️ **پیام ویژه از طرف حسن برای نیوشا جان**\n\n` +
          `نیوشا جانم، حسن یک پیام مستقیم در وب‌سایت اختصاصی‌تون برات فرستاد!\n` +
          notePart +
          `\n\n⏰ **زمان:** ${timeString}\n` +
          `✨ با عشق برای تو 💕`;
      } else {
        formattedText = `🚨❤️ **پیام ویژه از طرف نیوشا برای حسن جان**\n\n` +
          `حسن جان، نیوشا یک پیام مستقیم در وب‌سایت اختصاصی‌تون ثبت کرد!\n` +
          notePart +
          `\n\n⏰ **زمان:** ${timeString}\n` +
          `✨ لطفا بررسی کن و پیشش باش! 💕`;
      }
    }

    const tgUrl = `https://api.telegram.org/bot${token}/sendMessage`;
    const tgRes = await fetch(tgUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: targetChatId,
        text: formattedText,
        parse_mode: 'Markdown',
      }),
    });

    const tgData: any = await tgRes.json();
    return new Response(JSON.stringify(tgData), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err?.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
