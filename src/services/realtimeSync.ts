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
// 4. PHOTO GALLERY / MEMORIES REAL-TIME SYNC (Firestore Persistent Cloud Backed)
// -------------------------------------------------------------
export const subscribeMemories = (
  onUpdate: (memories: MemoryPhoto[]) => void
): (() => void) => {
  const memoriesDocRef = doc(db, 'site_data', 'memories');
  let isInitial = true;

  const unsubscribe = onSnapshot(
    memoriesDocRef,
    async (snapshot) => {
      if (snapshot.exists() && Array.isArray(snapshot.data()?.items)) {
        const items = snapshot.data().items as MemoryPhoto[];
        if (items.length > 0) {
          onUpdate(items);
          return;
        }
      }

      // If document does not exist or has empty items, seed with baseline/server data
      if (isInitial) {
        isInitial = false;
        try {
          const res = await fetch('/api/memories');
          let initialList: MemoryPhoto[] = INITIAL_MEMORIES;
          if (res.ok) {
            const serverList = await res.json();
            if (Array.isArray(serverList) && serverList.length > 0) {
              initialList = serverList;
            }
          }
          await setDoc(memoriesDocRef, { items: initialList, lastUpdated: Date.now() }, { merge: true });
          onUpdate(initialList);
        } catch (e) {
          onUpdate(INITIAL_MEMORIES);
        }
      }
    },
    (error) => {
      console.warn('Firestore memories snapshot listener error:', error);
      fetch('/api/memories')
        .then((r) => r.json())
        .then((list) => {
          if (Array.isArray(list)) onUpdate(list);
        })
        .catch(() => onUpdate(INITIAL_MEMORIES));
    }
  );

  return unsubscribe;
};

export const addMemoryRealtime = async (newPhoto: Omit<MemoryPhoto, 'id'>) => {
  try {
    const memoriesDocRef = doc(db, 'site_data', 'memories');
    const snap = await getDoc(memoriesDocRef);
    let current: MemoryPhoto[] = [];
    if (snap.exists() && Array.isArray(snap.data()?.items)) {
      current = snap.data().items;
    } else {
      current = [...INITIAL_MEMORIES];
    }

    const newItem: MemoryPhoto = {
      id: `mem-${Date.now()}`,
      title: newPhoto.title || '',
      description: newPhoto.description || '',
      imageUrl: newPhoto.imageUrl || '',
      date: newPhoto.date || '',
    };

    const updated = [...current, newItem];
    await setDoc(memoriesDocRef, { items: updated, lastUpdated: Date.now() }, { merge: true });

    // Also sync to server API for redundancy
    fetch('/api/memories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPhoto),
    }).catch(() => {});

    return updated;
  } catch (e) {
    console.error('Firestore memories save error:', e);
    const res = await fetch('/api/memories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPhoto),
    });
    if (res.ok) {
      const data = await res.json();
      return data.memories;
    }
  }
};

export const updateMemoryRealtime = async (id: string, partial: Partial<Omit<MemoryPhoto, 'id'>>) => {
  try {
    const memoriesDocRef = doc(db, 'site_data', 'memories');
    const snap = await getDoc(memoriesDocRef);
    let current: MemoryPhoto[] = [];
    if (snap.exists() && Array.isArray(snap.data()?.items)) {
      current = snap.data().items;
    } else {
      current = [...INITIAL_MEMORIES];
    }

    const updated = current.map((item) => {
      if (item.id === id) {
        return { ...item, ...partial };
      }
      return item;
    });

    await setDoc(memoriesDocRef, { items: updated, lastUpdated: Date.now() }, { merge: true });

    fetch('/api/memories/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...partial }),
    }).catch(() => {});

    return updated;
  } catch (e) {
    console.error('Firestore memories update error:', e);
    const res = await fetch('/api/memories/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...partial }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.memories;
    }
  }
};

