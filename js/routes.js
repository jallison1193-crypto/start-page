'use strict';
// ---------- Route tracker: your own trips across SEPTA, with transfers ----------
// A trip is a chain of legs. A bus, trolley or metro leg uses SEPTA's per-stop schedules (the same
// trip id at both stops gives the ride time) and live vehicle delays. A Regional Rail leg uses
// SEPTA's train finder. Each leg then waits for the one before it, plus a walk to the next stop.
const SEPTA_API = 'https://www3.septa.org/api';
const ROUTE_LIST = [["1","Parx Casino to 54th-City","3"],["103","Ardmore to 69th St Transit Center","3"],["104","West Chester U to 69th St TC","3"],["105","Paoli to 69th St Transit Center","3"],["107","Lawrence Park to 69th St TC","3"],["108","UPS/Airport to 69th St Transit Ctr","3"],["109","Chester Transit Ctr to 69th St TC","3"],["110","Penn State U to 69th St Transit Ctr","3"],["111","Chadds Ford to 69th St Transit Ctr","3"],["112","DCCC to 69th St Transit Center","3"],["113","Claymont TC to 69th St Transit Ctr","3"],["114","Wawa Station to Darby Transit Ctr","3"],["115","DCCC/Darby Transit Ctr to Airport","3"],["117","Penn State U to I-95 Industrial Pk","3"],["118","Newtown Square to Chester TC","3"],["119","Cheyney U to Chester Transit Center","3"],["12","Columbus-Dock to 50th-Woodland","3"],["120","Cheyney U to 69th St Transit Center","3"],["123","King of Prussia to 69th St TC","3"],["124","Chesterbrook to 13th-Market","3"],["125","Valley Forge to 13th-Market","3"],["126","Lawrence Park via Manoa to 69th TC","3"],["127","Trenton Transit Ctr to OxfordValley","3"],["128","Neshaminy to Oxford Valley Mall","3"],["129","Frankford-Knights to Oxford Valley","3"],["130","BCCC to Frankford-Knights","3"],["131","Audubon to Norristown Transit Ctr","3"],["132","Telford to Montgomery Mall","3"],["133","Frankford-Knights to Bensalem","3"],["135","West Chester TC to Coatesville","3"],["139","Limerick to King of Prussia","3"],["14","FTC to Neshaminy/Oxford Valley","3"],["150","Parx Casino to Plymouth Meeting","3"],["16","City Hall to Cheltenham-Ogontz","3"],["17","Front-Mkt to 20-Johnston","3"],["18","Fox Chase to Cedarbrook Plaza","3"],["19","Torresdale Station to Frankford TC","3"],["2","20-Johnston to Pulaski-Hunting Park","3"],["20","Philadelphia Mills to Frankford TC","3"],["201","Ft Wash Office Ctr to Fort Wash Sta","3"],["204","Eagleview to Paoli Train Station","3"],["206","Commons at Great Vly to Paoli Sta","3"],["21","Columbus-Dock to 69th St TC","3"],["22","Warminster/Willow Grove to Olney TC","3"],["23","11th Market to Chestnut Hill","3"],["24","Southamptn/Rockldge to Frankford TC","3"],["25","Frankford TC to 2nd-Spring Garden","3"],["26","Frankford TC to Chelten Av Station","3"],["27","Broad-Carpenter to Plymouth Meeting","3"],["28","Fern Rock TC to Torresdale-Cottman","3"],["29","Pier 70 to 33rd-Dickinson","3"],["3","33rd-Cecil B. Moore to Frankford TC","3"],["30","Gray 30th St Station to 69th St TC","3"],["31","City Hall to 76th-City","3"],["310","Horsham Loop","3"],["32","Broad-Carpenter to Ridge-Lyceum","3"],["33","5th-Market to 23rd-Venango","3"],["37","Chester Transit Ctr to Broad-Snyder","3"],["38","5th-Market to Wissahickon TC","3"],["39","Richmond-Cumberland to 33rd-Dauphin","3"],["4","Broad-Pattison to Fern Rock TC","3"],["40","2nd-Lombard to Conshohocken-Monumnt","3"],["409","59th-Baltimore to 84th-Crane","3"],["41","Chelten-Wissahckn to Richmnd-Orthdx","3"],["411","74th-Elmwood to 46th-Ludlow","3"],["415","46th-Ludlow to Passyunk-Elmwood","3"],["42","2nd-Spruce to 61st-Pine/Wycombe","3"],["426","Torresdale-Bridge to 10th-Lycoming","3"],["428","Richmond-Venango to 10th-Lycomng","3"],["43","Richmond-Cumberland to 50th-Parksde","3"],["433","Castor-Cottman to 10th-Lycomng","3"],["438","Germantown to Upper Roxborough","3"],["439","Germantown to Roxborough","3"],["44","Front-Market to Ardmore","3"],["441","Andorra/Roxborough to Broad-Vine","3"],["442","Henry-Roberts to Barren Hill","3"],["445","Roxborough to Frankford Transit Ctr","3"],["446","Henry-Cinnaminsn to Junipr-Commerce","3"],["447","Frankford TC to Henry-Cinnaminson","3"],["448","Broad-Vine to Upper Roxborough","3"],["45","Navy Yard/Brd-Oregon to 12th-Vine","3"],["450","Frankford-Linden to Bustletn-Verree","3"],["452","Academy-Medford to Bustleton-Verree","3"],["46","58th-Baltimore to 63rd-Malvern","3"],["461","Bustleton-Verree to Academy-Chalfnt","3"],["462","Welsh-Bridal to Academy-Chalfont","3"],["47","Whitman Plaza to 5th-Godfrey","3"],["475","Bustltn-County Ln to Verree-Marchmn","3"],["476","Southamptn-Blvd to Verree-Marchman","3"],["477","Academy-Comly to Verree-Marchman","3"],["478","Welsh-Blvd to Verree-Marchman","3"],["48","Front-Market to 27th-Allegheny","3"],["484","Holy Redmr Hosptl to Cottmn-Torrsdl","3"],["49","33rd-Dauphin to 40th-Baltimore","3"],["490","Fox Chase Loop to Verree-Marchman","3"],["492","Bustletn-Rennard to Verree-Marchman","3"],["495","Southmptn-Worthngtn to 10th-Lycomng","3"],["5","2nd-Market to Frankford Transit Ctr","3"],["50","Parx to Frankford Transit Center","3"],["51","Plymth Mtg/Chestnt Hill to Olney TC","3"],["52","49th-Woodlnd to Wiss TC/Parksd Lp","3"],["53","Emlen-Carpenter to Rich-Westmorland","3"],["54","Richmond-Cambria to 33rd-Dauphin","3"],["55","Doylestown/Willow Grove to Olney TC","3"],["56","23rd-Venango to Torresdale-Cottman","3"],["57","WhitmnPlz to RisngSun-Olney/FernRck","3"],["58","Neshaminy/Somerton to Frankford TC","3"],["59","Castor-Bustleton to Arrott TC","11"],["6","Cheltenham-Ogontz to Olney TC","3"],["60","Wiss TC/35-Algny to Rich-Westmrlnd","3"],["61","9th-Market to Manayunk","3"],["63","Lanknau/Overbrk to ColCom/FdCtr","3"],["64","50th-Parkside to Pier 70","3"],["65","Germantown-Chelten to 69th St TC","3"],["66","Frankford TC to Frankford-Knights","11"],["67","Phila Mills/Bustletn to Frankfrd TC","3"],["68","Broad-Oregon to UPS/69th St TC","3"],["7","Pier 70 to 33rd-Dauphin","3"],["70","Frank-Grg/Torsdl-Cottmn to FernRock","3"],["71","Broad-Erie to Cheltenham-Ogontz","3"],["72","Cedarbrook Plaza to Frankford Trans","3"],["73","Frankford TC to Richmnd-Westmorelnd","3"],["75","Wayne Junct to Arrott Transit Ctr","11"],["76","Rising Sun-Olney to Columbus Comm","3"],["77","Roosevelt-Cottman to Chestnut Hill","3"],["79","Columbus Commons to 29th-Snyder or 40th-Market","3"],["8","Olney TC to Frankford TC","3"],["81","Broad-Erie to Cheltenham-Ogntz","3"],["82","Wisshkn TC/Henry-Midvl to FrankfdTC","3"],["84","Bustletn-CountyLn/PhilaMills to FTC","3"],["88","Bethayres/Frankford-Gregg to FTC","3"],["9","4th-Walnut to Andorra","3"],["90","Plymouth Mtng. to Norristown TC","3"],["92","West Chester to King of Prussia","3"],["93","Pottstown to Norristown Transit Ctr","3"],["94","Montgomery Mall to Chestnut Hill","3"],["95","Gulph Mills to Willow Grove Mall","3"],["96","Lansdale to Norristown Transit Ctr","3"],["97","Chestnut Hill to Norristown TC","3"],["98","Plymouth Mtng to Norristown TC","3"],["99","Phoenixville to Norristown TC","3"],["B1","Broad Street Line Local","1"],["B2","Broad Street Line Express","1"],["B3","Broad-Ridge Spur","1"],["BLVDDIR","Blvd Direct Neshaminy Mall to FTC","3"],["D1","Route 101","0"],["D2","Route 102","0"],["G1","63rd-Girard to Richmond-Westmorelnd","0"],["K","Ridge-Midvale to Arrott Transit Ctr","3"],["L1","Market-Frankford Line All Stops","1"],["LUCYGO","Gold Loop through University City","3"],["LUCYGR","Green Loop through University City","3"],["M1","Norristown High Speed Line Local","1"],["MANN","Mann Loop","3"],["T1","13th St to 63rd-Malvern/Overbrook","0"],["T2","13th St to 61st-Baltimore/Angora","0"],["T3","13th St to Yeadon or Darby TC","0"],["T4","13th St to Darby Transit Center","0"],["T5","13th St to 80th St/Eastwick","0"]];
const RAIL_STATIONS = ["30th Street Station","49th St","9th St","Airport Terminal A","Airport Terminal B","Airport Terminal C-D","Airport Terminal E-F","Allegheny","Allen Lane","Ambler","Angora","Ardmore","Ardsley","Bala","Berwyn","Bethayres","Bridesburg","Bristol","Bryn Mawr","Carpenter","Chalfont","Chelten Avenue","Cheltenham","Chester TC","Chestnut Hill East","Chestnut Hill West","Claymont","Clifton-Aldan","Colmar","Conshohocken","Cornwells Heights","Crestmont","Croydon","Crum Lynne","Curtis Park","Cynwyd","Darby","Daylesford","Delaware Valley College","Devon","Downingtown","Doylestown","East Falls","Eastwick Station","Eddington","Eddystone","Elkins Park","Elm St","Elwyn Station","Exton","Fern Rock TC","Fernwood","Folcroft","Forest Hills","Fortuna","Fox Chase","Ft Washington","Germantown","Gladstone","Glenolden","Glenside","Gravers","Gwynedd Valley","Hatboro","Haverford","Highland","Highland Ave","Holmesburg Jct","Ivy Ridge","Jenkintown-Wyncote","Langhorne","Lansdale","Lansdowne","Lawndale","Levittown","Link Belt","Main St","Malvern","Manayunk East","Marcus Hook","Market East","Meadowbrook","Media","Melrose Park","Merion","Miquon","Morton","Moylan-Rose Valley","Mt Airy","Narberth","Neshaminy Falls","New Britain","Newark","Norristown TC","North Broad St","North Hills","North Philadelphia","North Wales","Norwood","Olney","Oreland","Overbrook","Paoli","Penllyn","Pennbrook","Philmont","Primos","Prospect Park","Queen Lane","Radnor","Ridley Park","Rosemont","Roslyn","Rydal","Ryers","Secane","Sharon Hill","Somerton","Spring Mill","St. Davids","St. Martins","Stenton","Strafford","Suburban Station","Swarthmore","Tacony","Temple U","Thorndale","Torresdale","Trenton","Trevose","Tulpehocken","University City","Upsal","Villanova","Wallingford","Warminster","Washington Lane","Wawa","Wayne","Wayne Jct","West Trenton","Whitford","Willow Grove","Wilmington","Wissahickon","Wister","Woodbourne","Wyndmoor","Wynnefield Avenue","Wynnewood","Yardley"];
let trips = store.get('sp.trips', []);
const saveTrips = () => store.set('sp.trips', trips);
const routeState = {};   // trip id -> { at, options, error, loading }

