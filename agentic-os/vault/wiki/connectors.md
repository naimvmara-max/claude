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
| Gmail | outreach-drafts, follow-ups, sync-pipeline, inbox-brief, proposal, money-check | search, read, create draft | send, forward, delete, label |
| Google Calendar | plan-today, inbox-brief, call-prep | list and read events, suggest times | create, update, delete events |
| Google Drive | proposal | search, read | share, trash |
| Web search and fetch | lead-research, call-prep, morning-intel, deep-research | allowed by default | — |

## Worth adding later
- A CRM (Pipedrive, HubSpot) if the pipeline outgrows one table.
- A data source for finding companies and published contacts (for example Vibe Prospecting).
- Your sending tool (Instantly, Smartlead, Lemlist) if you move sending off Gmail: then
  /sync-pipeline should read sent and replied counts from it instead.

## Status
- Connected on claude.ai today: Gmail, Google Calendar, Google Drive.
- Without Gmail in Claude Code, the email skills write drafts into `outputs/` instead, and you
  update the pipeline yourself in the HUD (Command → Pipeline).
