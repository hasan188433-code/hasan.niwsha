/**
 * Configuration and generator for 3D Romantic Sky Exploration Game for Niosha
 * Over 80 completely unique non-repeating love messages, Boss fight config, and upgrades economy.
 */

export interface GameStar {
  id: string;
  title: string;
  message: string;
  position: [number, number, number]; // [x, y, z] in 3D world space
  color: string;
  size: number;
}

export interface UpgradeTier {
  level: number;
  cost: number;
  value: number;
  label: string;
  desc: string;
}

export interface PlayerUpgradesState {
  bulletSpeedLevel: number;
  bulletDamageLevel: number;
  fireRateLevel: number;
  maxHealthLevel: number;
  magnetLevel: number;
  engineSpeedLevel: number;
}

export const UPGRADE_CONFIG = {
  bulletSpeed: [
    { level: 1, cost: 0, value: 90, label: 'سرعت تیر پایه', desc: 'سرعت تیرهای لیزری: ۹۰ متر بر ثانیه' },
    { level: 2, cost: 75, value: 130, label: 'سرعت تیر سطح ۲', desc: 'افزایش سرعت شلیک به ۱۳۰ متر بر ثانیه' },
    { level: 3, cost: 150, value: 175, label: 'سرعت تیر سطح ۳', desc: 'افزایش سرعت شلیک به ۱۷۵ متر بر ثانیه' },
    { level: 4, cost: 260, value: 230, label: 'سرعت تیر فراصوت', desc: 'شلیک با حداکثر شتاب ۲۳۰ متر بر ثانیه' },
  ],
  bulletDamage: [
    { level: 1, cost: 0, value: 15, label: 'قدرت لیزر پایه', desc: 'میزان آسیب هر شلیک: ۱۵ واحد' },
    { level: 2, cost: 90, value: 28, label: 'لیزر پلاسمایی', desc: 'میزان آسیب هر شلیک: ۲۸ واحد' },
    { level: 3, cost: 180, value: 45, label: 'لیزر فوتونی سنگین', desc: 'میزان آسیب هر شلیک: ۴۵ واحد' },
    { level: 4, cost: 320, value: 75, label: 'شلیک کهکشانی ویرانگر', desc: 'میزان آسیب هر شلیک: ۷۵ واحد' },
  ],
  fireRate: [
    { level: 1, cost: 0, value: 0.35, label: 'نرخ شلیک عادی', desc: 'فاصله بین شلیک‌ها: ۰.۳۵ ثانیه' },
    { level: 2, cost: 85, value: 0.25, label: 'شلیک تندباد', desc: 'فاصله بین شلیک‌ها: ۰.۲۵ ثانیه' },
    { level: 3, cost: 170, value: 0.17, label: 'مسلسل ستاره‌ای', desc: 'فاصله بین شلیک‌ها: ۰.۱۷ ثانیه' },
    { level: 4, cost: 300, value: 0.11, label: 'رگبار بی‌وقفه فوتونی', desc: 'فاصله بین شلیک‌ها: ۰.۱۱ ثانیه' },
  ],
  maxHealth: [
    { level: 1, cost: 0, value: 100, label: 'سپر دفاعی ۱۰۰', desc: 'حداکثر جان و سپر: ۱۰۰ واحد' },
    { level: 2, cost: 70, value: 160, label: 'سپر پلاسما ۱۶۰', desc: 'افزایش جان به ۱۶۰ واحد' },
    { level: 3, cost: 140, value: 240, label: 'سپر کوانتومی ۲۴۰', desc: 'افزایش جان به ۲۴۰ واحد' },
    { level: 4, cost: 250, value: 340, label: 'زره تایتانیوم شکست‌ناپذیر', desc: 'افزایش جان به ۳۴۰ واحد' },
  ],
  magnet: [
    { level: 1, cost: 0, value: 18, label: 'برد دریافت عادی', desc: 'فاصله خواندن ستاره: ۱۸ متر' },
    { level: 2, cost: 60, value: 28, label: 'مغناطیس ستاره‌ای ۲۸متر', desc: 'افزایش شعاع خواندن ستاره به ۲۸ متر' },
    { level: 3, cost: 130, value: 44, label: 'مغناطیس کیهانی ۴۴متر', desc: 'جذب پیام و سکه از فاصله ۴۴ متری' },
  ],
  engineSpeed: [
    { level: 1, cost: 0, value: 22.0, label: 'موتور پایه', desc: 'سرعت حرکت سفینه: ۲۲.۰ متر بر ثانیه' },
    { level: 2, cost: 80, value: 30.0, label: 'موتور توربو جفت‌هسته‌ای', desc: 'افزایش سرعت حرکت به ۳۰.۰ متر بر ثانیه' },
    { level: 3, cost: 160, value: 38.0, label: 'رانشگر پلاسما جت', desc: 'افزایش سرعت حرکت به ۳۸.0 متر بر ثانیه' },
    { level: 4, cost: 280, value: 48.0, label: 'شتاب‌دهنده هایپر درایو', desc: 'سرعت نهایی افسانه‌ای ۴۸.۰ متر بر ثانیه!' },
  ],
};

