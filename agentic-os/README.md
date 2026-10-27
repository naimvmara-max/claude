# Jarvis · Agentic OS v2

A personal operating system for Naim's **sales job**: selling an AI customer service platform
to companies in Norway, paid per deal. One HUD and one brain on top of an Obsidian vault,
driving Claude Code (or Codex) to find companies, draft emails in Norwegian, build call lists,
prepare demos and keep the pipeline and commission current.

Preview on example data (no install): https://claude.ai/artifact/1CYR9f65iAVeMkjkibuJ4m

```
You ──► HUD (browser) ──┐                     ┌─► Tier 1  pipeline, commission, pace, no AI, instant
     └► Obsidian panel ─┴─► THE BRIDGE ─► ROUTER ─► Tier 2  quick answer, Claude Haiku
                              │                    └─► Tier 3  skill runs in Claude Code / Codex ─► Gmail, Calendar, web
                              ▼
                     THE VAULT: shared memory (pipeline, notes, skills, outputs, logs)
```

## What the dashboard shows

Every number is counted from one table, `vault/ops/pipeline.md` (one row per company), and the
commission amounts in `vault/system/business.json`. Nothing is estimated, and an empty pipeline
shows zeros.

| Number | How it is counted |
| --- | --- |
| Contacts this week | companies whose `contacted` date is this week (Monday to Sunday), email and phone; today vs `daily_contacts` |
| Meetings booked | companies with a `booked` date this month; the share of the last 30 days' contacts that booked |
| Demos held | companies with a `demo` date this month; how many booked or held demos are still open ("in play") |
| Deals this month | won companies with a `closed` date this month, one slot per deal in `goal_deals_month` (4), filled with the package |
| Commission | the `package` of each deal won this month × the commission for that package; ≈ SEK with `sek_per_nok` |
| Not paid out | won deals with no `paid` date |
| Pace (Command → Pace) | works back from the deal goal: deals → demos → meetings → contacts, a workday for the rest of the month. Uses your own conversion rates once you have 100 contacts, 5 meetings and 5 demos, and the starting guesses in `assumptions` until then |
| Follow-ups due | open companies whose `next_date` is today or earlier, plus contacted ones with no answer after 3 days (2 for phone) |
| Funnel | how many companies reached each stage, with the conversion from the stage above |

The commission per package (Small 5 000, Medium 10 000, Large 20 000 NOK) is what was said at the
interview. The HUD says so until you set `"confirmed": true` in `business.json`. The contract
checklist is in `vault/projects/sales-job.md` and in Command → Pace.

You can add companies and move them through the stages in **Command → Pipeline**, edit the table
in Obsidian, or let the skills do it. Moving a company to **Meeting booked** starts /demo-prep.

## Skills

| Area | Skill | When |
| --- | --- | --- |
| Prospecting | /lead-research: Norwegian companies with a real customer service load (job ads for kundeservice first), published contacts, one observation each | manual |
| Outreach | /outreach-drafts: first emails in bokmål as Gmail drafts | weekdays 08:30 |
| Outreach | /call-list: who to call today, published numbers, a 20-second opener each | weekdays 08:15 |
| Outreach | /follow-ups: day 3, 7 and 14 emails, call-backs, after-demo follow-ups | weekdays 08:45 |
| Outreach | /inbox-brief: pipeline replies first, draft answers with demo times | daily 08:00 |
| Outreach | /sync-pipeline: Gmail and Calendar → who was emailed, replied, booked, demoed | daily 12:00 |
| Sales | /demo-prep: their customer service, questions, which package and why | when a company moves to "Meeting booked" |
| Sales | /offer: demo notes → offer email draft | manual |
| Sales | /objections: collect objections, true answers into `wiki/objections.md` | manual |
| Productivity | /plan-today (with the pace), /close-day, /weekly-review | weekdays 07:00, 21:30, Sundays 19:00 |
| Research | /morning-intel (buying signals, competitors, one idea), /deep-research | weekdays 06:30, manual |
| Commission | /commission-check: earned vs paid out, against the contract | 1st of the month |
| Memory | /vault-cleanup | Sundays 18:00 |

No skill sends, calls or spends anything. Emails are Gmail drafts at most; you send them and
make the calls. Product claims come only from `vault/projects/product.md`, and prices marked
unconfirmed there are never quoted. The old outreach-business setup is in
`vault/_archive-vault/outreach-business/`.

