import React, { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";

const API_URL =
  process.env.REACT_APP_API_URL || "http://localhost:8000/api/evaluate-audio";

const STATUS = {
  IDLE: "idle",
  RECORDING: "recording",
  UPLOADING: "uploading",
  SUCCESS: "success",
  RETRY: "retry",
  ERROR: "error",
};

const I18N = {
  en: {
    title: "Say the Word!",
    hint: "Hold the microphone and say it",
    listening: "Listening…",
    thinking: "Thinking…",
    success: "Great Job!",
    retry: "Close! Let's try again",
    silence: "I didn't hear that — try again!",
    micPerm: "Please allow the microphone to play",
    serverErr: "Hmm — something hiccuped",
    next: "Next →",
    again: "Try Again",
    skip: "Skip",
    micLabel: "Hold to speak",
    swap: "עברית",
  },
  he: {
    title: "אומרים את המילה!",
    hint: "החזיקו את המיקרופון ואמרו",
    listening: "מקשיב…",
    thinking: "חושב…",
    success: "כל הכבוד!",
    retry: "כמעט! בואו ננסה שוב",
    silence: "לא שמעתי — נסו שוב",
    micPerm: "צריך הרשאה למיקרופון",
    serverErr: "אופס — קרתה תקלה",
    next: "→ הבא",
    again: "ננסה שוב",
    skip: "דלג",
    micLabel: "לחצו והחזיקו כדי לדבר",
    swap: "EN",
  },
};

const DECK = {
  en: [
    { word: "apple", emoji: "🍎" },
    { word: "banana", emoji: "🍌" },
    { word: "dog", emoji: "🐶" },
    { word: "cat", emoji: "🐱" },
    { word: "star", emoji: "⭐" },
    { word: "sun", emoji: "☀️" },
    { word: "moon", emoji: "🌙" },
    { word: "fish", emoji: "🐟" },
  ],
  he: [
    { word: "תפוח", emoji: "🍎" },
    { word: "בננה", emoji: "🍌" },
    { word: "כלב", emoji: "🐶" },
    { word: "חתול", emoji: "🐱" },
    { word: "כוכב", emoji: "⭐" },
    { word: "שמש", emoji: "☀️" },
    { word: "ירח", emoji: "🌙" },
    { word: "דג", emoji: "🐟" },
  ],
};

export default function AudioRecorder() {
  const [lang, setLang] = useState("en");
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState(STATUS.IDLE);
  const [feedback, setFeedback] = useState("");

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  const t = I18N[lang];
  const deck = DECK[lang];
  const current = deck[index % deck.length];
  const dir = lang === "he" ? "rtl" : "ltr";

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const reset = useCallback(() => {
    setStatus(STATUS.IDLE);
    setFeedback("");
  }, []);

  const nextWord = useCallback(() => {
    setIndex((i) => (i + 1) % deck.length);
    reset();
  }, [deck.length, reset]);

  const swapLang = () => {
    setLang((l) => (l === "en" ? "he" : "en"));
    setIndex(0);
    reset();
  };

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const uploadBlob = useCallback(
    async (blob) => {
      setStatus(STATUS.UPLOADING);
      setFeedback(t.thinking);
      try {
        const form = new FormData();
        form.append("audio", blob, "recording.webm");
        form.append("target_word", current.word);
        form.append("target_language", lang);

        const { data } = await axios.post(API_URL, form, {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 30000,
        });

        if (data.is_correct) {
          setStatus(STATUS.SUCCESS);
          setFeedback(t.success);
        } else if (!data.transcript) {
          setStatus(STATUS.RETRY);
          setFeedback(t.silence);
        } else {
          setStatus(STATUS.RETRY);
          setFeedback(t.retry);
        }
      } catch (err) {
        console.error("evaluate-audio failed", err?.response?.data || err);
        setStatus(STATUS.ERROR);
        setFeedback(t.serverErr);
      }
    },
    [current.word, lang, t]
  );

  const startRecording = useCallback(async () => {
    if (status === STATUS.RECORDING || status === STATUS.UPLOADING) return;
    setFeedback(t.listening);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        stopStream();
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        if (blob.size === 0) {
          setStatus(STATUS.RETRY);
          setFeedback(t.silence);
          return;
        }
        await uploadBlob(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(100);
      setStatus(STATUS.RECORDING);
    } catch (err) {
      console.error("mic permission denied", err);
      setStatus(STATUS.ERROR);
      setFeedback(t.micPerm);
    }
  }, [status, stopStream, t, uploadBlob]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "recording") recorder.stop();
  }, []);

  const isBusy = status === STATUS.UPLOADING;
  const isRecording = status === STATUS.RECORDING;
  const isSuccess = status === STATUS.SUCCESS;
  const isRetry = status === STATUS.RETRY || status === STATUS.ERROR;
  const isHebrew = lang === "he";

  const wordPalette = isSuccess
    ? "text-emerald-600 bg-emerald-100 ring-4 ring-emerald-300 shadow-[0_0_45px_rgba(16,185,129,0.35)]"
    : isRetry
    ? "text-orange-500 bg-amber-50 ring-2 ring-amber-200"
    : "text-orange-500 bg-white/60";

  const micPalette = isBusy
    ? "bg-amber-200 text-amber-700 cursor-not-allowed"
    : isRecording
    ? "bg-gradient-to-br from-pink-300 to-rose-400 text-white"
    : isSuccess
    ? "bg-gradient-to-br from-emerald-300 to-emerald-500 text-white"
    : isRetry
    ? "bg-gradient-to-br from-amber-200 to-orange-300 text-orange-800"
    : "bg-gradient-to-br from-sky-300 to-indigo-400 text-white";

  const micMotion = isRecording
    ? { scale: [1, 1.07, 1] }
    : isBusy
    ? { scale: 1 }
    : isRetry
    ? { rotate: [0, -7, 7, -5, 5, 0] }
    : { scale: [1, 1.04, 1] };

  const micTransition = isRecording
    ? { duration: 0.9, repeat: Infinity, ease: "easeInOut" }
    : isBusy
    ? {}
    : isRetry
    ? { duration: 0.7 }
    : { duration: 2, repeat: Infinity, ease: "easeInOut" };

  return (
    <div
      dir={dir}
      className="min-h-screen w-full font-rounded bg-gradient-to-br from-sky-100 via-emerald-50 to-amber-100 flex items-center justify-center p-4"
    >
      <div className="relative w-full max-w-md bg-white/80 backdrop-blur-sm rounded-[2.5rem] shadow-2xl ring-1 ring-white/70 p-7 sm:p-10 overflow-hidden">
        <button
          type="button"
          onClick={swapLang}
          aria-label={`Switch language to ${t.swap}`}
          className="absolute top-4 end-4 px-4 py-2 rounded-full text-xs font-extrabold uppercase tracking-widest bg-sky-100 text-sky-700 hover:bg-sky-200 active:scale-95 transition shadow-sm"
        >
          {t.swap}
        </button>

        <div className="flex flex-col items-center gap-5 mt-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-sky-700">
            {t.title}
          </h1>

          <motion.div
            key={`emoji-${lang}-${current.word}`}
            initial={{ scale: 0.5, opacity: 0, rotate: -8 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 16 }}
            className="text-8xl sm:text-9xl select-none drop-shadow-md"
            aria-hidden
          >
            {current.emoji}
          </motion.div>

          <div className="relative">
            <motion.div
              key={`word-${lang}-${current.word}`}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.08 }}
              dir="auto"
              className={`text-5xl sm:text-6xl font-black tracking-wider px-6 py-2 rounded-2xl transition-colors ${wordPalette} ${
                isHebrew ? "" : "uppercase"
              }`}
            >
              {current.word}
            </motion.div>

            <AnimatePresence>
              {isSuccess &&
                ["✨", "🌟", "⭐", "✨", "🌟", "⭐"].map((s, i) => {
                  const angle = (i / 6) * Math.PI * 2;
                  const r = 90;
                  return (
                    <motion.span
                      key={`star-${i}`}
                      aria-hidden
                      className="absolute left-1/2 top-1/2 text-3xl pointer-events-none"
                      initial={{ x: 0, y: 0, opacity: 0, scale: 0.3 }}
                      animate={{
                        x: Math.cos(angle) * r,
                        y: Math.sin(angle) * r - 10,
                        opacity: 1,
                        scale: 1,
                        rotate: 360,
                      }}
                      exit={{ opacity: 0, scale: 0.3 }}
                      transition={{ duration: 0.8, delay: i * 0.04 }}
                    >
                      {s}
                    </motion.span>
                  );
                })}
            </AnimatePresence>
          </div>

          <div className="h-8 flex items-center">
            <motion.p
              key={`fb-${status}-${feedback}`}
              initial={{ y: 6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className={`text-base sm:text-lg font-bold text-center ${
                isSuccess
                  ? "text-emerald-600"
                  : isRetry
                  ? "text-orange-500"
                  : "text-sky-700"
              }`}
            >
              {feedback || t.hint}
            </motion.p>
          </div>

          <div className="relative w-44 h-44 flex items-center justify-center">
            <AnimatePresence>
              {isRecording &&
                [0, 0.35, 0.7].map((delay, i) => (
                  <motion.span
                    key={`ring-${i}`}
                    aria-hidden
                    className="absolute inset-0 rounded-full bg-pink-300/50"
                    initial={{ scale: 0.9, opacity: 0.55 }}
                    animate={{ scale: 1.7, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: 1.3,
                      repeat: Infinity,
                      delay,
                      ease: "easeOut",
                    }}
                  />
                ))}
            </AnimatePresence>

            <motion.button
              type="button"
              disabled={isBusy}
              aria-label={t.micLabel}
              aria-pressed={isRecording}
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onMouseLeave={isRecording ? stopRecording : undefined}
              onTouchStart={(event) => {
                event.preventDefault();
                startRecording();
              }}
              onTouchEnd={(event) => {
                event.preventDefault();
                stopRecording();
              }}
              animate={micMotion}
              transition={micTransition}
              className={`relative w-40 h-40 rounded-full shadow-xl flex items-center justify-center text-7xl select-none touch-none focus:outline-none focus-visible:ring-8 ring-white/70 transition-colors ${micPalette}`}
            >
              {isBusy ? (
                <BouncingDots />
              ) : isRecording ? (
                <span aria-hidden>🎙️</span>
              ) : isSuccess ? (
                <span aria-hidden>🎉</span>
              ) : (
                <span aria-hidden>🎤</span>
              )}
            </motion.button>
          </div>

          <div className="flex items-center gap-4 min-h-[3rem]">
            <AnimatePresence mode="wait">
              {isSuccess && (
                <motion.button
                  key="next"
                  type="button"
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.7, opacity: 0 }}
                  onClick={nextWord}
                  className="bg-emerald-500 text-white text-lg font-extrabold px-6 py-3 rounded-full shadow-lg hover:bg-emerald-600 active:scale-95"
                >
                  {t.next}
                </motion.button>
              )}
              {isRetry && (
                <motion.button
                  key="again"
                  type="button"
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.7, opacity: 0 }}
                  onClick={reset}
                  className="bg-amber-400 text-amber-900 text-lg font-extrabold px-6 py-3 rounded-full shadow-lg hover:bg-amber-500 active:scale-95"
                >
                  {t.again}
                </motion.button>
              )}
            </AnimatePresence>

            <button
              type="button"
              onClick={nextWord}
              className="text-slate-500 hover:text-sky-700 text-sm font-bold underline-offset-4 hover:underline"
            >
              {t.skip}
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500" dir="auto">
          {(index % deck.length) + 1} / {deck.length}
        </p>
      </div>
    </div>
  );
}

function BouncingDots() {
  return (
    <div className="flex gap-2" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block w-3 h-3 rounded-full bg-amber-700"
          animate={{ y: [0, -10, 0] }}
          transition={{
            duration: 0.7,
            repeat: Infinity,
            delay: i * 0.12,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
