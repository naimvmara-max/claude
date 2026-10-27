---
name: offer
description: Turn demo notes into the credit count, the package and a short covering email for the offer Naim makes in Driv's CRM and sends for e-signing. Use for "write the offer", "send an offer to", "tilbud", "proposal".
---

# Offer

## Input
A company name or id, plus demo notes (pasted, or in `inbox/`). Without notes, use the latest
`outputs/demo-prep/` file for that company and say the offer is based on prep, not on the demo.

## Do
1. Read `projects/product.md`. Count credits from the demo notes (agents, queues, webchats,
   AI agents per channel, email channels) and pick the smallest package that covers them.
   Show the count so Naim can check it.
2. For Naim, in Swedish: what to enter in Driv's CRM (package, credits, list price per month
   excl. VAT) and a reminder that any discount must be agreed with management first.
3. A covering email in their language for the e-signing PDF: what they told you (their numbers,
   their words), the package and why it fits, what happens after they sign, and one question
   that asks for a decision date. Under 180 words. List price only; no discount, and no binding
   period until `projects/sales-job.md` says which one is right.
4. With a Gmail tool, create a **draft** in the existing thread. Never send.
5. Update the row: `package`, `next_action` = `Gör offerten i CRM:et och skicka för e-signering`, `next_date` = today.

## Never
- Never send. Never promise a discount, a trial or a result Driv has not approved.
- Never create the official offer: that is done in Driv's CRM.


## Language
Write everything for Naim (the output file and your final reply) in Swedish. Anything for a customer is Norwegian bokmål.

## Output
`outputs/offer/YYYY-MM-DD-<company>.md`. Reply with the package and the decision question used.
