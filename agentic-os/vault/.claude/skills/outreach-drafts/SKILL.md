---
name: outreach-drafts
description: Write personalised first emails in Norwegian for researched companies in the pipeline and save them as drafts for Naim to send. Use for "draft emails", "write cold emails", "first emails", or 08:30 on weekdays on schedule.
---

# Outreach drafts

## Read first
`projects/product.md` (what we may claim), `wiki/sales-playbook.md` (how to write),
`ops/pipeline.md`, `system/business.json` (`daily_contacts`, `email_language`).

## Do
1. If `outreach.mode` in `system/business.json` is `campaign`, say that volume goes through
   /campaign and only draft emails asked for by name. Otherwise pick companies with status
   `researched` that have a **generic company address** (post@, kontakt@, kundeservice@, info@;
   never a named person's address, never an ENK), best fit first, up to 30 a day: they are sent
   from Naim's own address on Driv's main domain, which must not send volume. If none, say so
   and suggest /lead-research. Stop.
2. Read each row and its briefing in `outputs/lead-research/` if one exists.
3. Write the email as the playbook says, in Norwegian bokmål (or the language in
   `email_language`): short lowercase subject, "Hei," (a shared inbox, so no first name), the
   observation, their problem in Driv's words (customers waiting after closing time, the same
   questions every day, a messy shared inbox), one sentence on Driv Kundesenter, a soft ask for a
   20-minute demo or to forward it to whoever runs customer service, under 90 words, signed
   "Naim Amara, Driv Mobil" with his phone number, and the opt-out line. Sell the benefit, not features.
4. If a Gmail tool is available, create a Gmail **draft**. Never send. If not, collect the
   emails in the output file.
5. In `ops/pipeline.md` set `status` = `drafted`, `channel` = `email`, `next_date` = today,
   `next_action` = `Skicka första mejlet`.

## Never
- Never send, schedule or forward an email. Never email a named person's address cold.
- Never claim a feature, price, customer or result that is not in `projects/product.md`.
- Never mention prices, discounts or binding period in a first email.
- Skip a company with no real observation and say why.


## Language
Write everything for Naim (the output file and your final reply) in Swedish. Anything for a customer is Norwegian bokmål.

## Output
`outputs/outreach-drafts/YYYY-MM-DD.md` with every email (to, subject, body). Reply with the
number of drafts and the best opening line.
