'use strict';
// ---------- Smaller widgets: each one can be switched on or off in Settings ----------
const feed = {};   // name -> { at, data, error }
async function fetchFeed(name, url, ttl, parse = (x) => x) {
  const f = feed[name] || (feed[name] = store.get('sp.feed.' + name, {}));
  if (f.at && Date.now() - f.at < ttl) return;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    f.data = parse(await res.json());
    f.at = Date.now();
    f.error = '';
    store.set('sp.feed.' + name, { at: f.at, data: f.data });
  } catch {
    f.error = 'This isn’t loading right now. It will try again soon.';
  }
  refresh(name);
}
function feedNote(b, title, name) {
  const f = feed[name] || (feed[name] = store.get('sp.feed.' + name, {}));
  if (f?.data) return false;
  b.innerHTML = `<div class="w-head"><h2>${title}</h2></div><p class="note">${esc(f?.error || 'Loading…')}</p>`;
  return true;
}
function loadExtras() {
  if (document.hidden) return;
  const d = new Date();
  if (isOn('obits')) {
    const mm = pad(d.getMonth() + 1), dd = pad(d.getDate());
    fetchFeed('obits', `https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/deaths/${mm}/${dd}`, 6 * 3600e3, (x) => (x.deaths || []).map((e) => ({
      year: e.year, text: e.text, url: e.pages?.[0]?.content_urls?.desktop?.page || ''
    })).sort((a, b) => b.year - a.year));
  }
  if (isOn('air')) {
    const { lat, lon } = settings.location;
    fetchFeed('air', `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5,ozone`, 30 * 60e3, (x) => x.current);
  }
  if (isOn('quakes')) {
    fetchFeed('quakes', 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson', 15 * 60e3, (x) => x.features.map((q) => ({
      mag: q.properties.mag, place: q.properties.place, at: q.properties.time, url: q.properties.url
    })).sort((a, b) => b.mag - a.mag));
  }
  if (isOn('launches')) {
    fetchFeed('launches', 'https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=6&mode=list', 2 * 3600e3, (x) => (x.results || []).map((l) => ({
      name: l.name, at: l.net, pad: l.location, status: l.status?.abbrev
    })));
  }
  if (isOn('iss')) fetchFeed('iss', 'https://api.wheretheiss.at/v1/satellites/25544', 25e3);
}
function backupExtras() {
  const out = {};
  for (const k of ['sp.prices', 'sp.reading', 'sp.course', 'sp.prompts', 'sp.life']) out[k] = store.get(k, null);
  // Extra Quick note widgets each keep their text under their own key
  for (const i of allItems()) if (i.type === 'notes' && i.cfg.key) out[i.cfg.key] = store.get(i.cfg.key, '');
  return out;
}
function restoreExtras(x) {
  for (const [k, v] of Object.entries(x)) if (v !== null) store.set(k, v);
  priceItems = store.get('sp.prices', []);
  reading = store.get('sp.reading', []);
  course = store.get('sp.course', course);
  prompts = store.get('sp.prompts', []);
  life = store.get('sp.life', life);
}

