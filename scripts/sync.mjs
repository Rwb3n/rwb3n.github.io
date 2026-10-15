// Writes the static parts of index.html (title, reading defaults, the whole
// page, the booking settings) from content/site.json.
//   npm run sync        update index.html
//   npm run sync -- --check   exit 1 if index.html is out of date (used by npm test)

import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { renderRegions, applyRegions } from '../src/static.js';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const json = (p) => JSON.parse(read(p));

export const loadSite = () => json('content/site.json');

export function syncedHtml(site = loadSite()) {
  return applyRegions(read('index.html'), renderRegions(site));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  // Line endings are ignored: a Windows checkout may have CRLF.
  const norm = (s) => s.replace(/\r\n/g, '\n');
  const next = norm(syncedHtml());
  const current = norm(read('index.html'));
  if (process.argv.includes('--check')) {
    if (next !== current) { console.error('index.html is out of date. Run: npm run sync'); process.exit(1); }
    console.log('index.html is in sync with content/site.json');
  } else {
    writeFileSync(new URL('index.html', root), next);
    console.log(next === current ? 'index.html already up to date' : 'index.html updated from content/site.json');
  }
}
