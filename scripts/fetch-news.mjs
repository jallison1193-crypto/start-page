// Collects headlines from public news feeds into data/news.json.
// Run by .github/workflows/news.yml every 30 minutes, or by hand: node scripts/fetch-news.mjs
import { writeFileSync, mkdirSync } from 'node:fs';

const gnews = (q) => `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;

// Section -> feeds. Top stories and politics use wire services and the BBC, for straight reporting.
const FEEDS = {
  top: [
    { source: 'Reuters', url: gnews('site:reuters.com when:1d') },
    { source: 'AP', url: gnews('site:apnews.com when:1d') },
    { source: 'BBC', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' }
  ],
  politics: [
    { source: 'Reuters', url: gnews('site:reuters.com politics when:2d') },
    { source: 'AP', url: gnews('site:apnews.com politics when:2d') },
    { source: 'BBC', url: 'https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml' }
  ],
  local: [
    { source: 'WHYY', url: 'https://whyy.org/feed/' },
    { source: '6abc', url: 'https://6abc.com/feed/' },
    { source: 'NBC10', url: 'https://www.nbcphiladelphia.com/news/local/feed/' },
    { source: 'Billy Penn', url: 'https://billypenn.com/feed/' },
    { source: '', url: gnews('"Delaware County" Pennsylvania when:3d') }
  ],
  ai: [
    { source: 'TechCrunch', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
    { source: 'Ars Technica', url: 'https://arstechnica.com/ai/feed/' }
  ],
  hardware: [
    { source: 'Tom’s Hardware', url: 'https://www.tomshardware.com/feeds/all' }
  ],
  gaming: [
    { source: 'PC Gamer', url: 'https://www.pcgamer.com/feeds.xml' },
    { source: 'GameSpot', url: 'https://www.gamespot.com/feeds/news/' }
  ],
  software: [
    { source: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index' },
    { source: 'The Verge', url: 'https://www.theverge.com/rss/index.xml' },
    { source: 'BBC Tech', url: 'https://feeds.bbci.co.uk/news/technology/rss.xml' }
  ],
  science: [
    { source: 'Science News', url: 'https://www.sciencenews.org/feed' },
    { source: 'ScienceDaily', url: 'https://www.sciencedaily.com/rss/top/science.xml' },
    { source: 'Phys.org', url: 'https://phys.org/rss-feed/' },
    { source: 'Quanta', url: 'https://www.quantamagazine.org/feed/' }
  ],
  space: [
    { source: 'Space.com', url: 'https://www.space.com/feeds/all' },
    { source: 'NASA', url: 'https://www.nasa.gov/feed/' }
  ]
};
const MAX_AGE_DAYS = { local: 5, science: 10, space: 10 };
const PER_SECTION = 24;

const decode = (s) => s
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/<[^>]+>/g, '')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/\s+/g, ' ').trim();
const tag = (block, name) => {
  const m = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i').exec(block);
  return m ? decode(m[1]) : '';
};

function parse(xml, source) {
  const out = [];
  for (const m of xml.matchAll(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi)) {
    const block = m[0];
    let title = tag(block, 'title');
    let from = source;
    // Google News titles end in " - Publisher"
    const dash = title.lastIndexOf(' - ');
    if (block.includes('news.google.com') && dash > 0) { from = source || title.slice(dash + 3); title = title.slice(0, dash); }
    const atom = /<link[^>]*href="([^"]+)"/i.exec(block);
    const url = tag(block, 'link') || (atom && atom[1]) || '';
    const when = Date.parse(tag(block, 'pubDate') || tag(block, 'published') || tag(block, 'updated') || tag(block, 'dc:date'));
    if (title && url && when) out.push({ title, url, source: from, at: new Date(when).toISOString() });
  }
  return out;
}

async function getFeed({ source, url }) {
  const res = await fetch(url, { headers: { 'User-Agent': 'josh-start-page/1.0 (personal news widget)' }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`${res.status}`);
  return parse(await res.text(), source);
}

const sections = {};
const report = [];
for (const [name, feeds] of Object.entries(FEEDS)) {
  const results = await Promise.allSettled(feeds.map(getFeed));
  const cutoff = Date.now() - (MAX_AGE_DAYS[name] || 3) * 864e5;
  const lists = results.map((r, i) => {
    if (r.status === 'rejected') { report.push(`${name}/${feeds[i].source || 'search'}: FAILED ${r.reason.message}`); return []; }
    report.push(`${name}/${feeds[i].source || 'search'}: ${r.value.length}`);
    return r.value.filter((s) => Date.parse(s.at) >= cutoff).sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  });
  // Take turns between sources so no single outlet fills the list, and drop repeats
  const seen = new Set();
  const merged = [];
  for (let i = 0; merged.length < PER_SECTION && lists.some((l) => l.length > i); i++) {
    for (const l of lists) {
      const s = l[i];
      if (!s) continue;
      const key = s.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 60);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(s);
    }
  }
  sections[name] = merged.slice(0, PER_SECTION);
}

mkdirSync('data', { recursive: true });
writeFileSync('data/news.json', JSON.stringify({ at: new Date().toISOString(), sections }));
console.log(report.join('\n'));
