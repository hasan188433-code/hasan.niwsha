import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Users, Play, Send, ChevronRight, HelpCircle, AlertCircle, Loader2, Sparkles, Coffee, Home, RotateCcw, Volume2, VolumeX, MessageSquare, Bot, CheckCircle2, Lightbulb, RefreshCw, X, Lock, Maximize2, Minimize2 } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, onSnapshot, setDoc, updateDoc, deleteDoc, getDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { QuizRoom, QuizQuestion, QuizChatMessage } from '../types';
import { sound } from '../utils/audio';
import { useTheme } from '../context/ThemeContext';
import { ThemeSelector } from './ThemeSelector';

interface QuizGameProps {
  onClose: () => void;
}

const ROOM_ID = 'hasan-niosha-quiz-room';

// Fullscreen & Portrait Mode Management
const requestGameFullscreen = async () => {
  try {
    const docEl = document.documentElement as any;
    if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen().catch(() => {});
      } else if (docEl.webkitRequestFullscreen) {
        await docEl.webkitRequestFullscreen();
      }
    }
    // Lock orientation to portrait on supported mobile devices
    if (window.screen && (window.screen.orientation as any)?.lock) {
      try {
        await (window.screen.orientation as any).lock('portrait');
      } catch {
        // Ignored if orientation lock is not permitted or unsupported
      }
    }
  } catch (err) {
    console.log('Fullscreen request handled:', err);
  }
};

const exitGameFullscreen = async () => {
  try {
    if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
      if (document.exitFullscreen) {
        await document.exitFullscreen().catch(() => {});
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      }
    }
    if (window.screen && (window.screen.orientation as any)?.unlock) {
      try {
        (window.screen.orientation as any).unlock();
      } catch {
        // Ignored
      }
    }
  } catch (err) {
    console.log('Exit fullscreen handled:', err);
  }
};

// Match win rule: The match finishes if:
// 1. One of the 3 knockout outcomes occurs: 3-0, 4-1, 4-2
// 2. OR either player reaches 5 wins (e.g. 5-3, 5-4)
// Scores like 4-3, 3-1, 3-2, 3-3, 4-4 continue until someone reaches 5 wins or a knockout!
export const checkMatchWinCondition = (hWins: number, nWins: number): { finished: boolean; winner?: string } => {
  // Knockout conditions
  if (hWins === 3 && nWins === 0) return { finished: true, winner: 'حسن' };
  if (nWins === 3 && hWins === 0) return { finished: true, winner: 'نیوشا' };

  if (hWins === 4 && nWins === 1) return { finished: true, winner: 'حسن' };
  if (nWins === 4 && hWins === 1) return { finished: true, winner: 'نیوشا' };

  if (hWins === 4 && nWins === 2) return { finished: true, winner: 'حسن' };
  if (nWins === 4 && hWins === 2) return { finished: true, winner: 'نیوشا' };

  // Reaching 5 wins (First to 5 sets)
  if (hWins >= 5 && hWins > nWins) return { finished: true, winner: 'حسن' };
  if (nWins >= 5 && nWins > hWins) return { finished: true, winner: 'نیوشا' };

  return { finished: false };
};

