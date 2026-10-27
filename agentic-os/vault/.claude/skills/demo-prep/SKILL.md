---
name: demo-prep
description: Prepare for a booked demo - the company's customer service situation, questions, which package fits and why, likely objections. Use for "demo prep", "prep for my meeting with", "before my demo", or automatically when a company moves to "Meeting booked".
---

# Demo prep

## Input
A company name or pipeline id. If none is given, take the `booked` company whose `next_date`
(the meeting) is nearest.

## Read first
`projects/product.md`, `wiki/sales-playbook.md` (demo structure), `wiki/objections.md`,
the company's row, its briefing in `outputs/lead-research/`, and any email thread with them.

## Do
1. Research their customer service: channels (phone, email, chat, social), opening hours, FAQ,
   what customers ask (reviews, FAQ, social posts), job ads for kundeservice, seasonal peaks.
2. Write:
   - **Their situation** in 3 bullets.
   - **The questions they probably get most** (top 5) and which of them the product answers.
   - **7 discovery questions**: volume per day, who answers, cost of slow answers, peaks,
     who decides, what they use today, timing.
   - **Package**: S, M or L, and why, from `projects/product.md`. One package, not a menu.
   - **Objections** they are likely to raise, with short honest answers.
   - **Next step** to agree before the call ends.
3. Set the row's `package` to the recommendation if it is empty. Keep `next_date` on the meeting date.

## Never
- Never claim a feature, integration, price or result that is not in `projects/product.md`.

## Output
`outputs/demo-prep/YYYY-MM-DD-<company>.md`. Reply with the one question that matters most.
