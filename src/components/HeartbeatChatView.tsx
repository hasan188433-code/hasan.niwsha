import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send,
  Mic,
  Smile,
  Paperclip,
  Image as ImageIcon,
  Music,
  Film,
  FileText,
  Heart,
  Reply,
  Trash2,
  Download,
  Play,
  Pause,
  X,
  Sparkles,
  CheckCheck,
  Wifi,
  WifiOff,
  HelpCircle,
  Vibrate,
  Radio,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { CoupleUser, CoupleChatMessage, HeartbeatMediaAttachment, HeartbeatSyncData } from '../types';
import { toPersianDigits } from '../utils/dateCalculations';
import { getPartnerPresenceInfo } from '../utils/presenceHelper';
import {
  sendCoupleChatMessage,
  toggleMessageReaction,
  deleteCoupleMessage,
  sendLiveHeartbeatPulse,
} from '../services/heartbeatMessengerService';
import {
  playMessageChime,
  playFullHeartbeatCycle,
  triggerHaptic,
  unlockAudioAndHaptics,
} from '../utils/hapticsAndAudio';

interface HeartbeatChatViewProps {
  currentUser: CoupleUser;
  onSwitchUser: (user: CoupleUser) => void;
  messages: CoupleChatMessage[];
  syncData?: HeartbeatSyncData;
  isPartnerOnline: boolean;
  soundEnabled: boolean;
}

const EMOJI_REACTIONS = ['❤️', '😘', '🔥', '🥰', '🥺', '🌹', '✨', '💍'];
const QUICK_ROMANTIC_STICKERS = [
  'دلم برات تنگ شده نفسم ❤️',
  'خیلی دوستت دارم تا همیشه ♾️',
  'قربونت برم خوشگلم 🌸',
  'همین الان بیا بغلم 🤗',
  'تو تمام دنیای منی عشقم ✨',
  'قلبم فقط برای تو می‌تپه 💓',
];

