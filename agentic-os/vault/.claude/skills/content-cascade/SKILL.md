---
name: content-cascade
description: Turn one published short video into a week of posts across TikTok and Instagram. Use for "repurpose", "turn this video into posts", or automatically when the video-live event fires.
---

# Content cascade

## Input
A video: its transcript, a link, or a description of what happens in it. If only a link is given and the transcript cannot be read, ask for the transcript in the summary and stop.

## Do
From the one video, write:
1. **TikTok caption**: hook line, one line of context, 3-5 niche hashtags (no #fyp spam).
2. **Instagram Reel caption**: same idea, adapted; a question at the end to drive comments.
3. **Carousel** (7 slides): slide 1 is the hook, slides 2-6 one point each, slide 7 a call to follow or save. Give each slide's text and a visual direction.
4. **3 alternative hooks** to re-cut the same footage as new videos.
5. **Story sequence** (3 frames) with a poll or question sticker.
6. **Comment bait**: one pinned comment that starts a conversation.
7. Optional: one image prompt per carousel slide for Higgsfield, in the style rules from `wiki/brand-bible.md`. Mark them as AI visuals.

## Rules
- Voice and visual rules from `wiki/brand-bible.md`. Formats from `wiki/content-playbook.md`.
- Do not post or schedule anything. Drafts only.

## Output
`content/cascades/YYYY-MM-DD-<slug>.md` and a line in `content/posting-log.md` with status `drafted`. Reply with the strongest hook.
