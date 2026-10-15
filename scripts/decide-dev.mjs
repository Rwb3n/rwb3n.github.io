// Runs worker/decide.js locally, on http://localhost:8787/decide, so the page
// can be tried end to end before the Worker is on Cloudflare.
//   OPENROUTER_API_KEY=… node scripts/decide-dev.mjs
// Then open http://localhost:8000/?decide=local

import { createServer } from 'node:http';
import worker from '../worker/decide.js';

const env = { OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY, ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || '' };
if (!env.OPENROUTER_API_KEY) { console.error('Set OPENROUTER_API_KEY'); process.exit(1); }

createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  const request = new Request(`http://localhost:8787${req.url}`, { method: req.method, headers: req.headers, body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body });
  const response = await worker.fetch(request, env);
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}).listen(8787, () => console.log('decide worker on http://localhost:8787/decide'));
