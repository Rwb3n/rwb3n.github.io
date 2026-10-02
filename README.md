# mindunder.dev

Static site, no build step. GitHub Pages serves the repo root.

```
index.html        shell + static landing (readable without JS)
styles/           tokens.css (design tokens, themes) · main.css · library.css
components/       /components/: the component library page
src/
  main.js         boot: theme, clock, lens, content
  app.js          conversation controller (DOM)
  engine.js       routing, session, gravity, brief — pure, tested
  blocks.js       block renderers
  showpieces.js   interactive blocks: compare (before/after), estimate
  catalog.js      component catalogue: every block's props, example, validator
  library.js      the /components/ page
  layouts.js      page layouts: side column, conversation turn, next topics, one-page view
  landing.js      the landing's movement: rising words, lens, x-ray (main.js and the library)
  flow.js         SVG flow diagrams
  lens.js         landing canvas
  copy.js         interface text (defaults; site.json overrides)
  prefs.js        reading preferences: motion, text size, sound
  settings.js     the "Reading settings" panel
  lint.js         plain-language checks (run by npm test)
  static.js       generates the static parts of index.html
content/
  site.json             offer, facts, landing text, features, reading
                        defaults, interface text overrides, writing rules
  graphs/default.json   which node files to load
  graphs/fixtures.json  test content for /components/ and tests; not on the site
  nodes/*.json          topics: blocks + chips + intents (+ "audience")
scripts/sync.mjs  writes site.json into index.html's sync regions
tests/            node --test; tests/visual: Playwright screenshots
```

## Change what the site says

1. Edit `content/site.json` (offer, facts, landing) or `content/nodes/*.json`
   (topics). Keys starting with `$` are comments.
2. `npm run sync` if you changed site.json or the root topic's chips. This
   rewrites the `<!-- sync:… -->` regions of index.html, so the page reads the
   same without JavaScript.
3. `npm test`. It fails on idioms, jargon, in-jokes, long sentences,
   unexplained abbreviations, vague buttons, and a reading grade over 9
   (12 for topics marked `"audience": "technical"`). It also lists the facts
   that are still empty; the site says plainly that they are not published.

Facts are `{ label, value, missing }`. With no `value`, the site shows the
`missing` sentence; with neither, the fact is hidden.

## Work on it

```sh
npm run dev      # python3 -m http.server 8000
npm run sync     # regenerate index.html's static regions from site.json
npm test         # sync check, engine, content graph, plain-language lint
npm run test:visual        # screenshots of /components/ (Playwright, Chromium)
npm run test:visual -- -u  # accept a deliberate change as the new baseline
```

Screenshot tests capture every part of `/components/` in light, dark and
phone width, with motion Off and webfonts blocked so runs are repeatable.
Baselines are per platform (`tests/visual/__screenshots__/…-linux.png`); on
another OS, run with `-u` once to create your own. `npm i` first; set
`PW_CHROMIUM=/path/to/chrome` to use an installed browser.

Deep links: `/#/<node-id>` opens straight into a node, e.g. `/#/method`.
`/#/all` opens every topic on one page (also printable).

See [DESIGN.md](DESIGN.md) for the design system, and `/components/` for every
part rendered live: tokens, interface pieces, each block with its props and
where it is used, and a composer that builds a topic from JSON.

Adding a block type: add the renderer in `src/blocks.js` and an entry in
`src/catalog.js`. `npm test` fails if the two lists differ, if an example is
invalid, or if any topic uses a block or prop the catalogue does not know.
