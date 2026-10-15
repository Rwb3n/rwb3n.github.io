// Site settings for code that renders blocks in the browser (the component
// library). The page itself is rendered from content/site.json by
// src/static.js; the conversation's interface text was retired with it.

export const site = {
  brand: 'mindunder.dev',
  email: 'lab@mindunder.dev',
  name: 'Ruben',
  location: 'London, UK',
  timeZone: 'Europe/London',
};

// Filled from site.json: facts and reading defaults.
export const config = {
  facts: {},
  reading: {},
  language: {},
};

export function fill(template, vars = {}) {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? site[k] ?? '');
}

export function applyConfig(json = {}) {
  const p = json.person || {};
  Object.assign(site, {
    brand: json.brand ?? site.brand,
    timeZone: json.timeZone ?? site.timeZone,
    email: p.email ?? site.email,
    name: p.name ?? site.name,
    location: p.location ?? site.location,
  });
  for (const k of ['facts', 'reading', 'language']) if (json[k]) config[k] = { ...config[k], ...json[k] };
  return { site, config };
}

// A fact from site.json: its value, else its "missing" sentence, else null.
export function factText(key) {
  const f = config.facts[key];
  if (!f) return null;
  return f.value ?? f.missing ?? null;
}
