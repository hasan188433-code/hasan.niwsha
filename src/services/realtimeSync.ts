import { db } from '../lib/firebase';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { MemoryPhoto, DiaryEntry } from '../types';
import { INITIAL_MEMORIES, INITIAL_DIARY_ENTRIES } from '../data/initialData';

// -------------------------------------------------------------
// 1. PERIOD SETTINGS REAL-TIME SYNC
// -------------------------------------------------------------
export interface PeriodSettingsData {
  lastPeriodDate: string;
  cycleLength: number;
  periodLength: number;
  lastUpdated?: number;
}

const DEFAULT_PERIOD_SETTINGS: PeriodSettingsData = {
  lastPeriodDate: '2026-08-16',
  cycleLength: 28,
  periodLength: 5,
};

export const subscribePeriodSettings = (
  onUpdate: (data: PeriodSettingsData) => void
): (() => void) => {
  const periodDocRef = doc(db, 'site_data', 'period_settings');

  const unsubscribe = onSnapshot(
    periodDocRef,
    async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as PeriodSettingsData;
        onUpdate(data);
      } else {
        // Initialize with default or server data if not yet in Firestore
        try {
          const res = await fetch('/api/period-settings');
          let initData = DEFAULT_PERIOD_SETTINGS;
          if (res.ok) {
            const serverData = await res.json();
            if (serverData && serverData.lastPeriodDate) {
              initData = {
                lastPeriodDate: serverData.lastPeriodDate,
                cycleLength: serverData.cycleLength || 28,
                periodLength: serverData.periodLength || 5,
              };
            }
          }
          await setDoc(periodDocRef, { ...initData, lastUpdated: Date.now() }, { merge: true });
          onUpdate(initData);
        } catch (e) {
          onUpdate(DEFAULT_PERIOD_SETTINGS);
        }
      }
    },
    (error) => {
      console.warn('Firestore period_settings snapshot listener error:', error);
    }
  );

  return unsubscribe;
};

export const savePeriodSettingsRealtime = async (settings: Partial<PeriodSettingsData>) => {
  try {
    const periodDocRef = doc(db, 'site_data', 'period_settings');
    const updatePayload = {
      ...settings,
      lastUpdated: Date.now(),
    };
    await setDoc(periodDocRef, updatePayload, { merge: true });

    // Also sync to server API for redundancy
    fetch('/api/period-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    }).catch(() => {});
  } catch (err) {
    console.error('Error saving period settings in Firestore:', err);
  }
};

// -------------------------------------------------------------
// 2. FEATURED STORY REAL-TIME SYNC
// -------------------------------------------------------------
export interface FeaturedStoryData {
  imageUrl: string;
  caption: string;
  lastUpdated?: number;
}

export const subscribeFeaturedStory = (
  onUpdate: (data: FeaturedStoryData) => void
): (() => void) => {
  const storyDocRef = doc(db, 'site_data', 'featured_story');

  const unsubscribe = onSnapshot(
    storyDocRef,
    async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as FeaturedStoryData;
        onUpdate(data);
      } else {
        // Fetch from server /api/featured-story as baseline
        try {
          const res = await fetch('/api/featured-story');
          if (res.ok) {
            const serverData = await res.json();
            if (serverData && serverData.imageUrl) {
              const initData: FeaturedStoryData = {
                imageUrl: serverData.imageUrl,
                caption: serverData.caption || 'بغل تو زیباترین خاطره ایه که میتونه برام ساخته بشه',
                lastUpdated: Date.now(),
              };
              await setDoc(storyDocRef, initData, { merge: true });
              onUpdate(initData);
            }
          }
        } catch (e) {}
      }
    },
    (error) => {
      console.warn('Firestore featured_story snapshot listener error:', error);
    }
  );

  return unsubscribe;
};

export const saveFeaturedStoryRealtime = async (story: Partial<FeaturedStoryData>) => {
  try {
    const storyDocRef = doc(db, 'site_data', 'featured_story');
    const updatePayload = {
      ...story,
      lastUpdated: Date.now(),
    };
    await setDoc(storyDocRef, updatePayload, { merge: true });

    // Sync to server API
    fetch('/api/featured-story', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(story),
    }).catch(() => {});
  } catch (err) {
    console.error('Error saving featured story in Firestore:', err);
  }
};

// -------------------------------------------------------------
// 3. SITE LOGO REAL-TIME SYNC
// -------------------------------------------------------------
export interface SiteLogoData {
  customLogoUrl: string | null;
  showLogoUpload: boolean;
  lastUpdated?: number;
}

