// Everything the player sees: the neon starfield, the ships, the HUD and the
// screens. All drawing is in the fixed 1280x720 logical field; the canvas is
// that size and CSS scales it to the window.
import { FIELD, FONT, FONT_DISPLAY, PALETTE, PLAYER } from './config.js';
import { createRandom } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_DRAFT = 'draft';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

/** Which upgrade card (0-2) the point is over, or -1. Same layout as drawDraft. */
export function draftCardAt(x, y) {
  const cardW = 300;
  const cardH = 250;
  const gap = 28;
  const total = cardW * 3 + gap * 2;
  const x0 = (FIELD.width - total) / 2;
  const y0 = 200;
  if (y < y0 || y > y0 + cardH) return -1;
  for (let i = 0; i < 3; i += 1) {
    const cx = x0 + i * (cardW + gap);
    if (x >= cx && x <= cx + cardW) return i;
  }
  return -1;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = FIELD.width;
  canvas.height = FIELD.height;

  // A fixed starfield and a few soft nebula blobs, drawn every frame behind the game.
  const starRng = createRandom(20261115);
  const stars = [];
  for (let i = 0; i < 150; i += 1) {
    stars.push({
      x: starRng.range(0, FIELD.width),
      y: starRng.range(0, FIELD.height),
      r: starRng.range(0.6, 2.2),
      phase: starRng.range(0, Math.PI * 2),
      speed: starRng.range(0.4, 1.6),
    });
  }
  const nebulae = [
    { x: 240, y: 160, r: 320, color: 'rgba(90, 40, 160, 0.20)' },
    { x: 1060, y: 560, r: 360, color: 'rgba(20, 110, 130, 0.16)' },
    { x: 980, y: 120, r: 260, color: 'rgba(150, 30, 90, 0.14)' },
    { x: 180, y: 620, r: 280, color: 'rgba(40, 60, 160, 0.12)' },
  ];

  function drawBackground(time) {
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    for (const n of nebulae) {
      const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
      g.addColorStop(0, n.color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
    }
    ctx.strokeStyle = PALETTE.grid;
    ctx.lineWidth = 1;
    for (let x = 0; x <= FIELD.width; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, FIELD.height);
      ctx.stroke();
    }
    for (let y = 0; y <= FIELD.height; y += 80) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(FIELD.width, y);
      ctx.stroke();
    }
    for (const s of stars) {
      // A slow parallax drift: the field slides past as the ship flies.
      const sx = ((s.x - time * s.speed * 5) % FIELD.width + FIELD.width) % FIELD.width;
      const tw = 0.45 + 0.55 * Math.abs(Math.sin(time * s.speed + s.phase));
      ctx.globalAlpha = tw;
      ctx.fillStyle = '#cfe4ff';
      ctx.beginPath();
      ctx.arc(sx, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawShip(x, y, angle, radius, color, core, dashing) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(radius + 6, 0);
    ctx.lineTo(-radius * 0.8, radius * 0.75);
    ctx.lineTo(-radius * 0.45, 0);
    ctx.lineTo(-radius * 0.8, -radius * 0.75);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(2, 0, radius * 0.32, 0, Math.PI * 2);
    ctx.fill();
    if (dashing) {
      ctx.fillStyle = 'rgba(77, 232, 255, 0.7)';
      ctx.beginPath();
      ctx.moveTo(-radius * 0.8, radius * 0.4);
      ctx.lineTo(-radius * 2.1, 0);
      ctx.lineTo(-radius * 0.8, -radius * 0.4);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawEnemy(e, time, player) {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.shadowColor = e.color;
    ctx.shadowBlur = e.elite ? 22 : 14;
    ctx.fillStyle = e.color;
    ctx.globalAlpha = e.flash > 0 ? 1 : 0.92;
    if (e.kind === 'stinger') {
      // A long diamond with a barrel; a thin aim line while its shot is about to leave.
      if (player && e.fireTimer < 0.5) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 140, 66, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 8]);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(player.x - e.x, player.y - e.y);
        ctx.stroke();
        ctx.restore();
      }
      const aim = player ? Math.atan2(player.y - e.y, player.x - e.x) : 0;
      ctx.rotate(aim);
      ctx.beginPath();
      ctx.moveTo(e.radius + 10, 0);
      ctx.lineTo(0, -e.radius * 0.62);
      ctx.lineTo(-e.radius, 0);
      ctx.lineTo(0, e.radius * 0.62);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#1a0e04';
      ctx.beginPath();
      ctx.arc(0, 0, e.radius * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(e.radius * 0.5, 0, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === 'charger') {
      // A heavy arrowhead; it flashes white-hot while winding up its lunge.
      if (e.mode === 'windup') {
        ctx.globalAlpha = 0.6 + 0.4 * Math.sin(time * 40);
        ctx.fillStyle = '#ffffff';
      }
      const aim = Math.atan2(e.vy, e.vx) || 0;
      ctx.rotate(e.mode === 'lunge' ? aim : e.t * 0.8);
      ctx.beginPath();
      ctx.moveTo(e.radius + 8, 0);
      ctx.lineTo(-e.radius * 0.7, e.radius * 0.85);
      ctx.lineTo(-e.radius * 0.3, 0);
      ctx.lineTo(-e.radius * 0.7, -e.radius * 0.85);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.arc(0, 0, e.radius * 0.38, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === 'drifter') {
      // Spiked circle.
      ctx.beginPath();
      const spikes = 8;
      for (let i = 0; i < spikes * 2; i += 1) {
        const a = (i / (spikes * 2)) * Math.PI * 2 + e.t * 0.6;
        const r = i % 2 === 0 ? e.radius + 6 : e.radius * 0.72;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#1a0b12';
      ctx.beginPath();
      ctx.arc(0, 0, e.radius * 0.42, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === 'weaver') {
      ctx.rotate(e.t * 1.4);
      ctx.beginPath();
      ctx.moveTo(0, -e.radius - 4);
      ctx.lineTo(e.radius, 0);
      ctx.lineTo(0, e.radius + 4);
      ctx.lineTo(-e.radius, 0);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === 'splitter' || e.kind === 'mini') {
      ctx.rotate(e.t * 0.9);
      ctx.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2;
        const px = Math.cos(a) * e.radius;
        const py = Math.sin(a) * e.radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.arc(0, 0, e.radius * 0.45, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === 'boss') {
      // A great maw: a dark ringed disc with a rotating toothed rim and a glowing core.
      ctx.rotate(e.t * 0.5);
      ctx.beginPath();
      const teeth = 12;
      for (let i = 0; i < teeth * 2; i += 1) {
        const a = (i / (teeth * 2)) * Math.PI * 2;
        const r = i % 2 === 0 ? e.radius + 10 : e.radius * 0.86;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#2b0210';
      ctx.beginPath();
      ctx.arc(0, 0, e.radius * 0.62, 0, Math.PI * 2);
      ctx.fill();
      const pulse = 0.6 + 0.4 * Math.sin(time * 5);
      ctx.fillStyle = `rgba(255, 46, 99, ${0.55 + 0.35 * pulse})`;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius * 0.34 * (0.9 + 0.15 * pulse), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    if (e.elite) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 224, 102, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius + 7 + Math.sin(time * 4) * 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (e.hp < e.maxHp && e.kind !== 'mini') {
      const w = e.radius * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(e.x - w / 2, e.y - e.radius - 12, w, 5);
      ctx.fillStyle = e.color;
      ctx.fillRect(e.x - w / 2, e.y - e.radius - 12, w * Math.max(0, e.hp / e.maxHp), 5);
    }
  }

  function bar(x, y, w, h, frac, fill, back) {
    ctx.fillStyle = back;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
  }

  function drawHud(state, best, screen) {
    const p = state.player;
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 30px ${FONT}`;
    ctx.fillText(`SCORE ${state.score.toLocaleString('en-US')}`, 24, 42);
    ctx.font = `600 17px ${FONT}`;
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText(`BEST ${Math.max(best, state.score).toLocaleString('en-US')}`, 24, 66);
    // Hull bar.
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 15px ${FONT}`;
    ctx.fillText('HULL', 24, 100);
    bar(78, 88, 210, 14, p.hull / state.mods.maxHull, p.hull > 30 ? '#7dff9e' : '#ff5d73', 'rgba(255,255,255,0.12)');
    ctx.fillStyle = PALETTE.text;
    ctx.font = `600 14px ${FONT}`;
    ctx.fillText(`${Math.ceil(p.hull)} / ${state.mods.maxHull}`, 296, 101);
    // Dash pip.
    const dashReady = p.dashCooldown <= 0;
    ctx.fillStyle = dashReady ? '#4de8ff' : 'rgba(255,255,255,0.25)';
    ctx.font = `700 15px ${FONT}`;
    ctx.fillText(dashReady ? 'DASH READY  [SPACE]' : 'DASH …', 24, 128);
    // NOVA charge (play only: the draft screen has its own shard line).
    if (screen === SCREEN_PLAY) {
      const novaFrac = (state.novaCharge ?? 0) / 100;
      ctx.fillStyle = PALETTE.text;
      ctx.font = `700 15px ${FONT}`;
      if (state.novaReady) {
        const blink = 0.65 + 0.35 * Math.sin(state.time * 8);
        ctx.globalAlpha = blink;
        ctx.fillStyle = '#eaffb0';
        ctx.fillText('NOVA READY  [Q]', 24, 152);
        ctx.globalAlpha = 1;
      } else {
        ctx.fillText('NOVA', 24, 152);
      }
      bar(78, 140, 210, 14, novaFrac, state.novaReady ? '#b8ff29' : '#7a9e1d', 'rgba(255,255,255,0.12)');
      ctx.fillStyle = PALETTE.text;
      ctx.font = `600 14px ${FONT}`;
      ctx.fillText(`${Math.floor(novaFrac * 100)}%`, 296, 153);
    }
    // Wave + shards, right side.
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 30px ${FONT}`;
    ctx.fillText(`WAVE ${state.wave}`, FIELD.width - 24, 42);
    ctx.fillStyle = '#ffe066';
    ctx.font = `700 22px ${FONT}`;
    ctx.fillText(`◆ ${state.shards} shards`, FIELD.width - 24, 74);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `600 15px ${FONT}`;
    ctx.fillText('shards buy upgrades between waves', FIELD.width - 24, 96);
    // Combo, under the score (play only: it collides with the draft subtitle).
    if (state.combo >= 3 && screen === SCREEN_PLAY) {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffb703';
      ctx.font = `800 22px ${FONT}`;
      ctx.fillText(`COMBO x${state.comboMult.toFixed(1)}  (${state.combo} kills)`, 24, 186);
      bar(24, 194, 150, 5, state.comboTimer / 3, '#ffb703', 'rgba(255,255,255,0.12)');
    }
    ctx.textAlign = 'left';
    // Boss health bar.
    for (const e of state.bossRef ?? []) {
      if (!e.active || e.kind !== 'boss') continue;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff2e63';
      ctx.font = `800 18px ${FONT}`;
      ctx.fillText('VOID MAW', FIELD.width / 2, FIELD.height - 52);
      bar(FIELD.width / 2 - 220, FIELD.height - 44, 440, 12, e.hp / e.maxHp, '#ff2e63', 'rgba(255,255,255,0.14)');
    }
    // Wave banner.
    if (state.bannerTimer > 0) {
      const a = Math.min(1, state.bannerTimer / 0.6);
      ctx.globalAlpha = a;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.font = `800 54px ${FONT_DISPLAY}`;
      ctx.shadowColor = '#7b2fff';
      ctx.shadowBlur = 26;
      ctx.fillText(state.banner, FIELD.width / 2, 240);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
  }

  function panel(x, y, w, h) {
    ctx.fillStyle = PALETTE.panel;
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 14);
    ctx.fill();
    ctx.stroke();
  }

  function drawTitle(state, best) {
    ctx.fillStyle = 'rgba(3, 4, 12, 0.45)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#4de8ff';
    ctx.font = `800 88px ${FONT_DISPLAY}`;
    ctx.shadowColor = '#7b2fff';
    ctx.shadowBlur = 34;
    ctx.fillText('VOIDHARVEST', FIELD.width / 2, 218);
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.text;
    ctx.font = `600 24px ${FONT}`;
    ctx.fillText('Harvest the dying stars. Spend their shards. Survive the Maw.', FIELD.width / 2, 262);
    panel(FIELD.width / 2 - 350, 300, 700, 190);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 19px ${FONT}`;
    ctx.fillText('WASD / ARROWS — fly      MOUSE — aim      HOLD CLICK — fire', FIELD.width / 2, 336);
    ctx.fillText('SPACE — dash through danger      Q — detonate a charged NOVA', FIELD.width / 2, 366);
    ctx.fillText('P — pause      M — mute', FIELD.width / 2, 396);
    ctx.fillStyle = '#ffe066';
    ctx.fillText('Kill voidborn, collect ◆ shards, buy 1 upgrade after each wave.', FIELD.width / 2, 428);
    ctx.fillText('Kills charge your NOVA. Every 5th wave the VOID MAW comes for you.', FIELD.width / 2, 456);
    ctx.fillStyle = '#4de8ff';
    ctx.font = `800 26px ${FONT}`;
    ctx.fillText('CLICK OR PRESS ENTER TO LAUNCH', FIELD.width / 2, 540);
    if (best > 0) {
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `600 18px ${FONT}`;
      ctx.fillText(`BEST SCORE  ${best.toLocaleString('en-US')}`, FIELD.width / 2, 580);
    }
  }

  function drawDraft(state) {
    ctx.fillStyle = 'rgba(3, 4, 12, 0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#7dff9e';
    ctx.font = `800 40px ${FONT_DISPLAY}`;
    ctx.fillText(`WAVE ${state.wave} CLEARED`, FIELD.width / 2, 108);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `600 20px ${FONT}`;
    ctx.fillText(`You hold ◆ ${state.shards} shards — buy one upgrade, or press ENTER to move on.`, FIELD.width / 2, 146);
    const cardW = 300;
    const cardH = 250;
    const gap = 28;
    const total = cardW * 3 + gap * 2;
    const x0 = (FIELD.width - total) / 2;
    const y0 = 200;
    state.draft.forEach((card, i) => {
      const x = x0 + i * (cardW + gap);
      const afford = state.shards >= card.price;
      panel(x, y0, cardW, cardH);
      ctx.fillStyle = afford ? '#4de8ff' : PALETTE.muted;
      ctx.font = `800 30px ${FONT_DISPLAY}`;
      ctx.fillText(card.icon, x + cardW / 2, y0 + 66);
      ctx.fillStyle = PALETTE.text;
      ctx.font = `800 21px ${FONT}`;
      ctx.fillText(card.name, x + cardW / 2, y0 + 112);
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `600 16px ${FONT}`;
      wrapText(card.desc, x + cardW / 2, y0 + 146, cardW - 36, 22);
      ctx.fillStyle = card.level > 0 ? '#8b93b8' : PALETTE.muted;
      ctx.font = `600 15px ${FONT}`;
      ctx.fillText(card.level > 0 ? `owned Lv ${card.level}` : 'new upgrade', x + cardW / 2, y0 + 196);
      ctx.fillStyle = afford ? '#ffe066' : '#ff5d73';
      ctx.font = `800 22px ${FONT}`;
      ctx.fillText(`◆ ${card.price} shards`, x + cardW / 2, y0 + 224);
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `700 15px ${FONT}`;
      ctx.fillText(`press ${i + 1}  or click`, x + cardW / 2, y0 + cardH + 28);
    });
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `600 16px ${FONT}`;
    ctx.fillText('Shards left over add to your score at the end of the run.', FIELD.width / 2, 540);
  }

  function wrapText(text, cx, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let yy = y;
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, cx, yy);
        line = word;
        yy += lineHeight;
      } else {
        line = test;
      }
    }
    ctx.fillText(line, cx, yy);
  }

  function drawOver(state, best) {
    ctx.fillStyle = 'rgba(3, 4, 12, 0.62)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff5d73';
    ctx.font = `800 64px ${FONT_DISPLAY}`;
    ctx.shadowColor = '#ff2e63';
    ctx.shadowBlur = 26;
    ctx.fillText('SHIP LOST', FIELD.width / 2, 210);
    ctx.shadowBlur = 0;
    const isBest = state.score >= best && state.score > 0;
    ctx.fillStyle = isBest ? '#ffe066' : PALETTE.text;
    ctx.font = `800 30px ${FONT}`;
    ctx.fillText(isBest ? '★ NEW BEST SCORE ★' : `SCORE  ${state.score.toLocaleString('en-US')}`, FIELD.width / 2, 268);
    panel(FIELD.width / 2 - 260, 300, 520, 190);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `600 19px ${FONT}`;
    const rows = [
      `Waves survived   ${state.wave}`,
      `Voidborn destroyed   ${state.kills}`,
      `Shards harvested   ${state.shardsCollected}`,
      `Best combo   x${(1 + Math.min(30, state.bestCombo) * 0.1).toFixed(1)}  (${state.bestCombo} kills)`,
      `Time in the void   ${Math.floor(state.time / 60)}:${String(Math.floor(state.time % 60)).padStart(2, '0')}`,
    ];
    rows.forEach((row, i) => ctx.fillText(row, FIELD.width / 2, 336 + i * 30));
    ctx.fillStyle = '#4de8ff';
    ctx.font = `800 24px ${FONT}`;
    ctx.fillText('PRESS ENTER OR CLICK TO FLY AGAIN', FIELD.width / 2, 560);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `600 16px ${FONT}`;
    ctx.fillText(`Best score  ${best.toLocaleString('en-US')}`, FIELD.width / 2, 596);
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(3, 4, 12, 0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `800 56px ${FONT_DISPLAY}`;
    ctx.fillText('PAUSED', FIELD.width / 2, 330);
    ctx.font = `600 20px ${FONT}`;
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText('P or ESC to resume', FIELD.width / 2, 372);
  }

  return {
    draw(state, screen, best) {
      const time = state.time;
      ctx.save();
      if (state.shake > 0.4) {
        ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
      }
      drawBackground(time);
      // Shards under the ships.
      for (const s of state.shardsRef ?? []) {
        if (!s.active) continue;
        const pulse = 0.7 + 0.3 * Math.sin(time * 6 + s.x);
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(time * 2 + s.x);
        ctx.globalAlpha = Math.min(1, s.life / 2) * pulse;
        ctx.fillStyle = '#ffe066';
        ctx.shadowColor = '#ffe066';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(6, 0);
        ctx.lineTo(0, 8);
        ctx.lineTo(-6, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      for (const e of state.enemiesRef ?? []) {
        if (e.active) drawEnemy(e, time, state.player);
      }
      for (const b of state.playerBulletsRef ?? []) {
        if (!b.active) continue;
        ctx.strokeStyle = PALETTE.bullet;
        ctx.shadowColor = PALETTE.bullet;
        ctx.shadowBlur = 10;
        ctx.lineWidth = b.radius * 1.4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(b.x - b.vx * 0.028, b.y - b.vy * 0.028);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      for (const b of state.enemyBulletsRef ?? []) {
        if (!b.active) continue;
        ctx.fillStyle = '#ff8fa3';
        ctx.shadowColor = '#ff2e63';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      // The player ship, blinking while invulnerable.
      const p = state.player;
      if (p && p.alive && (screen === SCREEN_PLAY || screen === SCREEN_DRAFT || screen === SCREEN_PAUSED)) {
        if (p.invuln <= 0 || Math.floor(time * 14) % 2 === 0) {
          drawShip(p.x, p.y, p.angle, PLAYER.radius, PALETTE.player, PALETTE.playerCore, p.dashTimer > 0);
        }
      }
      // Particles and floating text on top of the world.
      state.particlesRef?.draw(ctx);
      ctx.restore();

      // Low-hull warning: the void closes in, red at the edges.
      const pl = state.player;
      if (pl && pl.alive && screen === SCREEN_PLAY && pl.hull < state.mods.maxHull * 0.3) {
        const pulse = 0.22 + 0.13 * Math.sin(time * 6);
        const g = ctx.createRadialGradient(640, 360, 260, 640, 360, 720);
        g.addColorStop(0, 'rgba(255, 45, 85, 0)');
        g.addColorStop(1, `rgba(255, 45, 85, ${pulse})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      }

      if (screen === SCREEN_PLAY || screen === SCREEN_DRAFT || screen === SCREEN_PAUSED) drawHud(state, best, screen);
      if (screen === SCREEN_TITLE) drawTitle(state, best);
      if (screen === SCREEN_DRAFT) drawDraft(state);
      if (screen === SCREEN_PAUSED) drawPaused();
      if (screen === SCREEN_OVER) drawOver(state, best);
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(139, 147, 184, 0.8)';
        ctx.font = `600 14px ${FONT}`;
        ctx.fillText('VOIDHARVEST — an original browser game  •  M to mute', FIELD.width / 2, FIELD.height - 18);
      }
    },
  };
}
