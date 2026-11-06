'use strict';
// ---------- Theme ----------
// Theme sets change type, widget shapes and the background, not just colours
const SETS = {
  space:    { name: 'Deep space', accent: 'teal' },
  nebula:   { name: 'Nebula', accent: 'violet' },
  aurora:   { name: 'Aurora', accent: 'green' },
  lunar:    { name: 'Lunar', accent: 'silver' },
  paper:    { name: 'Paper', accent: 'cobalt', bg: 'none' },
  fractal:  { name: 'Fractal', accent: 'violet', bg: 'fractal' },
  phosphor: { name: 'Phosphor', accent: 'amber', bg: 'none' },
  ashfall:  { name: 'Ashfall', accent: 'ember', bg: 'ash' },
  tiedye:   { name: 'Tie-dye', accent: 'violet', bg: 'tiedye' },
  orrery:   { name: 'The Orrery', accent: 'amber', bg: 'scene' },
  grimoire: { name: 'The Grimoire', accent: 'rose', bg: 'scene' },
  spirit:   { name: 'The Spirit Board', accent: 'amber', bg: 'scene' },
  remaining: { name: 'Remaining', accent: 'silver', bg: 'scene' }
};
// What each art theme needs from you, shown under the theme picker
const SET_HINTS = {
  orrery: 'Every planet is where it really is today. Hold a blank part of the page to crank it through time, and let go to come back. Point at a planet to see how far out it is.',
  grimoire: 'Your cursor is a candle, so look in the margins. Drag a blank part of the page to turn it.',
  spirit: 'Make the Clock Large and it becomes the board. Click the greeting for another.',
  remaining: 'Hover a square to see which week it is. The more widgets on a page, the smaller your weeks get.'
};
const rgbList = (s) => s.split(',').map((v) => Number(v) / 255);
function applyTheme(animate) {
  const root = document.documentElement;
  if (!SETS[settings.set]) settings.set = 'space';
  loadSetFonts(settings.set);
  const theme = pickTheme(settings, wxData());
  root.dataset.accent = settings.accent;
  root.dataset.set = settings.set;
  if (root.dataset.theme !== theme) {
    if (animate) { root.classList.add('theming'); setTimeout(() => root.classList.remove('theming'), 700); }
    root.dataset.theme = theme;
  }
  const cs = getComputedStyle(root);
  const accent = cs.getPropertyValue('--accent-rgb').trim(), now = cs.getPropertyValue('--now-rgb').trim();
  sky.setPalette({
    ink: cs.getPropertyValue('--ink-rgb').trim(), accent, now,
    alpha: parseFloat(cs.getPropertyValue('--dust-alpha')) || 1
  });
  const bg = SETS[settings.set].bg || 'dust';
  // The art themes run their own scene in place of the shared backgrounds
  scene.set(bg === 'scene' ? settings.set : null, settings.dust);
  sizeRows();
  const light = theme === 'light';
  const shader = bg === 'fractal' || bg === 'tiedye';
  const BACKS = { fractal: [[0.957, 0.949, 0.98], [0.016, 0.012, 0.04]], tiedye: [[0.965, 0.933, 0.875], [0.04, 0.027, 0.063]] };
  const drawn = shader && fx.set(true, settings.dust, {
    a: rgbList(accent), b: rgbList(now), light: light ? 1 : 0, bg: BACKS[bg][light ? 0 : 1]
  }, bg);
  if (!shader) fx.set(false);
  sky.setStyle(bg === 'ash' ? 'ash' : 'dust');
  sky.setEnabled(bg !== 'scene' && settings.dust && (bg === 'dust' || bg === 'ash' || (shader && !drawn)));
}
matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => applyTheme(true));

// ---------- Time formatting ----------
function fmtTime(ms, timeZone) {
  return new Date(ms).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: !settings.use24, timeZone }).toLowerCase();
}
function hourLabel(ms, timeZone) {
  const s = new Date(ms).toLocaleTimeString(undefined, { hour: 'numeric', hour12: !settings.use24, timeZone });
  return s.replace(/\s?([ap])\.?m\.?/i, (m, p) => p.toLowerCase());
}
// ---------- Weather (Open-Meteo, no key needed) ----------
const SKY_WORDS = {
  0: 'clear', 1: 'mostly clear', 2: 'partly cloudy', 3: 'overcast', 45: 'foggy', 48: 'foggy',
  51: 'drizzling', 53: 'drizzling', 55: 'drizzling', 56: 'freezing drizzle', 57: 'freezing drizzle',
  61: 'light rain', 63: 'raining', 65: 'heavy rain', 66: 'freezing rain', 67: 'freezing rain',
  71: 'light snow', 73: 'snowing', 75: 'heavy snow', 77: 'snow grains',
  80: 'rain showers', 81: 'rain showers', 82: 'heavy showers', 85: 'snow showers', 86: 'snow showers',
  95: 'thunderstorms', 96: 'thunderstorms with hail', 99: 'thunderstorms with hail'
};
const skyWords = (code) => SKY_WORDS[code] ?? 'mixed skies';

