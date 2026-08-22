import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeMode = 'rose' | 'sapphire' | 'amethyst';

export interface ThemeConfig {
  id: ThemeMode;
  name: string;
  subtitle: string;
  badge: string;
  primaryColor: string;
  accentColor: string;
  bgDark: string;
  cardBg: string;
  cardBorder: string;
  textColor: string;
  textGlowClass: string;
  pillBg: string;
  pillBorder: string;
  buttonGradient: string;
  ambientLight1: string;
  ambientLight2: string;
}

export const THEMES: Record<ThemeMode, ThemeConfig> = {
  rose: {
    id: 'rose',
    name: 'سرخ یاقوتی',
    subtitle: 'مخمل رز و عشق کلاسیک',
    badge: '🌹 یاقوتی',
    primaryColor: '#f43f5e',
    accentColor: '#fb7185',
    bgDark: '#0d070b',
    cardBg: '#170914',
    cardBorder: 'rgba(244, 63, 94, 0.35)',
    textColor: '#fce7f3',
    textGlowClass: 'text-glow-rose',
    pillBg: 'rgba(76, 5, 25, 0.35)',
    pillBorder: 'rgba(244, 63, 94, 0.45)',
    buttonGradient: 'from-rose-700 via-pink-600 to-rose-600',
    ambientLight1: 'bg-rose-900/15',
    ambientLight2: 'bg-pink-900/15',
  },
  sapphire: {
    id: 'sapphire',
    name: 'لاجوردی شب',
    subtitle: 'آسمان پرستاره و آرامش کهکشان',
    badge: '🌌 لاجوردی',
    primaryColor: '#38bdf8',
    accentColor: '#818cf8',
    bgDark: '#040914',
    cardBg: '#081426',
    cardBorder: 'rgba(56, 189, 248, 0.35)',
    textColor: '#e0f2fe',
    textGlowClass: 'text-glow-sapphire',
    pillBg: 'rgba(8, 47, 73, 0.35)',
    pillBorder: 'rgba(56, 189, 248, 0.45)',
    buttonGradient: 'from-sky-700 via-indigo-600 to-cyan-600',
    ambientLight1: 'bg-sky-900/15',
    ambientLight2: 'bg-indigo-900/15',
  },
  amethyst: {
    id: 'amethyst',
    name: 'ارغوانی رویایی',
    subtitle: 'آمیتیست و شفق سحرانگیز',
    badge: '🔮 ارغوانی',
    primaryColor: '#c084fc',
    accentColor: '#e879f9',
    bgDark: '#0b0514',
    cardBg: '#160a26',
    cardBorder: 'rgba(192, 132, 252, 0.35)',
    textColor: '#f3e8ff',
    textGlowClass: 'text-glow-amethyst',
    pillBg: 'rgba(59, 7, 100, 0.35)',
    pillBorder: 'rgba(192, 132, 252, 0.45)',
    buttonGradient: 'from-purple-700 via-fuchsia-600 to-violet-600',
    ambientLight1: 'bg-purple-900/15',
    ambientLight2: 'bg-fuchsia-900/15',
  },
};

interface ThemeContextType {
  theme: ThemeConfig;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: THEMES.rose,
  themeMode: 'rose',
  setThemeMode: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('niosha_hasan_theme') as ThemeMode;
    if (saved && THEMES[saved]) return saved;
    return 'rose';
  });

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    localStorage.setItem('niosha_hasan_theme', mode);
  };

  const theme = THEMES[themeMode];

  return (
    <ThemeContext.Provider value={{ theme, themeMode, setThemeMode }}>
      <div
        data-theme={themeMode}
        style={{
          backgroundColor: theme.bgDark,
          color: theme.textColor,
        }}
        className="transition-colors duration-500 min-h-screen"
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
