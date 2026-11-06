'use strict';
// ---------- The Orrery ----------
// A brass clockwork model of the solar system, seen from a little above, with every planet on its arm
// where it really is today. The calendar ring is engraved with the months, and Earth's arm points at
// the date. Hold the background to crank it forward through time; let go and it winds back to today.
// The engraved parts are painted once. Only the arms and planets are redrawn, and only when they move.

// Orbital elements (Standish, JPL), good for 1800 to 2050: a, e, I, L, long. of perihelion, long. of node,
// each followed by its rate per century
const ORBITS = {
  Mercury: [0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593, 0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081],
  Venus: [0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255, 0.00000390, -0.00004107, -0.00078890, 58517.81538729, 0.00268329, -0.27769418],
  Earth: [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0, 0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0],
  Mars: [1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891, 0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343],
  Jupiter: [5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909, -0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106],
  Saturn: [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448, -0.00125060, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794]
};
const AU_KM = 149597870.7;
// Where a planet is around the Sun on a given day: its angle along the ecliptic and its distance
function heliocentric(name, ms) {
  const o = ORBITS[name], T = (ms / 864e5 + 2440587.5 - 2451545) / 36525, rad = Math.PI / 180;
  const a = o[0] + o[6] * T, e = o[1] + o[7] * T, I = (o[2] + o[8] * T) * rad;
  const L = o[3] + o[9] * T, peri = o[4] + o[10] * T, node = o[5] + o[11] * T;
  const w = (peri - node) * rad, N = node * rad;
  let M = ((L - peri) % 360 + 540) % 360 - 180;
  M *= rad;
  let E = M + e * Math.sin(M);
  for (let i = 0; i < 6; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  const xp = a * (Math.cos(E) - e), yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const cw = Math.cos(w), sw = Math.sin(w), cN = Math.cos(N), sN = Math.sin(N), cI = Math.cos(I);
  const x = (cw * cN - sw * sN * cI) * xp + (-sw * cN - cw * sN * cI) * yp;
  const y = (cw * sN + sw * cN * cI) * xp + (-sw * sN + cw * cN * cI) * yp;
  return { lon: Math.atan2(y, x), r: Math.hypot(x, y) };
}

// How each body looks: size against the others, and the enamel it's painted in
const BODIES = [
  { name: 'Mercury', size: 4.6, lit: '#D8D3C8', dark: '#55514A' },
  { name: 'Venus', size: 6.6, lit: '#F6E7C1', dark: '#7B6A43' },
  { name: 'Earth', size: 7, lit: '#9FD0E0', dark: '#1F4E63' },
  { name: 'Mars', size: 5.6, lit: '#E0896A', dark: '#6A2716' },
  { name: 'Jupiter', size: 14, lit: '#F1DDBB', dark: '#7B5A36', bands: true },
  { name: 'Saturn', size: 11.5, lit: '#EED9A4', dark: '#6F5A2C', ring: true }
];
const OR_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const BRASS = { light: '#F4DC9A', mid: '#C9A253', deep: '#7A5A22', line: 'rgba(214, 178, 98, 0.55)', faint: 'rgba(214, 178, 98, 0.22)' };

scene.define('orrery', (S) => {
  const canvas = document.createElement('canvas');
  canvas.className = 'scene-canvas';
  S.back.append(canvas);
  const ctx = canvas.getContext('2d', { alpha: false });
  const tip = document.createElement('div');
  tip.className = 'or-tip'; tip.hidden = true; tip.setAttribute('aria-hidden', 'true');
  const plaque = document.createElement('div');
  plaque.className = 'or-plaque'; plaque.hidden = true; plaque.setAttribute('aria-hidden', 'true');
  S.over.append(tip, plaque);

  const TILT = 0.34;                         // how far the plane is foreshortened: seen from a little above
  let W = 0, H = 0, dpr = 1, cx = 0, cy = 0, RX = 0, unit = 1, base = null, radii = [];
  // Days ahead of today the model is showing. Winding in on arrival, cranking, and winding back all move this.
  let offset = S.still ? 0 : -50, wind = S.still ? null : { from: -50, to: 0, at: performance.now(), ms: 2600 };
  let crank = null, hold = null, drawnKey = '', hover = null, spots = [], lastHour = 0;

  function size() {
    W = innerWidth; H = innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    // As wide as the window allows, but short enough that the whole instrument stays on screen
    RX = Math.min(W * 0.47, (H * 0.4) / TILT);
    cx = W / 2; cy = H * 0.56;
    unit = Math.max(0.7, RX / 640);
    radii = BODIES.map((_, i) => RX * (0.2 + i * 0.128));
    paintBase();
  }
  // A point on the instrument's plane at angle a (radians, counterclockwise from the right) and radius r
  const at = (a, r) => ({ x: cx + Math.cos(a) * r, y: cy - Math.sin(a) * r * TILT });

  // The still part: lacquered case, engraved rings and the calendar. Painted once per size.
  function paintBase() {
    base = document.createElement('canvas');
    base.width = canvas.width; base.height = canvas.height;
    const b = base.getContext('2d');
    b.scale(dpr, dpr);
    const bg = b.createRadialGradient(cx, cy, RX * 0.1, cx, cy, Math.max(W, H) * 0.8);
    bg.addColorStop(0, '#16283A'); bg.addColorStop(0.55, '#0E1B28'); bg.addColorStop(1, '#070D14');
    b.fillStyle = bg; b.fillRect(0, 0, W, H);
    // Warm light pooled under the brass
    const pool = b.createRadialGradient(cx, cy, 0, cx, cy, RX);
    pool.addColorStop(0, 'rgba(201, 162, 83, 0.10)'); pool.addColorStop(1, 'rgba(201, 162, 83, 0)');
    b.save(); b.translate(cx, cy); b.scale(1, TILT); b.translate(-cx, -cy);
    b.fillStyle = pool; b.beginPath(); b.arc(cx, cy, RX, 0, Math.PI * 2); b.fill();
    // Orbits: a fine double line, the way an engraver cuts them
    for (const r of radii) {
      b.strokeStyle = BRASS.line; b.lineWidth = 1 / TILT * 0.6;
      b.beginPath(); b.arc(cx, cy, r, 0, Math.PI * 2); b.stroke();
      b.strokeStyle = BRASS.faint; b.lineWidth = 1 / TILT * 0.4;
      b.beginPath(); b.arc(cx, cy, r + 3, 0, Math.PI * 2); b.stroke();
    }
    // The calendar ring: a brass band with a tick for every day and the months engraved in it
    const r0 = RX * 0.9, r1 = RX;
    b.lineWidth = (r1 - r0);
    b.strokeStyle = 'rgba(201, 162, 83, 0.13)';
    b.beginPath(); b.arc(cx, cy, (r0 + r1) / 2, 0, Math.PI * 2); b.stroke();
    b.lineWidth = 1.2;
    b.strokeStyle = BRASS.line;
    b.beginPath(); b.arc(cx, cy, r0, 0, Math.PI * 2); b.stroke();
    b.beginPath(); b.arc(cx, cy, r1, 0, Math.PI * 2); b.stroke();
    const year = new Date().getFullYear();
    for (let d = 0; d < 366; d++) {
      const day = new Date(year, 0, 1 + d);
      if (day.getFullYear() !== year) break;
      const a = heliocentric('Earth', day.getTime()).lon;
      const first = day.getDate() === 1;
      const len = first ? (r1 - r0) : (r1 - r0) * (day.getDate() % 5 ? 0.18 : 0.32);
      b.strokeStyle = first ? 'rgba(244, 220, 154, 0.75)' : BRASS.faint;
      b.lineWidth = first ? 1.6 : 1;
      b.beginPath();
      b.moveTo(cx + Math.cos(a) * r1, cy - Math.sin(a) * r1);
      b.lineTo(cx + Math.cos(a) * (r1 - len), cy - Math.sin(a) * (r1 - len));
      b.stroke();
    }
    b.restore();
    // Month names, cut into the band. They lie on the plane, so the far side reads upside down, as it would.
    const fs = Math.max(10, Math.min(15, RX * 0.022));
    b.font = `400 ${fs}px Marcellus, Georgia, serif`;
    b.fillStyle = 'rgba(232, 204, 138, 0.72)';
    b.textAlign = 'center'; b.textBaseline = 'middle';
    for (let m = 0; m < 12; m++) {
      const a = heliocentric('Earth', new Date(year, m, 15).getTime()).lon;
      b.save();
      b.translate(cx, cy); b.scale(1, TILT);
      b.rotate(-a); b.translate((r0 + r1) / 2, 0); b.rotate(Math.PI / 2);
      b.scale(1, 1 / TILT * 0.62);
      b.fillText(OR_MONTHS[m], 0, 0);
      b.restore();
    }
    // A soft vignette, so the edges of the case fall away
    const vig = b.createRadialGradient(cx, H * 0.5, Math.min(W, H) * 0.35, cx, H * 0.5, Math.max(W, H) * 0.75);
    vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,0.55)');
    b.fillStyle = vig; b.fillRect(0, 0, W, H);
    drawnKey = '';
  }

  // A brass ball, lit from the upper left
  function ball(x, y, r, lit, dark) {
    const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.45, r * 0.1, x, y, r);
    g.addColorStop(0, '#FFFDF6'); g.addColorStop(0.22, lit); g.addColorStop(0.85, dark); g.addColorStop(1, '#0A0F14');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  function rod(x1, y1, x2, y2, w) {
    ctx.lineCap = 'round';
    ctx.strokeStyle = BRASS.deep; ctx.lineWidth = w + 1.4;
    ctx.beginPath(); ctx.moveTo(x1, y1 + 0.8); ctx.lineTo(x2, y2 + 0.8); ctx.stroke();
    ctx.strokeStyle = BRASS.mid; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 238, 190, 0.55)'; ctx.lineWidth = Math.max(0.6, w * 0.3);
    ctx.beginPath(); ctx.moveTo(x1, y1 - w * 0.25); ctx.lineTo(x2, y2 - w * 0.25); ctx.stroke();
  }
  // The gear train under the Sun. It turns as the model moves through time.
  function gear(x, y, r, teeth, turn) {
    ctx.save();
    ctx.translate(x, y); ctx.scale(1, TILT); ctx.rotate(turn);
    ctx.beginPath();
    for (let i = 0; i < teeth * 2; i++) {
      const a = (i / (teeth * 2)) * Math.PI * 2, rr = i % 2 ? r : r * 0.86;
      const a2 = a + Math.PI / teeth;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      ctx.lineTo(Math.cos(a2) * rr, Math.sin(a2) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(122, 90, 34, 0.55)'; ctx.fill();
    ctx.strokeStyle = 'rgba(244, 220, 154, 0.4)'; ctx.lineWidth = 1 / TILT * 0.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(244, 220, 154, 0.35)'; ctx.stroke();
    ctx.restore();
  }

  function draw(ms) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.drawImage(base, 0, 0, W, H);
    const days = (ms - Date.now()) / 864e5 + 3650;
    gear(cx - RX * 0.07, cy + RX * 0.035, RX * 0.07, 22, days * 0.06);
    gear(cx + RX * 0.06, cy + RX * 0.05, RX * 0.045, 14, -days * 0.06 * 22 / 14);
    const items = [];
    spots = [];
    let earth = null;
    BODIES.forEach((body, i) => {
      const h = heliocentric(body.name, ms);
      const r = radii[i];
      const foot = at(h.lon, r);
      const post = (14 + i * 3) * unit;
      const p = { body, lon: h.lon, au: h.r, foot, x: foot.x, y: foot.y - post, size: body.size * unit, hub: 4 + i * 2.2 };
      items.push(p);
      if (body.name === 'Earth') earth = p;
    });
    // Nearer things are drawn over farther ones. The Sun's column sits in the middle.
    const depth = (p) => -Math.sin(p.lon);
    const behind = items.filter((p) => depth(p) < 0).sort((a, b) => depth(a) - depth(b));
    const front = items.filter((p) => depth(p) >= 0).sort((a, b) => depth(a) - depth(b));
    const drawPlanet = (p) => {
      // The arm runs out from the hub at its own height on the column, then a post rises to the planet
      rod(cx, cy - p.hub * unit, p.foot.x, p.foot.y, 1.6 * unit);
      rod(p.foot.x, p.foot.y, p.x, p.y + p.size * 0.6, 1.2 * unit);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath(); ctx.ellipse(p.foot.x + 2, p.foot.y + 1, p.size * 0.9, p.size * 0.9 * TILT, 0, 0, Math.PI * 2); ctx.fill();
      if (p.body.ring) {
        ctx.strokeStyle = 'rgba(238, 217, 164, 0.75)'; ctx.lineWidth = 1.4 * unit;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, p.size * 2, p.size * 0.62, -0.32, Math.PI, Math.PI * 2); ctx.stroke();
      }
      ball(p.x, p.y, p.size, p.body.lit, p.body.dark);
      if (p.body.bands) {
        ctx.save(); ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.clip();
        ctx.fillStyle = 'rgba(123, 72, 36, 0.32)';
        ctx.fillRect(p.x - p.size, p.y - p.size * 0.32, p.size * 2, p.size * 0.18);
        ctx.fillRect(p.x - p.size, p.y + p.size * 0.18, p.size * 2, p.size * 0.14);
        ctx.restore();
      }
      if (p.body.ring) {
        ctx.strokeStyle = 'rgba(238, 217, 164, 0.85)'; ctx.lineWidth = 1.4 * unit;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, p.size * 2, p.size * 0.62, -0.32, 0, Math.PI); ctx.stroke();
      }
      spots.push({ x: p.x, y: p.y, r: p.size + 6, label: () => `${p.body.name}, ${Math.round(p.au * AU_KM / 1e6).toLocaleString()} million km from the Sun` });
      if (p === earth) drawMoon(p, ms);
    };
    behind.forEach(drawPlanet);
    // The Sun on its column
    const sunR = 15 * unit, sunY = cy - 34 * unit;
    rod(cx, cy, cx, sunY + sunR * 0.5, 4 * unit);
    const halo = ctx.createRadialGradient(cx, sunY, sunR * 0.6, cx, sunY, sunR * 3.4);
    halo.addColorStop(0, 'rgba(255, 214, 120, 0.32)'); halo.addColorStop(1, 'rgba(255, 214, 120, 0)');
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(cx, sunY, sunR * 3.4, 0, Math.PI * 2); ctx.fill();
    ball(cx, sunY, sunR, '#FFF2C4', '#C08A2E');
    spots.push({ x: cx, y: sunY, r: sunR + 6, label: () => 'The Sun' });
    front.forEach(drawPlanet);
    // Earth's arm carries a pointer out to the calendar ring: today's date, or wherever you've cranked it to
    if (earth) {
      const tipPt = at(earth.lon, RX * 0.9);
      ctx.strokeStyle = 'rgba(244, 220, 154, 0.85)'; ctx.lineWidth = 1.2;
      ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(earth.foot.x, earth.foot.y); ctx.lineTo(tipPt.x, tipPt.y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = BRASS.light;
      ctx.beginPath(); ctx.arc(tipPt.x, tipPt.y, 2.4, 0, Math.PI * 2); ctx.fill();
    }
  }
  // The Moon on its little arm around Earth, at its real angle: between Earth and Sun when it's new
  function drawMoon(e, ms) {
    const phase = moonPhase(new Date(ms));
    const a = e.lon + Math.PI + phase * Math.PI * 2;
    const rr = 15 * unit;
    const mx = e.x + Math.cos(a) * rr, my = e.y - Math.sin(a) * rr * TILT;
    rod(e.x, e.y, mx, my, 0.8 * unit);
    ball(mx, my, 2.3 * unit, '#F2F0EA', '#5F5D58');
    spots.push({ x: mx, y: my, r: 8, label: () => `The Moon, ${moonName(phase).toLowerCase()}` });
  }

  // ---- Cranking: hold the background and the model runs forward, faster the longer you hold
  const ignore = (el) => el?.closest?.('.widget, .topbar, button, a, input, select, textarea, dialog, .sheet, .modal, .arrange-bar');
  function onDown(e) {
    if (S.still || e.button || arranging || ignore(e.target)) return;
    hold = { x: e.clientX, y: e.clientY, at: performance.now(), timer: setTimeout(() => {
      if (!hold) return;
      wind = null;
      crank = { at: performance.now(), last: performance.now() };
      document.documentElement.classList.add('or-cranking');
    }, 220) };
  }
  function onMove(e) {
    // Moving before the crank catches means a swipe or a selection, not a crank
    if (hold && !crank && Math.hypot(e.clientX - hold.x, e.clientY - hold.y) > 8) release();
  }
  function release() {
    if (hold) clearTimeout(hold.timer);
    hold = null;
    if (!crank) return;
    crank = null;
    document.documentElement.classList.remove('or-cranking');
    // Wind back to today, quicker for short trips
    wind = { from: offset, to: 0, at: performance.now(), ms: Math.min(1600, 500 + Math.abs(offset) * 1.2) };
  }
  addEventListener('pointerdown', onDown);
  addEventListener('pointermove', onMove, { passive: true });
  addEventListener('pointerup', release);
  addEventListener('pointercancel', release);
  addEventListener('blur', release);

  const dateFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
  function frame(t, dt, frozen) {
    if (crank && dt) {
      const held = (t - crank.at) / 1000;
      const perSec = Math.min(120, 3 + held * held * 14);   // a slow start, like taking up the slack in a crank
      offset += perSec * dt;
    } else if (wind) {
      const k = frozen ? 1 : Math.min(1, (t - wind.at) / wind.ms);
      const e = 1 - Math.pow(1 - k, 3);
      offset = wind.from + (wind.to - wind.from) * e;
      if (k >= 1) wind = null;
    }
    const moving = !!crank || !!wind;
    // The plaque shows the date only while the model is away from today
    const away = Math.abs(offset) > 0.5 && (crank || (wind && wind.to === 0 && wind.from > 0));
    plaque.hidden = !away;
    const ms = Date.now() + offset * 864e5;
    if (away) plaque.textContent = dateFmt.format(new Date(ms));
    // Positions creep with the real clock too: redraw once an hour when nothing else moves
    const hour = Math.floor(Date.now() / 36e5);
    const key = `${offset.toFixed(3)}|${hour}`;
    if (key !== drawnKey || hour !== lastHour) { drawnKey = key; lastHour = hour; draw(ms); }
    // Hover a planet to read what it is and how far out it sits
    const P = S.pointer;
    let over = null;
    if (!moving && P.seen && t - P.at < 6000 && !ignore(document.elementFromPoint(P.x, P.y))) {
      for (const s of spots) if (Math.hypot(P.x - s.x, P.y - s.y) < s.r) over = s;
    }
    if (over !== hover) {
      hover = over;
      tip.hidden = !over;
      if (over) tip.textContent = over.label();
    }
    if (over) tip.style.transform = `translate(${Math.min(P.x + 14, W - 340)}px, ${Math.max(P.y - 40, 6)}px)`;
  }

  size();
  // The engraving uses the theme's face, so paint it again once that has loaded
  document.fonts?.load('15px Marcellus').then(() => { paintBase(); if (!S.running()) frame(performance.now(), 0, true); }).catch(() => {});
  return {
    // Smooth while it's moving; otherwise it only has to notice the hour change and your cursor
    get fps() { return crank || wind ? 60 : (performance.now() - S.pointer.at < 1500 ? 12 : 2); },
    resize() { size(); },
    frame,
    unmount() {
      release();
      removeEventListener('pointerdown', onDown);
      removeEventListener('pointermove', onMove);
      removeEventListener('pointerup', release);
      removeEventListener('pointercancel', release);
      removeEventListener('blur', release);
      document.documentElement.classList.remove('or-cranking');
    }
  };
});
