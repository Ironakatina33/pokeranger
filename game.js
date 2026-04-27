/* Nature Wardens — Loop of Tides
 * Fan-made, gameplay inspire des jeux ranger. Univers et noms originaux. */
"use strict";

const topCanvas = document.getElementById("topCanvas");
const bottomCanvas = document.getElementById("bottomCanvas");
const topCtx = topCanvas.getContext("2d");
const botCtx = bottomCanvas.getContext("2d");
topCtx.imageSmoothingEnabled = false;
botCtx.imageSmoothingEnabled = false;

const SCREEN_W = 640, SCREEN_H = 384, TILE = 32;
const COLS = SCREEN_W / TILE, ROWS = SCREEN_H / TILE;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const dist = (x1, y1, x2, y2) => Math.hypot(x1 - x2, y1 - y2);

function rrect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
function px(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(x | 0, y | 0, w | 0, h | 0); }
function pointInPolygon(p, pg) {
  let ins = false;
  for (let i = 0, j = pg.length - 1; i < pg.length; j = i, i++) {
    const xi = pg[i].x, yi = pg[i].y, xj = pg[j].x, yj = pg[j].y;
    if (yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}
function polygonArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) { const j = (i + 1) % pts.length; a += pts[i].x * pts[j].y - pts[j].x * pts[i].y; }
  return a / 2;
}
function distPointSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  if (dx === 0 && dy === 0) return Math.hypot(px - ax, py - ay);
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy), 0, 1);
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
function wrapText(c, text, x, y, maxW, lh, align = "left") {
  const words = text.split(" "); let line = ""; let cy = y;
  c.textAlign = align;
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (c.measureText(test).width > maxW && line) {
      c.fillText(line, align === "center" ? x + maxW / 2 : x, cy); line = w; cy += lh;
    } else line = test;
  }
  if (line) c.fillText(line, align === "center" ? x + maxW / 2 : x, cy);
}

const Input = {
  keys: new Set(), pressed: new Set(), dirs: new Set(),
  aPressed: false, bPressed: false, aHeld: false, bHeld: false,
  pointer: { x: 0, y: 0, down: false, id: null, startedNow: false, releasedNow: false }
};
function pressKey(code) {
  if (!Input.keys.has(code)) Input.pressed.add(code);
  Input.keys.add(code);
  if (code === "Space" || code === "Enter" || code === "KeyJ") { Input.aPressed = true; Input.aHeld = true; }
  if (code === "ShiftLeft" || code === "ShiftRight" || code === "KeyK" || code === "Escape") { Input.bPressed = true; Input.bHeld = true; }
}
function releaseKey(code) {
  Input.keys.delete(code);
  if (code === "Space" || code === "Enter" || code === "KeyJ") Input.aHeld = false;
  if (code === "ShiftLeft" || code === "ShiftRight" || code === "KeyK" || code === "Escape") Input.bHeld = false;
}
window.addEventListener("keydown", (e) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "Enter"].includes(e.code)) e.preventDefault();
  pressKey(e.code);
});
window.addEventListener("keyup", (e) => releaseKey(e.code));

function getDirVec() {
  let x = 0, y = 0; const k = Input.keys;
  if (k.has("ArrowUp") || k.has("KeyW") || k.has("KeyZ") || Input.dirs.has("up")) y -= 1;
  if (k.has("ArrowDown") || k.has("KeyS") || Input.dirs.has("down")) y += 1;
  if (k.has("ArrowLeft") || k.has("KeyA") || k.has("KeyQ") || Input.dirs.has("left")) x -= 1;
  if (k.has("ArrowRight") || k.has("KeyD") || Input.dirs.has("right")) x += 1;
  return { x, y };
}

document.querySelectorAll("#dpad button").forEach((btn) => {
  const dir = btn.dataset.dir;
  const press = (e) => { e.preventDefault(); Input.dirs.add(dir); btn.setPointerCapture && btn.setPointerCapture(e.pointerId); };
  const release = () => Input.dirs.delete(dir);
  btn.addEventListener("pointerdown", press);
  btn.addEventListener("pointerup", release);
  btn.addEventListener("pointercancel", release);
  btn.addEventListener("pointerleave", release);
  btn.addEventListener("lostpointercapture", release);
});

const btnA = document.getElementById("btnA"), btnB = document.getElementById("btnB");
btnA.addEventListener("pointerdown", (e) => { e.preventDefault(); Input.aPressed = true; Input.aHeld = true; });
btnA.addEventListener("pointerup", () => { Input.aHeld = false; });
btnA.addEventListener("pointerleave", () => { Input.aHeld = false; });
btnB.addEventListener("pointerdown", (e) => { e.preventDefault(); Input.bPressed = true; Input.bHeld = true; });
btnB.addEventListener("pointerup", () => { Input.bHeld = false; });
btnB.addEventListener("pointerleave", () => { Input.bHeld = false; });

function pointerXY(e) {
  const r = bottomCanvas.getBoundingClientRect();
  return {
    x: clamp(((e.clientX - r.left) / r.width) * SCREEN_W, 0, SCREEN_W),
    y: clamp(((e.clientY - r.top) / r.height) * SCREEN_H, 0, SCREEN_H)
  };
}
bottomCanvas.addEventListener("pointerdown", (e) => {
  if (e.button !== undefined && e.button !== 0) return;
  const p = pointerXY(e);
  Input.pointer.x = p.x; Input.pointer.y = p.y;
  Input.pointer.down = true; Input.pointer.id = e.pointerId; Input.pointer.startedNow = true;
});
bottomCanvas.addEventListener("pointermove", (e) => {
  const p = pointerXY(e);
  Input.pointer.x = p.x; Input.pointer.y = p.y;
});
const releasePointer = (e) => {
  if (Input.pointer.id === e.pointerId) {
    Input.pointer.down = false; Input.pointer.id = null; Input.pointer.releasedNow = true;
  }
};
window.addEventListener("pointerup", releasePointer);
window.addEventListener("pointercancel", releasePointer);

function endInputFrame() {
  Input.pressed.clear(); Input.aPressed = false; Input.bPressed = false;
  Input.pointer.startedNow = false; Input.pointer.releasedNow = false;
}

/* ---------- Donnees ---------- */
const SPECIES = {
  sparklit: { id: "sparklit", name: "Sparklit", element: "Foudre", body: "#ffd66b", accent: "#fff5b8", dark: "#a36a00", desc: "Renard d'orage. Charge en ligne droite.", radius: 10, speed: 70, temper: 90, dashPower: 2.4 },
  mossnib: { id: "mossnib", name: "Mossnib", element: "Feuille", body: "#7fd28a", accent: "#caf3b5", dark: "#3b6e3a", desc: "Lent, robuste.", radius: 12, speed: 44, temper: 140, dashPower: 1.6 },
  fjordle: { id: "fjordle", name: "Fjordle", element: "Vague", body: "#7fb8ff", accent: "#dbecff", dark: "#274f8a", desc: "Glisse en zigzag puis fonce.", radius: 11, speed: 60, temper: 110, dashPower: 2.1 },
  cindrop: { id: "cindrop", name: "Cindrop", element: "Braise", body: "#ff7f7f", accent: "#ffc4b8", dark: "#8a1f1f", desc: "Erratique. Charges puissantes.", radius: 10, speed: 76, temper: 95, dashPower: 2.6 },
  voltuff: { id: "voltuff", name: "Voltuff", element: "Foudre", body: "#f4d35e", accent: "#fff4bd", dark: "#8a6a00", desc: "Equilibre. Plusieurs boucles le calment.", radius: 12, speed: 56, temper: 130, dashPower: 1.9 },
  pebbleon: { id: "pebbleon", name: "Pebbleon", element: "Roc", body: "#a89377", accent: "#dac8a3", dark: "#4d3920", desc: "Lourd et tetu.", radius: 13, speed: 36, temper: 170, dashPower: 1.4 },
  glimmer: { id: "glimmer", name: "Glimmer", element: "Aurore", body: "#d49bff", accent: "#f2dcff", dark: "#5a2e8c", desc: "Disparait, reapparait.", radius: 10, speed: 64, temper: 105, dashPower: 1.8 }
};

