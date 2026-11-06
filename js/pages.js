'use strict';
// ---------- Pages: each page has its own snap grid of widgets ----------
// A page is { id, name, items }. A widget on a page is { id, type, size, on, cfg }, so the same
// kind of widget can appear more than once with its own settings (cfg).
const PAGE_ROWS = 4;
let pages = [];
let currentPage = 0;
let arranging = false;

const newItem = (type, size, on = true, cfg = {}) => ({ id: uid(), type, size, on, cfg });
const allItems = () => pages.flatMap((p) => p.items);
const itemById = (id) => allItems().find((i) => i.id === id);
const pageOfItem = (id) => pages.find((p) => p.items.some((i) => i.id === id));
const isOn = (type) => allItems().some((i) => i.type === type && i.on);
const savePages = () => store.set('sp.pages', pages);

function defaultPages(firstSites) {
  return [
    { id: uid(), name: 'Home', items: [
      newItem('clock', 'l'), newItem('weather', 'm'), newItem('sky', 'm'),
      newItem('search', 'm'), newItem('alerts', 'm'),
      newItem('sites', 'm', true, { sites: firstSites || structuredClone(DEFAULT_SITES) }), newItem('notes', 'm')
    ]},
    { id: uid(), name: 'Desk', items: [
      newItem('news', 'l'), newItem('calendar', 'l'),
      newItem('projects', 'l'), newItem('reading', 'm'), newItem('prices', 'm'),
      ...offWidgets()
    ]}
  ];
}
// Off to begin with: turn these on in Settings
function offWidgets() {
  return [
    newItem('sites', 'm', false, { title: 'Work', sites: { active: 'w1', groups: [{ id: 'w1', name: 'Work', sites: [] }] } }),
    newItem('tasks', 'm', false), newItem('focus', 's', false),
    newItem('obits', 'm', false), newItem('air', 's', false), newItem('quakes', 'm', false),
    newItem('launches', 'm', false), newItem('iss', 's', false), newItem('remaining', 'm', false),
    newItem('course', 's', false), newItem('prompts', 'm', false), newItem('countdown', 's', false),
    newItem('decide', 'm', false)
  ];
}

function normalizePages(list) {
  const out = (Array.isArray(list) ? list : []).filter((p) => p && Array.isArray(p.items)).map((p) => ({
    id: p.id || uid(),
    name: p.name || 'Page',
    items: p.items.filter((i) => i && WIDGETS[i.type]).map((i) => ({ ...i, cfg: i.cfg || {} }))
  }));
  if (!out.length) return defaultPages();
  // Widgets added in a later update show up in Settings, turned off
  for (const d of [...defaultPages()[0].items, ...defaultPages()[1].items]) {
    if (!out.some((p) => p.items.some((i) => i.type === d.type))) out[out.length - 1].items.push({ ...d, on: false });
  }
  for (const i of out.flatMap((p) => p.items)) if (!WIDGETS[i.type].sizes.includes(i.size)) i.size = WIDGETS[i.type].sizes[0];
  return out;
}

// Upgrade the single layout from before pages existed, keeping your order and sizes
const SPAN = { s: [1, 1], m: [2, 1], l: [2, 2], w: [4, 1] };
function pagesFromOldLayout(old, oldSites) {
  const fits = (grid, c, r, w, h) => {
    if (c + w > 4 || r + h > PAGE_ROWS) return false;
    for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) if (grid[y]?.[x]) return false;
    return true;
  };
  const place = (grid, size) => {
    const [w, h] = SPAN[size];
    for (let r = 0; r < PAGE_ROWS; r++) for (let c = 0; c < 4; c++) if (fits(grid, c, r, w, h)) {
      for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) (grid[y] = grid[y] || [])[x] = true;
      return true;
    }
    return false;
  };
  const made = [{ id: uid(), name: 'Home', items: [] }];
  let grid = [];
  const add = (it) => {
    if (it.on && !place(grid, it.size)) {
      grid = [];
      place(grid, it.size);
      made.push({ id: uid(), name: made.length === 1 ? 'Desk' : `Page ${made.length + 1}`, items: [] });
    }
    made[made.length - 1].items.push(it);
  };
  const on = old.filter((w) => w.on);
  for (const w of on) {
    const cfg = w.id === 'sites' ? { sites: oldSites || store.get('np.sites', null) || structuredClone(DEFAULT_SITES) } : {};
    // The trains board made way for Service alerts in its old spot
    add(newItem(w.id === 'transit' ? 'alerts' : w.id, w.id === 'transit' ? 'm' : w.size, true, cfg));
  }
  for (const [type, size] of [['news', 'l'], ['reading', 'm'], ['prices', 'm']]) add(newItem(type, size));
  const last = made[made.length - 1];
  const offOld = old.filter((w) => !w.on).map((w) => newItem(w.id, w.size, false));
  last.items.push(...offOld);
  for (const it of offWidgets()) {
    if (it.type === 'sites' || !last.items.some((i) => i.type === it.type) && !made.some((p) => p.items.some((i) => i.type === it.type))) last.items.push(it);
  }
  return normalizePages(made);
}

