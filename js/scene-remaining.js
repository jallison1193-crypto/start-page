'use strict';
// ---------- Remaining ----------
// Every week of your life, flowing around whatever widgets you've placed. The more you put on a page,
// the smaller your weeks get. Spent weeks are filled in, the rest are hollow, and this week beats
// like a heart, each beat rippling out through the whole grid.
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
  let baked = false, reveal = 0, waves = [], lastBeat = 0, beatCount = 0, fade = 1, hover = -1, startAt = performance.now();
  const BEAT = 1060;                              // about 57 beats a minute: calm, for now
  const RIPPLE_LIFE = 2000;
  const SPENT = [216, 210, 194], ROSE = [232, 58, 84];

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
  // The still part of the picture is drawn once and reused every frame
  function paintBase() {
    base = document.createElement('canvas');
    base.width = canvas.width; base.height = canvas.height;
    const b = base.getContext('2d');
    b.scale(dpr, dpr);
    b.fillStyle = '#000'; b.fillRect(0, 0, W, H);
    const s = pitch - gap();
    const hollow = s >= 5;
    b.strokeStyle = 'rgba(216,210,194,.42)'; b.lineWidth = 0.75;
    b.fillStyle = 'rgba(216,210,194,.24)';
    // Once your life has filled in on arrival, spent weeks are just part of this picture
    if (reveal >= 1) {
      for (let i = 0; i < Math.min(weeks.lived, cells.length); i++) {
        b.fillStyle = `rgba(216,210,194,${(lifeColor(i) * 0.9).toFixed(3)})`;
        b.fillRect(cells[i].x, cells[i].y, s, s);
      }
      b.fillStyle = 'rgba(216,210,194,.24)';
    }
    baked = reveal >= 1;
    for (let i = weeks.lived; i < cells.length; i++) {
      const c = cells[i];
      if (hollow) b.strokeRect(c.x + 0.35, c.y + 0.35, s - 0.7, s - 0.7); else b.fillRect(c.x, c.y, s, s);
    }
  }
  const lifeColor = (i) => {
    // Decades alternate in strength, so you can pick out your twenties at a glance
    const decade = Math.floor(i / 521.775);
    return decade % 2 ? 1 : 0.78;
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
    const s = pitch - gap();
    // On arrival your life so far fills in, oldest first, then the heart starts
    if (reveal < 1) reveal = frozen ? 1 : Math.min(1, (t - startAt) / 2400);
    const eased = reveal < 1 ? 1 - Math.pow(1 - reveal, 2.4) : 1;
    const shown = Math.floor(Math.min(weeks.lived, cells.length) * eased);
    const beatOn = reveal >= 1 && weeks.known && !frozen;
    if (beatOn && t - lastBeat > BEAT) {
      lastBeat = t; beatCount++;
      const c = cells[Math.min(weeks.lived, cells.length - 1)];
      // The heart always beats. The ripple only spreads while you're around to see it.
      if (c && t - P.at < 60000) waves.push({ x: c.x + s / 2, y: c.y + s / 2, t });
    }
    waves = waves.filter((w) => t - w.t < RIPPLE_LIFE);
    // How far each ripple has reached, sampled per square
    const speed = 0.34;
    const lift = (c) => {
      let v = 0;
      for (const w of waves) {
        const age = t - w.t, reach = age * speed;
        const d = Math.hypot(c.x - w.x, c.y - w.y);
        const off = (d - reach) / 74;
        if (off > -1.6 && off < 1.6) v += Math.exp(-off * off * 2.6) * Math.exp(-d / 620) * Math.max(0, 1 - age / RIPPLE_LIFE);
      }
      return v;
    };
    if (reveal >= 1 && !baked) paintBase();
    if (!baked) {
      for (let i = 0; i < shown; i++) {
        ctx.fillStyle = `rgba(216,210,194,${(lifeColor(i) * 0.9).toFixed(3)})`;
        ctx.fillRect(cells[i].x, cells[i].y, s, s);
      }
    }
    // Only the squares the ripple is passing through get touched
    if (waves.length) {
      const count = Math.min(weeks.lived, cells.length);
      for (let i = 0; i < cells.length; i++) {
        const c = cells[i];
        const v = lift(c);
        if (v < 0.03) continue;
        ctx.fillStyle = i < count ? `rgba(255,250,235,${Math.min(0.8, v * 0.6).toFixed(2)})` : `rgba(232,58,84,${Math.min(0.62, v * 0.62).toFixed(2)})`;
        ctx.fillRect(c.x, c.y, s, s);
      }
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
      ctx.fillStyle = 'rgba(255,255,255,.2)';
      for (let i = from; i < to; i++) ctx.fillRect(cells[i].x, cells[i].y, s, s);
      ctx.fillStyle = '#fff';
      ctx.fillRect(cells[over].x - 1, cells[over].y - 1, s + 2, s + 2);
      tip.style.transform = `translate(${Math.min(P.x + 14, W - 320)}px, ${Math.max(P.y - 42, 6)}px)`;
    }
    // This week: two beats, a pause
    if (reveal >= 1 && weeks.known && weeks.lived < cells.length) {
      const c = cells[weeks.lived];
      const ph = frozen ? 0.5 : ((t - lastBeat) / BEAT);
      const pulse = Math.exp(-Math.pow((ph - 0.03) * 13, 2)) + Math.exp(-Math.pow((ph - 0.3) * 15, 2)) * 0.68;
      const big = s * (1 + pulse * 0.9);
      ctx.globalAlpha = 0.22 + pulse * 0.32;
      ctx.fillStyle = `rgb(${ROSE})`;
      ctx.beginPath(); ctx.arc(c.x + s / 2, c.y + s / 2, big * 1.7, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = pulse > 0.6 ? '#FF7B90' : `rgb(${ROSE})`;
      ctx.fillRect(c.x + (s - big) / 2, c.y + (s - big) / 2, big, big);
    }
    // A new layout fades up rather than popping in
    if (fade < 1) {
      fade = frozen ? 1 : Math.min(1, fade + (dt || 1) * 2.6);
      ctx.globalAlpha = 1 - fade;
      ctx.fillStyle = '#000';
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
    // A two-beat pulse reads fine at 20 frames a second; idle, it needs even fewer
    get fps() { return reveal < 1 || performance.now() - S.pointer.at < 60000 ? 20 : 10; },
    resize() { size(); flow(S.widgetRects()); },
    moved(rects) { if (!cells.length) flow(rects); },
    layout(rects) { flow(rects); if (!S.running()) frame(performance.now(), 0, true); },
    frame,
    decorate(item, body) { if (item.type === 'clock') stampLeft(body); },
    lifeChanged() { reveal = 0; baked = false; startAt = performance.now(); waves = []; flow(S.widgetRects()); }
  };
});
