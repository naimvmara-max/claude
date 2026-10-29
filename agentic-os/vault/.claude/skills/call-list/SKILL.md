---
name: call-list
description: Build today's call list - companies to cold call or call back, with the published phone number, the best time and a 20-second opener for each. Use for "call list", "who should I call", "ringlista", or 08:15 on weekdays on schedule.
---

# Call list

## Read first
`wiki/sales-playbook.md` (the opener), `wiki/objections.md`, `ops/pipeline.md`,
`system/business.json` (`daily_contacts`), and `ops/calls.md`: earlier attempts per company
from the Ring view, and which hours Naim reaches people best.

## Do
1. Pick, in this order, up to half of `daily_contacts`:
   - companies whose `next_action` starts with `Ring`, due today or earlier;
   - companies that replied by email but have no meeting yet;
   - companies whose email sequence (campaign) ended without a reply: call the decision maker by
     name, and open with the email ("Jeg sendte en e-post til post@ forrige uke …");
   - `researched` companies with a published phone number and no email address;
   - other `researched` companies with a phone number, best fit first.
2. For each: company, contact, phone (published only), why now, the observation, a
   20-second opener in Norwegian ("Hei, dette er Naim fra Driv …"), the one of Driv's six
   questions that fits best (`wiki/sales-playbook.md`), and the most likely objection with
   Driv's answer from `wiki/objections.md`.
3. Put them in calling order: callbacks first, then by fit. Skip anyone with `opt-out` in notes
   or an `optout` line in `ops/calls.md`. If `ops/calls.md` has 30 or more attempts, say which
   hours have reached people most often and suggest calling then.
4. Remind Naim that the Ring view in Jarvis takes the list one company at a time, one key per
   outcome, and moves the pipeline itself.

## Never
- Never call, text or email anyone. Never add a number that is not published.
- Do not change pipeline statuses: Naim moves a company to `contacted` (channel `phone`) or
  `booked` in the HUD after each call.


## Language
Write everything for Naim (the output file and your final reply) in Swedish. Anything for a customer is Norwegian bokmål.

## Output
`outputs/call-list/YYYY-MM-DD.md` as a printable list. Reply with how many calls and the first one.