const septaCache = new Map();
async function septa(url, ttl) {
  const hit = septaCache.get(url);
  if (hit && Date.now() - hit.at < ttl) return hit.value;
  const value = await jsonp(url);
  septaCache.set(url, { at: Date.now(), value });
  return value;
}
function parseStamp(s) {       // "11/06/26 07:17 am"
  const m = /(\d+)\/(\d+)\/(\d+)\s+(\d+):(\d+)\s*(am|pm)/i.exec(s || '');
  if (!m) return null;
  const pm = m[6].toLowerCase() === 'pm';
  return new Date(2000 + +m[3], +m[1] - 1, +m[2], (+m[4] % 12) + (pm ? 12 : 0), +m[5]);
}
function parseClock(s) {       // "7:29AM", today (or just after midnight, tomorrow)
  const m = /(\d+):(\d+)\s*(AM|PM)/i.exec(s || '');
  if (!m) return null;
  const d = new Date();
  d.setHours((+m[1] % 12) + (m[3].toUpperCase() === 'PM' ? 12 : 0), +m[2], 0, 0);
  if (Date.now() - d.getTime() > 6 * 3600e3) d.setDate(d.getDate() + 1);
  return d;
}
const lateMinutes = (s) => { const m = /(\d+)\s*min/i.exec(s || ''); return m ? +m[1] : 0; };