export const HeartbeatChatView: React.FC<HeartbeatChatViewProps> = ({
  currentUser,
  onSwitchUser,
  messages,
  syncData,
  isPartnerOnline,
  soundEnabled,
}) => {
  const { theme } = useTheme();
  const partnerName: CoupleUser = currentUser === 'حسن' ? 'نیوشا' : 'حسن';

  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<CoupleChatMessage | null>(null);
  const [showStickers, setShowStickers] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showHeartbeatInfo, setShowHeartbeatInfo] = useState(false);
  const [activeLightboxImg, setActiveLightboxImg] = useState<string | null>(null);

  // Instant Pulse Sender feedback & incoming pulse state
  const [pulseSentFeedback, setPulseSentFeedback] = useState(false);
  const [incomingPulseFromPartner, setIncomingPulseFromPartner] = useState<{
    sender: string;
    timestamp: number;
  } | null>(null);
  const lastProcessedPulseIdRef = useRef<string | null>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);

  // Audio playback state
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaTypeRef = useRef<'image' | 'audio' | 'video' | 'file'>('image');

  // Listen to live incoming pulses from partner while inside chat
  useEffect(() => {
    if (!syncData?.lastBeatPulse) return;
    const pulse = syncData.lastBeatPulse;

    if (
      pulse.sender !== currentUser &&
      pulse.pulseId &&
      pulse.pulseId !== lastProcessedPulseIdRef.current
    ) {
      lastProcessedPulseIdRef.current = pulse.pulseId;

      // Trigger hardware feedback (sound and haptics)
      unlockAudioAndHaptics();
      playFullHeartbeatCycle(soundEnabled);
      triggerHaptic([85, 65, 110]);

      // Trigger UI reaction banner
      setIncomingPulseFromPartner({
        sender: pulse.sender,
        timestamp: pulse.timestamp,
      });

      const timer = setTimeout(() => {
        setIncomingPulseFromPartner(null);
      }, 3500);

      return () => clearTimeout(timer);
    }
  }, [syncData?.lastBeatPulse, currentUser, soundEnabled]);

  // Auto scroll to bottom on new message
  const prevMessagesCountRef = useRef(messages.length);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

    if (messages.length > prevMessagesCountRef.current) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.sender !== currentUser) {
        playMessageChime('receive', soundEnabled);
      }
    }
    prevMessagesCountRef.current = messages.length;
  }, [messages, currentUser, soundEnabled]);

  // Quick Mini Heartbeat Sender while chatting
  const handleSendMiniHeartbeat = async () => {
    unlockAudioAndHaptics();
    playFullHeartbeatCycle(soundEnabled);
    triggerHaptic([85, 65, 110]);

    setPulseSentFeedback(true);
    await sendLiveHeartbeatPulse(currentUser, 'single');

    setTimeout(() => {
      setPulseSentFeedback(false);
    }, 2800);
  };

  // Send Text Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isSending) return;

    unlockAudioAndHaptics();
    const text = inputText.trim();
    setInputText('');
    setIsSending(true);

    const replyData = replyingTo
      ? {
          id: replyingTo.id,
          sender: replyingTo.sender,
          text: replyingTo.text,
          attachmentType: replyingTo.attachment?.type,
        }
      : undefined;

    setReplyingTo(null);

    const success = await sendCoupleChatMessage({
      sender: currentUser,
      text,
      replyTo: replyData,
    });

    if (success) {
      playMessageChime('send', soundEnabled);
    }
    setIsSending(false);
  };

  // Voice Note Recording
  const startVoiceRecording = async () => {
    try {
      unlockAudioAndHaptics();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64data = reader.result as string;
          if (base64data) {
            await sendCoupleChatMessage({
              sender: currentUser,
              attachment: {
                type: 'voice',
                url: base64data,
                duration: recordDuration,
              },
            });
            playMessageChime('send', soundEnabled);
          }
        };
        reader.readAsDataURL(audioBlob);

        // Stop media tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordDuration(0);

      recordTimerRef.current = window.setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch {
      alert('دسترسی به میکروفون داده نشد یا در دسترس نیست.');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }
    }
  };

  const cancelVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      audioChunksRef.current = [];
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }
    }
  };

  // Attachments Handling
  const handleOpenMediaPicker = (type: 'image' | 'audio' | 'video' | 'file') => {
    mediaTypeRef.current = type;
    setShowAttachmentMenu(false);
    if (fileInputRef.current) {
      if (type === 'image') fileInputRef.current.accept = 'image/*';
      else if (type === 'audio') fileInputRef.current.accept = 'audio/*';
      else if (type === 'video') fileInputRef.current.accept = 'video/*';
      else fileInputRef.current.accept = '*/*';
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    unlockAudioAndHaptics();
    // Maximum 8MB limit for inline storage
    if (file.size > 8 * 1024 * 1024) {
      alert('حداکثر حجم فایل برای ارسال سریع ۸ مگابایت است.');
      return;
    }

    setIsSending(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        const attachment: HeartbeatMediaAttachment = {
          type: mediaTypeRef.current,
          url: base64Data,
          name: file.name,
          size: file.size,
          mimeType: file.type,
        };

        await sendCoupleChatMessage({
          sender: currentUser,
          attachment,
        });

        playMessageChime('send', soundEnabled);
      };
      reader.readAsDataURL(file);
    } catch {
      alert('خطا در ارسال فایل. لطفا دوباره تلاش کنید.');
    } finally {
      setIsSending(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Audio Playback
  const toggleAudioPlay = (msgId: string, url: string) => {
    unlockAudioAndHaptics();
    if (playingAudioId === msgId) {
      currentAudioRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
      }
      const audio = new Audio(url);
      currentAudioRef.current = audio;
      audio.onended = () => setPlayingAudioId(null);
      audio.play().catch(console.warn);
      setPlayingAudioId(msgId);
    }
  };

  const formatPersianTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const hours = toPersianDigits(date.getHours().toString().padStart(2, '0'));
    const minutes = toPersianDigits(date.getMinutes().toString().padStart(2, '0'));
    return `${hours}:${minutes}`;
  };

  return (
    <div
      onClick={() => unlockAudioAndHaptics()}
      className="flex flex-col h-[530px] max-h-[72vh] w-full text-right select-none font-vazir"
    >
      {/* Hidden File Picker */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        className="hidden"
      />

      {/* Lightbox Modal for Full Image View */}
      <AnimatePresence>
        {activeLightboxImg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveLightboxImg(null)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          >
            <button
              onClick={() => setActiveLightboxImg(null)}
              className="absolute top-4 left-4 p-2 rounded-full bg-white/20 text-white hover:bg-white/30"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={activeLightboxImg}
              alt="عکس بزرگنمایی شده"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl border border-white/20"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Messenger Bar */}
      <div className="bg-black/40 border-b border-white/10 p-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 rounded-t-2xl">
        {/* User Identity Switcher */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                onSwitchUser('حسن');
                unlockAudioAndHaptics();
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                currentUser === 'حسن'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-neutral-300 hover:text-white'
              }`}
            >
              من حسنم 👨🏻
            </button>
            <button
              type="button"
              onClick={() => {
                onSwitchUser('نیوشا');
                unlockAudioAndHaptics();
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                currentUser === 'نیوشا'
                  ? 'bg-pink-600 text-white shadow-md'
                  : 'text-neutral-300 hover:text-white'
              }`}
            >
              من نیوشام 👧🏻
            </button>
          </div>

          {/* Quick info button explaining instant pulse */}
          <button
            type="button"
            onClick={() => setShowHeartbeatInfo(!showHeartbeatInfo)}
            className="p-1.5 text-neutral-400 hover:text-pink-300 transition-colors rounded-lg bg-white/5 hover:bg-white/10"
            title="راهنمای تپش آنی و قابلیت‌های چت"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Partner Presence Status & Instant Heartbeat Button */}
        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
          {/* Precise Live Presence Status */}
          {(() => {
            const presence = getPartnerPresenceInfo(partnerName, syncData?.lastPing?.[partnerName]);
            return (
              <div
                className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border bg-black/30 truncate"
                style={{
                  borderColor: presence.isOnline ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.1)',
                  color: presence.isOnline ? '#34d399' : '#a3a3a3',
                }}
                title={presence.detailedText}
              >
                {presence.isOnline ? (
                  <Wifi className="w-3 h-3 text-emerald-400 animate-pulse flex-shrink-0" />
                ) : (
                  <WifiOff className="w-3 h-3 text-neutral-500 flex-shrink-0" />
                )}
                <span className="truncate">{presence.statusText}</span>
              </div>
            );
          })()}

          {/* Instant Heartbeat Send Button with Real-time Feedback */}
          <button
            type="button"
            onClick={handleSendMiniHeartbeat}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm ${
              pulseSentFeedback
                ? 'bg-rose-500 text-white border-rose-300 ring-2 ring-rose-400/50 scale-105'
                : 'bg-rose-500/20 hover:bg-rose-500/30 border-rose-500/40 text-rose-300 hover:text-white'
            }`}
            title={`ارسال آنی لرزش و تپش به گوشی ${partnerName}`}
          >
            <Heart
              className={`w-3.5 h-3.5 ${
                pulseSentFeedback
                  ? 'fill-white text-white animate-ping'
                  : 'fill-rose-400 text-rose-400 animate-pulse'
              }`}
            />
            <span>{pulseSentFeedback ? 'تپش ارسال شد! 💓' : 'ارسال تپش آنی'}</span>
          </button>
        </div>
      </div>

      {/* Instant Heartbeat Feature Explanation Modal / Popover */}
      <AnimatePresence>
        {showHeartbeatInfo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-rose-950/90 border-b border-rose-500/30 p-3 text-xs text-rose-100 relative overflow-hidden"
          >
            <button
              onClick={() => setShowHeartbeatInfo(false)}
              className="absolute top-2 left-2 p-1 text-rose-300 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <div className="space-y-1.5 pl-5">
              <p className="font-bold text-white flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 fill-rose-400 text-rose-400" />
                <span>دکمهٔ «ارسال تپش آنی» چیست و چه کاری انجام می‌دهد؟</span>
              </p>
              <p className="leading-relaxed text-[11px] text-rose-200">
                این دکمه یک <strong>تلنگر عاشقانه و سریع</strong> است. بدون نیاز به خروج از بخش گفتگو، با فشردن آن:
              </p>
              <ul className="list-disc list-inside text-[11px] text-rose-200/90 space-y-0.5">
                <li>یک ضربان قلب زنده با صدای طبیعی «تپ‌تاپ» برای {partnerName} پخش می‌شود.</li>
                <li>موتور ویبره گوشی {partnerName} همزمان شروع به لرزش هماهنگ با ضربان شما می‌کند.</li>
                <li>انیمیشن قلب درخشان در صفحهٔ چت ظاهر می‌شود تا بداند در همین لحظه به یاد او هستید.</li>
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Incoming Live Heartbeat from Partner Flash Banner */}
      <AnimatePresence>
        {incomingPulseFromPartner && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-gradient-to-r from-pink-600 to-rose-600 text-white px-3 py-1.5 text-xs font-bold flex items-center justify-between shadow-lg border-b border-white/20 animate-pulse"
          >
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 fill-white animate-bounce" />
              <span>
                💓 {partnerName === 'نیوشا' ? 'نیوشا جونت' : 'حسن جانت'} همین الان یک تپش قلب زنده برات فرستاد! (ویبره + صدا)
              </span>
            </div>
            <Sparkles className="w-3.5 h-3.5 text-amber-200 animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-black/20">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-neutral-400 p-6 space-y-2">
            <Sparkles className="w-8 h-8 text-rose-400 animate-bounce" />
            <p className="text-sm font-bold text-white">پیام‌رسان اختصاصی و دونفرهٔ حسن و نیوشا ❤️</p>
            <p className="text-xs text-neutral-400 max-w-xs">
              اولین پیام، وویس، موزیک یا عکس عاشقانه‌تان را برای {partnerName} بفرستید!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender === currentUser;
            const isNewsha = msg.sender === 'نیوشا';

            // Bubble Styling clearly distinct for Newsha (Pink/Rose) and Hasan (Deep Rose/Crimson)
            let bubbleStyle = '';
            let senderBadge = '';

            if (isNewsha) {
              senderBadge = '👧🏻 نیوشا جونم';
              if (isMe) {
                // Newsha viewing her own sent message
                bubbleStyle =
                  'bg-gradient-to-r from-pink-600 to-rose-500 text-white rounded-br-none shadow-pink-900/40 border border-pink-400/40';
              } else {
                // Hasan viewing Newsha's message
                bubbleStyle =
                  'bg-gradient-to-r from-pink-950/90 to-rose-950/90 text-pink-50 rounded-bl-none shadow-pink-950/50 border border-pink-500/50';
              }
            } else {
              senderBadge = '👨🏻 حسن جانم';
              if (isMe) {
                // Hasan viewing his own sent message
                bubbleStyle =
                  'bg-gradient-to-r from-rose-700 to-red-600 text-white rounded-br-none shadow-rose-900/40 border border-rose-400/40';
              } else {
                // Newsha viewing Hasan's message
                bubbleStyle =
                  'bg-gradient-to-r from-rose-950/90 to-red-950/90 text-rose-50 rounded-bl-none shadow-rose-950/50 border border-rose-500/50';
              }
            }

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
              >
                {/* Clear Distinct Sender Badge */}
                <div
                  className={`flex items-center gap-1 text-[10px] px-1.5 mb-1 font-bold ${
                    isNewsha ? 'text-pink-300' : 'text-rose-300'
                  }`}
                >
                  <span>{senderBadge}</span>
                </div>

                {/* Quoted Reply Preview */}
                {msg.replyTo && (
                  <div
                    className={`text-[10px] p-1.5 mb-1 rounded-lg border-r-2 max-w-[85%] truncate opacity-85 ${
                      isMe
                        ? isNewsha
                          ? 'bg-pink-800/70 border-white text-white'
                          : 'bg-rose-800/70 border-white text-white'
                        : 'bg-neutral-800 border-pink-400 text-neutral-200'
                    }`}
                  >
                    <span className="font-bold">{msg.replyTo.sender}: </span>
                    <span>{msg.replyTo.text || `[فایل ${msg.replyTo.attachmentType}]`}</span>
                  </div>
                )}

                {/* Message Bubble Container */}
                <div
                  className={`relative max-w-[88%] sm:max-w-[78%] rounded-2xl p-2.5 shadow-lg ${bubbleStyle}`}
                >
                  {/* Photo Attachment */}
                  {msg.attachment?.type === 'image' && (
                    <div className="mb-1.5 rounded-xl overflow-hidden cursor-pointer">
                      <img
                        src={msg.attachment.url}
                        alt="عکس ارسال شده"
                        onClick={() => setActiveLightboxImg(msg.attachment?.url || null)}
                        className="w-full max-h-64 object-cover rounded-xl hover:opacity-95 transition-opacity"
                      />
                    </div>
                  )}

                  {/* Voice Note Attachment */}
                  {msg.attachment?.type === 'voice' && (
                    <div className="flex items-center gap-2 p-1.5 bg-black/30 rounded-xl mb-1 min-w-[210px] border border-white/10">
                      <button
                        type="button"
                        onClick={() => toggleAudioPlay(msg.id, msg.attachment!.url)}
                        className="p-2.5 rounded-full bg-white text-black hover:bg-neutral-200 transition-all cursor-pointer flex-shrink-0 shadow"
                      >
                        {playingAudioId === msg.id ? (
                          <Pause className="w-4 h-4 fill-black" />
                        ) : (
                          <Play className="w-4 h-4 fill-black translate-x-0.5" />
                        )}
                      </button>

                      <div className="flex-1 flex flex-col justify-center">
                        <div className="flex items-center gap-1">
                          <div className="h-1.5 flex-1 bg-white/30 rounded-full overflow-hidden">
                            <div
                              className={`h-full bg-white transition-all ${
                                playingAudioId === msg.id ? 'w-full animate-pulse' : 'w-0'
                              }`}
                            />
                          </div>
                        </div>
                        <span className="text-[10px] text-white/90 mt-1 font-mono">
                          {msg.attachment.duration
                            ? `${toPersianDigits(msg.attachment.duration)} ثانیه وویس`
                            : 'پیام صوتی'}
                        </span>
                      </div>
                      <Mic className="w-4 h-4 text-pink-300" />
                    </div>
                  )}

                  {/* Music / Audio Track */}
                  {msg.attachment?.type === 'audio' && (
                    <div className="flex items-center gap-2 p-2 bg-black/30 rounded-xl mb-1.5 border border-white/10">
                      <button
                        type="button"
                        onClick={() => toggleAudioPlay(msg.id, msg.attachment!.url)}
                        className="p-2 rounded-full bg-rose-500 text-white hover:bg-rose-400 transition-all cursor-pointer"
                      >
                        {playingAudioId === msg.id ? (
                          <Pause className="w-4 h-4 fill-white" />
                        ) : (
                          <Play className="w-4 h-4 fill-white translate-x-0.5" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate text-white">
                          {msg.attachment.name || 'آهنگ عاشقانه'}
                        </p>
                        <span className="text-[10px] text-neutral-300 flex items-center gap-1">
                          <Music className="w-3 h-3 text-pink-300" />
                          <span>فایل صوتی</span>
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Video Attachment */}
                  {msg.attachment?.type === 'video' && (
                    <div className="mb-1.5 rounded-xl overflow-hidden bg-black">
                      <video
                        src={msg.attachment.url}
                        controls
                        className="w-full max-h-60 rounded-xl"
                      />
                    </div>
                  )}

                  {/* File Attachment */}
                  {msg.attachment?.type === 'file' && (
                    <div className="flex items-center justify-between gap-2 p-2 bg-black/30 rounded-xl mb-1 border border-white/10 text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-4 h-4 text-rose-400 flex-shrink-0" />
                        <span className="truncate font-medium">{msg.attachment.name || 'فایل ضمیمه'}</span>
                      </div>
                      <a
                        href={msg.attachment.url}
                        download={msg.attachment.name || 'download'}
                        className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white flex-shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}

                  {/* Text Message Content */}
                  {msg.text && (
                    <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words px-0.5">
                      {msg.text}
                    </p>
                  )}

                  {/* Footer: Time & Double Checks & Actions */}
                  <div className="flex items-center justify-end gap-1.5 mt-1 text-[9px] text-white/80">
                    <span>{formatPersianTime(msg.createdAt)}</span>
                    <CheckCheck className="w-3 h-3 text-white/90" />

                    {/* Action buttons (Reply / Delete / React) */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mr-1">
                      <button
                        type="button"
                        onClick={() => setReplyingTo(msg)}
                        className="hover:text-white p-0.5 cursor-pointer"
                        title="پاسخ"
                      >
                        <Reply className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCoupleMessage(msg.id)}
                        className="hover:text-rose-300 p-0.5 cursor-pointer"
                        title="حذف پیام"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Reactions Badge */}
                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div className="absolute -bottom-2.5 left-2 flex items-center gap-0.5 bg-black/80 border border-white/25 px-2 py-0.5 rounded-full text-xs shadow-lg">
                      {Object.entries(msg.reactions).map(([user, emoji]) => (
                        <span key={user} title={`${user}: ${emoji}`}>
                          {emoji}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Emoji Reaction Hover Selector */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mt-0.5 px-2">
                  {EMOJI_REACTIONS.slice(0, 4).map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => toggleMessageReaction(msg.id, currentUser, emoji)}
                      className="text-xs hover:scale-125 transition-transform cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quoted Message Preview Bar */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-black/60 border-t border-white/10 px-3 py-1.5 flex items-center justify-between text-xs text-neutral-300"
          >
            <div className="truncate flex items-center gap-1.5">
              <Reply className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
              <span className="font-bold text-white">پاسخ به {replyingTo.sender}:</span>
              <span className="truncate">{replyingTo.text || '[فایل]'}</span>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="p-1 text-neutral-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Romantic Stickers Drawer */}
      <AnimatePresence>
        {showStickers && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-black/80 border-t border-white/10 p-2 grid grid-cols-2 gap-1.5 text-xs overflow-hidden"
          >
            {QUICK_ROMANTIC_STICKERS.map((sticker, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  sendCoupleChatMessage({ sender: currentUser, text: sticker });
                  setShowStickers(false);
                }}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-right text-rose-200 hover:text-white transition-all text-[11px] truncate cursor-pointer font-medium"
              >
                {sticker}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Media Attachment Popover */}
      <AnimatePresence>
        {showAttachmentMenu && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 10 }}
            className="bg-neutral-900 border border-white/20 rounded-2xl p-2 mx-3 mb-1 grid grid-cols-4 gap-2 text-center text-xs shadow-2xl z-20"
          >
            <button
              type="button"
              onClick={() => handleOpenMediaPicker('image')}
              className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/5 hover:bg-white/15 text-rose-300 hover:text-white cursor-pointer"
            >
              <ImageIcon className="w-5 h-5 text-rose-400" />
              <span className="text-[10px]">عکس 📸</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenMediaPicker('audio')}
              className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/5 hover:bg-white/15 text-pink-300 hover:text-white cursor-pointer"
            >
              <Music className="w-5 h-5 text-pink-400" />
              <span className="text-[10px]">موزیک 🎵</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenMediaPicker('video')}
              className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/5 hover:bg-white/15 text-purple-300 hover:text-white cursor-pointer"
            >
              <Film className="w-5 h-5 text-purple-400" />
              <span className="text-[10px]">ویدیو 🎬</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenMediaPicker('file')}
              className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/5 hover:bg-white/15 text-amber-300 hover:text-white cursor-pointer"
            >
              <FileText className="w-5 h-5 text-amber-400" />
              <span className="text-[10px]">فایل 📁</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Voice Recording Bar */}
      {isRecording ? (
        <div className="bg-rose-950/80 border-t border-rose-500/30 p-3 flex items-center justify-between rounded-b-2xl animate-pulse">
          <div className="flex items-center gap-2 text-rose-300 text-xs font-bold">
            <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
            <span>در حال ضبط صدای شما: {toPersianDigits(recordDuration)} ثانیه</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cancelVoiceRecording}
              className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs cursor-pointer"
            >
              لغو
            </button>
            <button
              type="button"
              onClick={stopVoiceRecording}
              className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>ارسال وویس</span>
            </button>
          </div>
        </div>
      ) : (
        /* Message Input Form */
        <form
          onSubmit={handleSendMessage}
          className="bg-black/50 border-t border-white/10 p-2.5 flex items-center gap-1.5 rounded-b-2xl"
        >
          {/* Media Attach Button */}
          <button
            type="button"
            onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white transition-colors cursor-pointer flex-shrink-0"
            title="ارسال عکس، موزیک، ویدیو یا فایل"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Quick Romantic Stickers Button */}
          <button
            type="button"
            onClick={() => setShowStickers(!showStickers)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-rose-300 hover:text-rose-200 transition-colors cursor-pointer flex-shrink-0"
            title="جملات عاشقانه سریع"
          >
            <Smile className="w-4 h-4" />
          </button>

          {/* Input Text Box */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`پیام عاشقانه به ${partnerName}...`}
            className="flex-1 bg-white/10 border border-white/15 focus:border-rose-400 rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder-neutral-400 outline-none transition-colors"
          />

          {/* Voice Record or Send Button */}
          {inputText.trim() ? (
            <button
              type="submit"
              disabled={isSending}
              style={{ backgroundColor: theme.primaryColor }}
              className="p-2 sm:px-4 sm:py-2 rounded-xl text-white font-bold text-xs flex items-center gap-1 hover:brightness-110 active:scale-95 transition-all cursor-pointer flex-shrink-0"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">ارسال</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={startVoiceRecording}
              className="p-2 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white transition-all active:scale-95 cursor-pointer flex-shrink-0"
              title="ضبط وویس (پیام صوتی)"
            >
              <Mic className="w-4 h-4" />
            </button>
          )}
        </form>
      )}
    </div>
  );
};
