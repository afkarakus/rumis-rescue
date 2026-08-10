/** @type {HTMLAudioElement | null} */
let currentAudio = null;
let speaking = false;

/**
 * @param {string} src
 * @returns {HTMLAudioElement}
 */
function getAudio(src) {
  const audio = new Audio(src);
  audio.preload = "auto";
  return audio;
}

/**
 * Önce ses dosyası varsa onu çal; yoksa Türkçe TTS.
 * @param {string} text
 * @param {{ mood?: 'scared-sweet', audioSrc?: string | null }} [opts]
 */
export function speakLine(text, opts = {}) {
  stopSpeech();

  if (opts.audioSrc) {
    speaking = true;
    const audio = getAudio(opts.audioSrc);
    currentAudio = audio;
    audio.volume = 1;
    audio.onended = () => {
      speaking = false;
      currentAudio = null;
    };
    audio.onerror = () => {
      speaking = false;
      currentAudio = null;
      speakTts(text, opts.mood ?? "scared-sweet");
    };
    const play = audio.play();
    if (play && typeof play.catch === "function") {
      play.catch(() => {
        speaking = false;
        speakTts(text, opts.mood ?? "scared-sweet");
      });
    }
    return true;
  }

  return speakTts(text, opts.mood ?? "scared-sweet");
}

function getTurkishVoice() {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const score = (v) => {
    const lang = (v.lang || "").toLowerCase();
    const name = (v.name || "").toLowerCase();
    let s = 0;
    if (lang === "tr-tr" || lang === "tr") s += 50;
    else if (lang.startsWith("tr")) s += 40;
    else return -1;
    if (/female|woman|kız|kadin|kadın|zira|yelda|emel|filiz|soft|natural/i.test(name)) s += 25;
    if (/google/.test(name) && /tr/.test(lang)) s += 15;
    if (/male|erkek|ahmet|mehmet|tolga/i.test(name)) s -= 30;
    return s;
  };

  return [...voices].sort((a, b) => score(b) - score(a))[0] || null;
}

/**
 * @param {string} text
 * @param {string} mood
 */
function speakTts(text, mood) {
  if (!("speechSynthesis" in window)) return false;
  speaking = true;

  const run = () => {
    const voice = getTurkishVoice();
    const make = (line, pitch, rate, volume) => {
      const u = new SpeechSynthesisUtterance(line);
      u.lang = "tr-TR";
      u.pitch = pitch;
      u.rate = rate;
      u.volume = volume;
      if (voice) u.voice = voice;
      return u;
    };

    const parts =
      mood === "scared-sweet"
        ? (() => {
            const words = String(text || "miyav")
              .trim()
              .split(/\s+/)
              .filter(Boolean);
            if (words.length >= 2) {
              return [
                make(`${words[0]}?`, 1.88, 0.84, 0.8),
                make(`${words.slice(1).join(" ")}!`, 1.98, 1.16, 1),
              ];
            }
            return [make(`${words[0] || "miyav"}!`, 1.92, 1.05, 1)];
          })()
        : [make(text, 1.7, 1.0, 1)];

    let i = 0;
    const next = () => {
      if (i >= parts.length) {
        speaking = false;
        return;
      }
      const u = parts[i];
      i += 1;
      u.onend = next;
      u.onerror = () => {
        speaking = false;
      };
      window.speechSynthesis.speak(u);
    };
    next();
  };

  if (!window.speechSynthesis.getVoices().length) {
    window.speechSynthesis.addEventListener("voiceschanged", run, { once: true });
    window.setTimeout(run, 150);
  } else {
    run();
  }
  return true;
}

export function stopSpeech() {
  speaking = false;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}