async function stopTimes(stopId, route) {
  const res = await septa(`${SEPTA_API}/BusSchedules/index.php?stop_id=${encodeURIComponent(stopId)}&req2=${encodeURIComponent(route)}&req6=24`, 3 * 60e3);
  const list = res && !res.error ? res[route] : null;
  return (Array.isArray(list) ? list : []).map((x) => ({ trip: String(x.trip_id), at: parseStamp(x.DateCalender), to: x.DirectionDesc })).filter((x) => x.at);
}
async function liveDelays(route) {
  const map = new Map();
  try {
    const res = await septa(`${SEPTA_API}/TransitView/index.php?route=${encodeURIComponent(route)}`, 45e3);
    for (const v of res?.bus || []) if (v.late < 900) map.set(String(v.trip), +v.late || 0);   // SEPTA uses 998 and 999 for "unknown"
  } catch {}
  return map;
}
async function busDepartures(leg) {
  const [boards, offs, delays] = await Promise.all([
    Promise.all(leg.stopIds.map((id) => stopTimes(id, leg.route))),
    Promise.all(leg.offIds.map((id) => stopTimes(id, leg.route))),
    liveDelays(leg.route)
  ]);
  const offAt = new Map(offs.flat().map((x) => [x.trip, x.at]));
  const out = [];
  for (const s of boards.flat()) {
    const off = offAt.get(s.trip);
    if (!off || off <= s.at) continue;       // not this direction, or doesn't reach that stop
    const live = delays.has(s.trip);
    const late = live ? delays.get(s.trip) : 0;
    out.push({ dep: new Date(s.at.getTime() + late * 60e3), arr: new Date(off.getTime() + late * 60e3), late, live, badge: leg.route, from: leg.stopName, to: leg.offName });
  }
  return out.filter((d) => d.dep.getTime() > Date.now() - 60e3).sort((a, b) => a.dep - b.dep);
}
async function railDepartures(leg) {
  const res = await septa(`${SEPTA_API}/NextToArrive/index.php?req1=${encodeURIComponent(leg.from)}&req2=${encodeURIComponent(leg.to)}&req3=8`, 60e3);
  if (!Array.isArray(res)) throw new Error('station');
  const out = [];
  for (const t of res) {
    const late = lateMinutes(t.orig_delay);
    const sched = parseClock(t.orig_departure_time);
    const direct = t.isdirect === 'true';
    const end = parseClock(direct ? t.orig_arrival_time : t.term_arrival_time);
    if (!sched || !end) continue;
    const lastLate = direct ? late : lateMinutes(t.term_delay);
    out.push({
      dep: new Date(sched.getTime() + late * 60e3), arr: new Date(end.getTime() + lastLate * 60e3), late, live: true,
      badge: (t.orig_line || 'Rail').split('/')[0], from: leg.from, to: leg.to, via: direct ? '' : t.Connection
    });
  }
  return out.filter((d) => d.dep.getTime() > Date.now() - 60e3).sort((a, b) => a.dep - b.dep);
}
const legDepartures = (leg) => (leg.kind === 'rail' ? railDepartures(leg) : busDepartures(leg));

