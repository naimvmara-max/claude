# Operating manual

This folder is Naim's vault: the shared memory of his Agentic OS. Claude Code and Codex
both run here. Obsidian reads the same files. Keep everything plain Markdown or JSON.

## Who this is for

Naim, 24, based in Sweden. Skills: digital marketing, SaaS, AI. He runs an **email outreach
business**: finding businesses, emailing them, booking calls and signing clients.

Goals, in order:
1. Paying clients from cold email, tracked in `ops/pipeline.md`.
2. Monthly recurring revenue toward the goal in `system/business.json`.
3. Financial freedom over years, not weeks.

He wants honesty. No hype, no invented numbers, no income promises. If something is
unlikely to work, say so and say what would.

## Where things go

| Path | What lives there | Who writes |
| --- | --- | --- |
| `_index.md` | Home note with the embedded HUD | Naim |
| `ops/pipeline.md` | **The pipeline**: one row per lead. Every dashboard number comes from it. | skills, the HUD, Naim |
| `ops/directives.md`, `ops/tasks.md` | This week's top 3, open loops | /weekly-review, Naim |
| `daily-notes/` | One note per day: `## Directives`, `## Schedule`, `## Tasks`, `## Log` | /plan-today, /close-day |
| `projects/outreach-business.md` | The offer, the niche, the rules | Naim |
| `wiki/outreach-playbook.md` | How emails and follow-ups are written | Naim, /vault-cleanup |
| `inbox/` | Raw drops: pasted notes, links, call notes | Naim |
| `outputs/<skill>/` | Every report or draft batch a skill produces, dated | skills |
| `outputs/runs/` | Automatic transcript of every headless run | the Bridge |
| `system/` | `backbone.json` (skills map), `business.json` (targets), `routine.md`, logs | the Bridge, Naim |
| `_archive-vault/` | Anything stale, including the old social-media and clothing-brand skills. Move, never delete. | /vault-cleanup |

## The pipeline table

`ops/pipeline.md` has one Markdown table. Keep its columns and order exactly:
`id | company | contact | email | website | niche | city | status | value | added | contacted | replied | call | proposal | closed | next_date | next_action | notes`

- `status` is one of: researched, drafted, contacted, replied, call, proposal, won, lost.
- When a lead moves to a stage, set that stage's date (`contacted`, `replied`, `call`, `proposal`, `closed` for won/lost) if it is empty.
- `value` is a monthly amount in EUR, digits only.
- Escape a `|` inside a cell as `\|`. One line per row.

## Rules for every run

- Read before you write. Check `ops/directives.md`, today's daily note and the pipeline first.
- Save deliverables to `outputs/<skill-name>/YYYY-MM-DD-<slug>.md` unless the skill says otherwise.
- Never delete a note. Move it to `_archive-vault/` with the same relative path.
- **Never send, post, publish, buy or spend.** Emails are Gmail drafts at most. Naim sends.
- Never guess an email address. Only use addresses a business publishes.
- Anyone who asks not to be contacted is marked `lost` and never emailed again.
- Numbers come from a source. If something is unknown, write `unknown`.
- Dates are `YYYY-MM-DD`, times 24h `HH:MM`, money EUR.

## Tiers (how requests reach you)

- Tier 1 answers from saved files with no model.
- Tier 2 is a quick answer from a small model.
- Tier 3 is you: a skill from `.claude/skills/` running headless. Nobody can answer a
  permission prompt mid-run, so stay inside the tools allowed in `.claude/settings.json`.
