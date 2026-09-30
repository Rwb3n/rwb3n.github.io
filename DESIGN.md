# mindunder.dev — design notes

## Idea

The copy says *you know something's wrong, you just can't see where*. So the
landing doesn't describe that — it lets you do it. The page is a calm field of
dots (the business, from the surface). A lens follows the pointer and shows
what's underneath: tools, handoffs, re-keyed spreadsheets, and one node where
it all snags. Put the lens on it and it locks: **found**. On touch screens, or
when the pointer is idle, the lens searches by itself and periodically settles
on the fault.

The fault and the autopilot's route aren't fixed coordinates: the lens
measures the landing's text (the headline lines via `Range`, so it's the ink,
not the box) and searches for the spot — and radius — where the lens and its
annotation cover the fewest words. It holds from a 390px phone to a 1920px
desktop and re-plans when webfonts land.

Everything after the landing is a conversation. Visitors ask; the system
answers in structured blocks — diagrams, metrics, tables — and offers the next
questions. The deeper they go, the closer the "how would this work in my
business?" prompt moves to the top.

## System

**Type.** Three voices, each with one job.

| Role | Face | Used for |
| --- | --- | --- |
| Display | Instrument Serif (+ italic) | headline, questions, callouts, big numbers |
| Text | Geist | body copy, chips, anything read at length |
| System | Geist Mono | labels, indices, diagram nodes, the command bar |

Minor-third ramp (`--step--2` … `--step-4`), fluid at the display end, and a
hero step (`--step-display`) that runs from 48px to 124px.

**Colour.** Warm paper and carbon ink, one signal colour. Every text pair
clears WCAG AA in both themes:

| Token | Light | Dark | Contrast on `--bg` (L / D) |
| --- | --- | --- | --- |
| `--fg` | `#1b1a17` | `#ecebe6` | 15.3 / 16.3 |
| `--fg-2` | `#55524b` | `#a9a69e` | 6.9 / 8.0 |
| `--fg-3` | `#6b675f` | `#85827b` | 5.0 / 5.1 |
| `--accent` | `#b53f14` | `#ff6a3d` | 5.0 / 6.8 |

The accent is reserved for three things: *the thing that matters* (the
italic "see", the fault, the current step), *live state* (pulse dots), and
*the one action* (sending the brief).

**Shape.** 2–4px radii and 1px hairlines. It's an instrument, not an app.

**Motion.** Motion carries the story: *surface → underneath → found → fixed*.
Expo-out for arrivals, a cubic in-out for journeys, and a damped spring
(`--ease-spring`, CSS `linear()`) for things that land.

| Moment | What moves |
| --- | --- |
| Boot | The dot field ripples out from the word *find*; headline words rise through masks; the lens irises open; one sonar ping. |
| Search | The lens follows the pointer (autopilot when idle); dots bulge off its rim; click anywhere to ping. |
| X-ray | Under the lens, the copy becomes outlines with measured cap height, x-height, baseline and descender. |
| Found | Magnetic pull, spring kick, ticks lock to the diagonals, crosshair, annotation draws and types in. |
| Fix | Choosing a question opens the lens over the screen; the tangle snaps onto a grid; the question morphs into the first turn. |
| Ask | Every later question flies from where it was asked (chip or ask bar) to its heading, sans to serif, with the scroll in step. |
| Answer | Scan line, clip-and-rise blocks, odometer numbers, springy diagram nodes, staggered parts, a printing brief. |
| Theme | The new theme spreads from the toggle as a circle. |

Motion has three settings, chosen in **Reading settings**:

| Setting | What moves |
| --- | --- |
| Full (default) | Everything above, with one rule: anything that starts by itself is over within 5 seconds (WCAG 2.2.2 Pause, Stop, Hide). The boot plays, the lens makes one pass to the fault and locks, then the canvas stops drawing. After that, things move only when the visitor moves, scrolls or clicks. When the pointer rests, the lens glides back to the fault once. Measured: the last autonomous frame is at about 4 s. |
| Calm | Nothing starts by itself. The lens is parked on the fault and moves only while the visitor moves it. Short fades and scrolls (≤ 300 ms). |
| Off | Nothing moves. Scrolls jump. |

