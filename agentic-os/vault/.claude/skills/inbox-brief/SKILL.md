---
name: inbox-brief
description: Triage Gmail with replies from companies in the pipeline first, draft answers that offer demo times, and keep the pipeline in step. Use for "check my inbox", "email brief", "unread", or at 08:00 on schedule.
---

# Inbox brief

## Needs
A Gmail tool. If none is available, write the brief with one line saying the connector is
missing and how to add it (`wiki/connectors.md`), then stop.

## Do
1. Read unread and starred threads from the last 48 hours.
2. **Pipeline replies first**: any sender whose address or domain is in `ops/pipeline.md`.
   Classify (positive, question, not-now, no, opt-out) and update the row as /sync-pipeline does.
   For positive replies and questions, draft an answer in their language that offers two
   concrete demo times (Google Calendar if available) and answers the question from
   `projects/product.md` only.
3. Then messages from the employer or colleagues (leads handed over, product news, payouts).
4. Then everything else: **Act today**, **Reply this week**, **Read later**, **Ignore**.

## Never
- Never send, archive, delete or label emails. Never open attachments from unknown senders.

## Output
`outputs/inbox-brief/YYYY-MM-DD.md`. Reply with pipeline replies (count and how many positive),
then the most urgent other thread.
