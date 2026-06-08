import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import EditVisualModal, { resolveImageUrl } from "./EditVisualModal";

const API_BASE =
  process.env.REACT_APP_API_BASE || "http://localhost:8000/api";
const WORDS_URL = `${API_BASE}/words`;

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

  const [newWord, setNewWord] = useState("");
  const [newLang, setNewLang] = useState("en");
  const [submitting, setSubmitting] = useState(false);
  const [flash, setFlash] = useState(null);
  const [editing, setEditing] = useState(null);
  const [uploadsEnabled, setUploadsEnabled] = useState(true);

  useEffect(() => {
    let cancelled = false;
    axios
      .get(`${API_BASE}/capabilities`, { timeout: 5000 })
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
      await axios.patch(`${WORDS_URL}/${word.id}`, {
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
        await axios.post(`${API_BASE}/words/bulk-select`, {
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
      const { data } = await axios.get(WORDS_URL, { timeout: 10000 });
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

  const orderedLangs = useMemo(() => {
    const primary = readPrimaryLang();
    if (primary === "he") {
      return [...LANGS].sort((a, b) => (a.code === "he" ? -1 : 1));
    }
    return LANGS;
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = newWord.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setFlash(null);
    try {
      const { data } = await axios.post(
        WORDS_URL,
        { word: trimmed, language: newLang },
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
      await axios.delete(`${WORDS_URL}/${id}`, { timeout: 10000 });
      setWords((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      console.error("delete failed", err);
      setFlash({ kind: "err", text: "Could not delete that word." });
    }
  };

  return (
    <div className="min-h-screen w-full font-rounded bg-gradient-to-br from-sky-100 via-emerald-50 to-amber-100 p-6">
      <div className="max-w-3xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-sky-700">
            Manage Words
          </h1>
          <Link
            to="/"
            className="px-4 py-2 rounded-full text-xs font-extrabold uppercase tracking-widest bg-sky-100 text-sky-700 hover:bg-sky-200 transition shadow-sm"
          >
            ← Play
          </Link>
        </header>

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
                if (detected && detected !== newLang) setNewLang(detected);
              }}
              placeholder={newLang === "he" ? "תפוח" : "apple"}
              dir="auto"
              maxLength={128}
              className="flex-1 px-4 py-3 rounded-2xl border-2 border-sky-200 focus:border-sky-400 focus:outline-none text-lg font-bold text-slate-800 bg-white"
            />
            <div className="flex gap-2">
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setNewLang(l.code)}
                  className={`px-4 py-3 rounded-2xl text-sm font-extrabold uppercase tracking-wider transition ${
                    newLang === l.code
                      ? "bg-sky-500 text-white shadow"
                      : "bg-sky-100 text-sky-700 hover:bg-sky-200"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <button
              type="submit"
              disabled={submitting || !newWord.trim()}
              className="px-6 py-3 rounded-2xl text-base font-extrabold bg-emerald-500 text-white shadow-lg hover:bg-emerald-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Adding…" : "Add"}
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

        {loading ? (
          <p className="text-center text-sky-700 font-bold py-8">Loading…</p>
        ) : loadError ? (
          <p className="text-center text-orange-500 font-bold py-8">
            {loadError}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {orderedLangs.map((l) => (
              <LangSection
                key={l.code}
                lang={l}
                words={grouped[l.code]}
                onToggleSelect={handleToggleSelect}
                onDelete={(id) => handleDelete(id)}
                onEdit={(w) => setEditing(w)}
                onSelectAll={() => setLangSelection(l.code, true)}
                onClearAll={() => setLangSelection(l.code, false)}
              />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {editing && (
          <EditVisualModal
            key={editing.id}
            word={editing}
            apiBase={API_BASE}
            uploadsEnabled={uploadsEnabled}
            onClose={() => setEditing(null)}
            onSaved={handleSaved}
          />
        )}
      </AnimatePresence>
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
  const imgSrc = resolveImageUrl(API_BASE, word.image_url);
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
