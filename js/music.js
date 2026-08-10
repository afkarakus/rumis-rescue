/** @type {HTMLAudioElement | null} */
let music = null;

/**
 * @param {string} src
 * @param {{ loop?: boolean, volume?: number }} [opts]
 */
export function playMusic(src, opts = {}) {
  stopMusic();
  const audio = new Audio(src);
  audio.loop = opts.loop ?? true;
  audio.volume = opts.volume ?? 0.85;
  music = audio;
  const play = audio.play();
  if (play && typeof play.catch === "function") {
    play.catch(() => {
      /* autoplay engeli olursa sessizce geç */
    });
  }
}

export function stopMusic() {
  if (!music) return;
  music.pause();
  music.currentTime = 0;
  music = null;
}