const CLOUD = 'M6.5 18h11a3.5 3.5 0 0 0 .4-6.98 5.5 5.5 0 0 0-10.6-1.27A4.13 4.13 0 0 0 6.5 18z';
const CLOUD_HIGH = 'M6.5 15h11a3.5 3.5 0 0 0 .4-6.98 5.5 5.5 0 0 0-10.6-1.27A4.13 4.13 0 0 0 6.5 15z';
const WX_GLYPHS = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  moon: '<path d="M19.5 14.2A7.5 7.5 0 0 1 9.8 4.5a7.5 7.5 0 1 0 9.7 9.7z"/>',
  partlyDay: '<path d="M8 2.5v1.3M2.5 8h1.3M4.1 4.1l.9.9M11.9 4.1l-.9.9M4.6 11.2A3.6 3.6 0 0 1 11.4 6.7"/><path d="M9 20h8.5a3 3 0 0 0 .3-5.98 4.5 4.5 0 0 0-8.6-1A3.5 3.5 0 0 0 9 20z"/>',
  partlyNight: '<path d="M11 4.3A4.5 4.5 0 0 0 5 10.5"/><path d="M9 20h8.5a3 3 0 0 0 .3-5.98 4.5 4.5 0 0 0-8.6-1A3.5 3.5 0 0 0 9 20z"/>',
  cloud: `<path d="${CLOUD}"/>`,
  fog: '<path d="M4 8h16M6 12h12M4 16h16M8 20h8"/>',
  rain: `<path d="${CLOUD_HIGH}"/><path d="M8.5 18l-1 2.5M12.5 18l-1 2.5M16.5 18l-1 2.5"/>`,
  snow: `<path d="${CLOUD_HIGH}"/><path d="M8 18.5h.01M12 18.5h.01M16 18.5h.01M10 21.5h.01M14 21.5h.01" stroke-width="2.4"/>`,
  storm: `<path d="${CLOUD_HIGH}"/><path d="M12.5 15.5l-2 3.5h3l-2 3.5"/>`
};
function wxIcon(code, day = 1) {
  let k = 'cloud';
  if (code <= 1) k = day ? 'sun' : 'moon';
  else if (code === 2) k = day ? 'partlyDay' : 'partlyNight';
  else if (code === 45 || code === 48) k = 'fog';
  else if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) k = 'rain';
  else if ((code >= 71 && code <= 77) || code === 85 || code === 86) k = 'snow';
  else if (code >= 95) k = 'storm';
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${WX_GLYPHS[k]}</svg>`;
}

let wx = store.get('sp.wx', null);   // { key, at, data }, kept so a new tab shows weather right away
let wxError = '';
const locKey = () => `${(+settings.location.lat).toFixed(3)},${(+settings.location.lon).toFixed(3)},${settings.units}`;
const wxData = () => (wx && wx.key === locKey() ? wx.data : null);

async function loadWeather(force) {
  if (!force && wxData() && Date.now() - wx.at < 15 * 60e3) return;
  const { lat, lon } = settings.location;
  const metric = settings.units === 'c';
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
    + '&current=temperature_2m,apparent_temperature,weather_code,is_day'
    + '&hourly=temperature_2m,precipitation_probability,weather_code,is_day'
    + '&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max'
    + `&temperature_unit=${metric ? 'celsius' : 'fahrenheit'}`
    + '&timezone=auto&timeformat=unixtime&forecast_days=7';
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    wx = { key: locKey(), at: Date.now(), data: await res.json() };
    store.set('sp.wx', wx);
    wxError = '';
  } catch {
    wxError = 'The forecast isn’t loading. It will try again in a few minutes.';
  }
  refresh('weather'); refresh('sky'); tick(); applyTheme(true); syncScheduleHint();
}

function wxLine() {
  const d = wxData();
  if (!d) return '';
  const hi = Math.round(d.daily.temperature_2m_max[0]), lo = Math.round(d.daily.temperature_2m_min[0]);
  return `${Math.round(d.current.temperature_2m)}° and ${skyWords(d.current.weather_code)} in ${shortPlace()}. High ${hi}°, low ${lo}°.`;
}

// ---------- Moon ----------
const SYNODIC = 29.530588853;                         // days from one new moon to the next
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);  // a new moon used as the starting point
function moonPhase(now = new Date()) {
  const days = (now - KNOWN_NEW_MOON) / 864e5;
  return ((days % SYNODIC) + SYNODIC) % SYNODIC / SYNODIC;   // 0 new, 0.5 full, back to 1
}
function moonName(p) {
  if (p < 0.03 || p > 0.97) return 'New moon';
  if (p < 0.22) return 'Waxing crescent';
  if (p < 0.28) return 'First quarter';
  if (p < 0.47) return 'Waxing gibbous';
  if (p < 0.53) return 'Full moon';
  if (p < 0.72) return 'Waning gibbous';
  if (p < 0.78) return 'Last quarter';
  return 'Waning crescent';
}
// The lit part: an outer half circle plus the curved shadow line (terminator)
function moonPath(p, r = 30) {
  const k = Math.cos(2 * Math.PI * p);      // 1 at new moon, -1 at full
  const rx = Math.abs(k) * r;
  const waxing = p < 0.5;
  const outer = waxing ? 1 : 0;
  const term = waxing ? (k > 0 ? 0 : 1) : (k > 0 ? 1 : 0);
  return `M0 ${-r} A${r} ${r} 0 0 ${outer} 0 ${r} A${rx} ${r} 0 0 ${term} 0 ${-r}Z`;
}

// ---------- Sites ----------
const DEFAULT_SITES = {
  active: 'ai',
  groups: [
    { id: 'ai', name: 'AI', sites: [
      { id: uid(), name: 'ChatGPT', url: 'https://chatgpt.com' },
      { id: uid(), name: 'Claude', url: 'https://claude.ai' },
      { id: uid(), name: 'Gemini', url: 'https://gemini.google.com' },
      { id: uid(), name: 'Codex', url: 'https://chatgpt.com/codex' },
      { id: uid(), name: 'T3 Chat', url: 'https://t3.chat' },
      { id: uid(), name: 'NotebookLM', url: 'https://notebooklm.google.com' }
    ]},
    { id: 'daily', name: 'Daily', sites: [
      { id: uid(), name: 'YouTube', url: 'https://www.youtube.com' },
      { id: uid(), name: 'Gmail', url: 'https://mail.google.com' },
      { id: uid(), name: 'Calendar', url: 'https://calendar.google.com' },
      { id: uid(), name: 'Drive', url: 'https://drive.google.com' },
      { id: uid(), name: 'Notion', url: 'https://www.notion.so' },
      { id: uid(), name: 'Reddit', url: 'https://www.reddit.com' }
    ]},
    { id: 'make', name: 'Make', sites: [
      { id: uid(), name: 'GitHub', url: 'https://github.com' },
      { id: uid(), name: 'MDN', url: 'https://developer.mozilla.org' },
      { id: uid(), name: 'Sketchfab', url: 'https://sketchfab.com' },
      { id: uid(), name: 'Blender', url: 'https://extensions.blender.org' },
      { id: uid(), name: 'Muse', url: 'https://muse.ai' }
    ]}
  ]
};
const sitesEditing = new Set();   // ids of Sites widgets in edit mode
let siteCtx = null;               // { item, siteId } while the site dialog is open
function normalizeUrl(raw) {
  let s = raw.trim();
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  try { const u = new URL(s); return u.hostname.includes('.') ? u.href.replace(/\/$/, '') : null; }
  catch { return null; }
}
function favicon(url) {
  try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`; }
  catch { return ''; }
}
// ---------- Tasks, notes and focus timer state ----------
let tasks = store.get('sp.tasks', []);
const saveTasks = () => store.set('sp.tasks', tasks);
const FOCUS_MIN = { focus: 25, break: 5 };
let focus = store.get('sp.focus', { mode: 'focus', endsAt: null, left: 25 * 60e3 });
const saveFocus = () => store.set('sp.focus', focus);
const focusLeft = () => (focus.endsAt ? Math.max(0, focus.endsAt - Date.now()) : focus.left);
const mmss = (ms) => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${pad(s % 60)}`; };
let shownMonth = new Date(); shownMonth.setDate(1);

// ---------- Projects, with activity from GitHub's public API (no sign-in) ----------
const DEFAULT_PROJECTS = [
  { id: uid(), name: 'Start page', next: 'Try the new theme sets', status: 'active', progress: '', repo: 'start-page', link: '' },
  { id: uid(), name: 'JS and TS course', next: 'Pick up at the next topic', status: 'active', progress: '', repo: '', link: '' },
  { id: uid(), name: 'Fragrance app', next: 'Choose the model that writes listings', status: 'idea', progress: '', repo: '', link: '' },
  { id: uid(), name: 'Tesla Roadster model', next: '', status: 'active', progress: '', repo: '', link: '' },
  { id: uid(), name: 'Vault and MCP server', next: '', status: 'active', progress: '', repo: 'vault', link: '' },
  { id: uid(), name: 'Windhawk mods', next: '', status: 'active', progress: '', repo: 'windhawk-mods', link: '' }
];
const STATUS = {
  active: { label: 'Active', c: 'var(--accent)' },
  paused: { label: 'Paused', c: 'var(--faint)' },
  idea:   { label: 'Idea', c: 'var(--now)' },
  done:   { label: 'Done', c: 'var(--dim)' }
};
let projects = store.get('sp.projects', null) || structuredClone(DEFAULT_PROJECTS);
let projEditing = false, editingProjId = null;
const saveProjects = () => store.set('sp.projects', projects);

let gh = store.get('sp.gh', null);   // { user, at, repos: { name: { pushed, url } }, days: [30 commit counts] }
let ghError = '';
const ghData = () => (gh && gh.user === settings.github.trim() ? gh : null);
function ago(iso) {
  const m = Math.round((Date.now() - new Date(iso)) / 60000);
  if (m < 60) return `${Math.max(1, m)} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d < 30 ? `${d}d ago` : new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
async function loadGitHub(force) {
  const user = settings.github.trim();
  if (!isOn('projects') || document.hidden || !user) return;
  if (!force && ghData() && Date.now() - gh.at < 10 * 60e3) return;
  try {
    const base = `https://api.github.com/users/${encodeURIComponent(user)}`;
    const [reposRes, eventsRes] = await Promise.all([fetch(`${base}/repos?sort=pushed&per_page=100`), fetch(`${base}/events/public?per_page=100`)]);
    if (reposRes.status === 404) throw new Error('user');
    if (!reposRes.ok) throw new Error(reposRes.status === 403 || reposRes.status === 429 ? 'limit' : 'network');
    const repos = {};
    for (const r of await reposRes.json()) repos[r.name.toLowerCase()] = { pushed: r.pushed_at, url: r.html_url };
    // Commits per day for the last 30 days, from public push events
    const days = new Array(30).fill(0);
    if (eventsRes.ok) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      for (const ev of await eventsRes.json()) {
        if (ev.type !== 'PushEvent') continue;
        const day = new Date(ev.created_at); day.setHours(0, 0, 0, 0);
        const i = 29 - Math.round((today - day) / 864e5);
        if (i >= 0 && i < 30) days[i] += ev.payload?.size || ev.payload?.commits?.length || 1;
      }
    }
    gh = { user, at: Date.now(), repos, days };
    store.set('sp.gh', gh);
    ghError = '';
  } catch (e) {
    ghError = e.message === 'user' ? `GitHub has no user named “${user}”. Check the name in Settings.`
      : e.message === 'limit' ? 'GitHub limits how often this refreshes. It will try again in a few minutes.'
      : 'GitHub isn’t responding. Repository details will come back when it does.';
  }
  refresh('projects');
}

