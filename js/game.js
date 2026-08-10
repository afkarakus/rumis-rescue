import { VIEW } from "./levels.js";
import { speakLine, stopSpeech } from "./voice.js";

/**
 * @typedef {import('./levels.js').Level} Level
 * @typedef {{ x: number, y: number, w: number, h: number, vx: number, vy: number, onGround: boolean, facing: 1 | -1 }} Actor
 * @typedef {{ x: number, y: number, w: number, h: number, speed: number }} Dog
 */

const keys = new Set();

window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " ", "space"].includes(k) || e.code === "Space") {
    e.preventDefault();
    keys.add(k === " " ? "space" : k);
    if (e.code === "Space") keys.add("space");
  }
});

window.addEventListener("keyup", (e) => {
  const k = e.key.toLowerCase();
  keys.delete(k === " " ? "space" : k);
  if (e.code === "Space") keys.delete("space");
});

/**
 * @param {HTMLCanvasElement} canvas
 * @param {Level} level
 * @param {{ onWin: () => void, onLose: () => void, playerImage?: HTMLImageElement | null, catImage?: HTMLImageElement | null }} hooks
 */
export function createGame(canvas, level, hooks) {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas desteklenmiyor");

  canvas.width = VIEW.W;
  canvas.height = VIEW.H;

  const hasCatPhoto = Boolean(level.photo && hooks.catImage);
  const gravity = 1900;
  const moveSpeed = level.kind === "player" ? 240 : 265;
  const jumpForce = level.kind === "player" ? 720 : 760;
  const touchPlay =
    window.matchMedia("(pointer: coarse)").matches ||
    window.matchMedia("(max-width: 720px)").matches ||
    "ontouchstart" in window;
  const ground = { x: 0, y: VIEW.GROUND_Y, w: level.worldW, h: VIEW.H - VIEW.GROUND_Y };
  const solids = [ground, ...level.platforms];

  const house = {
    x: level.worldW - 170,
    y: VIEW.GROUND_Y - 140,
    w: 130,
    h: 140,
  };

  const bodyH = level.kind === "player" ? 64 : hasCatPhoto ? 56 : 42;
  const bodyW = level.kind === "player" ? 44 : hasCatPhoto ? 48 : 36;

  /** @type {Actor} */
  const player = {
    x: 80,
    y: VIEW.GROUND_Y - bodyH,
    w: bodyW,
    h: bodyH,
    vx: 0,
    vy: 0,
    onGround: false,
    facing: 1,
  };

  /** @type {Dog[]} */
  const dogs = [];
  let dogsSpawned = 0;
  let spawnTimer = 2.4;
  let cameraX = 0;
  let running = false;
  let ended = false;
  let last = 0;
  let raf = 0;
  let time = 0;
  let jumpBuffered = false;
  let chaseWarmup = 1.8;
  let voiceTimer = 0.8;
  let bubbleUntil = 0;
  let bubbleText = "";
  let holding = false;
  let mamaPaused = false;
  let holdProgress = 0;
  const HOLD_NEED = 1.35;

  /** @type {Array<{x:number,y:number,w:number,h:number,taken:boolean}>} */
  const mamas = (level.mamas ?? []).map((m) => ({
    x: m.x,
    y: m.y,
    w: 36,
    h: 28,
    taken: false,
  }));
  /** @type {typeof mamas[number] | null} */
  let activeMama = null;

  /** @type {Record<string, boolean>} */
  const touch = { left: false, right: false, jump: false };

  const wantsLeft = () => keys.has("arrowleft") || keys.has("a") || touch.left;
  const wantsRight = () => keys.has("arrowright") || keys.has("d") || touch.right;
  const wantsJump = () =>
    keys.has("arrowup") || keys.has("w") || keys.has("space") || touch.jump || jumpBuffered;

  const overlap = (a, b) =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  const resolveSolid = (actor, solid) => {
    if (!overlap(actor, solid)) return;

    const prevBottom = actor.y + actor.h - actor.vy * (1 / 60);
    const fromAbove = prevBottom <= solid.y + 4 && actor.vy >= 0;

    if (fromAbove) {
      actor.y = solid.y - actor.h;
      actor.vy = 0;
      actor.onGround = true;
      return;
    }

    const overlapX = Math.min(actor.x + actor.w, solid.x + solid.w) - Math.max(actor.x, solid.x);
    const overlapY = Math.min(actor.y + actor.h, solid.y + solid.h) - Math.max(actor.y, solid.y);

    if (overlapX < overlapY) {
      if (actor.x + actor.w / 2 < solid.x + solid.w / 2) actor.x = solid.x - actor.w;
      else actor.x = solid.x + solid.w;
      actor.vx = 0;
    } else if (actor.vy < 0) {
      actor.y = solid.y + solid.h;
      actor.vy = 0;
    }
  };

  const spawnDog = () => {
    if (dogsSpawned >= level.dogCount) return;
    dogsSpawned += 1;
    const pressure = Math.min(1, dogsSpawned / level.dogCount);
    const gap = 220 - pressure * 90;
    const ahead = cameraX + VIEW.W + gap + Math.random() * 160;
    dogs.push({
      x: Math.min(ahead, house.x - 60),
      y: VIEW.GROUND_Y - 34,
      w: 46,
      h: 34,
      speed: level.dogSpeed * (0.72 + pressure * 0.35) + time * 3,
    });
  };

  const isHolding = () =>
    holding ||
    touch.left ||
    touch.right ||
    touch.jump ||
    keys.has("arrowleft") ||
    keys.has("arrowright") ||
    keys.has("arrowup") ||
    keys.has("arrowdown") ||
    keys.has("a") ||
    keys.has("d") ||
    keys.has("w") ||
    keys.has("s") ||
    keys.has("space");

  const drawMama = (mama) => {
    if (mama.taken) return;
    const x = mama.x - cameraX;
    const y = mama.y;
    const bob = Math.sin(time * 4 + mama.x * 0.02) * 2;

    // bowl
    ctx.fillStyle = "#f4efe6";
    ctx.beginPath();
    ctx.ellipse(x + mama.w / 2, y + mama.h - 4 + bob, 16, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c47a52";
    ctx.beginPath();
    ctx.ellipse(x + mama.w / 2, y + mama.h - 8 + bob, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    // kibbles
    ctx.fillStyle = "#9a5a38";
    for (let i = 0; i < 5; i += 1) {
      ctx.beginPath();
      ctx.arc(x + 10 + i * 4, y + mama.h - 10 + bob + (i % 2), 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#2a4a35";
    ctx.font = "800 11px Nunito, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("mama", x + mama.w / 2, y - 2 + bob);
  };

  const drawMamaOverlay = () => {
    if (!mamaPaused) return;

    ctx.fillStyle = "rgba(30, 42, 34, 0.35)";
    ctx.fillRect(0, 0, VIEW.W, VIEW.H);

    const lines = [
      "Şila mama gördü, kafası karıştı!",
      "Basılı tutun ekrana / tuşa",
    ];
    ctx.font = "800 18px Nunito, sans-serif";
    const maxW = Math.max(...lines.map((l) => ctx.measureText(l).width));
    const bw = maxW + 48;
    const bh = 108;
    const bx = (VIEW.W - bw) / 2;
    const by = VIEW.H * 0.28;

    ctx.fillStyle = "rgba(255,255,255,0.96)";
    roundRect(ctx, bx, by, bw, bh, 18);
    ctx.fill();
    ctx.strokeStyle = "rgba(196,122,82,0.55)";
    ctx.lineWidth = 3;
    roundRect(ctx, bx, by, bw, bh, 18);
    ctx.stroke();

    ctx.fillStyle = "#2a4a35";
    ctx.textAlign = "center";
    ctx.fillText(lines[0], VIEW.W / 2, by + 34);
    ctx.font = "700 15px Nunito, sans-serif";
    ctx.fillStyle = "#3d4f42";
    ctx.fillText(lines[1], VIEW.W / 2, by + 58);

    // hold bar
    const barW = bw - 48;
    const barX = bx + 24;
    const barY = by + bh - 28;
    ctx.fillStyle = "rgba(63,107,78,0.18)";
    roundRect(ctx, barX, barY, barW, 12, 6);
    ctx.fill();
    ctx.fillStyle = "#c47a52";
    roundRect(ctx, barX, barY, Math.max(8, barW * (holdProgress / HOLD_NEED)), 12, 6);
    ctx.fill();
  };

  const sayVoice = () => {
    if (!level.voiceLine || mamaPaused) return;
    bubbleText = level.voiceLine;
    bubbleUntil = time + 2.2;
    speakLine(level.voiceLine, {
      mood: "scared-sweet",
      audioSrc: level.voiceSrc ?? null,
    });
  };

  const drawSky = () => {
    const g = ctx.createLinearGradient(0, 0, 0, VIEW.H);
    g.addColorStop(0, "#9fd0ef");
    g.addColorStop(0.55, "#cfe8c4");
    g.addColorStop(1, "#8fbc78");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW.W, VIEW.H);

    ctx.fillStyle = "rgba(255,255,255,0.55)";
    for (let i = 0; i < 6; i += 1) {
      const cx = ((i * 280 - cameraX * 0.2) % (VIEW.W + 200)) - 40;
      const cy = 50 + (i % 3) * 28;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 48, 20, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 30, cy + 6, 36, 16, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const drawWorld = () => {
    ctx.fillStyle = "#6b9e4e";
    ctx.fillRect(-cameraX, ground.y, level.worldW, ground.h);
    ctx.fillStyle = "#4f7d38";
    ctx.fillRect(-cameraX, ground.y, level.worldW, 10);

    for (const p of level.platforms) {
      ctx.fillStyle = "#8b5a2b";
      ctx.fillRect(p.x - cameraX, p.y, p.w, p.h);
      ctx.fillStyle = "#c47a52";
      ctx.fillRect(p.x - cameraX, p.y, p.w, 6);
    }

    ctx.fillStyle = "#3f6b4e";
    for (let i = 0; i < level.worldW; i += 220) {
      const bx = i - cameraX;
      ctx.beginPath();
      ctx.ellipse(bx + 30, ground.y - 8, 28, 16, 0, 0, Math.PI * 2);
      ctx.ellipse(bx + 52, ground.y - 12, 24, 18, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const drawHouse = () => {
    const x = house.x - cameraX;
    const { y, w, h } = house;
    ctx.fillStyle = "#e8d7c0";
    ctx.fillRect(x + 12, y + 42, w - 24, h - 42);
    ctx.fillStyle = "#9a5a38";
    ctx.beginPath();
    ctx.moveTo(x, y + 50);
    ctx.lineTo(x + w / 2, y);
    ctx.lineTo(x + w, y + 50);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#6b4a32";
    ctx.fillRect(x + w / 2 - 16, y + h - 52, 32, 52);
    ctx.fillStyle = "#7eb6d6";
    ctx.fillRect(x + 24, y + 62, 22, 18);
    ctx.fillRect(x + w - 46, y + 62, 22, 18);
    ctx.fillStyle = "#2a4a35";
    ctx.font = "800 14px Nunito, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Rumis'in Evi", x + w / 2, y - 8);
  };

  const roundRect = (c, x, y, w, h, r) => {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  };

  const drawCatFallback = (x, y, w, h, color) => {
    const bob = player.onGround ? Math.sin(time * 10) * 1.5 : 0;
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2 + bob);
    ctx.scale(player.facing, 1);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 6, 15, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(2, -8, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-6, -14);
    ctx.lineTo(-10, -24);
    ctx.lineTo(-1, -16);
    ctx.moveTo(8, -14);
    ctx.lineTo(12, -24);
    ctx.lineTo(3, -16);
    ctx.fill();
    ctx.fillStyle = "#1e2a22";
    ctx.beginPath();
    ctx.arc(0, -9, 1.5, 0, Math.PI * 2);
    ctx.arc(6, -9, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-14, 4);
    ctx.quadraticCurveTo(-26, -4 + Math.sin(time * 8) * 3, -30, 8);
    ctx.stroke();
    ctx.restore();
  };

  const drawCatPhoto = (x, y, w, h) => {
    const img = hooks.catImage;
    const bob = player.onGround ? Math.sin(time * 9) * 2 : 0;
    const tilt = player.vx !== 0 ? player.facing * 0.08 : 0;

    ctx.fillStyle = "rgba(30,42,34,0.22)";
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h + 4, w * 0.42, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(x + w / 2, y + h / 2 + bob);
    ctx.rotate(tilt);
    ctx.scale(player.facing, 1);

    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.ellipse(0, 0, w / 2 + 3, h / 2 + 3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.clip();

    if (img && img.complete && img.naturalWidth) {
      const crop = level.photoCrop ?? { sx: 0.18, sy: 0.02, sw: 0.64, sh: 0.78 };
      const sx = img.naturalWidth * crop.sx;
      const sy = img.naturalHeight * crop.sy;
      const sw = img.naturalWidth * crop.sw;
      const sh = img.naturalHeight * crop.sh;
      ctx.drawImage(img, sx, sy, sw, sh, -w / 2, -h / 2, w, h);
    } else {
      ctx.fillStyle = level.color;
      ctx.fillRect(-w / 2, -h / 2, w, h);
    }
    ctx.restore();

    ctx.save();
    ctx.translate(x + w / 2, y + h / 2 + bob);
    ctx.rotate(tilt);
    ctx.strokeStyle = "rgba(42,74,53,0.4)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  };

  const drawPlayerPhoto = (x, y, w, h) => {
    const img = hooks.playerImage;
    ctx.save();
    roundRect(ctx, x, y, w, h, 10);
    ctx.clip();
    if (img && img.complete && img.naturalWidth) {
      const sw = img.naturalWidth * 0.72;
      const sh = img.naturalHeight * 0.62;
      const sx = img.naturalWidth * 0.14;
      const sy = img.naturalHeight * 0.05;
      ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
    } else {
      ctx.fillStyle = "#e8d5c4";
      ctx.fillRect(x, y, w, h);
    }
    ctx.restore();
    ctx.strokeStyle = "rgba(42,74,53,0.35)";
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, w, h, 10);
    ctx.stroke();
    ctx.fillStyle = "#d9c4a8";
    ctx.fillRect(x + 8, y + h - 2, w - 16, 10);
  };

  const drawSpeechBubble = (px, py) => {
    if (time > bubbleUntil || !bubbleText) return;
    const label = bubbleText;
    ctx.font = "800 14px Nunito, sans-serif";
    const tw = ctx.measureText(label).width;
    const bw = tw + 28;
    const bh = 34;
    const bx = px + player.w / 2 - bw / 2;
    const by = py - bh - 28;

    ctx.fillStyle = "rgba(255,255,255,0.95)";
    roundRect(ctx, bx, by, bw, bh, 14);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(px + player.w / 2 - 8, by + bh);
    ctx.lineTo(px + player.w / 2, by + bh + 10);
    ctx.lineTo(px + player.w / 2 + 8, by + bh);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#2a4a35";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, bx + bw / 2, by + bh / 2 + 1);
    ctx.textBaseline = "alphabetic";
  };

  const drawDog = (dog) => {
    const x = dog.x - cameraX;
    const y = dog.y;
    const run = Math.sin(time * 14 + dog.x * 0.05) * 2;
    ctx.save();
    ctx.translate(x + dog.w / 2, y + dog.h / 2 + run);
    ctx.scale(-1, 1);
    ctx.fillStyle = "#8b5a2b";
    ctx.beginPath();
    ctx.ellipse(0, 2, 18, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(14, -4, 10, 8, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5c3a1c";
    ctx.beginPath();
    ctx.ellipse(20, -8, 4, 6, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1e2a22";
    ctx.beginPath();
    ctx.arc(17, -5, 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#8b5a2b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-16, 2);
    ctx.quadraticCurveTo(-28, -4, -24, 10);
    ctx.stroke();
    ctx.restore();
  };

  const endGame = (won) => {
    ended = true;
    stopSpeech();
    if (won) hooks.onWin();
    else hooks.onLose();
  };

  const update = (dt) => {
    time += dt;

    // Mama distraction: oyun durur, basılı tutunca açılır
    if (mamaPaused) {
      if (isHolding()) {
        holdProgress += dt;
        if (holdProgress >= HOLD_NEED && activeMama) {
          activeMama.taken = true;
          activeMama = null;
          mamaPaused = false;
          holdProgress = 0;
          player.vx = 0;
          player.vy = 0;
        }
      } else {
        holdProgress = Math.max(0, holdProgress - dt * 1.6);
      }
      return;
    }

    for (const mama of mamas) {
      if (!mama.taken && overlap(player, mama)) {
        mamaPaused = true;
        activeMama = mama;
        holdProgress = 0;
        player.vx = 0;
        player.vy = 0;
        stopSpeech();
        return;
      }
    }

    if (level.voiceLine) {
      voiceTimer -= dt;
      if (voiceTimer <= 0) {
        sayVoice();
        voiceTimer = level.voiceEvery ?? 4.5;
      }
    }

    if (chaseWarmup > 0) chaseWarmup -= dt;
    else {
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnDog();
        const ramp = Math.max(0.55, level.dogSpawnEvery - time * 0.05);
        spawnTimer = ramp;
      }
    }

    let ax = 0;
    if (touchPlay) {
      // Telefonda otomatik sağa koş, dokunuşla zıpla
      ax = 1;
    } else {
      if (wantsLeft()) ax -= 1;
      if (wantsRight()) ax += 1;
    }
    player.vx = ax * moveSpeed;
    if (ax !== 0) player.facing = ax > 0 ? 1 : -1;

    if (wantsJump() && player.onGround) {
      player.vy = -jumpForce;
      player.onGround = false;
      jumpBuffered = false;
      keys.delete("space");
      keys.delete("arrowup");
      keys.delete("w");
    }

    player.vy += gravity * dt;
    player.x += player.vx * dt;
    player.y += player.vy * dt;
    player.onGround = false;

    if (player.x < 0) player.x = 0;
    if (player.x + player.w > level.worldW) player.x = level.worldW - player.w;

    for (const solid of solids) resolveSolid(player, solid);

    if (player.y > VIEW.H + 80) {
      endGame(false);
      return;
    }

    for (const dog of dogs) {
      dog.speed = Math.min(dog.speed + dt * 8, level.dogSpeed + 80);
      dog.x -= dog.speed * dt;
      if (overlap(player, dog)) {
        endGame(false);
        return;
      }
    }

    const door = {
      x: house.x + house.w / 2 - 18,
      y: house.y + house.h - 56,
      w: 36,
      h: 56,
    };
    if (overlap(player, door)) {
      endGame(true);
      return;
    }

    cameraX = Math.max(0, Math.min(player.x - VIEW.W * 0.35, level.worldW - VIEW.W));
  };

  const render = () => {
    drawSky();
    drawWorld();
    drawHouse();
    for (const mama of mamas) drawMama(mama);
    for (const dog of dogs) drawDog(dog);

    const px = player.x - cameraX;
    const py = player.y;
    if (level.kind === "player") drawPlayerPhoto(px, py, player.w, player.h - 8);
    else if (hasCatPhoto) drawCatPhoto(px, py, player.w, player.h);
    else drawCatFallback(px, py, player.w, player.h, level.color);

    if (!mamaPaused) drawSpeechBubble(px, py);

    ctx.fillStyle = "#1e2a22";
    ctx.font = "800 13px Nunito, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(level.title, px + player.w / 2, py - (time < bubbleUntil && !mamaPaused ? 58 : 12));

    const progress = Math.min(1, player.x / (house.x - 40));
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillRect(24, 16, VIEW.W - 48, 10);
    ctx.fillStyle = "#c47a52";
    ctx.fillRect(24, 16, (VIEW.W - 48) * progress, 10);

    drawMamaOverlay();
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
      if (level.voiceLine) voiceTimer = 0.6;
      render();
      raf = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
      stopSpeech();
      keys.clear();
      Object.keys(touch).forEach((k) => {
        touch[k] = false;
      });
    },
    setTouch(dir, pressed) {
      if (dir === "jump") {
        touch.jump = pressed;
        if (pressed) jumpBuffered = true;
        return;
      }
      if (dir in touch) touch[dir] = pressed;
    },
    setHold(pressed) {
      holding = pressed;
      // Mobilde ekrana basmak = zıpla (+ mama sırasında basılı tut)
      if (touchPlay) {
        touch.jump = pressed;
        if (pressed) jumpBuffered = true;
      }
    },
  };
}
