# VOIDHARVEST

**Harvest the dying stars. Spend their shards. Survive the Maw.**

A neon twin-stick arena survival game that runs entirely offline in a desktop
browser. You fly a lone harvester ship through a collapsing starfield: shoot
the voidborn, collect the starshards they drop, and spend those shards on
upgrades between waves. Every fifth wave, the **Void Maw** arrives.

## How to play

Serve the `game/` folder with any static server (or run `node serve.ts` and
open http://localhost:8080), then:

- **WASD / arrow keys** — fly
- **Mouse** — aim
- **Hold left click** — fire
- **Space** — dash (brief invulnerability, recharges)
- **P / Esc** — pause, **M** — mute, **1 / 2 / 3** — buy an upgrade card

## The game

- **5 enemy kinds** — drifters that chase, weavers that orbit and shoot,
  splitters that burst into minis, fast minis, and the boss, the Void Maw,
  with radial bullet patterns and drifter spawns.
- **Shard economy** — every kill drops starshards. After each wave you draft
  **1 of 3 upgrades** (12 in the pool: multishot, pierce, crit, dash, magnet,
  hull, regen…) each with a shard cost that grows as you take it again.
  Leftover shards add to your score.
- **Combo multiplier** — chained kills within 3 seconds raise your score
  multiplier up to x4; taking a hit resets it.
- **Elites** — tougher, glowing variants worth triple score and shards.
- **Feel** — particles, shockwave rings, screen shake, floating score text,
  hit flashes, synthesized WebAudio sound effects and an ambient music loop
  (no audio files, everything is generated).
- **Complete loop** — animated title screen, wave banners, upgrade drafts,
  pause, game-over screen with run stats, and a best score kept in
  localStorage. A run is over when your hull reaches zero.

## Screenshots

`?shot=start|play|draft|end&seed=N` stages a deterministic scene (the game
plays itself with a simple autopilot) for screenshots — the same seed always
gives the same frame.

## Structure

```
game/
  index.html          page shell + canvas
  src/
    main.js           boot, fixed-step loop, screens
    world.js          simulation: player, waves, collisions, score
    entities.js       pools: bullets, enemies, shards
    waves.js          wave director + spawn tables
    upgrades.js       the 12-upgrade draft pool
    render.js         canvas drawing, HUD, screens
    input.js          keyboard + mouse
    audio.js          synthesized WebAudio SFX + music
    particles.js      particles, rings, floating text
    random.js         seeded RNG (mulberry32)
    shots.js          deterministic screenshot scenes + autopilot
    storage.js        best score in localStorage
    config.js         every tuning number and colour
```

No libraries, no build step, no network requests: plain ES modules under
`game/`. The entrypoint `main.ts` copies `game/` and `screenshots/` to the
output and writes `dossier.json` with the vendored `vendor/makefun-game.ts`.

## License

MIT — see [LICENSE](LICENSE).
