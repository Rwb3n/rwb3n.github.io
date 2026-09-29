# mindunder.dev

Static site, no build step. GitHub Pages serves the repo root.

```
index.html        shell + static landing (readable without JS)
styles/           tokens.css (design tokens, themes) · main.css
src/
  main.js         boot: theme, clock, lens, content
  app.js          conversation controller (DOM)
  engine.js       routing, session, gravity, brief — pure, tested
  blocks.js       block renderers
  flow.js         SVG flow diagrams
  lens.js         landing canvas
  copy.js         UI strings
content/          the conversation graph (edit this to change what the site says)
  graphs/default.json   which node files to load
  nodes/*.json          nodes: blocks + chips + intents
tests/            node --test
```

## Work on it

```sh
npm run dev      # python3 -m http.server 8000
npm test         # engine + content-graph integrity
```

Deep links: `/#/<node-id>` opens straight into a node, e.g. `/#/method`.

See [DESIGN.md](DESIGN.md) for the design system.
