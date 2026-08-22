import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

// Persistent Period Settings File
const DATA_DIR = path.join(process.cwd(), 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'period-settings.json');
const MEMORIES_FILE = path.join(DATA_DIR, 'memories.json');
const DIARY_FILE = path.join(DATA_DIR, 'diary.json');
const FEATURED_STORY_FILE = path.join(DATA_DIR, 'featured-story.json');
const DAILY_MESSAGE_FILE = path.join(DATA_DIR, 'daily-message.json');
const LOGO_FILE = path.join(DATA_DIR, 'logo.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

app.use('/uploads', express.static(UPLOADS_DIR));

const PERSIAN_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
];

interface PeriodSettings {
  lastPeriodDate: string;
  cycleLength: number;
  periodLength: number;
  lastUpdated: string;
}

let defaultPeriodSettings: PeriodSettings = {
  lastPeriodDate: '2026-08-16',
  cycleLength: 28,
  periodLength: 5,
  lastUpdated: new Date().toISOString(),
};

// Ensure data directory exists
function loadPeriodSettings(): PeriodSettings {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      return { ...defaultPeriodSettings, ...JSON.parse(data) };
    } else {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(defaultPeriodSettings, null, 2));
    }
  } catch (err) {
    console.error('Error reading period settings:', err);
  }
  return defaultPeriodSettings;
}

function savePeriodSettings(settings: Partial<PeriodSettings>): PeriodSettings {
  const current = loadPeriodSettings();
  const updated: PeriodSettings = {
    ...current,
    ...settings,
    lastUpdated: new Date().toISOString(),
  };
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2));
  } catch (err) {
    console.error('Error writing period settings:', err);
  }
  return updated;
}

// Persian Shamsi Date parser and comparison for sorting
function parsePersianShamsiDate(dateStr: string): { jy: number; jm: number; jd: number } | null {
  if (!dateStr) return null;
  
  // Convert Persian digits to English digits
  const persianToEnglishMap: { [key: string]: string } = {
    '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
    '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9'
  };
  let normalizedStr = dateStr.toString().replace(/[۰-۹]/g, (char) => persianToEnglishMap[char] || char);
  
  let foundMonthIdx = -1;
  let foundMonthName = '';
  for (let i = 0; i < PERSIAN_MONTHS.length; i++) {
    if (normalizedStr.includes(PERSIAN_MONTHS[i])) {
      foundMonthIdx = i;
      foundMonthName = PERSIAN_MONTHS[i];
      break;
    }
  }
  
  if (foundMonthIdx === -1) {
    const match = normalizedStr.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (match) {
      return { jy: parseInt(match[1]), jm: parseInt(match[2]), jd: parseInt(match[3]) };
    }
    return null;
  }
  
  const numbers = normalizedStr.replace(foundMonthName, ' ').match(/\d+/g);
  if (!numbers || numbers.length < 1) return null;
  
  let jd = 1;
  let jy = 1405; // default
  
  if (numbers.length === 1) {
    jd = parseInt(numbers[0]);
  } else if (numbers.length >= 2) {
    const num1 = parseInt(numbers[0]);
    const num2 = parseInt(numbers[1]);
    if (num1 > 1300) {
      jy = num1;
      jd = num2;
    } else {
      jd = num1;
      jy = num2;
    }
  }
  
  return { jy, jm: foundMonthIdx + 1, jd };
}

function comparePersianDates(aStr: string | undefined, bStr: string | undefined): number {
  if (!aStr) return 1;
  if (!bStr) return -1;
  
  const a = parsePersianShamsiDate(aStr);
  const b = parsePersianShamsiDate(bStr);
  
  if (!a) return 1;
  if (!b) return -1;
  
  if (a.jy !== b.jy) return a.jy - b.jy;
  if (a.jm !== b.jm) return a.jm - b.jm;
  return a.jd - b.jd;
}

function compareMemories(a: any, b: any): number {
  const aNum = parseInt(a.id.replace('mem-', '')) || 0;
  const bNum = parseInt(b.id.replace('mem-', '')) || 0;
  return aNum - bNum;
}

function compareDiaryEntries(a: any, b: any): number {
  const dateComp = comparePersianDates(a.date, b.date);
  if (dateComp !== 0) return dateComp;
  return (a.createdAt || 0) - (b.createdAt || 0);
}

// Memories Persistence
function loadMemories(): any[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(MEMORIES_FILE)) {
      const data = fs.readFileSync(MEMORIES_FILE, 'utf-8');
      return JSON.parse(data);
    } else {
      const initial = [
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
        }
      ];
      fs.writeFileSync(MEMORIES_FILE, JSON.stringify(initial, null, 2));
      return initial;
    }
  } catch (err) {
    console.error('Error loading memories:', err);
    return [];
  }
}

function saveMemories(memories: any[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(MEMORIES_FILE, JSON.stringify(memories, null, 2));
  } catch (err) {
    console.error('Error saving memories:', err);
  }
}

// Diary Persistence
function loadDiary(): any[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DIARY_FILE)) {
      const data = fs.readFileSync(DIARY_FILE, 'utf-8');
      return JSON.parse(data);
    } else {
      const initial = [
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
        }
      ];
      fs.writeFileSync(DIARY_FILE, JSON.stringify(initial, null, 2));
      return initial;
    }
  } catch (err) {
    console.error('Error loading diary:', err);
    return [];
  }
}

function saveDiary(diary: any[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DIARY_FILE, JSON.stringify(diary, null, 2));
  } catch (err) {
    console.error('Error saving diary:', err);
  }
}

interface FeaturedStoryData {
  imageUrl: string;
  caption: string;
  title?: string;
  storyText?: string;
  hideUpload?: boolean;
}

