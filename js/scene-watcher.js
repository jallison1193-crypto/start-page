'use strict';
// ---------- The Watcher ----------
// Eyes live in the dark behind the slabs. They open slowly, follow you in quick jumps, blink out of
// sync, flinch when you come close or click, and stare once you stop moving. Every few minutes they
// all shut, and something much larger looks through the gaps.
//
// Built to cost almost nothing. The expensive detail (iris fibres, veins, skin) is painted once into
// textures at the start. After that an eye is only redrawn while it's actually moving, a still eye
// costs nothing, there's a limit on how much can be redrawn per frame, and anything hidden behind a
// slab is never drawn at all.
const BAKE_VERT = 'attribute vec2 c; varying vec2 v; void main() { v = c; gl_Position = vec4(c, 0.0, 1.0); }';
const BAKE_IRIS = `precision highp float; varying vec2 v; uniform vec3 irisA, irisB; uniform float seed;
${GLSL_NOISE}
void main() {
  vec2 u = v * 1.05;
  float r = length(u);
  vec2 dir = u / max(r, 1e-4);
  // Fine streaks running from the pupil outward, sampled on a circle so there's no seam
  float a = noise(dir * 9.0 + seed + r * 1.6), b = noise(dir * 28.0 + seed * 2.0 + r * 3.0), c = noise(dir * 70.0 + seed * 3.0 + r * 5.0);
  float fib = a * 0.45 + b * 0.35 + c * 0.2;
  vec3 iris = mix(irisA, irisB, smoothstep(0.26, 0.72, fib));
  iris *= 0.62 + 0.9 * fib;
  // Lit from inside, on the side away from the highlight
  iris *= 0.75 + 0.55 * smoothstep(-0.8, 0.8, dot(dir, vec2(0.55, -0.75)));
  iris *= smoothstep(1.02, 0.72, r) * 0.92 + 0.08;
  iris *= 1.0 - smoothstep(0.62, 0.74, noise(dir * 5.0 + r * 3.0 + seed * 5.0)) * 0.45;
  gl_FragColor = vec4(iris, fib);
}`;
const BAKE_SCLERA = `precision highp float; varying vec2 v; uniform float seed;
${GLSL_NOISE}
void main() {
  vec2 p = v * 1.1;
  float along = fbm(p * 2.4 + seed);
  float vein = pow(1.0 - abs(noise(p * 7.0 + along * 3.0 + seed) * 2.0 - 1.0), 16.0);
  vein += 0.6 * pow(1.0 - abs(noise(p * 15.0 + along * 5.0 - seed) * 2.0 - 1.0), 24.0);
  gl_FragColor = vec4(along, clamp(vein, 0.0, 1.0), noise(vec2(p.x * 16.0, seed)), 1.0);
}`;
const BAKE_SKIN = `precision highp float; varying vec2 v; uniform float seed;
${GLSL_NOISE}
void main() {
  vec2 q = v * 1.45;
  gl_FragColor = vec4(fbm(q * 3.2 + seed * 3.0), fbm(q * 6.0 + seed), fbm(q * 5.0 + seed + 4.0), noise(vec2(q.x * 40.0, seed)));
}`;