export const deleteMemoryRealtime = async (id: string) => {
  try {
    const memoriesDocRef = doc(db, 'site_data', 'memories');
    const snap = await getDoc(memoriesDocRef);
    let current: MemoryPhoto[] = [];
    if (snap.exists() && Array.isArray(snap.data()?.items)) {
      current = snap.data().items;
    } else {
      current = [...INITIAL_MEMORIES];
    }

    const updated = current.filter((item) => item.id !== id);
    await setDoc(memoriesDocRef, { items: updated, lastUpdated: Date.now() }, { merge: true });

    fetch(`/api/memories/${id}`, {
      method: 'DELETE',
    }).catch(() => {});

    return updated;
  } catch (e) {
    console.error('Firestore memories delete error:', e);
    const res = await fetch(`/api/memories/${id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      const data = await res.json();
      return data.memories;
    }
  }
};

// -------------------------------------------------------------
// 5. DIARY ENTRIES REAL-TIME SYNC (Firestore Persistent Cloud Backed)
// -------------------------------------------------------------
export const subscribeDiary = (
  onUpdate: (diary: DiaryEntry[]) => void
): (() => void) => {
  const diaryDocRef = doc(db, 'site_data', 'diary');
  let isInitial = true;

  const unsubscribe = onSnapshot(
    diaryDocRef,
    async (snapshot) => {
      if (snapshot.exists() && Array.isArray(snapshot.data()?.items)) {
        const items = snapshot.data().items as DiaryEntry[];
        if (items.length > 0) {
          onUpdate(items);
          return;
        }
      }

      if (isInitial) {
        isInitial = false;
        try {
          const res = await fetch('/api/diary');
          let initialList: DiaryEntry[] = INITIAL_DIARY_ENTRIES;
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
      }
    },
    (error) => {
      console.warn('Firestore diary snapshot listener error:', error);
      fetch('/api/diary')
        .then((r) => r.json())
        .then((list) => {
          if (Array.isArray(list)) onUpdate(list);
        })
        .catch(() => onUpdate(INITIAL_DIARY_ENTRIES));
    }
  );

  return unsubscribe;
};

export const addDiaryEntryRealtime = async (author: string, content: string, date: string) => {
  try {
    const diaryDocRef = doc(db, 'site_data', 'diary');
    const snap = await getDoc(diaryDocRef);
    let current: DiaryEntry[] = [];
    if (snap.exists() && Array.isArray(snap.data()?.items)) {
      current = snap.data().items;
    } else {
      current = [...INITIAL_DIARY_ENTRIES];
    }

    const newEntry: DiaryEntry = {
      id: `diary-${Date.now()}`,
      author: author || 'حسن',
      content: content || '',
      date: date || '',
      createdAt: Date.now(),
    };

    // Prepend new entry so latest is on top
    const updated = [newEntry, ...current];
    await setDoc(diaryDocRef, { items: updated, lastUpdated: Date.now() }, { merge: true });

    fetch('/api/diary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author, content, date }),
    }).catch(() => {});

    return updated;
  } catch (e) {
    console.error('Firestore diary save error:', e);
    const res = await fetch('/api/diary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author, content, date }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.diary;
    }
  }
};

export const updateDiaryEntryRealtime = async (id: string, newContent: string) => {
  try {
    const diaryDocRef = doc(db, 'site_data', 'diary');
    const snap = await getDoc(diaryDocRef);
    let current: DiaryEntry[] = [];
    if (snap.exists() && Array.isArray(snap.data()?.items)) {
      current = snap.data().items;
    } else {
      current = [...INITIAL_DIARY_ENTRIES];
    }

    const updated = current.map((entry) => {
      if (entry.id === id) {
        return { ...entry, content: newContent };
      }
      return entry;
    });

    await setDoc(diaryDocRef, { items: updated, lastUpdated: Date.now() }, { merge: true });

    fetch('/api/diary/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, content: newContent }),
    }).catch(() => {});

    return updated;
  } catch (e) {
    console.error('Firestore diary update error:', e);
    const res = await fetch('/api/diary/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, content: newContent }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.diary;
    }
  }
};

export const deleteDiaryEntryRealtime = async (id: string) => {
  try {
    const diaryDocRef = doc(db, 'site_data', 'diary');
    const snap = await getDoc(diaryDocRef);
    let current: DiaryEntry[] = [];
    if (snap.exists() && Array.isArray(snap.data()?.items)) {
      current = snap.data().items;
    } else {
      current = [...INITIAL_DIARY_ENTRIES];
    }

    const updated = current.filter((entry) => entry.id !== id);
    await setDoc(diaryDocRef, { items: updated, lastUpdated: Date.now() }, { merge: true });

    fetch(`/api/diary/${id}`, {
      method: 'DELETE',
    }).catch(() => {});

    return updated;
  } catch (e) {
    console.error('Firestore diary delete error:', e);
    const res = await fetch(`/api/diary/${id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      const data = await res.json();
      return data.diary;
    }
  }
};

// -------------------------------------------------------------
// 7. HASAN CARE LOGS REAL-TIME SYNC
// -------------------------------------------------------------
export interface CareLogItem {
  id: string;
  action: string;
  icon: string;
  timestamp: string;
  actor: 'hasan' | 'niosha';
}

export const subscribeCareLogs = (
  onUpdate: (logs: CareLogItem[]) => void
): (() => void) => {
  const careDocRef = doc(db, 'site_data', 'care_logs');

  const unsubscribe = onSnapshot(
    careDocRef,
    (snapshot) => {
      if (snapshot.exists() && Array.isArray(snapshot.data()?.items)) {
        onUpdate(snapshot.data().items);
      } else {
        onUpdate([]);
      }
    },
    (error) => {
      console.warn('Firestore care_logs snapshot listener error:', error);
    }
  );

  return unsubscribe;
};

export const addCareLogRealtime = async (action: string, icon: string, actor: 'hasan' | 'niosha' = 'hasan') => {
  try {
    const careDocRef = doc(db, 'site_data', 'care_logs');
    const snap = await getDoc(careDocRef);
    let current: CareLogItem[] = [];
    if (snap.exists() && Array.isArray(snap.data()?.items)) {
      current = snap.data().items;
    }

    const newItem: CareLogItem = {
      id: `care-${Date.now()}`,
      action,
      icon,
      timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      actor,
    };

    const updated = [newItem, ...current].slice(0, 30); // keep last 30 logs
    await setDoc(careDocRef, { items: updated, lastUpdated: Date.now() }, { merge: true });
    return updated;
  } catch (err) {
    console.error('Error adding care log in Firestore:', err);
    return [];
  }
};

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

// -------------------------------------------------------------
// 8. DAILY MESSAGE REAL-TIME SYNC (Firestore Persistent Backed)
// -------------------------------------------------------------
export const subscribeDailyMessage = (
  onUpdate: (data: any) => void
): (() => void) => {
  const msgDocRef = doc(db, 'site_data', 'daily_message');

  const unsubscribe = onSnapshot(
    msgDocRef,
    async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        onUpdate(data);
      } else {
        // Fallback or baseline
        try {
          const res = await fetch('/api/daily-message');
          if (res.ok) {
            const serverData = await res.json();
            if (serverData && serverData.text) {
              const initData = {
                text: serverData.text,
                dateKey: serverData.dateKey,
                updatedAt: serverData.updatedAt,
                history: serverData.history || [],
              };
              await setDoc(msgDocRef, initData, { merge: true });
              onUpdate(initData);
            }
          }
        } catch (e) {
          console.warn('Error fetching daily message baseline:', e);
        }
      }
    },
    (error) => {
      console.warn('Firestore daily_message snapshot listener error:', error);
    }
  );

  return unsubscribe;
};

export const saveDailyMessageRealtime = async (newText: string) => {
  try {
    // Call host API first to generate history and split keys on server side
    const res = await fetch('/api/daily-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: newText }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.dailyMessage) {
        // Save the generated/returned object directly into Firestore so it matches perfectly
        const msgDocRef = doc(db, 'site_data', 'daily_message');
        await setDoc(msgDocRef, data.dailyMessage, { merge: true });
        return data.dailyMessage;
      }
    }
  } catch (err) {
    console.error('Error saving daily message in Firestore:', err);
  }
  return null;
};