`prefers-reduced-motion` maps to Calm unless the visitor chose otherwise.
Status pulses run twice, not forever. The
choice (and text size) is stored in `localStorage` and applied before first
paint as `html[data-motion]` / `html[data-text]`. `?perf`
records the lens's per-frame cost in `window.__lensFrames`.

**The map.** In the session rail, every topic is a point in a constellation
(a seeded force layout of the content graph, identical on every visit). Your
route draws itself across it as you go; click any point to go there. The
brief prints the same route.

**Sound.** Synthesised with WebAudio, no files: a sonar ping with an echo, a
two-note chime on lock, a noise sweep for the fix, a whoosh for a flying
question, barely-there ticks as answers arrive. Off by default; one toggle,
remembered.

## Components

The library page is `/components/`. `src/catalog.js` is the contract: each
block's props (type, required, what it does) and an example. Topics in
`content/nodes` are validated against it by `npm test`. The projects in the
content are test content that exercises these parts.

`src/blocks.js` renders the content blocks: `text`, `hero`, `callout`, `split`,
`metric`, `metricRow`, `stats`, `pills`, `badge`, `grid`, `layers`, `table`,
`code`, `progress`, `flow`, `brief`, `compose`, `fact`, `facts`, `timeline`,
and the two interactive blocks in `src/showpieces.js`:

- **`compare`**: one process in two states (Before / After). Steps that exist
  in both states keep an `id` and move to their new place (FLIP); steps that
  go away fade out; new ones grow in; the counter rolls. The steps are an
  ordered list, the toggle is two `aria-pressed` buttons, and the change is
  announced once. With motion Calm or Off it switches instantly.
- **`estimate`**: what repeated work costs a year, from three numbers
  (people, hours a week, cost an hour). Big numbers count to the new value;
  a grid of working weeks fills in (two rows = one full-time person-year).
  Every assumption is printed. Nothing is sent. Screen readers hear one
  sentence after typing stops, not every frame. "Add this estimate to my
  summary" puts the sentence into the visit summary and the booking email.

The one-page view (`#/all`) uses scroll-driven animation (`animation-timeline:
view()`): sections rise as they scroll into view, so they move only when the
visitor scrolls.

Flow diagrams (`src/flow.js`) are laid out by hand in SVG. They measure their
labels, then choose a shape that fits: a horizontal flow folds to vertical, a
fan-out folds to a trunk. Text is never scaled down to fit.

## Writing for tired, autistic and ADHD readers

The reader is a director with little time and energy, who may read words
literally. Sources: GOV.UK "Designing for users on the autistic spectrum"
and W3C COGA ("Making content usable for people with cognitive and learning
disabilities").

- The offer, first step, price status and reply time are on the landing, in
  a definition list, before any interaction.
- Literal words only: no idioms, metaphors or in-jokes. Banned phrases are
  listed in `site.json` → `language` and checked by `npm test`.
- Short sentences (≤ 25 words), statements not questions, reading grade ≤ 9.
- Buttons say where they go, and share a word with the title of the topic
  they open.
- Abbreviations are written out once, as "Full words (ABBR)".
- Examples are labelled as examples; illustrations are labelled as
  illustrations. Nothing is presented as a client quote unless it is one.
- Technical topics are marked as technical and kept out of the main path.
- Everything is also available on one plain page (`/#/all`).

The linter is an approximation. It is not a substitute for testing with
autistic and ADHD readers.

## Honesty

The previous build finished its "book a call" flow with *CONFIRMED — brief
sent to both parties* without sending anything. The new flow compiles the same
brief and hands it to the visitor's own mail client (with a copy button as a
fallback). Nothing claims to have happened unless it did.