const EYE_VERT = `attribute vec2 c; uniform vec2 res, center, half_; uniform float ang; varying vec2 v;
void main() {
  vec2 p = c * half_;
  p = vec2(p.x * cos(ang) - p.y * sin(ang), p.x * sin(ang) + p.y * cos(ang)) + center;
  gl_Position = vec4(p.x / res.x * 2.0 - 1.0, 1.0 - p.y / res.y * 2.0, 0.0, 1.0);
  v = c * vec2(1.4, 1.4 * half_.y / half_.x);
}`;
const EYE_FRAG = `precision highp float;
varying vec2 v;
uniform vec2 gaze, off; uniform float open, pupil, species, px, presence, detail, shine;
uniform vec3 irisB, sclera;
uniform sampler2D irisT, scleraT, skinT;
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
  float over = max(max(max(-du, -dl), abs(x) - 1.0), 0.0);
  // Most of each square is empty: leave before doing any work
  if (inside <= 0.0 && (over > 0.9 || length(q * vec2(1.0, 1.1)) > 1.38)) { gl_FragColor = vec4(0.0); return; }

  // ---- Skin around the eye
  vec4 sk = texture2D(skinT, q / 2.9 + 0.5 + off);
  float f = over + sk.b * 0.07 * smoothstep(0.0, 0.2, over);
  vec3 skin = mix(vec3(0.075, 0.058, 0.055), vec3(0.17, 0.12, 0.105), sk.r);
  float above = step(0.0, -du);
  // Lid crease and fine wrinkles
  float crease = exp(-pow((f - 0.2 - 0.12 * e * (1.0 - open)) * 16.0, 2.0)) * above;
  skin *= 0.89 + 0.11 * sin(f * 70.0 + sk.g * 6.0);
  skin *= 1.0 - crease * 0.75;
  skin *= 0.55 + 0.75 * smoothstep(-1.0, 0.7, y);
  // A wet pink rim where lid meets eye
  skin += vec3(0.30, 0.13, 0.11) * exp(-f * 34.0);
  // Upper lashes: dark hairs fanning out from the rim
  float fan = x * 25.0 + (y - up) * x * 22.0 + sk.a * 1.6;
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
    float ir = dot(n, g) < 0.0 ? 9.0 : length(ip) / ai;

    // White of the eye, with veins creeping in from the edges
    vec4 sc = texture2D(scleraT, p / 2.2 + 0.5 + off);
    float edge = smoothstep(0.45, 1.05, length(p));
    vec3 white = sclera * (0.82 + 0.3 * sc.r);
    white = mix(white, vec3(0.60, 0.11, 0.08), clamp(sc.g * (0.12 + edge * 0.9), 0.0, 0.9));
    white = mix(white, white * vec3(1.0, 0.72, 0.6), edge * 0.55);
    // The pink corner of the eye
    white = mix(white, vec3(0.62, 0.26, 0.24), smoothstep(-0.72, -0.98, x));
    vec3 ball = white;

    if (ir < 1.05) {
      vec2 u = ip / ai;
      vec4 tex = texture2D(irisT, u / 2.1 + 0.5);
      vec3 iris = tex.rgb;
      if (detail > 0.5) {
        // At a colossal size the painted iris needs finer streaks on top
        vec2 dir = u / max(ir, 0.001);
        iris *= 0.72 + 0.56 * texture2D(skinT, dir * (0.9 + ir * 0.16) + off).g;
      }
      float pr = species < 0.5 ? pupil : pupil * 0.6;
      // A paler ring around the pupil
      iris += irisB * 0.75 * exp(-pow((ir - pr - 0.14) * 7.0, 2.0)) * (0.5 + tex.a);
      // Pupil, by species: round, cat slit, goat bar, two pupils, or a thin ring
      float pd;
      if (species < 0.5) pd = ir / pupil;
      else if (species < 1.5) pd = length(u * vec2(1.0 / (pupil * 0.42), 1.0 / (pupil * 1.9 + 0.32)));
      else if (species < 2.5) { vec2 b = abs(u) - vec2(pupil * 1.3 + 0.16, pupil * 0.28); pd = length(max(b, 0.0)) * 14.0 + 1.0 + min(max(b.x, b.y), 0.0); }
      else if (species < 3.5) pd = min(length(u - vec2(0.0, 0.25)) / (pupil * 0.62), length(u + vec2(0.04, 0.27)) / (pupil * 0.62));
      else { pd = 2.0 - 1.1 * smoothstep(0.1, 0.0, abs(ir - pupil * 1.2)); pd = min(pd, ir / (pupil * 0.34)); }
      float pupilMask = smoothstep(0.92, 1.08, pd);
      iris *= pupilMask;
      // Eyeshine: the back of the eye catching light, like an animal at the edge of a road
      iris += irisB * (1.0 - pupilMask) * shine * (1.0 - smoothstep(0.0, 1.0, pd)) * 0.5;
      ball = mix(white, iris, smoothstep(1.03, 0.97, ir));
    }
    // Light from above and shadow cast by the upper lid
    ball *= 0.34 + 0.78 * max(dot(n, vec3(-0.246, 0.541, 0.787)), 0.0);
    ball *= 0.28 + 0.72 * smoothstep(0.0, 0.36, du);
    ball *= 0.55 + 0.45 * smoothstep(0.0, 0.14, dl);
    // Wet highlights: a window of light on the cornea, and the tear line along the lower lid
    vec2 h = q - vec2(-0.2, 0.2) - gaze * 0.07;
    float win = smoothstep(0.1, 0.07, abs(h.x)) * smoothstep(0.075, 0.05, abs(h.y)) * (1.0 - smoothstep(0.0, 0.012, abs(h.x + 0.004)) * 0.75);
    float small = smoothstep(0.042, 0.018, length(q - vec2(0.2, -0.13) - gaze * 0.05));
    float wash = exp(-dot(h, h) * 10.0) * 0.12;
    float tear = exp(-dl * 42.0) * (0.25 + 0.75 * sc.b);
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
const REDRAW_BUDGET = 900000;   // screen pixels of eye that may be redrawn in one frame (about 1 ms on integrated graphics)

scene.define('watcher', (S) => {
  const canvas = document.createElement('canvas');
  canvas.className = 'scene-canvas';
  S.back.append(canvas);
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: true, preserveDrawingBuffer: true, powerPreference: 'low-power' });
  if (!gl) return {};
  const compile = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s)); return s; };
  const link = (vert, frag) => {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vert));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, frag));
    gl.bindAttribLocation(p, 0, 'c');
    gl.linkProgram(p);
    return p;
  };
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  // ---- Paint the expensive detail once
  function bake(frag, values, size) {
    const p = link(BAKE_VERT, frag);
    gl.useProgram(p);
    for (const [k, v] of Object.entries(values)) {
      const loc = gl.getUniformLocation(p, k);
      if (Array.isArray(v)) gl.uniform3fv(loc, v); else gl.uniform1f(loc, v);
    }
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.viewport(0, 0, size, size);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(fbo);
    gl.deleteProgram(p);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
    return tex;
  }
  const R = Math.random;
  const bakeTo = (unit, frag, values, size) => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    bake(frag, values, size);    // stays bound to this unit
  };
  bakeTo(0, BAKE_SCLERA, { seed: R() * 30 }, 1024);
  bakeTo(1, BAKE_SKIN, { seed: R() * 30 }, 512);
  IRISES.forEach((iris, i) => {
    iris.unit = 2 + i;
    bakeTo(iris.unit, BAKE_IRIS, { irisA: iris.a, irisB: iris.b, seed: R() * 30 }, i === 1 ? 1024 : 512);
  });

  const prog = link(EYE_VERT, EYE_FRAG);
  // Slabs go into the depth buffer first, so no eye is ever painted where a slab hides it
  const slabProg = link(
    'attribute vec2 c; uniform vec4 box; void main() { gl_Position = vec4(mix(box.xy, box.zw, c * 0.5 + 0.5), -0.5, 1.0); }',
    'precision mediump float; void main() { gl_FragColor = vec4(0.0); }'
  );
  const slabBox = gl.getUniformLocation(slabProg, 'box');
  gl.useProgram(prog);
  gl.depthFunc(gl.LESS);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  const u = {};
  for (const n of ['res', 'center', 'half_', 'ang', 'gaze', 'off', 'open', 'pupil', 'species', 'px', 'presence', 'detail', 'shine', 'irisB', 'sclera', 'irisT', 'scleraT', 'skinT']) u[n] = gl.getUniformLocation(prog, n);
  gl.uniform1i(u.scleraT, 0);
  gl.uniform1i(u.skinT, 1);

  let dpr = 1, W = 0, H = 0, eyes = [], layoutRects = [], needFull = true, lastBig = 0, drawnBig = { open: 0, gx: 0, gy: 0 };
  const big = { open: 0, target: 0, gx: 0, gy: 0, tx: 0, ty: 0, pupil: 0.3, nextGlance: 0, state: 'off', until: performance.now() + 38000 };
  let idleWasCaught = false;
  const stats = { frames: 0, eyesDrawn: 0, pixels: 0, full: 0 };

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = innerWidth; H = innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(prog);
    gl.uniform2f(u.res, W, H);
    needFull = true;
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
    const halfX = w / 2 * 1.4;
    return {
      x, y, w, ang, species, iris, sclera, halfX, reach: halfX * 1.32,
      off: [R() * 3, R() * 3],
      open: 0, wakeAt: t + 200 + R() * 3200, openSpeed: 0.7 + R() * 1.4,
      gx: (R() - 0.5) * 0.5, gy: (R() - 0.5) * 0.3, tgx: 0, tgy: 0, lx: -1e4, ly: -1e4,
      // The biggest eyes blink least: a slow lid on something that size is worse anyway
      nextLook: t + R() * 3000, nextBlink: t + 1500 + R() * 11000, blinkEvery: w > 180 ? 2.2 : 1, blinkUntil: 0,
      pupil: 0.34 + R() * 0.08, tpupil: 0.36, flinchUntil: 0, shockAt: 0,
      loyal: R() < 0.72, squint: 0.72 + R() * 0.28, presence: 0, waiting: 0, drawn: null,
      detail: 0, shine: 0
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
    // The old eyes shut before they go, and the new ones open in their own time
    for (const e of found) e.wakeAt += eyes.length ? 500 : 0;
    for (const e of eyes) e.dying = true;
    eyes = S.running() ? [...eyes.filter((e) => e.open > 0.02), ...found] : found;
    needFull = true;
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

  // ---- Drawing
  function drawEye(x, y, halfX, ang, o) {
    gl.uniform2f(u.center, x, y);
    gl.uniform2f(u.half_, halfX, halfX * 0.86);
    gl.uniform1f(u.ang, ang);
    gl.uniform1f(u.px, 1.4 / halfX / dpr * 1.1);
    gl.uniform2f(u.gaze, o.gx, o.gy);
    gl.uniform2f(u.off, o.off[0], o.off[1]);
    gl.uniform1f(u.open, o.open);
    gl.uniform1f(u.pupil, o.pupil);
    gl.uniform1f(u.species, o.species);
    gl.uniform1f(u.presence, o.presence);
    gl.uniform1f(u.detail, o.detail);
    gl.uniform1f(u.shine, o.shine);
    gl.uniform1i(u.irisT, o.iris.unit);
    gl.uniform3fv(u.irisB, o.iris.b);
    gl.uniform3fv(u.sclera, o.sclera);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  const bigLook = { off: [0.4, 0.7], species: 2, iris: IRISES[1], sclera: SCLERAS[1], detail: 1, shine: 0.5, presence: 1, gx: 0, gy: 0, open: 0, pupil: 0.3 };
  const visibleEye = (e) => e.presence > 0.01 || e.open > 0.01;
  function paintSlabs() {
    gl.useProgram(slabProg);
    gl.colorMask(false, false, false, false);
    gl.depthMask(true);
    for (const r of layoutRects) {
      gl.uniform4f(slabBox, (r.left + 2) / W * 2 - 1, 1 - (r.bottom - 2) / H * 2, (r.right - 2) / W * 2 - 1, 1 - (r.top + 2) / H * 2);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    gl.colorMask(true, true, true, true);
    gl.depthMask(false);
    gl.useProgram(prog);
  }
  const prep = (e) => { e.detail = 0; e.shine = 0.14 + (e.pupil - 0.25) * 0.8; };
  const remember = (e) => { e.drawn = { open: e.open, gx: e.gx, gy: e.gy, pupil: e.pupil, presence: e.presence }; e.waiting = 0; };
  const changed = (e) => {
    const d = e.drawn;
    if (!d) return visibleEye(e);
    return Math.abs(d.open - e.open) > 0.006 || Math.abs(d.gx - e.gx) > 0.004 || Math.abs(d.gy - e.gy) > 0.004
      || Math.abs(d.pupil - e.pupil) > 0.012 || Math.abs(d.presence - e.presence) > 0.012;
  };
  function paintAll() {
    gl.disable(gl.SCISSOR_TEST);
    gl.depthMask(true);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    paintSlabs();
    if (big.open > 0.004) {
      bigLook.open = big.open; bigLook.gx = big.gx; bigLook.gy = big.gy; bigLook.pupil = big.pupil;
      bigLook.presence = Math.min(1, big.open * 2.2);
      drawEye(W / 2, H * 0.52, Math.max(W, H * 1.5) * 0.74, 0, bigLook);
    }
    for (const e of eyes) { remember(e); if (visibleEye(e)) { prep(e); drawEye(e.x, e.y, e.halfX, e.ang, e); stats.eyesDrawn++; } }
    drawnBig = { open: big.open, gx: big.gx, gy: big.gy };
    stats.full++;
  }
  // Redraw one eye's square, along with whatever neighbours poke into it
  function paintEye(e) {
    const sx = canvas.width / W, r = e.reach;
    const x = Math.max(0, Math.floor((e.x - r) * sx)), y = Math.max(0, Math.floor((H - e.y - r) * sx));
    gl.scissor(x, y, Math.ceil(r * 2 * sx), Math.ceil(r * 2 * sx));
    gl.depthMask(true);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    paintSlabs();
    for (const o of eyes) {
      if (!visibleEye(o) || Math.abs(o.x - e.x) > r + o.reach || Math.abs(o.y - e.y) > r + o.reach) continue;
      prep(o);
      drawEye(o.x, o.y, o.halfX, o.ang, o);
      stats.eyesDrawn++;
    }
    remember(e);
  }

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
      if (big.open < 0.002 && !big.target) big.open = 0;
      if (hiding && t > big.nextGlance) {
        big.nextGlance = t + 420 + R() * 1700;
        big.tx = ((P.x - W / 2) / (W * 0.5)) * 0.42; big.ty = -((P.y - H / 2) / (H * 0.5)) * 0.3;
      }
      big.gx += (big.tx - big.gx) * Math.min(1, dt * 11);
      big.gy += (big.ty - big.gy) * Math.min(1, dt * 11);
      big.pupil += (0.15 - big.pupil) * dt;
    }

    // ---- The rest
    if (dt) {
      const before = eyes.length;
      eyes = eyes.filter((e) => !e.dying || e.presence > 0.02 || e.open > 0.02);
      if (eyes.length !== before) needFull = true;
    }
    for (const e of eyes) {
      if (!dt) { e.open = e.squint; e.presence = 1; lookAt(e, W / 2, H / 2); e.gx = e.tgx; e.gy = e.tgy; continue; }
      const awake = t > e.wakeAt;
      const near = P.seen && t - P.at < 5000 && Math.hypot(P.x - e.x, P.y - e.y) < e.w * 0.62;
      if (near && !e.wasNear) { e.flinchUntil = t + 340 + R() * 300; e.tpupil = 0.2; }
      e.wasNear = near;
      if (e.shockAt && t > e.shockAt) { e.shockAt = 0; e.flinchUntil = t + 260 + R() * 260; e.tpupil = 0.5; e.nextBlink = t + 1800 + R() * 4000; }
      if (t > e.nextBlink) { e.blinkUntil = t + 90 + R() * 90; e.nextBlink = t + (3200 + R() * R() * 14000) * e.blinkEvery; }
      let target = awake ? e.squint : 0;
      if (staring) target = 1;
      if (t < e.blinkUntil || t < e.flinchUntil) target = 0;
      if (near) target = Math.min(target, t < e.flinchUntil ? 0 : 0.34);
      if (hiding || e.dying) target = 0;
      const closing = target < e.open;
      e.open += (target - e.open) * Math.min(1, dt * (closing ? 26 : e.openSpeed * (t < Math.max(e.blinkUntil, e.flinchUntil) + 500 ? 7 : 1)));
      const showing = awake && !hiding && !e.dying;
      e.presence += ((showing ? 1 : 0) - e.presence) * Math.min(1, dt * (showing ? 0.8 : 5));

      // Eyes jump between targets; they don't glide. If you haven't moved, those watching you hold still.
      if (t > e.nextLook) {
        if (staring) { e.tgx = 0; e.tgy = 0; e.nextLook = t + 1500; }
        else if (e.loyal && P.seen) {
          if (Math.hypot(P.x - e.lx, P.y - e.ly) > 24) { lookAt(e, P.x + (R() - 0.5) * 26, P.y + (R() - 0.5) * 26); e.lx = P.x; e.ly = P.y; e.nextLook = t + 180 + R() * R() * 1500; }
          else e.nextLook = t + 400 + R() * 900;
        } else {
          e.nextLook = t + 1200 + R() * R() * 8000;
          if (R() < 0.4 && eyes.length > 1) { const o = eyes[Math.floor(R() * eyes.length)]; lookAt(e, o.x, o.y); }
          else { e.tgx = (R() - 0.5) * 0.9; e.tgy = (R() - 0.5) * 0.4; }
        }
      }
      e.gx += (e.tgx - e.gx) * Math.min(1, dt * 24);
      e.gy += (e.tgy - e.gy) * Math.min(1, dt * 24);
      const wantPupil = staring ? 0.6 : Math.max(0.22, e.tpupil);
      e.pupil += (wantPupil - e.pupil) * Math.min(1, dt * 2.4);
      e.tpupil += (0.36 - e.tpupil) * Math.min(1, dt * 0.8);
    }

    // ---- Draw only what changed
    stats.frames++;
    const bigMoved = Math.abs(big.open - drawnBig.open) > 0.004 || Math.abs(big.gx - drawnBig.gx) > 0.003 || Math.abs(big.gy - drawnBig.gy) > 0.003;
    if (bigMoved && t - lastBig > 66) { needFull = true; lastBig = t; }   // the colossal eye moves slowly: 15 updates a second is plenty
    if (needFull || !dt) { needFull = false; paintAll(); return; }
    if (big.open > 0.004) return;
    const dirty = eyes.filter(changed);
    if (!dirty.length) return;
    dirty.sort((a, b) => b.waiting - a.waiting);
    gl.enable(gl.SCISSOR_TEST);
    gl.clearColor(0, 0, 0, 1);
    let budget = REDRAW_BUDGET, painted = 0;
    const px2 = (canvas.width / W) ** 2;
    for (const e of dirty) {
      const cost = 4 * e.halfX * e.halfX * 0.86 * px2;
      if (painted && cost > budget) { e.waiting++; continue; }
      budget -= cost; painted++;
      stats.pixels += cost;
      paintEye(e);
    }
    gl.disable(gl.SCISSOR_TEST);
  }

  resize();
  return {
    fps: 30,
    stats,
    resize,
    frame,
    layout(rects) { layoutRects = rects; place(rects, performance.now()); if (!S.running()) frame(performance.now(), 0, true); },
    // Slabs sliding over the eyes uncover pixels that were skipped, so draw those in
    moved(rects) { layoutRects = rects; needFull = true; if (!eyes.length) place(rects, performance.now()); },
    // A click travels outwards through them
    press(e) {
      const t = performance.now();
      for (const o of eyes) o.shockAt = t + Math.hypot(o.x - e.clientX, o.y - e.clientY) * 0.55;
    },
    summon() { big.state = 'closing-small'; big.until = performance.now() + 1500; },
    unmount() { gl.getExtension('WEBGL_lose_context')?.loseContext(); }
  };
});
