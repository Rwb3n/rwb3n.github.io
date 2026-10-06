// Plain-language checks for everything a visitor reads.
//
// Based on:
//   GOV.UK, "Designing for users on the autistic spectrum": write in plain
//     English; use simple sentences and bullets; do not use figures of speech
//     or idioms; do not create a wall of text; make buttons descriptive, not
//     vague and unpredictable.
//   W3C, "Making Content Usable for People with Cognitive and Learning
//     Disabilities" (COGA): use clear words; help users focus.
//
// These are automated approximations. They catch the mechanical problems
// (idioms, jargon, long sentences, unexplained abbreviations, vague buttons);
// they do not replace reading tests with real people.

const STOP = new Set('a an the and or but of to in on at for with by from is are was be it this that these those my your our their i you we they me us what how why who when where which do does can could will would should about into over under up out as not no yes so if then than too very just also more most other some any each all'.split(' '));

export function sentences(text) {
  return String(text)
    .replace(/\s+/g, ' ')
    .replace(/\b(e\.g|i\.e|etc|approx|vs)\./gi, '$1')
    .split(/(?<=[.!?])\s+(?=[A-Z0-9“"‘'(£~])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export const words = (s) => (String(s).match(/[A-Za-z0-9£%'’~<>.,-]+/g) || []).filter((w) => /[A-Za-z0-9]/.test(w));

// Rough syllable count; good enough for a reading-grade estimate.
export function syllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 1;
  if (w.length <= 3) return 1;
  const groups = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '').match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

// Flesch–Kincaid grade level (US school grade). Approximate.
export function grade(text) {
  const ss = sentences(text);
  const ws = ss.flatMap(words).filter((w) => /[A-Za-z]/.test(w));
  if (ws.length < 20) return null; // too little text to judge
  const syl = ws.reduce((n, w) => n + syllables(w), 0);
  return 0.39 * (ws.length / ss.length) + 11.8 * (syl / ws.length) - 15.59;
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/['’]/g, "['’]");
const phraseRe = (p) => new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRe(p.toLowerCase())}(?=$|[^\\p{L}\\p{N}])`, 'iu');

// Collect every visitor-facing string in a topic, tagged by kind:
//   prose  sentences (text, callouts, descriptions, details)
//   label  short labels (titles, pills, table cells, diagram boxes)
export function nodeStrings(node) {
  const out = [];
  const prose = (s, where) => s && out.push({ kind: 'prose', text: s, where });
  const label = (s, where) => s && out.push({ kind: 'label', text: String(s), where });
  label(node.label, 'title');
  const walk = (b, where) => {
    switch (b.type) {
      case 'text': prose(b.content, where); break;
      case 'callout': prose(b.text, where); break;
      case 'hero': label(b.title, where); label(b.subtitle, where); break;
      case 'split': (b.left || []).forEach((c) => walk(c, where)); (b.right || []).forEach((c) => walk(c, where)); break;
      case 'section': label(b.kicker, where); label(b.title, where); (b.blocks || []).forEach((c) => walk(c, where)); break;
      case 'timeline': (b.items || []).forEach((i) => { label(i.date, where); label(i.event || i.title, where); prose(i.detail, where); }); break;
      case 'metricRow': b.items.forEach((i) => { label(i.value, where); label(i.label, where); }); break;
      case 'metric': label(b.value, where); label(b.label, where); label(b.sublabel, where); break;
      case 'stats': b.items.forEach((i) => { label(i.label, where); label(i.value, where); }); break;
      case 'pills': label(b.label, where); b.items.forEach((i) => label(i, where)); break;
      case 'badge': label(b.status, where); break;
      case 'grid': b.items.forEach((i) => { label(i.title, where); label(i.status, where); prose(i.description, where); }); break;
      case 'layers': b.items.forEach((i) => { label(i.label, where); label(i.title, where); prose(i.detail, where); }); break;
      case 'table': b.headers.forEach((c) => label(c, where)); b.rows.flat().forEach((c) => label(c, where)); break;
      case 'code': break; // shown as code, for developers
      case 'progress': label(b.label, where); prose(b.sublabel, where); break;
      case 'flow':
        label(b.title, where);
        b.nodes.forEach((n) => { label(n.label, where); label(n.sublabel, where); });
        b.edges.forEach((e) => label(e.label, where));
        if (b.loop) label(b.loop.label, where);
        break;
      case 'compare':
        label(b.label, where);
        (b.states || []).forEach((st) => {
          label(st.label, where); label(st.title, where); prose(st.text, where);
          if (st.stat) label(st.stat.label, where);
          st.nodes.forEach((n) => { label(n.label, where); label(n.via, where); });
        });
        break;
      case 'estimate':
        label(b.title, where); label(b.addLabel, where); prose(b.note, where); prose(b.added, where);
        b.inputs.forEach((f) => { label(f.label, where); prose(f.hint, where); label(f.less, where); label(f.more, where); });
        Object.values(b.labels || {}).forEach((l) => label(l, where));
        break;
      default: break;
    }
  };
  (node.blocks || []).forEach((b, i) => walk(b, `block ${i + 1} (${b.type})`));
  (node.chips || []).forEach((c) => c.label && out.push({ kind: 'chip', text: c.label, where: `chip → ${c.target}` }));
  return out;
}

export function lintStrings(strings, rules, { audience = 'business', scope = '' } = {}) {
  const issues = [];
  const add = (level, where, msg, text) => issues.push({ level, scope, where, msg, text });
  const banned = [...(rules.banned || []), ...(audience === 'technical' ? [] : rules.bannedBusiness || [])];
  const bannedRes = banned.map((p) => [p, phraseRe(p)]);
  const known = new Set(rules.knownAcronyms || []);
  const all = strings.map((s) => s.text).join(' \n ');
  const maxW = rules.maxSentenceWords ?? 25;
  const minW = rules.minSentenceWords ?? 3;

  for (const s of strings) {
    for (const [p, re] of bannedRes) if (re.test(s.text)) add('error', s.where, `uses "${p}" (idiom, jargon or in-joke)`, s.text);

    // ALL-CAPS words must be known abbreviations or explained in the same topic.
    for (const tok of s.text.match(/\b[A-Z][A-Z0-9]{1,}\b/g) || []) {
      if (known.has(tok)) continue;
      const defined = new RegExp(`\\(${tok}\\)|\\b${tok}\\s*\\(`).test(all);
      if (!defined) add('error', s.where, `"${tok}" is an abbreviation or shouted word: write it out, or explain it once as "Full words (${tok})"`, s.text);
    }

    if (s.kind === 'prose') {
      for (const sen of sentences(s.text)) {
        const n = words(sen).length;
        if (n > maxW) add('error', s.where, `sentence has ${n} words (max ${maxW})`, sen);
        if (n < minW && !/^\d/.test(sen)) add('error', s.where, `sentence fragment (${n} words): write a full sentence`, sen);
        if (/\?\s*$/.test(sen)) add('error', s.where, 'question in body text: say it as a statement', sen);
      }
    }

    if (s.kind === 'chip') {
      if (words(s.text).length < 2) add('error', s.where, 'button label is one word: say what it opens', s.text);
      if (/\?\s*$/.test(s.text)) add('error', s.where, 'button label is a question: say what it opens', s.text);
    }
  }

  const prose = strings.filter((s) => s.kind === 'prose').map((s) => s.text).join(' ');
  const g = grade(prose);
  const maxG = rules.maxGrade?.[audience] ?? 9;
  if (g != null && g > maxG) add('error', 'whole topic', `reading grade ${g.toFixed(1)} (max ${maxG} for ${audience} topics)`, '');
  return issues;
}

// Buttons: the label must share a word with the title of the topic it opens.
export function chipMatches(label, targetLabel) {
  const norm = (s) => words(s).map((w) => w.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/(ing|ed|es|s)$/, '')).filter((w) => w.length > 2 && !STOP.has(w));
  const a = new Set(norm(targetLabel));
  return norm(label).some((w) => a.has(w));
}

export function lintContent(content, site) {
  const rules = site.language || {};
  const issues = [];
  for (const [id, node] of Object.entries(content.nodes)) {
    const audience = node.audience === 'technical' ? 'technical' : 'business';
    issues.push(...lintStrings(nodeStrings(node), rules, { audience, scope: id }));
    for (const c of node.chips || []) {
      const target = content.nodes[c.target];
      if (c.target.startsWith('_')) continue;
      if (!target) { issues.push({ level: 'error', scope: id, where: `chip → ${c.target}`, msg: 'opens a topic that does not exist', text: c.label || '' }); continue; }
      if (c.label && !chipMatches(c.label, target.label)) issues.push({ level: 'error', scope: id, where: `chip → ${c.target}`, msg: `button label does not match the topic it opens ("${target.label}")`, text: c.label });
      if (c.expand) issues.push({ level: 'error', scope: id, where: `chip → ${c.target}`, msg: 'expand chips behave differently from other buttons: remove "expand"', text: c.label || '' });
    }
    if (words(node.label || '').length < 1) issues.push({ level: 'error', scope: id, where: 'title', msg: 'topic has no title', text: '' });
  }
  return issues;
}

// Every string in the interface text (copy.js merged with site.json).
export function flattenCopy(obj, prefix = '') {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') out.push({ kind: /intro|prompt|response|fallback|guidance|acknowledge|after|privacy|Confirm|briefTitle|addedToBrief|idle|found|revisit|lede|description/i.test(k) ? 'prose' : 'label', text: v, where: key });
    else if (Array.isArray(v)) v.forEach((x, i) => (typeof x === 'string' ? out.push({ kind: 'label', text: x, where: `${key}[${i}]` }) : out.push(...flattenCopy(x, `${key}[${i}]`))));
    else if (v && typeof v === 'object') out.push(...flattenCopy(v, key));
  }
  return out;
}

// Facts the owner has not filled in yet (not an error: the site says so plainly).
export function missingFacts(site) {
  return Object.entries(site.facts || {}).filter(([, f]) => f.value == null).map(([k, f]) => `${k} (${f.label})${f.missing ? '' : ' — hidden until set'}`);
}
