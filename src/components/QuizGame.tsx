import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Users, Play, Send, ChevronRight, HelpCircle, AlertCircle, Loader2, Sparkles, Coffee, Home, RotateCcw, Volume2, VolumeX, MessageSquare, Bot, CheckCircle2, Lightbulb, RefreshCw, X, Lock, Maximize2, Minimize2 } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, onSnapshot, setDoc, updateDoc, deleteDoc, getDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { QuizRoom, QuizQuestion, QuizChatMessage } from '../types';
import { sound } from '../utils/audio';

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

export const QuizGame: React.FC<QuizGameProps> = ({ onClose }) => {
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

              // Decisive win & Sudden Death rules
              const hDecisive = (hWins === 3 && nWins === 0) || (hWins >= 4 && nWins <= 2) || (hWins >= 5);
              const nDecisive = (nWins === 3 && hWins === 0) || (nWins >= 4 && hWins <= 2) || (nWins >= 5);
              
              const isAfterSet5 = currentTotalSets >= 5;
              const hSuddenDeath = isAfterSet5 && (hWins > nWins);
              const nSuddenDeath = isAfterSet5 && (nWins > hWins);

              const hWonMatch = hDecisive || hSuddenDeath;
              const nWonMatch = nDecisive || nSuddenDeath;

              if (hWonMatch || nWonMatch) {
                update.status = 'finished';
                update.winner = hWonMatch ? 'حسن' : 'نیوشا';
                update.totalSetsPlayed = currentTotalSets;
                update.setWins = newSetWins;
              } else {
                const prevChat = room.chatMessages || [];
                const setEndGeminiMsg: QuizChatMessage = {
                  id: `msg-${Date.now()}-set-end`,
                  sender: 'جمینای',
                  text: `خسته نباشید به هر دوتون! 🌸 ست شماره ${currentTotalSets} تموم شد.\nامتیاز این ست: حسن ${p1Score} | نیوشا ${p2Score}\nمجموع بردهای ست‌ها: حسن ${newSetWins['حسن']} - نیوشا ${newSetWins['نیوشا']}\nحالا برای ست شماره ${currentTotalSets + 1} چه موضوعی رو انتخاب می‌کنید؟ با من گپ بزنید تا تاییدش کنیم! ✨`,
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

  // Top Nav Bar Header Component for all views
  const TopNavBar = () => (
    <div className="w-full max-w-lg flex items-center justify-between py-1.5 px-2 mb-2 z-50">
      <div className="flex items-center gap-2">
        <button
          onClick={handleExitGame}
          id="quiz-back-home-btn"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white text-xs font-medium transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <Home className="w-3.5 h-3.5 text-rose-400" />
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
            <Maximize2 className="w-3.5 h-3.5 text-rose-400" />
          )}
        </button>

        <button
          onClick={handleToggleMute}
          title={isMuted ? 'فعال کردن صدا' : 'قطع صدا'}
          className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5 text-neutral-500" /> : <Volume2 className="w-3.5 h-3.5 text-rose-400" />}
        </button>
      </div>

      {user && (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] font-bold">
          <span>{user === 'حسن' ? '🕺' : '💃'}</span>
          <span>{user}</span>
        </div>
      )}
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
      <div className="fixed inset-0 z-[60] bg-[#0a0208]/95 backdrop-blur-xl flex flex-col justify-center items-center p-3 sm:p-4 font-vazir overflow-y-auto">
        <TopNavBar />

        {loading && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md z-[70] flex flex-col items-center justify-center p-6 text-center">
            <Loader2 className="w-10 h-10 text-rose-500 animate-spin mb-3" />
            <p className="text-white text-sm font-bold">در حال پردازش...</p>
          </div>
        )}

        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md bg-[#1a0b18] border border-rose-900/40 rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-center shadow-2xl my-auto space-y-4"
        >
          <div className="w-14 h-14 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/20 shadow-inner">
            <Trophy className="w-7 h-7 text-rose-500" />
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
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {isUnfinishedGame && !showFreshConfirm ? (
            <div className="space-y-3.5 text-right">
              {/* Active Unfinished Game Card */}
              <div className="bg-gradient-to-br from-purple-950/40 via-rose-950/30 to-neutral-900/60 border border-rose-500/30 rounded-2xl p-4 shadow-lg space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 text-[10px] font-bold">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-ping inline-block" />
                    <span>بازی ناتمام قبلی</span>
                  </span>
                  <span className="text-xs font-black text-rose-300 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20">
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
                    <span className="font-bold text-rose-300 text-[11px]">
                      حسن ({wins['حسن'] || 0}) ⚔️ نیوشا ({wins['نیوشا'] || 0})
                    </span>
                  </div>
                  {topic && (
                    <div className="flex items-center justify-between text-neutral-300">
                      <span className="text-neutral-400">موضوع ست:</span>
                      <span className="font-bold text-purple-300 text-[11px] truncate max-w-[180px]">«{topic}»</span>
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
                    className="py-3 px-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold flex flex-col items-center justify-center gap-1 shadow-lg shadow-rose-600/20 active:scale-95 transition-all cursor-pointer text-xs"
                  >
                    <span className="text-xl">🕺</span>
                    <span>ورود به عنوان حسن</span>
                  </button>
                  <button 
                    onClick={() => resumeExistingGame('نیوشا')}
                    className="py-3 px-2 rounded-xl bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-500 hover:to-pink-600 text-white font-bold flex flex-col items-center justify-center gap-1 shadow-lg shadow-pink-600/20 active:scale-95 transition-all cursor-pointer text-xs"
                  >
                    <span className="text-xl">💃</span>
                    <span>ورود به عنوان نیوشا</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 text-center">
                <button
                  onClick={() => setShowFreshConfirm(true)}
                  className="text-neutral-400 hover:text-rose-400 text-[11px] transition-colors flex items-center justify-center gap-1.5 mx-auto py-1.5 cursor-pointer underline underline-offset-4"
                >
                  <RotateCcw className="w-3 h-3 text-neutral-500" />
                  <span>یا شروع مسابقه کاملاً جدید از ابتدا (صفر کردن بازی)</span>
                </button>
              </div>
            </div>
          ) : showFreshConfirm ? (
            /* Confirm Fresh Restart Modal View */
            <div className="space-y-3.5 text-center bg-rose-950/30 border border-rose-500/20 rounded-2xl p-4">
              <div className="w-10 h-10 bg-rose-500/20 rounded-xl flex items-center justify-center mx-auto text-rose-400">
                <AlertCircle className="w-5 h-5" />
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
                  className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-md"
                >
                  <span>🕺 من حسنم</span>
                </button>
                <button 
                  onClick={() => startNewGameFresh('نیوشا')}
                  className="py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-md"
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
                  className="py-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-100 hover:bg-rose-900/60 transition-all cursor-pointer font-bold flex flex-col items-center gap-1.5 active:scale-95 shadow-md"
                >
                  <span className="text-2xl">🕺</span>
                  <span className="text-sm">من حسنم</span>
                </button>
                <button 
                  onClick={() => { sound.playClick(); requestGameFullscreen(); setUser('نیوشا'); setError(null); }}
                  className="py-3.5 rounded-xl bg-pink-950/40 border border-pink-500/30 text-pink-100 hover:bg-pink-900/60 transition-all cursor-pointer font-bold flex flex-col items-center gap-1.5 active:scale-95 shadow-md"
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
    <div className="fixed inset-0 z-[60] bg-[#0a0208]/95 backdrop-blur-xl flex flex-col items-center justify-between p-2 sm:p-4 font-vazir overflow-y-auto">
      <TopNavBar />

      {loading && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md z-[70] flex flex-col items-center justify-center p-6 text-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-rose-500/20 rounded-full animate-ping"></div>
            <Loader2 className="w-12 h-12 text-rose-500 animate-spin relative" />
          </div>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-white text-lg font-bold mb-1"
          >
            {error && error.includes('طول کشیده') ? 'هوش مصنوعی داره سنگ تمام میذاره...' : 'جمینای در حال طراحی سوالات اختصاصی...'}
          </motion.p>
          <p className="text-rose-300/70 text-xs animate-pulse">
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
              className="w-full bg-[#1a0b18] border border-rose-900/40 rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-center shadow-2xl"
            >
              <div className="w-14 h-14 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-rose-500/20">
                <Users className="w-7 h-7 text-rose-500" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mb-1">آماده شروع بازی دونفره؟</h2>
              <p className="text-xs text-neutral-400 mb-4">
                یک اتاق بساز تا با ورود طرف مقابل، مستقیماً وارد اتاق استراحت بشید و موضوع ست رو با جمینای هماهنگ کنید! ✨
              </p>

              <div className="space-y-2.5 mb-4">
                <button 
                  onClick={createGame}
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 text-white font-bold shadow-lg hover:shadow-rose-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-95 text-sm"
                >
                  <Play className="w-4 h-4" />
                  <span>ساخت اتاق بازی دونفره</span>
                </button>

                <button 
                  onClick={resetGame}
                  className="text-neutral-500 hover:text-neutral-300 text-[11px] transition-colors py-1 block w-full text-center underline cursor-pointer"
                >
                  پاکسازی اتاق (شروع دوباره از اول)
                </button>
              </div>

              {error && (
                <div className="mt-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
                  <p className="text-rose-400 text-xs font-bold mb-1.5">{error}</p>
                  <button 
                    onClick={() => { setError(null); createGame(); }}
                    className="py-1 px-3 bg-rose-500 text-white rounded-lg text-[10px] font-bold hover:bg-rose-400 transition-colors cursor-pointer"
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
              className="w-full bg-[#1a0b18] border border-rose-900/40 rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-center shadow-2xl"
            >
              <div className="relative w-16 h-16 mx-auto mb-4">
                <div className="absolute inset-0 bg-rose-500/20 rounded-full animate-ping"></div>
                <div className="relative bg-rose-500/10 rounded-full w-full h-full flex items-center justify-center border border-rose-500/30">
                  <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-white mb-1">در انتظار اتصال پارتنر...</h2>
              
              <div className="space-y-4 my-4">
                <div className="flex items-center justify-center gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center text-xl transition-all duration-300 ${room.players?.includes('حسن') ? 'border-rose-500 bg-rose-500/20' : 'border-white/10 bg-white/5 opacity-20'}`}>
                      {room.players?.includes('حسن') ? '🕺' : '?'}
                    </div>
                    <span className={`text-[11px] mt-1 font-bold ${room.players?.includes('حسن') ? 'text-rose-400' : 'text-neutral-600'}`}>حسن</span>
                  </div>
                  
                  <div className="text-rose-500 font-bold text-sm">VS</div>

                  <div className="flex flex-col items-center">
                    <div className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center text-xl transition-all duration-300 ${room.players?.includes('نیوشا') ? 'border-pink-500 bg-pink-500/20' : 'border-white/10 bg-white/5 opacity-20'}`}>
                      {room.players?.includes('نیوشا') ? '💃' : '?'}
                    </div>
                    <span className={`text-[11px] mt-1 font-bold ${room.players?.includes('نیوشا') ? 'text-pink-400' : 'text-neutral-600'}`}>نیوشا</span>
                  </div>
                </div>
                
                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
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
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 text-white font-bold mb-2 cursor-pointer hover:scale-[1.01] transition-all shadow-lg shadow-rose-500/20 text-sm active:scale-95"
                >
                  اتصال به اتاق و پارتنر 🚀
                </button>
              ) : (
                <div className="py-2 text-rose-400 text-xs font-medium animate-pulse mb-2">
                  در حال انتظار برای ورود طرف مقابل...
                </div>
              )}

              <button onClick={resetGame} className="text-neutral-500 hover:text-neutral-300 text-[11px] transition-colors underline cursor-pointer">لغو و بازنشانی اتاق</button>
            </motion.div>
          ) : room.status === 'review' || room.status === 'set_review' ? (
            <motion.div 
              key="review"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full bg-[#1a0b18] border border-rose-900/40 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-center shadow-2xl"
            >
              <div className="flex items-center justify-between mb-3">
                {/* Restart Request Button on right side of lounge header */}
                <button
                  onClick={handleRequestRestart}
                  disabled={!!room.resetRequestedBy}
                  id="quiz-restart-hand-btn"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 hover:text-white text-[10px] font-bold transition-all cursor-pointer disabled:opacity-40 active:scale-95 shadow-sm"
                  title="درخواست شروع مجدد دست و بازی از اول"
                >
                  <RotateCcw className="w-3 h-3 text-rose-400" />
                  <span>شروع مجدد دست</span>
                </button>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold">
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
                  className="my-3 p-3 rounded-2xl bg-gradient-to-r from-amber-950/60 to-rose-950/60 border border-amber-500/40 text-right shadow-lg"
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
                <div className="my-3 bg-gradient-to-b from-purple-950/20 via-black/40 to-black/60 rounded-2xl p-3 sm:p-4 border border-purple-500/20 text-right relative overflow-hidden shadow-inner">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-white/5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/40">
                        <Sparkles className="w-3 h-3 text-purple-300" />
                      </div>
                      <span className="text-xs text-purple-200 font-black">گپ و تفاهم با جمینای ✨</span>
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
                      className="mb-2.5 p-2 rounded-xl bg-gradient-to-r from-emerald-950/60 to-rose-950/60 border border-emerald-500/40 flex items-center justify-between shadow-md"
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
                        <div className="w-9 h-9 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto text-purple-300">
                          <Bot className="w-5 h-5" />
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
                            className={`max-w-[88%] p-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                              msg.sender === 'جمینای'
                                ? 'bg-gradient-to-br from-purple-900/40 to-neutral-900/90 border border-purple-500/30 text-neutral-100 rounded-tl-none text-right'
                                : msg.sender === 'حسن'
                                ? 'bg-rose-600/20 border border-rose-500/30 text-rose-100 rounded-tr-none text-right'
                                : 'bg-pink-600/20 border border-pink-500/30 text-pink-100 rounded-tr-none text-right'
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                            
                            {msg.confirmedTopic && (
                              <div className="mt-1.5 pt-1.5 border-t border-purple-500/30 flex items-center gap-1 text-[10px] text-emerald-300 font-bold">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                <span>موضوع تایید شد: «{msg.confirmedTopic}»</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}

                    {chatLoading && (
                      <div className="flex items-center gap-2 p-2 text-[10px] text-purple-300 bg-purple-950/30 rounded-xl w-fit border border-purple-500/20 animate-pulse">
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
                      className="flex-1 bg-black/50 border border-white/10 rounded-xl py-2 px-3 text-xs text-white placeholder:text-neutral-500 focus:border-purple-500/50 transition-all outline-none"
                    />
                    <button 
                      onClick={() => handleSendChatMessage()}
                      disabled={chatLoading || !chatInput.trim()}
                      className="bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 disabled:from-neutral-800 disabled:to-neutral-800 text-white p-2.5 rounded-xl transition-all shadow-md flex items-center justify-center min-w-[42px] cursor-pointer active:scale-95"
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
              <div className="p-2.5 rounded-xl bg-rose-500/5 border border-rose-500/10 mb-3">
                <div className="flex justify-between items-center px-2">
                  <div className="text-center">
                    <p className="text-[9px] text-neutral-400">ست‌های حسن</p>
                    <p className="text-base font-black text-white">{room.setWins?.['حسن'] || 0}</p>
                  </div>
                  <div className="text-rose-500/40 font-black text-xs">
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
                    <div className="w-full py-3.5 rounded-xl bg-purple-950/60 border border-purple-500/40 text-purple-200 text-xs font-bold flex items-center justify-center gap-2 shadow-lg animate-pulse">
                      <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                      <span>جمینای در حال طراحی ۱۰ سوال اختصاصی... ✨</span>
                    </div>
                  );
                }

                if (isBreakRoom && !hasTopic) {
                  return (
                    <div className="space-y-1.5">
                      <button
                        disabled
                        className="w-full py-3.5 rounded-xl bg-white/5 border border-purple-500/20 text-neutral-400 font-bold flex items-center justify-center gap-2 text-xs cursor-not-allowed opacity-80"
                      >
                        <Lock className="w-3.5 h-3.5 text-purple-400" />
                        <span>ابتدا در چت بالا با جمینای سر موضوع به تفاهم برسید</span>
                      </button>
                      <p className="text-[10px] text-purple-300/80 text-center font-medium">
                        💡 یک پیام در چت بنویسید یا دکمه‌های پیشنهادی بالا را بزنید تا موضوع تایید شود.
                      </p>
                    </div>
                  );
                }

                return (
                  <button
                    onClick={toggleReady}
                    className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer text-xs sm:text-sm active:scale-95 shadow-md ${
                      isUserReady
                        ? 'bg-green-600/20 border border-green-500/40 text-green-400'
                        : 'bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 hover:from-rose-500 hover:to-purple-500 text-white shadow-rose-500/20 hover:scale-[1.01]'
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
              className="w-full bg-[#1a0b18] border border-rose-900/40 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-2xl"
            >
              {/* Top Scorebar inside card */}
              <div className="flex justify-between items-center mb-3 pb-2.5 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-rose-500/10 rounded-full flex items-center justify-center text-base">🕺</div>
                  <div className="text-right">
                    <p className="text-[9px] text-neutral-400">امتیاز حسن</p>
                    <p className="text-sm font-bold text-rose-500">{(room.scores || {})['حسن'] || 0}</p>
                  </div>
                </div>

                <div className="text-center">
                  <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10 mx-auto mb-1">
                    <span className="text-[10px] font-bold text-rose-300">{room.setWins?.['حسن'] || 0}</span>
                    <span className="text-[9px] text-neutral-500">ست‌ها</span>
                    <span className="text-[10px] font-bold text-pink-300">{room.setWins?.['نیوشا'] || 0}</span>
                  </div>
                  <p className="text-[10px] text-rose-300 font-medium">
                    {room.status === 'playing' ? 'بخش ۱: درباره خودت' : 'بخش ۲: حدس بزن طرفت چی گفته'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-left">
                    <p className="text-[9px] text-neutral-400">امتیاز نیوشا</p>
                    <p className="text-sm font-bold text-pink-500">{(room.scores || {})['نیوشا'] || 0}</p>
                  </div>
                  <div className="w-8 h-8 bg-pink-500/10 rounded-full flex items-center justify-center text-base">💃</div>
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
                        <div className="absolute inset-0 bg-rose-500/20 rounded-full animate-ping"></div>
                        <div className="relative bg-black border border-rose-500/30 rounded-full w-full h-full flex items-center justify-center">
                          <Sparkles className="w-7 h-7 text-rose-500 animate-pulse" />
                        </div>
                      </div>
                      <h4 className="text-base font-bold text-white mb-1">جمینای در حال طراحی سوالات اختصاصی...</h4>
                      <p className="text-rose-300/60 text-xs px-4">
                        صبر کنید تا سوالات ست جدید آماده بشن ✨
                      </p>
                    </div>
                  );
                }

                if (currentIdx >= 5 || currentIdx >= currentPhaseQuestions.length) {
                  return (
                    <div className="text-center py-8">
                      <div className="relative w-14 h-14 mx-auto mb-3">
                        <div className="absolute inset-0 bg-rose-500/20 rounded-full animate-ping"></div>
                        <div className="relative bg-rose-500/10 rounded-full w-full h-full flex items-center justify-center">
                          <Users className="w-7 h-7 text-rose-500" />
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
                    <div className="bg-rose-500/5 p-3.5 rounded-xl border border-rose-500/10 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-[10px] text-rose-400 mb-1 font-bold">
                        <span>سوال {Math.min(5, currentIdx + 1)} از ۵</span>
                      </div>
                      <h3 className="text-xs sm:text-sm font-bold text-white leading-relaxed">{question.text}</h3>
                      {room.status === 'guessing' && (
                        <p className="mt-1 text-[10px] text-rose-300">حدس بزن {user === 'حسن' ? 'نیوشا' : 'حسن'} کدام گزینه را انتخاب کرده؟</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {(question.options || []).map((option, idx) => {
                        const isCorrect = feedback?.correctIdx === idx;
                        const isSelected = selectedOption === idx;
                        
                        return (
                          <button
                            key={idx}
                            disabled={!!feedback}
                            onClick={() => { sound.playClick(); setSelectedOption(idx); }}
                            className={`w-full p-3 rounded-xl text-right transition-all border relative overflow-hidden ${
                              isSelected 
                                ? (feedback ? (feedback.isCorrect ? 'bg-green-500 border-green-400 text-white' : 'bg-red-500 border-red-400 text-white') : 'bg-rose-600 border-rose-500 text-white shadow-md') 
                                : (feedback && isCorrect ? 'bg-green-500/20 border-green-500/50 text-green-300' : 'bg-white/5 border-white/10 text-neutral-300')
                            } ${feedback ? 'cursor-default' : 'hover:bg-white/10 cursor-pointer active:scale-[0.99]'}`}
                          >
                            <div className="flex items-center gap-2.5 relative z-10">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                isSelected ? 'bg-white text-rose-600' : 'bg-white/10 text-neutral-400'
                              }`}>
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
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 text-white font-bold flex items-center justify-center gap-1.5 disabled:opacity-30 transition-all cursor-pointer shadow-md text-xs sm:text-sm active:scale-95"
                      >
                        <span>ثبت پاسخ</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                    
                    {feedback && (
                      <div className="text-center py-1 animate-pulse text-rose-300 text-[10px]">
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
              className="w-full bg-[#1a0b18] border border-rose-900/40 rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-center shadow-2xl"
            >
              <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-3 border border-yellow-500/20">
                <Trophy className="w-8 h-8 text-yellow-500" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mb-1">پایان مسابقه! 🎉</h2>
              
              <div className="my-4 space-y-3">
                <div className="p-4 rounded-xl bg-gradient-to-br from-rose-950/40 to-pink-950/40 border border-rose-500/30">
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
                    <div className="text-neutral-600 font-bold text-xs">VS</div>
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

