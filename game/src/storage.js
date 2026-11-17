// The best score, kept in localStorage between visits. Silent when storage
// is off (private windows): the best then lasts this visit only.
import { BEST_KEY, BEST_WAVE_KEY } from './config.js';

export function readBest() {
  try {
    return {
      score: Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0,
      wave: Number.parseInt(window.localStorage.getItem(BEST_WAVE_KEY) ?? '0', 10) || 0,
    };
  } catch {
    return { score: 0, wave: 0 };
  }
}

export function saveBest(score, wave) {
  try {
    window.localStorage.setItem(BEST_KEY, String(score));
    window.localStorage.setItem(BEST_WAVE_KEY, String(wave));
  } catch {
    // Storage can be off: the best score then lasts this visit only.
  }
}