// ---------- Widgets ----------
const SIZES = { s: 'Small', m: 'Medium', l: 'Large', w: 'Wide' };
const WIDGETS = {
  clock:    { name: 'Clock', blurb: 'Time, date, greeting and a weather line', sizes: ['s', 'm', 'l', 'w'], bare: true, render: renderClock },
  search:   { name: 'Search', blurb: 'Google, DuckDuckGo, ChatGPT or Claude', sizes: ['m', 'w'], render: renderSearch },
  weather:  { name: 'Weather', blurb: 'Now, the next hours and the week ahead', sizes: ['s', 'm', 'l', 'w'], render: renderWeather },
  sky:      { name: 'Sky', blurb: 'Moon phase, sunrise, sunset and daylight left', sizes: ['s', 'm', 'l'], render: renderSky },
  sites:    { name: 'Sites', blurb: 'Your links, in groups', sizes: ['m', 'l', 'w'], render: renderSites, multi: true },
  projects: { name: 'Projects', blurb: 'What you’re building, with GitHub activity', sizes: ['m', 'l', 'w'], render: renderProjects },
  calendar: { name: 'Calendar', blurb: 'Today, or the whole month', sizes: ['s', 'l'], render: renderCalendar },
  notes:    { name: 'Quick note', blurb: 'A scratchpad that saves as you type', sizes: ['s', 'm', 'l'], render: renderNotes, multi: true },
  tasks:    { name: 'Tasks', blurb: 'A short to-do list', sizes: ['s', 'm', 'l'], render: renderTasks },
  focus:    { name: 'Focus timer', blurb: '25 minutes on, 5 off, with no sound', sizes: ['s', 'm'], render: renderFocus }
};
const mounted = {};   // widget id -> { el, body }

function renderClock(b, size) {
  b.innerHTML = `<div class="clock clock-${size}">
    <button class="time" type="button" title="Switch between 12 and 24 hour"><span data-b="hm">--:--</span><span class="sub"><span class="sec" data-b="sec"></span><span data-b="ampm"></span></span></button>
    <div class="clock-meta"><p class="greet" data-b="greet" title="Click for another"></p><p class="date" data-b="date"></p><p class="wxline" data-b="wxline"></p></div>
  </div>`;
  b.querySelector('.time').addEventListener('click', () => {
    settings.use24 = !settings.use24;
    saveSettings(); syncSettingsForm(); tick();
    refresh('weather'); refresh('sky');
  });
  b.querySelector('.greet').addEventListener('click', nextGreeting);
  tick();
}

const ENGINES = {
  google:     { label: 'Google', url: 'https://www.google.com/search?q=', hint: 'Search the web' },
  // Gemini has no official way to pre-fill a question from the address, so the question is copied for pasting
  gemini:     { label: 'Gemini', url: 'https://gemini.google.com/app', hint: 'Ask Gemini (your question is copied, paste with Ctrl+V)', copy: true },
  duckduckgo: { label: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=', hint: 'Search privately with DuckDuckGo' },
  chatgpt:    { label: 'ChatGPT', url: 'https://chatgpt.com/?q=', hint: 'Ask ChatGPT' },
  claude:     { label: 'Claude', url: 'https://claude.ai/new?q=', hint: 'Ask Claude' }
};
// The Phosphor theme shows search as a shell prompt, like josh@lansdowne:~$
const promptText = () => `${(settings.name.trim() || 'you').toLowerCase().replace(/\s+/g, '')}@${shortPlace().toLowerCase().replace(/\s+/g, '-')}:~$`;
function renderSearch(b) {
  if (!ENGINES[settings.engine]) settings.engine = 'google';
  b.innerHTML = `<form class="search" role="search">
    <div class="engines">${Object.entries(ENGINES).map(([k, e]) => `<button type="button" data-engine="${k}" aria-pressed="${k === settings.engine}">${e.label}</button>`).join('')}</div>
    <label class="field-search">${ico('search')}<span class="prompt">${esc(promptText())}</span><input type="search" name="q" autocomplete="off" aria-label="Search" placeholder="${ENGINES[settings.engine].hint}"><kbd title="Press / anywhere to search">/</kbd></label>
  </form>`;
  const form = b.querySelector('form');
  const input = form.querySelector('input');
  form.querySelector('.engines').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    settings.engine = btn.dataset.engine;
    saveSettings();
    form.querySelectorAll('.engines button').forEach((x) => x.setAttribute('aria-pressed', String(x === btn)));
    input.placeholder = ENGINES[settings.engine].hint;
    input.focus();
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    const engine = ENGINES[settings.engine];
    if (engine.copy) {
      copyText(q);
      location.href = engine.url;
    } else {
      location.href = engine.url + encodeURIComponent(q);
    }
  });
}

function renderWeather(b, size) {
  const d = wxData();
  const head = `<div class="w-head"><h2>${esc(shortPlace())}</h2>${d && size !== 's' ? `<span class="w-meta">Feels like ${Math.round(d.current.apparent_temperature)}°</span>` : ''}</div>`;
  if (!d) { b.innerHTML = head + `<p class="note">${esc(wxError || 'Loading the forecast…')}</p>`; return; }
  const c = d.current, tz = d.timezone;
  const hi = Math.round(d.daily.temperature_2m_max[0]), lo = Math.round(d.daily.temperature_2m_min[0]);
  const now = `<div class="wx-now"><span class="wx-icon">${wxIcon(c.weather_code, c.is_day)}</span>
    <span class="wx-temp">${Math.round(c.temperature_2m)}°</span>
    <span class="wx-desc"><strong>${cap(skyWords(c.weather_code))}</strong><span>High ${hi}°, low ${lo}°</span></span></div>`;

  let hours = '';
  if (size !== 's') {
    const start = d.hourly.time.findIndex((t) => t * 1000 > Date.now() - 3600e3);
    const items = [];
    for (let i = start; i >= 0 && i < start + 12 && i < d.hourly.time.length; i++) {
      const rain = d.hourly.precipitation_probability[i];
      items.push(`<li title="${rain >= 20 ? rain + '% chance of rain' : ''}"><span class="h">${i === start ? 'Now' : hourLabel(d.hourly.time[i] * 1000, tz)}</span>${wxIcon(d.hourly.weather_code[i], d.hourly.is_day[i])}<span class="t">${Math.round(d.hourly.temperature_2m[i])}°</span><span class="r">${rain >= 20 ? rain + '%' : ''}</span></li>`);
    }
    hours = `<ol class="hours" aria-label="Next hours">${items.join('')}</ol>`;
  }

  let days = '';
  if (size === 'l') {
    const n = 5;
    const lows = d.daily.temperature_2m_min.slice(0, n), highs = d.daily.temperature_2m_max.slice(0, n);
    const min = Math.min(...lows), max = Math.max(...highs), span = Math.max(1, max - min);
    days = '<ol class="days-list" aria-label="Next five days">' + lows.map((l, i) => {
      const h = highs[i];
      const name = i === 0 ? 'Today' : new Date(d.daily.time[i] * 1000).toLocaleDateString(undefined, { weekday: 'short', timeZone: tz });
      const rain = d.daily.precipitation_probability_max[i];
      return `<li><span>${name}</span>${wxIcon(d.daily.weather_code[i])}<span class="lo">${Math.round(l)}°</span>
        <span class="range"><i style="left:${((l - min) / span) * 100}%;width:${Math.max(4, ((h - l) / span) * 100)}%"></i></span>
        <span>${Math.round(h)}°</span><span class="rain">${rain >= 30 ? rain + '%' : ''}</span></li>`;
    }).join('') + '</ol>';
  }
  b.innerHTML = `${head}<div class="wx-${size}" style="display:contents"><div class="wx-main">${now}${hours}</div>${days}</div>`;
}

function dayArc(d) {
  const tz = d.timezone, now = Date.now();
  const rise = d.daily.sunrise[0] * 1000, set = d.daily.sunset[0] * 1000;
  const f = Math.min(1, Math.max(0, (now - rise) / (set - rise)));
  const up = now >= rise && now < set;
  // The sun travels a half ellipse from sunrise (left) to sunset (right)
  const th = Math.PI * (1 - f);
  const x = (150 + 120 * Math.cos(th)).toFixed(1), y = (96 - 76 * Math.sin(th)).toFixed(1);
  const caption = up
    ? `${dur(set - now)} of daylight left`
    : `Sunrise in ${dur((now < rise ? rise : d.daily.sunrise[1] * 1000) - now)}`;
  const arc = 'M30 96 A120 76 0 0 1 270 96';
  return `<figure class="arc-wrap"><svg class="arc" viewBox="0 0 300 118" role="img" aria-label="${caption}">
    <line class="horizon" x1="6" y1="96" x2="294" y2="96"/>
    <path class="track" d="${arc}" pathLength="1"/>
    <path class="done" d="${arc}" pathLength="1" stroke-dasharray="${f.toFixed(4)} 1"/>
    ${up ? `<circle class="sun-glow" cx="${x}" cy="${y}" r="13"/><circle class="sun-dot" cx="${x}" cy="${y}" r="5.5"/>` : ''}
    <text x="30" y="113" text-anchor="middle">${fmtTime(rise, tz)}</text>
    <text x="270" y="113" text-anchor="middle">${fmtTime(set, tz)}</text>
    <text class="cap" x="150" y="78" text-anchor="middle">${caption}</text>
  </svg></figure>`;
}

