import { CyclePhase, CyclePhaseInfo } from '../types/period';
import { toPersianDigits } from './dateCalculations';

export interface AnalgesicGuideItem {
  name: string;
  genericName: string;
  category: string;
  mechanism: string;
  dosage: string;
  timing: string;
  warnings: string;
  rating: number; // 1-5 effectiveness for dysmenorrhea
}

export const CLINICAL_ANALGESICS: AnalgesicGuideItem[] = [
  {
    name: 'مفنامیک اسید (Ponstan / Mefenamic Acid)',
    genericName: 'Mefenamic Acid (NSAID)',
    category: 'خط اول درمان دردهای شدید قاعدگی (دیسمنوره)',
    mechanism: 'مهار مستقیم آنزیم سیکلواکسیژناز (COX) و مسدود کردن گیرنده‌های پروستاگلاندین PGF2α در عضله میومتر رحم که عامل اصلی انقباض و درد است.',
    dosage: '۲۵۰ تا ۵۰۰ میلی‌گرم هر ۶ الی ۸ ساعت (حداکثر ۱۵۰۰ میلی‌گرم در روز)',
    timing: 'بهترین اثربخشی: مصرف در اولین ساعات لکه‌بینی یا شروع دل‌درد، همراه با یک لیوان کامل آب و بعد از غذا.',
    warnings: 'نباید با معده کاملاً خالی مصرف شود. در صورت سابقه زخم معده با احتیاط مصرف گردد.',
    rating: 5,
  },
  {
    name: 'ناپروکسن (Naproxen / Aleve)',
    genericName: 'Naproxen Sodium (NSAID)',
    category: 'مسکن طولانی‌اثر و ضدالتهاب قوی',
    mechanism: 'مهار طولانی‌مدت سنتز پروستاگلاندین‌ها با اثر ماندگار ۸ تا ۱۲ ساعته که نیاز به تکرار مداوم دوز را کم می‌کند.',
    dosage: '۲۷۵ تا ۵۰۰ میلی‌گرم هر ۸ الی ۱۲ ساعت',
    timing: 'شروع با ۲۷۵ تا ۵۵۰ میلی‌گرم در ابتدای علائم، سپس ۲۷۵ میلی‌گرم هر ۸ ساعت در صورت تداوم درد.',
    warnings: 'همراه با غذا و مایعات فراوان مصرف شود. برای دردهای شبانه و خواب راحت بسیار عالی است.',
    rating: 5,
  },
  {
    name: 'ایبوپروفن / ژلوفن (Ibuprofen / Gelofen)',
    genericName: 'Ibuprofen (Softgel)',
    category: 'مسکن سریع‌الجذب برای دردهای حاد و گرفتگی عضلانی',
    mechanism: 'کاهش سریع واسطه‌های التهابی و گشادکننده عروق رحمی منقبض‌شده جهت بهبود جریان خون بافت.',
    dosage: '۴۰۰ میلی‌گرم هر ۶ ساعت در صورت نیاز (حداکثر ۱۲۰۰ میلی‌گرم روزانه بدون نسخه)',
    timing: 'کپسول‌های ژلاتینی ژلوفن جذب سریع‌تری دارند و ظرف ۲۰ تا ۳۰ دقیقه اثر تسکینی خود را نشان می‌دهند.',
    warnings: 'از مصرف هم‌زمان با سایر داروهای هم‌خانواده NSAID خودداری شود.',
    rating: 4,
  },
  {
    name: 'استامینوفن کدئین / پاراستامول (Acetaminophen)',
    genericName: 'Acetaminophen + Codeine',
    category: 'مسکن مرکزی برای سردرد، دردهای اسکلتی و حساسیت معده',
    mechanism: 'اثر بر سیستم عصبی مرکزی جهت افزایش آستانه تحمل درد. فاقد عوارض گوارشی شایع NSAIDها.',
    dosage: '۱ قرص هر ۶ ساعت در صورت نیاز',
    timing: 'مناسب برای افرادی که معده حساسی دارند یا هم‌زمان دچار سردردهای تنشی ماهانه شده‌اند.',
    warnings: 'برای التهاب رحمی اثربخشی کمتری از مفنامیک اسید دارد؛ در مصرف کدئین نباید زیاده‌روی شود.',
    rating: 3,
  },
];

