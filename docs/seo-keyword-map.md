# SEO keyword map

Built from the Google Keyword Planner export (plan dated 20 Sep 2026, SEK bids,
Swedish interface). Figures below were read off the screenshots — check them
against your CSV export before acting on the numbers.

## What the data actually says

**1. One keyword carries almost all the volume.**

| Keyword | Language | Monthly searches | Competition | Top-of-page bid |
| --- | --- | --- | --- | --- |
| retatrutide kaufen | German | **10k–100k** | Low | — |
| ghk cu kaufen | German | **1k–10k** | High | — |
| tesa kaufen | German | 100–1k | High | 6.07–59.41 kr |
| bpc 157 price | English | 100–1k | Medium | 7.64–19.36 kr |
| retatrutide preis | German | 100–1k | Low | — |
| retatrutide price | English | 100–1k | Low | — |
| buy ghkcu | English | 100–1k | High | 8.00–19.45 kr |
| ghkcu price | English | 100–1k | Medium | ~8.06 kr |

Everything else in the export — `bpc kaufen`, `tesa preis`, `comprar ghk cu`,
`köpa tesa`, `buy bpc`, `tesa price`, `bpc 157 preis`, `hexarelin preis`,
`ghkcu kaufen`, `ghk cu preis`, `precio tesa`, `comprar ghkcu`, `bpc 157 prix`,
`bpc 157 pris`, `köpa ghk cu`, `ghk cu pris`, `motsc preis`, `motsc kaufen` —
sits at **10–100 searches a month**. That is not a typo in the tool. It means a
page ranking #1 for one of those terms might see a handful of visits a month.

**2. The volume is German, not English.** `kaufen` (buy) and `preis` (price)
dominate, then Spanish (`comprar`, `precio`), Swedish (`köpa`, `pris`), French
(`prix`). English terms are among the smallest in the set.

**3. Nearly every row shows +900% year on year.** That is the tool's display
cap, not a real 10× multiplier. It means these terms barely existed a year ago —
retatrutide in particular is a trend term. Trend volume can evaporate as fast as
it appeared, and it attracts regulatory attention precisely because it spikes.

**4. Competition is "High" on most of the low-volume terms.** High competition on
10 searches a month means other sellers are bidding on scraps.

## What this implies

**The single highest-volume keyword you have is "retatrutide kaufen"** — German,
transactional, for a compound still in clinical trials and under Lilly patent.
That combination is the most commercially attractive and the most legally
exposed thing in the export, in the same row. Ranking well for it in Germany is
not a neutral SEO outcome.

**GHK-Cu and BPC-157 are the sane SEO targets.** They have real (if modest)
volume across five languages, no patent exposure, and they are the two products
a payment processor is least likely to choke on.

**A German site is worth more than more English pages.** If you want the volume
in this export, the work is translated product and documentation pages with
`hreflang`, not more English content. That is a real cost — proper German copy,
not machine translation, because a lab buyer spots bad German instantly. Start
with GHK-Cu and BPC-157 in German only, measure, then decide.

## Catalog codes and the full compound names

Listings, titles and product copy use the catalog code the vial label carries —
`GLP-RT`, `GLP-SEM`, `GLP-TZ`, `TESA`, and `BPC-157`, `GHK-Cu`, `MOTS-c` where
code and compound are already the same. The full chemical name lives in three
places only:

1. The **Compound** row of the specification table (visible on the page).
2. The **search title** — `GLP-RT 10 mg (Retatrutide) | 98.7% Purity | …`.
3. **Structured data** as `alternateName`, and the Merchant feed title.

That row in the spec table is not decoration. Google requires structured data
and meta to reflect what a visitor actually sees; a page whose title says
"Retatrutide" while nothing on the page does is cloaking, and the penalty for it
is the loss of exactly the rankings this file is about. One visible row keeps
the markup honest while the branding stays on the code.

The mapping lives in `data/phantom-catalog.csv` under `Meta: _rc_compound`, and
the field is editable per product under **Research data**.

**Label mismatch to resolve:** the printed vials read SEMAGLUTIDE and
TIRZAPETIDE in full, while the site will list GLP-SEM and GLP-TZ. A buyer
ordering "GLP-SEM" and receiving a vial marked "SEMAGLUTIDE" has a discrepancy
between their paperwork and their label — the same discrepancy the COA lookup
exists to prevent. Pick one naming system and make the labels, the listings and
the certificates agree.

