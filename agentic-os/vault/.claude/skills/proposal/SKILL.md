---
name: proposal
description: Turn call notes into a one-page proposal and a Gmail draft for Naim to review and send himself. Use for "proposal", "write an offer", "quote for", "pitch".
---

# Proposal

## Input
Call notes, or a pipeline id / company whose `call-prep` and notes exist. If there is nothing to go on, ask for the client name and their main problem in the summary and stop.

## Do
1. Restate the client's goal and problem in their words.
2. Offer three options (good, better, best) with what is included, timeline and monthly price, based on the offer in `projects/outreach-business.md`.
3. Show what success looks like after 30 and 90 days in numbers they can check (emails sent, replies, meetings booked). Never promise sales or revenue.
4. Next step: one clear action with a date.
5. If a Gmail tool is available, create a draft email with a short note and the proposal. Do not send.
6. In `ops/pipeline.md`: `status` = `proposal`, `proposal` = today, `value` = the recommended option's monthly price, `next_action` = `Follow up on proposal`, `next_date` = 3 days from today.

## Output
`outputs/proposal/YYYY-MM-DD-<client>.md`, plus the Gmail draft if possible. Reply with the recommended option and price.
