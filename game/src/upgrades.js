// The between-wave upgrade draft: three cards, each with a shard cost that
// grows every time that upgrade is taken. The player buys at most one per
// wave, or skips and keeps the shards for score. Every upgrade is a plain
// data row, so the world applies it by id and the renderer draws it by id.
export const UPGRADES = [
  { id: 'damage', name: 'OVERCHARGE', desc: '+25% bullet damage', cost: 6, max: 5, icon: 'DMG' },
  { id: 'firerate', name: 'RAPID CYCLER', desc: '+18% fire rate', cost: 6, max: 5, icon: 'RPM' },
  { id: 'multishot', name: 'SPLIT ROUNDS', desc: '+1 bullet per shot', cost: 12, max: 3, icon: 'x2' },
  { id: 'pierce', name: 'LANCE ROUNDS', desc: 'Bullets pierce +1 enemy', cost: 9, max: 3, icon: '>>>' },
  { id: 'speed', name: 'ION THRUSTERS', desc: '+12% move speed', cost: 5, max: 4, icon: 'SPD' },
  { id: 'hull', name: 'REINFORCED HULL', desc: '+30 max hull, heal 30', cost: 7, max: 4, icon: 'HP' },
  { id: 'dash', name: 'PHASE DASH', desc: '-25% dash cooldown', cost: 6, max: 3, icon: 'DSH' },
  { id: 'magnet', name: 'TRACTOR FIELD', desc: '+60% shard pickup range', cost: 4, max: 4, icon: 'MAG' },
  { id: 'crit', name: 'VOID LUCK', desc: '+10% crit chance (2x dmg)', cost: 7, max: 4, icon: 'CRIT' },
  { id: 'regen', name: 'NANO WEAVE', desc: 'Regenerate 1.5 hull / sec', cost: 8, max: 3, icon: 'REG' },
  { id: 'shardvalue', name: 'RICH VEINS', desc: 'Shards worth +50% score', cost: 5, max: 3, icon: '$' },
  { id: 'bulletsize', name: 'HEAVY SLUGS', desc: '+25% bullet size & damage', cost: 8, max: 3, icon: 'BIG' },
  { id: 'repair', name: 'FIELD REPAIR', desc: 'Restore 50 hull right now', cost: 5, max: 3, icon: 'FIX' },
  { id: 'novacore', name: 'NOVA CORE', desc: 'NOVA charges +100% faster', cost: 9, max: 2, icon: 'NOVA' },
  { id: 'bulletvel', name: 'HYPER VELOCITY', desc: '+25% bullet speed', cost: 6, max: 3, icon: 'VEL' },
];

/**
 * Draw three distinct upgrades the player can still take. The draft is seeded
 * from the run so a screenshot seed always shows the same three cards.
 */
export function draftUpgrades(rng, taken) {
  const available = UPGRADES.filter((u) => (taken[u.id] ?? 0) < u.max);
  const pool = available.length >= 3 ? available : UPGRADES.filter((u) => (taken[u.id] ?? 0) < u.max + 99);
  const picked = [];
  const copy = pool.slice();
  while (picked.length < 3 && copy.length > 0) {
    const i = Math.floor(rng.next() * copy.length);
    picked.push(copy.splice(i, 1)[0]);
  }
  return picked.map((u) => {
    const level = taken[u.id] ?? 0;
    return { ...u, level, price: u.cost + level * 4 };
  });
}
