'use strict';
// ---------- Service alerts ----------
// You pick the SEPTA lines you ride, and this only speaks up when one of them has a change or disruption.
// A scheduled GitHub job (scripts/fetch-alerts.mjs) collects SEPTA's alerts into data/alerts.json.
const LINE_GROUPS = [
  ['Metro', [['M1', 'M', 'Norristown High Speed Line'], ['L1', 'L', 'Market-Frankford Line'], ['B1', 'B', 'Broad Street Line'], ['B2', 'B2', 'Broad Street Express'], ['B3', 'B3', 'Broad-Ridge Spur']]],
  ['Regional Rail', [['AIR', 'Airport', 'Airport Line'], ['CHE', 'CH East', 'Chestnut Hill East'], ['CHW', 'CH West', 'Chestnut Hill West'], ['CYN', 'Cynwyd', 'Cynwyd Line'], ['FOX', 'Fox Chase', 'Fox Chase Line'], ['LAN', 'Lansdale', 'Lansdale/Doylestown'], ['MED', 'Media', 'Media/Wawa'], ['NOR', 'Norristown', 'Manayunk/Norristown'], ['PAO', 'Paoli', 'Paoli/Thorndale'], ['TRE', 'Trenton', 'Trenton Line'], ['WAR', 'Warminster', 'Warminster Line'], ['WTR', 'W Trenton', 'West Trenton'], ['WIL', 'Wilmington', 'Wilmington/Newark']]],
  ['Trolley', [['D1', 'D1', 'Route 101, Media'], ['D2', 'D2', 'Route 102, Sharon Hill'], ['G1', 'G', 'Route 15, Girard'], ['T1', 'T1', 'Route 10, Overbrook'], ['T2', 'T2', 'Route 34, Angora'], ['T3', 'T3', 'Route 13, Yeadon and Darby'], ['T4', 'T4', 'Route 11, Darby'], ['T5', 'T5', 'Route 36, Eastwick']]],
  ['Bus', [['1', 'Parx Casino to 54th-City'], ['103', 'Ardmore to 69th St'], ['104', 'West Chester U to 69th St'], ['105', 'Paoli to 69th St'], ['107', 'Lawrence Park to 69th St'], ['108', 'Airport to 69th St'], ['109', 'Chester to 69th St'], ['110', 'Penn State to 69th St'], ['111', 'Chadds Ford to 69th St'], ['112', 'DCCC to 69th St'], ['113', 'Claymont to 69th St'], ['114', 'Wawa to Darby'], ['115', 'Darby to Airport'], ['117', 'Penn State to I-95 Industrial Park'], ['118', 'Newtown Square to Chester'], ['119', 'Cheyney to Chester'], ['12', 'Columbus-Dock to 50th-Woodland'], ['120', 'Cheyney to 69th St'], ['123', 'King of Prussia to 69th St'], ['124', 'Chesterbrook to 13th-Market'], ['125', 'Valley Forge to 13th-Market'], ['126', 'Lawrence Park via Manoa'], ['127', 'Trenton to Oxford Valley'], ['128', 'Neshaminy to Oxford Valley'], ['129', 'Frankford-Knights to Oxford Valley'], ['130', 'BCCC to Frankford-Knights'], ['131', 'Audubon to Norristown'], ['132', 'Telford to Montgomery Mall'], ['133', 'Frankford-Knights to Bensalem'], ['135', 'West Chester to Coatesville'], ['139', 'Limerick to King of Prussia'], ['14', 'Frankford to Oxford Valley'], ['150', 'Parx to Plymouth Meeting'], ['16', 'City Hall to Cheltenham-Ogontz'], ['17', 'Front-Market to 20-Johnston'], ['18', 'Fox Chase to Cedarbrook'], ['19', 'Torresdale to Frankford'], ['2', '20-Johnston to Pulaski-Hunting Park'], ['20', 'Philadelphia Mills to Frankford'], ['201', 'Fort Washington shuttle'], ['204', 'Eagleview to Paoli'], ['206', 'Great Valley to Paoli'], ['21', 'Columbus-Dock to 69th St'], ['22', 'Warminster to Olney'], ['23', '11th-Market to Chestnut Hill'], ['24', 'Southampton to Frankford'], ['25', 'Frankford to 2nd-Spring Garden'], ['26', 'Frankford to Chelten'], ['27', 'Broad-Carpenter to Plymouth Meeting'], ['28', 'Fern Rock to Torresdale-Cottman'], ['29', 'Pier 70 to 33rd-Dickinson'], ['3', '33rd-Cecil B. Moore to Frankford'], ['30', '30th St to 69th St'], ['31', 'City Hall to 76th-City'], ['310', 'Horsham Loop'], ['32', 'Broad-Carpenter to Ridge-Lyceum'], ['33', '5th-Market to 23rd-Venango'], ['37', 'Chester to Broad-Snyder'], ['38', '5th-Market to Wissahickon'], ['39', 'Richmond-Cumberland to 33rd-Dauphin'], ['4', 'Broad-Pattison to Fern Rock'], ['40', '2nd-Lombard to Conshohocken-Monument'], ['41', 'Chelten-Wissahickon to Richmond'], ['42', '2nd-Spruce to 61st-Pine'], ['43', 'Richmond-Cumberland to 50th-Parkside'], ['44', 'Front-Market to Ardmore'], ['45', 'Navy Yard to 12th-Vine'], ['46', '58th-Baltimore to 63rd-Malvern'], ['47', 'Whitman Plaza to 5th-Godfrey'], ['48', 'Front-Market to 27th-Allegheny'], ['49', '33rd-Dauphin to 40th-Baltimore'], ['490', 'Fox Chase to Verree-Marchman'], ['5', '2nd-Market to Frankford'], ['50', 'Parx to Frankford'], ['51', 'Plymouth Meeting to Olney'], ['52', '49th-Woodland to Wissahickon'], ['53', 'Emlen-Carpenter to Richmond-Westmoreland'], ['54', 'Richmond-Cambria to 33rd-Dauphin'], ['55', 'Doylestown to Olney'], ['56', '23rd-Venango to Torresdale-Cottman'], ['57', 'Whitman Plaza to Fern Rock'], ['58', 'Neshaminy to Frankford'], ['59', 'Castor-Bustleton to Arrott'], ['6', 'Cheltenham-Ogontz to Olney'], ['60', 'Wissahickon to Richmond-Westmoreland'], ['61', '9th-Market to Manayunk'], ['63', 'Overbrook to Food Center'], ['64', '50th-Parkside to Pier 70'], ['65', 'Germantown-Chelten to 69th St'], ['66', 'Frankford to Frankford-Knights'], ['67', 'Philadelphia Mills to Frankford'], ['68', 'Broad-Oregon to 69th St'], ['7', 'Pier 70 to 33rd-Dauphin'], ['70', 'Torresdale-Cottman to Fern Rock'], ['71', 'Broad-Erie to Cheltenham-Ogontz'], ['72', 'Cedarbrook to Frankford'], ['73', 'Frankford to Richmond-Westmoreland'], ['75', 'Wayne Junction to Arrott'], ['76', 'Rising Sun-Olney to Columbus Commons'], ['77', 'Roosevelt-Cottman to Chestnut Hill'], ['79', 'Columbus Commons to 29th-Snyder'], ['8', 'Olney to Frankford'], ['81', 'Broad-Erie to Cheltenham-Ogontz'], ['82', 'Wissahickon to Frankford'], ['84', 'Philadelphia Mills to Frankford'], ['88', 'Bethayres to Frankford'], ['9', '4th-Walnut to Andorra'], ['90', 'Plymouth Meeting to Norristown'], ['92', 'West Chester to King of Prussia'], ['93', 'Pottstown to Norristown'], ['94', 'Montgomery Mall to Chestnut Hill'], ['95', 'Gulph Mills to Willow Grove'], ['96', 'Lansdale to Norristown'], ['97', 'Chestnut Hill to Norristown'], ['98', 'Plymouth Meeting to Norristown'], ['99', 'Phoenixville to Norristown'], ['BLVDDIR', 'Boulevard Direct'], ['K', 'Ridge-Midvale to Arrott'], ['LUCYGO', 'LUCY Gold Loop'], ['LUCYGR', 'LUCY Green Loop'], ['MANN', 'Mann Loop']]]
];
const LINES = new Map(LINE_GROUPS.flatMap(([kind, list]) => list.map((l) => {
  const [id, a, b] = l;
  return [id, kind === 'Bus' ? { id, kind, badge: id === 'BLVDDIR' ? 'Blvd' : id, name: a } : { id, kind, badge: a, name: b }];
})));
const DEFAULT_LINES = ['M1', 'MED', '113'];
const DETOUR = 4;
const UPCOMING_DAYS = 7;

