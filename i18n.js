const I18N = {
  lang: "zh",
  zh: {},
  en: {},

  init() {
    let saved = null;
    try {
      saved = localStorage.getItem("star-ring-lang");
    } catch {}
    if (saved === "zh" || saved === "en") {
      this.lang = saved;
    } else {
      this.lang = (navigator.language || "").toLowerCase().startsWith("zh") ? "zh" : "en";
    }
    document.querySelectorAll("[data-en]").forEach((el) => {
      el.dataset.zh = el.textContent;
    });
    document.querySelectorAll("[data-en-aria]").forEach((el) => {
      el.dataset.zhAria = el.getAttribute("aria-label") || "";
    });
    document.querySelectorAll("[data-en-title]").forEach((el) => {
      el.dataset.zhTitle = el.getAttribute("title") || "";
    });
    this.apply();
  },

  resolve(dict, key) {
    let value = dict;
    for (const part of key.split(".")) {
      if (value == null || typeof value !== "object") return undefined;
      value = value[part];
    }
    return value;
  },

  t(key, params) {
    const value = (this.resolve(this[this.lang], key) ?? this.resolve(this.zh, key) ?? this.resolve(this.en, key)) || key;
    if (!params) return value;
    return value.replace(/\{(\w+)\}/g, (match, name) => (name in params ? params[name] : match));
  },

  apply() {
    const lang = this.lang;
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    document.title = this.t("title");
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.content = this.t("metaDesc");
    document.querySelectorAll("[data-en]").forEach((el) => {
      el.textContent = lang === "zh" ? el.dataset.zh : el.dataset.en;
    });
    document.querySelectorAll("[data-en-aria]").forEach((el) => {
      el.setAttribute("aria-label", lang === "zh" ? el.dataset.zhAria : el.dataset.enAria);
    });
    document.querySelectorAll("[data-en-title]").forEach((el) => {
      el.setAttribute("title", lang === "zh" ? el.dataset.zhTitle : el.dataset.enTitle);
    });
  },

  setLang(lang) {
    this.lang = lang;
    try {
      localStorage.setItem("star-ring-lang", lang);
    } catch {}
    this.apply();
  }
};

