// The decision Worker (Cloudflare Workers module): POST /decide.
//
// Takes the visitor's sentence, asks the decision model the fixed questions in
// questions.json (Jev, TypeSafe, through OpenRouter's Decisions API), and
// returns the typed answers in the shape src/decide.js reads. It returns no
// text of its own, and the model writes none: every word on the page is in
// site.json. Nothing is stored here.
//
// Secrets and settings (wrangler secret / vars):
//   OPENROUTER_API_KEY   required
//   ALLOWED_ORIGINS      comma-separated, e.g. "https://mindunder.dev"
//   JEV_MODEL            optional, default typesafe/jev-1.14 (pinned: the
//                        thresholds were tuned on it, _model/trials/jev/)
// Not yet: Turnstile and a per-visitor rate limit (before it goes live).

import questions from './questions.json' with { type: 'json' };

const MAX_CHARS = 400;
const SYSTEMS = Object.keys(questions).filter((k) => k.startsWith('sys_'));

function cors(req, env) {
  const origin = req.headers.get('Origin') || '';
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const ok = allowed.includes(origin) || (!allowed.length && /^http:\/\/localhost(:\d+)?$/.test(origin));
  return ok ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', Vary: 'Origin' } : {};
}

const json = (body, status, headers) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } });

export default {
  async fetch(req, env) {
    const h = cors(req, env);
    const url = new URL(req.url);
    if (url.pathname !== '/decide') return json({ error: 'not_found' }, 404, h);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    if (req.method !== 'POST') return json({ error: 'method' }, 405, h);
    if (!h['Access-Control-Allow-Origin']) return json({ error: 'origin' }, 403, h);

    let sentence = '';
    try { sentence = String((await req.json())?.sentence ?? '').trim(); } catch { /* empty */ }
    if (!sentence) return json({ error: 'empty' }, 400, h);
    sentence = sentence.slice(0, MAX_CHARS);

    const t0 = Date.now();
    const res = await fetch('https://openrouter.ai/api/alpha/decisions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: env.JEV_MODEL || 'typesafe/jev-1.14', state: { visitor_sentence: sentence }, questions }),
    });
    if (!res.ok) return json({ error: 'upstream', status: res.status }, 502, h);
    const a = (await res.json()).answers || {};

    return json({
      source: 'model',
      ms: Date.now() - t0,
      repeated: a.repeated?.noul ?? 0,
      job: a.job ? { choice: a.job.choice, confidence: a.job.confidence, probabilities: a.job.probabilities } : null,
      frequency: a.frequency ? { score: a.frequency.score, confidence: a.frequency.confidence } : null,
      people: a.people ? { choice: a.people.choice, confidence: a.people.confidence } : null,
      systems: Object.fromEntries(SYSTEMS.map((k) => [k.slice(4), a[k]?.noul ?? 0])),
    }, 200, h);
  },
};
