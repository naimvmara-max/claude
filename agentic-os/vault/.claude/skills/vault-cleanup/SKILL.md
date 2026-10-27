---
name: vault-cleanup
description: Tidy the vault - file inbox notes, archive old outputs and daily notes, keep the pipeline table valid. Use for "clean up my notes", "tidy the vault", or on Sundays at 18:00 on schedule.
---

# Vault cleanup

## Do
1. File everything in `inbox/` (except `leads.md` and `README.md`): demo notes next to the
   company's demo prep, objections into `wiki/objections.md` via a note for /objections,
   anything else into the right folder.
2. Move daily notes older than 60 days and outputs older than 90 days to `_archive-vault/`
   with the same relative path.
3. Check `ops/pipeline.md`: same columns, one row per company, valid statuses and dates,
   no duplicate companies. Fix format only; list anything that needs Naim's decision.

## Never
- Never delete a file. Move it.

## Output
`outputs/vault-cleanup/YYYY-MM-DD.md` listing what moved. Reply with the count and anything that needs a decision.