I18N.zh = {
  title: "星环突围",
  metaDesc: "星环突围：一款包含五波战斗、随机强化与首领战的原创网页街机游戏。",
  hud: {
    on: "开启", off: "关闭",
    pause: "暂停", resume: "继续",
    level: "同步等级 {n}",
    combo: "{n} 连击",
    comboMult: "得分 ×{m}",
    ready: "就绪",
    sec: "{s}s",
    waveN: "第 {n} 波",
    finalLabel: "最终波 · 首领战",
    cleared: "区域已清理",
    targets: "{n} 个目标",
    boss: "星环监管者",
    ventSoon: "{n}号喷口即将全场喷射，前往隔热平台",
    ventActive: "{n}号喷口正在全场喷射，隔热平台外危险",
    wallSoon: "能量墙即将横扫，准备冲刺穿越",
    matrixSoon: "矩阵行列即将通电",
    laserSoon: "全图激光充能，前往金色防御平台",
    bossDropped: "首领掉落了临时强化",
    chooseUpgrade: "同步等级提升，请选择一项强化",
    chosenUpgrade: "已选择{name}，继续战斗",
    paused: "游戏已暂停",
    resumed: "继续战斗",
    backHome: "已返回主页",
    gotBuff: "获得{name}，持续{s}秒",
    announceJoin: "，"
  },
  wave: {
    final: "最终波",
    finalSub: "击毁监管者并清除所有敌人",
    sub1: "清除所有追击单位",
    sub2: "注意远程火力",
    sub3: "避开蓄力冲刺",
    sub4: "稳住阵线，迎接监管者"
  },
  announce: {
    sectorCleared: "星域已清理",
    sectorClearedSub: "星环恢复稳定",
    zoneCleared: "区域清理",
    zoneClearedSub: "船体修复 +20 · 准备下一波",
    bossDown: "监管者已击毁",
    bossDownSub: "清除剩余敌人即可突围"
  },
  result: {
    victory: "突围成功",
    victorySub: "星环已突破，星域重新回应你的信号。",
    defeat: "突围失败",
    defeatSub: "抵达第 {n} 波，调整构筑后再次挑战。"
  },
  toast: {
    buff: "{name} · {s} 秒"
  },
  canvas: {
    vent: "喷口 {n}",
    ventCountdown: "{s}s 后全场喷射",
    ventBlasting: "全场喷射中",
    laserPlatform: "激光防御平台",
    heatPlatform: "隔热安全平台",
    furnaceActiveSafe: "全场喷射中 · 隔热平台保护中",
    furnaceActiveDanger: "{n}号喷口全场喷射 · 前往隔热平台",
    furnaceWarnSafe: "隔热平台已就位 · {s}s 后喷射",
    furnaceWarnDanger: "{n}号喷口 {s}s · 前往隔热平台",
    wallWarn: "能量墙 {s}s · 冲刺穿越",
    laserSafe: "防御平台已就位 · {s}s",
    laserDanger: "全图激光 {s}s · 前往金色平台"
  },
  map: {
    harbor: { name: "星港残骸", desc: "四组静态残骸掩体，无额外危险，熟悉战斗节奏。" },
    dock: { name: "回旋船坞", desc: "内中外三圈共 15 个圆形障碍绕中心旋转，中心留空，强化点绕场移动。" },
    furnace: { name: "熔炉核心", desc: "六个喷口轮流全场喷射，喷前闪烁预警 6 秒，隔热平台内安全。" },
    gravity: { name: "重力井", desc: "四口引力井牵引单位、弯折弹道，传送门连接对角。" },
    storm: { name: "风暴航道", desc: "传送带改变移速，能量墙横扫全图，每轮波及约三分之一敌人。" },
    matrix: { name: "霓虹矩阵", desc: "随机行列通电形成电墙，强化在安全格刷新，无掩体挑战。" },
    core: { name: "星环之核", desc: "" },
    random: { name: "随机星域", desc: "随机进入一张地图，挑战未知地形。" },
    unknown: "未知",
    cleared: "已通关"
  },
  buff: {
    shield: "能量护盾",
    double: "双倍火力",
    storm: "弹幕风暴",
    engine: "超频引擎",
    magnet: "引力核心",
    slow: "时间滞缓"
  },
  upg: {
    damage: { name: "高能弹芯", desc: "弹丸伤害提高 25%" },
    rapid: { name: "超频扳机", desc: "射击速度提高 18%" },
    multi: { name: "分岔协议", desc: "每次额外发射 1 枚弹丸" },
    pierce: { name: "穿透弹体", desc: "弹丸额外穿透 1 个目标" },
    bounce: { name: "镜面弹道", desc: "弹丸增加 1 次墙面弹射" },
    speed: { name: "轻量引擎", desc: "移动速度提高 12%" },
    range: { name: "射程增幅", desc: "弹丸射程提高 25%" },
    vitality: { name: "备用船体", desc: "最大船体增加 25，并修复 25" },
    crit: { name: "弱点解析", desc: "暴击率提高 12%，暴击造成双倍伤害" },
    magnet: { name: "引力采集器", desc: "能量与修复核心的拾取范围提高 45%" },
    dash: { name: "相位增幅", desc: "冲刺冷却缩短 18%，撞击伤害增加 6，撞敌仍会受伤" },
    drone: { name: "环绕利刃", desc: "增加 1 枚环绕刃，持续切割附近敌人" },
    shield: { name: "再生护盾", desc: "获得可抵挡一次伤害的护盾，每 12 秒再生" }
  }
};

