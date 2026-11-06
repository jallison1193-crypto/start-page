'use strict';
// ---------- The Grimoire ----------
// An open book on a dark table. The grid's two halves are its two pages. Turning a page really bends
// the leaf over the spine, the cursor is a candle, and writing nobody meant you to see only shows in
// its light. The vellum is painted once by a shader; the ivy borders grow from code, a different
// plant on every page; the scenes along the bottom are the kind monks really drew when bored.
const VELLUM = `precision highp float;
uniform vec2 res; uniform vec4 book; uniform float spine; uniform float dpr;
${GLSL_NOISE}
void main() {
  vec2 px = vec2(gl_FragCoord.x, res.y - gl_FragCoord.y) / dpr;
  vec2 cm = px * 0.012;
  // The table: old black oak, lit only near the book
  float grain = fbm(vec2(px.x * 0.004 + fbm(px * 0.006) * 1.5, px.y * 0.05));
  vec3 table = mix(vec3(0.022, 0.013, 0.008), vec3(0.085, 0.05, 0.028), grain);
  float nearBook = max(max(book.x - px.x, px.x - book.z), max(book.y - px.y, px.y - book.w));
  table *= 0.4 + 0.9 * exp(-max(nearBook, 0.0) * 0.02);
  table *= 1.0 - 0.75 * exp(-max(nearBook, 0.0) * 0.09);

  // Rough edge of the skin, chewed by time
  float rough = (fbm(px * 0.03) - 0.5) * 7.0 + (fbm(px * 0.17) - 0.5) * 2.0;
  float dl = px.x - book.x + rough, dr = book.z - px.x + rough, dt = px.y - book.y + rough, db = book.w - px.y + rough;
  float edge = min(min(dl, dr), min(dt, db));
  float inBook = smoothstep(-0.6, 0.6, edge);

  // Vellum: blotchy, never one colour
  float cloud = fbm(cm * 1.1 + 3.0);
  float cloud2 = fbm(cm * 3.3 + 9.0);
  vec3 skin = mix(vec3(0.70, 0.56, 0.35), vec3(0.87, 0.76, 0.55), cloud);
  skin = mix(skin, vec3(0.76, 0.60, 0.38), smoothstep(0.42, 0.72, cloud2) * 0.5);
  // Long fibres and the follicles where hair grew on the animal
  float fibre = noise(vec2(px.x * 0.08 + cloud * 5.0, px.y * 0.9));
  skin *= 0.965 + 0.07 * fibre;
  float follicle = smoothstep(0.82, 0.92, noise(px * 0.7 + cloud2 * 8.0)) * smoothstep(0.45, 0.65, noise(px * 0.05));
  skin *= 1.0 - follicle * 0.22;
  // Foxing and old stains
  float fox = smoothstep(0.7, 0.86, noise(px * 0.14 + fbm(px * 0.03) * 3.0 + 40.0)) * smoothstep(0.52, 0.72, noise(px * 0.01 + 3.0));
  skin = mix(skin, vec3(0.45, 0.27, 0.12), fox * 0.2);
  float stain = smoothstep(0.62, 0.68, fbm(cm * 0.8 + 21.0));
  float stainRim = smoothstep(0.60, 0.635, fbm(cm * 0.8 + 21.0)) - smoothstep(0.635, 0.68, fbm(cm * 0.8 + 21.0));
  skin = mix(skin, skin * vec3(0.88, 0.8, 0.68), stain * 0.34);
  skin *= 1.0 - stainRim * 0.045;
  // Faint ruling the scribe pricked and scored
  float rule = smoothstep(0.8, 0.0, abs(mod(px.y, 27.0) - 13.5));
  skin *= 1.0 - rule * 0.045 * (0.5 + 0.5 * noise(px * vec2(0.02, 0.0) + px.y));

  // The curve of the open pages into the spine
  float sd = px.x - spine;
  float a = abs(sd);
  float pageW = (book.z - book.x) * 0.5;
  float bulge = sin(clamp(a / pageW, 0.0, 1.0) * 3.14159);
  skin *= 0.86 + 0.2 * pow(bulge, 0.8);
  skin *= 1.0 - 0.72 * exp(-a * 0.062) - 0.26 * exp(-a * 0.012);
  // A hair of light on the crest of each page near the gutter
  skin += vec3(0.05, 0.04, 0.025) * exp(-pow((a - 80.0) * 0.02, 2.0));
  // Page block: many leaves showing at the outer edges
  float outer = min(dl, dr);
  float block = smoothstep(16.0, 2.0, outer);
  float leaves = 0.5 + 0.5 * sin(outer * 5.2 + noise(px * 0.05) * 3.0);
  skin = mix(skin, vec3(0.53, 0.40, 0.23) * (0.55 + 0.5 * leaves), block);
  float bottom = smoothstep(9.0, 1.0, db);
  skin = mix(skin, vec3(0.46, 0.34, 0.19) * (0.6 + 0.4 * (0.5 + 0.5 * sin(db * 6.0))), bottom);
  // Scorched and handled at the edges
  float burn = smoothstep(44.0, 0.0, edge + (fbm(px * 0.016) - 0.5) * 42.0);
  skin = mix(skin, skin * vec3(0.52, 0.36, 0.22), burn * 0.85);
  float char_ = smoothstep(9.0, 0.0, edge + (fbm(px * 0.05) - 0.5) * 16.0);
  skin = mix(skin, vec3(0.05, 0.03, 0.018), char_ * 0.82);

  vec3 col = mix(table, skin, inBook);
  gl_FragColor = vec4(col, 1.0);
}`;

