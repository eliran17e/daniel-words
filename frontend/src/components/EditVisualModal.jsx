import React, { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";

const TABS = [
  { key: "emoji", label: "Emoji" },
  { key: "upload", label: "Upload" },
  { key: "pixabay", label: "Pixabay" },
];

export function resolveImageUrl(apiBase, url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const host = apiBase.replace(/\/api\/?$/, "");
  return `${host}${url}`;
}

export default function EditVisualModal({ word, apiBase, onClose, onSaved }) {
  const [tab, setTab] = useState("emoji");
  const [emojiValue, setEmojiValue] = useState(word.emoji || "");
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [pxQuery, setPxQuery] = useState(word.word);
  const [pxResults, setPxResults] = useState([]);
  const [pxSelected, setPxSelected] = useState(null);
  const [pxLoading, setPxLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (filePreview) URL.revokeObjectURL(filePreview);
    };
  }, [filePreview]);

  const searchPixabay = async () => {
    if (!pxQuery.trim()) return;
    setPxLoading(true);
    setError("");
    setPxSelected(null);
    try {
      const { data } = await axios.get(`${apiBase}/pixabay/search`, {
        params: { q: pxQuery.trim(), language: word.language },
        timeout: 10000,
      });
      setPxResults(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setError(
        e?.response?.data?.detail ||
          "Pixabay search failed (is the API key set?)"
      );
    } finally {
      setPxLoading(false);
    }
  };

  const handleFileChange = (event) => {
    const f = event.target.files?.[0];
    if (!f) return;
    setFile(f);
    setFilePreview(URL.createObjectURL(f));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      let updated = null;
      if (tab === "emoji") {
        const value = emojiValue.trim();
        if (!value) {
          setError("Pick an emoji first");
          return;
        }
        const { data } = await axios.patch(`${apiBase}/words/${word.id}`, {
          emoji: value,
        });
        updated = data;
      } else if (tab === "upload") {
        if (!file) {
          setError("Pick a file first");
          return;
        }
        const form = new FormData();
        form.append("file", file);
        const { data } = await axios.post(
          `${apiBase}/words/${word.id}/upload-image`,
          form,
          {
            headers: { "Content-Type": "multipart/form-data" },
            timeout: 30000,
          }
        );
        updated = data;
      } else if (tab === "pixabay") {
        if (!pxSelected) {
          setError("Pick a picture first");
          return;
        }
        const { data } = await axios.patch(`${apiBase}/words/${word.id}`, {
          image_url: pxSelected.web_url,
        });
        updated = data;
      }
      if (updated) onSaved(updated);
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6"
      >
        <div className="flex items-start justify-between mb-4 gap-2">
          <h2
            className="text-xl font-extrabold text-sky-700 flex-1"
            dir="auto"
          >
            Edit visual for &ldquo;{word.word}&rdquo;
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-3xl leading-none -mt-1"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex gap-1 bg-sky-50 rounded-2xl p-1 mb-4">
          {TABS.map((tabDef) => (
            <button
              key={tabDef.key}
              type="button"
              onClick={() => {
                setTab(tabDef.key);
                setError("");
              }}
              className={`flex-1 py-2 text-sm font-extrabold rounded-xl transition ${
                tab === tabDef.key
                  ? "bg-white text-sky-700 shadow"
                  : "text-slate-600 hover:bg-white/60"
              }`}
            >
              {tabDef.label}
            </button>
          ))}
        </div>

        <div className="min-h-[280px]">
          {tab === "emoji" && (
            <div className="flex flex-col items-center gap-4 py-4">
              <input
                type="text"
                value={emojiValue}
                onChange={(e) => setEmojiValue(e.target.value)}
                maxLength={16}
                placeholder="🍎"
                className="text-6xl text-center w-32 h-32 rounded-2xl border-2 border-sky-200 focus:border-sky-400 focus:outline-none bg-sky-50"
              />
              <p className="text-xs text-slate-500 text-center px-4">
                Type or paste an emoji. Open your system emoji picker with{" "}
                <kbd className="px-1 bg-slate-100 rounded">Win</kbd>+
                <kbd className="px-1 bg-slate-100 rounded">.</kbd> on Windows or{" "}
                <kbd className="px-1 bg-slate-100 rounded">Ctrl</kbd>+
                <kbd className="px-1 bg-slate-100 rounded">⌘</kbd>+
                <kbd className="px-1 bg-slate-100 rounded">Space</kbd> on Mac.
              </p>
            </div>
          )}

          {tab === "upload" && (
            <div className="flex flex-col items-center gap-4 py-4">
              <label className="cursor-pointer">
                {filePreview ? (
                  <img
                    src={filePreview}
                    alt="preview"
                    className="w-40 h-40 object-cover rounded-2xl shadow-md"
                  />
                ) : (
                  <div className="w-40 h-40 flex flex-col items-center justify-center rounded-2xl bg-sky-50 border-2 border-dashed border-sky-300 text-sky-700 font-extrabold">
                    <span className="text-3xl">📁</span>
                    <span className="text-xs mt-2">Choose file</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-slate-500 text-center">
                JPG, PNG, WebP, or GIF — max 5 MB
              </p>
              {file && (
                <p className="text-xs text-slate-600 truncate max-w-full">
                  {file.name} ({Math.round(file.size / 1024)} KB)
                </p>
              )}
            </div>
          )}

          {tab === "pixabay" && (
            <div className="flex flex-col gap-3 py-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={pxQuery}
                  onChange={(e) => setPxQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      searchPixabay();
                    }
                  }}
                  placeholder="Search Pixabay…"
                  className="flex-1 px-3 py-2 rounded-2xl border-2 border-sky-200 focus:border-sky-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={searchPixabay}
                  disabled={pxLoading}
                  className="px-4 py-2 rounded-2xl bg-sky-500 text-white font-extrabold hover:bg-sky-600 disabled:opacity-50"
                >
                  {pxLoading ? "…" : "Search"}
                </button>
              </div>
              {pxLoading ? (
                <p className="text-center text-slate-500 py-8">Searching…</p>
              ) : pxResults.length === 0 ? (
                <p className="text-center text-slate-500 py-8">
                  No results yet. Hit Search.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-72 overflow-y-auto p-1">
                  {pxResults.map((hit) => {
                    const selected = pxSelected?.id === hit.id;
                    return (
                      <button
                        key={hit.id}
                        type="button"
                        onClick={() => setPxSelected(hit)}
                        className={`relative aspect-square rounded-xl overflow-hidden ring-4 transition ${
                          selected
                            ? "ring-emerald-400 scale-95"
                            : "ring-transparent hover:ring-sky-200"
                        }`}
                      >
                        <img
                          src={hit.preview_url}
                          alt={hit.tags}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </button>
                    );
                  })}
                </div>
              )}
              <p className="text-xs text-slate-400 text-center pt-1">
                Images from{" "}
                <a
                  href="https://pixabay.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-sky-600 hover:underline"
                >
                  Pixabay
                </a>
              </p>
            </div>
          )}
        </div>

        {error && (
          <p className="mt-3 text-sm text-orange-500 font-bold text-center">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-2xl bg-slate-100 text-slate-700 font-extrabold hover:bg-slate-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 rounded-2xl bg-emerald-500 text-white font-extrabold hover:bg-emerald-600 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
