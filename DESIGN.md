# mindunder.dev — design notes

> **Phase 3, built** on branch `ccr-97d11a0a-6l0u48` (2026-10-15). This file
> describes the funnel in `_model/target/funnel.md` (signed off 2026-10-13).
> It is not live until phase 4 (UAT) is signed off. The live site is described
> by this file at `057d4d7` (`git show 057d4d7:DESIGN.md`).

## Idea

**The site is for taking in calls.** Every part is judged by whether it moves
a visitor to a booked call. Project pages go stale, so they are not part of
it.

The reader is a director with little time and energy, who may read words
literally. They should be able to read the whole offer in one scroll, see
their own situation in an example, know what the first step costs them, and
book without reading anything else.

## The page

The site is one page, read top to bottom, ending at a booked call. It opens
by asking the visitor about their own work and answering them
(`_model/target/funnel.md`, revised 2026-10-15).

| # | Section | Job |
| --- | --- | --- |
| 1 | The job | The one conversational turn: the visitor gives their job and three numbers; the page answers with hours, cost and the nearest example |
| 2 | Where the time goes | Recognition: "that is us". Three examples |
| 3 | How we would start | The diagnosis ("What I look for"), then the steps and the facts: lower the risk |
| 4 | Who you would talk to | Trust: a photograph, his full name, the day job and what it means for a client, his own system in one line |
| 5 | Book | Pick a time, with Cal.com |

**Every section has a way straight to the booking.** Quiet links after steps
2 and 3; step 1 has its own. The job and the numbers help the call but are
never required for it.

**Two filled buttons, one per action:** "Show what it costs" (step 1) and
"Show available times" (step 5). Every other link is quieter.

**Step 1, the job:**

- The headline is the question. Under it, one lead line, then the field
  *The job your team does by hand* (label above, one example line, no
  placeholder), then three numbers: people doing it, hours each per week,
  cost per hour (− and + buttons, as the estimate). They start at 3, 4 and
  £30.
- "Show what it costs" puts the answer under the button, as one block:
  "You: …" (their words; left out if the field is empty), hours a year and
  cost a year in large figures, the line of full working weeks, the grid of
  weeks, the nearest example (a link to it), the note, and an outlined button
  "Book the free call with these answers". Changing a number afterwards
  updates the answer in place.
- The nearest example is chosen by words in the job (each example lists its
  words in `site.json`). No match, no line.