Jarvis understands Swedish too: "hur går det?", "hur många samtal behöver jag?", "ringlistan".

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
   Open http://127.0.0.1:3217 in Chrome or Edge and keep the terminal window open. Or just
   double-click `Start Jarvis.bat`, which starts the Bridge and opens Jarvis in Chrome or Edge.
4. **Make it yours:** fill in `vault/projects/product.md` from the employer's material, check the
   commission and goal in `vault/system/business.json`, and edit `vault/system/routine.md`.
5. **Gmail and Calendar in Claude Code:** the email skills need them to create drafts and read
   replies. See `vault/wiki/connectors.md`. Without them, drafts go to `vault/outputs/` instead.
6. **Obsidian (optional):** open `agentic-os/vault` as a vault, Settings → Community plugins →
   turn off Restricted mode → enable *Agentic OS HUD*.

`npm run check` runs 41 offline checks (routing, schedules, pipeline, commission and pace maths).
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

**"Anthropic profile login expired" or "Login expired · run /login".** Claude Code was signed in
through an Anthropic (Console) profile, not your Claude account. Jarvis now hides that profile
from its runs, but Claude Code itself still needs a valid Claude login. In a black window run
`claude auth login --claudeai`, sign in with your Claude account, check with
`claude auth status --text`, then restart Jarvis.

**Voice does nothing (Jarvis "can't hear you").** You are probably in Opera, Opera GX or Brave.
They show the microphone button but cannot reach the speech service voice input needs. Use
Chrome or Edge: `Start Jarvis.bat` opens Jarvis in Chrome (or Edge) as its own window. Then
allow the microphone when asked.

**Changing Jarvis's voice.** Click **Voice** next to Tap to talk. Pick a voice, set speed and
pitch, and choose whether every answer is read aloud. The list is the voices your browser and
Windows have installed; in Edge the "Natural" (online) voices sound best, and British male voices
such as Ryan are closest to the film Jarvis. More voices: Windows Settings → Time & language →
Speech → Add voices. The choice is saved in that browser.

**`npm start` says it cannot find package.json.** The terminal is in the wrong folder. Open the
`agentic-os` folder in File Explorer, type `cmd` in the address bar, press Enter, run `npm start`.

## How a request flows

1. You speak or type. The HUD sends the text to `POST /api/ask`.
2. The router scores a fixed list of choices (8 rules, a quick answer, 16 skills) and picks one.
   You see the odds and can re-route with one tap.
3. Tier 1 answers from the pipeline and notes ("how am I doing?", "am I on pace?", "who should I follow up with?").
4. Tier 2 asks Claude Haiku through Claude Code on your plan (or the API, if you set one up).
5. Tier 3 starts a headless Claude Code run inside the vault. The prompt goes in through stdin,
   so nothing you type passes through the Windows shell. Tool calls stream into the terminal
   dock and the result is saved to `vault/outputs/`.
6. Every request is logged to `vault/system/log/YYYY-MM-DD.md`.

## Safety

- The Bridge listens on `127.0.0.1` only and rejects other hosts and cross-site requests.
- Headless runs can only use the tools in `vault/.claude/settings.json`. `rm`, `curl` and `git push` are denied.
- Never guessed email addresses or phone numbers, an opt-out line in every email, and anyone who opts out is marked lost.

## API

| Method | Path | Body |
| --- | --- | --- |
| GET | `/api/state` | everything the HUD shows, including `leads` and `stats` |
| GET | `/api/events` | server-sent events: `job`, `state` |
| POST | `/api/ask` | `{ text, engine?, force? }` |
| POST | `/api/classify` | `{ text }` |
| POST | `/api/leads` | `{ company, contact?, email?, phone?, website?, industry?, city?, channel?, package?, status? }` |
| POST | `/api/leads/:id` | any of `{ status, package, paid, next_date, next_action, notes, … }` |
| POST | `/api/run` | `{ skill, input?, engine? }` |
| POST | `/api/terminal` | `{ prompt, engine? }` |
| POST | `/api/engine` | `{ engine }` |
| GET / POST | `/api/jobs`, `/api/jobs/:id`, `/api/jobs/:id/stop` | |
| POST | `/api/tasks/toggle` | `{ file, line }` |
| POST | `/api/trigger/:event` | `{ input? }`, e.g. `meeting-booked` |
| GET | `/api/file?path=` | Markdown or JSON from the vault |

See `docs/VISUAL-STACK.md` for the design references and connectors that were checked.