const CHARACTERS = {
  player: { name: "Cadet", colorA: "#ff6b3d", colorB: "#264a6f", skin: "#f3c79a", hair: "#3a2718" },
  reva: { name: "Cap. Reva", colorA: "#3aa17a", colorB: "#1d3b35", skin: "#e0b893", hair: "#2c1c0e" },
  tomo: { name: "Tomo", colorA: "#5a8bff", colorB: "#1d2c4f", skin: "#f4cfa5", hair: "#1d1a14" },
  halden: { name: "Dr. Halden", colorA: "#bca7d8", colorB: "#3d2c5b", skin: "#ecc7a0", hair: "#cbcbcb" },
  shade: { name: "Shade", colorA: "#1f1f25", colorB: "#5a1029", skin: "#cfa088", hair: "#0c0c0c" },
  bran: { name: "Bran", colorA: "#d6884d", colorB: "#3b2418", skin: "#f0bd92", hair: "#3a1a0a" }
};

const STORY_INTRO = [
  { speaker: null, text: "VERDIS. Un archipel ou la nature parle a qui sait ecouter." },
  { speaker: null, text: "Les Wardens veillent sur ses esprits, appeles Lumina." },
  { speaker: null, text: "Mais une ombre, le Black Tide, agite ces creatures..." },
  { speaker: "reva", text: "Cadet, tu es enfin la. Bienvenue a l'Avant-Poste Halcyon." },
  { speaker: "reva", text: "Je suis le Capitaine Reva. Voici ton premier Loop Styler." },
  { speaker: "player", text: "...Je suis pret. Donnez-moi mes ordres." },
  { speaker: "reva", text: "Tu vas tracer une boucle complete autour des Lumina pour les apaiser." },
  { speaker: "reva", text: "Maintiens le clic ou ton doigt et reviens au point de depart." },
  { speaker: "reva", text: "Va voir Tomo dehors. Il t'expliquera sur le terrain." }
];

const MISSIONS = [
  {
    id: "m1", title: "Mission 01 - Bois d'Halcyon",
    brief: "Trois Sparklits sont nerveux pres de l'avant-poste. Apaise-les.",
    target: 3, timeLimit: 150,
    species: ["sparklit", "sparklit", "sparklit", "mossnib"], spawnExtra: 2,
    intro: [
      { speaker: "tomo", text: "Alors c'est toi le nouveau ! Reva m'a tout dit." },
      { speaker: "tomo", text: "Tu marches autour de la creature, tu boucles. Pas de panique." },
      { speaker: "tomo", text: "Si elle charge, esquive. Casse pas la ligne." },
      { speaker: "player", text: "Compris." },
      { speaker: "tomo", text: "Allez, montre-moi ca !" }
    ],
    success: [
      { speaker: "tomo", text: "Wow, propre ! Bon coup de styler." },
      { speaker: "reva", text: "Bon travail, cadet. Repos." }
    ],
    fail: [{ speaker: "tomo", text: "Aie. Pas grave, on retente." }]
  },
  {
    id: "m2", title: "Mission 02 - Crique de Corail",
    brief: "Halden a besoin de captures de Fjordles pour etudier la maree.",
    target: 4, timeLimit: 180,
    species: ["fjordle", "fjordle", "fjordle", "fjordle", "glimmer", "mossnib"], spawnExtra: 2,
    intro: [
      { speaker: "halden", text: "Ah, cadet ! Mes Fjordles s'agitent depuis hier." },
      { speaker: "halden", text: "Je soupconne le Black Tide. Capture-en autant que possible." },
      { speaker: "player", text: "Je m'en occupe." }
    ],
    success: [
      { speaker: "halden", text: "Fascinant ! Une energie crimson sature leurs ondes." },
      { speaker: "reva", text: "Crimson... Black Tide est ici. Tiens-toi pret." }
    ],
    fail: [{ speaker: "halden", text: "Pas concluant. On reessaie." }]
  },
  {
    id: "m3", title: "Mission 03 - Crete des Cendres",
    brief: "Le Black Tide pousse les Cindrops a la rage. Disperse-les.",
    target: 5, timeLimit: 210,
    species: ["cindrop", "cindrop", "cindrop", "cindrop", "voltuff", "pebbleon"], spawnExtra: 3,
    intro: [
      { speaker: "shade", text: "Tiens, tiens. Une Warden seule sur la Crete." },
      { speaker: "shade", text: "Mes Cindrops sont... tres en colere. Bonne chance." },
      { speaker: "reva", text: "Cadet, ne le suis pas. Concentre-toi sur les Lumina." },
      { speaker: "player", text: "On va tous les calmer." }
    ],
    success: [
      { speaker: "reva", text: "Fenomenal. Tu as prouve ce que vaut un Warden." },
      { speaker: "tomo", text: "Bienvenue dans l'equipe, pour de vrai !" },
      { speaker: "halden", text: "Le Black Tide se replie. Mais ce n'est qu'un debut..." }
    ],
    fail: [{ speaker: "reva", text: "Replie-toi, cadet. On reprendra la zone." }]
  }
];

/* ---------- Etat global ---------- */
const Game = {
  state: "title",
  t: 0,
  cameraShake: 0,
  flags: { introDone: false, missionUnlocked: 0 },
  capturedTotal: 0,
  hub: null,
  capture: null,
  dialogue: null,
  missionResult: null
};

function switchState(s) { Game.state = s; }

/* ---------- Hub map ---------- */
function buildHub() {
  const map = [];
  for (let y = 0; y < ROWS; y++) { const row = []; for (let x = 0; x < COLS; x++) row.push(0); map.push(row); }
  for (let x = 0; x < COLS; x++) { map[0][x] = 5; map[ROWS - 1][x] = 5; }
  for (let y = 0; y < ROWS; y++) { map[y][0] = 5; map[y][COLS - 1] = 5; }
  for (let x = 1; x < COLS - 1; x++) map[ROWS - 3][x] = 1;
  for (let y = 2; y < ROWS - 3; y++) map[y][10] = 1;
  for (let y = 3; y <= 5; y++) for (let x = 3; x <= 6; x++) map[y][x] = 7;
  for (let x = 3; x <= 6; x++) { map[2][x] = 8; map[3][x] = 8; }
  map[5][4] = 9; map[5][5] = 9;
  for (let y = 1; y < ROWS - 1; y++) map[y][COLS - 3] = 3;
  for (let y = 1; y < ROWS - 1; y++) map[y][COLS - 4] = 4;
  const decor = [[2, 12], [3, 13], [4, 11], [8, 7], [8, 15], [9, 3], [9, 15], [7, 12], [6, 12]];
  for (const d of decor) if (map[d[0]][d[1]] === 0) map[d[0]][d[1]] = 11;
  const stones = [[6, 15], [7, 15], [5, 15]];
  for (const s of stones) if (map[s[0]][s[1]] === 0) map[s[0]][s[1]] = 10;

  const npcs = [
    { id: "reva", x: 4 * TILE + 16, y: 6 * TILE + 16, dir: "down", spriteKey: "reva",
      lines: () => Game.flags.missionUnlocked >= MISSIONS.length
        ? [{ speaker: "reva", text: "Tu as fait l'archipel fier, cadet." }]
        : [{ speaker: "reva", text: "Va parler a Tomo pour lancer la mission suivante." }] },
    { id: "tomo", x: 11 * TILE + 16, y: (ROWS - 4) * TILE + 16, dir: "down", spriteKey: "tomo",
      lines: () => {
        const idx = Game.flags.missionUnlocked;
        if (idx >= MISSIONS.length) return [{ speaker: "tomo", text: "Plus de mission. Repose-toi !" }];
        return [
          { speaker: "tomo", text: "Mission disponible: " + MISSIONS[idx].title + "." },
          { speaker: "tomo", text: "Pret ? On y va !", action: { type: "startMission", index: idx } }
        ];
      } },
    { id: "halden", x: 14 * TILE + 16, y: 4 * TILE + 16, dir: "down", spriteKey: "halden",
      lines: () => Game.flags.missionUnlocked >= 1
        ? [{ speaker: "halden", text: "Mes capteurs detectent une energie crimson. Pas naturel..." }]
        : [{ speaker: "halden", text: "Bienvenue, cadet. Si tu vois quelque chose de rouge, fuis." }] },
    { id: "bran", x: 6 * TILE + 16, y: (ROWS - 2) * TILE + 16, dir: "up", spriteKey: "bran",
      lines: () => [
        { speaker: "bran", text: "Mes Mossnibs ont disparu. Si tu en croises, sois doux." }
      ] }
  ];

  Game.hub = { map, npcs, player: { x: 10 * TILE + 16, y: (ROWS - 4) * TILE + 16, dir: "down", anim: 0 } };
}

