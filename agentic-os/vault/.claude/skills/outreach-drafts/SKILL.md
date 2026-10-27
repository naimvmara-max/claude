---
name: outreach-drafts
description: Write personalised first emails in Norwegian for researched companies in the pipeline and save them as drafts for Naim to send. Use for "draft emails", "write cold emails", "first emails", or 08:30 on weekdays on schedule.
---

# Outreach drafts

## Read first
`projects/product.md` (what we may claim), `wiki/sales-playbook.md` (how to write),
`ops/pipeline.md`, `system/business.json` (`daily_contacts`, `email_language`).

## Do
1. Pick companies with status `researched` that have an email address, best fit first, up to
   half of `daily_contacts` (the rest of the day is calls). If none, say so and suggest
   /lead-research. Stop.
2. Read each row and its briefing in `outputs/lead-research/` if one exists.
3. Write the email as the playbook says, in Norwegian bokmål (or the language in
   `email_language`): short lowercase subject, the observation, their problem, one sentence on
   what we do, a soft ask for a 20-minute demo, under 90 words, the opt-out line.
4. If a Gmail tool is available, create a Gmail **draft**. Never send. If not, collect the
   emails in the output file.
5. In `ops/pipeline.md` set `status` = `drafted`, `channel` = `email`, `next_date` = today,
   `next_action` = `Send first email`.

## Never
- Never send, schedule or forward an email.
- Never claim a feature, price, customer or result that is not in `projects/product.md`.
- Skip a company with no real observation and say why.

## Output
`outputs/outreach-drafts/YYYY-MM-DD.md` with every email (to, subject, body). Reply with the
number of drafts and the best opening line.