// Exactly 80 Unique, non-repeating, lovingly written Persian love notes & memories
export const UNIQUE_ROMANTIC_MESSAGES: { title: string; message: string }[] = [
  { title: 'قشنگ‌ترین اتفاق', message: '«نیوشا، تو قشنگ‌ترین اتفاق و معجزه تمام زندگی منی.»' },
  { title: 'درخشش بی‌همتا', message: '«اگر تمام آسمان را بگردم، باز هم هیچ ستاره‌ای به اندازه تو نمی‌درخشد.»' },
  { title: 'تنها مقصد من', message: '«بین تمام این کهکشان‌ها، من فقط و فقط دنبال نگاه تو می‌گردم.»' },
  { title: 'فراتر از واژه‌ها', message: '«نیوشای عزیزم، دوستت دارم؛ بیشتر از چیزی که بتوانم با کلمات بگویم.»' },
  { title: 'آرامش بی‌پایان', message: '«در کنار تو، هر لحظه پر از حس امنیت، نور و آرامش ابدیه.»' },
  { title: 'الماس کمیاب', message: '«تو مثل یک الماس کمیاب در قلب منی که تا ابد مراقب درخشش خواهم بود.»' },
  { title: 'نبض عاشقی', message: '«نیوشا جانم، صدای خنده‌هات قشنگ‌ترین موسیقی روی زمینه.»' },
  { title: 'خورشید شب‌های من', message: '«تو نور تاریک‌ترین شب‌های منی؛ بدون تو آسمون تاریکه.»' },
  { title: 'عهد ابدی', message: '«از ۴ صبح ۱۷ اردیبهشت تا انتهای جهان، دستت تو دستای منه.»' },
  { title: 'معنای عشق', message: '«عشق قبل از تو فقط یک واژه بود، با تو تبدیل به حقیقت شد.»' },
  { title: 'چشم‌های جادویی', message: '«توی چشم‌هات تمام کهکشان رو یک‌جا می‌بینم نیوشا.»' },
  { title: 'امن‌ترین پناه', message: '«قلب تو امن‌ترین و قشنگ‌ترین خونه‌ای هست که تو دنیا دارم.»' },
  { title: 'رویای واقعی', message: '«هر روز با شکر داشتن تو بیدار میشم، رویایی‌ترین حقیقت من.»' },
  { title: 'همسفر همیشگی', message: '«تا ابد در کنارت می‌مونم و با هم به تمام آرزوهامون می‌رسیم.»' },
  { title: 'گلبرگ عشق', message: '«لطافت قلبت زیباتر از تمام گل‌های بهاریه نیوشا جانم.»' },
  { title: 'ستاره قطبی من', message: '«در هر کجای این دنیا گم بشم، به سوی نور تو برمی‌گردم.»' },
  { title: 'نفس‌های من', message: '«هر بار نفس می‌کشم، نام قشنگ تو در قلبم تکرار میشه.»' },
  { title: 'هدیه آسمان', message: '«خدا تو رو برای من آفرید تا معنای واقعی خوشبختی رو بفهمم.»' },
  { title: 'امید فرداها', message: '«آینده با بودن در کنار تو زیباترین تصویریه که می‌تونم بسازم.»' },
  { title: 'خاطره‌های شیرین', message: '«تک‌تک ثانیه‌های با تو بودن، باارزش‌ترین گنجینه زندگی منه.»' },
  { title: 'لبخند فرشته', message: '«لبخند تو تمام غم‌های دنیا رو در یک لحظه محو میکنه نیوشا.»' },
  { title: 'طپش قلب حسن', message: '«قلب حسن فقط و فقط به عشق نیوشا می‌تپد، تا ابد و یک روز.»' },
  { title: 'زیباترین نقاشی خدا', message: '«خداوند با خلق تو، اوج هنر و زیبایی رو در این جهان به نمایش گذاشت.»' },
  { title: 'راز خوشبختی', message: '«خوشبختی یعنی اینکه دستم تو دستت باشه و چشمت تو چشمم.»' },
  { title: 'پیمان جاودان', message: '«هیچ فاصله‌ای و هیچ زمانی نمی‌تونه ذره‌ای از عشق من به تو کم کنه.»' },
  { title: 'قرص ماه من', message: '«همانند ماه شب چهارده، تاریکی‌های جهانم را روشن و پر از عشق کردی.»' },
  { title: 'سحرگاه عشق', message: '«آن ساعت ۴ صبح آغاز معجزه‌ای بود که مسیر سرنوشتم را به بهشت برد.»' },
  { title: 'عطر گل سرخ', message: '«بوی خاطراتت دلپذیرتر از عطر تمام باغ‌های گل رز دنیاست.»' },
  { title: 'آغوش امن', message: '«در میان تمام هیاهوهای این شهر، آغوش تو آرامگاه ابدی روح من است.»' },
  { title: 'صدای باران', message: '«شنیدن صدایت درست مثل نوای لطیف باران روی پنجره، جانم را زنده می‌کند.»' },
  { title: 'شوق پرواز', message: '«با داشتن بال‌های مهربانی تو، تا دورترین کهکشان‌ها اوج می‌گیرم.»' },
  { title: 'چشمه‌ی زلال', message: '«صداقت چشمانت مثل آبی زلال در دل کوهستان، پاک و بی‌همتاست.»' },
  { title: 'حامی همیشگی', message: '«در تمام پستی و بلندی‌ها، کوهی استوار پشت آرزوهایت خواهم بود.»' },
  { title: 'بهترین رفیق', message: '«تو نه فقط عشق من، که پایه تمام خنده‌ها و دیوانه‌بازی‌های منی.»' },
  { title: 'مادر مهر', message: '«مهر و فداکاری‌ات در لحظات سخت، گرمابخش تک‌تک روزهای سرد من است.»' },
  { title: 'موج احساس', message: '«امواج عشقت ساحل تنهایی‌ام را پر از صدف‌های امید و لبخند کرد.»' },
  { title: 'نگین انگشتری', message: '«تو باارزش‌ترین گوهری هستی که در دستان روزگار به من بخشیده شد.»' },
  { title: 'موسیقی جان', message: '«ریتم نفس‌هایت هماهنگ‌ترین هارمونی با ضربان قلب بیقرار من است.»' },
  { title: 'نور هدایت', message: '«حتی در تاریک‌ترین شب‌ها، یاد تو فانوس راه من به سمت روشنایی است.»' },
  { title: 'باغ آرزو', message: '«هر بذر عشقی که کاشتی، اکنون درختی پربار از خوشبختی شده است.»' },
  { title: 'شوق دیدار', message: '«لحظه‌شماری برای دوباره دیدنت، شیرین‌ترین انتظار تمام زندگی من است.»' },
  { title: 'طعم شادی', message: '«با تو چای تلخ عصرگاهی هم طعم شیرین‌ترین قند روزگار را می‌دهد.»' },
  { title: 'پیوند دل‌ها', message: '«روح من و تو خیلی پیش‌تر از این جهان، برای هم سروده شده بودند.»' },
  { title: 'سکوت پرحرف', message: '«وقتی کنار همیم، حتی سکوتمان هم پر از نغمه‌های پراحساس عاشقی است.»' },
  { title: 'سایه مهر', message: '«سایه‌ات تا ابد بر سر زندگی‌ام مستدام باد، ای مهربان‌ترین همسفر من.»' },
  { title: 'طلوع بی‌پایان', message: '«هر بامداد با یاد چشم‌های درخشانت، روزم با انرژی و نور آغاز می‌شود.»' },
  { title: 'تاج سر من', message: '«در سرزمین قلب من، تو تنها ملکه‌ای هستی که تا ابد فرمانروایی می‌کنی.»' },
  { title: 'چراغ خانه', message: '«حضور گرمت کلبه زندگی‌مان را به قصری پر از شکوه و صمیمیت بدل کرده.»' },
  { title: 'پاییز رنگارنگ', message: '«قدم زدن با تو در برگ‌ریزان پاییزی، رویایی‌ترین تابلوی زندگی من است.»' },
  { title: 'زمستان گرم', message: '«در سرمای سوزان روزگار، گرمای دستانت پناهگاه همیشگی من است.»' },
  { title: 'بهار دل‌انگیز', message: '«با آمدنت به زندگی من، شکوفه‌های امید برای همیشه جاودانه شدند.»' },
  { title: 'تابستان پرشور', message: '«شور و شوق با تو بودن، خنک‌ترین نسیم در گرمای روزهای پرمشغله است.»' },
  { title: 'رازدار من', message: '«تمام رازها و درددل‌های نگفته‌ام تنها در پیشگاه چشمان تو آرام می‌گیرند.»' },
  { title: 'شیرینی لبخند', message: '«طرح لبخند روی گونه‌هایت، قشنگ‌ترین منحنی دنیاست که عاشقشم.»' },
  { title: 'پیمان وفاداری', message: '«سوگند به خدای آسمان‌ها که تا آخرین نفس، وفادارترین یار تو خواهم ماند.»' },
  { title: 'موج چهارم عاشقی', message: '«فصل جدید زندگی با تو آغاز شده و هر روزش پر از شکوه و معجزه است.»' },
  { title: 'هم‌نفس من', message: '«هر جا که باشم، فاصله معنا ندارد؛ قلبم با هر تپش تو همنواست.»' },
  { title: 'قد تمام مورچه‌ها', message: '«قد تمام مورچه‌های روی زمین و ستاره‌های آسمان دورت می‌گردم.»' },
  { title: 'شاهزاده قصه', message: '«تو همان فرشته‌ای هستی که از قصه‌های کهن به واقعیت زندگی‌ام پا گذاشت.»' },
  { title: 'دنیای من', message: '«اگر بپرسند دنیای تو چقدر است، با افتخار به چشمان تو اشاره می‌کنم.»' },
  { title: 'کیمیای عشق', message: '«مس وجودم را با طلای مهر و صداقت بی‌انتهایت قیمتی و جاودانه کردی.»' },
  { title: 'پرستوی بهاری', message: '«با پرواز در آسمان خیالت، تمام ابرها کنار می‌روند و آفتاب می‌تابد.»' },
  { title: 'نغمه باربد', message: '«هر کلامت دلنشین‌تر از هر ساز و آوازی است که تا به امروز شنیده‌ام.»' },
  { title: 'ساحل آرام', message: '«قایق سرگردان قلبم بالاخره در امن‌ترین ساحل دنیا، یعنی قلبت لنگر انداخت.»' },
  { title: 'معجزه روزگار', message: '«معجزه برای من رخ داده است؛ آن هم دقیقاً روزی که وارد دنیایم شدی.»' },
  { title: 'طلای ناب', message: '«عیار مهربانی و نجابتت بالاتر از هر گنج و طلایی در این کره خاکی است.»' },
  { title: 'آرام‌بخش روح', message: '«دردهایم با یک بار شنیدن صدایت فراموش می‌شوند؛ تو داروی جان منی.»' },
  { title: 'شوق نوشتن', message: '«هر قلمی که دست می‌گیرم، ناخودآگاه فقط و فقط نام قشنگ تو را می‌نویسد.»' },
  { title: 'شمع فروزان', message: '«پروانه‌وار گرد وجود پرمهرت می‌گردم و از گرمای حضورت جان می‌گیرم.»' },
  { title: 'باغ یاس', message: '«صداقت و پاکی دلت بوی خوش عطر یاس‌های سپید بهاری را دارد.»' },
  { title: 'شکرانه عشق', message: '«سجده شکر می‌گزارم بابت داشتن فرشته‌ای چون تو در سرنوشت خودم.»' },
  { title: 'هم‌راز جاودان', message: '«هیچ کلمه‌ای نمی‌تواند عمق وابستگی و شیفتگی مرا به تو بیان کند.»' },
  { title: 'چتر بارانی', message: '«در روزهای طوفانی و سخت، چتر امن حمایت من بالای سرت باز خواهد ماند.»' },
  { title: 'جام محبت', message: '«از شراب ناب عشقت سرمستم و هرگز از این مستی بیدار نخواهم شد.»' },
  { title: 'هم‌قدم رویا', message: '«دست در دست هم تا بلندترین قله‌های موفقیت و شادی پرواز خواهیم کرد.»' },
  { title: 'نور دیدگانم', message: '«روشنایی چشم‌هایم از برق نگاه مهربان و بی‌همتای توست نیوشا جان.»' },
  { title: 'حریم امن دل', message: '«قلبم قلعه‌ای تسخیرناپذیر است که کلیدش تا ابد فقط در دستان توست.»' },
  { title: 'شکوه آفرینش', message: '«تو والاترین تجلی زیبایی و شکوه خداوندی در کالبد یک فرشته زمینی هستی.»' },
  { title: 'پایان جستجو', message: '«با یافتن تو، تمام جستجوهای جهان به پایان رسید؛ تو همه چیز منی.»' },
  { title: 'جاودانگی ما', message: '«داستان عشق حسن و نیوشا در تاریخ ستارگان کهکشان با خط زرین ثبت شده است.»' },
];