function renderSky(b, size) {
  const now = new Date(), p = moonPhase(now);
  const lit = Math.round(((1 - Math.cos(2 * Math.PI * p)) / 2) * 100);
  const toFull = ((0.5 - p + 1) % 1) * SYNODIC;
  const next = toFull < 1 || toFull > SYNODIC - 1
    ? 'Full moon tonight'
    : `Full on ${new Date(now.getTime() + toFull * 864e5).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  const h = now.getHours();
  const moon = `<div class="sky-top"><svg class="moon" viewBox="-32 -32 64 64" aria-hidden="true"><circle r="30" class="moon-dark"/><path class="moon-lit" d="${moonPath(p)}"/></svg>
    <div class="moon-text"><strong>${moonName(p)}</strong><span>${lit}% lit</span><span>${next}</span></div></div>`;
  const d = wxData();
  let sun = '', arc = '';
  if (d && size !== 's') {
    const rise = d.daily.sunrise[0] * 1000, set = d.daily.sunset[0] * 1000;
    const mins = Math.round((set - rise) / 60000);
    sun = `<dl class="sun"><div><dt>Sunrise</dt><dd>${fmtTime(rise, d.timezone)}</dd></div><div><dt>Sunset</dt><dd>${fmtTime(set, d.timezone)}</dd></div><div><dt>Daylight</dt><dd>${Math.floor(mins / 60)}h ${mins % 60}m</dd></div></dl>`;
    if (size === 'l') arc = dayArc(d);
  }
  b.innerHTML = `<div class="w-head"><h2>${h >= 17 || h < 5 ? 'Tonight’s sky' : 'Today’s sky'}</h2></div>
    <div class="sky-row sky-${size}">${moon}${sun}</div>${arc}`;
}

// The Sites data lives on the widget, so several Sites widgets can each have their own groups
function sitesOf(item) {
  if (!item.cfg.sites) { const id = uid(); item.cfg.sites = { active: id, groups: [{ id, name: 'Links', sites: [] }] }; }
  return item.cfg.sites;
}
function renderSites(b, size, item) {
  const data = sitesOf(item);
  const group = data.groups.find((g) => g.id === data.active) || data.groups[0];
  const editing = sitesEditing.has(item.id);
  const changed = () => { savePages(); refresh(item.id); };
  b.innerHTML = `<div class="w-head">${item.cfg.title ? `<h2 class="site-title">${esc(item.cfg.title)}</h2>` : ''}<div class="tabs" role="tablist" aria-label="Site groups"></div><div class="act"></div></div><ul class="tiles${editing ? ' editing' : ''}"></ul>`;
  const tabs = b.querySelector('.tabs'), act = b.querySelector('.act'), grid = b.querySelector('.tiles');

  for (const g of data.groups) {
    const t = document.createElement('button');
    t.type = 'button'; t.className = 'tab'; t.setAttribute('role', 'tab'); t.textContent = g.name; t.draggable = true;
    t.title = 'Double-click to rename. Drag to reorder.';
    t.setAttribute('aria-selected', String(g.id === group.id));
    t.addEventListener('click', () => { data.active = g.id; changed(); });
    t.addEventListener('dblclick', () => editGroup(item, g));
    t.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', 'group:' + g.id));
    t.addEventListener('dragover', (e) => { e.preventDefault(); t.classList.add('drop'); });
    t.addEventListener('dragleave', () => t.classList.remove('drop'));
    t.addEventListener('drop', (e) => {
      e.preventDefault(); t.classList.remove('drop');
      const dragged = e.dataTransfer.getData('text/plain');
      if (dragged.startsWith('group:')) {
        const from = data.groups.findIndex((x) => x.id === dragged.slice(6)), to = data.groups.indexOf(g);
        if (from >= 0 && from !== to) { const [moved] = data.groups.splice(from, 1); data.groups.splice(to, 0, moved); changed(); }
      } else {
        const owner = data.groups.find((x) => x.sites.some((s) => s.id === dragged));
        if (owner && owner !== g) { const site = owner.sites.find((s) => s.id === dragged); owner.sites = owner.sites.filter((s) => s !== site); g.sites.push(site); changed(); }
      }
    });
    tabs.append(t);
    if (g.id === group.id) {
      const pen = document.createElement('button');
      pen.type = 'button'; pen.className = 'tab-tool'; pen.innerHTML = ico('pencil');
      pen.title = 'Rename or delete this group'; pen.setAttribute('aria-label', `Rename or delete ${g.name}`);
      pen.addEventListener('click', () => editGroup(item, g));
      tabs.append(pen);
    }
  }
  const addGroup = document.createElement('button');
  addGroup.type = 'button'; addGroup.className = 'tab-tool tab-add'; addGroup.innerHTML = ico('plus') + '<span>Group</span>';
  addGroup.title = 'Add a group'; addGroup.setAttribute('aria-label', 'Add a group');
  addGroup.addEventListener('click', async () => {
    const name = await ask({ title: 'New group', label: 'Group name', ok: 'Create group' });
    if (!name) return;
    const g = { id: uid(), name, sites: [] };
    data.groups.push(g); data.active = g.id; changed();
  });
  tabs.append(addGroup);

  const addButton = (label, fn, cls = 'mini') => {
    const x = document.createElement('button');
    x.type = 'button'; x.className = cls; x.textContent = label;
    x.addEventListener('click', fn);
    act.append(x);
    return x;
  };
  if (editing) addButton('Name widget', async () => {
    const title = await ask({ title: 'Name this widget', label: 'Name, like Work or Personal', value: item.cfg.title || '', ok: 'Save', allowEmpty: true });
    if (title === null) return;
    item.cfg.title = title; changed(); renderWidgetList();
  });
  addButton(editing ? 'Done' : 'Edit', () => { editing ? sitesEditing.delete(item.id) : sitesEditing.add(item.id); refresh(item.id); }, editing ? 'mini on' : 'mini');
  const plus = addButton('', () => openSiteDialog(item, null), 'mini labeled');
  plus.innerHTML = `${ico('plus')}Site`;
  plus.setAttribute('aria-label', 'Add a site');
  plus.title = 'Add a site';

  for (const site of group.sites) {
    const li = document.createElement('li');
    li.className = 'tile'; li.dataset.id = site.id; li.draggable = editing;
    const a = document.createElement('a');
    a.href = site.url;
    const icon = document.createElement('span');
    icon.className = 'ficon';
    const img = new Image();
    img.alt = ''; img.src = favicon(site.url);
    img.onerror = () => { const letter = document.createElement('b'); letter.textContent = site.name.charAt(0).toUpperCase(); icon.replaceChildren(letter); };
    icon.append(img);
    const label = document.createElement('span');
    label.className = 'tname'; label.textContent = site.name;
    a.append(icon, label);
    a.addEventListener('click', (e) => { if (editing) { e.preventDefault(); openSiteDialog(item, site); } });
    li.append(a);

    if (editing) {
      const tools = document.createElement('div');
      tools.className = 'tools';
      tools.innerHTML = `<button type="button" aria-label="Edit ${esc(site.name)}">${ico('pencil')}</button><button type="button" class="remove" aria-label="Remove ${esc(site.name)}">${ico('x')}</button>`;
      tools.children[0].addEventListener('click', () => openSiteDialog(item, site));
      tools.children[1].addEventListener('click', () => {
        group.sites = group.sites.filter((s) => s.id !== site.id);
        changed();
        toast(`Removed ${site.name}.`, { label: 'Undo', run() { group.sites.push(site); changed(); } });
      });
      li.append(tools);
      li.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', site.id); li.classList.add('dragging'); });
      li.addEventListener('dragend', () => li.classList.remove('dragging'));
      li.addEventListener('dragover', (e) => e.preventDefault());
      li.addEventListener('drop', (e) => {
        e.preventDefault();
        const from = group.sites.findIndex((s) => s.id === e.dataTransfer.getData('text/plain'));
        const to = group.sites.findIndex((s) => s.id === site.id);
        if (from < 0 || from === to) return;
        const [moved] = group.sites.splice(from, 1);
        group.sites.splice(to, 0, moved);
        changed();
      });
    }
    grid.append(li);
  }
  if (!group.sites.length) {
    const add = document.createElement('li');
    add.className = 'tile';
    add.innerHTML = `<button class="add" type="button"><span class="ficon">${ico('plus')}</span><span class="tname">Add site</span></button>`;
    add.firstChild.addEventListener('click', () => openSiteDialog(item, null));
    grid.append(add);
  }
}

const gcalDay = (d) => `https://calendar.google.com/calendar/r/day/${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
function isoWeek(date) {
  const t = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  return Math.ceil(((t - Date.UTC(t.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7);
}
function renderCalendar(b, size) {
  const today = new Date();
  if (size === 's') {
    b.innerHTML = `<a class="today-card" href="${gcalDay(today)}" title="Open today in Google Calendar">
      <span class="tc-wd">${today.toLocaleDateString(undefined, { weekday: 'long' })}</span>
      <span class="tc-day">${today.getDate()}</span>
      <span class="tc-mo">${today.toLocaleDateString(undefined, { month: 'long' })}, week ${isoWeek(today)}</span></a>`;
    return;
  }
  const y = shownMonth.getFullYear(), m = shownMonth.getMonth();
  const title = shownMonth.toLocaleDateString(undefined, { month: 'long' }) + (y !== today.getFullYear() ? ` <small>${y}</small>` : '');
  let cells = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => `<span class="dow">${d}</span>`).join('');
  const start = new Date(y, m, 1 - new Date(y, m, 1).getDay());
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    if (i >= 35 && d.getMonth() !== m) break;   // skip a sixth row that is entirely next month
    const cls =[d.getMonth() !== m ? 'out' : '', d.toDateString() === today.toDateString() ? 'today' : ''].join(' ').trim();
    cells += `<a href="${gcalDay(d)}" class="${cls}" title="${d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}">${d.getDate()}</a>`;
  }
  b.innerHTML = `<div class="w-head"><h2 class="month">${title}</h2><div class="act">
      <button class="mini ic" type="button" data-step="-1" aria-label="Previous month">${ico('left')}</button>
      <button class="mini" type="button" data-step="0">Today</button>
      <button class="mini ic" type="button" data-step="1" aria-label="Next month">${ico('right')}</button></div></div>
    <div class="days">${cells}</div>`;
  b.querySelector('.act').addEventListener('click', (e) => {
    const step = e.target.closest('button')?.dataset.step;
    if (step === undefined) return;
    if (step === '0') { shownMonth = new Date(); shownMonth.setDate(1); }
    else shownMonth.setMonth(shownMonth.getMonth() + Number(step));
    refresh('calendar');
  });
}

function renderNotes(b, size, item) {
  const noteKey = item.cfg.key || 'sp.notes';
  b.innerHTML = `<div class="w-head"><h2>Quick note</h2><span class="w-meta notes-state"></span></div>
    <textarea class="notes-area" aria-label="Quick note" placeholder="Jot something down. It saves as you type."></textarea>`;
  const ta = b.querySelector('textarea'), state = b.querySelector('.notes-state');
  ta.value = store.get(noteKey, '');
  let timer;
  ta.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      store.set(noteKey, ta.value);
      state.textContent = 'Saved';
      setTimeout(() => { state.textContent = ''; }, 1500);
    }, 400);
  });
}