export const QuizGame: React.FC<QuizGameProps> = ({ onClose }) => {
  const { theme } = useTheme();
  const [user, setUser] = useState<'حسن' | 'نیوشا' | null>(null);
  const [room, setRoom] = useState<QuizRoom | null>(null);
  const [loading, setLoading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; correctIdx: number } | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [showFreshConfirm, setShowFreshConfirm] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    return typeof document !== 'undefined' && Boolean(document.fullscreenElement || (document as any).webkitFullscreenElement);
  });
  const prevPlayersCountRef = useRef<number>(0);
  const prevStatusRef = useRef<string>('');
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Synchronize fullscreen status & attempt fullscreen on initial mount
  useEffect(() => {
    requestGameFullscreen();

    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement || (document as any).webkitFullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      exitGameFullscreen();
    };
  }, []);

  const handleExitGame = async () => {
    sound.playClick();
    await exitGameFullscreen();
    onClose();
  };

  const toggleFullscreen = async () => {
    sound.playClick();
    if (isFullscreen) {
      await exitGameFullscreen();
    } else {
      await requestGameFullscreen();
    }
  };

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [room?.chatMessages, chatLoading]);

  // Subscribe to room updates
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'rooms', ROOM_ID), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as QuizRoom;
        
        // Sound trigger for second player joining
        const playersCount = data.players?.length || 0;
        if (playersCount === 2 && prevPlayersCountRef.current === 1) {
          sound.playJoin();
        }
        prevPlayersCountRef.current = playersCount;

        // Sound trigger for status change
        if (data.status !== prevStatusRef.current) {
          if (data.status === 'finished') {
            sound.playMatchWin();
          } else if (data.status === 'set_review') {
            sound.playSetWin();
          }
          prevStatusRef.current = data.status;
        }

        // Stale check (older than 4 hours)
        if (Date.now() - data.lastUpdate > 14400000) {
          deleteDoc(doc(db, 'rooms', ROOM_ID));
          return;
        }

        // Validation check for room state
        if (data.status === 'playing' && (!data.players || data.players.length < 2)) {
          setRoom({ ...data, status: 'waiting' });
        } else {
          setRoom(data);
        }
      } else {
        setRoom(null);
      }
    }, (err) => {
      console.error('Firebase error:', err);
      setError(`خطای دیتابیس: ${err.message}`);
    });

    return () => {
      unsub();
    };
  }, []);

  const handleToggleMute = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
    if (!muted) sound.playClick();
  };

  const handleSendChatMessage = async (customText?: string) => {
    const textToSend = (customText || chatInput).trim();
    if (!textToSend || chatLoading || !user || !room) return;

    sound.playGeminiSend();
    setChatInput('');
    setChatLoading(true);

    const newMsg: QuizChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      sender: user,
      text: textToSend,
      timestamp: Date.now(),
    };

    const currentMessages = room.chatMessages || [];
    const updatedMessages = [...currentMessages, newMsg];

    // Optimistically update room with user message
    try {
      await updateDoc(doc(db, 'rooms', ROOM_ID), {
        chatMessages: updatedMessages,
        lastUpdate: Date.now(),
      });
    } catch (err: any) {
      console.error('Error saving user chat message:', err);
    }

    try {
      const previousCategories = Array.from(new Set((room.history || []).map(q => q.category).filter(Boolean)));
      const res = await fetch('/api/quiz/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          sender: user,
          history: updatedMessages,
          currentTopic: room.nextSetTopic || '',
          totalSetsPlayed: room.totalSetsPlayed || 0,
          setWins: room.setWins || { 'حسن': 0, 'نیوشا': 0 },
          lastSetScores: room.lastSetScores || null,
          previousTopics: previousCategories,
        }),
      });

      const data = await res.json();
      const replyText = data.reply || 'خیلی عالیه! هر موضوعی که بخواید با هم هماهنگ می‌کنیم ✨';
      const confirmedTopic = data.confirmedTopic || null;

      sound.playGeminiReceive();

      const geminiMsg: QuizChatMessage = {
        id: `msg-${Date.now()}-gemini`,
        sender: 'جمینای',
        text: replyText,
        timestamp: Date.now(),
        ...(confirmedTopic ? { confirmedTopic } : {}),
      };

      const docUpdate: any = {
        chatMessages: [...updatedMessages, geminiMsg],
        lastUpdate: Date.now(),
      };

      if (confirmedTopic) {
        docUpdate.nextSetTopic = confirmedTopic;
        docUpdate.topicConfirmation = replyText;
      }

      await updateDoc(doc(db, 'rooms', ROOM_ID), docUpdate);
    } catch (err) {
      console.error('Error in quiz chat:', err);
    } finally {
      setChatLoading(false);
    }
  };

  const handleClearTopic = async () => {
    if (!room) return;
    sound.playClick();
    try {
      await updateDoc(doc(db, 'rooms', ROOM_ID), {
        nextSetTopic: '',
        topicConfirmation: '',
        lastUpdate: Date.now(),
      });
    } catch (err: any) {
      console.error('Error clearing topic:', err);
    }
  };

  const createGame = async () => {
    if (!user) return;
    sound.playClick();
    setLoading(true);
    setError(null);

    try {
      const newRoom: QuizRoom = {
        id: ROOM_ID,
        status: 'waiting',
        players: [user],
        currentTurn: user,
        round: 1,
        totalSetsPlayed: 0,
        questions: [],
        player1Answers: [],
        player2Answers: [],
        player1Guesses: [],
        player2Guesses: [],
        scores: { 'حسن': 0, 'نیوشا': 0 },
        setWins: { 'حسن': 0, 'نیوشا': 0 },
        chatMessages: [],
        history: [],
        nextSetTopic: '',
        topicConfirmation: '',
        lastUpdate: Date.now(),
      };

      await setDoc(doc(db, 'rooms', ROOM_ID), newRoom);
    } catch (err: any) {
      console.error('Quiz creation error:', err);
      setError(`خطا: ${err.message || 'مشکلی در شروع بازی پیش آمد'}`);
    } finally {
      setLoading(false);
    }
  };

  const resumeExistingGame = async (selectedUser: 'حسن' | 'نیوشا') => {
    sound.playClick();
    requestGameFullscreen();
    setUser(selectedUser);
    setError(null);
    setShowFreshConfirm(false);
    
    if (room) {
      try {
        const currentPlayers = room.players || [];
        if (!currentPlayers.includes(selectedUser)) {
          const updatedPlayers = Array.from(new Set([...currentPlayers, selectedUser]));
          await updateDoc(doc(db, 'rooms', ROOM_ID), {
            players: updatedPlayers,
            status: updatedPlayers.length === 2 && room.status === 'waiting' ? 'set_review' : room.status,
            lastUpdate: Date.now(),
          });
        }
      } catch (err: any) {
        console.error('Error resuming existing game:', err);
      }
    }
  };

  const startNewGameFresh = async (selectedUser: 'حسن' | 'نیوشا') => {
    sound.playClick();
    requestGameFullscreen();
    setUser(selectedUser);
    setLoading(true);
    setError(null);
    setShowFreshConfirm(false);

    try {
      const newRoom: QuizRoom = {
        id: ROOM_ID,
        status: 'waiting',
        players: [selectedUser],
        currentTurn: selectedUser,
        round: 1,
        totalSetsPlayed: 0,
        questions: [],
        player1Answers: [],
        player2Answers: [],
        player1Guesses: [],
        player2Guesses: [],
        scores: { 'حسن': 0, 'نیوشا': 0 },
        setWins: { 'حسن': 0, 'نیوشا': 0 },
        chatMessages: [],
        history: [],
        nextSetTopic: '',
        topicConfirmation: '',
        lastUpdate: Date.now(),
      };

      await setDoc(doc(db, 'rooms', ROOM_ID), newRoom);
    } catch (err: any) {
      console.error('Quiz fresh start error:', err);
      setError(`خطا: ${err.message || 'مشکلی در شروع بازی جدید پیش آمد'}`);
    } finally {
      setLoading(false);
    }
  };

  const joinGame = async () => {
    if (!user || !room) return;
    if (room.players?.includes(user)) return;
    sound.playClick();
    
    try {
      const newPlayers = [...(room.players || []), user];
      // Immediately transition to lounge (set_review) when both connect so they coordinate topic with Gemini!
      await updateDoc(doc(db, 'rooms', ROOM_ID), {
        players: newPlayers,
        status: newPlayers.length === 2 ? 'set_review' : 'waiting',
        lastUpdate: Date.now(),
      });
    } catch (err: any) {
      setError(`خطا در ورود: ${err.message}`);
    }
  };

  const submitAnswer = async () => {
    if (!room || !user || selectedOption === null || feedback) return;

    const isPlayer1 = user === 'حسن';
    const p1Answers = room.player1Answers || [];
    const p2Answers = room.player2Answers || [];
    const p1Guesses = room.player1Guesses || [];
    const p2Guesses = room.player2Guesses || [];
    const scores = room.scores || { 'حسن': 0, 'نیوشا': 0 };

    const questions = room.questions || [];
    const update: any = {
      lastUpdate: Date.now(),
    };

    try {
      if (room.status === 'playing') {
        sound.playClick();
        // Phase 1: Answer about yourself
        if (isPlayer1) {
          update.player1Answers = [...p1Answers, selectedOption];
        } else {
          update.player2Answers = [...p2Answers, selectedOption];
        }

        const p1Len = isPlayer1 ? p1Answers.length + 1 : p1Answers.length;
        const p2Len = !isPlayer1 ? p2Answers.length + 1 : p2Answers.length;

        const p1Questions = questions.filter(q => q.subject === 'حسن');
        const p2Questions = questions.filter(q => q.subject === 'نیوشا');

        if (p1Len >= p1Questions.length && p2Len >= p2Questions.length) {
          update.status = 'review';
          update.readyForGuessing = [];
        }
        await updateDoc(doc(db, 'rooms', ROOM_ID), update);
        setSelectedOption(null);
      } else if (room.status === 'guessing') {
        // Phase 2: Guess about the other person
        const currentGuessIdx = isPlayer1 ? p1Guesses.length : p2Guesses.length;
        const otherAnswers = isPlayer1 ? p2Answers : p1Answers;
        const correctIdx = otherAnswers[currentGuessIdx];
        const isCorrect = selectedOption === correctIdx;

        if (isCorrect) {
          sound.playCorrect();
        } else {
          sound.playIncorrect();
        }

        setFeedback({ isCorrect, correctIdx });

        setTimeout(async () => {
          try {
            if (isPlayer1) {
              update.player1Guesses = [...p1Guesses, selectedOption];
              if (isCorrect) update['scores.حسن'] = (scores['حسن'] || 0) + 1;
            } else {
              update.player2Guesses = [...p2Guesses, selectedOption];
              if (isCorrect) update['scores.نیوشا'] = (scores['نیوشا'] || 0) + 1;
            }

            const p1GuessesLen = isPlayer1 ? p1Guesses.length + 1 : p1Guesses.length;
            const p2GuessesLen = !isPlayer1 ? p2Guesses.length + 1 : p2Guesses.length;

            const p1Score = isPlayer1 && isCorrect ? (scores['حسن'] || 0) + 1 : (scores['حسن'] || 0);
            const p2Score = !isPlayer1 && isCorrect ? (scores['نیوشا'] || 0) + 1 : (scores['نیوشا'] || 0);

            const p1Questions = questions.filter(q => q.subject === 'حسن');
            const p2Questions = questions.filter(q => q.subject === 'نیوشا');

            const setFinished = p1GuessesLen >= p2Questions.length && p2GuessesLen >= p1Questions.length;

            if (setFinished) {
              const setWinner = p1Score > p2Score ? 'حسن' : (p2Score > p1Score ? 'نیوشا' : 'برابری');
              const newSetWins = { ...room.setWins };
              if (setWinner === 'برابری') {
                newSetWins['حسن'] = (newSetWins['حسن'] || 0) + 1;
                newSetWins['نیوشا'] = (newSetWins['نیوشا'] || 0) + 1;
              } else {
                newSetWins[setWinner] = (newSetWins[setWinner] || 0) + 1;
              }

              const hWins = newSetWins['حسن'] || 0;
              const nWins = newSetWins['نیوشا'] || 0;
              const currentTotalSets = (room.totalSetsPlayed || 0) + 1;

              // --- قوانین مسابقه مشخص شده توسط کاربر ---
              // مسابقه فقط و فقط با پیش آمدن یکی از این ۳ نتیجه تمام می‌شود:
              // ۱. ۳ - ۰ (یا ۰ - ۳)
              // ۲. ۴ - ۱ (یا ۱ - ۴)
              // ۳. ۴ - ۲ (یا ۲ - ۴)
              // نتایجی مانند ۴-۳، ۳-۱، ۳-۲، ۳-۳، ۴-۴، ۵-۳ و... به هیچ وجه مسابقه را تمام نمی‌کنند و بازی ادامه خواهد داشت.
              const winCheck = checkMatchWinCondition(hWins, nWins);

              if (winCheck.finished) {
                update.status = 'finished';
                update.winner = winCheck.winner;
                update.totalSetsPlayed = currentTotalSets;
                update.setWins = newSetWins;
              } else {
                const prevChat = room.chatMessages || [];
                const setEndGeminiMsg: QuizChatMessage = {
                  id: `msg-${Date.now()}-set-end`,
                  sender: 'جمینای',
                  text: `خسته نباشید به هر دوتون! 🌸 ست شماره ${currentTotalSets} تموم شد.\nامتیاز این ست: حسن ${p1Score} | نیوشا ${p2Score}\nمجموع بردهای ست‌ها: حسن ${newSetWins['حسن']} - نیوشا ${newSetWins['نیوشا']}\n(مسابقه در حالت‌های ۳-۰، ۴-۱، ۴-۲ یا با رسیدن یکی از شما به ۵ برد به پایان می‌رسد و رقابت ادامه دارد! 🔥)\nحالا برای ست شماره ${currentTotalSets + 1} چه موضوعی رو انتخاب می‌کنید؟ با من گپ بزنید تا تاییدش کنیم! ✨`,
                  timestamp: Date.now(),
                };

                update.lastSetScores = { 'حسن': p1Score, 'نیوشا': p2Score };
                update.status = 'set_review';
                update.readyForGuessing = [];
                update.totalSetsPlayed = currentTotalSets;
                update.setWins = newSetWins;
                update.nextSetTopic = '';
                update.topicConfirmation = '';
                update.chatMessages = [...prevChat, setEndGeminiMsg];
                update.player1Answers = [];
                update.player2Answers = [];
                update.player1Guesses = [];
                update.player2Guesses = [];
                update['scores.حسن'] = 0;
                update['scores.نیوشا'] = 0;
              }
            }

            await updateDoc(doc(db, 'rooms', ROOM_ID), update);
          } catch (err: any) {
            console.error('Submit guess error:', err);
            setError(`خطا در ثبت حدس: ${err.message}`);
          } finally {
            setFeedback(null);
            setSelectedOption(null);
          }
        }, 1500);
      }
    } catch (err: any) {
      console.error('Submit answer error:', err);
      setError(`خطا در ثبت: ${err.message}`);
    }
  };

  const resetGame = async () => {
    sound.playClick();
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'rooms', ROOM_ID));
      setRoom(null);
      setError(null);
    } catch (err: any) {
      setError(`خطا در پاکسازی: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleContinueGame = async () => {
    if (!room) return;
    sound.playClick();
    setLoading(true);
    try {
      await updateDoc(doc(db, 'rooms', ROOM_ID), {
        status: 'set_review',
        player1Answers: [],
        player2Answers: [],
        player1Guesses: [],
        player2Guesses: [],
        readyForGuessing: [],
        questions: [],
        nextSetTopic: '',
        topicConfirmation: '',
        lastUpdate: Date.now()
      });
    } catch (err: any) {
      setError(`خطا در ادامه بازی: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestRestart = async () => {
    if (!room || !user) return;
    sound.playClick();
    try {
      await updateDoc(doc(db, 'rooms', ROOM_ID), {
        resetRequestedBy: user,
        lastUpdate: Date.now(),
      });
    } catch (err: any) {
      setError(`خطا در ارسال درخواست: ${err.message}`);
    }
  };

  const handleCancelRestart = async () => {
    if (!room) return;
    sound.playClick();
    try {
      await updateDoc(doc(db, 'rooms', ROOM_ID), {
        resetRequestedBy: null,
        lastUpdate: Date.now(),
      });
    } catch (err: any) {
      setError(`خطا در لغو درخواست: ${err.message}`);
    }
  };

  const handleAcceptRestart = async () => {
    if (!room) return;
    sound.playClick();
    setLoading(true);
    try {
      // Re-initialize the room back to fresh start in lounge or set 1
      await updateDoc(doc(db, 'rooms', ROOM_ID), {
        status: 'set_review',
        round: 1,
        totalSetsPlayed: 0,
        questions: [],
        player1Answers: [],
        player2Answers: [],
        player1Guesses: [],
        player2Guesses: [],
        readyForGuessing: [],
        scores: { 'حسن': 0, 'نیوشا': 0 },
        setWins: { 'حسن': 0, 'نیوشا': 0 },
        lastSetScores: { 'حسن': 0, 'نیوشا': 0 },
        nextSetTopic: '',
        topicConfirmation: '',
        isGeneratingQuestions: false,
        resetRequestedBy: null,
        winner: null,
        lastUpdate: Date.now(),
      });
    } catch (err: any) {
      setError(`خطا در شروع مجدد: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generateQuestionsForNewSet = async (topicToUse?: string) => {
    if (loading) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'rooms', ROOM_ID), {
        isGeneratingQuestions: true,
        lastUpdate: Date.now()
      });

      const globalSnap = await getDoc(doc(db, 'globals', 'history'));
      const globalHistoryTexts = globalSnap.exists() ? globalSnap.data().questionTexts || [] : [];
      const currentHistoryTexts = (room?.history || room?.questions || []).map(q => q.text);
      const fullHistoryTexts = Array.from(new Set([...globalHistoryTexts, ...currentHistoryTexts]));

      const targetTopic = topicToUse ?? room?.nextSetTopic ?? '';

      const response = await fetch('/api/quiz/generate', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ previousQuestions: fullHistoryTexts, topic: targetTopic })
      });
      
      if (!response.ok) throw new Error('Failed to generate next set');
      
      const newQuestions = await response.json();
      const updatedHistory = [...(room?.history || room?.questions || []), ...newQuestions];

      await updateDoc(doc(db, 'rooms', ROOM_ID), {
        status: 'playing',
        questions: newQuestions,
        history: updatedHistory,
        readyForGuessing: [],
        nextSetTopic: '',
        topicConfirmation: '',
        isGeneratingQuestions: false,
        player1Answers: [],
        player2Answers: [],
        player1Guesses: [],
        player2Guesses: [],
        scores: { 'حسن': 0, 'نیوشا': 0 },
        lastUpdate: Date.now()
      });
      
      await setDoc(doc(db, 'globals', 'history'), { 
        questionTexts: Array.from(new Set([...fullHistoryTexts, ...newQuestions.map((q: any) => q.text)]))
      }, { merge: true });

    } catch (err: any) {
      console.error('Error generating next set:', err);
      setError('مشکلی در تولید سوالات پیش آمد. دوباره تلاش کنید.');
      await updateDoc(doc(db, 'rooms', ROOM_ID), { 
        readyForGuessing: [],
        isGeneratingQuestions: false,
        lastUpdate: Date.now()
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleReady = async () => {
    if (!room || !user) return;
    
    // Topic check: If in break room (set_review), must have a confirmed topic from Gemini first!
    if (room.status === 'set_review') {
      const hasConfirmedTopic = Boolean(room.nextSetTopic && room.nextSetTopic.trim().length > 0);
      if (!hasConfirmedTopic) {
        sound.playIncorrect();
        setError('لطفاً ابتدا با جمینای در چت بالا سر موضوع ست بعدی به تفاهم برسید ✨');
        return;
      }
    }

    sound.playReady();
    const currentReady = room.readyForGuessing || [];
    const isCurrentlyReady = currentReady.includes(user);
    const otherPlayer = user === 'حسن' ? 'نیوشا' : 'حسن';
    const isOtherReady = currentReady.includes(otherPlayer);

    if (isCurrentlyReady) {
      // Toggle OFF
      await updateDoc(doc(db, 'rooms', ROOM_ID), {
        readyForGuessing: arrayRemove(user),
        lastUpdate: Date.now()
      });
    } else {
      // Toggle ON
      if (isOtherReady) {
        // Both players are ready now!
        if (room.status === 'set_review') {
          await updateDoc(doc(db, 'rooms', ROOM_ID), {
            readyForGuessing: ['حسن', 'نیوشا'],
            isGeneratingQuestions: true,
            lastUpdate: Date.now()
          });
          await generateQuestionsForNewSet(room.nextSetTopic);
        } else if (room.status === 'review') {
          await updateDoc(doc(db, 'rooms', ROOM_ID), {
            status: 'guessing',
            readyForGuessing: [],
            lastUpdate: Date.now()
          });
        }
      } else {
        // First player is ready
        await updateDoc(doc(db, 'rooms', ROOM_ID), {
          readyForGuessing: arrayUnion(user),
          lastUpdate: Date.now()
        });
      }
    }
  };

  // Reactive watcher for readiness to handle asynchronous updates across devices
  useEffect(() => {
    if (!room || !user || loading) return;
    const bothReady = Boolean(
      room.readyForGuessing?.includes('حسن') && room.readyForGuessing?.includes('نیوشا')
    );

    if (bothReady) {
      if (room.status === 'set_review' && !room.isGeneratingQuestions) {
        if (user === 'حسن') {
          generateQuestionsForNewSet(room.nextSetTopic);
        }
      } else if (room.status === 'review') {
        if (user === 'حسن') {
          updateDoc(doc(db, 'rooms', ROOM_ID), {
            status: 'guessing',
            readyForGuessing: [],
            lastUpdate: Date.now()
          });
        }
      }
    }
  }, [room?.readyForGuessing, room?.status, room?.isGeneratingQuestions, user, loading]);

  // Failsafe auto-recovery check: automatically advance from 'playing' to 'review' if both have finished answering
  useEffect(() => {
    if (!room || !user || loading) return;

    const checkAutoAdvance = async () => {
      if (room.status === 'playing') {
        const p1Answers = room.player1Answers || [];
        const p2Answers = room.player2Answers || [];
        const questions = room.questions || [];
        const p1Questions = questions.filter(q => q.subject === 'حسن');
        const p2Questions = questions.filter(q => q.subject === 'نیوشا');

        const p1Finished = p1Questions.length > 0 ? (p1Answers.length >= p1Questions.length) : (p1Answers.length >= 5);
        const p2Finished = p2Questions.length > 0 ? (p2Answers.length >= p2Questions.length) : (p2Answers.length >= 5);
        const hardCeilingFinished = p1Answers.length >= 5 && p2Answers.length >= 5;

        if ((p1Finished && p2Finished) || hardCeilingFinished) {
          console.log('Failsafe auto-recovery: Advancing status to review');
          try {
            await updateDoc(doc(db, 'rooms', ROOM_ID), {
              status: 'review',
              readyForGuessing: [],
              lastUpdate: Date.now()
            });
          } catch (e) {
            console.warn('Failsafe auto-advance error:', e);
          }
        }
      }
    };

    checkAutoAdvance();
  }, [room?.player1Answers, room?.player2Answers, room?.status, room?.questions, user, loading]);

  // Failsafe auto-recovery for guessing phase: automatically advance to next set if both have finished guessing
  useEffect(() => {
    if (!room || !user || loading) return;

    const checkAutoAdvanceGuessing = async () => {
      if (room.status === 'guessing') {
        const p1Guesses = room.player1Guesses || [];
        const p2Guesses = room.player2Guesses || [];
        const p1Answers = room.player1Answers || [];
        const p2Answers = room.player2Answers || [];
        const questions = room.questions || [];
        const scores = room.scores || {};

        const p1Questions = questions.filter(q => q.subject === 'حسن');
        const p2Questions = questions.filter(q => q.subject === 'نیوشا');

        const p1TargetLen = p2Questions.length > 0 ? p2Questions.length : 5;
        const p2TargetLen = p1Questions.length > 0 ? p1Questions.length : 5;

        const p1Finished = p1Guesses.length >= p1TargetLen;
        const p2Finished = p2Guesses.length >= p2TargetLen;
        const hardCeilingFinished = p1Guesses.length >= 5 && p2Guesses.length >= 5;

        if ((p1Finished && p2Finished) || hardCeilingFinished) {
          console.log('Failsafe auto-recovery (guessing): Processing set scores and advancing status');
          
          // Count scores from guesses vs answers
          // P1 (Hasan) guesses Niusha's answers (p2Answers)
          let p1Score = 0;
          p1Guesses.forEach((guess, idx) => {
            if (p2Answers[idx] !== undefined && guess === p2Answers[idx]) {
              p1Score++;
            }
          });

          // P2 (Niusha) guesses Hasan's answers (p1Answers)
          let p2Score = 0;
          p2Guesses.forEach((guess, idx) => {
            if (p1Answers[idx] !== undefined && guess === p1Answers[idx]) {
              p2Score++;
            }
          });

          const setWinner = p1Score > p2Score ? 'حسن' : (p2Score > p1Score ? 'نیوشا' : 'برابری');
          const newSetWins = { ...room.setWins };
          if (setWinner === 'برابری') {
            newSetWins['حسن'] = (newSetWins['حسن'] || 0) + 1;
            newSetWins['نیوشا'] = (newSetWins['نیوشا'] || 0) + 1;
          } else {
            newSetWins[setWinner] = (newSetWins[setWinner] || 0) + 1;
          }

          const hWins = newSetWins['حسن'] || 0;
          const nWins = newSetWins['نیوشا'] || 0;
          const currentTotalSets = (room.totalSetsPlayed || 0) + 1;

          const winCheck = checkMatchWinCondition(hWins, nWins);

          const update: any = {};
          if (winCheck.finished) {
            update.status = 'finished';
            update.winner = winCheck.winner;
            update.totalSetsPlayed = currentTotalSets;
            update.setWins = newSetWins;
          } else {
            const prevChat = room.chatMessages || [];
            const setEndGeminiMsg: QuizChatMessage = {
              id: `msg-${Date.now()}-set-end-failsafe`,
              sender: 'جمینای',
              text: `خسته نباشید به هر دوتون! 🌸 ست شماره ${currentTotalSets} تموم شد.\nامتیاز این ست: حسن ${p1Score} | نیوشا ${p2Score}\nمجموع بردهای ست‌ها: حسن ${newSetWins['حسن']} - نیوشا ${newSetWins['نیوشا']}\n(مسابقه در حالت‌های ۳-۰، ۴-۱، ۴-۲ یا با رسیدن یکی از شما به ۵ برد به پایان می‌رسد و رقابت ادامه دارد! 🔥)\nحالا برای ست شماره ${currentTotalSets + 1} چه موضوعی رو انتخاب می‌کنید؟ با من گپ بزنید تا تاییدش کنیم! ✨`,
              timestamp: Date.now(),
            };

            update.lastSetScores = { 'حسن': p1Score, 'نیوشا': p2Score };
            update.status = 'set_review';
            update.readyForGuessing = [];
            update.totalSetsPlayed = currentTotalSets;
            update.setWins = newSetWins;
            update.nextSetTopic = '';
            update.topicConfirmation = '';
            update.chatMessages = [...prevChat, setEndGeminiMsg];
            update.player1Answers = [];
            update.player2Answers = [];
            update.player1Guesses = [];
            update.player2Guesses = [];
            update['scores.حسن'] = 0;
            update['scores.نیوشا'] = 0;
          }

          try {
            await updateDoc(doc(db, 'rooms', ROOM_ID), update);
          } catch (e) {
            console.warn('Failsafe auto-advance guessing error:', e);
          }
        }
      }
    };

    checkAutoAdvanceGuessing();
  }, [room?.player1Guesses, room?.player2Guesses, room?.status, room?.questions, user, loading]);

  // Auto-recovery: If room is marked 'finished' but score is not 3-0, 4-1, or 4-2 (e.g. 4-3), immediately reopen into set_review!
  useEffect(() => {
    if (!room || !user || loading) return;
    if (room.status === 'finished') {
      const hWins = room.setWins?.['حسن'] || 0;
      const nWins = room.setWins?.['نیوشا'] || 0;
      const winCheck = checkMatchWinCondition(hWins, nWins);
      if (!winCheck.finished) {
        console.log('Auto-recovering finished room: score', hWins, nWins, 'is not 3-0, 4-1, or 4-2.');
        const prevChat = room.chatMessages || [];
        const resumeMsg: QuizChatMessage = {
          id: `msg-${Date.now()}-auto-resume`,
          sender: 'جمینای',
          text: `✨ ست به پایان رسید و نتیجه ست‌ها ${hWins} - ${nWins} شد!\nمسابقه در حالت‌های ۳-۰، ۴-۱، ۴-۲ یا با رسیدن به ۵ برد به پایان می‌رسد؛ بنابراین رقابت حساس شما با نتیجه ${hWins}-${nWins} ادامه دارد! 🔥\nبرای ست شماره ${(room.totalSetsPlayed || 0) + 1} چه موضوعی را انتخاب می‌کنید؟ با من گپ بزنید تا تاییدش کنیم! ✨`,
          timestamp: Date.now(),
        };

        updateDoc(doc(db, 'rooms', ROOM_ID), {
          status: 'set_review',
          winner: '',
          player1Answers: [],
          player2Answers: [],
          player1Guesses: [],
          player2Guesses: [],
          readyForGuessing: [],
          questions: [],
          nextSetTopic: '',
          topicConfirmation: '',
          chatMessages: [...prevChat, resumeMsg],
          lastUpdate: Date.now()
        }).catch(err => console.warn('Auto-resume error:', err));
      }
    }
  }, [room?.status, room?.setWins, user, loading]);

  // Top Nav Bar Header Component for all views
  const TopNavBar = () => (
    <div className="w-full max-w-lg flex items-center justify-between py-1.5 px-2 mb-2 z-50">
      <div className="flex items-center gap-2">
        <button
          onClick={handleExitGame}
          id="quiz-back-home-btn"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white text-xs font-medium transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <Home className="w-3.5 h-3.5" style={{ color: theme.accentColor }} />
          <span>بازگشت به خانه</span>
        </button>

        {/* Fullscreen Toggle Button */}
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? 'خروج از تمام‌صفحه' : 'حالت تمام‌صفحه عمودی'}
          className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
        >
          {isFullscreen ? (
            <Minimize2 className="w-3.5 h-3.5 text-yellow-400" />
          ) : (
            <Maximize2 className="w-3.5 h-3.5" style={{ color: theme.accentColor }} />
          )}
        </button>

        <button
          onClick={handleToggleMute}
          title={isMuted ? 'فعال کردن صدا' : 'قطع صدا'}
          className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5 text-neutral-500" /> : <Volume2 className="w-3.5 h-3.5" style={{ color: theme.accentColor }} />}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <ThemeSelector compact />
        {user && (
          <div
            style={{ backgroundColor: theme.pillBg, borderColor: theme.pillBorder, color: theme.accentColor }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold"
          >
            <span>{user === 'حسن' ? '🕺' : '💃'}</span>
            <span>{user}</span>
          </div>
        )}
      </div>
    </div>
  );

  if (!user) {
    const isUnfinishedGame = Boolean(
      room &&
      room.status !== 'finished' &&
      (
        (room.totalSetsPlayed || 0) > 0 ||
        room.status === 'playing' ||
        room.status === 'guessing' ||
        room.status === 'review' ||
        room.status === 'set_review' ||
        (room.questions && room.questions.length > 0) ||
        (room.chatMessages && room.chatMessages.length > 0)
      )
    );

    const currentSetNum = (room?.totalSetsPlayed || 0) + 1;
    const wins = room?.setWins || { 'حسن': 0, 'نیوشا': 0 };
    const topic = room?.nextSetTopic || room?.history?.[room.history.length - 1]?.category || '';

    const getStatusText = () => {
      if (!room) return '';
      switch (room.status) {
        case 'set_review':
          return 'اتاق استراحت و هماهنگی با جمینای ☕✨';
        case 'playing':
          return 'پاسخ به سوالات اختصاصی 📝';
        case 'guessing':
          return 'مرحله شناخت و حدس جواب‌ها 🎯';
        case 'review':
          return 'مرور و بررسی پاسخ‌های ست 🔍';
        case 'waiting':
          return 'در انتظار اتصال بازیکنان ⏳';
        default:
          return 'در جریان مسابقه 🎮';
      }
    };

    return (
      <div
        style={{ backgroundColor: theme.bgDark }}
        className="fixed inset-0 z-[60] backdrop-blur-xl flex flex-col justify-center items-center p-3 sm:p-4 font-vazir overflow-y-auto"
      >
        <TopNavBar />

        {loading && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md z-[70] flex flex-col items-center justify-center p-6 text-center">
            <Loader2 className="w-10 h-10 animate-spin mb-3" style={{ color: theme.accentColor }} />
            <p className="text-white text-sm font-bold">در حال پردازش...</p>
          </div>
        )}

        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}
          className="w-full max-w-md border rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-center shadow-2xl my-auto space-y-4"
        >
          <div
            style={{ backgroundColor: theme.pillBg, borderColor: theme.pillBorder }}
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto border shadow-inner"
          >
            <Trophy className="w-7 h-7" style={{ color: theme.accentColor }} />
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white mb-1">کوییز شناخت حسن و نیوشا ❤️</h2>
            <p className="text-neutral-400 text-xs">
              {isUnfinishedGame && !showFreshConfirm 
                ? 'یک بازی ناتمام در جریان است؛ می‌تونید مستقیم به بازی ملحق بشید یا از ابتدا شروع کنید.' 
                : 'برای شروع بازی، لطفاً خودت رو انتخاب کن:'}
            </p>
          </div>

          {error && (
            <div
              style={{ backgroundColor: theme.pillBg, borderColor: theme.cardBorder }}
              className="p-2.5 rounded-xl border text-xs text-neutral-200"
            >
              {error}
            </div>
          )}

          {isUnfinishedGame && !showFreshConfirm ? (
            <div className="space-y-3.5 text-right">
              {/* Active Unfinished Game Card */}
              <div
                style={{ backgroundColor: theme.pillBg, borderColor: theme.cardBorder }}
                className="border rounded-2xl p-4 shadow-lg space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 text-[10px] font-bold">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-ping inline-block" />
                    <span>بازی ناتمام قبلی</span>
                  </span>
                  <span
                    style={{ backgroundColor: theme.pillBg, borderColor: theme.pillBorder, color: theme.accentColor }}
                    className="text-xs font-black px-2.5 py-1 rounded-lg border"
                  >
                    ست {currentSetNum}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-neutral-300">
                    <span className="text-neutral-400">مرحله بازی:</span>
                    <span className="font-bold text-white text-[11px]">{getStatusText()}</span>
                  </div>
                  <div className="flex items-center justify-between text-neutral-300">
                    <span className="text-neutral-400">مجموع بردهای ست‌ها:</span>
                    <span className="font-bold text-[11px]" style={{ color: theme.accentColor }}>
                      حسن ({wins['حسن'] || 0}) ⚔️ نیوشا ({wins['نیوشا'] || 0})
                    </span>
                  </div>
                  {topic && (
                    <div className="flex items-center justify-between text-neutral-300">
                      <span className="text-neutral-400">موضوع ست:</span>
                      <span className="font-bold text-[11px] truncate max-w-[180px]" style={{ color: theme.accentColor }}>«{topic}»</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Direct Resume Buttons */}
              <div className="space-y-2">
                <p className="text-[11px] text-neutral-400 text-center font-medium">ورود و ادامه بازی ناتمام:</p>
                <div className="grid grid-cols-2 gap-2.5">
                  <button 
                    onClick={() => resumeExistingGame('حسن')}
                    style={{ backgroundColor: theme.primaryColor }}
                    className="py-3 px-2 rounded-xl text-white font-bold flex flex-col items-center justify-center gap-1 shadow-lg active:scale-95 transition-all cursor-pointer text-xs hover:brightness-110"
                  >
                    <span className="text-xl">🕺</span>
                    <span>ورود به عنوان حسن</span>
                  </button>
                  <button 
                    onClick={() => resumeExistingGame('نیوشا')}
                    style={{ backgroundColor: theme.primaryColor }}
                    className="py-3 px-2 rounded-xl text-white font-bold flex flex-col items-center justify-center gap-1 shadow-lg active:scale-95 transition-all cursor-pointer text-xs hover:brightness-110"
                  >
                    <span className="text-xl">💃</span>
                    <span>ورود به عنوان نیوشا</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 text-center">
                <button
                  onClick={() => setShowFreshConfirm(true)}
                  className="text-neutral-400 hover:text-white text-[11px] transition-colors flex items-center justify-center gap-1.5 mx-auto py-1.5 cursor-pointer underline underline-offset-4"
                >
                  <RotateCcw className="w-3 h-3 text-neutral-500" />
                  <span>یا شروع مسابقه کاملاً جدید از ابتدا (صفر کردن بازی)</span>
                </button>
              </div>
            </div>
          ) : showFreshConfirm ? (
            /* Confirm Fresh Restart Modal View */
            <div
              style={{ backgroundColor: theme.pillBg, borderColor: theme.cardBorder }}
              className="space-y-3.5 text-center border rounded-2xl p-4"
            >
              <div
                style={{ backgroundColor: theme.cardBg, borderColor: theme.pillBorder }}
                className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto border"
              >
                <AlertCircle className="w-5 h-5" style={{ color: theme.accentColor }} />
              </div>
              <div>
                <p className="text-white text-xs font-bold mb-1">شروع مسابقه جدید از ست اول؟</p>
                <p className="text-neutral-400 text-[11px] leading-relaxed">
                  با شروع بازی جدید، امتیازات و اطلاعات بازی ناتمام قبلی صفر خواهند شد. خودت رو برای شروع بازی جدید انتخاب کن:
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button 
                  onClick={() => startNewGameFresh('حسن')}
                  style={{ backgroundColor: theme.primaryColor }}
                  className="py-2.5 rounded-xl text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-md hover:brightness-110"
                >
                  <span>🕺 من حسنم</span>
                </button>
                <button 
                  onClick={() => startNewGameFresh('نیوشا')}
                  style={{ backgroundColor: theme.primaryColor }}
                  className="py-2.5 rounded-xl text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-md hover:brightness-110"
                >
                  <span>💃 من نیوشام</span>
                </button>
              </div>

              <button
                onClick={() => setShowFreshConfirm(false)}
                className="text-neutral-400 hover:text-white text-[11px] py-1 transition-colors cursor-pointer"
              >
                انصراف و بازگشت به بازی ناتمام
              </button>
            </div>
          ) : (
            /* Standard Fresh User Selection */
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => { sound.playClick(); requestGameFullscreen(); setUser('حسن'); setError(null); }}
                  style={{ backgroundColor: theme.pillBg, borderColor: theme.pillBorder }}
                  className="py-3.5 rounded-xl border text-neutral-100 hover:brightness-125 transition-all cursor-pointer font-bold flex flex-col items-center gap-1.5 active:scale-95 shadow-md"
                >
                  <span className="text-2xl">🕺</span>
                  <span className="text-sm">من حسنم</span>
                </button>
                <button 
                  onClick={() => { sound.playClick(); requestGameFullscreen(); setUser('نیوشا'); setError(null); }}
                  style={{ backgroundColor: theme.pillBg, borderColor: theme.pillBorder }}
                  className="py-3.5 rounded-xl border text-neutral-100 hover:brightness-125 transition-all cursor-pointer font-bold flex flex-col items-center gap-1.5 active:scale-95 shadow-md"
                >
                  <span className="text-2xl">💃</span>
                  <span className="text-sm">من نیوشام</span>
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div
      style={{ backgroundColor: theme.bgDark }}
      className="fixed inset-0 z-[60] backdrop-blur-xl flex flex-col items-center justify-between p-2 sm:p-4 font-vazir overflow-y-auto"
    >
      <TopNavBar />

      {loading && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md z-[70] flex flex-col items-center justify-center p-6 text-center">
          <div className="relative mb-6">
            <div
              style={{ backgroundColor: theme.primaryColor }}
              className="absolute inset-0 opacity-20 rounded-full animate-ping"
            />
            <Loader2 className="w-12 h-12 animate-spin relative" style={{ color: theme.accentColor }} />
          </div>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-white text-lg font-bold mb-1"
          >
            {error && error.includes('طول کشیده') ? 'هوش مصنوعی داره سنگ تمام میذاره...' : 'جمینای در حال طراحی سوالات اختصاصی...'}
          </motion.p>
          <p className="text-xs animate-pulse text-neutral-300">
            ۱۰ سوال ویژه با توجه به موضوع انتخابی براتون آماده می‌شه ❤️
          </p>
        </div>
      )}

      <div className="w-full max-w-lg flex-1 flex flex-col justify-center my-auto">
        <AnimatePresence mode="wait">
          {!room ? (
            <motion.div 
              key="lobby"
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -15, opacity: 0 }}
              style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}
              className="w-full border rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-center shadow-2xl"
            >
              <div
                style={{ backgroundColor: theme.pillBg, borderColor: theme.pillBorder }}
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 border shadow-inner"
              >
                <Users className="w-7 h-7" style={{ color: theme.accentColor }} />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mb-1">آماده شروع بازی دونفره؟</h2>
              <p className="text-xs text-neutral-400 mb-4">
                یک اتاق بساز تا با ورود طرف مقابل، مستقیماً وارد اتاق استراحت بشید و موضوع ست رو با جمینای هماهنگ کنید! ✨
              </p>

              <div className="space-y-2.5 mb-4">
                <button 
                  onClick={createGame}
                  disabled={loading}
                  style={{ backgroundColor: theme.primaryColor }}
                  className="w-full py-3.5 rounded-xl text-white font-bold shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-95 text-sm hover:brightness-110"
                >
                  <Play className="w-4 h-4" />
                  <span>ساخت اتاق بازی دونفره</span>
                </button>

                <button 
                  onClick={resetGame}
                  className="text-neutral-400 hover:text-white text-[11px] transition-colors py-1 block w-full text-center underline cursor-pointer"
                >
                  پاکسازی اتاق (شروع دوباره از اول)
                </button>
              </div>

              {error && (
                <div
                  style={{ backgroundColor: theme.pillBg, borderColor: theme.cardBorder }}
                  className="mt-3 p-2.5 rounded-xl border text-center"
                >
                  <p className="text-xs font-bold mb-1.5 text-rose-400">{error}</p>
                  <button 
                    onClick={() => { setError(null); createGame(); }}
                    style={{ backgroundColor: theme.primaryColor }}
                    className="py-1 px-3 text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer hover:brightness-110"
                  >
                    تلاش مجدد 🔄
                  </button>
                </div>
              )}
            </motion.div>
          ) : room.status === 'waiting' || (room.players?.length < 2 && room.status !== 'finished') ? (
            <motion.div 
              key="waiting"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}
              className="w-full border rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-center shadow-2xl"
            >
              <div className="relative w-16 h-16 mx-auto mb-4">
                <div
                  style={{ backgroundColor: theme.primaryColor }}
                  className="absolute inset-0 opacity-20 rounded-full animate-ping"
                />
                <div
                  style={{ backgroundColor: theme.pillBg, borderColor: theme.pillBorder }}
                  className="relative rounded-full w-full h-full flex items-center justify-center border"
                >
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: theme.accentColor }} />
                </div>
              </div>
              <h2 className="text-xl font-bold text-white mb-1">در انتظار اتصال پارتنر...</h2>
              
              <div className="space-y-4 my-4">
                <div className="flex items-center justify-center gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      style={{
                        borderColor: room.players?.includes('حسن') ? theme.accentColor : 'rgba(255,255,255,0.1)',
                        backgroundColor: room.players?.includes('حسن') ? theme.pillBg : 'rgba(255,255,255,0.05)',
                      }}
                      className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center text-xl transition-all duration-300 ${room.players?.includes('حسن') ? 'opacity-100' : 'opacity-20'}`}
                    >
                      {room.players?.includes('حسن') ? '🕺' : '?'}
                    </div>
                    <span
                      style={{ color: room.players?.includes('حسن') ? theme.accentColor : undefined }}
                      className={`text-[11px] mt-1 font-bold ${room.players?.includes('حسن') ? '' : 'text-neutral-600'}`}
                    >
                      حسن
                    </span>
                  </div>
                  
                  <div className="font-bold text-sm" style={{ color: theme.accentColor }}>VS</div>

                  <div className="flex flex-col items-center">
                    <div
                      style={{
                        borderColor: room.players?.includes('نیوشا') ? theme.accentColor : 'rgba(255,255,255,0.1)',
                        backgroundColor: room.players?.includes('نیوشا') ? theme.pillBg : 'rgba(255,255,255,0.05)',
                      }}
                      className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center text-xl transition-all duration-300 ${room.players?.includes('نیوشا') ? 'opacity-100' : 'opacity-20'}`}
                    >
                      {room.players?.includes('نیوشا') ? '💃' : '?'}
                    </div>
                    <span
                      style={{ color: room.players?.includes('نیوشا') ? theme.accentColor : undefined }}
                      className={`text-[11px] mt-1 font-bold ${room.players?.includes('نیوشا') ? '' : 'text-neutral-600'}`}
                    >
                      نیوشا
                    </span>
                  </div>
                </div>
                
                <div
                  style={{ backgroundColor: theme.pillBg, borderColor: theme.cardBorder }}
                  className="rounded-xl p-3 border"
                >
                  <p className="text-neutral-300 text-xs leading-relaxed">
                    {room.players?.length === 1 
                      ? (room.players.includes(user) ? 'اتاق آماده است؛ به محض ورود طرف مقابل، مستقیماً وارد اتاق استراحت و هماهنگی موضوع با جمینای می‌شید!' : `${room.players[0]} منتظرته، وارد اتاق شو!`)
                      : 'اتصال برقرار شد! در حال انتقال به اتاق استراحت...'}
                  </p>
                </div>
              </div>
              
              {!room.players?.includes(user) ? (
                <button 
                  onClick={joinGame}
                  style={{ backgroundColor: theme.primaryColor }}
                  className="w-full py-3.5 rounded-xl text-white font-bold mb-2 cursor-pointer transition-all shadow-lg text-sm active:scale-95 hover:brightness-110"
                >
                  اتصال به اتاق و پارتنر 🚀
                </button>
              ) : (
                <div
                  style={{ color: theme.accentColor }}
                  className="py-2 text-xs font-medium animate-pulse mb-2"
                >
                  در حال انتظار برای ورود طرف مقابل...
                </div>
              )}

              <button onClick={resetGame} className="text-neutral-400 hover:text-white text-[11px] transition-colors underline cursor-pointer">لغو و بازنشانی اتاق</button>
            </motion.div>
          ) : room.status === 'review' || room.status === 'set_review' ? (
            <motion.div 
              key="review"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}
              className="w-full border rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-center shadow-2xl"
            >
              <div className="flex items-center justify-between mb-3">
                {/* Restart Request Button on right side of lounge header */}
                <button
                  onClick={handleRequestRestart}
                  disabled={!!room.resetRequestedBy}
                  id="quiz-restart-hand-btn"
                  style={{ backgroundColor: theme.pillBg, borderColor: theme.pillBorder }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl border text-neutral-300 hover:text-white text-[10px] font-bold transition-all cursor-pointer disabled:opacity-40 active:scale-95 shadow-sm"
                  title="درخواست شروع مجدد دست و بازی از اول"
                >
                  <RotateCcw className="w-3 h-3" style={{ color: theme.accentColor }} />
                  <span>شروع مجدد دست</span>
                </button>

                <div
                  style={{ backgroundColor: theme.pillBg, borderColor: theme.pillBorder, color: theme.accentColor }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold"
                >
                  <Coffee className="w-3.5 h-3.5" />
                  <span>{room.status === 'review' ? 'زمان استراحت و مرور' : 'اتاق استراحت و هماهنگی با جمینای ✨'}</span>
                </div>
              </div>

              <h3 className="text-lg sm:text-xl font-black text-white mb-1">
                {room.status === 'review' 
                  ? 'آماده مرحله شناخت طرف مقابل؟' 
                  : ((room.totalSetsPlayed || 0) === 0 ? 'هماهنگی موضوع ست اول با جمینای' : `پایان ست ${(room.totalSetsPlayed || 0)}! هماهنگی ست بعدی`)}
              </h3>

              {/* Reset / Restart Request Modal Banner */}
              {room.resetRequestedBy && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{ backgroundColor: theme.pillBg, borderColor: theme.cardBorder }}
                  className="my-3 p-3 rounded-2xl border text-right shadow-lg"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-xs font-bold text-amber-300">
                      {room.resetRequestedBy === user 
                        ? 'درخواست شروع مجدد از طرف شما ارسال شد' 
                        : `${room.resetRequestedBy} درخواست شروع مجدد بازی از اول را دارد:`}
                    </span>
                  </div>

                  <p className="text-[11px] text-neutral-300 mb-2.5 leading-relaxed">
                    {room.resetRequestedBy === user
                      ? 'منتظر تایید پارتنر هستید. اگر اشتباه دستتان خورده، می‌توانید لغو کنید.'
                      : 'آیا مایلید تمام ست‌ها و امتیازها پاکسازی شده و بازی مجدداً از ابتدا آغاز شود؟'}
                  </p>

                  <div className="flex items-center gap-2">
                    {room.resetRequestedBy !== user && (
                      <button
                        onClick={handleAcceptRestart}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md active:scale-95 text-center"
                      >
                        ✅ موافقم، شروع مجدد
                      </button>
                    )}
                    <button
                      onClick={handleCancelRestart}
                      className={`py-1.5 px-3 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-neutral-200 text-xs font-bold transition-all cursor-pointer active:scale-95 text-center ${room.resetRequestedBy === user ? 'w-full' : 'flex-1'}`}
                    >
                      ❌ لغو درخواست
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Gemini Interactive Chat in Break Room */}
              {room.status === 'set_review' && (
                <div
                  style={{ backgroundColor: theme.pillBg, borderColor: theme.cardBorder }}
                  className="my-3 rounded-2xl p-3 sm:p-4 border text-right relative overflow-hidden shadow-inner"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-white/5">
                    <div className="flex items-center gap-1.5">
                      <div
                        style={{ backgroundColor: theme.pillBg, borderColor: theme.pillBorder }}
                        className="w-5 h-5 rounded-full flex items-center justify-center border"
                      >
                        <Sparkles className="w-3 h-3" style={{ color: theme.accentColor }} />
                      </div>
                      <span className="text-xs font-black" style={{ color: theme.accentColor }}>گپ و تفاهم با جمینای ✨</span>
                    </div>
                    <span className="text-[10px] text-neutral-400">
                      {((room.totalSetsPlayed || 0) === 0) ? 'هماهنگی ست اول' : `ست ${(room.totalSetsPlayed || 0) + 1}`}
                    </span>
                  </div>

                  {/* Current Selected Topic Pill (if confirmed) */}
                  {room.nextSetTopic && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      style={{ backgroundColor: theme.pillBg, borderColor: theme.pillBorder }}
                      className="mb-2.5 p-2 rounded-xl border flex items-center justify-between shadow-md"
                    >
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div className="text-right truncate">
                          <span className="text-[10px] text-emerald-300 font-bold block">موضوع تایید شده برای ست بعدی:</span>
                          <span className="text-xs font-black text-white truncate block">«{room.nextSetTopic}»</span>
                        </div>
                      </div>
                      <button
                        onClick={handleClearTopic}
                        title="تغییر یا حذف موضوع"
                        className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white transition-all cursor-pointer shrink-0 ml-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  )}

                  {/* Scrollable Chat Area */}
                  <div 
                    ref={chatScrollRef}
                    className="max-h-52 min-h-[140px] overflow-y-auto space-y-2.5 p-2.5 mb-2.5 rounded-xl bg-black/40 border border-white/5 scroll-smooth"
                  >
                    {(!room.chatMessages || room.chatMessages.length === 0) ? (
                      <div className="text-center py-4 px-2 space-y-1.5">
                        <div
                          style={{ backgroundColor: theme.pillBg, borderColor: theme.pillBorder }}
                          className="w-9 h-9 rounded-2xl border flex items-center justify-center mx-auto"
                        >
                          <Bot className="w-5 h-5" style={{ color: theme.accentColor }} />
                        </div>
                        <p className="text-xs font-bold text-neutral-200">
                          سلام حسن و نیوشای دوست‌داشتنی! 🌸
                        </p>
                        <p className="text-[10px] text-neutral-400 leading-relaxed max-w-xs mx-auto">
                          اینجا می‌تونید با من گپ بزنید، نظر بپرسید، ایده بگیرید یا با هم سر موضوع بعدی به تفاهم برسید. به محض اینکه سر موضوعی توافق کنید، ۱۰ سوال ست بعدی بر همون اساس ساخته میشه! ✨
                        </p>
                      </div>
                    ) : (
                      room.chatMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${msg.sender === 'جمینای' ? 'items-start' : (msg.sender === user ? 'items-end' : 'items-start')}`}
                        >
                          {/* Sender Label */}
                          <div className="flex items-center gap-1 mb-0.5 px-1">
                            <span className="text-[9px] font-bold text-neutral-400">
                              {msg.sender === 'جمینای' ? '✨ جمینای' : (msg.sender === 'حسن' ? '🕺 حسن' : '💃 نیوشا')}
                            </span>
                            {msg.sender === user && (
                              <span className="text-[8px] text-neutral-500">(شما)</span>
                            )}
                          </div>

                          {/* Bubble */}
                          <div
                            style={{
                              backgroundColor: msg.sender === 'جمینای' 
                                ? theme.pillBg 
                                : (msg.sender === user ? theme.primaryColor : 'rgba(255,255,255,0.1)'),
                              borderColor: msg.sender === 'جمینای' ? theme.pillBorder : 'transparent'
                            }}
                            className={`max-w-[88%] p-2.5 rounded-2xl text-xs leading-relaxed shadow-sm border ${
                              msg.sender === 'جمینای'
                                ? 'text-neutral-100 rounded-tl-none text-right'
                                : 'text-white rounded-tr-none text-right'
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                            
                            {msg.confirmedTopic && (
                              <div className="mt-1.5 pt-1.5 border-t border-white/20 flex items-center gap-1 text-[10px] text-emerald-300 font-bold">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                <span>موضوع تایید شد: «{msg.confirmedTopic}»</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}

                    {chatLoading && (
                      <div
                        style={{ backgroundColor: theme.pillBg, borderColor: theme.pillBorder, color: theme.accentColor }}
                        className="flex items-center gap-2 p-2 text-[10px] rounded-xl w-fit border animate-pulse"
                      >
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>جمینای در حال پاسخ دادن...</span>
                      </div>
                    )}
                  </div>

                  {/* Suggestion Chips */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 mb-2 scrollbar-none no-scrollbar">
                    {[
                      { label: '💡 چندتا موضوع باحال بگو', text: 'جمینای چندتا موضوع جذاب و خاص برای سوالات ست بعدی پیشنهاد بده' },
                      { label: '✈️ سفرها و خاطرات', text: 'نظرت درباره موضوع سفرها و خاطرات دونفره‌مون چیه؟' },
                      { label: '🤫 سوتی‌ها و رازها', text: 'موضوع سوتی‌های خنده‌دار و رازهای باحال باشه چطوره؟' },
                      { label: '🍕 علایق و غذاها', text: 'بریم سراغ موضوع خوراکی‌ها، کافه‌گردی و سلیقه‌هامون' },
                      { label: '💭 رویاها و آینده', text: 'موضوع رویاها، اهداف و برنامه‌های آینده‌مون باشه' },
                    ].map((chip, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendChatMessage(chip.text)}
                        disabled={chatLoading}
                        className="whitespace-nowrap px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] text-neutral-300 hover:text-white transition-all cursor-pointer shrink-0 disabled:opacity-50 active:scale-95"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>

                  {/* Chat Input */}
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendChatMessage()}
                      placeholder="با جمینای گپ بزنید، ایده بگیرید یا موضوع رو بگید..."
                      className="flex-1 bg-black/50 border border-white/10 rounded-xl py-2 px-3 text-xs text-white placeholder:text-neutral-500 focus:border-white/30 transition-all outline-none"
                    />
                    <button 
                      onClick={() => handleSendChatMessage()}
                      disabled={chatLoading || !chatInput.trim()}
                      style={{ backgroundColor: theme.primaryColor }}
                      className="text-white p-2.5 rounded-xl transition-all shadow-md flex items-center justify-center min-w-[42px] cursor-pointer active:scale-95 hover:brightness-110 disabled:opacity-40"
                    >
                      {chatLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Ready Status */}
              <div className="grid grid-cols-2 gap-2.5 my-3">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center gap-1">
                  <span className="text-xl">🕺</span>
                  <span className="text-xs font-bold text-white">حسن</span>
                  <div className={`px-2 py-0.5 rounded text-[9px] font-bold ${room.readyForGuessing?.includes('حسن') ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-neutral-500'}`}>
                    {room.readyForGuessing?.includes('حسن') ? 'آماده ✅' : 'در حال استراحت ⏳'}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center gap-1">
                  <span className="text-xl">💃</span>
                  <span className="text-xs font-bold text-white">نیوشا</span>
                  <div className={`px-2 py-0.5 rounded text-[9px] font-bold ${room.readyForGuessing?.includes('نیوشا') ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-neutral-500'}`}>
                    {room.readyForGuessing?.includes('نیوشا') ? 'آماده ✅' : 'در حال استراحت ⏳'}
                  </div>
                </div>
              </div>

              {/* Set & Match Score Overview */}
              <div
                style={{ backgroundColor: theme.pillBg, borderColor: theme.cardBorder }}
                className="p-2.5 rounded-xl border mb-3"
              >
                <div className="flex justify-between items-center px-2">
                  <div className="text-center">
                    <p className="text-[9px] text-neutral-400">ست‌های حسن</p>
                    <p className="text-base font-black text-white">{room.setWins?.['حسن'] || 0}</p>
                  </div>
                  <div className="font-black text-xs" style={{ color: theme.accentColor }}>
                    {(room.totalSetsPlayed || 0) === 0 ? 'شروع مسابقه' : `ست‌های بازی شده: ${room.totalSetsPlayed}`}
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] text-neutral-400">ست‌های نیوشا</p>
                    <p className="text-base font-black text-white">{room.setWins?.['نیوشا'] || 0}</p>
                  </div>
                </div>
              </div>

              {/* Ready Action Button / Condition Warning */}
              {(() => {
                const isGenerating = Boolean(room.isGeneratingQuestions || loading);
                const isBreakRoom = room.status === 'set_review';
                const hasTopic = Boolean(room.nextSetTopic && room.nextSetTopic.trim().length > 0);
                const isUserReady = room.readyForGuessing?.includes(user!);

                if (isGenerating) {
                  return (
                    <div
                      style={{ backgroundColor: theme.pillBg, borderColor: theme.pillBorder, color: theme.accentColor }}
                      className="w-full py-3.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 shadow-lg animate-pulse"
                    >
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جمینای در حال طراحی ۱۰ سوال اختصاصی... ✨</span>
                    </div>
                  );
                }

                if (isBreakRoom && !hasTopic) {
                  return (
                    <div className="space-y-1.5">
                      <button
                        disabled
                        className="w-full py-3.5 rounded-xl bg-white/5 border border-white/10 text-neutral-400 font-bold flex items-center justify-center gap-2 text-xs cursor-not-allowed opacity-80"
                      >
                        <Lock className="w-3.5 h-3.5" style={{ color: theme.accentColor }} />
                        <span>ابتدا در چت بالا با جمینای سر موضوع به تفاهم برسید</span>
                      </button>
                      <p className="text-[10px] text-neutral-400 text-center font-medium">
                        💡 یک پیام در چت بنویسید یا دکمه‌های پیشنهادی بالا را بزنید تا موضوع تایید شود.
                      </p>
                    </div>
                  );
                }

                return (
                  <button
                    onClick={toggleReady}
                    style={{ backgroundColor: isUserReady ? 'rgba(34, 197, 94, 0.2)' : theme.primaryColor }}
                    className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer text-xs sm:text-sm active:scale-95 shadow-md ${
                      isUserReady
                        ? 'border border-green-500/40 text-green-400'
                        : 'text-white hover:brightness-110'
                    }`}
                  >
                    {isUserReady ? (
                      <>
                        <span>منتظر اعلام آمادگی پارتنر... ✅</span>
                      </>
                    ) : (
                      <>
                        {room.status === 'review'
                          ? 'آمادم برای مرحله شناخت و حدس زدن! 🚀'
                          : `آمادم برای شروع ست با موضوع «${room.nextSetTopic}»! 🔥`}
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                );
              })()}
            </motion.div>
          ) : room.status === 'playing' || room.status === 'guessing' ? (
            <motion.div 
              key="playing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}
              className="w-full border rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-2xl"
            >
              {/* Top Scorebar inside card */}
              <div className="flex justify-between items-center mb-3 pb-2.5 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <div
                    style={{ backgroundColor: theme.pillBg }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-base"
                  >
                    🕺
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-neutral-400">امتیاز حسن</p>
                    <p className="text-sm font-bold" style={{ color: theme.accentColor }}>
                      {(room.scores || {})['حسن'] || 0}
                    </p>
                  </div>
                </div>

                <div className="text-center">
                  <div
                    style={{ backgroundColor: theme.pillBg, borderColor: theme.pillBorder }}
                    className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border mx-auto mb-1"
                  >
                    <span className="text-[10px] font-bold text-white">{room.setWins?.['حسن'] || 0}</span>
                    <span className="text-[9px] text-neutral-400">ست‌ها</span>
                    <span className="text-[10px] font-bold text-white">{room.setWins?.['نیوشا'] || 0}</span>
                  </div>
                  <p className="text-[10px] font-medium" style={{ color: theme.accentColor }}>
                    {room.status === 'playing' ? 'بخش ۱: درباره خودت' : 'بخش ۲: حدس بزن طرفت چی گفته'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-left">
                    <p className="text-[9px] text-neutral-400">امتیاز نیوشا</p>
                    <p className="text-sm font-bold" style={{ color: theme.accentColor }}>
                      {(room.scores || {})['نیوشا'] || 0}
                    </p>
                  </div>
                  <div
                    style={{ backgroundColor: theme.pillBg }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-base"
                  >
                    💃
                  </div>
                </div>
              </div>

              {/* Question Area */}
              {(() => {
                const p1Answers = room.player1Answers || [];
                const p2Answers = room.player2Answers || [];
                const p1Guesses = room.player1Guesses || [];
                const p2Guesses = room.player2Guesses || [];
                const questions = room.questions || [];

                const subjectQuestions = questions.filter(q => q.subject === user);
                const targetQuestions = questions.filter(q => q.subject !== user);

                const answersLen = user === 'حسن' ? p1Answers.length : p2Answers.length;
                const guessesLen = user === 'حسن' ? p1Guesses.length : p2Guesses.length;
                
                const currentPhaseQuestions = room.status === 'playing' ? subjectQuestions : targetQuestions;
                const currentIdx = room.status === 'playing' ? answersLen : guessesLen;

                if (room.isGeneratingQuestions) {
                  return (
                    <div className="text-center py-8">
                      <div className="relative w-16 h-16 mx-auto mb-4">
                        <div
                          style={{ backgroundColor: theme.primaryColor }}
                          className="absolute inset-0 opacity-20 rounded-full animate-ping"
                        />
                        <div
                          style={{ backgroundColor: theme.pillBg, borderColor: theme.pillBorder }}
                          className="relative border rounded-full w-full h-full flex items-center justify-center"
                        >
                          <Sparkles className="w-7 h-7 animate-pulse" style={{ color: theme.accentColor }} />
                        </div>
                      </div>
                      <h4 className="text-base font-bold text-white mb-1">جمینای در حال طراحی سوالات اختصاصی...</h4>
                      <p className="text-xs px-4 text-neutral-400">
                        صبر کنید تا سوالات ست جدید آماده بشن ✨
                      </p>
                    </div>
                  );
                }

                if (currentIdx >= currentPhaseQuestions.length) {
                  return (
                    <div className="text-center py-8">
                      <div className="relative w-14 h-14 mx-auto mb-3">
                        <div
                          style={{ backgroundColor: theme.primaryColor }}
                          className="absolute inset-0 opacity-20 rounded-full animate-ping"
                        />
                        <div
                          style={{ backgroundColor: theme.pillBg, borderColor: theme.pillBorder }}
                          className="relative rounded-full w-full h-full flex items-center justify-center border"
                        >
                          <Users className="w-7 h-7" style={{ color: theme.accentColor }} />
                        </div>
                      </div>
                      <h4 className="text-white text-sm font-bold mb-1">منتظر {user === 'حسن' ? 'نیوشا' : 'حسن'} باش...</h4>
                      <p className="text-neutral-400 text-xs px-4">
                        {room.status === 'playing' 
                          ? 'پاسخ‌های خودت ثبت شد. به محض اتمام طرف مقابل، مرحله حدس زدن شروع می‌شه!' 
                          : 'حدس‌هات تموم شد! منتظر اتمام طرف مقابل بمون.'}
                      </p>
                    </div>
                  );
                }

                const question = currentPhaseQuestions[currentIdx];
                if (!question) return <div className="text-white text-center py-4">در حال آماده‌سازی سوال...</div>;

                return (
                  <div className="space-y-3">
                    <div
                      style={{ backgroundColor: theme.pillBg, borderColor: theme.pillBorder }}
                      className="p-3.5 rounded-xl border text-center"
                    >
                      <div
                        style={{ color: theme.accentColor }}
                        className="flex items-center justify-center gap-1.5 text-[10px] mb-1 font-bold"
                      >
                        <span>سوال {currentIdx + 1} از {currentPhaseQuestions.length}</span>
                      </div>
                      <h3 className="text-xs sm:text-sm font-bold text-white leading-relaxed">{question.text}</h3>
                      {room.status === 'guessing' && (
                        <p className="mt-1 text-[10px] text-neutral-300">حدس بزن {user === 'حسن' ? 'نیوشا' : 'حسن'} کدام گزینه را انتخاب کرده؟</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {(question.options || []).map((option, idx) => {
                        const isCorrect = feedback?.correctIdx === idx;
                        const isSelected = selectedOption === idx;
                        
                        let optionBg = 'rgba(255,255,255,0.05)';
                        let optionBorder = 'rgba(255,255,255,0.1)';
                        let optionText = 'text-neutral-300';

                        if (isSelected) {
                          if (feedback) {
                            if (feedback.isCorrect) {
                              optionBg = '#16a34a';
                              optionBorder = '#22c55e';
                              optionText = 'text-white';
                            } else {
                              optionBg = '#dc2626';
                              optionBorder = '#ef4444';
                              optionText = 'text-white';
                            }
                          } else {
                            optionBg = theme.primaryColor;
                            optionBorder = theme.accentColor;
                            optionText = 'text-white';
                          }
                        } else if (feedback && isCorrect) {
                          optionBg = 'rgba(34,197,94,0.2)';
                          optionBorder = 'rgba(34,197,94,0.5)';
                          optionText = 'text-green-300';
                        }

                        return (
                          <button
                            key={idx}
                            disabled={!!feedback}
                            onClick={() => { sound.playClick(); setSelectedOption(idx); }}
                            style={{ backgroundColor: optionBg, borderColor: optionBorder }}
                            className={`w-full p-3 rounded-xl text-right transition-all border relative overflow-hidden ${optionText} ${
                              feedback ? 'cursor-default' : 'hover:brightness-110 cursor-pointer active:scale-[0.99]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 relative z-10">
                              <div
                                style={{
                                  backgroundColor: isSelected ? '#ffffff' : 'rgba(255,255,255,0.1)',
                                  color: isSelected ? theme.primaryColor : '#d4d4d4'
                                }}
                                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                              >
                                {idx + 1}
                              </div>
                              <span className="text-xs sm:text-sm font-medium">{option}</span>
                            </div>
                            
                            {feedback && isSelected && (
                              <motion.div 
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-white"
                              >
                                {feedback.isCorrect ? '✅ درست' : '❌ اشتباه'}
                              </motion.div>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {!feedback && (
                      <button
                        onClick={submitAnswer}
                        disabled={selectedOption === null}
                        style={{ backgroundColor: theme.primaryColor }}
                        className="w-full py-3 rounded-xl text-white font-bold flex items-center justify-center gap-1.5 disabled:opacity-30 transition-all cursor-pointer shadow-md text-xs sm:text-sm active:scale-95 hover:brightness-110"
                      >
                        <span>ثبت پاسخ</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                    
                    {feedback && (
                      <div
                        style={{ color: theme.accentColor }}
                        className="text-center py-1 animate-pulse text-[10px]"
                      >
                        در حال ثبت نتیجه...
                      </div>
                    )}
                  </div>
                );
              })()}
            </motion.div>
          ) : (
            <motion.div 
              key="finished"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{ backgroundColor: theme.cardBg, borderColor: theme.cardBorder }}
              className="w-full border rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-center shadow-2xl"
            >
              <div
                style={{ backgroundColor: theme.pillBg, borderColor: theme.pillBorder }}
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 border shadow-inner"
              >
                <Trophy className="w-8 h-8 text-yellow-500" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mb-1">پایان مسابقه! 🎉</h2>
              
              <div className="my-4 space-y-3">
                <div
                  style={{ backgroundColor: theme.pillBg, borderColor: theme.cardBorder }}
                  className="p-4 rounded-xl border"
                >
                  <p className="text-neutral-400 text-xs mb-1">برنده نهایی مسابقه:</p>
                  <p className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-500">
                    {room.winner === 'برابری' ? 'هر دو نفر برنده و ستاره‌اید! ❤️' : `🏆 ${room.winner} برنده شد! 🏆`}
                  </p>
                  <div className="mt-3 flex justify-center items-center gap-6 pt-3 border-t border-white/10">
                    <div className="flex flex-col items-center">
                      <span className="text-lg">🕺</span>
                      <span className="text-[10px] text-neutral-400">حسن</span>
                      <span className="text-sm font-bold text-white">{room.setWins?.['حسن'] || 0} ست</span>
                    </div>
                    <div className="text-neutral-500 font-bold text-xs">VS</div>
                    <div className="flex flex-col items-center">
                      <span className="text-lg">💃</span>
                      <span className="text-[10px] text-neutral-400">نیوشا</span>
                      <span className="text-sm font-bold text-white">{room.setWins?.['نیوشا'] || 0} ست</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <button 
                  onClick={handleContinueGame}
                  style={{ backgroundColor: theme.primaryColor }}
                  className="w-full py-3 rounded-xl text-white font-bold hover:brightness-110 transition-all cursor-pointer text-xs sm:text-sm active:scale-95 shadow-md flex items-center justify-center gap-2"
                >
                  <span>ادامه بازی و ست‌های بیشتر (بدون ریست امتیازها) 🔥</span>
                </button>
                <button 
                  onClick={resetGame}
                  className="w-full py-3 rounded-xl bg-white text-black font-bold hover:bg-neutral-200 transition-all cursor-pointer text-xs sm:text-sm active:scale-95"
                >
                  بازی مجدد
                </button>
                <button 
                  onClick={handleExitGame}
                  className="w-full py-2.5 rounded-xl bg-transparent border border-white/10 text-white font-medium hover:bg-white/5 transition-all cursor-pointer text-xs"
                >
                  بازگشت به سایت
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

