'use strict';
// ---------- The Watcher ----------
// Eyes live in the dark behind the slabs: every eye is painted live by one shader. They open slowly,
// follow you in quick jumps, blink out of sync, flinch when you come close or click, and stare once
// you stop moving. Every few minutes they all shut, and something much larger looks through the gaps.
const EYE_VERT = `attribute vec2 c; uniform vec2 res, center, half_; uniform float ang; varying vec2 v;
void main() {
  vec2 p = c * half_;
  p = vec2(p.x * cos(ang) - p.y * sin(ang), p.x * sin(ang) + p.y * cos(ang)) + center;
  gl_Position = vec4(p.x / res.x * 2.0 - 1.0, 1.0 - p.y / res.y * 2.0, 0.0, 1.0);
  v = c * vec2(1.4, 1.4 * half_.y / half_.x);
}`;
const EYE_FRAG = `precision highp float;
varying vec2 v;
uniform vec2 gaze; uniform float open, pupil, seed, species, px, presence, detail, shine;
uniform vec3 irisA, irisB, sclera;
${GLSL_NOISE}
float fibers(vec2 d, float r) {
  // Fine streaks running from the pupil outward, sampled on a circle so there's no seam
  float a = noise(d * (6.0 + detail * 8.0) + seed + r * 1.6);
  float b = noise(d * (15.0 + detail * 26.0) + seed * 2.0 + r * 3.0);
  float c = noise(d * (40.0 + detail * 60.0) + seed * 3.0 + r * 5.0);
  return a * 0.45 + b * 0.35 + c * 0.2;
}
void main() {
  vec2 q = v;
  float x = q.x, y = q.y;
  float e = max(1.0 - x * x, 0.0);
  // The lids: an almond that closes onto a line a little below the middle
  float up0 = 0.64 * pow(e, 0.72) + 0.05 * x;
  float lo0 = -0.36 * pow(e, 0.9) + 0.04 * x;
  float shut = -0.14 * e + 0.04 * x;
  float up = mix(shut, up0, open);
  float lo = mix(shut, lo0, min(1.0, open * 1.5));
  float du = up - y, dl = y - lo;
  float inside = smoothstep(-px, px, du) * smoothstep(-px, px, dl) * step(abs(x), 1.0);

  // ---- Skin around the eye
  float over = max(max(-du, -dl), abs(x) - 1.0);
  over = max(over, 0.0);
  float wob = fbm(q * 5.0 + seed) * 0.07;
  float f = over + wob * smoothstep(0.0, 0.2, over);
  vec3 skin = mix(vec3(0.075, 0.058, 0.055), vec3(0.17, 0.12, 0.105), fbm(q * 3.2 + seed * 3.0));
  float above = step(0.0, -du);
  // Lid crease and fine wrinkles
  float crease = exp(-pow((f - 0.2 - 0.12 * e * (1.0 - open)) * 16.0, 2.0)) * above;
  float wrinkle = 0.5 + 0.5 * sin(f * 70.0 + fbm(q * 6.0 + seed) * 6.0);
  skin *= 0.78 + 0.22 * wrinkle;
  skin *= 1.0 - crease * 0.75;
  skin *= 0.55 + 0.75 * smoothstep(-1.0, 0.7, y);
  // A wet pink rim where lid meets eye
  skin += vec3(0.30, 0.13, 0.11) * exp(-f * 34.0);
  // Upper lashes: dark hairs fanning out from the rim
  float fan = x * 25.0 + (y - up) * x * 22.0 + noise(vec2(x * 40.0, seed)) * 1.6;
  float lash = smoothstep(0.26, 0.04, abs(fract(fan) - 0.5)) * smoothstep(0.3, 0.02, -du) * step(du, 0.0) * smoothstep(1.0, 0.65, abs(x));
  skin *= 1.0 - lash * 0.9;
  float skinA = exp(-f * f * 8.0) * smoothstep(1.38, 0.82, length(q * vec2(1.0, 1.1)));

  vec3 col = skin;
  float alpha = skinA * presence;

  // ---- The eyeball
  if (inside > 0.0) {
    vec2 p = (q - vec2(0.0, 0.02)) / 0.9;
    float r2 = min(dot(p, p), 0.995);
    vec3 n = vec3(p, sqrt(1.0 - r2));
    vec3 g = normalize(vec3(gaze, 1.0));
    vec3 tx = normalize(cross(vec3(0.0, 1.0, 0.0), g));
    vec3 ty = cross(g, tx);
    vec2 ip = vec2(dot(n, tx), dot(n, ty));
    float ai = 0.58;
    float front = dot(n, g);
    float ir = length(ip) / ai;
    if (front < 0.0) ir = 9.0;
    vec2 dir = ip / max(length(ip), 1e-4);

    // White of the eye, with veins creeping in from the edges
    float along = fbm(p * 2.4 + seed);
    float vein = pow(1.0 - abs(noise(p * 7.0 + along * 3.0 + seed) * 2.0 - 1.0), 16.0);
    vein += 0.6 * pow(1.0 - abs(noise(p * 15.0 + along * 5.0 - seed) * 2.0 - 1.0), 24.0);
    float edge = smoothstep(0.45, 1.05, length(p));
    vec3 white = sclera * (0.82 + 0.3 * along);
    white = mix(white, vec3(0.60, 0.11, 0.08), clamp(vein * (0.12 + edge * 0.9), 0.0, 0.9));
    white = mix(white, white * vec3(1.0, 0.72, 0.6), edge * 0.55);
    // The pink corner of the eye
    white = mix(white, vec3(0.62, 0.26, 0.24), smoothstep(-0.72, -0.98, x));

    // Iris
    float fib = fibers(dir, ir);
    vec3 iris = mix(irisA, irisB, smoothstep(0.26, 0.72, fib));
    iris *= 0.62 + 0.9 * fib;
    // Lit from inside, on the side away from the highlight
    iris *= 0.75 + 0.55 * smoothstep(-0.8, 0.8, dot(dir, vec2(0.55, -0.75)));
    float pr = species < 0.5 ? pupil : pupil * 0.6;
    // A paler ring around the pupil, a dark ring at the rim
    iris += irisB * 0.75 * exp(-pow((ir - pr - 0.14) * 7.0, 2.0)) * (0.5 + fib);
    iris *= smoothstep(1.02, 0.72, ir) * 0.92 + 0.08;
    float crypt = smoothstep(0.62, 0.74, noise(dir * 5.0 + ir * 3.0 + seed * 5.0));
    iris *= 1.0 - crypt * 0.45;

    // Pupil, by species: round, cat slit, goat bar, two pupils, or a thin ring
    float pd;
    vec2 u = ip / ai;
    if (species < 0.5) pd = length(u) / pupil;
    else if (species < 1.5) pd = length(u * vec2(1.0 / (pupil * 0.42), 1.0 / (pupil * 1.9 + 0.32)));
    else if (species < 2.5) { vec2 b = abs(u) - vec2(pupil * 1.3 + 0.16, pupil * 0.28); pd = length(max(b, 0.0)) * 14.0 + 1.0 + min(max(b.x, b.y), 0.0); }
    else if (species < 3.5) pd = min(length(u - vec2(0.0, 0.25)) / (pupil * 0.62), length(u + vec2(0.04, 0.27)) / (pupil * 0.62));
    else { pd = 2.0 - 1.1 * smoothstep(0.1, 0.0, abs(length(u) - pupil * 1.2)); pd = min(pd, length(u) / (pupil * 0.34)); }
    float pupilMask = smoothstep(0.92, 1.08, pd);
    iris *= pupilMask;
    // Eyeshine: the back of the eye catching light, like an animal at the edge of a road
    iris += irisB * (1.0 - pupilMask) * shine * (1.0 - smoothstep(0.0, 1.0, pd)) * 0.5;

    float irisMask = smoothstep(1.03, 0.97, ir);
    vec3 ball = mix(white, iris, irisMask);
    // Light from above and shadow cast by the upper lid
    ball *= 0.34 + 0.78 * max(dot(n, normalize(vec3(-0.25, 0.55, 0.8))), 0.0);
    ball *= 0.28 + 0.72 * smoothstep(0.0, 0.36, du);
    ball *= 0.55 + 0.45 * smoothstep(0.0, 0.14, dl);
    // Wet highlights: a window of light on the cornea, and the tear line along the lower lid
    vec2 h = q - vec2(-0.2, 0.2) - gaze * 0.07;
    float win = smoothstep(0.1, 0.07, abs(h.x)) * smoothstep(0.075, 0.05, abs(h.y)) * (1.0 - smoothstep(0.0, 0.012, abs(h.x + 0.004)) * 0.75);
    float small = smoothstep(0.042, 0.018, length(q - vec2(0.2, -0.13) - gaze * 0.05));
    float wash = exp(-dot(h, h) * 10.0) * 0.12;
    float tear = exp(-dl * 42.0) * (0.25 + 0.75 * noise(vec2(x * 16.0, seed)));
    ball += vec3(0.95, 0.97, 1.0) * (win * 0.92 + small * 0.34 + wash) * smoothstep(0.0, 0.2, du);
    ball += vec3(0.82, 0.74, 0.70) * tear * 0.34;
    col = mix(col, ball, inside);
    alpha = mix(alpha, 1.0, inside * smoothstep(0.0, 0.25, presence));
  }
  gl_FragColor = vec4(col * alpha, alpha);
}`;