const INK = '#2A170C', RED = '#8C1A12', BLUE = '#27457F', GOLD = '#B98E2E', BONE = '#E8DAB6', FLESH = '#D8AF85';
const asImg = (svg, cls, style = '') => `<img class="${cls}" alt="" draggable="false" decoding="sync" style="${style}" src="data:image/svg+xml,${encodeURIComponent(svg)}">`;
// Slightly unsteady pen: wobble the lines so nothing looks machine drawn
const PEN = '<filter id="pen" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="1.6"/></filter>';
function spiral(cx, cy, r, turns, dir = 1, start = 0) {
  let d = '';
  const steps = Math.round(turns * 18);
  for (let i = 0; i <= steps; i++) {
    const k = i / steps, a = start + dir * k * turns * Math.PI * 2, rr = r * (1 - k * 0.92);
    d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)}`;
  }
  return d;
}
const G = (body) => `<g stroke="${INK}" stroke-width="1.05" stroke-linecap="round" stroke-linejoin="round" filter="url(#pen)">${body}</g>`;
const scenes = [
  // The knight has lost to the snail, again
  () => { const sh = spiral(166, 41, 25, 3.1, 1, 2.4); return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 224 76"><defs>${PEN}</defs>${G(`
    <path d="M6 71C40 69 70 72 110 70S190 72 218 70" fill="none"/>
    <path d="M12 71l-2-5M20 71l1-5M88 70l-2-5M214 70l2-5M204 71l-1-4" fill="none"/>
    <path d="M116 70C112 58 110 45 119 38C126 33 134 38 132 47C131 54 136 60 146 62H194C204 62 212 66 214 70Z" fill="${BONE}"/>
    <path d="M120 38L113 21M127 36L129 19" fill="none"/><circle cx="112.5" cy="19.5" r="2" fill="${INK}"/><circle cx="129.5" cy="17.5" r="2" fill="${INK}"/>
    <path d="M120 45L126 47M119 51C122 53 125 53 127 51" fill="none"/>
    <circle cx="166" cy="41" r="25" fill="${GOLD}"/><path d="${sh}" fill="none" stroke-width="1.5"/>
    <path d="M147 26l4 3M185 25l-3 4M190 49l-4-1M149 57l3-3" fill="none" opacity=".7"/>
    <path d="M40 71C38 64 40 58 46 55L60 57C66 60 68 66 68 71Z" fill="#6E6B66"/>
    <path d="M42 58C38 46 42 36 52 33C62 31 70 36 71 44L66 60Z" fill="${RED}"/>
    <path d="M47 38L66 58M67 38L45 56" fill="none" stroke="${GOLD}"/>
    <path d="M53 34C47 28 46 20 50 14C55 8 66 9 70 15C72 20 71 27 68 32C63 35 58 35 53 34Z" fill="#8D8A84" transform="rotate(14 60 22)"/>
    <path d="M51 22L72 27" fill="none" stroke-width="1.8"/><path d="M63 12C56 2 44 3 38 10C45 9 52 11 57 15" fill="${RED}"/>
    <path d="M70 42C78 40 86 37 92 30M72 46C80 45 88 42 94 34" fill="none" stroke-width="2.2" stroke="#6E6B66"/>
    <path d="M90 27L97 34" fill="none" stroke-width="2.6"/>
    <path d="M74 69L92 64M88 68L84 62" fill="none"/><path d="M92 64L100 62" fill="none" stroke-width=".8"/><path d="M104 69L112 66" fill="none"/>
    <path d="M28 70C22 66 22 58 24 50L37 50C40 58 39 66 34 70Z" fill="${BLUE}"/><path d="M31 52V68M24 60H38" fill="none" stroke="${GOLD}"/>`)}</svg>`; },
  // The rabbit is doing the hunting now
  () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 224 76"><defs>${PEN}</defs>${G(`
    <path d="M6 71C50 68 90 72 130 70S190 71 218 70" fill="none"/><path d="M196 70l2-5M204 71l-1-4M16 71l-2-4" fill="none"/>
    <path d="M78 71V55L108 53V71Z" fill="#7B5A3A"/><path d="M84 60L100 59M82 65L104 64" fill="none" opacity=".7"/>
    <path d="M24 71C22 60 28 52 40 48C52 45 64 47 76 53L74 60C62 58 52 60 48 66L50 71Z" fill="${BLUE}"/>
    <path d="M76 52C82 48 90 49 92 54C93 58 88 62 83 61C79 60 76 57 76 52Z" fill="${FLESH}"/>
    <path d="M87 57L90 57M84 59C85 60 87 60 88 59" fill="none"/>
    <path d="M52 62C58 66 66 66 72 63M46 64L38 71" fill="none"/>
    <path d="M100 69C106 61 118 61 122 68L124 71H100Z" fill="${RED}"/><path d="M118 62C124 54 130 52 134 54C128 56 124 60 122 66" fill="${BONE}"/>
    <path d="M154 70C148 64 146 52 150 42C153 35 164 32 171 37C178 43 180 58 174 70Z" fill="${BONE}"/>
    <path d="M154 70H142C140 68 142 66 146 66H156M172 70H184C186 68 184 66 180 66H172" fill="${BONE}"/>
    <path d="M154 36C148 34 146 28 148 24C150 19 158 16 165 18C172 20 174 28 172 33C168 38 160 38 154 36Z" fill="${BONE}"/>
    <path d="M160 18C156 8 158 0 163 1C167 3 167 10 165 18M167 19C167 9 171 2 175 4C178 7 175 14 170 21" fill="${BONE}"/>
    <path d="M161 14C160 9 161 6 163 5M170 14C171 10 173 8 174 7" fill="none" stroke="${RED}"/>
    <circle cx="153" cy="26" r="1.5" fill="${RED}"/><path d="M147.5 29L150 31L148 33M151 31C152 32 154 32 155 31" fill="none"/>
    <path d="M152 44C144 40 136 32 132 22" fill="none" stroke-width="2.4"/>
    <path d="M136 30L118 5" fill="none" stroke="#6A4A2C" stroke-width="2.6"/>
    <path d="M112 4C120 -2 130 2 132 12C126 11 120 14 118 20C112 16 109 10 112 4Z" fill="#8D8A84"/><path d="M114 8C118 8 123 10 126 12" fill="none" opacity=".6"/>`)}</svg>`,
  // Death is early and checks the glass
  () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 224 76"><defs>${PEN}</defs>${G(`
    <path d="M6 71C60 68 110 72 150 70S200 71 218 70" fill="none"/>
    <path d="M42 19H74M42 66H74" fill="none" stroke-width="3" stroke="${GOLD}"/><path d="M47 19V66M69 19V66" fill="none" stroke="#7B5A3A"/>
    <path d="M49 21C49 33 56 38 58 42C60 38 67 33 67 21ZM49 64C49 52 56 47 58 43C60 47 67 52 67 64Z" fill="${BONE}"/>
    <path d="M53 62C55 55 61 55 63 62Z" fill="${GOLD}"/><path d="M58 43V58" fill="none" stroke-dasharray="1 2"/>
    <path d="M94 71C94 54 96 36 106 26C114 19 128 22 132 34C136 46 140 60 144 71C128 74 110 74 94 71Z" fill="#1E140D"/>
    <path d="M108 26C112 18 124 18 128 27C130 36 124 42 117 42C110 42 105 34 108 26Z" fill="#100A06"/>
    <path d="M110 30C111 25 122 25 124 30C125 35 121 39 117 39C113 39 109 35 110 30Z" fill="${BONE}" stroke-width=".7"/>
    <circle cx="114" cy="31" r="1.6" fill="#100A06"/><circle cx="120" cy="31" r="1.6" fill="#100A06"/><path d="M114 36H120M115.5 35V37M117 35V37M118.5 35V37" fill="none" stroke-width=".5"/>
    <path d="M102 42C94 42 84 42 76 40M78 40L73 37M78 40L72 40M78 40L73 43" fill="none" stroke="${BONE}" stroke-width="1.5"/>
    <path d="M132 40C142 40 148 38 152 36" fill="none" stroke="${BONE}" stroke-width="1.5"/>
    <path d="M158 71L148 6" fill="none" stroke="#6A4A2C" stroke-width="2"/>
    <path d="M148 7C164 -4 194 2 206 22C190 12 168 12 150 17Z" fill="#8D8A84"/><path d="M156 10C168 6 182 8 194 14" fill="none" opacity=".6"/>`)}</svg>`,
  // The brother reads on, and something behind him is helping
  () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 224 76"><defs>${PEN}</defs>${G(`
    <path d="M6 71C50 69 110 72 150 70S200 71 218 70" fill="none"/>
    <path d="M112 71V62H150V71" fill="#7B5A3A"/>
    <path d="M108 71C108 52 110 34 122 28C134 24 146 30 150 44C152 54 152 62 154 71Z" fill="#6B4B2B"/>
    <path d="M124 30C118 22 122 10 132 9C142 8 148 18 144 27C140 32 130 34 124 30Z" fill="${FLESH}"/>
    <path d="M124 15C128 6 140 5 146 14C140 11 130 11 124 15Z" fill="#3A2412"/>
    <path d="M128 21L132 21M125 26C127 27 129 27 130 26" fill="none"/>
    <path d="M124 44C116 46 110 48 104 46" fill="none" stroke-width="2.4" stroke="#6B4B2B"/>
    <path d="M78 38L104 44L104 58L78 52Z" fill="${BONE}"/><path d="M104 44L118 38V50L104 58Z" fill="${BONE}"/><path d="M84 44L100 48M84 48L100 52" fill="none" opacity=".6"/>
    <path d="M104 70C100 62 108 58 104 50C114 56 116 62 112 70Z" fill="${GOLD}"/><path d="M116 71C112 64 120 60 118 54C126 58 128 64 124 71Z" fill="${RED}"/><path d="M130 71C128 66 134 62 132 58C138 62 140 66 137 71Z" fill="${GOLD}"/>
    <path d="M176 71C172 62 172 54 176 48C182 42 192 44 195 52C198 60 196 66 194 71Z" fill="${RED}"/>
    <path d="M176 49C173 44 174 36 180 33C188 30 195 36 194 43C193 49 184 52 176 49Z" fill="${RED}"/>
    <path d="M178 35L173 26L182 32M190 34L196 25L193 37" fill="${INK}"/>
    <circle cx="179" cy="41" r="1.6" fill="${GOLD}"/><path d="M175 46L183 45" fill="none"/><path d="M177 45l1 2 1-2 1 2 1-2" fill="none" stroke-width=".6"/>
    <path d="M195 66C206 66 212 60 208 52C206 49 203 50 204 53" fill="none"/><path d="M204 53L200 48L208 49Z" fill="${INK}"/>
    <path d="M178 56C168 58 160 60 150 66" fill="none" stroke-width="1.8"/><path d="M152 62L142 70" fill="none" stroke="#6A4A2C" stroke-width="2"/>
    <path d="M144 70C136 64 144 60 142 54C150 58 152 64 148 70Z" fill="${GOLD}"/>`)}</svg>`
];

