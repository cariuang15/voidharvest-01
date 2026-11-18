// The simulation: one fixed-step world holding the player, the enemies, the
// bullets, the shards, the waves and the score. It knows nothing about the
// canvas or the DOM — the renderer paints its state, main.js drives it.
import { BULLET, COMBO, ENEMY, FIELD, NOVA, PLAYER, SHARD, STEP, WAVE } from './config.js';
import { createEntities } from './entities.js';
import { createWaves } from './waves.js';
import { draftUpgrades } from './upgrades.js';
import { createNova } from './nova.js';

export const EVENT_HIT = 1;
export const EVENT_OVER = 2;
export const EVENT_WAVE_CLEAR = 4;
export const EVENT_BOSS = 8;
export const EVENT_KILL = 16;

export function createWorld(rng, audio, particles) {
  const entities = createEntities();
  const waves = createWaves(rng);
  const nova = createNova();
  const state = {
    time: 0,
    wave: 0,
    phase: 'play', // 'play' | 'draft' | 'over'
    score: 0,
    shards: 0,
    shardsCollected: 0,
    kills: 0,
    bestCombo: 0,
    combo: 0,
    comboTimer: 0,
    comboMult: 1,
    banner: '',
    bannerTimer: 0,
    shake: 0,
    novaCharge: 0,
    novaReady: false,
    draft: [],
    taken: {},
    draftTimer: 0,
    player: null,
    mods: null,
  };

  function baseMods() {
    return {
      damage: 1, fireInterval: PLAYER.fireInterval, bullets: 1, pierce: 0,
      speed: 1, magnet: 1, crit: 0, regen: 0, shardValue: 1, bulletRadius: 1,
      dashCooldown: PLAYER.dashCooldown, maxHull: PLAYER.hull,
    };
  }

  function resetPlayer() {
    state.player = {
      x: FIELD.width / 2, y: FIELD.height / 2, vx: 0, vy: 0,
      angle: -Math.PI / 2, hull: PLAYER.hull, fireTimer: 0,
      dashTimer: 0, dashCooldown: 0, invuln: 0, dashX: 0, dashY: 0,
      alive: true,
    };
  }

  function applyUpgrade(id) {
    const m = state.mods;
    const t = state.taken;
    t[id] = (t[id] ?? 0) + 1;
    if (id === 'damage') m.damage *= 1.25;
    if (id === 'firerate') m.fireInterval *= 0.85;
    if (id === 'multishot') m.bullets += 1;
    if (id === 'pierce') m.pierce += 1;
    if (id === 'speed') m.speed *= 1.12;
    if (id === 'hull') {
      m.maxHull += 30;
      state.player.hull = Math.min(m.maxHull, state.player.hull + 30);
    }
    if (id === 'dash') m.dashCooldown *= 0.75;
    if (id === 'magnet') m.magnet *= 1.6;
    if (id === 'crit') m.crit += 0.1;
    if (id === 'regen') m.regen += 1.5;
    if (id === 'shardvalue') m.shardValue *= 1.5;
    if (id === 'bulletsize') {
      m.bulletRadius *= 1.25;
      m.damage *= 1.12;
    }
  }

  function startWave(wave) {
    state.wave = wave;
    state.phase = 'play';
    state.banner = wave % 5 === 0 ? `WAVE ${wave} — VOID MAW` : `WAVE ${wave}`;
    state.bannerTimer = WAVE.bannerSeconds;
    waves.startWave(wave);
    if (wave % 5 === 0) audio.boss();
    else audio.wave();
  }

  function killEnemy(e, award = true) {
    e.active = false;
    state.kills += 1;
    nova.addKill();
    state.novaCharge = nova.charge;
    state.novaReady = nova.ready;
    particles.burst(e.x, e.y, e.color, e.elite ? 34 : 18, e.elite ? 320 : 240, e.elite ? 4 : 3);
    particles.ring(e.x, e.y, e.color, e.radius * 3.4);
    audio.explode(e.kind === 'boss' || e.elite);
    state.shake = Math.min(14, state.shake + (e.kind === 'boss' ? 12 : e.elite ? 6 : 2.5));
    if (award) {
      state.combo += 1;
      state.comboTimer = COMBO.window;
      state.comboMult = Math.min(COMBO.maxMult, 1 + state.combo * COMBO.step);
      state.bestCombo = Math.max(state.bestCombo, state.combo);
      const gained = Math.round(e.score * state.comboMult);
      state.score += gained;
      particles.text(e.x, e.y - e.radius, `+${gained}`, '#eef4ff', e.elite ? 20 : 15);
      for (let i = 0; i < e.shards; i += 1) entities.spawnShard(e.x, e.y, 1, rng);
      if (e.kind === 'splitter') {
        for (let i = 0; i < 2; i += 1) {
          const a = rng.angle();
          entities.spawnEnemy('mini', e.x + Math.cos(a) * 24, e.y + Math.sin(a) * 24, state.wave, false, rng);
        }
      }
      if (e.kind === 'boss') {
        particles.ring(e.x, e.y, '#ffffff', 320, 0.8, 5);
        for (let i = 0; i < 12; i += 1) entities.spawnShard(e.x, e.y, 1, rng);
        state.score += 500;
      }
    }
  }

  /** The NOVA blast: a full charge clears every enemy bullet and blasts every enemy on the field. */
  function detonateNova() {
    if (state.phase !== 'play' || !nova.spend()) return false;
    const p = state.player;
    state.novaCharge = 0;
    state.novaReady = false;
    particles.ring(p.x, p.y, '#b8ff29', 700, 0.7, 6);
    particles.ring(p.x, p.y, '#ffffff', 420, 0.5, 4);
    particles.burst(p.x, p.y, '#b8ff29', 40, 520, 4, 0.9);
    particles.burst(p.x, p.y, '#ffffff', 20, 340, 3, 0.7);
    state.shake = 16;
    audio.nova();
    for (const b of entities.enemyBullets) b.active = false;
    // Snapshot: killing a splitter spawns minis, and they are not in this blast.
    for (const e of entities.enemies.slice()) {
      if (!e.active) continue;
      e.hp -= NOVA.damage;
      e.flash = 1;
      if (e.hp <= 0) killEnemy(e);
    }
    return true;
  }

  function damagePlayer(amount, x, y) {
    const p = state.player;
    if (!p.alive || p.invuln > 0 || p.dashTimer > 0) return false;
    p.hull -= amount;
    p.invuln = PLAYER.invulnerable;
    state.shake = Math.min(16, state.shake + 7);
    state.combo = 0;
    state.comboMult = 1;
    particles.burst(p.x, p.y, '#ff5d73', 16, 260, 3);
    audio.hurt();
    if (p.hull <= 0) {
      p.hull = 0;
      p.alive = false;
      particles.burst(p.x, p.y, '#4de8ff', 60, 420, 4, 1.1);
      particles.burst(p.x, p.y, '#ffffff', 30, 300, 3, 0.9);
      particles.ring(p.x, p.y, '#4de8ff', 260, 0.8, 5);
      state.shake = 18;
      audio.over();
      state.phase = 'over';
      return true;
    }
    return false;
  }

  function updatePlayer(dt, move, aim, firing, dashPressed) {
    const p = state.player;
    const m = state.mods;
    if (!p.alive) return;
    const len = Math.hypot(move.x, move.y) || 1;
    const nx = move.x / len;
    const ny = move.y / len;
    const moving = move.x !== 0 || move.y !== 0;

    p.dashCooldown = Math.max(0, p.dashCooldown - dt);
    p.invuln = Math.max(0, p.invuln - dt);
    if (p.dashTimer > 0) {
      p.dashTimer -= dt;
      p.x += p.dashX * PLAYER.dashSpeed * dt;
      p.y += p.dashY * PLAYER.dashSpeed * dt;
      particles.trail(p.x, p.y, '#4de8ff', 3);
    } else if (moving) {
      p.vx += nx * PLAYER.accel * m.speed * dt;
      p.vy += ny * PLAYER.accel * m.speed * dt;
    }
    const maxSpeed = PLAYER.speed * m.speed;
    const sp = Math.hypot(p.vx, p.vy);
    if (sp > maxSpeed) {
      p.vx = (p.vx / sp) * maxSpeed;
      p.vy = (p.vy / sp) * maxSpeed;
    }
    if (!moving && p.dashTimer <= 0) {
      p.vx *= 0.86;
      p.vy *= 0.86;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.x = Math.max(PLAYER.radius, Math.min(FIELD.width - PLAYER.radius, p.x));
    p.y = Math.max(PLAYER.radius, Math.min(FIELD.height - PLAYER.radius, p.y));
    p.angle = Math.atan2(aim.y - p.y, aim.x - p.x);

    if (dashPressed && p.dashCooldown <= 0 && p.dashTimer <= 0) {
      p.dashTimer = PLAYER.dashTime;
      p.dashCooldown = m.dashCooldown;
      const dx = moving ? nx : Math.cos(p.angle);
      const dy = moving ? ny : Math.sin(p.angle);
      p.dashX = dx;
      p.dashY = dy;
      p.invuln = Math.max(p.invuln, PLAYER.dashTime + 0.08);
      audio.dash();
      particles.ring(p.x, p.y, '#4de8ff', 54);
    }

    if (m.regen > 0 && p.hull < m.maxHull) {
      p.hull = Math.min(m.maxHull, p.hull + m.regen * dt);
    }

    p.fireTimer -= dt;
    if (firing && p.fireTimer <= 0) {
      p.fireTimer = m.fireInterval;
      const count = m.bullets;
      const spread = 0.14;
      for (let i = 0; i < count; i += 1) {
        const off = (i - (count - 1) / 2) * spread;
        entities.spawnPlayerBullet(
          p.x + Math.cos(p.angle) * (PLAYER.radius + 6),
          p.y + Math.sin(p.angle) * (PLAYER.radius + 6),
          p.angle + off,
          PLAYER.bulletDamage * m.damage * (rng.chance(m.crit) ? 2 : 1),
          PLAYER.bulletRadius * m.bulletRadius,
          m.pierce,
        );
      }
      particles.trail(p.x + Math.cos(p.angle) * 24, p.y + Math.sin(p.angle) * 24, '#aef3ff', 2);
      audio.shoot();
    }
  }

  function updateEnemies(dt) {
    const p = state.player;
    for (const e of entities.enemies) {
      if (!e.active) continue;
      e.t += dt;
      e.flash = Math.max(0, e.flash - dt * 6);
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const dist = Math.hypot(dx, dy) || 1;
      const ux = dx / dist;
      const uy = dy / dist;
      if (e.kind === 'drifter' || e.kind === 'mini' || e.kind === 'splitter') {
        e.vx += ux * e.speed * 2.4 * dt;
        e.vy += uy * e.speed * 2.4 * dt;
        const s = Math.hypot(e.vx, e.vy);
        if (s > e.speed) {
          e.vx = (e.vx / s) * e.speed;
          e.vy = (e.vy / s) * e.speed;
        }
      } else if (e.kind === 'weaver') {
        const orbit = 300;
        const tangent = Math.atan2(dy, dx) + Math.PI / 2;
        const radial = dist > orbit + 40 ? 1 : dist < orbit - 40 ? -1 : 0;
        const weave = Math.sin(e.t * 2.2 + e.phase) * 0.9;
        e.vx += (ux * radial * 0.7 + Math.cos(tangent) * weave) * e.speed * 2 * dt;
        e.vy += (uy * radial * 0.7 + Math.sin(tangent) * weave) * e.speed * 2 * dt;
        const s = Math.hypot(e.vx, e.vy);
        if (s > e.speed) {
          e.vx = (e.vx / s) * e.speed;
          e.vy = (e.vy / s) * e.speed;
        }
        e.fireTimer -= dt;
        if (e.fireTimer <= 0 && dist < 560 && p.alive) {
          e.fireTimer = rng.range(1.8, 2.6);
          entities.spawnEnemyBullet(e.x, e.y, Math.atan2(dy, dx));
          audio.hit();
        }
      } else if (e.kind === 'stinger') {
        // Holds off at long range and fires aimed shots; the renderer draws its
        // aim line while the shot is about to leave (fireTimer under half a second).
        const orbit = 420;
        const tangent = Math.atan2(dy, dx) + Math.PI / 2;
        const radial = dist > orbit + 40 ? 1 : dist < orbit - 40 ? -1 : 0;
        const weave = Math.sin(e.t * 1.6 + e.phase) * 0.7;
        e.vx += (ux * radial * 0.6 + Math.cos(tangent) * weave) * e.speed * 2 * dt;
        e.vy += (uy * radial * 0.6 + Math.sin(tangent) * weave) * e.speed * 2 * dt;
        const s = Math.hypot(e.vx, e.vy);
        if (s > e.speed) {
          e.vx = (e.vx / s) * e.speed;
          e.vy = (e.vy / s) * e.speed;
        }
        e.fireTimer -= dt;
        if (e.fireTimer <= 0 && dist < 640 && p.alive) {
          e.fireTimer = rng.range(2.2, 3.0);
          entities.spawnEnemyBullet(e.x, e.y, Math.atan2(dy, dx), 12);
          audio.hit();
        }
      } else if (e.kind === 'charger') {
        // Stalks, then flashes a warning, then lunges straight at the player.
        e.modeTimer -= dt;
        if (e.mode === 'stalk') {
          e.vx += ux * e.speed * 2 * dt;
          e.vy += uy * e.speed * 2 * dt;
          const s = Math.hypot(e.vx, e.vy);
          if (s > e.speed) {
            e.vx = (e.vx / s) * e.speed;
            e.vy = (e.vy / s) * e.speed;
          }
          if (e.modeTimer <= 0 && dist < 460 && p.alive) {
            e.mode = 'windup';
            e.modeTimer = 0.6;
            e.lockX = ux;
            e.lockY = uy;
          }
        } else if (e.mode === 'windup') {
          // Shivers in place, glowing, before the lunge.
          e.vx = (rng.next() - 0.5) * 60;
          e.vy = (rng.next() - 0.5) * 60;
          if (e.modeTimer <= 0) {
            e.mode = 'lunge';
            e.modeTimer = 0.45;
            e.vx = e.lockX * 520;
            e.vy = e.lockY * 520;
            audio.dash();
          }
        } else if (e.mode === 'lunge') {
          particles.trail(e.x, e.y, '#b8ff29', 3);
          if (e.modeTimer <= 0) {
            e.mode = 'recover';
            e.modeTimer = 0.9;
          }
        } else {
          e.vx *= 0.9;
          e.vy *= 0.9;
          if (e.modeTimer <= 0) {
            e.mode = 'stalk';
            e.modeTimer = rng.range(1.0, 2.0);
          }
        }
      } else if (e.kind === 'boss') {
        e.vx += ux * e.speed * 1.6 * dt;
        e.vy += uy * e.speed * 1.6 * dt;
        const s = Math.hypot(e.vx, e.vy);
        if (s > e.speed) {
          e.vx = (e.vx / s) * e.speed;
          e.vy = (e.vy / s) * e.speed;
        }
        e.fireTimer -= dt;
        if (e.fireTimer <= 0 && p.alive) {
          e.fireTimer = 2.4;
          const n = 10;
          const base = rng.angle();
          for (let i = 0; i < n; i += 1) {
            entities.spawnEnemyBullet(e.x, e.y, base + (i / n) * Math.PI * 2, 12);
          }
          audio.explode(false);
          state.shake = Math.min(14, state.shake + 4);
        }
        if (e.t > 6 && rng.chance(dt * 0.35)) {
          const pos = { x: e.x + rng.range(-80, 80), y: e.y + rng.range(-40, 40) };
          entities.spawnEnemy('drifter', pos.x, pos.y, state.wave, false, rng);
          e.t = 0;
        }
      }
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.x = Math.max(-60, Math.min(FIELD.width + 60, e.x));
      e.y = Math.max(-60, Math.min(FIELD.height + 60, e.y));
      if (p.alive && dist < e.radius + PLAYER.radius - 2) {
        const died = damagePlayer(e.damage, e.x, e.y);
        if (!died) {
          // Shove the enemy back so one touch is not a chain of hits.
          e.x -= ux * 26;
          e.y -= uy * 26;
        }
        if (state.phase === 'over') return EVENT_OVER;
      }
    }
    return 0;
  }

  function updateBullets(dt) {
    let events = 0;
    for (const b of entities.playerBullets) {
      if (!b.active) continue;
      b.life -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.life <= 0 || b.x < -20 || b.x > FIELD.width + 20 || b.y < -20 || b.y > FIELD.height + 20) {
        b.active = false;
        continue;
      }
      for (const e of entities.enemies) {
        if (!e.active) continue;
        const dx = e.x - b.x;
        const dy = e.y - b.y;
        const rr = e.radius + b.radius;
        if (dx * dx + dy * dy < rr * rr) {
          e.hp -= b.damage;
          e.flash = 1;
          particles.burst(b.x, b.y, e.color, 4, 160, 2, 0.35);
          audio.hit();
          if (e.hp <= 0) {
            killEnemy(e);
            events |= EVENT_KILL;
          }
          if (b.pierce > 0) {
            b.pierce -= 1;
          } else {
            b.active = false;
          }
          break;
        }
      }
    }
    for (const b of entities.enemyBullets) {
      if (!b.active) continue;
      b.life -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.life <= 0 || b.x < -20 || b.x > FIELD.width + 20 || b.y < -20 || b.y > FIELD.height + 20) {
        b.active = false;
        continue;
      }
      const p = state.player;
      if (p.alive) {
        const dx = p.x - b.x;
        const dy = p.y - b.y;
        const rr = PLAYER.radius - 4 + b.radius;
        if (dx * dx + dy * dy < rr * rr) {
          b.active = false;
          if (damagePlayer(b.damage, b.x, b.y)) return EVENT_OVER;
          events |= EVENT_HIT;
        }
      }
    }
    return events;
  }

  function updateShards(dt) {
    const p = state.player;
    const magnetR = PLAYER.magnet * state.mods.magnet;
    for (const s of entities.shards) {
      if (!s.active) continue;
      s.life -= dt;
      if (s.life <= 0) {
        s.active = false;
        continue;
      }
      if (p.alive) {
        const dx = p.x - s.x;
        const dy = p.y - s.y;
        const dist = Math.hypot(dx, dy);
        if (dist < magnetR) s.magnet = true;
        if (s.magnet) {
          s.vx += (dx / (dist || 1)) * 2600 * dt;
          s.vy += (dy / (dist || 1)) * 2600 * dt;
          const sp = Math.hypot(s.vx, s.vy);
          if (sp > SHARD.magnetSpeed) {
            s.vx = (s.vx / sp) * SHARD.magnetSpeed;
            s.vy = (s.vy / sp) * SHARD.magnetSpeed;
          }
        }
        if (dist < PLAYER.radius + 12) {
          s.active = false;
          state.shards += 1;
          state.shardsCollected += 1;
          state.score += Math.round(SHARD.value * state.mods.shardValue * 0.1);
          audio.shard();
          particles.trail(s.x, s.y, '#ffe066', 2);
        }
      }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vx *= 0.94;
      s.vy *= 0.94;
    }
  }

  function reset() {
    entities.clearAll();
    particles.clear();
    nova.reset();
    state.time = 0;
    state.wave = 0;
    state.phase = 'play';
    state.score = 0;
    state.shards = 0;
    state.shardsCollected = 0;
    state.kills = 0;
    state.bestCombo = 0;
    state.combo = 0;
    state.comboTimer = 0;
    state.comboMult = 1;
    state.banner = '';
    state.bannerTimer = 0;
    state.shake = 0;
    state.novaCharge = 0;
    state.novaReady = false;
    state.draft = [];
    state.taken = {};
    state.draftTimer = 0;
    state.mods = baseMods();
    resetPlayer();
  }

  return {
    state,
    entities,
    rng,
    reset,

    startRun() {
      reset();
      startWave(1);
    },

    /** One fixed step. `input` is {move, aim, firing, dash}. Returns event bits. */
    step(dt, input) {
      if (state.phase === 'over' || state.phase === 'draft') {
        particles.update(dt);
        state.shake = Math.max(0, state.shake - dt * 30);
        return 0;
      }
      state.time += dt;
      state.bannerTimer = Math.max(0, state.bannerTimer - dt);
      if (state.comboTimer > 0) {
        state.comboTimer -= dt;
        if (state.comboTimer <= 0) {
          state.combo = 0;
          state.comboMult = 1;
        }
      }
      updatePlayer(dt, input.move, input.aim, input.firing, input.dash);
      if (input.nova) detonateNova();
      let events = updateEnemies(dt);
      if (events & EVENT_OVER) return EVENT_OVER;
      events |= updateBullets(dt);
      if (state.phase === 'over') return EVENT_OVER;
      updateShards(dt);
      particles.update(dt);
      state.shake = Math.max(0, state.shake - dt * 30);

      // Spawn the wave, then check whether it is cleared.
      const spawned = waves.update(dt, state.wave, entities.countEnemies(), (kind, x, y, w, elite, r) =>
        entities.spawnEnemy(kind, x, y, w, elite, r),
      );
      if (spawned.includes('boss')) events |= EVENT_BOSS;
      if (waves.waveCleared(entities.countEnemies())) {
        const bonus = state.wave * 100 + Math.round(state.shards * SHARD.value * state.mods.shardValue * 0.5);
        state.score += bonus;
        state.draft = draftUpgrades(rng, state.taken);
        state.draftTimer = 0;
        state.phase = 'draft';
        audio.upgrade();
        return events | EVENT_WAVE_CLEAR;
      }
      return events;
    },

    /** Buy draft card `index` (0-2) if the player can afford it. Returns true when bought. */
    buyUpgrade(index) {
      const card = state.draft[index];
      if (!card || state.phase !== 'draft') return false;
      if (state.shards < card.price) return false;
      state.shards -= card.price;
      applyUpgrade(card.id);
      audio.upgrade();
      particles.ring(state.player.x, state.player.y, '#7dff9e', 90);
      return true;
    },

    /** Leave the draft and start the next wave. */
    nextWave() {
      if (state.phase !== 'draft') return;
      startWave(state.wave + 1);
    },

    /** The player idles in the title screen: a few drifters wander for the backdrop. */
    stepTitle(dt) {
      state.time += dt;
      particles.update(dt);
      if (entities.countEnemies() < 5 && rng.chance(dt * 0.5)) {
        const a = rng.angle();
        entities.spawnEnemy(
          rng.pick(['drifter', 'weaver']),
          FIELD.width / 2 + Math.cos(a) * 300,
          FIELD.height / 2 + Math.sin(a) * 200,
          1, false, rng,
        );
      }
      for (const e of entities.enemies) {
        if (!e.active) continue;
        e.t += dt;
        e.x += Math.cos(e.t * 0.4 + e.phase) * 22 * dt;
        e.y += Math.sin(e.t * 0.5 + e.phase) * 18 * dt;
      }
    },
  };
}

export { STEP };