function initPages() {
  const saved = store.get('sp.pages', null);
  if (saved) pages = normalizePages(saved);
  else {
    const old = store.get('sp.layout', null);
    pages = old ? pagesFromOldLayout(old) : defaultPages(store.get('np.sites', null));
    savePages();
  }
  currentPage = Math.min(store.get('sp.page', 0), pages.length - 1);
}

// ---------- Building widgets ----------
function sizeGlyph(s) {
  const used = { s: ['0,0'], m: ['0,0', '5,0'], l: ['0,0', '5,0', '0,5', '5,5'], w: ['0,0', '5,0', '10,0', '15,0'] }[s];
  let rects = '';
  for (const y of [0, 5]) for (const x of [0, 5, 10, 15]) {
    rects += `<rect x="${x}" y="${y}" width="4" height="4" rx="1" opacity="${used.includes(`${x},${y}`) ? 1 : 0.28}"/>`;
  }
  return `<svg viewBox="0 0 19 9" fill="currentColor" aria-hidden="true">${rects}</svg>`;
}
const itemLabel = (item) => item.cfg.title || WIDGETS[item.type].name;

function buildChrome(item, def) {
  const c = document.createElement('div');
  c.className = 'chrome';
  const label = esc(itemLabel(item));
  c.innerHTML = `<button class="grip" type="button" aria-label="Move ${label}. Arrow keys move it earlier or later.">${ico('grip')}<span>${label}</span></button>
    <div class="sizes" role="radiogroup" aria-label="${label} size">${def.sizes.map((s) => `<button type="button" role="radio" data-size="${s}" aria-checked="${s === item.size}" title="${SIZES[s]}" aria-label="${SIZES[s]}">${sizeGlyph(s)}</button>`).join('')}</div>
    ${pages.length > 1 ? `<select class="move-page" aria-label="Move ${label} to another page" title="Move to another page">${pages.map((p) => `<option value="${p.id}" ${p.items.includes(item) ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>` : ''}
    <button class="hide-w" type="button" aria-label="Hide ${label}" title="Hide">${ico('eyeoff')}</button>`;
  c.querySelector('.sizes').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setSize(item.id, b.dataset.size); });
  c.querySelector('.hide-w').addEventListener('click', () => hideWidget(item.id));
  c.querySelector('.move-page')?.addEventListener('change', (e) => moveToPage(item.id, e.target.value));
  c.querySelector('.grip').addEventListener('keydown', (e) => {
    const dir = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key];
    if (!dir) return;
    e.preventDefault();
    e.stopPropagation();
    const el = mounted[item.id].el;
    const all = [...el.parentElement.children];
    const target = all[all.indexOf(el) + dir];
    if (!target) return;
    flip(() => moveWidget(el, target));
    savePages(); renderWidgetList();
    el.querySelector('.grip').focus();
  });
  return c;
}

function buildWidget(item) {
  const def = WIDGETS[item.type];
  const el = document.createElement('section');
  el.className = `widget w-${item.size}${def.bare ? ' bare' : ''}`;
  el.dataset.id = item.id;
  el.dataset.type = item.type;
  el.setAttribute('aria-label', itemLabel(item));
  const body = document.createElement('div');
  body.className = 'body';
  el.append(body, buildChrome(item, def));
  mounted[item.id] = { el, body };
  def.render(body, item.size, item);
  return el;
}

function renderBoard() {
  const wrap = $('pages');
  const swipe = settings.swipe;
  wrap.replaceChildren();
  for (const key of Object.keys(mounted)) delete mounted[key];
  wrap.className = `pages ${swipe ? 'swipe' : 'stack'}`;
  document.body.classList.toggle('swipe-mode', swipe);
  for (const page of pages) {
    const sec = document.createElement('section');
    sec.className = 'page';
    sec.dataset.page = page.id;
    sec.setAttribute('aria-label', page.name);
    const inner = document.createElement('div');
    inner.className = 'page-inner';
    if (!swipe && pages.length > 1) {
      const h = document.createElement('h2');
      h.className = 'page-name'; h.textContent = page.name;
      inner.append(h);
    }
    const board = document.createElement('div');
    board.className = 'board';
    for (const item of page.items) if (item.on) board.append(buildWidget(item));
    if (!board.children.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-board';
      empty.innerHTML = `<p>“${esc(page.name)}” is empty.</p><button class="btn primary" type="button">Add widgets</button>`;
      empty.querySelector('button').addEventListener('click', () => { goToPage(pages.indexOf(page), false); openSettings('set-widgets'); });
      board.append(empty);
    }
    inner.append(board);
    sec.append(inner);
    wrap.append(sec);
  }
  sizeRows();
  renderPageTabs();
  goToPage(currentPage, false);
}

// Every copy of a widget type, or one widget by id
function refresh(key) {
  for (const item of allItems()) {
    if (item.id !== key && item.type !== key) continue;
    const m = mounted[item.id];
    if (m && m.el.isConnected) WIDGETS[item.type].render(m.body, item.size, item);
  }
}

// In swipe mode the rows stretch so a full page fits the window without scrolling
function sizeRows() {
  const root = document.documentElement;
  if (!settings.swipe) { root.style.removeProperty('--row'); return; }
  const avail = innerHeight - $('topbar').offsetHeight - 34;
  const gap = 14;
  const row = Math.round((avail - gap * (PAGE_ROWS - 1)) / PAGE_ROWS);
  root.style.setProperty('--row', `${Math.max(132, Math.min(row, 210))}px`);
}
addEventListener('resize', () => { sizeRows(); goToPage(currentPage, false); });

// ---------- Moving between pages ----------
function goToPage(i, smooth = true) {
  currentPage = Math.max(0, Math.min(i, pages.length - 1));
  store.set('sp.page', currentPage);
  const wrap = $('pages');
  const target = wrap.children[currentPage];
  if (target) {
    const behavior = smooth && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto';
    if (settings.swipe) wrap.scrollTo({ left: target.offsetLeft, behavior });
    else if (smooth) target.scrollIntoView({ behavior, block: 'start' });
  }
  markCurrentTab();
}
function markCurrentTab() {
  document.querySelectorAll('.page-tab').forEach((t, n) => t.setAttribute('aria-current', String(n === currentPage)));
}
// Follow the page you swiped to
$('pages').addEventListener('scroll', () => {
  if (!settings.swipe) return;
  const wrap = $('pages');
  const i = Math.round(wrap.scrollLeft / Math.max(1, wrap.clientWidth));
  if (i !== currentPage && i < pages.length) { currentPage = i; store.set('sp.page', i); markCurrentTab(); }
}, { passive: true });
// A mouse wheel turns the page too, unless the pointer is over a list that can still scroll
let wheelLock = 0;
$('pages').addEventListener('wheel', (e) => {
  if (!settings.swipe || arranging || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
  for (let n = e.target; n && n !== e.currentTarget; n = n.parentElement) {
    const can = n.scrollHeight > n.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(n).overflowY);
    if (can && (e.deltaY > 0 ? n.scrollTop + n.clientHeight < n.scrollHeight - 1 : n.scrollTop > 0)) return;
  }
  const now = performance.now();
  if (now - wheelLock < 650 || Math.abs(e.deltaY) < 8) return;
  wheelLock = now;
  goToPage(currentPage + (e.deltaY > 0 ? 1 : -1));
}, { passive: true });

function renderPageTabs() {
  const nav = $('pageTabs');
  nav.replaceChildren();
  pages.forEach((page, i) => {
    const t = document.createElement('button');
    t.type = 'button'; t.className = 'page-tab'; t.textContent = page.name; t.draggable = true;
    t.title = 'Double-click to rename. Drag to reorder.';
    t.addEventListener('click', () => goToPage(i));
    t.addEventListener('dblclick', () => renamePage(page));
    t.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', 'page:' + page.id));
    t.addEventListener('dragover', (e) => { e.preventDefault(); t.classList.add('drop'); });
    t.addEventListener('dragleave', () => t.classList.remove('drop'));
    t.addEventListener('drop', (e) => {
      e.preventDefault(); t.classList.remove('drop');
      const d = e.dataTransfer.getData('text/plain');
      if (!d.startsWith('page:')) return;
      const from = pages.findIndex((p) => p.id === d.slice(5));
      if (from >= 0 && from !== i) { const [m] = pages.splice(from, 1); pages.splice(i, 0, m); currentPage = i; savePages(); renderBoard(); renderPageList(); }
    });
    nav.append(t);
  });
  const add = document.createElement('button');
  add.type = 'button'; add.className = 'page-tab page-add'; add.innerHTML = ico('plus');
  add.title = 'Add a page'; add.setAttribute('aria-label', 'Add a page');
  add.addEventListener('click', addPage);
  nav.append(add);
  markCurrentTab();
}

async function addPage() {
  const name = await ask({ title: 'New page', label: 'Page name', ok: 'Add page' });
  if (!name) return;
  pages.push({ id: uid(), name, items: [] });
  currentPage = pages.length - 1;
  savePages(); renderBoard(); syncPagesUI();
}
async function renamePage(page) {
  const name = await ask({ title: 'Rename page', label: 'Page name', value: page.name, ok: 'Rename' });
  if (!name) return;
  page.name = name;
  savePages(); renderBoard(); syncPagesUI();
}
async function deletePage(page) {
  if (pages.length === 1) { toast('Keep at least one page. Rename this one instead.'); return; }
  const yes = await ask({ title: `Delete “${page.name}”?`, text: 'Its widgets stay in Settings, turned off, with their contents intact.', ok: 'Delete page', danger: true });
  if (!yes) return;
  const i = pages.indexOf(page);
  pages.splice(i, 1);
  pages[Math.max(0, i - 1)].items.push(...page.items.map((it) => ({ ...it, on: false })));
  currentPage = Math.max(0, Math.min(currentPage, pages.length - 1));
  savePages(); renderBoard(); syncPagesUI();
}
function syncPagesUI() { renderPageList(); renderWidgetList(); }

// ---------- Arranging ----------
function flip(change) {
  const els = [...document.querySelectorAll('.widget')];
  const before = new Map(els.map((e) => [e, e.getBoundingClientRect()]));
  change();
  for (const e of document.querySelectorAll('.widget')) {
    const a = before.get(e);
    if (!a || e.classList.contains('lifted')) continue;
    const b = e.getBoundingClientRect();
    const dx = a.left - b.left, dy = a.top - b.top;
    if (dx || dy) e.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 260, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
  }
}
function moveWidget(el, target) {
  const fromPage = pageOfItem(el.dataset.id), toPage = pageOfItem(target.dataset.id);
  const fromI = fromPage.items.findIndex((i) => i.id === el.dataset.id);
  const toI = toPage.items.findIndex((i) => i.id === target.dataset.id);
  const [item] = fromPage.items.splice(fromI, 1);
  toPage.items.splice(fromPage === toPage ? toI : toI + 1, 0, item);
  if (fromPage === toPage && fromI > toI) target.before(el); else target.after(el);
}
function moveToPage(id, pageId) {
  const from = pageOfItem(id), to = pages.find((p) => p.id === pageId);
  if (!from || !to || from === to) return;
  const item = from.items.find((i) => i.id === id);
  from.items = from.items.filter((i) => i !== item);
  to.items.push(item);
  savePages(); renderBoard(); renderWidgetList();
  toast(`Moved ${itemLabel(item)} to ${to.name}.`, { label: 'Go there', run() { goToPage(pages.indexOf(to)); } });
}
function setSize(id, size) {
  const item = itemById(id);
  if (!item || item.size === size) return;
  flip(() => {
    item.size = size;
    const { el, body } = mounted[id];
    el.classList.remove('w-s', 'w-m', 'w-l', 'w-w');
    el.classList.add(`w-${size}`);
    el.querySelectorAll('.sizes button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.size === size)));
    WIDGETS[item.type].render(body, size, item);
  });
  savePages(); renderWidgetList();
}
function hideWidget(id) {
  const item = itemById(id);
  flip(() => { item.on = false; mounted[id]?.el.remove(); delete mounted[id]; });
  savePages(); renderWidgetList();
  toast(`${itemLabel(item)} hidden.`, { label: 'Undo', run() { item.on = true; savePages(); renderBoard(); renderWidgetList(); } });
}
function setArranging(on) {
  arranging = on;
  document.body.classList.toggle('arranging', on);
  $('arrangeBtn').setAttribute('aria-pressed', String(on));
  $('arrangeBar').hidden = !on;
  if (on && sitesEditing.size) { const ids = [...sitesEditing]; sitesEditing.clear(); ids.forEach(refresh); }
}
$('pages').addEventListener('pointerdown', (e) => {
  if (!arranging || e.button !== 0) return;
  const el = e.target.closest('.widget');
  if (!el || e.target.closest('select') || (e.target.closest('button') && !e.target.closest('.grip'))) return;
  e.preventDefault();
  const start = el.getBoundingClientRect();
  const off = { x: e.clientX - start.left, y: e.clientY - start.top };
  let pointer = { x: e.clientX, y: e.clientY }, lastTarget = null, lastSwap = 0;
  el.classList.add('lifted');
  // Keep the lifted widget under the pointer, wherever its grid slot currently is
  const place = () => {
    const b = el.parentElement.getBoundingClientRect();
    el.style.transform = `translate(${pointer.x - off.x - b.left - el.offsetLeft}px, ${pointer.y - off.y - b.top - el.offsetTop}px) scale(1.02)`;
  };
  const onMove = (ev) => {
    pointer = { x: ev.clientX, y: ev.clientY };
    const target = document.elementsFromPoint(pointer.x, pointer.y)
      .map((n) => n.closest && n.closest('.widget')).find((w) => w && w !== el);
    if (target && target !== lastTarget && performance.now() - lastSwap > 140) {
      lastTarget = target; lastSwap = performance.now();
      flip(() => moveWidget(el, target));
    }
    if (!target) lastTarget = null;
    place();
  };
  // Listen on the window: moving the widget in the page would drop a pointer capture on the element
  const onUp = () => {
    removeEventListener('pointermove', onMove);
    removeEventListener('pointerup', onUp);
    removeEventListener('pointercancel', onUp);
    const from = el.style.transform;
    el.style.transform = '';
    el.classList.remove('lifted');
    el.animate([{ transform: from }, { transform: 'none' }], { duration: 220, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
    savePages(); renderWidgetList();
  };
  addEventListener('pointermove', onMove);
  addEventListener('pointerup', onUp);
  addEventListener('pointercancel', onUp);
  place();
});
$('arrangeBtn').addEventListener('click', () => setArranging(!arranging));
$('doneArranging').addEventListener('click', () => setArranging(false));
$('addWidgets').addEventListener('click', () => openSettings('set-widgets'));

// ---------- Settings: pages and widgets ----------
function renderPageList() {
  const ul = $('pageList');
  ul.replaceChildren();
  pages.forEach((page, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<input class="input" value="${esc(page.name)}" maxlength="24" aria-label="Page name">
      <button class="mini ic" type="button" aria-label="Move ${esc(page.name)} earlier" ${i === 0 ? 'disabled' : ''}>${ico('left')}</button>
      <button class="mini ic" type="button" aria-label="Move ${esc(page.name)} later" ${i === pages.length - 1 ? 'disabled' : ''}>${ico('right')}</button>
      <button class="mini ic" type="button" aria-label="Delete ${esc(page.name)}">${ico('x')}</button>`;
    li.querySelector('input').addEventListener('change', (e) => {
      if (!e.target.value.trim()) { e.target.value = page.name; return; }
      page.name = e.target.value.trim(); savePages(); renderBoard(); renderWidgetList();
    });
    const [back, next, del] = li.querySelectorAll('button');
    const shift = (d) => { pages.splice(i, 1); pages.splice(i + d, 0, page); currentPage = i + d; savePages(); renderBoard(); syncPagesUI(); };
    back.addEventListener('click', () => shift(-1));
    next.addEventListener('click', () => shift(1));
    del.addEventListener('click', () => deletePage(page));
    ul.append(li);
  });
}

