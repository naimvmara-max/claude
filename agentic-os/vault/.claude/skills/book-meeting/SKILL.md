---
name: book-meeting
description: Put a booked demo meeting in Naim's calendar and draft the confirmation email in bokmål. Runs automatically when a company moves to "Möte bokat"; also for "boka in mötet", "lägg mötet i kalendern", "book the meeting".
---

# Book the meeting

## Input
The company, its pipeline id, the meeting date and time, e.g.
`Fjordkyst Nettbutikk AS (L012), bokat i telefon, möte 2026-11-05 kl. 10:00`.
Without a time (no `kl.`), do not guess one: say what is missing and stop.

## Read first
The company's row in `ops/pipeline.md`, its newest note in `samtal/`, and today's calendar.

## Do
1. With the calendar tool (Google Calendar or Outlook, whichever is connected), check that
   Naim is free at that time. If he is not, do not create anything: report the clash.
2. Create the event in **Naim's own calendar**: title `Demo Driv Kundesenter · <company>`,
   30 minutes, description with the company's phone and website and three lines on what
   they need (from the call note). If the tool can add a Teams or Meet link, add one.
3. **No guests.** Adding the customer as a guest sends an invitation, and nothing is sent
   without Naim. Instead, draft a short confirmation email in bokmål with the date, the time
   and the meeting link if there is one: to the address the customer gave in the call or
   replied from, otherwise to the company's generic address. Gmail draft only.
4. In `next_action` keep `Demomöte HH:MM`, and put the meeting date in `next_date` if it is empty.

## Never
- Never send the email or an invitation. Never invent a time, a link or an address.
- If no calendar tool is connected, say so: Jarvis has already downloaded a calendar file
  (.ics) when the meeting was saved with a time, and opening it adds the meeting.

## Language
Write everything for Naim in Swedish. The confirmation email is Norwegian bokmål.

## Output
`outputs/book-meeting/YYYY-MM-DD-<company>.md`. Reply with the date, time and whether the event and the draft were created.
