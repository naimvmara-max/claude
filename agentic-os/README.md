# Jarvis · Agentic OS v2

A personal operating system for Naim's **email outreach business**: one HUD and one brain
on top of an Obsidian vault, driving Claude Code (or Codex) to find leads, draft emails and
follow-ups, keep the pipeline current and prepare calls.

Preview on example data (no install): https://claude.ai/artifact/1CYR9f65iAVeMkjkibuJ4m

```
You ──► HUD (browser) ──┐                     ┌─► Tier 1  pipeline + notes, no AI, instant
     └► Obsidian panel ─┴─► THE BRIDGE ─► ROUTER ─► Tier 2  quick answer, Claude Haiku
                              │                    └─► Tier 3  skill runs in Claude Code / Codex ─► Gmail, Calendar, web
                              ▼
                     THE VAULT: shared memory (pipeline, notes, skills, outputs, logs)
```

## What the dashboard shows

Every number is counted from one table, `vault/ops/pipeline.md` (one row per lead). Nothing
is estimated, and an empty pipeline shows zeros.

| Number | How it is counted |
| --- | --- |
| Sent this week | leads whose `contacted` date is this week (Monday to Sunday); today vs `daily_sends` |
| Reply rate 30d | of the leads first emailed in the last 30 days, how many have a `replied` date |
| Calls this month | leads with a `call` date this month |
| Pipeline value | monthly `value` of leads at replied, call or proposal |
| MRR and goal | monthly `value` of leads marked won, against `goal_mrr` in `vault/system/business.json` |
| Follow-ups due | open leads whose `next_date` is today or earlier, plus contacted leads with no reply after 3 days |
| Funnel | how many leads reached each stage, with the conversion from the stage above |

You can add leads and move them through the stages in **Command → Pipeline**, edit the table
in Obsidian, or let the skills do it.

## Skills

| Area | Skill | When |
| --- | --- | --- |
| Prospecting | /lead-research: find leads, add them to the pipeline with one real observation each | manual |
| Outreach | /outreach-drafts: personalised first emails as Gmail drafts | weekdays 08:30 |
| Outreach | /follow-ups: day 3, 7 and 14 follow-ups as drafts in the thread | weekdays 08:45 |
| Outreach | /inbox-brief: lead replies first, draft answers with call times | daily 08:00 |
| Outreach | /sync-pipeline: read Gmail, record who was emailed and who replied | daily 12:00 |
| Sales | /call-prep: research, questions, offer, objections | when a lead moves to "Call booked" |
| Sales | /proposal: three options and a Gmail draft | manual |
| Productivity | /plan-today, /close-day, /weekly-review | 07:00, 21:30, Sundays 19:00 |
| Research | /morning-intel (cold email, deliverability, AI, your niche), /deep-research | 06:30, manual |
| Finance | /money-check | 1st of the month |
| Memory | /vault-cleanup | Sundays 18:00 |

No skill sends anything. Emails are Gmail drafts at most; you send them. The old social-media
and clothing-brand skills are in `vault/_archive-vault/` if you ever want them back.

## Setup (about 10 minutes)

You need Node 20 or newer, Chrome or Edge (for voice), and a Claude **Pro or Max** plan.

1. **Install Claude Code and log in with your Claude account**
   ```bash
   npm install -g @anthropic-ai/claude-code
   claude
   ```
   When it asks how to log in, pick **Claude account with subscription**, not the Anthropic
   Console. Then type `/exit`.
2. **Trust the vault once.** Open a terminal in the `agentic-os/vault` folder (in File Explorer,
   open the folder, type `cmd` in the address bar and press Enter), then:
   ```bash
   claude
   ```
   Choose **Yes, proceed** on the trust question, then `/exit`. Without this, runs print
   "Ignoring 11 permissions.allow entries… this workspace has not been trusted".
3. **Start the Bridge** from the `agentic-os` folder:
   ```bash
   npm start
   ```
   Open http://127.0.0.1:3217 and keep the terminal window open.
