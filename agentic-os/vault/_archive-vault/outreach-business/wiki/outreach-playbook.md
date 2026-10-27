# Outreach playbook

How cold email is done here. /outreach-drafts and /follow-ups follow this note.
Update it when something works twice.

## Deliverability first
- Send from a separate domain (e.g. `getyourbrand.se`), never your main one.
- Set SPF, DKIM and DMARC on it. Google, Yahoo and Microsoft reject or spam-folder bulk mail without them.
- Warm new inboxes up for 2–3 weeks before real volume. Start around 10 a day and climb slowly.
- Keep each inbox to roughly 30–50 sends a day. More volume means more inboxes, not more per inbox.
- Plain text, no images, at most one link, no attachments in the first email.
- Watch bounces. Over a few percent means the list is bad: stop and clean it.

## The first email
- Subject: 2–4 words, lowercase, looks like a colleague wrote it. No clickbait.
- Line 1: one specific observation about their business that proves you looked.
- Line 2–3: the problem that observation points to, and what you do about it.
- One soft question as the call to action ("worth a quick chat?"), not a calendar link.
- Under 90 words. Sign with your name. One line at the bottom on how to opt out.

## Follow-ups
| Day | What |
| --- | --- |
| 3 | Short bump in the same thread with one new angle or proof point |
| 7 | A useful idea for them, no ask beyond a reply |
| 14 | Breakup: "closing the loop", leave the door open |

Stop the sequence the moment anyone replies, positive or not.

## Replies
- Positive: answer within the hour during work time, offer two times for a call.
- Not now: ask when to check back, set `next_date` in the pipeline.
- Not interested or opt-out: thank them, mark `lost`, never email again.

## Rules (Sweden / EU, not legal advice)
- Email to a company's role address is generally treated differently from email to a
  private person. Sole traders (enskild firma) count as private persons in Sweden, so be careful there.
- Always identify yourself, say why you are writing, and include an easy opt-out.
- Only store business contact details you need, and delete people who ask.
