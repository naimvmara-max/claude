# Jarvis · Agentic OS v2

A personal operating system for Naim: one HUD and one brain on top of an Obsidian vault,
driving Claude Code (or Codex) to do real work in the background.

Preview on example data (no install): https://claude.ai/artifact/1CYR9f65iAVeMkjkibuJ4m

```
You ──► HUD (browser) ──┐                     ┌─► Tier 1  rules + saved data, no AI, instant
     └► Obsidian panel ─┴─► THE BRIDGE ─► ROUTER ─► Tier 2  quick answer, Claude Haiku 5.5
                              │                    └─► Tier 3  skill runs headless in Claude Code / Codex ─► connectors
                              ▼
                     THE VAULT: shared memory (notes, skills, outputs, logs)
```

## What is in here

| Piece | Where | What it does |
| --- | --- | --- |
| HUD | `public/` | Particle core (green network sphere for Claude, white spiral galaxy for Codex), vitals with sparklines, weekly-load meter, directives, quick skills, voice, ask box, terminal dock |
| Command view | `public/` (Command tab) | Glass dashboard: load bar, 4 metric cards, latest upload, workflow buttons, today's timeline, tasks, morning brief, audience charts, research reports |
| Backbone view | `public/` (Backbone tab) | Domain → task → skill → automation map, built from `vault/system/backbone.json`. Tap a skill to run it |
| Router view | `public/` (Router tab) | The architecture diagram plus a live tester that shows the probability of every predefined choice |
| The Bridge | `server.js`, `lib/` | Local server on `127.0.0.1:3217`. Routes requests, runs jobs, streams logs, runs the scheduler, records everything in the vault |
| Router | `public/js/classify.js` | Scores a fixed list of choices (6 rules, quick answer, 15 skills), returns probabilities, falls back to Tier 2 when unsure |
| Vault | `vault/` | Obsidian folder: `CLAUDE.md` operating manual, daily notes, ops, projects, wiki, outputs, system |
| Skills | `vault/.claude/skills/` | 15 skills written for Naim's goals: plan-today, morning-intel, inbox-brief, close-day, weekly-review, vault-cleanup, deep-research, content-cascade, hook-lab, pull-metrics, drop-plan, product-research, lead-research, proposal, money-check |
| Obsidian plugin | `vault/.obsidian/plugins/agentic-os-hud/` | Opens the HUD in Obsidian's side panel |

## Setup (about 10 minutes)

You need Node 20 or newer, Chrome or Edge (for voice), and a Claude plan.

1. **Install and log in to Claude Code**
   ```bash
   npm install -g @anthropic-ai/claude-code
   claude            # log in, then type /exit
   ```
2. **Trust the vault once.** Headless runs ignore the vault's permission list until the
   folder has been trusted interactively:
   ```bash
   cd agentic-os/vault
   claude            # accept the trust prompt, then /exit
   ```
3. **Start the Bridge**
   ```bash
   cd agentic-os
   npm start         # no dependencies needed
   ```
   Open http://127.0.0.1:3217. The terminal prints which engines it found.
4. **Optional, faster Tier 2:** `npm install` adds the Anthropic SDK. With an
   `ANTHROPIC_API_KEY` set, quick answers go straight to Claude Haiku 5.5 (about a second)
   instead of through the Claude Code CLI (about 5 seconds, but uses your plan, no key).
5. **Obsidian:** open `agentic-os/vault` as a vault, Settings → Community plugins → turn
   off Restricted mode → enable *Agentic OS HUD*. Click the sparkles icon in the ribbon.
6. **Optional, Codex:** install the Codex CLI and log in. It appears in the engine switch.
   If your Codex version uses different flags, edit `engines.codex.args` in `config.json`.
7. **Make it yours:** edit `vault/system/routine.md`, `vault/ops/directives.md`,
   `vault/wiki/brand-bible.md`, and replace the example numbers in
   `vault/system/vitals.json` (or run /pull-metrics).

`npm run check` runs 21 offline checks (router decisions, schedules, vault parsing).
`npm run demo` builds `dist/jarvis-demo.html`, a single-file demo that needs no server.

