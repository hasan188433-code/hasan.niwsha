export interface MemoryPhoto {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  date?: string;
}

export interface DiaryEntry {
  id: string;
  author: 'نیوشا' | 'حسن' | string;
  date: string;
  content: string;
  createdAt: number;
}

export interface LoveReason {
  id: string;
  text: string;
  expandedNote?: string;
}

export interface StarMessage {
  id: string;
  title: string;
  message: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  size: number;
}

export interface DailyMessage {
  text: string;
  dateKey: string;
  updatedAt: string;
  todayKey?: string;
  isNewDay?: boolean;
  history?: Array<{ text: string; dateKey: string; updatedAt: string }>;
}

export interface QuizQuestion {
  id: string;
  subject: 'حسن' | 'نیوشا' | string;
  text: string;
  options: string[];
  correctAnswerIdx: number;
}

export interface QuizChatMessage {
  id: string;
  sender: 'حسن' | 'نیوشا' | 'جمینای';
  text: string;
  timestamp: number;
  confirmedTopic?: string;
}

export interface QuizRoom {
  id: string;
  status: 'waiting' | 'playing' | 'review' | 'guessing' | 'set_review' | 'finished';
  players: string[]; // ['حسن', 'نیوشا']
  currentTurn: string; // 'حسن' or 'نیوشا'
  round: number; // 1 to 5
  questions: QuizQuestion[];
  player1Answers: number[]; // Hasan's answers to questions about himself
  player2Answers: number[]; // Niosha's answers to questions about herself
  player1Guesses: number[]; // Hasan's guesses about Niosha
  player2Guesses: number[]; // Niosha's guesses about Hasan
  readyForGuessing?: string[]; // Players ready to move to guessing phase
  scores: { [key: string]: number };
  setWins: { [key: string]: number }; // New: track sets won
  totalSetsPlayed?: number; // Count total sets played
  lastSetScores?: { [key: string]: number }; // Scores from the set that just finished
  nextSetTopic?: string; // User suggested topic for next set
  topicConfirmation?: string; // Gemini's response to the topic suggestion
  chatMessages?: QuizChatMessage[]; // Real-time conversational messages with Gemini
  isGeneratingQuestions?: boolean; // Track if AI is currently working
  history?: QuizQuestion[]; // Track all asked questions to prevent duplicates
  winner?: string | null;
  resetRequestedBy?: 'حسن' | 'نیوشا' | null; // Player who requested a full match restart
  lastUpdate: number;
}

export type CoupleUser = 'حسن' | 'نیوشا';

export interface HeartbeatMediaAttachment {
  type: 'image' | 'audio' | 'voice' | 'video' | 'file';
  url: string; // Base64 data URL or direct URL
  name?: string;
  size?: number; // In bytes
  duration?: number; // In seconds (for audio / voice)
  mimeType?: string;
}

export interface CoupleChatMessage {
  id: string;
  sender: CoupleUser;
  text?: string;
  attachment?: HeartbeatMediaAttachment;
  createdAt: number;
  reactions?: { [key: string]: string }; // e.g. {'حسن': '❤️', 'نیوشا': '😍'}
  replyTo?: {
    id: string;
    sender: CoupleUser;
    text?: string;
    attachmentType?: string;
  };
}

export interface HeartbeatSyncData {
  id?: string;
  lastPing?: { [key: string]: number }; // Presence timestamp for each user
  touchState?: { [key: string]: boolean }; // User actively holding/touching heart
  lastBeatPulse?: {
    pulseId?: string;
    sender: CoupleUser;
    type: 'single' | 'holding' | 'pulse_burst' | 'reaction';
    reactionType?: 'kiss' | 'hug' | 'flame' | 'sparkle' | 'heart';
    timestamp: number;
    intensity?: number;
  };
  syncedMode?: boolean; // Both devices beating at identical synced rhythm
  syncedBpm?: number;
  lastUpdate?: number;
}
