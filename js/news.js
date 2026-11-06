'use strict';
// ---------- News ----------
// News sites block web pages from reading their feeds directly, so a scheduled GitHub job
// (scripts/fetch-news.mjs) collects headlines into data/news.json, and this widget reads that file.
const NEWS_SECTIONS = {
  top: 'Top stories', politics: 'Politics', local: 'Local', ai: 'AI', hardware: 'Hardware',
  gaming: 'Gaming', software: 'Software', science: 'Science', space: 'Space'
};
let newsData = null, newsError = '', newsAt = 0;
async function loadNews(force) {
  if (!isOn('news') || document.hidden) return;
  if (!force && newsAt && Date.now() - newsAt < 10 * 60e3) return;
  newsAt = Date.now();
  try {
    const res = await fetch(`data/news.json?v=${Math.floor(Date.now() / 300000)}`);
    if (!res.ok) throw new Error(res.status);
    newsData = await res.json();
    newsError = '';
  } catch {
    newsError = 'Headlines aren’t available right now. They’ll come back on the next update.';
  }
  refresh('news');
}
function renderNews(b, size, item) {
  const shown = (item.cfg.sections || Object.keys(NEWS_SECTIONS)).filter((k) => NEWS_SECTIONS[k]);
  const active = shown.includes(item.cfg.active) ? item.cfg.active : shown[0];
  const editing = item.cfg.editing;
  const tabs = shown.map((k) => `<button class="tab" type="button" role="tab" data-k="${k}" aria-selected="${k === active}">${NEWS_SECTIONS[k]}</button>`).join('');
  const updated = newsData?.at ? `Updated ${ago(newsData.at)}` : '';
  let main;
  if (editing) {
    main = `<p class="note">Choose the topics this widget shows.</p><div class="news-pick">${Object.entries(NEWS_SECTIONS).map(([k, n]) => `<label><input type="checkbox" value="${k}" ${shown.includes(k) ? 'checked' : ''}><span>${n}</span></label>`).join('')}</div>`;
  } else if (!newsData) {
    main = `<p class="note">${esc(newsError || 'Loading headlines…')}</p>`;
  } else {
    const list = (newsData.sections?.[active] || []).slice(0, size === 'm' ? 6 : 20);
    main = list.length
      ? `<ol class="news-list news-${size}">${list.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener"><span class="nt">${esc(s.title)}</span><span class="nm">${esc(s.source)}, ${esc(ago(s.at))}</span></a></li>`).join('')}</ol>`
      : '<p class="note">Nothing new here in the last few days.</p>';
  }
  b.innerHTML = `<div class="w-head"><div class="tabs" role="tablist" aria-label="News topics">${tabs}</div>
    <div class="act"><button class="mini ${editing ? 'on' : ''}" type="button" data-a="edit" title="${esc(updated)}">${editing ? 'Done' : 'Topics'}</button></div></div>${main}`;
  b.querySelectorAll('[data-k]').forEach((t) => t.addEventListener('click', () => { item.cfg.active = t.dataset.k; item.cfg.editing = false; savePages(); refresh(item.id); }));
  b.querySelector('[data-a="edit"]').addEventListener('click', () => { item.cfg.editing = !editing; refresh(item.id); });
  b.querySelector('.news-pick')?.addEventListener('change', () => {
    const on = [...b.querySelectorAll('.news-pick input:checked')].map((c) => c.value);
    if (!on.length) return;
    item.cfg.sections = on;
    savePages(); refresh(item.id);
  });
}
WIDGETS.news = { name: 'News', blurb: 'Top stories, politics, local, tech and science headlines', sizes: ['m', 'l', 'w'], render: renderNews, multi: true };
