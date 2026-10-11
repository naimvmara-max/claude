---
name: plan-today
description: Build today's plan in the daily note from the calendar, this week's directives, open tasks and the routine. Use when Naim says "plan my day", "plan today" or at 07:00 on schedule.
---

# Plan today

## Read first
1. `ops/directives.md` (this week's top 3)
2. Today's note `daily-notes/YYYY-MM-DD.md` (the Bridge creates it from the template; create it from `system/templates/daily.md` if it is missing)
3. Yesterday's note, section `## Log` and any unticked tasks
4. `ops/tasks.md` (open loops) and `ops/pipeline.md` (follow-ups due today, calls today)
5. `system/routine.md`
6. Google Calendar for today, if a calendar tool is available. If not, skip it and say so in the summary.

## Do
1. Pick today's three directives. Each must move one of this week's directives forward and be finishable today. Write them as concrete outcomes ("Send 10 outreach messages"), not areas ("Outreach").
2. Rebuild `## Schedule` as `- HH:MM Block` lines, sorted. Calendar events are fixed; routine blocks move around them. Every weekday keeps an outreach block (send the drafted emails and follow-ups) and a reply block.
3. If `system/routine.md` names a city for prayer times, look up today's times for that city and insert them as blocks.
4. Carry over unfinished tasks from yesterday into `## Tasks`. Add one task per call today and one line "Send N drafted emails, M follow-ups" with today's real counts from the pipeline. Add at most 5 tasks in total beyond those.
5. Under `## Log`, add one line: `- HH:MM planned by /plan-today`.

## Never
- Never delete what Naim wrote in today's note. Edit around it.
- Never create calendar events. Suggest them in the summary instead.

## Output
Edit today's daily note in place. Reply with three lines: the directives, the first block, and anything that clashes.