let taskAdding = false;   // the add field only appears after pressing +
function renderTasks(b) {
  const left = tasks.filter((t) => !t.done).length;
  b.innerHTML = `<div class="w-head"><h2>Tasks</h2><span class="w-meta">${tasks.length ? `${left} left` : ''}</span>
      <div class="act">${tasks.some((t) => t.done) ? '<button class="mini" type="button" data-a="clear">Clear done</button>' : ''}<button class="mini ic" type="button" data-a="add" aria-label="Add a task" title="Add a task">${ico('plus')}</button></div></div>
    ${taskAdding ? '<form class="task-add"><input class="task-input" maxlength="120" placeholder="New task, then Enter" aria-label="New task" autocomplete="off"></form>' : ''}
    <ul class="task-list">${tasks.map((t) => `<li class="${t.done ? 'done' : ''}" data-id="${t.id}"><label><input type="checkbox" ${t.done ? 'checked' : ''}><span>${esc(t.text)}</span></label><button class="x" type="button" aria-label="Delete task">${ico('x')}</button></li>`).join('')}</ul>
    ${!tasks.length && !taskAdding ? '<button class="proj-add" type="button" data-a="add">Add your first task</button>' : ''}`;
  b.querySelectorAll('[data-a="add"]').forEach((btn) => btn.addEventListener('click', () => {
    taskAdding = true; refresh('tasks');
    document.querySelector('.task-input')?.focus();
  }));
  const form = b.querySelector('form');
  if (form) {
    const input = form.querySelector('input');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      tasks.push({ id: uid(), text, done: false });
      saveTasks(); refresh('tasks');
      document.querySelector('.task-input')?.focus();   // stay open to add several in a row
    });
    // Escape, or leaving the field empty, closes it again
    input.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); taskAdding = false; refresh('tasks'); } });
    input.addEventListener('blur', () => setTimeout(() => {
      if (taskAdding && !input.value.trim() && !b.contains(document.activeElement)) { taskAdding = false; refresh('tasks'); }
    }, 150));
  }
  b.querySelector('[data-a="clear"]')?.addEventListener('click', () => { tasks = tasks.filter((t) => !t.done); saveTasks(); refresh('tasks'); });
  b.querySelector('.task-list').addEventListener('change', (e) => {
    const task = tasks.find((t) => t.id === e.target.closest('li').dataset.id);
    task.done = e.target.checked;
    saveTasks(); refresh('tasks');
  });
  b.querySelector('.task-list').addEventListener('click', (e) => {
    if (!e.target.closest('.x')) return;
    const id = e.target.closest('li').dataset.id;
    tasks = tasks.filter((t) => t.id !== id);
    saveTasks(); refresh('tasks');
  });
}

function renderFocus(b, size) {
  const running = Boolean(focus.endsAt);
  b.innerHTML = `<div class="focus">
    <div class="ring"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="ring-track" cx="50" cy="50" r="44"/><circle class="ring-bar" cx="50" cy="50" r="44" pathLength="1" data-ring></circle></svg><span class="ft" data-b="ft"></span></div>
    <div class="focus-side">
      ${size === 'm'
        ? `<div class="modes" role="radiogroup" aria-label="Timer"><button type="button" role="radio" data-m="focus" aria-checked="${focus.mode === 'focus'}">Focus 25</button><button type="button" role="radio" data-m="break" aria-checked="${focus.mode === 'break'}">Break 5</button></div>`
        : `<span class="fmode">${focus.mode === 'focus' ? 'Focus' : 'Break'}</span>`}
      <div class="fbtns"><button class="btn primary sm" type="button" data-a="toggle">${running ? 'Pause' : 'Start'}</button><button class="btn quiet sm ic" type="button" data-a="reset" aria-label="Reset timer">${ico('reset')}</button></div>
    </div></div>`;
  b.querySelector('[data-a="toggle"]').addEventListener('click', () => {
    if (focus.endsAt) { focus.left = focusLeft(); focus.endsAt = null; }
    else focus.endsAt = Date.now() + focus.left;
    saveFocus(); refresh('focus');
  });
  b.querySelector('[data-a="reset"]').addEventListener('click', () => focusReset(focus.mode));
  b.querySelector('.modes')?.addEventListener('click', (e) => { const m = e.target.closest('button')?.dataset.m; if (m) focusReset(m); });
  focusTick();
}
function focusReset(mode) {
  focus = { mode, endsAt: null, left: FOCUS_MIN[mode] * 60e3 };
  saveFocus(); refresh('focus'); focusTick();
}
function focusTick() {
  const left = focusLeft();
  if (focus.endsAt && left <= 0) {
    const finished = focus.mode;
    focusReset(finished === 'focus' ? 'break' : 'focus');
    toast(finished === 'focus' ? 'Focus session done. Take a 5 minute break.' : 'Break’s over. Start another focus session when you’re ready.');
    const el = document.querySelector('.widget[data-type="focus"]');
    if (el) { el.classList.add('ding'); setTimeout(() => el.classList.remove('ding'), 3600); }
    return;
  }
  setAll('ft', mmss(left));
  const frac = left / (FOCUS_MIN[focus.mode] * 60e3);
  document.querySelectorAll('[data-ring]').forEach((c) => { c.style.strokeDasharray = `${frac.toFixed(4)} 1`; });
  document.title = focus.endsAt ? `${mmss(left)} ${focus.mode === 'focus' ? 'focus' : 'break'} left` : BASE_TITLE;
}