## Page → keyword map

| Page | Primary | Secondary |
| --- | --- | --- |
| `/product/ghk-cu-50-mg/` (GHK-Cu) | ghk cu kaufen | buy ghkcu, ghkcu price, ghk cu preis, comprar ghk cu, köpa ghk cu, ghk cu pris |
| `/product/bpc-157-10-mg/` (BPC-157) | bpc 157 price | buy bpc, bpc kaufen, bpc 157 preis, bpc 157 prix, bpc 157 pris |
| `/product/glp-rt-10-mg/` (GLP-RT) | retatrutide price | retatrutide preis, retatrutide kaufen |
| `/product/tesa-10-mg/` (TESA) | tesa kaufen | tesa preis, tesa price, precio tesa, köpa tesa |
| `/product/mots-c-10-mg/` (MOTS-c) | motsc kaufen | motsc preis |
| Catalog | research peptides with certificate of analysis | peptide reference standards |
| `how-to-read-a-peptide-certificate-of-analysis` | how to read a peptide COA | certificate of analysis peptide |
| `net-peptide-content-vs-gross-weight` | net peptide content | peptide gross vs net weight |
| `spotting-a-fabricated-certificate-of-analysis` | fake certificate of analysis peptide | verify peptide COA |

Product titles are generated as `<name> | <purity> Purity | COA Included |
<brand>`, which covers the compound term and the qualifier buyers add. The
"price" variants are served by the price and the quantity ladder being visible
on the page, not by stuffing the word into the copy.

## What is implemented

- **Titles and meta descriptions** per page type, from the lot's own data.
- **Canonical URLs**, Open Graph and Twitter cards.
- **Structured data (JSON-LD)**: Organization, WebSite with SearchAction,
  BreadcrumbList, Article on documentation posts, FAQPage built from the FAQ
  page's own headings, and Product with offers, brand, SKU/MPN and every
  analytical field as `additionalProperty`. Verified on the running install.
- **Google Merchant Center feed** at `/?rc_feed=google` and
  `/feed/google-shopping/` — RSS 2.0 with the `g:` namespace, 17 fields per
  item including purity and CAS as custom labels.
- **Per-product feed exclusion** — a checkbox on the Research data tab.
- **`rc_hreflang_alternates` filter** for when translated pages exist.

The plugin steps back from titles, meta and Open Graph if Yoast, Rank Math, AIOSEO
or SEO Press is active, and keeps emitting the structured data, which those
plugins do not produce for analytical fields.

## Google Shopping: read this before submitting the feed

The feed is built and valid. Whether Google will accept it is a different question.

Merchant Center policy prohibits **unapproved pharmaceuticals and supplements**,
and the enforcement pattern is account-level suspension rather than item-level
rejection. Realistically:

- **Semaglutide, tirzepatide, retatrutide, tesamorelin** — expect suspension.
  These are approved drugs or active clinical candidates. Do not submit them.
- **GHK-Cu, BPC-157, MOTS-c** — uncertain. They are not approved drugs, which
  helps, but "unapproved substance" is a broad category and reviewers apply it
  broadly.

The per-product exclusion checkbox exists for exactly this. If you try Shopping
at all, submit **GHK-Cu and BPC-157 only**, and accept that a suspension can take
the account down permanently.

Do not miscategorise the products to get past review. Google's category field is
set to `Business & Industrial > Science & Laboratory > Laboratory Chemicals`,
which is what these are. Disguising them is both detectable and the fastest route
to a permanent ban.

The feed is still worth having even if Shopping is closed — it is the standard
format for comparison engines, marketplaces and most affiliate channels.

## Realistic expectation

Organic search in this category compounds over 6–18 months, and the addressable
volume in this export is smaller than it looks: outside `retatrutide kaufen` and
`ghk cu kaufen`, the entire keyword set totals a few hundred searches a month
across five languages. Technical SEO gets you eligible to rank. It does not
create demand that isn't there.

The bigger lever remains the documentation content, where you compete on
questions nobody else answers, rather than on `kaufen` terms where you compete
with every grey-market vendor in Europe.
