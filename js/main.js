import { LEVELS, saveProgress } from "./levels.js";
import { createGame } from "./game.js";
import { stopSpeech } from "./voice.js";
import { FINAL_LETTER } from "./letter.js";
import { playMusic, stopMusic } from "./music.js";

const screens = {
  menu: document.getElementById("screen-menu"),
  play: document.getElementById("screen-play"),
  result: document.getElementById("screen-result"),
  letter: document.getElementById("screen-letter"),
};

const canvas = document.getElementById("game");
const hudLevel = document.getElementById("hud-level");
const hudCat = document.getElementById("hud-cat");
const resultTitle = document.getElementById("result-title");
const resultText = document.getElementById("result-text");
const btnNext = document.getElementById("btn-next");
const touchPad = document.getElementById("touch-pad");
const letterBody = document.getElementById("letter-body");
const letterSign = document.getElementById("letter-sign");
const letterActions = document.getElementById("letter-actions");
const catchHero = document.getElementById("catch-hero");
const catchPhoto = document.getElementById("catch-photo");
const catchBubble = document.getElementById("catch-bubble");
const catchName = document.getElementById("catch-name");

const CATCH_LINE_CAT =
  "annecim beni köpeklere yem etmezsin değil mi kurtarırsın beni 🥺";
const CATCH_LINE_AHMET = "aşkım beni de alır mısın eve 🥺";

function hideCatchPortrait() {
  if (!catchHero || !catchPhoto) return;
  catchHero.hidden = true;
  catchPhoto.removeAttribute("src");
  catchPhoto.alt = "";
  if (catchName) catchName.textContent = "";
  if (catchBubble) catchBubble.textContent = "";
}

/**
 * @param {import('./levels.js').LEVELS[number] | undefined} level
 */
function showCatchPortrait(level) {
  if (!catchHero || !catchPhoto || !catchBubble || !level) {
    hideCatchPortrait();
    return;
  }

  const src =
    level.kind === "player"
      ? "assets/ahmet.png"
      : level.photo
        ? level.photo
        : "";

  if (!src) {
    hideCatchPortrait();
    return;
  }

  catchPhoto.removeAttribute("src");
  catchPhoto.alt = level.title;
  catchPhoto.src = `${src}?v=${level.id}`;
  if (catchName) catchName.textContent = level.title;
  catchBubble.textContent =
    level.kind === "player" ? CATCH_LINE_AHMET : CATCH_LINE_CAT;
  catchHero.hidden = false;
}

// Sayfa yenilenince her zaman 1. bölümden başla
saveProgress(1);
let progress = { level: 1 };
let currentLevelId = 1;
/** @type {ReturnType<typeof createGame> | null} */
let activeGame = null;
/** @type {number[]} */
let letterTimers = [];

const playerImage = new Image();
playerImage.src = "assets/ahmet.png";

/** @type {Map<string, HTMLImageElement>} */
const catImages = new Map();

for (const level of LEVELS) {
  if (!level.photo) continue;
  const img = new Image();
  img.src = level.photo;
  catImages.set(level.photo, img);
}

function show(name) {
  Object.entries(screens).forEach(([key, el]) => {
    if (!el) return;
    const on = key === name;
    el.hidden = !on;
    el.classList.toggle("screen--active", on);
  });
}

function clearLetterTimers() {
  letterTimers.forEach((id) => window.clearTimeout(id));
  letterTimers = [];
}

function openFinalLetter() {
  clearLetterTimers();
  if (!letterBody || !letterSign || !letterActions) return;

  playMusic("assets/sfx/letter-song.mp3", { loop: true, volume: 0.9 });

  letterBody.innerHTML = "";
  letterSign.hidden = true;
  letterActions.hidden = true;
  document.body.classList.add("is-letter-mode");
  show("letter");

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  FINAL_LETTER.forEach((text, index) => {
    const p = document.createElement("p");
    if (index === 0) p.className = "letter-greeting";
    p.textContent = text;
    letterBody.appendChild(p);

    const delay = reduced ? 0 : 700 + index * 1100;
    const timer = window.setTimeout(() => {
      p.classList.add("is-visible");
      if (reduced) p.style.opacity = "1";
    }, delay);
    letterTimers.push(timer);
  });

  const endDelay = reduced ? 200 : 700 + FINAL_LETTER.length * 1100 + 400;
  letterTimers.push(
    window.setTimeout(() => {
      letterSign.hidden = false;
      letterActions.hidden = false;
    }, endDelay)
  );
}

