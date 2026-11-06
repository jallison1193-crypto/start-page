// Saves each SEPTA route's stop list as data/stops/<route>.json.
// SEPTA's stop list can't be read from a web page directly, so the Routes editor reads these files.
// Run by .github/workflows/stops.yml once a month, or by hand: node scripts/fetch-stops.mjs
import { writeFileSync, mkdirSync } from 'node:fs';

const API = 'https://www3.septa.org/api';
const HEADERS = { 'User-Agent': 'josh-start-page/1.0 (personal transit widget)' };
const getJson = async (url) => {
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
};

const routes = await getJson(`${API}/Routes/index.php`);
const ids = routes.filter((r) => r.route_type !== '2').map((r) => r.route_id);   // type 2 is Regional Rail, which uses station names
mkdirSync('data/stops', { recursive: true });
let saved = 0;
const empty = [];
for (const id of ids) {
  try {
    const stops = await getJson(`${API}/Stops/index.php?req1=${encodeURIComponent(id)}`);
    if (!Array.isArray(stops) || !stops.length) { empty.push(id); continue; }
    writeFileSync(`data/stops/${id}.json`, JSON.stringify(stops.map((s) => [String(s.stopid), s.stopname])));
    saved++;
  } catch (e) {
    empty.push(`${id} (${e.message})`);
  }
  await new Promise((r) => setTimeout(r, 150));   // go easy on SEPTA's server
}
console.log(`Saved ${saved} of ${ids.length} routes. No stops for: ${empty.join(', ') || 'none'}`);
