'use strict';
// ---------- Price tracker ----------
// Stores don't allow other sites to read their prices, so you log a price when you check one.
// The widget keeps the history, flags when you hit your target, and gives one-click links to check.
let priceItems = store.get('sp.prices', []);
const savePrices = () => store.set('sp.prices', priceItems);
const money = (n) => (n == null || isNaN(n) ? '--' : `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`);
const parsePrice = (s) => { const n = parseFloat(String(s).replace(/[$,\s]/g, '')); return isFinite(n) && n >= 0 ? n : null; };
const lastPrice = (p) => p.history[p.history.length - 1]?.price;
function amazonHistory(url) {
  const m = /amazon\.[^/]+\/(?:.*\/)?(?:dp|gp\/product)\/([A-Z0-9]{10})/i.exec(url || '');
  return m ? `https://camelcamelcamel.com/product/${m[1]}` : '';
}
function sparkline(history) {
  if (history.length < 2) return '';
  const vals = history.map((h) => h.price), min = Math.min(...vals), max = Math.max(...vals), span = max - min || 1;
  const pts = vals.map((v, i) => `${((i / (vals.length - 1)) * 60).toFixed(1)},${(16 - ((v - min) / span) * 14).toFixed(1)}`).join(' ');
  return `<svg class="spark" viewBox="0 0 60 18" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>`;
}
async function editPrice(p) {
  const v = await formDialog({
    title: p ? 'Edit product' : 'Track a product', ok: p ? 'Save' : 'Add product', extra: p ? 'Delete' : '',
    fields: [
      { key: 'name', label: 'Product', value: p?.name, placeholder: 'RTX 5070' },
      { key: 'url', label: 'Link to the product', value: p?.url, placeholder: 'amazon.com/dp/...' },
      { key: 'price', label: p ? 'Price right now (leave blank to keep)' : 'Price right now', placeholder: '549.99' },
      { key: 'target', label: 'Tell me when it hits', value: p?.target ?? '', placeholder: '499' }
    ],
    validate(x) {
      if (!x.name) return 'Give the product a name.';
      if (x.url && !normalizeUrl(x.url)) return 'That link doesn’t look right.';
      if (x.price && parsePrice(x.price) === null) return 'Enter the price as a number, like 549.99.';
      if (x.target && parsePrice(x.target) === null) return 'Enter the target as a number, like 499.';
      return '';
    }
  });
  if (v === ASK_EXTRA) { priceItems = priceItems.filter((x) => x !== p); savePrices(); refresh('prices'); return; }
  if (!v) return;
  const it = p || { id: uid(), history: [] };
  it.name = v.name; it.url = v.url ? normalizeUrl(v.url) : ''; it.target = v.target ? parsePrice(v.target) : null;
  if (v.price) it.history.push({ at: Date.now(), price: parsePrice(v.price) });
  if (!p) priceItems.push(it);
  savePrices(); refresh('prices');
}
async function logPrice(p) {
  const v = await ask({ title: `Price of ${p.name}`, label: 'Price right now', value: lastPrice(p) ?? '', ok: 'Log price' });
  if (v === null) return;
  const n = parsePrice(v);
  if (n === null) { toast('Enter the price as a number, like 549.99.'); return; }
  p.history.push({ at: Date.now(), price: n });
  savePrices(); refresh('prices');
  if (p.target != null && n <= p.target) toast(`${p.name} hit your target of ${money(p.target)}.`);
}
function renderPrices(b, size) {
  const rows = priceItems.map((p) => {
    const now = lastPrice(p), first = p.history[0]?.price, low = p.history.length ? Math.min(...p.history.map((h) => h.price)) : null;
    const hit = p.target != null && now != null && now <= p.target;
    const change = now != null && first ? Math.round(((now - first) / first) * 100) : 0;
    const camel = amazonHistory(p.url);
    return `<li class="pr ${hit ? 'hit' : ''}" data-id="${p.id}">
      <div class="pr-main">${p.url ? `<a class="pr-name" href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.name)}</a>` : `<span class="pr-name">${esc(p.name)}</span>`}
        <span class="pr-meta">${p.target != null ? `Target ${money(p.target)}` : 'No target'}${hit ? ', hit' : ''}${size === 'l' && low != null ? `, low ${money(low)}` : ''}${change ? `, ${change > 0 ? 'up' : 'down'} ${Math.abs(change)}%` : ''}${p.history.length ? `, checked ${esc(ago(new Date(p.history[p.history.length - 1].at).toISOString()))}` : ''}</span></div>
      ${sparkline(p.history)}
      <button class="pr-price" type="button" data-a="log" title="Log the current price">${money(now)}</button>
      <span class="pr-tools">${camel ? `<a class="mini" href="${camel}" target="_blank" rel="noopener" title="Amazon price history">History</a>` : ''}
      <a class="mini" href="https://www.google.com/search?tbm=shop&q=${encodeURIComponent(p.name)}" target="_blank" rel="noopener" title="Compare prices">Compare</a>
      <button class="mini ic" type="button" data-a="edit" aria-label="Edit ${esc(p.name)}">${ico('pencil')}</button></span></li>`;
  }).join('');
  b.innerHTML = `<div class="w-head"><h2>Prices</h2><div class="act"><button class="mini ic" type="button" data-a="add" aria-label="Track a product" title="Track a product">${ico('plus')}</button></div></div>
    ${rows ? `<ul class="prices">${rows}</ul>` : '<p class="note">Add a product and a target price. Click a price to log a new one, and the widget tracks the history.</p>'}`;
  b.querySelector('[data-a="add"]').addEventListener('click', () => editPrice(null));
  b.querySelectorAll('.pr').forEach((row) => {
    const p = priceItems.find((x) => x.id === row.dataset.id);
    row.querySelector('[data-a="log"]').addEventListener('click', () => logPrice(p));
    row.querySelector('[data-a="edit"]').addEventListener('click', () => editPrice(p));
  });
}
WIDGETS.prices = { name: 'Prices', blurb: 'Products you’re watching, with targets and price history', sizes: ['m', 'l'], render: renderPrices };
