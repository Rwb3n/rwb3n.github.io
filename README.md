# mindunder.dev

Static site, no build step. GitHub Pages serves the repo root.

```
index.html        the whole site: one page, written by `npm run sync` (readable without JS)
styles/           tokens.css (tokens, themes) · main.css (shared parts, blocks) · page.css (the page) · library.css
components/       /components/: the component library (development tool)
type/             /type/: type directions that were tried
src/
  static.js       renders the page from content/site.json (used by sync, the library and the tests)
  main.js         the page's script: settings, theme, rising headline, booking
  book.js         booking with Cal.com: embed on demand, prefill, loading line, fallback
  job.js          step 1: taps, not typing; each tap brings the next component (job automated, money, first steps)
  decide.js       step 1 without the DOM: templates → compare states, the money, the nearest example
  prefs.js        reading preferences: motion, text size
  settings.js     the "Settings" panel
  type.js         word masks for the headline
  lint.js         plain-language checks (run by npm test)
  blocks.js, showpieces.js, flow.js, catalog.js, library.js, copy.js, content.js
                  the block system, now used only by /components/ and its fixtures
content/
  site.json             everything a visitor reads: page, facts, booking, writing rules
  graphs/fixtures.json  test content for /components/ and tests; not on the site
  nodes/fixtures.json
scripts/sync.mjs  writes site.json into index.html's sync regions
scripts/model.mjs writes _model/current/ (pictures of the site, from the code)
_model/           the models (current: generated; target: hand-written). Not served
tests/            node --test; tests/visual: Playwright (behaviour + screenshots)
```

## Change what the site says

1. Edit `content/site.json` › `page` (the words), `facts`, or `booking`.
   Keys starting with `$` are comments. The signed-off words are in
   `_model/target/copy.md`; `npm test` fails if the page drops one.
2. `npm run sync` rewrites the `<!-- sync:… -->` regions of index.html.
3. `npm test`: sync check, model check, the page against its target, the
   plain-language rules (no idioms, jargon or in-jokes; sentences of 25 words
   or fewer; reading grade 9 or lower; descriptive buttons), and the
   component catalogue.

Facts are `{ label, value, missing }`. With no `value`, the site shows the
`missing` sentence; with neither, the fact is hidden.

**Booking.** `booking.calLink` is the part of the Cal.com booking page after
`cal.com/` (for example `ruben/30min`). The Cal.com event needs two booking
questions with the identifiers `job` and `scale`. While `calLink` is null the
page shows no form and offers email only. No Cal.com API key is used or needed.

## Work on it

```sh
npm run dev      # python3 -m http.server 8000
npm run sync     # regenerate index.html's static regions from site.json
npm test         # sync check, model check, page vs target, plain-language lint, catalogue
npm run model    # regenerate _model/current/ (pictures of the site, from the code)
npm run test:visual        # behaviour of the page (booking stubbed) + screenshots of /components/
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