export const subscribeSiteLogo = (
  onUpdate: (data: SiteLogoData) => void
): (() => void) => {
  const logoDocRef = doc(db, 'site_data', 'site_logo');

  const unsubscribe = onSnapshot(
    logoDocRef,
    async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as SiteLogoData;
        onUpdate(data);
      } else {
        try {
          const res = await fetch('/api/logo');
          if (res.ok) {
            const serverData = await res.json();
            const initData: SiteLogoData = {
              customLogoUrl: serverData?.customLogoUrl || null,
              showLogoUpload: serverData?.showLogoUpload !== false,
              lastUpdated: Date.now(),
            };
            await setDoc(logoDocRef, initData, { merge: true });
            onUpdate(initData);
          }
        } catch (e) {}
      }
    },
    (error) => {
      console.warn('Firestore site_logo snapshot listener error:', error);
    }
  );

  return unsubscribe;
};

export const saveSiteLogoRealtime = async (logoData: Partial<SiteLogoData>) => {
  try {
    const logoDocRef = doc(db, 'site_data', 'site_logo');
    const updatePayload = {
      ...logoData,
      lastUpdated: Date.now(),
    };
    await setDoc(logoDocRef, updatePayload, { merge: true });

    // Sync to server API
    fetch('/api/logo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logoData),
    }).catch(() => {});
  } catch (err) {
    console.error('Error saving site logo in Firestore:', err);
  }
};

// -------------------------------------------------------------
// 4. PHOTO GALLERY / MEMORIES REAL-TIME SYNC
// -------------------------------------------------------------
export const subscribeMemories = (
  onUpdate: (memories: MemoryPhoto[]) => void
): (() => void) => {
  const memDocRef = doc(db, 'site_data', 'memories');

  const unsubscribe = onSnapshot(
    memDocRef,
    async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && Array.isArray(data.items)) {
          onUpdate(data.items);
          return;
        }
      }

      // Initialize from server API or initialData if not yet seeded
      try {
        const res = await fetch('/api/memories');
        let initialList = INITIAL_MEMORIES;
        if (res.ok) {
          const serverList = await res.json();
          if (Array.isArray(serverList) && serverList.length > 0) {
            initialList = serverList;
          }
        }
        await setDoc(memDocRef, { items: initialList, lastUpdated: Date.now() }, { merge: true });
        onUpdate(initialList);
      } catch (e) {
        onUpdate(INITIAL_MEMORIES);
      }
    },
    (error) => {
      console.warn('Firestore memories snapshot listener error:', error);
    }
  );

  return unsubscribe;
};

export const saveMemoriesListRealtime = async (memories: MemoryPhoto[]) => {
  try {
    const memDocRef = doc(db, 'site_data', 'memories');
    await setDoc(memDocRef, { items: memories, lastUpdated: Date.now() }, { merge: true });
  } catch (err) {
    console.error('Error saving memories in Firestore:', err);
  }
};

export const addMemoryRealtime = async (newPhoto: Omit<MemoryPhoto, 'id'>) => {
  const memDocRef = doc(db, 'site_data', 'memories');
  const snap = await getDoc(memDocRef);
  let current: MemoryPhoto[] = INITIAL_MEMORIES;
  if (snap.exists() && Array.isArray(snap.data().items)) {
    current = snap.data().items;
  }
  const item: MemoryPhoto = {
    ...newPhoto,
    id: `mem-${Date.now()}`,
  };
  const updated = [...current, item];
  await saveMemoriesListRealtime(updated);

  // Sync to server
  fetch('/api/memories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newPhoto),
  }).catch(() => {});
};

export const updateMemoryRealtime = async (id: string, partial: Partial<Omit<MemoryPhoto, 'id'>>) => {
  const memDocRef = doc(db, 'site_data', 'memories');
  const snap = await getDoc(memDocRef);
  let current: MemoryPhoto[] = INITIAL_MEMORIES;
  if (snap.exists() && Array.isArray(snap.data().items)) {
    current = snap.data().items;
  }
  const updated = current.map((p) => (p.id === id ? { ...p, ...partial } : p));
  await saveMemoriesListRealtime(updated);

  // Sync to server
  fetch('/api/memories/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...partial }),
  }).catch(() => {});
};

export const deleteMemoryRealtime = async (id: string) => {
  const memDocRef = doc(db, 'site_data', 'memories');
  const snap = await getDoc(memDocRef);
  let current: MemoryPhoto[] = INITIAL_MEMORIES;
  if (snap.exists() && Array.isArray(snap.data().items)) {
    current = snap.data().items;
  }
  const updated = current.filter((p) => p.id !== id);
  await saveMemoriesListRealtime(updated);

  // Sync to server
  fetch(`/api/memories/${id}`, {
    method: 'DELETE',
  }).catch(() => {});
};

