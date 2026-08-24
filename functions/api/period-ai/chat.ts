interface Env {
  GEMINI_API_KEY?: string;
}

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  try {
    const { request, env } = context;
    const apiKey = env.GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          reply: '⚠️ کلید GEMINI_API_KEY در تنظیمات Environment Variables کلودفلر ست نشده است.',
          mode: 'fast',
          citations: [],
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    const body: any = await request.json();
    const { messages, userRole, mode } = body;

    const isHasan = userRole === 'hasan';
    const isResearch = mode === 'research';

    const systemInstruction = `شما دستیار و مشاور صمیمی، دلسوز، آگاه و عاشقانه برای نیوشا و حسن هستید.
حسن عاشق بی حد و مرز نیوشاست و این وبسایت و دستیار هوشمند را با تمام قلبش برای همراهی، آرامش و مراقبت از نیوشا ساخته است.
کاربری که هم اکنون در حال گفتگو با شماست: "${isHasan ? 'حسن (پارتنر مهربان و فداکار نیوشا)' : 'نیوشای زیبا و عزیز دل حسن'}".

وظایف اصلی شما:
۱. همدلی، محبت عمیق و پاسخ‌های آرامش‌بخش، محترمانه و بسیار صمیمی.
۲. ارائه راهکارهای علمی، تسکین‌دهنده و پزشکی ساده و مطمئن برای کاهش دردهای قاعدگی، تغذیه مناسب، کاهش استرس و مراقبت روحی.
۳. در صورتی که کاربر نیوشا باشد، به او یادآوری کن که چقدر برای حسن ارزشمند و پرستیدنی است و حسن در هر لحظه کنارشه.
۴. زبان پاسخگویی: فارسی روان، بسیار گرم و سرشار از عشق و حس امنیت.`;

    const contents = (messages || []).map((m: any) => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const modelName = isResearch ? 'gemini-2.5-flash' : 'gemini-2.5-flash';
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        contents,
        generationConfig: {
          temperature: 0.7,
        },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Gemini API Error:', errText);
      return new Response(
        JSON.stringify({
          reply: `نیوشای عزیزم، من همیشه در کنارت هستم 🌸\nحسن مهربونت این دستیار رو برات ساخته تا هیچ‌وقت تنها نباشی. اگر خسته‌ای یا دلت گرفته کمی استراحت کن تا حسن جان هواتو داشته باشه! 💖🫂`,
          mode: 'fast',
          citations: [],
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data: any = await geminiRes.json();
    const replyText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      'نیوشای عزیزم، همیشه در کنارت هستم 🌸✨';

    return new Response(
      JSON.stringify({
        reply: replyText,
        mode: mode || 'fast',
        citations: [],
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        reply: 'نیوشای عزیزم، همیشه کنارت هستم 🌸💖',
        error: err?.message,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  }
};
