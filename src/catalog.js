// The component catalogue: every block type, what it takes, and an example.
// Pure data plus a validator, so it runs in the browser (the /components/ page)
// and in node (tests check every topic in content/nodes against it).
//
// Prop types: string · number · boolean · enum (values) · list (of) ·
// object (props) · blocks (a list of blocks, for composition) · any.
// Keys starting with `$` are comments and are ignored.

const str = (doc, required = false) => ({ type: 'string', doc, required });
const num = (doc, required = false) => ({ type: 'number', doc, required });
const list = (of, doc, required = false) => ({ type: 'list', of, doc, required });
const obj = (props, doc, required = false) => ({ type: 'object', props, doc, required });
const oneOf = (values, doc, required = false) => ({ type: 'enum', values, doc, required });
const req = (p) => ({ ...p, required: true });

export const categories = [
  { id: 'text', label: 'Text', doc: 'Words: paragraphs, headings, quotes, code.' },
  { id: 'numbers', label: 'Numbers', doc: 'Single figures, rows of figures, progress.' },
  { id: 'structure', label: 'Lists and structure', doc: 'Groups of items, steps, tables, layout.' },
  { id: 'diagrams', label: 'Diagrams', doc: 'Processes drawn as boxes and arrows.' },
  { id: 'interactive', label: 'Interactive', doc: 'Blocks the reader changes by using them.' },
  { id: 'facts', label: 'Facts', doc: 'Values from content/site.json, one source of truth.' },
  { id: 'runtime', label: 'Session', doc: 'Made by the engine from a visit. Not written in topics.' },
];

const flowNode = obj({
  id: str('Unique within the diagram. Edges refer to it.', true),
  label: str('Text in the box.', true),
  sublabel: str('Second, smaller line.'),
  variant: oneOf(['accent', 'muted'], '`accent` marks the thing that matters; `muted` is dashed.'),
});
const edge = obj({ from: str('Node id.', true), to: str('Node id.', true), label: str('Text on the arrow.') });

