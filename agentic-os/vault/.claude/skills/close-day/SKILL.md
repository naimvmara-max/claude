---
name: close-day
description: Close the working day - log contacts, meetings and deals, check the pipeline is up to date, set tomorrow's first task. Use for "close the day", "end of day", "wrap up", or at 21:30 on schedule.
---

# Close day

## Do
1. Count today from `ops/pipeline.md`: new contacts (email and phone), replies, meetings booked,
   demos held, offers sent, deals won and their commission (packages from `system/business.json`).
2. Compare with today's directives. Mark done ones `[x]`.
3. Look for gaps: companies called today without a `contacted` date, demos without a next step,
   offers without a `next_date`. List them; do not invent the missing data.
4. Append to today's note under `## Logg`: the numbers, one thing that worked, one to change.
5. Write tomorrow's first task under `## Uppgifter` in tomorrow's note (create it from
   `system/templates/daily.md` if needed).


## Language
Write everything for Naim (the output file and your final reply) in Swedish. Anything for a customer is Norwegian bokmål.

## Output
Today's note. Reply with today's numbers in one line and tomorrow's first task.
