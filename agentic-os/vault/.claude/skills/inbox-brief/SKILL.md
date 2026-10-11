---
name: inbox-brief
description: Triage Gmail into a short brief and draft replies Naim can send himself. Use for "check my inbox", "email brief", "unread", or at 08:00 on schedule.
---

# Inbox brief

## Needs
A Gmail tool (claude.ai Gmail connector or a Gmail MCP server). If none is available, write the brief file with one line saying the connector is missing and how to add it (`wiki/connectors.md`), then stop.

## Do
1. Read unread and starred threads from the last 48 hours.
2. Sort into: **Act today** (clients, money, deadlines), **Reply this week**, **Read later**, **Ignore** (newsletters, promos).
3. For each "Act today" thread, create a Gmail draft reply in Naim's voice: short, friendly, specific. Do not send.
4. Pull any dates into a "Calendar suggestions" list.

## Never
- Never send, archive, delete or label emails.
- Never open links or attachments from unknown senders.

## Output
`outputs/inbox-brief/YYYY-MM-DD.md`. Reply with the count per bucket and the most urgent thread.