function loadFeaturedStory(): FeaturedStoryData {
  const defaultStory: FeaturedStoryData = {
    imageUrl: 'https://files.cdn-files-a.com/uploads/12309867/hug_sweet_memory_1787218233230.jpg',
    caption: 'بغل تو زیباترین خاطره ایه که میتونه برام ساخته بشه',
    title: 'عاشق شدن قشنگه ولی عاشق کسی شدن که معجزس واقعا محشره',
    storyText: 'ساعت ۴ بامداد ۱۷ اردیبهشت ۱۴۰۵، لحظه‌ای بود که حسن به زیباترین نعمت دنیا دست پیدا کرد. روزی بود که حسن فهمید یه الماس پیدا کرده میون سنگ‌های ارزون.',
  };

  try {
    if (fs.existsSync(FEATURED_STORY_FILE)) {
      const data = fs.readFileSync(FEATURED_STORY_FILE, 'utf-8');
      return { ...defaultStory, ...JSON.parse(data) };
    } else {
      fs.writeFileSync(FEATURED_STORY_FILE, JSON.stringify(defaultStory, null, 2));
      return defaultStory;
    }
  } catch (err) {
    console.error('Error loading featured story:', err);
    return defaultStory;
  }
}

function saveFeaturedStory(story: Partial<FeaturedStoryData>): FeaturedStoryData {
  const current = loadFeaturedStory();
  const updated = { ...current, ...story };
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(FEATURED_STORY_FILE, JSON.stringify(updated, null, 2));
  } catch (err) {
    console.error('Error saving featured story:', err);
  }
  return updated;
}

interface DailyMessageData {
  text: string;
  dateKey: string; // YYYY-MM-DD to track daily refresh cycle
  updatedAt: string;
  history?: Array<{ text: string; dateKey: string; updatedAt: string }>;
}

const DEFAULT_DAILY_MESSAGE: DailyMessageData = {
  text: 'نیوشای قشنگم و ماهِ شب‌های تاریکم، امروز هم مثل هر روز و بیشتر از دیروز با تمام وجودم عاشقتم و ثانیه به ثانیه به یادتم ❤️✨',
  dateKey: new Date().toISOString().split('T')[0],
  updatedAt: new Date().toISOString(),
  history: [],
};

function loadDailyMessage(): DailyMessageData {
  try {
    if (fs.existsSync(DAILY_MESSAGE_FILE)) {
      const data = fs.readFileSync(DAILY_MESSAGE_FILE, 'utf-8');
      return { ...DEFAULT_DAILY_MESSAGE, ...JSON.parse(data) };
    } else {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DAILY_MESSAGE_FILE, JSON.stringify(DEFAULT_DAILY_MESSAGE, null, 2));
      return DEFAULT_DAILY_MESSAGE;
    }
  } catch (err) {
    console.error('Error loading daily message:', err);
    return DEFAULT_DAILY_MESSAGE;
  }
}

function saveDailyMessage(newText: string): DailyMessageData {
  const current = loadDailyMessage();
  const todayKey = new Date().toISOString().split('T')[0];
  
  const history = Array.isArray(current.history) ? [...current.history] : [];
  if (current.text && current.text !== newText) {
    history.unshift({
      text: current.text,
      dateKey: current.dateKey || todayKey,
      updatedAt: current.updatedAt || new Date().toISOString(),
    });
  }

  const updated: DailyMessageData = {
    text: newText.trim(),
    dateKey: todayKey,
    updatedAt: new Date().toISOString(),
    history: history.slice(0, 30), // keep last 30 daily notes
  };

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DAILY_MESSAGE_FILE, JSON.stringify(updated, null, 2));
  } catch (err) {
    console.error('Error saving daily message:', err);
  }
  return updated;
}

// Lazy-initialized Gemini Client
let genAI: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey =
    process.env.MY_GEMINI_KEY ||
    process.env.CUSTOM_GEMINI_KEY ||
    process.env.GOOGLE_AI_KEY ||
    process.env.GEMINI_KEY ||
    process.env.MY_GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn('Gemini API key is not set. AI assistant will use rich local medical responses.');
    return null;
  }
  if (!genAI) {
    genAI = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAI;
}

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Site Logo Endpoints (Persistent across all devices & mobile)
app.get('/api/logo', (req: Request, res: Response) => {
  try {
    if (fs.existsSync(LOGO_FILE)) {
      const data = JSON.parse(fs.readFileSync(LOGO_FILE, 'utf-8'));
      return res.json(data);
    }
  } catch (err) {
    console.error('Error reading logo file:', err);
  }
  return res.json({ customLogoUrl: null, showLogoUpload: true });
});

app.post('/api/logo', (req: Request, res: Response) => {
  try {
    const { customLogoUrl, showLogoUpload } = req.body;
    let current: any = {};
    if (fs.existsSync(LOGO_FILE)) {
      try {
        current = JSON.parse(fs.readFileSync(LOGO_FILE, 'utf-8'));
      } catch {
        current = {};
      }
    }
    const updated = {
      customLogoUrl: customLogoUrl !== undefined ? customLogoUrl : current.customLogoUrl || null,
      showLogoUpload: showLogoUpload !== undefined ? showLogoUpload : current.showLogoUpload ?? true,
      updatedAt: new Date().toISOString(),
    };
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(LOGO_FILE, JSON.stringify(updated, null, 2));
    return res.json({ success: true, logo: updated });
  } catch (err) {
    console.error('Error saving logo file:', err);
    return res.status(500).json({ error: 'Failed to save logo' });
  }
});