## How a request flows

1. You speak (tap to talk) or type. The HUD sends the text to `POST /api/ask`.
2. The router scores every predefined choice and picks one. You see the odds and can
   re-route with one tap ("Route instead").
3. **Tier 1** answers from files: priorities, schedule, tasks, numbers, time, skills.
4. **Tier 2** asks Claude Haiku 5.5 for a short answer that can be read aloud.
5. **Tier 3** starts a headless run (`claude -p … --output-format stream-json`) inside the
   vault. Its tool calls stream into the terminal dock; the final answer is saved to
   `vault/outputs/runs/` and the skill saves its own report to `vault/outputs/<skill>/`.
6. Every request is logged to `vault/system/log/YYYY-MM-DD.md`.

The router is a scorer, not a model, so it is free and instant. Set
`"router.classifier": "haiku"` in `config.json` to let Claude Haiku 5.5 pick from the same
choices with structured output (needs the SDK and a key). Jev, TypeSafe AI's decision
model, fits the same slot: anything that maps a message to one of N choices with a
probability can replace `classify()`.

## Automations

Schedules live in `vault/system/backbone.json`:

| Skill | When |
| --- | --- |
| /morning-intel | daily 06:30 |
| /plan-today | daily 07:00 |
| /inbox-brief | daily 08:00 (drafts only) |
| /pull-metrics | daily 09:00 |
| /close-day | daily 21:30 |
| /vault-cleanup, /weekly-review | Sundays 18:00, 19:00 |
| /money-check | 1st of the month |
| /content-cascade | event `video-live`: `curl -X POST -H 'Content-Type: application/json' -d '{"input":"<transcript>"}' http://127.0.0.1:3217/api/trigger/video-live` |
| everything else | manual |

The scheduler only runs while the Bridge is running. A missed run still fires if it is less
than 3 hours late. For always-on schedules, keep the Bridge running on a machine that stays
awake, or move the skill to a Claude Code routine.

## Costs and limits

- Tier 3 runs use your Claude plan (or API credits). The weekly-load meter adds up the
  cost estimate Claude Code reports for each run and compares it with `usage.weeklyBudgetUsd`.
  It is not your plan's real limit; check that in Claude itself.
- Voice uses the browser's Web Speech API. In Chrome, speech recognition is processed by
  Google's servers. For fully local voice, swap in Whisper (ears) and Kokoro (voice).
- Terminals are headless job consoles, not interactive shells.
- TikTok and Instagram numbers need a connector (Metricool, vidIQ or Supermetrics) or a
  line in `vault/inbox/metrics.md`. Nothing is estimated.

## Safety

- The Bridge listens on `127.0.0.1` only and rejects other hosts and cross-site requests,
  because it can start Claude Code with write access to the vault.
- Headless runs can only use the tools in `vault/.claude/settings.json`: read, edit, web
  search and fetch, and a few safe shell commands. `rm`, `curl` and `git push` are denied.
- No skill sends, posts, publishes, buys or deletes. They draft and leave it for you.
  Add connector tools to the allow list only for reading and drafting.

## API

| Method | Path | Body |
| --- | --- | --- |
| GET | `/api/state` | everything the HUD shows |
| GET | `/api/events` | server-sent events: `job`, `state` |
| POST | `/api/ask` | `{ text, engine?, force? }` |
| POST | `/api/classify` | `{ text }` |
| POST | `/api/run` | `{ skill, input?, engine? }` |
| POST | `/api/terminal` | `{ prompt, engine? }` |
| POST | `/api/engine` | `{ engine }` |
| GET / POST | `/api/jobs`, `/api/jobs/:id`, `/api/jobs/:id/stop` | |
| POST | `/api/tasks/toggle` | `{ file, line }` |
| POST | `/api/vitals` | `{ key, value }` |
| POST | `/api/trigger/:event` | `{ input? }` |
| GET | `/api/file?path=` | Markdown or JSON from the vault |

See `docs/VISUAL-STACK.md` for the design references, plugins and MCP connectors that were
checked for the visuals and what to add next.
