"use strict";

const STORM_BELT_SPEED = 65;
const TOUCH_AIM_MAX_TURN_TIME = 0.2;
const byId = (id) => document.getElementById(id);
const ui = {
  canvas: byId("game-canvas"),
  shell: byId("game-shell"),
  hud: byId("hud"),
  buffBar: byId("buff-bar"),
  powerupToast: byId("powerup-toast"),
  minimapCanvas: byId("minimap-canvas"),
  hpText: byId("hp-text"),
  hpFill: byId("hp-fill"),
  hpMeter: document.querySelector(".hp-meter"),
  waveLabel: byId("wave-label"),
  waveDetail: byId("wave-detail"),
  waveFill: byId("wave-fill"),
  score: byId("score-value"),
  level: byId("level-label"),
  xpText: byId("xp-text"),
  xpFill: byId("xp-fill"),
  bossHud: byId("boss-hud"),
  bossHp: byId("boss-hp-text"),
  bossFill: byId("boss-fill"),
  combo: byId("combo"),
  comboValue: byId("combo-value"),
  comboMultiplier: byId("combo-multiplier"),
  announcement: byId("announcement"),
  announcementTitle: byId("announcement-title"),
  announcementSubtitle: byId("announcement-subtitle"),
  dashState: byId("dash-state"),
  dashFill: byId("dash-fill"),
  menu: byId("menu-overlay"),
  upgrade: byId("upgrade-overlay"),
  upgradeCards: byId("upgrade-cards"),
  pause: byId("pause-overlay"),
  result: byId("result-overlay"),
  resultEyebrow: byId("result-eyebrow"),
  resultTitle: byId("result-title"),
  resultSubtitle: byId("result-subtitle"),
  resultScore: byId("result-score"),
  resultKills: byId("result-kills"),
  resultTime: byId("result-time"),
  resultLevel: byId("result-level"),
  newBest: byId("new-best"),
  menuBest: byId("menu-best-score"),
  menuMapName: byId("menu-map-name"),
  minimapName: byId("minimap-name"),
  mapOverlay: byId("map-overlay"),
  mapCards: byId("map-cards"),
  mapStartButton: byId("map-start-btn"),
  mapBackButton: byId("map-back-btn"),
  startButton: byId("start-btn"),
  restartButton: byId("restart-btn"),
  menuButton: byId("menu-btn"),
  homeButton: byId("home-btn"),
  resumeButton: byId("resume-btn"),
  pauseMenuButton: byId("pause-menu-btn"),
  pauseButton: byId("pause-btn"),
  settingsButton: byId("settings-btn"),
  settings: byId("settings-overlay"),
  settingsSoundToggle: byId("settings-sound-toggle"),
  settingsAutoFireToggle: byId("settings-auto-fire-toggle"),
  settingsLangToggle: byId("settings-lang-toggle"),
  settingsCloseButton: byId("settings-close-btn"),
  helpButton: byId("help-btn"),
  help: byId("help-overlay"),
  helpCloseButton: byId("help-close-btn"),
  helpBackButton: byId("help-back-btn"),
  touchControls: byId("touch-controls"),
  mobileDash: byId("mobile-dash"),
  mobileDashTime: byId("mobile-dash-time"),
  liveStatus: byId("live-status")
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const random = (min, max) => min + Math.random() * (max - min);
const distanceSquared = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
const formatScore = (value) => Math.round(value).toLocaleString("zh-CN");
const formatTime = (seconds) => {
  const whole = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
};

function polygon(context, sides, radius, rotation = 0) {
  context.beginPath();
  for (let i = 0; i < sides; i += 1) {
    const angle = rotation + i * Math.PI * 2 / sides;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
}

function segmentHitsCircle(x1, y1, x2, y2, cx, cy, radius) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : clamp(((cx - x1) * dx + (cy - y1) * dy) / lengthSquared, 0, 1);
  return (x1 + dx * t - cx) ** 2 + (y1 + dy * t - cy) ** 2 <= radius * radius;
}

function shuffled(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const ENEMY_STATS = {
  chaser: { radius: 13, hp: 32, speed: 74, damage: 12, xp: 1, score: 100, color: "#ff6178" },
  shooter: { radius: 15, hp: 48, speed: 52, damage: 10, xp: 2, score: 170, color: "#ffd166" },
  dasher: { radius: 14, hp: 58, speed: 62, damage: 16, xp: 2, score: 210, color: "#ff9f43" },
  splitter: { radius: 20, hp: 90, speed: 43, damage: 18, xp: 3, score: 280, color: "#65a9ff" },
  mite: { radius: 8, hp: 16, speed: 116, damage: 8, xp: 1, score: 50, color: "#89c7ff" },
  boss: { radius: 46, hp: 1300, speed: 45, damage: 22, xp: 0, score: 5000, color: "#ff6178" }
};

const WORLD_WIDTH = 2400;
const WORLD_HEIGHT = 1600;
const VIEW_LONG_SIDE = 31 * 40;
const FURNACE_WARNING_TIME = 6;
const BUFF_DEFS = {
  shield: { nameKey: "buff.shield", color: "#64fbd2", duration: 6 },
  double: { nameKey: "buff.double", color: "#ffd166", duration: 5 },
  storm: { nameKey: "buff.storm", color: "#ff8a65", duration: 8 },
  engine: { nameKey: "buff.engine", color: "#65a9ff", duration: 6 },
  magnet: { nameKey: "buff.magnet", color: "#ad8cff", duration: 8 },
  slow: { nameKey: "buff.slow", color: "#ff7eb6", duration: 5 }
};
const BUFF_IDS = Object.keys(BUFF_DEFS);
const MAP_DEFS = [
  { id: "harbor", nameKey: "map.harbor.name", descKey: "map.harbor.desc", difficulty: 2, swatch: "#64fbd2", bg: "#080e19", grid: "rgba(106, 151, 174, 0.055)" },
  { id: "dock", nameKey: "map.dock.name", descKey: "map.dock.desc", difficulty: 3, swatch: "#ffd166", bg: "#0b101b", grid: "rgba(160, 151, 110, 0.06)" },
  { id: "furnace", nameKey: "map.furnace.name", descKey: "map.furnace.desc", difficulty: 4, swatch: "#ff8a65", bg: "#160d12", grid: "rgba(190, 110, 90, 0.06)" },
  { id: "gravity", nameKey: "map.gravity.name", descKey: "map.gravity.desc", difficulty: 3, swatch: "#ad8cff", bg: "#0d0a1a", grid: "rgba(150, 120, 200, 0.06)" },
  { id: "storm", nameKey: "map.storm.name", descKey: "map.storm.desc", difficulty: 4, swatch: "#65a9ff", bg: "#08121c", grid: "rgba(100, 160, 200, 0.06)" },
  { id: "matrix", nameKey: "map.matrix.name", descKey: "map.matrix.desc", difficulty: 5, swatch: "#7dff8a", bg: "#07120e", grid: "rgba(100, 220, 140, 0.07)" }
];
const BOSS_ARENA = { id: "core", nameKey: "map.core.name", swatch: "#ffd166", bg: "#100d16", grid: "rgba(200, 170, 100, 0.06)" };

function circleTouchesRect(x, y, radius, rect) {
  const nearestX = clamp(x, rect.x, rect.x + rect.width);
  const nearestY = clamp(y, rect.y, rect.y + rect.height);
  return (x - nearestX) ** 2 + (y - nearestY) ** 2 < radius * radius;
}

function resolveCircleRect(entity, radius, rect) {
  const nearestX = clamp(entity.x, rect.x, rect.x + rect.width);
  const nearestY = clamp(entity.y, rect.y, rect.y + rect.height);
  const dx = entity.x - nearestX;
  const dy = entity.y - nearestY;
  const distance = Math.hypot(dx, dy);
  if (distance >= radius) return false;
  if (distance > 0) {
    const push = radius - distance;
    entity.x += dx / distance * push;
    entity.y += dy / distance * push;
    return true;
  }
  const sides = [
    { distance: Math.abs(entity.x - rect.x), axis: "x", value: rect.x - radius },
    { distance: Math.abs(rect.x + rect.width - entity.x), axis: "x", value: rect.x + rect.width + radius },
    { distance: Math.abs(entity.y - rect.y), axis: "y", value: rect.y - radius },
    { distance: Math.abs(rect.y + rect.height - entity.y), axis: "y", value: rect.y + rect.height + radius }
  ];
  sides.sort((a, b) => a.distance - b.distance);
  entity[sides[0].axis] = sides[0].value;
  return true;
}

class AudioEngine {
  constructor() {
    this.context = null;
    this.enabled = true;
    try {
      this.enabled = localStorage.getItem("star-ring-sound") !== "off";
    } catch {}
  }

  unlock() {
    if (!this.enabled) return;
    if (!this.context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) this.context = new AudioContextClass();
    }
    if (this.context?.state === "suspended") this.context.resume();
  }

  toggle() {
    this.enabled = !this.enabled;
    try {
      localStorage.setItem("star-ring-sound", this.enabled ? "on" : "off");
    } catch {}
    if (this.enabled) {
      this.unlock();
      this.tone(620, 0.08, "sine", 0.025, 880);
    }
  }

  tone(frequency, duration, type = "sine", volume = 0.025, endFrequency = frequency) {
    if (!this.enabled) return;
    this.unlock();
    if (!this.context) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(20, frequency), now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  shoot() { this.tone(360, 0.045, "square", 0.009, 220); }
  pickup() { this.tone(720, 0.065, "sine", 0.018, 1080); }
  dash() { this.tone(180, 0.16, "sawtooth", 0.026, 720); }
  hurt() { this.tone(150, 0.22, "sawtooth", 0.045, 55); }
  hit() { this.tone(210, 0.035, "square", 0.008, 130); }
  explode(size = 1) { this.tone(105 / size, 0.13, "sawtooth", 0.022, 45); }
}

class Input {
  constructor(game) {
    this.game = game;
    this.keys = new Set();
    this.pointer = { x: 0, y: 0, down: false, active: false };
    this.touchPointerId = null;
    this.lastAimAngle = null;
    this.joystick = { x: 0, y: 0, pointerId: null };
    this.touchMode = window.matchMedia("(pointer: coarse)").matches;
    document.body.classList.toggle("touch-mode", this.touchMode);
    this.bindKeyboard();
    this.bindPointer();
    this.bindJoystick();
  }

  bindKeyboard() {
    const blocked = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
    window.addEventListener("keydown", (event) => {
      if ([ui.homeButton, ui.pauseMenuButton].includes(event.target) && ["Enter", "Space"].includes(event.code)) return;
      if (!event.repeat && event.code === "Escape") {
        if (!ui.help.hidden) {
          event.preventDefault();
          this.game.closeHelp();
          return;
        }
        if (!ui.settings.hidden) {
          event.preventDefault();
          this.game.closeSettings();
          return;
        }
      }
      if (!ui.help.hidden || !ui.settings.hidden) return;
      if (this.game.mapSelectOpen) {
        if (!["Enter", "Escape", "KeyP"].includes(event.code)) return;
        event.preventDefault();
        if (event.repeat) return;
        if (event.code === "Enter") this.game.start();
        else if (event.code === "Escape") this.game.closeMapSelect();
        return;
      }
      if (blocked.includes(event.code) && this.game.state !== "menu") event.preventDefault();
      this.keys.add(event.code);
      if (!event.repeat && (event.code === "ShiftLeft" || event.code === "ShiftRight")) this.game.dash();
      if (!event.repeat && (event.code === "Escape" || (event.code === "KeyP" && ui.help.hidden && ui.settings.hidden))) this.game.togglePause();
      if (!event.repeat && event.code === "Enter" && ["menu", "gameover", "victory"].includes(this.game.state)) {
        event.preventDefault();
        if (this.game.state === "menu") this.game.openMapSelect();
        else this.game.start();
      }
    });
    window.addEventListener("keyup", (event) => this.keys.delete(event.code));
    window.addEventListener("blur", () => {
      this.reset(this.touchMode);
      if (this.game.state === "playing") this.game.pause();
    });
  }

  bindPointer() {
    const update = (event) => {
      const rect = ui.canvas.getBoundingClientRect();
      this.pointer.x = event.clientX - rect.left;
      this.pointer.y = event.clientY - rect.top;
      this.pointer.active = true;
    };
    ui.canvas.addEventListener("pointerdown", (event) => {
      if (this.touchPointerId !== null) return;
      if (event.pointerType !== "mouse") {
        if (this.game.state !== "playing") return;
        event.preventDefault();
        this.touchPointerId = event.pointerId;
        update(event);
        this.pointer.down = true;
        ui.canvas.setPointerCapture(event.pointerId);
        return;
      }
      update(event);
      if (event.button === 0) {
        this.pointer.down = true;
        ui.canvas.setPointerCapture(event.pointerId);
      }
      if (event.button === 2) this.game.dash();
    });
    document.addEventListener("pointermove", (event) => {
      if (event.pointerId === this.touchPointerId || (event.pointerType === "mouse" && this.touchPointerId === null)) update(event);
    });
    document.addEventListener("mouseout", (event) => {
      if (!event.relatedTarget && !this.pointer.down) this.pointer.active = false;
    });
    const end = (event) => {
      if (event.pointerId === this.touchPointerId) this.resetFire();
      else if (event.pointerType === "mouse" && this.touchPointerId === null && event.button === 0) this.pointer.down = false;
    };
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    ui.canvas.addEventListener("lostpointercapture", end);
    ui.canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  }

  bindJoystick() {
    const element = byId("joystick");
    const knob = byId("joystick-knob");
    const move = (event) => {
      if (event.pointerId !== this.joystick.pointerId) return;
      const rect = element.getBoundingClientRect();
      let dx = event.clientX - (rect.left + rect.width / 2);
      let dy = event.clientY - (rect.top + rect.height / 2);
      const max = rect.width * 0.32;
      const length = Math.hypot(dx, dy);
      if (length > max) {
        dx = dx / length * max;
        dy = dy / length * max;
      }
      this.joystick.x = dx / max;
      this.joystick.y = dy / max;
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    const end = (event) => {
      if (event.pointerId !== this.joystick.pointerId) return;
      this.joystick.pointerId = null;
      this.joystick.x = 0;
      this.joystick.y = 0;
      knob.style.transform = "translate(0, 0)";
    };
    element.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      this.joystick.pointerId = event.pointerId;
      element.setPointerCapture(event.pointerId);
      move(event);
    });
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerup", end);
    element.addEventListener("pointercancel", end);
    ui.mobileDash.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      this.game.dash();
    });
  }

  movement() {
    let x = this.joystick.x;
    let y = this.joystick.y;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) x -= 1;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) x += 1;
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) y -= 1;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) y += 1;
    const length = Math.hypot(x, y);
    if (length > 1) return { x: x / length, y: y / length };
    return { x, y };
  }

  resetFire() {
    this.pointer.down = false;
    if (this.touchPointerId !== null) {
      const pointerId = this.touchPointerId;
      this.touchPointerId = null;
      this.pointer.active = false;
      if (ui.canvas.hasPointerCapture(pointerId)) ui.canvas.releasePointerCapture(pointerId);
    }
  }

  reset(preserveAim = false) {
    this.keys.clear();
    this.resetFire();
    if (!preserveAim) this.lastAimAngle = null;
    this.joystick.x = 0;
    this.joystick.y = 0;
    this.joystick.pointerId = null;
    byId("joystick-knob").style.transform = "translate(0, 0)";
  }
}