4. **Make it yours:** fill in the offer in `vault/projects/outreach-business.md`, set
   `goal_mrr` and `daily_sends` in `vault/system/business.json`, and edit `vault/system/routine.md`.
5. **Gmail and Calendar in Claude Code:** the email skills need them to create drafts and read
   replies. See `vault/wiki/connectors.md`. Without them, drafts go to `vault/outputs/` instead.
6. **Obsidian (optional):** open `agentic-os/vault` as a vault, Settings → Community plugins →
   turn off Restricted mode → enable *Agentic OS HUD*.

`npm run check` runs 29 offline checks (routing, schedules, pipeline maths).
`npm run demo` builds `dist/jarvis-demo.html`, a single-file demo that needs no server.

## Troubleshooting

**"Credit balance is too low" even though you pay for Claude.** Claude Code is billing API
credits instead of your subscription. The Bridge already removes `ANTHROPIC_API_KEY` from its
runs; if you still see it:
1. Run `claude`, type `/status`, and look at the login method.
2. If it says API key or Console account: `/logout`, run `claude` again, pick
   **Claude account with subscription**.
3. If you set `ANTHROPIC_API_KEY` in Windows environment variables, remove it and restart the terminal.
4. Runs use `--model sonnet` (set in `config.json`, `engines.claude.model`). 1M-context models
   such as `claude-opus-5[1m]` can need extra usage on some plans.

The terminal prints these fixes in yellow under the error when it recognises one.

**`npm start` says it cannot find package.json.** The terminal is in the wrong folder. Open the
`agentic-os` folder in File Explorer, type `cmd` in the address bar, press Enter, run `npm start`.

## How a request flows

1. You speak or type. The HUD sends the text to `POST /api/ask`.
2. The router scores a fixed list of choices (7 rules, a quick answer, 14 skills) and picks one.
   You see the odds and can re-route with one tap.
3. Tier 1 answers from the pipeline and notes ("how am I doing?", "who should I follow up with?").
4. Tier 2 asks Claude Haiku through Claude Code on your plan (or the API, if you set one up).
5. Tier 3 starts a headless Claude Code run inside the vault. The prompt goes in through stdin,
   so nothing you type passes through the Windows shell. Tool calls stream into the terminal
   dock and the result is saved to `vault/outputs/`.
6. Every request is logged to `vault/system/log/YYYY-MM-DD.md`.

## Safety

- The Bridge listens on `127.0.0.1` only and rejects other hosts and cross-site requests.
- Headless runs can only use the tools in `vault/.claude/settings.json`. `rm`, `curl` and `git push` are denied.
- Never guessed email addresses, an opt-out line in every email, and anyone who opts out is marked lost.

## API

| Method | Path | Body |
| --- | --- | --- |
| GET | `/api/state` | everything the HUD shows, including `leads` and `stats` |
| GET | `/api/events` | server-sent events: `job`, `state` |
| POST | `/api/ask` | `{ text, engine?, force? }` |
| POST | `/api/classify` | `{ text }` |
| POST | `/api/leads` | `{ company, contact?, email?, website?, niche?, value?, status? }` |
| POST | `/api/leads/:id` | any of `{ status, next_date, next_action, value, notes, … }` |
| POST | `/api/run` | `{ skill, input?, engine? }` |
| POST | `/api/terminal` | `{ prompt, engine? }` |
| POST | `/api/engine` | `{ engine }` |
| GET / POST | `/api/jobs`, `/api/jobs/:id`, `/api/jobs/:id/stop` | |
| POST | `/api/tasks/toggle` | `{ file, line }` |
| POST | `/api/trigger/:event` | `{ input? }`, e.g. `call-booked` |
| GET | `/api/file?path=` | Markdown or JSON from the vault |

See `docs/VISUAL-STACK.md` for the design references and connectors that were checked.