// Died on this day
function renderObits(b, size) {
  if (feedNote(b, 'Died on this day', 'obits')) return;
  const list = feed.obits.data.slice(0, size === 'l' ? 12 : 5);
  b.innerHTML = `<div class="w-head"><h2>Died on this day</h2></div><ol class="news-list">${list.map((e) => `<li><a href="${esc(e.url)}" target="_blank" rel="noopener"><span class="nt">${esc(e.text)}</span><span class="nm">${e.year}</span></a></li>`).join('')}</ol>`;
}
// Air quality
const AQI_BANDS = [[50, 'Good'], [100, 'Moderate'], [150, 'Rough if you’re sensitive'], [200, 'Unhealthy'], [300, 'Very unhealthy'], [999, 'Hazardous']];
function renderAir(b, size) {
  if (feedNote(b, 'Air quality', 'air')) return;
  const a = feed.air.data;
  const band = (AQI_BANDS.find(([n]) => a.us_aqi <= n) || AQI_BANDS[5])[1];
  b.innerHTML = `<div class="w-head"><h2>Air in ${esc(shortPlace())}</h2></div><div class="stat"><strong>${Math.round(a.us_aqi)}</strong><span>${band}</span>${size !== 's' ? `<small>Fine particles ${a.pm2_5} µg/m³</small>` : ''}</div>`;
}
// Earthquakes
function renderQuakes(b, size) {
  if (feedNote(b, 'Earthquakes', 'quakes')) return;
  const list = feed.quakes.data.slice(0, size === 'l' ? 10 : 4);
  b.innerHTML = `<div class="w-head"><h2>Earthquakes, last 24 hours</h2></div>${list.length ? `<ol class="news-list">${list.map((q) => `<li><a href="${esc(q.url)}" target="_blank" rel="noopener"><span class="nt"><b>${q.mag.toFixed(1)}</b> ${esc(q.place)}</span><span class="nm">${esc(ago(new Date(q.at).toISOString()))}</span></a></li>`).join('')}</ol>` : '<p class="note">Nothing above magnitude 4.5. The planet is behaving, for now.</p>'}`;
}
// Rocket launches
function renderLaunches(b, size) {
  if (feedNote(b, 'Rocket launches', 'launches')) return;
  const list = feed.launches.data.slice(0, size === 'l' ? 6 : 3);
  b.innerHTML = `<div class="w-head"><h2>Rocket launches</h2></div><ol class="news-list">${list.map((l) => `<li><span class="nt">${esc(l.name)}</span><span class="nm">${new Date(l.at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}${l.status ? `, ${esc(l.status)}` : ''}</span></li>`).join('')}</ol>`;
}
// Space station
function renderIss(b, size) {
  if (feedNote(b, 'Space station', 'iss')) return;
  const s = feed.iss.data;
  const lat = `${Math.abs(s.latitude).toFixed(1)}° ${s.latitude >= 0 ? 'N' : 'S'}`, lon = `${Math.abs(s.longitude).toFixed(1)}° ${s.longitude >= 0 ? 'E' : 'W'}`;
  const mph = settings.units === 'c' ? `${Math.round(s.velocity).toLocaleString()} km/h` : `${Math.round(s.velocity * 0.621371).toLocaleString()} mph`;
  const map = size === 's' ? '' : `<svg class="iss-map" viewBox="0 0 360 180" aria-hidden="true"><path d="M0 90H360M180 0V180" stroke="currentColor" stroke-width="1" opacity=".25"/><circle cx="${(s.longitude + 180).toFixed(1)}" cy="${(90 - s.latitude).toFixed(1)}" r="6" fill="var(--accent)"/></svg>`;
  b.innerHTML = `<div class="w-head"><h2>Space station</h2></div><div class="iss-row"><div class="stat"><strong class="stat-sm">${lat}<br>${lon}</strong><small>${mph}</small></div>${map}</div>`;
}

// Now reading
let reading = store.get('sp.reading', []);
const saveReading = () => store.set('sp.reading', reading);
async function editBook(p) {
  const v = await formDialog({
    title: p ? 'Edit book' : 'Add a book', ok: p ? 'Save' : 'Add book', extra: p ? 'Delete' : '',
    fields: [
      { key: 'title', label: 'Title', value: p?.title, placeholder: 'Empire of Silence' },
      { key: 'author', label: 'Author', value: p?.author, placeholder: 'Christopher Ruocchio' },
      { key: 'page', label: 'Page you’re on', type: 'number', min: 0, value: p?.page ?? 0 },
      { key: 'total', label: 'Total pages', type: 'number', min: 1, value: p?.total ?? '' }
    ],
    validate: (x) => (!x.title ? 'Give the book a title.' : (+x.total < 1 ? 'Enter how many pages it has.' : ''))
  });
  if (v === ASK_EXTRA) { reading = reading.filter((x) => x !== p); saveReading(); refresh('reading'); return; }
  if (!v) return;
  const it = p || { id: uid() };
  Object.assign(it, { title: v.title, author: v.author, page: Math.min(+v.page || 0, +v.total), total: +v.total });
  if (!p) reading.push(it);
  saveReading(); refresh('reading');
}
function renderReading(b, size) {
  const list = reading.slice(0, size === 'l' ? 6 : size === 'm' ? 2 : 1);
  b.innerHTML = `<div class="w-head"><h2>Now reading</h2><div class="act"><button class="mini ic" type="button" data-a="add" aria-label="Add a book" title="Add a book">${ico('plus')}</button></div></div>
    ${list.length ? `<ul class="books">${list.map((p) => { const pct = Math.round((p.page / p.total) * 100); return `<li data-id="${p.id}"><button class="book-open" type="button" title="Edit"><span class="book-t">${esc(p.title)}</span>${p.author ? `<span class="book-a">${esc(p.author)}</span>` : ''}</button>
      <div class="book-p"><span class="meter"><i style="width:${pct}%"></i></span><span class="book-n">${p.page} of ${p.total}</span><button class="mini ic" type="button" data-step="-10" aria-label="Back 10 pages">${ico('left')}</button><button class="mini ic" type="button" data-step="10" aria-label="Forward 10 pages">${ico('right')}</button></div></li>`; }).join('')}</ul>` : '<p class="note">Add the book you’re on and track your place in it.</p>'}`;
  b.querySelector('[data-a="add"]').addEventListener('click', () => editBook(null));
  b.querySelectorAll('.books li').forEach((li) => {
    const p = reading.find((x) => x.id === li.dataset.id);
    li.querySelector('.book-open').addEventListener('click', () => editBook(p));
    li.querySelectorAll('[data-step]').forEach((s) => s.addEventListener('click', () => { p.page = Math.max(0, Math.min(p.total, p.page + +s.dataset.step)); saveReading(); refresh('reading'); }));
  });
}

// Course tracker
let course = store.get('sp.course', { done: 0, total: 186, next: '' });
const saveCourse = () => store.set('sp.course', course);
function renderCourse(b, size) {
  const pct = Math.round((course.done / course.total) * 100);
  b.innerHTML = `<div class="w-head"><h2>JS and TS course</h2><div class="act"><button class="mini ic" type="button" data-a="edit" aria-label="Edit course" title="Edit">${ico('pencil')}</button></div></div>
    <div class="stat"><strong>${course.done}<small> of ${course.total}</small></strong>${course.next && size !== 's' ? `<span>Next: ${esc(course.next)}</span>` : ''}</div>
    <div class="book-p"><span class="meter"><i style="width:${pct}%"></i></span><button class="mini ic" type="button" data-step="-1" aria-label="One topic back">${ico('left')}</button><button class="mini ic" type="button" data-step="1" aria-label="One topic forward">${ico('right')}</button></div>`;
  b.querySelectorAll('[data-step]').forEach((s) => s.addEventListener('click', () => { course.done = Math.max(0, Math.min(course.total, course.done + +s.dataset.step)); saveCourse(); refresh('course'); }));
  b.querySelector('[data-a="edit"]').addEventListener('click', async () => {
    const v = await formDialog({ title: 'Course progress', fields: [
      { key: 'done', label: 'Topics finished', type: 'number', min: 0, value: course.done },
      { key: 'total', label: 'Total topics', type: 'number', min: 1, value: course.total },
      { key: 'next', label: 'Next topic', value: course.next, placeholder: 'Closures' }
    ] });
    if (!v || v === ASK_EXTRA) return;
    course = { done: Math.min(+v.done || 0, +v.total || 186), total: +v.total || 186, next: v.next };
    saveCourse(); refresh('course');
  });
}

// Prompt launcher
let prompts = store.get('sp.prompts', []);
const savePrompts = () => store.set('sp.prompts', prompts);
async function editPrompt(p) {
  const engines = Object.entries(ENGINES).filter(([k]) => k !== 'google' && k !== 'duckduckgo').map(([k, e]) => [k, e.label]);
  const v = await formDialog({
    title: p ? 'Edit prompt' : 'Save a prompt', ok: p ? 'Save' : 'Add prompt', extra: p ? 'Delete' : '',
    fields: [
      { key: 'label', label: 'Short name', value: p?.label, placeholder: 'Explain this error' },
      { key: 'text', label: 'Prompt', type: 'textarea', value: p?.text, placeholder: 'Explain this error like I’m learning JavaScript:' },
      { key: 'engine', label: 'Open in', type: 'select', options: engines, value: p?.engine || 'claude' }
    ],
    validate: (x) => (!x.label || !x.text ? 'Give it a name and the prompt text.' : '')
  });
  if (v === ASK_EXTRA) { prompts = prompts.filter((x) => x !== p); savePrompts(); refresh('prompts'); return; }
  if (!v) return;
  if (p) Object.assign(p, v); else prompts.push({ id: uid(), ...v });
  savePrompts(); refresh('prompts');
}
function runPrompt(p) {
  const engine = ENGINES[p.engine] || ENGINES.claude;
  if (engine.copy) { copyText(p.text); window.open(engine.url, '_blank', 'noopener'); toast('Prompt copied. Paste it with Ctrl+V.'); }
  else window.open(engine.url + encodeURIComponent(p.text), '_blank', 'noopener');
}
function renderPrompts(b) {
  b.innerHTML = `<div class="w-head"><h2>Prompts</h2><div class="act"><button class="mini ic" type="button" data-a="add" aria-label="Save a prompt" title="Save a prompt">${ico('plus')}</button></div></div>
    ${prompts.length ? `<ul class="prompt-list">${prompts.map((p) => `<li data-id="${p.id}"><button class="prompt-run" type="button" title="${esc(p.text)}">${esc(p.label)}<small>${esc((ENGINES[p.engine] || ENGINES.claude).label)}</small></button><button class="mini ic" type="button" data-a="edit" aria-label="Edit ${esc(p.label)}">${ico('pencil')}</button></li>`).join('')}</ul>` : '<p class="note">Save prompts you use often, and open them in Claude, ChatGPT or Gemini in one click.</p>'}`;
  b.querySelector('[data-a="add"]').addEventListener('click', () => editPrompt(null));
  b.querySelectorAll('.prompt-list li').forEach((li) => {
    const p = prompts.find((x) => x.id === li.dataset.id);
    li.querySelector('.prompt-run').addEventListener('click', () => runPrompt(p));
    li.querySelector('[data-a="edit"]').addEventListener('click', () => editPrompt(p));
  });
}

// Countdown
function renderCountdown(b, size, item) {
  const edit = async () => {
    const v = await formDialog({ title: 'Countdown', fields: [
      { key: 'label', label: 'Counting down to', value: item.cfg.label, placeholder: 'Payday' },
      { key: 'date', label: 'Date', type: 'date', value: item.cfg.date }
    ], validate: (x) => (!x.label || !x.date ? 'Add a name and a date.' : '') });
    if (!v || v === ASK_EXTRA) return;
    item.cfg.label = v.label; item.cfg.date = v.date;
    savePages(); refresh(item.id);
  };
  if (!item.cfg.date) {
    b.innerHTML = '<div class="w-head"><h2>Countdown</h2></div><button class="btn sm" type="button" style="align-self:flex-start">Set a date</button>';
    b.querySelector('button').addEventListener('click', edit);
    return;
  }
  const [y, m, d] = item.cfg.date.split('-').map(Number);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = Math.round((new Date(y, m - 1, d) - today) / 864e5);
  b.innerHTML = `<div class="w-head"><h2>${esc(item.cfg.label)}</h2><div class="act"><button class="mini ic" type="button" aria-label="Edit countdown" title="Edit">${ico('pencil')}</button></div></div>
    <div class="stat"><strong>${Math.abs(days)}</strong><span>${days === 0 ? 'Today' : days > 0 ? (days === 1 ? 'day left' : 'days left') : (days === -1 ? 'day ago' : 'days ago')}</span></div>`;
  b.querySelector('button').addEventListener('click', edit);
}

// Rude decision maker
const VERDICTS = ['Yes, and you’ll regret it.', 'No. Obviously.', 'Ask someone who cares.', 'Do it. Nobody’s watching. Probably.', 'Absolutely not, and I’m disappointed you asked.', 'Sure. What’s the worst that could happen? Don’t answer that.', 'The answer is no, but you’re going to do it anyway.', 'Flip a coin, then ignore it.', 'Yes. Future you can deal with it.', 'It won’t matter in a hundred years. Neither will you.', 'Sleep on it. Then still get it wrong.', 'Fine.'];
let verdict = '';
function renderDecide(b) {
  b.innerHTML = `<div class="w-head"><h2>Should I?</h2></div><form class="decide"><input class="task-input" maxlength="80" placeholder="Ask a yes or no question" aria-label="Your question" autocomplete="off"></form><p class="verdict">${esc(verdict)}</p>`;
  b.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!e.target.querySelector('input').value.trim()) return;
    verdict = VERDICTS[Math.floor(Math.random() * VERDICTS.length)];
    b.querySelector('.verdict').textContent = verdict;
  });
}

