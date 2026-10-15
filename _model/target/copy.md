# Target: the copy

> **Signed off, phase 2** (2026-10-13), sections 1–6. The conversation
> sections at the end are a **draft** (2026-10-15). Hand-written. Every word a visitor reads is
> on a line starting with `>`; the rest are notes. Checked against the writing
> rules in `DESIGN.md` by `npm test` (see the end).

Built from the live copy wherever it already works (`content/site.json`,
`services.json`, `about.json`). New lines are marked *new*.

"Book the free call" is the heading of step 6 and the label of every quiet
link to it (steps 1–4). The page's only filled button is "Show available
times", in step 6.

---

## 1 The problem

> Business process automation · London
>
> I find the work your team repeats by hand.
>
> Then I build a system that does it.
>
> Below: three examples, how we would start, and who you would talk to.
>
> Book the free call

Notes: headline unchanged. The cue line is *new* (it now names step 4).

---

## 2 Where the time goes

> Where the time goes
>
> Three situations I see often. They are illustrations, not named clients. The numbers show the scale, not a promise.

The three examples stay as they are live: *The Monday report*, *Setting up a
new client*, *Early warning on suppliers* (Today / What I would build / What
changes). The signals topic is folded in as one short list, *new* as a block;
the two signals the examples already cover (reports, suppliers) are dropped.

> Two more I often see
>
> Tenders found too late. A competitor met the buyer first.
>
> One person holds the knowledge. They cannot take two weeks off.
>
> Book the free call

---

## 3 How we would start

> How we would start
>
> A 30-minute call, free. You tell me where the time goes. I ask how the work actually moves.
>
> A one-page summary. Where time is lost, what I would automate first, and why. It is yours to keep, whether or not we work together.
>
> A design you approve. What stays, what changes, what becomes automatic. Nothing changes until you approve it.
>
> A first system, checked by a person. It does the work and someone checks every result. It runs alone only once the results are consistently right.
>
> It runs, and reports. You get a regular report of what it did, and of anything it could not do.
>
> No sales pitch. If there is nothing worth fixing, I will say so.

Facts, as a list (from `site.json › facts`):

> First call: Free, 30 minutes.
>
> Price: Not on the site yet. Ask in the call or by email.
>
> Reply to email: The same day.
>
> Based in: London, UK.
>
> Book the free call

Notes: step 3 ("A design you approve") is folded in from `process`; the
trust ladder is already step 4. `method` and `cost` add nothing the list does
not say, so they go. Price stays honest until it is published.

---

## 4 Who you would talk to

> Who you would talk to
>
> I am Ruben. I work alone, in London. I have spent years automating work for other organisations.
>
> My main job is running Salesforce at London & Partners. Salesforce is software that companies use to track customers.
>
> When automation fails, the cause is usually how people work together, not the software.
>
> Salesforce certifications: Salesforce Administrator. Salesforce Platform App Builder. Salesforce Agentforce Specialist.
>
> Book the free call

Notes: three lines from `ruben`, `salesforce` and `about`. "Active projects:
3" is cut with the projects.

---

## 5 Intake

> Before the call
>
> Two questions, both optional. Your answers go into the booking, so I can read them before we talk.
>
> The job that takes up your team's time
>
> For example: the Monday report, or setting up new clients.
>
> How many people do it, and how often
>
> For example: two people, every Monday morning.
>
> Choose a time for the call
>
> Nothing is sent until you book.

Notes: field labels are statements, not questions. The Cal.com questions use
the same wording, with identifiers `job` and `scale`. The button moves to
step 6 and opens the embed with the answers; without JavaScript, it opens the
Cal.com page with the answers filled in.

---

## 6 Book

> Book the free call
>
> 30 minutes, free. Choose a time that suits you. Cal.com sends the confirmation by email.
>
> Show available times
>
> Loading available times from Cal.com.
>
> The booking calendar did not load. You can book on the Cal.com page instead.
>
> Open the booking page on Cal.com
>
> Or email lab@mindunder.dev. I reply the same day.

Notes: "Show available times" loads Cal.com's embed; the label says what
happens. The loading line and the fallback (after 10 seconds) are in
`DESIGN.md › The page`. After booking, the confirmation is Cal.com's own; the page adds
nothing.

---

## Conversation: options and free text

*New* (draft, 2026-10-15). The page is a conversation (`funnel.md ›
Changed`). Each turn ends with numbered options, worded as actions. The
booking option is "Book the free call", as before. The last option is
always free text: "Something else" opens a field in place.

> See examples
>
> See how we would start
>
> See who I would talk to
>
> Describe the job first
>
> Something else
>
> Say it in your own words
>
> For example: the price. Or: two of us rebuild a report every Monday.
>
> Send
>
> Show the whole page

Notes: the option chosen, or the visitor's own words, is said back above the
turn it opens, after a small "You". Options for sections already open are
not offered again.

---

## Conversation answers

*New* (draft, 2026-10-15). Shown only after typed text, so they are in
`site.json › conversation`, not in the page markup. A question one of the
facts answers gets the fact itself (for example the price line in step 3);
an empty fact is never offered.

> I do not have an answer to that on this page. Ask me in the call, or by email.
>
> That is the kind of thing the call is for. I have put your words in the first field below. Change them if you like.
>
> That is the kind of thing the call is for. Email it to me, and I will reply the same day.

---

## Check

`npm test` lints every `>` line here with the site's rules
(`tests/language.test.js`, "target copy draft follows the writing rules").