function renderProjects(b, size) {
  const data = ghData();
  const user = settings.github.trim();
  b.innerHTML = `<div class="w-head"><h2>Projects</h2>${user ? `<a class="w-meta" href="https://github.com/${encodeURIComponent(user)}">${esc(user)}</a>` : ''}<div class="act"></div></div>
    <ul class="projects${size === 'w' ? ' projects-w' : ''}${projEditing ? ' editing' : ''}"></ul>`;
  const act = b.querySelector('.act'), list = b.querySelector('.projects');
  const edit = document.createElement('button');
  edit.type = 'button'; edit.className = projEditing ? 'mini on' : 'mini'; edit.textContent = projEditing ? 'Done' : 'Edit';
  edit.addEventListener('click', () => { projEditing = !projEditing; refresh('projects'); });
  const plus = document.createElement('button');
  plus.type = 'button'; plus.className = 'mini ic'; plus.innerHTML = ico('plus');
  plus.setAttribute('aria-label', 'Add a project'); plus.title = 'Add a project';
  plus.addEventListener('click', () => openProjDialog(null));
  act.append(edit, plus);

  for (const p of projects) {
    const repo = (p.repo || '').trim();
    const key = repo.split('/').pop().toLowerCase();
    const info = key && data ? data.repos[key] : null;
    const full = repo.includes('/') ? repo : (repo && user ? `${user}/${repo}` : '');
    const href = p.link || info?.url || (full ? `https://github.com/${full}` : '');
    // A repo that isn't in the public list is private (or misspelled); it still links to GitHub
    const meta = info ? esc(ago(info.pushed)) : (key && data ? `${ico('lock')}Private` : '');
    const hasBar = p.progress !== '' && p.progress != null;
    const li = document.createElement('li');
    li.dataset.id = p.id;
    li.draggable = projEditing;
    const row = document.createElement(href && !projEditing ? 'a' : 'div');
    row.className = 'proj';
    if (href && !projEditing) row.href = href;
    row.style.setProperty('--c', (STATUS[p.status] || STATUS.active).c);
    row.innerHTML = `<span class="dot" title="${(STATUS[p.status] || STATUS.active).label}"></span><span class="pn">${esc(p.name)}</span><span class="pm">${meta}</span>`
      + (p.next || hasBar ? `<span class="px"><span>${esc(p.next || (STATUS[p.status] || STATUS.active).label)}</span>${hasBar ? `<span class="bar" title="${p.progress}% done"><i style="width:${p.progress}%"></i></span>` : ''}</span>` : '');
    li.append(row);
    if (projEditing) {
      row.addEventListener('click', () => openProjDialog(p));
      const tools = document.createElement('div');
      tools.className = 'tools';
      tools.innerHTML = `<button type="button" aria-label="Edit ${esc(p.name)}">${ico('pencil')}</button><button type="button" class="remove" aria-label="Remove ${esc(p.name)}">${ico('x')}</button>`;
      tools.children[0].addEventListener('click', (e) => { e.stopPropagation(); openProjDialog(p); });
      tools.children[1].addEventListener('click', (e) => {
        e.stopPropagation();
        const at = projects.indexOf(p);
        projects = projects.filter((x) => x !== p);
        saveProjects(); refresh('projects');
        toast(`Removed ${p.name}.`, { label: 'Undo', run() { projects.splice(at, 0, p); saveProjects(); refresh('projects'); } });
      });
      row.append(tools);
      li.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', p.id); li.classList.add('dragging'); });
      li.addEventListener('dragend', () => li.classList.remove('dragging'));
      li.addEventListener('dragover', (e) => e.preventDefault());
      li.addEventListener('drop', (e) => {
        e.preventDefault();
        const from = projects.findIndex((x) => x.id === e.dataTransfer.getData('text/plain'));
        const to = projects.indexOf(p);
        if (from < 0 || from === to) return;
        const [moved] = projects.splice(from, 1);
        projects.splice(to, 0, moved);
        saveProjects(); refresh('projects');
      });
    }
    list.append(li);
  }
  if (!projects.length) {
    const li = document.createElement('li');
    li.innerHTML = '<button class="proj-add" type="button">Add your first project</button>';
    li.firstChild.addEventListener('click', () => openProjDialog(null));
    list.append(li);
  }

  if (ghError && size !== 'm') b.insertAdjacentHTML('beforeend', `<p class="note" style="margin-top:8px">${esc(ghError)}</p>`);
  else if (size === 'l' && data) {
    const max = Math.max(1, ...data.days);
    const total = data.days.reduce((a, v) => a + v, 0);
    b.insertAdjacentHTML('beforeend', `<div class="gh-act"><div class="bars" role="img" aria-label="${total} commits to public repositories in the last 30 days">${data.days.map((v) => `<i class="${v ? '' : 'zero'}" style="height:${v ? 20 + (80 * v) / max : 6}%" title="${v} commit${v === 1 ? '' : 's'}"></i>`).join('')}</div>
      <span class="w-meta">${total} commit${total === 1 ? '' : 's'} to public repositories in the last 30 days</span></div>`);
  }
}

function normalizeLink(raw) {
  if (/^(vscode|obsidian):\/\/\S+$/i.test(raw)) return raw;   // open a folder in VS Code or a note in Obsidian
  return normalizeUrl(raw);
}
function openProjDialog(p) {
  editingProjId = p ? p.id : null;
  $('projDialogTitle').textContent = p ? 'Edit project' : 'Add a project';
  $('projSave').textContent = p ? 'Save changes' : 'Add project';
  $('projName').value = p ? p.name : '';
  $('projNext').value = p ? p.next : '';
  $('projStatus').value = p ? p.status : 'active';
  $('projProgress').value = p && p.progress !== '' ? String(p.progress) : '';
  $('projRepo').value = p ? p.repo : '';
  $('projLink').value = p ? p.link : '';
  $('projError').textContent = '';
  $('projDialog').showModal();
}
$('projForm').addEventListener('submit', (e) => {
  if (e.submitter?.value !== 'save') return;
  const name = $('projName').value.trim();
  if (!name) { e.preventDefault(); $('projError').textContent = 'Give the project a name.'; return; }
  let link = $('projLink').value.trim();
  if (link) {
    link = normalizeLink(link);
    if (!link) { e.preventDefault(); $('projError').textContent = 'That link doesn’t look right. Use a web address, or one starting with vscode:// or obsidian://.'; return; }
  }
  const fields = {
    name, link,
    next: $('projNext').value.trim(),
    status: $('projStatus').value,
    progress: $('projProgress').value,
    repo: $('projRepo').value.trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\/+$/, '')
  };
  if (editingProjId) Object.assign(projects.find((x) => x.id === editingProjId), fields);
  else projects.push({ id: uid(), ...fields });
  saveProjects(); refresh('projects');
});

