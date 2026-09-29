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
    placeholder: 'Type a question, for example: What does it cost?',
    placeholderSession: 'Type a question',
    thinking: 'Loading',
    next: 'Next topics',
    questionIndex: 'Topic',
    technical: 'Technical detail, mainly for developers',
    allLink: 'Read everything on one page',
    backToStart: 'Back to the start',
  },

  depth: ['Just started', 'Reading', 'Reading in detail', 'Told me about their business'],

  lens: {
    idle: 'Illustration: a business process drawn as a network. Move your pointer to look underneath it.',
    idleTouch: 'Illustration: a business process drawn as a network. Move your finger across it to look underneath.',
    found: 'Illustration: the circled point is a bottleneck, a place where work waits for a person.',
    note: 'bottleneck',
    noteLines: ['example only'],
  },

  chips: {
    engagement: 'How this could work in my business',
    startOver: 'Back to the start',
    backToProjects: 'See my three projects',
    showBrief: 'See a summary of what you read',
    keepExploring: 'See my three projects',
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
    userStart: 'Book the free 30-minute call',
    intro: 'There is no booking form. To book the free 30-minute call, email this summary from your own email account. I reply the same day with times.',
    emailButton: 'Email the summary',
    copyButton: 'Copy the summary',
    copied: 'Copied',
    subject: 'Request for a 30-minute call',
    bodyIntro: 'Hello Ruben,\n\nThe problem in my business, in one or two sentences:\n\n\n\n— Summary from mindunder.dev —',
    after: 'You can keep reading other topics before you send it.',
    privacy: 'This summary is stored only in this browser tab. It is sent only if you email it.',
  },

  engagement: {
    userTellMore: 'How this could work in my business',
    userAddContext: 'Add details about your business',
    addContextPrompt: 'Type the details in the box at the bottom of the page. I will add them to your summary.',
    addedToBrief: 'I added this to your summary.',
  },

  // Typed questions that match no topic get one of these short answers.
  l2: {
    topics: [
      {
        keywords: ['automat', 'workflow'],
        response: 'I start by writing down what starts each task, what information it needs, and what should happen when something goes wrong. Then I automate the steps that repeat.',
      },
      {
        keywords: ['agent', 'ai agent', 'llm', 'gpt', 'claude', 'chatgpt'],
        response: 'I build AI tools that keep a record of their work and learn from the results. When they are not sure, they pass the task to a person.',
      },
      {
        keywords: ['scale', 'growth', 'grow'],
        response: 'Growth problems are often caused by information getting stuck between people. I find where it gets stuck and automate that step.',
      },
      {
        keywords: ['different', 'unique', 'compare', 'competitor'],
        response: 'Every system starts with a person checking all of its work. It only runs alone after it has shown that it works.',
      },
    ],
    fallback: 'I do not have a written answer to that question. You can choose a topic below, or email the question to {email}.',
  },

  // Shown when a visitor describes their own business.
  l3: {
    acknowledge: 'Thank you, I have noted that.',
    exploredTemplate: 'So far you have read about: {explored}.',
    exploredFallback: 'no topics yet',
    deepSuffix: '',
    discovery: ['What is going wrong?', 'What would good look like?', 'What have you already tried?'],
    guidance: 'You can answer any of these questions in the box at the bottom of the page. Or see a summary of your visit and email it to me.',
    briefTitle: 'Here is a summary of your visit.',
    briefConfirm: 'If it is correct, you can email it to me to book a call.',
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
    revisit: 'You have read this topic before. Here are some other topics.',
    engageTrailLabel: 'Your business',
    userShowBrief: 'See a summary of what you read',
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
