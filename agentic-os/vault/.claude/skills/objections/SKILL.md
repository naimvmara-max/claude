---
name: objections
description: Collect the objections heard in replies, call notes and demo notes, and update wiki/objections.md with short, true answers. Use for "objections", "collect objections", "invändningar", "they said no because". A single quick "how do I answer X?" is better asked straight to Jarvis.
---

# Objections

## Read first
`wiki/objections.md`, `projects/product.md`, pipeline rows with `lost` (the reason is in `notes`),
call notes in `samtal/` (the section `## Invändningar som kom upp` lists what Naim marked
"Hörde den" in the Live view), notes in `inbox/`, the latest `outputs/inbox-brief/`,
`outputs/call-summary/` and `outputs/demo-prep/` files.

## Do
1. If a specific objection was given as input, answer that one first: 2 or 3 versions,
   each short enough to say on the phone, in Norwegian, with a short Swedish note on when to use which.
2. Find objections that came up in the last 30 days. Count how often each appeared.
3. Add new ones to `wiki/objections.md` in its card format, which the Live view reads:
   a heading `## «what the customer says»`, then the lines `- Svar:`, `- Följdfråga:`, `- Tips:`,
   `- Kategori:` and `- Källa: fält`. The answer is in Norwegian and true according to
   `projects/product.md`; the tip is Swedish. Keep every existing card and never change one
   whose `Källa` is `Driv`. For cards that came up, add or update a line `- Hört: <count>
   gånger, senast YYYY-MM-DD`.
4. Name the most common lost reason. If one reason dominates, suggest what to change
   (targeting, the email, the demo).

## Never
- Never answer an objection with a claim that is not in `projects/product.md`.


## Language
Write everything for Naim (the output file and your final reply) in Swedish. Anything for a customer is Norwegian bokmål.

## Output
`outputs/objections/YYYY-MM-DD.md`. Reply with the most common objection and the best answer.
