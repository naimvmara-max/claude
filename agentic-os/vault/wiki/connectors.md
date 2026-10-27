# Connectors

Skills reach outside the vault through MCP connectors. Headless runs cannot answer
permission prompts, so each tool a skill needs must be allowed in `.claude/settings.json`.
Only allow read and draft tools. Sending stays manual.

## How to add one to Claude Code

```bash
# from the vault folder
claude mcp add --transport http <name> <server-url>
claude mcp list          # check it is connected
```

Connectors already connected on claude.ai can also appear inside Claude Code when you are
logged in with the same account. Run `/mcp` inside `claude` to see what is available, then
copy the exact tool names into the `allow` list.

## Which skill needs what

| Connector | Skills | Allow | Keep manual |
| --- | --- | --- | --- |
| Gmail | outreach-drafts, follow-ups, sync-pipeline, inbox-brief, offer, commission-check | search, read, create draft | send, forward, delete, label |
| Google Calendar | plan-today, inbox-brief, sync-pipeline, demo-prep | list and read events, suggest times | create, update, delete events |
| Web search and fetch | lead-research, call-list, demo-prep, morning-intel, deep-research (brreg.no, proff.no, FINN) | allowed by default | — |

## Worth adding later
- The employer's CRM, if they have one, so deals are not tracked twice.
- Your sending tool (Instantly, Smartlead, Lemlist) if you send volume from it instead of Gmail:
  then /sync-pipeline should read sent and replied counts from it.
- A dialer if you call a lot, so calls are logged without typing.

## Status
- Connected on claude.ai today: Gmail, Google Calendar, Google Drive.
- Without Gmail in Claude Code, the email skills write drafts into `outputs/` instead, and you
  update the pipeline yourself in the HUD (Command → Pipeline).
- brreg.no's open API needs no account: lead-research reaches it with web fetch.
