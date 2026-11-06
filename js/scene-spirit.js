'use strict';
// ---------- The Spirit Board ----------
// Mahogany, gilt letters and a glass planchette with some weight to it. A large clock becomes the
// board itself: the planchette slides from letter to letter and spells out your greeting, with the
// slight shake of hands that swear they aren't pushing. When left alone, it starts on its own.
const WOOD = `precision highp float;
uniform vec2 res; uniform float dpr;
${GLSL_NOISE}
void main() {
  vec2 px = gl_FragCoord.xy / dpr;
  vec2 size = res / dpr;
  // Long, wandering growth rings across the board, with the swirl of a cut near a knot
  vec2 q = px * vec2(0.0016, 0.012);
  float warp = fbm(q * vec2(1.6, 0.7) + 2.0) * 3.4 + fbm(q * vec2(5.0, 1.8) + 8.0) * 0.8;
  float rings = q.y * 1.5 + warp * 0.9;
  float band = 0.5 + 0.5 * sin(rings * 6.2831);
  band = smoothstep(0.1, 0.9, band);
  float fine = noise(vec2(px.x * 0.008 + warp, px.y * 0.55)) * 0.6 + noise(vec2(px.x * 0.02 + warp, px.y * 1.5)) * 0.4;
  float pore = smoothstep(0.66, 0.84, noise(vec2(px.x * 0.05 + warp * 2.0, px.y * 1.6)));
  vec3 deep = vec3(0.075, 0.028, 0.012), mid = vec3(0.235, 0.092, 0.036), red = vec3(0.335, 0.125, 0.045);
  vec3 col = mix(mix(deep, mid, 0.42), mid, band);
  col = mix(col, red, smoothstep(0.42, 0.8, fbm(q * vec2(2.2, 1.0) + 13.0)) * 0.55 * (0.4 + band));
  col *= 0.66 + 0.68 * fine;
  col *= 1.0 - pore * 0.34;
  // Chatoyance: figured mahogany shimmers in wide bands across the grain
  float figure = fbm(vec2(px.x * 0.009 + warp, px.y * 0.0035));
  col *= 0.86 + 0.42 * smoothstep(0.3, 0.72, figure);
  // French polish, a soft pool of candle on the varnish
  vec2 c = (px - size * vec2(0.5, 0.56)) / size.y;
  col += vec3(0.11, 0.05, 0.02) * exp(-dot(c, c) * 2.2) * (0.55 + 0.45 * band);
  col *= smoothstep(1.28, 0.3, length(c * vec2(0.82, 1.0))) * 0.8 + 0.2;
  // A routed edge, with a double gilt inlay inside it
  float e = min(min(px.x, px.y), min(size.x - px.x, size.y - px.y));
  col *= 0.4 + 0.6 * smoothstep(0.0, 9.0, e);
  float lineA = smoothstep(1.3, 0.3, abs(e - 11.0)), lineB = smoothstep(0.8, 0.1, abs(e - 15.5));
  float worn = 0.55 + 0.45 * noise(px * 0.08);
  col = mix(col, vec3(0.74, 0.54, 0.22) * worn, (lineA * 0.86 + lineB * 0.6));
  gl_FragColor = vec4(col, 1.0);
}`;

