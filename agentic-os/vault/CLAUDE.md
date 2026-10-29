# Operating manual

This folder is Naim's vault: the shared memory of his Agentic OS. Claude Code and Codex
both run here. Obsidian reads the same files. Keep everything plain Markdown or JSON.

## Who this is for

Naim, 24, based in Sweden. Background in cold calling, digital marketing, SaaS and AI; he
builds AI agents himself. He works as a salesman for **Driv Mobil AS**, selling
**Driv Kundesenter** to companies in Norway: webchat on the company's website, an AI agent
that answers at once (opening hours, order status, returns, prices, booking), case handling
in one shared inbox, and an AI assistant that helps the staff. Everything about the product
is in `projects/product.md`, taken from Driv's seller guide.

He is employed by **Flowtel Nordic AB**, which sells for Driv Mobil (contract signed
2026-10-28, start 2026-11-02, commission only, no base salary). He earns a fixed commission per
signed and activated deal: Small 5 000, Medium 10 000, Large 20 000 **SEK** before tax, paid
with the salary on the 25th the month after the customer's service is activated, and taken
back from later commission if the customer contract ends within 6 months of activation.
Extra credits and add-ons give no commission. His manager has promised (verbally) an advance
when the first deal is in. All of it is in `system/business.json` and `projects/sales-job.md`.

Goals, in order:
1. Book demos with Norwegian companies that really have a customer service load.
2. Close deals: the monthly goal in `system/business.json` (4 to start).
3. Get paid what was promised: track every commission until it is paid out.

He wants honesty. No hype, no invented numbers, no income promises. If something is
unlikely to work, say so and say what would.

## Language

- **Everything written for Naim is Swedish**: reports, briefs, call lists, demo prep, notes,
  `next_action` texts in the pipeline, summaries at the end of a run.
- **Everything written for a customer is Norwegian bokmål** (emails, offers, call openers),
  unless `email_language` in `system/business.json` says otherwise.
- Status ids, column names and file names stay as they are (English). Note headings are
  Swedish: `## Fokus`, `## Schema`, `## Uppgifter`, `## Logg` in daily notes,
  `## Den här veckan` in `ops/directives.md`, `## Öppna` in `ops/tasks.md`.

## Where things go

| Path | What lives there | Who writes |
| --- | --- | --- |
| `_index.md` | Home note with the embedded HUD | Naim |
| `ops/pipeline.md` | **The pipeline**: one row per company. Every dashboard number comes from it. | skills, the HUD, Naim |
| `ops/directives.md`, `ops/tasks.md` | This week's top 3, open loops | /weekly-review, Naim |
| `ops/calls.md` | Call log from the Ring view: date, time, company id, outcome (`noanswer`, `gatekeeper`, `wrong`, `callback`, `meeting`, `talk`, `notnow`, `optout`). Companies only, no names. | the HUD |
| `daily-notes/` | One note per day: `## Fokus`, `## Schema`, `## Uppgifter`, `## Logg` | /plan-today, /close-day |
| `projects/product.md` | **What we sell**: Driv Kundesenter, packages, credits, prices, process. The only source for product claims. | Naim |
| `projects/sales-job.md` | The job: commission, payout, open questions, contract checklist | Naim |
| `projects/email-outreach.md` | The cold email setup: domains, inboxes, sending tool, rules, costs | Naim |
| `projects/gdpr-jarvis.md` | How Jarvis handles personal data, for the employer's approval | Naim |
| `wiki/sales-playbook.md` | Who to target, the six questions, the five-step process, emails and calls | Naim, /weekly-review |
| `wiki/objections.md` | Driv's answers to objections, plus ones heard in the field. One card per objection (`## «…»`, Svar, Följdfråga, Tips, Kategori, Källa): the Live view reads this format | /objections, /call-summary, Naim |
| `wiki/product-cards.md` | Short product cards, customer questions, the six questions, phrases and false friends for the Live view (`- Typ:` produkt, fråga, behov, fras, ord) | Naim |
| `samtal/` | One note per call from the Live view: `YYYY-MM-DD-<company>.md` with notes, the six questions, numbers, objections and the result. Never move or rewrite. | the HUD, Naim |
| `inbox/` | Raw drops: call notes, demo notes, lead lists, links | Naim |
| `outputs/<skill>/` | Every report or draft batch a skill produces, dated | skills |
| `outputs/runs/` | Automatic transcript of every headless run | the Bridge |
| `system/` | `backbone.json` (skills map), `business.json` (packages, commission, goal), `routine.md`, logs | the Bridge, Naim |
| `_archive-vault/` | Anything stale, including the old outreach-business setup. Move, never delete. | /vault-cleanup |

## The pipeline table