// Shared Period Settings Endpoints (Durable across all devices)
app.get('/api/period-settings', (req: Request, res: Response) => {
  const settings = loadPeriodSettings();
  res.json(settings);
});

app.post('/api/period-settings', (req: Request, res: Response) => {
  const { lastPeriodDate, cycleLength, periodLength } = req.body;
  const updated = savePeriodSettings({
    ...(lastPeriodDate ? { lastPeriodDate } : {}),
    ...(typeof cycleLength === 'number' ? { cycleLength } : {}),
    ...(typeof periodLength === 'number' ? { periodLength } : {}),
  });
  res.json({ success: true, settings: updated });
});

// Memory API Endpoints
app.get('/api/memories', (req: Request, res: Response) => {
  const memories = loadMemories();
  memories.sort(compareMemories);
  res.json(memories);
});

app.post('/api/memories', (req: Request, res: Response) => {
  const { title, description, imageUrl, date } = req.body;
  const memories = loadMemories();
  const newMemory = {
    id: `mem-${Date.now()}`,
    title: title || '',
    description: description || '',
    imageUrl: imageUrl || '',
    date: date || '',
  };
  memories.push(newMemory);
  memories.sort(compareMemories);
  saveMemories(memories);
  res.json({ success: true, memories });
});

app.post('/api/memories/update', (req: Request, res: Response) => {
  const { id, title, description, imageUrl, date } = req.body;
  const memories = loadMemories();
  const index = memories.findIndex(m => m.id === id);
  if (index !== -1) {
    memories[index] = {
      ...memories[index],
      ...(title !== undefined ? { title } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(imageUrl !== undefined ? { imageUrl } : {}),
      ...(date !== undefined ? { date } : {}),
    };
    memories.sort(compareMemories);
    saveMemories(memories);
    res.json({ success: true, memories });
  } else {
    res.status(404).json({ success: false, error: 'خاطره پیدا نشد' });
  }
});

app.delete('/api/memories/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  let memories = loadMemories();
  memories = memories.filter(m => m.id !== id);
  saveMemories(memories);
  res.json({ success: true, memories });
});

// Diary API Endpoints
app.get('/api/diary', (req: Request, res: Response) => {
  const diary = loadDiary();
  diary.sort(compareDiaryEntries);
  res.json(diary);
});

app.post('/api/diary', (req: Request, res: Response) => {
  const { author, content, date } = req.body;
  const diary = loadDiary();
  const newEntry = {
    id: `diary-${Date.now()}`,
    author: author || 'حسن',
    content: content || '',
    date: date || '',
    createdAt: Date.now(),
  };
  diary.push(newEntry);
  diary.sort(compareDiaryEntries);
  saveDiary(diary);
  res.json({ success: true, diary });
});

app.post('/api/diary/update', (req: Request, res: Response) => {
  const { id, content } = req.body;
  const diary = loadDiary();
  const index = diary.findIndex(d => d.id === id);
  if (index !== -1) {
    diary[index].content = content || '';
    diary.sort(compareDiaryEntries);
    saveDiary(diary);
    res.json({ success: true, diary });
  } else {
    res.status(404).json({ success: false, error: 'خاطره پیدا نشد' });
  }
});

app.delete('/api/diary/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  let diary = loadDiary();
  diary = diary.filter(d => d.id !== id);
  saveDiary(diary);
  res.json({ success: true, diary });
});

// Featured Story API
app.get('/api/featured-story', (req: Request, res: Response) => {
  const story = loadFeaturedStory();
  res.json(story);
});

app.post('/api/featured-story', (req: Request, res: Response) => {
  const { imageUrl, caption, title, storyText, hideUpload } = req.body;
  const updated = saveFeaturedStory({
    ...(imageUrl ? { imageUrl } : {}),
    ...(caption ? { caption } : {}),
    ...(title ? { title } : {}),
    ...(storyText ? { storyText } : {}),
    ...(typeof hideUpload === 'boolean' ? { hideUpload } : {}),
  });
  res.json({ success: true, story: updated });
});

// Upload API to save images directly to server host
app.post('/api/upload', (req: Request, res: Response) => {
  try {
    const { imageBase64, filename } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ success: false, error: 'تصویری دریافت نشد' });
    }

    const matches = imageBase64.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
    let ext = 'jpg';
    let buffer: Buffer;

    if (matches && matches.length === 3) {
      ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(imageBase64, 'base64');
    }

    const cleanFilename = filename ? `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}` : `img-${Date.now()}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, cleanFilename);
    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${cleanFilename}`;
    res.json({ success: true, url: publicUrl });
  } catch (err: any) {
    console.error('Error handling upload:', err);
    res.status(500).json({ success: false, error: err?.message || 'Upload failed' });
  }
});

// Boss Custom 3D Model Persistence on Host
const BOSS_MODEL_FILE = path.join(DATA_DIR, 'custom-boss-model.glb');

app.get('/api/boss-model', (req: Request, res: Response) => {
  try {
    if (fs.existsSync(BOSS_MODEL_FILE)) {
      res.setHeader('Content-Type', 'model/gltf-binary');
      return res.sendFile(BOSS_MODEL_FILE);
    }
    return res.status(404).json({ exists: false });
  } catch (err: any) {
    console.error('Error reading boss model:', err);
    res.status(500).json({ error: 'Failed to read boss model' });
  }
});

