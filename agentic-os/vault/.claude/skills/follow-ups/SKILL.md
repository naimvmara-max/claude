---
name: follow-ups
description: Draft the follow-up emails due today (day 3, 7 and 14) and list the call-backs due, for companies that have not answered. Use for "follow up", "draft follow-ups", "chase", or 08:45 on weekdays on schedule.
---

# Follow-ups

## Read first
`wiki/sales-playbook.md` (cadence and tone), `ops/pipeline.md`.

## Which companies are due
Status `contacted` and `replied` empty, and either `next_date` is today or earlier, or there is
no `next_date` and `contacted` was 3 or more days ago (2 for phone).

Email, by days since `contacted`:

| Days | Step |
| --- | --- |
| 3 to 6 | Follow-up 1: short bump, one new angle |
| 7 to 13 | Follow-up 2: a useful idea about their customer service, no ask beyond a reply |
| 14+ | Close the loop politely |

Phone: list them as call-backs (up to 3 tries in total), do not draft emails for them unless
a published email exists and two calls got no answer.

Also due: companies at `demo` whose `next_date` has come (follow up after the demo, refer to
what they said in the demo notes in `inbox/` or `outputs/demo-prep/`).

## Do
1. Write each follow-up in the language of the first email, under 60 words.
2. With a Gmail tool, create the draft **as a reply in the original thread**. Never send.
3. Update the row: `next_action` = the step drafted (e.g. `Send follow-up 1`), `next_date` = today.
   After the last step: `next_action` = `Mark lost if no reply`, `next_date` = 7 days from today.
4. If Gmail shows they replied, set `replied` and `status` = `replied` instead.

## Never
- Never send. Never follow up with anyone who said no or asked not to be contacted: mark them `lost`.

## Output
`outputs/follow-ups/YYYY-MM-DD.md` with each draft and the call-backs. Reply with the count per step.
