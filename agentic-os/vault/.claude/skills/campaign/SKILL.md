---
name: campaign
description: Build this week's cold email campaign for the sending tool (Instantly, Smartlead or lemlist) - companies with a generic published address, one real first line in bokmål each, a four-step sequence - as a CSV and a copy file for Naim to check, upload and launch. Use for "build the campaign", "kampanj", "veckans utskick", "bygg kampanjen".
---

# Campaign

## Read first
`system/business.json` (`outreach`), `projects/product.md`, `wiki/sales-playbook.md`,
`wiki/objections.md`, `ops/pipeline.md`.

## Check before anything
- If `outreach.mode` is `drafts`, or `inboxes` is 0, or `warmup_started` is less than 14 days
  ago: say so in Swedish, list what is missing from `projects/email-outreach.md`, and stop.
  Suggest /outreach-drafts for today's personal emails instead.
- Weekly capacity = `inboxes` × `per_inbox_daily` × 5. Each company gets `steps.length` emails,
  so new companies this week = capacity ÷ number of steps, rounded down. Never go above it.

## Who may be emailed (Norwegian law, markedsføringsloven § 15)
Forbrukertilsynet's guidance: email to a named person's own work address (kari.nordmann@firma.no,
kari@firma.no, kn@firma.no) is marketing to a private person and needs prior consent, even when
the offer is for the business, and even if the address is registered in Brønnøysund. Generic
company addresses that do not belong to one person are not covered.
- Only use **generic, published company addresses**: post@, kontakt@, firmapost@, kundeservice@,
  kundesenter@, info@, hei@, salg@, booking@ and similar.
- Skip any address that contains a person's name or initials. If unsure, skip it.
- Skip enkeltpersonforetak (organisasjonsform ENK in brreg): their address is the owner's. Call them.
- Skip `lost` rows, anyone with `opt-out` in notes, anyone emailed in the last 90 days, and a
  second company on the same email domain.

## Do
1. Pick `researched` companies that pass the rules above, best fit first, up to this week's number.
2. For each, write in Norwegian bokmål:
   - `subject`: 2 to 4 words, lowercase, about them ("svar etter stengetid", "ordrestatus hos dere").
   - `first_line`: one true, checkable sentence from the briefing or notes (the hiring ad, only a
     contact form, the FAQ, the opening hours). No flattery, no made-up facts. Skip the company if
     there is no real observation.
3. Write the sequence once, with the tool's variables `{{first_line}}` and `{{company_name}}`:
   - Step 1 (day 0): "Hei," (the inbox is shared, so no first name), `{{first_line}}`, the problem in
     Driv's words, one sentence on Driv Kundesenter, and: "Er dette noe for dere? I så fall:
     send gjerne denne videre til den som har ansvar for kundeservice." Under 90 words.
   - Step 2 (day 3): a short bump with one new angle.
   - Step 3 (day 7): one useful idea about their customer service, no ask beyond a reply.
   - Step 4 (day 14): close the loop politely.
   Every step: plain text, no images, no links in step 1, signed with `sender_name`, "Driv Mobil"
   and `sender_phone`, and the last line "Ikke relevant? Svar «nei», så skriver jeg ikke igjen."
   Sell the benefit, not features. No prices, discounts or binding period.
4. Write the CSV `outputs/campaign/YYYY-MM-DD-<name>.csv` with these columns, UTF-8, comma-separated,
   quoted: `email,company_name,website,city,industry,subject,first_line,lead_id`.
5. Write `outputs/campaign/YYYY-MM-DD-<name>.md` in Swedish: the number of companies and emails,
   the four steps, the upload steps for the tool in `outreach.tool` (import the CSV and map the
   columns, paste the steps with their delays, Monday to Friday 08:00 to 16:00 Europe/Oslo,
   open tracking off, stop on reply on, all sending inboxes selected), and the five companies
   Naim should check by hand first.
6. Update each picked row in `ops/pipeline.md`: `status` = `drafted`, `channel` = `email`,
   `notes` = existing notes + " · kampanj <name>", `next_action` = `Ladda upp kampanjen och starta`,
   `next_date` = today.

## Never
- Never upload, start, schedule or send anything, and never connect to the sending tool to change
  a campaign. Naim checks the file, uploads it and presses start.
- Never guess or build an email address. Never email a named person's address.

## Language
Write everything for Naim (the output file and your final reply) in Swedish. Anything for a customer is Norwegian bokmål.

## Output
The CSV and the Markdown file above. Reply with the number of companies, the number of emails,
and the best first line.