app.post('/api/boss-model', (req: Request, res: Response) => {
  try {
    const { modelBase64 } = req.body;
    if (!modelBase64) {
      return res.status(400).json({ success: false, error: 'مدلی دریافت نشد' });
    }

    let buffer: Buffer;
    if (modelBase64.includes('base64,')) {
      buffer = Buffer.from(modelBase64.split('base64,')[1], 'base64');
    } else {
      buffer = Buffer.from(modelBase64, 'base64');
    }

    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(BOSS_MODEL_FILE, buffer);
    res.json({ success: true, url: '/api/boss-model' });
  } catch (err: any) {
    console.error('Error saving boss model:', err);
    res.status(500).json({ success: false, error: err?.message || 'Save failed' });
  }
});

app.delete('/api/boss-model', (req: Request, res: Response) => {
  try {
    if (fs.existsSync(BOSS_MODEL_FILE)) {
      fs.unlinkSync(BOSS_MODEL_FILE);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Delete failed' });
  }
});

// Period & Health AI Chat Assistant Endpoint
app.post('/api/period-ai/chat', async (req: Request, res: Response) => {
  try {
    const { message, history, context } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'پیام ارسال شده نامعتبر است.' });
    }

    const ai = getGeminiClient();

    // System instruction: Smart, concise, natural & warm companion
    const currentPhaseTitle = context?.currentPhase || '';
    const dayInCycle = context?.dayInCycle || '';
    const daysUntilNext = context?.daysUntilNextPeriod !== undefined ? context?.daysUntilNextPeriod : '';
    const isPeriodToday = context?.isPeriodToday;

    const cycleInfoSummary = `
وضعیت چرخه فعلی نیوشا:
- فاز فعلی: ${currentPhaseTitle || 'نامشخص'}
- روز چرخه: ${dayInCycle ? `روز ${dayInCycle} از چرخه قاعدگی` : 'ثبت‌نشده'}
- وضعیت امروز: ${isPeriodToday ? 'امروز در دوران خونریزی پریود است' : `حدود ${daysUntilNext} روز تا شروع پریود بعدی مانده`}
`.trim();

    const systemInstruction = `تو دستیار و همراه هوشمند نیوشا هستی.
پیش‌زمینه و شناخت تو:
- کاربر تو «نیوشا» است و پارتنر/دوست‌پسر او «حسن» نام دارد که این اپلیکیشن و دستیار را برای راحتی و سلامتی او ساخته است.
- آیدی‌های تلگرام: حسن (7727131610)، نیوشا (6119619827).
- تو قدرت و قابلیت کامل ارسال مستقیم پیام به پیوی تلگرام حسن یا نیوشا داری!
- اگر نیوشا از تو خواست که به حسن پیام بفرستی، خبرش کنی، چیزی بهش بگی یا پیامی براش ارسال کنی (مثلاً بگه «به حسن بگو...»، «بهش پیام بده»، «به حسن خبر بده»، «ارسال کن برای حسن...»)، حتماً با خوشرویی قبول کن و پیامی گرم و مناسب برای حسن تنظیم کن.
- **دستور ارسال پیام تلگرام:** برای اینکه سیستم پیام را به پیوی تلگرام ارسال کند، دقیقاً دستور زیر را در انتهای پاسخ خود درج کن:
` + '`' + `[TELEGRAM_SEND:HASAN:متن پیامی که باید برای حسن در تلگرام ارسال شود]` + '`' + `
اگر نیوشا خواست برای خودش پیام فرستاده شود:
` + '`' + `[TELEGRAM_SEND:NIOSHA:متن پیام]` + '`' + `

مثال: اگر نیوشا گفت «به حسن بگو برام شکلات بخره»، بگو:
«چشم نیوشا جانم 💕 همین الان پیام رو به تلگرام حسن فرستادم تا برات تهیه کنه!»
و در خط آخر قرار بده:
[TELEGRAM_SEND:HASAN:سلام حسن جان، نیوشا جان گفت لطفا برام شکلات بگیری 💕]

- تو وضعیت دقیق چرخه ماهانه و پریود نیوشا را می‌دانی:
${cycleInfoSummary}
اگر نیوشا از درد، بی‌حوصلگی، حال بد، تغذیه یا روزمرگی گفت، وضعیت روز چرخه و فاز او را در نظر بگیر و متناسب با آن راهنمایی کن.

قوانین لحن و پاسخ‌دهی (بسیار مهم):
۱. **پاسخ‌های خلاصه، مفید و سرراست:** از نوشتن متن‌های خیلی طولانی و طوماری خودداری کن. پاسخ‌ها نهایتاً در ۲ الی ۴ پاراگراف کوتاه یا چند نکته کوتاه و شفاف باشد.
۲. **لحن طبیعی، محترمانه، صمیمی و دوستانه:** مثل یک دوست باهوش، مهربان و فهمیده صحبت کن. از ایموجی‌های مناسب به اندازه (۱-۲ عدد) استفاده کن.
۳. **گفتگوی آزاد:** درباره هر موضوعی که بپرسد سریع، دقیق و باهوش پاسخ بده.`;

    if (!ai) {
      console.log('Gemini API key not found in env vars.');
      const fallbackResponse = `سلام نیوشا جان 🌸 پیامت رو دیدم.
اگر نیاز به استراحت یا تسکین داری، دمنوش گرم یا کیسه آب‌گرم خیلی کمک‌کننده‌ست. هر سوال دیگه‌ای داری بپرس، در خدمتم!`;

      return res.json({ reply: fallbackResponse });
    }

    // Build chat contents including history
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    if (Array.isArray(history)) {
      for (const item of history.slice(-8)) {
        if (item && item.text && (item.role === 'user' || item.role === 'model')) {
          contents.push({
            role: item.role === 'user' ? 'user' : 'model',
            parts: [{ text: item.text }],
          });
        }
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    // Try ultra-fast flash-lite models first for highest availability and sub-second response times
    const CANDIDATE_MODELS = [
      'gemini-3.1-flash-lite',
      'gemini-flash-latest',
      'gemini-3.7-flash',
    ];

    let responseText = '';
    let lastError: any = null;

    for (const modelName of CANDIDATE_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
            maxOutputTokens: 500,
          },
        });
        if (response && response.text) {
          responseText = response.text;
          break;
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    if (!responseText) {
      throw lastError || new Error('No response returned from Gemini models');
    }

    let reply = responseText || 'نیوشای عزیزم و قشنگم، همیشه اینجام تا کنارت باشم و باهات حرف بزنم 🌸✨';

    // Check for TELEGRAM_SEND tag in Gemini's response
    const telegramMatch = reply.match(/\[TELEGRAM_SEND:(HASAN|NIOSHA):([\s\S]+?)\]/);
    if (telegramMatch) {
      const recipient = telegramMatch[1];
      const msgToSend = telegramMatch[2].trim();
      const targetChatId = recipient === 'NIOSHA' ? '6119619827' : '7727131610';
      const botToken = '8862334189:AAEA5ETL6RQcsP3VUDLDLFo7YP7621CIBQo';

      // Clean the response text shown in the web UI
      reply = reply.replace(/\[TELEGRAM_SEND:(HASAN|NIOSHA):([\s\S]+?)\]/g, '').trim();

      // Dispatch telegram message asynchronously
      fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: targetChatId,
          text: `💌 **پیام جدید از دستیار جمینای نیوشا:**\n\n${msgToSend}`,
          parse_mode: 'Markdown',
        }),
      }).catch((err) => console.error('Error dispatching Telegram message from Gemini:', err));
    }

    return res.json({ reply });
  } catch (error: any) {
    console.error('Error in /api/period-ai/chat:', error?.message || error);
    return res.json({
      reply: `نیوشای عزیزم، من همیشه در کنارت هستم 🌸
حسن مهربونت این دستیار رو برات ساخته تا هیچ‌وقت تنها نباشی و هر وقت خواستی درد دل کنی یا چیزی بپرسی پیشت باشم. 
اگه حالت ناخوشه یا خسته‌ای، یه استراحت خوب بکن و بذار حسن با یه آغوش گرم، ماساژ یا خوراکی خوشمزه حالت رو جا بیاره! 💖🫂`,
    });
  }
});

