/**
 * @typedef {{
 *   id: number,
 *   title: string,
 *   color: string,
 *   kind: 'cat' | 'player',
 *   worldW: number,
 *   dogCount: number,
 *   dogSpeed: number,
 *   dogSpawnEvery: number,
 *   platforms: Array<{x:number,y:number,w:number,h:number}>,
 *   photo?: string,
 *   voiceLine?: string,
 *   voiceSrc?: string,
 *   voiceEvery?: number,
 *   mamas?: Array<{x:number,y:number}>,
 *   photoCrop?: { sx: number, sy: number, sw: number, sh: number },
 *   musicSrc?: string,
 * }} Level
 */

const GROUND_Y = 460;
const VIEW_W = 960;
const VIEW_H = 540;

/** @type {Level[]} */
export const LEVELS = [
  {
    id: 1,
    title: "Şila",
    color: "#d9b38c",
    kind: "cat",
    worldW: 2200,
    dogCount: 2,
    dogSpeed: 95,
    dogSpawnEvery: 3.2,
    photo: "assets/cats/shila.png",
    voiceLine: "annecim annecim",
    voiceSrc: "assets/sfx/shila-annecim.mp3",
    voiceEvery: 5.5,
    mamas: [
      { x: 560, y: 432 },
      { x: 1020, y: 432 },
      { x: 1480, y: 268 },
    ],
    platforms: [
      { x: 420, y: 360, w: 140, h: 22 },
      { x: 780, y: 300, w: 150, h: 22 },
      { x: 1180, y: 340, w: 160, h: 22 },
      { x: 1550, y: 290, w: 140, h: 22 },
    ],
  },
  {
    id: 2,
    title: "Sütlaç",
    color: "#f2f0ea",
    kind: "cat",
    worldW: 2600,
    dogCount: 2,
    dogSpeed: 100,
    dogSpawnEvery: 2.8,
    photo: "assets/cats/sutlac.png",
    photoCrop: { sx: 0.22, sy: 0.02, sw: 0.56, sh: 0.92 },
    voiceLine: "miyav miyav",
    voiceEvery: 5.1,
    platforms: [
      { x: 380, y: 370, w: 120, h: 22 },
      { x: 620, y: 300, w: 130, h: 22 },
      { x: 920, y: 250, w: 140, h: 22 },
      { x: 1280, y: 330, w: 150, h: 22 },
      { x: 1650, y: 280, w: 130, h: 22 },
      { x: 1980, y: 340, w: 140, h: 22 },
    ],
  },
  {
    id: 3,
    title: "Haşerya",
    color: "#6b5344",
    kind: "cat",
    worldW: 3000,
    dogCount: 2,
    dogSpeed: 105,
    dogSpawnEvery: 2.6,
    photo: "assets/cats/haserya.png",
    photoCrop: { sx: 0.22, sy: 0.02, sw: 0.56, sh: 0.58 },
    voiceLine: "annecim annecim",
    voiceSrc: "assets/sfx/shila-annecim.mp3",
    voiceEvery: 5.5,
    platforms: [
      { x: 360, y: 360, w: 110, h: 22 },
      { x: 580, y: 290, w: 120, h: 22 },
      { x: 860, y: 230, w: 130, h: 22 },
      { x: 1160, y: 310, w: 120, h: 22 },
      { x: 1450, y: 250, w: 140, h: 22 },
      { x: 1780, y: 330, w: 130, h: 22 },
      { x: 2100, y: 270, w: 140, h: 22 },
      { x: 2450, y: 320, w: 120, h: 22 },
    ],
  },
  {
    id: 4,
    title: "Miniş",
    color: "#c9a27a",
    kind: "cat",
    worldW: 3400,
    dogCount: 2,
    dogSpeed: 108,
    dogSpawnEvery: 2.5,
    photo: "assets/cats/minis.png",
    photoCrop: { sx: 0.12, sy: 0.1, sw: 0.76, sh: 0.72 },
    voiceLine: "annecim annecim",
    voiceSrc: "assets/sfx/shila-annecim.mp3",
    voiceEvery: 5.5,
    platforms: [
      { x: 340, y: 370, w: 100, h: 22 },
      { x: 560, y: 300, w: 110, h: 22 },
      { x: 820, y: 240, w: 120, h: 22 },
      { x: 1100, y: 300, w: 100, h: 22 },
      { x: 1380, y: 230, w: 130, h: 22 },
      { x: 1700, y: 310, w: 120, h: 22 },
      { x: 2020, y: 250, w: 110, h: 22 },
      { x: 2340, y: 330, w: 130, h: 22 },
      { x: 2680, y: 270, w: 120, h: 22 },
      { x: 2980, y: 330, w: 110, h: 22 },
    ],
  },
  {
    id: 5,
    title: "Tüylü",
    color: "#8a7a66",
    kind: "cat",
    worldW: 2200,
    dogCount: 2,
    dogSpeed: 120,
    dogSpawnEvery: 2.8,
    photo: "assets/cats/tuyulu.png",
    photoCrop: { sx: 0.14, sy: 0.12, sw: 0.72, sh: 0.7 },
    voiceLine: "miyav miyav",
    voiceEvery: 5.3,
    platforms: [
      { x: 380, y: 360, w: 120, h: 22 },
      { x: 720, y: 300, w: 130, h: 22 },
      { x: 1100, y: 250, w: 140, h: 22 },
      { x: 1500, y: 320, w: 130, h: 22 },
      { x: 1850, y: 280, w: 120, h: 22 },
    ],
  },
  {
    id: 6,
    title: "Ahmet",
    color: "#e8d5c4",
    kind: "player",
    worldW: 4200,
    dogCount: 2,
    dogSpeed: 110,
    dogSpawnEvery: 2.4,
    musicSrc: "assets/sfx/ahmet-song.mp3",
    platforms: [
      { x: 300, y: 370, w: 100, h: 22 },
      { x: 520, y: 300, w: 100, h: 22 },
      { x: 760, y: 240, w: 110, h: 22 },
      { x: 1020, y: 300, w: 100, h: 22 },
      { x: 1300, y: 220, w: 120, h: 22 },
      { x: 1600, y: 290, w: 100, h: 22 },
      { x: 1900, y: 230, w: 110, h: 22 },
      { x: 2220, y: 310, w: 120, h: 22 },
      { x: 2540, y: 240, w: 110, h: 22 },
      { x: 2860, y: 300, w: 120, h: 22 },
      { x: 3180, y: 250, w: 110, h: 22 },
      { x: 3500, y: 320, w: 120, h: 22 },
      { x: 3800, y: 270, w: 110, h: 22 },
    ],
  },
];

export const VIEW = { W: VIEW_W, H: VIEW_H, GROUND_Y };

export const STORAGE_KEY = "eve-donme-progress";

export function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { level: 1 };
    const data = JSON.parse(raw);
    return { level: Math.min(LEVELS.length, Math.max(1, Number(data.level) || 1)) };
  } catch {
    return { level: 1 };
  }
}

export function saveProgress(level) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ level }));
}
