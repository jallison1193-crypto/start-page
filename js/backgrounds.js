'use strict';
// ---------- Drifting dust background ----------
const sky = (() => {
  const canvas = $('sky');
  const ctx = canvas.getContext('2d');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let specks = [], dust = [], w = 0, h = 0, running = false, raf = 0, last = 0;
  let palette = { ink: '232,238,247', accent: '121,224,212', now: '240,122,147', alpha: 1 };
  let style = 'dust';   // dust floats up; ash falls while a few embers rise

  // Mostly ink, a little accent, a rare touch of the "now" color
  const pick = () => { const t = Math.random(); return t < 0.12 ? 'accent' : t < 0.16 ? 'now' : 'ink'; };

  function seed() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = innerWidth; h = innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (style === 'ash') {
      specks = [];
      dust = Array.from({ length: Math.round((w * h) / 7000) }, () => {
        const z = Math.random() ** 1.4;
        const ember = Math.random() < 0.06;
        return {
          x: Math.random() * w, y: Math.random() * h, z, ember,
          size: ember ? 0.8 + z * 1.4 : 0.7 + z * 2.4,
          alpha: ember ? 0.55 + z * 0.4 : 0.14 + z * 0.4,
          speed: ember ? 6 + z * 10 : 8 + z * 22,
          dir: ember ? -1 : 1,
          sway: 10 + Math.random() * 24,
          phase: Math.random() * Math.PI * 2,
          color: ember ? 'accent' : 'ink'
        };
      });
      return;
    }
    // Far layer: tiny specks that never move, for depth
    specks = Array.from({ length: Math.round((w * h) / 4500) }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      size: 0.3 + Math.random() * 0.6, alpha: 0.12 + Math.random() * 0.25
    }));
    // Near layer: dust that floats up slowly; closer grains (higher z) are bigger, brighter and faster
    dust = Array.from({ length: Math.round((w * h) / 9000) }, () => {
      const z = Math.random() ** 1.6;
      return {
        x: Math.random() * w, y: Math.random() * h, z,
        size: 0.6 + z * 2.2, alpha: 0.25 + z * 0.55,
        speed: 3 + z * 12,                   // pixels per second
        dir: -1,                             // upwards
        sway: 6 + Math.random() * 14,        // how far it wanders sideways
        phase: Math.random() * Math.PI * 2, color: pick()
      };
    });
  }

  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    const k = palette.alpha;
    for (const s of specks) {
      ctx.fillStyle = `rgba(${palette.ink},${s.alpha * k})`;
      ctx.fillRect(s.x, s.y, s.size, s.size);
    }
    const secs = t / 1000;
    for (const d of dust) {
      const x = d.x + Math.sin(secs * 0.15 + d.phase) * d.sway;
      const rgb = palette[d.color];
      if (d.z > 0.45 || d.ember) {
        ctx.fillStyle = `rgba(${rgb},${d.alpha * 0.12 * k})`;   // a soft halo on the nearest grains
        ctx.beginPath(); ctx.arc(x, d.y, d.size * 3, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = `rgba(${rgb},${d.alpha * k})`;
      ctx.beginPath(); ctx.arc(x, d.y, d.size, 0, Math.PI * 2); ctx.fill();
    }
  }

  function loop(t) {
    if (!running) return;
    const dt = Math.min((t - last) / 1000, 0.1);
    if (t - last > 33) {                    // about 30 frames a second
      for (const d of dust) {
        d.y += d.dir * d.speed * dt;
        if (d.y < -10) { d.y = h + 10; d.x = Math.random() * w; }
        else if (d.y > h + 10) { d.y = -10; d.x = Math.random() * w; }
      }
      draw(t);
      last = t;
    }
    raf = requestAnimationFrame(loop);
  }

  seed();
  addEventListener('resize', () => { seed(); draw(performance.now()); });
  return {
    setPalette(p) { palette = p; draw(performance.now()); },
    setStyle(s) { if (s !== style) { style = s; seed(); draw(performance.now()); } },
    setEnabled(on) {
      canvas.hidden = !on;
      if (!on) { running = false; cancelAnimationFrame(raf); return; }
      if (still) { draw(0); return; }
      if (!running) { running = true; raf = requestAnimationFrame((t) => { last = t; loop(t); }); }
    }
  };
})();

// ---------- Animated backgrounds (WebGL): Fractal and Tie-dye ----------
const FX_VERT = 'attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }';
const FX_HEAD = `precision highp float;
uniform vec2 res; uniform float t; uniform vec3 a; uniform vec3 b; uniform vec3 bg; uniform float light; uniform vec2 mouse;
`;