// Telegram Notification Relay Endpoint
app.post('/api/telegram-notify', async (req: Request, res: Response) => {
  try {
    const { note, message, botToken, chatId, targetUser } = req.body;
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
    if (tgData.ok) {
      return res.json({ success: true, message: 'ارسال شد' });
    } else {
      return res.status(400).json({ success: false, error: tgData.description });
    }
  } catch (err: any) {
    console.error('Error in /api/telegram-notify:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Server error' });
  }
});

// Daily Message Endpoints (Persistent on host)
app.get('/api/daily-message', (req: Request, res: Response) => {
  try {
    const dailyData = loadDailyMessage();
    const todayKey = new Date().toISOString().split('T')[0];
    const isNewDay = dailyData.dateKey !== todayKey;
    
    return res.json({
      ...dailyData,
      todayKey,
      isNewDay,
    });
  } catch (err) {
    console.error('Error in GET /api/daily-message:', err);
    return res.status(500).json({ error: 'Failed to load daily message' });
  }
});

app.post('/api/daily-message', (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ success: false, error: 'متن پیام نمی‌تواند خالی باشد' });
    }

    const updated = saveDailyMessage(text.trim());
    return res.json({ success: true, dailyMessage: updated });
  } catch (err) {
    console.error('Error in POST /api/daily-message:', err);
    return res.status(500).json({ success: false, error: 'خطا در ذخیره پیام روزانه' });
  }
});

// Base64 Image Upload Endpoint
app.post('/api/upload', (req: Request, res: Response) => {
  try {
    const { imageBase64, filename } = req.body;
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ success: false, error: 'اطلاعات عکس ارسالی نامعتبر است' });
    }

    let base64Content = imageBase64;
    if (imageBase64.includes('base64,')) {
      base64Content = imageBase64.split('base64,')[1];
    }

    const binaryBuffer = Buffer.from(base64Content, 'base64');
    const safeName = (filename || 'story_image.jpg').replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueName = `${Date.now()}_${safeName}`;
    const filePath = path.join(UPLOADS_DIR, uniqueName);

    fs.writeFileSync(filePath, binaryBuffer);
    return res.json({ success: true, url: `/uploads/${uniqueName}` });
  } catch (err: any) {
    console.error('Error in /api/upload:', err);
    return res.status(500).json({ success: false, error: 'خطا در آپلود فایل' });
  }
});

// Custom GLB Boss Model Persistence Endpoints
const BOSS_MODEL_GLB_FILE = path.join(DATA_DIR, 'boss-model.glb');

app.get('/api/boss-model', (req: Request, res: Response) => {
  try {
    if (fs.existsSync(BOSS_MODEL_GLB_FILE)) {
      res.setHeader('Content-Type', 'application/octet-stream');
      return res.sendFile(BOSS_MODEL_GLB_FILE);
    }
    return res.status(404).json({ error: 'No custom boss model found' });
  } catch (err) {
    console.error('Error getting boss model:', err);
    return res.status(500).json({ error: 'Server error loading boss model' });
  }
});

