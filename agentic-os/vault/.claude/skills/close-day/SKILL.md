---
name: close-day
description: End-of-day shutdown. Log what got done, carry over what did not, and set up tomorrow. Use for "close the day", "end of day", "wrap up", or at 21:30 on schedule.
---

# Close the day

## Do
1. Read today's daily note and `outputs/runs/` for today.
2. Under `## Log`, add: what shipped (ticked tasks, posts, messages sent), what slipped, and one sentence on why.
3. Score the three directives: done, partial or missed. Be honest; a missed directive is information.
4. Create tomorrow's note from `system/templates/daily.md` if it does not exist, and copy unfinished tasks into its `## Tasks`.
5. If today had a post, check `content/posting-log.md` has a line for it.

## Output
Edit today's and tomorrow's notes. Reply with one line: "Shipped X, slipped Y, tomorrow starts with Z."
