/** @typedef {{ id: number, catName: string, catColor: string, dogs: number, dogSpeed: number, catSpeed: number, mapW: number, mapH: number }} Level */

/** @type {Level[]} */
export const LEVELS = [
  {
    id: 1,
    catName: "Şila",
    catColor: "#d9b38c",
    dogs: 1,
    dogSpeed: 78,
    catSpeed: 145,
    mapW: 960,
    mapH: 540,
  },
  {
    id: 2,
    catName: "Sütlaç",
    catColor: "#f2f0ea",
    dogs: 2,
    dogSpeed: 88,
    catSpeed: 150,
    mapW: 960,
    mapH: 540,
  },
  {
    id: 3,
    catName: "Haşerya",
    catColor: "#6b5344",
    dogs: 2,
    dogSpeed: 100,
    catSpeed: 155,
    mapW: 960,
    mapH: 540,
  },
  {
    id: 4,
    catName: "Miniş",
    catColor: "#c9a27a",
    dogs: 3,
    dogSpeed: 105,
    catSpeed: 160,
    mapW: 960,
    mapH: 540,
  },
  {
    id: 5,
    catName: "Tüylü",
    catColor: "#8a7a66",
    dogs: 3,
    dogSpeed: 118,
    catSpeed: 165,
    mapW: 960,
    mapH: 540,
  },
];

export const STORAGE_KEY = "rumis-rescue-progress";

export function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { unlocked: 1 };
    const data = JSON.parse(raw);
    return { unlocked: Math.max(1, Number(data.unlocked) || 1) };
  } catch {
    return { unlocked: 1 };
  }
}

export function saveProgress(unlocked) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ unlocked }));
}
