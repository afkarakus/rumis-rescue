/**
 * @typedef {import('./levels.js').Level} Level
 * @typedef {{ x: number, y: number, r: number, speed: number, color: string, name: string }} Cat
 * @typedef {{ x: number, y: number, r: number, speed: number, vx: number, vy: number, pauseUntil: number }} Dog
 * @typedef {{ x: number, y: number, w: number, h: number }} House
 */

const keys = new Set();

window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(k)) {
    e.preventDefault();
    keys.add(k);
  }
});

window.addEventListener("keyup", (e) => {
  keys.delete(e.key.toLowerCase());
});

/**
 * @param {HTMLCanvasElement} canvas
 * @param {Level} level
 * @param {{ onWin: () => void, onLose: () => void }} hooks
 */
export function createGame(canvas, level, hooks) {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas desteklenmiyor");

  canvas.width = level.mapW;
  canvas.height = level.mapH;

  /** @type {Cat} */
  const cat = {
    x: 90,
    y: level.mapH / 2,
    r: 18,
    speed: level.catSpeed,
    color: level.catColor,
    name: level.catName,
  };

  /** @type {House} */
  const house = {
    x: level.mapW - 150,
    y: level.mapH / 2 - 70,
    w: 120,
    h: 130,
  };

  /** @type {Dog[]} */
  const dogs = [];
  for (let i = 0; i < level.dogs; i += 1) {
    dogs.push({
      x: 280 + i * 140,
      y: 100 + ((i * 137) % (level.mapH - 160)),
      r: 20,
      speed: level.dogSpeed + i * 6,
      vx: 0,
      vy: 0,
      pauseUntil: 0,
    });
  }

  /** @type {Record<string, boolean>} */
  const touch = { up: false, down: false, left: false, right: false };

  let running = false;
  let ended = false;
  let last = 0;
  let raf = 0;
  let time = 0;

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  const inputVector = () => {
    let x = 0;
    let y = 0;
    if (keys.has("arrowleft") || keys.has("a") || touch.left) x -= 1;
    if (keys.has("arrowright") || keys.has("d") || touch.right) x += 1;
    if (keys.has("arrowup") || keys.has("w") || touch.up) y -= 1;
    if (keys.has("arrowdown") || keys.has("s") || touch.down) y += 1;
    const len = Math.hypot(x, y) || 1;
    return { x: x / len, y: y / len };
  };

  const drawBackground = () => {
    const g = ctx.createLinearGradient(0, 0, 0, level.mapH);
    g.addColorStop(0, "#9ecf7a");
    g.addColorStop(1, "#6fa85a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, level.mapW, level.mapH);

    ctx.fillStyle = "rgba(255,255,255,0.12)";
    for (let i = 0; i < 18; i += 1) {
      const px = (i * 97 + 40) % level.mapW;
      const py = (i * 63 + 30) % level.mapH;
      ctx.beginPath();
      ctx.ellipse(px, py, 18, 10, 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // path to house
    ctx.fillStyle = "rgba(210, 180, 120, 0.55)";
    ctx.beginPath();
    ctx.moveTo(40, level.mapH / 2 - 28);
    ctx.lineTo(house.x + 20, house.y + house.h - 20);
    ctx.lineTo(house.x + 70, house.y + house.h);
    ctx.lineTo(60, level.mapH / 2 + 36);
    ctx.closePath();
    ctx.fill();
  };

  const drawHouse = () => {
    const { x, y, w, h } = house;
    ctx.fillStyle = "#e8d7c0";
    ctx.fillRect(x + 10, y + 40, w - 20, h - 40);

    ctx.fillStyle = "#9a5a38";
    ctx.beginPath();
    ctx.moveTo(x, y + 48);
    ctx.lineTo(x + w / 2, y);
    ctx.lineTo(x + w, y + 48);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#6b4a32";
    ctx.fillRect(x + w / 2 - 14, y + h - 46, 28, 46);

    ctx.fillStyle = "#7eb6d6";
    ctx.fillRect(x + 22, y + 58, 22, 18);
    ctx.fillRect(x + w - 44, y + 58, 22, 18);

    ctx.fillStyle = "#2a4a35";
    ctx.font = "700 14px Nunito, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Rumis'in Evi", x + w / 2, y - 8);
  };

  const drawCat = () => {
    const bob = Math.sin(time * 8) * 1.5;
    ctx.save();
    ctx.translate(cat.x, cat.y + bob);

    ctx.fillStyle = cat.color;
    ctx.beginPath();
    ctx.ellipse(0, 6, 16, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -8, 11, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-10, -14);
    ctx.lineTo(-14, -24);
    ctx.lineTo(-4, -16);
    ctx.moveTo(10, -14);
    ctx.lineTo(14, -24);
    ctx.lineTo(4, -16);
    ctx.fill();

    ctx.fillStyle = "#1e2a22";
    ctx.beginPath();
    ctx.arc(-4, -9, 1.6, 0, Math.PI * 2);
    ctx.arc(4, -9, 1.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = cat.color;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(14, 4);
    ctx.quadraticCurveTo(28, -2 + Math.sin(time * 6) * 4, 34, 8);
    ctx.stroke();

    ctx.restore();

    ctx.fillStyle = "#1e2a22";
    ctx.font = "800 13px Nunito, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(cat.name, cat.x, cat.y - 34);
  };

  const drawDog = (dog) => {
    ctx.save();
    ctx.translate(dog.x, dog.y);
    ctx.fillStyle = "#8b5a2b";
    ctx.beginPath();
    ctx.ellipse(0, 4, 18, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(14, -4, 10, 8, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5c3a1c";
    ctx.beginPath();
    ctx.ellipse(20, -8, 4, 6, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1e2a22";
    ctx.beginPath();
    ctx.arc(17, -5, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#8b5a2b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-16, 2);
    ctx.quadraticCurveTo(-28, -6, -26, 8);
    ctx.stroke();
    ctx.restore();
  };

  const update = (dt) => {
    time += dt;
    const dir = inputVector();
    cat.x = clamp(cat.x + dir.x * cat.speed * dt, cat.r + 4, level.mapW - cat.r - 4);
    cat.y = clamp(cat.y + dir.y * cat.speed * dt, cat.r + 4, level.mapH - cat.r - 4);

    for (const dog of dogs) {
      if (time < dog.pauseUntil) continue;
      const dx = cat.x - dog.x;
      const dy = cat.y - dog.y;
      const dist = Math.hypot(dx, dy) || 1;
      dog.vx = (dx / dist) * dog.speed;
      dog.vy = (dy / dist) * dog.speed;
      dog.x = clamp(dog.x + dog.vx * dt, dog.r, level.mapW - dog.r);
      dog.y = clamp(dog.y + dog.vy * dt, dog.r, level.mapH - dog.r);

      if (dist < cat.r + dog.r - 4) {
        ended = true;
        hooks.onLose();
        return;
      }
    }

    const doorX = house.x + house.w / 2;
    const doorY = house.y + house.h - 20;
    if (Math.hypot(cat.x - doorX, cat.y - doorY) < 28) {
      ended = true;
      hooks.onWin();
    }
  };

  const render = () => {
    drawBackground();
    drawHouse();
    for (const dog of dogs) drawDog(dog);
    drawCat();
  };

  const frame = (now) => {
    if (!running || ended) return;
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    update(dt);
    render();
    if (!ended) raf = requestAnimationFrame(frame);
  };

  return {
    start() {
      running = true;
      ended = false;
      last = performance.now();
      render();
      raf = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
      keys.clear();
      Object.keys(touch).forEach((k) => {
        touch[k] = false;
      });
    },
    setTouch(dir, pressed) {
      if (dir in touch) touch[dir] = pressed;
    },
  };
}
