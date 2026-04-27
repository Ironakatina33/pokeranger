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

/* ---------- Audio (synth, sans aucun asset externe) ---------- */
const Sfx = { ctx: null, master: null, muted: false };
function ensureAudio() {
  if (Sfx.ctx) return Sfx.ctx;
  try {
    const C = window.AudioContext || window.webkitAudioContext;
    Sfx.ctx = new C();
    Sfx.master = Sfx.ctx.createGain();
    Sfx.master.gain.value = 0.35;
    Sfx.master.connect(Sfx.ctx.destination);
  } catch (e) { Sfx.muted = true; }
  return Sfx.ctx;
}
// debloque audio au premier geste
const audioUnlock = () => { ensureAudio(); if (Sfx.ctx && Sfx.ctx.state === "suspended") Sfx.ctx.resume(); };
window.addEventListener("pointerdown", audioUnlock, { once: false });
window.addEventListener("keydown", audioUnlock, { once: false });

function playTone(freq, dur, type, vol, attack, decay) {
  if (Sfx.muted) return;
  ensureAudio();
  if (!Sfx.ctx) return;
  const ctx = Sfx.ctx, t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type || "square";
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol || 0.18, t + (attack || 0.005));
  g.gain.exponentialRampToValueAtTime(0.0001, t + (attack || 0.005) + (decay || dur));
  o.connect(g); g.connect(Sfx.master);
  o.start(t); o.stop(t + (attack || 0.005) + (decay || dur) + 0.05);
}
function playSlide(from, to, dur, type, vol) {
  if (Sfx.muted) return;
  ensureAudio();
  if (!Sfx.ctx) return;
  const ctx = Sfx.ctx, t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type || "triangle";
  o.frequency.setValueAtTime(from, t);
  o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol || 0.2, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(Sfx.master);
  o.start(t); o.stop(t + dur + 0.05);
}
function playNoise(dur, vol, lowpass) {
  if (Sfx.muted) return;
  ensureAudio();
  if (!Sfx.ctx) return;
  const ctx = Sfx.ctx, t = ctx.currentTime;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass"; filter.frequency.value = lowpass || 1800;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol || 0.18, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter); filter.connect(g); g.connect(Sfx.master);
  src.start(t); src.stop(t + dur + 0.05);
}

/* SFX de gameplay */
const SFX = {
  step: () => playTone(180 + Math.random() * 30, 0.06, "square", 0.05, 0.002, 0.06),
  dialogTick: () => playTone(540, 0.04, "square", 0.05, 0.001, 0.03),
  loopStart: () => playSlide(220, 480, 0.12, "triangle", 0.16),
  loopHit: () => { playTone(880, 0.08, "triangle", 0.18); setTimeout(() => playTone(1320, 0.08, "triangle", 0.14), 60); },
  befriend: () => {
    playTone(523, 0.1, "triangle", 0.18); // C5
    setTimeout(() => playTone(659, 0.1, "triangle", 0.18), 90);  // E5
    setTimeout(() => playTone(784, 0.16, "triangle", 0.20), 180); // G5
  },
  pulse: () => { playSlide(620, 220, 0.35, "sine", 0.22); playNoise(0.18, 0.05, 1200); },
  fireOut: () => { playNoise(0.4, 0.18, 2200); setTimeout(() => playSlide(900, 200, 0.25, "sine", 0.12), 50); },
  select: () => playTone(780, 0.05, "square", 0.12, 0.002, 0.05),
  back: () => playTone(420, 0.05, "square", 0.10, 0.002, 0.05),
  fail: () => playSlide(400, 90, 0.7, "sawtooth", 0.18),
  success: () => {
    const notes = [523, 659, 784, 1046];
    notes.forEach((n, i) => setTimeout(() => playTone(n, 0.18, "triangle", 0.20), i * 110));
  },
  hurt: () => { playSlide(280, 120, 0.18, "square", 0.18); },
  iris: () => playSlide(140, 60, 0.45, "sine", 0.10)
};

/* ---------- Donnees ---------- */
const SPECIES = {
  sparklit: { id: "sparklit", name: "Sparklit", element: "Foudre", body: "#ffd66b", accent: "#fff5b8", dark: "#a36a00",
    desc: "Petit renard d'orage, vif comme un eclair d'ete. Curieux, joueur, mais panique vite.",
    move: "Etincelle", moveDesc: "Eclaire un passage sombre ou reactive un mecanisme.",
    radius: 10, speed: 70, temper: 90, dashPower: 2.4 },
  mossnib: { id: "mossnib", name: "Mossnib", element: "Feuille", body: "#7fd28a", accent: "#caf3b5", dark: "#3b6e3a",
    desc: "Pousse-mousses paisible. Soigne la nature abimee autour de lui.",
    move: "Repousse", moveDesc: "Fait reverdir un sol seche ou referme un nid abime.",
    radius: 12, speed: 44, temper: 140, dashPower: 1.6 },
  fjordle: { id: "fjordle", name: "Fjordle", element: "Vague", body: "#7fb8ff", accent: "#dbecff", dark: "#274f8a",
    desc: "Loutre des courants. Joue avec l'ecume, adore les enfants.",
    move: "Ondee", moveDesc: "Eteint des flammes ou nettoie une source polluee.",
    radius: 11, speed: 60, temper: 110, dashPower: 2.1 },
  cindrop: { id: "cindrop", name: "Cindrop", element: "Braise", body: "#ff7f7f", accent: "#ffc4b8", dark: "#8a1f1f",
    desc: "Souffle a la fois chaud et timide. Nervosite explosive si on le brusque.",
    move: "Veilleuse", moveDesc: "Allume un feu de camp ou fait fondre une croute de cendres.",
    radius: 10, speed: 76, temper: 95, dashPower: 2.6 },
  voltuff: { id: "voltuff", name: "Voltuff", element: "Foudre", body: "#f4d35e", accent: "#fff4bd", dark: "#8a6a00",
    desc: "Garde paisible des clairieres. Plus tetu que dangereux.",
    move: "Impulsion", moveDesc: "Fait redemarrer un pont mecanique ou un treuil rouille.",
    radius: 12, speed: 56, temper: 130, dashPower: 1.9 },
  pebbleon: { id: "pebbleon", name: "Pebbleon", element: "Roc", body: "#a89377", accent: "#dac8a3", dark: "#4d3920",
    desc: "Vieux compagnon des sentiers. Lent, fiable, sage.",
    move: "Pousse-Roc", moveDesc: "Deplace un rocher qui bloque un chemin ou un nid.",
    radius: 13, speed: 36, temper: 170, dashPower: 1.4 },
  glimmer: { id: "glimmer", name: "Glimmer", element: "Aurore", body: "#d49bff", accent: "#f2dcff", dark: "#5a2e8c",
    desc: "Lueur des soirs. Apparait quand on en a vraiment besoin.",
    move: "Apaisement", moveDesc: "Calme d'un coup une autre creature paniquee proche.",
    radius: 10, speed: 64, temper: 105, dashPower: 1.8 }
};

const CHARACTERS = {
  player: { name: "Cadet", colorA: "#ff6b3d", colorB: "#264a6f", skin: "#f3c79a", hair: "#3a2718" },
  reva: { name: "Cap. Reva", colorA: "#3aa17a", colorB: "#1d3b35", skin: "#e0b893", hair: "#2c1c0e" },
  tomo: { name: "Tomo", colorA: "#5a8bff", colorB: "#1d2c4f", skin: "#f4cfa5", hair: "#1d1a14" },
  halden: { name: "Dr. Halden", colorA: "#bca7d8", colorB: "#3d2c5b", skin: "#ecc7a0", hair: "#cbcbcb" },
  shade: { name: "Shade", colorA: "#1f1f25", colorB: "#5a1029", skin: "#cfa088", hair: "#0c0c0c" },
  bran: { name: "Bran", colorA: "#d6884d", colorB: "#3b2418", skin: "#f0bd92", hair: "#3a1a0a" },
  lila: { name: "Lila", colorA: "#ff77a5", colorB: "#7c3a55", skin: "#fbe4c0", hair: "#e8c34d" },
  yuna: { name: "Yuna", colorA: "#9d6bd0", colorB: "#3b245b", skin: "#f3c79a", hair: "#1a0d2c" }
};

const STORY_INTRO = [
  { speaker: null, text: "VERDIS. Un archipel vivant ou l'on apprend tot a ecouter la nature." },
  { speaker: null, text: "Les Nature Wardens y veillent: ni dresseurs, ni chasseurs." },
  { speaker: null, text: "Juste des gardiens qui aident, sans dominer." },
  { speaker: null, text: "Mais une ombre, le Black Tide, exploite la faune et abime les forets..." },
  { speaker: "reva", text: "Cadet, tu es enfin la. Bienvenue a l'Avant-Poste Halcyon." },
  { speaker: "reva", text: "Je suis le Capitaine Reva. Voici ton Loop Styler." },
  { speaker: "reva", text: "Le styler ne sert pas a capturer. Il sert a calmer." },
  { speaker: "reva", text: "Trace une boucle autour d'une Lumina effrayee, et tu gagneras sa confiance." },
  { speaker: "reva", text: "Elle t'aidera un instant... puis elle retournera dans son habitat. Toujours." },
  { speaker: "player", text: "Aider sans posseder. Compris, Capitaine." },
  { speaker: "reva", text: "Bien. Ton journal, l'Album Lumina, retiendra tous ceux que tu rencontreras." },
  { speaker: "reva", text: "Tu peux l'ouvrir au hub avec B. Va voir Tomo dehors, il t'expliquera." }
];

const MISSIONS = [
  {
    id: "m1", title: "Mission 01 - Bois d'Halcyon",
    brief: "Trois Sparklits paniques pres de l'avant-poste. Apaise-les, qu'ils rentrent au calme.",
    target: 3, timeLimit: 150,
    species: ["sparklit", "sparklit", "sparklit", "mossnib"], spawnExtra: 2,
    intro: [
      { speaker: "tomo", text: "Salut, le nouveau ! Trois Sparklits courent dans tous les sens depuis hier soir." },
      { speaker: "tomo", text: "Ils ne sont pas mechants, juste effrayes. Marche autour d'eux, doucement, et boucle." },
      { speaker: "tomo", text: "Si tu les brusques, ils chargent par reflexe. Casse pas ta ligne." },
      { speaker: "player", text: "Apaiser, pas attraper. Je gere." },
      { speaker: "tomo", text: "Voila l'esprit Warden ! Vas-y." }
    ],
    success: [
      { speaker: "tomo", text: "Regarde-les rentrer chez eux, tranquilles. C'est ca, le metier." },
      { speaker: "reva", text: "Bon travail, cadet. Tu as ecoute avant d'agir." }
    ],
    fail: [{ speaker: "tomo", text: "Pas grave, on retente. Ils sentent le stress, respire d'abord." }]
  },
  {
    id: "m2", title: "Mission 02 - Crique de Corail",
    brief: "Une nappe etrange s'echoue sur les coraux. Apaise les Fjordles affoles, aide Halden a comprendre.",
    target: 4, timeLimit: 180,
    species: ["fjordle", "fjordle", "fjordle", "fjordle", "glimmer", "mossnib"], spawnExtra: 2,
    intro: [
      { speaker: "halden", text: "Ah, cadet ! Une coulee crimson contamine la crique. Les Fjordles paniquent." },
      { speaker: "halden", text: "Aide-les a se calmer, je veux observer leurs ondes une fois apaises." },
      { speaker: "halden", text: "Surtout, ne les capture pas: laisse-les repartir vers le large." },
      { speaker: "player", text: "Je passe les voir, un par un." }
    ],
    success: [
      { speaker: "halden", text: "Incroyable. Une fois calmes, ils m'ont meme designe la source." },
      { speaker: "halden", text: "C'est bien le Black Tide. Du raffinage clandestin de coraux." },
      { speaker: "reva", text: "Tiens-toi pret, cadet. La suite ne sera pas un balade." }
    ],
    fail: [{ speaker: "halden", text: "Pas concluant. Reessaie, j'ai besoin de leurs donnees apaisees." }]
  },
  {
    id: "m3", title: "Mission 03 - Crete des Cendres",
    brief: "Foyers d'incendie sur la crete, Cindrops affoles. Eteins le feu et apaise les Lumina.",
    target: 5, timeLimit: 240,
    species: ["cindrop", "cindrop", "cindrop", "cindrop", "voltuff", "pebbleon"], spawnExtra: 3,
    fires: 3,
    intro: [
      { speaker: "shade", text: "Tiens, tiens. Une Warden seule sur la Crete." },
      { speaker: "shade", text: "Le feu fait fuir les Cindrops vers ma cargaison. Pratique, non ?" },
      { speaker: "reva", text: "Cadet, eteins ces foyers d'abord. Un Fjordle apaise sait faire ca." },
      { speaker: "reva", text: "Une fois lie, place-toi pres d'un foyer et appuie B pour son Ondee." },
      { speaker: "player", text: "Forets sauvees, Cindrops apaises. On y va." }
    ],
    success: [
      { speaker: "reva", text: "La crete respire de nouveau. Tu n'as rien capture, tu as protege." },
      { speaker: "tomo", text: "Bienvenue dans l'equipe, pour de vrai cette fois !" },
      { speaker: "halden", text: "Le Black Tide se replie. Mais d'autres iles attendent..." }
    ],
    fail: [{ speaker: "reva", text: "Repli, cadet. On revient a tete froide." }]
  }
];

/* Mobilier achetable. Chaque item est unique et occupe un emplacement
   precis dans la cabane. Le prix est en Lumes (monnaie). */
const FURNITURE = {
  rug:       { id: "rug",       name: "Tapis tresse",     price: 80,  slot: "floor",    desc: "Un tapis chaud aux motifs Verdis." },
  bed:       { id: "bed",       name: "Lit warden",       price: 220, slot: "bed",      desc: "Couverture orange et drap blanc, pour de bons reves." },
  plant_l:   { id: "plant_l",   name: "Fougere",          price: 60,  slot: "corner_l", desc: "Une fougere fournie qui pousse seule." },
  plant_r:   { id: "plant_r",   name: "Fleur tropicale",  price: 90,  slot: "corner_r", desc: "Une fleur de Verdis, parfumee." },
  lamp:      { id: "lamp",      name: "Lampe chaude",     price: 120, slot: "lamp",     desc: "Lumiere douce ambree, pour les soirs." },
  table:     { id: "table",     name: "Table + chaise",   price: 140, slot: "table",    desc: "Pour relire ses notes de Warden." },
  painting:  { id: "painting",  name: "Tableau Lumina",   price: 180, slot: "wall_l",   desc: "Une scene de Glimmer dans la nuit." },
  bookshelf: { id: "bookshelf", name: "Bibliotheque",     price: 250, slot: "wall_r",   desc: "Carnet de terrain et atlas de Verdis." },
  plush:     { id: "plush",     name: "Peluche Sparklit", price: 150, slot: "shelf",    desc: "Souvenir d'une amitie passagere." },
  trophy:    { id: "trophy",    name: "Trophee Warden",   price: 300, slot: "trophy",   desc: "Recompense d'une saison entiere de service." }
};

/* Obstacles franchissables avec un don de terrain (Lumina apaisee).
   Chaque type associe l'espece dont la field move debloque le passage.
   verbActive: phrase courte affichee dans la dialogue d'invocation. */
const OBSTACLE_TYPES = {
  rock:  { species: "pebbleon", label: "Rocher",       verb: "deplace le rocher",       w: 36, h: 30 },
  bush:  { species: "mossnib",  label: "Ronces",       verb: "ecarte les ronces",       w: 38, h: 28 },
  water: { species: "fjordle",  label: "Mare",         verb: "fait apparaitre des nenuphars", w: 56, h: 36 },
  dark:  { species: "sparklit", label: "Passage sombre", verb: "eclaire le passage",   w: 40, h: 36 },
  thorn: { species: "cindrop",  label: "Buisson sec",  verb: "embrase le buisson sec",  w: 36, h: 30 },
  gear:  { species: "voltuff",  label: "Mecanisme",    verb: "rebranche le mecanisme",  w: 32, h: 36 },
  spirit: { species: "glimmer", label: "Lumina sauvage", verb: "apaise la creature",    w: 36, h: 36 }
};

/* ---------- Etat global ---------- */
const Game = {
  state: "title",
  t: 0,
  cameraShake: 0,
  flags: { introDone: false, missionUnlocked: 0, obstaclesCleared: {} },
  bondsTotal: 0,
  album: new Set(),
  albumSelected: 0,
  hub: null,
  capture: null,
  dialogue: null,
  missionResult: null,
  transition: null,
  sanctuary: null,
  summon: null,         // { obstacle, species, t, phase }
  pickLumina: null,     // { obstacle, candidates, sel }
  // Economie / housing
  coins: 0,
  owned: new Set(),     // ids de FURNITURE possedes
  coinFloat: null,      // { amount, t } animation +X au-dessus du joueur
  shop: null,           // { sel, scroll }
  house: null,          // { player, exitT }
  // Ecran-titre
  titleMenu: "main",     // main | options | credits | confirmReset
  titleSelected: 0,
  titleEnter: 0,         // animation d'entree
  options: { volume: 0.7, muted: false }
};

/* Helper : recompense le joueur avec X Lumes (avec affichage flottant) */
function giveCoins(amount, reason) {
  if (!amount) return;
  Game.coins += amount;
  Game.coinFloat = { amount, t: 0, reason: reason || "" };
  SFX.dialogTick();
  saveGame();
}

function switchState(s) { Game.state = s; }
function rememberLumina(id) { Game.album.add(id); }
function albumKnows(id) { return Game.album.has(id); }

/* ---------- Sauvegarde localStorage ---------- */
const SAVE_KEY = "natureWardens_save_v1";
const OPTIONS_KEY = "natureWardens_options_v1";
function saveGame() {
  try {
    const data = {
      introDone: Game.flags.introDone,
      missionUnlocked: Game.flags.missionUnlocked,
      bondsTotal: Game.bondsTotal,
      album: Array.from(Game.album),
      childQuestDone: !!Game.flags.childQuestDone,
      obstaclesCleared: Game.flags.obstaclesCleared || {},
      coins: Game.coins | 0,
      owned: Array.from(Game.owned)
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) {}
}
function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    Game.flags.introDone = !!d.introDone;
    Game.flags.missionUnlocked = d.missionUnlocked | 0;
    Game.flags.childQuestDone = !!d.childQuestDone;
    Game.flags.obstaclesCleared = d.obstaclesCleared || {};
    Game.bondsTotal = d.bondsTotal | 0;
    Game.album = new Set(d.album || []);
    Game.coins = d.coins | 0;
    Game.owned = new Set(d.owned || []);
    return true;
  } catch (e) { return false; }
}
function hasSave() {
  try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
}
function resetSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  Game.flags = { introDone: false, missionUnlocked: 0, childQuestDone: false, obstaclesCleared: {} };
  Game.album = new Set(); Game.bondsTotal = 0;
  Game.coins = 0; Game.owned = new Set();
}
function saveOptions() {
  try { localStorage.setItem(OPTIONS_KEY, JSON.stringify(Game.options)); } catch (e) {}
  applyOptions();
}
function loadOptions() {
  try {
    const raw = localStorage.getItem(OPTIONS_KEY);
    if (!raw) { applyOptions(); return; }
    const d = JSON.parse(raw);
    Game.options.volume = typeof d.volume === "number" ? clamp(d.volume, 0, 1) : 0.7;
    Game.options.muted = !!d.muted;
  } catch (e) {}
  applyOptions();
}
function applyOptions() {
  if (Sfx.master) Sfx.master.gain.value = Game.options.muted ? 0 : Game.options.volume * 0.5;
  Sfx.muted = Game.options.muted;
}

