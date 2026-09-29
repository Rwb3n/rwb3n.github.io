// Conversation engine. Pure functions only — no DOM — so it can be tested in Node.
//
// Three layers decide how a typed question is answered:
//   L1  the text matches a node's intents → show that node
//   L2  a general question → a short canned answer by topic
//   L3  the visitor is describing their own business → start a discovery brief

import { copy, fill } from './copy.js';

// Content -------------------------------------------------------------------

export function indexContent(raw) {
  const nodes = {};
  const intents = [];
  const parents = {};
  for (const entry of raw.flat()) {
    const { parent, intents: patterns, ...node } = entry;
    nodes[entry.id] = node;
    if (patterns?.length) intents.push({ patterns, target: entry.id });
    if (parent) parents[entry.id] = parent;
  }
  return { nodes, intents, parents };
}

// Word-boundary match that tolerates plurals, so "sf" doesn't fire on
// "transfer" and "who" doesn't fire on "whole", but "project" still
// matches "projects".
const patternCache = new Map();
function toRegExp(pattern) {
  let re = patternCache.get(pattern);
  if (!re) {
    const escaped = pattern.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[’']/g, "['’]");
    re = new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}(e?s)?(?=$|[^\\p{L}\\p{N}])`, 'u');
    patternCache.set(pattern, re);
  }
  return re;
}

export function matchIntent(intents, text) {
  const q = text.toLowerCase().trim();
  for (const { patterns, target } of intents) {
    for (const p of patterns) if (toRegExp(p).test(q)) return target;
  }
  return null;
}

// Disclosure detection (L3) -------------------------------------------------

export const disclosure = {
  strong: ['work together', 'collaborate', 'hire', 'proposal', 'consulting', 'engagement', 'quote', 'pricing', 'book a call', 'let’s talk', "let's talk", 'get in touch'],
  weak: {
    org: ['our team', 'my team', 'our company', 'my company', 'our org', 'we have', 'we’ve got', "we've got", 'we use', 'we run', 'we spend'],
    problem: ['struggling', 'falling apart', 'breaking', 'broken', 'doesn’t work', "doesn't work", 'no single source', 'manual process', 'keeps dropping', 'can’t scale', "can't scale", 'spreadsheet'],
    scale: /\b\d+\s*(person|people|employee|staff|team|headcount)\b/i,
    need: ['we need', 'we’re looking', "we're looking", 'we’re trying', "we're trying", 'looking for someone', 'need help with'],
  },
  threshold: 2,
};

export function isDisclosure(text, rules = disclosure) {
  const q = text.toLowerCase();
  if (rules.strong.some((s) => q.includes(s))) return true;
  const { org, problem, scale, need } = rules.weak;
  let score = 0;
  if (org.some((s) => q.includes(s))) score++;
  if (problem.some((s) => q.includes(s))) score++;
  if (scale.test(text)) score++;
  if (need.some((s) => q.includes(s))) score++;
  return score >= rules.threshold;
}

export function route(intents, text) {
  const target = matchIntent(intents, text);
  if (target) return { layer: 1, target };
  if (isDisclosure(text)) return { layer: 3 };
  return { layer: 2 };
}

export function resolveL2(text) {
  const q = text.toLowerCase();
  const topic = copy.l2.topics.find((t) => t.keywords.some((k) => q.includes(k)));
  return {
    blocks: [{ type: 'text', content: topic ? topic.response : copy.l2.fallback }],
    chips: copy.chips.l2Suggest,
  };
}

// Session -------------------------------------------------------------------

export function newSession() {
  return {
    viewed: [],
    interests: [],
    freeQuestions: [],
    depth: 0,
    selfDisclosed: false,
    disclosureContent: [],
  };
}

export function record(s, { nodeId, query, isFreeQuestion = false, isDisclosure: disclosed = false }) {
  return {
    viewed: nodeId ? [...new Set([...s.viewed, nodeId])] : s.viewed,
    interests: query && !isFreeQuestion ? [...new Set([...s.interests, query])] : s.interests,
    freeQuestions: isFreeQuestion && query && !disclosed ? [...s.freeQuestions, query] : s.freeQuestions,
    depth: s.depth + 1,
    selfDisclosed: s.selfDisclosed || disclosed,
    disclosureContent: disclosed && query ? [...s.disclosureContent, query] : s.disclosureContent,
  };
}

// Gravity: as the visitor goes deeper, the "how would this work for me" chip
// moves up the list. 0 surface · 1 exploring · 2 deep · 3 engaged.
export const gravity = {
  thresholds: [4, 7],
  chipLimit: 4,
  engagementChip: { label: copy.chips.engagement, target: '_engage', isEngagement: true },
};

export function gravityLevel(s, g = gravity) {
  if (s.selfDisclosed) return 3;
  if (s.depth >= g.thresholds[1]) return 2;
  if (s.depth >= g.thresholds[0]) return 1;
  return 0;
}

export function applyGravity(chips, s, content, g = gravity) {
  const level = gravityLevel(s, g);
  const seen = new Set(s.viewed);
  let out = chips.filter((c) => !seen.has(c.target) || c.isEngagement || c.target?.startsWith('_'));

  if (out.length === 0) {
    const technical = s.viewed.some((id) => content.nodes[id]?.tags?.includes('technical'));
    const deep = (id) => (content.nodes[id]?.tags?.includes('deep') ? 1 : 0);
    out = Object.keys(content.nodes)
      .filter((id) => !seen.has(id))
      .sort((a, b) => (technical ? deep(b) - deep(a) : deep(a) - deep(b)))
      .slice(0, 2)
      .map((id) => ({ label: content.nodes[id]?.label || id, target: id }));
    out.push({ label: copy.chips.startOver, target: 'root' });
  }

  if (level >= 2) out = [g.engagementChip, ...out.slice(0, 2)];
  else if (level >= 1) out = [...out.slice(0, 2), g.engagementChip];
  return out.slice(0, g.chipLimit);
}

// Navigation helpers ----------------------------------------------------------

export function withParentChip(content, chips, nodeId, seen) {
  const parent = content.parents[nodeId];
  if (!parent || seen.has(parent) || chips.some((c) => c.target === parent)) return chips;
  const p = content.nodes[parent];
  return p ? [{ label: fill(copy.navigation.parentOverview, { label: p.label }), target: parent }, ...chips] : chips;
}

export function revisitSuggestions(content, nodeId, seen) {
  const unseen = Object.keys(content.nodes).filter((id) => !seen.has(id) && id !== nodeId);
  const tags = content.nodes[nodeId]?.tags || [];
  const related = unseen.filter((id) => (content.nodes[id]?.tags || []).some((t) => tags.includes(t)));
  const pick = (related.length ? related : unseen).slice(0, 3);
  return {
    blocks: [{ type: 'text', content: copy.navigation.revisit }],
    chips: pick.map((id) => ({ label: content.nodes[id]?.label || id, target: id })),
  };
}

// L3: discovery -------------------------------------------------------------

export function resolveL3(content, s) {
  const label = (id) => content.nodes[id]?.label;
  const projects = s.viewed.filter((id) => content.nodes[id]?.tags?.includes('project')).map(label).filter(Boolean);
  const technical = s.viewed.some((id) => content.nodes[id]?.tags?.includes('technical'));
  return {
    blocks: [
      { type: 'text', content: copy.l3.acknowledge },
      {
        type: 'text',
        content: fill(copy.l3.exploredTemplate, {
          explored: projects.length ? projects.join(', ') : copy.l3.exploredFallback,
          deepSuffix: technical ? copy.l3.deepSuffix : '.',
        }),
      },
      {
        type: 'stats',
        items: copy.l3.discovery.map((value, i) => ({ label: String(i + 1).padStart(2, '0'), value })),
      },
      { type: 'text', content: copy.l3.guidance },
    ],
    chips: [
      { label: copy.chips.showBrief, target: '_show_brief' },
      { label: copy.chips.keepExploring, target: 'projects' },
    ],
  };
}

export function briefData(content, s) {
  const d = copy.brief.defaults;
  const nodes = s.viewed.filter((id) => content.nodes[id]);
  const label = (id) => content.nodes[id].label;
  const projects = nodes.filter((id) => content.nodes[id].tags?.includes('project')).map(label);
  const technical = nodes.filter((id) => content.nodes[id].tags?.includes('technical')).map(label);
  return {
    journey: nodes.map(label).join(' → ') || d.minimal,
    interest: projects.join(', ') || d.none,
    depth: technical.length ? d.deepPrefix + technical.join(', ') : d.surface,
    context: s.disclosureContent.join('; ') || d.nothingYet,
    questions: s.freeQuestions.join('; ') || d.none,
    interactions: String(s.depth),
  };
}

export function generateBrief(content, s) {
  return {
    blocks: [
      { type: 'text', content: copy.l3.briefTitle },
      { type: 'brief', data: briefData(content, s) },
      { type: 'text', content: copy.l3.briefConfirm },
    ],
    chips: [
      { label: copy.chips.bookIt, target: '_book', primary: true },
      { label: copy.chips.addContext, target: '_add_context' },
      { label: copy.chips.keepExploring, target: 'projects' },
    ],
  };
}

export function briefAsText(data) {
  const l = copy.brief.labels;
  return [
    [l.journey, data.journey],
    [l.interest, data.interest],
    [l.depth, data.depth],
    [l.context, data.context],
    [l.questions, data.questions],
    [l.interactions, data.interactions],
  ]
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

export function mailtoHref(email, data) {
  const body = `${copy.booking.bodyIntro}\n${briefAsText(data)}\n`;
  return `mailto:${email}?subject=${encodeURIComponent(copy.booking.subject)}&body=${encodeURIComponent(body)}`;
}