// ---------- Small dialogs ----------
const ASK_EXTRA = Symbol('extra button');
function ask({ title, label = '', text = '', value = '', ok = 'Save', danger = false, extra = '', allowEmpty = false }) {
  return new Promise((resolve) => {
    const d = $('ask');
    const input = d.querySelector('input');
    const okBtn = d.querySelector('[value="ok"]');
    const extraBtn = d.querySelector('[value="extra"]');
    d.querySelector('h2').textContent = title;
    d.querySelector('.ask-label').textContent = label;
    input.parentElement.hidden = !label;
    input.value = value;
    d.querySelector('.ask-text').textContent = text;
    d.querySelector('.ask-text').hidden = !text;
    okBtn.textContent = ok;
    okBtn.className = `btn ${danger ? 'danger' : 'primary'}`;
    extraBtn.textContent = extra;
    extraBtn.hidden = !extra;
    d.returnValue = '';
    d.showModal();
    if (label) input.select();
    d.addEventListener('close', () => {
      if (d.returnValue === 'extra') return resolve(ASK_EXTRA);
      if (d.returnValue !== 'ok') return resolve(null);
      if (!label) return resolve(true);
      resolve(allowEmpty ? input.value.trim() : input.value.trim() || null);
    }, { once: true });
  });
}
// A small form built on the fly, used by the newer widgets. Resolves to the values, ASK_EXTRA or null.
function formDialog({ title, fields, ok = 'Save', extra = '', validate }) {
  return new Promise((resolve) => {
    const d = $('formDlg');
    const form = d.querySelector('form');
    d.querySelector('h2').textContent = title;
    const box = d.querySelector('.form-fields');
    box.replaceChildren();
    for (const f of fields) {
      const label = document.createElement('label');
      label.textContent = f.label;
      let el;
      if (f.type === 'select') {
        el = document.createElement('select');
        el.innerHTML = f.options.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join('');
      } else if (f.type === 'textarea') {
        el = document.createElement('textarea');
      } else {
        el = document.createElement('input');
        el.type = f.type || 'text';
        el.autocomplete = 'off';
        if (f.step) el.step = f.step;
        if (f.min !== undefined) el.min = f.min;
      }
      el.className = 'input';
      el.name = f.key;
      el.value = f.value ?? '';
      if (f.placeholder) el.placeholder = f.placeholder;
      label.append(el);
      box.append(label);
    }
    const err = d.querySelector('.error');
    err.textContent = '';
    d.querySelector('[value="ok"]').textContent = ok;
    const extraBtn = d.querySelector('[value="extra"]');
    extraBtn.textContent = extra; extraBtn.hidden = !extra;
    const read = () => Object.fromEntries(fields.map((f) => [f.key, form.elements[f.key].value.trim()]));
    const onSubmit = (e) => {
      if (e.submitter?.value !== 'ok' || !validate) return;
      const problem = validate(read());
      if (problem) { e.preventDefault(); err.textContent = problem; }
    };
    form.addEventListener('submit', onSubmit);
    d.returnValue = '';
    d.showModal();
    d.addEventListener('close', () => {
      form.removeEventListener('submit', onSubmit);
      if (d.returnValue === 'extra') return resolve(ASK_EXTRA);
      resolve(d.returnValue === 'ok' ? read() : null);
    }, { once: true });
  });
}
async function editGroup(item, g) {
  const data = sitesOf(item);
  const name = await ask({ title: 'Edit group', label: 'Group name', value: g.name, ok: 'Save', extra: data.groups.length > 1 ? 'Delete group' : '' });
  if (name === ASK_EXTRA) {
    const yes = await ask({ title: `Delete “${g.name}”?`, text: `Its ${g.sites.length} site${g.sites.length === 1 ? '' : 's'} will be removed too.`, ok: 'Delete group', danger: true });
    if (!yes) return;
    data.groups = data.groups.filter((x) => x !== g);
    data.active = data.groups[0].id;
  } else if (name) {
    g.name = name;
  } else return;
  savePages(); refresh(item.id);
}

function openSiteDialog(item, site) {
  const data = sitesOf(item);
  siteCtx = { item, siteId: site ? site.id : null };
  $('siteDialogTitle').textContent = site ? 'Edit site' : 'Add a site';
  $('siteSave').textContent = site ? 'Save changes' : 'Add site';
  $('siteName').value = site ? site.name : '';
  $('siteUrl').value = site ? site.url : '';
  $('siteError').textContent = '';
  const owner = site ? data.groups.find((g) => g.sites.some((s) => s.id === site.id)) : (data.groups.find((g) => g.id === data.active) || data.groups[0]);
  $('siteGroup').innerHTML = data.groups.map((g) => `<option value="${g.id}" ${g.id === owner.id ? 'selected' : ''}>${esc(g.name)}</option>`).join('');
  $('siteDialog').showModal();
}
$('siteUrl').addEventListener('input', () => { $('siteError').textContent = ''; });
$('siteForm').addEventListener('submit', (e) => {
  if (e.submitter?.value !== 'save') return;
  const name = $('siteName').value.trim();
  const url = normalizeUrl($('siteUrl').value);
  if (!name) { e.preventDefault(); $('siteError').textContent = 'Give the site a name.'; return; }
  if (!url) { e.preventDefault(); $('siteError').textContent = 'That address doesn’t look right. Try something like youtube.com.'; return; }
  const data = sitesOf(siteCtx.item);
  const target = data.groups.find((g) => g.id === $('siteGroup').value);
  if (siteCtx.siteId) {
    const owner = data.groups.find((g) => g.sites.some((s) => s.id === siteCtx.siteId));
    const site = owner.sites.find((s) => s.id === siteCtx.siteId);
    site.name = name; site.url = url;
    if (owner !== target) { owner.sites = owner.sites.filter((s) => s !== site); target.sites.push(site); }
  } else {
    target.sites.push({ id: uid(), name, url });
  }
  savePages(); refresh(siteCtx.item.id);
});

function toast(message, action) {
  const t = $('toast');
  t.replaceChildren();
  const span = document.createElement('span');
  span.textContent = message;
  t.append(span);
  if (action) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn sm'; b.textContent = action.label;
    b.addEventListener('click', () => { action.run(); t.classList.remove('show'); });
    t.append(b);
  }
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 6000);
}

// ---------- Settings sheet ----------
function openSettings(sectionId) {
  syncSettingsForm();
  if (!$('settings').open) $('settings').showModal();
  if (sectionId) $(sectionId).scrollIntoView({ block: 'start' });
}
$('settingsBtn').addEventListener('click', () => openSettings());
$('closeSettings').addEventListener('click', () => $('settings').close());
$('settings').addEventListener('click', (e) => { if (e.target === $('settings')) $('settings').close(); });   // click outside the sheet
$('settings').querySelector('.sheet-nav').addEventListener('click', (e) => {
  const a = e.target.closest('a');
  if (!a) return;
  e.preventDefault();
  $(a.getAttribute('href').slice(1)).scrollIntoView({ block: 'start', behavior: 'smooth' });
});

function setRadio(name, value) {
  document.querySelectorAll(`input[name="${name}"]`).forEach((r) => { r.checked = r.value === value; });
}
function syncScheduleHint() {
  const d = wxData();
  let hint;
  if (settings.schedule === 'sun') {
    hint = d
      ? `Light from sunrise (${fmtTime(d.daily.sunrise[0] * 1000, d.timezone)}) to sunset (${fmtTime(d.daily.sunset[0] * 1000, d.timezone)}) in ${shortPlace()}. It follows the sun as the days change.`
      : 'Uses sunrise and sunset once the forecast loads. Until then it uses the set times.';
  } else {
    const t = (v) => { const [h, m] = v.split(':').map(Number); const x = new Date(); x.setHours(h, m, 0, 0); return fmtTime(x); };
    hint = `Light from ${t(settings.lightAt)} to ${t(settings.darkAt)}.`;
  }
  $('schedHint').textContent = hint;
}
function syncSettingsForm() {
  setRadio('set', settings.set);
  setRadio('theme', settings.theme);
  setRadio('schedule', settings.schedule);
  setRadio('accent', settings.accent);
  setRadio('units', settings.units);
  const only = SET_ONLY[settings.set];
  $('modeHint').hidden = !only;
  $('setHint').hidden = !SET_HINTS[settings.set];
  $('setHint').textContent = SET_HINTS[settings.set] || '';
  // The art themes set their own colors and mode, so those controls would do nothing
  $('accentField').hidden = $('modeField').hidden = SETS[settings.set].bg === 'scene';
  $('modeHint').textContent = only ? `${SETS[settings.set].name} is ${only} only, so it stays ${only} whatever you pick here.` : '';
  if (document.activeElement !== $('ghUser')) $('ghUser').value = settings.github;
  $('schedBox').hidden = settings.theme !== 'schedule' || SETS[settings.set].bg === 'scene';
  $('schedTimes').hidden = settings.schedule !== 'times';
  $('lightAt').value = settings.lightAt;
  $('darkAt').value = settings.darkAt;
  $('dust').checked = settings.dust;
  $('use24').checked = settings.use24;
  $('seconds').checked = settings.seconds;
  if (document.activeElement !== $('name')) $('name').value = settings.name;
  $('locName').textContent = settings.location.name;
  $('swipePages').checked = settings.swipe;
  syncScheduleHint();
  syncGreetingForm();
  renderPageList();
  renderWidgetList();
}

