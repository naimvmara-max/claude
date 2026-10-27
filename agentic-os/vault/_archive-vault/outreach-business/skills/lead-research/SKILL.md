---
name: lead-research
description: Find and research potential clients for Naim's outreach business, add them to the pipeline and write a short briefing per lead with a real observation to open with. Use for "find leads", "find clients", "prospects", "build a list", "research this business".
---

# Lead research

## Input
Either one business (name or link), or a niche and place ("accounting firms in Malmö") to find 10 leads.
If no input is given, research the businesses listed in `inbox/leads.md` first (remove each line once it is in the pipeline), then fall back to the niche and place from `projects/outreach-business.md`.

## Do (per lead)
1. Skip it if the company or email is already in `ops/pipeline.md`.
2. Basics: what they sell, location, size signals, website.
3. Contact: the best person to email (owner, CEO, marketing lead) and an email address **only if the
   business publishes it** (website, contact page, public registry). Prefer a named person's published address over info@.
4. One specific, observable detail you could open an email with (a new service, a hiring post,
   a slow website, no booking page, a recent award). It must be true and checkable.
5. Fit score 1–5 against the offer, with the reason.
6. Add a row to the table in `ops/pipeline.md`: next free `id` (L001, L002…), company, contact,
   email, website, niche, city, `status` = `researched`, `value` = estimated monthly deal from
   `system/business.json` `avg_deal`, `added` = today, `next_action` = `Draft first email`, `notes` = the observation.
   Keep every column, one row per lead.

## Never
- Never guess or pattern-generate email addresses. Leave `email` empty if none is published.
- Never contact anyone or submit forms.

## Output
Append a briefing per lead to `outputs/lead-research/YYYY-MM-DD.md`. Reply with how many leads were added and the best fit.
