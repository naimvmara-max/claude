---
name: call-prep
description: Prepare for a booked sales call - who they are, what to ask, what to offer, likely objections. Use for "prep for my call", "call prep", "before my call with", or automatically when a lead moves to "Call booked".
---

# Call prep

## Input
A company name or pipeline id. If none is given, take the lead whose `call` date is nearest in the future in `ops/pipeline.md`.

## Do
1. Read the lead's row, its briefing in `outputs/lead-research/`, and any email thread with them (Gmail, if available).
2. Research the business: what they sell, who they sell to, size signals, how they get customers today, anything recent.
3. Write:
   - **Their situation** in 3 bullets, in their words where possible.
   - **7 questions** that uncover the problem, the cost of the problem, who decides, and timing.
   - **The offer** from `projects/outreach-business.md`, tailored: which option fits and why.
   - **Objections** they are likely to raise (price, "tried it before", "no time") with a short honest answer each.
   - **Next step** to ask for at the end of the call.
4. Set the lead's `next_action` to `Call` and keep `next_date` on the call date.

## Output
`outputs/call-prep/YYYY-MM-DD-<company>.md`. Reply with the one question that matters most.
