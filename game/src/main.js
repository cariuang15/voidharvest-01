// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between six screens: title, play,
// upgrade draft, paused, game over and victory.
//
// ?seed=N fixes the run. ?shot=start|play|draft|end (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady
// for a screenshot.
import { STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_OVER, EVENT_VICTORY, EVENT_WAVE_CLEAR } from './world.js';
import { ACTION_CONFIRM, ACTION_DASH, ACTION_MUTE, ACTION_NOVA, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createParticles } from './particles.js';
import {
  createRenderer, draftCardAt, SCREEN_DRAFT, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_VICTORY,
} from './render.js';
import { stageShot } from './shots.js';
import { readBest, saveBest } from './storage.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const rng = createRandom(seed);
const audio = createAudio();
const particles = createParticles();
const world = createWorld(rng, audio, particles);
const renderer = createRenderer(canvas);

// The renderer reads the live entity pools straight off the world state.
world.state.shardsRef = world.entities.shards;
world.state.enemiesRef = world.entities.enemies;
world.state.playerBulletsRef = world.entities.playerBullets;
world.state.enemyBulletsRef = world.entities.enemyBullets;
world.state.bossRef = world.entities.enemies;
world.state.particlesRef = particles;

// A small debug handle for automated tests (read-only state inspection).
window.__voidharvest = { world, seed };

function runShot(name) {
  const scene = stageShot(name, world, seed);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let dashQueued = false;
  let novaQueued = false;

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    world.startRun();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Wave 1. WASD to fly, mouse to aim, hold click to fire.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.score > best.score) {
      best = { score: world.state.score, wave: world.state.wave };
      saveBest(best.score, best.wave);
    }
    announce(`Game over. Score ${world.state.score}. Best ${best.score}.`);
  }

  function winGame() {
    screen = SCREEN_VICTORY;
    if (world.state.score > best.score) {
      best = { score: world.state.score, wave: world.state.wave };
      saveBest(best.score, best.wave);
    }
    announce(`Victory. Score ${world.state.score}. Best ${best.score}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_DASH) dashQueued = true;
    if (actions & ACTION_NOVA) novaQueued = true;
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Muted.' : 'Sound on.');
    }
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
      if (actions & ACTION_CONFIRM) startGame();
      return;
    }
    if (screen === SCREEN_VICTORY) {
      if (actions & ACTION_CONFIRM) {
        world.continueEndless();
        screen = SCREEN_PLAY;
        announce(`Endless mode. Wave ${world.state.wave}.`);
      }
      return;
    }
    if (screen === SCREEN_PLAY) {
      if (actions & ACTION_PAUSE) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      }
      return;
    }
    if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
      return;
    }
    if (screen === SCREEN_DRAFT) {
      const pick = input.takeCardPick();
      if (pick >= 1 && pick <= 3) {
        if (world.buyUpgrade(pick - 1)) announce(`Upgrade bought: ${world.state.draft[pick - 1]?.name ?? ''}.`);
      }
      if (actions & ACTION_CONFIRM) {
        const aim = input.aim();
        const card = draftCardAt(aim.x, aim.y);
        if (card >= 0) {
          world.buyUpgrade(card);
        } else {
          world.nextWave();
          screen = SCREEN_PLAY;
          announce(`Wave ${world.state.wave}.`);
        }
      }
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.stepTitle(STEP);
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const move = input.move();
    const aim = input.aim();
    const events = world.step(STEP, {
      move,
      aim,
      firing: input.firing(),
      dash: dashQueued || input.dashHeld(),
      nova: novaQueued,
    });
    dashQueued = false;
    novaQueued = false;
    if (world.state.phase === 'draft' && (events & EVENT_WAVE_CLEAR)) {
      screen = SCREEN_DRAFT;
      announce(`Wave ${world.state.wave} cleared. Choose an upgrade, or press Enter for the next wave.`);
    }
    if (events & EVENT_VICTORY || world.state.phase === 'victory') winGame();
    if (events & EVENT_OVER || world.state.phase === 'over') endGame();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best.score);
  }

  // Leaving the tab pauses a running game rather than letting the void eat the ship unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  // First click anywhere unlocks audio (autoplay rules) even before the game starts.
  window.addEventListener('pointerdown', () => audio.unlock(), { once: true });

  announce('Voidharvest. Press Enter or click to launch.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
