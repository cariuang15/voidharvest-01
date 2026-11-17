// The screenshot scenes behind ?shot=start|play|draft|end. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered
// by a simple autopilot, so the frame is what a short game really looks like
// and the same seed always gives the same frame.
import { FIELD, STEP } from './config.js';
import { SCREEN_DRAFT, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 34;
const END_LIMIT_SECONDS = 300;
const SAMPLE = STEP;

/** Steer toward shards and away from danger, aim at the nearest enemy, fire. */
function autopilot(world, skilled) {
  const s = world.state;
  const p = s.player;
  const ents = world.entities;
  let moveX = 0;
  let moveY = 0;
  let aimX = p.x + Math.cos(p.angle) * 100;
  let aimY = p.y + Math.sin(p.angle) * 100;
  let firing = false;
  let dash = false;

  let nearest = null;
  let nearestD = Infinity;
  for (const e of ents.enemies) {
    if (!e.active) continue;
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < nearestD) {
      nearestD = d;
      nearest = e;
    }
  }
  if (nearest) {
    aimX = nearest.x;
    aimY = nearest.y;
    firing = true;
  }
  if (!skilled) {
    // A hurried player: stands still, shoots, never dashes — the void catches them.
    return { move: { x: 0, y: 0 }, aim: { x: aimX, y: aimY }, firing, dash: false };
  }
  // Flee what is close, chase shards, drift back toward the middle.
  let close = 0;
  for (const e of ents.enemies) {
    if (!e.active) continue;
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < 190) {
      const w = (190 - d) / 190;
      moveX += (dx / d) * w;
      moveY += (dy / d) * w;
      close += 1;
    }
  }
  let shard = null;
  let shardD = Infinity;
  for (const sh of ents.shards) {
    if (!sh.active) continue;
    const d = Math.hypot(sh.x - p.x, sh.y - p.y);
    if (d < shardD) {
      shardD = d;
      shard = sh;
    }
  }
  if (shard && shardD < 520) {
    moveX += ((shard.x - p.x) / (shardD || 1)) * 1.1;
    moveY += ((shard.y - p.y) / (shardD || 1)) * 1.1;
  }
  moveX += (FIELD.width / 2 - p.x) / FIELD.width * 0.4;
  moveY += (FIELD.height / 2 - p.y) / FIELD.height * 0.4;
  const len = Math.hypot(moveX, moveY);
  if (len > 1) {
    moveX /= len;
    moveY /= len;
  }
  if (close >= 3 && p.dashCooldown <= 0) dash = true;
  return { move: { x: moveX, y: moveY }, aim: { x: aimX, y: aimY }, firing, dash };
}

/** How busy the frame looks: enemies, bullets and shards on screen. */
function busyness(world) {
  const ents = world.entities;
  let b = world.state.wave * 6;
  const p = world.state.player;
  for (const e of ents.enemies) {
    if (!e.active) continue;
    b += 3;
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < 320) b += 4;
    if (d < 160) b += 4;
  }
  for (const x of ents.playerBullets) if (x.active) b += 1;
  for (const x of ents.enemyBullets) if (x.active) b += 2;
  for (const s of ents.shards) if (s.active) b += 1;
  return b;
}

/** One autopilot step, buying the cheapest affordable upgrade when a draft opens. */
function autoStep(world, skilled) {
  world.step(STEP, autopilot(world, skilled));
  if (world.state.phase === 'draft') {
    const affordable = world.state.draft
      .map((c, idx) => ({ c, idx }))
      .filter(({ c }) => c.price <= world.state.shards)
      .sort((a, b) => a.c.price - b.c.price);
    if (affordable.length > 0) world.buyUpgrade(affordable[0].idx);
    world.nextWave();
  }
}

/**
 * Set `world` to the named scene and return the screen to draw over it and
 * the best score to show. The play scene is staged twice: the first pass
 * finds the busiest frame of the run, the second replays the same seed to it,
 * so the cover always shows a full fight.
 */
export function stageShot(name, world, seed) {
  if (name !== 'play' && name !== 'draft' && name !== 'end') {
    world.reset();
    for (let i = 0; i < START_SECONDS / STEP; i += 1) world.stepTitle(STEP);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'play') {
    let bestStep = 0;
    let bestScore = -1;
    world.rng.reseed(seed);
    world.startRun();
    for (let i = 0; i < 45 / STEP; i += 1) {
      autoStep(world, true);
      if (world.state.phase === 'over') break;
      if (world.state.phase === 'play') {
        const b = busyness(world);
        if (b > bestScore) {
          bestScore = b;
          bestStep = i + 1;
        }
      }
    }
    world.rng.reseed(seed);
    world.startRun();
    for (let i = 0; i < bestStep; i += 1) autoStep(world, true);
    const s = world.state;
    return { screen: SCREEN_PLAY, best: s.score };
  }
  world.startRun();
  const limit = name === 'end' ? END_LIMIT_SECONDS : 240;
  for (let i = 0; i < limit / STEP; i += 1) {
    const input = autopilot(world, name !== 'end');
    world.step(STEP, input);
    if (world.state.phase === 'over') break;
    if (world.state.phase === 'draft') {
      if (name === 'draft') break;
      const affordable = world.state.draft
        .map((c, idx) => ({ c, idx }))
        .filter(({ c }) => c.price <= world.state.shards)
        .sort((a, b) => a.c.price - b.c.price);
      if (affordable.length > 0) world.buyUpgrade(affordable[0].idx);
      world.nextWave();
    }
  }
  const s = world.state;
  if (s.phase === 'over') return { screen: SCREEN_OVER, best: s.score };
  if (s.phase === 'draft') return { screen: SCREEN_DRAFT, best: s.score };
  return { screen: SCREEN_PLAY, best: s.score };
}

export { SAMPLE, autopilot };