const STAR_COLORS = [
  '#ffffff', // Pure Diamond White
  '#f8fafc', // Radiant Starlight White
  '#f1f5f9', // Celestial Silver White
  '#fffbeb', // Warm Starlight Glow
  '#f0f9ff', // Crystalline Ice White
];

// Generate 80 3D stars scattered across the celestial sky, each with a GUARANTEED UNIQUE message!
export function generateHundredsOfStars(totalCount: number = 80): GameStar[] {
  const stars: GameStar[] = [];

  for (let i = 0; i < totalCount; i++) {
    // Distribute stars in an expansive 3D dome around the player & moon
    const radius = 25 + Math.pow(Math.random(), 0.6) * 190;
    const theta = Math.random() * Math.PI * 2; // horizontal angle
    const phi = (Math.random() * 0.75 + 0.05) * Math.PI; // elevated dome

    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = Math.max(5, radius * Math.cos(phi) + 15 + Math.random() * 50);
    const z = radius * Math.sin(phi) * Math.sin(theta) - (radius > 70 ? 20 : 0);

    const messageTemplate = UNIQUE_ROMANTIC_MESSAGES[i] || {
      title: `ستاره عشق شماره ${i + 1}`,
      message: `«نیوشا جانم، ستاره درخشان شماره ${i + 1} از آسمان قلب حسن نثار مهربانی‌های بی‌پایان تو.»`,
    };
    const color = STAR_COLORS[i % STAR_COLORS.length];
    const size = 1.8 + Math.random() * 1.4;

    stars.push({
      id: `star-celestial-${i + 1}`,
      title: messageTemplate.title,
      message: messageTemplate.message,
      position: [Math.round(x * 10) / 10, Math.round(y * 10) / 10, Math.round(z * 10) / 10],
      color,
      size,
    });
  }

  return stars;
}

