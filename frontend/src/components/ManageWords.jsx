import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../AuthContext";
import EditVisualModal, { resolveImageUrl } from "./EditVisualModal";
import {
  getSavedVoiceURI,
  getVoicesForLanguage,
  setSavedVoiceURI,
  speakWord,
} from "../sound";

const LANGS = [
  { code: "en", label: "English" },
  { code: "he", label: "עברית" },
];

const LANG_STORAGE_KEY = "dw-active-lang";

function readPrimaryLang() {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === "en" || saved === "he") return saved;
  } catch {
    // ignore
  }
  return "en";
}

const HEBREW_RE = /[֐-׿יִ-ﭏ]/;
const LATIN_RE = /[A-Za-z]/;

function detectLang(text) {
  if (HEBREW_RE.test(text)) return "he";
  if (LATIN_RE.test(text)) return "en";
  return null;
}

export default function ManageWords() {
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [lang, setLang] = useState(readPrimaryLang);
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const handleLogout = () => {
    logout();
    nav("/login", { replace: true });
  };

  useEffect(() => {
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // ignore
    }
  }, [lang]);

  const [newWord, setNewWord] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [flash, setFlash] = useState(null);
  const [editing, setEditing] = useState(null);
  const [uploadsEnabled, setUploadsEnabled] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/capabilities`, { timeout: 5000 })
      .then(({ data }) => {
        if (!cancelled) setUploadsEnabled(data?.uploads_enabled !== false);
      })
      .catch(() => {
        if (!cancelled) setUploadsEnabled(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSaved = useCallback((updated) => {
    setWords((prev) =>
      prev.map((w) => (w.id === updated.id ? updated : w))
    );
    setEditing(null);
  }, []);

  const handleToggleSelect = useCallback(async (word) => {
    const nextSelected = !word.is_selected;
    setWords((prev) =>
      prev.map((w) =>
        w.id === word.id ? { ...w, is_selected: nextSelected } : w
      )
    );
    try {
      await api.patch(`/words/${word.id}`, {
        is_selected: nextSelected,
      });
    } catch (err) {
      console.error("toggle select failed", err);
      setWords((prev) =>
        prev.map((w) =>
          w.id === word.id ? { ...w, is_selected: word.is_selected } : w
        )
      );
    }
  }, []);

  const setLangSelection = useCallback(
    async (langCode, value) => {
      const targetIds = words
        .filter((w) => w.language === langCode && w.is_selected !== value)
        .map((w) => w.id);
      if (targetIds.length === 0) return;
      const before = words;
      setWords((prev) =>
        prev.map((w) =>
          w.language === langCode ? { ...w, is_selected: value } : w
        )
      );
      try {
        await api.post(`/words/bulk-select`, {
          ids: targetIds,
          is_selected: value,
        });
      } catch (err) {
        console.error("bulk select failed", err);
        setWords(before);
      }
    },
    [words]
  );

  const loadWords = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const { data } = await api.get("/words", { timeout: 10000 });
      setWords(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("load words failed", err);
      setLoadError("Couldn't load words from the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWords();
  }, [loadWords]);

  const grouped = useMemo(() => {
    const out = { en: [], he: [] };
    for (const w of words) {
      if (out[w.language]) out[w.language].push(w);
    }
    for (const key of Object.keys(out)) {
      out[key].sort((a, b) => {
        // selected words first; preserve original order otherwise
        if (a.is_selected === b.is_selected) return 0;
        return a.is_selected ? -1 : 1;
      });
    }
    return out;
  }, [words]);

  const currentLangDef = useMemo(
    () => LANGS.find((l) => l.code === lang) || LANGS[0],
    [lang]
  );

  const swapLang = () => setLang((l) => (l === "en" ? "he" : "en"));

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = newWord.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setFlash(null);
    try {
      const { data } = await api.post(
        "/words",
        { word: trimmed, language: lang },
        { timeout: 15000 }
      );
      const both = [data.word, data.counterpart].filter(Boolean);
      setWords((prev) => {
        const seen = new Set(prev.map((w) => w.id));
        const fresh = both.filter((w) => !seen.has(w.id));
        return [...prev, ...fresh];
      });
      setNewWord("");
      const summary = both
        .map((w) => `"${w.word}" ${w.emoji || ""}`)
        .join(" + ");
      setFlash({ kind: "ok", text: `Added ${summary}` });
    } catch (err) {
      const detail = err?.response?.data?.detail || "Could not add the word.";
      setFlash({ kind: "err", text: detail });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/words/${id}`, { timeout: 10000 });
      setWords((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      console.error("delete failed", err);
      setFlash({ kind: "err", text: "Could not delete that word." });
    }
  };

  return (
    <div className="min-h-screen w-full font-rounded bg-gradient-to-br from-sky-100 via-emerald-50 to-amber-100 p-6">
      <div className="max-w-3xl mx-auto">
        <header className="flex items-center justify-between mb-6 gap-2 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-sky-700">
            Manage Words
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={swapLang}
              aria-label={`Switch language to ${lang === "he" ? "English" : "עברית"}`}
              className="px-4 py-2 rounded-full text-xs font-extrabold uppercase tracking-widest bg-sky-100 text-sky-700 hover:bg-sky-200 active:scale-95 transition shadow-sm"
            >
              {lang === "he" ? "EN" : "עברית"}
            </button>
            <Link
              to="/"
              className="px-4 py-2 rounded-full text-xs font-extrabold uppercase tracking-widest bg-sky-100 text-sky-700 hover:bg-sky-200 transition shadow-sm"
            >
              ← Play
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Log out"
              title={user?.email || ""}
              className="px-4 py-2 rounded-full text-xs font-extrabold uppercase tracking-widest bg-amber-100 text-amber-700 hover:bg-amber-200 transition shadow-sm"
            >
              Log out
            </button>
          </div>
        </header>
        {user && (
          <p className="text-xs text-slate-500 -mt-4 mb-4" dir="auto">
            Signed in as{" "}
            <span className="font-bold text-slate-700">
              {user.display_name || user.email}
            </span>
          </p>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white/85 backdrop-blur rounded-3xl shadow-xl ring-1 ring-white/70 p-5 sm:p-6 mb-6"
        >
          <label
            htmlFor="new-word"
            className="block text-sm font-bold text-sky-700 mb-2"
          >
            Add a new word
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              id="new-word"
              type="text"
              value={newWord}
              onChange={(e) => {
                const text = e.target.value;
                setNewWord(text);
                const detected = detectLang(text);
                if (detected && detected !== lang) setLang(detected);
              }}
              placeholder={lang === "he" ? "תפוח" : "apple"}
              dir="auto"
              maxLength={128}
              className="flex-1 px-4 py-3 rounded-2xl border-2 border-sky-200 focus:border-sky-400 focus:outline-none text-lg font-bold text-slate-800 bg-white"
            />
            <button
              type="submit"
              disabled={submitting || !newWord.trim()}
              className="px-6 py-3 rounded-2xl text-base font-extrabold bg-emerald-500 text-white shadow-lg hover:bg-emerald-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Adding…" : `Add to ${currentLangDef.label}`}
            </button>
          </div>

          <AnimatePresence>
            {flash && (
              <motion.p
                key={flash.text}
                initial={{ y: 6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`mt-3 text-sm font-bold ${
                  flash.kind === "ok" ? "text-emerald-600" : "text-orange-500"
                }`}
              >
                {flash.text}
              </motion.p>
            )}
          </AnimatePresence>
        </form>

        <VoiceSettings />

        {loading ? (
          <p className="text-center text-sky-700 font-bold py-8">Loading…</p>
        ) : loadError ? (
          <p className="text-center text-orange-500 font-bold py-8">
            {loadError}
          </p>
        ) : (
          <LangSection
            lang={currentLangDef}
            words={grouped[lang]}
            onToggleSelect={handleToggleSelect}
            onDelete={(id) => handleDelete(id)}
            onEdit={(w) => setEditing(w)}
            onSelectAll={() => setLangSelection(lang, true)}
            onClearAll={() => setLangSelection(lang, false)}
          />
        )}
      </div>

      <AnimatePresence>
        {editing && (
          <EditVisualModal
            key={editing.id}
            word={editing}
            uploadsEnabled={uploadsEnabled}
            onClose={() => setEditing(null)}
            onSaved={handleSaved}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function VoiceSettings() {
  const [open, setOpen] = useState(false);
  const [voices, setVoices] = useState({ en: [], he: [] });
  const [selected, setSelected] = useState({
    en: getSavedVoiceURI("en"),
    he: getSavedVoiceURI("he"),
  });

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const update = () =>
      setVoices({
        en: getVoicesForLanguage("en"),
        he: getVoicesForLanguage("he"),
      });
    update();
    window.speechSynthesis.addEventListener("voiceschanged", update);
    return () =>
      window.speechSynthesis.removeEventListener("voiceschanged", update);
  }, []);

  const handleChange = (language, uri) => {
    setSelected((prev) => ({ ...prev, [language]: uri }));
    setSavedVoiceURI(language, uri);
  };

  const test = (language) => {
    const sample =
      language === "he" ? "שלום, אומרים את המילה" : "Hello, say the word";
    speakWord(sample, language);
  };

  const ttsSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  return (
    <section className="bg-white/85 backdrop-blur rounded-3xl shadow-xl ring-1 ring-white/70 p-5 mb-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <span className="text-sm font-extrabold text-sky-700 uppercase tracking-wider">
          🔊 Voice settings
        </span>
        <span className="text-xs text-slate-500">
          {open ? "Hide ▴" : "Show ▾"}
        </span>
      </button>

      {open && (
        <div className="mt-4 flex flex-col gap-3">
          {!ttsSupported && (
            <p className="text-sm text-orange-500">
              This browser doesn't support speech synthesis.
            </p>
          )}
          <VoiceRow
            label="English"
            voices={voices.en}
            selected={selected.en}
            onChange={(uri) => handleChange("en", uri)}
            onTest={() => test("en")}
          />
          <VoiceRow
            label="עברית"
            voices={voices.he}
            selected={selected.he}
            onChange={(uri) => handleChange("he", uri)}
            onTest={() => test("he")}
            dir="rtl"
          />
          <p className="text-xs text-slate-500 leading-relaxed">
            Voices come from your device. To install more (especially Hebrew),
            go to your phone's system Text-to-speech settings.
          </p>
        </div>
      )}
    </section>
  );
}

function VoiceRow({ label, voices, selected, onChange, onTest, dir = "ltr" }) {
  return (
    <div className="flex items-center gap-2 flex-wrap" dir={dir}>
      <span className="font-bold text-sm text-slate-700 min-w-[4rem]">
        {label}
      </span>
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 min-w-0 px-3 py-2 rounded-xl border-2 border-sky-200 focus:border-sky-400 focus:outline-none text-sm bg-white"
        dir="ltr"
      >
        <option value="">
          Default {voices.length === 0 ? "(no voices found)" : ""}
        </option>
        {voices.map((v) => (
          <option key={v.voiceURI} value={v.voiceURI}>
            {v.name} ({v.lang})
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={onTest}
        aria-label="Test voice"
        className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-bold text-sm shadow-sm active:scale-95"
      >
        ▶
      </button>
    </div>
  );
}

function LangSection({
  lang,
  words,
  onToggleSelect,
  onDelete,
  onEdit,
  onSelectAll,
  onClearAll,
}) {
  const selectedCount = words.filter((w) => w.is_selected).length;
  return (
    <section
      className="bg-white/85 backdrop-blur rounded-3xl shadow-xl ring-1 ring-white/70 p-5"
      dir={lang.code === "he" ? "rtl" : "ltr"}
    >
      <header className="flex items-center justify-between mb-3 gap-2">
        <h2 className="text-lg font-extrabold text-sky-700">{lang.label}</h2>
        <div className="flex items-center gap-2 text-xs font-bold">
          <span
            className={`px-2 py-1 rounded-full ${
              selectedCount > 0
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            🎯 {selectedCount} / {words.length}
          </span>
          <button
            type="button"
            onClick={onSelectAll}
            disabled={selectedCount === words.length}
            className="px-2 py-1 rounded-full bg-sky-100 text-sky-700 hover:bg-sky-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            All
          </button>
          <button
            type="button"
            onClick={onClearAll}
            disabled={selectedCount === 0}
            className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Clear
          </button>
        </div>
      </header>
      {words.length === 0 ? (
        <p className="text-sm text-slate-500">No words yet.</p>
      ) : (
        <motion.ul layout className="space-y-2">
          <AnimatePresence initial={false}>
            {words.map((w) => (
              <WordRow
                key={w.id}
                word={w}
                onToggleSelect={() => onToggleSelect(w)}
                onDelete={() => onDelete(w.id)}
                onEdit={() => onEdit(w)}
              />
            ))}
          </AnimatePresence>
        </motion.ul>
      )}
    </section>
  );
}

function WordRow({ word, onToggleSelect, onDelete, onEdit }) {
  const imgSrc = resolveImageUrl(null, word.image_url);
  const selected = !!word.is_selected;
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`flex items-center gap-2 rounded-2xl px-3 py-2 ${
        selected
          ? "bg-emerald-50 hover:bg-emerald-100 ring-1 ring-emerald-200"
          : "bg-sky-50/60 hover:bg-sky-100"
      }`}
    >
      <button
        type="button"
        onClick={onToggleSelect}
        aria-pressed={selected}
        aria-label={`${selected ? "Unselect" : "Select"} ${word.word} for play`}
        className={`text-xl leading-none transition ${
          selected ? "text-amber-500" : "text-slate-300 hover:text-amber-400"
        }`}
      >
        {selected ? "★" : "☆"}
      </button>
      <span className="w-10 h-10 flex items-center justify-center text-2xl rounded-xl bg-white shadow-sm overflow-hidden">
        {word.emoji ? (
          word.emoji
        ) : imgSrc ? (
          <img
            src={imgSrc}
            alt={word.word}
            className="w-full h-full object-cover"
          />
        ) : (
          "❓"
        )}
      </span>
      <span
        className="flex-1 text-lg font-extrabold text-slate-800 truncate"
        dir="auto"
      >
        {word.word}
      </span>
      <span className="text-xs font-bold text-slate-400 uppercase hidden sm:inline">
        {word.category}
      </span>
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Edit ${word.word}`}
        className="px-2 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-700 hover:bg-sky-200 transition"
      >
        ✏️
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete ${word.word}`}
        className="px-2 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-600 hover:bg-orange-200 transition"
      >
        ✕
      </button>
    </motion.li>
  );
}
