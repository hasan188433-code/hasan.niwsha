import { doc, onSnapshot, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CoupleUser, CoupleChatMessage, HeartbeatSyncData } from '../types';

const HEARTBEAT_SYNC_DOC = 'heartbeat_sync';
const HEARTBEAT_CHAT_DOC = 'heartbeat_chat';

// Default initial state
const defaultSyncData: HeartbeatSyncData = {
  lastPing: {},
  touchState: { 'حسن': false, 'نیوشا': false },
  syncedMode: false,
  syncedBpm: 80,
  lastUpdate: Date.now(),
};

/**
 * Real-time listener for heartbeat synchronization and partner presence
 */
export function subscribeHeartbeatSync(callback: (data: HeartbeatSyncData) => void): () => void {
  const docRef = doc(db, 'rooms', HEARTBEAT_SYNC_DOC);
  
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as HeartbeatSyncData);
      } else {
        // Initialize doc if missing
        setDoc(docRef, defaultSyncData).catch(console.error);
        callback(defaultSyncData);
      }
    },
    (error) => {
      console.warn('Heartbeat sync error:', error);
    }
  );
}

/**
 * Send presence heartbeat ping (updates online timestamp)
 */
export async function sendHeartbeatPresencePing(user: CoupleUser) {
  try {
    const docRef = doc(db, 'rooms', HEARTBEAT_SYNC_DOC);
    await updateDoc(docRef, {
      [`lastPing.${user}`]: Date.now(),
      lastUpdate: Date.now(),
    });
  } catch {
    // If doc doesn't exist yet
    const docRef = doc(db, 'rooms', HEARTBEAT_SYNC_DOC);
    await setDoc(docRef, {
      ...defaultSyncData,
      lastPing: { [user]: Date.now() },
    }, { merge: true });
  }
}

/**
 * Update active touch/hold state
 */
export async function updateHeartbeatTouchState(user: CoupleUser, isTouching: boolean) {
  try {
    const docRef = doc(db, 'rooms', HEARTBEAT_SYNC_DOC);
    await setDoc(
      docRef,
      {
        touchState: { [user]: isTouching },
        lastUpdate: Date.now(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Touch state error:', err);
  }
}

/**
 * Trigger immediate heartbeat pulse / haptic vibration burst across devices
 */
export async function sendLiveHeartbeatPulse(
  sender: CoupleUser,
  type: 'single' | 'holding' | 'pulse_burst' | 'reaction',
  reactionType?: 'kiss' | 'hug' | 'flame' | 'sparkle' | 'heart',
  intensity: number = 1
) {
  try {
    const docRef = doc(db, 'rooms', HEARTBEAT_SYNC_DOC);
    const now = Date.now();
    const pulseId = `${sender}_${now}_${Math.random().toString(36).substring(2, 8)}`;
    await setDoc(
      docRef,
      {
        lastBeatPulse: {
          pulseId,
          sender,
          type,
          reactionType: reactionType || 'heart',
          intensity,
          timestamp: now,
        },
        lastUpdate: now,
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Pulse send error:', err);
  }
}

/**
 * Toggle synchronized continuous heartbeat mode
 */
export async function toggleContinuousSyncMode(enabled: boolean, bpm: number = 80) {
  try {
    const docRef = doc(db, 'rooms', HEARTBEAT_SYNC_DOC);
    await setDoc(
      docRef,
      {
        syncedMode: enabled,
        syncedBpm: bpm,
        lastUpdate: Date.now(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Continuous sync toggle error:', err);
  }
}

/**
 * Real-time listener for private 2-way couple messenger
 */
export function subscribeCoupleChat(callback: (messages: CoupleChatMessage[]) => void): () => void {
  const docRef = doc(db, 'rooms', HEARTBEAT_CHAT_DOC);

  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const messages = (data.messages || []) as CoupleChatMessage[];
        callback(messages);
      } else {
        // Initialize empty chat document
        setDoc(docRef, { messages: [], lastUpdate: Date.now() }).catch(console.error);
        callback([]);
      }
    },
    (error) => {
      console.warn('Couple chat error:', error);
    }
  );
}

function removeUndefinedFields<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => removeUndefinedFields(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = removeUndefinedFields(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

/**
 * Send a new private chat message with optional media/audio attachment
 */
export async function sendCoupleChatMessage(
  message: Omit<CoupleChatMessage, 'id' | 'createdAt'>
): Promise<boolean> {
  try {
    const docRef = doc(db, 'rooms', HEARTBEAT_CHAT_DOC);
    const snap = await getDoc(docRef);
    const currentMessages: CoupleChatMessage[] = snap.exists() ? (snap.data().messages || []) : [];

    const rawMessage: Record<string, unknown> = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      sender: message.sender,
      createdAt: Date.now(),
    };

    if (message.text !== undefined && message.text !== null) {
      rawMessage.text = message.text;
    }
    if (message.replyTo !== undefined && message.replyTo !== null) {
      rawMessage.replyTo = removeUndefinedFields(message.replyTo);
    }
    if (message.attachment !== undefined && message.attachment !== null) {
      rawMessage.attachment = removeUndefinedFields(message.attachment);
    }
    if (message.reactions !== undefined && message.reactions !== null) {
      rawMessage.reactions = removeUndefinedFields(message.reactions);
    }

    const newMessage = rawMessage as unknown as CoupleChatMessage;

    // Keep last 150 messages for optimal performance and Firestore doc limit
    const updatedMessages = [...currentMessages, newMessage].slice(-150);

    const docPayload = removeUndefinedFields({
      messages: updatedMessages,
      lastUpdate: Date.now(),
      lastSender: message.sender,
    });

    await setDoc(docRef, docPayload, { merge: true });

    return true;
  } catch (err) {
    console.error('Send message error:', err);
    return false;
  }
}

/**
 * Add or toggle emoji reaction to a message
 */
export async function toggleMessageReaction(messageId: string, user: CoupleUser, emoji: string) {
  try {
    const docRef = doc(db, 'rooms', HEARTBEAT_CHAT_DOC);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const messages = (snap.data().messages || []) as CoupleChatMessage[];
    const updated = messages.map((msg) => {
      if (msg.id === messageId) {
        const currentReactions = { ...(msg.reactions || {}) };
        if (currentReactions[user] === emoji) {
          delete currentReactions[user];
        } else {
          currentReactions[user] = emoji;
        }
        return { ...msg, reactions: currentReactions };
      }
      return msg;
    });

    await updateDoc(docRef, { messages: updated, lastUpdate: Date.now() });
  } catch (err) {
    console.warn('Reaction error:', err);
  }
}

/**
 * Delete a message
 */
export async function deleteCoupleMessage(messageId: string) {
  try {
    const docRef = doc(db, 'rooms', HEARTBEAT_CHAT_DOC);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const messages = (snap.data().messages || []) as CoupleChatMessage[];
    const filtered = messages.filter((m) => m.id !== messageId);

    await updateDoc(docRef, { messages: filtered, lastUpdate: Date.now() });
  } catch (err) {
    console.warn('Delete message error:', err);
  }
}

/**
 * Compress image to lightweight Base64 to ensure instant transfer and fit Firestore
 */
export async function compressImageToDataUrl(
  file: File,
  maxDimension = 1000,
  quality = 0.72
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Convert generic file (Audio, Video, PDF) to Base64 Data URL
 */
export async function convertFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
