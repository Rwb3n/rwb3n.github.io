// Loads the conversation graph from /content at runtime.
// /content/graphs/<id>.json lists node files; each file holds one node or an array.

import { indexContent } from './engine.js';

export async function loadContent(graph = 'default') {
  const base = new URL('../content/', import.meta.url);
  const manifest = await getJSON(new URL(`graphs/${graph}.json`, base));
  const files = await Promise.all(manifest.nodes.map((name) => getJSON(new URL(`nodes/${name}.json`, base))));
  const content = indexContent(files);
  content.root = manifest.root || 'root';
  return content;
}

async function getJSON(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${res.status} ${url.pathname}`);
  return res.json();
}

// content/site.json: offer, facts, landing text, interface text, reading
// defaults, features and writing rules.
export async function loadSiteConfig() {
  return getJSON(new URL('../content/site.json', import.meta.url));
}