app.post('/api/boss-model', (req: Request, res: Response) => {
  try {
    const { modelBase64 } = req.body;
    if (!modelBase64 || typeof modelBase64 !== 'string') {
      return res.status(400).json({ error: 'Invalid model data' });
    }

    let base64Content = modelBase64;
    if (modelBase64.includes('base64,')) {
      base64Content = modelBase64.split('base64,')[1];
    }

    const binaryBuffer = Buffer.from(base64Content, 'base64');

    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    fs.writeFileSync(BOSS_MODEL_GLB_FILE, binaryBuffer);
    return res.json({ success: true });
  } catch (err: any) {
    console.error('Error saving boss model:', err);
    return res.status(500).json({ error: 'Server error saving boss model: ' + err.message });
  }
});

app.delete('/api/boss-model', (req: Request, res: Response) => {
  try {
    if (fs.existsSync(BOSS_MODEL_GLB_FILE)) {
      fs.unlinkSync(BOSS_MODEL_GLB_FILE);
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('Error deleting boss model:', err);
    return res.status(500).json({ error: 'Server error deleting boss model' });
  }
});

// Conversational Gemini Chat in Quiz Lounge
app.post('/api/quiz/chat', async (req: Request, res: Response) => {
  try {
    const { message, sender, history, currentTopic, totalSetsPlayed, setWins, lastSetScores, previousTopics } = req.body;
    const ai = getGeminiClient();
    if (!ai) return res.status(500).json({ error: 'AI client not available' });

    let matchContext = `اطلاعات مسابقه فعلی:\n- تعداد ست‌های بازی شده تاکنون: ${totalSetsPlayed || 0}\n`;
    if (setWins) {
      matchContext += `- تعداد بردهای ست: حسن (${setWins['حسن'] || 0} ست) - نیوشا (${setWins['نیوشا'] || 0} ست)\n`;
    }
    if (lastSetScores) {
      matchContext += `- امتیازات ست قبلی که تموم شد: حسن ${lastSetScores['حسن'] || 0} امتیاز، نیوشا ${lastSetScores['نیوشا'] || 0} امتیاز\n`;
    }
    if (Array.isArray(previousTopics) && previousTopics.length > 0) {
      matchContext += `- موضوعاتی که در ست‌های قبلی بازی شده‌اند: ${previousTopics.join('، ')}\n`;
    }

    const systemInstruction = `You are Gemini (جمینای), the witty, warm, sweet, romantic, and engaging game-show host and close friend for the lovely Iranian couple "Hasan" (حسن) and "Niusha" (نیوشا).
They are currently in the Break Room / Lounge (اتاق استراحت) chatting and coordinating with you before starting their next 10-question couple recognition quiz set.

${matchContext}

CRITICAL INSTRUCTIONS & MEMORY:
1. Speak in friendly, sweet, lively, and natural conversational Persian (فارسی صمیمی، بامزه، با انرژی مثبت و دلنشین).
2. FULL CONVERSATIONAL MEMORY: You have access to the entire conversation history from all previous sets and turns. You remember everything Hasan and Niusha said to you before, jokes they made, who won earlier sets, what topics you already played, and what they like/dislike. Reference past moments naturally when relevant!
3. COORDINATION BEFORE EVERY SET: Hasan and Niusha must coordinate and agree on a topic with you before starting each new set.
4. DO NOT assume every message is a quiz topic! If they say hello, joke around, tease each other about the last set's score, ask how you are, or chat about random stuff, CHAT NATURALLY WITH THEM like a fun best friend and game host!
5. If they ask for ideas or suggestions for topics/themes, suggest 2 to 4 creative, funny, or deep themes (e.g. سفرها و ماجراجویی‌های دونفره، رازها و شیطنت‌های دوران کودکی، سوتی‌های خنده‌دار، عادات روزمره و قلق‌ها، رویاها و آینده، سلیقه غذایی، خاطرات آشنایی).
6. TOPIC AGREEMENT / FINALIZATION:
   - When Hasan and/or Niusha clearly agree or decide on a specific quiz topic for the upcoming set (e.g. "موضوع سفرها باشه", "حله بریم روی غذاها", "سوتی‌های بچگی رو بساز", "موضوع اخلاق و قلق‌ها عالیه همینو بذار", "همین موضوع سفر که گفتی خوبه"), OR when they explicitly tell you to set a topic:
     Confirm it enthusiastically AND append this exact tag at the very end of your reply:
     [CONFIRMED_TOPIC: نام موضوع انتخابی]
     Example: [CONFIRMED_TOPIC: خاطرات و سفرهای دونفره]
   - If they have NOT agreed or decided on a topic yet and are just chatting, asking questions, joking, or brainstorming, DO NOT include any [CONFIRMED_TOPIC: ...] tag!
7. Keep your answers concise, engaging, and sweet (2 to 4 sentences maximum) so that it feels like a fast, lively chat on mobile.`;

    // Construct conversation history for Gemini (send up to 30 past messages for deep memory)
    const contents: any[] = [];

    if (Array.isArray(history) && history.length > 0) {
      const recentHistory = history.slice(-30);
      for (const h of recentHistory) {
        if (h.sender === 'جمینای') {
          contents.push({
            role: 'model',
            parts: [{ text: h.text }],
          });
        } else {
          contents.push({
            role: 'user',
            parts: [{ text: `[${h.sender}]: ${h.text}` }],
          });
        }
      }
    }

    // Add current message
    contents.push({
      role: 'user',
      parts: [{ text: `[${sender || 'کاربر'}]: ${message}${currentTopic ? ` (موضوع تایید شده فعلی: ${currentTopic})` : ''}` }],
    });

    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.7-flash'];
    let rawReply = '';

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction,
            maxOutputTokens: 250,
          },
        });
        if (response.text) {
          rawReply = response.text;
          break;
        }
      } catch (err: any) {
        // Fallback to next model
      }
    }

    if (!rawReply) {
      rawReply = `سلام به شما دو تا عشق قشنگ! چه بحث باحالی، هر موضوعی که دوست دارین مثل سفرها، خاطرات یا رازها رو بگین تا با هم هماهنگش کنیم! ✨`;
    }

    // Check for [CONFIRMED_TOPIC: ...]
    let confirmedTopic: string | null = null;
    const topicMatch = rawReply.match(/\[CONFIRMED_TOPIC:\s*([\s\S]+?)\]/i);
    if (topicMatch) {
      confirmedTopic = topicMatch[1].trim();
      rawReply = rawReply.replace(/\[CONFIRMED_TOPIC:\s*[\s\S]+?\]/gi, '').trim();
    }

    res.json({
      reply: rawReply,
      confirmedTopic,
    });
  } catch (error: any) {
    console.error('Error in /api/quiz/chat:', error);
    res.json({
      reply: `درود به هر دو نفرتون! نظرتون درباره موضوع سفرها، علایق غذایی یا خاطرات شیرین چیه؟ هر چی بگین آماده‌ام! 💖`,
      confirmedTopic: null,
    });
  }
});