`ops/pipeline.md` has one Markdown table. Keep its columns and order exactly:
`id | company | contact | email | phone | website | industry | city | channel | package | status | added | contacted | replied | booked | booked_via | demo | offer | closed | activated | paid | next_date | next_action | notes`

- `status` is one of: researched, drafted, contacted, replied, booked, demo, offer, won, lost.
  `booked` = demo meeting booked, `demo` = demo held, `offer` = offer sent for e-signing.
- When a company moves to a stage, set that stage's date (`contacted`, `replied`, `booked`,
  `demo`, `offer`, `closed` for won/lost) if it is empty. Phone contacts never get a `replied` date.
- `channel` is `email`, `phone`, `linkedin` or `other` (how the first contact happened).
- `booked_via` is `email` or `phone`: how the meeting was booked (an email reply, or a call).
  Set it whenever you set `booked`. A company emailed first and booked by phone keeps
  `channel` = `email` and gets `booked_via` = `phone`.
- `package` is `S`, `M` or `L`. Only a won row with a package earns commission on the dashboard.
- `activated` is the date the customer's service was activated. Commission is earned then and
  paid with the salary on the 25th of the following month.
- `paid` is the date the commission for that deal was paid out. Empty means not paid yet.
- `next_action` is a short Swedish instruction ("Ring igen", "Följ upp offerten").
- Escape a `|` inside a cell as `\|`. One line per row.

## Rules for every run

- Read before you write. Check `ops/directives.md`, today's daily note and the pipeline first.
- Product facts come from `projects/product.md` only. Never invent a feature, an integration,
  a price, a customer or a result. If it is not there, write `fråga Driv` (ask Driv).
- Driv's internal documents (commission, seller guide) are internal: never quote commission
  or internal notes to a customer.
- Discounts are never offered: Driv's rule is that discounts are agreed with management
  before an offer is sent.
- The official offer is made in Driv's CRM and sent as a PDF for e-signing. Skills draft the
  email and the package calculation; they do not create the offer.
- Save deliverables to `outputs/<skill-name>/YYYY-MM-DD-<slug>.md` unless the skill says otherwise.
- Never delete a note. Move it to `_archive-vault/` with the same relative path.
- **Never send, post, publish, call, buy or spend.** Emails are Gmail drafts at most. Naim sends and calls.
- Never guess an email address or phone number. Only use contact details a business publishes
  (its website, brreg.no, proff.no, 1881.no, gulesider.no).
- **Cold email goes only to generic company addresses** (post@, kontakt@, kundeservice@, info@).
  Forbrukertilsynet's guidance under markedsføringsloven § 15: email to a named person's own work
  address needs prior consent, even for a business offer. Never cold email a named address or an
  enkeltpersonforetak (ENK); call those instead. Named addresses may be used once the person has
  replied or asked to be contacted.
- Volume email is sent by the sending tool from separate, warmed-up domains that Driv has
  approved (`outreach` in `system/business.json`, plan in `projects/email-outreach.md`). Naim's
  own address on Driv's main domain is for replies, offers and at most ~30 personal emails a day.
  Skills prepare files for the tool; they never upload, launch or send.
- Anyone who asks not to be contacted is marked `lost` with `opt-out` in notes and never contacted again.
- Numbers come from a source. If something is unknown, write `okänt`.
- Dates are `YYYY-MM-DD`, times 24h `HH:MM`. Customer prices are NOK excl. VAT; Naim's
  commission is SEK before tax.

## Personal data (GDPR)

The employment contract (10.2) says customer and personal data may only be kept in systems the
employer points to. Read `privacy.mode` in `system/business.json` before you write anything.

- **`company-only`** (the default until Driv or Flowtel approves more in writing): store
  company-level data only: company name, org number, website, industry, city, a generic
  company address (post@, kontakt@ …) and the published switchboard number. Leave `contact`
  empty and never write a person's name, personal email or mobile number into any vault file
  (pipeline, outputs, notes). Write the role instead ("daglig leder", "kundeservicesjef").
  The person's details belong in Driv's CRM. A Gmail draft may still go to an address the
  person gave or replied from, as long as Gmail is connected to the work mailbox.
- **`full`**: contact persons may be stored, but only what the job needs.
- Never copy vault data anywhere else: no uploads, no git commits, no other services.
- If someone asks to be deleted: mark the row `lost` with `opt-out`, empty `contact`, `email`
  and `phone`, and list their files in `samtal/` and `outputs/` for Naim to delete by hand.

## Tiers (how requests reach you)

- Tier 1 answers from saved files with no model.
- Tier 2 is a quick answer from a small model.
- Tier 3 is you: a skill from `.claude/skills/` running headless. Nobody can answer a
  permission prompt mid-run, so stay inside the tools allowed in `.claude/settings.json`.