async function planTrip(trip) {
  const data = await Promise.all(trip.legs.map(legDepartures));
  const options = [];
  for (const first of data[0].slice(0, 6)) {
    const chain = [first];
    let t = first.arr.getTime();
    let ok = true;
    for (let i = 1; i < data.length; i++) {
      const buffer = (trip.legs[i].walk ?? 3) * 60e3;
      const next = data[i].find((d) => d.dep.getTime() >= t + buffer);
      if (!next) { ok = false; break; }
      chain.push(next);
      t = next.arr.getTime();
    }
    if (ok) options.push({ legs: chain, leave: new Date(first.dep.getTime() - (trip.legs[0].walk || 0) * 60e3), arrive: new Date(t) });
  }
  return options.filter((o, i) => !options.some((p, j) => j > i && p.arrive.getTime() === o.arrive.getTime()));   // keep the later, shorter wait
}
// A route you click stays up until the page reloads; otherwise it follows the time of day
const tripPick = {};   // widget id -> trip id
function activeTrip(item) {
  const chosen = trips.find((t) => t.id === tripPick[item.id]);
  if (chosen) return chosen;
  const part = new Date().getHours() < 12 ? 'am' : 'pm';
  return trips.find((t) => t.when === part) || trips[0] || null;
}
async function loadRoutes(force) {
  if (document.hidden) return;
  const wanted = new Set(allItems().filter((i) => i.type === 'routes' && i.on).map(activeTrip).filter(Boolean));
  for (const trip of wanted) {
    const st = routeState[trip.id] || (routeState[trip.id] = {});
    if (st.loading || (!force && st.at && Date.now() - st.at < 55e3)) continue;
    st.loading = true;
    try {
      st.options = await planTrip(trip);
      st.error = '';
    } catch (e) {
      st.error = e.message === 'station' ? 'SEPTA didn’t recognize one of these stations. Edit the route to fix it.' : 'SEPTA isn’t responding. Trying again in a minute.';
    }
    st.at = Date.now();
    st.loading = false;
    refresh('routes');
  }
}
function waitText(ms) {
  const m = Math.round(ms / 60000);
  if (m <= 0) return 'Leave now';
  return m < 60 ? `Leave in ${m} min` : `Leave in ${Math.floor(m / 60)}h ${m % 60}m`;
}
const lateTag = (d) => (d.late > 0 ? `<em>${d.late} min late</em>` : d.live ? '<i>on time</i>' : '');

