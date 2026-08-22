import { MemoryPhoto, DiaryEntry, LoveReason, StarMessage } from '../types';

export const INITIAL_MEMORIES: MemoryPhoto[] = [
  {
    id: 'mem-1',
    title: 'اولین آشنایی',
    description: 'روزی که معجزه اتفاق افتاد و اول نفهمیدیم',
    date: '۱۷ اردیبهشت ۱۴۰۵',
    imageUrl: 'https://files.cdn-files-a.com/uploads/12309867/800_6a7a40b9b8fb2.jpg?format=avif',
  },
  {
    id: 'mem-2',
    title: 'اولین سوپرایز',
    description: 'شب من را با وجودت نورانی کردی و حالا نوبت من بود',
    date: '۲۴ خرداد ۱۴۰۵',
    imageUrl: 'https://files.cdn-files-a.com/uploads/12309867/800_6a7a40f7b8de2.png?format=avif',
  },
  {
    id: 'mem-3',
    title: 'اولین دیت',
    description: 'آرزویی که خیلی زود خاطره میشود',
    date: '۸ تیر ۱۴۰۵',
    imageUrl: 'https://files.cdn-files-a.com/uploads/12309867/800_6a7a418b72159.jpg?format=avif',
  },
  {
    id: 'mem-4',
    title: 'سوپرایز یهویی',
    description: 'به کمک الیف برای نیوشا لپ لپ گرفتم و ذوق کرد',
    date: '۱۲ مرداد ۱۴۰۵',
    imageUrl: 'https://files.cdn-files-a.com/uploads/12309867/pluginUploadFilesPublic/800_6a7b12dab705c.jpg',
  },
  {
    id: 'mem-5',
    title: 'به عشق آسمان',
    description: 'چون دوتامون عاشقشیم 🙏🏻💗😔',
    date: '۱۵ مرداد ۱۴۰۵',
    imageUrl: 'https://files.cdn-files-a.com/uploads/12309867/pluginUploadFilesPublic/800_6a7b12df8561c.jpg',
  },
  {
    id: 'mem-6',
    title: 'بیشترین ذوق حسن',
    description: 'امروز نمیدونم چیشد. ولی باعث شد فقط40دقیقه قربون صدقه دخترم برم و رو عکس بمونم و دورش بگردم❤️',
    date: '۲۰ مرداد ۱۴۰۵',
    imageUrl: 'https://files.cdn-files-a.com/uploads/12309867/u_c/800_6a7dfd59c83e5.jpg',
  },
  {
    id: 'mem-7',
    title: 'خورشید زندگیم',
    description: 'دختری که نور زندگیم شد',
    date: '۲۵ مرداد ۱۴۰۵',
    imageUrl: 'https://files.cdn-files-a.com/uploads/12309867/u_c/800_6a820c2383598.jpg',
  },
];

export const INITIAL_DIARY_ENTRIES: DiaryEntry[] = [
  {
    id: 'diary-1a00c00e05dcd02',
    author: 'نیوشا',
    date: '۲۵ مرداد ۱۴۰۵',
    content: 'امروزززززززززز شوهرییییییی برامممم برنامه درست کرده بوددددددد مخصوص خودممممممم باورمممممم نمیشههههه دارم میمیرم از ذوققققققق وای امروز قشنگ ترین روزمه 😭😭😭💕💕💕مگه میشه یکی ایقد دوست داشتنی باشهههههه عاشقتم بهترین شوهری دنیاااااااا وای خودااااا کاش یک روز توهم همینطور بنویسی و همینقدر خوش‌حالت کنم\nقربونت برم مرسیییییییی شوهری نانازیم 💕💕💕😭😭😭💞💞💞🩷🩷💗💗',
    createdAt: 1786881600000,
  },
  {
    id: 'diary-19ff0c4df8e13cb',
    author: 'نیوشا تاج سر حسن عشق زندگیش',
    date: '۲۰ مرداد ۱۴۰۵',
    content: 'امروز شوهری منو خوشحال کرد خیلیییییییییییییی زیاد فهمیدم خیلیییییییییی دوستش میدارمممم وای امروز خیلی خیلی خوشحالمممممممم 😭😭😭😭💞💞💞💞خیلیییییییییییییی دوست میدارم',
    createdAt: 1786449600000,
  },
  {
    id: 'diary-19fedd6349b5b55',
    author: 'حسن',
    date: '۲۰ مرداد ۱۴۰۵',
    content: 'صد روز شد که عاشق کسی شدم که از ته قلب دوستش دارم',
    createdAt: 1786435200000,
  },
];

export const INITIAL_LOVE_REASONS: LoveReason[] = [
  {
    id: 'reason-1',
    text: 'چون معجزه بودی تو زندگیم',
    expandedNote: 'آمدنت به زندگی من معجزه‌ای بود که همه چیز را زیباتر کرد.',
  },
  {
    id: 'reason-2',
    text: 'چون وقتی میخندی از ته دل میگم آخیش',
    expandedNote: 'خنده‌های از ته دلت تمام آرامش این دنیا رو به قلبم می‌بخشه.',
  },
  {
    id: 'reason-3',
    text: 'چون صدات وقتی لوس میکنی عملا غش میکنم',
    expandedNote: 'قشنگ‌ترین لحن و صدای جهان که دلم رو پر از قند می‌کنه.',
  },
  {
    id: 'reason-4',
    text: 'چون میدونم رفیق روزای سخت و شریک دنیامی',
    expandedNote: 'پشتگرمی تو در تمام لحظات زندگی، بزرگترین دارایی منه.',
  },
  {
    id: 'reason-5',
    text: 'چون با هر نگاهت دوباره دلم میره',
    expandedNote: 'چشم‌های تو امن‌ترین و قشنگ‌ترین نقطه این جهان برای من هستن.',
  },
  {
    id: 'reason-6',
    text: 'چون با تو می‌تونم خودِ واقعیم باشم، بدون هیچ ترسی.',
    expandedNote: 'کنار تو نیازی به هیچ نقابی نیست؛ در آرامش کامل‌ترین نسخه خودم هستم.',
  },
];

export const STAR_MESSAGES: StarMessage[] = [
  {
    id: 'star-1',
    title: 'ستاره امید',
    message: 'نیوشای عزیزم، تو روشن‌ترین ستاره آسمان تاریک منی.',
    x: 20,
    y: 25,
    size: 24,
  },
  {
    id: 'star-2',
    title: 'ستاره وفاداری',
    message: 'قول میدم تا ابد دستاتو محکم نگه دارم و پشتت باشم.',
    x: 75,
    y: 30,
    size: 28,
  },
  {
    id: 'star-3',
    title: 'ستاره آرامش',
    message: 'هر وقت دلت گرفت، به یاد بیار که یک نفر در دنیا تمام دنیایش تویی.',
    x: 45,
    y: 45,
    size: 32,
  },
  {
    id: 'star-4',
    title: 'ستاره لبخند',
    message: 'خندیدن تو، رسالت اصلی زندگی منه.',
    x: 82,
    y: 70,
    size: 22,
  },
  {
    id: 'star-5',
    title: 'ستاره ۱۰۰ روزگی',
    message: 'این ۱۰۰ روز تازه شروع یک مسیر بی‌پایان از عشق واقعی ماست.',
    x: 18,
    y: 75,
    size: 30,
  },
];