// Quiz generation endpoint
app.post('/api/quiz/confirm-topic', async (req: Request, res: Response) => {
  try {
    const { topic } = req.body;
    const ai = getGeminiClient();
    if (!ai) return res.status(500).json({ error: 'AI client not available' });

    const systemInstruction = `You are the host of a romantic recognition game for Hasan and Niusha. 
    The user just suggested a topic: "${topic}". 
    Acknowledge this topic in a very short, warm, and romantic Persian sentence (max 15 words). 
    Confirm that you will design the next 10 questions around this theme. 
    Example: "چه انتخاب عالی‌ای! ۱۰ سوال جذاب درباره ${topic} برای شما طراحی می‌کنم."`;

    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.7-flash'];
    let replyText = '';

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [{ role: 'user', parts: [{ text: `موضوع انتخابی ما اینه: ${topic}` }] }],
          config: {
            systemInstruction,
            maxOutputTokens: 100,
          }
        });
        if (response.text) {
          replyText = response.text;
          break;
        }
      } catch (err: any) {
        // Silently fallback to next model
      }
    }

    if (!replyText) {
      replyText = `عالیه! ۱۰ سوال اختصاصی و جذاب درباره «${topic}» براتون طراحی می‌کنم. ✨`;
    }

    res.json({ message: replyText });
  } catch (error: any) {
    console.error('Error in /api/quiz/confirm-topic:', error);
    res.json({ message: `موضوع «${req.body?.topic || 'انتخابی'}» ثبت شد و سوالات بر همین اساس طراحی می‌شن! ✨` });
  }
});

// Helper to generate emergency backup questions if AI is in temporary peak demand
function generateFallbackQuestions(topic?: string): any[] {
  const currentTopic = topic ? ` (درباره ${topic})` : '';
  const now = Date.now();
  
  const hasanQuestions = [
    {
      id: `h_${now}_1`,
      subject: "حسن",
      text: `به نظر شما در زمینه «${topic || 'زندگی و تفریح'}»، حسن کدام مورد را بیشتر ترجیح می‌دهد؟`,
      options: ["تجربه آرام و خلوت دو نفره", "هیجان و ماجراجویی جدید", "برنامه‌ریزی دقیق از قبل", "تصمیم‌گیری یهویی و بدون برنامه"],
      correctAnswerIdx: 0
    },
    {
      id: `h_${now}_2`,
      subject: "حسن",
      text: `بزرگترین اولویت حسن در رابطه و همفکری${currentTopic} چیست؟`,
      options: ["صداقت و روراستی کامل", "درک متقابل در شرایط سخت", "خندیدن و شاد بودن در کنار هم", "ساختن اهداف مشترک آینده"],
      correctAnswerIdx: 1
    },
    {
      id: `h_${now}_3`,
      subject: "حسن",
      text: `وقتی حسن در موقعیت${currentTopic} دچار استرس یا خستگی می‌شود، چه رفتاری دارد؟`,
      options: ["نیاز به کمی سکوت و تفکر شخصی", "صحبت کردن و دردودل طولانی", "پیاده‌روی یا بیرون رفتن", "سرگرم شدن با موسیقی یا بازی"],
      correctAnswerIdx: 0
    },
    {
      id: `h_${now}_4`,
      subject: "حسن",
      text: `در مورد موضوعات مربوط به ${topic || 'رویاها و آینده'}، ایده آل‌ترین حالت برای حسن چیست؟`,
      options: ["رسیدن به استقلال کامل و آرامش", "سفرهای مداوم و کشف جاهای جدید", "موفقیت بزرگ کاری و مالی", "داشتن خانه گرم با بهترین امکانات"],
      correctAnswerIdx: 0
    },
    {
      id: `h_${now}_5`,
      subject: "حسن",
      text: `رفتاری که بیش از همه می‌تواند حسن را عمیقاً خوشحال و غافلگیر کند چیست؟`,
      options: ["یک پیام محبت‌آمیز بی‌دلیل", "یک هدیه با معنی و خاطره‌انگیز", "درست کردن غذای مورد علاقه‌اش", "گوش دادن با دقت به حرف‌هایش"],
      correctAnswerIdx: 0
    }
  ];

  const niushaQuestions = [
    {
      id: `n_${now}_1`,
      subject: "نیوشا",
      text: `در زمینه «${topic || 'حال خوب و آرامش'}»، نیوشا کدام حس را بیشتر از همه دوست دارد؟`,
      options: ["احساس امنیت و حمایت قلبی", "توجه به جزئیات و سورپرایزهای کوچک", "شنیدن تعریف و تمجید صادقانه", "آزادی و راحتی در بیان احساسات"],
      correctAnswerIdx: 0
    },
    {
      id: `n_${now}_2`,
      subject: "نیوشا",
      text: `اگر قرار باشد نیوشا یک روز کامل را به دلخواه خود${currentTopic} بگذراند، انتخاب اولش چیست؟`,
      options: ["یک روز ریلکس و بدون دغدغه کنار پارتنر", "خرید و گردش در جاهای قشنگ شهر", "طبیعت‌گردی و هوای آزاد", "کافه‌نشینی و صحبت درباره خاطرات"],
      correctAnswerIdx: 0
    },
    {
      id: `n_${now}_3`,
      subject: "نیوشا",
      text: `بزرگترین نقطه حساسیت یا خط قرمز نیوشا در رفتارهای ارتباطی چیست؟`,
      options: ["بی‌توجهی یا کم‌محلی به صحبت‌هایش", "پنهان‌کاری یا نگفتن حقیقت", "بدقولی در زمان‌های مهم", "شوخی‌های نابجا و تند"],
      correctAnswerIdx: 0
    },
    {
      id: `n_${now}_4`,
      subject: "نیوشا",
      text: `در مورد ${topic || 'رویاها و احساسات'}، چه چیزی بیشترین حس پروانه‌ای و ذوق را به نیوشا می‌دهد؟`,
      options: ["یادآوری خاطرات شیرین مشترک", "دیدن تلاش صادقانه پارتنر برای خوشحالی‌اش", "برنامه‌ریزی برای یک سفر عاشقانه", "یک کادوی خاص بدون مناسبت"],
      correctAnswerIdx: 1
    },
    {
      id: `n_${now}_5`,
      subject: "نیوشا",
      text: `نیوشا در مواجهه با چالش‌های${currentTopic} معمولاً ترجیح می‌دهد چگونه برخورد شود؟`,
      options: ["اول شنیده شدن احساساتش، بعد پیدا کردن راه‌حل", "منطقی و سریع رفتن سراغ حل مسئله", "کمی زمان دادن برای آرام شدن جو", "عوض کردن موضوع با شوخی و لبخند"],
      correctAnswerIdx: 0
    }
  ];

  return [...hasanQuestions, ...niushaQuestions];
}

