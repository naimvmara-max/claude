---
name: pull-metrics
description: Refresh the numbers in system/vitals.json from connected sources, so the HUD shows real data. Use for "pull metrics", "update my numbers", "refresh stats", or 09:00 on schedule.
---

# Pull metrics

## Sources, in order of preference
| Metric key | Source |
| --- | --- |
| `revenue` | Shopify tool: total sales, last 30 days |
| `tiktok`, `instagram` | A social analytics connector (Metricool, vidIQ, Supermetrics) if one is available |
| `latest` | Same connector: views on the most recent video |
| any | `inbox/metrics.md`, where Naim can paste numbers by hand as `tiktok: 1300` lines |

## Do
1. For each metric, get today's value from the first source that works.
2. Update `value`, append `{ "t": "YYYY-MM-DD", "v": value }` to `history` (keep the last 60), set `updated` to now and `example` to false.
3. Update `latest_post` if the source gives the newest post's title and counts.
4. If a source is missing, leave that metric untouched. Never estimate.
5. After reading `inbox/metrics.md`, clear its number lines (keep the heading).

## Output
Edit `system/vitals.json` (valid JSON, two-space indent). Reply with each metric's change since the previous history entry, and which metrics had no source.
