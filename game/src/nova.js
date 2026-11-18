// The NOVA blast's charge meter: every kill feeds it, and at full charge the
// player detonates it with Q. The meter only counts; the world does the blast.
import { NOVA } from './config.js';

export function createNova() {
  let charge = 0;
  let rate = 1; // NOVA CORE upgrades multiply how fast kills charge the meter
  return {
    /** 0..chargeMax. */
    get charge() {
      return charge;
    },
    get ready() {
      return charge >= NOVA.chargeMax;
    },
    /** One kill feeds the meter. */
    addKill() {
      charge = Math.min(NOVA.chargeMax, charge + NOVA.perKill * rate);
    },
    /** Multiply the charge gained per kill (1 = normal). */
    setChargeRate(r) {
      rate = r;
    },
    /** Spend a full charge on a detonation. Returns false when not charged. */
    spend() {
      if (charge < NOVA.chargeMax) return false;
      charge = 0;
      return true;
    },
    reset() {
      charge = 0;
    },
  };
}