let alertData = null, alertError = '', alertsAt = 0;
let alertOpen = '';      // the alert showing its details
async function loadAlerts(force) {
  if (!isOn('alerts') || document.hidden) return;
  if (!force && alertsAt && Date.now() - alertsAt < 5 * 60e3) return;
  alertsAt = Date.now();
  try {
    const res = await fetch(`data/alerts.json?v=${Math.floor(Date.now() / 300000)}`);
    if (!res.ok) throw new Error(res.status);
    alertData = await res.json();
    alertError = '';
  } catch {
    alertError = 'SEPTA’s alerts aren’t loading. This will try again in a few minutes.';
  }
  refresh('alerts');
}

// Where an alert stands right now: running, starting soon, or not worth showing
function alertWindow(a, now = Date.now() / 1000) {
  if (!a.periods.length) return { state: 'now' };
  const live = a.periods.filter((p) => !p[1] || p[1] > now).sort((x, y) => x[0] - y[0]);
  if (!live.length) return { state: 'over' };
  const [start, end] = live[0];
  if (start <= now) return { state: 'now', end };
  return { state: start - now < UPCOMING_DAYS * 86400 ? 'soon' : 'later', start, end };
}
const shortDate = (s) => new Date(s * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
function alertWhen(w) {
  if (w.state === 'soon') {
    const d = new Date(w.start * 1000);
    return `Starts ${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`;
  }
  if (!w.end) return '';
  const hours = (w.end - Date.now() / 1000) / 3600;
  return hours < 18 ? `Until ${fmtTime(new Date(w.end * 1000))}` : `Through ${shortDate(w.end)}`;
}
function myAlerts(item) {
  const mine = new Set(item.cfg.lines || DEFAULT_LINES);
  const hidden = new Set(item.cfg.hidden || []);
  const rows = [];
  let hiddenCount = 0;
  for (const a of alertData?.alerts || []) {
    const lines = a.lines.filter((l) => mine.has(l));
    if (!lines.length) continue;
    const w = alertWindow(a);
    if (w.state === 'over' || w.state === 'later') continue;
    if (hidden.has(a.id)) { hiddenCount++; continue; }
    rows.push({ a, lines, w });
  }
  // Running now first, then whatever starts soonest
  rows.sort((x, y) => (x.w.state === 'now' ? 0 : 1) - (y.w.state === 'now' ? 0 : 1) || (x.w.start || 0) - (y.w.start || 0));
  return { rows, hiddenCount };
}
const lineBadge = (id) => `<span class="al-badge" title="${esc(LINES.get(id)?.name || id)}">${esc(LINES.get(id)?.badge || id)}</span>`;
// A detour's headline is only its cause ("Construction"), so its directions make the better title
const alertTitle = (a) => (a.effect === DETOUR && a.text ? a.text : a.title);
function alertRow(r) {
  const { a, lines, w } = r;
  const open = alertOpen === a.id;
  const when = alertWhen(w);
  const kind = a.effect === DETOUR ? `Detour for ${a.title.toLowerCase()}` : '';
  const more = a.effect !== DETOUR && a.text && a.text !== a.title ? `<p>${esc(a.text)}</p>` : '';
  return `<li class="al-item ${w.state === 'soon' ? 'soon' : ''}">
    <button class="al-row" type="button" data-id="${esc(a.id)}" aria-expanded="${open}">
      <span class="al-lines">${lines.map(lineBadge).join('')}</span>
      <span class="al-title">${esc(alertTitle(a))}</span>
      ${when || kind ? `<span class="al-when">${esc([kind, when].filter(Boolean).join('. '))}</span>` : ''}
    </button>
    ${open ? `<div class="al-more">${more}<div class="al-acts"><a class="mini" href="https://www.septa.org/alerts" target="_blank" rel="noopener">Open SEPTA alerts</a><button class="mini" type="button" data-hide="${esc(a.id)}">Hide this</button></div></div>` : ''}
  </li>`;
}
function renderAlerts(b, size, item) {
  const lines = item.cfg.lines || DEFAULT_LINES;
  const head = `<div class="w-head"><h2>Service alerts</h2><div class="act"><button class="mini" type="button" data-a="lines">Lines</button></div></div>`;
  let main;
  if (!alertData) {
    main = `<p class="note">${esc(alertError || 'Checking your lines…')}</p>`;
  } else if (!lines.length) {
    main = '<p class="note">Choose the lines you ride, and this will tell you when one of them has a change.</p>';
  } else {
    const { rows, hiddenCount } = myAlerts(item);
    const stale = Date.now() - alertData.at > 3 * 3600e3 ? `<p class="al-stale">SEPTA’s alerts last updated ${esc(ago(alertData.at))}.</p>` : '';
    const restore = hiddenCount ? `<button class="al-restore" type="button" data-a="restore">Show ${hiddenCount} hidden</button>` : '';
    if (!rows.length) {
      main = `<div class="al-clear"><p class="al-ok">All clear on your lines</p><div class="al-lines">${lines.slice(0, size === 's' ? 4 : 14).map(lineBadge).join('')}</div>${stale}${restore}</div>`;
    } else if (size === 's') {
      main = `<div class="al-count"><strong>${rows.length}</strong><span>${esc(alertTitle(rows[0].a))}</span></div>`;
    } else {
      main = `<ul class="al-list">${rows.map(alertRow).join('')}</ul>${stale}${restore}`;
    }
  }
  b.innerHTML = head + main;
  b.classList.toggle('al-has', !!alertData && lines.length > 0 && myAlerts(item).rows.length > 0);
  b.querySelector('[data-a="lines"]').addEventListener('click', () => openLinesDialog(item));
  b.querySelector('[data-a="restore"]')?.addEventListener('click', () => { item.cfg.hidden = []; savePages(); refresh(item.id); });
  b.querySelectorAll('.al-row').forEach((r) => r.addEventListener('click', () => { alertOpen = alertOpen === r.dataset.id ? '' : r.dataset.id; refresh(item.id); }));
  b.querySelectorAll('[data-hide]').forEach((h) => h.addEventListener('click', () => {
    item.cfg.hidden = [...(item.cfg.hidden || []), h.dataset.hide];
    alertOpen = ''; savePages(); refresh(item.id);
  }));
}
function openLinesDialog(item) {
  const dlg = $('linesDlg'), list = $('linesList'), find = $('linesFind');
  const mine = new Set(item.cfg.lines || DEFAULT_LINES);
  list.innerHTML = LINE_GROUPS.map(([kind]) => `<li class="ln-group"><h3>${kind}</h3><ul>${[...LINES.values()].filter((l) => l.kind === kind).map((l) =>
    `<li data-find="${esc(`${l.badge} ${l.id} ${l.name}`.toLowerCase())}"><label><input type="checkbox" value="${esc(l.id)}" ${mine.has(l.id) ? 'checked' : ''}><span class="al-badge">${esc(l.badge)}</span><span>${esc(l.name)}</span></label></li>`).join('')}</ul></li>`).join('');
  find.value = '';
  find.oninput = () => {
    const q = find.value.trim().toLowerCase();
    for (const li of list.querySelectorAll('[data-find]')) li.hidden = !!q && !li.dataset.find.includes(q);
    for (const g of list.querySelectorAll('.ln-group')) g.hidden = !g.querySelector('[data-find]:not([hidden])');
  };
  dlg.onclose = () => {
    if (dlg.returnValue !== 'save') return;
    item.cfg.lines = [...list.querySelectorAll('input:checked')].map((c) => c.value);
    savePages(); refresh(item.id);
  };
  dlg.showModal();
}
WIDGETS.alerts = { name: 'Service alerts', blurb: 'Tells you when a SEPTA line you ride has a change or disruption', sizes: ['s', 'm', 'l'], render: renderAlerts };
