---
name: vault-cleanup
description: Weekly tidy of the vault. Archive stale notes, file inbox drops, fix broken links and promote durable knowledge into the wiki. Use for "clean up my notes", "tidy the vault", or Sundays 18:00 on schedule.
---

# Vault cleanup

## Do
1. `inbox/`: file each item where `CLAUDE.md` says it belongs, or summarise it into `content/ideas.md` if it is an idea. Leave `inbox/README.md`.
2. Daily notes older than 30 days: move to `_archive-vault/daily-notes/` keeping the filename.
3. `outputs/runs/` older than 14 days: move to `_archive-vault/outputs/runs/`.
4. Anything learned twice in outputs (a tactic, a supplier fact, a hook that worked) goes into the right `wiki/` note as one bullet with a link back.
5. Fix `[[wikilinks]]` that point at moved files.

## Never
- Never delete. Always move to `_archive-vault/` with the same relative path.
- Never touch `system/`, `.claude/` or `.obsidian/`.

## Output
`outputs/vault-cleanup/YYYY-MM-DD.md` listing every move. Reply with the counts.
