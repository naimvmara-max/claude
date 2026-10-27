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
1. Research their customer service: channels (phone, email, chat, contact form), opening hours,
   FAQ, what customers ask (reviews, FAQ, social posts), job ads for kundeservice, seasonal
   peaks, which systems they use (HubSpot, Lime CRM, Zoho or Microsoft 365 fit; anything else:
   "fråga Driv").
2. Write, following Driv's five steps (`wiki/sales-playbook.md`):
   - **Deras läge** in 3 bullets.
   - **Frågorna de troligen får mest** (top 5) and which ones the AI agent can take vs. what
     the colleagues keep (`projects/product.md`).
   - **De sex frågorna** from the playbook, each with what you expect to hear for this company.
   - **Demon**: what to show (chat on their kind of website, the AI agent answering one of
     their real questions, the case landing in the inbox with a summary).
   - **Paket**: a first credit estimate (agents, queues, webchats, AI agents per channel,
     email channels; costs in `projects/product.md`) and the smallest package that covers it.
     One package, not a menu. To be confirmed by counting credits with the customer.
   - **Invändningar** they are likely to raise, with Driv's answers from `wiki/objections.md`.
   - **Nästa steg** to agree before the call ends (offer by e-signing, decision date, who else decides).
3. Set the row's `package` to the recommendation if it is empty. Keep `next_date` on the meeting date.

## Never
- Never claim a feature, integration, price or result that is not in `projects/product.md`.
- Never promise a discount or a binding period.


## Language
Write everything for Naim (the output file and your final reply) in Swedish. Anything for a customer is Norwegian bokmål.

## Output
`outputs/demo-prep/YYYY-MM-DD-<company>.md`. Reply with the one question that matters most.
