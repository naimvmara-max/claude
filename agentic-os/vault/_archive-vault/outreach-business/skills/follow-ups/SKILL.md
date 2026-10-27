---
name: follow-ups
description: Draft the follow-up emails that are due today (day 3, 7 and 14 after the first email) for leads that have not replied. Use for "follow up", "draft follow-ups", "chase", or 08:45 on weekdays on schedule.
---

# Follow-ups

## Read first
`wiki/outreach-playbook.md` (cadence and tone), `ops/pipeline.md`.

## Which leads are due
A lead is due when its `status` is `contacted`, `replied` is empty, and either `next_date` is
today or earlier, or there is no `next_date` and `contacted` was 3 or more days ago.
Count the days since `contacted` to pick the step:

| Days since first email | Step |
| --- | --- |
| 3–6 | Follow-up 1: short bump, one new angle |
| 7–13 | Follow-up 2: a useful idea, no ask beyond a reply |
| 14+ | Breakup: close the loop politely |

## Do
1. Write each follow-up as the playbook says, under 60 words, same language as the first email.
2. If a Gmail tool is available, create the draft **as a reply in the original thread**. Never send.
3. Update the row: `next_action` to the step you drafted ("Send follow-up 1"), `next_date` to today.
   After the breakup step, set `next_action` to `Mark lost if no reply` and `next_date` to 7 days from today.
4. Skip anyone who has replied, even if the pipeline was not updated yet. If you see a reply in Gmail, set `replied` to its date and `status` to `replied`.

## Never
- Never send. Never follow up with someone who asked not to be contacted; mark them `lost`.

## Output
`outputs/follow-ups/YYYY-MM-DD.md` listing each draft. Reply with the count per step.
