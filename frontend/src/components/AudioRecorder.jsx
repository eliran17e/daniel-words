import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { resolveImageUrl } from "./EditVisualModal";
import {
  playRetry,
  playRoundComplete,
  playSuccess,
  speakWord,
} from "../sound";

const API_BASE =
  process.env.REACT_APP_API_BASE || "http://localhost:8000/api";
const EVAL_URL = `${API_BASE}/evaluate-audio`;
const WORDS_URL = `${API_BASE}/words`;

function CurrentVisual({ word }) {
  const img = resolveImageUrl(API_BASE, word.image_url);
  if (word.emoji) {
    return (
      <span className="text-8xl sm:text-9xl select-none drop-shadow-md" aria-hidden>
        {word.emoji}
      </span>
    );
  }
  if (img) {
    return (
      <img
        src={img}
        alt={word.word}
        className="w-40 h-40 sm:w-48 sm:h-48 object-cover rounded-3xl shadow-md"
      />
    );
  }
  return (
    <span className="text-8xl sm:text-9xl select-none drop-shadow-md" aria-hidden>
      ❓
    </span>
  );
}

const STATUS = {
  IDLE: "idle",
  RECORDING: "recording",
  UPLOADING: "uploading",
  SUCCESS: "success",
  RETRY: "retry",
  ERROR: "error",
  MIC_BLOCKED: "mic_blocked",
};

const SESSION_SIZE = 10;

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
    micBlocked: "Microphone is blocked 🔒",
    micBlockedHint:
      "Click the 🔒 icon next to the URL → Microphone → Allow → refresh the page.",
    micMissing: "No microphone found — connect one and refresh",
    micBusy: "Mic is in use by another app — close it and try again",
    serverErr: "Hmm — something hiccuped",
    next: "Next →",
    again: "Try Again",
    iDidIt: "I did it ✓",
    skip: "Skip",
    listen: "Hear the word",
    micLabel: "Hold to speak",
    swap: "עברית",
    loading: "Loading words…",
    empty: "No words yet — ask a grown-up to add some!",
    roundDone: "Round Complete!",
    roundDoneSub: "You finished all your words!",
    playMore: "Play 10 More 🎉",
    heardPrefix: "I heard:",
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
    micBlocked: "המיקרופון חסום 🔒",
    micBlockedHint:
      "לחצו על סמל המנעול 🔒 ליד הכתובת → מיקרופון → אפשרו → רעננו את הדף.",
    micMissing: "לא נמצא מיקרופון — חברו אחד ורעננו",
    micBusy: "המיקרופון בשימוש על ידי תוכנה אחרת",
    serverErr: "אופס — קרתה תקלה",
    next: "→ הבא",
    again: "ננסה שוב",
    iDidIt: "✓ אמרתי נכון",
    skip: "דלג",
    listen: "להאזין למילה",
    micLabel: "לחצו והחזיקו כדי לדבר",
    swap: "EN",
    loading: "טוען מילים…",
    empty: "אין עדיין מילים — ביקשו ממבוגר להוסיף",
    roundDone: "סיימתם את הסבב!",
    roundDoneSub: "ענית על כל המילים!",
    playMore: "עוד 10 מילים 🎉",
    heardPrefix: "שמעתי:",
  },
};

function shuffle(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const LANG_STORAGE_KEY = "dw-active-lang";

function readSavedLang() {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === "en" || saved === "he") return saved;
  } catch {
    // localStorage might be unavailable (private mode, etc.)
  }
  return "en";
}