export interface CycleCalculations {
  currentDayInCycle: number;
  currentPhase: CyclePhase;
  phaseInfo: CyclePhaseInfo;
  daysUntilNextPeriod: number;
  nextPeriodDate: Date;
  ovulationDate: Date;
  fertileWindowStart: Date;
  fertileWindowEnd: Date;
  isPeriodToday: boolean;
  cycleLength: number;
  periodLength: number;
}

export const PHASE_MEDICAL_DATA: Record<CyclePhase, Omit<CyclePhaseInfo, 'dayInPhase' | 'dayInCycle'>> = {
  menstrual: {
    phase: 'menstrual',
    title: 'فاز خونریزی و پاکسازی (Menstrual Phase)',
    subtitle: 'روزهای ۱ تا ۵ چرخه • بازسازی لایه اندومتر',
    description: 'در این مرحله سطح هورمون‌های استروژن و پروژسترون در پایین‌ترین حد خود قرار دارد. دیواره رحم در حال ریزش و تجدید سلولی است؛ به همین دلیل نیاز بدن به استراحت، گرمی‌جات و آرامش به اوج می‌رسد.',
    hormones: {
      estrogen: 'low',
      progesterone: 'low',
      energyLevel: 'low',
    },
    medicalTips: [
      'کیسه آب گرم روی شکم و کمر باعث گشاد شدن عروق و کاهش انقباضات ناشی از پروستاگلاندین‌ها می‌شود.',
      'مصرف منیزیم (مثل شکلات تلخ و مغزیجات) گرفتگی عضلات رحمی را تسکین می‌دهد.',
      'از نوشیدنی‌های خیلی سرد و کافئین زیاد پرهیز شود تا اسپاسم‌های عروقی تشدید نشوند.',
      'در صورت درد زیاد، داروهای ضدالتهاب غیراستروئیدی (مانند ناپروکسن یا ژلوفن) با آب کافی مصرف شوند.'
    ],
    nutritionTips: [
      'دمنوش بابونه، دارچین، زنجبیل یا گل گاوزبان برای آرامش اعصاب و گرم‌کردن طبع',
      'غذاهای غنی از آهن (اسفناج، عدسی، گوشت قرمز، شیره انگور) برای جبران افت هموگلوبین',
      'شکلات تلخ ۷۰٪+ برای ترشح اندورفین و جبران منیزیم',
      'سوپ‌های گرم و سبک به جای غذاهای نفاخ و سنگین'
    ],
    careTips: [
      'استراحت کافی و خواب عمیق بدون دغدغه فکری',
      'حمام آب ولرم رو به گرم برای شل شدن عضلات پلویک',
      'پوشیدن لباس‌های راحت و گشاد نخی'
    ],
    partnerCareAdvice: 'عشقم، الان وظیفه من (حسن) اینه که تمام تلاشمو بکنم تا کمترین فشاری بهت نیاد؛ چای نبات و دمنوش گرم برات بیارم، کیسه آبگرم برات آماده کنم، ماساژ کمر و پا بدم و فقط لوس‌ات کنم و قربون صدقه‌ات برم! 🫂❤️',
    colorTheme: 'from-rose-600 via-pink-600 to-red-500',
    icon: '🩸',
  },
  follicular: {
    phase: 'follicular',
    title: 'فاز فولیکولار و رویش مجدد (Follicular Phase)',
    subtitle: 'روزهای ۶ تا ۱۳ چرخه • تجدید قوا و ترشح استروژن',
    description: 'هورمون محرک فولیکول (FSH) شروع به کار کرده و تخمدان‌ها فولیکول‌های جدید را رشد می‌دهند. سطح استروژن صعودی است؛ پوست شاداب‌تر، سطح انرژی و تمرکز بالا، و روحیه در بهترین وضعیت قرار می‌گیرد.',
    hormones: {
      estrogen: 'rising',
      progesterone: 'low',
      energyLevel: 'rising',
    },
    medicalTips: [
      'بهترین زمان برای ورزش، پیاده‌روی شاداب و انجام کارهای پرانرژی و برنامه‌ریزی‌های جدید.',
      'متابولیسم پایه فعال‌تر است و بدن توانایی بالایی در هضم پروتئین و کربوهیدرات‌های پیچیده دارد.',
      'سلول‌های پوستی با کلاژن‌سازی بهتر شفاف‌تر و شاداب‌تر به نظر می‌رسند.'
    ],
    nutritionTips: [
      'مواد غذایی تخمیری (پروبیوتیک‌ها مانند ماست پروبیوتیک) برای سلامت روده و دفع بهینه استروژن',
      'سبزیجات تازه، مرکبات، آووکادو و دانه‌های کتان و کدو تنبل',
      'پروتئین‌های باکیفیت و حبوبات برای حمایت از رشد بافت‌های جدید'
    ],
    careTips: [
      'شروع روتین پوستی جدید یا ماسک‌های آبرسان',
      'انجام کارهای خلاقانه و پروژه‌های مورد علاقه',
      'گردش دونفره و لذت بردن از انرژی عالی'
    ],
    partnerCareAdvice: 'انرژی و خوشحالی نیوشای من الان در اوجه! بهترین وقته که بریم بیرون، تفریح کنیم، با هم بخندیم و عکس‌های قشنگ بگیریم. 🌸✨',
    colorTheme: 'from-emerald-500 via-teal-500 to-cyan-500',
    icon: '🌱',
  },
  ovulation: {
    phase: 'ovulation',
    title: 'فاز تخمک‌گذاری و اوج درخشش (Ovulation Phase)',
    subtitle: 'روزهای ۱۴ تا ۱۶ چرخه • جهش هورمون LH و اوج جذابیت',
    description: 'تخمک آزاد می‌شود. استروژن و تستوسترون در اوج هستند؛ حداکثر اعتمادبه‌نفس، درخشش چهره، گیرایی صدا و بالاترین سطح انرژی عاطفی در این روزها تجربه می‌شود.',
    hormones: {
      estrogen: 'peak',
      progesterone: 'rising',
      energyLevel: 'high',
    },
    medicalTips: [
      'ممکن است احساس کشش خفیف در یک طرف شکم (Mittelschmerz) تجربه شود که کاملاً طبیعی است.',
      'دمای پایه بدن (BBT) کمی افزایش می‌یابد.',
      'بالاترین سطح باروری در طول ماه در این بازه ۳ تا ۴ روزه رخ می‌دهد.'
    ],
    nutritionTips: [
      'مواد آنتی‌اکسیدانی قوی مثل توت‌فرنگی، تمشک، گردو و انار',
      'آب فراوان برای کمک به حفظ الاستیسیته پوست و تعادل آب میان‌بافتی',
      'سبزیجات با برگ تیره مثل بروکلی برای حمایت از سلامت کبد'
    ],
    careTips: [
      'پوشیدن لباس‌های مورد علاقه و استایل‌های شیک',
      'گفت‌وگوهای عمیق و پرمهر دونفره',
      'لذت بردن از اعتماد به نفس و حس جذابیت فوق‌العاده'
    ],
    partnerCareAdvice: 'چشم‌های خوشگلت الان بیشتر از همیشه برق می‌زنه پرنسس من! وقتشه که ازت حسابی تعریف کنم و زیبایی بی‌نظیرت رو بهت یادآوری کنم. 💎👑',
    colorTheme: 'from-amber-500 via-orange-500 to-pink-500',
    icon: '✨',
  },
  luteal: {
    phase: 'luteal',
    title: 'فاز لوتئال و آرامش‌خواهی (Luteal / PMS Phase)',
    subtitle: 'روزهای ۱۷ تا ۲۸ چرخه • افزایش پروژسترون و نیاز به مدارا',
    description: 'جسم زرد پروژسترون ترشح می‌کند تا رحم آماده شود. اگر بارداری رخ ندهد، در روزهای پایانی هورمون‌ها افت می‌کنند. این بازه ممکن است با سندرم پیش از قاعدگی (PMS)، نفخ، حساسیت سینه‌ها و تغییرات خلقی همراه باشد.',
    hormones: {
      estrogen: 'dropping',
      progesterone: 'peak',
      energyLevel: 'declining',
    },
    medicalTips: [
      'نوسانات سطح سروتونین ممکن است باعث حساسیت عاطفی، زودرنجی یا تمایل به گریه شود؛ این امر ۱۰۰٪ فیزیولوژیک و طبیعی است.',
      'کاهش مصرف سدیم (نمک) و غذاهای شور به کاهش احتباس مایعات و نفخ کمک می‌کند.',
      'ورزش‌های ملایم مثل یوگا، پیاده‌روی سبک و حرکات کششی سطح اندورفین را بالا نگه می‌دارند.',
      'مصرف ویتامین B6 و منیزیم برای تعادل ترشح انتقال‌دهنده‌های عصبی مغز توصیه می‌شود.'
    ],
    nutritionTips: [
      'کربوهیدرات‌های پیچیده (جو دوسر، نان سبوس‌دار، سیب‌زمینی شیرین) برای پایدار نگه داشتن قند خون',
      'موز و شکلات برای تقویت سطح سروتونین مغز',
      'دمنوش به‌لیمو، بادرنجبویه و اسطوخودوس برای خواب راحت و رفع تنش'
    ],
    careTips: [
      'دوری از بحث‌ها یا تصمیم‌گیری‌های پرفشار کاری و ذهنی',
      'در آغوش گرفتن بالش نرم، پتو کشیدن و تماشای سریال دلخواه',
      'نوشتن احساسات و در میان گذاشتن نیازها با حسن'
    ],
    partnerCareAdvice: 'اگر یهو بی‌دلیل بغض کردی، ناراحت شدی یا دلت گرفت، هیچی نگو فقط بیا تو بغلم. من می‌دونم هورمون‌ها دارن اذیتت می‌کنن و مثل کوه پشتتم و صبورترین تکیه‌گاهتم! 🧸💖',
    colorTheme: 'from-indigo-600 via-purple-600 to-pink-600',
    icon: '🌙',
  },
};