export const blocks = {
  // Text ----------------------------------------------------------------------
  text: {
    category: 'text',
    doc: 'A paragraph. Words rise in one by one when motion is Full.',
    props: { content: str('The paragraph.', true) },
    example: { type: 'text', content: 'This is an example paragraph. It says one thing, in short sentences, in plain words.' },
  },
  hero: {
    category: 'text',
    doc: 'A large serif heading. One word can be set in the accent colour.',
    props: {
      title: str('The heading.', true),
      accentWord: str('A word in the title to set in italic accent.'),
      subtitle: str('A short line under the title, in mono.'),
    },
    example: { type: 'hero', title: 'Find the work that repeats', accentWord: 'repeats', subtitle: 'Example heading' },
  },
  callout: {
    category: 'text',
    doc: 'A quotation or a point to remember. Serif, with a rule.',
    props: { text: str('The quote.', true), attribution: str('Who said it. Only for a real quote.') },
    example: { type: 'callout', text: 'When the design is simpler, the work is simpler.', attribution: 'Example attribution' },
  },
  code: {
    category: 'text',
    doc: 'Preformatted text: code, a timetable, a folder tree.',
    props: { content: str('The text. Newlines and spaces are kept.', true), language: str('A label above the box.') },
    example: { type: 'code', language: 'folders', content: 'work/\n  inbox/      new requests\n  doing/      one folder per task\n  done/       finished, with a record' },
  },

  // Numbers -------------------------------------------------------------------
  metric: {
    category: 'numbers',
    doc: 'One big number. The digits roll into place like an odometer.',
    props: {
      value: req({ type: 'any', doc: 'The number, with any prefix or suffix (e.g. "~£4k", "37").' }),
      label: str('What the number counts.', true),
      sublabel: str('A second line of detail.'),
    },
    example: { type: 'metric', value: '37', label: 'Scheduled jobs', sublabel: 'Example: 18 of them set their own next run time' },
  },
  metricRow: {
    category: 'numbers',
    doc: 'Two to four numbers side by side, divided by hairlines.',
    props: { items: list(obj({ value: req({ type: 'any', doc: 'The number.' }), label: str('What it counts.', true) }), 'The numbers.', true) },
    example: { type: 'metricRow', items: [{ value: '3', label: 'projects' }, { value: '118', label: 'server functions' }, { value: '0', label: 'staff' }] },
  },
  stats: {
    category: 'numbers',
    doc: 'Label and value pairs in a grid. An email address becomes a link.',
    props: { items: list(obj({ label: str('Small label.', true), value: str('The value.', true) }), 'The pairs.', true) },
    example: { type: 'stats', items: [{ label: 'Reply time', value: 'The same day' }, { label: 'Based in', value: 'London, UK' }, { label: 'Email', value: 'lab@mindunder.dev' }] },
  },
  progress: {
    category: 'numbers',
    doc: 'Steps done out of a total. The next step is striped.',
    props: {
      label: str('What is being counted.', true),
      current: num('Steps done.', true),
      total: num('All steps.', true),
      sublabel: str('A sentence under the bar.'),
    },
    example: { type: 'progress', label: 'Tasks approved to run alone', current: 2, total: 5, sublabel: 'Example: two tasks are approved. The third is being checked.' },
  },

  // Lists and structure ---------------------------------------------------------
  pills: {
    category: 'structure',
    doc: 'Short tags in a row: tools, skills, topics.',
    props: { items: list({ type: 'string' }, 'The tags.', true), label: str('A small label above.') },
    example: { type: 'pills', label: 'Tools', items: ['Spreadsheets', 'Email', 'Databases', 'Scheduling', 'Reports'] },
  },
  badge: {
    category: 'structure',
    doc: 'A status line. `active` adds a pulse (runs twice, then stops).',
    props: { status: str('The text.', true), variant: oneOf(['default', 'active'], 'Default is quiet; active is live state.') },
    example: { type: 'badge', status: 'Taking new work', variant: 'active' },
  },
  grid: {
    category: 'structure',
    doc: 'Cards. Three or six cards make three columns; others make two. A card with a target is a button that opens that topic.',
    props: {
      items: list(obj({
        title: str('Card title, in mono capitals.', true),
        description: str('A sentence. Starting with a quote mark sets it in serif.'),
        status: str('A status with a pulse, top right.'),
        target: str('Topic id to open when clicked.'),
      }), 'The cards.', true),
    },
    example: { type: 'grid', items: [
      { title: 'Project A', status: 'Running', description: 'An example project. It runs without staff.', target: 'projects' },
      { title: 'Project B', status: 'Research', description: 'An example project that is still being tested.', target: 'projects' },
      { title: 'Project C', status: 'In daily use', description: 'An example tool used every day.', target: 'projects' },
    ] },
  },
  layers: {
    category: 'structure',
    doc: 'A stack of labelled rows. If every label is a number, it is an ordered list of steps.',
    props: { items: list(obj({ label: str('Short label, or a step number.', true), title: str('The row.', true), detail: str('A line of detail.') }), 'The rows.', true) },
    example: { type: 'layers', items: [
      { label: '1', title: 'A free 30-minute call', detail: 'You describe the work. I ask questions.' },
      { label: '2', title: 'A one-page summary', detail: 'Where time is lost, in writing.' },
      { label: '3', title: 'A fixed price', detail: 'Only if you want to go ahead.' },
    ] },
  },
  timeline: {
    category: 'structure',
    doc: 'Dated events, in order. Same look as layers.',
    props: { items: list(obj({ date: str('When.', true), event: str('What happened.'), title: str('Same as event.'), detail: str('A line of detail.') }), 'The events.', true) },
    example: { type: 'timeline', items: [{ date: 'Week 1', event: 'Call and summary' }, { date: 'Week 2', event: 'First version running', detail: 'Example only' }, { date: 'Week 4', event: 'Handed over' }] },
  },
  table: {
    category: 'structure',
    doc: 'Rows and columns. The last column is set in mono. Scrolls sideways on small screens.',
    props: { headers: list({ type: 'string' }, 'Column headings.', true), rows: list(list({ type: 'string' }), 'Rows of cells.', true) },
    example: { type: 'table', headers: ['Task', 'Done by', 'Time a week'], rows: [['Copy orders into the invoice system', 'A person', '4 h'], ['Chase approvals', 'A person', '2 h'], ['Weekly report', 'The system', '0 h']] },
  },
  split: {
    category: 'structure',
    doc: 'Two columns of blocks. Blocks nest, so any block can go on either side. One column on phones.',
    props: { left: { type: 'blocks', doc: 'Blocks in the left column.' }, right: { type: 'blocks', doc: 'Blocks in the right column.' } },
    example: { type: 'split',
      left: [{ type: 'metric', value: '4', label: 'hours a week, before' }],
      right: [{ type: 'metric', value: '0', label: 'hours a week, after' }, { type: 'text', content: 'Example: the report is made by the system.' }] },
  },

  // Diagrams --------------------------------------------------------------------
  flow: {
    category: 'diagrams',
    doc: 'A process diagram in SVG. Measures its labels; if it does not fit, horizontal folds to vertical and fanout folds to a trunk. Hover a node to light its links.',
    props: {
      layout: oneOf(['horizontal', 'vertical', 'fanout'], 'Default horizontal. Fanout: the first node points to all the others.'),
      title: str('A caption above.'),
      nodes: list(flowNode, 'The boxes, in order.', true),
      edges: list(edge, 'The arrows.', true),
      loop: obj({ from: str('Node id.', true), to: str('Node id.', true), label: str('Text on the loop.') }, 'One arrow back, drawn dashed.'),
    },
    example: { type: 'flow', layout: 'horizontal', title: 'Example process',
      nodes: [{ id: 'a', label: 'Order arrives' }, { id: 'b', label: 'Checked', sublabel: 'by the system', variant: 'accent' }, { id: 'c', label: 'Approved' }, { id: 'd', label: 'Invoiced' }],
      edges: [{ from: 'a', to: 'b' }, { from: 'b', to: 'c', label: 'flags' }, { from: 'c', to: 'd' }],
      loop: { from: 'd', to: 'a', label: 'next order' } },
  },

  // Interactive ---------------------------------------------------------------
  compare: {
    category: 'interactive',
    doc: 'One process in two or more states. Steps that keep their id move to their new place; others fade out or grow in. The counter rolls.',
    props: {
      label: str('Accessible name for the toggle.'),
      start: num('Index of the first state shown.'),
      states: list(obj({
        key: str('Set as data-state.'),
        label: str('Toggle button text.', true),
        title: str('Caption.'),
        text: str('Paragraph under the steps.'),
        stat: obj({ value: req({ type: 'any', doc: 'Number.' }), label: str('What it counts.', true) }, 'A counter.'),
        nodes: list(obj({ id: str('Keep the id across states to move the step.', true), label: str('Step text.', true), variant: oneOf(['accent', 'muted'], 'Style.'), via: str('Text on the arrow into this step.') }), 'Steps, in order.', true),
      }), 'The states.', true),
    },
    example: { type: 'compare', label: 'Show the process', states: [
      { key: 'before', label: 'Before', title: 'Before: a person copies the data', stat: { value: '2', label: 'steps done by hand' },
        nodes: [{ id: 'in', label: 'Order' }, { id: 'p1', label: 'Person', variant: 'muted' }, { id: 'sheet', label: 'Spreadsheet' }, { id: 'p2', label: 'Person', variant: 'muted' }, { id: 'inv', label: 'Invoice' }] },
      { key: 'after', label: 'After', title: 'After: the system copies it', stat: { value: '0', label: 'steps done by hand' }, text: 'Example only.',
        nodes: [{ id: 'in', label: 'Order' }, { id: 'sys', label: 'System', variant: 'accent', via: 'reads' }, { id: 'inv', label: 'Invoice', via: 'writes' }] },
    ] },
  },
  estimate: {
    category: 'interactive',
    doc: 'Yearly cost of repeated work from three inputs (keys people, hours, rate). A grid of working weeks fills in. Nothing is sent.',
    props: {
      title: str('Heading.'),
      inputs: list(obj({
        key: oneOf(['people', 'hours', 'rate'], 'Which number this is.', true),
        label: str('Field label.', true),
        min: num('Lowest value.', true), max: num('Highest value.', true), step: num('Step for the − and + buttons.'),
        value: num('Starting value.', true),
        hint: str('Help text; default names the range.'), prefix: str('E.g. £.'),
        less: str('Accessible name of −.'), more: str('Accessible name of +.'),
      }), 'Exactly the three inputs.', true),
      labels: obj({ hours: str(''), cost: str(''), weeksBefore: str(''), weeksAfter: str(''), key: str(''), more: str('Uses {n}.') }, 'Interface text overrides.'),
      weeksPerYear: num('Default 46.'), hoursPerWeek: num('Default 37.5.'),
      maxCells: num('Most squares drawn. Default 230.'), cellsPerRow: num('Default 23.'),
      note: str('Assumptions, printed under the result.'),
      summary: str('Sentence template: {people} {hours} {rate} {totalHours} {totalCost} {weeks}.'),
      addLabel: str('Button that adds the estimate to the visit summary.'), added: str('Confirmation.'),
    },
    example: { type: 'estimate', title: 'Example estimate', inputs: [
      { key: 'people', label: 'People who do this task', min: 1, max: 500, step: 1, value: 3 },
      { key: 'hours', label: 'Hours each person spends on it each week', min: 0.5, max: 40, step: 0.5, value: 4 },
      { key: 'rate', label: 'Cost of one hour, in pounds', min: 5, max: 500, step: 1, value: 30, prefix: '£' },
    ], note: 'Uses only the numbers you type. Nothing is sent.', addLabel: 'Add this estimate to my summary' },
  },

  // Facts -----------------------------------------------------------------------
  fact: {
    category: 'facts',
    doc: 'One fact from site.json. With no value it shows the "missing" sentence, with a rule; with neither it renders nothing.',
    props: { key: str('A key of site.json → facts.', true), label: { type: 'boolean', doc: 'Show the label. Default true.' } },
    example: { type: 'fact', key: 'reply' },
  },
  facts: {
    category: 'facts',
    doc: 'Several facts as a definition list.',
    props: { keys: list({ type: 'string' }, 'Keys of site.json → facts.') },
    example: { type: 'facts', keys: ['firstStep', 'cost', 'reply', 'location'] },
  },

  // Session ---------------------------------------------------------------------
  brief: {
    category: 'runtime',
    doc: 'The printed summary of a visit. The engine builds `data` from the topics read.',
    runtime: true,
    props: { data: obj({ journey: str(''), interest: str(''), context: str(''), questions: str(''), estimate: str('') }, 'From engine.briefData().', true) },
    example: { type: 'brief', data: { journey: 'What I do → Problems I solve → Example', interest: 'Project A', context: 'Example: we copy orders by hand', questions: 'What does it cost?', estimate: null } },
  },
  compose: {
    category: 'runtime',
    doc: 'Hands the summary to the visitor’s own mail client, with a copy button as a fallback. Nothing is sent by the site.',
    runtime: true,
    props: { data: obj({ journey: str(''), interest: str(''), context: str(''), questions: str(''), estimate: str('') }, 'Same as brief.', true) },
    example: { type: 'compose', data: { journey: 'What I do → Example', interest: 'none', context: 'none', questions: 'none', estimate: null } },
  },
};