function tileSolid(t) { return t === 5 || t === 6 || t === 7 || t === 8 || t === 3 || t === 10; }

function drawTile(c, t, x, y) {
  const SP = TILE;
  switch (t) {
    case 0:
      px(c, x, y, SP, SP, "#4f9d4a");
      for (let i = 0; i < 4; i++) px(c, x + ((i * 8 + ((y / 8) % 8)) | 0) % SP, y + ((i * 6 + 2) % SP), 2, 2, "#3e7e3a");
      break;
    case 1:
      px(c, x, y, SP, SP, "#caa977");
      px(c, x + 2, y + 4, 4, 2, "#a98855"); px(c, x + 18, y + 14, 6, 2, "#a98855"); px(c, x + 8, y + 24, 4, 2, "#a98855");
      break;
    case 2: px(c, x, y, SP, SP, "#9a6a3a"); break;
    case 3:
      px(c, x, y, SP, SP, "#3a78b8");
      for (let i = 0; i < 3; i++) {
        const ox = (Math.sin(Game.t * 1.2 + i + x * 0.05) * 4) | 0;
        px(c, x + ox + i * 8, y + 6 + i * 8, 8, 1, "#a8d4ff");
      }
      break;
    case 4: px(c, x, y, SP, SP, "#e3cf94"); break;
    case 5:
      px(c, x, y, SP, SP, "#4f9d4a");
      px(c, x + 14, y + 18, 4, 12, "#5e3a1f");
      c.fillStyle = "#1f5b22"; c.beginPath(); c.arc(x + 16, y + 14, 14, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#2f7c2f"; c.beginPath(); c.arc(x + 12, y + 11, 8, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(x + 20, y + 11, 7, 0, Math.PI * 2); c.fill();
      px(c, x + 14, y + 9, 2, 2, "#9be39b");
      break;
    case 6:
      px(c, x, y, SP, SP, "#4f9d4a");
      px(c, x + 4, y + 10, 4, 18, "#7d4f24"); px(c, x + 20, y + 10, 4, 18, "#7d4f24"); px(c, x, y + 14, SP, 3, "#7d4f24");
      break;
    case 7:
      px(c, x, y, SP, SP, "#cda077"); px(c, x, y + 10, SP, 1, "#8e6a44"); px(c, x, y + 22, SP, 1, "#8e6a44");
      break;
    case 8:
      px(c, x, y, SP, SP, "#b04a2c"); px(c, x, y + SP - 3, SP, 3, "#741e1a"); px(c, x, y, SP, 2, "#dd6b48");
      break;
    case 9:
      px(c, x, y, SP, SP, "#cda077"); px(c, x + 8, y + 6, 16, 26, "#5a2f15"); px(c, x + 22, y + 18, 2, 2, "#ffd866");
      break;
    case 10:
      px(c, x, y, SP, SP, "#4f9d4a");
      c.fillStyle = "#9d9b94"; c.beginPath(); c.arc(x + 16, y + 18, 10, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#6e6a64"; c.beginPath(); c.arc(x + 12, y + 22, 4, 0, Math.PI * 2); c.fill();
      break;
    case 11:
      px(c, x, y, SP, SP, "#4f9d4a");
      const cols = ["#ffd866", "#ff8896", "#a8d4ff", "#e6b8ff"];
      for (let i = 0; i < 5; i++) {
        const cx = x + 4 + ((i * 7) % 24), cy = y + 6 + ((i * 11) % 22);
        px(c, cx, cy, 2, 2, cols[i % cols.length]); px(c, cx + 1, cy + 1, 1, 1, "#fffbe6");
      }
      break;
    default: px(c, x, y, SP, SP, "#000");
  }
}

function drawHuman(c, charKey, cx, cy, dir, anim) {
  const ch = CHARACTERS[charKey] || CHARACTERS.player;
  const x = cx - 8, y = cy - 14;
  const step = (Math.floor(anim) % 4);
  const dy = step === 1 ? -1 : step === 3 ? 1 : 0;
  c.fillStyle = "#00000050"; c.beginPath(); c.ellipse(cx, cy + 11, 8, 3, 0, 0, Math.PI * 2); c.fill();
  const fy = y + dy;
  px(c, x + 4, fy + 16, 3, 6, ch.colorB); px(c, x + 9, fy + 16, 3, 6, ch.colorB);
  px(c, x + 4, fy + 21, 3, 1, "#1a1a1a"); px(c, x + 9, fy + 21, 3, 1, "#1a1a1a");
  px(c, x + 3, fy + 9, 10, 8, ch.colorA);
  px(c, x + 3, fy + 9, 10, 1, "#ffffff40");
  px(c, x + 3, fy + 16, 10, 1, "#1f1f1f");
  px(c, x + 1, fy + 10, 2, 6, ch.colorA); px(c, x + 13, fy + 10, 2, 6, ch.colorA);
  px(c, x + 4, fy + 1, 8, 8, ch.skin);
  if (dir === "up") px(c, x + 3, fy, 10, 4, ch.hair);
  else { px(c, x + 3, fy, 10, 3, ch.hair); px(c, x + 3, fy + 3, 2, 2, ch.hair); px(c, x + 11, fy + 3, 2, 2, ch.hair); }
  if (dir === "down") { px(c, x + 6, fy + 5, 1, 2, "#1a1a1a"); px(c, x + 9, fy + 5, 1, 2, "#1a1a1a"); }
  else if (dir === "left") px(c, x + 5, fy + 5, 1, 2, "#1a1a1a");
  else if (dir === "right") px(c, x + 10, fy + 5, 1, 2, "#1a1a1a");
  if (dir === "down") px(c, x + 7, fy + 7, 2, 1, "#7c3a2b");
  px(c, x + 5, fy + 9, 6, 1, "#ffd866");
}

function drawCreature(c, sp, cx, cy, anim, hitFlash, dashing, captured) {
  const r = sp.radius;
  const wob = Math.sin(anim * 6) * 1.2;
  c.save(); c.translate(cx, cy + wob);
  if (captured) c.globalAlpha = clamp(1 - anim, 0, 1);
  c.fillStyle = "#00000050"; c.beginPath(); c.ellipse(0, r + 4, r * 0.9, r * 0.35, 0, 0, Math.PI * 2); c.fill();
  if (hitFlash > 0) { c.fillStyle = "#ffffff"; c.beginPath(); c.arc(0, 0, r + 4 + hitFlash * 6, 0, Math.PI * 2); c.fill(); }
  if (dashing) { c.strokeStyle = sp.accent + "cc"; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, r + 5, 0, Math.PI * 2); c.stroke(); }
  c.fillStyle = sp.body; c.beginPath(); c.ellipse(0, 0, r, r * 0.92, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = sp.accent; c.beginPath(); c.ellipse(0, r * 0.25, r * 0.7, r * 0.55, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = sp.dark; c.lineWidth = 1.5; c.beginPath(); c.ellipse(0, 0, r, r * 0.92, 0, 0, Math.PI * 2); c.stroke();
  c.fillStyle = sp.body; c.strokeStyle = sp.dark;
  if (sp.id === "sparklit" || sp.id === "voltuff") {
    c.beginPath(); c.moveTo(-r * 0.6, -r * 0.6); c.lineTo(-r * 0.3, -r * 1.4); c.lineTo(-r * 0.1, -r * 0.6); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(r * 0.1, -r * 0.6); c.lineTo(r * 0.3, -r * 1.4); c.lineTo(r * 0.6, -r * 0.6); c.closePath(); c.fill(); c.stroke();
  } else if (sp.id === "fjordle") {
    c.beginPath(); c.moveTo(-r * 0.9, -r * 0.2); c.lineTo(-r * 1.4, -r * 0.6); c.lineTo(-r * 0.6, -r * 0.6); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(r * 0.9, -r * 0.2); c.lineTo(r * 1.4, -r * 0.6); c.lineTo(r * 0.6, -r * 0.6); c.closePath(); c.fill(); c.stroke();
  } else if (sp.id === "mossnib") {
    c.fillStyle = "#3b6e3a"; c.beginPath(); c.ellipse(0, -r * 0.95, r * 0.35, r * 0.6, 0.3, 0, Math.PI * 2); c.fill();
    c.strokeStyle = "#1f3f1d"; c.beginPath(); c.moveTo(0, -r * 0.4); c.lineTo(0, -r * 1.4); c.stroke();
  } else if (sp.id === "cindrop") {
    c.fillStyle = "#ffb366"; c.beginPath();
    c.moveTo(0, -r * 1.4); c.quadraticCurveTo(r * 0.6, -r * 0.7, 0, -r * 0.1); c.quadraticCurveTo(-r * 0.6, -r * 0.7, 0, -r * 1.4); c.fill();
  } else if (sp.id === "pebbleon") {
    c.fillStyle = "#7e6a4d"; c.beginPath(); c.arc(-r * 0.5, -r * 0.6, r * 0.3, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(r * 0.5, -r * 0.6, r * 0.3, 0, Math.PI * 2); c.fill();
  } else if (sp.id === "glimmer") {
    c.fillStyle = sp.accent + "aa"; c.beginPath(); c.arc(0, 0, r * 1.4 + Math.sin(anim * 4) * 1.5, 0, Math.PI * 2); c.fill();
    c.fillStyle = sp.body; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
  }
  c.fillStyle = "#1a1a1a";
  c.beginPath(); c.arc(-r * 0.35, -r * 0.05, 1.6, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(r * 0.35, -r * 0.05, 1.6, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#fff";
  c.fillRect(((-r * 0.35) | 0), ((-r * 0.45) | 0), 1, 1);
  c.fillRect(((r * 0.35) | 0), ((-r * 0.45) | 0), 1, 1);
  c.restore();
}

/* ---------- DIALOGUE ---------- */
function startDialogue(lines, onDone) {
  Game.dialogue = {
    lines: lines.slice(), idx: 0, text: "", fullText: "",
    typeT: 0, done: false, onDone, pendingAction: null,
    returnState: Game.state
  };
  loadDialogueLine();
  switchState("dialogue");
}
function loadDialogueLine() {
  const d = Game.dialogue;
  if (d.idx >= d.lines.length) {
    const action = d.pendingAction, cb = d.onDone, ret = d.returnState;
    Game.dialogue = null;
    switchState(ret);
    if (cb) cb(action);
    return;
  }
  const ln = d.lines[d.idx];
  d.fullText = ln.text; d.text = ""; d.typeT = 0; d.done = false;
  if (ln.action) d.pendingAction = ln.action;
}
function updateDialogue(dt) {
  Game.t += dt;
  const d = Game.dialogue; if (!d) return;
  if (!d.done) {
    d.typeT += dt * 60;
    const n = Math.min(d.fullText.length, Math.floor(d.typeT));
    d.text = d.fullText.slice(0, n);
    if (n >= d.fullText.length) d.done = true;
  }
  if (Input.aPressed) {
    if (!d.done) { d.text = d.fullText; d.done = true; }
    else { d.idx++; loadDialogueLine(); }
  }
}
function drawDialogue() {
  const ret = Game.dialogue.returnState;
  if (ret === "hub") drawHub();
  else if (ret === "capture") drawCapture();
  else if (ret === "results") drawResults();
  else { topCtx.fillStyle = "#0a1525"; topCtx.fillRect(0, 0, SCREEN_W, SCREEN_H); botCtx.fillStyle = "#0a1525"; botCtx.fillRect(0, 0, SCREEN_W, SCREEN_H); }

  const d = Game.dialogue;
  const ln = d.lines[d.idx] || { text: "" };
  const speaker = ln.speaker ? CHARACTERS[ln.speaker] : null;

  const bx = botCtx;
  bx.fillStyle = "#000c"; bx.fillRect(20, 250, 600, 120);
  bx.fillStyle = "#0d2236"; rrect(bx, 16, 246, 608, 124, 8); bx.fill();
  bx.strokeStyle = "#ffd866"; bx.lineWidth = 2; rrect(bx, 20, 250, 600, 116, 6); bx.stroke();

  if (speaker) {
    bx.fillStyle = "#06182a"; rrect(bx, 28, 258, 84, 100, 4); bx.fill();
    drawHuman(bx, ln.speaker, 70, 318, "down", 0);
    bx.fillStyle = "#ffd866"; bx.font = "10px 'Press Start 2P', monospace"; bx.textAlign = "center";
    bx.fillText(speaker.name.toUpperCase(), 70, 354);
  }

  const tx0 = speaker ? 130 : 40;
  bx.fillStyle = "#ffffff"; bx.font = "20px 'VT323', monospace"; bx.textAlign = "left";
  wrapText(bx, d.text, tx0, 280, 480, 22);

  if (d.done) {
    if (Math.floor(Game.t * 3) % 2 === 0) {
      bx.fillStyle = "#ffd866";
      bx.beginPath(); bx.moveTo(580, 350); bx.lineTo(596, 350); bx.lineTo(588, 358); bx.closePath(); bx.fill();
    }
    bx.fillStyle = "#9bdce0"; bx.font = "10px 'Press Start 2P', monospace"; bx.textAlign = "right";
    bx.fillText("A: SUITE", 600, 270);
  }

  if (!speaker) {
    topCtx.fillStyle = "#0d2236d8"; topCtx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    topCtx.fillStyle = "#ffd866"; topCtx.font = "12px 'Press Start 2P', monospace"; topCtx.textAlign = "center";
    topCtx.fillText("RECIT", 320, 150);
    topCtx.fillStyle = "#cfeaff"; topCtx.font = "20px 'VT323', monospace";
    wrapText(topCtx, d.text, 60, 200, 520, 24, "center");
  }
}

/* ---------- TITLE ---------- */
function updateTitle(dt) {
  Game.t += dt;
  if (Input.aPressed) {
    if (!Game.flags.introDone) {
      startDialogue(STORY_INTRO, () => {
        Game.flags.introDone = true;
        buildHub();
        switchState("hub");
      });
    } else {
      buildHub();
      switchState("hub");
    }
  }
}
function drawTitle() {
  const c = topCtx;
  const g = c.createLinearGradient(0, 0, 0, SCREEN_H);
  g.addColorStop(0, "#0a1f3a"); g.addColorStop(0.6, "#234d7a"); g.addColorStop(1, "#5497b8");
  c.fillStyle = g; c.fillRect(0, 0, SCREEN_W, SCREEN_H);
  c.fillStyle = "#fff";
  for (let i = 0; i < 30; i++) {
    const sx = (i * 53) % SCREEN_W, sy = (i * 37) % (SCREEN_H * 0.6);
    if ((Math.sin(Game.t * 2 + i) + 1) * 0.5 > 0.5) c.fillRect(sx, sy, 1, 1);
  }
  c.fillStyle = "#1a3322";
  c.beginPath(); c.moveTo(0, 280);
  c.bezierCurveTo(160, 240, 320, 300, 480, 250); c.lineTo(640, 270); c.lineTo(640, 384); c.lineTo(0, 384); c.closePath(); c.fill();
  c.fillStyle = "#0e2418";
  c.beginPath(); c.moveTo(0, 320);
  c.bezierCurveTo(200, 290, 400, 340, 640, 310); c.lineTo(640, 384); c.lineTo(0, 384); c.closePath(); c.fill();

  c.save(); c.translate(320, 120);
  c.shadowColor = "#000c"; c.shadowBlur = 12;
  c.fillStyle = "#0d2236"; rrect(c, -240, -42, 480, 84, 10); c.fill();
  c.shadowBlur = 0;
  c.fillStyle = "#ffd866"; c.strokeStyle = "#7a3a00"; c.lineWidth = 4;
  c.font = "bold 30px 'Press Start 2P', monospace"; c.textAlign = "center"; c.textBaseline = "middle";
  c.strokeText("NATURE", 0, -10); c.fillText("NATURE", 0, -10);
  c.strokeText("WARDENS", 0, 22); c.fillText("WARDENS", 0, 22);
  c.restore();

  c.textBaseline = "alphabetic";
  c.fillStyle = "#ffe7a8"; c.font = "16px 'VT323', monospace"; c.textAlign = "center";
  c.fillText("~ Loop of Tides ~", 320, 200);

  if (Math.floor(Game.t * 2) % 2 === 0) {
    c.fillStyle = "#ffffff"; c.font = "12px 'Press Start 2P', monospace";
    c.fillText("APPUIE SUR  A  POUR COMMENCER", 320, 250);
  }
  c.fillStyle = "#9bbedd"; c.font = "12px 'VT323', monospace";
  c.fillText("Fan-made gratuit, univers original.", 320, 360);

  const b = botCtx;
  const g2 = b.createLinearGradient(0, 0, 0, SCREEN_H);
  g2.addColorStop(0, "#1a2c3a"); g2.addColorStop(1, "#0a141d");
  b.fillStyle = g2; b.fillRect(0, 0, SCREEN_W, SCREEN_H);
  b.fillStyle = "#79e3c4"; b.font = "12px 'Press Start 2P', monospace"; b.textAlign = "center";
  b.fillText("CONTROLES", 320, 50);
  b.fillStyle = "#cfeaff"; b.font = "16px 'VT323', monospace";
  b.fillText("Deplacement: ZQSD ou Fleches  |  D-pad sur mobile", 320, 80);
  b.fillText("A (Espace/Entree): Action / Confirmer", 320, 100);
  b.fillText("B (Maj/Echap): Annuler / Onde Lumina", 320, 120);
  b.fillText("Capture: maintiens clic ou doigt et trace une boucle.", 320, 140);

  const list = ["sparklit", "mossnib", "fjordle", "cindrop", "voltuff", "glimmer", "pebbleon"];
  for (let i = 0; i < list.length; i++) {
    const sp = SPECIES[list[i]];
    const tt = (Game.t * 50 + i * 90) % (SCREEN_W + 80) - 40;
    drawCreature(b, sp, tt, 240 + Math.sin(Game.t * 2 + i) * 6, Game.t + i, 0, false);
    b.fillStyle = "#fff"; b.font = "10px 'Press Start 2P', monospace"; b.textAlign = "center";
    b.fillText(sp.name, tt, 280);
  }
  b.fillStyle = "#ffd866"; b.font = "10px 'Press Start 2P', monospace";
  b.fillText("(c) VERDIS WARDENS GUILD", 320, 360);
}

/* ---------- HUB ---------- */
function nearestNPC() {
  const p = Game.hub.player;
  for (const npc of Game.hub.npcs) {
    if (Math.abs(npc.x - p.x) < TILE && Math.abs(npc.y - p.y) < TILE * 1.1) return npc;
  }
  return null;
}
function updateHub(dt) {
  Game.t += dt;
  const p = Game.hub.player;
  const v = getDirVec();
  const speed = 90;
  const nx = p.x + v.x * speed * dt, ny = p.y + v.y * speed * dt;
  const tryMove = (x, y) => {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return false;
    return !tileSolid(Game.hub.map[ty][tx]);
  };
  if (tryMove(nx, p.y)) p.x = nx;
  if (tryMove(p.x, ny)) p.y = ny;
  if (v.x || v.y) {
    if (Math.abs(v.x) > Math.abs(v.y)) p.dir = v.x > 0 ? "right" : "left";
    else p.dir = v.y > 0 ? "down" : "up";
    p.anim += dt * 6;
  } else p.anim = 0;

  if (Input.aPressed) {
    const npc = nearestNPC();
    if (npc) {
      const dx = p.x - npc.x, dy = p.y - npc.y;
      npc.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
      const lines = npc.lines();
      startDialogue(lines, (action) => {
        if (action && action.type === "startMission") beginMission(action.index);
      });
    }
  }
}
function drawHub() {
  const t = topCtx;
  const g = t.createLinearGradient(0, 0, 0, SCREEN_H);
  g.addColorStop(0, "#cfe9f5"); g.addColorStop(1, "#fdebc4");
  t.fillStyle = g; t.fillRect(0, 0, SCREEN_W, SCREEN_H);

  t.fillStyle = "#0d2236"; rrect(t, 24, 24, 592, 64, 12); t.fill();
  t.fillStyle = "#ffd866"; t.font = "14px 'Press Start 2P', monospace"; t.textAlign = "left";
  t.fillText("AVANT-POSTE HALCYON", 44, 56);
  t.fillStyle = "#9bdce0"; t.font = "16px 'VT323', monospace";
  t.fillText("Halcyon Outpost  -  Archipel de Verdis", 44, 78);

  t.fillStyle = "#0d2236"; rrect(t, 24, 110, 592, 240, 12); t.fill();
  t.fillStyle = "#ffd866"; t.font = "12px 'Press Start 2P', monospace";
  t.fillText("CARNET DE MISSION", 44, 138);

  for (let i = 0; i < MISSIONS.length; i++) {
    const m = MISSIONS[i];
    const yy = 156 + i * 56;
    const status = i < Game.flags.missionUnlocked ? "OK" : i === Game.flags.missionUnlocked ? ">>" : "--";
    const col = i < Game.flags.missionUnlocked ? "#79e3c4" : i === Game.flags.missionUnlocked ? "#ffd866" : "#6b7892";
    t.fillStyle = col; t.font = "12px 'Press Start 2P', monospace";
    t.fillText("[" + status + "]  " + m.title, 44, yy);
    t.fillStyle = "#cfeaff"; t.font = "16px 'VT323', monospace";
    t.fillText(m.brief, 44, yy + 22);
  }

  t.fillStyle = "#9bdce0"; t.font = "12px 'VT323', monospace"; t.textAlign = "right";
  t.fillText("Captures totales: " + Game.capturedTotal, 600, 370);

  const b = botCtx;
  b.fillStyle = "#000"; b.fillRect(0, 0, SCREEN_W, SCREEN_H);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) drawTile(b, Game.hub.map[y][x], x * TILE, y * TILE);
  for (const npc of Game.hub.npcs) drawHuman(b, npc.spriteKey, npc.x, npc.y, npc.dir, 0);
  const p = Game.hub.player;
  drawHuman(b, "player", p.x, p.y, p.dir, p.anim);

  const npc = nearestNPC();
  if (npc) {
    b.fillStyle = "#0d2236d8"; rrect(b, npc.x - 32, npc.y - 38, 64, 16, 4); b.fill();
    b.fillStyle = "#ffd866"; b.font = "8px 'Press Start 2P', monospace"; b.textAlign = "center";
    b.fillText("A : PARLER", npc.x, npc.y - 27);
  }
}

/* ---------- CAPTURE ---------- */
function beginMission(index) {
  const m = MISSIONS[index];
  if (!m) return;
  startDialogue(m.intro, () => setupCapture(m, index));
}
function spawnCreature(speciesId, cap) {
  const sp = SPECIES[speciesId];
  let x = 0, y = 0;
  for (let tries = 0; tries < 8; tries++) {
    x = rand(40, SCREEN_W - 40);
    y = rand(40, SCREEN_H - 40);
    if (cap && dist(x, y, cap.ranger.x, cap.ranger.y) > 90) break;
  }
  return {
    species: sp, x, y,
    vx: Math.cos(rand(0, Math.PI * 2)), vy: Math.sin(rand(0, Math.PI * 2)),
    anim: rand(0, 10), actionT: rand(0.5, 1.5), attackCd: rand(1.6, 3.4),
    dashT: 0, stun: 0, slow: 0,
    temper: sp.temper, maxTemper: sp.temper,
    hitFlash: 0, captured: false, capturedT: 0
  };
}
function setupCapture(mission, index) {
  const cap = {
    mission, index,
    timeLeft: mission.timeLimit, captured: 0,
    creatures: [], particles: [], terrain: [], log: [],
    line: { active: false, points: [], cooldown: 0, flashRed: 0, flashGreen: 0, pointerId: null },
    ranger: { x: SCREEN_W / 2, y: SCREEN_H / 2, dir: "down", anim: 0, energy: 100, styler: 100, invuln: 0, pulseCd: 0, pulseWave: 0 }
  };
  for (let i = 0; i < 22; i++) {
    cap.terrain.push({ x: rand(0, SCREEN_W), y: rand(0, SCREEN_H), rx: rand(10, 26), ry: rand(8, 20), rot: rand(0, Math.PI), color: Math.random() > 0.5 ? "#3e7e3a55" : "#5a8e5d55" });
  }
  const list = mission.species;
  const total = mission.target + (mission.spawnExtra || 1);
  for (let i = 0; i < total; i++) cap.creatures.push(spawnCreature(list[i % list.length], cap));
  Game.capture = cap;
  switchState("capture");
}
function logEvent(msg, tone) {
  Game.capture.log.unshift({ msg, tone: tone || "info" });
  Game.capture.log = Game.capture.log.slice(0, 6);
}
function spawnParticles(x, y, color, n) {
  n = n || 10;
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2), s = rand(20, 110);
    Game.capture.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.3, 0.7), max: 0.7, color, r: rand(1.5, 3) });
  }
}
function applyDamage(amount, msg) {
  const cap = Game.capture;
  if (cap.ranger.invuln > 0) return;
  cap.ranger.energy = clamp(cap.ranger.energy - amount, 0, 100);
  cap.ranger.invuln = 0.7;
  cap.line.flashRed = 0.4;
  Game.cameraShake = 6;
  spawnParticles(cap.ranger.x, cap.ranger.y, "#ff8a6b", 8);
  logEvent(msg + " (-" + amount + ")", "warn");
  if (cap.ranger.energy <= 0) endMission(false);
}
function captureCreature(c, source) {
  if (c.captured) return;
  c.captured = true; c.capturedT = 0;
  Game.capture.captured += 1;
  Game.capturedTotal += 1;
  const suffix = source === "pulse" ? " (onde)" : "";
  logEvent(c.species.name + " capturee" + suffix, "good");
  spawnParticles(c.x, c.y, c.species.accent, 14);
  Game.capture.line.flashGreen = 0.3;
  if (Game.capture.captured >= Game.capture.mission.target) endMission(true);
}
function triggerPulse() {
  const cap = Game.capture;
  if (cap.ranger.pulseCd > 0) return;
  cap.ranger.pulseCd = 9;
  cap.ranger.pulseWave = 1;
  let touched = 0;
  for (const c of cap.creatures) {
    if (c.captured) continue;
    if (dist(c.x, c.y, cap.ranger.x, cap.ranger.y) > 140) continue;
    touched++;
    c.stun = Math.max(c.stun, 0.9);
    c.slow = Math.max(c.slow, 1.8);
    c.temper -= 12; c.hitFlash = 0.3;
    if (c.temper <= 0) captureCreature(c, "pulse");
  }
  logEvent("Onde Lumina diffusee" + (touched ? " (" + touched + " touchee[s])" : ""));
}
function breakLine(reason) {
  const cap = Game.capture;
  if (!cap.line.active) return;
  cap.line.active = false; cap.line.points = []; cap.line.pointerId = null;
  cap.line.cooldown = 0.35;
  cap.ranger.styler = clamp(cap.ranger.styler - 18, 0, 100);
  applyDamage(7, reason);
}
function detectLoop(points) {
  if (points.length < 18) return null;
  const tail = points[points.length - 1];
  for (let i = 0; i < points.length - 12; i++) {
    const head = points[i];
    if (Math.hypot(tail.x - head.x, tail.y - head.y) > 14) continue;
    const loop = points.slice(i);
    if (Math.abs(polygonArea(loop)) > 1100) return loop;
  }
  return null;
}
function handleLoop(loop) {
  const cap = Game.capture;
  let hits = 0;
  for (const c of cap.creatures) {
    if (c.captured) continue;
    if (!pointInPolygon({ x: c.x, y: c.y }, loop)) continue;
    hits++;
    const power = c.species.id === "mossnib" || c.species.id === "pebbleon" ? 18 : 24;
    const slowBonus = c.slow > 0 ? 6 : 0;
    c.temper -= power + slowBonus;
    c.stun = Math.max(c.stun, 0.4);
    c.hitFlash = 0.25;
    spawnParticles(c.x, c.y, c.species.accent, 6);
    if (c.temper <= 0) captureCreature(c);
  }
  if (hits > 0) {
    cap.ranger.styler = clamp(cap.ranger.styler + hits * 4, 0, 100);
    cap.line.flashGreen = 0.18;
    logEvent("Boucle: " + hits + " cible(s)");
  } else {
    cap.ranger.styler = clamp(cap.ranger.styler - 2.5, 0, 100);
  }
}

