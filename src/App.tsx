import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { FeaturedStory } from './components/FeaturedStory';
import { LoveReasons } from './components/LoveReasons';
import { PhotoGallery } from './components/PhotoGallery';
import { DiarySection } from './components/DiarySection';
import { Footer } from './components/Footer';
import { SkyGameCanvas } from './game/SkyGameCanvas';
import { PhotoModal } from './components/PhotoModal';
import { AddPhotoModal } from './components/AddPhotoModal';
import { EditPhotoModal } from './components/EditPhotoModal';
import { MemoryPhoto, DiaryEntry } from './types';
import { INITIAL_MEMORIES, INITIAL_DIARY_ENTRIES } from './data/initialData';
import { ThemeProvider, useTheme } from './context/ThemeContext';

import {
  subscribeMemories,
  addMemoryRealtime,
  updateMemoryRealtime,
  deleteMemoryRealtime,
  subscribeDiary,
  addDiaryEntryRealtime,
  updateDiaryEntryRealtime,
  deleteDiaryEntryRealtime,
} from './services/realtimeSync';

function AppContent() {
  const { theme } = useTheme();

  const [memories, setMemories] = useState<MemoryPhoto[]>(INITIAL_MEMORIES);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>(INITIAL_DIARY_ENTRIES);

  // Modals state
  const [isSkyOpen, setIsSkyOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<MemoryPhoto | null>(null);
  const [editingPhoto, setEditingPhoto] = useState<MemoryPhoto | null>(null);
  const [isAddPhotoOpen, setIsAddPhotoOpen] = useState(false);

  // Real-time Firestore listeners for instant multi-device synchronization
  useEffect(() => {
    const unsubMemories = subscribeMemories((updatedMemories) => {
      if (Array.isArray(updatedMemories) && updatedMemories.length > 0) {
        setMemories(updatedMemories);
      }
    });

    const unsubDiary = subscribeDiary((updatedDiary) => {
      if (Array.isArray(updatedDiary) && updatedDiary.length > 0) {
        setDiaryEntries(updatedDiary);
      }
    });

    return () => {
      unsubMemories();
      unsubDiary();
    };
  }, []);

  // Smooth scroll handler & Modal router
  const handleNavigate = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Add new photo memory in real-time
  const handleAddPhoto = (newPhotoData: Omit<MemoryPhoto, 'id'>) => {
    addMemoryRealtime(newPhotoData);
  };

  // Update photo memory in real-time
  const handleUpdatePhoto = (id: string, data: Partial<Omit<MemoryPhoto, 'id'>>) => {
    updateMemoryRealtime(id, data);
    if (selectedPhoto && selectedPhoto.id === id) {
      setSelectedPhoto((prev) => (prev ? { ...prev, ...data } : null));
    }
  };

  // Delete photo memory in real-time
  const handleDeletePhoto = (id: string) => {
    deleteMemoryRealtime(id);
    if (selectedPhoto && selectedPhoto.id === id) {
      setSelectedPhoto(null);
    }
  };

  // Add diary entry in real-time
  const handleAddDiaryEntry = (author: string, content: string, date: string) => {
    addDiaryEntryRealtime(author, content, date);
  };

  // Delete diary entry in real-time
  const handleDeleteDiaryEntry = (id: string) => {
    deleteDiaryEntryRealtime(id);
  };

  // Update diary entry in real-time
  const handleUpdateDiaryEntry = (id: string, newContent: string) => {
    updateDiaryEntryRealtime(id, newContent);
  };

  return (
    <div
      style={{
        backgroundColor: theme.bgDark,
        color: theme.textColor,
      }}
      className="min-h-screen relative font-vazir transition-colors duration-500"
    >
      {/* Subtle background ambient particle lights */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div
          className={`absolute top-1/4 left-10 w-96 h-96 rounded-full blur-3xl transition-colors duration-700 ${theme.ambientLight1}`}
        />
        <div
          className={`absolute top-2/3 right-10 w-96 h-96 rounded-full blur-3xl transition-colors duration-700 ${theme.ambientLight2}`}
        />
      </div>

      {/* Main Sections */}
      <main className="relative z-10">
        <Header onNavigate={handleNavigate} onOpenSky={() => setIsSkyOpen(true)} />
        
        <FeaturedStory />
        
        <LoveReasons onOpenSky={() => setIsSkyOpen(true)} />
        
        <PhotoGallery
          memories={memories}
          onSelectPhoto={setSelectedPhoto}
          onOpenAddModal={() => setIsAddPhotoOpen(true)}
          onEditPhoto={(photo) => setEditingPhoto(photo)}
          onDeletePhoto={handleDeletePhoto}
        />
        
        <DiarySection
          entries={diaryEntries}
          onAddEntry={handleAddDiaryEntry}
          onDeleteEntry={handleDeleteDiaryEntry}
          onUpdateEntry={handleUpdateDiaryEntry}
        />
        
        <Footer />
      </main>

      {/* 3D First Person Romantic Sky Exploration Game */}
      <SkyGameCanvas
        isOpen={isSkyOpen}
        onClose={() => setIsSkyOpen(false)}
      />

      <PhotoModal
        photo={selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
        onEditPhoto={(photo) => setEditingPhoto(photo)}
      />

      <EditPhotoModal
        isOpen={!!editingPhoto}
        photo={editingPhoto}
        onClose={() => setEditingPhoto(null)}
        onUpdatePhoto={handleUpdatePhoto}
        onDeletePhoto={handleDeletePhoto}
      />

      <AddPhotoModal
        isOpen={isAddPhotoOpen}
        onClose={() => setIsAddPhotoOpen(false)}
        onAddPhoto={handleAddPhoto}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

