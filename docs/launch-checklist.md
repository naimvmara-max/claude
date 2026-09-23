# Launch checklist

## Legal and payments (do these first — they gate everything else)

- [ ] Business entity registered; business bank account open
- [ ] High-risk merchant account approved in writing, with the reserve terms in hand
- [ ] Backup payment route live (bank transfer / PO for institutions)
- [ ] `Terms of Sale` and `Research Use Policy` reviewed by a lawyer in your jurisdiction
- [ ] Privacy policy published and linked (WordPress generates a starting draft)
- [ ] Import/export position checked for every destination you intend to ship to
- [ ] Every catalog item checked against patent and scheduling status in your market

## Product data

- [ ] Every listing has a real lot number and a real certificate PDF

  The catalog currently sells listings that have no report published against
  them: **Only sell listings that have a certificate attached** is off under
  Products → Research settings. Those listings say so on the page and offer
  the report on request, and the storefront copy no longer claims every lot
  has one published. Turn the setting back on once every listing carries a
  report, and the promise becomes enforceable again.
- [ ] Certificate records created under **Products → Certificates**, lot numbers matching labels exactly
- [ ] No listing shows a red **COA missing** flag in the product list
- [ ] Sample specification values from the CSV all replaced with your own
- [ ] Product photos are your vials and labels, not stock imagery
- [ ] Stock counts real; out-of-stock items show "Awaiting next lot"

## Copy

- [ ] Every product description passes the copy scanner with no warnings
- [ ] Homepage, FAQ, shipping and policy pages read as research-only
- [ ] Support macros written for declining use questions (see `copy-guidelines.md`)
- [ ] Review moderation set to manual: **Settings → Discussion → comment must be manually approved**

## Store configuration

- [ ] Compliance wording checked on: gate, product badge, cart, checkbox, emails, footer
- [ ] Checkout blocks an order when the attestation box is unticked (test it)
- [ ] Quantity tiers applied correctly in the cart (add 3, 5 and 10 of one item and check)
- [ ] Free shipping rule and the progress meter threshold match
- [ ] Tax rates configured for your shipping destinations
- [ ] Order, dispatch and refund emails reviewed end to end
- [ ] COA lookup returns a record for a real lot and a clean miss message for a fake one
- [ ] Quote form delivers to your inbox **and** saves a record under **Quote requests**

## Technical

- [ ] HTTPS on every page, no mixed-content warnings
- [ ] Mobile pass: menu, sticky add-to-cart, cart, checkout on a real phone
- [ ] Lighthouse on homepage and a product page (aim ≥ 90 performance, 100 accessibility)
- [ ] Caching plugin installed, with cart/checkout/account pages excluded
- [ ] Daily offsite backups running and a restore tested once
- [ ] Transactional email deliverability: SPF, DKIM and DMARC set, or an SMTP service configured
- [ ] Google Search Console and a privacy-respecting analytics tool connected
- [ ] 404 page, search, and broken-link check done

## First 30 days

- [ ] One analytical article per week (method notes, storage stability, reading a COA)
- [ ] Product pages indexed; compound + "certificate of analysis" queries tracked
- [ ] Dispatch email asks for a product-and-service review (never use)
- [ ] Abandoned-cart email written in research language
- [ ] Outreach list of university and CRO purchasing contacts started
- [ ] Reorder window measured (days between first and second order) — that number, not traffic, is the health metric for this business