// -------------------------------------------------------------
// 5. DIARY ENTRIES REAL-TIME SYNC
// -------------------------------------------------------------
export const subscribeDiary = (
  onUpdate: (diary: DiaryEntry[]) => void
): (() => void) => {
  const diaryDocRef = doc(db, 'site_data', 'diary');

  const unsubscribe = onSnapshot(
    diaryDocRef,
    async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && Array.isArray(data.items)) {
          onUpdate(data.items);
          return;
        }
      }

      // Initialize from server API or initialData if not yet seeded
      try {
        const res = await fetch('/api/diary');
        let initialList = INITIAL_DIARY_ENTRIES;
        if (res.ok) {
          const serverList = await res.json();
          if (Array.isArray(serverList) && serverList.length > 0) {
            initialList = serverList;
          }
        }
        await setDoc(diaryDocRef, { items: initialList, lastUpdated: Date.now() }, { merge: true });
        onUpdate(initialList);
      } catch (e) {
        onUpdate(INITIAL_DIARY_ENTRIES);
      }
    },
    (error) => {
      console.warn('Firestore diary snapshot listener error:', error);
    }
  );

  return unsubscribe;
};

export const saveDiaryListRealtime = async (diary: DiaryEntry[]) => {
  try {
    const diaryDocRef = doc(db, 'site_data', 'diary');
    await setDoc(diaryDocRef, { items: diary, lastUpdated: Date.now() }, { merge: true });
  } catch (err) {
    console.error('Error saving diary in Firestore:', err);
  }
};

export const addDiaryEntryRealtime = async (author: string, content: string, date: string) => {
  const diaryDocRef = doc(db, 'site_data', 'diary');
  const snap = await getDoc(diaryDocRef);
  let current: DiaryEntry[] = INITIAL_DIARY_ENTRIES;
  if (snap.exists() && Array.isArray(snap.data().items)) {
    current = snap.data().items;
  }
  const newEntry: DiaryEntry = {
    id: `diary-${Date.now()}`,
    author,
    content,
    date,
    createdAt: Date.now(),
  };
  const updated = [newEntry, ...current];
  await saveDiaryListRealtime(updated);

  // Sync to server
  fetch('/api/diary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ author, content, date }),
  }).catch(() => {});
};

export const updateDiaryEntryRealtime = async (id: string, newContent: string) => {
  const diaryDocRef = doc(db, 'site_data', 'diary');
  const snap = await getDoc(diaryDocRef);
  let current: DiaryEntry[] = INITIAL_DIARY_ENTRIES;
  if (snap.exists() && Array.isArray(snap.data().items)) {
    current = snap.data().items;
  }
  const updated = current.map((entry) => (entry.id === id ? { ...entry, content: newContent } : entry));
  await saveDiaryListRealtime(updated);

  // Sync to server
  fetch('/api/diary/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, content: newContent }),
  }).catch(() => {});
};

export const deleteDiaryEntryRealtime = async (id: string) => {
  const diaryDocRef = doc(db, 'site_data', 'diary');
  const snap = await getDoc(diaryDocRef);
  let current: DiaryEntry[] = INITIAL_DIARY_ENTRIES;
  if (snap.exists() && Array.isArray(snap.data().items)) {
    current = snap.data().items;
  }
  const updated = current.filter((entry) => entry.id !== id);
  await saveDiaryListRealtime(updated);

  // Sync to server
  fetch(`/api/diary/${id}`, {
    method: 'DELETE',
  }).catch(() => {});
};

// -------------------------------------------------------------
// 6. 3D BOSS GLB MODEL REAL-TIME SYNC
// -------------------------------------------------------------
export interface BossModelSyncData {
  hasCustomModel: boolean;
  modelUrl: string;
  fileName?: string;
  updatedAt: number;
}

export const subscribeBossModel = (
  onUpdate: (data: BossModelSyncData) => void
): (() => void) => {
  const bossDocRef = doc(db, 'site_data', 'boss_model');

  const unsubscribe = onSnapshot(
    bossDocRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as BossModelSyncData;
        onUpdate(data);
      }
    },
    (error) => {
      console.warn('Firestore boss_model snapshot listener error:', error);
    }
  );

  return unsubscribe;
};

export const saveBossModelRealtime = async (data: Partial<BossModelSyncData>) => {
  try {
    const bossDocRef = doc(db, 'site_data', 'boss_model');
    const updatePayload: BossModelSyncData = {
      hasCustomModel: true,
      modelUrl: '/api/boss-model',
      updatedAt: Date.now(),
      ...data,
    };
    await setDoc(bossDocRef, updatePayload, { merge: true });
  } catch (err) {
    console.error('Error saving boss model sync data in Firestore:', err);
  }
};

