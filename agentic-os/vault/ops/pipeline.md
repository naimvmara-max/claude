# Pipeline

Every company is one row. The dashboard counts everything from this table: contacts,
replies, meetings booked, demos, deals won and commission. Edit it here, in the HUD
(Command → Pipeline), or let the skills update it.

- **status**: researched → drafted → contacted → replied → booked → demo → won (or lost)
  - `booked` = a demo meeting is booked, `demo` = the demo was held
- **channel**: how the first contact happened: `email`, `phone`, `linkedin` or `other`.
  Empty counts as email. Reply rate only counts email.
- **package**: `S`, `M` or `L` (Small, Medium, Large). On a won row it decides the commission,
  using the amounts in `system/business.json`. Leave empty until you know.
- **dates** are `YYYY-MM-DD`: `contacted` is the first email or call, `booked` the day the
  meeting was booked, `demo` the day it was held, `closed` the day it was won or lost,
  `paid` the day your commission for it was paid out.
- **next_date / next_action**: when and what the next step is. Companies show up under
  "Follow-ups due" on that date. For a booked meeting, put the meeting date in `next_date`.

| id | company | contact | email | phone | website | industry | city | channel | package | status | added | contacted | replied | booked | demo | closed | paid | next_date | next_action | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
