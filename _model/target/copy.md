# Target: the copy

> **Revised draft** (2026-10-15), following `funnel.md`. Hand-written. Every
> word a visitor reads is on a line starting with `>`; the rest are notes.
> Checked against the writing rules in `DESIGN.md` by `npm test` (see the end).

Lines kept from the signed-off draft of 2026-10-13 are unmarked. New or
changed lines are listed in the notes under each step.

"Book the free call" is the heading of step 5 and the label of the quiet links
after steps 2 and 3. The page has two filled buttons: "Show what it costs" in
step 1 and "Show available times" in step 5.

---

## 1 The job

> Business process automation · London
>
> Ruben Pires. I automate the work your team repeats.
>
> The job your team does by hand
>
> For example: the Monday report, or setting up new clients.
>
> People doing it
>
> Hours each, per week
>
> Salary of each person
>
> A year, before tax. With National Insurance and pension, the real cost is higher.
>
> The job

The answer, under the button:

> You: the Monday report
>
> Of the £70,000 a year you pay them, £7,467 goes on this job.
>
> Their pay, a year
>
> Spent on this job
>
> Equal to 9.8 full working weeks a year.
>
> One square is one working week of 37.5 hours.
>
> Nearest example: The Monday report
>
> An estimate, not a quote. It counts salary only. A system rarely removes a job completely. It does the routine part, and a person checks the result.
>
> Book the free call with these answers

Without JavaScript, in place of the three numbers:

> How many people do it, and how often
>
> For example: two people, every Monday morning.
>
> Choose a time for the call

Changed 2026-10-15, later (operator: "its still corny. and now the layout is
all over the place"): step 1 is a bench (taps and numbers left, what they
make right), set to one example job on arrival. Words stripped to names,
labels, figures and short facts: no slogan headline, no italic voice lines.

Changed 2026-10-15, late (operator: "nobody is going to write anything
useful"; chose "taps, not typing"): no text box with JavaScript. The visitor
taps: which sounds like your week, which systems, how often, how many people.
Each tap brings the next component. The decision model is not in this
version; where it fits is open.

Changed 2026-10-15, evening (operator: "you talk in COMPONENTS… UI
components"; decision models): the answer is built from components chosen by
a decision model; the words of every component are in `site.json ›
page.job.decide` and are checked by `npm test` with the rest of the page.
Copy is not final ("everything reads corny"); the shape comes first.

Changed 2026-10-15 (operator: "it costs someone £xxx per year to hire
someone, how much does it cost them to have that person busy with" this
work): the answer starts from the salary a director knows, not a cost per
hour. Starting numbers: 2 people, 4 hours each a week, £35,000 each.

Notes: all new. Headline and lead are new; the eyebrow stays. The headline
is a statement, not a question (`DESIGN.md › Writing`: statements, not
questions). "You: the
Monday report" and "15" stand for the visitor's own words and numbers.
The estimate's labels come from the live `estimate` topic, shortened.

---

## 2 Where the time goes

> Where the time goes
>
> Illustrations, not named clients.

> The Monday report
>
> Every Monday the operations manager rebuilds the leadership report by hand. Sales come from the accounts system, stock from the warehouse system, deliveries from the courier's website. It takes most of the morning, and the figures are a day old by the meeting.
>
> The report builds itself overnight from the same three systems and is in the inbox at 7am. The manager reads it, checks anything flagged, and adds comments.
>
> About 5 hours a week back. Roughly 230 hours a year.

> Setting up a new client
>
> When a proposal is signed, someone copies the client's details into the customer database (CRM), the billing system and the project tracker. Then they email three colleagues. It takes about 40 minutes a client, and something small is usually missed.
>
> Signing the proposal starts it. The records appear in all three systems, the right people are told, and anything missing is flagged for a person to fill in.
>
> At 30 new clients a month, about 20 hours a month back, and no half-set-up accounts.

> Seeing the cash coming
>
> The bank balance is checked each morning. Unpaid invoices and next month's bills are in three different places. A large bill arrives as a surprise, so a decision gets rushed: a loan, a long contract, a payment delayed.
>
> Every Monday a forecast builds itself from the accounts system and the bank. Money due in and money due out, for the next eight weeks. Anything late is flagged.
>
> Weeks of notice before a gap, instead of days. Time to choose, instead of a rushed decision.
>
> Book the free call

Notes: intro shortened ("The numbers show the scale, not a promise" cut: the
step 1 answer already says "an estimate, not a quote"). Case 3 is new and
replaces "Early warning on suppliers". "Two more I often see" is cut. Labels
(Today / What I would build / What changes) are unchanged.

---

## 3 How we would start

> What I look for
>
> Decisions made in a rush, because the money coming in and going out was seen too late.
>
> Work that does not earn money directly, like admin and reports, left half-built. It then takes time from the work that does.
>
> The same job done two different ways by two people.
>
> Decisions nobody wrote down, so the same question gets settled again.

> How we would start
>
> A 30-minute call, free. You tell me where the time goes. I ask how the work actually moves.
>
> A one-page plan. Where time is lost, what I would automate first, and why. It is yours to keep, whether or not we work together.
>
> A design you approve. What stays, what changes, what becomes automatic. Nothing changes until you approve it.
>
> A first system, checked by a person. It does the work and someone checks every result. It runs alone only once the results are consistently right.
>
> It runs, and reports. You get a regular report of what it did, and of anything it could not do.
>

> First call: Free, 30 minutes.
>
> Price: Agreed in writing before any work starts. The call and the plan cost nothing.
>
> Reply to email: The same day.
>
> Based in: London, UK.
>
> Book the free call

Notes: "What I look for" is new (the operator's list, 2026-10-15). "A
one-page summary" becomes "A one-page plan". Price no longer says "Not on
the site yet".

---

## 4 Who you would talk to

> Who you would talk to
>
> I work alone, in London, and have automated work for other organisations for years.
>
> Today I run Salesforce at London & Partners, as an employee. A project with you would be my full-time work.
>
> I run my own work on a system I built, every day.
>
> Salesforce certifications: Administrator, Platform App Builder, Agentforce Specialist.

Notes: line 2 replaces "My main job is running Salesforce at London &
Partners" and says what the day job means for a client. Line 3 is new: his
own system (Behold), as proof, not as a product. It claims only what is
true today: he built it and uses it daily. No quiet link here: step 5
follows.

---

## 5 Book

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

Notes: unchanged. With answers from step 1, the embed opens with them filled
in.

---

## Check

`npm test` lints every `>` line here with the site's rules
(`tests/language.test.js`, "target copy draft follows the writing rules").
