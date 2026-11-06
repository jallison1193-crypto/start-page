// Collects SEPTA service alerts into data/alerts.json.
// Run by .github/workflows/alerts.yml every 15 minutes, or by hand: node scripts/fetch-alerts.mjs
// SEPTA publishes these as GTFS-Realtime (a binary format) and blocks web pages from reading them,
// so this job decodes them into a small file the Service alerts widget can read.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const FEEDS = [
  'https://www3.septa.org/gtfsrt/septa-pa-us/Service/rtServiceAlerts.pb',      // bus, trolley, metro
  'https://www3.septa.org/gtfsrt/septarail-pa-us/Service/rtServiceAlerts.pb'   // Regional Rail
];
const OUT = 'data/alerts.json';
const HEARTBEAT = 60 * 60e3;     // rewrite at least hourly, so the page can tell the job is still running
const NO_EFFECT = 10;            // GTFS-Realtime's "no effect on service": parking, ticket windows and so on

// Reads one protobuf message into { fieldNumber: [values] }. Strings and nested messages stay as bytes.
function message(buf) {
  const out = {};
  let i = 0;
  const varint = () => {
    let value = 0n, shift = 0n, byte;
    do { byte = buf[i++]; value |= BigInt(byte & 127) << shift; shift += 7n; } while (byte & 128);
    return value;
  };
  while (i < buf.length) {
    const tag = Number(varint()), field = tag >> 3, wire = tag & 7;
    let value;
    if (wire === 0) value = Number(varint());
    else if (wire === 2) { const len = Number(varint()); value = buf.subarray(i, i + len); i += len; }
    else if (wire === 1) { i += 8; continue; }
    else if (wire === 5) { i += 4; continue; }
    else throw new Error(`Unknown wire type ${wire}`);
    (out[field] = out[field] || []).push(value);
  }
  return out;
}
const str = (bytes) => (bytes ? Buffer.from(bytes).toString('utf8') : '');
const translated = (field) => {                // TranslatedString -> first translation's text
  if (!field) return '';
  const first = message(field[0])[1];
  return first ? str(message(first[0])[1]?.[0]) : '';
};
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', ndash: '-', mdash: '-', hellip: '…' };
const clean = (s) => s
  .replace(/<[^>]+>/g, ' ')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m)
  .replace(/\s+/g, ' ')
  .trim();
// The overnight services are the same line as far as anyone choosing lines is concerned
const lineId = (route) => route.replace(/ OWL$/, '');

async function readFeed(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'josh-start-page/1.0' }, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);
  const root = message(new Uint8Array(await res.arrayBuffer()));
  const alerts = [];
  for (const raw of root[2] || []) {
    const entity = message(raw);
    if (!entity[5]) continue;
    const a = message(entity[5][0]);
    const lines = [...new Set((a[5] || []).map((x) => str(message(x)[2]?.[0])).filter(Boolean).map(lineId))];
    const title = clean(translated(a[10]));
    const effect = a[7]?.[0] ?? 8;
    // Cancellations of single trips name a trip number and no line, so they can't be matched to anything.
    // Renaming notices aren't disruptions.
    if (!lines.length || !title || effect === NO_EFFECT || /is now the\b/i.test(title)) continue;
    alerts.push({
      id: str(entity[1]?.[0]),
      lines, title, effect,
      text: clean(translated(a[11])),
      periods: (a[1] || []).slice(0, 8).map((p) => { const t = message(p); return [t[1]?.[0] || 0, t[2]?.[0] || 0]; })
    });
  }
  return alerts;
}

// A failed feed stops here, leaving the last good file in place
const alerts = (await Promise.all(FEEDS.map(readFeed))).flat().sort((a, b) => a.id.localeCompare(b.id));
let previous = null;
try { previous = JSON.parse(readFileSync(OUT, 'utf8')); } catch {}
const same = previous && JSON.stringify(previous.alerts) === JSON.stringify(alerts);
if (same && Date.now() - previous.at < HEARTBEAT) {
  console.log(`No change: ${alerts.length} alerts`);
} else {
  mkdirSync('data', { recursive: true });
  writeFileSync(OUT, JSON.stringify({ at: Date.now(), alerts }));
  console.log(`Saved ${alerts.length} alerts`);
}