// Remaining: your life in weeks
let life = store.get('sp.life', { birth: '', years: 85 });
async function editLife() {
  const v = await formDialog({ title: 'Your weeks', fields: [
    { key: 'birth', label: 'Birth date (stays in this browser)', type: 'date', value: life.birth },
    { key: 'years', label: 'Years you’re assuming', type: 'number', min: 1, value: life.years }
  ], validate: (x) => (!x.birth ? 'Add your birth date.' : '') });
  if (!v || v === ASK_EXTRA) return;
  life = { birth: v.birth, years: +v.years || 85 };
  store.set('sp.life', life); refresh('remaining');
  scene.api?.lifeChanged?.();
}
function renderRemaining(b, size) {
  const edit = editLife;
  if (!life.birth) {
    b.innerHTML = '<div class="w-head"><h2>Weeks remaining</h2></div><p class="note">See your life in weeks. A statistical guess, not a prophecy.</p><button class="btn sm" type="button" style="margin-top:8px;align-self:flex-start">Add your birth date</button>';
    b.querySelector('button').addEventListener('click', edit);
    return;
  }
  const [y, m, d] = life.birth.split('-').map(Number);
  const total = Math.round(life.years * 52.1775);
  const lived = Math.floor((Date.now() - new Date(y, m - 1, d)) / (7 * 864e5));
  const left = Math.max(0, total - lived);
  b.innerHTML = `<div class="w-head"><h2>Weeks remaining</h2><div class="act"><button class="mini ic" type="button" aria-label="Edit" title="Edit">${ico('pencil')}</button></div></div>
    <div class="life"><div class="stat"><strong>${left.toLocaleString()}</strong><span>${left ? 'statistically. Spend this one badly.' : 'You’re into extra time.'}</span></div>${size === 's' ? '' : '<canvas class="life-grid"></canvas>'}</div>`;
  b.querySelector('button').addEventListener('click', edit);
  const c = b.querySelector('.life-grid');
  if (c) {
    requestAnimationFrame(() => {
      const r = c.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      c.width = r.width * dpr; c.height = r.height * dpr;
      const x = c.getContext('2d');
      const cs = getComputedStyle(document.documentElement);
      const pitch = Math.sqrt((c.width * c.height) / total);
      const cols = Math.max(1, Math.floor(c.width / pitch));
      const p = c.width / cols, cell = Math.max(1, p - Math.max(1, p * 0.25));
      for (let i = 0; i < total; i++) {
        x.fillStyle = i === lived ? cs.getPropertyValue('--now') : i < lived ? cs.getPropertyValue('--dim') : cs.getPropertyValue('--line-strong');
        x.fillRect((i % cols) * p, Math.floor(i / cols) * p, cell, cell);
      }
    });
  }
}

