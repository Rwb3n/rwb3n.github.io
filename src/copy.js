// UI strings. Content (the conversation itself) lives in /content.

export const site = {
  brand: 'mindunder.dev',
  email: 'lab@mindunder.dev',
  location: 'London, UK',
  timeZone: 'Europe/London',
};

export const copy = {
  ui: {
    placeholder: 'Or ask anything — “we spend Mondays in spreadsheets”',
    placeholderSession: 'Ask a follow-up…',
    thinking: 'Compiling',
    next: 'Next',
    questionIndex: 'Q',
  },

  depth: ['Surface', 'Exploring', 'Deep', 'Engaged'],

  lens: {
    idle: 'Your operation, under the surface. Move to look.',
    idleTouch: 'Your operation, under the surface. Drag to look.',
    found: 'There. Three handoffs, one spreadsheet, nobody’s job.',
  },

  chips: {
    engagement: 'How would this work in my business?',
    startOver: 'Start over',
    backToProjects: 'Back to projects',
    showBrief: 'Show the brief',
    keepExploring: 'Keep exploring',
    bookIt: 'Looks right — send it',
    addContext: 'Add more context',
    l2Suggest: [
      { label: 'See what’s shipped', target: 'projects' },
      { label: 'Who’s behind this?', target: 'ruben' },
    ],
  },

  // The previous build simulated a calendar and claimed the brief was "sent to
  // both parties" without sending anything. This flow is honest: it hands the
  // brief to the visitor's own mail client.
  booking: {
    userStart: 'Let’s book',
    intro: 'No calendar widget and no form. Send the brief from your own inbox — you’ll get a reply the same day with times for the thirty minutes.',
    emailButton: 'Email the brief',
    copyButton: 'Copy brief',
    copied: 'Copied',
    subject: 'Thirty minutes — what’s dragging',
    bodyIntro: 'Hi Ruben,\n\nWhat’s dragging, in a sentence or two:\n\n\n\n— Session brief from mindunder.dev —',
    after: 'I’ll be here if you want to look at anything else first.',
  },

  engagement: {
    userTellMore: 'Tell me more',
    userAddContext: 'Let me add context',
    addContextPrompt: 'Go ahead — type it below. I’ll add it to the brief.',
    addedToBrief: 'Added to the brief.',
  },

  l2: {
    topics: [
      {
        keywords: ['automat', 'workflow', 'process'],
        response: 'Automation design starts with the decision loop — what triggers action, what data is needed, what happens on failure. These systems are built exception-first.',
      },
      {
        keywords: ['agent', 'ai agent', 'llm', 'gpt', 'claude'],
        response: 'Most agent implementations are glorified prompt chains. The work here focuses on agents that maintain state, learn from outcomes, and know their own limits.',
      },
      {
        keywords: ['scale', 'growth'],
        response: 'Scaling is usually a systems problem disguised as a people problem. Map where information gets stuck, then automate the bottleneck.',
      },
      {
        keywords: ['cost', 'budget', 'price'],
        response: 'CALLSHEET runs at ~£36/month. The alternative is headcount, which scales linearly. Systems compound. Salaries recur.',
      },
      {
        keywords: ['different', 'unique', 'compare'],
        response: 'The differentiator is the autonomy model. Start with human review for everything, graduate to self-execution only when thresholds are met.',
      },
    ],
    fallback: 'No canned answer for that — which usually means it’s worth the call. Book the thirty minutes and tell me properly, or keep exploring.',
  },

  l3: {
    acknowledge: 'Noted. Working with what I know.',
    exploredTemplate: 'You’ve explored {explored}{deepSuffix}',
    exploredFallback: 'the overview',
    deepSuffix: ' — deep into the technical detail.',
    discovery: ['What’s breaking?', 'What does working look like?', 'What’s been tried?'],
    guidance: 'Answer any of those, or I can show you the brief so far and we’ll book a call.',
    briefTitle: 'Session brief.',
    briefConfirm: 'Look right? Send it and we’ll pick a time.',
  },

  brief: {
    blockTitle: 'Discovery brief',
    labels: {
      journey: 'Journey',
      interest: 'Interest',
      depth: 'Depth',
      context: 'Context',
      questions: 'Questions',
      interactions: 'Interactions',
    },
    defaults: {
      minimal: 'Minimal',
      none: 'None',
      surface: 'Surface',
      deepPrefix: 'Deep — ',
      nothingYet: 'Nothing yet',
    },
  },

  navigation: {
    revisit: 'You’ve seen this one. You might also like:',
    engageTrailLabel: 'Engage',
    userShowBrief: 'Show the brief',
    parentOverview: '{label} overview',
  },
};

export function fill(template, vars = {}) {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}
