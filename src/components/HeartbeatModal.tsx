import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heart,
  Activity,
  X,
  Volume2,
  VolumeX,
  MessageCircleHeart,
  Radio,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { CoupleUser, CoupleChatMessage, HeartbeatSyncData } from '../types';
import { HeartbeatTouchView } from './HeartbeatTouchView';
import { HeartbeatChatView } from './HeartbeatChatView';
import {
  subscribeHeartbeatSync,
  subscribeCoupleChat,
  sendHeartbeatPresencePing,
  updateHeartbeatTouchState,
} from '../services/heartbeatMessengerService';

interface HeartbeatModalProps {
  isOpen: boolean;
  onClose: () => void;
  heartbeatsTotal: number;
  totalDays: number;
}

export const HeartbeatModal: React.FC<HeartbeatModalProps> = ({
  isOpen,
  onClose,
  heartbeatsTotal,
  totalDays,
}) => {
  const { theme } = useTheme();

  // Active Tab: 'touch' (Live Heartbeat Sync) or 'chat' (Private Couple Messenger)
  const [activeTab, setActiveTab] = useState<'touch' | 'chat'>('touch');
  const [currentUser, setCurrentUser] = useState<CoupleUser>('حسن');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Real-time states
  const [syncData, setSyncData] = useState<HeartbeatSyncData>({
    lastPing: {},
    touchState: { 'حسن': false, 'نیوشا': false },
    syncedMode: false,
    syncedBpm: 80,
  });
  const [chatMessages, setChatMessages] = useState<CoupleChatMessage[]>([]);

  // Load saved identity from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('couple_user_name');
    if (savedUser === 'نیوشا' || savedUser === 'حسن') {
      setCurrentUser(savedUser);
    }
  }, []);

  const handleSwitchUser = (user: CoupleUser) => {
    setCurrentUser(user);
    localStorage.setItem('couple_user_name', user);
  };

  // Real-time Firestore subscriptions for Heartbeat Sync & Chat
  useEffect(() => {
    if (!isOpen) return;

    const unsubSync = subscribeHeartbeatSync((data) => {
      setSyncData(data);
    });

    const unsubChat = subscribeCoupleChat((messages) => {
      setChatMessages(messages);
    });

    // Send initial presence ping
    sendHeartbeatPresencePing(currentUser);

    // Heartbeat ping interval every 4 seconds to maintain online presence
    const pingInterval = setInterval(() => {
      sendHeartbeatPresencePing(currentUser);
    }, 4000);

    return () => {
      unsubSync();
      unsubChat();
      clearInterval(pingInterval);
      updateHeartbeatTouchState(currentUser, false);
    };
  }, [isOpen, currentUser]);

  // Determine if partner is currently online (pinged in last 12 seconds)
  const partnerName: CoupleUser = currentUser === 'حسن' ? 'نیوشا' : 'حسن';
  const partnerLastPing = syncData.lastPing?.[partnerName] || 0;
  const isPartnerOnline = Date.now() - partnerLastPing < 12000;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto font-vazir">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Master Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          className="relative w-full max-w-lg my-auto rounded-3xl border shadow-2xl overflow-hidden backdrop-blur-xl z-10 text-center flex flex-col"
          style={{
            backgroundColor: theme.cardBg,
            borderColor: theme.cardBorder,
          }}
        >
          {/* Top Bar with Navigation Controls & Sound */}
          <div className="flex items-center justify-between p-3.5 border-b border-white/10 bg-black/30">
            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Main Tabs (Touch Sync vs Private Messenger) */}
            <div className="flex items-center gap-1 bg-black/50 p-1 rounded-2xl border border-white/10">
              <button
                type="button"
                onClick={() => setActiveTab('touch')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'touch'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-neutral-300 hover:text-white'
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-rose-300 animate-pulse" />
                <span>لمس تپش آنلاین 💓</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'chat'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-neutral-300 hover:text-white'
                }`}
              >
                <MessageCircleHeart className="w-3.5 h-3.5 text-pink-300" />
                <span>پیام‌رسان دو‌نفره 💬</span>
              </button>
            </div>

            {/* Sound Toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-full border text-xs transition-all cursor-pointer ${
                soundEnabled
                  ? 'bg-white/15 text-white border-white/30'
                  : 'bg-black/30 text-neutral-400 border-white/10'
              }`}
              title={soundEnabled ? 'قطع صدای تپش و پیام' : 'فعال‌سازی صدا'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>

          {/* Modal Body Content */}
          <div className="p-4 sm:p-5 overflow-y-auto max-h-[80vh]">
            {activeTab === 'touch' ? (
              <HeartbeatTouchView
                currentUser={currentUser}
                onSwitchUser={handleSwitchUser}
                syncData={syncData}
                isPartnerOnline={isPartnerOnline}
                soundEnabled={soundEnabled}
                totalDays={totalDays}
                heartbeatsTotal={heartbeatsTotal}
              />
            ) : (
              <HeartbeatChatView
                currentUser={currentUser}
                onSwitchUser={handleSwitchUser}
                messages={chatMessages}
                syncData={syncData}
                isPartnerOnline={isPartnerOnline}
                soundEnabled={soundEnabled}
              />
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