// Interface pieces outside the block system, shown on the /components/ page as
// static markup with the class names from styles/main.css.
export const primitives = [
  { name: 'Buttons', doc: 'One primary action per view; everything else is ghost.', html:
    '<a class="btn btn-primary" href="#">Email the summary <span aria-hidden="true">→</span></a>\n<button class="btn btn-ghost" type="button">Copy the summary</button>' },
  { name: 'Chips', doc: 'Next topics, under an answer. `is-engage` pulls toward the business question; `is-primary` is the one action.', html:
    '<nav class="chips" aria-label="Example chips">\n  <span class="chips-heading micro">Next topics</span>\n  <button class="chip" type="button"><span class="chip-label">Problems I solve</span><span class="chip-arrow" aria-hidden="true">→</span></button>\n  <button class="chip is-engage" type="button"><span class="chip-label"><span class="pulse" aria-hidden="true"></span>How this could work in my business</span><span class="chip-arrow" aria-hidden="true">→</span></button>\n  <button class="chip is-primary" type="button"><span class="chip-label">Email this summary to book a call</span><span class="chip-arrow" aria-hidden="true">→</span></button>\n</nav>' },
  { name: 'Entry rows', doc: 'Numbered links on the landing. The label fills with ink on hover.', html:
    '<nav class="entry" aria-label="Example entry">\n  <a class="entry-item" href="#"><span class="entry-index">01</span><span class="entry-label">What I do</span><span class="entry-arrow" aria-hidden="true">→</span></a>\n  <a class="entry-item" href="#"><span class="entry-index">02</span><span class="entry-label">Problems I solve</span><span class="entry-arrow" aria-hidden="true">→</span></a>\n</nav>\n<a class="entry-tool" href="#"><span class="entry-tool-label">Work out what repeated work costs you</span><span class="entry-tool-note">Type three numbers.</span><span class="entry-arrow" aria-hidden="true">→</span></a>' },
  { name: 'Offer list', doc: 'Key facts as a definition list, readable before any interaction.', html:
    '<dl class="offer">\n  <div class="offer-item"><dt>First step</dt><dd>A free 30-minute call.</dd></div>\n  <div class="offer-item"><dt>Reply time</dt><dd>The same day</dd></div>\n</dl>' },
  { name: 'Labels', doc: '`micro` is the system voice: mono, spaced capitals. `eyebrow` sits above a heading. `turn-tag` marks technical topics.', html:
    '<p class="eyebrow"><span class="eyebrow-rule" aria-hidden="true"></span>Business process automation · London</p>\n<span class="micro">Micro label</span>\n<p class="turn-tag">Technical detail, mainly for developers</p>' },
  { name: 'Live state', doc: 'The pulse runs twice, then stops. The scan line shows loading.', html:
    '<p class="bar-status"><span class="pulse" aria-hidden="true"></span><span>London</span></p>\n<div class="scan" role="status"><span class="scan-label micro">Loading</span><span class="scan-track" aria-hidden="true"><i></i></span></div>' },
  { name: 'Ask bar', doc: 'The free-text input. Fixed to the bottom of the real page; shown here in place.', html:
    '<form class="ask is-static" onsubmit="return false" aria-label="Example ask bar">\n  <label class="ask-prompt" for="ex-ask">Ask</label>\n  <input class="ask-input" id="ex-ask" type="text" placeholder="Type a question" />\n  <kbd class="ask-hint" aria-hidden="true">/</kbd>\n  <button class="ask-send" type="submit" aria-label="Send"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" /></svg></button>\n</form>' },
];

