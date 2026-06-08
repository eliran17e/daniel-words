// Lightweight sound + TTS helpers. Sound effects are synthesized via Web Audio
// API (no asset files needed). Word pronunciation uses the browser's
// SpeechSynthesis API.

let _ctx = null;

function ctx() {
  if (!_ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    _ctx = new AudioCtx();
  }
  if (_ctx.state === "suspended") {
    _ctx.resume().catch(() => {});
  }
  return _ctx;
}

function tone({ freq, start, duration, type = "sine", peak = 0.25 }) {
  const c = ctx();
  if (!c) return;
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(peak, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

export function playSuccess() {
  // Major arpeggio C5 → E5 → G5
  [523.25, 659.25, 783.99].forEach((freq, i) =>
    tone({ freq, start: i * 0.08, duration: 0.35, type: "triangle", peak: 0.25 })
  );
}

export function playRetry() {
  // Soft falling tone — friendly "try again" not buzzer
  const c = ctx();
  if (!c) return;
  const t0 = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(440, t0);
  osc.frequency.linearRampToValueAtTime(330, t0 + 0.25);
  gain.gain.setValueAtTime(0.2, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.35);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + 0.4);
}

export function playRoundComplete() {
  // Triumphant fanfare C5 E5 G5 C6
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) =>
    tone({ freq, start: i * 0.11, duration: 0.45, type: "triangle", peak: 0.28 })
  );
}

export function playTap() {
  tone({ freq: 880, start: 0, duration: 0.07, type: "sine", peak: 0.12 });
}

/**
 * Speak a word out loud using the browser's TTS. Returns true if the request
 * was queued, false if SpeechSynthesis isn't available.
 */
export function speakWord(text, language = "en") {
  if (typeof window === "undefined") return false;
  if (!("speechSynthesis" in window)) return false;
  if (!text || !text.trim()) return false;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language === "he" ? "he-IL" : "en-US";
  utterance.rate = 0.85; // slightly slower for kids
  utterance.pitch = 1.05;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return true;
}

/** Best-effort detection that some voice exists for a given language tag. */
export function hasVoiceFor(language) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return false;
  }
  const voices = window.speechSynthesis.getVoices();
  const prefix = language === "he" ? "he" : "en";
  return voices.some((v) => v.lang.toLowerCase().startsWith(prefix));
}
