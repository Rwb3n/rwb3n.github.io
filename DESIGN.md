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

**Motion.** One easing curve (`--ease-out`, an expo-out), four durations.
The landing cascades in; the chosen question morphs into the first turn
(View Transitions, where supported); answers arrive block by block, text rises word by word, diagrams
draw their edges and send a spark along the path, metrics count up.
`prefers-reduced-motion` gets all of the content and none of the movement — the
lens is parked, already on the fault.

The fault and the autopilot's route aren't fixed coordinates: the lens
measures the landing's text (the headline lines via `Range`, so it's the ink,
not the box) and searches for the spot — and radius — where the lens and its
annotation cover the fewest words. It holds from a 390px phone to a 1920px
desktop and re-plans when webfonts land.

## Components

`src/blocks.js` renders the content blocks: `text`, `hero`, `callout`, `split`,
`metric`, `metricRow`, `stats`, `pills`, `badge`, `grid`, `layers`, `table`,
`code`, `progress`, `flow`, `brief`, `compose`, `timeline`.

Flow diagrams (`src/flow.js`) are laid out by hand in SVG. They measure their
labels, then choose a shape that fits: a horizontal flow folds to vertical, a
fan-out folds to a trunk. Text is never scaled down to fit.

## Honesty

The previous build finished its "book a call" flow with *CONFIRMED — brief
sent to both parties* without sending anything. The new flow compiles the same
brief and hands it to the visitor's own mail client (with a copy button as a
fallback). Nothing claims to have happened unless it did.