export const ALL_GAME_STARS: GameStar[] = generateHundredsOfStars(80);

export type GameDifficulty = 'peaceful' | 'easy' | 'normal' | 'hard';

export interface DifficultyConfig {
  id: GameDifficulty;
  name: string;
  badge: string;
  description: string;
  hasBoss: boolean;
  bossHealth: number;
  bossDamage: number;
  bossSpeed: number;
  bossShootCooldown: number;
  bossBulletSpeed: number;
  bossBulletCount: number;
  bossRewardCoins: number;
}

export const DIFFICULTY_PRESETS: Record<GameDifficulty, DifficultyConfig> = {
  peaceful: {
    id: 'peaceful',
    name: 'دوستانه (بدون انمی)',
    badge: '🕊️ آرامش‌بخش و بدون خطر',
    description: 'بدون هیچ دشمن و خطری! پرواز آزادانه میان ستاره‌ها و دسترسی مستقیم و فوری به نامه ماه.',
    hasBoss: false,
    bossHealth: 0,
    bossDamage: 0,
    bossSpeed: 0,
    bossShootCooldown: 999,
    bossBulletSpeed: 0,
    bossBulletCount: 0,
    bossRewardCoins: 0,
  },
  easy: {
    id: 'easy',
    name: 'آسان',
    badge: '🌱 نبرد سبک',
    description: 'نگهبان ماه جان (۳۵۰۰ واحد) و آسیب جدی دارد. چالش‌برانگیز و نیازمند ارتقاء زره.',
    hasBoss: true,
    bossHealth: 3500,
    bossDamage: 18,
    bossSpeed: 18.0,
    bossShootCooldown: 1.8,
    bossBulletSpeed: 55.0,
    bossBulletCount: 1,
    bossRewardCoins: 350,
  },
  normal: {
    id: 'normal',
    name: 'متوسط (پیشنهادی)',
    badge: '⚔️ نبرد استاندارد',
    description: 'جان بسیار بالا (۷۰۰۰ واحد)، شلیک‌های دوگانه پلاسمایی کشنده (۲۸ واحد آسیب). عبور بدون خرید از فروشگاه ناممکن است!',
    hasBoss: true,
    bossHealth: 7000,
    bossDamage: 28,
    bossSpeed: 24.0,
    bossShootCooldown: 1.3,
    bossBulletSpeed: 70.0,
    bossBulletCount: 2,
    bossRewardCoins: 600,
  },
  hard: {
    id: 'hard',
    name: 'سخت (حرفه‌ای)',
    badge: '🔥 نبرد سنگین و جهنمی',
    description: 'نگهبان جان غول‌پیکر (۱۴۰۰۰ واحد)، رگبار سه‌گانه برق‌آسا و ۴۲ واحد آسیب در هر ضربه! کابوس واقعی کهکشان.',
    hasBoss: true,
    bossHealth: 14000,
    bossDamage: 42,
    bossSpeed: 32.0,
    bossShootCooldown: 0.8,
    bossBulletSpeed: 95.0,
    bossBulletCount: 3,
    bossRewardCoins: 1000,
  },
};