function updateCapture(dt) {
  Game.t += dt;
  const cap = Game.capture;
  cap.timeLeft -= dt;
  if (cap.timeLeft <= 0) { endMission(false); return; }

  cap.ranger.invuln = Math.max(0, cap.ranger.invuln - dt);
  cap.ranger.pulseCd = Math.max(0, cap.ranger.pulseCd - dt);
  cap.ranger.pulseWave = Math.max(0, cap.ranger.pulseWave - dt * 1.6);
  cap.line.cooldown = Math.max(0, cap.line.cooldown - dt);
  cap.line.flashRed = Math.max(0, cap.line.flashRed - dt * 2);
  cap.line.flashGreen = Math.max(0, cap.line.flashGreen - dt * 2.4);
  Game.cameraShake = Math.max(0, Game.cameraShake - dt * 30);

  if (Input.bPressed) triggerPulse();

  const v = getDirVec();
  const speed = cap.line.active ? 95 : 130;
  cap.ranger.x = clamp(cap.ranger.x + v.x * speed * dt, 16, SCREEN_W - 16);
  cap.ranger.y = clamp(cap.ranger.y + v.y * speed * dt, 16, SCREEN_H - 16);
  if (v.x || v.y) {
    if (Math.abs(v.x) > Math.abs(v.y)) cap.ranger.dir = v.x > 0 ? "right" : "left";
    else cap.ranger.dir = v.y > 0 ? "down" : "up";
    cap.ranger.anim += dt * 6;
  } else cap.ranger.anim = 0;

  if (!cap.line.active) cap.ranger.styler = clamp(cap.ranger.styler + dt * 12, 0, 100);

  if (Input.pointer.startedNow && !cap.line.active && cap.line.cooldown === 0 && cap.ranger.styler > 5) {
    cap.line.active = true;
    cap.line.points = [{ x: Input.pointer.x, y: Input.pointer.y }];
    cap.line.pointerId = Input.pointer.id;
  }
  if (cap.line.active && Input.pointer.down) {
    const last = cap.line.points[cap.line.points.length - 1];
    const dx = Input.pointer.x - last.x, dy = Input.pointer.y - last.y;
    if (dx * dx + dy * dy > 16) {
      cap.line.points.push({ x: Input.pointer.x, y: Input.pointer.y });
      if (cap.line.points.length > 200) cap.line.points.shift();
      cap.ranger.styler = clamp(cap.ranger.styler - 0.45, 0, 100);
      if (cap.ranger.styler <= 0) breakLine("Styler vide.");
      const loop = detectLoop(cap.line.points);
      if (loop) {
        handleLoop(loop);
        cap.line.points = [{ x: Input.pointer.x, y: Input.pointer.y }];
      }
    }
  }
  if (Input.pointer.releasedNow && cap.line.active) {
    cap.line.active = false; cap.line.points = [];
  }

  for (const c of cap.creatures) {
    if (c.captured) { c.capturedT += dt; c.y -= dt * 16; continue; }
    c.anim += dt;
    c.hitFlash = Math.max(0, c.hitFlash - dt * 2.5);
    c.stun = Math.max(0, c.stun - dt);
    c.slow = Math.max(0, c.slow - dt);
    c.attackCd -= dt;
    if (c.stun > 0) continue;
    c.actionT -= dt;
    if (c.actionT <= 0) {
      const a = rand(0, Math.PI * 2);
      c.vx = Math.cos(a); c.vy = Math.sin(a);
      c.actionT = rand(0.7, 1.7);
    }
    if (c.attackCd <= 0 && c.dashT <= 0) {
      const dx = cap.ranger.x - c.x, dy = cap.ranger.y - c.y, l = Math.hypot(dx, dy) || 1;
      c.vx = dx / l; c.vy = dy / l;
      c.dashT = rand(0.5, 0.9);
      c.attackCd = rand(2.4, 4.6);
    }
    const slowMult = c.slow > 0 ? 0.55 : 1;
    const dashMult = c.dashT > 0 ? c.species.dashPower : 1;
    const sp = c.species.speed * slowMult * dashMult;
    c.x += c.vx * sp * dt; c.y += c.vy * sp * dt;
    if (c.dashT > 0) c.dashT -= dt;
    if (c.x < 16 || c.x > SCREEN_W - 16) { c.vx *= -1; c.x = clamp(c.x, 16, SCREEN_W - 16); }
    if (c.y < 16 || c.y > SCREEN_H - 16) { c.vy *= -1; c.y = clamp(c.y, 16, SCREEN_H - 16); }

    if (dist(c.x, c.y, cap.ranger.x, cap.ranger.y) < c.species.radius + 8) {
      const dmg = c.dashT > 0 ? 11 : 6;
      applyDamage(dmg, c.species.name + " percute");
      c.dashT = 0; c.attackCd = Math.max(c.attackCd, 1.4);
      const dx = c.x - cap.ranger.x, dy = c.y - cap.ranger.y, l = Math.hypot(dx, dy) || 1;
      c.vx = dx / l; c.vy = dy / l;
    }
  }
  cap.creatures = cap.creatures.filter((c) => !c.captured || c.capturedT < 1.4);

  if (cap.line.active && cap.line.points.length > 1) {
    for (const c of cap.creatures) {
      if (c.captured || c.dashT <= 0) continue;
      for (let i = 1; i < cap.line.points.length; i++) {
        const a = cap.line.points[i - 1], b = cap.line.points[i];
        if (distPointSeg(c.x, c.y, a.x, a.y, b.x, b.y) < c.species.radius + 2) {
          breakLine(c.species.name + " coupe le styler.");
          break;
        }
      }
      if (!cap.line.active) break;
    }
  }

  for (const p of cap.particles) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.93; p.vy *= 0.93; }
  cap.particles = cap.particles.filter((p) => p.life > 0);
}