const IRISES = [
  { a: [0.05, 0.13, 0.17], b: [0.40, 0.66, 0.70] },   // pale, cold blue
  { a: [0.17, 0.08, 0.02], b: [0.82, 0.50, 0.12] },   // amber
  { a: [0.07, 0.10, 0.03], b: [0.54, 0.62, 0.18] },   // bile green
  { a: [0.09, 0.04, 0.02], b: [0.40, 0.20, 0.10] },   // ordinary brown, somehow the worst
  { a: [0.16, 0.02, 0.02], b: [0.70, 0.13, 0.07] },   // oxblood
  { a: [0.06, 0.06, 0.07], b: [0.62, 0.62, 0.60] }    // cataract grey
];
const SCLERAS = [[0.68, 0.62, 0.53], [0.62, 0.58, 0.46], [0.60, 0.50, 0.44], [0.015, 0.012, 0.012]];

scene.define('watcher', (S) => {
  const canvas = document.createElement('canvas');
  canvas.className = 'scene-canvas';
  S.back.append(canvas);
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' });
  if (!gl) return {};
  const compile = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, EYE_VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, EYE_FRAG));
  gl.linkProgram(prog);
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const aLoc = gl.getAttribLocation(prog, 'c');
  gl.enableVertexAttribArray(aLoc);
  gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  const u = {};
  for (const n of ['res', 'center', 'half_', 'ang', 'gaze', 'open', 'pupil', 'seed', 'species', 'px', 'presence', 'detail', 'shine', 'irisA', 'irisB', 'sclera']) u[n] = gl.getUniformLocation(prog, n);

  let dpr = 1, W = 0, H = 0, eyes = [], mountedAt = performance.now(), layoutRects = [];
  const R = Math.random;
  const big = { open: 0, target: 0, gx: 0, gy: 0, tx: 0, ty: 0, pupil: 0.3, nextGlance: 0, state: 'off', until: performance.now() + 38000 };
  let idleWasCaught = false;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = innerWidth; H = innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(u.res, W, H);
  }
  // How far a point is from the nearest widget, and how much open run it has across and along
  const clearance = (x, y, rects) => {
    let best = 1e9;
    for (const r of rects) {
      const dx = Math.max(r.left - x, 0, x - r.right), dy = Math.max(r.top - y, 0, y - r.bottom);
      const d = Math.hypot(dx, dy);
      if (d < best) best = d;
      if (best === 0) return 0;
    }
    return best;
  };
  const freeRun = (x, y, dx, dy, rects, limit = 500) => {
    for (let s = 6; s < limit; s += 6) {
      const px = x + dx * s, py = y + dy * s;
      if (px < 0 || py < 0 || px > W || py > H) return s;
      if (clearance(px, py, rects) === 0) return s;
    }
    return limit;
  };
  function newEye(x, y, w, ang, t) {
    const rare = R();
    const species = rare < 0.58 ? 0 : rare < 0.74 ? 1 : rare < 0.88 ? 2 : rare < 0.95 ? 3 : 4;
    const iris = IRISES[Math.floor(R() * IRISES.length)];
    const sclera = species === 4 || R() < 0.08 ? SCLERAS[3] : SCLERAS[Math.floor(R() * 3)];
    return {
      x, y, w, ang, species, iris, sclera, seed: R() * 40,
      open: 0, target: 0, wakeAt: t + 200 + R() * 3200, openSpeed: 0.7 + R() * 1.4,
      gx: (R() - 0.5) * 0.5, gy: (R() - 0.5) * 0.3, tgx: 0, tgy: 0,
      nextLook: t + R() * 2000, nextBlink: t + 1500 + R() * 9000, blinkUntil: 0,
      pupil: 0.34 + R() * 0.08, tpupil: 0.36, flinchUntil: 0, shockAt: 0,
      loyal: R() < 0.72, squint: 0.72 + R() * 0.28, presence: 0
    };
  }
  // Fill the void: big eyes where there's room, thin ones wedged into the cracks between slabs
  function place(rects, t) {
    const blocked = S.chromeRects();
    const clearChrome = (x, y, m) => blocked.every((b) => x < b.left - m || x > b.right + m || y < b.top - m || y > b.bottom + m);
    const found = [];
    const fits = (x, y, w) => found.every((e) => Math.hypot(e.x - x, e.y - y) > (e.w + w) * 0.56);
    const step = 12, points = [];
    for (let y = 6; y < H; y += step) for (let x = 6; x < W; x += step) {
      const d = clearance(x, y, rects);
      if (d > 3) points.push({ x: x + (R() - 0.5) * 6, y: y + (R() - 0.5) * 6, d });
    }
    points.sort((a, b) => b.d - a.d);
    for (const p of points) {
      if (found.length >= 46) break;
      if (p.d < 26) break;
      const w = Math.min(p.d * 2.5 * (0.72 + R() * 0.28), 360);
      if (w < 66 || !fits(p.x, p.y, w) || !clearChrome(p.x, p.y, w * 0.42)) continue;
      found.push(newEye(p.x, p.y, w, (R() - 0.5) * 0.3, t));
    }
    const shuffled = points.filter((p) => p.d < 26).sort(() => R() - 0.5);
    for (const p of shuffled) {
      if (found.length >= 46) break;
      const across = Math.min(freeRun(p.x, p.y, 1, 0, rects), freeRun(p.x, p.y, -1, 0, rects));
      const along = Math.min(freeRun(p.x, p.y, 0, 1, rects), freeRun(p.x, p.y, 0, -1, rects));
      const flat = across > along;                 // the crack runs sideways
      const narrow = Math.min(across, along);
      const w = Math.max(44, Math.min(narrow * (2.6 + R() * 2.2), 118));
      if (!fits(p.x, p.y, w) || !clearChrome(p.x, p.y, w * 0.5)) continue;
      const lean = (R() - 0.5) * 0.14;
      found.push(newEye(p.x, p.y, w, flat ? lean : Math.PI / 2 * (R() < 0.5 ? 1 : -1) + lean, t));
    }
    // Eyes that were open close as they're replaced: new ones open in their own time
    eyes = found;
  }

  function lookAt(e, x, y, reach = 1) {
    const dx = x - e.x, dy = y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, d / (e.w * 2.2 + 90)) * 0.58 * reach;
    const c = Math.cos(-e.ang), s = Math.sin(-e.ang);
    const lx = dx / d, ly = dy / d;
    e.tgx = (lx * c - ly * s) * k;
    e.tgy = -(lx * s + ly * c) * k * 0.72;
  }
  function drawEye(x, y, halfX, ang, o) {
    gl.uniform2f(u.center, x, y);
    gl.uniform2f(u.half_, halfX, halfX * 0.86);
    gl.uniform1f(u.ang, ang);
    gl.uniform1f(u.px, 1.4 / halfX / dpr * 1.1);
    gl.uniform2f(u.gaze, o.gx, o.gy);
    gl.uniform1f(u.open, o.open);
    gl.uniform1f(u.pupil, o.pupil);
    gl.uniform1f(u.seed, o.seed);
    gl.uniform1f(u.species, o.species);
    gl.uniform1f(u.presence, o.presence);
    gl.uniform1f(u.detail, o.detail);
    gl.uniform1f(u.shine, o.shine);
    gl.uniform3fv(u.irisA, o.iris.a);
    gl.uniform3fv(u.irisB, o.iris.b);
    gl.uniform3fv(u.sclera, o.sclera);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  const bigLook = { seed: 11.7, species: 2, iris: IRISES[1], sclera: SCLERAS[1], detail: 1, shine: 0.5, presence: 1, gx: 0, gy: 0, open: 0, pupil: 0.3 };

  function frame(t, dt, frozen) {
    const P = S.pointer;
    const idle = (t - P.at) / 1000;
    const staring = idle > 40 && P.seen;
    if (!staring && idleWasCaught) {
      // You moved. They look away, as if they weren't just doing that.
      for (const e of eyes) { e.tgx = (R() - 0.5) * 1.1; e.tgy = (R() - 0.5) * 0.5; e.nextLook = t + 900 + R() * 1400; e.nextBlink = t + R() * 300; }
    }
    idleWasCaught = staring;

    // ---- Something larger
    if (big.state === 'off' && t > big.until) { big.state = 'closing-small'; big.until = t + 1500; }
    else if (big.state === 'closing-small' && t > big.until) { big.state = 'open'; big.target = 1; big.until = t + 13000; big.tx = 0; big.ty = 0; }
    else if (big.state === 'open' && t > big.until) { big.state = 'closing'; big.target = 0; big.until = t + 1700; }
    else if (big.state === 'closing' && t > big.until) { big.state = 'off'; big.until = t + 210000 + R() * 180000; }
    const hiding = big.state !== 'off';
    if (dt) {
      big.open += (big.target - big.open) * Math.min(1, dt * (big.target ? 0.9 : 3.6));
      if (t > big.nextGlance) {
        big.nextGlance = t + 420 + R() * 1700;
        const cx = W / 2, cy = H / 2;
        const dx = (P.x - cx) / (W * 0.5), dy = (P.y - cy) / (H * 0.5);
        big.tx = dx * 0.42; big.ty = -dy * 0.3;
      }
      big.gx += (big.tx - big.gx) * Math.min(1, dt * 11);
      big.gy += (big.ty - big.gy) * Math.min(1, dt * 11);
      big.pupil += ((0.13 + 0.08 * Math.sin(t / 2600)) - big.pupil) * dt;
    }

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (big.open > 0.004) {
      bigLook.open = big.open; bigLook.gx = big.gx; bigLook.gy = big.gy; bigLook.pupil = big.pupil;
      bigLook.presence = Math.min(1, big.open * 2.2);
      drawEye(W / 2, H * 0.52, Math.max(W, H * 1.5) * 0.74, 0, bigLook);
    }

    // ---- The rest
    for (const e of eyes) {
      if (dt) {
        const awake = t > e.wakeAt;
        const near = P.seen && t - P.at < 5000 && Math.hypot(P.x - e.x, P.y - e.y) < e.w * 0.62;
        if (near && e.flinchUntil < t) { e.flinchUntil = t + 500 + R() * 400; e.tpupil = 0.2; }
        if (e.shockAt && t > e.shockAt) { e.shockAt = 0; e.flinchUntil = t + 260 + R() * 260; e.tpupil = 0.5; e.nextBlink = t + 1800 + R() * 4000; }
        if (t > e.nextBlink) { e.blinkUntil = t + 90 + R() * 90; e.nextBlink = t + 2600 + R() * R() * 13000; }
        let target = awake ? e.squint : 0;
        if (staring) target = 1;
        if (t < e.blinkUntil || t < e.flinchUntil) target = 0;
        if (near) target = Math.min(target, t < e.flinchUntil ? 0 : 0.34);
        if (hiding) target = 0;
        const closing = target < e.open;
        e.open += (target - e.open) * Math.min(1, dt * (closing ? 26 : e.openSpeed * (t < e.blinkUntil + 400 ? 7 : 1)));
        e.presence += ((awake && !hiding ? 1 : 0) - e.presence) * Math.min(1, dt * (awake && !hiding ? 0.8 : 5));

        // Eyes jump between targets; they don't glide
        if (t > e.nextLook) {
          e.nextLook = t + 260 + R() * R() * 3600;
          if (staring) { e.tgx = 0; e.tgy = 0; }
          else if (e.loyal && P.seen) lookAt(e, P.x + (R() - 0.5) * 26, P.y + (R() - 0.5) * 26);
          else if (R() < 0.4 && eyes.length > 1) { const o = eyes[Math.floor(R() * eyes.length)]; lookAt(e, o.x, o.y); }
          else { e.tgx = (R() - 0.5) * 0.9; e.tgy = (R() - 0.5) * 0.4; }
        }
        // Fast pointer: the loyal ones keep up
        if (e.loyal && P.speed > 30 && !staring) lookAt(e, P.x, P.y);
        e.gx += (e.tgx - e.gx) * Math.min(1, dt * 24);
        e.gy += (e.tgy - e.gy) * Math.min(1, dt * 24);
        const wantPupil = staring ? 0.6 : Math.max(0.22, e.tpupil);
        e.pupil += (wantPupil - e.pupil) * Math.min(1, dt * 2.4);
        e.tpupil += (0.36 - e.tpupil) * dt * 0.8;
      } else {
        e.open = e.squint; e.presence = 1; lookAt(e, W / 2, H / 2); e.gx = e.tgx; e.gy = e.tgy;
      }
      if (e.presence < 0.01 && e.open < 0.01) continue;
      e.detail = Math.min(1, e.w / 300);
      e.shine = 0.14 + (e.pupil - 0.25) * 0.8;
      drawEye(e.x, e.y, e.w / 2 * 1.4, e.ang, e);
    }
  }

  resize();
  return {
    fps: 30,
    resize,
    frame,
    layout(rects) { layoutRects = rects; place(rects, performance.now()); if (!S.running()) frame(performance.now(), 0, true); },
    moved(rects) { if (!eyes.length) { layoutRects = rects; place(rects, performance.now()); } },
    // A click travels outwards through them
    press(e) {
      const t = performance.now();
      for (const o of eyes) o.shockAt = t + Math.hypot(o.x - e.clientX, o.y - e.clientY) * 0.55;
    },
    summon() { big.state = 'closing-small'; big.until = performance.now() + 1500; },
    unmount() { gl.getExtension('WEBGL_lose_context')?.loseContext(); }
  };
});
