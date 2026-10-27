---
name: commission-check
description: Monthly check of commission earned, paid and outstanding, against the contract terms, with a rough SEK conversion and a tax reminder. Use for "commission check", "provision", "have I been paid", "how much have I earned", or on the 1st of the month.
---

# Commission check

## Read first
`ops/pipeline.md`, `system/business.json` (packages, `sek_per_nok`, `confirmed`),
`projects/sales-job.md` (terms), payslips or payout emails in Gmail if available.

## Do
1. Deals won last month and this year, per package, with the commission each should give.
2. Paid vs not paid: rows with a `paid` date vs without. Driv pays commission with the salary
   the month after signing: a deal signed in September is due with the October salary. Any
   unpaid deal past that is overdue: list it with the amount.
3. If Gmail shows a payout or payslip, match it to deals and fill in `paid` dates. Never guess.
4. Total in NOK and a rough SEK figure (`sek_per_nok`), clearly marked as rough.
5. If `confirmed` is false, say first that the commission amounts are not confirmed in writing yet.
6. Reminder: commission is paid before tax. How it is taxed depends on whether he is employed
   or freelance and in which country (see `projects/sales-job.md`); ask Skatteverket or an
   accountant for the exact share.


## Language
Write everything for Naim (the output file and your final reply) in Swedish. Anything for a customer is Norwegian bokmål.

## Output
`outputs/commission-check/YYYY-MM.md`. Reply with earned, paid and outstanding in NOK.