I18N.en = {
  title: "Star Ring Breakout",
  metaDesc: "Star Ring Breakout: an original web arcade game with five waves, random upgrades, and a boss fight.",
  hud: {
    on: "ON", off: "OFF",
    pause: "Pause", resume: "Resume",
    level: "SYNC LV {n}",
    combo: "{n} COMBO",
    comboMult: "SCORE ×{m}",
    ready: "READY",
    sec: "{s}s",
    waveN: "WAVE {n}",
    finalLabel: "FINAL WAVE · BOSS",
    cleared: "SECTOR CLEARED",
    targets: "{n} TARGETS",
    boss: "Ring Warden",
    ventSoon: "Vent {n} about to blast — get to an insulated platform",
    ventActive: "Vent {n} blasting — danger outside insulated platforms",
    wallSoon: "Energy wall incoming — prepare to dash through",
    matrixSoon: "Matrix rows about to energize",
    laserSoon: "Arena laser charging — get to a golden platform",
    bossDropped: "The Warden dropped a timed boost",
    chooseUpgrade: "Sync level up — choose an upgrade",
    chosenUpgrade: "{name} selected — fight on",
    paused: "GAME PAUSED",
    resumed: "FIGHT ON",
    backHome: "RETURNED TO MENU",
    gotBuff: "{name} acquired, lasts {s}s",
    announceJoin: ", "
  },
  wave: {
    final: "FINAL WAVE",
    finalSub: "Destroy the Warden and clear all enemies",
    sub1: "Clear all pursuing units",
    sub2: "Watch the ranged fire",
    sub3: "Evade the charged dashes",
    sub4: "Hold the line — the Warden awaits"
  },
  announce: {
    sectorCleared: "SECTOR CLEARED",
    sectorClearedSub: "The Ring has stabilized",
    zoneCleared: "ZONE CLEARED",
    zoneClearedSub: "HULL REPAIRED +20 · PREPARE FOR NEXT WAVE",
    bossDown: "WARDEN DESTROYED",
    bossDownSub: "Clear remaining enemies to break out"
  },
  result: {
    victory: "BREAKOUT SUCCESSFUL",
    victorySub: "The Ring is broken — the sector answers your signal again.",
    defeat: "BREAKOUT FAILED",
    defeatSub: "Reached wave {n} — adjust your build and try again."
  },
  toast: {
    buff: "{name} · {s}s"
  },
  canvas: {
    vent: "VENT {n}",
    ventCountdown: "FULL BLAST IN {s}s",
    ventBlasting: "BLASTING",
    laserPlatform: "LASER DEFENSE PLATFORM",
    heatPlatform: "INSULATED PLATFORM",
    furnaceActiveSafe: "BLASTING · PLATFORM SHIELDED",
    furnaceActiveDanger: "VENT {n} BLASTING · GET TO A PLATFORM",
    furnaceWarnSafe: "ON PLATFORM · BLAST IN {s}s",
    furnaceWarnDanger: "VENT {n} {s}s · GET TO A PLATFORM",
    wallWarn: "WALL {s}s · DASH THROUGH",
    laserSafe: "ON PLATFORM · {s}s",
    laserDanger: "LASER {s}s · GET TO GOLD PLATFORM"
  },
  map: {
    harbor: { name: "Harbor Ruins", desc: "Four static wreckage barricades, no extra hazards — learn the combat rhythm here." },
    dock: { name: "Rotary Docks", desc: "15 round obstacles in three rings rotate around the center; the middle stays open and a boost point circles the map." },
    furnace: { name: "Furnace Core", desc: "Six vents blast the whole map in turns, with a 6-second flashing warning; insulated platforms are safe." },
    gravity: { name: "Gravity Wells", desc: "Four wells drag units and bend bullet paths; portals link opposite corners." },
    storm: { name: "Storm Lane", desc: "Conveyor belts change your speed; energy walls sweep the map, catching about a third of enemies each pass." },
    matrix: { name: "Neon Matrix", desc: "Random rows and columns energize into electric walls; boosts spawn in safe cells, and there is no cover." },
    core: { name: "Ring Core", desc: "" },
    random: { name: "Random Sector", desc: "Enter a random map and face the unknown." },
    unknown: "???",
    cleared: "CLEARED"
  },
  buff: {
    shield: "Energy Shield",
    double: "Double Fire",
    storm: "Bullet Storm",
    engine: "Overclock Engine",
    magnet: "Gravity Core",
    slow: "Time Dilation"
  },
  upg: {
    damage: { name: "Heavy Core", desc: "Bullet damage +25%" },
    rapid: { name: "Overclocked Trigger", desc: "Fire rate +18%" },
    multi: { name: "Split Protocol", desc: "Fire 1 extra bullet per shot" },
    pierce: { name: "Piercing Rounds", desc: "Bullets pierce 1 extra target" },
    bounce: { name: "Mirror Trajectory", desc: "Bullets bounce off walls 1 extra time" },
    speed: { name: "Lightweight Engine", desc: "Move speed +12%" },
    range: { name: "Range Amplifier", desc: "Bullet range +25%" },
    vitality: { name: "Reserve Hull", desc: "Max hull +25 and repair 25" },
    crit: { name: "Weakpoint Analysis", desc: "Crit chance +12%, crits deal double damage" },
    magnet: { name: "Gravity Collector", desc: "Pickup range for energy and repairs +45%" },
    dash: { name: "Phase Amplifier", desc: "Dash cooldown -18%, impact damage +6; ramming still hurts you" },
    drone: { name: "Orbital Blade", desc: "Gain 1 orbiting blade that cuts nearby enemies" },
    shield: { name: "Regenerative Shield", desc: "Gain a shield that blocks one hit and recharges every 12s" }
  }
};

I18N.init();