export default function AudioRecorder() {
  const [lang, setLang] = useState(readSavedLang);

  useEffect(() => {
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // ignore
    }
  }, [lang]);

  const [allWords, setAllWords] = useState([]);
  const [wordsLoading, setWordsLoading] = useState(true);
  const [wordsError, setWordsError] = useState(false);
  const [sessionDeck, setSessionDeck] = useState([]);
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState(STATUS.IDLE);
  const [feedback, setFeedback] = useState("");
  const [heard, setHeard] = useState("");

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const advanceTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, []);

  const t = I18N[lang];
  const dir = lang === "he" ? "rtl" : "ltr";

  const fullDeck = useMemo(
    () => allWords.filter((w) => w.language === lang),
    [allWords, lang]
  );
  const sessionComplete =
    sessionDeck.length > 0 && index >= sessionDeck.length;
  const current = sessionComplete ? null : sessionDeck[index] ?? null;
  const isHebrew = lang === "he";

  useEffect(() => {
    let cancelled = false;
    setWordsLoading(true);
    axios
      .get(WORDS_URL, { timeout: 10000 })
      .then(({ data }) => {
        if (cancelled) return;
        setAllWords(Array.isArray(data) ? data : []);
        setWordsError(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("failed to load words", err);
        setWordsError(true);
      })
      .finally(() => {
        if (!cancelled) setWordsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
    setHeard("");
  }, []);

  const startNewRound = useCallback(() => {
    const selected = fullDeck.filter((w) => w.is_selected);
    const pool = selected.length > 0 ? selected : fullDeck;
    setSessionDeck(shuffle(pool).slice(0, SESSION_SIZE));
    setIndex(0);
    setStatus(STATUS.IDLE);
    setFeedback("");
    setHeard("");
  }, [fullDeck]);

  useEffect(() => {
    startNewRound();
  }, [startNewRound]);

  const nextWord = useCallback(() => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    if (sessionDeck.length === 0) return;
    setIndex((i) => i + 1);
    reset();
  }, [sessionDeck.length, reset]);

  const claimCorrect = useCallback(() => {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    setStatus(STATUS.SUCCESS);
    setFeedback(t.success);
    advanceTimerRef.current = setTimeout(() => {
      advanceTimerRef.current = null;
      nextWord();
    }, 1400);
  }, [nextWord, t.success]);

  const swapLang = () => {
    setLang((l) => (l === "en" ? "he" : "en"));
  };

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const uploadBlob = useCallback(
    async (blob) => {
      if (!current) return;
      setStatus(STATUS.UPLOADING);
      setFeedback(t.thinking);
      try {
        const form = new FormData();
        form.append("audio", blob, "recording.webm");
        form.append("target_word", current.word);
        form.append("target_language", lang);

        const { data } = await axios.post(EVAL_URL, form, {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 30000,
        });

        const transcript = (data.transcript || "").trim();
        setHeard(transcript);

        if (data.is_correct) {
          setStatus(STATUS.SUCCESS);
          setFeedback(t.success);
        } else if (!transcript) {
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
    [current, lang, t]
  );

  const startRecording = useCallback(async () => {
    if (!current) return;
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
      const name = err?.name || "";
      console.error("getUserMedia failed:", name, err);
      if (
        name === "NotAllowedError" ||
        name === "PermissionDeniedError" ||
        name === "SecurityError"
      ) {
        setStatus(STATUS.MIC_BLOCKED);
        setFeedback(t.micBlocked);
      } else if (
        name === "NotFoundError" ||
        name === "DevicesNotFoundError" ||
        name === "OverconstrainedError"
      ) {
        setStatus(STATUS.ERROR);
        setFeedback(t.micMissing);
      } else if (name === "NotReadableError" || name === "TrackStartError") {
        setStatus(STATUS.ERROR);
        setFeedback(t.micBusy);
      } else {
        setStatus(STATUS.ERROR);
        setFeedback(t.micPerm);
      }
    }
  }, [current, status, stopStream, t, uploadBlob]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "recording") recorder.stop();
  }, []);

  const isBusy = status === STATUS.UPLOADING;
  const isRecording = status === STATUS.RECORDING;
  const isSuccess = status === STATUS.SUCCESS;
  const isMicBlocked = status === STATUS.MIC_BLOCKED;
  const isRetry =
    status === STATUS.RETRY || status === STATUS.ERROR || isMicBlocked;

  useEffect(() => {
    if (status === STATUS.SUCCESS) playSuccess();
    else if (status === STATUS.RETRY) playRetry();
  }, [status]);

  useEffect(() => {
    if (sessionComplete) playRoundComplete();
  }, [sessionComplete]);

  const handleSpeak = useCallback(() => {
    if (current) speakWord(current.word, current.language);
  }, [current]);

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

  const renderBody = () => {
    if (wordsLoading) {
      return (
        <div className="flex flex-col items-center gap-4 py-10">
          <BouncingDots />
          <p className="text-sky-700 font-bold">{t.loading}</p>
        </div>
      );
    }
    if (wordsError) {
      return (
        <div className="flex flex-col items-center gap-4 py-8">
          <p className="text-orange-500 font-bold text-center">{t.serverErr}</p>
        </div>
      );
    }
    if (fullDeck.length === 0) {
      return (
        <div className="flex flex-col items-center gap-4 py-8">
          <p className="text-sky-700 font-bold text-center">{t.empty}</p>
        </div>
      );
    }
    if (sessionComplete) {
      return (
        <motion.div
          key="round-done"
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 18 }}
          className="flex flex-col items-center gap-5 py-6"
        >
          <div className="text-8xl select-none" aria-hidden>
            🏆
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-emerald-600 text-center">
            {t.roundDone}
          </h2>
          <p className="text-base sm:text-lg font-bold text-sky-700 text-center">
            {t.roundDoneSub}
          </p>
          <button
            type="button"
            onClick={startNewRound}
            className="bg-emerald-500 text-white text-xl font-extrabold px-8 py-4 rounded-full shadow-lg hover:bg-emerald-600 active:scale-95"
          >
            {t.playMore}
          </button>
        </motion.div>
      );
    }
    if (!current) {
      return (
        <div className="flex flex-col items-center gap-4 py-10">
          <BouncingDots />
        </div>
      );
    }

    const key = `${current.id}-${current.word}`;

    return (
      <>
        <motion.div
          key={`emoji-${key}`}
          initial={{ scale: 0.5, opacity: 0, rotate: -8 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 16 }}
        >
          <CurrentVisual word={current} />
        </motion.div>

        <div className="relative flex flex-col items-center gap-2">
          <motion.div
            key={`word-${key}`}
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

          <button
            type="button"
            onClick={handleSpeak}
            aria-label={t.listen}
            className="w-10 h-10 rounded-full bg-sky-100 text-sky-700 hover:bg-sky-200 active:scale-95 flex items-center justify-center text-lg shadow-sm transition"
          >
            🔊
          </button>

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

        <div className="min-h-[3.5rem] flex flex-col items-center justify-center gap-1">
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
          <AnimatePresence>
            {heard && (isSuccess || isRetry) && !isMicBlocked && (
              <motion.p
                key={`heard-${heard}`}
                initial={{ y: 4, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs sm:text-sm text-slate-500"
                dir="auto"
              >
                {t.heardPrefix}{" "}
                <span className="font-bold text-slate-700" dir="auto">
                  &ldquo;{heard}&rdquo;
                </span>
              </motion.p>
            )}
            {isMicBlocked && (
              <motion.p
                key="mic-blocked-hint"
                initial={{ y: 4, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs sm:text-sm text-slate-600 text-center max-w-xs leading-relaxed px-2"
                dir="auto"
              >
                {t.micBlockedHint}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <div className="relative w-44 h-44 flex items-center justify-center">
          <AnimatePresence>
            {isRecording &&
              [0, 0.35, 0.7].map((delay, i) => (
                <motion.span
                  key={`ring-${i}`}
                  aria-hidden
                  className="absolute inset-0 rounded-full bg-pink-300/50 pointer-events-none"
                  initial={{ scale: 0.9, opacity: 0.55 }}
                  animate={{ scale: 1.7, opacity: 0 }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
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
              <motion.div
                key="retry-actions"
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.7, opacity: 0 }}
                className="flex items-center gap-3"
              >
                <button
                  type="button"
                  onClick={reset}
                  className="bg-amber-400 text-amber-900 text-lg font-extrabold px-5 py-3 rounded-full shadow-lg hover:bg-amber-500 active:scale-95"
                >
                  {t.again}
                </button>
                <button
                  type="button"
                  onClick={claimCorrect}
                  className="bg-emerald-500 text-white text-lg font-extrabold px-5 py-3 rounded-full shadow-lg hover:bg-emerald-600 active:scale-95"
                >
                  {t.iDidIt}
                </button>
              </motion.div>
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

        <p className="mt-2 text-center text-xs text-slate-500" dir="auto">
          {Math.min(index + 1, sessionDeck.length)} / {sessionDeck.length}
        </p>
      </>
    );
  };

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

        <Link
          to="/manage"
          aria-label="Manage words"
          className="absolute top-4 start-4 w-10 h-10 flex items-center justify-center rounded-full text-lg bg-sky-100 text-sky-700 hover:bg-sky-200 active:scale-95 transition shadow-sm"
        >
          ⚙️
        </Link>

        <div className="flex flex-col items-center gap-5 mt-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-sky-700">
            {t.title}
          </h1>
          {renderBody()}
        </div>
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
