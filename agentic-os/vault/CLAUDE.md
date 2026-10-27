# Operating manual

This folder is Naim's vault: the shared memory of his Agentic OS. Claude Code and Codex
both run here. Obsidian reads the same files. Keep everything plain Markdown or JSON.

## Who this is for

Naim, 24, based in Sweden. Background in cold calling, digital marketing, SaaS and AI; he
builds AI agents himself. He now works as a **commission-only salesman**, selling an
**AI customer service platform to companies in Norway**: an AI chat widget on the
company's website plus AI agents that answer the simple, repeated questions (opening hours,
returns, order status), summarise conversations and hand the rest to staff.

He is paid per deal: one commission per package sold (Small, Medium, Large). The amounts and
the monthly deal goal are in `system/business.json`. The employer said he may use his own
outreach tools to find as many leads as possible.

Goals, in order:
1. Book demos with Norwegian companies that really have a customer service load.
2. Close deals: the monthly goal in `system/business.json` (4 to start).
3. Get paid what was promised: track every commission until it is paid out.

He wants honesty. No hype, no invented numbers, no income promises. If something is
unlikely to work, say so and say what would.

## Where things go

| Path | What lives there | Who writes |
| --- | --- | --- |
| `_index.md` | Home note with the embedded HUD | Naim |
| `ops/pipeline.md` | **The pipeline**: one row per company. Every dashboard number comes from it. | skills, the HUD, Naim |
| `ops/directives.md`, `ops/tasks.md` | This week's top 3, open loops | /weekly-review, Naim |
| `daily-notes/` | One note per day: `## Directives`, `## Schedule`, `## Tasks`, `## Log` | /plan-today, /close-day |
| `projects/sales-job.md` | The job: commission, terms, contract checklist, what the manager said | Naim |
| `projects/product.md` | **What we sell**: features, packages, prices, proof. The only source for product claims. | Naim |
| `wiki/sales-playbook.md` | How to find, email, call and demo Norwegian companies | Naim, /weekly-review |
| `wiki/objections.md` | Objections heard and the answers that worked | /objections, Naim |
| `inbox/` | Raw drops: call notes, demo notes, lead lists, links | Naim |
| `outputs/<skill>/` | Every report or draft batch a skill produces, dated | skills |
| `outputs/runs/` | Automatic transcript of every headless run | the Bridge |
| `system/` | `backbone.json` (skills map), `business.json` (commission, goal), `routine.md`, logs | the Bridge, Naim |
| `_archive-vault/` | Anything stale, including the old outreach-business setup. Move, never delete. | /vault-cleanup |

## The pipeline table

`ops/pipeline.md` has one Markdown table. Keep its columns and order exactly:
`id | company | contact | email | phone | website | industry | city | channel | package | status | added | contacted | replied | booked | demo | closed | paid | next_date | next_action | notes`

- `status` is one of: researched, drafted, contacted, replied, booked, demo, won, lost.
  `booked` means a demo meeting is booked; `demo` means it was held.
- When a company moves to a stage, set that stage's date (`contacted`, `replied`, `booked`,
  `demo`, `closed` for won/lost) if it is empty. Phone contacts never get a `replied` date.
- `channel` is `email`, `phone`, `linkedin` or `other` (how the first contact happened).
- `package` is `S`, `M` or `L`. Only a won row with a package earns commission on the dashboard.
- `paid` is the date the commission for that deal was paid out. Empty means not paid yet.
- Escape a `|` inside a cell as `\|`. One line per row.

## Rules for every run

- Read before you write. Check `ops/directives.md`, today's daily note and the pipeline first.
- Product facts come from `projects/product.md` only. Never invent a feature, an integration,
  a price, a customer or a result. If it is not there, write `ask the employer`.
- Never quote a price that `projects/product.md` marks as unconfirmed.
- Save deliverables to `outputs/<skill-name>/YYYY-MM-DD-<slug>.md` unless the skill says otherwise.
- Never delete a note. Move it to `_archive-vault/` with the same relative path.
- **Never send, post, publish, call, buy or spend.** Emails are Gmail drafts at most. Naim sends and calls.
- Never guess an email address or phone number. Only use contact details a business publishes
  (its website, brreg.no, proff.no, 1881.no, gulesider.no).
- Anyone who asks not to be contacted is marked `lost` with `opt-out` in notes and never contacted again.
- Emails to Norwegian companies are written in Norwegian bokmål unless `email_language` in
  `system/business.json` says otherwise. Keep them plain and honest: Norwegians dislike hype.
- Numbers come from a source. If something is unknown, write `unknown`.
- Dates are `YYYY-MM-DD`, times 24h `HH:MM`, money NOK (SEK only as a rough conversion).

## Tiers (how requests reach you)

- Tier 1 answers from saved files with no model.
- Tier 2 is a quick answer from a small model.
- Tier 3 is you: a skill from `.claude/skills/` running headless. Nobody can answer a
  permission prompt mid-run, so stay inside the tools allowed in `.claude/settings.json`.
