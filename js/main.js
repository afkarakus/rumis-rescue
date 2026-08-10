import { LEVELS, loadProgress, saveProgress } from "./levels.js";
import { createGame } from "./game.js";

const screens = {
  menu: document.getElementById("screen-menu"),
  levels: document.getElementById("screen-levels"),
  play: document.getElementById("screen-play"),
  result: document.getElementById("screen-result"),
};

const levelGrid = document.getElementById("level-grid");
const canvas = document.getElementById("game");
const hudLevel = document.getElementById("hud-level");
const hudCat = document.getElementById("hud-cat");
const resultTitle = document.getElementById("result-title");
const resultText = document.getElementById("result-text");
const btnNext = document.getElementById("btn-next");
const touchPad = document.getElementById("touch-pad");

let progress = loadProgress();
let currentLevelId = 1;
/** @type {ReturnType<typeof createGame> | null} */
let activeGame = null;

function show(name) {
  Object.entries(screens).forEach(([key, el]) => {
    if (!el) return;
    const on = key === name;
    el.hidden = !on;
    el.classList.toggle("screen--active", on);
  });
}

function renderLevelGrid() {
  if (!levelGrid) return;
  levelGrid.innerHTML = "";
  LEVELS.forEach((level) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "level-card";
    btn.disabled = level.id > progress.unlocked;
    btn.innerHTML = `<strong>Bölüm ${level.id}</strong><span>${level.catName} · ${level.dogs} köpek</span>`;
    btn.addEventListener("click", () => startLevel(level.id));
    levelGrid.appendChild(btn);
  });
}

function startLevel(id) {
  const level = LEVELS.find((l) => l.id === id);
  if (!level || !canvas) return;

  currentLevelId = id;
  activeGame?.stop();

  hudLevel.textContent = `Bölüm ${level.id}`;
  hudCat.textContent = level.catName;
  show("play");

  activeGame = createGame(canvas, level, {
    onWin: () => finishLevel(true),
    onLose: () => finishLevel(false),
  });
  activeGame.start();
}

function finishLevel(won) {
  activeGame?.stop();
  const level = LEVELS.find((l) => l.id === currentLevelId);
  const hasNext = currentLevelId < LEVELS.length;

  if (won) {
    const unlocked = Math.max(progress.unlocked, currentLevelId + 1);
    progress = { unlocked };
    saveProgress(unlocked);
    resultTitle.textContent = "Kurtardın!";
    resultText.textContent = `${level?.catName ?? "Kedi"} artık Rumis'in evinde güvende.`;
    btnNext.hidden = !hasNext;
    btnNext.textContent = hasNext ? "Sonraki bölüm" : "Tamamlandı";
  } else {
    resultTitle.textContent = "Yakalandı!";
    resultText.textContent = "Köpek kediyi yakaladı. Tekrar dene — eve kadar götür.";
    btnNext.hidden = true;
  }

  show("result");
}

document.getElementById("btn-start")?.addEventListener("click", () => {
  startLevel(Math.min(progress.unlocked, LEVELS.length));
});

document.getElementById("btn-levels")?.addEventListener("click", () => {
  renderLevelGrid();
  show("levels");
});

document.getElementById("btn-levels-back")?.addEventListener("click", () => show("menu"));

document.getElementById("btn-retry")?.addEventListener("click", () => startLevel(currentLevelId));

document.getElementById("btn-next")?.addEventListener("click", () => {
  if (currentLevelId < LEVELS.length) startLevel(currentLevelId + 1);
  else show("menu");
});

document.getElementById("btn-menu")?.addEventListener("click", () => {
  activeGame?.stop();
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
  btn.addEventListener("pointerleave", () => set(false));
});

show("menu");