function drawStatBar(c, x, y, w, h, label, val, max, fillCol, darkCol) {
  c.fillStyle = "#0d2236"; rrect(c, x - 4, y - 4, w + 8, h + 8, 6); c.fill();
  c.fillStyle = darkCol; rrect(c, x, y, w, h, 4); c.fill();
  c.fillStyle = fillCol; rrect(c, x, y, w * (val / max), h, 4); c.fill();
  c.fillStyle = "#ffd866"; c.font = "10px 'Press Start 2P', monospace"; c.textAlign = "left";
  c.fillText(label, x, y - 6);
  c.fillStyle = "#fff"; c.textAlign = "right";
  c.fillText(Math.round(val) + "%", x + w, y - 6);
}

function drawCapture() {
  const t = topCtx;
  const cap = Game.capture;
  const g = t.createLinearGradient(0, 0, 0, SCREEN_H);
  g.addColorStop(0, "#0a1525"); g.addColorStop(1, "#0e1c33");
  t.fillStyle = g; t.fillRect(0, 0, SCREEN_W, SCREEN_H);

  t.fillStyle = "#0d2236"; rrect(t, 16, 14, 608, 54, 8); t.fill();
  t.fillStyle = "#ffd866"; t.font = "14px 'Press Start 2P', monospace"; t.textAlign = "left";
  t.fillText(cap.mission.title.toUpperCase(), 32, 42);
  t.fillStyle = "#9bdce0"; t.font = "14px 'VT323', monospace";
  t.fillText(cap.mission.brief, 32, 60);

  drawStatBar(t, 32, 96, 280, 18, "ENERGIE", cap.ranger.energy, 100, "#ff8a6b", "#5a1c12");
  drawStatBar(t, 32, 124, 280, 18, "STYLER", cap.ranger.styler, 100, "#79e3c4", "#0e3a36");

  t.fillStyle = "#0d2236"; rrect(t, 332, 96, 282, 46, 6); t.fill();
  t.fillStyle = "#ffd866"; t.font = "10px 'Press Start 2P', monospace"; t.textAlign = "left";
  t.fillText("CAPTURES", 348, 116);
  t.fillStyle = "#fff"; t.font = "22px 'Press Start 2P', monospace";
  t.fillText(cap.captured + "/" + cap.mission.target, 348, 140);

  t.fillStyle = "#0d2236"; rrect(t, 332, 152, 138, 46, 6); t.fill();
  t.fillStyle = "#9bdce0"; t.font = "10px 'Press Start 2P', monospace";
  t.fillText("CHRONO", 348, 172);
  const m = String(Math.floor(Math.max(0, cap.timeLeft) / 60)).padStart(2, "0");
  const s = String(Math.floor(Math.max(0, cap.timeLeft) % 60)).padStart(2, "0");
  t.fillStyle = cap.timeLeft < 20 ? "#ff8a6b" : "#fff";
  t.font = "20px 'Press Start 2P', monospace";
  t.fillText(m + ":" + s, 348, 194);

  t.fillStyle = "#0d2236"; rrect(t, 478, 152, 138, 46, 6); t.fill();
  t.fillStyle = "#9bdce0"; t.font = "10px 'Press Start 2P', monospace";
  t.fillText("ONDE  (B)", 494, 172);
  t.fillStyle = cap.ranger.pulseCd > 0 ? "#6b7892" : "#79e3c4";
  t.font = "16px 'Press Start 2P', monospace";
  t.fillText(cap.ranger.pulseCd > 0 ? Math.ceil(cap.ranger.pulseCd) + "s" : "PRET", 494, 192);

  t.fillStyle = "#0d2236"; rrect(t, 16, 210, 608, 158, 8); t.fill();
  t.fillStyle = "#ffd866"; t.font = "10px 'Press Start 2P', monospace";
  t.fillText("JOURNAL DE TERRAIN", 32, 230);
  let yy = 250;
  for (const e of cap.log) {
    t.fillStyle = e.tone === "good" ? "#79e3c4" : e.tone === "warn" ? "#ff8a6b" : "#cfeaff";
    t.font = "16px 'VT323', monospace";
    t.fillText("- " + e.msg, 32, yy);
    yy += 18;
  }

  const b = botCtx;
  const shake = Game.cameraShake;
  b.save();
  if (shake > 0) b.translate(rand(-shake, shake) * 0.3, rand(-shake, shake) * 0.3);

  const arenaG = b.createLinearGradient(0, 0, 0, SCREEN_H);
  arenaG.addColorStop(0, "#3a7a3e"); arenaG.addColorStop(1, "#1f4a25");
  b.fillStyle = arenaG; b.fillRect(0, 0, SCREEN_W, SCREEN_H);
  for (const tt of cap.terrain) {
    b.save(); b.translate(tt.x, tt.y); b.rotate(tt.rot);
    b.fillStyle = tt.color;
    b.beginPath(); b.ellipse(0, 0, tt.rx, tt.ry, 0, 0, Math.PI * 2); b.fill();
    b.restore();
  }
  b.strokeStyle = "#ffd86640"; b.lineWidth = 2;
  b.strokeRect(2, 2, SCREEN_W - 4, SCREEN_H - 4);

  for (const c of cap.creatures) {
    drawCreature(b, c.species, c.x, c.y, c.captured ? c.capturedT : c.anim, c.hitFlash, c.dashT > 0, c.captured);
    if (!c.captured) {
      const w = 28;
      const ratio = clamp(c.temper / c.maxTemper, 0, 1);
      b.fillStyle = "#000a"; b.fillRect(c.x - w / 2, c.y - c.species.radius - 12, w, 4);
      b.fillStyle = ratio > 0.5 ? "#79e3c4" : "#ffd866";
      b.fillRect(c.x - w / 2, c.y - c.species.radius - 12, w * ratio, 4);
    }
  }

  drawHuman(b, "player", cap.ranger.x, cap.ranger.y, cap.ranger.dir, cap.ranger.anim);

  if (cap.ranger.pulseWave > 0) {
    const ww = 1 - cap.ranger.pulseWave;
    b.strokeStyle = "rgba(142,245,211," + (0.5 * cap.ranger.pulseWave).toFixed(2) + ")";
    b.lineWidth = 3;
    b.beginPath(); b.arc(cap.ranger.x, cap.ranger.y, 30 + ww * 130, 0, Math.PI * 2); b.stroke();
  }

  if (cap.line.points.length > 1) {
    b.strokeStyle = "#bef9ff"; b.lineWidth = 3;
    b.lineCap = "round"; b.lineJoin = "round";
    b.shadowColor = "#9ee8ff"; b.shadowBlur = 6;
    b.beginPath();
    b.moveTo(cap.line.points[0].x, cap.line.points[0].y);
    for (let i = 1; i < cap.line.points.length; i++) b.lineTo(cap.line.points[i].x, cap.line.points[i].y);
    b.stroke();
    b.shadowBlur = 0;
  }
  for (const p of cap.particles) {
    const a = clamp(p.life / p.max, 0, 1);
    b.globalAlpha = a; b.fillStyle = p.color;
    b.beginPath(); b.arc(p.x, p.y, p.r * a, 0, Math.PI * 2); b.fill();
    b.globalAlpha = 1;
  }
  if (cap.line.flashRed > 0) { b.fillStyle = "rgba(255,90,90," + (cap.line.flashRed * 0.25).toFixed(2) + ")"; b.fillRect(0, 0, SCREEN_W, SCREEN_H); }
  if (cap.line.flashGreen > 0) { b.fillStyle = "rgba(120,235,180," + (cap.line.flashGreen * 0.22).toFixed(2) + ")"; b.fillRect(0, 0, SCREEN_W, SCREEN_H); }

  b.restore();
}