const SP_DEFS = `<defs>
  <linearGradient id="spGilt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6DE9A"/><stop offset=".42" stop-color="#D5A94C"/><stop offset=".56" stop-color="#9C7226"/><stop offset=".78" stop-color="#E2BB62"/><stop offset="1" stop-color="#8F6620"/></linearGradient>
  <radialGradient id="spSun" cx=".42" cy=".36" r=".7"><stop offset="0" stop-color="#FBE8AE"/><stop offset=".6" stop-color="#D5A94C"/><stop offset="1" stop-color="#7E5A1C"/></radialGradient>
  <filter id="spCut" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="-.6" stdDeviation=".2" flood-color="#000" flood-opacity=".85"/><feDropShadow dx="0" dy=".7" stdDeviation=".25" flood-color="#FFD98A" flood-opacity=".22"/></filter>
</defs>`;
function sunFace(x, y, r) {
  let rays = '';
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2, wave = i % 2, len = wave ? 1.72 : 1.5;
    const a1 = a - 0.14, a2 = a + 0.14;
    const p = (ang, rad) => `${(x + Math.cos(ang) * r * rad).toFixed(1)} ${(y + Math.sin(ang) * r * rad).toFixed(1)}`;
    rays += wave
      ? `<path d="M${p(a1, 1.02)}Q${p(a + 0.18, 1.3)} ${p(a, 1.38)}T${p(a, len)}Q${p(a - 0.14, 1.34)} ${p(a2, 1.02)}Z"/>`
      : `<path d="M${p(a1, 1.02)}L${p(a, len)}L${p(a2, 1.02)}Z"/>`;
  }
  const s = r / 30;
  return `<g filter="url(#spCut)"><g fill="url(#spGilt)" stroke="#2A1407" stroke-width=".55">${rays}</g>
    <circle cx="${x}" cy="${y}" r="${r}" fill="url(#spSun)" stroke="#2A1407" stroke-width=".9"/>
    <g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="#3A1E08" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round">
      <path d="M-18 -7C-14 -12 -8 -12 -5 -7M5 -7C8 -12 14 -12 18 -7" stroke-width="1.5"/>
      <path d="M-16 -3C-13 -6 -9 -6 -6 -3C-9 -1 -13 -1 -16 -3ZM6 -3C9 -6 13 -6 16 -3C13 -1 9 -1 6 -3Z"/>
      <circle cx="-11" cy="-3.2" r="1.7" fill="#3A1E08"/><circle cx="11" cy="-3.2" r="1.7" fill="#3A1E08"/>
      <path d="M0 -7V5C0 8 -3 9 -5 8M0 8C2 9 4 9 5 8"/>
      <path d="M-11 15C-6 12 -2 14 0 14C2 14 6 12 11 15C7 21 -7 21 -11 15Z"/><path d="M-11 15C-5 16 5 16 11 15"/>
      <path d="M-19 6C-22 9 -22 12 -20 15M19 6C22 9 22 12 20 15" stroke-width=".8"/>
    </g></g>`;
}
function moonFace(x, y, r) {
  const s = r / 30;
  return `<g filter="url(#spCut)" transform="translate(${x} ${y}) scale(${s})">
    <path d="M12 -30C-8 -33 -30 -18 -30 2C-30 22 -8 34 12 30C4 26 -2 22 -3 15C2 16 6 15 5 12C8 12 8 9 6 8C8 6 7 4 5 4C8 0 8 -3 5 -5C2 -7 -3 -6 -6 -8C-3 -18 4 -26 12 -30Z" fill="url(#spSun)" stroke="#2A1407" stroke-width="1"/>
    <g fill="none" stroke="#3A1E08" stroke-width="1.15" stroke-linecap="round">
      <path d="M-14 -4C-11 -8 -7 -8 -4 -5M-14 -1C-11 -3 -8 -3 -6 -1C-8 1 -12 1 -14 -1Z"/><circle cx="-10" cy="-1.2" r="1.5" fill="#3A1E08"/>
      <path d="M-6 15C-9 14 -12 12 -13 10M-23 -8C-25 0 -24 10 -18 18" stroke-width=".8"/>
    </g>
    <g fill="#E5BF68"><path d="M26 -14l1.6 4.4 4.4 1.6-4.4 1.6-1.6 4.4-1.6-4.4-4.4-1.6 4.4-1.6zM18 16l1 2.8 2.8 1-2.8 1-1 2.8-1-2.8-2.8-1 2.8-1z"/></g></g>`;
}
function planchetteSvg() {
  return `<svg viewBox="0 0 170 214" width="120" height="151" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <linearGradient id="plWood" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5A2A12"/><stop offset=".45" stop-color="#2E1208"/><stop offset=".7" stop-color="#47200D"/><stop offset="1" stop-color="#1C0A04"/></linearGradient>
      <linearGradient id="plBevel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FBE3A3"/><stop offset=".3" stop-color="#B98A35"/><stop offset=".55" stop-color="#F0D083"/><stop offset=".8" stop-color="#7A5520"/><stop offset="1" stop-color="#CFA650"/></linearGradient>
      <radialGradient id="plGlass" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFF4D2" stop-opacity=".02"/><stop offset=".72" stop-color="#FFF4D2" stop-opacity=".04"/><stop offset=".93" stop-color="#FFEBB8" stop-opacity=".22"/><stop offset="1" stop-color="#FFE4A2" stop-opacity=".55"/></radialGradient>
      <mask id="plHole"><rect width="170" height="214" fill="#fff"/><circle cx="85" cy="64" r="37" fill="#000"/></mask>
    </defs>
    <g mask="url(#plHole)">
      <path d="M85 3C124 3 156 34 160 76C163 112 141 150 112 180C101 192 94 204 85 211C76 204 69 192 58 180C29 150 7 112 10 76C14 34 46 3 85 3Z" fill="url(#plBevel)"/>
      <path d="M85 7C121 7 152 36 156 76C159 110 138 147 109 177C99 188 92 198 85 205C78 198 71 188 61 177C32 147 11 110 14 76C18 36 49 7 85 7Z" fill="url(#plWood)"/>
      <path d="M85 12C118 12 147 39 151 76C154 107 134 143 106 173C97 183 91 191 85 197C79 191 73 183 64 173C36 143 16 107 19 76C23 39 52 12 85 12Z" fill="none" stroke="#C69A45" stroke-width="1"/>
      <g fill="none" stroke="#D9B15A" stroke-width="1.15" stroke-linecap="round">
        <path d="M85 112C85 128 85 150 85 182"/>
        <path d="M85 124C72 120 58 124 53 134C49 143 56 151 64 148C70 145 69 137 63 137"/><path d="M85 124C98 120 112 124 117 134C121 143 114 151 106 148C100 145 101 137 107 137"/>
        <path d="M85 148C77 147 70 152 69 158C68 164 74 168 79 165"/><path d="M85 148C93 147 100 152 101 158C102 164 96 168 91 165"/>
        <path d="M36 58C28 72 28 90 36 104M134 58C142 72 142 90 134 104" stroke-width=".9"/>
      </g>
      <g fill="#D9B15A"><circle cx="85" cy="112" r="2.6"/><path d="M85 170l3 7-3 7-3-7z"/><circle cx="33" cy="81" r="2"/><circle cx="137" cy="81" r="2"/><circle cx="48" cy="118" r="1.5"/><circle cx="122" cy="118" r="1.5"/></g>
    </g>
    <circle cx="85" cy="64" r="39" fill="none" stroke="url(#plBevel)" stroke-width="4.4"/><circle cx="85" cy="64" r="36.4" fill="none" stroke="#1C0A04" stroke-width="1"/>
    <circle cx="85" cy="64" r="36" fill="url(#plGlass)"/>
    <path d="M58 45C65 33 80 28 96 31C82 32 68 38 62 50C60 54 55 50 58 45Z" fill="#FFF8E4" opacity=".72"/>
    <path d="M110 86C104 94 95 98 86 99C96 95 104 89 108 82C110 80 112 83 110 86Z" fill="#FFF8E4" opacity=".28"/>
  </svg>`;
}

