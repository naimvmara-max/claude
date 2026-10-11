---
name: money-check
description: Monthly money check. Collect receipts and income into a ledger, show burn and runway, and flag subscriptions to cut. Use for "receipts", "ledger", "expenses", "runway", "money check", or on the 1st of the month.
---

# Money check

## Sources
- Gmail receipts and invoices from last month, if a Gmail tool is available
- Client payments: leads marked `won` in `ops/pipeline.md` and their invoices in Gmail
- `inbox/money.md` for anything Naim pastes by hand (`2026-10-03 -12.99 Canva`)

## Do
1. Append each transaction to `system/ledger.csv` with columns `date,amount,currency,category,source,note` (create it with that header if missing). Negative = spending. Skip duplicates.
2. Categories: tools, domains-and-inboxes, data, ads, income-clients, personal, other.
3. Summary for last month: income, spending by category, net.
4. Runway: if `system/routine.md` or `projects/outreach-business.md` lists savings, months left at this month's net burn. Otherwise say it is unknown.
5. Subscriptions: list every recurring charge and mark the ones not used in the last 30 days.

## Never
- Never pay, cancel or change anything. Never store card numbers or full account numbers.

## Output
`outputs/money-check/YYYY-MM.md` plus the updated ledger. Reply with net for the month and the subscription to cut first.