// Fractal: the screen is folded into six mirrored slices like a kaleidoscope, each filled with a
// slowly morphing Julia set. Every point's path is checked against a ring, a cross and the centre
// ("orbit traps"); the closer it passes, the brighter it glows. A smaller copy turning the other
// way sits behind it for depth.
const FX_FRACTAL = FX_HEAD + `
vec3 iri(float x) { return 0.5 + 0.5 * cos(6.28318 * (x + vec3(0.0, 0.33, 0.67))); }
vec2 rot(vec2 p, float r) { return mat2(cos(r), -sin(r), sin(r), cos(r)) * p; }
vec2 kaleido(vec2 p, float n) {
  float s = 6.28318 / n;
  float ang = mod(atan(p.y, p.x) + s * 0.5, s) - s * 0.5;
  return length(p) * vec2(cos(abs(ang)), sin(abs(ang)));
}
vec4 julia(vec2 z, vec2 c) {
  float ring = 1e3, crs = 1e3, core = 1e3, n = 0.0;
  for (int i = 0; i < 72; i++) {
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    ring = min(ring, abs(length(z) - 0.62));
    crs = min(crs, min(abs(z.x), abs(z.y)));
    core = min(core, dot(z, z));
    if (dot(z, z) > 64.0) break;
    n += 1.0;
  }
  float s = n >= 72.0 ? 0.0 : clamp((n - log2(log2(dot(z, z)))) / 72.0, 0.0, 1.0);
  return vec4(exp(-ring * 16.0), exp(-crs * 22.0), exp(-sqrt(core) * 7.0), s);
}
void main() {
  vec2 q = (gl_FragCoord.xy - 0.5 * res) / min(res.x, res.y);
  vec2 m = mouse * 0.06;
  float ang = 2.1 + 0.8 * sin(t * 0.017);
  vec2 c = 0.7885 * vec2(cos(ang), sin(ang));
  vec4 j1 = julia(kaleido(rot(q + m, t * 0.02), 6.0) * (1.9 + 0.3 * sin(t * 0.019)) - vec2(0.35, 0.0), c);
  vec4 j2 = julia(kaleido(rot(q - m * 0.5, -t * 0.013), 6.0) * 3.4 - vec2(0.2, 0.1), c * 1.02);
  float shift = t * 0.012;
  vec3 spectrum = iri(j1.w * 2.5 + shift);
  vec3 tint = spectrum * j1.x * 1.15
            + a * j1.y * 0.55
            + b * pow(j1.z, 3.0) * 1.4
            + a * pow(j1.w, 0.8) * 0.45
            + iri(j2.w * 2.0 + shift + 0.5) * (j2.x * 0.35 + j2.y * 0.2);
  float k = clamp(j1.x * 0.9 + j1.y * 0.45 + pow(j1.w, 0.8) * 0.5 + j2.x * 0.3, 0.0, 1.6);
  float vig = smoothstep(1.35, 0.2, length(q));
  vec3 col = light > 0.5 ? bg - (vec3(1.0) - spectrum) * k * 0.42 * vig : bg + tint * vig;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

// Tie-dye: modelled on a folded ice-dye shirt. The left half mirrors the right, soft rings spread
// from the centre line with V-shaped points where it was pleated, colours bleed into each other,
// crumpled folds stay pale with dye pooling beside them, and the rings slowly flow outwards.
const FX_TIEDYE = FX_HEAD + `
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec2 hash2(vec2 p) { return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, w = 0.5;
  for (int i = 0; i < 5; i++) { v += w * noise(p); p *= 2.03; w *= 0.5; }
  return v;
}
// Ridged noise: thin, branching lines like the crinkles in crumpled cotton (high on a crinkle)
float ridge(vec2 p) {
  float v = 0.0, w = 0.55;
  for (int i = 0; i < 4; i++) { v += w * (1.0 - abs(noise(p) * 2.0 - 1.0)); p = p * 2.13 + 1.7; w *= 0.5; }
  return v;
}
// The shirt's colours from the centre outwards
vec3 pal(float i) {
  if (i < 0.5) return vec3(0.97, 0.93, 0.86);   // cream
  if (i < 1.5) return vec3(0.93, 0.62, 0.40);   // peach
  if (i < 2.5) return vec3(0.73, 0.52, 0.75);   // lilac
  if (i < 3.5) return vec3(0.50, 0.40, 0.36);   // sepia
  if (i < 4.5) return vec3(0.38, 0.78, 0.84);   // aqua
  if (i < 5.5) return vec3(0.62, 0.86, 0.30);   // lime
  if (i < 6.5) return vec3(0.93, 0.88, 0.38);   // butter yellow
  if (i < 7.5) return vec3(0.55, 0.33, 0.73);   // violet
  return vec3(0.97, 0.93, 0.86);
}
// Neighbouring colours run into each other like wet dye
vec3 dye(float x) {
  x = fract(x) * 8.0;
  float i = floor(x);
  return mix(pal(i), pal(i + 1.0), smoothstep(0.1, 0.9, fract(x)));
}
void main() {
  vec2 q = (gl_FragCoord.xy - 0.5 * res) / res.y + mouse * 0.015;
  // Folded down the middle before dyeing, so the left mirrors the right
  vec2 p = vec2(abs(q.x), q.y);
  // The dye wicks unevenly through the cloth, and this slowly shifting warp is that wandering
  vec2 w = vec2(fbm(p * 1.8 + vec2(0.0, t * 0.02)), fbm(p * 1.8 + vec2(5.2, -t * 0.017))) - 0.5;
  vec2 pw = p + w * 0.45;
  // Tall rings with soft V-shaped points where the fabric was pleated
  float v = abs(fract(pw.y * 4.0 - pw.x * 2.5) - 0.5);
  float ring = length(vec2(pw.x * 1.2, pw.y * 0.7)) + v * 0.06;
  float shift = -t * 0.015 + w.x * 0.3;
  // Two slightly different reads of the rings, blended, so neighbouring colours bleed together
  vec3 colour = mix(dye(ring * 2.2 + shift), dye(ring * 2.2 + shift + (w.y - 0.1) * 0.35), 0.4);
  // How much dye soaked in: patchy, never even
  float soak = 0.62 + 0.38 * fbm(q * 6.0 + w * 3.0);
  // Crumpled folds: the tightest crinkles stay pale, and dye pools darker right beside them
  float crinkle = ridge(q * 3.4 + w * 1.8);
  float fold = smoothstep(0.74, 0.92, crinkle);
  float pool = smoothstep(0.52, 0.74, crinkle) * (1.0 - fold);
  soak = soak * (1.0 - fold * 0.8) + pool * 0.22;
  colour *= 1.0 - pool * 0.22;
  // Ice-dye grain: tiny crystals of stronger and weaker pigment
  soak = clamp(soak + (noise(q * 42.0 + w * 5.0) - 0.5) * 0.16, 0.0, 1.0);
  vec3 col = light > 0.5
    ? mix(vec3(0.985, 0.965, 0.93), colour, soak)                 // dye on white cotton
    : mix(vec3(0.03, 0.024, 0.04), pow(colour, vec3(1.25)) * 0.82, soak * 0.92);  // the same dye on a black shirt
  float vig = smoothstep(1.4, 0.35, length(q * vec2(0.75, 1.0)));
  col *= light > 0.5 ? 0.93 + 0.07 * vig : 0.72 + 0.28 * vig;
  gl_FragColor = vec4(col, 1.0);
}`;

const fx = (() => {
  const canvas = $('fx');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const born = performance.now() - 90000;          // start partway into the slow morph
  const SOURCES = { fractal: FX_FRACTAL, tiedye: FX_TIEDYE };
  // Render below full resolution: the glass panes blur it anyway, and it keeps the laptop cool
  const SCALE = { fractal: 0.42, tiedye: 0.7 };
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  let gl = null, buf = null, progs = {}, kind = '', u = null, raf = 0, running = false, last = 0, pal = null;
  addEventListener('pointermove', (e) => { mouse.tx = (e.clientX / innerWidth) * 2 - 1; mouse.ty = 1 - (e.clientY / innerHeight) * 2; });

  function init() {
    gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
    if (!gl) return false;
    buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);   // one triangle covers the screen
    return true;
  }
  function program(k) {
    if (progs[k]) return progs[k];
    const shader = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, FX_VERT));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, SOURCES[k]));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    const p = { prog, loc: gl.getAttribLocation(prog, 'p') };
    for (const n of ['res', 't', 'a', 'b', 'bg', 'light', 'mouse']) p[n] = gl.getUniformLocation(prog, n);
    return (progs[k] = p);
  }
  function use(k) {
    const p = program(k);
    if (!p) return false;
    gl.useProgram(p.prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(p.loc);
    gl.vertexAttribPointer(p.loc, 2, gl.FLOAT, false, 0, 0);
    u = p; kind = k;
    return true;
  }
  function size() {
    const k = Math.min(window.devicePixelRatio || 1, 2) * SCALE[kind];
    canvas.width = Math.round(innerWidth * k); canvas.height = Math.round(innerHeight * k);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  function draw(now) {
    mouse.x += (mouse.tx - mouse.x) * 0.04;   // ease towards the pointer so it drifts, never jumps
    mouse.y += (mouse.ty - mouse.y) * 0.04;
    gl.uniform2f(u.res, canvas.width, canvas.height);
    gl.uniform1f(u.t, (now - born) / 1000);
    gl.uniform3fv(u.a, pal.a); gl.uniform3fv(u.b, pal.b); gl.uniform3fv(u.bg, pal.bg);
    gl.uniform1f(u.light, pal.light);
    gl.uniform2f(u.mouse, mouse.x, mouse.y);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function loop(now) {
    if (!running) return;
    if (now - last > 40) { draw(now); last = now; }
    raf = requestAnimationFrame(loop);
  }
  addEventListener('resize', () => { if (gl && u && !canvas.hidden) { size(); draw(performance.now()); } });
  return {
    // Returns false when WebGL isn't available, so the page can fall back to dust
    set(active, moving, palette, which) {
      canvas.hidden = !active;
      if (!active) { running = false; cancelAnimationFrame(raf); return false; }
      if ((!gl && !init()) || (kind !== which && !use(which))) { canvas.hidden = true; return false; }
      pal = palette; size(); draw(performance.now());
      if (moving && !still) { if (!running) { running = true; raf = requestAnimationFrame(loop); } }
      else { running = false; cancelAnimationFrame(raf); }
      return true;
    }
  };
})();

