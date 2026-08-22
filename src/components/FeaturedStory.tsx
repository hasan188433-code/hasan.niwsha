import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Heart, Star } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import defaultHugPhoto from '../assets/images/hug_sweet_memory_1787218233230.jpg';
import { subscribeFeaturedStory } from '../services/realtimeSync';

const STORY_IMG_LOCAL_KEY = 'custom_featured_story_image';
const STORY_CAPTION_LOCAL_KEY = 'custom_featured_story_caption';

export const FeaturedStory: React.FC = () => {
  const { theme } = useTheme();
  
  // Initialize with stored custom image or fallback to bundled host photo
  const [photoUrl, setPhotoUrl] = useState<string>(() => {
    return localStorage.getItem(STORY_IMG_LOCAL_KEY) || defaultHugPhoto;
  });
  const [caption, setCaption] = useState<string>(() => {
    return localStorage.getItem(STORY_CAPTION_LOCAL_KEY) || 'بغل تو زیباترین خاطره ایه که میتونه برام ساخته بشه';
  });

  // Real-time Firestore sync across all devices
  useEffect(() => {
    const unsubStory = subscribeFeaturedStory((data) => {
      if (data) {
        if (data.imageUrl) {
          const isOldCdn = data.imageUrl.includes('cdn-files-a.com') || data.imageUrl.includes('files.cdn-files-a.com');
          if (!isOldCdn) {
            setPhotoUrl(data.imageUrl);
            localStorage.setItem(STORY_IMG_LOCAL_KEY, data.imageUrl);
          }
        }
        if (data.caption) {
          setCaption(data.caption);
          localStorage.setItem(STORY_CAPTION_LOCAL_KEY, data.caption);
        }
      }
    });

    return () => {
      unsubStory();
    };
  }, []);

  const displayPhoto = photoUrl || defaultHugPhoto;

  return (
    <section id="story-section" className="w-full max-w-5xl mx-auto px-4 py-8 font-vazir">
      <motion.div
        initial={{ opacity: 0.95, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          backgroundColor: theme.cardBg,
          borderColor: theme.cardBorder,
        }}
        className="rounded-3xl border p-6 sm:p-8 md:p-10 shadow-2xl relative overflow-hidden backdrop-blur-md"
      >
        {/* Subtle decorative glow */}
        <div
          className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ backgroundColor: theme.primaryColor }}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Content Column */}
          <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
            {/* Tagline */}
            <div className="flex items-center gap-3">
              <span className="w-8 h-[2px] rounded-full" style={{ backgroundColor: theme.primaryColor }} />
              <span className="text-xs sm:text-sm font-medium" style={{ color: theme.accentColor }}>
                شروع روزی که حسن عاشق شد
              </span>
            </div>

            {/* Main Quote Heading */}
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white leading-tight">
              عاشق شدن قشنگه ولی عاشق کسی شدن که معجزس واقعا محشره
            </h2>

            {/* Story Paragraph */}
            <p className="text-xs sm:text-sm md:text-base text-neutral-300/90 leading-relaxed text-justify">
              ساعت ۴ بامداد ۱۷ اردیبهشت ۱۴۰۵، لحظه‌ای بود که حسن به زیباترین نعمت دنیا دست پیدا کرد. روزی بود که حسن فهمید یه الماس پیدا کرده میون سنگ‌های ارزون.
            </p>

            {/* Two Promise Mini-Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Promise 1 */}
              <div
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.35)',
                  borderColor: theme.cardBorder,
                }}
                className="rounded-2xl border p-4 flex flex-col items-center text-center space-y-2.5 transition-all duration-300 hover:scale-[1.02]"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${theme.primaryColor}25`, color: theme.accentColor }}
                >
                  <Heart className="w-4 h-4 fill-current" />
                </div>
                <p className="text-[11px] sm:text-xs text-neutral-200 leading-relaxed">
                  شاید نتونم به همه آرزوهات برسونمت ولی قول میدم تا عمر دارم خوشحال نگهت دارم
                </p>
              </div>

              {/* Promise 2 */}
              <div
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.35)',
                  borderColor: theme.cardBorder,
                }}
                className="rounded-2xl border p-4 flex flex-col items-center text-center space-y-2.5 transition-all duration-300 hover:scale-[1.02]"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${theme.primaryColor}25`, color: theme.accentColor }}
                >
                  <Star className="w-4 h-4" />
                </div>
                <p className="text-[11px] sm:text-xs text-neutral-200 leading-relaxed">
                  از ته وجود منتظر دیدنت تو رخت خواب بعد از یه خواب آروم و دیدنت بعد از خستگی کار هستم
                </p>
              </div>
            </div>
          </div>

          {/* Image Column - Permanent Static Image */}
          <div className="lg:col-span-5 flex flex-col items-center w-full">
            <div
              style={{ borderColor: theme.cardBorder }}
              className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl border bg-black/40"
            >
              <img
                src={displayPhoto}
                alt="داستان عاشقی حسن و نیوشا"
                className="w-full h-80 sm:h-96 object-cover object-center"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = defaultHugPhoto;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

              <div className="absolute bottom-4 right-4 left-4 text-center">
                <span className="text-[11px] sm:text-xs text-white font-medium px-3.5 py-1.5 rounded-full bg-black/75 backdrop-blur-md border border-rose-500/30 shadow-lg inline-block leading-relaxed">
                  {caption}
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
};