// Validation --------------------------------------------------------------------

export const blockTypes = Object.keys(blocks);

// Returns a list of problems ("path: message"); empty means valid.
export function validateBlock(block, path = 'block') {
  if (!block || typeof block !== 'object' || Array.isArray(block)) return [`${path}: must be an object`];
  const spec = blocks[block.type];
  if (!spec) return [`${path}: unknown type "${block.type}" (known: ${blockTypes.join(', ')})`];
  return checkProps(block, spec.props, `${path}<${block.type}>`, new Set(['type']));
}

export function validateBlocks(list, path = 'blocks') {
  if (!Array.isArray(list)) return [`${path}: must be a list of blocks`];
  return list.flatMap((b, i) => validateBlock(b, `${path}[${i}]`));
}

function checkProps(value, props, path, allowed = new Set()) {
  const out = [];
  for (const [k, p] of Object.entries(props)) {
    if (value[k] == null) { if (p.required) out.push(`${path}.${k}: required`); continue; }
    out.push(...check(value[k], p, `${path}.${k}`));
  }
  for (const k of Object.keys(value)) {
    if (!(k in props) && !allowed.has(k) && !k.startsWith('$')) out.push(`${path}.${k}: not a known prop`);
  }
  return out;
}

function check(v, p, path) {
  switch (p.type) {
    case 'any': return [];
    case 'string': return typeof v === 'string' ? [] : [`${path}: must be a string`];
    case 'number': return typeof v === 'number' && Number.isFinite(v) ? [] : [`${path}: must be a number`];
    case 'boolean': return typeof v === 'boolean' ? [] : [`${path}: must be true or false`];
    case 'enum': return p.values.includes(v) ? [] : [`${path}: must be one of ${p.values.join(', ')}`];
    case 'list': return Array.isArray(v) ? v.flatMap((x, i) => check(x, p.of, `${path}[${i}]`)) : [`${path}: must be a list`];
    case 'object': return v && typeof v === 'object' && !Array.isArray(v) ? checkProps(v, p.props, path) : [`${path}: must be an object`];
    case 'blocks': return validateBlocks(v, path);
    default: return [`${path}: unknown prop type ${p.type}`];
  }
}

// Where each block type is used in the content graph: { type: [nodeId, …] }.
export function usage(nodes) {
  const out = Object.fromEntries(blockTypes.map((t) => [t, new Set()]));
  const walk = (b, id) => {
    if (!b?.type) return;
    (out[b.type] ||= new Set()).add(id);
    for (const c of [...(b.left || []), ...(b.right || [])]) walk(c, id);
  };
  for (const n of nodes) for (const b of n.blocks || []) walk(b, n.id);
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, [...v].sort()]));
}

// A readable type for the props table.
export function typeLabel(p) {
  if (p.type === 'enum') return p.values.map((v) => `"${v}"`).join(' | ');
  if (p.type === 'list') return `list of ${p.of.type === 'object' ? 'objects' : typeLabel(p.of)}`;
  return p.type;
}
