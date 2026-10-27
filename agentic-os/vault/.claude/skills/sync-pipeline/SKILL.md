---
name: sync-pipeline
description: Bring ops/pipeline.md up to date with Gmail and Calendar - who was emailed, who replied, which demos are booked or held - so the dashboard numbers are real. Use for "sync pipeline", "update my numbers", "check replies", or at 12:00 on schedule.
---

# Sync pipeline

## Needs
A Gmail (or Outlook) tool to search and read. Google Calendar is used if available. For
campaigns: the newest export from the sending tool in `inbox/` (a CSV whose name starts with
`kampanj`), or the tool's connector if one is installed (read only). With none of these, write a
one-line note on what is missing (see `wiki/connectors.md`) and stop. Never guess.

## Do
1. For every company with an email address and status `drafted` or `contacted`:
   - **Sent** mail to that address: if a first email went out and `contacted` is empty, set
     `contacted` to the send date, `channel` = `email`, `status` = `contacted`.
   - Mail **from** that address or domain after `contacted`: set `replied` to its date and
     `status` = `replied`.
   - Campaign export: match rows by `lead_id` or email. Sent: `contacted` = first send date,
     `channel` = `email`, `status` = `contacted`, `next_action` = `Ring beslutsfattaren` if the
     sequence finished without a reply. Replied: as below. Bounced: `status` = `lost`,
     notes `bounce`. Unsubscribed: `status` = `lost`, notes `opt-out`.
2. Classify each new reply in `notes` with one word: `positive`, `question`, `not-now`, `no`,
   `opt-out`, `out-of-office`.
   - `positive` or `question`: `next_action` = `Svara och föreslå demotider`, `next_date` = today.
   - `not-now`: `next_date` = the date they asked for (or 30 days out), `next_action` = `Hör av dig igen`.
   - `no` or `opt-out`: `status` = `lost`, `closed` = today. Never contact again.
3. Calendar: a meeting with someone from a company in the pipeline means a demo.
   Future meeting: `status` = `booked` (set `booked` to today if empty), `next_date` = the meeting date,
   and `booked_via` = `email` if the meeting followed an email reply, otherwise leave it for Naim.
   Past meeting: `status` = `demo`, `demo` = the meeting date, `next_action` = `Skicka offert`.
4. An offer sent for e-signing (an e-signing email in Sent or from the e-signing service):
   `status` = `offer`, `offer` = that date, `next_action` = `Följ upp offerten`, `next_date` = 2 workdays later.
5. Never set `won`: Naim marks deals won himself once the customer has signed.
6. Keep the table valid: same columns, one row per company, dates `YYYY-MM-DD`.

## Never
- Never send, archive, label or delete emails. Never change calendar events.


## Language
Write everything for Naim (the output file and your final reply) in Swedish. Anything for a customer is Norwegian bokmål.

## Output
`outputs/sync-pipeline/YYYY-MM-DD.md` with what changed per company. Reply with emails found,
new replies, positives and demos found.
