'use strict';
// ---------- Remaining ----------
// Every week of your life as one lamp on an LED board, flowing around whatever widgets you've placed.
// The more you put on a page, the smaller the lamps get. Weeks you've lived are lit, the rest are dark
// lenses, and this week breathes slowly, like a standby light. Nothing else moves.
const MONTH_SEASON = ['Winter', 'Winter', 'Spring', 'Spring', 'Spring', 'Summer', 'Summer', 'Summer', 'Fall', 'Fall', 'Fall', 'Winter'];
const WEEK_MS = 7 * 864e5;

// Weeks lived and weeks assumed, from the birth date you gave
function lifeWeeks() {
  const years = life?.years || 85;
  const total = Math.round(years * 52.1775);
  if (!life?.birth) return { known: false, total, lived: 0, left: total };
  const [y, m, d] = life.birth.split('-').map(Number);
  const born = new Date(y, m - 1, d).getTime();
  const lived = Math.max(0, Math.floor((Date.now() - born) / WEEK_MS));
  return { known: true, born, total, lived, left: Math.max(0, total - lived) };
}

scene.define('remaining', (S) => {
  const canvas = document.createElement('canvas');
  canvas.className = 'scene-canvas';
  S.back.append(canvas);
  const ctx = canvas.getContext('2d', { alpha: false });
  const tip = document.createElement('div');
  tip.className = 'rm-tip'; tip.hidden = true; tip.setAttribute('aria-hidden', 'true');
  const ask = document.createElement('button');
  ask.className = 'rm-ask'; ask.type = 'button'; ask.textContent = 'Add your birth date to fill in your weeks';
  ask.addEventListener('click', () => editLife());
  S.over.append(tip, ask);

  let W = 0, H = 0, dpr = 1, cells = [], pitch = 8, cols = 0, grid = null, base = null, weeks = lifeWeeks();
  let baked = false, reveal = 0, fade = 1, hover = -1, startAt = performance.now(), sprites = null;
  const BREATH = 5200;                            // one slow breath every five seconds or so

  function size() {
    W = innerWidth; H = innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  }
  const countFree = (p, rects) => {
    const M = 10, across = Math.floor((W - M * 2) / p), down = Math.floor((H - M * 2) / p);
    let n = 0;
    for (let y = 0; y < down; y++) {
      const top = M + y * p, bot = top + p;
      const row = rects.filter((r) => r.top < bot && r.bottom > top);
      if (!row.length) { n += across; continue; }
      for (let x = 0; x < across; x++) {
        const l = M + x * p, rr = l + p;
        if (!row.some((r) => r.left < rr && r.right > l)) n++;
      }
    }
    return n;
  };
  // Find the largest square that lets every week fit in the space the widgets have left
  function flow(rects) {
    weeks = lifeWeeks();
    const pad = 3;
    const holes = [...rects, ...S.chromeRects()].map((r) => ({ left: r.left - pad, top: r.top - pad, right: r.right + pad, bottom: r.bottom + pad }));
    let lo = 2, hi = 44;
    while (hi - lo > 0.05) {
      const mid = (lo + hi) / 2;
      if (countFree(mid, holes) >= weeks.total) lo = mid; else hi = mid;
    }
    pitch = lo;
    const M = 10;
    cols = Math.floor((W - M * 2) / pitch);
    const rows = Math.floor((H - M * 2) / pitch);
    grid = new Int32Array(cols * rows).fill(-1);
    cells = [];
    for (let y = 0; y < rows; y++) {
      const top = M + y * pitch, bot = top + pitch;
      const row = holes.filter((r) => r.top < bot && r.bottom > top);
      for (let x = 0; x < cols; x++) {
        if (cells.length >= weeks.total) break;
        const l = M + x * pitch, rr = l + pitch;
        if (row.some((r) => r.left < rr && r.right > l)) continue;
        grid[y * cols + x] = cells.length;
        cells.push({ x: l, y: top });
      }
    }
    paintBase();
    fade = cells.length && reveal >= 1 ? 0.55 : 0;
    ask.hidden = weeks.known;
    S.widgetRects().forEach((r) => { if (r.el.dataset.type === 'clock') stampLeft(r.el); });
  }
  const gap = () => Math.max(1, pitch * 0.2);
  // One lamp, drawn once and stamped everywhere: a lit one with its glow, a dark lens, and the hover ring.
  // The glow spills past the lamp's own square, which is what makes a field of them read as light.
  function makeSprites() {
    const s = pitch - gap(), round = s >= 3.5;
    const box = Math.ceil(pitch * 2.4), px = Math.ceil(box * dpr);
    const make = (paint) => { const c = document.createElement('canvas'); c.width = c.height = px; const g = c.getContext('2d'); g.scale(dpr, dpr); paint(g, box / 2, s / 2); return c; };
    const lamp = (g, m, r, core, edge) => {
      if (!round) { g.fillStyle = edge; g.fillRect(m - r, m - r, r * 2, r * 2); return; }
      const f = g.createRadialGradient(m - r * 0.25, m - r * 0.3, 0, m, m, r);
      f.addColorStop(0, core); f.addColorStop(1, edge);
      g.fillStyle = f; g.beginPath(); g.arc(m, m, r * 0.92, 0, Math.PI * 2); g.fill();
    };
    sprites = {
      box, round,
      lit: make((g, m, r) => {
        const h = g.createRadialGradient(m, m, r * 0.5, m, m, r * 2.3);
        h.addColorStop(0, 'rgba(255, 150, 40, 0.28)'); h.addColorStop(1, 'rgba(255, 150, 40, 0)');
        g.fillStyle = h; g.fillRect(0, 0, box, box);
        lamp(g, m, r, '#FFE3A8', '#FF9E2C');
      }),
      dark: make((g, m, r) => lamp(g, m, r, 'rgba(255, 190, 110, 0.13)', 'rgba(255, 160, 60, 0.06)')),
      ring: make((g, m, r) => { g.strokeStyle = '#FFF4DC'; g.lineWidth = 1.2; if (round) { g.beginPath(); g.arc(m, m, r + 1.2, 0, Math.PI * 2); g.stroke(); } else g.strokeRect(m - r - 1, m - r - 1, r * 2 + 2, r * 2 + 2); })
    };
  }
  const stamp = (g, sprite, c) => {
    const s = pitch - gap(), off = (sprites.box - s) / 2;
    g.drawImage(sprite, c.x - off, c.y - off, sprites.box, sprites.box);
  };
  // The still part of the picture is drawn once and reused every frame
  function paintBase() {
    makeSprites();
    base = document.createElement('canvas');
    base.width = canvas.width; base.height = canvas.height;
    const b = base.getContext('2d');
    b.scale(dpr, dpr);
    b.fillStyle = '#050404'; b.fillRect(0, 0, W, H);
    for (let i = weeks.lived; i < cells.length; i++) stamp(b, sprites.dark, cells[i]);
    // Once your life has lit up on arrival, lived weeks are just part of this picture
    if (reveal >= 1) {
      for (let i = 0; i < Math.min(weeks.lived, cells.length); i++) {
        b.globalAlpha = lifeColor(i);
        stamp(b, sprites.lit, cells[i]);
      }
      b.globalAlpha = 1;
    }
    baked = reveal >= 1;
  }
  const lifeColor = (i) => {
    // Decades alternate in brightness, so you can pick out your twenties at a glance
    const decade = Math.floor(i / 521.775);
    return decade % 2 ? 0.86 : 0.6;   // a little under full, so a page of lit weeks doesn't glare
  };
  function describe(i) {
    if (!weeks.known) return `Week ${(i + 1).toLocaleString()} of ${weeks.total.toLocaleString()}`;
    const when = new Date(weeks.born + i * WEEK_MS);
    const age = Math.floor(i / 52.1775);
    const stamp = `${MONTH_SEASON[when.getMonth()]} ${when.getFullYear()}`;
    if (i === weeks.lived) {
      const end = weeks.born + (i + 1) * WEEK_MS;
      const days = Math.max(0, Math.ceil((end - Date.now()) / 864e5));
      return `This week. ${days} ${days === 1 ? 'day' : 'days'} left in it.`;
    }
    if (i < weeks.lived) return `${stamp}. You were ${age}. Gone.`;
    return `${stamp}. You’d be ${age}, if it goes to plan.`;
  }
  function stampLeft(el) {
    const meta = el.querySelector('.clock-meta');
    if (!meta) return;
    let line = meta.querySelector('.rm-left');
    if (!line) { line = document.createElement('p'); line.className = 'rm-left'; meta.append(line); }
    line.innerHTML = weeks.known
      ? `<strong>${weeks.left.toLocaleString()}</strong> weeks left, statistically.`
      : `<strong>${weeks.total.toLocaleString()}</strong> weeks, if you get them all.`;
  }

  function frame(t, dt, frozen) {
    if (!cells.length) return;
    const P = S.pointer;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.drawImage(base, 0, 0, W, H);
    // On arrival the board powers up: your life so far lights in order, oldest first
    if (reveal < 1) reveal = frozen ? 1 : Math.min(1, (t - startAt) / 2400);
    const eased = reveal < 1 ? 1 - Math.pow(1 - reveal, 2.4) : 1;
    const shown = Math.floor(Math.min(weeks.lived, cells.length) * eased);
    if (reveal >= 1 && !baked) paintBase();
    if (!baked) {
      for (let i = 0; i < shown; i++) { ctx.globalAlpha = lifeColor(i); stamp(ctx, sprites.lit, cells[i]); }
      ctx.globalAlpha = 1;
    }
    // Hover: the week, and the year around it
    const over = P.seen && t - P.at < 8000 ? indexAt(P.x, P.y) : -1;
    if (over !== hover) {
      hover = over;
      tip.hidden = over < 0;
      if (over >= 0) tip.textContent = describe(over);
    }
    if (over >= 0) {
      const from = Math.max(0, over - (over % 52)), to = Math.min(cells.length, from + 52);
      ctx.globalAlpha = 0.45;
      for (let i = from; i < to; i++) stamp(ctx, sprites.lit, cells[i]);
      ctx.globalAlpha = 1;
      stamp(ctx, sprites.ring, cells[over]);
      tip.style.transform = `translate(${Math.min(P.x + 14, W - 320)}px, ${Math.max(P.y - 42, 6)}px)`;
    }
    // This week breathes: a slow rise and fall, never fully dark, so it's easy to find and easy to ignore
    if (reveal >= 1 && weeks.known && weeks.lived < cells.length) {
      const breath = frozen ? 1 : (1 - Math.cos((t % BREATH) / BREATH * Math.PI * 2)) / 2;
      ctx.globalAlpha = 0.3 + breath * 0.7;
      stamp(ctx, sprites.lit, cells[weeks.lived]);
      ctx.globalAlpha = 1;
    }
    // A new layout fades up rather than popping in
    if (fade < 1) {
      fade = frozen ? 1 : Math.min(1, fade + (dt || 1) * 2.6);
      ctx.globalAlpha = 1 - fade;
      ctx.fillStyle = '#050404';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }
  function indexAt(x, y) {
    if (document.elementFromPoint(x, y)?.closest('.widget, .topbar, dialog')) return -1;
    const M = 10, gx = Math.floor((x - M) / pitch), gy = Math.floor((y - M) / pitch);
    if (gx < 0 || gy < 0 || gx >= cols) return -1;
    const i = gy * cols + gx;
    return i < grid.length ? grid[i] : -1;
  }

  size();
  return {
    // Powering up wants smooth frames; a five-second breath is smooth at a dozen
    get fps() { return reveal < 1 ? 30 : performance.now() - S.pointer.at < 1500 ? 20 : 12; },
    resize() { size(); flow(S.widgetRects()); },
    moved(rects) { if (!cells.length) flow(rects); },
    layout(rects) { flow(rects); if (!S.running()) frame(performance.now(), 0, true); },
    frame,
    decorate(item, body) { if (item.type === 'clock') stampLeft(body); },
    lifeChanged() { reveal = 0; baked = false; startAt = performance.now(); flow(S.widgetRects()); }
  };
});
