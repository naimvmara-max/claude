---
name: commission-check
description: Monthly check of commission earned, paid and outstanding against the employment contract (paid the month after activation, 6-month clawback), with a tax reminder. Use for "commission check", "provision", "have I been paid", "how much have I earned", or on the 1st of the month.
---

# Commission check

## Read first
`ops/pipeline.md`, `system/business.json` (packages, `commission_currency`, `payday`,
`clawback_months`, `advance`), `projects/sales-job.md` (the contract terms), payslips or payout
emails in Gmail if available.

## Do
1. Deals won last month and this year, per package, with the commission each should give.
2. Paid vs not paid. Commission is earned when the service is **activated** and paid with the
   salary on the 25th of the month after (contract 6.1): activated in November, paid 25
   December. List won deals with no `activated` date as "väntar på aktivering"; flag any
   signed more than 30 days ago as something to ask Driv about. An activated deal past its
   payday and still unpaid is overdue: list it with the amount.
3. Clawback (6.2): deals activated within the last `clawback_months` can still be taken back
   from later commission if the customer contract ends. List them with the end date.
4. If Gmail shows a payout or payslip, match it to deals and fill in `paid` dates. Never guess.
5. Totals in SEK before tax (`commission_currency`). The first-deal advance (`advance`) is
   verbal until `in_writing` is true: remind Naim to get it in writing.
6. If `confirmed` is false, say first that the commission amounts are not confirmed in writing yet.
7. Reminder: commission is paid before tax. He is employed in Sweden, so Flowtel deducts tax
   from it like salary; the exact share is on the payslip (skattetabell).


## Language
Write everything for Naim (the output file and your final reply) in Swedish. Anything for a customer is Norwegian bokmål.

## Output
`outputs/commission-check/YYYY-MM.md`. Reply with earned, paid and outstanding in SEK.
