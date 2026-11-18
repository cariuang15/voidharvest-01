// The moving things: the player's ship, both kinds of bullet, the enemies and
// the starshards they drop. Plain objects in fixed pools, no classes, so the
// world can reset them in one pass.
import { BULLET, ENEMY, FIELD, PLAYER, POOL, SHARD } from './config.js';

export function createEntities() {
  const playerBullets = [];
  for (let i = 0; i < POOL.bullets; i += 1) {
    playerBullets.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, damage: 0, radius: 5, pierce: 0, life: 0 });
  }
  const enemyBullets = [];
  for (let i = 0; i < POOL.bullets; i += 1) {
    enemyBullets.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, damage: BULLET.enemyDamage, radius: BULLET.enemyRadius, life: 0 });
  }
  const enemies = [];
  for (let i = 0; i < POOL.enemies; i += 1) {
    enemies.push({
      active: false, kind: 'drifter', x: 0, y: 0, vx: 0, vy: 0, hp: 1, maxHp: 1,
      radius: 18, speed: 90, damage: 10, score: 50, shards: 2, color: '#fff',
      elite: false, t: 0, fireTimer: 0, phase: 0, flash: 0, shield: 0, maxShield: 0,
      mode: 'stalk', modeTimer: 0, lockX: 0, lockY: 0,
    });
  }
  const shards = [];
  for (let i = 0; i < POOL.shards; i += 1) {
    shards.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, value: 1, magnet: false });
  }
  let bulletCursor = 0;
  let enemyBulletCursor = 0;
  let enemyCursor = 0;
  let shardCursor = 0;

  return {
    playerBullets,
    enemyBullets,
    enemies,
    shards,

    spawnPlayerBullet(x, y, angle, damage, radius, pierce, speed = PLAYER.bulletSpeed) {
      const b = playerBullets[bulletCursor];
      bulletCursor = (bulletCursor + 1) % playerBullets.length;
      b.active = true;
      b.x = x;
      b.y = y;
      b.vx = Math.cos(angle) * speed;
      b.vy = Math.sin(angle) * speed;
      b.damage = damage;
      b.radius = radius;
      b.pierce = pierce;
      b.life = 1.6;
    },

    spawnEnemyBullet(x, y, angle, damage = BULLET.enemyDamage) {
      const b = enemyBullets[enemyBulletCursor];
      enemyBulletCursor = (enemyBulletCursor + 1) % enemyBullets.length;
      b.active = true;
      b.x = x;
      b.y = y;
      b.vx = Math.cos(angle) * BULLET.enemySpeed;
      b.vy = Math.sin(angle) * BULLET.enemySpeed;
      b.damage = damage;
      b.radius = BULLET.enemyRadius;
      b.life = 5;
    },

    spawnEnemy(kind, x, y, wave, elite, rng) {
      const base = ENEMY[kind];
      const e = enemies[enemyCursor];
      enemyCursor = (enemyCursor + 1) % enemies.length;
      const hpMult = (1 + (wave - 1) * 0.09) * (elite ? 3.2 : 1);
      e.active = true;
      e.kind = kind;
      e.x = x;
      e.y = y;
      e.vx = 0;
      e.vy = 0;
      e.maxHp = Math.round(base.hp * hpMult);
      e.hp = e.maxHp;
      e.radius = base.radius * (elite ? 1.45 : 1);
      e.speed = base.speed * (1 + (wave - 1) * 0.02) * rng.range(0.9, 1.1);
      e.damage = base.damage;
      e.score = base.score * (elite ? 3 : 1);
      e.shards = base.shards * (elite ? 3 : 1);
      e.color = base.color;
      e.elite = elite;
      e.shield = base.shield ?? 0;
      e.maxShield = e.shield;
      e.t = 0;
      e.fireTimer = rng.range(1.2, 2.6);
      e.phase = rng.angle();
      e.flash = 0;
      e.mode = 'stalk';
      e.modeTimer = rng.range(0.4, 1.2);
      e.lockX = 0;
      e.lockY = 0;
      return e;
    },

    spawnShard(x, y, value, rng) {
      const s = shards[shardCursor];
      shardCursor = (shardCursor + 1) % shards.length;
      const a = rng.angle();
      const sp = rng.range(40, 160);
      s.active = true;
      s.x = x;
      s.y = y;
      s.vx = Math.cos(a) * sp;
      s.vy = Math.sin(a) * sp;
      s.life = SHARD.life;
      s.value = value;
      s.magnet = false;
    },

    clearAll() {
      for (const b of playerBullets) b.active = false;
      for (const b of enemyBullets) b.active = false;
      for (const e of enemies) e.active = false;
      for (const s of shards) s.active = false;
    },

    countEnemies() {
      let n = 0;
      for (const e of enemies) if (e.active) n += 1;
      return n;
    },

    countShards() {
      let n = 0;
      for (const s of shards) if (s.active) n += 1;
      return n;
    },
  };
}

/** A spawn point just outside the view, on a random edge. */
export function edgeSpawn(rng) {
  const side = rng.int(0, 3);
  const m = 40;
  if (side === 0) return { x: rng.range(0, FIELD.width), y: -m };
  if (side === 1) return { x: FIELD.width + m, y: rng.range(0, FIELD.height) };
  if (side === 2) return { x: rng.range(0, FIELD.width), y: FIELD.height + m };
  return { x: -m, y: rng.range(0, FIELD.height) };
}
