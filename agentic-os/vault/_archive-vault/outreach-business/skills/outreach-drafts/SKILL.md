---
name: outreach-drafts
description: Write personalised first cold emails for researched leads in the pipeline and save them as drafts for Naim to send. Use for "draft emails", "write cold emails", "outreach emails", or 08:30 on weekdays on schedule.
---

# Outreach drafts

## Read first
`projects/outreach-business.md` (the offer), `wiki/outreach-playbook.md` (how to write),
`ops/pipeline.md` (the leads), `system/business.json` (`daily_sends`).

## Do
1. Pick leads with status `researched` that have an email address, oldest `added` first, up to `daily_sends`.
   If there are none, say so in the summary and suggest running /lead-research. Stop.
2. For each lead, read its row and its briefing in `outputs/lead-research/` if one exists.
3. Write the email exactly as the playbook says: short lowercase subject, one real observation,
   the problem, a soft question, under 90 words, opt-out line. Write in the language the business
   uses on its website (Swedish or English).
4. If a Gmail tool is available, create a Gmail **draft** to the lead's address. Never send.
   If not, collect the emails in the output file instead.
5. In `ops/pipeline.md`, set the lead's `status` to `drafted`, `next_date` to today and
   `next_action` to `Send first email`. Keep the table valid (one row per lead, same columns).

## Never
- Never send, schedule or forward an email.
- Never invent facts about a business. If the briefing has no real observation, skip the lead and say why.

## Output
`outputs/outreach-drafts/YYYY-MM-DD.md` with every email (to, subject, body). Reply with how many drafts were made and the best opening line.
