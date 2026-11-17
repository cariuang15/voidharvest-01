// Particles, shockwave rings and floating score text. One fixed pool, allocated
// at boot and reused, so a busy wave never allocates.
import { POOL } from './config.js';

export function createParticles() {
  const parts = [];
  for (let i = 0; i < POOL.particles; i += 1) {
    parts.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 2, color: '#fff', drag: 0.9, glow: true });
  }
  const rings = [];
  for (let i = 0; i < 24; i += 1) rings.push({ active: false, x: 0, y: 0, r: 0, max: 1, life: 0, maxLife: 1, color: '#fff', width: 3 });
  const texts = [];
  for (let i = 0; i < POOL.texts; i += 1) {
    texts.push({ active: false, x: 0, y: 0, life: 0, max: 1, text: '', color: '#fff', size: 16 });
  }
  let cursor = 0;
  let ringCursor = 0;
  let textCursor = 0;

  function spawn(x, y, vx, vy, life, size, color, drag = 0.92, glow = true) {
    const p = parts[cursor];
    cursor = (cursor + 1) % parts.length;
    p.active = true;
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.life = life;
    p.max = life;
    p.size = size;
    p.color = color;
    p.drag = drag;
    p.glow = glow;
  }

  return {
    burst(x, y, color, count, speed, size = 3, life = 0.6) {
      for (let i = 0; i < count; i += 1) {
        const a = Math.random() * Math.PI * 2;
        const s = speed * (0.3 + Math.random() * 0.7);
        spawn(x, y, Math.cos(a) * s, Math.sin(a) * s, life * (0.6 + Math.random() * 0.7), size * (0.6 + Math.random() * 0.8), color);
      }
    },
    trail(x, y, color, size = 2.5) {
      spawn(x, y, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40, 0.35, size, color, 0.85);
    },
    ring(x, y, color, maxR, life = 0.45, width = 3) {
      const r = rings[ringCursor];
      ringCursor = (ringCursor + 1) % rings.length;
      r.active = true;
      r.x = x;
      r.y = y;
      r.r = 6;
      r.max = maxR;
      r.life = life;
      r.maxLife = life;
      r.color = color;
      r.width = width;
    },
    text(x, y, str, color, size = 16) {
      const t = texts[textCursor];
      textCursor = (textCursor + 1) % texts.length;
      t.active = true;
      t.x = x;
      t.y = y;
      t.life = 0.9;
      t.max = 0.9;
      t.text = str;
      t.color = color;
      t.size = size;
    },
    update(dt) {
      for (const p of parts) {
        if (!p.active) continue;
        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= p.drag;
        p.vy *= p.drag;
      }
      for (const r of rings) {
        if (!r.active) continue;
        r.life -= dt;
        if (r.life <= 0) r.active = false;
      }
      for (const t of texts) {
        if (!t.active) continue;
        t.life -= dt;
        t.y -= 42 * dt;
        if (t.life <= 0) t.active = false;
      }
    },
    draw(ctx) {
      for (const p of parts) {
        if (!p.active) continue;
        const a = Math.max(0, p.life / p.max);
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        if (p.glow) ctx.shadowColor = p.color;
        else ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.5 + a * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      for (const r of rings) {
        if (!r.active) continue;
        const t = Math.max(0, Math.min(1, 1 - r.life / r.maxLife));
        ctx.globalAlpha = Math.max(0, 1 - t);
        ctx.strokeStyle = r.color;
        ctx.lineWidth = r.width * (1 - t) + 1;
        ctx.beginPath();
        ctx.arc(r.x, r.y, Math.max(0, 6 + (r.max - 6) * t), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      for (const t of texts) {
        if (!t.active) continue;
        ctx.globalAlpha = Math.max(0, t.life / t.max);
        ctx.fillStyle = t.color;
        ctx.font = `700 ${t.size}px "Segoe UI", system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(t.text, t.x, t.y);
      }
      ctx.globalAlpha = 1;
    },
    clear() {
      for (const p of parts) p.active = false;
      for (const r of rings) r.active = false;
      for (const t of texts) t.active = false;
    },
  };
}