function renderRoutes(b, size, item) {
  const trip = activeTrip(item);
  const tabs = trips.map((t) => `<button class="tab" type="button" role="tab" data-trip="${t.id}" aria-selected="${t === trip}">${esc(t.name)}</button>`).join('');
  const head = `<div class="w-head"><div class="tabs" role="tablist" aria-label="Your routes">${tabs || '<h2>Routes</h2>'}</div>
    <div class="act">${trip ? `<button class="mini ic" type="button" data-a="edit" aria-label="Edit ${esc(trip.name)}" title="Edit route">${ico('pencil')}</button>` : ''}
    <button class="mini ic" type="button" data-a="add" aria-label="Add a route" title="Add a route">${ico('plus')}</button></div></div>`;
  let main;
  if (!trip) {
    main = '<div class="rt-empty"><p class="note">Track your own trips, transfers included. Buses, trolleys, metro and Regional Rail.</p><button class="btn primary sm" type="button" data-a="add">Add a route</button></div>';
  } else {
    const st = routeState[trip.id];
    if (!st || (!st.options && !st.error)) main = '<p class="note">Checking SEPTA…</p>';
    else if (st.error) main = `<p class="note">${esc(st.error)}</p>`;
    else if (!st.options.length) main = '<p class="note">SEPTA shows no full trip for this route right now. Late at night that’s normal; otherwise check the stops are in the right order.</p>';
    else {
      const best = st.options[0];
      const legs = best.legs.map((d) => `<li><span class="rt-badge">${esc(d.badge)}</span><span class="rt-time">${fmtTime(d.dep)}</span>${size === 'l' ? `<span class="rt-where">${esc(d.from)} to ${esc(d.to)}${d.via ? `, change at ${esc(d.via)}` : ''}</span>` : ''}${lateTag(d)}</li>`).join('');
      const later = size === 'l' && st.options.length > 1 ? `<div class="rt-later"><h3>Later</h3><ol>${st.options.slice(1, 4).map((o) => `<li><span>Leave ${fmtTime(o.leave)}</span><span>Arrive ${fmtTime(o.arrive)}</span></li>`).join('')}</ol></div>` : '';
      main = `<div class="rt-now"><strong>${waitText(best.leave - Date.now())}</strong><span>Arrive ${fmtTime(best.arrive)}</span></div>
        <ol class="rt-legs rt-${size}">${legs}</ol>${later}`;
    }
  }
  b.innerHTML = head + main;
  b.querySelectorAll('[data-trip]').forEach((t) => t.addEventListener('click', () => { tripPick[item.id] = t.dataset.trip; refresh(item.id); loadRoutes(); }));
  b.querySelector('[data-a="edit"]')?.addEventListener('click', () => openTripDialog(trip));
  b.querySelectorAll('[data-a="add"]').forEach((x) => x.addEventListener('click', () => openTripDialog(null)));
}
WIDGETS.routes = { name: 'Routes', blurb: 'Your SEPTA trips with transfers and live delays', sizes: ['m', 'l'], render: renderRoutes, multi: true };

