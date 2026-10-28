# Model

Pictures of the site, so the experience and the story can be reworked before code changes. Jekyll skips folders that start with `_`, so nothing here is served on mindunder.dev.

| Folder | What | Who writes it |
|---|---|---|
| `current/` | The site as it is: domains, process, state, data, story, health | **Generated** by `npm run model`. `npm test` fails if it is stale |
| `target/` | The site we are designing | Written by hand. Draft until the operator signs it off |

## North star

**The site is for taking in calls.** Every part is judged by whether it moves a visitor to a booked call. Project pages go stale, so they are not part of it.

Decided (operator, 2026-10-11):

- Remove the project topics and the technical topics.
- Shrink the conversation to one job: intake for the call.
- Book with Cal.com.
- Writing rules: the plain-language rules in `DESIGN.md` and `site.json › language`.

## Sequence

Each phase ends with the operator's sign-off. Nothing goes to `main` without it.

```
 0 model current     npm run model → current/
 1 model target      target/: funnel, keep/cut list    signed off 2026-10-13
 2 design            DESIGN.md for the funnel; target/copy.md   signed off 2026-10-13
 3 build             one branch; cut content; intake form; Cal.com embed  ◀ here
 4 local UAT         U1 flow   every path to the call works
                     U2 copy   npm test + read aloud; honesty pass
                     U3 reach  phone, keyboard, screen reader, motion Off
                     U4 intake intake fields → Cal.com booking holds the answers,
                               with and without JavaScript
 5 Cloudflare        project from this repo; preview per branch behind
                     Access; Web Analytics; repo goes private
 6 live UAT          U1–U4 again on the preview URL, on real devices
 7 cutover           DNS to Cloudflare (mail records first: MX, SPF,
                     DKIM) → verify mail and site → retire GitHub Pages
```

The **honesty pass** follows `DESIGN.md › Honesty`: nothing claims to have happened unless it did. Every "booked", "sent" and "running today" on the site must be true at the moment it is shown.