const onRadio = (name, fn) => document.querySelectorAll(`input[name="${name}"]`).forEach((r) => r.addEventListener('change', () => { if (r.checked) fn(r.value); }));
// Each theme set brings its own accent; you can still pick a different one afterwards
onRadio('set', (v) => { settings.set = v; settings.accent = SETS[v].accent; saveSettings(); syncSettingsForm(); applyTheme(true); renderBoard(); });
onRadio('theme', (v) => { settings.theme = v; saveSettings(); syncSettingsForm(); applyTheme(true); });
onRadio('schedule', (v) => { settings.schedule = v; saveSettings(); syncSettingsForm(); applyTheme(true); });
onRadio('accent', (v) => { settings.accent = v; saveSettings(); applyTheme(false); });
onRadio('units', (v) => { settings.units = v; saveSettings(); refresh('weather'); refresh('sky'); loadWeather(true); });
$('lightAt').addEventListener('change', (e) => { if (e.target.value) { settings.lightAt = e.target.value; saveSettings(); syncScheduleHint(); applyTheme(true); } });
$('darkAt').addEventListener('change', (e) => { if (e.target.value) { settings.darkAt = e.target.value; saveSettings(); syncScheduleHint(); applyTheme(true); } });
$('dust').addEventListener('change', (e) => { settings.dust = e.target.checked; saveSettings(); applyTheme(false); });
$('ghUser').addEventListener('change', (e) => {
  settings.github = e.target.value.trim();
  saveSettings(); ghError = '';
  refresh('projects'); loadGitHub(true);
});
$('use24').addEventListener('change', (e) => { settings.use24 = e.target.checked; saveSettings(); tick(); refresh('weather'); refresh('sky'); syncScheduleHint(); });
$('seconds').addEventListener('change', (e) => { settings.seconds = e.target.checked; saveSettings(); tick(); });
$('name').addEventListener('input', (e) => { settings.name = e.target.value; saveSettings(); tick(); syncGreetingForm(); });
$('name').addEventListener('change', () => refresh('search'));
$('resetLayout').addEventListener('click', async () => {
  const yes = await ask({ title: 'Reset the layout?', text: 'Pages and widgets go back to how they started. Your sites, notes and tasks stay.', ok: 'Reset layout', danger: true });
  if (!yes) return;
  const kept = allItems().find((i) => i.type === 'sites' && i.cfg.sites)?.cfg.sites;
  pages = defaultPages(kept);
  currentPage = 0;
  savePages(); renderBoard(); renderWidgetList(); loadGitHub(); loadAlerts(true); loadExtras();
});

// Location: search by city name (Open-Meteo geocoding) or ask the browser
function setLocation(loc) {
  settings.location = loc;
  saveSettings();
  $('locResults').replaceChildren();
  $('locQuery').value = '';
  wxError = '';
  syncSettingsForm(); tick();
  refresh('weather'); refresh('sky');
  loadWeather(true);
}
function locMessage(text) {
  const li = document.createElement('li');
  li.className = 'hint'; li.textContent = text;
  $('locResults').replaceChildren(li);
}
$('locForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const q = $('locQuery').value.trim();
  if (!q) return;
  locMessage('Searching…');
  try {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`);
    const list = (await res.json()).results || [];
    if (!list.length) { locMessage(`No places match “${q}”. Try a city name, like Philadelphia.`); return; }
    $('locResults').replaceChildren(...list.map((p) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = `<strong>${esc(p.name)}</strong><small>${esc([p.admin1, p.country].filter(Boolean).join(', '))}</small>`;
      b.addEventListener('click', () => setLocation({ name: [p.name, p.admin1 || p.country].filter(Boolean).join(', '), lat: p.latitude, lon: p.longitude }));
      li.append(b);
      return li;
    }));
  } catch {
    locMessage('Place search isn’t responding. Check your connection and try again.');
  }
});
$('locHere').addEventListener('click', () => {
  if (!navigator.geolocation) { locMessage('This browser can’t share your location. Search for a city instead.'); return; }
  locMessage('Asking the browser for your location…');
  navigator.geolocation.getCurrentPosition(
    (p) => setLocation({ name: 'Current location', lat: +p.coords.latitude.toFixed(4), lon: +p.coords.longitude.toFixed(4) }),
    () => locMessage('The browser didn’t share your location. Search for a city instead.'),
    { timeout: 10000 }
  );
});

// Backup and restore everything in one file
$('backupAll').addEventListener('click', () => {
  const data = { app: 'start-page', version: 4, settings, pages, projects, tasks, notes: store.get('sp.notes', ''), extras: backupExtras() };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  a.download = 'start-page-backup.json';
  a.click();
  URL.revokeObjectURL(a.href);
});
$('restoreAll').addEventListener('click', () => $('restoreFile').click());
$('restoreFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    if (parsed.app !== 'start-page' && !Array.isArray(parsed.groups)) throw new Error('not a backup');
    if (Array.isArray(parsed.groups)) {
      // A sites-only backup from the first version
      const first = allItems().find((i) => i.type === 'sites');
      if (first) first.cfg.sites = parsed;
    } else {
      settings = { ...DEFAULT_SETTINGS, ...parsed.settings };
      if (Array.isArray(parsed.pages)) pages = normalizePages(parsed.pages);
      else if (Array.isArray(parsed.layout)) pages = pagesFromOldLayout(parsed.layout, parsed.sites);
      tasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
      if (Array.isArray(parsed.projects)) projects = parsed.projects;
      if (parsed.extras) restoreExtras(parsed.extras);
      store.set('sp.notes', parsed.notes || '');
    }
    saveSettings(); savePages(); saveTasks(); saveProjects();
    currentPage = 0;
    applyTheme(true); renderBoard(); syncSettingsForm();
    loadWeather(true); loadAlerts(true); loadGitHub(true); loadExtras();
    toast('Restored from backup.');
  } catch {
    toast('That file isn’t a start page backup. Pick a start-page-backup.json file.');
  }
});

// ---------- Clock tick ----------
let lastMinute = -1, lastDay = new Date().getDate();
function tick() {
  const now = new Date();
  const h = now.getHours();
  const m = pad(now.getMinutes());
  setAll('hm', settings.use24 ? `${pad(h)}:${m}` : `${((h + 11) % 12) + 1}:${m}`);
  setAll('sec', settings.seconds ? pad(now.getSeconds()) : '');
  setAll('ampm', settings.use24 ? '' : h < 12 ? 'am' : 'pm');
  setAll('greet', greetingText(now));
  setAll('date', now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }));
  setAll('wxline', wxLine());
  if (isOn('focus') || focus.endsAt) focusTick();
  if (now.getMinutes() !== lastMinute) {
    // Once a minute: theme schedule, the sun's position and train countdowns
    if (lastMinute !== -1) { applyTheme(true); refresh('sky'); refresh('alerts'); refresh('countdown'); }
    lastMinute = now.getMinutes();
  }
  if (now.getDate() !== lastDay) { lastDay = now.getDate(); refresh('calendar'); }
}

// ---------- Keyboard and other tabs ----------
document.addEventListener('keydown', (e) => {
  const typing = e.target.closest('input, textarea, select, [contenteditable]');
  if (e.key === '/' && !typing && !document.querySelector('dialog[open]')) {
    const q = document.querySelector('.search input');
    if (q) { e.preventDefault(); q.focus(); }
  }
  if (e.key === 'Escape' && arranging && !document.querySelector('dialog[open]')) setArranging(false);
  if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !typing && !arranging && !document.querySelector('dialog[open]')) {
    if (settings.swipe) goToPage(currentPage + (e.key === 'ArrowRight' ? 1 : -1));
  }
});
// Keep several open tabs in step when something changes in one of them
addEventListener('storage', (e) => {
  if (e.key === 'sp.notes' && !document.activeElement?.classList.contains('notes-area')) refresh('notes');
  if (e.key === 'sp.tasks') { tasks = store.get('sp.tasks', []); refresh('tasks'); }
  if (e.key === 'sp.focus') { focus = store.get('sp.focus', focus); refresh('focus'); }
  if (e.key === 'sp.projects') { projects = store.get('sp.projects', projects); refresh('projects'); }
  if (e.key === 'sp.settings' || e.key === 'sp.pages') {
    settings = { ...DEFAULT_SETTINGS, ...store.get('sp.settings', {}) };
    pages = normalizePages(store.get('sp.pages', pages));
    applyTheme(true); renderBoard(); syncSettingsForm();
  }
});
document.addEventListener('visibilitychange', () => { if (!document.hidden) { loadWeather(); loadGitHub(); loadAlerts(); loadNews(); loadExtras(); } });

