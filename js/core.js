'use strict';
// ---------- Helpers ----------
const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }
};
const $ = (id) => document.getElementById(id);
const uid = () => Math.random().toString(36).slice(2, 9);
const pad = (n) => String(n).padStart(2, '0');
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const setAll = (key, value) => document.querySelectorAll(`[data-b="${key}"]`).forEach((e) => { if (e.textContent !== value) e.textContent = value; });
const dur = (ms) => { const m = Math.max(0, Math.round(ms / 60000)); return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`; };
const BASE_TITLE = document.title;
// Copy right away (inside the click) so it works even where the async clipboard stalls
function copyText(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
  const before = document.activeElement;
  document.body.append(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch {}
  ta.remove();
  before?.focus?.();
  if (!ok) navigator.clipboard?.writeText(text).catch(() => {});
  return ok;
}

const ICONS = {
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="17" height="7" rx="1.5"/>',
  grip: '<g fill="currentColor" stroke="none"><circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/></g>',
  eyeoff: '<path d="M3 3l18 18M10.6 5.1A9.9 9.9 0 0 1 12 5c5 0 8.5 4.5 9.5 7a13 13 0 0 1-2.4 3.5M6.6 6.6C4.4 8 3 10.2 2.5 12c1 2.5 4.5 7 9.5 7 1.7 0 3.2-.5 4.5-1.3M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
  pencil: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z"/>',
  left: '<path d="M15 6l-6 6 6 6"/>',
  right: '<path d="M9 6l6 6-6 6"/>',
  reset: '<path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4"/>',
  pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'
};
const ico = (name) => `<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
document.querySelectorAll('[data-ico]').forEach((e) => { e.outerHTML = ico(e.dataset.ico); });

// ---------- Settings ----------
const DEFAULT_SETTINGS = {
  name: 'Josh',
  set: 'space',           // space, nebula, aurora or lunar
  theme: 'dark',          // dark, light, system or schedule
  schedule: 'sun',        // sun (sunrise to sunset) or times
  lightAt: '07:00',
  darkAt: '19:00',
  accent: 'teal',
  dust: true,
  use24: false,
  seconds: true,
  units: 'f',
  engine: 'google',
  location: { name: 'Lansdowne, Pennsylvania', lat: 39.9387, lon: -75.2716 },
  station: 'Lansdowne',
  github: 'jallison1193-crypto',
  swipe: true,            // pages side by side; off stacks them and you scroll down
  greetStyle: 'dark',     // a preset in greetings.js, or custom
  greetName: true,
  greetRotate: 'load',    // load (every new tab), hour or day
  greetCustom: { morning: '', afternoon: '', evening: '', night: '' }
};
const savedSettings = store.get('sp.settings', null);
let settings = { ...DEFAULT_SETTINGS, ...(savedSettings || {}) };
if (!savedSettings) {
  // Carry over choices made on the first version of the page
  settings.use24 = store.get('np.24h', false);
  settings.engine = store.get('np.engine', 'google');
}
const saveSettings = () => store.set('sp.settings', settings);
const shortPlace = () => settings.location.name.split(',')[0];

