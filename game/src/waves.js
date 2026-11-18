// The wave director: what spawns, when, and how many are left. Each wave is a
// queue of spawn events built when the wave starts; the boss arrives every
// fifth wave. The director only decides — the world moves and kills things.
import { ENEMY, FIELD, WAVE } from './config.js';
import { edgeSpawn } from './entities.js';

const COMPOSITION = [
  ['drifter'],
  ['drifter', 'weaver'],
  ['drifter', 'weaver', 'splitter', 'stinger'],
  ['drifter', 'weaver', 'splitter', 'mini', 'stinger', 'warden'],
  ['drifter', 'weaver', 'splitter', 'mini', 'stinger', 'charger', 'warden'],
];

export function createWaves(rng) {
  let queue = [];
  let spawnTimer = 0;
  let interval = WAVE.spawnInterval;

  function buildQueue(wave) {
    queue = [];
    const count = Math.min(60, WAVE.baseCount + (wave - 1) * WAVE.countPerWave);
    const kinds = COMPOSITION[Math.min(COMPOSITION.length - 1, Math.floor((wave - 1) / 2))];
    for (let i = 0; i < count; i += 1) {
      queue.push(rng.pick(kinds));
    }
    if (wave % 5 === 0) queue.push(wave === WAVE.finalWave ? 'prime' : 'boss');
    // Shuffle the queue so the wave never arrives in one kind's block.
    for (let i = queue.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng.next() * (i + 1));
      [queue[i], queue[j]] = [queue[j], queue[i]];
    }
    interval = Math.max(WAVE.spawnIntervalMin, WAVE.spawnInterval * Math.pow(0.94, wave - 1));
    spawnTimer = 0.6;
  }

  return {
    startWave(wave) {
      buildQueue(wave);
    },
    /** Spawn due enemies; returns the kinds spawned this step. */
    update(dt, wave, alive, spawnEnemy) {
      const spawned = [];
      if (queue.length === 0) return spawned;
      spawnTimer -= dt;
      if (spawnTimer > 0) return spawned;
      if (alive >= WAVE.maxAlive) {
        spawnTimer = 0.4;
        return spawned;
      }
      spawnTimer = interval * rng.range(0.7, 1.3);
      const kind = queue.shift();
      const pos = edgeSpawn(rng);
      // The final boss enters from the top centre, alone and announced.
      if (kind === 'boss' || kind === 'prime') {
        spawnEnemy(kind, FIELD.width / 2, -80, wave, false, rng);
      } else {
        const elite = rng.chance(WAVE.eliteChance) && kind !== 'mini';
        spawnEnemy(kind, pos.x, pos.y, wave, elite, rng);
      }
      spawned.push(kind);
      return spawned;
    },
    remaining() {
      return queue.length;
    },
    isBossWave(wave) {
      return wave % 5 === 0;
    },
    /** A wave is done when its queue is empty and nothing hostile is left. */
    waveCleared(alive) {
      return queue.length === 0 && alive === 0;
    },
  };
}

/** Enemy kinds the wave can draw from, for the HUD's wave preview. */
export function waveKinds(wave) {
  return COMPOSITION[Math.min(COMPOSITION.length - 1, Math.floor((wave - 1) / 2))];
}

export { ENEMY };