export function calculateCycleStatus(
  lastPeriodStartDateStr: string,
  cycleLength: number = 28,
  periodLength: number = 5
): CycleCalculations {
  const [y, m, d] = lastPeriodStartDateStr.split('-').map(Number);
  const startDate = new Date(y, m - 1, d);
  const now = new Date();
  
  // Set times to midnight for clean day differences
  const startMidnight = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffTime = nowMidnight.getTime() - startMidnight.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Current day in cycle (1-indexed, wrapping around cycleLength)
  let currentDayInCycle = (diffDays % cycleLength) + 1;
  if (currentDayInCycle <= 0) currentDayInCycle += cycleLength;

  let currentPhase: CyclePhase = 'menstrual';
  let dayInPhase = 1;

  if (currentDayInCycle <= periodLength) {
    currentPhase = 'menstrual';
    dayInPhase = currentDayInCycle;
  } else if (currentDayInCycle <= 13) {
    currentPhase = 'follicular';
    dayInPhase = currentDayInCycle - periodLength;
  } else if (currentDayInCycle <= 16) {
    currentPhase = 'ovulation';
    dayInPhase = currentDayInCycle - 13;
  } else {
    currentPhase = 'luteal';
    dayInPhase = currentDayInCycle - 16;
  }

  const daysUntilNextPeriod = cycleLength - currentDayInCycle + 1;
  
  const nextPeriodDate = new Date(nowMidnight);
  nextPeriodDate.setDate(nextPeriodDate.getDate() + daysUntilNextPeriod);

  // Ovulation typically occurs 14 days before next period
  const ovulationDayInCycle = Math.max(1, cycleLength - 14);
  const daysUntilOvulation = (ovulationDayInCycle - currentDayInCycle + cycleLength) % cycleLength;
  const ovulationDate = new Date(nowMidnight);
  ovulationDate.setDate(ovulationDate.getDate() + daysUntilOvulation);

  const fertileWindowStart = new Date(ovulationDate);
  fertileWindowStart.setDate(fertileWindowStart.getDate() - 4);

  const fertileWindowEnd = new Date(ovulationDate);
  fertileWindowEnd.setDate(fertileWindowEnd.getDate() + 1);

  const isPeriodToday = currentDayInCycle <= periodLength;

  const baseInfo = PHASE_MEDICAL_DATA[currentPhase];
  const phaseInfo: CyclePhaseInfo = {
    ...baseInfo,
    dayInPhase,
    dayInCycle: currentDayInCycle,
  };

  return {
    currentDayInCycle,
    currentPhase,
    phaseInfo,
    daysUntilNextPeriod,
    nextPeriodDate,
    ovulationDate,
    fertileWindowStart,
    fertileWindowEnd,
    isPeriodToday,
    cycleLength,
    periodLength,
  };
}

export function getPersianMonthGrid(year: number, monthIndex: number) {
  // Returns days array for building custom calendar
  const daysInMonth = 30; // standard approximation for display
  return Array.from({ length: daysInMonth }, (_, i) => i + 1);
}
