'use strict';
// ---------- The Orrery ----------
// A brass clockwork model of the solar system in a dark room, lit only by its own Sun. Every planet sits
// on its arm where it really is today, painted to look like itself and lit from the Sun's side, so the
// ones beyond the Sun show you a full face and the ones in front show a crescent. The calendar ring is
// engraved with the months, and Earth's arm points at the date. Hold the background to crank it forward
// through time; let go and it winds back to today. The engraving and the planets' surfaces are painted
// once. Only the arms and the lighting are redrawn, and only when something moves.

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

// Smooth 3D noise for the planets' surfaces, seeded so each world always looks the same
function orNoise(seed) {
  const hash = (x, y, z) => {
    let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1274126177) ^ Math.imul(seed, 974711);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const s = (t) => t * t * (3 - 2 * t), l = (a, b, t) => a + (b - a) * t;
  const n = (x, y, z) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), u = s(x - xi), v = s(y - yi), w = s(z - zi);
    return l(l(l(hash(xi, yi, zi), hash(xi + 1, yi, zi), u), l(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), u), v),
      l(l(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), u), l(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), u), v), w);
  };
  return (x, y, z, oct = 4) => {
    let v = 0, a = 0.5, f = 1;
    for (let i = 0; i < oct; i++) { v += a * n(x * f + 31, y * f + 17, z * f + 7); f *= 2.03; a *= 0.5; }
    return v / (1 - Math.pow(0.5, oct));
  };
}
const orMix = (a, b, t) => { t = Math.max(0, Math.min(1, t)); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; };

// What each world's surface looks like: a colour for a point (x, y, z) on its sphere, where lat runs -1 to 1
const SURFACES = {
  Mercury(n, x, y, z) {
    const c = orMix([78, 74, 70], [170, 164, 156], n(x * 3, y * 3, z * 3, 5) * 1.2 - 0.1);
    const crater = n(x * 9, y * 9, z * 9, 2);
    return crater > 0.66 ? orMix(c, [52, 50, 48], (crater - 0.66) * 4) : c;
  },
  Venus(n, x, y, z, lat) {
    return orMix([186, 150, 86], [246, 230, 190], n(x * 2 + lat * 3, y * 7, z * 2, 4) * 0.9 + 0.15);
  },
  Earth(n, x, y, z, lat) {
    const land = n(x * 1.7, y * 1.7, z * 1.7, 5), cloud = n(x * 3.2, y * 5.5, z * 3.2, 4);
    let c = land > 0.54
      ? orMix([58, 88, 44], [150, 126, 84], (land - 0.54) * 4 + Math.abs(lat) * 0.5)
      : orMix([8, 26, 66], [24, 70, 122], land * 1.5);
    if (Math.abs(lat) > 0.88) c = [228, 234, 240];
    return cloud > 0.57 ? orMix(c, [238, 242, 246], (cloud - 0.57) * 3.4) : c;
  },
  Mars(n, x, y, z, lat) {
    const c = orMix([92, 36, 22], [204, 110, 64], n(x * 2.4, y * 2.4, z * 2.4, 5) * 1.3 - 0.15);
    return lat > 0.86 ? [232, 224, 214] : c;
  },
  Jupiter(n, x, y, z, lat) {
    const band = Math.sin((lat + n(x * 2, y * 3, z * 2, 3) * 0.14) * 16);
    let c = band > 0.1 ? orMix([222, 206, 178], [244, 234, 214], band) : orMix([140, 88, 54], [192, 142, 96], band + 1);
    // The Great Red Spot, in the southern belt
    const sx = x - 0.45, sy = lat + 0.34;
    if (z > 0.3 && sx * sx * 2.2 + sy * sy * 14 < 0.05) c = orMix(c, [176, 84, 52], 0.8);
    return c;
  },
  Saturn(n, x, y, z, lat) {
    const band = Math.sin(lat * 12 + n(x * 2, y * 2, z * 2, 2) * 0.5);
    return orMix([180, 148, 94], [236, 218, 170], band * 0.5 + 0.5);
  },
  Moon(n, x, y, z) {
    return n(x * 2, y * 2, z * 2, 4) > 0.57 ? [96, 94, 90] : orMix([140, 138, 132], [196, 194, 188], n(x * 6, y * 6, z * 6, 3));
  }
};
// Sizes are a model-maker's, not to scale. air is the thin lit haze on a world with an atmosphere.
const BODIES = [
  { name: 'Mercury', size: 5.5 },
  { name: 'Venus', size: 8.5, air: [250, 224, 168] },
  { name: 'Earth', size: 9, air: [110, 170, 255] },
  { name: 'Mars', size: 7, air: [230, 140, 100] },
  { name: 'Jupiter', size: 19 },
  { name: 'Saturn', size: 15, ring: true }
];
const OR_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

