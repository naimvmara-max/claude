---
name: lead-research
description: Find Norwegian companies that fit Driv Kundesenter, add them to the pipeline with a published contact and one real observation each. Use for "find leads", "find companies", "prospects", "build a list", "research this company".
---

# Lead research

## Read first
`wiki/sales-playbook.md` (Driv's target groups and signals, where to look), `projects/product.md` (who it fits),
`ops/pipeline.md` (who is already in it).

## Input
Either one company (name, website or org number), or an industry and place
("nettbutikker i Bergen", "tannklinikker i Oslo") to find 10.
With no input: research the companies in `inbox/leads.md` first (remove each line once it is in
the pipeline), then find 10 companies that are **hiring customer service staff** right now
(FINN jobb, arbeidsplassen.nav.no).

## Do (per company)
1. Skip it if the company, org number or email is already in `ops/pipeline.md`.
2. Basics from brreg.no and proff.no: org number, industry, municipality, employees, daglig leder.
3. Contact: the person who decides (see the playbook) and an email address and phone number
   **only if published** (website, brreg.no, proff.no, 1881.no, gulesider.no). Prefer a
   company address (post@, kontakt@) for cold email until the employer says otherwise.
4. One specific, checkable observation that shows a customer service load: a job ad for
   kundeservice, only a contact form, no chat, a long FAQ, short phone hours, reviews about
   slow replies, questions asked in the evening and at weekends.
5. Which of Driv's target groups it is (nettbutikk og handel, timebestilling, rådgivning,
   service og utleie), a fit score 1 to 5, and a package guess (S, M or L) from how many
   people seem to work with customer service.
6. Add a row to `ops/pipeline.md`: next free `id`, company, contact, email, phone, website,
   industry, city, `status` = `researched`, `package` = your guess, `added` = today,
   `next_action` = `Skriv första mejlet eller ring`, `notes` = the observation and the fit score.
   Keep every column, one row per company.

## Never
- Never guess or pattern-generate an email address or phone number. Leave it empty.
- Never contact anyone or submit a form.


## Language
Write everything for Naim (the output file and your final reply) in Swedish. Anything for a customer is Norwegian bokmål.

## Output
`outputs/lead-research/YYYY-MM-DD.md` with a short briefing per company. Reply with how many
were added and the best fit.
