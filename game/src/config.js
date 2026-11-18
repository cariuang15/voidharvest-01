// VOIDHARVEST — every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 16,
  speed: 320,
  accel: 2600,
  hull: 100,
  fireInterval: 0.16,
  bulletSpeed: 720,
  bulletDamage: 12,
  bulletRadius: 5,
  dashSpeed: 980,
  dashTime: 0.16,
  dashCooldown: 1.6,
  magnet: 110,
  invulnerable: 1.0,
};

export const ENEMY = {
  drifter: { radius: 20, hp: 22, speed: 95, damage: 10, score: 50, shards: 2, color: '#ff5d73' },
  weaver: { radius: 18, hp: 16, speed: 70, damage: 10, score: 80, shards: 3, color: '#c77dff' },
  splitter: { radius: 24, hp: 34, speed: 70, damage: 14, score: 100, shards: 3, color: '#ffb703' },
  mini: { radius: 10, hp: 8, speed: 150, damage: 8, score: 30, shards: 1, color: '#ffd166' },
  stinger: { radius: 17, hp: 26, speed: 62, damage: 12, score: 120, shards: 3, color: '#ff8c42' },
  charger: { radius: 19, hp: 40, speed: 78, damage: 16, score: 130, shards: 3, color: '#b8ff29' },
  boss: { radius: 64, hp: 900, speed: 46, damage: 22, score: 2000, shards: 40, color: '#ff2e63' },
};

export const BULLET = {
  enemySpeed: 280,
  enemyRadius: 7,
  enemyDamage: 10,
};

/** The NOVA blast: kills charge it, Q detonates it. */
export const NOVA = {
  chargeMax: 100,
  perKill: 8, // kills to a full charge: 13
  damage: 150,
  radius: 9999, // hits every enemy on the field
};

export const WAVE = {
  /** Seconds of calm between waves while the upgrade draft is open. */
  draftSeconds: 9999, // the draft waits for the player; the timer is only a display cap
  bannerSeconds: 2.2,
  baseCount: 10,
  countPerWave: 4,
  maxAlive: 40,
  spawnInterval: 0.62,
  spawnIntervalMin: 0.24,
  eliteChance: 0.08,
  eliteHpMult: 3.2,
  eliteShardMult: 3,
  hpPerWave: 0.09,
  speedPerWave: 0.02,
};

export const COMBO = {
  window: 3.0,
  step: 0.1, // +10% score per chained kill, capped below
  maxMult: 4.0,
};

export const SHARD = {
  value: 10, // score per shard banked at wave end
  magnetSpeed: 420,
  life: 9,
};

/** How many of each thing can exist at once; pools are allocated once, at boot. */
export const POOL = { bullets: 256, enemies: 96, shards: 220, particles: 700, texts: 48 };

export const PALETTE = {
  backdrop: '#05060f',
  nebulaA: '#1b1040',
  nebulaB: '#0b2b3a',
  nebulaC: '#3a0b2e',
  grid: 'rgba(120, 140, 255, 0.05)',
  player: '#4de8ff',
  playerCore: '#eafcff',
  bullet: '#aef3ff',
  shard: '#ffe066',
  nova: '#b8ff29',
  novaReady: '#eaffb0',
  text: '#eef4ff',
  muted: '#8b93b8',
  danger: '#ff5d73',
  heal: '#7dff9e',
  panel: 'rgba(10, 14, 32, 0.88)',
  panelEdge: 'rgba(120, 160, 255, 0.35)',
};

export const FONT = '"Segoe UI", system-ui, -apple-system, sans-serif';
export const FONT_DISPLAY = '"Arial Black", "Segoe UI", system-ui, sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'voidharvest.best';
export const BEST_WAVE_KEY = 'voidharvest.bestWave';
