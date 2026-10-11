---
name: inbox-brief
description: Triage Gmail with lead replies first, draft answers Naim can send himself, and keep the pipeline in step. Use for "check my inbox", "email brief", "unread", or at 08:00 on schedule.
---

# Inbox brief

## Needs
A Gmail tool. If none is available, write the brief file with one line saying the connector is missing and how to add it (`wiki/connectors.md`), then stop.

## Do
1. Read unread and starred threads from the last 48 hours.
2. **Lead replies first**: any sender whose address is in `ops/pipeline.md`. For each, classify it
   (positive, question, not-now, no, opt-out) and update the row the same way /sync-pipeline does.
   For positive replies and questions, create a draft answer that offers two concrete call times
   from Google Calendar if available.
3. Then everything else: **Act today** (clients, money, deadlines), **Reply this week**, **Read later**, **Ignore**.
4. Draft replies for "Act today" in Naim's voice. Do not send.

## Never
- Never send, archive, delete or label emails. Never open attachments from unknown senders.

## Output
`outputs/inbox-brief/YYYY-MM-DD.md`. Reply with lead replies (count and how many positive), then the most urgent other thread.