/* ---------- RESULTS ---------- */
function endMission(success) {
  const cap = Game.capture;
  Game.missionResult = {
    success, captured: cap.captured, target: cap.mission.target,
    energy: cap.ranger.energy, mission: cap.mission, index: cap.index
  };
  switchState("results");
}
function updateResults(dt) {
  Game.t += dt;
  if (Input.aPressed) {
    const r = Game.missionResult;
    const after = () => {
      if (r.success && Game.flags.missionUnlocked === r.index) Game.flags.missionUnlocked++;
      Game.capture = null;
      Game.missionResult = null;
      switchState("hub");
    };
    startDialogue(r.success ? r.mission.success : r.mission.fail, after);
  }
}
function drawResults() {
  const r = Game.missionResult;
  const t = topCtx;
  const g = t.createLinearGradient(0, 0, 0, SCREEN_H);
  if (r.success) { g.addColorStop(0, "#0e2a40"); g.addColorStop(1, "#1d4f56"); }
  else { g.addColorStop(0, "#2a0e15"); g.addColorStop(1, "#3a1c20"); }
  t.fillStyle = g; t.fillRect(0, 0, SCREEN_W, SCREEN_H);

  t.fillStyle = "#0d2236"; rrect(t, 60, 50, 520, 280, 12); t.fill();
  t.strokeStyle = r.success ? "#79e3c4" : "#ff8a6b"; t.lineWidth = 3;
  rrect(t, 60, 50, 520, 280, 12); t.stroke();

  t.fillStyle = r.success ? "#79e3c4" : "#ff8a6b";
  t.font = "20px 'Press Start 2P', monospace"; t.textAlign = "center";
  t.fillText(r.success ? "MISSION REUSSIE" : "MISSION ECHOUEE", 320, 110);

  t.fillStyle = "#cfeaff"; t.font = "16px 'VT323', monospace";
  t.fillText(r.mission.title, 320, 140);

  t.fillStyle = "#fff"; t.font = "18px 'VT323', monospace"; t.textAlign = "left";
  t.fillText("Captures :  " + r.captured + " / " + r.target, 130, 190);
  t.fillText("Energie  :  " + Math.round(r.energy) + "%", 130, 220);
  t.fillText("Total des captures : " + Game.capturedTotal, 130, 250);

  if (Math.floor(Game.t * 2) % 2 === 0) {
    t.fillStyle = "#ffd866"; t.font = "12px 'Press Start 2P', monospace"; t.textAlign = "center";
    t.fillText("APPUIE SUR  A  POUR CONTINUER", 320, 300);
  }

  const b = botCtx;
  b.fillStyle = "#0a1525"; b.fillRect(0, 0, SCREEN_W, SCREEN_H);
  b.fillStyle = "#9bdce0"; b.font = "12px 'Press Start 2P', monospace"; b.textAlign = "center";
  b.fillText("RAPPORT DE TERRAIN", 320, 60);
  if (r.success) {
    drawHuman(b, "player", 320, 220, "down", Game.t * 4);
    b.fillStyle = "#79e3c4"; b.font = "16px 'VT323', monospace";
    b.fillText("Le secteur est apaise.", 320, 290);
  } else {
    b.fillStyle = "#ff8a6b"; b.font = "16px 'VT323', monospace";
    b.fillText("Replie d'urgence.", 320, 220);
    b.fillText("Reessaie depuis le hub.", 320, 250);
  }
}

/* ---------- MAIN LOOP ---------- */
function update(dt) {
  switch (Game.state) {
    case "title": updateTitle(dt); break;
    case "hub": updateHub(dt); break;
    case "dialogue": updateDialogue(dt); break;
    case "capture": updateCapture(dt); break;
    case "results": updateResults(dt); break;
  }
}
function draw() {
  switch (Game.state) {
    case "title": drawTitle(); break;
    case "hub": drawHub(); break;
    case "dialogue": drawDialogue(); break;
    case "capture": drawCapture(); break;
    case "results": drawResults(); break;
  }
}

let lastTime = performance.now();
function frame(now) {
  const dt = Math.min(0.033, (now - lastTime) / 1000);
  lastTime = now;
  update(dt);
  draw();
  endInputFrame();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