export const GAME_CONFIG = {
  // Start Screen Info
  startScreen: {
    title: 'برای نیوشا ❤️',
    subtitle: 'آسمان کهکشانی، ستاره‌های پیام‌آور و نبرد با نگهبان ماه...',
    story: 'به دنیای خودت خوش آمدی نیوشا جان! متاسفانه ماه توسط گروه آکواریوس‌ها اشغال شده و نگهبانی سرسخت در آنجا به کار برده شده است. نیوشا جان ما به کمک خودت نیاز داریم؛ اینجا دنیای توست و تو قدرتمندترین انسان این سیاره‌ای. به کمکت نیاز داریم تا این نگهبان ظالم را شکست دهی و راز ماه را جاودانه کنی! 🪐✨',
    startButtonText: 'شروع ماموریت و پرواز در کهکشان ✨',
    controlsHintDesktop: 'کنترل کامپیوتر: چرخش با ماوس | پرواز با W, A, S, D | شلیک لیزر با کلیک چپ یا Space',
    controlsHintMobile: 'کنترل موبایل: حرکت با جوی‌استیک چپ | چرخش با لمس سمت راست | شلیک با دکمه اختصاصی',
  },

  // In-Game Minimal UI Hints
  hints: {
    explore: 'میان ستاره‌ها پرواز کن و با خواندن پیام‌ها سکه کسب کن تا سفینه‌ات رو ارتقا بدی! ✨',
    nearMoonLocked: 'سپر محافظتی ماه فعال است! ابتدا نگهبان ماه را شکست دهید 🛡️',
    nearMoonUnlocked: 'ماه آزاد شد! نزدیک شو تا نامه عاشقانه را بخوانی 🌙💌',
    nearMoonPeaceful: 'ماه کاملاً در دسترس است! نزدیک شو تا نامه عاشقانه را بخوانی 🌙💌',
    nearStar: 'پیام عاشقانه این ستاره برای توست + سکه دریافت شد ✨🪙',
    bossFight: 'هشدار! نگهبان ماه وارد نبرد شد! شلیک کنید و از تیرهایش جا خالی بدهید 🚀💥',
    bossDefeated: 'تبریک! نگهبان ماه شکست خورد و راز نامه ماه باز شد! 🎉🌙',
  },

  // Player & Movement Speeds
  movement: {
    moveSpeed: 22.0, // units per second
    sprintMultiplier: 1.6,
    flySpeed: 16.0,
    lookSensitivityMouse: 0.0022,
    lookSensitivityTouch: 0.0035,
    starTriggerDistance: 18.0, // Distance to activate star popup
    starBillboardVisibleDistance: 45.0, // Distance where floating 3D text becomes crystal clear
    moonTriggerDistance: 160.0, // Distance to activate Moon letter (aligned with 3D text fade-in)
  },

  // Boss Spaceship Combat Configuration
  boss: {
    name: 'نگهبان کیهانی ماه',
    title: 'Void Guardian Dreadnought',
    maxHealth: 7000, // Boss fight health (7,000 HP)
    speed: 18.0,
    dodgeSpeed: 38.0,
    shootCooldown: 1.6, // seconds between attacks
    bulletSpeed: 55.0,
    bulletDamage: 14,
    bulletCount: 2, // Dual plasma spread
    detectionRadius: 95.0,
    orbitRadius: 40.0,
    rewardCoins: 450,
    voiceUrl: 'https://uploadkon.ir/uploads/88d821_26Recording-6-.m4a',
  },

  // The Grand Luminous Moon Configuration
  moon: {
    position: [0, 65, -200] as [number, number, number],
    radius: 35,
    color: '#fff5e6',
    glowColor: '#ffd79e',
    ambientColor: '#fce7f3',
    // The Love Letter for Niosha when approaching the Moon
    letter: {
      title: 'این پیام یادته کی دیده بودیش؟ 🌙💌',
      date: 'نامه عاشقانه حسن به نیوشا',
      content: `این پیام یادته کی دیده بودیش 
🛑آغاز موج چهارم


خب خب خب رسیدیم به پایان داستان جنگ یا بهتر بگم شروع ماجراهای حسن و نیوشا فصل اول


نیوشا من بازم بهت میگم من خودخواهم
تو فکر میکنی من به تو توجه میکنم
آره میکنم چون تغذیه من شده همون لبخند تو🥲
کاری ندارم پشت تلفن به چیز یا کسی دیگه میخندی ولی فقط یه صدا خنده بیاد که بفهمم از ذوق بود با تمام وجود خوشحال میشم🫂خوشحال نه اصن شارژ میشم دوباره
خب فکرش نمیکردم اینجوری دوست داشته باشم
روز اولی که بهم شب بخیر گفتیم ته دلم گفتم برو بابا حسن توجه نکن حالا یذره حرف زدی  ولی قرار نیس جلوتر از این بری ها اصلاا
ولی گذشت و گذشت تا رسیدم به جایی که شب منتظر شنیدن صدای نوتیف یا تلفن بودم🫂❤️
از اینکه گذاشتی برسیم به اینجا
از اینکه گذاشتی بریم تو تعهد از ته دل ممنونم ازت🥲🫂
جدی جدی شدی همه زندگیم
بابت همه چی ازت ممنونم
و خیلییییی بیشتر از خدا که تورا گذاشت جلو پام❤️🫂

دختر صاف صادق خوش اخلاق متعهد بساز و البته مهم تر از هرچیزی همدل تو خیلی مسائل
همیشه معتقد بودم دختر باید همدل باشه بقیش که شامل اخلاق و زیبایی خود خدا جور میکنه 
الان فهمیدم نه انگار واقعا یه چیزایی حالیم بوده واقعا حرفم درست بود
تو از ته دل معرکه ای🥲❤️🫂
الان دیگه بعلاوه همه بالایی ها یه دختر خوش هیکل و خوشگل مثل قرص ماه دارم🥲❤️
در واقع با داشتن تو
 یه رفیق دارم که تو همه چی میتونم باهاش تفریح کنم
یه همسر دارم که میتونم تا آخر عمر باهاش زندگی کنم
و در آخر یه مادر که تو سختی ها کنارمه و هر سختی ساده بگذرونم🫂

قد تمام مورچه های رو زمین دورت میگردم و دوست دارم
تولدت مبارک زیباترین کادو زندگیم❤️🥲`,
      signature: 'با تمام وجود، حسن ❤️',
    },
  },

  // Pre-configured list of stars
  stars: ALL_GAME_STARS,

  // Audio configuration
  audio: {
    ambientMusicUrl: '', // Synthesized ambient
  },
};
