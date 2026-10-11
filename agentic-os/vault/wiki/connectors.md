# Connectors

Skills reach outside the vault through MCP connectors. Headless runs cannot answer
permission prompts, so each tool a skill needs must be allowed in `.claude/settings.json`.
Only allow read and draft tools. Sending, posting and buying stay manual.

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

| Connector | Skills | Allow (examples) | Keep manual |
| --- | --- | --- | --- |
| Google Calendar | plan-today, weekly-review | list and read events | create, update, delete events |
| Gmail | inbox-brief, proposal, money-check, lead-research | search, read, create draft | send, forward, delete, label |
| Google Drive | proposal | search, read | share, trash |
| Shopify | pull-metrics, drop-plan, money-check, product-research | analytics, list orders, read products | create or update products, discounts, inventory |
| Higgsfield | drop-plan, content-cascade | generate image, generate video | TikTok publish |
| Social analytics (Metricool, vidIQ or Supermetrics) | pull-metrics, weekly-review | read metrics | schedule or publish posts |
| Canva | content-cascade | search, read designs | export to socials |

## Status
- Connected on claude.ai today: Gmail, Google Calendar, Google Drive, Shopify, Higgsfield.
- Needs reconnecting: Canva.
- Not connected yet: a social analytics source. Until one is, enter TikTok and Instagram numbers in `inbox/metrics.md` and /pull-metrics picks them up.
