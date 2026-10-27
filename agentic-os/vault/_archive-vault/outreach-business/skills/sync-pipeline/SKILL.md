---
name: sync-pipeline
description: Bring ops/pipeline.md up to date with Gmail - which first emails went out, who replied, and what each reply means - so the dashboard numbers are real. Use for "sync pipeline", "update my numbers", "check replies", or at 12:00 on schedule.
---

# Sync pipeline

## Needs
A Gmail tool (search and read). Without one, write a one-line note in the output file that the
Gmail connector is missing (see `wiki/connectors.md`) and stop. Never guess.

## Do
1. For every lead with an email address and status `drafted` or `contacted`:
   - Search **Sent** mail to that address. If a first email went out and `contacted` is empty,
     set `contacted` to the send date and `status` to `contacted`.
   - Search the inbox for mail **from** that address after `contacted`. If there is a reply,
     set `replied` to its date and `status` to `replied`.
2. Classify each new reply in `notes` with one word: `positive`, `question`, `not-now`, `no`, `opt-out`, `out-of-office`.
   - `positive` or `question`: `next_action` = `Reply and offer call times`, `next_date` = today.
   - `not-now`: `next_date` = the date they asked for (or 30 days out), `next_action` = `Check back`.
   - `no` or `opt-out`: `status` = `lost`, `closed` = today. Never contact again.
   - `out-of-office`: no change except a note.
3. Keep the table valid: same columns, one row per lead, dates `YYYY-MM-DD`.

## Never
- Never send, archive, label or delete emails.

## Output
`outputs/sync-pipeline/YYYY-MM-DD.md` with what changed per lead. Reply with: emails found sent, new replies, and how many are positive.
