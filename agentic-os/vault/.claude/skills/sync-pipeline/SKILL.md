---
name: sync-pipeline
description: Bring ops/pipeline.md up to date with Gmail and Calendar - who was emailed, who replied, which demos are booked or held - so the dashboard numbers are real. Use for "sync pipeline", "update my numbers", "check replies", or at 12:00 on schedule.
---

# Sync pipeline

## Needs
A Gmail tool (search and read). Google Calendar is used if available. Without Gmail, write a
one-line note that the connector is missing (see `wiki/connectors.md`) and stop. Never guess.

## Do
1. For every company with an email address and status `drafted` or `contacted`:
   - **Sent** mail to that address: if a first email went out and `contacted` is empty, set
     `contacted` to the send date, `channel` = `email`, `status` = `contacted`.
   - Mail **from** that address or domain after `contacted`: set `replied` to its date and
     `status` = `replied`.
2. Classify each new reply in `notes` with one word: `positive`, `question`, `not-now`, `no`,
   `opt-out`, `out-of-office`.
   - `positive` or `question`: `next_action` = `Reply and offer demo times`, `next_date` = today.
   - `not-now`: `next_date` = the date they asked for (or 30 days out), `next_action` = `Check back`.
   - `no` or `opt-out`: `status` = `lost`, `closed` = today. Never contact again.
3. Calendar: a meeting with someone from a company in the pipeline means a demo.
   Future meeting: `status` = `booked` (set `booked` to today if empty), `next_date` = the meeting date.
   Past meeting: `status` = `demo`, `demo` = the meeting date, `next_action` = `Follow up after the demo`.
4. Never set `won`: Naim marks deals won himself once the customer has signed.
5. Keep the table valid: same columns, one row per company, dates `YYYY-MM-DD`.

## Never
- Never send, archive, label or delete emails. Never change calendar events.

## Output
`outputs/sync-pipeline/YYYY-MM-DD.md` with what changed per company. Reply with emails found,
new replies, positives and demos found.
