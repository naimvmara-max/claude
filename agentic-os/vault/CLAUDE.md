# Operating manual

This folder is Naim's vault: the shared memory of his Agentic OS. Claude Code and Codex
both run here. Obsidian reads the same files. Keep everything plain Markdown or JSON.

## Who this is for

Naim, 24. Skills: digital marketing, dropshipping, SaaS, AI. Goals, in order:

1. Income now: paid work from the skills he already has (see `projects/income-now.md`).
2. An AI-made clothing brand grown organically on Instagram and TikTok (see `projects/clothing-brand.md`).
3. Financial freedom over years, not weeks.

He wants honesty. No hype, no invented numbers, no income promises. If something is
unlikely to work, say so and say what would.

## Where things go

| Folder | What lives there | Who writes |
| --- | --- | --- |
| `_index.md` | Home note with the embedded HUD | Naim |
| `daily-notes/` | One note per day: `YYYY-MM-DD.md` with `## Directives`, `## Schedule`, `## Tasks`, `## Log` | /plan-today, /close-day, Naim |
| `inbox/` | Raw drops: pasted DMs, comment exports, links, voice notes | Naim |
| `ops/` | `directives.md` (this week's top 3), `tasks.md` (open loops) | /weekly-review, Naim |
| `projects/` | One note per project with status and next actions | Naim, skills |
| `content/` | Ideas, scripts, hooks, captions, the posting log | content skills |
| `wiki/` | Durable knowledge: brand bible, playbooks, connectors | Naim, /vault-cleanup |
| `outputs/<skill>/` | Every report a skill produces, dated | skills |
| `outputs/runs/` | Automatic transcript of every headless run | the Bridge |
| `system/` | `backbone.json` (skills map), `vitals.json` (numbers), `routine.md`, logs | the Bridge, /pull-metrics |
| `_archive-vault/` | Anything stale. Move, never delete. | /vault-cleanup |

## Rules for every run

- Read before you write. Check `ops/directives.md` and today's daily note first.
- Save deliverables to `outputs/<skill-name>/YYYY-MM-DD-<slug>.md` unless the skill says otherwise.
- Never delete a note. Move it to `_archive-vault/` with the same relative path.
- Never send, post, publish, buy or spend. Draft it and leave it for Naim. This includes emails, DMs, posts, ads and orders.
- Numbers come from a source. If a metric is unknown, write `unknown`, never a guess.
- Mark AI-generated visuals as AI-generated wherever they will be posted. TikTok and Meta both require labels for realistic AI content.
- Dates are `YYYY-MM-DD`, times are 24h `HH:MM`, money is EUR unless a source says otherwise.
- Keep notes short. Bullet points over paragraphs. Link related notes with `[[wikilinks]]`.

## Tiers (how requests reach you)

The Bridge routes each request before you see it:

- Tier 1 answers from saved files with no model.
- Tier 2 is a quick answer from a small model.
- Tier 3 is you: a skill from `.claude/skills/` running headless. Nobody can answer a
  permission prompt mid-run, so stay inside the tools allowed in `.claude/settings.json`.