/* Transition iris entre etats: phase 1 = ferme, mid = action, phase 2 = ouvre */
function startTransition(midAction, opts) {
  opts = opts || {};
  Game.transition = {
    phase: "close", t: 0,
    closeDur: opts.closeDur || 0.45,
    holdDur: opts.holdDur || 0.05,
    openDur: opts.openDur || 0.45,
    midAction,
    cx: opts.cx !== undefined ? opts.cx : SCREEN_W / 2,
    cy: opts.cy !== undefined ? opts.cy : SCREEN_H / 2,
    didMid: false
  };
  SFX.iris();
}
function updateTransition(dt) {
  const tr = Game.transition; if (!tr) return;
  tr.t += dt;
  if (tr.phase === "close" && tr.t >= tr.closeDur) {
    tr.phase = "hold"; tr.t = 0;
    if (!tr.didMid && tr.midAction) { tr.didMid = true; tr.midAction(); }
  } else if (tr.phase === "hold" && tr.t >= tr.holdDur) {
    tr.phase = "open"; tr.t = 0;
  } else if (tr.phase === "open" && tr.t >= tr.openDur) {
    Game.transition = null;
  }
}
function drawTransitionOverlay() {
  const tr = Game.transition; if (!tr) return;
  // rayon en fonction de la phase
  const maxR = Math.hypot(SCREEN_W, SCREEN_H);
  let r;
  if (tr.phase === "close") {
    const k = clamp(tr.t / tr.closeDur, 0, 1);
    r = lerpEase(maxR, 0, k);
  } else if (tr.phase === "open") {
    const k = clamp(tr.t / tr.openDur, 0, 1);
    r = lerpEase(0, maxR, k);
  } else {
    r = 0;
  }
  // dessine sur les DEUX ecrans pour effet console portable
  for (const ctx of [topCtx, botCtx]) {
    ctx.save();
    ctx.fillStyle = "#000";
    // grand rect avec un trou circulaire
    ctx.beginPath();
    ctx.rect(0, 0, SCREEN_W, SCREEN_H);
    ctx.arc(tr.cx, tr.cy, Math.max(0, r), 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill("evenodd");
    // ombre douce sur le bord du cercle
    if (r > 1) {
      const grad = ctx.createRadialGradient(tr.cx, tr.cy, Math.max(0, r - 12), tr.cx, tr.cy, r + 6);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, "rgba(0,0,0,0.5)");
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(tr.cx, tr.cy, r + 6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}
function lerpEase(a, b, k) { const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; return a + (b - a) * e; }

/* ---------- Hub map ---------- */
function buildHub() {
  const map = [];
  for (let y = 0; y < ROWS; y++) { const row = []; for (let x = 0; x < COLS; x++) row.push(0); map.push(row); }
  // Bordures d'arbres avec une ouverture cote est (rangees 5-7) menant au sentier
  for (let x = 0; x < COLS; x++) { map[0][x] = 5; map[ROWS - 1][x] = 5; }
  for (let y = 0; y < ROWS; y++) {
    map[y][0] = 5;
    if (y < 5 || y > 7) map[y][COLS - 1] = 5;
  }
  // Chemin de terre central horizontal pres du bas
  for (let x = 1; x < COLS - 1; x++) map[ROWS - 3][x] = 1;
  // Chemin vertical (allee centrale)
  for (let y = 2; y < ROWS - 3; y++) map[y][10] = 1;
  // Cabane warden (toit + base)
  for (let y = 3; y <= 5; y++) for (let x = 3; x <= 6; x++) map[y][x] = 7;
  for (let x = 3; x <= 6; x++) { map[2][x] = 8; map[3][x] = 8; }
  map[5][4] = 9; map[5][5] = 9;
  // Riviere / pont (decales pour laisser le sentier est libre)
  for (let y = 1; y < ROWS - 1; y++) map[y][13] = 3;
  for (let y = 1; y < ROWS - 1; y++) map[y][12] = 4;
  // Le pont praticable (rangee 6)
  map[6][12] = 1; map[6][13] = 1;
  // Decor floral
  const decor = [[2, 12], [3, 13], [4, 11], [8, 7], [9, 3], [7, 12]];
  for (const d of decor) if (map[d[0]][d[1]] === 0) map[d[0]][d[1]] = 11;
  // Quelques cailloux
  const stones = [[3, 16], [9, 18]];
  for (const s of stones) if (map[s[0]][s[1]] === 0) map[s[0]][s[1]] = 10;

  const npcs = [
    { id: "reva", x: 4 * TILE + 16, y: 6 * TILE + 16, dir: "down", spriteKey: "reva",
      lines: () => {
        const sanctuaryHint = { speaker: "reva", text: "A l'est, un sentier mene au Sanctuaire. Mais il est barre. Tes amies Lumina sauront t'aider a degager la voie." };
        if (Game.flags.missionUnlocked >= MISSIONS.length)
          return [{ speaker: "reva", text: "Tu as fait l'archipel fier, cadet." }, sanctuaryHint];
        if (Game.album.size > 0)
          return [{ speaker: "reva", text: "Va parler a Tomo pour la mission suivante." }, sanctuaryHint];
        return [{ speaker: "reva", text: "Va parler a Tomo pour lancer la mission suivante." }];
      } },
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
      ] },
    /* Marchande Yuna : decoration & maison */
    { id: "yuna", x: 8 * TILE + 16, y: 8 * TILE + 16, dir: "down", spriteKey: "yuna",
      lines: () => {
        const intro = [
          { speaker: "yuna", text: "Hey, le cadet ! Tu as une cabane vide juste a cote, non ?" },
          { speaker: "yuna", text: "Je tiens la boutique de decoration de l'Avant-Poste. Lumes contre confort." }
        ];
        const ask = { speaker: "yuna", text: "Tu veux jeter un oeil a mes affaires ?", action: { type: "openShop" } };
        return [...intro, ask];
      } },
    /* Mini-quete: enfant qui cherche son Sparklit */
    { id: "lila", x: 7 * TILE + 16, y: 6 * TILE + 16, dir: "down", spriteKey: "lila",
      lines: () => {
        if (Game.flags.childQuestDone) {
          return [{ speaker: "lila", text: "Mon Sparklit est rentre tout seul ! Merci, Cadet." }];
        }
        if (albumKnows("sparklit")) {
          return [
            { speaker: "lila", text: "Tu... tu as croise mon Sparklit ?" },
            { speaker: "player", text: "Il etait juste effraye. Une fois calme, il a retrouve le chemin." },
            { speaker: "lila", text: "T'es trop fort ! Tiens, mon trefle porte-bonheur, il est pour toi.", action: { type: "completeChildQuest" } }
          ];
        }
        return [
          { speaker: "lila", text: "M'sieur ! Mon Sparklit s'est sauve dans le Bois d'Halcyon hier." },
          { speaker: "lila", text: "Si tu en vois un... apaise-le doucement, qu'il puisse rentrer." }
        ];
      } },
    /* Panneau Warden (object, pas un humain) */
    { id: "board", x: 13 * TILE + 16, y: (ROWS - 4) * TILE - 4, dir: "down", spriteKey: "board",
      lines: () => [
        { speaker: null, text: "PANNEAU WARDEN: 'Aider sans dominer. Apaiser sans posseder. Tous les Lumina retournent libres.'" },
        { speaker: null, text: "Liens noues : " + Game.bondsTotal + ". Album Lumina : " + Game.album.size + " / " + Object.keys(SPECIES).length + "." }
      ] }
  ];

  /* Obstacles franchissables avec un don de terrain - sur le sentier est.
     Le premier (Ronces) se debloque apres m1 (Mossnib).
     Le second (Mare) se debloque apres m2 (Fjordle). */
  const obstacleDefs = [
    { id: "h_bush",  type: "bush",  x: 15 * TILE + 16, y: 6 * TILE + 16 },
    { id: "h_water", type: "water", x: 17 * TILE + 16, y: 6 * TILE + 16 }
  ];
  const obstacles = [];
  for (const od of obstacleDefs) {
    if (Game.flags.obstaclesCleared && Game.flags.obstaclesCleared[od.id]) continue;
    const t = OBSTACLE_TYPES[od.type];
    obstacles.push({ id: od.id, type: od.type, x: od.x, y: od.y, w: t.w, h: t.h, anim: 0 });
  }

  /* Portail vers le sanctuaire (au-dela des obstacles) */
  const portal = { x: 18 * TILE + 16, y: 6 * TILE + 16, anim: 0 };

  Game.hub = {
    map, npcs, obstacles, portal,
    player: { x: 10 * TILE + 16, y: (ROWS - 4) * TILE + 16, dir: "down", anim: 0 }
  };
}

function tileSolid(t) { return t === 5 || t === 6 || t === 7 || t === 8 || t === 3 || t === 10; }

/* Touffe d'herbe stylisee (style DS): petite gerbe en V */
function drawGrassTuft(c, x, y, color) {
  c.strokeStyle = color || "#2c5d24";
  c.lineWidth = 1;
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(x, y + 4); c.lineTo(x - 2, y);
  c.moveTo(x, y + 4); c.lineTo(x, y - 1);
  c.moveTo(x, y + 4); c.lineTo(x + 2, y);
  c.stroke();
}
/* Petite fleur 3x3 */
function drawTinyFlower(c, x, y, col) {
  c.fillStyle = col; c.fillRect(x, y - 1, 1, 1); c.fillRect(x - 1, y, 1, 1);
  c.fillRect(x + 1, y, 1, 1); c.fillRect(x, y + 1, 1, 1);
  c.fillStyle = "#ffd866"; c.fillRect(x, y, 1, 1);
}
/* Tile d'herbe vive style DS top-down */
function drawGrassTile(c, x, y, seed) {
  const s = (seed * 9301 + 49297) % 233280;
  const r1 = (s % 100) / 100;
  const r2 = ((s * 7) % 100) / 100;
  const r3 = ((s * 13) % 100) / 100;
  // base avec leger gradient horizontal
  const base = "#5fbe3a";
  const lighter = "#79d24e";
  const darker = "#3e9b2a";
  px(c, x, y, TILE, TILE, base);
  // patch plus clair (vague de lumiere)
  if (r1 > 0.55) {
    c.fillStyle = lighter;
    c.beginPath(); c.ellipse(x + r2 * TILE, y + r3 * TILE, 6 + r1 * 5, 4 + r1 * 3, 0, 0, Math.PI * 2); c.fill();
  }
  // petits dots plus sombres pour relief
  c.fillStyle = darker;
  for (let i = 0; i < 3; i++) {
    const dx = ((s + i * 17) % TILE);
    const dy = ((s + i * 31) % TILE);
    c.fillRect(x + dx, y + dy, 1, 1);
  }
  // touffes
  if (r1 > 0.45) drawGrassTuft(c, x + 6 + r2 * 6, y + 6 + r3 * 6, "#2c5d24");
  if (r2 > 0.6) drawGrassTuft(c, x + 18 + r3 * 6, y + 18 + r1 * 6, "#2c5d24");
  // fleur occasionnelle
  if (r3 > 0.78) {
    const cols = ["#ffffff", "#ffb3c7", "#ffd866", "#ffe6f1"];
    drawTinyFlower(c, x + 10 + ((s % 12) | 0), y + 12 + ((s % 8) | 0), cols[(s | 0) % cols.length]);
  }
}

function drawTile(c, t, x, y) {
  const SP = TILE;
  switch (t) {
    case 0:
      drawGrassTile(c, x, y, (x * 73856093) ^ (y * 19349663));
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

/* ---------- Obstacles & portail ---------- */
function drawObstacle(c, ob, t) {
  const x = ob.x, y = ob.y;
  // Indicateur "interactible"  : icone de la creature requise au-dessus
  c.save();
  switch (ob.type) {
    case "rock": {
      // gros rocher gris
      c.fillStyle = "rgba(0,0,0,0.32)";
      c.beginPath(); c.ellipse(x, y + 14, 22, 5, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#7e6a4d";
      c.beginPath(); c.ellipse(x, y, 20, 16, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#a89377";
      c.beginPath(); c.ellipse(x - 3, y - 4, 14, 10, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#dac8a3";
      c.beginPath(); c.arc(x - 6, y - 8, 4, 0, Math.PI * 2); c.fill();
      c.strokeStyle = "#4d3920"; c.lineWidth = 1.4;
      c.beginPath(); c.ellipse(x, y, 20, 16, 0, 0, Math.PI * 2); c.stroke();
      // craquelure
      c.beginPath(); c.moveTo(x + 4, y - 4); c.lineTo(x + 10, y + 4); c.stroke();
      break;
    }
    case "bush": {
      // ronces - boules vertes avec epines rouges
      c.fillStyle = "rgba(0,0,0,0.32)";
      c.beginPath(); c.ellipse(x, y + 14, 22, 5, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#3e9b2a";
      c.beginPath(); c.arc(x - 6, y, 12, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(x + 6, y - 2, 13, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(x, y + 4, 10, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#5fbe3a";
      c.beginPath(); c.arc(x - 3, y - 4, 7, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(x + 8, y - 6, 5, 0, Math.PI * 2); c.fill();
      // epines
      c.strokeStyle = "#8a1f1f"; c.lineWidth = 1.5; c.lineCap = "round";
      for (let i = 0; i < 6; i++) {
        const a = i * (Math.PI * 2 / 6);
        const ex = x + Math.cos(a) * 12, ey = y + Math.sin(a) * 9;
        c.beginPath(); c.moveTo(ex, ey); c.lineTo(ex + Math.cos(a) * 4, ey + Math.sin(a) * 4); c.stroke();
      }
      // petits fruits rouges
      c.fillStyle = "#d04040";
      c.beginPath(); c.arc(x - 4, y, 1.6, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(x + 6, y + 2, 1.6, 0, Math.PI * 2); c.fill();
      break;
    }
    case "water": {
      c.fillStyle = "#274f8a";
      c.beginPath(); c.ellipse(x, y, 28, 16, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#3a78b8";
      c.beginPath(); c.ellipse(x, y - 2, 24, 12, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = "#a8d4ff"; c.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        const off = Math.sin(t * 1.4 + i) * 3;
        c.beginPath(); c.moveTo(x - 12 + off, y - 4 + i * 3); c.lineTo(x + 12 + off, y - 4 + i * 3); c.stroke();
      }
      break;
    }
    case "thorn": {
      c.fillStyle = "#7e3a1f";
      c.beginPath(); c.ellipse(x, y, 18, 12, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = "#5a1c12"; c.lineWidth = 1.4;
      for (let i = 0; i < 7; i++) {
        const a = i * (Math.PI / 4);
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * 14, y + Math.sin(a) * 10); c.stroke();
      }
      c.fillStyle = "#caa977";
      c.beginPath(); c.arc(x - 3, y - 1, 3, 0, Math.PI * 2); c.fill();
      break;
    }
    case "dark": {
      c.fillStyle = "rgba(20,12,30,0.85)";
      c.beginPath(); c.ellipse(x, y, 22, 18, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = "rgba(10,5,20,0.95)";
      c.beginPath(); c.arc(x, y, 11, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#5a4a3a";
      for (let i = -1; i <= 1; i++) {
        c.fillRect(x + i * 6 - 1, y - 8, 2, 6);
      }
      break;
    }
    case "gear": {
      c.fillStyle = "#7e6a4d";
      c.fillRect(x - 12, y + 4, 24, 6);
      c.fillStyle = "#a89377";
      for (let i = 0; i < 8; i++) {
        const a = i * (Math.PI / 4) + Math.sin(t) * 0.05;
        c.fillRect(x + Math.cos(a) * 10 - 2, y + Math.sin(a) * 10 - 2, 4, 4);
      }
      c.fillStyle = "#5e3a1f";
      c.beginPath(); c.arc(x, y, 8, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#a89377";
      c.beginPath(); c.arc(x, y, 4, 0, Math.PI * 2); c.fill();
      break;
    }
    case "spirit": {
      c.fillStyle = "rgba(212,155,255,0.4)";
      c.beginPath(); c.arc(x, y, 16, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#d49bff";
      c.beginPath(); c.arc(x, y, 8, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#fff";
      c.beginPath(); c.arc(x - 2, y - 2, 2, 0, Math.PI * 2); c.fill();
      break;
    }
  }
  c.restore();
}

function drawObstacleHint(c, ob, sp, near) {
  // Bulle au-dessus de l'obstacle avec icone de l'espece requise
  const x = ob.x, y = ob.y - 22;
  if (near) {
    // halo
    c.fillStyle = "rgba(255,216,102,0.18)";
    c.beginPath(); c.arc(ob.x, ob.y, 22 + Math.sin(Game.t * 4) * 1.5, 0, Math.PI * 2); c.fill();
  }
  // bulle
  c.fillStyle = "#0d2236d8";
  rrect(c, x - 18, y - 12, 36, 18, 5); c.fill();
  c.strokeStyle = "#ffd866"; c.lineWidth = 1;
  rrect(c, x - 18, y - 12, 36, 18, 5); c.stroke();
  // mini sprite de la creature requise
  c.save(); c.translate(x - 7, y - 1); c.scale(0.55, 0.55);
  drawCreature(c, sp, 0, 0, Game.t * 1.5, 0, false, false);
  c.restore();
  // petite fleche
  c.fillStyle = "#ffd866";
  c.font = "9px 'Press Start 2P', monospace"; c.textAlign = "left";
  c.fillText(near ? "A" : "?", x + 4, y + 3);
}

function drawPortal(c, p, t) {
  // Stele de pierre encadrant un portail lumineux
  // socle
  c.fillStyle = "rgba(0,0,0,0.32)";
  c.beginPath(); c.ellipse(p.x, p.y + 16, 22, 5, 0, 0, Math.PI * 2); c.fill();
  // colonnes
  c.fillStyle = "#7e6a4d";
  c.fillRect(p.x - 16, p.y - 14, 6, 30);
  c.fillRect(p.x + 10, p.y - 14, 6, 30);
  c.fillStyle = "#a89377";
  c.fillRect(p.x - 16, p.y - 16, 6, 4);
  c.fillRect(p.x + 10, p.y - 16, 6, 4);
  // linteau
  c.fillStyle = "#7e6a4d";
  c.fillRect(p.x - 18, p.y - 18, 36, 6);
  // glyphe
  c.fillStyle = "#ffd866";
  c.beginPath(); c.arc(p.x, p.y - 15, 2, 0, Math.PI * 2); c.fill();
  // halo lumineux qui pulse
  const pulse = 0.5 + 0.5 * Math.sin(t * 3);
  const grad = c.createRadialGradient(p.x, p.y, 4, p.x, p.y, 18);
  grad.addColorStop(0, "rgba(255,236,160," + (0.7 + pulse * 0.3).toFixed(2) + ")");
  grad.addColorStop(0.7, "rgba(212,155,255,0.4)");
  grad.addColorStop(1, "rgba(212,155,255,0)");
  c.fillStyle = grad;
  c.beginPath(); c.ellipse(p.x, p.y - 2, 12, 16, 0, 0, Math.PI * 2); c.fill();
  // particules
  for (let i = 0; i < 4; i++) {
    const ph = (t * 1.5 + i * 0.7) % 1;
    const py = p.y + 6 - ph * 22;
    c.fillStyle = "rgba(255,255,255," + (1 - ph).toFixed(2) + ")";
    c.fillRect(p.x - 4 + (i * 3) - 4, py | 0, 1, 1);
  }
}

/* Panneau d'affichage Warden */
function drawNoticeBoard(c, cx, cy) {
  // ombre
  c.fillStyle = "rgba(0,0,0,0.32)";
  c.beginPath(); c.ellipse(cx, cy + 14, 14, 4, 0, 0, Math.PI * 2); c.fill();
  // poteau
  c.fillStyle = "#7d4f24"; c.fillRect(cx - 1, cy - 4, 3, 18);
  c.fillStyle = "#5e3a1f"; c.fillRect(cx + 1, cy - 4, 1, 18);
  // panneau bois
  c.fillStyle = "#a06e3a"; c.fillRect(cx - 12, cy - 18, 24, 16);
  c.fillStyle = "#7d4f24"; c.fillRect(cx - 12, cy - 18, 24, 1);
  c.fillStyle = "#7d4f24"; c.fillRect(cx - 12, cy - 3, 24, 1);
  // veines bois
  c.fillStyle = "#7d4f2455";
  c.fillRect(cx - 10, cy - 14, 20, 1);
  c.fillRect(cx - 10, cy - 9, 20, 1);
  // logo Warden (feuille jaune)
  c.fillStyle = "#ffd866";
  c.beginPath(); c.ellipse(cx, cy - 11, 4, 2.5, -0.3, 0, Math.PI * 2); c.fill();
  c.strokeStyle = "#7a3a00"; c.lineWidth = 1;
  c.beginPath(); c.moveTo(cx - 3, cy - 9); c.lineTo(cx + 3, cy - 13); c.stroke();
}

function drawHuman(c, charKey, cx, cy, dir, anim) {
  const ch = CHARACTERS[charKey] || CHARACTERS.player;
  const step = Math.floor(anim) % 4;
  const bob = step === 1 ? -1 : step === 3 ? 1 : 0;
  const isPlayer = charKey === "player";

  // ombre ronde sous le perso
  c.fillStyle = "rgba(0,0,0,0.34)";
  c.beginPath(); c.ellipse(cx, cy + 14, 10, 3, 0, 0, Math.PI * 2); c.fill();

  /* JAMBES */
  const legY = cy + 8 + bob;
  const legL = step === 1 ? -1 : step === 3 ? 0 : 0;
  const legR = step === 3 ? -1 : step === 1 ? 0 : 0;
  // pantalon
  px(c, cx - 4, legY + legL, 3, 5, ch.colorB);
  px(c, cx + 1, legY + legR, 3, 5, ch.colorB);
  // ourlet plus clair
  px(c, cx - 4, legY + 4 + legL, 3, 1, "#3b6e7b");
  px(c, cx + 1, legY + 4 + legR, 3, 1, "#3b6e7b");
  // chaussures
  px(c, cx - 4, legY + 5 + legL, 3, 1, "#1a1a1a");
  px(c, cx + 1, legY + 5 + legR, 3, 1, "#1a1a1a");

  /* CORPS / VESTE */
  const bodyY = cy + 1 + bob;
  // base orange
  px(c, cx - 5, bodyY, 11, 8, ch.colorA);
  // ombre cote (volume)
  px(c, cx + 4, bodyY, 1, 8, "rgba(0,0,0,0.18)");
  // col blanc
  px(c, cx - 4, bodyY, 9, 1, "#ffffff");
  // ceinture marron
  px(c, cx - 5, bodyY + 6, 11, 1, "#3a2718");
  px(c, cx - 1, bodyY + 6, 2, 1, "#ffd866"); // boucle
  // bande verticale jaune (zip)
  px(c, cx, bodyY + 1, 1, 5, "#ffd866");
  // logo Warden (feuille jaune ronde) sur le buste si player et dir=down
  if (isPlayer && dir === "down") {
    px(c, cx - 3, bodyY + 3, 2, 2, "#ffd866");
    px(c, cx - 2, bodyY + 3, 1, 1, "#fff5b8");
  }

  /* BRAS */
  if (dir === "left") {
    px(c, cx - 6, bodyY + 1, 2, 5, ch.colorA);
    px(c, cx - 6, bodyY + 5, 2, 1, ch.skin);
  } else if (dir === "right") {
    px(c, cx + 5, bodyY + 1, 2, 5, ch.colorA);
    px(c, cx + 5, bodyY + 5, 2, 1, ch.skin);
  } else {
    px(c, cx - 6, bodyY + 1, 1, 5, ch.colorA);
    px(c, cx + 6, bodyY + 1, 1, 5, ch.colorA);
    // mains
    px(c, cx - 6, bodyY + 6, 1, 1, ch.skin);
    px(c, cx + 6, bodyY + 6, 1, 1, ch.skin);
  }

  /* TETE */
  const headY = cy - 13 + bob;
  // visage
  px(c, cx - 6, headY + 2, 13, 9, ch.skin);
  px(c, cx - 5, headY + 1, 11, 1, ch.skin);
  px(c, cx - 5, headY + 10, 11, 1, ch.skin);
  // joues (petit rouge)
  px(c, cx - 5, headY + 8, 2, 1, "rgba(255,140,140,0.45)");
  px(c, cx + 4, headY + 8, 2, 1, "rgba(255,140,140,0.45)");
  // ombrage du menton (cou)
  px(c, cx - 3, headY + 11, 7, 1, "rgba(0,0,0,0.12)");

  /* CHEVEUX */
  if (dir === "up") {
    px(c, cx - 6, headY, 13, 7, ch.hair);
    px(c, cx - 7, headY + 2, 1, 4, ch.hair);
    px(c, cx + 7, headY + 2, 1, 4, ch.hair);
  } else {
    px(c, cx - 6, headY, 13, 4, ch.hair);
    px(c, cx - 7, headY + 1, 1, 5, ch.hair);
    px(c, cx + 7, headY + 1, 1, 5, ch.hair);
    // meche frontale
    if (dir === "down") {
      px(c, cx - 5, headY + 4, 3, 1, ch.hair);
      px(c, cx + 3, headY + 4, 3, 1, ch.hair);
    } else if (dir === "left") {
      px(c, cx - 5, headY + 4, 5, 1, ch.hair);
    } else if (dir === "right") {
      px(c, cx + 1, headY + 4, 5, 1, ch.hair);
    }
    // brillance
    px(c, cx - 3, headY + 1, 4, 1, "rgba(255,255,255,0.3)");
  }

  /* CASQUETTE / BANDEAU si Player (chibi ranger feel) */
  if (isPlayer) {
    if (dir === "up") {
      // visiere arriere
      px(c, cx - 7, headY + 1, 15, 1, ch.colorA);
    } else {
      // bandeau orange avec logo
      px(c, cx - 7, headY + 1, 15, 2, ch.colorA);
      px(c, cx - 7, headY + 1, 15, 1, "#a83a1f"); // ombre haut
      // logo feuille au centre
      if (dir === "down") {
        px(c, cx - 1, headY + 1, 2, 1, "#ffd866");
        px(c, cx, headY + 2, 1, 1, "#ffd866");
      }
      // visiere
      px(c, cx - 7, headY + 3, 4, 1, ch.colorA);
      px(c, cx + 4, headY + 3, 4, 1, ch.colorA);
    }
  }

  /* YEUX */
  if (dir === "down") {
    px(c, cx - 4, headY + 6, 3, 3, "#ffffff");
    px(c, cx + 2, headY + 6, 3, 3, "#ffffff");
    px(c, cx - 3, headY + 7, 2, 2, "#1a1f3a");
    px(c, cx + 3, headY + 7, 2, 2, "#1a1f3a");
    px(c, cx - 2, headY + 6, 1, 1, "#ffffff");
    px(c, cx + 4, headY + 6, 1, 1, "#ffffff");
    // bouche douce
    px(c, cx, headY + 9, 1, 1, "#7c3a2b");
  } else if (dir === "left") {
    px(c, cx - 5, headY + 6, 3, 3, "#ffffff");
    px(c, cx - 4, headY + 7, 2, 2, "#1a1f3a");
    px(c, cx - 3, headY + 6, 1, 1, "#ffffff");
    px(c, cx - 5, headY + 9, 2, 1, "#7c3a2b");
  } else if (dir === "right") {
    px(c, cx + 2, headY + 6, 3, 3, "#ffffff");
    px(c, cx + 3, headY + 7, 2, 2, "#1a1f3a");
    px(c, cx + 4, headY + 6, 1, 1, "#ffffff");
    px(c, cx + 3, headY + 9, 2, 1, "#7c3a2b");
  }
}

/* Petits helpers de rendu creature */
function softShadow(c, w, h) {
  c.fillStyle = "rgba(0,0,0,0.32)";
  c.beginPath(); c.ellipse(0, h, w, h * 0.35, 0, 0, Math.PI * 2); c.fill();
}
function eyesPair(c, x1, x2, y, r, blinking, lookSide) {
  if (blinking) {
    c.strokeStyle = "#1a1a1a"; c.lineWidth = 1.4; c.lineCap = "round";
    c.beginPath(); c.moveTo(x1 - r, y); c.lineTo(x1 + r, y); c.stroke();
    c.beginPath(); c.moveTo(x2 - r, y); c.lineTo(x2 + r, y); c.stroke();
    return;
  }
  // blanc
  c.fillStyle = "#ffffff";
  c.beginPath(); c.arc(x1, y, r, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(x2, y, r, 0, Math.PI * 2); c.fill();
  // pupille (peut regarder de cote)
  const px = (lookSide || 0) * (r * 0.4);
  c.fillStyle = "#1a1f3a";
  c.beginPath(); c.arc(x1 + px, y + 0.5, r * 0.65, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(x2 + px, y + 0.5, r * 0.65, 0, Math.PI * 2); c.fill();
  // brillance
  c.fillStyle = "#ffffff";
  c.beginPath(); c.arc(x1 + px - r * 0.25, y - r * 0.35, r * 0.25, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(x2 + px - r * 0.25, y - r * 0.35, r * 0.25, 0, Math.PI * 2); c.fill();
}

function drawCreature(c, sp, cx, cy, anim, hitFlash, dashing, captured) {
  const r = sp.radius;
  const wob = Math.sin(anim * 4) * 1.0;
  const breath = 1 + Math.sin(anim * 2.5) * 0.05;
  const blinkPhase = (cx * 0.013 + cy * 0.017);
  const blinking = ((anim * 0.45 + blinkPhase) % 4) < 0.12;
  const lookSide = Math.sin(anim * 0.7 + blinkPhase * 5) > 0.92 ? 1 : Math.sin(anim * 0.7 + blinkPhase * 5) < -0.92 ? -1 : 0;

  c.save(); c.translate(cx, cy + wob);
  if (captured) c.globalAlpha = clamp(1 - anim, 0, 1);
  softShadow(c, r * 0.95, r + 5);

  if (hitFlash > 0) {
    c.fillStyle = "rgba(255,255,255," + (0.6 * hitFlash).toFixed(2) + ")";
    c.beginPath(); c.arc(0, 0, r + 5 + hitFlash * 6, 0, Math.PI * 2); c.fill();
  }
  if (dashing) {
    c.strokeStyle = sp.accent;
    c.lineWidth = 2; c.setLineDash([4, 3]); c.lineDashOffset = -anim * 14;
    c.beginPath(); c.arc(0, 0, r + 6, 0, Math.PI * 2); c.stroke();
    c.setLineDash([]);
  }

  c.save(); c.scale(1 / breath, breath);
  switch (sp.id) {
    case "sparklit": drawSparklit(c, sp, r, anim, blinking, lookSide); break;
    case "mossnib": drawMossnib(c, sp, r, anim, blinking, lookSide); break;
    case "fjordle": drawFjordle(c, sp, r, anim, blinking, lookSide); break;
    case "cindrop": drawCindrop(c, sp, r, anim, blinking, lookSide); break;
    case "voltuff": drawVoltuff(c, sp, r, anim, blinking, lookSide); break;
    case "pebbleon": drawPebbleon(c, sp, r, anim, blinking, lookSide); break;
    case "glimmer": drawGlimmer(c, sp, r, anim, blinking, lookSide); break;
    default: drawGenericCreature(c, sp, r, anim, blinking, lookSide); break;
  }
  c.restore();
  c.restore();
}

/* Sparklit : renard d'orage. Corps rond jaune, oreilles triangulaires, masque
   sombre autour des yeux, queue en zigzag d'eclair. */
function drawSparklit(c, sp, r, anim, blinking, lookSide) {
  const earTw = Math.sin(anim * 6) * 0.25;
  // Queue eclair (zigzag) qui flicker
  c.save(); c.translate(r * 0.7, -r * 0.05); c.rotate(Math.sin(anim * 4) * 0.2);
  c.fillStyle = sp.body; c.strokeStyle = sp.dark; c.lineWidth = 1.2; c.lineJoin = "miter";
  c.beginPath();
  c.moveTo(0, -r * 0.2);
  c.lineTo(r * 0.55, -r * 0.55);
  c.lineTo(r * 0.3, -r * 0.35);
  c.lineTo(r * 0.85, -r * 0.7);
  c.lineTo(r * 0.55, -r * 0.05);
  c.lineTo(r * 0.2, r * 0.25);
  c.closePath(); c.fill(); c.stroke();
  // Pointe lumineuse
  c.fillStyle = "#fff5b8";
  c.beginPath(); c.arc(r * 0.85, -r * 0.7, 1.6, 0, Math.PI * 2); c.fill();
  c.restore();
  // Corps : ovale large
  c.fillStyle = sp.body;
  c.beginPath(); c.ellipse(0, r * 0.05, r, r * 0.95, 0, 0, Math.PI * 2); c.fill();
  // Ventre clair
  c.fillStyle = sp.accent;
  c.beginPath(); c.ellipse(0, r * 0.35, r * 0.6, r * 0.5, 0, 0, Math.PI * 2); c.fill();
  // Outline
  c.strokeStyle = sp.dark; c.lineWidth = 1.4;
  c.beginPath(); c.ellipse(0, r * 0.05, r, r * 0.95, 0, 0, Math.PI * 2); c.stroke();
  // Pattes courtes
  c.fillStyle = sp.dark;
  c.fillRect(-r * 0.55 | 0, (r * 0.85) | 0, 3, 3);
  c.fillRect((r * 0.4) | 0, (r * 0.85) | 0, 3, 3);
  // Oreilles triangulaires (twitch)
  c.fillStyle = sp.body; c.strokeStyle = sp.dark;
  c.save(); c.translate(-r * 0.45, -r * 0.7); c.rotate(-0.2 + earTw);
  c.beginPath(); c.moveTo(-r * 0.3, r * 0.35); c.lineTo(0, -r * 0.55); c.lineTo(r * 0.25, r * 0.3); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = "#ff9a3a"; // interieur oreille
  c.beginPath(); c.moveTo(-r * 0.12, r * 0.18); c.lineTo(0, -r * 0.3); c.lineTo(r * 0.1, r * 0.18); c.closePath(); c.fill();
  c.restore();
  c.fillStyle = sp.body;
  c.save(); c.translate(r * 0.45, -r * 0.7); c.rotate(0.2 - earTw);
  c.beginPath(); c.moveTo(-r * 0.25, r * 0.3); c.lineTo(0, -r * 0.55); c.lineTo(r * 0.3, r * 0.35); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = "#ff9a3a";
  c.beginPath(); c.moveTo(-r * 0.1, r * 0.18); c.lineTo(0, -r * 0.3); c.lineTo(r * 0.12, r * 0.18); c.closePath(); c.fill();
  c.restore();
  // Masque sombre autour des yeux
  c.fillStyle = "rgba(80,40,0,0.25)";
  c.beginPath(); c.ellipse(0, -r * 0.05, r * 0.78, r * 0.32, 0, 0, Math.PI * 2); c.fill();
  // Yeux
  eyesPair(c, -r * 0.32, r * 0.32, -r * 0.05, 2.4, blinking, lookSide);
  // Museau
  c.fillStyle = sp.dark;
  c.beginPath(); c.arc(0, r * 0.28, 1.6, 0, Math.PI * 2); c.fill();
  // Bouche
  c.strokeStyle = sp.dark; c.lineWidth = 1; c.lineCap = "round";
  c.beginPath(); c.moveTo(-2, r * 0.42); c.quadraticCurveTo(0, r * 0.55, 2, r * 0.42); c.stroke();
  // Joues
  c.fillStyle = "rgba(255,120,80,0.35)";
  c.beginPath(); c.arc(-r * 0.7, r * 0.25, 2, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(r * 0.7, r * 0.25, 2, 0, Math.PI * 2); c.fill();
}

/* Mossnib : herisson de mousse. Corps en goutte vert, dos avec petites pousses
   et fleurs, museau pointu rose. */
function drawMossnib(c, sp, r, anim, blinking, lookSide) {
  // Corps - ovale legerement etire
  c.fillStyle = sp.body;
  c.beginPath(); c.ellipse(0, r * 0.1, r * 1.05, r * 0.9, 0, 0, Math.PI * 2); c.fill();
  // Ventre
  c.fillStyle = sp.accent;
  c.beginPath(); c.ellipse(0, r * 0.4, r * 0.65, r * 0.45, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = sp.dark; c.lineWidth = 1.4;
  c.beginPath(); c.ellipse(0, r * 0.1, r * 1.05, r * 0.9, 0, 0, Math.PI * 2); c.stroke();
  // Dos couvert de mousse / pousses : petites bosses vert fonce
  c.fillStyle = sp.dark;
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI + i * (Math.PI / 5) + Math.PI * 0.05;
    const ex = Math.cos(a) * r * 0.85, ey = Math.sin(a) * r * 0.7 - r * 0.05;
    c.beginPath(); c.arc(ex, ey, r * 0.18, 0, Math.PI * 2); c.fill();
  }
  // Petites feuilles (3) qui balancent
  const sway = Math.sin(anim * 2) * 0.3;
  for (let i = 0; i < 3; i++) {
    const baseX = (i - 1) * r * 0.45;
    c.save(); c.translate(baseX, -r * 0.6); c.rotate(sway + (i - 1) * 0.2);
    c.fillStyle = "#3b6e3a";
    c.beginPath(); c.ellipse(0, -r * 0.25, r * 0.16, r * 0.4, 0.3, 0, Math.PI * 2); c.fill();
    c.strokeStyle = "#1f3f1d"; c.lineWidth = 1;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -r * 0.55); c.stroke();
    c.restore();
  }
  // Petite fleur sur la tete
  c.fillStyle = "#ffd866";
  c.beginPath(); c.arc(r * 0.05, -r * 0.78, r * 0.13, 0, Math.PI * 2); c.fill();
  for (let i = 0; i < 5; i++) {
    const a = anim * 0.5 + i * (Math.PI * 2 / 5);
    const fx = r * 0.05 + Math.cos(a) * r * 0.18, fy = -r * 0.78 + Math.sin(a) * r * 0.18;
    c.fillStyle = "#ff8aa6";
    c.beginPath(); c.arc(fx, fy, r * 0.11, 0, Math.PI * 2); c.fill();
  }
  c.fillStyle = "#fff5b8";
  c.beginPath(); c.arc(r * 0.05, -r * 0.78, r * 0.06, 0, Math.PI * 2); c.fill();

  // Museau pointu (legerement rose)
  c.fillStyle = sp.body;
  c.beginPath();
  c.moveTo(0, r * 0.05);
  c.quadraticCurveTo(r * 0.35, r * 0.2, r * 0.5, r * 0.5);
  c.quadraticCurveTo(r * 0.1, r * 0.55, 0, r * 0.45);
  c.closePath(); c.fill();
  c.strokeStyle = sp.dark; c.lineWidth = 1; c.stroke();
  // truffe rose
  c.fillStyle = "#ff8aa6";
  c.beginPath(); c.arc(r * 0.48, r * 0.48, 1.6, 0, Math.PI * 2); c.fill();
  // Yeux
  eyesPair(c, -r * 0.18, r * 0.22, -r * 0.05, 2.2, blinking, lookSide);
  // Joues
  c.fillStyle = "rgba(255,140,180,0.35)";
  c.beginPath(); c.arc(-r * 0.55, r * 0.25, 2, 0, Math.PI * 2); c.fill();
}

/* Fjordle : loutre de mer. Corps allonge bleu, museau plat, petites mains
   sur le ventre, queue plate. */
function drawFjordle(c, sp, r, anim, blinking, lookSide) {
  // Queue plate qui ondule
  c.save(); c.translate(0, r * 1.0); c.rotate(Math.sin(anim * 3) * 0.25);
  c.fillStyle = sp.body;
  c.beginPath(); c.ellipse(0, r * 0.15, r * 0.6, r * 0.18, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = sp.dark; c.lineWidth = 1; c.stroke();
  c.restore();
  // Corps - poire
  c.fillStyle = sp.body;
  c.beginPath();
  c.moveTo(-r * 0.85, -r * 0.2);
  c.bezierCurveTo(-r * 1.0, r * 0.6, -r * 0.4, r * 0.95, 0, r * 0.95);
  c.bezierCurveTo(r * 0.4, r * 0.95, r * 1.0, r * 0.6, r * 0.85, -r * 0.2);
  c.bezierCurveTo(r * 0.7, -r * 0.85, -r * 0.7, -r * 0.85, -r * 0.85, -r * 0.2);
  c.closePath(); c.fill();
  // ventre clair
  c.fillStyle = sp.accent;
  c.beginPath(); c.ellipse(0, r * 0.45, r * 0.55, r * 0.5, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = sp.dark; c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(-r * 0.85, -r * 0.2);
  c.bezierCurveTo(-r * 1.0, r * 0.6, -r * 0.4, r * 0.95, 0, r * 0.95);
  c.bezierCurveTo(r * 0.4, r * 0.95, r * 1.0, r * 0.6, r * 0.85, -r * 0.2);
  c.bezierCurveTo(r * 0.7, -r * 0.85, -r * 0.7, -r * 0.85, -r * 0.85, -r * 0.2);
  c.closePath(); c.stroke();
  // Mains sur le ventre (en train de tenir un coquillage)
  c.fillStyle = sp.dark;
  c.beginPath(); c.arc(-r * 0.18, r * 0.55, r * 0.14, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(r * 0.18, r * 0.55, r * 0.14, 0, Math.PI * 2); c.fill();
  // coquillage rose
  c.fillStyle = "#ff8aa6";
  c.beginPath(); c.arc(0, r * 0.5, r * 0.18, 0, Math.PI * 2); c.fill();
  c.strokeStyle = "#7a3a52"; c.lineWidth = 1;
  for (let i = -1; i <= 1; i++) {
    c.beginPath(); c.moveTo(i * r * 0.1, r * 0.36); c.lineTo(i * r * 0.1, r * 0.62); c.stroke();
  }
  // Petites oreilles arrondies
  c.fillStyle = sp.body;
  c.beginPath(); c.arc(-r * 0.55, -r * 0.7, r * 0.18, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(r * 0.55, -r * 0.7, r * 0.18, 0, Math.PI * 2); c.fill();
  c.strokeStyle = sp.dark; c.lineWidth = 1;
  c.beginPath(); c.arc(-r * 0.55, -r * 0.7, r * 0.18, 0, Math.PI * 2); c.stroke();
  c.beginPath(); c.arc(r * 0.55, -r * 0.7, r * 0.18, 0, Math.PI * 2); c.stroke();
  // Museau plat clair
  c.fillStyle = sp.accent;
  c.beginPath(); c.ellipse(0, r * 0.15, r * 0.5, r * 0.28, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = sp.dark; c.lineWidth = 1; c.stroke();
  // truffe
  c.fillStyle = sp.dark;
  c.beginPath(); c.arc(0, r * 0.05, 1.6, 0, Math.PI * 2); c.fill();
  // moustaches
  c.strokeStyle = sp.dark; c.lineWidth = 0.8;
  c.beginPath(); c.moveTo(-r * 0.15, r * 0.18); c.lineTo(-r * 0.55, r * 0.2); c.stroke();
  c.beginPath(); c.moveTo(r * 0.15, r * 0.18); c.lineTo(r * 0.55, r * 0.2); c.stroke();
  // Yeux
  eyesPair(c, -r * 0.28, r * 0.28, -r * 0.18, 2.2, blinking, lookSide);
  // bouche en U
  c.strokeStyle = sp.dark; c.lineWidth = 1; c.lineCap = "round";
  c.beginPath();
  c.moveTo(-2, r * 0.18); c.quadraticCurveTo(0, r * 0.32, 2, r * 0.18);
  c.stroke();
}

/* Cindrop : poussin de cendre. Corps rouge ovale, crete de flammes
   au-dessus, petites ailes, pattes. */
function drawCindrop(c, sp, r, anim, blinking, lookSide) {
  // Crete de flammes
  const fl = Math.sin(anim * 14) * 1.2;
  c.fillStyle = "#ff5a3a";
  c.beginPath();
  c.moveTo(-r * 0.55, -r * 0.6);
  c.quadraticCurveTo(-r * 0.3 - fl * 0.3, -r * 1.4, -r * 0.1, -r * 0.7);
  c.quadraticCurveTo(0, -r * 1.55, r * 0.15, -r * 0.7);
  c.quadraticCurveTo(r * 0.4 + fl * 0.3, -r * 1.35, r * 0.55, -r * 0.6);
  c.closePath(); c.fill();
  c.fillStyle = "#ffd866";
  c.beginPath();
  c.moveTo(-r * 0.4, -r * 0.65);
  c.quadraticCurveTo(-r * 0.15 - fl * 0.2, -r * 1.15, 0, -r * 0.7);
  c.quadraticCurveTo(r * 0.2 + fl * 0.2, -r * 1.1, r * 0.4, -r * 0.65);
  c.closePath(); c.fill();
  c.fillStyle = "#fff5b8";
  c.beginPath(); c.arc(0, -r * 0.95, 1.5, 0, Math.PI * 2); c.fill();
  // Pattes
  c.fillStyle = "#ff9a3a";
  c.fillRect((-r * 0.45) | 0, (r * 0.85) | 0, 3, 4);
  c.fillRect((r * 0.3) | 0, (r * 0.85) | 0, 3, 4);
  c.fillRect((-r * 0.55) | 0, (r * 1.05) | 0, 5, 1);
  c.fillRect((r * 0.25) | 0, (r * 1.05) | 0, 5, 1);
  // Corps
  c.fillStyle = sp.body;
  c.beginPath(); c.ellipse(0, r * 0.15, r * 0.95, r * 0.85, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = sp.accent;
  c.beginPath(); c.ellipse(0, r * 0.4, r * 0.6, r * 0.45, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = sp.dark; c.lineWidth = 1.4;
  c.beginPath(); c.ellipse(0, r * 0.15, r * 0.95, r * 0.85, 0, 0, Math.PI * 2); c.stroke();
  // Petites ailes qui battent
  const wingF = Math.sin(anim * 8) * 0.35;
  c.fillStyle = sp.body;
  c.save(); c.translate(-r * 0.85, r * 0.0); c.rotate(-0.3 + wingF);
  c.beginPath(); c.ellipse(-r * 0.15, 0, r * 0.35, r * 0.55, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = sp.dark; c.stroke();
  c.restore();
  c.fillStyle = sp.body;
  c.save(); c.translate(r * 0.85, r * 0.0); c.rotate(0.3 - wingF);
  c.beginPath(); c.ellipse(r * 0.15, 0, r * 0.35, r * 0.55, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = sp.dark; c.stroke();
  c.restore();
  // Bec
  c.fillStyle = "#ff9a3a";
  c.beginPath();
  c.moveTo(0, r * 0.05); c.lineTo(r * 0.18, r * 0.18); c.lineTo(0, r * 0.3); c.closePath(); c.fill();
  c.strokeStyle = sp.dark; c.lineWidth = 1; c.stroke();
  // Yeux
  eyesPair(c, -r * 0.32, r * 0.32, -r * 0.05, 2.4, blinking, lookSide);
  // Joues braise
  c.fillStyle = "rgba(255,80,40,0.45)";
  c.beginPath(); c.arc(-r * 0.65, r * 0.2, 2.2, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(r * 0.65, r * 0.2, 2.2, 0, Math.PI * 2); c.fill();
}

/* Voltuff : mouton tonnerre. Boule de laine jaune avec cornes. */
function drawVoltuff(c, sp, r, anim, blinking, lookSide) {
  // Laine - chaine de bosses
  c.fillStyle = sp.accent;
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI + i * (Math.PI / 9) + 0.1;
    const bx = Math.cos(a) * r * 0.95, by = Math.sin(a) * r * 0.85;
    c.beginPath(); c.arc(bx, by, r * 0.28, 0, Math.PI * 2); c.fill();
  }
  // Corps interieur
  c.fillStyle = sp.body;
  c.beginPath(); c.ellipse(0, r * 0.05, r * 0.95, r * 0.85, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = sp.dark; c.lineWidth = 1.4;
  c.beginPath(); c.ellipse(0, r * 0.05, r * 0.95, r * 0.85, 0, 0, Math.PI * 2); c.stroke();
  // Visage rose pale
  c.fillStyle = "#fbe4c0";
  c.beginPath(); c.ellipse(0, r * 0.2, r * 0.55, r * 0.5, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = sp.dark; c.lineWidth = 1; c.stroke();
  // Cornes en spirale
  c.fillStyle = "#caa977"; c.strokeStyle = "#7a5e30"; c.lineWidth = 1;
  for (const sgn of [-1, 1]) {
    c.save(); c.translate(sgn * r * 0.55, -r * 0.55); c.rotate(sgn * 0.3);
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(sgn * r * 0.45, -r * 0.1, sgn * r * 0.3, r * 0.18);
    c.quadraticCurveTo(0, r * 0.05, 0, 0);
    c.closePath(); c.fill(); c.stroke();
    c.restore();
  }
  // Oreilles allongees jaunes
  c.fillStyle = sp.body; c.strokeStyle = sp.dark;
  for (const sgn of [-1, 1]) {
    c.save(); c.translate(sgn * r * 0.85, -r * 0.05); c.rotate(sgn * 0.6);
    c.beginPath(); c.ellipse(0, 0, r * 0.18, r * 0.3, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    c.restore();
  }
  // Yeux
  eyesPair(c, -r * 0.22, r * 0.22, r * 0.1, 2.2, blinking, lookSide);
  // Joues
  c.fillStyle = "rgba(255,140,80,0.45)";
  c.beginPath(); c.arc(-r * 0.42, r * 0.3, 2.2, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(r * 0.42, r * 0.3, 2.2, 0, Math.PI * 2); c.fill();
  // Petit eclair charge sur le front
  c.fillStyle = "#ffec6b";
  c.beginPath();
  c.moveTo(-2, -r * 0.15); c.lineTo(2, -r * 0.05); c.lineTo(-1, r * 0.0);
  c.lineTo(2, r * 0.18); c.lineTo(-2, r * 0.0); c.lineTo(1, -r * 0.05); c.closePath();
  c.fill();
  c.strokeStyle = "#a87b00"; c.lineWidth = 0.6; c.stroke();
}

/* Pebbleon : tortue de pierre. Carapace ronde grise avec mousse, tete sortante. */
function drawPebbleon(c, sp, r, anim, blinking, lookSide) {
  // Pattes courtes en bas
  c.fillStyle = "#a89377"; c.strokeStyle = sp.dark; c.lineWidth = 1;
  for (const sgn of [-1, 1]) {
    c.beginPath(); c.ellipse(sgn * r * 0.55, r * 0.85, r * 0.22, r * 0.16, 0, 0, Math.PI * 2); c.fill(); c.stroke();
  }
  // Carapace - dome
  c.fillStyle = "#7e6a4d";
  c.beginPath(); c.ellipse(0, r * 0.0, r * 1.05, r * 0.85, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#a89377";
  c.beginPath(); c.ellipse(0, -r * 0.05, r * 0.9, r * 0.7, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = sp.dark; c.lineWidth = 1.4;
  c.beginPath(); c.ellipse(0, r * 0.0, r * 1.05, r * 0.85, 0, 0, Math.PI * 2); c.stroke();
  // Hexagones / plaques
  c.strokeStyle = sp.dark; c.lineWidth = 0.8;
  for (let i = 0; i < 5; i++) {
    const px2 = -r * 0.6 + (i % 3) * r * 0.4;
    const py2 = -r * 0.3 + Math.floor(i / 3) * r * 0.4;
    c.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = k * Math.PI / 3;
      const xx = px2 + Math.cos(a) * r * 0.18;
      const yy = py2 + Math.sin(a) * r * 0.16;
      if (k === 0) c.moveTo(xx, yy); else c.lineTo(xx, yy);
    }
    c.closePath(); c.stroke();
  }
  // Mousse sur le dessus
  c.fillStyle = "#3b6e3a";
  c.beginPath(); c.ellipse(-r * 0.15, -r * 0.55, r * 0.4, r * 0.18, -0.1, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#5fbe3a";
  c.beginPath(); c.ellipse(-r * 0.05, -r * 0.62, r * 0.25, r * 0.1, -0.1, 0, Math.PI * 2); c.fill();
  // Tete sortante jaune-brun
  const headBob = Math.sin(anim * 2) * 1.5;
  c.fillStyle = "#caa977";
  c.beginPath(); c.ellipse(0, r * 0.65 + headBob, r * 0.42, r * 0.35, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = sp.dark; c.lineWidth = 1; c.stroke();
  // Yeux
  c.fillStyle = "#ffffff";
  c.beginPath(); c.arc(-r * 0.18, r * 0.6 + headBob, 2.2, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(r * 0.18, r * 0.6 + headBob, 2.2, 0, Math.PI * 2); c.fill();
  if (blinking) {
    c.strokeStyle = "#1a1a1a"; c.lineWidth = 1.4; c.lineCap = "round";
    c.beginPath(); c.moveTo(-r * 0.32, r * 0.6 + headBob); c.lineTo(-r * 0.05, r * 0.6 + headBob); c.stroke();
    c.beginPath(); c.moveTo(r * 0.05, r * 0.6 + headBob); c.lineTo(r * 0.32, r * 0.6 + headBob); c.stroke();
  } else {
    c.fillStyle = "#1a1f3a";
    c.beginPath(); c.arc(-r * 0.18 + lookSide, r * 0.6 + headBob, 1.4, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(r * 0.18 + lookSide, r * 0.6 + headBob, 1.4, 0, Math.PI * 2); c.fill();
  }
  // Bouche
  c.strokeStyle = sp.dark; c.lineCap = "round";
  c.beginPath(); c.moveTo(-2, r * 0.78 + headBob); c.lineTo(2, r * 0.78 + headBob); c.stroke();
}

/* Glimmer : esprit lunaire. Corps flottant violet, voile transparente,
   etoiles autour. */
function drawGlimmer(c, sp, r, anim, blinking, lookSide) {
  // Aura large
  for (let k = 3; k > 0; k--) {
    const aR = r * (1.2 + k * 0.18) + Math.sin(anim * 2.4 + k) * 1.5;
    c.fillStyle = "rgba(212,155,255," + (0.18 / k).toFixed(2) + ")";
    c.beginPath(); c.arc(0, 0, aR, 0, Math.PI * 2); c.fill();
  }
  // Etoiles tournantes
  for (let i = 0; i < 4; i++) {
    const ang = anim * 0.7 + i * (Math.PI / 2);
    const sx = Math.cos(ang) * r * 1.65;
    const sy = Math.sin(ang) * r * 1.05;
    c.fillStyle = "#fff";
    c.beginPath();
    for (let k = 0; k < 5; k++) {
      const a = k * (Math.PI * 2 / 5) - Math.PI / 2;
      const rr = k % 2 === 0 ? 2.6 : 1.1;
      const xx = sx + Math.cos(a) * rr, yy = sy + Math.sin(a) * rr;
      if (k === 0) c.moveTo(xx, yy); else c.lineTo(xx, yy);
    }
    c.closePath(); c.fill();
  }
  // Voile arriere
  c.fillStyle = "rgba(242,220,255,0.45)";
  c.beginPath();
  c.moveTo(-r * 0.7, r * 0.1);
  c.bezierCurveTo(-r * 1.1, r * 0.6, -r * 0.4, r * 1.2, 0, r * 1.05);
  c.bezierCurveTo(r * 0.4, r * 1.2, r * 1.1, r * 0.6, r * 0.7, r * 0.1);
  c.closePath(); c.fill();
  // Corps tete
  c.fillStyle = sp.body;
  c.beginPath(); c.ellipse(0, 0, r * 0.95, r, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = sp.accent;
  c.beginPath(); c.ellipse(0, r * 0.25, r * 0.6, r * 0.5, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = sp.dark; c.lineWidth = 1.4;
  c.beginPath(); c.ellipse(0, 0, r * 0.95, r, 0, 0, Math.PI * 2); c.stroke();
  // Couronne / antenne en croissant
  c.strokeStyle = "#fff5b8"; c.lineWidth = 2; c.lineCap = "round";
  c.beginPath();
  c.arc(0, -r * 0.95, r * 0.45, Math.PI * 1.15, Math.PI * 1.85);
  c.stroke();
  c.fillStyle = "#fff5b8";
  c.beginPath(); c.arc(-r * 0.42, -r * 0.85, 1.6, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(r * 0.42, -r * 0.85, 1.6, 0, Math.PI * 2); c.fill();
  // Yeux fermes / doux (semi-clos)
  c.strokeStyle = "#3a1a4f"; c.lineWidth = 1.4; c.lineCap = "round";
  if (blinking) {
    c.beginPath(); c.moveTo(-r * 0.45, -r * 0.05); c.lineTo(-r * 0.15, -r * 0.05); c.stroke();
    c.beginPath(); c.moveTo(r * 0.15, -r * 0.05); c.lineTo(r * 0.45, -r * 0.05); c.stroke();
  } else {
    c.beginPath(); c.arc(-r * 0.3, -r * 0.05, r * 0.18, Math.PI, 0, false); c.stroke();
    c.beginPath(); c.arc(r * 0.3, -r * 0.05, r * 0.18, Math.PI, 0, false); c.stroke();
  }
  // Larme de lumiere sous oeil
  c.fillStyle = "#fff5b8";
  c.beginPath(); c.arc(-r * 0.3, r * 0.12, 1, 0, Math.PI * 2); c.fill();
  // Petite bouche
  c.strokeStyle = sp.dark; c.lineWidth = 1; c.lineCap = "round";
  c.beginPath(); c.moveTo(-2, r * 0.32); c.quadraticCurveTo(0, r * 0.42, 2, r * 0.32); c.stroke();
}

function drawGenericCreature(c, sp, r, anim, blinking, lookSide) {
  c.fillStyle = sp.body;
  c.beginPath(); c.ellipse(0, 0, r, r * 0.92, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = sp.accent;
  c.beginPath(); c.ellipse(0, r * 0.25, r * 0.7, r * 0.55, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = sp.dark; c.lineWidth = 1.4;
  c.beginPath(); c.ellipse(0, 0, r, r * 0.92, 0, 0, Math.PI * 2); c.stroke();
  eyesPair(c, -r * 0.3, r * 0.3, -r * 0.05, 2.2, blinking, lookSide);
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
  SFX.dialogTick();
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
function titleMainItems() {
  const items = [];
  items.push({ id: "new", label: "NOUVELLE PARTIE" });
  if (Game.flags.introDone || hasSave()) items.push({ id: "continue", label: "CONTINUER" });
  items.push({ id: "album", label: "ALBUM LUMINA" });
  items.push({ id: "options", label: "OPTIONS" });
  items.push({ id: "credits", label: "CREDITS" });
  return items;
}
function titleOptionsItems() {
  return [
    { id: "volume", label: "VOLUME" },
    { id: "mute", label: "SOURDINE" },
    { id: "reset", label: "EFFACER LA SAUVEGARDE" },
    { id: "back", label: "RETOUR" }
  ];
}
function moveSel(delta, len) {
  Game.titleSelected = (Game.titleSelected + delta + len) % len;
  SFX.dialogTick();
}

function updateTitle(dt) {
  Game.t += dt;
  Game.titleEnter = Math.min(1, Game.titleEnter + dt * 1.2);

  if (Game.titleMenu === "main") {
    const items = titleMainItems();
    if (Input.pressed.has("ArrowUp") || Input.pressed.has("KeyW") || Input.pressed.has("KeyZ")) moveSel(-1, items.length);
    if (Input.pressed.has("ArrowDown") || Input.pressed.has("KeyS")) moveSel(1, items.length);
    if (Input.aPressed) {
      const it = items[Game.titleSelected];
      SFX.select();
      if (it.id === "new") {
        // Si une sauvegarde existe, la redemander
        if (hasSave()) { Game.titleMenu = "confirmReset"; Game.titleSelected = 1; }
        else titleStartNewGame();
      } else if (it.id === "continue") {
        titleContinue();
      } else if (it.id === "album") {
        Game.albumSelected = 0;
        switchState("album");
      } else if (it.id === "options") {
        Game.titleMenu = "options"; Game.titleSelected = 0;
      } else if (it.id === "credits") {
        Game.titleMenu = "credits";
      }
    }
  } else if (Game.titleMenu === "options") {
    const items = titleOptionsItems();
    if (Input.pressed.has("ArrowUp") || Input.pressed.has("KeyW") || Input.pressed.has("KeyZ")) moveSel(-1, items.length);
    if (Input.pressed.has("ArrowDown") || Input.pressed.has("KeyS")) moveSel(1, items.length);
    const cur = items[Game.titleSelected];
    if (cur.id === "volume") {
      if (Input.pressed.has("ArrowLeft") || Input.pressed.has("KeyA") || Input.pressed.has("KeyQ")) {
        Game.options.volume = clamp(Game.options.volume - 0.1, 0, 1); saveOptions(); SFX.dialogTick();
      }
      if (Input.pressed.has("ArrowRight") || Input.pressed.has("KeyD")) {
        Game.options.volume = clamp(Game.options.volume + 0.1, 0, 1); saveOptions(); SFX.dialogTick();
      }
    }
    if (Input.aPressed) {
      SFX.select();
      if (cur.id === "mute") { Game.options.muted = !Game.options.muted; saveOptions(); }
      else if (cur.id === "reset") { Game.titleMenu = "confirmReset"; Game.titleSelected = 1; }
      else if (cur.id === "back") { Game.titleMenu = "main"; Game.titleSelected = 0; }
    }
    if (Input.bPressed) { SFX.back(); Game.titleMenu = "main"; Game.titleSelected = 0; }
  } else if (Game.titleMenu === "confirmReset") {
    if (Input.pressed.has("ArrowLeft") || Input.pressed.has("ArrowRight") || Input.pressed.has("KeyA") || Input.pressed.has("KeyD") || Input.pressed.has("KeyQ"))
      moveSel(1, 2);
    if (Input.aPressed) {
      SFX.select();
      if (Game.titleSelected === 0) {
        resetSave();
        Game.titleMenu = "main"; Game.titleSelected = 0;
        titleStartNewGame();
      } else {
        Game.titleMenu = "main"; Game.titleSelected = 0;
      }
    }
    if (Input.bPressed) { SFX.back(); Game.titleMenu = "main"; Game.titleSelected = 0; }
  } else if (Game.titleMenu === "credits") {
    if (Input.aPressed || Input.bPressed) { SFX.back(); Game.titleMenu = "main"; }
  }
}

function titleStartNewGame() {
  resetSave();
  startTransition(() => {
    startDialogue(STORY_INTRO, () => {
      Game.flags.introDone = true;
      saveGame();
      buildHub();
      switchState("hub");
    });
  });
}
function titleContinue() {
  startTransition(() => { buildHub(); switchState("hub"); });
}
/* ---------- TITLE: rendu ---------- */
function drawTitle() {
  drawTitleBackdrop(topCtx);
  drawTitleLogo(topCtx);
  drawTitleHero(topCtx);
  drawTitleBottomMenu();
}

function drawTitleBackdrop(c) {
  // Ciel degrade (matin tropical)
  const g = c.createLinearGradient(0, 0, 0, SCREEN_H);
  g.addColorStop(0, "#fbd38a");
  g.addColorStop(0.35, "#f4a26b");
  g.addColorStop(0.7, "#7ad6e8");
  g.addColorStop(1, "#5dbf99");
  c.fillStyle = g; c.fillRect(0, 0, SCREEN_W, SCREEN_H);

  // Soleil avec halo
  const sunX = 510, sunY = 90;
  const sunR = 36;
  const halo = c.createRadialGradient(sunX, sunY, sunR * 0.6, sunX, sunY, sunR * 3);
  halo.addColorStop(0, "rgba(255,236,160,0.9)");
  halo.addColorStop(0.5, "rgba(255,180,100,0.35)");
  halo.addColorStop(1, "rgba(255,180,100,0)");
  c.fillStyle = halo; c.beginPath(); c.arc(sunX, sunY, sunR * 3, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#fff5b8"; c.beginPath(); c.arc(sunX, sunY, sunR, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#ffd866"; c.beginPath(); c.arc(sunX, sunY, sunR * 0.7, 0, Math.PI * 2); c.fill();

  // Nuages parallaxe
  drawCloud(c, ((Game.t * 14) % (SCREEN_W + 200)) - 80, 60, 1.0, "rgba(255,255,255,0.85)");
  drawCloud(c, ((Game.t * 8) % (SCREEN_W + 200)) - 200 + 320, 110, 0.7, "rgba(255,255,255,0.65)");
  drawCloud(c, ((Game.t * 20) % (SCREEN_W + 200)) - 100 + 480, 40, 0.55, "rgba(255,255,255,0.7)");

  // Vagues / mer
  for (let y = 220; y < 260; y += 3) {
    const t = (y - 220) / 40;
    c.fillStyle = "rgba(120,200,230," + (0.25 + t * 0.4).toFixed(2) + ")";
    const off = Math.sin(Game.t * 1.4 + y * 0.2) * 4;
    c.fillRect(off, y, SCREEN_W, 2);
  }
  // Ecume blanche
  c.fillStyle = "rgba(255,255,255,0.7)";
  for (let i = 0; i < 12; i++) {
    const wx = (i * 60 + (Game.t * 25) % 60) % SCREEN_W;
    c.fillRect(wx, 234 + Math.sin(Game.t * 2 + i) * 2, 14, 1);
  }

  // Iles silhouettes
  c.fillStyle = "#3a8a55";
  c.beginPath();
  c.moveTo(0, 260);
  c.bezierCurveTo(80, 230, 180, 250, 260, 240);
  c.bezierCurveTo(360, 230, 460, 260, 540, 245);
  c.bezierCurveTo(580, 240, 620, 250, 640, 245);
  c.lineTo(640, 280); c.lineTo(0, 280); c.closePath(); c.fill();
  // herbes / cocotiers stylises (silhouettes)
  c.fillStyle = "#1f5b22";
  for (let i = 0; i < 6; i++) {
    const sx = 60 + i * 110;
    c.beginPath(); c.arc(sx, 240, 8 + (i % 3) * 2, 0, Math.PI * 2); c.fill();
    c.fillRect(sx - 1, 240, 2, 8);
  }
  // sable / herbe au premier plan
  c.fillStyle = "#79d24e"; c.fillRect(0, 280, SCREEN_W, SCREEN_H - 280);
  c.fillStyle = "#5fbe3a";
  for (let i = 0; i < 30; i++) {
    const sx = (i * 53 + 17) % SCREEN_W;
    c.fillRect(sx, 282 + (i % 3), 2, 1);
  }

  // Etincelles qui flottent vers le haut
  for (let i = 0; i < 18; i++) {
    const sx = (i * 89 + Math.floor(Game.t * 30)) % SCREEN_W;
    const sy = ((i * 71 + (Game.t * 40)) % 320) | 0;
    const ay = SCREEN_H - sy;
    const tw = (Math.sin(Game.t * 4 + i) + 1) * 0.5;
    if (tw > 0.4) {
      c.fillStyle = "rgba(255,236,160," + tw.toFixed(2) + ")";
      c.fillRect(sx, ay, 1, 1);
      c.fillRect(sx, ay + 1, 1, 1);
    }
  }
}

function drawCloud(c, x, y, scale, color) {
  c.fillStyle = color;
  c.beginPath();
  c.arc(x, y, 12 * scale, 0, Math.PI * 2);
  c.arc(x + 14 * scale, y - 4 * scale, 14 * scale, 0, Math.PI * 2);
  c.arc(x + 28 * scale, y, 11 * scale, 0, Math.PI * 2);
  c.arc(x + 18 * scale, y + 4 * scale, 9 * scale, 0, Math.PI * 2);
  c.fill();
}

function drawTitleLogo(c) {
  const enter = easeOutBack(clamp(Game.titleEnter, 0, 1));
  const cx = 220, cy = 130;
  const scale = 0.5 + 0.5 * enter;

  // Boucle de styler qui dessine un anneau autour du logo
  const loopT = (Game.t % 4) / 4; // 0..1
  const arcEnd = clamp(loopT * 1.15, 0, 1);
  c.save();
  c.translate(cx, cy);
  c.scale(scale, scale);

  // Anneau styler (halo bleu + coeur blanc)
  c.lineCap = "round"; c.lineJoin = "round";
  c.shadowColor = "#9ee8ff"; c.shadowBlur = 16;
  c.strokeStyle = "rgba(120,200,255,0.55)"; c.lineWidth = 12;
  c.beginPath(); c.ellipse(0, 0, 220, 70, 0, -Math.PI / 2, -Math.PI / 2 + arcEnd * Math.PI * 2); c.stroke();
  c.shadowBlur = 8;
  c.strokeStyle = "#5ab8ff"; c.lineWidth = 6;
  c.beginPath(); c.ellipse(0, 0, 220, 70, 0, -Math.PI / 2, -Math.PI / 2 + arcEnd * Math.PI * 2); c.stroke();
  c.shadowBlur = 0;
  c.strokeStyle = "#ffffff"; c.lineWidth = 2;
  c.beginPath(); c.ellipse(0, 0, 220, 70, 0, -Math.PI / 2, -Math.PI / 2 + arcEnd * Math.PI * 2); c.stroke();
  // bille jaune au point de depart
  const startA = -Math.PI / 2;
  const sx = Math.cos(startA) * 220, sy = Math.sin(startA) * 70;
  c.fillStyle = "#ffd866"; c.shadowColor = "#ffd866"; c.shadowBlur = 8;
  c.beginPath(); c.arc(sx, sy, 5, 0, Math.PI * 2); c.fill();
  // bille en pointe (mobile)
  if (arcEnd > 0 && arcEnd < 1) {
    const a = startA + arcEnd * Math.PI * 2;
    const tx = Math.cos(a) * 220, ty = Math.sin(a) * 70;
    c.fillStyle = "#fff"; c.beginPath(); c.arc(tx, ty, 4, 0, Math.PI * 2); c.fill();
  }
  c.shadowBlur = 0;

  // Plaque de fond derriere le logo (effet decoupe)
  c.fillStyle = "rgba(13,34,54,0.55)";
  rrect(c, -210, -52, 420, 104, 14); c.fill();

  // Logo "NATURE / WARDENS" avec contour epais et leger angle
  c.textAlign = "center"; c.textBaseline = "middle";
  // ombre profonde
  c.fillStyle = "rgba(0,0,0,0.45)";
  c.font = "bold 36px 'Press Start 2P', monospace";
  c.fillText("NATURE", 4, -16 + 4);
  c.fillText("WARDENS", 4, 24 + 4);
  // contour brun
  c.lineJoin = "round";
  c.lineWidth = 9; c.strokeStyle = "#5a2e10";
  c.strokeText("NATURE", 0, -16);
  c.strokeText("WARDENS", 0, 24);
  // contour orange
  c.lineWidth = 4; c.strokeStyle = "#ff7a39";
  c.strokeText("NATURE", 0, -16);
  c.strokeText("WARDENS", 0, 24);
  // remplissage degrade jaune vers blanc
  const tg = c.createLinearGradient(0, -36, 0, 40);
  tg.addColorStop(0, "#fff5b8");
  tg.addColorStop(0.5, "#ffd866");
  tg.addColorStop(1, "#ffae3a");
  c.fillStyle = tg;
  c.fillText("NATURE", 0, -16);
  c.fillText("WARDENS", 0, 24);
  // brillance sur le haut des lettres (slice)
  c.save();
  c.beginPath(); c.rect(-220, -42, 440, 14); c.clip();
  c.fillStyle = "rgba(255,255,255,0.55)";
  c.fillText("NATURE", 0, -16);
  c.fillText("WARDENS", 0, 24);
  c.restore();

  c.restore();

  // Sous-titre dans une banniere
  c.save(); c.translate(220, 200);
  c.fillStyle = "#0d2236";
  rrect(c, -130, -14, 260, 28, 14); c.fill();
  c.strokeStyle = "#ffd866"; c.lineWidth = 1;
  rrect(c, -130, -14, 260, 28, 14); c.stroke();
  c.fillStyle = "#ffd866"; c.textAlign = "center"; c.textBaseline = "middle";
  c.font = "14px 'VT323', monospace";
  c.fillText("~  L O O P   O F   T I D E S  ~", 0, 1);
  c.restore();

  // Petit liseret de version en haut
  c.textBaseline = "alphabetic";
  c.fillStyle = "#5a2e10"; c.font = "9px 'Press Start 2P', monospace"; c.textAlign = "left";
  c.fillText("v1.0 - prototype", 14, 22);
}

function easeOutBack(k) {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
}

function drawTitleHero(c) {
  // Heros chibi sur la droite avec son styler tendu vers le logo
  const cx = 510, cy = 240;
  const bob = Math.sin(Game.t * 2) * 1.5;

  // Lumina partenaire qui flotte (Sparklit)
  const px2 = cx + 30, py2 = cy - 6 + Math.sin(Game.t * 3.4) * 2;
  drawCreature(c, SPECIES.sparklit, px2, py2, Game.t, 0, false, false);

  // ranger
  drawHuman(c, "player", cx, cy + bob, "left", 0);
  // bras tendu (styler) - dessine par-dessus
  c.strokeStyle = "#1a1a1a"; c.lineWidth = 1;
  // gantelet
  c.fillStyle = "#264a6f"; c.fillRect(cx - 16, cy - 1 + bob, 6, 3);
  // disque styler en bout
  c.fillStyle = "#ffd866";
  c.beginPath(); c.arc(cx - 18, cy + bob, 3, 0, Math.PI * 2); c.fill();
  c.strokeStyle = "#5a2e10"; c.lineWidth = 1;
  c.beginPath(); c.arc(cx - 18, cy + bob, 3, 0, Math.PI * 2); c.stroke();
  // ligne lumineuse vers le logo
  c.shadowColor = "#9ee8ff"; c.shadowBlur = 8;
  c.strokeStyle = "rgba(120,200,255,0.55)"; c.lineWidth = 5;
  c.beginPath(); c.moveTo(cx - 18, cy + bob);
  c.bezierCurveTo(420, cy + bob - 30, 360, 180, 280, 160);
  c.stroke();
  c.shadowBlur = 4;
  c.strokeStyle = "#5ab8ff"; c.lineWidth = 2;
  c.beginPath(); c.moveTo(cx - 18, cy + bob);
  c.bezierCurveTo(420, cy + bob - 30, 360, 180, 280, 160);
  c.stroke();
  c.shadowBlur = 0;
}

function drawTitleBottomMenu() {
  const b = botCtx;
  // Fond doux
  const g = b.createLinearGradient(0, 0, 0, SCREEN_H);
  g.addColorStop(0, "#0d2236"); g.addColorStop(1, "#08172a");
  b.fillStyle = g; b.fillRect(0, 0, SCREEN_W, SCREEN_H);

  // Bandes lumineuses decoratives
  b.fillStyle = "rgba(255,216,102,0.06)";
  for (let i = 0; i < 8; i++) {
    const yy = (i * 70 + (Game.t * 20) % 70) % SCREEN_H;
    b.fillRect(0, yy, SCREEN_W, 1);
  }

  if (Game.titleMenu === "main") drawMainMenu(b);
  else if (Game.titleMenu === "options") drawOptionsMenu(b);
  else if (Game.titleMenu === "confirmReset") drawConfirmReset(b);
  else if (Game.titleMenu === "credits") drawCredits(b);

  // Bandeau en bas
  b.fillStyle = "rgba(0,0,0,0.4)"; b.fillRect(0, 358, SCREEN_W, 26);
  b.fillStyle = "#9bdce0"; b.font = "10px 'Press Start 2P', monospace"; b.textAlign = "left";
  b.fillText("(c) VERDIS WARDENS GUILD - fan-made", 12, 374);
  b.textAlign = "right";
  b.fillText(Game.options.muted ? "AUDIO: OFF" : "AUDIO: " + Math.round(Game.options.volume * 100) + "%", SCREEN_W - 12, 374);
}

function drawMainMenu(b) {
  const items = titleMainItems();
  // Titre du menu
  b.fillStyle = "#ffd866"; b.font = "12px 'Press Start 2P', monospace"; b.textAlign = "center";
  b.fillText("MENU PRINCIPAL", 320, 36);
  // Sous-info
  b.fillStyle = "#9bdce0"; b.font = "13px 'VT323', monospace";
  if (Game.flags.introDone || hasSave()) {
    b.fillText("Sauvegarde : Album " + Game.album.size + "/" + Object.keys(SPECIES).length + " - Mission " + Math.min(Game.flags.missionUnlocked + 1, MISSIONS.length) + "/" + MISSIONS.length, 320, 56);
  } else {
    b.fillText("Aucune sauvegarde - Lance une nouvelle aventure.", 320, 56);
  }

  // Cartes de menu
  const startY = 90;
  const itemH = 38;
  for (let i = 0; i < items.length; i++) {
    const yy = startY + i * itemH;
    const sel = i === Game.titleSelected;
    const w = sel ? 380 : 340;
    const x = (SCREEN_W - w) / 2;
    // ombre
    b.fillStyle = "rgba(0,0,0,0.4)";
    rrect(b, x + 3, yy + 3, w, itemH - 6, 8); b.fill();
    // fond
    if (sel) {
      const grad = b.createLinearGradient(x, yy, x + w, yy);
      grad.addColorStop(0, "#5a2e10"); grad.addColorStop(0.5, "#ff7a39"); grad.addColorStop(1, "#5a2e10");
      b.fillStyle = grad;
    } else b.fillStyle = "#1a3a55";
    rrect(b, x, yy, w, itemH - 6, 8); b.fill();
    // bord
    b.strokeStyle = sel ? "#fff5b8" : "#5a7a96";
    b.lineWidth = sel ? 2 : 1;
    rrect(b, x, yy, w, itemH - 6, 8); b.stroke();
    // texte
    b.fillStyle = sel ? "#fff5b8" : "#cfeaff";
    b.font = (sel ? "13px" : "12px") + " 'Press Start 2P', monospace";
    b.textAlign = "center"; b.textBaseline = "middle";
    b.fillText(items[i].label, SCREEN_W / 2, yy + (itemH - 6) / 2);
    // chevron clignotant
    if (sel) {
      const blink = Math.floor(Game.t * 3) % 2;
      if (blink === 0) {
        b.fillStyle = "#fff5b8";
        b.beginPath(); b.moveTo(x + 14, yy + itemH / 2 - 5); b.lineTo(x + 22, yy + itemH / 2 - 1); b.lineTo(x + 14, yy + itemH / 2 + 3); b.closePath(); b.fill();
      }
    }
  }
  b.textBaseline = "alphabetic";

  // Aide controles
  b.fillStyle = "#79e3c4"; b.font = "10px 'Press Start 2P', monospace"; b.textAlign = "center";
  b.fillText("FLECHES : NAVIGUER     A : VALIDER     B : RETOUR", 320, 348);
}

function drawOptionsMenu(b) {
  const items = titleOptionsItems();
  b.fillStyle = "#ffd866"; b.font = "12px 'Press Start 2P', monospace"; b.textAlign = "center";
  b.fillText("OPTIONS", 320, 36);
  b.fillStyle = "#9bdce0"; b.font = "13px 'VT323', monospace";
  b.fillText("Reglages persistes (sauvegardes localement)", 320, 56);

  const startY = 96;
  const itemH = 46;
  for (let i = 0; i < items.length; i++) {
    const yy = startY + i * itemH;
    const sel = i === Game.titleSelected;
    const w = 440;
    const x = (SCREEN_W - w) / 2;
    b.fillStyle = sel ? "#1f3f5e" : "#0e2236";
    rrect(b, x, yy, w, itemH - 8, 8); b.fill();
    b.strokeStyle = sel ? "#ffd866" : "#5a7a96";
    b.lineWidth = sel ? 2 : 1;
    rrect(b, x, yy, w, itemH - 8, 8); b.stroke();
    b.fillStyle = sel ? "#fff" : "#cfeaff";
    b.font = "11px 'Press Start 2P', monospace"; b.textAlign = "left";
    b.fillText(items[i].label, x + 18, yy + 16);

    // affichage de la valeur
    if (items[i].id === "volume") {
      drawSlider(b, x + 220, yy + 12, 200, 12, Game.options.volume, sel);
      b.fillStyle = sel ? "#ffd866" : "#9bdce0";
      b.font = "10px 'Press Start 2P', monospace"; b.textAlign = "right";
      b.fillText(Math.round(Game.options.volume * 100) + "%", x + w - 14, yy + 16);
    } else if (items[i].id === "mute") {
      const on = Game.options.muted;
      b.fillStyle = on ? "#ff7a59" : "#79e3c4";
      b.font = "10px 'Press Start 2P', monospace"; b.textAlign = "right";
      b.fillText(on ? "OUI  >" : "<  NON", x + w - 14, yy + 16);
    }
  }

  b.fillStyle = "#79e3c4"; b.font = "10px 'Press Start 2P', monospace"; b.textAlign = "center";
  b.fillText("FLECHES : NAVIGUER     A : VALIDER / TOGGLE     B : RETOUR", 320, 348);
}

function drawSlider(b, x, y, w, h, value, sel) {
  b.fillStyle = "#0a1525"; rrect(b, x, y, w, h, h / 2); b.fill();
  b.strokeStyle = sel ? "#ffd866" : "#5a7a96"; b.lineWidth = 1;
  rrect(b, x, y, w, h, h / 2); b.stroke();
  b.fillStyle = sel ? "#ffd866" : "#79e3c4";
  rrect(b, x + 2, y + 2, (w - 4) * value, h - 4, (h - 4) / 2); b.fill();
  // poignee
  const hx = x + clamp((w - 4) * value, 0, w - 4) + 2;
  b.fillStyle = sel ? "#fff5b8" : "#cfeaff";
  b.beginPath(); b.arc(hx, y + h / 2, h / 2 + 1, 0, Math.PI * 2); b.fill();
  b.strokeStyle = "#0a1525"; b.lineWidth = 1;
  b.beginPath(); b.arc(hx, y + h / 2, h / 2 + 1, 0, Math.PI * 2); b.stroke();
}

function drawConfirmReset(b) {
  b.fillStyle = "rgba(0,0,0,0.55)"; b.fillRect(40, 80, SCREEN_W - 80, 220);
  b.fillStyle = "#0d2236"; rrect(b, 60, 100, SCREEN_W - 120, 180, 12); b.fill();
  b.strokeStyle = "#ff8a6b"; b.lineWidth = 2;
  rrect(b, 60, 100, SCREEN_W - 120, 180, 12); b.stroke();

  b.fillStyle = "#ff8a6b"; b.font = "14px 'Press Start 2P', monospace"; b.textAlign = "center";
  b.fillText("EFFACER LA SAUVEGARDE ?", 320, 140);
  b.fillStyle = "#cfeaff"; b.font = "16px 'VT323', monospace";
  b.fillText("Cette action est definitive.", 320, 170);
  b.fillText("L'Album et la progression seront perdus.", 320, 192);

  // Choix
  const labels = ["EFFACER", "ANNULER"];
  for (let i = 0; i < 2; i++) {
    const x = 160 + i * 200;
    const sel = i === Game.titleSelected;
    b.fillStyle = sel ? (i === 0 ? "#a82a2a" : "#1f7a55") : "#1a3a55";
    rrect(b, x, 230, 120, 36, 8); b.fill();
    b.strokeStyle = sel ? "#fff5b8" : "#5a7a96"; b.lineWidth = sel ? 2 : 1;
    rrect(b, x, 230, 120, 36, 8); b.stroke();
    b.fillStyle = sel ? "#fff5b8" : "#cfeaff";
    b.font = "12px 'Press Start 2P', monospace"; b.textAlign = "center"; b.textBaseline = "middle";
    b.fillText(labels[i], x + 60, 248);
  }
  b.textBaseline = "alphabetic";
}

function drawCredits(b) {
  b.fillStyle = "#ffd866"; b.font = "14px 'Press Start 2P', monospace"; b.textAlign = "center";
  b.fillText("CREDITS", 320, 50);

  const lines = [
    { c: "#79e3c4", t: "NATURE WARDENS - LOOP OF TIDES" },
    { c: "#cfeaff", t: "Prototype web fan-made, gratuit." },
    { c: "#cfeaff", t: "Hommage de gameplay aux jeux ranger au stylet." },
    { c: "#cfeaff", t: "Univers, personnages et creatures originaux." },
    { c: "#9bdce0", t: " " },
    { c: "#ffd866", t: "Code, design, art, son" },
    { c: "#cfeaff", t: "Genere via Cascade en pair-programming" },
    { c: "#9bdce0", t: " " },
    { c: "#ffd866", t: "Polices" },
    { c: "#cfeaff", t: "Press Start 2P, VT323, Outfit (Google Fonts)" },
    { c: "#9bdce0", t: " " },
    { c: "#79e3c4", t: "Aider sans dominer." }
  ];
  b.textAlign = "center";
  for (let i = 0; i < lines.length; i++) {
    b.fillStyle = lines[i].c;
    b.font = i === 0 ? "12px 'Press Start 2P', monospace" : "16px 'VT323', monospace";
    b.fillText(lines[i].t, 320, 90 + i * 22);
  }

  b.fillStyle = "#79e3c4"; b.font = "10px 'Press Start 2P', monospace"; b.textAlign = "center";
  b.fillText("A / B : RETOUR", 320, 348);
}

/* ---------- HUB ---------- */
function nearestNPC() {
  const p = Game.hub.player;
  for (const npc of Game.hub.npcs) {
    if (Math.abs(npc.x - p.x) < TILE && Math.abs(npc.y - p.y) < TILE * 1.1) return npc;
  }
  return null;
}
function nearestObstacle() {
  const p = Game.hub.player;
  for (const ob of Game.hub.obstacles) {
    if (Math.abs(ob.x - p.x) < ob.w / 2 + 18 && Math.abs(ob.y - p.y) < ob.h / 2 + 18) return ob;
  }
  return null;
}
function obstacleBlocks(x, y) {
  for (const ob of Game.hub.obstacles) {
    if (Math.abs(ob.x - x) < ob.w / 2 && Math.abs(ob.y - y) < ob.h / 2) return true;
  }
  return false;
}
function updateHub(dt) {
  Game.t += dt;
  const p = Game.hub.player;
  if (Game.hub.portal) Game.hub.portal.anim = (Game.hub.portal.anim || 0) + dt;
  const v = getDirVec();
  const speed = 90;
  const nx = p.x + v.x * speed * dt, ny = p.y + v.y * speed * dt;
  const tryMove = (x, y) => {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return false;
    if (tileSolid(Game.hub.map[ty][tx])) return false;
    if (obstacleBlocks(x, y)) return false;
    return true;
  };
  if (tryMove(nx, p.y)) p.x = nx;
  if (tryMove(p.x, ny)) p.y = ny;
  if (v.x || v.y) {
    if (Math.abs(v.x) > Math.abs(v.y)) p.dir = v.x > 0 ? "right" : "left";
    else p.dir = v.y > 0 ? "down" : "up";
    p.anim += dt * 6;
  } else p.anim = 0;

  // Portail vers le sanctuaire (collision)
  if (Game.hub.portal && Math.abs(p.x - Game.hub.portal.x) < 16 && Math.abs(p.y - Game.hub.portal.y) < 16) {
    SFX.iris();
    startTransition(() => { buildSanctuary(); switchState("sanctuary"); }, { cx: p.x, cy: p.y });
    return;
  }

  // Porte de la cabane Warden (tiles row 5 cols 4-5 - tile type 9)
  const onDoor = p.x >= 4 * TILE && p.x < 6 * TILE && p.y >= 5 * TILE && p.y < 6 * TILE;

  if (Input.aPressed) {
    if (onDoor) {
      SFX.select();
      startTransition(() => { buildHouse(); switchState("house"); }, { cx: p.x, cy: p.y });
      return;
    }
    const ob = nearestObstacle();
    if (ob) {
      openLuminaPicker(ob);
      return;
    }
    const npc = nearestNPC();
    if (npc) {
      const dx = p.x - npc.x, dy = p.y - npc.y;
      npc.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
      const lines = npc.lines();
      startDialogue(lines, (action) => {
        if (!action) return;
        if (action.type === "startMission") beginMission(action.index);
        else if (action.type === "completeChildQuest") {
          Game.flags.childQuestDone = true;
          SFX.befriend();
          giveCoins(50, "merci");
          saveGame();
        }
        else if (action.type === "openShop") {
          Game.shop = { sel: 0 };
          switchState("shop");
        }
      });
    }
  }
  if (Input.bPressed) { SFX.select(); Game.albumSelected = 0; switchState("album"); }
}

/* ---------- LUMINA PICKER (invocation) ---------- */
function openLuminaPicker(obstacle) {
  // Filtre : ne montre que les Lumina apaisees au moins une fois
  const album = Array.from(Game.album);
  if (album.length === 0) {
    startDialogue([{ speaker: "player", text: "Aucune Lumina ne m'a encore confie son pouvoir. Va d'abord en apaiser une." }], null);
    return;
  }
  Game.pickLumina = { obstacle, album, sel: 0 };
  switchState("pickLumina");
  SFX.select();
}
function updatePickLumina(dt) {
  Game.t += dt;
  const pk = Game.pickLumina; if (!pk) return;
  const len = pk.album.length;
  if (Input.pressed.has("ArrowLeft") || Input.pressed.has("KeyA") || Input.pressed.has("KeyQ")) {
    pk.sel = (pk.sel + len - 1) % len; SFX.dialogTick();
  }
  if (Input.pressed.has("ArrowRight") || Input.pressed.has("KeyD")) {
    pk.sel = (pk.sel + 1) % len; SFX.dialogTick();
  }
  if (Input.pressed.has("ArrowUp") || Input.pressed.has("KeyW") || Input.pressed.has("KeyZ")) {
    pk.sel = (pk.sel + len - 4) % len; SFX.dialogTick();
  }
  if (Input.pressed.has("ArrowDown") || Input.pressed.has("KeyS")) {
    pk.sel = (pk.sel + 4) % len; SFX.dialogTick();
  }
  if (Input.aPressed) {
    const speciesId = pk.album[pk.sel];
    SFX.select();
    confirmSummon(pk.obstacle, speciesId);
  }
  if (Input.bPressed) {
    SFX.back();
    Game.pickLumina = null;
    switchState("hub");
  }
}
function confirmSummon(obstacle, speciesId) {
  const required = OBSTACLE_TYPES[obstacle.type].species;
  const sp = SPECIES[speciesId];
  Game.pickLumina = null;
  if (speciesId !== required) {
    // Mauvais choix : message (revient au hub apres)
    switchState("hub");
    SFX.fail();
    startDialogue([
      { speaker: "player", text: sp.name + " est genee. Son " + sp.move + " ne peut rien ici." },
      { speaker: null, text: "Indice : il faut le don de terrain d'une autre Lumina pour franchir le " + OBSTACLE_TYPES[obstacle.type].label.toLowerCase() + "." }
    ], null);
    return;
  }
  // Lance l'animation d'invocation
  Game.summon = {
    obstacle, species: speciesId, t: 0, phase: "appear", duration: 0
  };
  switchState("summon");
  SFX.befriend();
}

function updateSummon(dt) {
  Game.t += dt;
  const s = Game.summon; if (!s) return;
  s.t += dt;
  s.duration += dt;
  if (s.phase === "appear" && s.t > 0.6) { s.phase = "act"; s.t = 0; SFX.pulse(); }
  else if (s.phase === "act" && s.t > 1.0) { s.phase = "leave"; s.t = 0; }
  else if (s.phase === "leave" && s.t > 0.6) {
    // Obstacle resolu : retire-le, persiste, retour hub, recompense
    Game.flags.obstaclesCleared = Game.flags.obstaclesCleared || {};
    Game.flags.obstaclesCleared[s.obstacle.id] = true;
    Game.hub.obstacles = Game.hub.obstacles.filter((o) => o.id !== s.obstacle.id);
    giveCoins(40, "obstacle franchi");
    SFX.success();
    Game.summon = null;
    switchState("hub");
  }
  // bloque l'input pendant
}

/* ---------- SHOP ---------- */
function shopList() { return Object.keys(FURNITURE); }
function updateShop(dt) {
  Game.t += dt;
  const sh = Game.shop; if (!sh) return;
  const list = shopList();
  if (Input.pressed.has("ArrowUp") || Input.pressed.has("KeyW") || Input.pressed.has("KeyZ")) {
    sh.sel = (sh.sel + list.length - 1) % list.length; SFX.dialogTick();
  }
  if (Input.pressed.has("ArrowDown") || Input.pressed.has("KeyS")) {
    sh.sel = (sh.sel + 1) % list.length; SFX.dialogTick();
  }
  if (Input.aPressed) {
    const id = list[sh.sel];
    const it = FURNITURE[id];
    if (Game.owned.has(id)) {
      // deja possede : ne fait rien (mais petit son)
      SFX.back();
    } else if (Game.coins < it.price) {
      SFX.fail();
    } else {
      Game.coins -= it.price;
      Game.owned.add(id);
      SFX.befriend();
      saveGame();
    }
  }
  if (Input.bPressed) {
    SFX.back();
    Game.shop = null;
    switchState("hub");
  }
}

function drawShop() {
  // TOP : titre + apercu
  const t = topCtx;
  const g = t.createLinearGradient(0, 0, 0, SCREEN_H);
  g.addColorStop(0, "#3a1f5e"); g.addColorStop(1, "#0d1e34");
  t.fillStyle = g; t.fillRect(0, 0, SCREEN_W, SCREEN_H);
  // bandeau
  t.fillStyle = "#0d2236"; rrect(t, 24, 20, 592, 60, 12); t.fill();
  t.strokeStyle = "#ffd866"; t.lineWidth = 2; rrect(t, 24, 20, 592, 60, 12); t.stroke();
  t.fillStyle = "#ffd866"; t.font = "16px 'Press Start 2P', monospace"; t.textAlign = "left";
  t.fillText("BAZAR DE YUNA", 44, 50);
  t.fillStyle = "#9bdce0"; t.font = "16px 'VT323', monospace";
  t.fillText("Confort & decoration de cabane", 44, 70);
  // coins
  drawCoinBadge(t, 596, 50);

  const sh = Game.shop;
  const list = shopList();
  const id = list[sh.sel];
  const it = FURNITURE[id];
  const owned = Game.owned.has(id);
  const canBuy = !owned && Game.coins >= it.price;

  // Apercu meuble (sprite agrandi)
  t.fillStyle = "#0d2236"; rrect(t, 40, 100, 240, 240, 10); t.fill();
  t.strokeStyle = "#5a7a96"; t.lineWidth = 1; rrect(t, 40, 100, 240, 240, 10); t.stroke();
  t.save(); t.translate(160, 220); t.scale(2.4, 2.4);
  drawFurniture(t, id, 0, 0, Game.t);
  t.restore();
  t.fillStyle = "#79e3c4"; t.font = "10px 'Press Start 2P', monospace"; t.textAlign = "center";
  t.fillText(it.slot.toUpperCase(), 160, 326);

  // Detail
  t.fillStyle = "#0d2236"; rrect(t, 296, 100, 320, 240, 10); t.fill();
  t.fillStyle = "#ffd866"; t.font = "14px 'Press Start 2P', monospace"; t.textAlign = "left";
  t.fillText(it.name.toUpperCase(), 312, 132);
  t.fillStyle = "#cfeaff"; t.font = "16px 'VT323', monospace";
  wrapText(t, it.desc, 312, 158, 290, 18);

  t.fillStyle = "#9bdce0"; t.font = "12px 'Press Start 2P', monospace";
  t.fillText("PRIX", 312, 240);
  t.fillStyle = "#ffd866"; t.font = "20px 'Press Start 2P', monospace";
  t.fillText(it.price + " L", 312, 270);

  if (owned) {
    t.fillStyle = "#79e3c4"; t.font = "12px 'Press Start 2P', monospace";
    t.fillText("DEJA POSSEDE", 312, 308);
  } else if (canBuy) {
    if (Math.floor(Game.t * 3) % 2 === 0) {
      t.fillStyle = "#79e3c4"; t.font = "12px 'Press Start 2P', monospace";
      t.fillText("A : ACHETER", 312, 308);
    }
  } else {
    t.fillStyle = "#ff8a6b"; t.font = "12px 'Press Start 2P', monospace";
    t.fillText("LUMES INSUFFISANTS", 312, 308);
  }

  // BOTTOM : la liste
  const b = botCtx;
  const g2 = b.createLinearGradient(0, 0, 0, SCREEN_H);
  g2.addColorStop(0, "#1c2a4a"); g2.addColorStop(1, "#0a1525");
  b.fillStyle = g2; b.fillRect(0, 0, SCREEN_W, SCREEN_H);

  b.fillStyle = "#0d2236"; rrect(b, 16, 16, 608, 26, 8); b.fill();
  b.fillStyle = "#ffd866"; b.font = "12px 'Press Start 2P', monospace"; b.textAlign = "left";
  b.fillText("CATALOGUE", 30, 34);
  b.textAlign = "right";
  drawCoinBadge(b, SCREEN_W - 30, 32);

  // Liste 2 colonnes
  const itemH = 32;
  const colW = 290;
  for (let i = 0; i < list.length; i++) {
    const ii = FURNITURE[list[i]];
    const col = i < 5 ? 0 : 1;
    const row = i % 5;
    const x = 24 + col * (colW + 10);
    const y = 56 + row * itemH;
    const sel = i === sh.sel;
    const owns = Game.owned.has(list[i]);
    b.fillStyle = sel ? "#1f3f5e" : "#0a1729";
    rrect(b, x, y, colW, itemH - 4, 6); b.fill();
    b.strokeStyle = sel ? "#ffd866" : "#3a4d6b"; b.lineWidth = sel ? 2 : 1;
    rrect(b, x, y, colW, itemH - 4, 6); b.stroke();
    // mini sprite
    b.save(); b.translate(x + 18, y + 14); b.scale(0.55, 0.55);
    drawFurniture(b, list[i], 0, 0, Game.t);
    b.restore();
    // nom
    b.fillStyle = "#fff"; b.font = "11px 'Press Start 2P', monospace"; b.textAlign = "left";
    b.fillText(ii.name, x + 38, y + 14);
    // prix / status
    b.textAlign = "right";
    if (owns) { b.fillStyle = "#79e3c4"; b.fillText("OWNED", x + colW - 8, y + 14); }
    else if (Game.coins >= ii.price) { b.fillStyle = "#ffd866"; b.fillText(ii.price + " L", x + colW - 8, y + 14); }
    else { b.fillStyle = "#ff8a6b"; b.fillText(ii.price + " L", x + colW - 8, y + 14); }
  }

  // hint
  b.fillStyle = "#79e3c4"; b.font = "10px 'Press Start 2P', monospace"; b.textAlign = "center";
  b.fillText("FLECHES : NAVIGUER     A : ACHETER     B : QUITTER", 320, 348);
  b.fillStyle = "#9bdce0"; b.font = "10px 'Press Start 2P', monospace";
  b.fillText("Place tes meubles dans la cabane (porte de la maison Warden)", 320, 368);
}

function drawCoinBadge(c, rx, ry) {
  // pastille piece + valeur
  c.save(); c.textBaseline = "middle";
  c.fillStyle = "#ffd866"; c.beginPath(); c.arc(rx - 70, ry, 6, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#a87b00"; c.beginPath(); c.arc(rx - 70, ry, 4, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#fff5b8"; c.font = "10px 'Press Start 2P', monospace"; c.textAlign = "left";
  c.fillText("L", rx - 73, ry + 1);
  c.fillStyle = "#ffd866"; c.font = "12px 'Press Start 2P', monospace"; c.textAlign = "right";
  c.fillText(Game.coins + " Lumes", rx, ry);
  c.textBaseline = "alphabetic";
  c.restore();
}

/* ---------- ALBUM LUMINA ---------- */
function updateAlbum(dt) {
  Game.t += dt;
  const list = Object.keys(SPECIES);
  if (Input.pressed.has("ArrowLeft") || Input.pressed.has("KeyA") || Input.pressed.has("KeyQ"))
    Game.albumSelected = (Game.albumSelected + list.length - 1) % list.length;
  if (Input.pressed.has("ArrowRight") || Input.pressed.has("KeyD"))
    Game.albumSelected = (Game.albumSelected + 1) % list.length;
  if (Input.pressed.has("ArrowUp") || Input.pressed.has("KeyW") || Input.pressed.has("KeyZ"))
    Game.albumSelected = (Game.albumSelected + list.length - 4) % list.length;
  if (Input.pressed.has("ArrowDown") || Input.pressed.has("KeyS"))
    Game.albumSelected = (Game.albumSelected + 4) % list.length;
  if (Input.bPressed || Input.pressed.has("Escape")) { SFX.back(); switchState("hub"); }
}
function drawAlbum() {
  const list = Object.keys(SPECIES);
  const sel = list[Game.albumSelected];
  const sp = SPECIES[sel];
  const known = albumKnows(sel);

  const t = topCtx;
  const g = t.createLinearGradient(0, 0, 0, SCREEN_H);
  g.addColorStop(0, "#1d3a5e"); g.addColorStop(1, "#0d1e34");
  t.fillStyle = g; t.fillRect(0, 0, SCREEN_W, SCREEN_H);

  t.fillStyle = "#0d2236"; rrect(t, 24, 20, 592, 52, 10); t.fill();
  t.fillStyle = "#ffd866"; t.font = "16px 'Press Start 2P', monospace"; t.textAlign = "left";
  t.fillText("ALBUM LUMINA", 44, 50);
  t.fillStyle = "#9bdce0"; t.font = "14px 'VT323', monospace"; t.textAlign = "right";
  t.fillText("Decouverts : " + Game.album.size + " / " + list.length, 596, 50);

  // panneau detail
  t.fillStyle = "#0d2236"; rrect(t, 24, 88, 592, 280, 10); t.fill();

  if (known) {
    // grand portrait
    t.save(); t.translate(140, 220); t.scale(3.5, 3.5);
    drawCreature(t, sp, 0, 0, Game.t, 0, false, false);
    t.restore();
    // texte
    t.fillStyle = sp.body; t.font = "20px 'Press Start 2P', monospace"; t.textAlign = "left";
    t.fillText(sp.name.toUpperCase(), 240, 130);
    t.fillStyle = "#9bdce0"; t.font = "12px 'Press Start 2P', monospace";
    t.fillText("ELEMENT : " + sp.element.toUpperCase(), 240, 154);
    t.fillStyle = "#cfeaff"; t.font = "16px 'VT323', monospace";
    wrapText(t, sp.desc, 240, 184, 360, 20);
    t.fillStyle = "#ffd866"; t.font = "12px 'Press Start 2P', monospace";
    t.fillText("DON DE TERRAIN", 240, 260);
    t.fillStyle = "#fff"; t.font = "16px 'VT323', monospace";
    t.fillText(sp.move, 240, 282);
    t.fillStyle = "#cfeaff";
    wrapText(t, sp.moveDesc, 240, 304, 360, 20);
  } else {
    t.fillStyle = "#1f2c44"; t.beginPath(); t.arc(140, 220, 56, 0, Math.PI * 2); t.fill();
    t.fillStyle = "#0a1729"; t.beginPath(); t.arc(140, 220, 38, 0, Math.PI * 2); t.fill();
    t.fillStyle = "#3a4d6b"; t.font = "60px 'Press Start 2P', monospace"; t.textAlign = "center";
    t.fillText("?", 140, 240);
    t.fillStyle = "#6b7892"; t.font = "16px 'VT323', monospace"; t.textAlign = "left";
    t.fillText("Lumina inconnue.", 240, 200);
    t.fillText("Crois sa route et apaise-la pour completer cette page.", 240, 224);
  }

  // hint
  t.fillStyle = "#9bdce0"; t.font = "10px 'Press Start 2P', monospace"; t.textAlign = "center";
  t.fillText("FLECHES : NAVIGUER     B : RETOUR", 320, 380);

  // bottom: mosaique
  const b = botCtx;
  const g2 = b.createLinearGradient(0, 0, 0, SCREEN_H);
  g2.addColorStop(0, "#1c4a3c"); g2.addColorStop(1, "#0f2a26");
  b.fillStyle = g2; b.fillRect(0, 0, SCREEN_W, SCREEN_H);

  b.fillStyle = "#ffd866"; b.font = "12px 'Press Start 2P', monospace"; b.textAlign = "center";
  b.fillText("BESTIAIRE DE VERDIS", 320, 36);

  const cols = 4;
  const cellW = 140, cellH = 130;
  const startX = (SCREEN_W - cellW * cols) / 2 + cellW / 2;
  const startY = 80;
  for (let i = 0; i < list.length; i++) {
    const sp2 = SPECIES[list[i]];
    const cx = startX + (i % cols) * cellW;
    const cy = startY + Math.floor(i / cols) * cellH;
    const isSel = i === Game.albumSelected;
    const ok = albumKnows(list[i]);
    b.fillStyle = isSel ? "#ffd86640" : "#0d223699";
    rrect(b, cx - cellW / 2 + 8, cy - 50, cellW - 16, cellH - 14, 8); b.fill();
    if (isSel) { b.strokeStyle = "#ffd866"; b.lineWidth = 2; rrect(b, cx - cellW / 2 + 8, cy - 50, cellW - 16, cellH - 14, 8); b.stroke(); }
    if (ok) {
      drawCreature(b, sp2, cx, cy, Game.t * 0.5 + i, 0, false, false);
      b.fillStyle = "#fff"; b.font = "10px 'Press Start 2P', monospace"; b.textAlign = "center";
      b.fillText(sp2.name, cx, cy + 38);
    } else {
      b.fillStyle = "#1f2c44"; b.beginPath(); b.arc(cx, cy, 14, 0, Math.PI * 2); b.fill();
      b.fillStyle = "#3a4d6b"; b.font = "16px 'Press Start 2P', monospace"; b.textAlign = "center";
      b.fillText("?", cx, cy + 6);
      b.fillStyle = "#6b7892"; b.font = "10px 'Press Start 2P', monospace";
      b.fillText("INCONNU", cx, cy + 38);
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
  t.fillText("Liens noues : " + Game.bondsTotal + "  -  Album: " + Game.album.size + "/" + Object.keys(SPECIES).length, 600, 370);
  t.fillStyle = "#ffd866"; t.font = "10px 'Press Start 2P', monospace";
  t.fillText("B : ALBUM LUMINA", 600, 350);

  // Compteur Lumes en haut a droite du top
  t.fillStyle = "#0d2236d8"; rrect(t, 460, 30, 152, 24, 6); t.fill();
  t.strokeStyle = "#ffd866"; t.lineWidth = 1; rrect(t, 460, 30, 152, 24, 6); t.stroke();
  drawCoinBadge(t, 600, 42);

  const b = botCtx;
  b.fillStyle = "#000"; b.fillRect(0, 0, SCREEN_W, SCREEN_H);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) drawTile(b, Game.hub.map[y][x], x * TILE, y * TILE);
  // Y-sort joueur + PNJ + obstacles + portail
  const p = Game.hub.player;
  const list = [];
  for (const n of Game.hub.npcs) list.push({ y: n.y + 14, kind: "npc", n });
  for (const ob of Game.hub.obstacles) list.push({ y: ob.y + ob.h / 2, kind: "obstacle", ob });
  if (Game.hub.portal) list.push({ y: Game.hub.portal.y + 14, kind: "portal", p: Game.hub.portal });
  list.push({ y: p.y + 14, kind: "player" });
  list.sort((a, c) => a.y - c.y);

  const nearOb = nearestObstacle();

  for (const it of list) {
    if (it.kind === "npc") {
      if (it.n.spriteKey === "board") drawNoticeBoard(b, it.n.x, it.n.y);
      else drawHuman(b, it.n.spriteKey, it.n.x, it.n.y, it.n.dir, 0);
    } else if (it.kind === "obstacle") {
      drawObstacle(b, it.ob, Game.t);
      const sp = SPECIES[OBSTACLE_TYPES[it.ob.type].species];
      drawObstacleHint(b, it.ob, sp, nearOb && nearOb.id === it.ob.id);
    } else if (it.kind === "portal") {
      drawPortal(b, it.p, Game.t);
    } else drawHuman(b, "player", p.x, p.y, p.dir, p.anim);
  }

  const npc = nearestNPC();
  if (npc) {
    b.fillStyle = "#0d2236d8"; rrect(b, npc.x - 32, npc.y - 38, 64, 16, 4); b.fill();
    b.fillStyle = "#ffd866"; b.font = "8px 'Press Start 2P', monospace"; b.textAlign = "center";
    b.fillText("A : PARLER", npc.x, npc.y - 27);
  }
  if (nearOb) {
    b.fillStyle = "#0d2236d8"; rrect(b, nearOb.x - 56, nearOb.y + nearOb.h / 2 + 4, 112, 16, 4); b.fill();
    b.fillStyle = "#ffd866"; b.font = "8px 'Press Start 2P', monospace"; b.textAlign = "center";
    b.fillText("A : APPELER LUMINA", nearOb.x, nearOb.y + nearOb.h / 2 + 14);
  }
  if (Game.hub.portal && Math.abs(p.x - Game.hub.portal.x) < TILE && Math.abs(p.y - Game.hub.portal.y) < TILE) {
    b.fillStyle = "#0d2236d8"; rrect(b, Game.hub.portal.x - 56, Game.hub.portal.y - 38, 112, 16, 4); b.fill();
    b.fillStyle = "#ffd866"; b.font = "8px 'Press Start 2P', monospace"; b.textAlign = "center";
    b.fillText("MARCHE : SANCTUAIRE", Game.hub.portal.x, Game.hub.portal.y - 27);
  }
}

/* ---------- LUMINA PICKER : rendu ---------- */
function drawPickLumina() {
  // Fond : Hub en arriere-plan assombri
  drawHub();
  for (const ctx of [topCtx, botCtx]) {
    ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  }
  const pk = Game.pickLumina; if (!pk) return;
  const ob = pk.obstacle;
  const obT = OBSTACLE_TYPES[ob.type];

  // TOP : explication
  const t = topCtx;
  t.fillStyle = "#0d2236"; rrect(t, 40, 40, SCREEN_W - 80, 200, 12); t.fill();
  t.strokeStyle = "#ffd866"; t.lineWidth = 2;
  rrect(t, 40, 40, SCREEN_W - 80, 200, 12); t.stroke();

  t.fillStyle = "#ffd866"; t.font = "16px 'Press Start 2P', monospace"; t.textAlign = "center";
  t.fillText("APPELER UNE LUMINA", SCREEN_W / 2, 80);

  t.fillStyle = "#cfeaff"; t.font = "18px 'VT323', monospace";
  t.fillText("Un " + obT.label + " bloque le chemin.", SCREEN_W / 2, 110);
  t.fillText("Quelle Lumina apaisee veux-tu appeler ?", SCREEN_W / 2, 132);

  // Apercu obstacle
  t.save(); t.translate(SCREEN_W / 2 - 120, 190); t.scale(2, 2);
  drawObstacle(t, { ...ob, x: 0, y: 0 }, Game.t);
  t.restore();

  // Apercu Lumina selectionnee
  const speciesId = pk.album[pk.sel];
  const sp = SPECIES[speciesId];
  t.save(); t.translate(SCREEN_W / 2 + 120, 190); t.scale(2.4, 2.4);
  drawCreature(t, sp, 0, 0, Game.t * 1.5, 0, false, false);
  t.restore();
  t.fillStyle = sp.body; t.font = "13px 'Press Start 2P', monospace"; t.textAlign = "center";
  t.fillText(sp.name.toUpperCase(), SCREEN_W / 2 + 120, 240);
  t.fillStyle = "#9bdce0"; t.font = "14px 'VT323', monospace";
  t.fillText(sp.move + " - " + sp.moveDesc, SCREEN_W / 2, 270);

  // hint
  t.fillStyle = "#79e3c4"; t.font = "10px 'Press Start 2P', monospace"; t.textAlign = "center";
  t.fillText("FLECHES : CHOISIR     A : APPELER     B : RETOUR", SCREEN_W / 2, 330);

  // BOTTOM : grille des Lumina apaisees
  const b = botCtx;
  b.fillStyle = "#0d2236"; rrect(b, 24, 24, SCREEN_W - 48, SCREEN_H - 48, 12); b.fill();
  b.strokeStyle = "#ffd866"; b.lineWidth = 1.4;
  rrect(b, 24, 24, SCREEN_W - 48, SCREEN_H - 48, 12); b.stroke();
  b.fillStyle = "#ffd866"; b.font = "12px 'Press Start 2P', monospace"; b.textAlign = "center";
  b.fillText("ALBUM LUMINA", SCREEN_W / 2, 50);

  const cols = 4;
  const cellW = 130, cellH = 130;
  const startX = (SCREEN_W - cellW * cols) / 2 + cellW / 2;
  const startY = 130;
  for (let i = 0; i < pk.album.length; i++) {
    const sp2 = SPECIES[pk.album[i]];
    const cx = startX + (i % cols) * cellW;
    const cy = startY + Math.floor(i / cols) * cellH;
    const isSel = i === pk.sel;
    b.fillStyle = isSel ? "#1f3f5e" : "#0a1729";
    rrect(b, cx - cellW / 2 + 8, cy - 50, cellW - 16, cellH - 14, 8); b.fill();
    b.strokeStyle = isSel ? "#ffd866" : "#3a4d6b"; b.lineWidth = isSel ? 2 : 1;
    rrect(b, cx - cellW / 2 + 8, cy - 50, cellW - 16, cellH - 14, 8); b.stroke();
    drawCreature(b, sp2, cx, cy, Game.t * 0.5 + i, 0, false, false);
    b.fillStyle = "#fff"; b.font = "10px 'Press Start 2P', monospace"; b.textAlign = "center";
    b.fillText(sp2.name, cx, cy + 38);
  }
}

/* ---------- SUMMON : invocation animee ---------- */
function drawSummon() {
  drawHub();
  // assombrir progressivement
  for (const ctx of [topCtx, botCtx]) {
    ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  }
  const s = Game.summon; if (!s) return;
  const sp = SPECIES[s.species];
  const ob = s.obstacle;
  const obT = OBSTACLE_TYPES[ob.type];

  const b = botCtx;

  // Position cible: a cote de l'obstacle
  const cx = ob.x, cy = ob.y;
  // halo d'apparition pulse
  const grad = b.createRadialGradient(cx, cy, 6, cx, cy, 60 + Math.sin(Game.t * 8) * 4);
  grad.addColorStop(0, sp.accent + "ff");
  grad.addColorStop(0.5, sp.body + "88");
  grad.addColorStop(1, sp.body + "00");
  b.fillStyle = grad;
  b.beginPath(); b.arc(cx, cy, 60, 0, Math.PI * 2); b.fill();

  // Phase appear : bille de lumiere descend
  if (s.phase === "appear") {
    const k = clamp(s.t / 0.6, 0, 1);
    // anneaux qui se referment
    for (let i = 0; i < 3; i++) {
      const r = (1 - k) * 80 - i * 8;
      if (r > 0) {
        b.strokeStyle = "rgba(255,236,160," + (0.6 - i * 0.18).toFixed(2) + ")"; b.lineWidth = 2;
        b.beginPath(); b.arc(cx, cy, r, 0, Math.PI * 2); b.stroke();
      }
    }
    // creature apparait progressivement
    b.save(); b.globalAlpha = k;
    b.save(); b.translate(cx, cy - 30 + k * 20); b.scale(0.8 + k * 0.4, 0.8 + k * 0.4);
    drawCreature(b, sp, 0, 0, Game.t * 2, 0, false, false);
    b.restore(); b.restore();
  } else if (s.phase === "act") {
    // creature qui agit
    const k = clamp(s.t / 1.0, 0, 1);
    // creature se penche vers l'obstacle
    b.save(); b.translate(cx + Math.sin(s.t * 6) * 4, cy - 14); b.scale(1.2, 1.2);
    drawCreature(b, sp, 0, 0, Game.t * 3, 0, true, false);
    b.restore();
    // effet specifique selon type
    drawObstacleEffect(b, ob, sp, s.t);
    // obstacle qui se dissout / s'efface
    b.save(); b.globalAlpha = 1 - k;
    drawObstacle(b, ob, Game.t);
    b.restore();
    // particules
    for (let i = 0; i < 3; i++) {
      const a = Game.t * 4 + i * 2;
      b.fillStyle = sp.accent;
      b.fillRect((cx + Math.cos(a) * 28) | 0, (cy + Math.sin(a) * 16) | 0, 2, 2);
    }
  } else if (s.phase === "leave") {
    // creature monte / s'efface
    const k = clamp(s.t / 0.6, 0, 1);
    b.save(); b.globalAlpha = 1 - k;
    b.save(); b.translate(cx, cy - 30 - k * 30); b.scale(1.2 - k * 0.4, 1.2 - k * 0.4);
    drawCreature(b, sp, 0, 0, Game.t * 2, 0, false, false);
    b.restore(); b.restore();
    // sparkles montants
    for (let i = 0; i < 6; i++) {
      const sx2 = cx + (i - 3) * 6;
      const sy2 = cy - k * 60 - i * 4;
      b.fillStyle = "rgba(255,236,160," + (1 - k).toFixed(2) + ")";
      b.fillRect(sx2 | 0, sy2 | 0, 1, 2);
    }
  }

  // Bandeau d'action en bas
  const t = topCtx;
  t.fillStyle = "rgba(0,0,0,0.55)"; t.fillRect(0, SCREEN_H - 80, SCREEN_W, 80);
  t.fillStyle = "#ffd866"; t.font = "16px 'Press Start 2P', monospace"; t.textAlign = "center";
  t.fillText(sp.name.toUpperCase() + " - " + sp.move.toUpperCase(), SCREEN_W / 2, SCREEN_H - 50);
  t.fillStyle = "#cfeaff"; t.font = "18px 'VT323', monospace";
  t.fillText(sp.name + " " + obT.verb + " !", SCREEN_W / 2, SCREEN_H - 24);
}

function drawObstacleEffect(c, ob, sp, t) {
  const x = ob.x, y = ob.y;
  switch (ob.type) {
    case "rock": {
      // pousse-roc : trace de poussee
      c.strokeStyle = "#a89377"; c.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const a = (-0.3 + i * 0.2) + Math.sin(t * 8 + i) * 0.05;
        c.beginPath(); c.moveTo(x - 6, y); c.lineTo(x - 6 + Math.cos(a) * 18, y + Math.sin(a) * 8); c.stroke();
      }
      break;
    }
    case "bush": {
      // mossnib : feuilles vertes qui tournent
      for (let i = 0; i < 8; i++) {
        const a = t * 4 + i * (Math.PI / 4);
        c.fillStyle = "#5fbe3a";
        c.fillRect((x + Math.cos(a) * 14) | 0, (y + Math.sin(a) * 10) | 0, 3, 2);
      }
      break;
    }
    case "water": {
      c.strokeStyle = "#a8d4ff"; c.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        c.beginPath(); c.arc(x, y, 4 + i * 6 + (t * 30 % 6), 0, Math.PI * 2); c.stroke();
      }
      break;
    }
    case "thorn": {
      // braise
      for (let i = 0; i < 6; i++) {
        const a = i * (Math.PI / 3);
        c.fillStyle = i % 2 ? "#ff8a3a" : "#ffd866";
        c.fillRect((x + Math.cos(a) * 14) | 0, (y + Math.sin(a) * 8) | 0, 2, 2);
      }
      break;
    }
    case "dark": {
      c.fillStyle = "#fff5b8";
      c.beginPath(); c.arc(x, y, 18 + Math.sin(t * 8) * 4, 0, Math.PI * 2); c.fill();
      break;
    }
    case "gear": {
      c.strokeStyle = "#ffec6b"; c.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const a = i * 0.6;
        c.beginPath(); c.moveTo(x - 8 + i * 4, y - 16); c.lineTo(x - 6 + i * 4, y + 2); c.stroke();
      }
      break;
    }
    case "spirit": {
      c.fillStyle = "rgba(255,255,255,0.6)";
      c.beginPath(); c.arc(x, y, 14 + Math.sin(t * 6) * 3, 0, Math.PI * 2); c.fill();
      break;
    }
  }
}

/* ---------- SANCTUAIRE ---------- */
function buildSanctuary() {
  // Map "d'observation" : entierement de l'herbe avec quelques zones thematiques.
  const map = [];
  for (let y = 0; y < ROWS; y++) {
    const row = []; for (let x = 0; x < COLS; x++) row.push(0); map.push(row);
  }
  // Bordure d'arbres avec une seule sortie au sud
  for (let x = 0; x < COLS; x++) { map[0][x] = 5; map[ROWS - 1][x] = 5; }
  for (let y = 0; y < ROWS; y++) { map[y][0] = 5; map[y][COLS - 1] = 5; }
  // Sortie au sud (centre)
  map[ROWS - 1][9] = 1; map[ROWS - 1][10] = 1; map[ROWS - 2][9] = 1; map[ROWS - 2][10] = 1;
  // Petite mare a gauche
  for (let y = 4; y <= 6; y++) for (let x = 2; x <= 4; x++) map[y][x] = 3;
  for (let x = 2; x <= 4; x++) map[3][x] = 4;
  // Cailloux et fleurs decoratives
  const flowers = [[2, 8], [3, 12], [5, 15], [7, 17], [8, 6], [9, 14], [3, 7], [6, 8]];
  for (const f of flowers) if (map[f[0]][f[1]] === 0) map[f[0]][f[1]] = 11;
  const stones = [[4, 13], [6, 16], [2, 10]];
  for (const s of stones) if (map[s[0]][s[1]] === 0) map[s[0]][s[1]] = 10;

  // Une instance pour chaque Lumina apaisee
  const residents = [];
  for (const id of Game.album) {
    const sp = SPECIES[id]; if (!sp) continue;
    let x = 0, y = 0;
    for (let tries = 0; tries < 10; tries++) {
      x = rand(2 * TILE, (COLS - 2) * TILE);
      y = rand(2 * TILE, (ROWS - 2) * TILE);
      const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
      if (!tileSolid(map[ty][tx]) && map[ty][tx] !== 3) break;
    }
    residents.push({
      species: sp, id,
      x, y, vx: 0, vy: 0,
      anim: rand(0, 5),
      restT: rand(0.3, 1.5),
      moveT: rand(0.6, 1.6),
      mode: "rest"
    });
  }

  Game.sanctuary = {
    map,
    residents,
    player: { x: 9 * TILE + 16, y: (ROWS - 2) * TILE + 8, dir: "up", anim: 0 },
    arrivedT: 0
  };
}

function updateSanctuary(dt) {
  Game.t += dt;
  const sa = Game.sanctuary; if (!sa) return;
  sa.arrivedT += dt;
  const p = sa.player;
  const v = getDirVec();
  const speed = 90;
  const nx = p.x + v.x * speed * dt, ny = p.y + v.y * speed * dt;
  const tryMove = (x, y) => {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return false;
    return !tileSolid(sa.map[ty][tx]);
  };
  if (tryMove(nx, p.y)) p.x = nx;
  if (tryMove(p.x, ny)) p.y = ny;
  if (v.x || v.y) {
    if (Math.abs(v.x) > Math.abs(v.y)) p.dir = v.x > 0 ? "right" : "left";
    else p.dir = v.y > 0 ? "down" : "up";
    p.anim += dt * 6;
  } else p.anim = 0;

  // Sortie : marcher sur le bas (y >= dernier - quelques)
  if (p.y > (ROWS - 1) * TILE - 4) {
    SFX.iris();
    startTransition(() => {
      buildHub();
      switchState("hub");
    }, { cx: p.x, cy: p.y });
    return;
  }

  // IA des residents : balade lente, pause, scan visuel
  for (const r of sa.residents) {
    r.anim += dt;
    if (r.mode === "rest") {
      r.restT -= dt;
      if (r.restT <= 0) {
        const a = rand(0, Math.PI * 2);
        r.vx = Math.cos(a); r.vy = Math.sin(a);
        r.moveT = rand(0.8, 2.0);
        r.mode = "walk";
      }
    } else {
      r.moveT -= dt;
      const sp = r.species.speed * 0.35;
      const nxR = r.x + r.vx * sp * dt;
      const nyR = r.y + r.vy * sp * dt;
      const tx = Math.floor(nxR / TILE), ty = Math.floor(nyR / TILE);
      if (tx >= 1 && tx < COLS - 1 && ty >= 1 && ty < ROWS - 1 && !tileSolid(sa.map[ty][tx]) && sa.map[ty][tx] !== 3) {
        r.x = nxR; r.y = nyR;
      } else {
        r.vx = -r.vx; r.vy = -r.vy;
      }
      if (r.moveT <= 0) {
        r.mode = "rest"; r.restT = rand(0.6, 2.0);
      }
    }
  }
}

function drawSanctuary() {
  const sa = Game.sanctuary;
  // TOP : panneau d'info
  const t = topCtx;
  const g = t.createLinearGradient(0, 0, 0, SCREEN_H);
  g.addColorStop(0, "#bce6ff"); g.addColorStop(0.6, "#fde8a8"); g.addColorStop(1, "#9be3aa");
  t.fillStyle = g; t.fillRect(0, 0, SCREEN_W, SCREEN_H);

  // Soleil + nuages doux
  t.fillStyle = "rgba(255,236,160,0.9)";
  t.beginPath(); t.arc(540, 70, 28, 0, Math.PI * 2); t.fill();
  t.fillStyle = "rgba(255,255,255,0.8)";
  t.beginPath(); t.arc(80 + (Game.t * 10) % 600, 60, 14, 0, Math.PI * 2); t.fill();
  t.beginPath(); t.arc(140 + (Game.t * 14) % 600, 110, 12, 0, Math.PI * 2); t.fill();

  // titre
  t.fillStyle = "#0d2236"; rrect(t, 24, 24, 592, 64, 12); t.fill();
  t.fillStyle = "#ffd866"; t.font = "16px 'Press Start 2P', monospace"; t.textAlign = "left";
  t.fillText("SANCTUAIRE LUMINA", 44, 56);
  t.fillStyle = "#9bdce0"; t.font = "16px 'VT323', monospace";
  t.fillText("Verdis Sanctuary - habitat libre", 44, 78);

  // Liste des residents
  t.fillStyle = "#0d2236"; rrect(t, 24, 110, 592, 240, 12); t.fill();
  t.fillStyle = "#ffd866"; t.font = "12px 'Press Start 2P', monospace";
  t.fillText("LUMINA APAISEES PRESENTES", 44, 138);

  if (sa.residents.length === 0) {
    t.fillStyle = "#cfeaff"; t.font = "16px 'VT323', monospace";
    t.fillText("Le sanctuaire est encore desert. Apaise des Lumina pour les voir s'y installer.", 44, 170);
  } else {
    let yy = 162;
    for (let i = 0; i < sa.residents.length; i++) {
      const r = sa.residents[i];
      const cx = 50 + (i % 4) * 144, cy = yy + Math.floor(i / 4) * 90;
      // mini portrait
      t.save(); t.translate(cx, cy + 18); t.scale(1.4, 1.4);
      drawCreature(t, r.species, 0, 0, Game.t + i, 0, false, false);
      t.restore();
      t.fillStyle = "#cfeaff"; t.font = "12px 'VT323', monospace"; t.textAlign = "left";
      t.fillText(r.species.name, cx + 24, cy + 14);
      t.fillStyle = "#79e3c4";
      t.fillText(r.species.element, cx + 24, cy + 28);
    }
  }

  t.fillStyle = "#9bdce0"; t.font = "10px 'Press Start 2P', monospace"; t.textAlign = "center";
  t.fillText("MARCHE VERS LE SUD POUR REVENIR AU HUB", SCREEN_W / 2, 380);

  // BOTTOM : la map avec les Lumina libres
  const b = botCtx;
  b.fillStyle = "#000"; b.fillRect(0, 0, SCREEN_W, SCREEN_H);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) drawTile(b, sa.map[y][x], x * TILE, y * TILE);

  // Y-sort
  const items = [];
  items.push({ y: sa.player.y + 14, kind: "player" });
  for (const r of sa.residents) items.push({ y: r.y + r.species.radius * 0.9, kind: "creature", r });
  items.sort((a, c) => a.y - c.y);
  for (const it of items) {
    if (it.kind === "player") {
      drawHuman(b, "player", sa.player.x, sa.player.y, sa.player.dir, sa.player.anim);
    } else {
      drawCreature(b, it.r.species, it.r.x, it.r.y, it.r.anim, 0, false, false);
    }
  }

  // Petits papillons / bullles d'ambiance
  for (let i = 0; i < 5; i++) {
    const a = Game.t * 1.2 + i * 1.3;
    const bx = ((i * 73 + Math.sin(a) * 30 + Game.t * 30) | 0) % SCREEN_W;
    const by = (40 + i * 50 + Math.cos(a) * 6) | 0;
    b.fillStyle = i % 2 ? "#ff8aa6" : "#fff5b8";
    b.fillRect(bx, by, 2, 2);
  }

  // Texte bienvenue les premieres secondes
  if (sa.arrivedT < 3) {
    const a = clamp(1 - Math.abs(sa.arrivedT - 1.5) / 1.5, 0, 1);
    b.fillStyle = "rgba(13,34,54," + (0.7 * a).toFixed(2) + ")";
    b.fillRect(0, 140, SCREEN_W, 60);
    b.fillStyle = "rgba(255,216,102," + a.toFixed(2) + ")";
    b.font = "16px 'Press Start 2P', monospace"; b.textAlign = "center";
    b.fillText("BIENVENUE AU SANCTUAIRE", SCREEN_W / 2, 174);
    b.fillStyle = "rgba(207,234,255," + a.toFixed(2) + ")"; b.font = "14px 'VT323', monospace";
    b.fillText("Tes Lumina apaisees y vivent libres.", SCREEN_W / 2, 192);
  }
}

/* ---------- HOUSE (cabane warden interieure) ---------- */

/* Slots fixes dans la piece (centre de l'objet, en pixels du canvas bas) */
const HOUSE_SLOTS = {
  floor:    { x: 320, y: 240 },  // tapis sous tout
  bed:      { x: 130, y: 130 },
  table:    { x: 460, y: 240 },
  lamp:     { x: 540, y: 130 },
  wall_l:   { x: 200, y: 70 },
  wall_r:   { x: 470, y: 80 },
  corner_l: { x: 60,  y: 290 },
  corner_r: { x: 590, y: 290 },
  shelf:    { x: 290, y: 70 },
  trophy:   { x: 380, y: 70 }
};

function buildHouse() {
  Game.house = {
    player: { x: 320, y: 320, dir: "up", anim: 0 },
    exitT: 0,
    welcomeT: 0
  };
}

function updateHouse(dt) {
  Game.t += dt;
  const h = Game.house; if (!h) return;
  h.welcomeT += dt;
  const p = h.player;
  const v = getDirVec();
  const speed = 90;
  const nx = p.x + v.x * speed * dt, ny = p.y + v.y * speed * dt;
  // murs : haut 56, bas 340, gauche 36, droite 604
  const inBounds = (x, y) => x >= 36 && x <= 604 && y >= 56 && y <= 340;
  if (inBounds(nx, p.y)) p.x = nx;
  if (inBounds(p.x, ny)) p.y = ny;
  if (v.x || v.y) {
    if (Math.abs(v.x) > Math.abs(v.y)) p.dir = v.x > 0 ? "right" : "left";
    else p.dir = v.y > 0 ? "down" : "up";
    p.anim += dt * 6;
  } else p.anim = 0;

  // Sortie : tapis devant la porte, en bas centre
  const onMat = Math.abs(p.x - 320) < 20 && p.y > 322;
  if (onMat && Input.pressed.has("ArrowDown")) {
    SFX.iris();
    startTransition(() => { switchState("hub"); }, { cx: p.x, cy: p.y });
    return;
  }
  if (Input.bPressed) {
    SFX.back();
    startTransition(() => { switchState("hub"); }, { cx: p.x, cy: p.y });
  }
}

function drawHouse() {
  const h = Game.house; if (!h) return;
  const t = topCtx, b = botCtx;

  /* TOP : info + inventaire */
  const g = t.createLinearGradient(0, 0, 0, SCREEN_H);
  g.addColorStop(0, "#26171f"); g.addColorStop(1, "#3b2418");
  t.fillStyle = g; t.fillRect(0, 0, SCREEN_W, SCREEN_H);

  // bandeau
  t.fillStyle = "#0d2236"; rrect(t, 24, 20, 592, 60, 12); t.fill();
  t.strokeStyle = "#ffd866"; t.lineWidth = 2; rrect(t, 24, 20, 592, 60, 12); t.stroke();
  t.fillStyle = "#ffd866"; t.font = "16px 'Press Start 2P', monospace"; t.textAlign = "left";
  t.fillText("MA CABANE", 44, 50);
  t.fillStyle = "#9bdce0"; t.font = "16px 'VT323', monospace";
  t.fillText("Avant-Poste Halcyon - quartier des cadets", 44, 70);
  drawCoinBadge(t, 596, 50);

  // Inventaire / progression
  t.fillStyle = "#0d2236"; rrect(t, 24, 90, 592, 260, 12); t.fill();
  t.fillStyle = "#ffd866"; t.font = "12px 'Press Start 2P', monospace";
  t.fillText("MOBILIER POSSEDE  (" + Game.owned.size + " / " + Object.keys(FURNITURE).length + ")", 44, 116);

  const list = Object.keys(FURNITURE);
  for (let i = 0; i < list.length; i++) {
    const id = list[i];
    const it = FURNITURE[id];
    const owns = Game.owned.has(id);
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 44 + col * 290;
    const y = 140 + row * 38;
    t.fillStyle = owns ? "#1f3f5e" : "#0a1729";
    rrect(t, x, y, 280, 32, 6); t.fill();
    t.strokeStyle = owns ? "#79e3c4" : "#3a4d6b"; t.lineWidth = 1;
    rrect(t, x, y, 280, 32, 6); t.stroke();
    t.save(); t.translate(x + 18, y + 16); t.scale(0.5, 0.5);
    drawFurniture(t, id, 0, 0, Game.t);
    t.restore();
    t.fillStyle = owns ? "#fff" : "#6b7892"; t.font = "10px 'Press Start 2P', monospace"; t.textAlign = "left";
    t.fillText(it.name, x + 38, y + 18);
    t.textAlign = "right";
    if (owns) { t.fillStyle = "#79e3c4"; t.fillText("OK", x + 270, y + 18); }
    else { t.fillStyle = "#ff8a6b"; t.fillText(it.price + " L", x + 270, y + 18); }
  }

  t.fillStyle = "#9bdce0"; t.font = "10px 'Press Start 2P', monospace"; t.textAlign = "center";
  t.fillText("BAS : RETOUR HUB     B : SORTIR", 320, 376);

  /* BOTTOM : la piece */
  // mur fond (planches)
  const wallGrad = b.createLinearGradient(0, 0, 0, 56);
  wallGrad.addColorStop(0, "#7a4f2c"); wallGrad.addColorStop(1, "#5a3a1f");
  b.fillStyle = wallGrad; b.fillRect(0, 0, SCREEN_W, 56);
  // bandes verticales (planches)
  b.fillStyle = "rgba(0,0,0,0.18)";
  for (let i = 0; i < 12; i++) b.fillRect(i * (SCREEN_W / 12), 0, 1, 56);
  // moulure
  b.fillStyle = "#3a2418"; b.fillRect(0, 52, SCREEN_W, 4);
  b.fillStyle = "#a87b50"; b.fillRect(0, 50, SCREEN_W, 1);

  // sol (parquet)
  for (let y = 56; y < 340; y += 16) {
    const lighter = (y / 16) % 2 === 0;
    b.fillStyle = lighter ? "#caa977" : "#b89568";
    b.fillRect(0, y, SCREEN_W, 16);
    b.fillStyle = "rgba(60,40,20,0.18)";
    b.fillRect(0, y + 15, SCREEN_W, 1);
  }
  // joints planches verticaux
  b.fillStyle = "rgba(60,40,20,0.18)";
  for (let i = 0; i < 8; i++) b.fillRect(i * 80 + ((Math.floor((i / 16))) * 40), 56, 1, 284);

  // sol bas : seuil/moquette devant la porte
  b.fillStyle = "#3a2418"; b.fillRect(0, 340, SCREEN_W, 12);
  b.fillStyle = "#5a3a1f"; b.fillRect(0, 352, SCREEN_W, 32);
  // tapis seuil
  b.fillStyle = "#9d2c2c";
  rrect(b, 280, 332, 80, 14, 3); b.fill();
  b.fillStyle = "#d04040"; rrect(b, 282, 334, 76, 10, 2); b.fill();
  b.fillStyle = "#ffd866"; b.fillRect(286, 338, 68, 1);
  // porte
  b.fillStyle = "#3a2418"; rrect(b, 296, 348, 48, 36, 4); b.fill();
  b.fillStyle = "#5a3a1f"; rrect(b, 298, 350, 44, 30, 3); b.fill();
  b.fillStyle = "#ffd866"; b.beginPath(); b.arc(336, 366, 1.6, 0, Math.PI * 2); b.fill();

  // Liste de meubles ordonnee : premier etage en arriere (wall), puis sol, puis premier plan
  const drawOrder = [
    "rug",       // sol d'abord
    "painting", "shelf", "trophy", "bookshelf",   // sur le mur
    "bed", "table", "lamp",                        // mobilier
    "plant_l", "plant_r"                           // plantes au sol (avant sortable)
  ];

  // Y-sort joueur + meubles "au sol" (bed, table, lamp, plants)
  const sortable = [];
  for (const fid of ["bed", "table", "lamp", "plant_l", "plant_r"]) {
    if (Game.owned.has(fid)) {
      const slot = HOUSE_SLOTS[FURNITURE[fid].slot];
      sortable.push({ kind: "furn", id: fid, x: slot.x, y: slot.y });
    }
  }
  sortable.push({ kind: "player", x: h.player.x, y: h.player.y });

  // dessine d'abord le tapis
  if (Game.owned.has("rug")) drawFurniture(b, "rug", HOUSE_SLOTS.floor.x, HOUSE_SLOTS.floor.y, Game.t);
  // puis les murs
  for (const fid of ["painting", "shelf", "trophy", "bookshelf"]) {
    if (Game.owned.has(fid)) {
      const slot = HOUSE_SLOTS[FURNITURE[fid].slot];
      drawFurniture(b, fid, slot.x, slot.y, Game.t);
    }
  }
  // puis sol y-sorte
  sortable.sort((a, c) => a.y - c.y);
  for (const it of sortable) {
    if (it.kind === "player") {
      drawHuman(b, "player", h.player.x, h.player.y, h.player.dir, h.player.anim);
    } else {
      drawFurniture(b, it.id, it.x, it.y, Game.t);
    }
  }

  // Vignette
  const vg = b.createRadialGradient(SCREEN_W / 2, 200, 100, SCREEN_W / 2, 200, 380);
  vg.addColorStop(0, "rgba(255,236,160,0.08)");
  vg.addColorStop(1, "rgba(0,0,0,0.45)");
  b.fillStyle = vg; b.fillRect(0, 0, SCREEN_W, SCREEN_H);

  // Hint sortie quand sur tapis
  if (Math.abs(h.player.x - 320) < 20 && h.player.y > 310) {
    b.fillStyle = "#0d2236d8"; rrect(b, 240, 280, 160, 18, 4); b.fill();
    b.fillStyle = "#ffd866"; b.font = "9px 'Press Start 2P', monospace"; b.textAlign = "center";
    b.fillText("BAS : SORTIR DE LA CABANE", 320, 292);
  }

  // Bienvenue/info au debut
  if (h.welcomeT < 2.5 && Game.owned.size === 0) {
    const a = clamp(1 - Math.abs(h.welcomeT - 1.2) / 1.2, 0, 1);
    b.fillStyle = "rgba(13,34,54," + (0.6 * a).toFixed(2) + ")";
    b.fillRect(60, 140, SCREEN_W - 120, 60);
    b.fillStyle = "rgba(255,216,102," + a.toFixed(2) + ")";
    b.font = "12px 'Press Start 2P', monospace"; b.textAlign = "center";
    b.fillText("CABANE VIDE", SCREEN_W / 2, 168);
    b.fillStyle = "rgba(207,234,255," + a.toFixed(2) + ")"; b.font = "14px 'VT323', monospace";
    b.fillText("Achete des meubles chez Yuna pour la decorer.", SCREEN_W / 2, 188);
  }
}

/* Dispatcher meubles */
function drawFurniture(c, id, x, y, t) {
  switch (id) {
    case "rug":       drawFurnRug(c, x, y); break;
    case "bed":       drawFurnBed(c, x, y); break;
    case "plant_l":   drawFurnPlantFern(c, x, y, t); break;
    case "plant_r":   drawFurnPlantFlower(c, x, y, t); break;
    case "lamp":      drawFurnLamp(c, x, y, t); break;
    case "table":     drawFurnTable(c, x, y); break;
    case "painting":  drawFurnPainting(c, x, y); break;
    case "bookshelf": drawFurnBookshelf(c, x, y); break;
    case "plush":     drawFurnPlush(c, x, y, t); break;
    case "trophy":    drawFurnTrophy(c, x, y, t); break;
  }
}

/* Tapis tresse */
function drawFurnRug(c, x, y) {
  c.save();
  // ovale tisse
  c.fillStyle = "#7a3a52";
  c.beginPath(); c.ellipse(x, y, 130, 56, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#c45a7a";
  c.beginPath(); c.ellipse(x, y, 110, 46, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#ff8aa6";
  c.beginPath(); c.ellipse(x, y, 90, 36, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#ffd866";
  c.beginPath(); c.ellipse(x, y, 60, 22, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#fff5b8";
  c.beginPath(); c.ellipse(x, y, 24, 8, 0, 0, Math.PI * 2); c.fill();
  // motif radial
  c.strokeStyle = "rgba(122,58,82,0.3)"; c.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const a = i * (Math.PI / 8);
    c.beginPath();
    c.moveTo(x - Math.cos(a) * 120, y - Math.sin(a) * 50);
    c.lineTo(x + Math.cos(a) * 120, y + Math.sin(a) * 50);
    c.stroke();
  }
  // franges
  c.strokeStyle = "#7a3a52"; c.lineWidth = 1;
  for (let i = -10; i <= 10; i++) {
    c.beginPath(); c.moveTo(x + i * 12, y - 56); c.lineTo(x + i * 12, y - 60); c.stroke();
    c.beginPath(); c.moveTo(x + i * 12, y + 56); c.lineTo(x + i * 12, y + 60); c.stroke();
  }
  c.restore();
}

/* Lit warden : matelas + couverture + oreiller */
function drawFurnBed(c, x, y) {
  // ombre
  c.fillStyle = "rgba(0,0,0,0.32)";
  c.beginPath(); c.ellipse(x, y + 22, 50, 6, 0, 0, Math.PI * 2); c.fill();
  // structure bois bas
  c.fillStyle = "#5a3a1f"; c.fillRect(x - 50, y + 12, 100, 10);
  c.fillStyle = "#7a4f2c"; c.fillRect(x - 50, y + 12, 100, 4);
  // pieds
  c.fillStyle = "#3a2418";
  c.fillRect(x - 50, y + 22, 6, 6); c.fillRect(x + 44, y + 22, 6, 6);
  // tete de lit
  c.fillStyle = "#7a4f2c"; c.fillRect(x - 50, y - 16, 12, 30);
  c.fillStyle = "#5a3a1f"; c.fillRect(x - 48, y - 14, 8, 26);
  // matelas
  c.fillStyle = "#fbe4c0"; c.fillRect(x - 38, y - 8, 88, 22);
  c.strokeStyle = "#caa977"; c.lineWidth = 1;
  c.beginPath(); c.moveTo(x - 38, y - 8); c.lineTo(x + 50, y - 8); c.stroke();
  // couverture orange (cote pieds)
  c.fillStyle = "#ff6b3d"; c.fillRect(x + 4, y - 8, 46, 22);
  c.fillStyle = "#ffd866"; c.fillRect(x + 4, y - 8, 46, 2);
  c.strokeStyle = "#a83a1f"; c.lineWidth = 1;
  c.beginPath(); c.moveTo(x + 4, y - 8); c.lineTo(x + 4, y + 14); c.stroke();
  // oreiller
  c.fillStyle = "#ffffff";
  rrect(c, x - 36, y - 6, 30, 14, 3); c.fill();
  c.strokeStyle = "#caa977"; rrect(c, x - 36, y - 6, 30, 14, 3); c.stroke();
  // logo Warden sur couverture
  c.fillStyle = "#ffd866";
  c.beginPath(); c.ellipse(x + 24, y + 4, 4, 2.5, -0.3, 0, Math.PI * 2); c.fill();
}

/* Fougere en pot */
function drawFurnPlantFern(c, x, y, t) {
  // pot
  c.fillStyle = "rgba(0,0,0,0.32)";
  c.beginPath(); c.ellipse(x, y + 18, 14, 4, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#7a3a1f";
  c.beginPath();
  c.moveTo(x - 12, y + 4); c.lineTo(x + 12, y + 4); c.lineTo(x + 10, y + 16); c.lineTo(x - 10, y + 16); c.closePath();
  c.fill();
  c.fillStyle = "#a04a2c"; c.fillRect(x - 12, y + 4, 24, 2);
  c.strokeStyle = "#3a1408"; c.lineWidth = 1; c.stroke();
  // feuilles - 5 grandes
  const sway = Math.sin(t * 1.2) * 0.15;
  for (let i = 0; i < 5; i++) {
    const angle = -Math.PI / 2 + (i - 2) * 0.5 + sway;
    c.save(); c.translate(x, y + 4); c.rotate(angle);
    c.fillStyle = i % 2 ? "#3b6e3a" : "#5fbe3a";
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(4, -10, 0, -22);
    c.quadraticCurveTo(-4, -10, 0, 0);
    c.fill();
    c.strokeStyle = "#1f3f1d"; c.lineWidth = 1;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -22); c.stroke();
    c.restore();
  }
}

/* Fleur tropicale */
function drawFurnPlantFlower(c, x, y, t) {
  c.fillStyle = "rgba(0,0,0,0.32)";
  c.beginPath(); c.ellipse(x, y + 18, 12, 4, 0, 0, Math.PI * 2); c.fill();
  // pot bleu
  c.fillStyle = "#274f8a";
  c.beginPath();
  c.moveTo(x - 10, y + 4); c.lineTo(x + 10, y + 4); c.lineTo(x + 8, y + 16); c.lineTo(x - 8, y + 16); c.closePath();
  c.fill();
  c.fillStyle = "#3a78b8"; c.fillRect(x - 10, y + 4, 20, 2);
  // tige
  c.strokeStyle = "#3b6e3a"; c.lineWidth = 2;
  c.beginPath(); c.moveTo(x, y + 4); c.lineTo(x + 1, y - 16); c.stroke();
  // feuilles
  c.fillStyle = "#5fbe3a";
  c.beginPath(); c.ellipse(x - 6, y - 6, 4, 8, -0.5, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(x + 6, y - 4, 4, 8, 0.5, 0, Math.PI * 2); c.fill();
  // fleur (oscille legerement)
  const sway = Math.sin(t * 1.3) * 1;
  c.fillStyle = "#ff8aa6";
  for (let i = 0; i < 5; i++) {
    const a = i * (Math.PI * 2 / 5) + sway * 0.05;
    const fx = x + 1 + Math.cos(a) * 5, fy = y - 16 + Math.sin(a) * 5;
    c.beginPath(); c.arc(fx, fy, 4, 0, Math.PI * 2); c.fill();
  }
  c.fillStyle = "#ffd866";
  c.beginPath(); c.arc(x + 1, y - 16, 3, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#fff5b8";
  c.beginPath(); c.arc(x, y - 17, 1, 0, Math.PI * 2); c.fill();
}

/* Lampe chaude */
function drawFurnLamp(c, x, y, t) {
  // ombre
  c.fillStyle = "rgba(0,0,0,0.32)";
  c.beginPath(); c.ellipse(x, y + 26, 10, 3, 0, 0, Math.PI * 2); c.fill();
  // base
  c.fillStyle = "#3a2418"; c.fillRect(x - 6, y + 20, 12, 6);
  c.fillStyle = "#5a3a1f"; c.fillRect(x - 6, y + 20, 12, 1);
  // tige
  c.fillStyle = "#3a2418"; c.fillRect(x - 1, y - 8, 2, 28);
  // abat-jour
  c.fillStyle = "#ffd866";
  c.beginPath();
  c.moveTo(x - 14, y - 10); c.lineTo(x + 14, y - 10);
  c.lineTo(x + 12, y - 22); c.lineTo(x - 12, y - 22); c.closePath();
  c.fill();
  c.strokeStyle = "#a87b00"; c.lineWidth = 1; c.stroke();
  c.fillStyle = "#fff5b8";
  c.beginPath();
  c.moveTo(x - 12, y - 11); c.lineTo(x + 12, y - 11);
  c.lineTo(x + 10, y - 20); c.lineTo(x - 10, y - 20); c.closePath();
  c.fill();
  // halo
  const grad = c.createRadialGradient(x, y - 14, 4, x, y - 14, 40);
  grad.addColorStop(0, "rgba(255,236,160,0.55)");
  grad.addColorStop(1, "rgba(255,236,160,0)");
  c.fillStyle = grad;
  c.beginPath(); c.arc(x, y - 14, 40 + Math.sin(t * 4) * 1.5, 0, Math.PI * 2); c.fill();
}

/* Table ronde + chaise */
function drawFurnTable(c, x, y) {
  c.fillStyle = "rgba(0,0,0,0.32)";
  c.beginPath(); c.ellipse(x, y + 22, 30, 6, 0, 0, Math.PI * 2); c.fill();
  // chaise (a droite)
  c.fillStyle = "#5a3a1f"; c.fillRect(x + 22, y - 4, 10, 22);
  c.fillStyle = "#7a4f2c"; c.fillRect(x + 22, y - 12, 10, 8); // dossier
  c.fillStyle = "#3a2418"; c.fillRect(x + 22, y + 18, 2, 4); c.fillRect(x + 30, y + 18, 2, 4);
  // pied table
  c.fillStyle = "#3a2418"; c.fillRect(x - 2, y - 4, 4, 22);
  c.fillStyle = "#5a3a1f"; c.fillRect(x - 12, y + 18, 24, 4);
  // plateau
  c.fillStyle = "#7a4f2c";
  c.beginPath(); c.ellipse(x, y - 4, 26, 8, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#caa977";
  c.beginPath(); c.ellipse(x, y - 6, 24, 6, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = "#3a2418"; c.lineWidth = 1;
  c.beginPath(); c.ellipse(x, y - 4, 26, 8, 0, 0, Math.PI * 2); c.stroke();
  // tasse fumante sur la table
  c.fillStyle = "#ffffff";
  rrect(c, x - 8, y - 12, 8, 6, 1.5); c.fill();
  c.fillStyle = "#7a3a1f"; c.fillRect(x - 8, y - 11, 8, 1);
  c.strokeStyle = "rgba(255,255,255,0.6)"; c.lineWidth = 1.2;
  c.beginPath(); c.moveTo(x - 6, y - 14); c.quadraticCurveTo(x - 5, y - 18, x - 6, y - 22); c.stroke();
}

/* Tableau Lumina (Glimmer la nuit) */
function drawFurnPainting(c, x, y) {
  // cadre
  c.fillStyle = "#3a2418"; c.fillRect(x - 22, y - 16, 44, 32);
  c.fillStyle = "#7a4f2c"; c.fillRect(x - 20, y - 14, 40, 28);
  // toile - ciel etoile
  const g = c.createLinearGradient(x, y - 13, x, y + 13);
  g.addColorStop(0, "#1d1a3a"); g.addColorStop(1, "#3a2a4f");
  c.fillStyle = g; c.fillRect(x - 19, y - 13, 38, 26);
  // etoiles
  c.fillStyle = "#fff5b8";
  c.fillRect(x - 14, y - 9, 1, 1);
  c.fillRect(x + 8, y - 11, 1, 1);
  c.fillRect(x + 14, y - 5, 1, 1);
  c.fillRect(x - 4, y - 7, 1, 1);
  // glimmer central
  c.fillStyle = "rgba(212,155,255,0.6)";
  c.beginPath(); c.arc(x, y + 2, 6, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#d49bff";
  c.beginPath(); c.arc(x, y + 2, 3, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#fff";
  c.fillRect(x - 1, y + 1, 1, 1);
  // signature
  c.fillStyle = "#ffd866"; c.fillRect(x + 10, y + 9, 2, 1);
}

/* Bibliotheque */
function drawFurnBookshelf(c, x, y) {
  // ombre
  c.fillStyle = "rgba(0,0,0,0.25)";
  c.beginPath(); c.ellipse(x, y + 24, 26, 4, 0, 0, Math.PI * 2); c.fill();
  // structure
  c.fillStyle = "#3a2418"; c.fillRect(x - 24, y - 22, 48, 46);
  c.fillStyle = "#5a3a1f"; c.fillRect(x - 22, y - 20, 44, 42);
  // etageres
  c.fillStyle = "#3a2418";
  c.fillRect(x - 22, y - 8, 44, 2);
  c.fillRect(x - 22, y + 6, 44, 2);
  // livres etage haut
  const books = [
    ["#9d2c2c", 5], ["#274f8a", 4], ["#3aa17a", 6], ["#ffd866", 3], ["#7e3a52", 5]
  ];
  let bx = x - 20;
  for (const [col, w] of books) {
    c.fillStyle = col; c.fillRect(bx, y - 18, w, 9);
    c.fillStyle = "rgba(0,0,0,0.4)"; c.fillRect(bx + w - 1, y - 18, 1, 9);
    bx += w + 1;
  }
  // etage milieu
  let bx2 = x - 20;
  const books2 = [["#3aa17a", 4], ["#9d2c2c", 5], ["#bca7d8", 4], ["#ff8aa6", 5]];
  for (const [col, w] of books2) {
    c.fillStyle = col; c.fillRect(bx2, y - 4, w, 9);
    bx2 += w + 1;
  }
  // bas : objets
  c.fillStyle = "#caa977"; c.fillRect(x - 18, y + 10, 12, 10); // pot
  c.fillStyle = "#3b6e3a";
  c.beginPath(); c.arc(x - 12, y + 8, 4, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#ffd866"; c.fillRect(x + 4, y + 12, 10, 4); // carnet
  c.fillStyle = "#a87b00"; c.fillRect(x + 4, y + 12, 10, 1);
}

/* Peluche Sparklit */
function drawFurnPlush(c, x, y, t) {
  c.save(); c.translate(x, y);
  // base etagere sous la peluche
  c.fillStyle = "#5a3a1f"; c.fillRect(-14, 8, 28, 4);
  // mini Sparklit  
  c.scale(0.7, 0.7);
  drawSparklit(c, SPECIES.sparklit, 12, t * 0.5, false, 0);
  c.restore();
}

/* Trophee Warden */
function drawFurnTrophy(c, x, y, t) {
  // base
  c.fillStyle = "#5a3a1f"; c.fillRect(x - 14, y + 14, 28, 6);
  c.fillStyle = "#7a4f2c"; c.fillRect(x - 14, y + 14, 28, 1);
  // socle
  c.fillStyle = "#caa977"; c.fillRect(x - 8, y + 4, 16, 10);
  c.strokeStyle = "#7a4f2c"; c.lineWidth = 1; c.strokeRect(x - 8, y + 4, 16, 10);
  // plaque
  c.fillStyle = "#ffd866"; c.fillRect(x - 6, y + 7, 12, 4);
  c.fillStyle = "#a87b00";
  c.fillRect(x - 5, y + 9, 2, 1); c.fillRect(x - 1, y + 9, 2, 1); c.fillRect(x + 3, y + 9, 1, 1);
  // coupe
  c.fillStyle = "#ffd866";
  c.beginPath();
  c.moveTo(x - 10, y - 14); c.lineTo(x + 10, y - 14); c.lineTo(x + 7, y + 4); c.lineTo(x - 7, y + 4); c.closePath();
  c.fill();
  c.strokeStyle = "#a87b00"; c.lineWidth = 1.4; c.stroke();
  // anses
  c.strokeStyle = "#ffd866"; c.lineWidth = 2;
  c.beginPath(); c.arc(x - 12, y - 8, 4, -Math.PI / 2, Math.PI / 2); c.stroke();
  c.beginPath(); c.arc(x + 12, y - 8, 4, Math.PI / 2, -Math.PI / 2, true); c.stroke();
  // brillance pulsante
  const pulse = 0.5 + 0.5 * Math.sin(t * 4);
  c.fillStyle = "rgba(255,236,160," + (0.3 + pulse * 0.4).toFixed(2) + ")";
  c.beginPath(); c.arc(x - 4, y - 8, 2, 0, Math.PI * 2); c.fill();
  // etoiles
  c.fillStyle = "#fff5b8";
  c.fillRect(x - 18, y - 16, 1, 1);
  c.fillRect(x + 16, y - 12, 1, 1);
}

/* ---------- Tilemaps d'arene par mission ---------- */
function drawArenaGrassField(b, cap) {
  // tile-based grass
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      drawGrassTile(b, x * TILE, y * TILE, ((x * 73856093) ^ (y * 19349663)) + cap.index * 999);
    }
  }
  // ombres sous les buissons (cap.terrain reutilise comme touffes plus grosses)
  for (const tt of cap.terrain) {
    b.fillStyle = "rgba(0,0,0,0.10)";
    b.beginPath(); b.ellipse(tt.x + 1, tt.y + 4, tt.rx * 0.7, tt.ry * 0.35, 0, 0, Math.PI * 2); b.fill();
    // buisson rond
    b.fillStyle = "#3e9b2a";
    b.beginPath(); b.arc(tt.x, tt.y, tt.rx * 0.5, 0, Math.PI * 2); b.fill();
    b.fillStyle = "#5fbe3a";
    b.beginPath(); b.arc(tt.x - 2, tt.y - 2, tt.rx * 0.45, 0, Math.PI * 2); b.fill();
    b.fillStyle = "#79d24e";
    b.beginPath(); b.arc(tt.x - 3, tt.y - 4, 3, 0, Math.PI * 2); b.fill();
  }
}
function drawArenaSandBeach(b, cap) {
  // sable + bandes d'eau cote haut
  px(b, 0, 0, SCREEN_W, SCREEN_H, "#f0d99a");
  // mer en haut
  const seaH = 110;
  for (let y = 0; y < seaH; y++) {
    const t = y / seaH;
    const r = Math.round(70 + (240 - 70) * t * 0.3);
    const g = Math.round(170 + (217 - 170) * t * 0.4);
    const bl = Math.round(220 + (154 - 220) * t);
    px(b, 0, y, SCREEN_W, 1, "rgb(" + r + "," + g + "," + bl + ")");
  }
  // ecume vagues
  b.fillStyle = "rgba(255,255,255,0.6)";
  for (let i = 0; i < 8; i++) {
    const wx = (i * 90 + (Game.t * 16) % 90) % SCREEN_W;
    const wy = 100 + Math.sin(Game.t * 2 + i) * 4;
    b.fillRect(wx, wy, 18, 1);
  }
  // ligne de coquillages / cailloux
  b.fillStyle = "#d8a76a";
  for (let i = 0; i < 18; i++) {
    const sx = (i * 41 + 17) % SCREEN_W;
    const sy = 130 + ((i * 27) % 20);
    b.beginPath(); b.ellipse(sx, sy, 3, 1.5, 0, 0, Math.PI * 2); b.fill();
  }
  // touffes d'algues
  for (const tt of cap.terrain) {
    b.fillStyle = "#3a6b6e";
    b.beginPath(); b.ellipse(tt.x, tt.y + 130, tt.rx * 0.4, tt.ry * 0.3, 0, 0, Math.PI * 2); b.fill();
  }
}
function drawArenaCindersField(b, cap) {
  // herbe rase + chemin de terre
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      drawGrassTile(b, x * TILE, y * TILE, ((x * 73856093) ^ (y * 19349663)) + 7777);
    }
  }
  // patches de terre brulee
  b.fillStyle = "#8a4a2e";
  for (let i = 0; i < 8; i++) {
    const sx = (i * 91 + 41) % SCREEN_W;
    const sy = (i * 47 + 21) % SCREEN_H;
    b.beginPath(); b.ellipse(sx, sy, 26, 18, 0, 0, Math.PI * 2); b.fill();
  }
  b.fillStyle = "#5a2e1b";
  for (let i = 0; i < 14; i++) {
    const sx = (i * 73 + 11) % SCREEN_W;
    const sy = (i * 53 + 31) % SCREEN_H;
    b.fillRect(sx, sy, 2, 2);
  }
  // rochers
  for (const tt of cap.terrain) {
    b.fillStyle = "rgba(0,0,0,0.18)";
    b.beginPath(); b.ellipse(tt.x + 1, tt.y + 4, tt.rx * 0.6, tt.ry * 0.3, 0, 0, Math.PI * 2); b.fill();
    b.fillStyle = "#7e6a4d";
    b.beginPath(); b.arc(tt.x, tt.y, tt.rx * 0.45, 0, Math.PI * 2); b.fill();
    b.fillStyle = "#a89377";
    b.beginPath(); b.arc(tt.x - 2, tt.y - 2, tt.rx * 0.35, 0, Math.PI * 2); b.fill();
  }
}

/* ---------- CAPTURE ---------- */
function beginMission(index) {
  const m = MISSIONS[index];
  if (!m) return;
  startDialogue(m.intro, () => {
    // iris ferme depuis le hub, ouvre sur l'arene
    const p = Game.hub && Game.hub.player;
    startTransition(() => setupCapture(m, index), {
      cx: p ? p.x : SCREEN_W / 2,
      cy: p ? p.y : SCREEN_H / 2,
      closeDur: 0.5, openDur: 0.5
    });
  });
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
    fires: [], firesLeft: 0, fireDamageT: 0,
    line: { active: false, points: [], cooldown: 0, flashRed: 0, flashGreen: 0, pointerId: null },
    ranger: { x: SCREEN_W / 2, y: SCREEN_H / 2, dir: "down", anim: 0, energy: 100, styler: 100, invuln: 0, pulseCd: 0, pulseWave: 0 }
  };
  // decor varie selon mission
  const decorPalette = mission.id === "m2"
    ? ["#3a78b855", "#5fb1c455"]
    : mission.id === "m3"
      ? ["#7a4a2855", "#a85a3455"]
      : ["#3e7e3a66", "#5fa86577"];
  for (let i = 0; i < 26; i++) {
    cap.terrain.push({
      x: rand(0, SCREEN_W), y: rand(0, SCREEN_H),
      rx: rand(8, 22), ry: rand(6, 16), rot: rand(0, Math.PI),
      color: decorPalette[Math.floor(Math.random() * decorPalette.length)]
    });
  }
  // foyers d'incendie
  if (mission.fires) {
    for (let i = 0; i < mission.fires; i++) {
      let fx, fy;
      for (let tries = 0; tries < 10; tries++) {
        fx = rand(80, SCREEN_W - 80); fy = rand(80, SCREEN_H - 80);
        if (dist(fx, fy, SCREEN_W / 2, SCREEN_H / 2) > 90) break;
      }
      cap.fires.push({ x: fx, y: fy, alive: true, anim: rand(0, 6), radius: 22 });
    }
    cap.firesLeft = mission.fires;
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
  SFX.hurt();
  spawnParticles(cap.ranger.x, cap.ranger.y, "#ff8a6b", 8);
  logEvent(msg + " (-" + amount + ")", "warn");
  if (cap.ranger.energy <= 0) endMission(false);
}
function captureCreature(c, source) {
  if (c.captured) return;
  c.captured = true; c.capturedT = 0;
  Game.capture.captured += 1;
  Game.bondsTotal += 1;
  const isNew = !albumKnows(c.species.id);
  rememberLumina(c.species.id);
  const suffix = source === "pulse" ? " (onde)" : "";
  if (isNew) {
    logEvent("Nouveau lien : " + c.species.name + " (Album)", "good");
    Game.coins += 30; // bonus decouverte
    logEvent("+30 Lumes (decouverte)", "good");
  } else {
    logEvent(c.species.name + " apaisee, repart libre" + suffix, "good");
    Game.coins += 8;
  }
  spawnParticles(c.x, c.y, c.species.accent, 14);
  Game.capture.line.flashGreen = 0.3;
  SFX.befriend();
  saveGame();
  if (Game.capture.captured >= Game.capture.mission.target) {
    if (Game.capture.mission.fires && Game.capture.firesLeft > 0) {
      logEvent("Eteins encore les foyers !", "warn");
    } else endMission(true);
  }
}
function triggerPulse() {
  const cap = Game.capture;
  if (cap.ranger.pulseCd > 0) return;
  cap.ranger.pulseCd = 9;
  cap.ranger.pulseWave = 1;
  SFX.pulse();
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
  // Don de terrain Fjordle: si Fjordle dans l'Album, l'onde eteint aussi un foyer proche
  if (albumKnows("fjordle") && cap.fires) {
    for (const f of cap.fires) {
      if (!f.alive) continue;
      if (dist(f.x, f.y, cap.ranger.x, cap.ranger.y) < 140) {
        f.alive = false; cap.firesLeft--;
        spawnParticles(f.x, f.y, "#9bdce0", 18);
        spawnParticles(f.x, f.y, "#ffffff", 8);
        logEvent("Foyer eteint (Ondee de Fjordle)", "good");
        SFX.fireOut();
        if (cap.firesLeft === 0 && cap.captured >= cap.mission.target) endMission(true);
        break;
      }
    }
  }
  logEvent("Onde Lumina diffusee" + (touched ? " (" + touched + " creature[s])" : ""));
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
    SFX.loopHit();
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

  // foyers
  if (cap.fires.length) {
    cap.fireDamageT -= dt;
    for (const f of cap.fires) {
      if (!f.alive) continue;
      f.anim += dt;
      if (dist(f.x, f.y, cap.ranger.x, cap.ranger.y) < f.radius + 6 && cap.fireDamageT <= 0) {
        applyDamage(4, "Tu te brules au foyer");
        cap.fireDamageT = 0.8;
      }
    }
  }

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
    SFX.loopStart();
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
  t.fillText("PACTES NOUES", 348, 116);
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
  if (cap.fires.length) {
    t.fillStyle = "#ff8a6b"; t.font = "10px 'Press Start 2P', monospace";
    t.fillText("FOYERS", 494, 172);
    t.fillStyle = cap.firesLeft === 0 ? "#79e3c4" : "#ffd866";
    t.font = "20px 'Press Start 2P', monospace";
    t.fillText(cap.firesLeft + "/" + cap.fires.length, 494, 194);
  } else {
    t.fillStyle = "#9bdce0"; t.font = "10px 'Press Start 2P', monospace";
    t.fillText("ONDE  (B)", 494, 172);
    t.fillStyle = cap.ranger.pulseCd > 0 ? "#6b7892" : "#79e3c4";
    t.font = "16px 'Press Start 2P', monospace";
    t.fillText(cap.ranger.pulseCd > 0 ? Math.ceil(cap.ranger.pulseCd) + "s" : "PRET", 494, 192);
  }

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

  // sol tile-based selon mission (style DS top-down)
  if (cap.mission.id === "m2") {
    drawArenaSandBeach(b, cap);
  } else if (cap.mission.id === "m3") {
    drawArenaCindersField(b, cap);
  } else {
    drawArenaGrassField(b, cap);
  }

  // vignette / spotlight doux centre sur le ranger
  const vg = b.createRadialGradient(cap.ranger.x, cap.ranger.y, 60, cap.ranger.x, cap.ranger.y, 320);
  vg.addColorStop(0, "rgba(255,255,255,0.10)");
  vg.addColorStop(0.5, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.35)");
  b.fillStyle = vg; b.fillRect(0, 0, SCREEN_W, SCREEN_H);

  // foyers d'incendie
  for (const f of cap.fires) {
    if (!f.alive) continue;
    // halo
    const grad = b.createRadialGradient(f.x, f.y, 4, f.x, f.y, f.radius + 12);
    grad.addColorStop(0, "#ffd866cc"); grad.addColorStop(0.6, "#ff7a3940"); grad.addColorStop(1, "#ff3a3a00");
    b.fillStyle = grad;
    b.beginPath(); b.arc(f.x, f.y, f.radius + 14, 0, Math.PI * 2); b.fill();
    // braises au sol
    b.fillStyle = "#5a1a14";
    b.beginPath(); b.ellipse(f.x, f.y + 8, f.radius * 0.9, 5, 0, 0, Math.PI * 2); b.fill();
    // flammes
    const flick = Math.sin(f.anim * 8) * 2;
    b.fillStyle = "#ff8a3a";
    b.beginPath(); b.moveTo(f.x - 10, f.y + 6);
    b.quadraticCurveTo(f.x - 14 + flick, f.y - 10, f.x, f.y - 22 + flick * 0.6);
    b.quadraticCurveTo(f.x + 14 - flick, f.y - 10, f.x + 10, f.y + 6);
    b.closePath(); b.fill();
    b.fillStyle = "#ffd866";
    b.beginPath(); b.moveTo(f.x - 5, f.y + 4);
    b.quadraticCurveTo(f.x - 7 + flick, f.y - 6, f.x, f.y - 16);
    b.quadraticCurveTo(f.x + 7 - flick, f.y - 6, f.x + 5, f.y + 4);
    b.closePath(); b.fill();
    b.fillStyle = "#fff5b8";
    b.beginPath(); b.arc(f.x, f.y - 6, 2, 0, Math.PI * 2); b.fill();
  }

  b.strokeStyle = "#ffd86640"; b.lineWidth = 2;
  b.strokeRect(2, 2, SCREEN_W - 4, SCREEN_H - 4);

  // Y-sort: joueur + creatures tries par y des pieds
  const drawables = [];
  drawables.push({
    yFoot: cap.ranger.y + 14, kind: "player"
  });
  for (const c of cap.creatures) {
    drawables.push({ yFoot: c.y + c.species.radius * 0.9, kind: "creature", c });
  }
  drawables.sort((a, b1) => a.yFoot - b1.yFoot);
  for (const d of drawables) {
    if (d.kind === "player") {
      drawHuman(b, "player", cap.ranger.x, cap.ranger.y, cap.ranger.dir, cap.ranger.anim);
    } else {
      const c = d.c;
      drawCreature(b, c.species, c.x, c.y, c.captured ? c.capturedT : c.anim, c.hitFlash, c.dashT > 0, c.captured);
      if (!c.captured) {
        const w = 28;
        const ratio = clamp(c.temper / c.maxTemper, 0, 1);
        b.fillStyle = "#000a"; b.fillRect(c.x - w / 2, c.y - c.species.radius - 12, w, 4);
        b.fillStyle = ratio > 0.5 ? "#79e3c4" : "#ffd866";
        b.fillRect(c.x - w / 2, c.y - c.species.radius - 12, w * ratio, 4);
      }
    }
  }

  if (cap.ranger.pulseWave > 0) {
    const ww = 1 - cap.ranger.pulseWave;
    b.strokeStyle = "rgba(142,245,211," + (0.5 * cap.ranger.pulseWave).toFixed(2) + ")";
    b.lineWidth = 3;
    b.beginPath(); b.arc(cap.ranger.x, cap.ranger.y, 30 + ww * 130, 0, Math.PI * 2); b.stroke();
  }

  if (cap.line.points.length > 1) {
    const pts = cap.line.points;
    b.lineCap = "round"; b.lineJoin = "round";
    // halo exterieur
    b.shadowColor = "#9ee8ff"; b.shadowBlur = 12;
    b.strokeStyle = "rgba(120,200,255,0.55)"; b.lineWidth = 9;
    b.beginPath(); b.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) b.lineTo(pts[i].x, pts[i].y);
    b.stroke();
    // contour bleu vif
    b.shadowBlur = 8;
    b.strokeStyle = "#5ab8ff"; b.lineWidth = 5;
    b.beginPath(); b.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) b.lineTo(pts[i].x, pts[i].y);
    b.stroke();
    // coeur blanc
    b.shadowBlur = 0;
    b.strokeStyle = "#ffffff"; b.lineWidth = 2;
    b.beginPath(); b.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) b.lineTo(pts[i].x, pts[i].y);
    b.stroke();
    // bille jaune au point de depart
    const head = pts[0];
    const pulseR = 5 + Math.sin(Game.t * 10) * 1.2;
    b.shadowColor = "#ffd866"; b.shadowBlur = 8;
    b.fillStyle = "#ffd866";
    b.beginPath(); b.arc(head.x, head.y, pulseR, 0, Math.PI * 2); b.fill();
    b.fillStyle = "#fff5b8";
    b.beginPath(); b.arc(head.x - 1, head.y - 1, pulseR * 0.4, 0, Math.PI * 2); b.fill();
    b.shadowBlur = 0;
    // tete actuelle (la pointe)
    const tip = pts[pts.length - 1];
    b.fillStyle = "#ffffff";
    b.beginPath(); b.arc(tip.x, tip.y, 3, 0, Math.PI * 2); b.fill();
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
  if (cap.ending) return;
  cap.ending = true;
  let reward = 0;
  if (success) {
    reward = 80 + cap.captured * 12;
    if (cap.mission.fires) reward += 40; // bonus pompier
    Game.coins += reward;
    saveGame();
  }
  const data = {
    success, captured: cap.captured, target: cap.mission.target,
    energy: cap.ranger.energy, mission: cap.mission, index: cap.index,
    reward
  };
  if (success) SFX.success(); else SFX.fail();
  startTransition(() => {
    Game.missionResult = data;
    switchState("results");
  }, { cx: cap.ranger.x, cy: cap.ranger.y, closeDur: 0.55, openDur: 0.45 });
}
function updateResults(dt) {
  Game.t += dt;
  if (Input.aPressed) {
    const r = Game.missionResult;
    const after = () => {
      if (r.success && Game.flags.missionUnlocked === r.index) {
        Game.flags.missionUnlocked++;
        saveGame();
      }
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
  t.fillText("Pactes noues :  " + r.captured + " / " + r.target, 130, 184);
  t.fillText("Energie       :  " + Math.round(r.energy) + "%", 130, 208);
  t.fillText("Album Lumina  :  " + Game.album.size + " / " + Object.keys(SPECIES).length, 130, 232);
  if (r.success && r.reward) {
    t.fillStyle = "#ffd866";
    t.fillText("+ " + r.reward + " Lumes", 130, 260);
  }

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
  if (Game.transition) {
    updateTransition(dt);
    return; // freeze states pendant la transition iris
  }
  switch (Game.state) {
    case "title": updateTitle(dt); break;
    case "hub": updateHub(dt); break;
    case "album": updateAlbum(dt); break;
    case "dialogue": updateDialogue(dt); break;
    case "capture": updateCapture(dt); break;
    case "results": updateResults(dt); break;
    case "pickLumina": updatePickLumina(dt); break;
    case "summon": updateSummon(dt); break;
    case "sanctuary": updateSanctuary(dt); break;
    case "shop": updateShop(dt); break;
    case "house": updateHouse(dt); break;
  }
  // animation +X Lumes
  if (Game.coinFloat) {
    Game.coinFloat.t += dt;
    if (Game.coinFloat.t > 1.6) Game.coinFloat = null;
  }
}
function draw() {
  switch (Game.state) {
    case "title": drawTitle(); break;
    case "hub": drawHub(); break;
    case "album": drawAlbum(); break;
    case "dialogue": drawDialogue(); break;
    case "capture": drawCapture(); break;
    case "results": drawResults(); break;
    case "pickLumina": drawPickLumina(); break;
    case "summon": drawSummon(); break;
    case "sanctuary": drawSanctuary(); break;
    case "shop": drawShop(); break;
    case "house": drawHouse(); break;
  }
  drawCoinFloat();
  drawTransitionOverlay();
}

function drawCoinFloat() {
  const cf = Game.coinFloat; if (!cf) return;
  const k = clamp(cf.t / 1.6, 0, 1);
  const alpha = 1 - k;
  const yOff = k * 30;
  for (const ctx of [topCtx, botCtx]) {
    ctx.save(); ctx.textAlign = "right"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "rgba(255,216,102," + alpha.toFixed(2) + ")";
    ctx.font = "12px 'Press Start 2P', monospace";
    ctx.fillText("+ " + cf.amount + " L", SCREEN_W - 24, 100 - yOff);
    if (cf.reason) {
      ctx.fillStyle = "rgba(207,234,255," + (alpha * 0.8).toFixed(2) + ")";
      ctx.font = "10px 'VT323', monospace";
      ctx.fillText(cf.reason, SCREEN_W - 24, 116 - yOff);
    }
    ctx.restore();
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

// Boot: charge la sauvegarde et les options si elles existent
loadGame();
loadOptions();
requestAnimationFrame(frame);