// ---------- Route editor ----------
let tripEditing = null;
const stopBase = (name) => name.replace(/\s*-\s*(FS|NS|MBFS|MBNS|MB)\s*$/i, '').trim();
$('routeOptions').innerHTML = ROUTE_LIST.map(([id, name]) => `<option value="${esc(id)}">${esc(name)}</option>`).join('');
$('stationOptions').innerHTML = RAIL_STATIONS.map((s) => `<option value="${esc(s)}"></option>`).join('');

function legRow(leg = { kind: 'bus' }, first = false) {
  const li = document.createElement('li');
  li.className = 'leg';
  const listId = 'stops-' + uid();
  li.innerHTML = `<div class="leg-top">
      <select class="input leg-kind" aria-label="Type of ride"><option value="bus">Bus, trolley or metro</option><option value="rail">Regional Rail</option></select>
      <label class="leg-walk">${first ? 'Walk to stop' : 'Transfer walk'}<input class="input" type="number" min="0" max="60" value="${leg.walk ?? (first ? 0 : 3)}"> min</label>
      <button class="mini ic leg-remove" type="button" aria-label="Remove this ride">${ico('x')}</button>
    </div>
    <div class="leg-bus">
      <label>Route<input class="input leg-route" list="routeOptions" placeholder="113, M1, L1, T3" value="${esc(leg.route || '')}" autocomplete="off"></label>
      <label>Get on at<input class="input leg-board" list="${listId}" placeholder="Pick a route first" value="${esc(leg.stopName || '')}" autocomplete="off"></label>
      <label>Get off at<input class="input leg-off" list="${listId}" placeholder="Pick a route first" value="${esc(leg.offName || '')}" autocomplete="off"></label>
      <datalist id="${listId}"></datalist>
    </div>
    <div class="leg-rail">
      <label>From station<input class="input leg-from" list="stationOptions" placeholder="Lansdowne" value="${esc(leg.from || '')}" autocomplete="off"></label>
      <label>To station<input class="input leg-to" list="stationOptions" placeholder="Suburban Station" value="${esc(leg.to || '')}" autocomplete="off"></label>
    </div>`;
  const kind = li.querySelector('.leg-kind');
  const show = () => { li.querySelector('.leg-bus').hidden = kind.value !== 'bus'; li.querySelector('.leg-rail').hidden = kind.value !== 'rail'; };
  kind.value = leg.kind; kind.addEventListener('change', show); show();
  li.querySelector('.leg-remove').addEventListener('click', () => { if ($('tripLegs').children.length > 1) li.remove(); else $('tripError').textContent = 'A route needs at least one ride.'; });
  const routeInput = li.querySelector('.leg-route');
  li.stops = new Map();
  li.loadStops = async () => {
    const route = routeInput.value.trim();
    li.stops = new Map();
    li.querySelector('datalist').replaceChildren();
    if (!route) return;
    try {
      // Saved by scripts/fetch-stops.mjs, because SEPTA's stop list can't be read from a web page
      const res = await fetch(`data/stops/${encodeURIComponent(route)}.json`);
      if (res.status === 404) throw new Error('none');
      if (!res.ok) throw new Error('network');
      for (const [id, stopname] of await res.json()) {
        const base = stopBase(stopname);
        if (!li.stops.has(base)) li.stops.set(base, []);
        li.stops.get(base).push(id);
      }
      li.querySelector('datalist').innerHTML = [...li.stops.keys()].sort().map((n) => `<option value="${esc(n)}"></option>`).join('');
      li.querySelector('.leg-board').placeholder = li.querySelector('.leg-off').placeholder = li.stops.size ? 'Start typing a stop' : 'SEPTA lists no stops for that route';
    } catch (e) {
      $('tripError').textContent = e.message === 'none' ? `There’s no stop list for route ${route}. Check the route name.` : 'The stop list didn’t load. Try again in a moment.';
    }
  };
  routeInput.addEventListener('change', li.loadStops);
  if (leg.route) li.loadStops();
  return li;
}
function openTripDialog(trip) {
  tripEditing = trip;
  $('tripTitle').textContent = trip ? 'Edit route' : 'New route';
  $('tripName').value = trip ? trip.name : '';
  $('tripWhen').value = trip ? trip.when : 'any';
  $('tripError').textContent = '';
  $('tripDelete').hidden = !trip;
  $('tripLegs').replaceChildren(...(trip ? trip.legs : [{ kind: 'bus' }]).map((l, i) => legRow(l, i === 0)));
  $('tripDlg').showModal();
}
$('tripAddLeg').addEventListener('click', () => $('tripLegs').append(legRow({ kind: 'bus' }, false)));
$('tripCancel').addEventListener('click', () => $('tripDlg').close());
$('tripDelete').addEventListener('click', async () => {
  const t = tripEditing;
  $('tripDlg').close();
  const yes = await ask({ title: `Delete “${t.name}”?`, text: 'This removes the route from your tracker.', ok: 'Delete route', danger: true });
  if (!yes) return;
  trips = trips.filter((x) => x !== t);
  saveTrips(); refresh('routes');
});
$('tripForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = $('tripError');
  const name = $('tripName').value.trim();
  if (!name) { err.textContent = 'Give the route a name, like To work.'; return; }
  const legs = [];
  for (const li of $('tripLegs').children) {
    const walk = Math.max(0, +li.querySelector('.leg-walk input').value || 0);
    if (li.querySelector('.leg-kind').value === 'rail') {
      const from = li.querySelector('.leg-from').value.trim(), to = li.querySelector('.leg-to').value.trim();
      if (!RAIL_STATIONS.includes(from) || !RAIL_STATIONS.includes(to)) { err.textContent = 'Pick both Regional Rail stations from the list.'; return; }
      legs.push({ kind: 'rail', from, to, walk });
    } else {
      const route = li.querySelector('.leg-route').value.trim();
      if (!ROUTE_LIST.some((r) => r[0] === route)) { err.textContent = `“${route || 'That'}” isn’t a SEPTA route. Pick one from the list.`; return; }
      if (!li.stops.size) await li.loadStops();
      const stopName = li.querySelector('.leg-board').value.trim(), offName = li.querySelector('.leg-off').value.trim();
      const stopIds = li.stops.get(stopName), offIds = li.stops.get(offName);
      if (!stopIds || !offIds) { err.textContent = `Pick both stops for route ${route} from the list.`; return; }
      if (stopName === offName) { err.textContent = `The stops for route ${route} are the same. Pick where you get off.`; return; }
      legs.push({ kind: 'bus', route, stopName, offName, stopIds, offIds, walk });
    }
  }
  const trip = tripEditing || { id: uid() };
  Object.assign(trip, { name, when: $('tripWhen').value, legs });
  if (!tripEditing) trips.push(trip);
  saveTrips();
  delete routeState[trip.id];
  for (const i of allItems()) if (i.type === 'routes' && i.on) tripPick[i.id] = trip.id;   // show the route you just saved
  $('tripDlg').close();
  refresh('routes');
  await loadRoutes(true);
  if (!routeState[trip.id]?.options?.length && !routeState[trip.id]?.error) toast('Saved. SEPTA shows no trip for this right now. Check the stops if it stays that way.');
});