function startLevel(id) {
  const level = LEVELS.find((l) => l.id === id);
  if (!level || !canvas) return;

  currentLevelId = id;
  activeGame?.stop();
  stopSpeech();
  clearLetterTimers();
  hideCatchPortrait();
  document.body.classList.remove("is-letter-mode");

  if (level.musicSrc) playMusic(level.musicSrc, { loop: true, volume: 0.88 });
  else stopMusic();

  hudLevel.textContent = `Bölüm ${level.id}`;
  hudCat.textContent = level.kind === "player" ? "Sen · Eve dön" : level.title;
  show("play");

  const levelForRun = level;
  activeGame = createGame(canvas, levelForRun, {
    onWin: () => finishLevel(true, levelForRun),
    onLose: () => finishLevel(false, levelForRun),
    playerImage,
    catImage: levelForRun.photo ? catImages.get(levelForRun.photo) ?? null : null,
  });
  activeGame.start();
}

/**
 * @param {boolean} won
 * @param {import('./levels.js').LEVELS[number]} [levelOverride]
 */
function finishLevel(won, levelOverride) {
  activeGame?.stop();
  stopSpeech();
  const level = levelOverride ?? LEVELS.find((l) => l.id === currentLevelId);
  const hasNext = currentLevelId < LEVELS.length;

  // Fotoğraf yalnızca yakalanma ekranında
  hideCatchPortrait();

  if (won) {
    const next = Math.min(LEVELS.length, currentLevelId + 1);
    progress = { level: hasNext ? next : LEVELS.length };
    saveProgress(progress.level);

    if (level?.kind === "player") {
      openFinalLetter();
      return;
    }

    resultTitle.textContent = "Kurtardın!";
    resultText.textContent = `${level?.title ?? "Kedi"} artık güvende.`;
    btnNext.hidden = !hasNext;
    btnNext.textContent = hasNext
      ? currentLevelId + 1 === LEVELS.length
        ? "Son bölüm: Eve dön"
        : "Devam"
      : "Bitti";
  } else {
    resultTitle.textContent = "Yakalandı!";
    resultText.textContent = "";
    showCatchPortrait(level);
    btnNext.hidden = true;
  }

  show("result");
}

document.getElementById("btn-start")?.addEventListener("click", () => {
  startLevel(progress.level);
});

document.getElementById("btn-retry")?.addEventListener("click", () => startLevel(currentLevelId));

document.getElementById("btn-next")?.addEventListener("click", () => {
  if (currentLevelId < LEVELS.length) startLevel(currentLevelId + 1);
  else show("menu");
});

document.getElementById("btn-menu")?.addEventListener("click", () => {
  activeGame?.stop();
  stopSpeech();
  stopMusic();
  clearLetterTimers();
  document.body.classList.remove("is-letter-mode");
  show("menu");
});

document.getElementById("btn-letter-close")?.addEventListener("click", () => {
  clearLetterTimers();
  stopMusic();
  document.body.classList.remove("is-letter-mode");
  show("menu");
});

touchPad?.querySelectorAll("[data-dir]").forEach((btn) => {
  const dir = btn.getAttribute("data-dir");
  const set = (pressed) => activeGame?.setTouch(dir, pressed);
  btn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    btn.setPointerCapture(e.pointerId);
    set(true);
  });
  btn.addEventListener("pointerup", () => set(false));
  btn.addEventListener("pointercancel", () => set(false));
  btn.addEventListener("lostpointercapture", () => set(false));
});

canvas?.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  canvas.setPointerCapture(e.pointerId);
  activeGame?.setHold(true);
});
canvas?.addEventListener("pointerup", () => activeGame?.setHold(false));
canvas?.addEventListener("pointercancel", () => activeGame?.setHold(false));
canvas?.addEventListener("lostpointercapture", () => activeGame?.setHold(false));

show("menu");