app.post('/api/quiz/generate', async (req: Request, res: Response) => {
  console.log('--- Starting Quiz Generation ---');
  const startTime = Date.now();
  try {
    const ai = getGeminiClient();
    const { previousQuestions, topic } = req.body;
    
    if (ai) {
      const excludedText = Array.isArray(previousQuestions) 
        ? previousQuestions.join('\n')
        : '';

      const systemInstruction = `You are a specialized romantic recognition quiz designer for "Hasan" and "Niusha".
They are getting to know each other.

Your task is to design 10 UNIQUE multiple-choice questions in PERSIAN (Farsi).
CRITICAL STRUCTURE:
- 5 questions must be ABOUT "Hasan" (e.g., "What is Hasan's favorite...").
- 5 questions must be ABOUT "Niusha" (e.g., "What is Niusha's favorite...").

${topic ? `THEME FOR THIS SET: The user specifically requested this topic: "${topic}". Try to center the questions around this, but keep them personal and interesting.` : ''}

STRICT ANTI-REPETITION RULES:
1. DO NOT REPEAT ANY TOPIC OR TEXT FROM THIS LIST:
${excludedText}
2. ABSOLUTELY NO similarity to previous questions.
3. Use a WIDE variety of categories: daily habits, pet peeves, future goals, family memories, work life, funny secrets, etc.
4. Each question MUST have a "subject" field set to either "حسن" or "نیوشا".
5. Return ONLY a valid JSON array.`;

      // Order by highest availability and speed first
      const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.7-flash'];

      for (const modelName of modelsToTry) {
        try {
          console.log(`Attempting generation with model: ${modelName}`);
          const response = await ai.models.generateContent({
            model: modelName,
            contents: [{ role: 'user', parts: [{ text: '۱۰ سوال کاملاً جدید و جذاب (۵ تا حسن، ۵ تا نیوشا) بساز. موضوعات متنوع و متفاوت با سوالات قبلی باشند.' }] }],
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    subject: { type: Type.STRING, enum: ["حسن", "نیوشا"] },
                    text: { type: Type.STRING, description: "متن سوال به فارسی" },
                    options: { 
                      type: Type.ARRAY, 
                      items: { type: Type.STRING },
                      minItems: 4,
                      maxItems: 4,
                      description: "دقیقاً ۴ گزینه به فارسی"
                    },
                    correctAnswerIdx: { type: Type.NUMBER, description: "ایندکس گزینه صحیح" }
                  },
                  required: ['id', 'subject', 'text', 'options', 'correctAnswerIdx']
                }
              }
            },
          });

          const responseText = response.text;
          if (responseText) {
            const duration = Date.now() - startTime;
            console.log(`AI Response received from ${modelName} in ${duration}ms`);
            const questions = JSON.parse(responseText);
            if (Array.isArray(questions) && questions.length > 0) {
              return res.json(questions);
            }
          }
        } catch (err: any) {
          // Model busy or spike, try next candidate
        }
      }
    }

    // Fallback: seamless dynamic question generator
    console.log('Using robust dynamic question generator');
    const fallbackQuestions = generateFallbackQuestions(topic);
    return res.json(fallbackQuestions);

  } catch (error: any) {
    console.error('Quiz generation error:', error);
    const fallbackQuestions = generateFallbackQuestions(req.body?.topic);
    return res.json(fallbackQuestions);
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
