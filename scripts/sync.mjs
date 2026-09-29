// Writes the static parts of index.html (title, landing copy, facts, entry
// links, lens caption, no-JavaScript summary) from content/site.json.
//   npm run sync        update index.html
//   npm run sync -- --check   exit 1 if index.html is out of date (used by npm test)

import { readFileSync, writeFileSync } from 'node:fs';
import { indexContent } from '../src/engine.js';
import { renderRegions, applyRegions } from '../src/static.js';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const json = (p) => JSON.parse(read(p));

export function loadAll() {
  const site = json('content/site.json');
  const manifest = json('content/graphs/default.json');
  const content = indexContent(manifest.nodes.map((n) => json(`content/nodes/${n}.json`)));
  content.root = manifest.root || 'root';
  return { site, content };
}

export function syncedHtml() {
  const { site, content } = loadAll();
  return applyRegions(read('index.html'), renderRegions(site, content));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const next = syncedHtml();
  const current = read('index.html');
  if (process.argv.includes('--check')) {
    if (next !== current) { console.error('index.html is out of date. Run: npm run sync'); process.exit(1); }
    console.log('index.html is in sync with content/site.json');
  } else {
    writeFileSync(new URL('index.html', root), next);
    console.log(next === current ? 'index.html already up to date' : 'index.html updated from content/site.json');
  }
}