const HAUNTS = ['BEHIND YOU', 'STILL HERE', 'LOOK UP', 'WE SEE YOU', 'NOT ALONE', 'DONT TURN AROUND', 'HELLO', 'WHO LET YOU IN', 'WRONG ROOM', 'GO TO BED'];

scene.define('spirit', (S) => {
  const canvas = document.createElement('canvas');
  canvas.className = 'scene-canvas';
  S.back.append(canvas);
  const dark = document.createElement('div');
  dark.className = 'sp-dark';
  const pl = document.createElement('div');
  pl.className = 'sp-planchette';
  pl.innerHTML = planchetteSvg();
  S.over.append(dark, pl);
  let W = 0, H = 0, board = null, boardEl = null, spelled = null;
  const body = { x: 0, y: 0, vx: 0, vy: 0, rot: 0, tx: 0, ty: 0, alpha: 0 };
  const glass = { x: 60, y: 45.2 };   // the middle of the window, within the planchette
  let script = [], step = 0, holdUntil = 0, stepStart = 0, target = '', shown = '', haunting = false, nextHaunt = performance.now() + 75000 + Math.random() * 60000, litNow = null, lastSpelled = '', lastCarve = 0, lastFlicker = 0, lastPose = '';

  function paint() {
    W = innerWidth; H = innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    paintShader(canvas, WOOD, { res: [canvas.width, canvas.height], dpr });
  }
  // Carve the alphabet into a large clock. Everything is measured off the widget's actual size.
  function carve() {
    const clocks = [...document.querySelectorAll('.pages .widget[data-type="clock"]')].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.left < W && r.right > 0 && r.width >= 430 && r.height >= 300;
    });
    const el = clocks[0] || null;
    // A clock made smaller goes back to being an ordinary plaque
    for (const w of document.querySelectorAll('.pages .widget.sp-board-on')) {
      const box = w.getBoundingClientRect();
      if (box.width >= 430 && box.height >= 300) continue;
      w.classList.remove('sp-board-on');
      delete w.dataset.carved;
      w.querySelectorAll('.sp-art, .sp-spelled').forEach((n) => n.remove());
      const meta = w.querySelector('.clock-meta');
      if (meta) meta.style.top = '';
    }
    boardEl = el;
    if (!el) { board = null; return; }
    const r = el.getBoundingClientRect();
    const key = `${Math.round(r.width)}x${Math.round(r.height)}`;
    if (el.dataset.carved === key && el.querySelector('.sp-art')) { board = el.querySelector('.sp-art'); return; }
    el.dataset.carved = key;
    el.classList.add('sp-board-on');
    el.querySelector('.sp-art')?.remove();
    const w = r.width, h = r.height;
    const size = Math.min(w / 16.5, h / 11.2);
    const arc = (text, top, chord, sag, cls = '') => {
      const R = (chord * chord / 4 + sag * sag) / (2 * sag), cy = top + R;
      const half = Math.asin(chord / 2 / R);
      return [...text].map((c, i) => {
        const a = -half + (i + 0.5) / text.length * half * 2;
        const x = w / 2 + Math.sin(a) * R, y = cy - Math.cos(a) * R;
        return `<text class="sp-l ${cls}" data-c="${c}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${size.toFixed(1)}" text-anchor="middle" dominant-baseline="central" transform="rotate(${(a * 57.2958).toFixed(2)} ${x.toFixed(1)} ${y.toFixed(1)})">${c}</text>`;
      }).join('');
    };
    const y1 = h * 0.3, gapY = size * 1.4;
    const digitsY = y1 + gapY + h * 0.155;
    const digits = [...'1234567890'].map((c, i) => {
      const x = w * 0.2 + i * (w * 0.6 / 9);
      return `<text class="sp-l sp-n" data-c="${c}" x="${x.toFixed(1)}" y="${digitsY.toFixed(1)}" font-size="${(size * 0.84).toFixed(1)}" text-anchor="middle" dominant-baseline="central">${c}</text>`;
    }).join('');
    const sunR = Math.min(h * 0.07, w * 0.048), yesY = h * 0.13 + sunR * 1.78;
    const margin = 8;
    const corner = (x, y, sx, sy) => `<path transform="translate(${x} ${y}) scale(${sx} ${sy})" d="M0 26V6C0 2 2 0 6 0H26M6 20C6 12 12 6 20 6M12 28C14 24 13 21 10 20C7 19 5 22 7 24M28 12C24 14 21 13 20 10C19 7 22 5 24 7" fill="none" stroke="url(#spGilt)" stroke-width="1.2" stroke-linecap="round"/>`;
    const art = document.createElement('div');
    art.className = 'sp-art';
    art.innerHTML = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">${SP_DEFS}
      <g filter="url(#spCut)">
        <rect x="${margin}" y="${margin}" width="${w - margin * 2}" height="${h - margin * 2}" fill="none" stroke="url(#spGilt)" stroke-width="1"/>
        ${corner(margin + 5, margin + 5, 1, 1)}${corner(w - margin - 5, margin + 5, -1, 1)}${corner(margin + 5, h - margin - 5, 1, -1)}${corner(w - margin - 5, h - margin - 5, -1, -1)}
      </g>
      ${sunFace(w * 0.12, h * 0.145, sunR)}${moonFace(w * 0.88, h * 0.145, sunR * 1.1)}
      <text class="sp-l sp-word" data-c="YES" x="${w * 0.12}" y="${yesY}" font-size="${size * 0.92}" text-anchor="middle" dominant-baseline="central">Yes</text>
      <text class="sp-l sp-word" data-c="NO" x="${w * 0.88}" y="${yesY}" font-size="${size * 0.92}" text-anchor="middle" dominant-baseline="central">No</text>
      ${arc('ABCDEFGHIJKLM', y1, w * 0.74, h * 0.1)}${arc('NOPQRSTUVWXYZ', y1 + gapY, w * 0.74, h * 0.1)}${digits}
      <text class="sp-l sp-word" data-c="BYE" x="${w / 2}" y="${h - margin - size * 0.72}" font-size="${size * 0.62}" text-anchor="middle" dominant-baseline="central">Good bye</text>
    </svg>`;
    el.querySelector('.body').prepend(art);
    const meta = el.querySelector('.clock-meta');
    if (meta) meta.style.top = `${digitsY + size * 0.72}px`;
    if (!el.querySelector('.sp-spelled')) {
      spelled = document.createElement('p');
      spelled.className = 'sp-spelled';
      spelled.title = 'Click for another';
      spelled.setAttribute('aria-live', 'off');
      spelled.addEventListener('click', () => nextGreeting());
      el.querySelector('.greet')?.after(spelled);
    } else spelled = el.querySelector('.sp-spelled');
    board = art;
    target = ''; shown = '';
  }
  const letterPos = (c) => {
    if (!board) return null;
    const n = board.querySelector(`[data-c="${c}"]`);
    if (!n) return null;
    const r = n.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, el: n };
  };
  function light(el) {
    if (litNow) litNow.classList.remove('lit');
    litNow = el;
    if (el) { el.classList.remove('faded'); el.classList.add('lit'); const old = el; setTimeout(() => old.classList.remove('lit'), 900); }
  }
  // Greetings write themselves into the plate; punctuation and spaces come along with the letter before
  function spell(text, writes) {
    script = [];
    for (const ch of text) {
      const up = ch.toUpperCase();
      script.push({ ch, stop: /[A-Z0-9]/.test(up) ? up : '' });
    }
    step = 0; holdUntil = 0; stepStart = performance.now(); haunting = !writes;
    if (writes && spelled) { spelled.textContent = ''; shown = ''; }
  }

  const busy = () => script.length > 0 && step < script.length;
  function frame(t, dt, frozen) {
    // The room's flicker runs slowly, and is the only thing that moves when nothing else does
    if (t - lastFlicker > 110 || !dt) { lastFlicker = t; dark.style.opacity = (0.82 + Math.sin(t / 190) * 0.05 + Math.sin(t / 67) * 0.04).toFixed(2); }
    if ((!board || !document.contains(board)) && t - lastCarve > 500) { lastCarve = t; carve(); }
    const rect = boardEl?.getBoundingClientRect();
    const visible = board && rect && rect.left < W * 0.9 && rect.right > W * 0.1 && rect.top < H * 0.9 && rect.bottom > H * 0.1;

    // Keep the greeting in step with the clock
    const greetEl = boardEl?.querySelector('.greet');
    const line = greetEl?.textContent || '';
    if (visible && spelled && line && line !== target) {
      target = line;
      // Only a new line gets spelled: redrawing the clock shouldn't start it all over
      if (frozen || S.still || line === lastSpelled) { spelled.textContent = line; shown = line; script = []; }
      else { spell(line, true); lastSpelled = line; }
      spelled.setAttribute('aria-label', line);
    }
    if (frozen && spelled && target) spelled.textContent = target;

    let wantX, wantY;
    if (visible && script.length && step < script.length) {
      const cur = script[step];
      if (!cur.stop) {
        if (!haunting) { shown += cur.ch; spelled.textContent = shown; }
        step++;
      } else {
        const p = letterPos(cur.stop);
        if (!p) { step++; }
        else {
          wantX = p.x; wantY = p.y;
          const close = Math.hypot(body.x + glass.x - p.x, body.y + glass.y - p.y);
          if (!holdUntil && (close < 5 || t - stepStart > 620)) {
            holdUntil = t + (haunting ? 240 : 95);
            light(p.el);
            if (!haunting) { shown += cur.ch; spelled.textContent = shown; }
          }
          if (holdUntil && t > holdUntil) {
            holdUntil = 0; step++; stepStart = t;
          }
        }
      }
    }
    if (wantX === undefined) {
      if (visible) {
        const P = S.pointer;
        const over = P.seen && t - P.at < 4000 && P.x > rect.left && P.x < rect.right && P.y > rect.top && P.y < rect.bottom;
        if (over) { wantX = P.x; wantY = P.y; }
        // Between messages it rests off to one side, clear of the writing
        else { wantX = rect.left + rect.width * 0.1; wantY = rect.top + rect.height * 0.72; }
        if (!script.length || step >= script.length) {
          if (t > nextHaunt && !P.seen || t > nextHaunt && t - P.at > 25000) {
            nextHaunt = t + 80000 + Math.random() * 120000;
            spell(HAUNTS[Math.floor(Math.random() * HAUNTS.length)].replace(/[^A-Z]/g, ''), false);
          }
        }
      } else { wantX = W * 0.5; wantY = H + 260; }
    }
    if (!dt) { body.x = wantX - glass.x; body.y = wantY - glass.y; }
    else {
      // A spring with some weight, and fingers that aren't quite steady
      const speedUp = busy() ? 118 : 26;
      const damp = 2 * Math.sqrt(speedUp) * 0.86;
      for (let left = dt; left > 0; left -= 0.016) {
        const h = Math.min(left, 0.016);
        body.vx += ((wantX - glass.x - body.x) * speedUp - body.vx * damp) * h;
        body.vy += ((wantY - glass.y - body.y) * speedUp - body.vy * damp) * h;
        body.x += body.vx * h; body.y += body.vy * h;
      }
      body.rot += (Math.max(-13, Math.min(13, body.vx * 0.016)) - body.rot) * Math.min(1, dt * 7);
    }
    // Fingers only shake while they're pushing it
    const shaky = dt && busy();
    const shake = shaky ? (Math.sin(t / 37) + Math.sin(t / 23 + 1.2)) * 0.34 : 0, shakeY = shaky ? Math.sin(t / 29 + 2.1) * 0.34 : 0;
    body.alpha += ((visible ? 1 : 0) - body.alpha) * (dt ? Math.min(1, dt * 3) : 1);
    const pose = `translate3d(${(body.x + shake).toFixed(1)}px, ${(body.y + shakeY).toFixed(1)}px, 0) rotate(${body.rot.toFixed(1)}deg)|${body.alpha.toFixed(2)}`;
    if (pose !== lastPose) {
      lastPose = pose;
      const [move, alpha] = pose.split('|');
      pl.style.transform = move;
      pl.style.opacity = alpha;
    }
  }

  paint();
  body.x = W * 0.3; body.y = H + 120;
  return {
    // Smooth while the planchette is travelling or you're moving; a slow tick otherwise
    get fps() { return busy() || performance.now() - S.pointer.at < 1500 || Math.hypot(body.vx, body.vy) > 2 ? 60 : 8; },
    resize() { paint(); if (boardEl) { delete boardEl.dataset.carved; } carve(); },
    moved() { carve(); },
    layout() { carve(); },
    frame,
    decorate(item) { if (item.type === 'clock') { requestAnimationFrame(carve); } },
    unmount() {
      document.querySelectorAll('.sp-art, .sp-spelled').forEach((n) => n.remove());
      document.querySelectorAll('.sp-board-on').forEach((n) => { n.classList.remove('sp-board-on'); delete n.dataset.carved; });
      document.querySelectorAll('.clock-meta').forEach((m) => { m.style.top = ''; });
    }
  };
});