Object.assign(WIDGETS, {
  reading:   { name: 'Now reading', blurb: 'The books you’re on and your place in them', sizes: ['s', 'm', 'l'], render: renderReading },
  course:    { name: 'Course tracker', blurb: 'Progress through your JS and TS topics', sizes: ['s', 'm'], render: renderCourse },
  prompts:   { name: 'Prompts', blurb: 'Saved AI prompts, one click to open', sizes: ['m', 'l'], render: renderPrompts },
  countdown: { name: 'Countdown', blurb: 'Days until a date you pick', sizes: ['s', 'm'], render: renderCountdown, multi: true },
  decide:    { name: 'Should I?', blurb: 'A rude yes or no decision maker', sizes: ['s', 'm'], render: renderDecide },
  remaining: { name: 'Weeks remaining', blurb: 'Your life in weeks. Cheerful.', sizes: ['s', 'm', 'l'], render: renderRemaining },
  obits:     { name: 'Died on this day', blurb: 'Notable deaths on today’s date, from Wikipedia', sizes: ['m', 'l'], render: renderObits },
  air:       { name: 'Air quality', blurb: 'Air quality index where you are', sizes: ['s', 'm'], render: renderAir },
  quakes:    { name: 'Earthquakes', blurb: 'Strongest quakes in the last 24 hours, from USGS', sizes: ['m', 'l'], render: renderQuakes },
  launches:  { name: 'Rocket launches', blurb: 'Upcoming launches worldwide', sizes: ['m', 'l'], render: renderLaunches },
  iss:       { name: 'Space station', blurb: 'Where the ISS is right now', sizes: ['s', 'm'], render: renderIss }
});