function renderWidgetList() {
  const ul = $('widgetList');
  ul.replaceChildren();
  const rows = pages.flatMap((p) => p.items.map((item) => ({ item, page: p })));
  const on = rows.filter((r) => r.item.on), off = rows.filter((r) => !r.item.on);
  const heading = (text) => { const h = document.createElement('li'); h.className = 'wlist-head'; h.textContent = text; ul.append(h); };
  for (const p of pages) {
    const here = on.filter((r) => r.page === p);
    if (!here.length) continue;
    heading(p.name);
    here.forEach(addRow);
  }
  if (off.length) { heading('Turned off'); off.forEach(addRow); }

  function addRow({ item, page }) {
    const def = WIDGETS[item.type];
    const li = document.createElement('li');
    li.className = item.on ? '' : 'off';
    const copies = allItems().filter((i) => i.type === item.type).length;
    li.innerHTML = `<div class="wname">${def.multi
      ? `<input class="input wtitle" value="${esc(item.cfg.title || '')}" placeholder="${esc(def.name)}" maxlength="24" aria-label="Name for this ${esc(def.name)} widget">`
      : `<strong>${esc(def.name)}</strong>`}<small>${esc(def.blurb)}</small></div>
      <div class="wctl">
        <select aria-label="${esc(def.name)} size">${def.sizes.map((s) => `<option value="${s}" ${s === item.size ? 'selected' : ''}>${SIZES[s]}</option>`).join('')}</select>
        ${item.on && pages.length > 1 ? `<select class="wpage" aria-label="Page for ${esc(def.name)}">${pages.map((p) => `<option value="${p.id}" ${p === page ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>` : ''}
        ${def.multi && copies > 1 ? `<button class="mini ic wremove" type="button" aria-label="Remove this ${esc(def.name)} widget" title="Remove">${ico('x')}</button>` : ''}
        <input type="checkbox" class="switch" aria-label="Show ${esc(def.name)}" ${item.on ? 'checked' : ''}>
      </div>`;
    li.querySelector('.wtitle')?.addEventListener('change', (e) => { item.cfg.title = e.target.value.trim(); savePages(); renderBoard(); });
    li.querySelector('select').addEventListener('change', (e) => { item.size = e.target.value; savePages(); renderBoard(); });
    li.querySelector('.wpage')?.addEventListener('change', (e) => moveToPage(item.id, e.target.value));
    li.querySelector('.wremove')?.addEventListener('click', async () => {
      const yes = await ask({ title: `Remove this ${def.name} widget?`, text: 'Whatever it holds goes with it.', ok: 'Remove widget', danger: true });
      if (!yes) return;
      page.items = page.items.filter((i) => i !== item);
      savePages(); renderBoard(); renderWidgetList();
    });
    li.querySelector('.switch').addEventListener('change', (e) => {
      item.on = e.target.checked;
      if (item.on) {
        // A widget you switch on lands on the page you're looking at
        const here = pages[currentPage];
        if (page !== here) { page.items = page.items.filter((i) => i !== item); here.items.push(item); }
      }
      savePages(); renderBoard(); renderWidgetList();
      if (item.on) refreshData(item.type);
    });
    ul.append(li);
  }
  // Fill the "add another" picker with the widgets that can repeat
  const pick = $('addWidgetType');
  pick.innerHTML = Object.entries(WIDGETS).filter(([, d]) => d.multi).map(([k, d]) => `<option value="${k}">${esc(d.name)}</option>`).join('');
}
$('addWidgetBtn').addEventListener('click', () => {
  const type = $('addWidgetType').value;
  const def = WIDGETS[type];
  const cfg = type === 'notes' ? { key: 'sp.notes.' + uid() } : {};
  pages[currentPage].items.push(newItem(type, def.sizes.includes('m') ? 'm' : def.sizes[0], true, cfg));
  savePages(); renderBoard(); renderWidgetList();
  toast(`Added ${def.name} to ${pages[currentPage].name}.`);
});
$('addPage').addEventListener('click', addPage);
$('swipePages').addEventListener('change', (e) => { settings.swipe = e.target.checked; saveSettings(); renderBoard(); });
function refreshData(type) {
  if (type === 'alerts') loadAlerts(true);
  if (type === 'projects') loadGitHub();
  if (type === 'news') loadNews();
  loadExtras();
}
