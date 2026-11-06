'use strict';
// ---------- Scenes: the four art themes ----------
// A scene owns the space behind the widgets (sceneBack), a layer above them (sceneOver), and an
// animation loop. It's told where the widgets are, so the art can work around them.
const scene = (() => {
  const back = $('sceneBack'), over = $('sceneOver');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const defs = {};
  const pointer = { x: innerWidth / 2, y: innerHeight / 2, speed: 0, at: -1e9, downAt: -1e9, seen: false };
  let name = '', api = null, raf = 0, last = 0, moving = true, layoutKey = '', layoutTimer = 0, poll = 0;

  addEventListener('pointermove', (e) => {
    const dx = e.clientX - pointer.x, dy = e.clientY - pointer.y;
    pointer.speed = Math.hypot(dx, dy);
    pointer.x = e.clientX; pointer.y = e.clientY;
    pointer.at = performance.now(); pointer.seen = true;
  }, { passive: true });
  addEventListener('pointerdown', (e) => {
    pointer.x = e.clientX; pointer.y = e.clientY;
    pointer.downAt = pointer.at = performance.now(); pointer.seen = true;
    api?.press?.(e);
  }, { passive: true });

  // The widgets on screen right now
  function widgetRects() {
    const out = [];
    for (const el of document.querySelectorAll('.pages .widget')) {
      const r = el.getBoundingClientRect();
      if (r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight) out.push({ left: r.left, top: r.top, right: r.right, bottom: r.bottom, el });
    }
    return out;
  }
  // Things the art must stay clear of: the page tabs and buttons along the top
  function chromeRects() {
    return [...document.querySelectorAll('.page-tabs, .top-actions')].map((el) => el.getBoundingClientRect());
  }
  function checkLayout() {
    if (!api) return;
    const rects = widgetRects();
    const key = rects.map((r) => [r.left, r.top, r.right, r.bottom].map(Math.round).join()).join('|') + innerWidth + 'x' + innerHeight;
    if (key === layoutKey) return;
    layoutKey = key;
    api.moved?.(rects);
    clearTimeout(layoutTimer);
    layoutTimer = setTimeout(() => api?.layout?.(widgetRects()), 180);
  }
  function loop(t) {
    raf = requestAnimationFrame(loop);
    const gap = 1000 / (api.fps || 30);
    if (t - last < gap - 2) return;
    const dt = Math.min((t - last) / 1000, 0.1);
    last = t;
    if (t - poll > 120) { poll = t; checkLayout(); }
    api.frame(t, dt);
    pointer.speed *= 0.8;
  }
  function stop() { cancelAnimationFrame(raf); raf = 0; }
  function start() {
    stop();
    if (!api) return;
    if (!api.frame) return;
    if (moving && !still) { last = performance.now(); raf = requestAnimationFrame(loop); } else api.frame(performance.now(), 0, true);
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
  addEventListener('resize', () => { layoutKey = ''; api?.resize?.(); checkLayout(); if (!raf) api?.frame?.(performance.now(), 0, true); });

  return {
    still, pointer, back, over, widgetRects, chromeRects,
    define(key, def) { defs[key] = def; },
    has: (key) => !!defs[key],
    running: () => !!raf,
    // Mounting builds the scene; turning movement off keeps its first frame
    set(key, canMove) {
      moving = canMove;
      if (key === name) { start(); return; }
      stop();
      api?.unmount?.();
      back.replaceChildren(); over.replaceChildren();
      back.hidden = over.hidden = !key;
      name = key || ''; api = null; layoutKey = '';
      if (!key || !defs[key]) return;
      api = defs[key](this);
      checkLayout();
      start();
    },
    // After a widget renders, a scene can add to it or rename it
    decorate(item, body) {
      const voice = WIDGET_VOICE[settings.set]?.[item.type];
      if (voice) { const h = body.querySelector('.w-head h2'); if (h && !item.cfg.title) h.textContent = voice; }
      api?.decorate?.(item, body);
    },
    // A scene can take over the move between pages. Returns true if it did.
    turn(from, to, smooth) { return !!api?.turn?.(from, to, smooth); },
    greeted() { api?.greeted?.(); },
    get api() { return api; },
    nudgeLayout() { layoutKey = ''; checkLayout(); }
  };
})();

// Each theme calls the widgets something of its own. Only the wording changes.
const WIDGET_VOICE = {
  watcher: { weather: 'Conditions outside', sky: 'What’s above you', alerts: 'Disruptions on your lines', notes: 'Your admissions', news: 'What they’re saying', tasks: 'Still undone', remaining: 'Time left under observation', obits: 'No longer observed', reading: 'What you’re reading. We saw.' },
  grimoire: { weather: 'Of the Weather', sky: 'Of the Heavens', alerts: 'Of the Rails', notes: 'A Note in the Margin', tasks: 'Labours Unfinished', calendar: 'The Reckoning of Days', projects: 'Works in Progress', reading: 'The Book at Hand', prices: 'Of Coin & Merchants', obits: 'The Lately Dead', air: 'Of the Foul Air', quakes: 'The Earth Doth Tremble', launches: 'Fire into the Firmament', iss: 'The Wandering Star', remaining: 'Weeks Yet Allotted', prompts: 'A Question', decide: 'Consult the Book', focus: 'The Hourglass', countdown: 'The Day Approaches', course: 'Thy Studies' },
  spirit: { weather: 'The air tonight', sky: 'Signs above', alerts: 'Disturbances on your lines', notes: 'Messages received', tasks: 'Unfinished business', calendar: 'The hours', remaining: 'Weeks before you join us', obits: 'New arrivals', prompts: 'The spirits ask', decide: 'Ask the board', reading: 'Your current book', projects: 'What you leave behind' },
  remaining: { weather: 'Today’s weather, of few', sky: 'The sky, still there', alerts: 'Delays you’ll never get back', notes: 'Worth writing down?', tasks: 'Before it’s too late', calendar: 'This month, spent', news: 'Other people’s weeks', projects: 'What you did with it', reading: 'Books you’ll finish', prices: 'Things you can’t take with you', focus: '25 minutes, gone' }
};

// Draw a fragment shader once onto a canvas, for art that doesn't move
function paintShader(canvas, source, uniforms) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: true, preserveDrawingBuffer: true });
  if (!gl) return false;
  const compile = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, 'attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }'));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, source));
  gl.linkProgram(prog);
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.viewport(0, 0, canvas.width, canvas.height);
  for (const [k, v] of Object.entries(uniforms)) {
    const u = gl.getUniformLocation(prog, k);
    if (Array.isArray(v)) gl['uniform' + v.length + 'f'](u, ...v); else gl.uniform1f(u, v);
  }
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  return true;
}
const GLSL_NOISE = `
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, w = 0.5;
  for (int i = 0; i < 5; i++) { v += w * noise(p); p = p * 2.03 + 7.1; w *= 0.5; }
  return v;
}`;
const seeded = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
