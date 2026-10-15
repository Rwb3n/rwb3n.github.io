// What typed text leads to. Pure functions, no DOM, tested in node.
//
// In this order:
//   describe  the visitor is describing their own work → the intake, with
//             their words in its first field
//   answer    a question one of the facts answers → that fact
//   section   words in a section's intents → that section
//   fallback  anything else → one honest line, and the replies
//
// cfg is the talk config written into the page by src/static.js.

// Word-boundary match that tolerates plurals, so "who" does not fire on
// "whole", but "example" still matches "examples".
const cache = new Map();
function phrase(p) {
  let re = cache.get(p);
  if (!re) {
    const e = p.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[’']/g, "['’]");
    re = new RegExp(`(^|[^\\p{L}\\p{N}])${e}(e?s)?(?=$|[^\\p{L}\\p{N}])`, 'u');
    cache.set(p, re);
  }
  return re;
}
export const hasAny = (text, list = []) => {
  const q = text.toLowerCase().replace(/’/g, "'");
  return list.some((p) => phrase(p).test(q));
};

const SCALE = /\b\d+\s*(person|people|staff|employees?|colleagues|of us|hours?|days?|times)\b|\b(two|three|four|five|six|ten) (people|of us|staff|hours|days)\b/i;

export function isDescribing(text, rules) {
  if (!rules) return false;
  if (hasAny(text, rules.strong)) return true;
  let score = 0;
  if (hasAny(text, rules.org)) score++;
  if (hasAny(text, rules.problem)) score++;
  if (SCALE.test(text)) score++;
  if (hasAny(text, rules.need)) score++;
  return score >= (rules.threshold ?? 2);
}

export function route(text, cfg) {
  const q = String(text || '').trim();
  if (!q) return null;
  if (isDescribing(q, cfg.disclosure)) return { kind: 'describe', to: cfg.intake || cfg.book };
  const a = (cfg.answers || []).find((x) => hasAny(q, x.keywords));
  if (a) return { kind: 'answer', text: a.text };
  const s = (cfg.sections || []).find((x) => hasAny(q, x.intents));
  if (s) return { kind: 'section', to: s.id };
  return { kind: 'fallback', text: cfg.fallback };
}

// The replies after an answer: the sections not opened yet, in page order
// (at most `limit`), then the booking section unless it is open.
export function nextReplies(cfg, open = [], limit = 2) {
  const seen = new Set(open);
  const rest = cfg.sections.filter((s) => s.id !== cfg.book && s.id !== cfg.start && !seen.has(s.id)).slice(0, limit).map((s) => s.id);
  return seen.has(cfg.book) ? rest : [...rest, cfg.book];
}
