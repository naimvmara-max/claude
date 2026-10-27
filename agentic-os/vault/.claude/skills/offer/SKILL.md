---
name: offer
description: Turn demo notes into a short offer email with one recommended package and a clear next step, as a Gmail draft. Use for "write the offer", "send an offer to", "tilbud", "proposal".
---

# Offer

## Input
A company name or id, plus demo notes (pasted, or in `inbox/`). Without notes, use the latest
`outputs/demo-prep/` file for that company and say the offer is based on prep, not on the demo.

## Do
1. Read `projects/product.md`. If the package price is unconfirmed there, write the offer
   **without a price** and add a line for Naim: "Add the price from the official price list".
2. Write the email in their language: what they told you (their numbers, their words), the
   package and why it fits, what happens after they say yes (setup, start date), and one
   question that asks for a decision date.
3. Under 180 words. No discounts or terms that are not in `projects/product.md`.
4. With a Gmail tool, create a **draft** in the existing thread. Never send.
5. Update the row: `package`, `next_action` = `Follow up on the offer`, `next_date` = 2 workdays out.

## Never
- Never send. Never promise a discount, a trial or a result the employer has not approved.

## Output
`outputs/offer/YYYY-MM-DD-<company>.md`. Reply with the package and the decision question used.