- "Book the free call with these answers" opens step 5's embed with `job`
  (their words) and `scale` ("3 people, 4 hours each a week, about 552 hours
  a year"). Focus moves to step 5's heading.
- One small line under the button: nothing is sent until you book.
- **Without JavaScript:** the three numbers and the answer are hidden. In
  their place, a text field *How many people do it, and how often* and an
  outlined button "Choose a time for the call": a plain GET form to the
  Cal.com page, which prefills both questions.

**Step 4:** the photograph sits beside the lines on wide screens and above
them on narrow ones, in black and white. Its `alt` says who it is.

**Booking** (decided in `_model/target/funnel.md`):

- Cal.com, hosted (`rwb3n/30min`). Step 5 is its inline embed, loaded only
  when the visitor acts. Without JavaScript, "Show available times" is a link
  to the Cal.com page.
- `job` and `scale` are Cal.com booking questions, so the answers arrive with
  the booking. Nothing else stores them.
- After booking, the visitor sees Cal.com's confirmation and gets its email.
  The page adds nothing.
- The space the embed will take is kept free while it loads. One line says
  "Loading available times from Cal.com." If the script does not load within
  10 seconds, that line is replaced by a link to the Cal.com page, with the
  answers filled in, and the email address.
- "Book the free call" is the label of every quiet link to step 5, so the
  visitor always knows where it goes.

## Cut

These parts of the live site are removed by the funnel. Their code and notes
stay in git history.

| Part | Why |
| --- | --- |
| Projects (Callsheet, HAIOS, Behold) and the 13 technical topics | Projects go stale. Callsheet is not running |
| The conversation: topics, chips, ask bar, gravity, the map | The page replaces it; only intake stays |
| The lens (dots, x-ray, found, fix) | Cut for now |
| The estimate | Cut for now: reads as too sales-y |
| Sound | It belonged to the lens and the conversation |

## System

Black and white. One ink, one paper, heavy type and a lot of space. The
reference is a fashion house, not a software product: restraint, exact type,
and motion that is slow, deliberate and finished.

**Type.** Two voices and a system face, all from Fontshare.

| Role | Face | Used for |
| --- | --- | --- |
| Claim | Supreme, weight 800, tracked tight | headline, section titles, big numbers |
| Voice | Sentient, light italic | the spoken line under the headline, callouts, quotes, each example's result |
| System | Azeret Mono | small labels, diagram boxes, code (flow layout measures mono widths) |

Supreme and Sentient have no → or ↓, so Azeret Mono is second in their
font stacks and draws the arrows (`/components/#glyphs`). Body text is
Supreme. `/type/` compares the type directions that were tried.

The display step (`--step-display`) runs from about 42px to 100px. The
headline is two lines: the claim in Supreme, then the promise in Sentient
italic at half the size, in secondary grey. That change of voice is the
emphasis.

**Colour.** `#000` on `#fff`, and the reverse in dark mode. No accent colour:
emphasis is italic, weight, or solid ink (the key step in a diagram is a black
box with white text). Greys are for secondary text only:

| Token | Light | Dark | Contrast on `--bg` (L / D) |
| --- | --- | --- | --- |
| `--fg` | `#000000` | `#ffffff` | 21 / 21 |
| `--fg-2` | `#545454` | `#b0b0b0` | 7.57 / 9.68 |
| `--fg-3` | `#6e6e6e` | `#8c8c8c` | 5.10 / 6.25 |

**Shape.** Square corners, 1px hairlines, no shadows, no glare, no tilt.

**Space.** Paragraphs sit close together (24px). Anything that is not a
paragraph (an example, a list, a table, a diagram) gets extra space above and
below (56px from text), so each one reads as its own thing.

**Copy.** Short and literal. Say the thing, then stop. No explaining the
interface ("Choose one to read more"), no reassurance padding, no idioms.
Examples are labelled as examples; missing facts say they are missing
(`On request. Not published yet.`).

## Motion

The page moves only when the visitor scrolls. The main curve is
`--ease-runway` (`cubic-bezier(0.76, 0, 0.24, 1)`): a slow start and a
decisive arrival.

| Moment | What moves | Status |
| --- | --- | --- |
| Headline | Each word rises straight up out of its own mask | kept |
| Sections | Each heading and block rises as it scrolls into view (`animation-timeline: view()`, as `/#/all` does today). Paragraphs are shown whole | kept: the spine of the page |
| Ink fill | Hovering a row floods it with black from the left; the words turn white | kept, for links and rows that remain |
| Theme | The new theme spreads from the toggle as a circle | kept |
| Curtain | On the first page of a visit, the black lifts away (1 s) | cut: it delays the page and moves no one toward a call |
| Boot, search, x-ray, found, fix | The lens | cut with the lens |
| Ask, answer | Questions fly to headings; answers arrive from behind a mask | cut with the conversation |

Motion has three settings, chosen in **Reading settings**:

| Setting | What moves |
| --- | --- |
| Full (default) | Everything kept above. Anything that starts by itself is over within 5 seconds (WCAG 2.2.2 Pause, Stop, Hide). |
| Calm | Nothing starts by itself. Short fades and scrolls (≤ 300 ms). |
| Off | Nothing moves. Scrolls jump. |

`prefers-reduced-motion` maps to Calm unless the visitor chose otherwise.
The choice (and text size) is stored in `localStorage` and applied before
first paint as `html[data-motion]` / `html[data-text]`. Nothing on the page
hides content until it is scrolled to: with motion Off, or before the
animation runs, every paragraph is readable.

## Components

The library page is `/components/`. `src/catalog.js` is the contract: each
block's props (type, required, what it does) and an example. Content is
validated against it by `npm test`, which fails if content uses a block,
prop or look the library does not show, or if a block is unused.

`content/graphs/fixtures.json` is test content, loaded by `/components/`
and the tests, never by the site. It covers the blocks the page does not use,
so the site never shows invented facts to cover a component. Fixtures follow
the same writing rules.

Decided in the build: **the page uses no blocks.** It is rendered from
`site.json › page` by `src/static.js`, in its own markup (`styles/page.css`).
The block system stays as the library's catalogue, shown with the fixtures.
Retired with the conversation: the `brief` and `compose` blocks, and the
library's chips, entry rows, ask bar and live-state pieces.

Pages are assembled by shared code (`src/static.js`, `src/layouts.js`), so
the library shows the real page parts. A browser test
(`tests/visual/site.spec.js`) checks that every class used on the page also
appears on `/components/`.

Flow diagrams (`src/flow.js`) are laid out by hand in SVG. They measure their
labels, then choose a shape that fits: a horizontal flow folds to vertical, a
fan-out folds to a trunk. Text is never scaled down to fit.

## Writing for tired, autistic and ADHD readers

Sources: GOV.UK "Designing for users on the autistic spectrum" and W3C COGA
("Making content usable for people with cognitive and learning
disabilities").

- The offer, first step, price status and reply time are on the page,
  readable by scrolling: no click, no JavaScript needed.
- Literal words only: no idioms, metaphors or in-jokes. Banned phrases are
  listed in `site.json` → `language` and checked by `npm test`.
- Short sentences (≤ 25 words), statements not questions, reading grade ≤ 9.
- Buttons say where they go, or what happens when they are pressed.
- Abbreviations are written out once, as "Full words (ABBR)".
- Examples are labelled as examples; illustrations are labelled as
  illustrations. Nothing is presented as a client quote unless it is one.
- The whole site is one plain page, and it prints.

The linter is an approximation. It is not a substitute for testing with
autistic and ADHD readers.

## Honesty

Nothing claims to have happened unless it did. Every "booked", "sent" and
"running today" on the site must be true at the moment it is shown.

- A booking is confirmed by Cal.com, not by the page.
- Intake is not "sent" until it has been received.
- No system is described as running unless it is running.

The previous build finished its "book a call" flow with *CONFIRMED — brief
sent to both parties* without sending anything. That is the failure this
section exists to prevent.
