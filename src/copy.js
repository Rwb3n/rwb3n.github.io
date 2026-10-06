// Interface text. These are defaults; content/site.json overrides any of them
// (see applyConfig). The topics themselves live in content/nodes.
//
// Writing rules (checked by `npm test`, see src/lint.js): plain English, literal
// words, short sentences, no idioms or in-jokes, buttons that say what they do.

export const site = {
  brand: 'mindunder.dev',
  email: 'lab@mindunder.dev',
  name: 'Ruben',
  fullName: null,
  location: 'London, UK',
  timeZone: 'Europe/London',
  links: [],
};

// Filled from site.json: facts, landing, onePage, features, reading, language.
export const config = {
  facts: {},
  landing: {},
  onePage: { sections: [], appendix: [] },
  features: { map: true, depthMeter: false, freeText: true, sound: true },
  reading: {},
  language: {},
};

export const copy = {
  ui: {
    placeholder: 'Ask a question. For example: what does it cost?',
    placeholderSession: 'Ask a question',
    thinking: 'Loading',
    next: 'Next',
    questionIndex: 'Topic',
    technical: 'Technical detail',
    allLink: 'Everything on one page',
    backToStart: 'Back to the start',
  },

  depth: ['Just started', 'Reading', 'Reading in detail', 'Told me about their business'],

  lens: {
    idle: 'Move the pointer to look underneath.',
    idleTouch: 'Touch and move to look underneath.',
    found: 'Bottleneck: work waiting for a person.',
    note: 'bottleneck',
    noteLines: ['example'],
  },

  chips: {
    engagement: 'How this works in my business',
    startOver: 'Back to the start',
    backToProjects: 'My three projects',
    showBrief: 'Your summary',
    keepExploring: 'My three projects',
    bookIt: 'Email this summary to book a call',
    addContext: 'Add details about your business',
    l2Suggest: [
      { label: 'What I do', target: 'method' },
      { label: 'How we start', target: 'process' },
    ],
  },

  // The booking flow is honest: the visitor sends the summary from their own
  // email. Nothing claims to be sent or booked unless it was.
  booking: {
    userStart: 'Book the free call',
    intro: 'No booking form. Email this summary from your own account. I reply the same day with times.',
    emailButton: 'Email the summary',
    copyButton: 'Copy the summary',
    copied: 'Copied',
    subject: 'Request for a 30-minute call',
    bodyIntro: 'Hello Ruben,\n\nThe problem, in one or two sentences:\n\n\n\n— Summary from mindunder.dev —',
    after: 'You can keep reading first.',
    privacy: 'Stored in this tab only. Sent only if you email it.',
  },

  engagement: {
    userTellMore: 'How this works in my business',
    userAddContext: 'Add details about your business',
    addContextPrompt: 'Type the details in the box below. I will add them to your summary.',
    addedToBrief: 'Added to your summary.',
  },

  // Typed questions that match no topic get one of these short answers.
  l2: {
    topics: [
      {
        keywords: ['automat', 'workflow'],
        response: 'I write down what starts each task, what it needs, and what happens when it fails. Then I automate the steps that repeat.',
      },
      {
        keywords: ['agent', 'ai agent', 'llm', 'gpt', 'claude', 'chatgpt'],
        response: 'I build AI tools that keep a record of their work. When they are not sure, they pass the task to a person.',
      },
      {
        keywords: ['scale', 'growth', 'grow'],
        response: 'Growth problems are often information stuck between people. I find where it sticks and automate that step.',
      },
      {
        keywords: ['different', 'unique', 'compare', 'competitor'],
        response: 'Every system starts with a person checking all of its work. It runs alone only after it has shown that it works.',
      },
    ],
    fallback: 'No written answer for that yet. Choose a topic below, or email {email}.',
  },

  // Shown when a visitor describes their own business.
  l3: {
    acknowledge: 'Noted.',
    exploredTemplate: 'You have read: {explored}.',
    exploredFallback: 'nothing yet',
    deepSuffix: '',
    discovery: ['What is going wrong?', 'What would good look like?', 'What have you tried?'],
    guidance: 'Answer any of these in the box below. Or see your summary and email it to me.',
    briefTitle: 'Your summary.',
    briefConfirm: 'If it is right, email it to book a call.',
  },

  brief: {
    blockTitle: 'Summary of your visit',
    labels: {
      journey: 'Topics you read',
      interest: 'Projects you looked at',
      context: 'What you told me',
      questions: 'Questions you asked',
      estimate: 'Your estimate',
    },
    defaults: {
      minimal: 'None yet',
      none: 'None',
      surface: '',
      deepPrefix: '',
      nothingYet: 'Nothing yet',
    },
  },

  navigation: {
    revisit: 'You have read this one. Other topics are below.',
    engageTrailLabel: 'Your business',
    userShowBrief: 'Your summary',
    parentOverview: 'Back to: {label}',
  },
};

export function fill(template, vars = {}) {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? site[k] ?? '');
}

// Merge content/site.json into site, config and copy. Arrays replace; objects merge.
export function applyConfig(json = {}) {
  const p = json.person || {};
  Object.assign(site, {
    brand: json.brand ?? site.brand,
    timeZone: json.timeZone ?? site.timeZone,
    email: p.email ?? site.email,
    name: p.name ?? site.name,
    fullName: p.fullName ?? site.fullName,
    location: p.location ?? site.location,
    links: p.links ?? site.links,
  });
  for (const k of ['facts', 'landing', 'onePage', 'features', 'reading', 'language']) {
    if (json[k]) config[k] = merge(config[k], json[k]);
  }
  if (json.landing?.lens) copy.lens = merge(copy.lens, json.landing.lens);
  if (json.copy) merge(copy, json.copy, true);
  return { site, config, copy };
}

function merge(target, src, inPlace = false) {
  const out = inPlace ? target : { ...target };
  for (const [k, v] of Object.entries(src)) {
    if (k.startsWith('$')) continue;
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && target[k] && typeof target[k] === 'object' ? merge(target[k], v, inPlace) : v;
  }
  return out;
}

// A fact from site.json: its value, else its "missing" sentence, else null.
export function factText(key) {
  const f = config.facts[key];
  if (!f) return null;
  return f.value ?? f.missing ?? null;
}