class Game {
  constructor() {
    this.canvas = ui.canvas;
    this.context = this.canvas.getContext("2d");
    this.state = "menu";
    this.player = null;
    this.world = { width: WORLD_WIDTH, height: WORLD_HEIGHT };
    this.camera = { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 };
    this.cameraAimX = 0;
    this.cameraAimY = 0;
    this.enemies = [];
    this.bullets = [];
    this.enemyBullets = [];
    this.pickups = [];
    this.powerups = [];
    this.obstacles = [];
    this.powerupPoints = [];
    this.particles = [];
    this.rings = [];
    this.minimapContext = ui.minimapCanvas.getContext("2d");
    this.buffElements = Object.fromEntries(BUFF_IDS.map((id) => [id, ui.buffBar.querySelector(`[data-buff="${id}"]`)]));
    this.highScore = 0;
    try {
      this.highScore = Number(localStorage.getItem("star-ring-high-score")) || 0;
    } catch {}
    this.autoFire = false;
    try {
      this.autoFire = localStorage.getItem("star-ring-auto-fire") === "on";
    } catch {}
    this.selectedMapId = "harbor";
    this.badges = [];
    try {
      const savedMap = localStorage.getItem("star-ring-map");
      if (MAP_DEFS.some((map) => map.id === savedMap)) this.selectedMapId = savedMap;
      this.badges = JSON.parse(localStorage.getItem("star-ring-badges") || "[]");
      if (!Array.isArray(this.badges)) this.badges = [];
    } catch {}
    this.map = MAP_DEFS.find((map) => map.id === this.selectedMapId);
    this.inBossArena = false;
    this.mapSelectOpen = false;
    this.nextId = 1;
    this.width = 1;
    this.height = 1;
    this.dpr = 1;
    this.backgroundTime = 0;
    this.lastTime = performance.now();
    this.shake = 0;
    this.stars = Array.from({ length: 90 }, () => ({
      x: Math.random(), y: Math.random(), size: random(0.5, 1.6), phase: random(0, Math.PI * 2)
    }));
    this.audio = new AudioEngine();
    this.input = new Input(this);
    this.bindInterface();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.canvas);
    this.resize();
    this.updateSoundControl();
    this.updateAutoFireControl();
    this.updateLangControl();
    ui.menuBest.textContent = formatScore(this.highScore);
    ui.menuMapName.textContent = I18N.t(this.map.nameKey);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.state === "playing") this.pause();
    });
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  bindInterface() {
    ui.startButton.addEventListener("click", () => this.openMapSelect());
    ui.mapStartButton.addEventListener("click", () => this.start());
    ui.mapBackButton.addEventListener("click", () => this.closeMapSelect());
    ui.restartButton.addEventListener("click", () => this.start());
    ui.pauseMenuButton.addEventListener("click", () => this.goToMenu());
    ui.resumeButton.addEventListener("click", () => this.resume());
    ui.menuButton.addEventListener("click", () => this.goToMenu());
    ui.homeButton.addEventListener("click", () => this.goToMenu());
    ui.pauseButton.addEventListener("click", () => this.togglePause());
    ui.settingsButton.addEventListener("click", () => this.openSettings());
    ui.settingsSoundToggle.addEventListener("click", () => {
      this.audio.toggle();
      this.updateSoundControl();
    });
    ui.settingsAutoFireToggle.addEventListener("click", () => {
      this.autoFire = !this.autoFire;
      try {
        localStorage.setItem("star-ring-auto-fire", this.autoFire ? "on" : "off");
      } catch {}
      this.updateAutoFireControl();
    });
    ui.settingsLangToggle.addEventListener("click", () => {
      I18N.setLang(I18N.lang === "zh" ? "en" : "zh");
      this.onLanguageChanged();
    });
    ui.settingsCloseButton.addEventListener("click", () => this.closeSettings());
    ui.settings.addEventListener("click", (event) => {
      if (event.target === ui.settings) this.closeSettings();
    });
    ui.helpButton.addEventListener("click", () => this.openHelp());
    ui.helpCloseButton.addEventListener("click", () => this.closeHelp());
    ui.helpBackButton.addEventListener("click", () => this.closeHelp());
  }

  updateSoundControl() {
    ui.settingsSoundToggle.setAttribute("aria-checked", String(this.audio.enabled));
    ui.settingsSoundToggle.querySelector("span").textContent = this.audio.enabled ? I18N.t("hud.on") : I18N.t("hud.off");
  }

  updateAutoFireControl() {
    ui.settingsAutoFireToggle.setAttribute("aria-checked", String(this.autoFire));
    ui.settingsAutoFireToggle.querySelector("span").textContent = this.autoFire ? I18N.t("hud.on") : I18N.t("hud.off");
  }

  updateLangControl() {
    const isEn = I18N.lang === "en";
    ui.settingsLangToggle.setAttribute("aria-checked", String(isEn));
    ui.settingsLangToggle.querySelector("span").textContent = isEn ? "EN" : "中文";
  }

  onLanguageChanged() {
    this.updateSoundControl();
    this.updateAutoFireControl();
    this.updateLangControl();
    if (this.state === "playing") ui.pauseButton.textContent = I18N.t("hud.pause");
    else if (this.state === "paused") ui.pauseButton.textContent = I18N.t("hud.resume");
    if (this.map) {
      ui.minimapName.textContent = I18N.t(this.map.nameKey);
      ui.menuMapName.textContent = I18N.t(this.map.nameKey);
    }
    if (this.mapSelectOpen) this.renderMapCards();
    if (this.state === "upgrade") this.renderUpgradeCards();
    if (this.state === "victory" || this.state === "gameover") this.applyResultPanel();
    if (this.announcement && !ui.announcement.hidden) this.applyAnnouncement();
    this.updateHUD();
  }

  openSettings() {
    if (!ui.settings.hidden || !ui.help.hidden) return;
    this.settingsReturnState = this.state;
    if (this.state === "playing") this.pause();
    ui.pause.hidden = true;
    ui.settings.hidden = false;
  }

  closeSettings() {
    ui.settings.hidden = true;
    if (this.settingsReturnState === "playing" && this.state === "paused") this.resume();
    else if (this.settingsReturnState === "paused") ui.pause.hidden = false;
  }

  openHelp() {
    ui.settings.hidden = true;
    ui.help.hidden = false;
  }

  closeHelp() {
    ui.help.hidden = true;
    ui.settings.hidden = false;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    this.zoom = Math.max(this.width, this.height) / VIEW_LONG_SIDE;
    this.viewWidth = this.width / this.zoom;
    this.viewHeight = this.height / this.zoom;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.clampCamera();
  }

  clampCamera() {
    const halfWidth = Math.min(this.viewWidth / 2, this.world.width / 2);
    const halfHeight = Math.min(this.viewHeight / 2, this.world.height / 2);
    this.camera.x = this.viewWidth >= this.world.width ? this.world.width / 2 : clamp(this.camera.x, halfWidth, this.world.width - halfWidth);
    this.camera.y = this.viewHeight >= this.world.height ? this.world.height / 2 : clamp(this.camera.y, halfHeight, this.world.height - halfHeight);
  }

  screenToWorld(x, y) {
    return { x: (x - this.width / 2) / this.zoom + this.camera.x, y: (y - this.height / 2) / this.zoom + this.camera.y };
  }

  worldToScreen(x, y) {
    return { x: (x - this.camera.x) * this.zoom + this.width / 2, y: (y - this.camera.y) * this.zoom + this.height / 2 };
  }

  updateCamera(dt) {
    const lookAhead = this.input.pointer.active || this.input.touchMode ? 50 : 0;
    const aimX = Math.cos(this.player.facing) * lookAhead;
    const aimY = Math.sin(this.player.facing) * lookAhead;
    const aimBlend = 1 - Math.exp(-6 * dt);
    this.cameraAimX += (aimX - this.cameraAimX) * aimBlend;
    this.cameraAimY += (aimY - this.cameraAimY) * aimBlend;
    const targetX = this.player.x + this.cameraAimX;
    const targetY = this.player.y + this.cameraAimY;
    const blend = 1 - Math.exp(-8 * dt);
    this.camera.x += (targetX - this.camera.x) * blend;
    this.camera.y += (targetY - this.camera.y) * blend;
    this.clampCamera();
  }

  orbiterPosition(orbiter) {
    const angle = orbiter.offset + this.mapTime * orbiter.speed;
    return {
      x: this.world.width / 2 + Math.cos(angle) * orbiter.orbit,
      y: this.world.height / 2 + Math.sin(angle) * orbiter.orbit
    };
  }

  circleTouchesOrbiter(x, y, radius, orbiter) {
    const position = this.orbiterPosition(orbiter);
    const minimumDistance = radius + orbiter.radius;
    return (x - position.x) ** 2 + (y - position.y) ** 2 < minimumDistance ** 2;
  }

  resolveOrbiter(entity, radius, orbiter) {
    const position = this.orbiterPosition(orbiter);
    const dx = entity.x - position.x;
    const dy = entity.y - position.y;
    const distance = Math.hypot(dx, dy);
    const minimumDistance = radius + orbiter.radius;
    if (distance >= minimumDistance) return false;
    const angle = distance > 0 ? Math.atan2(dy, dx) : orbiter.offset + this.mapTime * orbiter.speed;
    entity.x = position.x + Math.cos(angle) * minimumDistance;
    entity.y = position.y + Math.sin(angle) * minimumDistance;
    return true;
  }

  resolveObstacles(entity, radius) {
    let collided = false;
    for (const obstacle of this.obstacles) {
      if (resolveCircleRect(entity, radius, obstacle)) collided = true;
    }
    for (const orbiter of this.orbiters) {
      if (this.resolveOrbiter(entity, radius, orbiter)) collided = true;
    }
    return collided;
  }

  isOnSafePlatform(entity) {
    return this.safePlatforms.some((platform) => entity.x >= platform.x && entity.x <= platform.x + platform.width && entity.y >= platform.y && entity.y <= platform.y + platform.height);
  }

  applyGravity(entity, dt, projectile = false, projectilePull = 820) {
    if (this.map.id !== "gravity") return;
    for (const well of this.wells) {
      const dx = well.x - entity.x;
      const dy = well.y - entity.y;
      const distance = Math.max(12, Math.hypot(dx, dy));
      if (distance >= 285) continue;
      const pull = 1 - distance / 285;
      if (projectile) {
        entity.vx += dx / distance * projectilePull * pull * dt;
        entity.vy += dy / distance * projectilePull * pull * dt;
      } else {
        const maxPull = entity === this.player ? 125 : entity.speed * (this.player.buffs.slow > 0 ? 0.5 : 1) * 0.25;
        const strength = Math.min(125 * pull, maxPull);
        entity.x += dx / distance * strength * dt;
        entity.y += dy / distance * strength * dt;
      }
    }
  }

  gravityWalkClear(from, to, clearance) {
    return this.portals.every((portal, index) => {
      if (from.kind === "exit" && from.portalIndex === index) return true;
      if (to.kind === "entry" && to.portalIndex === index) return true;
      if (from.kind === "start" && distanceSquared(from, portal) < clearance ** 2) {
        return (to.x - from.x) * (from.x - portal.x) + (to.y - from.y) * (from.y - portal.y) >= 0;
      }
      return !segmentHitsCircle(from.x, from.y, to.x, to.y, portal.x, portal.y, to.kind === "goal" ? clearance - 6 : clearance);
    });
  }

  getGravityNavigation(radius) {
    if (this.gravityNavigation.has(radius)) return this.gravityNavigation.get(radius);
    const clearance = radius + 34;
    const ringRadius = clearance / Math.cos(Math.PI / 12) + 1;
    const nodes = [];
    const exits = [];
    for (let i = 0; i < this.portals.length; i += 1) {
      const portal = this.portals[i];
      for (let side = 0; side < 12; side += 1) {
        const angle = side * Math.PI / 6;
        nodes.push({ x: portal.x + Math.cos(angle) * ringRadius, y: portal.y + Math.sin(angle) * ringRadius, kind: "walk" });
      }
      nodes.push({ x: portal.x, y: portal.y, kind: "entry", portalIndex: i });
      exits[i] = nodes.length;
      nodes.push({ x: portal.x, y: portal.y, kind: "exit", portalIndex: i });
    }
    const edges = nodes.map(() => []);
    for (let i = 0; i < nodes.length; i += 1) {
      const from = nodes[i];
      if (from.kind === "entry") {
        edges[i].push({ to: exits[this.portals[from.portalIndex].target], cost: 0 });
        continue;
      }
      for (let j = 0; j < nodes.length; j += 1) {
        const to = nodes[j];
        if (i === j || to.kind === "exit") continue;
        if (from.kind === "exit" && to.kind === "entry" && from.portalIndex === to.portalIndex) continue;
        if (!this.gravityWalkClear(from, to, clearance)) continue;
        const distance = Math.hypot(to.x - from.x, to.y - from.y);
        edges[i].push({ to: j, cost: Math.max(0, distance - (to.kind === "entry" ? radius + 24 : 0)) });
      }
    }
    const navigation = { nodes, edges, clearance };
    this.gravityNavigation.set(radius, navigation);
    return navigation;
  }

  planEnemyRoute(enemy) {
    const navigation = this.getGravityNavigation(enemy.radius);
    const protectedExit = enemy.portalCooldown > 0 && enemy.portalExitIndex >= 0;
    const goalPoint = { x: this.player.x, y: this.player.y, kind: "goal" };
    for (let i = 0; i < this.portals.length; i += 1) {
      if (protectedExit && enemy.portalExitIndex === i) continue;
      const portal = this.portals[i];
      const dx = goalPoint.x - portal.x;
      const dy = goalPoint.y - portal.y;
      const distance = Math.hypot(dx, dy);
      const approachRadius = enemy.radius + 29;
      if (distance > 0 && distance < approachRadius && approachRadius - distance < enemy.radius + this.player.radius) {
        goalPoint.x = portal.x + dx / distance * approachRadius;
        goalPoint.y = portal.y + dy / distance * approachRadius;
        goalPoint.contact = true;
      }
    }
    const nodes = [...navigation.nodes, { x: enemy.x, y: enemy.y, kind: protectedExit ? "exit" : "start", portalIndex: enemy.portalExitIndex }, goalPoint];
    const start = nodes.length - 2;
    const goal = nodes.length - 1;
    const edges = navigation.edges.map((links) => links.slice());
    edges.push([], []);
    for (let i = 0; i < goal; i += 1) {
      if (nodes[i].kind !== "entry" && this.gravityWalkClear(nodes[i], nodes[goal], navigation.clearance)) {
        edges[i].push({ to: goal, cost: Math.hypot(nodes[goal].x - nodes[i].x, nodes[goal].y - nodes[i].y) });
      }
      if (i === start || nodes[i].kind === "exit" || !this.gravityWalkClear(nodes[start], nodes[i], navigation.clearance)) continue;
      const distance = Math.hypot(nodes[i].x - enemy.x, nodes[i].y - enemy.y);
      edges[start].push({ to: i, cost: Math.max(0, distance - (nodes[i].kind === "entry" ? enemy.radius + 24 : 0)) });
    }
    const statesPerNode = 4;
    const distances = Array(nodes.length * statesPerNode).fill(Infinity);
    const previous = Array(distances.length).fill(-1);
    const visited = Array(distances.length).fill(false);
    distances[start * statesPerNode] = 0;
    let destination = -1;
    for (let step = 0; step < distances.length; step += 1) {
      let current = -1;
      for (let i = 0; i < distances.length; i += 1) {
        if (!visited[i] && (current === -1 || distances[i] < distances[current])) current = i;
      }
      if (current === -1 || distances[current] === Infinity) break;
      const nodeIndex = Math.floor(current / statesPerNode);
      if (nodeIndex === goal) {
        destination = current;
        break;
      }
      visited[current] = true;
      let usedPairs = current % statesPerNode;
      const node = nodes[nodeIndex];
      if (node.kind === "entry") {
        const pair = 1 << Math.min(node.portalIndex, this.portals[node.portalIndex].target);
        if (usedPairs & pair) continue;
        usedPairs |= pair;
      }
      for (const edge of edges[nodeIndex]) {
        const next = edge.to * statesPerNode + usedPairs;
        const distance = distances[current] + edge.cost;
        if (distance >= distances[next]) continue;
        distances[next] = distance;
        previous[next] = current;
      }
    }
    const route = [];
    for (let current = destination; current !== -1 && previous[current] !== -1; current = previous[current]) route.push(nodes[Math.floor(current / statesPerNode)]);
    route.reverse();
    const firstPortal = route.findIndex((point) => point.kind === "entry");
    enemy.navigationPortal = firstPortal === -1 ? -1 : route[firstPortal].portalIndex;
    enemy.navigationWaypoints = firstPortal === -1 ? route : route.slice(0, firstPortal + 1);
    enemy.navigationTarget = { x: this.player.x, y: this.player.y };
    enemy.navigationTimer = 0.35;
  }

  getEnemyPursuitTarget(enemy, dt) {
    if (this.map.id !== "gravity") return this.player;
    enemy.navigationTimer -= dt;
    if (enemy.navigationTimer <= 0 || !enemy.navigationWaypoints.length || distanceSquared(enemy.navigationTarget, this.player) > 80 ** 2) this.planEnemyRoute(enemy);
    while (enemy.navigationWaypoints.length > 1 && distanceSquared(enemy, enemy.navigationWaypoints[0]) < 16) enemy.navigationWaypoints.shift();
    const target = enemy.navigationWaypoints[0];
    return !target || (target.kind === "goal" && !target.contact) ? this.player : target;
  }

  avoidEnemyPortals(enemy) {
    if (this.map.id !== "gravity") return;
    const radius = enemy.radius + 28;
    for (let i = 0; i < this.portals.length; i += 1) {
      if (i === enemy.navigationPortal || (enemy.portalCooldown > 0 && i === enemy.portalExitIndex)) continue;
      const portal = this.portals[i];
      const sx = enemy.prevX - portal.x;
      const sy = enemy.prevY - portal.y;
      const mx = enemy.x - enemy.prevX;
      const my = enemy.y - enemy.prevY;
      const a = mx * mx + my * my;
      const b = sx * mx + sy * my;
      const c = sx * sx + sy * sy - radius * radius;
      const discriminant = b * b - a * c;
      if (c > 0 && a > 0 && b < 0 && discriminant >= 0) {
        const t = (-b - Math.sqrt(discriminant)) / a;
        if (t >= 0 && t <= 1) {
          enemy.x = enemy.prevX + mx * Math.max(0, t - 0.001);
          enemy.y = enemy.prevY + my * Math.max(0, t - 0.001);
        }
      }
      const dx = enemy.x - portal.x;
      const dy = enemy.y - portal.y;
      const distance = Math.hypot(dx, dy);
      if (distance >= radius) continue;
      const angle = distance > 0.001 ? Math.atan2(dy, dx) : Math.atan2(this.player.y - portal.y, this.player.x - portal.x);
      enemy.x = portal.x + Math.cos(angle) * (radius + 0.1);
      enemy.y = portal.y + Math.sin(angle) * (radius + 0.1);
    }
  }

  checkPortals(entity) {
    if (this.map.id !== "gravity") return false;
    const isPlayer = entity === this.player;
    if ((isPlayer ? this.portalCooldown : entity.portalCooldown || 0) > 0) return false;
    for (const portal of this.portals) {
      if (distanceSquared(entity, portal) > (entity.radius + 24) ** 2) continue;
      const target = this.portals[portal.target];
      const oldX = entity.x;
      const oldY = entity.y;
      entity.x = target.x;
      entity.y = target.y;
      if (isPlayer) {
        this.portalCooldown = 3;
        entity.prevX = entity.x;
        entity.prevY = entity.y;
        this.camera.x = entity.x;
        this.camera.y = entity.y;
        this.clampCamera();
        this.audio.tone(260, 0.18, "sine", 0.025, 920);
      } else {
        entity.portalCooldown = 3;
        entity.portalExitIndex = portal.target;
        entity.navigationTimer = 0;
        entity.navigationWaypoints = [];
        entity.navigationPortal = -1;
        entity.prevX = entity.x;
        entity.prevY = entity.y;
      }
      this.spawnRing(oldX, oldY, 12, 48, "#ad8cff", 0.35);
      this.spawnRing(entity.x, entity.y, 12, 48, "#64fbd2", 0.35);
      return true;
    }
    return false;
  }

  createMap() {
    this.obstacles = [];
    this.safePlatforms = [];
    this.orbiters = [];
    this.wells = [];
    this.portals = [];
    this.gravityNavigation = new Map();
    this.belts = [];
    this.vents = [];
    this.gridEvent = null;
    this.wall = null;
    this.laser = null;
    this.mapTime = 0;
    this.ventTimer = 4;
    this.ventIndex = 0;
    this.wallTimer = 6;
    this.gridTimer = 3;
    this.portalCooldown = 0;
    this.hazardDamageTimer = 0.25;
    if (this.inBossArena) {
      this.safePlatforms = [
        { x: 180, y: 180, width: 260, height: 200 },
        { x: 1960, y: 180, width: 260, height: 200 },
        { x: 180, y: 1220, width: 260, height: 200 },
        { x: 1960, y: 1220, width: 260, height: 200 }
      ];
      this.powerupPoints = [{ x: 1200, y: 280 }, { x: 1200, y: 1320 }];
      this.laser = { timer: 18, state: "idle", time: 0, hit: false };
      return;
    }
    if (this.map.id === "harbor") {
      this.obstacles = [
        { x: 470, y: 310, width: 210, height: 48 },
        { x: 470, y: 310, width: 48, height: 190 },
        { x: 1720, y: 310, width: 210, height: 48 },
        { x: 1882, y: 310, width: 48, height: 190 },
        { x: 470, y: 1242, width: 210, height: 48 },
        { x: 470, y: 1100, width: 48, height: 190 },
        { x: 1720, y: 1242, width: 210, height: 48 },
        { x: 1882, y: 1100, width: 48, height: 190 }
      ];
      this.powerupPoints = [{ x: 290, y: 290 }, { x: 2110, y: 1310 }];
    } else if (this.map.id === "dock") {
      this.orbiters = [
        { orbit: 230, radius: 38, speed: 0.34, count: 4 },
        { orbit: 420, radius: 42, speed: 0.26, count: 5 },
        { orbit: 610, radius: 46, speed: 0.19, count: 6 }
      ].flatMap((ring) => Array.from({ length: ring.count }, (_, index) => ({
        orbit: ring.orbit,
        radius: ring.radius,
        speed: ring.speed,
        offset: index * Math.PI * 2 / ring.count
      })));
      this.powerupPoints = [{ x: 290, y: 290 }, { x: 2110, y: 1310 }, { x: 1920, y: 800, orbit: true }];
    } else if (this.map.id === "furnace") {
      this.safePlatforms = [
        { x: 300, y: 280, width: 250, height: 160 },
        { x: 1850, y: 280, width: 250, height: 160 },
        { x: 300, y: 1160, width: 250, height: 160 },
        { x: 1850, y: 1160, width: 250, height: 160 }
      ];
      this.vents = [
        { x: 760, y: 520, radius: 88, state: "idle", time: 0 },
        { x: 1200, y: 420, radius: 88, state: "idle", time: 0 },
        { x: 1640, y: 520, radius: 88, state: "idle", time: 0 },
        { x: 760, y: 1080, radius: 88, state: "idle", time: 0 },
        { x: 1200, y: 1180, radius: 88, state: "idle", time: 0 },
        { x: 1640, y: 1080, radius: 88, state: "idle", time: 0 }
      ];
      this.powerupPoints = [{ x: 1200, y: 260 }, { x: 420, y: 1390 }, { x: 1980, y: 1390 }];
    } else if (this.map.id === "gravity") {
      this.wells = [{ x: 420, y: 320 }, { x: 1980, y: 320 }, { x: 420, y: 1280 }, { x: 1980, y: 1280 }];
      this.powerupPoints = [];
      this.wells.forEach((well, index) => {
        const angle = Math.atan2(this.world.height / 2 - well.y, this.world.width / 2 - well.x);
        this.portals.push({ x: well.x + Math.cos(angle) * 185, y: well.y + Math.sin(angle) * 185, target: 3 - index });
        this.powerupPoints.push({ x: well.x + Math.cos(angle) * 110, y: well.y + Math.sin(angle) * 110 });
      });
    } else if (this.map.id === "storm") {
      this.belts = [
        { x: 360, width: 220, direction: -1 },
        { x: 900, width: 220, direction: 1 },
        { x: 1440, width: 220, direction: -1 },
        { x: 1980, width: 220, direction: 1 }
      ];
      this.powerupPoints = [{ x: 720, y: 800 }, { x: 1680, y: 800 }];
    } else if (this.map.id === "matrix") {
      this.powerupPoints = [];
    }
  }

  enterBossArena() {
    this.inBossArena = true;
    this.map = BOSS_ARENA;
    this.createMap();
    this.player.x = this.world.width / 2;
    this.player.y = this.world.height / 2;
    this.player.prevX = this.player.x;
    this.player.prevY = this.player.y;
    this.player.vx = 0;
    this.player.vy = 0;
    this.camera.x = this.player.x;
    this.camera.y = this.player.y;
    this.cameraAimX = 0;
    this.cameraAimY = 0;
    this.clampCamera();
    this.bullets = [];
    this.enemyBullets = [];
    this.pickups = [];
    this.powerups = [];
    this.powerupSpawnTimer = 8;
    this.powerupPointIndex = 0;
    ui.minimapName.textContent = I18N.t(this.map.nameKey);
    this.spawnRing(this.player.x, this.player.y, 30, 150, "#ffd166", 0.8);
  }

  updateMapHazards(dt) {
    this.mapTime += dt;
    this.portalCooldown = Math.max(0, this.portalCooldown - dt);
    this.hazardDamageTimer -= dt;
    const damageTick = this.hazardDamageTimer <= 0;
    if (damageTick) this.hazardDamageTimer += 0.25;

    if (this.map.id === "dock") {
      for (const point of this.powerupPoints) {
        if (!point.orbit) continue;
        const angle = this.mapTime * 0.35;
        point.x = this.world.width / 2 + Math.cos(angle) * 720;
        point.y = this.world.height / 2 + Math.sin(angle) * 720;
      }
    } else if (this.map.id === "furnace") {
      const vent = this.vents[this.ventIndex];
      if (vent.state === "idle") {
        this.ventTimer -= dt;
        if (this.ventTimer <= 0) {
          vent.state = "warning";
          vent.time = FURNACE_WARNING_TIME;
          this.audio.tone(130, 0.3, "sawtooth", 0.018, 210);
          ui.liveStatus.textContent = I18N.t("hud.ventSoon", { n: this.ventIndex + 1 });
        }
      } else {
        vent.time -= dt;
        if (vent.state === "warning" && vent.time <= 0) {
          vent.state = "active";
          vent.time = 1.2;
          this.spawnRing(vent.x, vent.y, 24, vent.radius + 60, "#ff8a65", 0.4);
          this.burst(vent.x, vent.y, "#ffb07c", 18, 220, 4);
          this.audio.tone(85, 0.4, "sawtooth", 0.025, 42);
          ui.liveStatus.textContent = I18N.t("hud.ventActive", { n: this.ventIndex + 1 });
        } else if (vent.state === "active" && vent.time <= 0) {
          vent.state = "idle";
          vent.time = 0;
          this.ventIndex = (this.ventIndex + 1) % this.vents.length;
          this.ventTimer = 3.8;
        }
      }
      if (damageTick && vent.state === "active") {
        if (!this.isOnSafePlatform(this.player)) this.hurtPlayer(3, { continuous: true });
        if (this.state !== "playing") return;
        for (const enemy of this.enemies) {
          if (!enemy.dead && enemy.spawnIn <= 0 && !this.isOnSafePlatform(enemy)) this.damageEnemy(enemy, 3);
        }
      }
    } else if (this.map.id === "storm") {
      if (!this.wall) {
        this.wallTimer -= dt;
        if (this.wallTimer <= 0) {
          this.wall = { state: "warning", time: 2, x: 30, prevX: 30, hit: false };
          this.audio.tone(190, 0.35, "sine", 0.02, 390);
          ui.liveStatus.textContent = I18N.t("hud.wallSoon");
        }
      } else {
        this.wall.time -= dt;
        if (this.wall.state === "warning" && this.wall.time <= 0) {
          this.wall.state = "active";
          this.wall.time = 3;
          this.wall.x = 30;
          this.wall.prevX = 30;
          const candidates = this.enemies.filter((enemy) => !enemy.dead && enemy.spawnIn <= 0);
          this.wall.enemyTargets = new Set(shuffled(candidates).slice(0, Math.round(candidates.length / 3)).map((enemy) => enemy.id));
          this.audio.tone(420, 0.3, "sawtooth", 0.025, 120);
        } else if (this.wall.state === "active") {
          this.wall.prevX = this.wall.x;
          this.wall.x = 30 + (this.world.width - 60) * (1 - Math.max(0, this.wall.time) / 3);
          const sweptWall = { x: Math.min(this.wall.prevX, this.wall.x) - 9, y: 0, width: Math.abs(this.wall.x - this.wall.prevX) + 18, height: this.world.height };
          if (!this.wall.hit && circleTouchesRect(this.player.x, this.player.y, this.player.radius, sweptWall)) {
            this.wall.hit = true;
            if (this.player.dashTime <= 0 && this.hurtPlayer(25)) {
              this.player.x = clamp(this.player.x + 70, this.player.radius + 16, this.world.width - this.player.radius - 16);
              this.player.vx = Math.max(this.player.vx, 280);
            }
          }
          if (this.state !== "playing") return;
          for (const enemy of this.enemies) {
            if (enemy.dead || enemy.spawnIn > 0 || !this.wall.enemyTargets.has(enemy.id)) continue;
            if (!circleTouchesRect(enemy.x, enemy.y, enemy.radius, sweptWall)) continue;
            this.wall.enemyTargets.delete(enemy.id);
            this.damageEnemy(enemy, 25);
          }
          if (this.wall.time <= 0) {
            this.wall = null;
            this.wallTimer = 3;
          }
        }
      }
    } else if (this.map.id === "matrix") {
      if (!this.gridEvent) {
        this.gridTimer -= dt;
        if (this.gridTimer <= 0) {
          this.gridEvent = { row: Math.floor(random(0, 8)), column: Math.floor(random(0, 12)), state: "warning", time: 1 };
          this.audio.tone(240, 0.24, "square", 0.015, 460);
          ui.liveStatus.textContent = I18N.t("hud.matrixSoon");
        }
      } else {
        this.gridEvent.time -= dt;
        if (this.gridEvent.state === "warning" && this.gridEvent.time <= 0) {
          this.gridEvent.state = "active";
          this.gridEvent.time = 1.5;
          this.audio.tone(520, 0.22, "sawtooth", 0.02, 180);
        } else if (this.gridEvent.state === "active" && this.gridEvent.time <= 0) {
          this.gridEvent = null;
          this.gridTimer = 2.5;
        }
      }
      const energized = (entity) => this.gridEvent?.state === "active" && (Math.floor(entity.y / 200) === this.gridEvent.row || Math.floor(entity.x / 200) === this.gridEvent.column);
      if (damageTick && energized(this.player)) this.hurtPlayer(4.5, { continuous: true });
      if (this.state !== "playing") return;
      if (damageTick) {
        for (const enemy of this.enemies) {
          if (!enemy.dead && enemy.spawnIn <= 0 && energized(enemy)) this.damageEnemy(enemy, 4.5);
        }
      }
    } else if (this.map.id === "core" && this.laser) {
      const laser = this.laser;
      if (laser.state === "idle") {
        laser.timer -= dt;
        if (laser.timer <= 0) {
          laser.state = "warning";
          laser.time = 6;
          laser.hit = false;
          this.audio.tone(160, 0.65, "sawtooth", 0.022, 640);
          ui.liveStatus.textContent = I18N.t("hud.laserSoon");
        }
      } else {
        laser.time -= dt;
        if (laser.state === "warning" && laser.time <= 0) {
          laser.state = "active";
          laser.time = 1;
          this.shake = Math.max(this.shake, 16);
          this.spawnRing(this.world.width / 2, this.world.height / 2, 80, 1500, "#ffd166", 0.9);
          this.audio.tone(880, 0.55, "sawtooth", 0.035, 90);
          if (!laser.hit) {
            laser.hit = true;
            if (!this.isOnSafePlatform(this.player)) this.hurtPlayer(35);
          }
        } else if (laser.state === "active" && laser.time <= 0) {
          laser.state = "idle";
          laser.time = 0;
          laser.timer = 45;
        }
      }
    }
  }

  openMapSelect() {
    if (!["menu", "paused"].includes(this.state) || this.mapSelectOpen) return;
    this.mapSelectionId = this.selectedMapId;
    this.mapSelectOpen = true;
    this.renderMapCards();
    ui.mapOverlay.hidden = false;
  }

  closeMapSelect() {
    this.mapSelectOpen = false;
    ui.mapOverlay.hidden = true;
  }

  selectMap(id) {
    if (id === "random") id = MAP_DEFS[Math.floor(Math.random() * MAP_DEFS.length)].id;
    if (!MAP_DEFS.some((map) => map.id === id)) return;
    this.mapSelectionId = id;
    if (this.state === "menu") {
      this.selectedMapId = id;
      this.map = MAP_DEFS.find((map) => map.id === id);
      ui.menuMapName.textContent = I18N.t(this.map.nameKey);
      try {
        localStorage.setItem("star-ring-map", id);
      } catch {}
    }
    this.audio.tone(480, 0.08, "sine", 0.018, 720);
    this.renderMapCards();
  }

  renderMapCards() {
    ui.mapCards.replaceChildren();
    const selectedId = this.mapSelectOpen ? this.mapSelectionId : this.selectedMapId;
    const entries = [...MAP_DEFS, { id: "random", nameKey: "map.random.name", descKey: "map.random.desc", difficulty: 0, swatch: "#ad8cff" }];
    for (const map of entries) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `map-card${map.id === selectedId ? " selected" : ""}${map.id === "random" ? " random-card" : ""}`;
      button.dataset.map = map.id;
      button.setAttribute("aria-pressed", String(map.id === selectedId));
      button.style.setProperty("--swatch", map.swatch);
      const difficulty = map.id === "random" ? I18N.t("map.unknown") : "★".repeat(map.difficulty);
      const badge = this.badges.includes(map.id) ? `<span class="map-badge">${I18N.t("map.cleared")}</span>` : "";
      button.innerHTML = `<span class="map-swatch"></span><span class="map-difficulty">${difficulty}</span><strong>${I18N.t(map.nameKey)}</strong><p>${I18N.t(map.descKey)}</p>${badge}`;
      button.addEventListener("click", () => this.selectMap(map.id));
      ui.mapCards.appendChild(button);
    }
  }

  start() {
    this.audio.unlock();
    this.input.reset();
    if (this.mapSelectOpen) {
      this.selectedMapId = this.mapSelectionId;
      try {
        localStorage.setItem("star-ring-map", this.selectedMapId);
      } catch {}
    }
    this.state = "playing";
    this.nextId = 1;
    this.enemies = [];
    this.bullets = [];
    this.enemyBullets = [];
    this.pickups = [];
    this.powerups = [];
    this.particles = [];
    this.rings = [];
    this.map = MAP_DEFS.find((map) => map.id === this.selectedMapId);
    this.inBossArena = false;
    this.closeMapSelect();
    ui.minimapName.textContent = I18N.t(this.map.nameKey);
    ui.menuMapName.textContent = I18N.t(this.map.nameKey);
    this.createMap();
    this.powerupSpawnTimer = 8;
    this.powerupPointIndex = 0;
    this.powerupToastTime = 0;
    ui.powerupToast.hidden = true;
    this.score = 0;
    this.kills = 0;
    this.runTime = 0;
    this.level = 1;
    this.xp = 0;
    this.xpNext = 10;
    this.pendingUpgrades = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.pendingVictory = false;
    this.endTimer = 0;
    this.intermission = 0;
    this.lastHitSound = 0;
    this.lastPickupSound = 0;
    this.shake = 0;
    this.player = {
      x: this.world.width / 2,
      y: this.world.height / 2,
      prevX: this.world.width / 2,
      prevY: this.world.height / 2,
      radius: 12,
      hp: 100,
      maxHp: 100,
      speed: 235,
      damage: 20,
      fireRate: 4.6,
      bulletSpeed: 570,
      bulletLife: 1.5,
      multishot: 1,
      pierce: 0,
      bounces: 0,
      critChance: 0.08,
      pickupRadius: 90,
      vx: 0,
      vy: 0,
      facing: -Math.PI / 2,
      shotTimer: 0,
      dashDelay: 2.2,
      dashCooldown: 0,
      dashCooldownMax: 2.2,
      dashTime: 0,
      dashedThisFrame: false,
      dashDamage: 12,
      dashId: 0,
      dashSelfHitId: -1,
      trailTimer: 0,
      invulnerable: 0,
      drones: 0,
      shieldMax: 0,
      shieldTimer: 0,
      shieldReady: false,
      upgrades: {},
      buffs: Object.fromEntries(BUFF_IDS.map((id) => [id, 0]))
    };
    this.camera.x = this.player.x;
    this.camera.y = this.player.y;
    this.cameraAimX = 0;
    this.cameraAimY = 0;
    this.clampCamera();
    ui.menu.hidden = true;
    ui.result.hidden = true;
    ui.pause.hidden = true;
    ui.upgrade.hidden = true;
    ui.settings.hidden = true;
    ui.help.hidden = true;
    ui.hud.hidden = false;
    ui.pauseButton.disabled = false;
    ui.pauseButton.textContent = I18N.t("hud.pause");
    ui.touchControls.classList.toggle("active", this.input.touchMode);
    document.body.classList.add("game-active");
    this.beginWave(1);
    this.updateHUD();
  }

  goToMenu() {
    this.state = "menu";
    this.input.reset();
    this.closeMapSelect();
    this.map = MAP_DEFS.find((map) => map.id === this.selectedMapId);
    ui.menuMapName.textContent = I18N.t(this.map.nameKey);
    this.player = null;
    this.enemies = [];
    this.bullets = [];
    this.enemyBullets = [];
    this.pickups = [];
    this.powerups = [];
    this.particles = [];
    this.rings = [];
    ui.powerupToast.hidden = true;
    ui.menu.hidden = false;
    ui.result.hidden = true;
    ui.pause.hidden = true;
    ui.upgrade.hidden = true;
    ui.settings.hidden = true;
    ui.help.hidden = true;
    ui.hud.hidden = true;
    ui.touchControls.classList.remove("active");
    ui.pauseButton.disabled = true;
    ui.pauseButton.textContent = I18N.t("hud.pause");
    ui.menuBest.textContent = formatScore(this.highScore);
    ui.liveStatus.textContent = I18N.t("hud.backHome");
    document.body.classList.remove("game-active");
  }

  beginWave(number) {
    this.wave = number;
    const counts = { 1: 12, 2: 16, 3: 20, 4: 25, 5: 10 };
    this.waveTotal = counts[number];
    this.waveKills = 0;
    this.eliteRemaining = 1;
    this.spawnRemaining = counts[number];
    this.spawnTimer = 0.75;
    this.intermission = 0;
    if (number === 5) {
      this.enterBossArena();
      this.spawnEnemy("boss");
      this.spawnRemaining -= 1;
      this.showAnnouncement("wave.final", "wave.finalSub");
    } else {
      this.showAnnouncement("hud.waveN", `wave.sub${number}`, { n: number });
    }
    this.audio.tone(220 + number * 45, 0.16, "sine", 0.025, 420 + number * 45);
  }

  showAnnouncement(titleKey, subKey, titleParams = null, subParams = null) {
    this.announcementTime = 2.15;
    this.announcement = { titleKey, subKey, titleParams, subParams };
    this.applyAnnouncement();
  }

  applyAnnouncement() {
    const announcement = this.announcement;
    if (!announcement) return;
    const title = I18N.t(announcement.titleKey, announcement.titleParams);
    const subtitle = I18N.t(announcement.subKey, announcement.subParams);
    ui.announcementTitle.textContent = title;
    ui.announcementSubtitle.textContent = subtitle;
    ui.announcement.hidden = false;
    ui.liveStatus.textContent = `${title}${I18N.t("hud.announceJoin")}${subtitle}`;
  }

  loop(now) {
    const dt = Math.min(Math.max(0, (now - this.lastTime) / 1000), 0.034);
    this.lastTime = now;
    this.backgroundTime += dt;
    if (this.state === "playing") this.update(dt);
    else if (this.state === "gameover" || this.state === "victory") this.updateEffects(dt);
    this.shake = Math.max(0, this.shake - dt * 30);
    this.render();
    this.updateHUD();
    requestAnimationFrame(this.loop);
  }

  update(dt) {
    this.runTime += dt;
    if (this.announcementTime > 0) {
      this.announcementTime -= dt;
      if (this.announcementTime <= 0) ui.announcement.hidden = true;
    }
    if (this.powerupToastTime > 0) {
      this.powerupToastTime -= dt;
      if (this.powerupToastTime <= 0) ui.powerupToast.hidden = true;
    }
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }
    if (this.pendingVictory) {
      this.endTimer -= dt;
      this.updateEffects(dt);
      if (this.endTimer <= 0) this.finish(true);
      return;
    }
    this.updateMapHazards(dt);
    if (this.state !== "playing") return;
    this.updatePlayer(dt);
    this.updateSpawning(dt);
    this.updateEnemies(dt);
    if (this.state !== "playing") return;
    this.updateBullets(dt);
    if (this.pendingVictory) return;
    this.updateEnemyBullets(dt);
    if (this.state !== "playing") return;
    this.updatePickups(dt);
    this.updatePowerups(dt);
    this.updateEffects(dt);
    this.updateCamera(dt);
    if (this.state === "playing") this.checkWave();
  }

  updatePlayer(dt) {
    const player = this.player;
    player.prevX = player.x;
    player.prevY = player.y;
    player.dashedThisFrame = player.dashTime > 0;
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    player.dashCooldown = Math.max(0, player.dashCooldown - dt);
    for (const id of BUFF_IDS) player.buffs[id] = Math.max(0, player.buffs[id] - dt);
    if (player.shieldMax > 0 && !player.shieldReady) {
      player.shieldTimer -= dt;
      if (player.shieldTimer <= 0) {
        player.shieldReady = true;
        this.spawnRing(player.x, player.y, 18, 38, "#65a9ff", 0.35);
        this.audio.tone(480, 0.12, "sine", 0.018, 760);
      }
    }
    const movement = this.input.movement();
    const touchAiming = this.input.touchMode && this.input.pointer.down;
    const belt = this.belts.find((lane) => player.x >= lane.x && player.x <= lane.x + lane.width);
    if (player.dashTime > 0) {
      player.dashTime -= dt;
      player.x += player.vx * dt;
      player.y += player.vy * dt;
      player.trailTimer -= dt;
      if (player.trailTimer <= 0) {
        player.trailTimer = 0.025;
        this.burst(player.x, player.y, "#64fbd2", 2, 40, 5);
      }
      if (player.dashTime <= 0) {
        player.vx *= 0.25;
        player.vy *= 0.25;
      }
    } else {
      const blend = 1 - Math.exp(-18 * dt);
      const moveSpeed = player.speed * (player.buffs.engine > 0 ? 1.6 : 1);
      player.vx += (movement.x * moveSpeed - player.vx) * blend;
      player.vy += (movement.y * moveSpeed - player.vy) * blend;
      player.x += player.vx * dt;
      player.y += player.vy * dt;
    }
    if (belt) player.y += STORM_BELT_SPEED * belt.direction * dt;
    this.applyGravity(player, dt);
    player.x = clamp(player.x, player.radius + 16, this.world.width - player.radius - 16);
    player.y = clamp(player.y, player.radius + 16, this.world.height - player.radius - 16);
    this.resolveObstacles(player, player.radius);
    this.checkPortals(player);
    if (this.input.pointer.active && (!this.input.touchMode || touchAiming)) {
      const pointer = this.screenToWorld(this.input.pointer.x, this.input.pointer.y);
      const aimAngle = Math.atan2(pointer.y - player.y, pointer.x - player.x);
      this.input.lastAimAngle = aimAngle;
      if (!this.input.touchMode) player.facing = aimAngle;
    }
    if (this.input.touchMode && this.input.lastAimAngle !== null) {
      const difference = Math.atan2(Math.sin(this.input.lastAimAngle - player.facing), Math.cos(this.input.lastAimAngle - player.facing));
      const maxTurn = Math.PI * dt / TOUCH_AIM_MAX_TURN_TIME;
      player.facing += clamp(difference, -maxTurn, maxTurn);
    }
    player.shotTimer -= dt;
    const firing = this.input.pointer.down || this.autoFire;
    if (firing && player.shotTimer <= 0) this.shoot();
    if (!firing) player.shotTimer = 0;
  }

  dash() {
    if (this.state !== "playing" || !this.player) return;
    const player = this.player;
    if (player.dashCooldown > 0 || player.dashTime > 0) return;
    const movement = this.input.movement();
    let angle = Math.atan2(movement.y, movement.x);
    if (Math.hypot(movement.x, movement.y) < 0.1) angle = player.facing;
    player.dashTime = 0.18;
    player.dashedThisFrame = true;
    player.dashCooldownMax = player.dashDelay * (player.buffs.engine > 0 ? 0.5 : 1);
    player.dashCooldown = player.dashCooldownMax;
    player.invulnerable = Math.max(player.invulnerable, 0.26);
    player.dashId += 1;
    player.trailTimer = 0;
    player.vx = Math.cos(angle) * 730;
    player.vy = Math.sin(angle) * 730;
    this.shake = Math.max(this.shake, 5);
    this.spawnRing(player.x, player.y, 10, 48, "#64fbd2", 0.28);
    this.burst(player.x, player.y, "#64fbd2", 12, 180, 3);
    this.audio.dash();
  }

  shoot() {
    const player = this.player;
    const angle = this.getAimAngle();
    if (!this.input.touchMode) player.facing = angle;
    const fireRate = player.fireRate * (player.buffs.storm > 0 ? 1.6 : 1);
    player.shotTimer = Math.max(0, player.shotTimer) + 1 / fireRate;
    const count = player.multishot + (player.buffs.storm > 0 ? 2 : 0);
    for (let i = 0; i < count; i += 1) {
      const shotAngle = angle + (i - (count - 1) / 2) * 0.115;
      const critical = Math.random() < player.critChance;
      const nose = player.radius + 8;
      this.bullets.push({
        x: player.x + Math.cos(shotAngle) * nose,
        y: player.y + Math.sin(shotAngle) * nose,
        vx: Math.cos(shotAngle) * player.bulletSpeed,
        vy: Math.sin(shotAngle) * player.bulletSpeed,
        radius: (critical ? 5 : 3.5) + (player.buffs.double > 0 ? 1.5 : 0),
        damage: player.damage * (critical ? 2 : 1) * (player.buffs.double > 0 ? 2 : 1),
        critical,
        pierce: player.pierce,
        bounces: player.bounces,
        life: player.bulletLife,
        hitIds: new Set(),
        dead: false
      });
    }
    this.burst(player.x + Math.cos(angle) * 20, player.y + Math.sin(angle) * 20, "#dffff7", 2, 65, 2);
    this.audio.shoot();
  }

  getAimAngle() {
    const player = this.player;
    const pointer = this.screenToWorld(this.input.pointer.x, this.input.pointer.y);
    if (this.input.pointer.active) {
      return Math.atan2(pointer.y - player.y, pointer.x - player.x);
    }
    if (this.input.touchMode || this.autoFire) return this.input.lastAimAngle ?? player.facing;
    let nearest = null;
    let nearestDistance = Infinity;
    for (const enemy of this.enemies) {
      if (enemy.dead || enemy.spawnIn > 0) continue;
      const distance = distanceSquared(player, enemy);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = enemy;
      }
    }
    if (nearest) return Math.atan2(nearest.y - player.y, nearest.x - player.x);
    if (this.input.pointer.active && !this.input.touchMode) {
      return Math.atan2(pointer.y - player.y, pointer.x - player.x);
    }
    return player.facing;
  }

  updateSpawning(dt) {
    if (this.intermission > 0) {
      this.intermission -= dt;
      if (this.intermission <= 0) this.beginWave(this.wave + 1);
      return;
    }
    if (this.spawnRemaining <= 0) return;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.enemies.length < 17) {
      const shouldMakeElite = this.eliteRemaining > 0 && this.spawnRemaining <= Math.max(1, Math.ceil(this.waveTotal / 2));
      const enemy = this.spawnEnemy();
      if (shouldMakeElite) {
        this.makeElite(enemy);
        this.eliteRemaining -= 1;
      }
      this.spawnRemaining -= 1;
      this.spawnTimer = Math.max(0.26, 0.74 - this.wave * 0.07) * random(0.78, 1.16);
    }
  }

  spawnEnemy(forcedType = null, x = null, y = null) {
    let type = forcedType;
    if (!type) {
      const roll = Math.random();
      if (this.wave === 1) type = "chaser";
      else if (this.wave === 2) type = roll < 0.64 ? "chaser" : "shooter";
      else if (this.wave === 3) type = roll < 0.42 ? "chaser" : roll < 0.7 ? "shooter" : "dasher";
      else if (this.wave === 4) type = roll < 0.3 ? "chaser" : roll < 0.53 ? "shooter" : roll < 0.78 ? "dasher" : "splitter";
      else type = roll < 0.45 ? "chaser" : roll < 0.72 ? "shooter" : "dasher";
    }
    const stats = ENEMY_STATS[type];
    if (type === "boss") {
      x = clamp(this.player.x, 280, this.world.width - 280);
      y = clamp(this.player.y - 420, 180, this.world.height - 180);
    } else if (x === null || y === null) {
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const angle = random(0, Math.PI * 2);
        const distance = random(500, 800);
        const margin = stats.radius + 30;
        x = clamp((this.player?.x || this.world.width / 2) + Math.cos(angle) * distance, margin, this.world.width - margin);
        y = clamp((this.player?.y || this.world.height / 2) + Math.sin(angle) * distance, margin, this.world.height - margin);
        const farEnough = !this.player || (x - this.player.x) ** 2 + (y - this.player.y) ** 2 > 320 ** 2;
        const clear = !this.obstacles.some((obstacle) => circleTouchesRect(x, y, stats.radius + 12, obstacle));
        if (farEnough && clear) break;
      }
    }
    const scale = type === "boss" || type === "mite" ? 1 : 1 + (this.wave - 1) * 0.13;
    const enemy = {
      id: this.nextId++,
      type,
      x,
      y,
      prevX: x,
      prevY: y,
      navigationTimer: 0,
      navigationWaypoints: [],
      navigationPortal: -1,
      portalExitIndex: -1,
      anchorX: x,
      anchorY: y,
      elite: false,
      vx: 0,
      vy: 0,
      radius: stats.radius,
      hp: stats.hp * scale,
      maxHp: stats.hp * scale,
      speed: stats.speed * (1 + Math.max(0, this.wave - 1) * 0.035),
      damage: stats.damage,
      xp: stats.xp,
      score: stats.score,
      color: stats.color,
      spawnIn: type === "boss" ? 1.5 : 0.65,
      flash: 0,
      dead: false,
      attackTimer: random(1.1, 2),
      attackCount: 0,
      powerupTimer: 30,
      charge: 0,
      pendingAttack: 0,
      state: "hunt",
      stateTime: 0,
      cooldown: random(1, 2),
      aim: 0,
      dashHitId: -1,
      droneHit: 0
    };
    this.enemies.push(enemy);
    return enemy;
  }

  makeElite(enemy) {
    enemy.elite = true;
    enemy.radius *= 1.18;
    enemy.hp *= 1.8;
    enemy.maxHp *= 1.8;
    enemy.xp += 2;
    enemy.score *= 2;
    this.spawnRing(enemy.x, enemy.y, enemy.radius + 8, enemy.radius + 40, "#ffd166", 0.6);
  }

  updateEnemies(dt) {
    const player = this.player;
    const slowFactor = player.buffs.slow > 0 ? 0.5 : 1;
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      enemy.prevX = enemy.x;
      enemy.prevY = enemy.y;
      enemy.flash = Math.max(0, enemy.flash - dt);
      enemy.droneHit = Math.max(0, enemy.droneHit - dt);
      enemy.portalCooldown = Math.max(0, (enemy.portalCooldown || 0) - dt);
      if (enemy.spawnIn > 0) {
        enemy.spawnIn -= dt;
        continue;
      }
      if (enemy.type === "boss") this.updateBoss(enemy, dt);
      else {
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const distance = Math.max(0.001, Math.hypot(dx, dy));
        const target = this.getEnemyPursuitTarget(enemy, dt);
        const targetDx = target.x - enemy.x;
        const targetDy = target.y - enemy.y;
        const targetDistance = Math.max(0.001, Math.hypot(targetDx, targetDy));
        const nx = targetDx / targetDistance;
        const ny = targetDy / targetDistance;
        if (enemy.type === "chaser" || enemy.type === "splitter" || enemy.type === "mite") {
          const wobble = enemy.type === "splitter" && this.map.id !== "gravity" ? Math.sin(this.runTime * 2 + enemy.id) * 0.35 : 0;
          enemy.x += (nx - ny * wobble) * enemy.speed * dt * slowFactor;
          enemy.y += (ny + nx * wobble) * enemy.speed * dt * slowFactor;
        } else if (enemy.type === "shooter") {
          let direction = 0;
          if (distance > 270) direction = 1;
          else if (distance < 175) direction = -1;
          const sx = direction === 1 ? nx : dx / distance;
          const sy = direction === 1 ? ny : dy / distance;
          const strafe = this.map.id === "gravity" && direction === 1 ? 0 : Math.sin(this.runTime * 1.4 + enemy.id) * 0.6;
          enemy.x += (sx * direction - sy * strafe) * enemy.speed * dt * slowFactor;
          enemy.y += (sy * direction + sx * strafe) * enemy.speed * dt * slowFactor;
          enemy.attackTimer -= dt;
          if (enemy.attackTimer <= 0 && distance < 580) {
            this.fireEnemyBullet(enemy, Math.atan2(dy, dx), 205, 5, enemy.damage);
            enemy.attackTimer = random(1.65, 2.2);
          }
        } else if (enemy.type === "dasher") {
          if (enemy.state === "hunt") {
            enemy.x += nx * enemy.speed * dt * slowFactor;
            enemy.y += ny * enemy.speed * dt * slowFactor;
            enemy.cooldown -= dt;
            const clearCharge = this.map.id !== "gravity" || this.portals.every((portal, index) => index === enemy.navigationPortal || (enemy.portalCooldown > 0 && index === enemy.portalExitIndex) || !segmentHitsCircle(enemy.x, enemy.y, player.x, player.y, portal.x, portal.y, enemy.radius + 28));
            if (enemy.cooldown <= 0 && distance < 370 && clearCharge) {
              enemy.state = "telegraph";
              enemy.stateTime = 0.65;
              enemy.aim = Math.atan2(dy, dx);
            }
          } else if (enemy.state === "telegraph") {
            enemy.stateTime -= dt;
            if (enemy.stateTime <= 0) {
              enemy.state = "dash";
              enemy.stateTime = 0.38;
              enemy.vx = Math.cos(enemy.aim) * 485;
              enemy.vy = Math.sin(enemy.aim) * 485;
            }
          } else {
            enemy.stateTime -= dt;
            enemy.x += enemy.vx * dt * slowFactor;
            enemy.y += enemy.vy * dt * slowFactor;
            if (enemy.stateTime <= 0) {
              enemy.state = "hunt";
              enemy.cooldown = 2.2;
            }
          }
        }
      }
      this.applyGravity(enemy, dt);
      enemy.x = clamp(enemy.x, enemy.radius + 14, this.world.width - enemy.radius - 14);
      enemy.y = clamp(enemy.y, enemy.radius + 14, this.world.height - enemy.radius - 14);
      this.resolveObstacles(enemy, enemy.radius);
      this.avoidEnemyPortals(enemy);
      this.checkPortals(enemy);
      const touching = segmentHitsCircle(player.prevX, player.prevY, player.x, player.y, enemy.x, enemy.y, player.radius + enemy.radius);
      if (touching && !enemy.dead) {
        if (player.dashedThisFrame || player.dashTime > 0) {
          if (enemy.dashHitId !== player.dashId) {
            enemy.dashHitId = player.dashId;
            this.damageEnemy(enemy, player.dashDamage * (player.buffs.shield > 0 ? 1.5 : 1));
            if (player.dashSelfHitId !== player.dashId) {
              player.dashSelfHitId = player.dashId;
              this.hurtPlayer(enemy.damage, { ramming: true });
            }
            const length = Math.max(1, Math.hypot(player.vx, player.vy));
            enemy.x += player.vx / length * 24;
            enemy.y += player.vy / length * 24;
            this.shake = Math.max(this.shake, 6);
          }
        } else if (this.hurtPlayer(enemy.damage)) {
          const angle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
          enemy.x += Math.cos(angle) * 20;
          enemy.y += Math.sin(angle) * 20;
        }
        if (this.state !== "playing" || this.pendingVictory) break;
      }
      if (!enemy.dead && player.drones > 0 && enemy.spawnIn <= 0) {
        for (let i = 0; i < player.drones; i += 1) {
          const angle = this.runTime * 2.5 + i * Math.PI * 2 / player.drones;
          const drone = { x: player.x + Math.cos(angle) * 48, y: player.y + Math.sin(angle) * 48 };
          if (enemy.droneHit <= 0 && distanceSquared(drone, enemy) < (enemy.radius + 9) ** 2) {
            enemy.droneHit = 0.34;
            this.damageEnemy(enemy, player.damage * 0.7);
            this.burst(drone.x, drone.y, "#ad8cff", 3, 85, 2);
          }
        }
      }
    }
    this.enemies = this.enemies.filter((enemy) => !enemy.dead);
    for (let i = 0; i < this.enemies.length; i += 1) {
      const a = this.enemies[i];
      if (a.spawnIn > 0 || a.type === "boss") continue;
      for (let j = i + 1; j < this.enemies.length; j += 1) {
        const b = this.enemies[j];
        if (b.spawnIn > 0 || b.type === "boss") continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distance = Math.hypot(dx, dy);
        const minimum = (a.radius + b.radius) * 0.72;
        if (distance > 0 && distance < minimum) {
          const push = (minimum - distance) * 0.25;
          a.x -= dx / distance * push;
          a.y -= dy / distance * push;
          b.x += dx / distance * push;
          b.y += dy / distance * push;
        }
      }
    }
    for (const enemy of this.enemies) {
      this.resolveObstacles(enemy, enemy.radius);
      this.avoidEnemyPortals(enemy);
    }
  }

  updateBoss(enemy, dt) {
    const slowFactor = this.player.buffs.slow > 0 ? 0.5 : 1;
    const targetX = enemy.anchorX + Math.sin(this.runTime * 0.55) * 230;
    const targetY = enemy.anchorY + Math.sin(this.runTime * 0.9) * 90;
    enemy.x += (targetX - enemy.x) * dt * 0.85 * slowFactor;
    enemy.y += (targetY - enemy.y) * dt * 0.85 * slowFactor;
    enemy.powerupTimer -= dt;
    if (enemy.powerupTimer <= 0) {
      this.spawnPowerup(enemy.x + random(-90, 90), enemy.y + 90, null, 18);
      enemy.powerupTimer = 30;
      ui.liveStatus.textContent = I18N.t("hud.bossDropped");
    }
    if (enemy.charge > 0) {
      enemy.charge -= dt;
      if (enemy.charge <= 0) {
        this.bossAttack(enemy);
        enemy.attackTimer = enemy.hp / enemy.maxHp < 0.5 ? 1.5 : 2.15;
      }
    } else {
      enemy.attackTimer -= dt;
      if (enemy.attackTimer <= 0) {
        enemy.charge = 0.68;
        enemy.pendingAttack = enemy.attackCount % 3;
        enemy.attackCount += 1;
        this.audio.tone(90, 0.32, "sawtooth", 0.02, 180);
      }
    }
  }

  bossAttack(enemy) {
    const enraged = enemy.hp / enemy.maxHp < 0.5;
    if (enemy.pendingAttack === 0) {
      const count = enraged ? 18 : 13;
      for (let i = 0; i < count; i += 1) {
        this.fireEnemyBullet(enemy, enemy.attackCount * 0.19 + i * Math.PI * 2 / count, enraged ? 185 : 155, 5, 11);
      }
    } else if (enemy.pendingAttack === 1) {
      const angle = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
      const count = enraged ? 7 : 5;
      for (let i = 0; i < count; i += 1) {
        this.fireEnemyBullet(enemy, angle + (i - (count - 1) / 2) * 0.12, 235, 5, 12);
      }
    } else {
      const count = enraged ? 10 : 8;
      for (let i = 0; i < count; i += 1) {
        this.fireEnemyBullet(enemy, i * Math.PI * 2 / count + 0.2, 145, 5, 10);
      }
      if (this.enemies.length < 11) {
        this.spawnEnemy("chaser", enemy.x - 62, enemy.y + 20);
        this.spawnEnemy("chaser", enemy.x + 62, enemy.y + 20);
        this.waveTotal += 2;
      }
    }
    this.spawnRing(enemy.x, enemy.y, enemy.radius, enemy.radius + 48, "#ff6178", 0.35);
    this.shake = Math.max(this.shake, 6);
  }

  fireEnemyBullet(enemy, angle, speed, radius, damage) {
    this.enemyBullets.push({
      x: enemy.x + Math.cos(angle) * (enemy.radius + 7),
      y: enemy.y + Math.sin(angle) * (enemy.radius + 7),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius,
      damage,
      life: 5,
      color: enemy.type === "boss" ? "#ff7186" : "#ffd166"
    });
  }

  updateBullets(dt) {
    for (let i = this.bullets.length - 1; i >= 0; i -= 1) {
      const bullet = this.bullets[i];
      bullet.life -= dt;
      const oldX = bullet.x;
      const oldY = bullet.y;
      this.applyGravity(bullet, dt, true);
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      const minX = 15 + bullet.radius;
      const maxX = this.world.width - 15 - bullet.radius;
      const minY = 15 + bullet.radius;
      const maxY = this.world.height - 15 - bullet.radius;
      const outsideX = bullet.x < minX || bullet.x > maxX;
      const outsideY = bullet.y < minY || bullet.y > maxY;
      if ((outsideX || outsideY) && bullet.bounces > 0) {
        if (outsideX) bullet.vx = bullet.x < minX ? Math.abs(bullet.vx) : -Math.abs(bullet.vx);
        if (outsideY) bullet.vy = bullet.y < minY ? Math.abs(bullet.vy) : -Math.abs(bullet.vy);
        bullet.x = clamp(bullet.x, minX, maxX);
        bullet.y = clamp(bullet.y, minY, maxY);
        bullet.bounces -= 1;
        this.burst(bullet.x, bullet.y, "#64fbd2", 3, 75, 2);
      } else if (outsideX || outsideY || bullet.life <= 0) {
        this.bullets.splice(i, 1);
        continue;
      }
      if (this.obstacles.some((obstacle) => circleTouchesRect(bullet.x, bullet.y, bullet.radius, obstacle)) || this.orbiters.some((orbiter) => this.circleTouchesOrbiter(bullet.x, bullet.y, bullet.radius, orbiter))) {
        this.burst(bullet.x, bullet.y, "#6f8ca0", 3, 70, 2);
        this.bullets.splice(i, 1);
        continue;
      }
      let removed = false;
      for (const enemy of this.enemies) {
        if (enemy.dead || enemy.spawnIn > 0 || bullet.hitIds.has(enemy.id)) continue;
        if (segmentHitsCircle(oldX, oldY, bullet.x, bullet.y, enemy.x, enemy.y, enemy.radius + bullet.radius)) {
          bullet.hitIds.add(enemy.id);
          this.damageEnemy(enemy, bullet.damage);
          this.burst(bullet.x, bullet.y, bullet.critical ? "#ffd166" : "#b9ffee", bullet.critical ? 6 : 3, 100, 2);
          if (bullet.pierce > 0) bullet.pierce -= 1;
          else {
            this.bullets.splice(i, 1);
            removed = true;
          }
          break;
        }
      }
      if (!removed && bullet.life <= 0) this.bullets.splice(i, 1);
    }
  }

  updateEnemyBullets(dt) {
    const player = this.player;
    const slowFactor = player.buffs.slow > 0 ? 0.5 : 1;
    for (let i = this.enemyBullets.length - 1; i >= 0; i -= 1) {
      const bullet = this.enemyBullets[i];
      bullet.life -= dt;
      this.applyGravity(bullet, dt * slowFactor, true, 60);
      bullet.x += bullet.vx * dt * slowFactor;
      bullet.y += bullet.vy * dt * slowFactor;
      if (bullet.life <= 0 || bullet.x < -30 || bullet.x > this.world.width + 30 || bullet.y < -30 || bullet.y > this.world.height + 30) {
        this.enemyBullets.splice(i, 1);
        continue;
      }
      if (this.obstacles.some((obstacle) => circleTouchesRect(bullet.x, bullet.y, bullet.radius, obstacle)) || this.orbiters.some((orbiter) => this.circleTouchesOrbiter(bullet.x, bullet.y, bullet.radius, orbiter))) {
        this.burst(bullet.x, bullet.y, bullet.color, 2, 55, 2);
        this.enemyBullets.splice(i, 1);
        continue;
      }
      if (distanceSquared(bullet, player) < (bullet.radius + player.radius) ** 2) {
        if (player.dashTime > 0 || player.buffs.shield > 0) {
          this.enemyBullets.splice(i, 1);
          this.score += 5;
          this.burst(bullet.x, bullet.y, "#64fbd2", 4, 110, 2);
        } else if (player.invulnerable <= 0 && this.hurtPlayer(bullet.damage)) {
          this.enemyBullets.splice(i, 1);
        }
      }
    }
  }

  damageEnemy(enemy, damage) {
    if (enemy.dead) return;
    enemy.hp -= damage;
    enemy.flash = 0.08;
    if (this.runTime - this.lastHitSound > 0.045) {
      this.audio.hit();
      this.lastHitSound = this.runTime;
    }
    if (enemy.hp <= 0) this.killEnemy(enemy);
  }

  killEnemy(enemy) {
    if (enemy.dead) return;
    enemy.dead = true;
    this.kills += 1;
    this.waveKills += 1;
    this.combo += 1;
    this.comboTimer = 3;
    const multiplier = 1 + Math.min(20, this.combo - 1) * 0.05;
    this.score += Math.round(enemy.score * multiplier);
    this.burst(enemy.x, enemy.y, enemy.color, enemy.type === "boss" ? 60 : Math.round(enemy.radius * 0.65), enemy.type === "boss" ? 300 : 160, enemy.type === "boss" ? 6 : 3);
    this.spawnRing(enemy.x, enemy.y, enemy.radius * 0.5, enemy.radius * 2.3, enemy.color, enemy.type === "boss" ? 0.8 : 0.3);
    if (enemy.type === "boss") {
      this.enemyBullets = [];
      this.shake = 20;
      this.showAnnouncement("announce.bossDown", "announce.bossDownSub");
      this.audio.explode(0.55);
      this.audio.tone(330, 0.5, "sine", 0.035, 880);
      return;
    }
    if (enemy.elite) this.spawnPowerup(enemy.x, enemy.y, null, 18);
    for (let i = 0; i < enemy.xp; i += 1) {
      this.pickups.push({
        type: "xp",
        x: enemy.x,
        y: enemy.y,
        vx: random(-65, 65),
        vy: random(-65, 65),
        value: 1,
        life: 16,
        phase: random(0, Math.PI * 2)
      });
    }
    if (Math.random() < 0.075 && this.player.hp < this.player.maxHp) {
      this.pickups.push({ type: "health", x: enemy.x, y: enemy.y, vx: random(-35, 35), vy: random(-35, 35), value: 16, life: 12, phase: 0 });
    }
    if (enemy.type === "splitter") {
      this.spawnEnemy("mite", enemy.x - 12, enemy.y);
      this.spawnEnemy("mite", enemy.x + 12, enemy.y);
      this.waveTotal += 2;
    }
    this.audio.explode(enemy.radius > 17 ? 1.2 : 1.8);
  }

  hurtPlayer(amount, { continuous = false, ramming = false } = {}) {
    const player = this.player;
    if (this.state !== "playing" || player.buffs.shield > 0) return false;
    if (!ramming && ((!continuous && player.invulnerable > 0) || player.dashTime > 0)) return false;
    if (player.shieldReady) {
      player.shieldReady = false;
      player.shieldTimer = player.shieldMax;
      player.invulnerable = 0.35;
      this.spawnRing(player.x, player.y, 18, 62, "#65a9ff", 0.4);
      this.burst(player.x, player.y, "#65a9ff", 12, 170, 3);
      this.audio.tone(520, 0.18, "square", 0.025, 180);
      return true;
    }
    player.hp -= amount;
    if (!continuous) player.invulnerable = 0.8;
    this.combo = 0;
    this.comboTimer = 0;
    this.shake = Math.max(this.shake, continuous ? 3 : 11);
    this.burst(player.x, player.y, "#ff6178", continuous ? 4 : 16, continuous ? 90 : 210, continuous ? 2 : 4);
    if (!continuous) {
      this.spawnRing(player.x, player.y, 12, 48, "#ff6178", 0.35);
      this.audio.hurt();
    }
    if (player.hp <= 0) {
      player.hp = 0;
      this.finish(false);
    }
    return true;
  }

  updatePickups(dt) {
    const player = this.player;
    for (let i = this.pickups.length - 1; i >= 0; i -= 1) {
      const pickup = this.pickups[i];
      pickup.life -= dt;
      pickup.phase += dt * 3;
      const drag = Math.exp(-4 * dt);
      pickup.vx *= drag;
      pickup.vy *= drag;
      const dx = player.x - pickup.x;
      const dy = player.y - pickup.y;
      const distance = Math.max(0.001, Math.hypot(dx, dy));
      const magnetRange = player.buffs.magnet > 0 ? Infinity : player.pickupRadius;
      if (distance < magnetRange) {
        const force = 220 + (1 - distance / magnetRange) * 480;
        pickup.vx += dx / distance * force * dt * 4;
        pickup.vy += dy / distance * force * dt * 4;
      }
      pickup.x += pickup.vx * dt;
      pickup.y += pickup.vy * dt;
      if (distance < player.radius + 12) {
        if (pickup.type === "xp") this.gainXp(pickup.value);
        else {
          player.hp = Math.min(player.maxHp, player.hp + pickup.value);
          this.burst(player.x, player.y, "#ff8d9d", 8, 100, 3);
          this.audio.tone(440, 0.14, "sine", 0.025, 660);
        }
        this.pickups.splice(i, 1);
        if (this.runTime - this.lastPickupSound > 0.055) {
          this.audio.pickup();
          this.lastPickupSound = this.runTime;
        }
      } else if (pickup.life <= 0) this.pickups.splice(i, 1);
    }
  }

  spawnPowerup(x, y, buffId = null, life = 18) {
    let spawnX = clamp(x, 40, this.world.width - 40);
    let spawnY = clamp(y, 40, this.world.height - 40);
    for (let attempt = 0; attempt < 8 && this.obstacles.some((obstacle) => circleTouchesRect(spawnX, spawnY, 18, obstacle)); attempt += 1) {
      spawnX = clamp(x + random(-90, 90), 40, this.world.width - 40);
      spawnY = clamp(y + random(-90, 90), 40, this.world.height - 40);
    }
    const powerup = {
      x: spawnX,
      y: spawnY,
      radius: 15,
      buffId: buffId || BUFF_IDS[Math.floor(Math.random() * BUFF_IDS.length)],
      life,
      maxLife: life,
      phase: random(0, Math.PI * 2)
    };
    this.powerups.push(powerup);
    return powerup;
  }

  updatePowerups(dt) {
    this.powerupSpawnTimer -= dt;
    if (this.powerupSpawnTimer <= 0) {
      let spawned = false;
      if (this.map.id === "matrix") {
        for (let attempt = 0; attempt < 24; attempt += 1) {
          const column = Math.floor(random(0, 12));
          const row = Math.floor(random(0, 8));
          if (this.gridEvent && (this.gridEvent.column === column || this.gridEvent.row === row)) continue;
          const x = column * 200 + 100;
          const y = row * 200 + 100;
          if (this.powerups.some((powerup) => (powerup.x - x) ** 2 + (powerup.y - y) ** 2 < 50 ** 2)) continue;
          this.spawnPowerup(x, y, null, 10);
          spawned = true;
          break;
        }
      } else {
        for (let attempt = 0; attempt < this.powerupPoints.length; attempt += 1) {
          const index = (this.powerupPointIndex + attempt) % this.powerupPoints.length;
          const point = this.powerupPoints[index];
          if (this.powerups.some((powerup) => (powerup.x - point.x) ** 2 + (powerup.y - point.y) ** 2 < 50 ** 2)) continue;
          this.spawnPowerup(point.x, point.y, null, 10);
          this.powerupPointIndex = (index + 1) % this.powerupPoints.length;
          spawned = true;
          break;
        }
      }
      this.powerupSpawnTimer = spawned ? 25 : 5;
    }
    for (let i = this.powerups.length - 1; i >= 0; i -= 1) {
      const powerup = this.powerups[i];
      powerup.life -= dt;
      powerup.phase += dt * 2.5;
      if (distanceSquared(powerup, this.player) < (powerup.radius + this.player.radius + 4) ** 2) {
        this.applyBuff(powerup.buffId);
        this.powerups.splice(i, 1);
      } else if (powerup.life <= 0) this.powerups.splice(i, 1);
    }
  }

  applyBuff(id) {
    const definition = BUFF_DEFS[id];
    if (!definition) return;
    this.player.buffs[id] = definition.duration;
    this.score += 50;
    this.powerupToastTime = 1.5;
    ui.powerupToast.textContent = I18N.t("toast.buff", { name: I18N.t(definition.nameKey), s: definition.duration });
    ui.powerupToast.style.color = definition.color;
    ui.powerupToast.style.borderColor = definition.color;
    ui.powerupToast.hidden = false;
    this.spawnRing(this.player.x, this.player.y, 16, 74, definition.color, 0.5);
    this.burst(this.player.x, this.player.y, definition.color, 18, 180, 3);
    this.audio.tone(540, 0.2, "sine", 0.03, 1080);
    ui.liveStatus.textContent = I18N.t("hud.gotBuff", { name: I18N.t(definition.nameKey), s: definition.duration });
  }

  gainXp(amount) {
    this.xp += amount;
    this.score += amount * 5;
    if (this.xp >= this.xpNext) {
      this.xp -= this.xpNext;
      this.level += 1;
      this.xpNext = Math.round(this.xpNext * 1.3 + 2);
      this.pendingUpgrades += 1;
      if (this.state === "playing") this.showUpgrade();
    }
  }

  getUpgradePool() {
    const player = this.player;
    return [
      { id: "damage", icon: "↑", nameKey: "upg.damage.name", descKey: "upg.damage.desc", max: 8, apply: () => { player.damage *= 1.25; } },
      { id: "rapid", icon: "»", nameKey: "upg.rapid.name", descKey: "upg.rapid.desc", max: 8, apply: () => { player.fireRate *= 1.18; } },
      { id: "multi", icon: "⋔", nameKey: "upg.multi.name", descKey: "upg.multi.desc", max: 3, apply: () => { player.multishot += 1; } },
      { id: "pierce", icon: "⇥", nameKey: "upg.pierce.name", descKey: "upg.pierce.desc", max: 3, apply: () => { player.pierce += 1; } },
      { id: "bounce", icon: "⌁", nameKey: "upg.bounce.name", descKey: "upg.bounce.desc", max: 2, apply: () => { player.bounces += 1; } },
      { id: "speed", icon: "›", nameKey: "upg.speed.name", descKey: "upg.speed.desc", max: 5, apply: () => { player.speed *= 1.12; } },
      { id: "range", icon: "⇢", nameKey: "upg.range.name", descKey: "upg.range.desc", max: 3, apply: () => { player.bulletLife *= 1.25; } },
      { id: "vitality", icon: "+", nameKey: "upg.vitality.name", descKey: "upg.vitality.desc", max: 6, apply: () => { player.maxHp += 25; player.hp = Math.min(player.maxHp, player.hp + 25); } },
      { id: "crit", icon: "×2", nameKey: "upg.crit.name", descKey: "upg.crit.desc", max: 4, apply: () => { player.critChance += 0.12; } },
      { id: "magnet", icon: "◎", nameKey: "upg.magnet.name", descKey: "upg.magnet.desc", max: 3, apply: () => { player.pickupRadius *= 1.45; } },
      { id: "dash", icon: "◇", nameKey: "upg.dash.name", descKey: "upg.dash.desc", max: 3, apply: () => { player.dashDelay *= 0.82; player.dashDamage += 6; } },
      { id: "drone", icon: "◈", nameKey: "upg.drone.name", descKey: "upg.drone.desc", max: 3, apply: () => { player.drones += 1; } },
      { id: "shield", icon: "◯", nameKey: "upg.shield.name", descKey: "upg.shield.desc", max: 1, apply: () => { player.shieldMax = 12; player.shieldReady = true; } }
    ];
  }

  showUpgrade() {
    this.state = "upgrade";
    this.input.resetFire();
    ui.touchControls.classList.remove("active");
    ui.pauseButton.disabled = true;
    const pool = this.getUpgradePool();
    const available = pool.filter((upgrade) => (this.player.upgrades[upgrade.id] || 0) < upgrade.max);
    this.currentChoices = shuffled(available).slice(0, 3);
    this.renderUpgradeCards();
    ui.upgrade.hidden = false;
    this.audio.tone(420, 0.18, "sine", 0.025, 840);
    ui.liveStatus.textContent = I18N.t("hud.chooseUpgrade");
  }

  renderUpgradeCards() {
    ui.upgradeCards.replaceChildren();
    for (const upgrade of this.currentChoices) {
      const level = this.player.upgrades[upgrade.id] || 0;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "upgrade-card";
      button.innerHTML = `<small>LV.${level} → ${level + 1}</small><span class="upgrade-icon">${upgrade.icon}</span><strong>${I18N.t(upgrade.nameKey)}</strong><p>${I18N.t(upgrade.descKey)}</p>`;
      button.addEventListener("click", () => this.chooseUpgrade(upgrade.id));
      ui.upgradeCards.appendChild(button);
    }
  }

  chooseUpgrade(id) {
    if (this.state !== "upgrade") return;
    const upgrade = this.currentChoices.find((choice) => choice.id === id);
    if (!upgrade) return;
    upgrade.apply();
    this.player.upgrades[id] = (this.player.upgrades[id] || 0) + 1;
    this.pendingUpgrades -= 1;
    this.burst(this.player.x, this.player.y, "#ad8cff", 22, 190, 4);
    this.spawnRing(this.player.x, this.player.y, 16, 90, "#ad8cff", 0.55);
    this.audio.tone(520, 0.22, "sine", 0.035, 1040);
    if (this.pendingUpgrades > 0) {
      this.showUpgrade();
      return;
    }
    ui.upgrade.hidden = true;
    this.state = "playing";
    ui.pauseButton.disabled = false;
    ui.touchControls.classList.toggle("active", this.input.touchMode);
    this.input.resetFire();
    ui.liveStatus.textContent = I18N.t("hud.chosenUpgrade", { name: I18N.t(upgrade.nameKey) });
  }

  checkWave() {
    if (this.spawnRemaining > 0 || this.intermission > 0 || this.enemies.length > 0 || this.pendingVictory) return;
    if (this.wave >= 5) {
      this.pendingVictory = true;
      this.endTimer = 1.7;
      this.showAnnouncement("announce.sectorCleared", "announce.sectorClearedSub");
      return;
    }
    this.intermission = 2.7;
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 20);
    this.enemyBullets = [];
    this.showAnnouncement("announce.zoneCleared", "announce.zoneClearedSub");
    this.audio.tone(440, 0.2, "sine", 0.025, 660);
  }

  pause() {
    if (this.state !== "playing") return;
    this.state = "paused";
    this.input.reset(this.input.touchMode);
    ui.pause.hidden = false;
    ui.touchControls.classList.remove("active");
    ui.pauseButton.textContent = I18N.t("hud.resume");
    ui.liveStatus.textContent = I18N.t("hud.paused");
  }

  resume() {
    if (this.state !== "paused" || this.mapSelectOpen) return;
    this.state = "playing";
    ui.pause.hidden = true;
    ui.pauseButton.textContent = I18N.t("hud.pause");
    ui.touchControls.classList.toggle("active", this.input.touchMode);
    ui.liveStatus.textContent = I18N.t("hud.resumed");
  }

  togglePause() {
    if (!ui.settings.hidden) {
      this.closeSettings();
      return;
    }
    if (!ui.help.hidden) {
      this.closeHelp();
      return;
    }
    if (this.state === "playing") this.pause();
    else if (this.state === "paused") this.resume();
  }

  finish(victory) {
    if (["gameover", "victory", "menu"].includes(this.state)) return;
    this.state = victory ? "victory" : "gameover";
    this.input.reset();
    ui.touchControls.classList.remove("active");
    ui.pauseButton.disabled = true;
    ui.pause.hidden = true;
    ui.upgrade.hidden = true;
    ui.announcement.hidden = true;
    const isNewBest = this.score > this.highScore;
    if (isNewBest) {
      this.highScore = this.score;
      try {
        localStorage.setItem("star-ring-high-score", String(this.highScore));
      } catch {}
    }
    if (victory && !this.badges.includes(this.selectedMapId)) {
      this.badges.push(this.selectedMapId);
      try {
        localStorage.setItem("star-ring-badges", JSON.stringify(this.badges));
      } catch {}
    }
    this.lastResult = { victory, isNewBest };
    this.applyResultPanel();
    ui.result.hidden = false;
    document.body.classList.remove("game-active");
    if (victory) {
      this.audio.tone(440, 0.35, "sine", 0.035, 660);
      window.setTimeout(() => this.audio.tone(660, 0.4, "sine", 0.03, 990), 180);
    } else this.audio.tone(180, 0.5, "sawtooth", 0.035, 55);
    ui.liveStatus.textContent = I18N.t(victory ? "result.victory" : "result.defeat");
  }

  applyResultPanel() {
    const { victory, isNewBest } = this.lastResult;
    ui.resultEyebrow.textContent = victory ? "RING BREACHED" : "SIGNAL LOST";
    ui.resultEyebrow.style.color = victory ? "#64fbd2" : "#ff6178";
    ui.resultTitle.textContent = I18N.t(victory ? "result.victory" : "result.defeat");
    ui.resultSubtitle.textContent = victory ? I18N.t("result.victorySub") : I18N.t("result.defeatSub", { n: this.wave });
    ui.resultScore.textContent = formatScore(this.score);
    ui.resultKills.textContent = String(this.kills);
    ui.resultTime.textContent = formatTime(this.runTime);
    ui.resultLevel.textContent = String(this.level);
    ui.newBest.hidden = !isNewBest;
    ui.menuBest.textContent = formatScore(this.highScore);
  }

  burst(x, y, color, count = 8, speed = 140, size = 3) {
    const available = Math.max(0, 500 - this.particles.length);
    for (let i = 0; i < Math.min(count, available); i += 1) {
      const angle = random(0, Math.PI * 2);
      const velocity = random(speed * 0.25, speed);
      const life = random(0.22, 0.58);
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life,
        maxLife: life,
        size: random(size * 0.45, size),
        color,
        circle: Math.random() < 0.28
      });
    }
  }

  spawnRing(x, y, radius, maxRadius, color, life) {
    this.rings.push({ x, y, radius, maxRadius, color, life, maxLife: life });
  }

  updateEffects(dt) {
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const particle = this.particles[i];
      particle.life -= dt;
      const drag = Math.exp(-3.5 * dt);
      particle.vx *= drag;
      particle.vy *= drag;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      if (particle.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.rings.length - 1; i >= 0; i -= 1) {
      this.rings[i].life -= dt;
      if (this.rings[i].life <= 0) this.rings.splice(i, 1);
    }
  }

  updateHUD() {
    if (!this.player) return;
    const player = this.player;
    ui.hpText.textContent = `${Math.ceil(player.hp)} / ${player.maxHp}`;
    ui.hpFill.style.width = `${clamp(player.hp / player.maxHp * 100, 0, 100)}%`;
    ui.hpMeter.classList.toggle("low", player.hp / player.maxHp < 0.3);
    ui.waveLabel.textContent = this.wave === 5 ? I18N.t("hud.finalLabel") : I18N.t("hud.waveN", { n: this.wave });
    const remaining = this.spawnRemaining + this.enemies.length;
    ui.waveDetail.textContent = this.intermission > 0 ? I18N.t("hud.cleared") : I18N.t("hud.targets", { n: remaining });
    ui.waveFill.style.width = `${this.intermission > 0 ? 100 : clamp(this.waveKills / this.waveTotal * 100, 0, 100)}%`;
    ui.score.textContent = formatScore(this.score);
    ui.level.textContent = I18N.t("hud.level", { n: this.level });
    ui.xpText.textContent = `${this.xp} / ${this.xpNext}`;
    ui.xpFill.style.width = `${clamp(this.xp / this.xpNext * 100, 0, 100)}%`;
    const boss = this.enemies.find((enemy) => enemy.type === "boss" && !enemy.dead);
    ui.bossHud.hidden = !boss;
    if (boss) {
      ui.bossHp.textContent = `${Math.max(0, Math.ceil(boss.hp))} / ${boss.maxHp}`;
      ui.bossFill.style.width = `${clamp(boss.hp / boss.maxHp * 100, 0, 100)}%`;
    }
    ui.combo.hidden = this.combo < 2 || this.comboTimer <= 0;
    if (!ui.combo.hidden) {
      const multiplier = 1 + Math.min(20, this.combo - 1) * 0.05;
      ui.comboValue.textContent = I18N.t("hud.combo", { n: this.combo });
      ui.comboMultiplier.textContent = I18N.t("hud.comboMult", { m: multiplier.toFixed(2) });
    }
    for (const id of BUFF_IDS) {
      const remaining = player.buffs[id];
      const element = this.buffElements[id];
      element.hidden = remaining <= 0;
      if (remaining > 0) element.querySelector("small").textContent = remaining.toFixed(1);
    }
    const dashRatio = 1 - clamp(player.dashCooldown / player.dashCooldownMax, 0, 1);
    ui.dashFill.style.width = `${dashRatio * 100}%`;
    ui.dashState.textContent = player.dashCooldown <= 0 ? I18N.t("hud.ready") : I18N.t("hud.sec", { s: player.dashCooldown.toFixed(1) });
    ui.mobileDashTime.textContent = player.dashCooldown <= 0 ? I18N.t("hud.ready") : I18N.t("hud.sec", { s: player.dashCooldown.toFixed(1) });
    ui.mobileDash.classList.toggle("cooling", player.dashCooldown > 0);
  }

  render() {
    const context = this.context;
    context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    context.clearRect(0, 0, this.width, this.height);
    this.drawBackground(context);
    if (!this.player) return;
    context.save();
    context.translate(this.width / 2, this.height / 2);
    context.scale(this.zoom, this.zoom);
    if (this.shake > 0) context.translate(random(-this.shake, this.shake), random(-this.shake, this.shake));
    context.translate(-this.camera.x, -this.camera.y);
    this.drawWorldBounds(context);
    this.drawMapFeatures(context);
    this.drawObstacles(context);
    this.drawPowerupPoints(context);
    this.drawPickups(context);
    this.drawPowerups(context);
    this.drawEnemyBullets(context);
    this.drawBullets(context);
    for (const enemy of this.enemies) this.drawEnemy(context, enemy);
    this.drawPlayer(context);
    this.drawEffects(context);
    context.restore();
    this.drawHazardOverlay(context);
    this.drawOffscreenIndicators(context);
    this.drawMinimap();
    if (this.state === "playing" && this.input.pointer.active && !this.input.touchMode) {
      this.drawAimLine(context);
      this.drawCrosshair(context);
    }
  }

  drawBackground(context) {
    context.fillStyle = this.map.bg;
    context.fillRect(0, 0, this.width, this.height);
    for (const star of this.stars) {
      const alpha = 0.16 + (Math.sin(this.backgroundTime * 0.7 + star.phase) + 1) * 0.09;
      const x = ((star.x * this.width - this.camera.x * 0.025) % this.width + this.width) % this.width;
      const y = ((star.y * this.height - this.camera.y * 0.025) % this.height + this.height) % this.height;
      context.globalAlpha = alpha;
      context.fillStyle = "#b9d9e9";
      context.fillRect(x, y, star.size, star.size);
    }
    context.globalAlpha = 1;
    const spacing = 48;
    const left = this.camera.x - this.viewWidth / 2;
    const top = this.camera.y - this.viewHeight / 2;
    context.beginPath();
    for (let worldX = Math.floor(left / spacing) * spacing; worldX < left + this.viewWidth; worldX += spacing) {
      const x = (worldX - left) * this.zoom;
      context.moveTo(x, 0);
      context.lineTo(x, this.height);
    }
    for (let worldY = Math.floor(top / spacing) * spacing; worldY < top + this.viewHeight; worldY += spacing) {
      const y = (worldY - top) * this.zoom;
      context.moveTo(0, y);
      context.lineTo(this.width, y);
    }
    context.strokeStyle = this.map.grid;
    context.lineWidth = 1;
    context.stroke();
  }

  drawMapFeatures(context, compact = false) {
    context.save();
    context.lineWidth = compact ? 12 : 2;
    for (const belt of this.belts) {
      context.fillStyle = belt.direction > 0 ? "rgba(101, 169, 255, 0.12)" : "rgba(100, 251, 210, 0.09)";
      context.fillRect(belt.x, 16, belt.width, this.world.height - 32);
      context.strokeStyle = "rgba(101, 169, 255, 0.28)";
      context.strokeRect(belt.x, 16, belt.width, this.world.height - 32);
      if (!compact) {
        const offset = (this.mapTime * STORM_BELT_SPEED * belt.direction) % 90;
        context.beginPath();
        for (let y = 90 + offset; y < this.world.height - 60; y += 90) {
          const x = belt.x + belt.width / 2;
          context.moveTo(x - 17, y - belt.direction * 10);
          context.lineTo(x, y + belt.direction * 10);
          context.lineTo(x + 17, y - belt.direction * 10);
        }
        context.stroke();
      }
    }
    if (this.map.id === "matrix") {
      context.strokeStyle = "rgba(125, 255, 138, 0.22)";
      context.beginPath();
      for (let x = 200; x < this.world.width; x += 200) {
        context.moveTo(x, 16);
        context.lineTo(x, this.world.height - 16);
      }
      for (let y = 200; y < this.world.height; y += 200) {
        context.moveTo(16, y);
        context.lineTo(this.world.width - 16, y);
      }
      context.stroke();
      if (this.gridEvent) {
        const active = this.gridEvent.state === "active";
        context.fillStyle = active ? "rgba(125, 255, 138, 0.32)" : "rgba(255, 209, 102, 0.12)";
        context.strokeStyle = active ? "#7dff8a" : "#ffd166";
        if (!active) context.setLineDash([14, 12]);
        for (const rect of [
          { x: this.gridEvent.column * 200, y: 16, width: 200, height: this.world.height - 32 },
          { x: 16, y: this.gridEvent.row * 200, width: this.world.width - 32, height: 200 }
        ]) {
          context.fillRect(rect.x, rect.y, rect.width, rect.height);
          context.strokeRect(rect.x + 3, rect.y + 3, rect.width - 6, rect.height - 6);
        }
        context.setLineDash([]);
      }
    }
    const sprayingVent = this.vents.find((vent) => vent.state === "active");
    if (sprayingVent) {
      context.save();
      context.beginPath();
      context.rect(16, 16, this.world.width - 32, this.world.height - 32);
      context.clip();
      context.fillStyle = "rgba(255, 83, 35, 0.24)";
      context.fillRect(16, 16, this.world.width - 32, this.world.height - 32);
      if (!compact) {
        const reach = Math.hypot(this.world.width, this.world.height);
        context.strokeStyle = "rgba(255, 178, 96, 0.18)";
        context.lineWidth = 10;
        for (let i = 0; i < 6; i += 1) {
          const radius = ((1.2 - sprayingVent.time) * 1300 + i * reach / 6) % reach;
          context.beginPath();
          context.arc(sprayingVent.x, sprayingVent.y, Math.max(1, radius), 0, Math.PI * 2);
          context.stroke();
        }
      }
      context.restore();
    }
    this.vents.forEach((vent, index) => {
      const active = vent.state === "active";
      const warning = vent.state === "warning";
      const pulse = (1 + Math.cos((FURNACE_WARNING_TIME - vent.time) * Math.PI * 4)) / 2;
      context.save();
      context.lineWidth = compact ? 16 : warning || active ? 4 : 2;
      context.fillStyle = active ? "rgba(255, 102, 50, 0.65)" : warning ? `rgba(255, 150, 78, ${0.12 + pulse * 0.4})` : "rgba(100, 44, 32, 0.2)";
      context.strokeStyle = active ? "#ffdb94" : warning ? `rgb(255, ${130 + Math.round(pulse * 115)}, ${60 + Math.round(pulse * 100)})` : "#94604c";
      context.beginPath();
      context.arc(vent.x, vent.y, vent.radius, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      if (!compact) {
        context.lineWidth = 2;
        context.beginPath();
        context.arc(vent.x, vent.y, warning ? vent.radius * clamp(1 - vent.time / FURNACE_WARNING_TIME, 0.04, 1) : vent.radius * 0.45, 0, Math.PI * 2);
        context.stroke();
        context.fillStyle = active || warning ? "#ffda90" : "#b27d65";
        for (let i = -1; i <= 1; i += 1) context.fillRect(vent.x - 25, vent.y + i * 13 - 2, 50, 4);
        context.font = "bold 13px system-ui, sans-serif";
        context.textAlign = "center";
        context.fillText(I18N.t("canvas.vent", { n: index + 1 }), vent.x, vent.y - 49);
        if (warning || active) context.fillText(warning ? I18N.t("canvas.ventCountdown", { s: vent.time.toFixed(1) }) : I18N.t("canvas.ventBlasting"), vent.x, vent.y + 60);
      }
      context.restore();
    });
    for (const well of this.wells) {
      context.fillStyle = "rgba(173, 140, 255, 0.07)";
      context.strokeStyle = "rgba(173, 140, 255, 0.25)";
      context.beginPath();
      context.arc(well.x, well.y, 285, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.fillStyle = "#0a0717";
      context.beginPath();
      context.arc(well.x, well.y, 34, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = "#ad8cff";
      context.stroke();
      if (!compact) {
        for (let i = 0; i < 3; i += 1) {
          const angle = this.mapTime * (0.5 + i * 0.12) + i * 2;
          context.beginPath();
          context.arc(well.x, well.y, 55 + i * 48, angle, angle + Math.PI * 1.35);
          context.stroke();
        }
      }
    }
    this.portals.forEach((portal, index) => {
      const color = index === 0 || index === 3 ? "#64fbd2" : "#ad8cff";
      context.strokeStyle = color;
      context.fillStyle = "rgba(100, 251, 210, 0.08)";
      context.beginPath();
      context.arc(portal.x, portal.y, 27, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      if (!compact) {
        context.save();
        context.translate(portal.x, portal.y);
        polygon(context, 4, 15, this.mapTime * 1.2);
        context.stroke();
        if (this.portalCooldown > 0) {
          context.strokeStyle = "#ffd166";
          context.beginPath();
          context.arc(0, 0, 34, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * this.portalCooldown / 3);
          context.stroke();
        }
        context.restore();
      }
    });
    if (this.orbiters.length > 0) {
      context.save();
      context.translate(this.world.width / 2, this.world.height / 2);
      context.strokeStyle = "rgba(255, 209, 102, 0.16)";
      context.lineWidth = compact ? 8 : 2;
      for (const orbit of new Set(this.orbiters.map((orbiter) => orbiter.orbit))) {
        context.beginPath();
        context.arc(0, 0, orbit, 0, Math.PI * 2);
        context.stroke();
      }
      context.restore();
      for (const orbiter of this.orbiters) {
        const position = this.orbiterPosition(orbiter);
        context.fillStyle = "#332d24";
        context.strokeStyle = "#d2aa57";
        context.lineWidth = compact ? 12 : 3;
        context.beginPath();
        context.arc(position.x, position.y, orbiter.radius, 0, Math.PI * 2);
        context.fill();
        context.stroke();
        if (!compact) {
          context.strokeStyle = "rgba(255, 209, 102, 0.5)";
          context.lineWidth = 2;
          context.beginPath();
          context.arc(position.x, position.y, orbiter.radius * 0.48, 0, Math.PI * 2);
          context.stroke();
        }
      }
    }
    if (this.inBossArena) {
      context.save();
      context.translate(this.world.width / 2, this.world.height / 2);
      context.rotate(this.mapTime * 0.12);
      context.strokeStyle = "rgba(255, 209, 102, 0.2)";
      for (const radius of [340, 560, 690]) {
        context.beginPath();
        context.arc(0, 0, radius, 0, Math.PI * 2);
        context.stroke();
      }
      if (!compact) {
        context.fillStyle = "rgba(255, 209, 102, 0.36)";
        for (let i = 0; i < 24; i += 1) {
          context.rotate(Math.PI / 12);
          context.fillRect(680, -3, 20, 6);
        }
      }
      context.restore();
    }
    for (const platform of this.safePlatforms) {
      context.fillStyle = this.inBossArena ? "#302c1c" : "#203431";
      context.strokeStyle = this.inBossArena ? "#ffd166" : "#64fbd2";
      context.fillRect(platform.x, platform.y, platform.width, platform.height);
      context.strokeRect(platform.x, platform.y, platform.width, platform.height);
      if (!compact) {
        context.strokeRect(platform.x + 9, platform.y + 9, platform.width - 18, platform.height - 18);
        context.font = "12px system-ui, sans-serif";
        context.textAlign = "center";
        context.fillStyle = this.inBossArena ? "#ffd166" : "#64fbd2";
        context.fillText(I18N.t(this.inBossArena ? "canvas.laserPlatform" : "canvas.heatPlatform"), platform.x + platform.width / 2, platform.y + platform.height / 2 + 4);
      }
    }
    if (this.wall) {
      const active = this.wall.state === "active";
      context.fillStyle = active ? "rgba(101, 169, 255, 0.22)" : "rgba(101, 169, 255, 0.09)";
      context.fillRect(active ? this.wall.x - 24 : 16, 16, active ? 48 : 64, this.world.height - 32);
      context.strokeStyle = active ? "#c8efff" : "#65a9ff";
      context.lineWidth = compact ? 22 : active ? 5 : 2;
      if (!active) context.setLineDash([18, 14]);
      context.beginPath();
      context.moveTo(this.wall.x, 16);
      context.lineTo(this.wall.x, this.world.height - 16);
      context.stroke();
    }
    context.restore();
  }

  drawHazardOverlay(context) {
    const laserWarning = this.inBossArena && this.laser?.state === "warning";
    const laserActive = this.inBossArena && this.laser?.state === "active";
    const wallWarning = this.wall?.state === "warning";
    const vent = this.map.id === "furnace" ? this.vents[this.ventIndex] : null;
    const furnaceWarning = vent?.state === "warning";
    const furnaceActive = vent?.state === "active";
    const furnaceHazard = furnaceWarning || furnaceActive;
    if (!laserWarning && !laserActive && !wallWarning && !furnaceHazard) return;
    context.save();
    if (laserActive) {
      context.fillStyle = `rgba(255, 222, 151, ${0.08 + this.laser.time * 0.19})`;
      context.fillRect(0, 0, this.width, this.height);
    }
    const color = wallWarning ? "#65a9ff" : furnaceHazard ? "#ffb46a" : "#ffd166";
    context.strokeStyle = color;
    context.lineWidth = laserActive ? 8 : 3;
    context.strokeRect(4, 4, this.width - 8, this.height - 8);
    if (laserWarning || wallWarning || furnaceHazard) {
      const seconds = Math.ceil(furnaceHazard ? vent.time : wallWarning ? this.wall.time : this.laser.time);
      const safe = (laserWarning || furnaceHazard) && this.isOnSafePlatform(this.player);
      let label;
      if (furnaceActive) label = safe ? I18N.t("canvas.furnaceActiveSafe") : I18N.t("canvas.furnaceActiveDanger", { n: this.ventIndex + 1 });
      else if (furnaceWarning) label = safe ? I18N.t("canvas.furnaceWarnSafe", { s: seconds }) : I18N.t("canvas.furnaceWarnDanger", { n: this.ventIndex + 1, s: seconds });
      else label = wallWarning ? I18N.t("canvas.wallWarn", { s: seconds }) : safe ? I18N.t("canvas.laserSafe", { s: seconds }) : I18N.t("canvas.laserDanger", { s: seconds });
      const y = this.height * 0.53;
      context.font = "bold 13px system-ui, sans-serif";
      context.textAlign = "center";
      const textWidth = context.measureText(label).width + 32;
      context.fillStyle = "rgba(5, 10, 18, 0.88)";
      context.fillRect(this.width / 2 - textWidth / 2, y - 19, textWidth, 34);
      context.fillStyle = color;
      context.fillText(label, this.width / 2, y + 3);
      if ((laserWarning || furnaceHazard) && !safe) {
        let nearest = null;
        let nearestDistance = Infinity;
        for (const platform of this.safePlatforms) {
          const point = { x: platform.x + platform.width / 2, y: platform.y + platform.height / 2 };
          const distance = distanceSquared(this.player, point);
          if (distance < nearestDistance) {
            nearest = point;
            nearestDistance = distance;
          }
        }
        const screen = this.worldToScreen(nearest.x, nearest.y);
        const x = clamp(screen.x, 40, this.width - 40);
        const targetY = clamp(screen.y, 155, this.height - 45);
        context.translate(x, targetY);
        context.rotate(Math.atan2(nearest.y - this.player.y, nearest.x - this.player.x));
        context.beginPath();
        context.moveTo(16, 0);
        context.lineTo(-10, -10);
        context.lineTo(-4, 0);
        context.lineTo(-10, 10);
        context.closePath();
        context.fill();
      }
    }
    context.restore();
  }

  drawWorldBounds(context) {
    context.strokeStyle = "rgba(121, 164, 185, 0.28)";
    context.lineWidth = 2;
    context.strokeRect(15, 15, this.world.width - 30, this.world.height - 30);
    context.strokeStyle = "rgba(100, 251, 210, 0.45)";
    context.lineWidth = 3;
    const length = 40;
    for (const [x, y, sx, sy] of [[16, 16, 1, 1], [this.world.width - 16, 16, -1, 1], [16, this.world.height - 16, 1, -1], [this.world.width - 16, this.world.height - 16, -1, -1]]) {
      context.beginPath();
      context.moveTo(x + sx * length, y);
      context.lineTo(x, y);
      context.lineTo(x, y + sy * length);
      context.stroke();
    }
  }

  drawObstacles(context) {
    for (const obstacle of this.obstacles) {
      context.fillStyle = "#152334";
      context.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
      context.strokeStyle = "#385166";
      context.lineWidth = 2;
      context.strokeRect(obstacle.x + 1, obstacle.y + 1, obstacle.width - 2, obstacle.height - 2);
      context.fillStyle = "rgba(255, 209, 102, 0.32)";
      if (obstacle.width > obstacle.height) {
        for (let x = obstacle.x + 12; x < obstacle.x + obstacle.width - 12; x += 28) context.fillRect(x, obstacle.y + 8, 14, 3);
      } else {
        for (let y = obstacle.y + 12; y < obstacle.y + obstacle.height - 12; y += 28) context.fillRect(obstacle.x + 8, y, 3, 14);
      }
      context.fillStyle = "#668297";
      context.fillRect(obstacle.x + 6, obstacle.y + 6, 3, 3);
      context.fillRect(obstacle.x + obstacle.width - 9, obstacle.y + obstacle.height - 9, 3, 3);
    }
  }

  drawPowerupPoints(context) {
    context.save();
    context.strokeStyle = "rgba(173, 140, 255, 0.2)";
    context.lineWidth = 1;
    context.setLineDash([4, 7]);
    for (const point of this.powerupPoints) {
      context.beginPath();
      context.arc(point.x, point.y, 28 + Math.sin(this.backgroundTime * 2) * 2, 0, Math.PI * 2);
      context.stroke();
    }
    context.restore();
  }

  drawPlayer(context) {
    const player = this.player;
    if (player.drones > 0) {
      context.strokeStyle = "rgba(173, 140, 255, 0.12)";
      context.lineWidth = 1;
      context.beginPath();
      context.arc(player.x, player.y, 48, 0, Math.PI * 2);
      context.stroke();
      for (let i = 0; i < player.drones; i += 1) {
        const angle = this.runTime * 2.5 + i * Math.PI * 2 / player.drones;
        const x = player.x + Math.cos(angle) * 48;
        const y = player.y + Math.sin(angle) * 48;
        context.save();
        context.translate(x, y);
        context.rotate(-angle * 1.7);
        polygon(context, 4, 8, Math.PI / 4);
        context.fillStyle = "#ad8cff";
        context.fill();
        context.restore();
      }
    }
    context.save();
    context.translate(player.x, player.y);
    BUFF_IDS.forEach((id, index) => {
      const remaining = player.buffs[id];
      if (remaining <= 0) return;
      const start = index * Math.PI * 2 / BUFF_IDS.length - Math.PI / 2;
      context.strokeStyle = BUFF_DEFS[id].color;
      context.lineWidth = 2;
      context.beginPath();
      context.arc(0, 0, 28, start, start + Math.PI * 2 / BUFF_IDS.length * remaining / BUFF_DEFS[id].duration);
      context.stroke();
    });
    if (player.buffs.shield > 0) {
      context.globalAlpha = 0.45 + Math.sin(this.backgroundTime * 10) * 0.15;
      context.strokeStyle = "#64fbd2";
      context.lineWidth = 2;
      context.beginPath();
      context.arc(0, 0, 23, 0, Math.PI * 2);
      context.stroke();
      context.globalAlpha = 1;
    }
    if (player.invulnerable > 0 && Math.floor(player.invulnerable * 20) % 2 === 0) context.globalAlpha = 0.38;
    if (player.shieldReady) {
      context.strokeStyle = "rgba(101, 169, 255, 0.75)";
      context.lineWidth = 1.5;
      context.setLineDash([5, 5]);
      context.beginPath();
      context.arc(0, 0, 22, this.backgroundTime, this.backgroundTime + Math.PI * 2);
      context.stroke();
      context.setLineDash([]);
    }
    context.rotate(player.facing);
    context.shadowColor = "#64fbd2";
    context.shadowBlur = player.dashTime > 0 ? 22 : 10;
    context.beginPath();
    context.moveTo(19, 0);
    context.lineTo(-12, -11);
    context.lineTo(-7, 0);
    context.lineTo(-12, 11);
    context.closePath();
    context.fillStyle = "#64fbd2";
    context.fill();
    context.shadowBlur = 0;
    context.strokeStyle = "#dcfff6";
    context.lineWidth = 1.2;
    context.stroke();
    context.beginPath();
    context.moveTo(4, 0);
    context.lineTo(-7, -4);
    context.lineTo(-7, 4);
    context.closePath();
    context.fillStyle = "#102c31";
    context.fill();
    context.restore();
  }

  drawEnemy(context, enemy) {
    if (enemy.dead) return;
    if (enemy.elite) {
      context.save();
      context.strokeStyle = "#ffd166";
      context.globalAlpha = 0.55 + Math.sin(this.backgroundTime * 5 + enemy.id) * 0.2;
      context.lineWidth = 2;
      context.setLineDash([5, 5]);
      context.beginPath();
      context.arc(enemy.x, enemy.y, enemy.radius + 8, this.backgroundTime, this.backgroundTime + Math.PI * 2);
      context.stroke();
      context.restore();
    }
    if (enemy.type === "dasher" && enemy.state === "telegraph" && enemy.spawnIn <= 0) {
      context.save();
      context.strokeStyle = `rgba(255, 159, 67, ${0.2 + Math.sin(this.backgroundTime * 24) * 0.12})`;
      context.lineWidth = 2;
      context.setLineDash([8, 8]);
      context.beginPath();
      context.moveTo(enemy.x, enemy.y);
      context.lineTo(enemy.x + Math.cos(enemy.aim) * 500, enemy.y + Math.sin(enemy.aim) * 500);
      context.stroke();
      context.restore();
    }
    if (enemy.spawnIn > 0) {
      context.save();
      context.globalAlpha = 0.35 + Math.sin(this.backgroundTime * 20) * 0.15;
      context.strokeStyle = enemy.color;
      context.lineWidth = 2;
      context.beginPath();
      context.arc(enemy.x, enemy.y, enemy.radius + 12 + Math.sin(this.backgroundTime * 12) * 4, 0, Math.PI * 2);
      context.stroke();
      context.restore();
    }
    context.save();
    context.translate(enemy.x, enemy.y);
    if (enemy.spawnIn > 0) context.globalAlpha = 0.3;
    const color = enemy.flash > 0 ? "#ffffff" : enemy.color;
    context.fillStyle = color;
    context.strokeStyle = color;
    context.lineWidth = 1.5;
    if (enemy.type === "chaser") {
      context.rotate(this.backgroundTime * 0.8 + enemy.id);
      polygon(context, 4, enemy.radius, Math.PI / 4);
      context.fill();
      polygon(context, 4, enemy.radius * 0.46, Math.PI / 4);
      context.fillStyle = "#351a29";
      context.fill();
    } else if (enemy.type === "shooter") {
      const angle = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
      context.rotate(angle);
      polygon(context, 6, enemy.radius, Math.PI / 6);
      context.fill();
      context.fillStyle = "#392f1c";
      polygon(context, 6, enemy.radius * 0.58, Math.PI / 6);
      context.fill();
      context.strokeStyle = color;
      context.lineWidth = enemy.attackTimer < 0.35 ? 5 : 3;
      context.beginPath();
      context.moveTo(4, 0);
      context.lineTo(enemy.radius + 8, 0);
      context.stroke();
    } else if (enemy.type === "dasher") {
      const angle = enemy.state === "hunt" ? Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x) : enemy.aim;
      context.rotate(angle);
      context.beginPath();
      context.moveTo(enemy.radius + 3, 0);
      context.lineTo(-enemy.radius, -enemy.radius * 0.78);
      context.lineTo(-enemy.radius * 0.5, 0);
      context.lineTo(-enemy.radius, enemy.radius * 0.78);
      context.closePath();
      context.fill();
      context.fillStyle = "#3a2410";
      context.fillRect(-5, -3, 10, 6);
    } else if (enemy.type === "splitter") {
      context.rotate(this.backgroundTime * 0.35);
      polygon(context, 6, enemy.radius);
      context.fill();
      context.rotate(-this.backgroundTime * 1.2);
      polygon(context, 4, enemy.radius * 0.52, Math.PI / 4);
      context.fillStyle = "#172b49";
      context.fill();
    } else if (enemy.type === "mite") {
      context.rotate(this.backgroundTime * 2 + enemy.id);
      polygon(context, 4, enemy.radius, Math.PI / 4);
      context.fill();
    } else if (enemy.type === "boss") {
      if (enemy.charge > 0) {
        const ratio = 1 - enemy.charge / 0.68;
        context.strokeStyle = `rgba(255, 97, 120, ${0.35 + ratio * 0.6})`;
        context.lineWidth = 3;
        context.beginPath();
        context.arc(0, 0, enemy.radius + 32 - ratio * 22, 0, Math.PI * 2);
        context.stroke();
      }
      context.rotate(this.backgroundTime * 0.3);
      context.strokeStyle = color;
      context.lineWidth = 5;
      context.beginPath();
      context.arc(0, 0, enemy.radius, 0, Math.PI * 2);
      context.stroke();
      for (let i = 0; i < 6; i += 1) {
        context.rotate(Math.PI / 3);
        context.fillStyle = color;
        context.fillRect(enemy.radius - 5, -4, 16, 8);
      }
      context.rotate(-this.backgroundTime * 1.1);
      polygon(context, 6, 26, Math.PI / 6);
      context.fillStyle = "#391927";
      context.fill();
      context.strokeStyle = color;
      context.lineWidth = 2;
      context.stroke();
      context.beginPath();
      context.arc(0, 0, 10 + Math.sin(this.backgroundTime * 4) * 2, 0, Math.PI * 2);
      context.fillStyle = color;
      context.fill();
    }
    context.restore();
    if (enemy.hp < enemy.maxHp && enemy.type !== "boss") {
      const width = enemy.radius * 2;
      context.fillStyle = "rgba(5, 9, 16, 0.65)";
      context.fillRect(enemy.x - width / 2, enemy.y - enemy.radius - 10, width, 3);
      context.fillStyle = enemy.color;
      context.fillRect(enemy.x - width / 2, enemy.y - enemy.radius - 10, width * clamp(enemy.hp / enemy.maxHp, 0, 1), 3);
    }
  }

  drawBullets(context) {
    context.lineCap = "round";
    for (const bullet of this.bullets) {
      context.strokeStyle = bullet.critical ? "rgba(255, 209, 102, 0.65)" : "rgba(100, 251, 210, 0.5)";
      context.lineWidth = bullet.radius * 1.2;
      context.beginPath();
      context.moveTo(bullet.x - bullet.vx * 0.025, bullet.y - bullet.vy * 0.025);
      context.lineTo(bullet.x, bullet.y);
      context.stroke();
      context.fillStyle = bullet.critical ? "#ffd166" : "#dffff7";
      context.beginPath();
      context.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
      context.fill();
    }
  }

  drawEnemyBullets(context) {
    for (const bullet of this.enemyBullets) {
      context.strokeStyle = bullet.color;
      context.globalAlpha = 0.25;
      context.lineWidth = 2;
      context.beginPath();
      context.arc(bullet.x, bullet.y, bullet.radius + 4, 0, Math.PI * 2);
      context.stroke();
      context.globalAlpha = 1;
      context.fillStyle = bullet.color;
      context.beginPath();
      context.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
      context.fill();
    }
  }

  drawPickups(context) {
    for (const pickup of this.pickups) {
      if (pickup.life < 3 && Math.floor(pickup.life * 8) % 2 === 0) continue;
      context.save();
      context.translate(pickup.x, pickup.y + Math.sin(pickup.phase) * 2);
      if (pickup.type === "xp") {
        context.rotate(pickup.phase * 0.6);
        polygon(context, 4, 6, Math.PI / 4);
        context.fillStyle = "#ad8cff";
        context.fill();
        polygon(context, 4, 2.5, Math.PI / 4);
        context.fillStyle = "#f0eaff";
        context.fill();
      } else {
        context.fillStyle = "#ff7186";
        context.fillRect(-3, -8, 6, 16);
        context.fillRect(-8, -3, 16, 6);
      }
      context.restore();
    }
  }

  drawPowerups(context) {
    for (const powerup of this.powerups) {
      if (powerup.life < 3 && Math.floor(powerup.life * 8) % 2 === 0) continue;
      const definition = BUFF_DEFS[powerup.buffId];
      context.save();
      context.translate(powerup.x, powerup.y + Math.sin(powerup.phase) * 3);
      context.globalAlpha = 0.28;
      context.strokeStyle = definition.color;
      context.lineWidth = 2;
      context.beginPath();
      context.arc(0, 0, 22 + Math.sin(powerup.phase * 1.4) * 3, 0, Math.PI * 2);
      context.stroke();
      context.globalAlpha = 1;
      polygon(context, 6, 16, powerup.phase * 0.2);
      context.fillStyle = "#101c2a";
      context.fill();
      context.strokeStyle = definition.color;
      context.stroke();
      context.fillStyle = definition.color;
      context.strokeStyle = definition.color;
      context.lineWidth = 2;
      if (powerup.buffId === "shield") {
        context.beginPath();
        context.arc(0, 0, 7, 0, Math.PI * 2);
        context.stroke();
      } else if (powerup.buffId === "double") {
        context.fillRect(-6, -7, 4, 14);
        context.fillRect(2, -7, 4, 14);
      } else if (powerup.buffId === "storm") {
        for (let i = -1; i <= 1; i += 1) context.fillRect(-7, i * 5 - 1, 14, 2);
      } else if (powerup.buffId === "engine") {
        context.beginPath();
        context.moveTo(8, 0);
        context.lineTo(-6, -7);
        context.lineTo(-2, 0);
        context.lineTo(-6, 7);
        context.closePath();
        context.fill();
      } else if (powerup.buffId === "magnet") {
        context.beginPath();
        context.arc(0, 0, 7, 0.25, Math.PI * 1.75);
        context.stroke();
        context.fillRect(-2, -2, 4, 4);
      } else {
        context.beginPath();
        context.moveTo(-8, -6); context.lineTo(-1, 0); context.lineTo(-8, 6);
        context.moveTo(1, -6); context.lineTo(8, 0); context.lineTo(1, 6);
        context.stroke();
      }
      context.restore();
    }
  }

  drawOffscreenIndicators(context) {
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    for (const enemy of this.enemies) {
      if (enemy.dead || (!enemy.elite && enemy.type !== "boss")) continue;
      const screen = this.worldToScreen(enemy.x, enemy.y);
      if (screen.x > 35 && screen.x < this.width - 35 && screen.y > 35 && screen.y < this.height - 35) continue;
      const dx = screen.x - centerX;
      const dy = screen.y - centerY;
      const scaleX = dx === 0 ? Infinity : (centerX - 46) / Math.abs(dx);
      const scaleY = dy === 0 ? Infinity : (centerY - 46) / Math.abs(dy);
      const scale = Math.min(scaleX, scaleY);
      const x = centerX + dx * scale;
      const y = centerY + dy * scale;
      const color = enemy.type === "boss" ? "#ff6178" : "#ffd166";
      context.save();
      context.translate(x, y);
      context.rotate(Math.atan2(dy, dx));
      context.globalAlpha = 0.65 + Math.sin(this.backgroundTime * 6) * 0.2;
      context.fillStyle = color;
      context.beginPath();
      context.moveTo(12, 0);
      context.lineTo(-7, -7);
      context.lineTo(-3, 0);
      context.lineTo(-7, 7);
      context.closePath();
      context.fill();
      context.restore();
    }
  }

  drawMinimap() {
    const canvas = ui.minimapCanvas;
    const context = this.minimapContext;
    const scaleX = canvas.width / this.world.width;
    const scaleY = canvas.height / this.world.height;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = this.map.bg;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.save();
    context.scale(scaleX, scaleY);
    this.drawMapFeatures(context, true);
    context.restore();
    context.fillStyle = "#263b4d";
    for (const obstacle of this.obstacles) context.fillRect(obstacle.x * scaleX, obstacle.y * scaleY, Math.max(1, obstacle.width * scaleX), Math.max(1, obstacle.height * scaleY));
    context.fillStyle = "rgba(173, 140, 255, 0.35)";
    for (const point of this.powerupPoints) context.fillRect(point.x * scaleX - 1, point.y * scaleY - 1, 2, 2);
    for (const powerup of this.powerups) {
      context.fillStyle = BUFF_DEFS[powerup.buffId].color;
      context.beginPath();
      context.arc(powerup.x * scaleX, powerup.y * scaleY, 2.3, 0, Math.PI * 2);
      context.fill();
    }
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      context.fillStyle = enemy.type === "boss" ? "#ff6178" : enemy.elite ? "#ffd166" : "rgba(255, 97, 120, 0.5)";
      context.beginPath();
      context.arc(enemy.x * scaleX, enemy.y * scaleY, enemy.type === "boss" ? 4 : enemy.elite ? 3 : 1.4, 0, Math.PI * 2);
      context.fill();
    }
    context.strokeStyle = "rgba(220, 240, 250, 0.25)";
    context.lineWidth = 1;
    const viewLeft = Math.max(0, this.camera.x - this.viewWidth / 2);
    const viewTop = Math.max(0, this.camera.y - this.viewHeight / 2);
    const viewRight = Math.min(this.world.width, this.camera.x + this.viewWidth / 2);
    const viewBottom = Math.min(this.world.height, this.camera.y + this.viewHeight / 2);
    context.strokeRect(viewLeft * scaleX, viewTop * scaleY, (viewRight - viewLeft) * scaleX, (viewBottom - viewTop) * scaleY);
    context.fillStyle = "#64fbd2";
    context.beginPath();
    context.arc(this.player.x * scaleX, this.player.y * scaleY, 3, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "#e8fffa";
    context.stroke();
  }

  drawEffects(context) {
    for (const ring of this.rings) {
      const progress = 1 - ring.life / ring.maxLife;
      context.globalAlpha = (1 - progress) * 0.75;
      context.strokeStyle = ring.color;
      context.lineWidth = 2;
      context.beginPath();
      context.arc(ring.x, ring.y, ring.radius + (ring.maxRadius - ring.radius) * progress, 0, Math.PI * 2);
      context.stroke();
    }
    for (const particle of this.particles) {
      context.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
      context.fillStyle = particle.color;
      if (particle.circle) {
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size * 0.5, 0, Math.PI * 2);
        context.fill();
      } else context.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
    }
    context.globalAlpha = 1;
  }

  drawAimLine(context) {
    const player = this.player;
    const angle = this.getAimAngle();
    const ux = Math.cos(angle);
    const uy = Math.sin(angle);
    const nose = player.radius + 8;
    const start = this.worldToScreen(player.x + ux * nose, player.y + uy * nose);
    let t = Infinity;
    if (ux > 0.0001) t = Math.min(t, (this.width - start.x) / ux);
    else if (ux < -0.0001) t = Math.min(t, -start.x / ux);
    if (uy > 0.0001) t = Math.min(t, (this.height - start.y) / uy);
    else if (uy < -0.0001) t = Math.min(t, -start.y / uy);
    t = Math.max(t, 0);
    const end = { x: start.x + ux * t, y: start.y + uy * t };
    const pointer = this.input.pointer;
    const worldPointer = this.screenToWorld(pointer.x, pointer.y);
    const locked = this.enemies.some((enemy) => !enemy.dead && (enemy.x - worldPointer.x) ** 2 + (enemy.y - worldPointer.y) ** 2 < (enemy.radius + 8) ** 2);
    const rgb = locked ? "255, 209, 102" : "100, 251, 210";
    const distToPointer = Math.hypot(pointer.x - start.x, pointer.y - start.y);
    const segment = Math.min(distToPointer, t);
    context.save();
    context.setLineDash([4, 6]);
    context.lineWidth = 1;
    context.strokeStyle = `rgba(${rgb}, 0.45)`;
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.lineTo(start.x + ux * segment, start.y + uy * segment);
    context.stroke();
    if (distToPointer < t) {
      const gradient = context.createLinearGradient(pointer.x, pointer.y, end.x, end.y);
      gradient.addColorStop(0, `rgba(${rgb}, 0.45)`);
      gradient.addColorStop(1, `rgba(${rgb}, 0)`);
      context.strokeStyle = gradient;
      context.lineDashOffset = -(segment % 10);
      context.beginPath();
      context.moveTo(pointer.x, pointer.y);
      context.lineTo(end.x, end.y);
      context.stroke();
    }
    context.restore();
  }

  drawCrosshair(context) {
    const { x, y } = this.input.pointer;
    const worldPointer = this.screenToWorld(x, y);
    const locked = this.enemies.some((enemy) => !enemy.dead && (enemy.x - worldPointer.x) ** 2 + (enemy.y - worldPointer.y) ** 2 < (enemy.radius + 8) ** 2);
    context.strokeStyle = locked ? "#ffd166" : "rgba(100, 251, 210, 0.8)";
    context.lineWidth = 1.2;
    context.beginPath();
    context.arc(x, y, 8, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.moveTo(x - 14, y); context.lineTo(x - 6, y);
    context.moveTo(x + 6, y); context.lineTo(x + 14, y);
    context.moveTo(x, y - 14); context.lineTo(x, y - 6);
    context.moveTo(x, y + 6); context.lineTo(x, y + 14);
    context.stroke();
  }
}

const game = new Game();