// An ivy border: a painted bar along the text, with vine and three-pointed leaves spraying off it
function ivyBorder(h, seed, outward) {
  const rnd = seeded(seed * 7919 + 13);
  const W = 74, barX = outward > 0 ? 8 : W - 14;
  let bar = '', vine = '', leaves = '', dots = '';
  for (let y = 0, i = 0; y < h; i++) {
    const len = 48 + rnd() * 60, colour = i % 2 ? BLUE : '#8A2A3A';
    bar += `<rect x="${barX}" y="${y}" width="6" height="${Math.min(len, h - y) - 3}" fill="${colour}" stroke="${GOLD}" stroke-width=".8"/><path d="M${barX + 3} ${y + 5}V${Math.min(y + len, h) - 8}" stroke="#F0E3C2" stroke-width=".6" stroke-dasharray="1.6 3.4"/>`;
    y += len;
  }
  const leaf = (x, y, a, c) => `<path transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${a.toFixed(0)}) scale(${(0.72 + rnd() * 0.5).toFixed(2)})" d="M0 0C-1 -3 -5 -3 -7 -1C-5 -1 -4 0 -4 1C-7 0 -9 2 -9 5C-7 4 -5 4 -3 5C-4 7 -3 10 0 12C3 10 4 7 3 5C5 4 7 4 9 5C9 2 7 0 4 1C4 0 5 -1 7 -1C5 -3 1 -3 0 0Z" fill="${c}" stroke="${INK}" stroke-width=".55"/>`;
  const stemX = barX + 3;
  for (let y = 12 + rnd() * 20; y < h - 16; y += 44 + rnd() * 40) {
    const reach = 24 + rnd() * 32, dir = outward;
    const r = 7 + rnd() * 8, cx = stemX + dir * (reach - r), cy = y + (rnd() - 0.5) * 12;
    const up = rnd() < 0.5 ? -1 : 1;
    vine += `<path d="M${stemX + dir * 3} ${y}C${stemX + dir * reach * 0.4} ${y + up * 10} ${cx - dir * r} ${cy + up * r * 1.2} ${cx} ${cy + up * r}" fill="none" stroke="${INK}" stroke-width=".9"/>`;
    vine += `<path d="${spiral(cx, cy, r, 1.35, -dir * up, up > 0 ? Math.PI / 2 : -Math.PI / 2)}" fill="none" stroke="${INK}" stroke-width=".8"/>`;
    const colours = [BLUE, RED, GOLD, '#3B6240', GOLD];
    leaves += leaf(cx, cy, rnd() * 360, colours[Math.floor(rnd() * colours.length)]);
    for (let k = 0; k < 2; k++) {
      const a = rnd() * Math.PI * 2, ox = cx + Math.cos(a) * (r + 4), oy = cy + Math.sin(a) * (r + 4);
      if (rnd() < 0.7) leaves += leaf(ox, oy, a * 57.3 + 90, colours[Math.floor(rnd() * colours.length)]);
      else dots += `<circle cx="${ox.toFixed(1)}" cy="${oy.toFixed(1)}" r="2" fill="${GOLD}" stroke="${INK}" stroke-width=".5"/><path d="M${ox.toFixed(1)} ${(oy - 2).toFixed(1)}l0 -3M${(ox + 2).toFixed(1)} ${oy.toFixed(1)}l3 0M${(ox - 2).toFixed(1)} ${oy.toFixed(1)}l-3 0M${ox.toFixed(1)} ${(oy + 2).toFixed(1)}l0 3" stroke="${INK}" stroke-width=".45"/>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${h}" viewBox="0 0 ${W} ${h}">${bar}${vine}${dots}${leaves}</svg>`;
}

const GHOST_LINES = [
  'the snail has been told where you live', 'do not read the last page', 'you again',
  'this leaf was written tomorrow', 'he who steals this book, let it be a relief', 'count the pages. then count them again',
  'the monk who drew this is still here', 'whoever owned this before you did not finish', 'it is not ink', 'there were more of us when this began',
  '{name} was here. {name} will not be leaving', 'turn back. no, not that way', 'the candle is the only reason it stays in the margin'
];

scene.define('grimoire', (S) => {
  const canvas = document.createElement('canvas');
  canvas.className = 'scene-canvas';
  S.back.append(canvas);
  const candle = document.createElement('div');
  candle.className = 'gm-candle';
  S.over.append(candle);
  let W = 0, H = 0, paper = '', cx = 0, cy = 0, tcx = 0, tcy = 0;
  let turning = null, drag = null, wheelTotal = 0, wheelTimer = 0;
  const wrap = $('pages');

  function geometry() {
    const bw = Math.min(W - 12, 1420);
    return { l: (W - bw) / 2, t: 5, r: (W + bw) / 2, b: H - 5 };
  }
  function paint() {
    W = innerWidth; H = innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    const g = geometry();
    // On a narrow screen there's one column, so no spine runs through the text
    paintShader(canvas, VELLUM, { res: [canvas.width, canvas.height], book: [g.l, g.t, g.r, g.b], spine: W < 760 ? -9999 : W / 2, dpr });
    if (paper) URL.revokeObjectURL(paper);
    paper = '';
    canvas.toBlob((blob) => { if (blob) paper = URL.createObjectURL(blob); }, 'image/jpeg', 0.92);
  }
  // Borders, bottom scenes and hidden writing belong to each page, so they turn with it
  function dress() {
    if (!settings.swipe) return;
    const name = settings.name.trim() || 'someone';
    [...wrap.children].forEach((page, i) => {
      if (page.querySelector(':scope > .gm-art')) return;
      const inner = page.querySelector('.page-inner');
      if (!inner) return;
      const board = page.querySelector('.board');
      const rect = board.getBoundingClientRect();
      const pageRect = page.getBoundingClientRect();
      const left = rect.left - pageRect.left, right = pageRect.right - rect.right;
      const art = document.createElement('div');
      art.className = 'gm-art';
      const h = Math.max(300, page.clientHeight);
      const rnd = seeded((i + 1) * 4261);
      const a = Math.floor(rnd() * scenes.length), b = (a + 1 + Math.floor(rnd() * (scenes.length - 1))) % scenes.length;
      const lines = [...GHOST_LINES].sort(() => rnd() - 0.5).slice(0, 4).map((l) => l.replace(/\{name\}/g, name));
      const halfL = W / 2 - 90;
      art.innerHTML =
        asImg(ivyBorder(h, i * 2 + 1, -1), 'gm-ivy', `left:${Math.max(0, left - 80)}px`) +
        asImg(ivyBorder(h, i * 2 + 2, 1), 'gm-ivy', `right:${Math.max(0, right - 80)}px`) +
        asImg(scenes[a](), 'gm-marg', `left:${Math.max(left, W * 0.25 - 110)}px`) +
        asImg(scenes[b](), 'gm-marg', `left:${W * 0.75 - 110}px;transform:scaleX(-1)`) +
        `<div class="gm-ghost">
          <p style="left:${left - 48}px;top:44%;transform:rotate(-90deg);transform-origin:0 50%">${esc(lines[0])}</p>
          <p style="right:${right - 48}px;top:30%;transform:rotate(90deg);transform-origin:100% 50%">${esc(lines[1])}</p>
          <p style="left:${Math.max(left + 30, halfL - 340)}px;bottom:62px;transform:rotate(-1.2deg)">${esc(lines[2])}</p>
          <p style="left:${W / 2 + 54}px;bottom:62px;transform:rotate(.8deg)">${esc(lines[3])}</p>
        </div>`;
      page.prepend(art);
    });
  }
  function showPage(i) {
    [...wrap.children].forEach((p, n) => p.classList.toggle('gm-on', n === i));
  }
  function setPage(i) {
    currentPage = i;
    store.set('sp.page', i);
    markCurrentTab();
    showPage(i);
    S.nudgeLayout();
  }

  // ---- The leaf
  const STRIPS = 9;
  function slice(page, x, y, w, h) {
    const box = document.createElement('div');
    box.className = 'gm-slice';
    box.style.cssText = `width:${w}px;height:${h}px;background:url(${paper}) ${-x}px ${-y}px / ${W}px ${H}px;`;
    const c = page.cloneNode(true);
    c.classList.add('gm-on', 'gm-clone');
    c.setAttribute('inert', '');
    c.removeAttribute('data-page');
    c.style.cssText = `position:absolute;left:${-x}px;top:0;width:${W}px;height:${h}px;visibility:visible;overflow:hidden;`;
    c.querySelector('.gm-ghost')?.remove();
    box.append(c);
    return box;
  }
  // Builds the moving parts for a forward turn: 'a' lifts away, 'b' is what's underneath
  function buildRig(a, b) {
    const rect = wrap.getBoundingClientRect();
    const h = rect.height, half = W / 2, sw = Math.ceil((geometry().r - half) / STRIPS);   // the leaf stops at the book's edge
    const rig = document.createElement('div');
    rig.className = 'gm-rig';
    const baseL = slice(a, 0, rect.top, half, h); baseL.style.position = 'absolute'; baseL.style.left = '0';
    const baseR = slice(b, half, rect.top, half, h); baseR.style.position = 'absolute'; baseR.style.left = half + 'px';
    const shadeL = document.createElement('i'), shadeR = document.createElement('i');
    shadeL.className = 'gm-under l'; shadeR.className = 'gm-under r';
    baseL.append(shadeL); baseR.append(shadeR);
    rig.append(baseL, baseR);
    const strips = [];
    let parent = rig;
    for (let i = 0; i < STRIPS; i++) {
      const s = document.createElement('div');
      s.className = 'gm-strip';
      s.style.cssText = `width:${sw}px;height:${h}px;left:${i === 0 ? half : sw}px;`;
      const front = slice(a, half + i * sw, rect.top, sw + 1, h);
      const backX = half - (i + 1) * sw;
      const back = slice(b, backX, rect.top, sw + 1, h);
      front.classList.add('front'); back.classList.add('back');
      const fs = document.createElement('i'), bs = document.createElement('i');
      fs.className = bs.className = 'gm-face-shade';
      front.append(fs); back.append(bs);
      s.append(front, back);
      parent.append(s);
      parent = s;
      strips.push({ el: s, fs, bs });
    }
    wrap.append(rig);
    return { rig, strips, shadeL, shadeR };
  }
  // p runs 0 (flat on the right) to 1 (flat on the left). The tip leads and the page bows.
  function pose(r, p) {
    const ease = (x) => x * x * (3 - 2 * x);
    const tip = ease(Math.min(1, p * 1.16)) * 180;
    const root = ease(Math.max(0, p * 1.14 - 0.14)) * 180;
    let prev = 0;
    r.strips.forEach((s, i) => {
      const k = i / (STRIPS - 1);
      const phi = root + (tip - root) * Math.pow(k, 0.85);
      s.el.style.transform = `rotateY(${(-(phi - prev)).toFixed(2)}deg)`;
      prev = phi;
      const shade = Math.sin(phi * Math.PI / 180);
      s.fs.style.opacity = (shade * 0.55).toFixed(3);
      s.bs.style.opacity = (0.08 + shade * 0.38).toFixed(3);
    });
    const lift = Math.sin(p * Math.PI);
    r.shadeL.style.opacity = (p > 0.5 ? lift * 0.75 : 0).toFixed(3);
    r.shadeR.style.opacity = (p < 0.92 ? (1 - p) * 0.2 + lift * 0.7 : 0).toFixed(3);
  }
  function startTurn(from, to) {
    const pagesEls = wrap.children;
    const forward = to > from;
    const a = forward ? pagesEls[from] : pagesEls[to];
    const b = forward ? pagesEls[to] : pagesEls[from];
    if (!a || !b) return null;
    [...pagesEls].forEach((p) => p.classList.remove('gm-on'));
    const r = buildRig(a, b);
    return { r, forward, from, to, p: forward ? 0 : 1 };
  }
  function finishTurn(tr, landed) {
    tr.r.rig.remove();
    turning = null;
    setPage(landed);
  }
  function animateTurn(tr, target, ms) {
    turning = tr;
    const begin = performance.now(), start = tr.p;
    const run = (t) => {
      const k = Math.min(1, (t - begin) / ms);
      tr.p = start + (target - start) * (1 - Math.pow(1 - k, 2.2));
      pose(tr.r, tr.p);
      if (k < 1) requestAnimationFrame(run);
      else finishTurn(tr, (target === 1) === tr.forward ? tr.to : tr.from);
    };
    requestAnimationFrame(run);
  }

  // ---- Grabbing the page: by the outer margin, or with a sideways swipe on a trackpad
  function beginInteractive(dir) {
    if (turning || drag) return null;
    const to = currentPage + dir;
    if (to < 0 || to >= pages.length) return null;
    const tr = startTurn(currentPage, to);
    if (tr) turning = tr;
    return tr;
  }
  function onWheel(e) {
    if (!settings.swipe || arranging || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    if (!drag && !turning && Math.abs(e.deltaX) > 3) {
      const tr = beginInteractive(e.deltaX > 0 ? 1 : -1);
      if (tr) { drag = { tr, wheel: true }; wheelTotal = 0; }
    }
    if (!drag?.wheel) return;
    wheelTotal += e.deltaX;
    const amt = Math.min(1, Math.abs(wheelTotal) / (W * 0.45));
    drag.tr.p = drag.tr.forward ? amt : 1 - amt;
    pose(drag.tr.r, drag.tr.p);
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(releaseDrag, 90);
  }
  function releaseDrag() {
    if (!drag) return;
    const { tr } = drag;
    drag = null;
    const amt = tr.forward ? tr.p : 1 - tr.p;
    const commit = amt > 0.3;
    animateTurn(tr, tr.forward ? (commit ? 1 : 0) : (commit ? 0 : 1), 420);
  }
  function onDown(e) {
    if (!settings.swipe || arranging || e.button || turning) return;
    if (e.target.closest('.widget, button, a, input, select, textarea, dialog, .topbar')) return;
    if (!e.target.closest('.pages')) return;
    const fromRight = e.clientX > W / 2;
    const tr = beginInteractive(fromRight ? 1 : -1);
    if (!tr) return;
    drag = { tr, startX: e.clientX, fromRight };
    const move = (ev) => {
      if (!drag) return;
      const amt = Math.max(0, Math.min(1, (drag.fromRight ? drag.startX - ev.clientX : ev.clientX - drag.startX) / (W * 0.72)));
      tr.p = tr.forward ? amt : 1 - amt;
      pose(tr.r, tr.p);
    };
    const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); releaseDrag(); };
    addEventListener('pointermove', move); addEventListener('pointerup', up); addEventListener('pointercancel', up);
  }
  addEventListener('wheel', onWheel, { passive: true });
  addEventListener('pointerdown', onDown);

  paint();
  tcx = cx = W * 0.56; tcy = cy = H * 0.34;
  return {
    fps: 24,
    resize() { paint(); [...wrap.querySelectorAll('.gm-art')].forEach((a) => a.remove()); dress(); },
    moved() { dress(); },
    frame(t, dt) {
      const P = S.pointer;
      if (P.seen && t - P.at < 20000) { tcx = P.x; tcy = P.y; }
      else { tcx = W * 0.5 + Math.sin(t / 7000) * W * 0.22; tcy = H * 0.42 + Math.sin(t / 5100) * H * 0.2; }
      const ease = dt ? Math.min(1, dt * 5) : 1;
      cx += (tcx - cx) * ease; cy += (tcy - cy) * ease;
      // A flame never holds still: two slow wanders and a quick shiver
      const n = Math.sin(t / 137) * 0.5 + Math.sin(t / 89 + 1.3) * 0.3 + Math.sin(t / 41 + 0.7) * 0.2;
      const r = 430 + n * 20, fx = cx + Math.sin(t / 211) * 4, fy = cy - 12 + Math.sin(t / 173) * 3;
      candle.style.setProperty('--cx', `${fx.toFixed(1)}px`);
      candle.style.setProperty('--cy', `${fy.toFixed(1)}px`);
      candle.style.setProperty('--r', `${r.toFixed(1)}px`);
      const ghost = wrap.children[currentPage]?.querySelector('.gm-ghost');
      if (ghost) { ghost.style.setProperty('--cx', `${fx.toFixed(1)}px`); ghost.style.setProperty('--cy', `${(fy - wrap.getBoundingClientRect().top).toFixed(1)}px`); }
    },
    decorate(item, body) {
      if (item.type === 'clock') body.querySelector('.greet')?.classList.add('gm-write');
    },
    turn(from, to, smooth) {
      if (!settings.swipe) return false;
      if (turning) return true;
      dress();
      if (!smooth || from === to || S.still || !paper || !wrap.children[to]) { setPage(to); return true; }
      const tr = startTurn(from, to);
      if (!tr) { setPage(to); return true; }
      currentPage = to; store.set('sp.page', to); markCurrentTab();
      animateTurn(tr, tr.forward ? 1 : 0, 1050);
      return true;
    },
    unmount() {
      removeEventListener('wheel', onWheel);
      removeEventListener('pointerdown', onDown);
      wrap.querySelectorAll('.gm-rig, .gm-art').forEach((n) => n.remove());
      [...wrap.children].forEach((p) => p.classList.remove('gm-on'));
      if (paper) URL.revokeObjectURL(paper);
    }
  };
});
