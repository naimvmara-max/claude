---
name: call-summary
description: Turn a call note saved from the Live view into a short summary, the needs, a package estimate, the objections and the next step, and draft the follow-up email in bokmål. Use for "summarize the call", "sammanfatta samtalet", "efter samtalet", "samtalsanteckningar", or automatically when Naim saves a call with "Låt Jarvis sammanfatta" ticked.
---

# Call summary

## Input
The path of a call note (`samtal/YYYY-MM-DD-<company>.md`) and the company, e.g.
`samtal/2026-10-28-fjellsport-nett.md · Fjellsport Nett AS (L012)`. Without a path, take the
newest file in `samtal/`. If the file holds more than one call (separated by `---`), use the last.

## Read first
The call note, the company's row in `ops/pipeline.md`, `projects/product.md`,
`wiki/objections.md`, older notes for the same company in `samtal/`, and its
`outputs/demo-prep/` file if there is one.

## Do
1. **Sammanfattning** in Swedish, at most 5 bullets: what they do, how customers reach them
   today, what hurts, who decides, what was agreed. Only what the note says. Unknown = `okänt`.
2. **Behov**: the answers to Driv's six questions that the note has, and which are still open.
   Put the open ones as questions to ask next time.
3. **Paket**: count credits from the numbers in the note (agents, queues, webchats, AI agents per
   channel, email channels at 2 credits) and name the smallest package that covers them. Show
   the count. If the numbers are missing, say which ones to ask for. No commission in this file.
4. **Invändningar**: each objection in the note with the answer from `wiki/objections.md`. If one
   is not there yet, add it to `wiki/objections.md` in the same format (`## «…»`, then Svar,
   Följdfråga, Tips, Kategori, `Källa: fält`), with an answer that is true according to
   `projects/product.md`. Never change an existing card.
5. **Nästa steg**: one concrete step with a date. If the note has `Resultat` and the pipeline row
   does not reflect it yet, update the row (status, `next_date`, `next_action` in Swedish).
6. **Uppföljningsmejl** in Norwegian bokmål, under 150 words: thank them, repeat what they told
   you in their words, the one thing Driv Kundesenter changes for them, and the next step with
   a date or a question. Then, with a Gmail tool, create a **draft**:
   - To the address the customer gave in the call, or the named address of someone who has
     replied by email. Otherwise to the company's generic address (post@, kontakt@ …) from the
     pipeline row. If there is none, save the text in the output only.
   - Reply in the existing thread when there is one.

## Never
- Never send. Never guess an email address; use only one from the note, the pipeline or a reply.
- Never mention commission, discounts or a binding period. List prices only, from `projects/product.md`.
- Never promise a feature, an integration, a start-up time or a trial that `projects/product.md`
  does not state. Write `fråga Driv` instead.

## Language
Write everything for Naim (the output file and your final reply) in Swedish. Anything for a customer is Norwegian bokmål.

## Output
`outputs/call-summary/YYYY-MM-DD-<company>.md` with the five sections and the email text.
Reply with the next step and whether a Gmail draft was created, and to which address.