scene.define('orrery', (S) => {
  const canvas = document.createElement('canvas');
  canvas.className = 'scene-canvas';
  S.back.append(canvas);
  const ctx = canvas.getContext('2d', { alpha: false });
  const tip = document.createElement('div');
  tip.className = 'or-tip'; tip.hidden = true; tip.setAttribute('aria-hidden', 'true');
  const plaque = document.createElement('div');
  plaque.className = 'or-plaque'; plaque.hidden = true; plaque.setAttribute('aria-hidden', 'true');
  // A switch to put the widgets away and look at the instrument on its own
  const view = document.createElement('button');
  view.type = 'button'; view.className = 'or-view';
  S.over.append(tip, plaque, view);
  let viewing = false;
  function setView(on) {
    viewing = on;
    document.documentElement.classList.toggle('or-viewing', on);
    view.setAttribute('aria-pressed', String(on));
    view.innerHTML = `${ico(on ? 'eye' : 'eyeoff')}<span>${on ? 'Show widgets' : 'Hide widgets'}</span>`;
  }
  setView(false);
  view.addEventListener('click', () => setView(!viewing));
  const onKey = (e) => { if (viewing && e.key === 'Escape' && !document.querySelector('dialog[open]')) setView(false); };
  addEventListener('keydown', onKey);

  const TILT = 0.34;                         // how far the plane is foreshortened: seen from a little above
  const COS_TILT = Math.sqrt(1 - TILT * TILT);
  let W = 0, H = 0, dpr = 1, cx = 0, cy = 0, RX = 0, unit = 1, base = null, radii = [], skins = {};
  // Days ahead of today the model is showing. Winding in on arrival, cranking, and winding back all move this.
  let offset = S.still ? 0 : -50, wind = S.still ? null : { from: -50, to: 0, at: performance.now(), ms: 2600 };
  let crank = null, hold = null, drawnKey = '', hover = null, spots = [], lastHour = 0;
  const sun = { x: 0, y: 0, r: 0, lift: 0 };

  function size() {
    W = innerWidth; H = innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    // As wide as the window allows, but short enough that the whole instrument stays on screen
    RX = Math.min(W * 0.47, (H * 0.4) / TILT);
    cx = W / 2; cy = H * 0.56;
    unit = Math.max(0.7, RX / 640);
    radii = BODIES.map((_, i) => RX * (0.2 + i * 0.128));
    sun.lift = 34 * unit; sun.x = cx; sun.y = cy - sun.lift; sun.r = 13 * unit;
    paintSkins();
    paintBase();
  }
  // A point on the instrument's plane at angle a (radians, counterclockwise from the right) and radius r
  const at = (a, r) => ({ x: cx + Math.cos(a) * r, y: cy - Math.sin(a) * r * TILT });

  // Each world's surface is painted once onto a small sphere, keeping the colour and the surface's
  // direction at every pixel. Lighting it from wherever the Sun is then costs one pass over a few
  // thousand pixels, done only when that world has moved.
  function paintSkins() {
    skins = {};
    const make = (name, r, seed, air) => {
      const px = Math.max(8, Math.ceil(r * 2 * dpr));
      const c = document.createElement('canvas'); c.width = c.height = px;
      const g = c.getContext('2d'), img = g.createImageData(px, px);
      const N = px * px, col = new Float32Array(N * 3), nrm = new Float32Array(N * 3), cover = new Float32Array(N);
      const n = orNoise(seed), paint = SURFACES[name];
      // Turn the globe on its axis, so bands and caps lie the way they do on the real thing
      const tilt = name === 'Saturn' ? -0.32 : name === 'Earth' ? 0.41 : name === 'Mars' ? 0.44 : 0.05;
      const ct = Math.cos(tilt), st = Math.sin(tilt);
      for (let j = 0; j < px; j++) for (let i = 0; i < px; i++) {
        const x = (i + 0.5) / px * 2 - 1, y = (j + 0.5) / px * 2 - 1, d = Math.sqrt(x * x + y * y);
        const k = j * px + i;
        cover[k] = Math.max(0, Math.min(1, (1 - d) * px / 2 + 0.5));
        if (!cover[k]) continue;
        const z = Math.sqrt(Math.max(0, 1 - Math.min(1, d) ** 2));
        const yt = y * ct - x * st, xt = x * ct + y * st;
        const rgb = paint(n, xt, yt, z, -yt);
        // Gas giants darken a little towards their edge even in full light
        const limb = name === 'Jupiter' || name === 'Saturn' || name === 'Venus' ? 0.72 + 0.28 * z : 0.9 + 0.1 * z;
        col[k * 3] = rgb[0] * limb; col[k * 3 + 1] = rgb[1] * limb; col[k * 3 + 2] = rgb[2] * limb;
        nrm[k * 3] = x; nrm[k * 3 + 1] = -y; nrm[k * 3 + 2] = z;
      }
      skins[name] = { c, g, img, px, col, nrm, cover, air, key: '' };
    };
    BODIES.forEach((b, i) => make(b.name, b.size * unit, i + 3, b.air));
    make('Moon', 2.8 * unit, 11);
  }
  // Light a world: L is the direction to the Sun as seen from here (x right, y up, z towards you)
  function shade(s, L) {
    const key = `${L[0].toFixed(2)},${L[1].toFixed(2)},${L[2].toFixed(2)}`;
    if (key === s.key) return s.c;
    s.key = key;
    const d = s.img.data, N = s.px * s.px;
    for (let k = 0; k < N; k++) {
      const a = s.cover[k], o = k * 4;
      if (!a) { d[o + 3] = 0; continue; }
      const nx = s.nrm[k * 3], ny = s.nrm[k * 3 + 1], nz = s.nrm[k * 3 + 2];
      const dot = nx * L[0] + ny * L[1] + nz * L[2];
      // A soft terminator, then ordinary falloff towards it, and almost nothing on the night side
      const t = Math.max(0, Math.min(1, (dot + 0.05) / 0.17));
      const lit = 0.025 + 0.975 * t * t * (3 - 2 * t) * (0.3 + 0.7 * Math.max(0, dot));
      let r = s.col[k * 3] * lit, g = s.col[k * 3 + 1] * lit, b = s.col[k * 3 + 2] * lit;
      if (s.air) {
        // Sunlight scattering through the air at the edge of the disc
        const rim = Math.pow(1 - nz, 2.5) * Math.max(0, dot + 0.2) * 0.9;
        r += s.air[0] * rim; g += s.air[1] * rim; b += s.air[2] * rim;
      }
      d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = a * 255;
    }
    s.g.putImageData(s.img, 0, 0);
    return s.c;
  }
  // Which way the Sun is from a point on the plane at angle a and radius r, at height h above it
  function sunward(a, r, h) {
    const wx = -Math.cos(a) * r, wy = h, wz = Math.sin(a) * r;
    const vx = wx, vy = wy * COS_TILT - wz * TILT, vz = wy * TILT + wz * COS_TILT;
    const m = Math.hypot(vx, vy, vz) || 1;
    return [vx / m, vy / m, vz / m];
  }

  // The still part: a dark case, and engraving that fades the further it sits from the Sun's light
  function paintBase() {
    base = document.createElement('canvas');
    base.width = canvas.width; base.height = canvas.height;
    const b = base.getContext('2d');
    b.scale(dpr, dpr);
    const bg = b.createRadialGradient(cx, cy, RX * 0.05, cx, cy, Math.max(W, H) * 0.75);
    bg.addColorStop(0, '#0C1520'); bg.addColorStop(0.45, '#060B11'); bg.addColorStop(1, '#020305');
    b.fillStyle = bg; b.fillRect(0, 0, W, H);
    b.save(); b.translate(cx, cy); b.scale(1, TILT); b.translate(-cx, -cy);
    // The Sun's light pooled on the plate beneath it
    const pool = b.createRadialGradient(cx, cy, 0, cx, cy, RX * 0.75);
    pool.addColorStop(0, 'rgba(255, 186, 100, 0.2)'); pool.addColorStop(0.3, 'rgba(201, 146, 66, 0.07)'); pool.addColorStop(1, 'rgba(201, 146, 66, 0)');
    b.fillStyle = pool; b.beginPath(); b.arc(cx, cy, RX, 0, Math.PI * 2); b.fill();
    // Orbits: a fine double line, catching less of the light the further out it is
    radii.forEach((r) => {
      const lit = 0.46 * Math.pow(1 - r / RX, 0.8) + 0.07;
      b.strokeStyle = `rgba(214, 170, 92, ${lit.toFixed(3)})`; b.lineWidth = 1 / TILT * 0.6;
      b.beginPath(); b.arc(cx, cy, r, 0, Math.PI * 2); b.stroke();
      b.strokeStyle = `rgba(214, 170, 92, ${(lit * 0.4).toFixed(3)})`; b.lineWidth = 1 / TILT * 0.4;
      b.beginPath(); b.arc(cx, cy, r + 3, 0, Math.PI * 2); b.stroke();
    });
    // The calendar ring, out at the edge of the light: a dark brass band with a tick for every day
    const r0 = RX * 0.9, r1 = RX;
    b.lineWidth = r1 - r0;
    b.strokeStyle = 'rgba(150, 110, 50, 0.07)';
    b.beginPath(); b.arc(cx, cy, (r0 + r1) / 2, 0, Math.PI * 2); b.stroke();
    b.lineWidth = 1.2;
    b.strokeStyle = 'rgba(214, 170, 92, 0.22)';
    b.beginPath(); b.arc(cx, cy, r0, 0, Math.PI * 2); b.stroke();
    b.beginPath(); b.arc(cx, cy, r1, 0, Math.PI * 2); b.stroke();
    const year = new Date().getFullYear();
    for (let d = 0; d < 366; d++) {
      const day = new Date(year, 0, 1 + d);
      if (day.getFullYear() !== year) break;
      const a = heliocentric('Earth', day.getTime()).lon;
      const first = day.getDate() === 1;
      const len = first ? (r1 - r0) : (r1 - r0) * (day.getDate() % 5 ? 0.18 : 0.32);
      b.strokeStyle = first ? 'rgba(230, 196, 126, 0.4)' : 'rgba(214, 170, 92, 0.12)';
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
    b.fillStyle = 'rgba(214, 180, 116, 0.4)';
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
    // The room falls away into darkness, with a little grain so the black has some depth to it
    const vig = b.createRadialGradient(cx, cy, Math.min(W, H) * 0.22, cx, cy, Math.max(W, H) * 0.7);
    vig.addColorStop(0, 'rgba(0, 0, 0, 0)'); vig.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
    b.fillStyle = vig; b.fillRect(0, 0, W, H);
    const tile = document.createElement('canvas'); tile.width = tile.height = 96;
    const tg = tile.getContext('2d'), ti = tg.createImageData(96, 96);
    let seed = 7;
    for (let i = 0; i < ti.data.length; i += 4) {
      seed = (seed * 16807) % 2147483647;
      const v = seed / 2147483647 > 0.5 ? 255 : 0;
      ti.data[i] = ti.data[i + 1] = ti.data[i + 2] = v; ti.data[i + 3] = 255;
    }
    tg.putImageData(ti, 0, 0);
    b.globalAlpha = 0.025; b.fillStyle = b.createPattern(tile, 'repeat'); b.fillRect(0, 0, W, H); b.globalAlpha = 1;
    drawnKey = '';
  }

  // Brass catches the Sun: bright near it, falling to almost nothing at the far end of each arm
  const glint = (x, y) => Math.max(0.1, 1 - Math.hypot(x - cx, (y - cy) / TILT) / (RX * 0.95));
  function rod(x1, y1, x2, y2, w) {
    const g = ctx.createLinearGradient(x1, y1, x2, y2);
    g.addColorStop(0, `rgba(232, 188, 104, ${glint(x1, y1).toFixed(2)})`);
    g.addColorStop(1, `rgba(232, 188, 104, ${glint(x2, y2).toFixed(2)})`);
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(10, 6, 2, 0.8)'; ctx.lineWidth = w + 1.4;
    ctx.beginPath(); ctx.moveTo(x1, y1 + 0.8); ctx.lineTo(x2, y2 + 0.8); ctx.stroke();
    ctx.strokeStyle = g; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  // Saturn's rings: three bands with the Cassini gap, in two halves so the planet sits inside them
  function rings(x, y, r, L, front) {
    const bands = [[1.24, 1.5, [140, 120, 88], 0.5], [1.5, 1.95, [226, 204, 160], 0.85], [2.03, 2.3, [190, 168, 126], 0.7]];
    const lit = 0.18 + 0.82 * Math.max(0, 0.45 + 0.55 * L[2]);
    ctx.save();
    ctx.translate(x, y); ctx.rotate(-0.32); ctx.scale(1, 0.3);
    ctx.beginPath(); ctx.rect(-r * 3, front ? 0 : -r * 3, r * 6, r * 3); ctx.clip();
    for (const [a, b, c, alpha] of bands) {
      ctx.strokeStyle = `rgba(${c.map((v) => Math.round(v * lit)).join(', ')}, ${alpha})`;
      ctx.lineWidth = (b - a) * r;
      ctx.beginPath(); ctx.arc(0, 0, (a + b) / 2 * r, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
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
    ctx.fillStyle = 'rgba(60, 40, 14, 0.55)'; ctx.fill();
    ctx.strokeStyle = 'rgba(232, 196, 120, 0.34)'; ctx.lineWidth = 1 / TILT * 0.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2); ctx.stroke();
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
      const foot = at(h.lon, radii[i]);
      const post = (14 + i * 3) * unit + body.size * unit * 0.4;
      const p = { body, lon: h.lon, au: h.r, foot, x: foot.x, y: foot.y - post, size: body.size * unit, hub: 4 + i * 2.2 };
      p.L = sunward(h.lon, radii[i], sun.lift - post);
      items.push(p);
      if (body.name === 'Earth') earth = p;
    });
    // Nearer things are drawn over farther ones. The Sun's column sits in the middle.
    const depth = (p) => -Math.sin(p.lon);
    const behind = items.filter((p) => depth(p) < 0).sort((a, b) => depth(a) - depth(b));
    const front = items.filter((p) => depth(p) >= 0).sort((a, b) => depth(a) - depth(b));
    const drawPlanet = (p) => {
      // The arm runs out from the hub at its own height on the column, then a post rises to the planet
      rod(cx, cy - p.hub * unit, p.foot.x, p.foot.y, 1.5 * unit);
      rod(p.foot.x, p.foot.y, p.x, p.y + p.size * 0.8, 1.1 * unit);
      if (p.body.ring) rings(p.x, p.y, p.size, p.L, false);
      ctx.drawImage(shade(skins[p.body.name], p.L), p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
      if (p.body.ring) rings(p.x, p.y, p.size, p.L, true);
      spots.push({ x: p.x, y: p.y, r: p.size + 6, label: () => `${p.body.name}, ${Math.round(p.au * AU_KM / 1e6).toLocaleString()} million km from the Sun` });
      if (p === earth) drawMoon(p, ms);
    };
    behind.forEach(drawPlanet);
    // The Sun: the only light in the room
    rod(cx, cy, cx, sun.y + sun.r * 0.6, 3.6 * unit);
    const bloom = ctx.createRadialGradient(sun.x, sun.y, sun.r * 0.4, sun.x, sun.y, sun.r * 7);
    bloom.addColorStop(0, 'rgba(255, 196, 96, 0.44)'); bloom.addColorStop(0.25, 'rgba(255, 150, 56, 0.13)'); bloom.addColorStop(1, 'rgba(255, 130, 40, 0)');
    ctx.fillStyle = bloom; ctx.beginPath(); ctx.arc(sun.x, sun.y, sun.r * 7, 0, Math.PI * 2); ctx.fill();
    const face = ctx.createRadialGradient(sun.x, sun.y, 0, sun.x, sun.y, sun.r);
    face.addColorStop(0, '#FFFCEE'); face.addColorStop(0.5, '#FFE496'); face.addColorStop(0.86, '#F7A43A'); face.addColorStop(1, '#C8661A');
    ctx.fillStyle = face; ctx.beginPath(); ctx.arc(sun.x, sun.y, sun.r, 0, Math.PI * 2); ctx.fill();
    spots.push({ x: sun.x, y: sun.y, r: sun.r + 6, label: () => 'The Sun' });
    front.forEach(drawPlanet);
    // Earth's arm carries a pointer out to the calendar ring: today's date, or wherever you've cranked it to
    if (earth) {
      const tipPt = at(earth.lon, RX * 0.9);
      ctx.strokeStyle = 'rgba(232, 196, 120, 0.45)'; ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(earth.foot.x, earth.foot.y); ctx.lineTo(tipPt.x, tipPt.y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(244, 214, 150, 0.85)';
      ctx.beginPath(); ctx.arc(tipPt.x, tipPt.y, 2.2, 0, Math.PI * 2); ctx.fill();
    }
  }
  // The Moon on its little arm around Earth, at its real angle: between Earth and Sun when it's new
  function drawMoon(e, ms) {
    const phase = moonPhase(new Date(ms));
    const a = e.lon + Math.PI + phase * Math.PI * 2;
    const rr = 19 * unit, mr = 2.8 * unit;
    const mx = e.x + Math.cos(a) * rr, my = e.y - Math.sin(a) * rr * TILT;
    rod(e.x, e.y, mx, my, 0.7 * unit);
    ctx.drawImage(shade(skins.Moon, e.L), mx - mr, my - mr, mr * 2, mr * 2);
    spots.push({ x: mx, y: my, r: 8, label: () => `The Moon, ${moonName(phase).toLowerCase()}` });
  }

  // ---- Cranking: hold the background and the model runs forward, faster the longer you hold
  const ignore = (el) => el?.closest?.('.widget, .topbar, button, a, input, select, textarea, dialog, .sheet, .modal, .arrange-bar, .or-view');
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
      removeEventListener('keydown', onKey);
      document.documentElement.classList.remove('or-cranking', 'or-viewing');
    }
  };
});
