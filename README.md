# Peptide Research Store — WordPress + WooCommerce

A complete, conversion-oriented storefront for a research-materials brand, built as two
drop-in pieces you install on any standard WordPress host:

| Piece | Path | What it does |
| --- | --- | --- |
| **Helix Research** theme | `wp-content/themes/helix-research/` | The storefront: homepage, catalog, product pages, cart and checkout styling, trust and documentation modules. |
| **Research Commerce** plugin | `wp-content/plugins/research-commerce/` | The data and compliance layer: lot certificates, analytical specs on products, research-use gate and checkout attestation, quantity price breaks, institutional quote form. |

Everything commercial lives in the plugin, so you can restyle or replace the theme later
without losing certificates, compliance records or pricing rules.

## Copy policy (non-negotiable in this build)

Every string shipped here describes **material, analysis, handling and logistics**. Nothing
describes an effect, a dose, an administration route or an outcome in a person or animal.
The plugin also scans your own product copy on save and warns you when wording drifts into
consumption or benefit language. See `docs/copy-guidelines.md` for the approved vocabulary
and the banned list.

## What you get

**Storefront**
- Homepage: hero with live spec card, trust strip, featured catalog, four-step "how a lot reaches your bench", inline COA lookup, category grid, sourcing-standards comparison table, FAQ, quote CTA.
- Catalog cards showing assayed purity, CAS, formula, lot and a direct COA link.
- Product pages with a specification table, COA download button, quantity price-break table, storage/handling tab, terms-of-sale tab, shipping and guarantee reassurances, sticky mobile add-to-cart.
- Cart with a free-shipping progress meter and next-tier prompts; checkout with a required research-use attestation and trust row.

**Back office**
- "Research data" tab on every product: CAS, formula, molecular weight, sequence, purity, test method, lot, fill size, physical form, storage, solubility, COA URL.
- Certificates post type — lot, material, purity, method, facility, test date, file — searchable by customers through `[rc_coa_lookup]`, and still searchable after a lot sells out.
- Quote requests stored as records **and** emailed, so nothing is lost when email fails.
- Settings page for compliance wording, price-break tiers, free-shipping threshold and quote routing.
- One-click page builder that creates Home, COA Lookup, Bulk Orders, Shipping & Storage, Research Use Policy, Terms of Sale, FAQ and Contact, then wires the menus.

**Shortcodes**
- `[rc_coa_lookup]` — lot verification tool (works without JavaScript).
- `[rc_quote_form]` — institutional quote / contact form with honeypot and required attestation.

## Install

See `SETUP.md`. Short version: upload both folders, activate, run **Products → Research
settings → Create storefront pages**, then import `data/sample-products.csv` and replace the
sample data with your own lots.

## Before you take money — read this

This build is the easy half. The hard parts of this business are not code:

1. **Payments.** Most mainstream processors (Stripe, PayPal, Shopify Payments) prohibit research
   chemicals and will freeze funds when they notice, not when you sign up. You need a
   high-risk merchant account, which means a real entity, underwriting, a rolling reserve
   and 3.5–6% + reserve rather than 2.9%. Get underwriting approval **before** launch, not after.
2. **Advertising.** Meta, Google and TikTok all prohibit ads for these materials. Realistic
   acquisition channels are SEO on compound and analytical queries, email, lab and university
   outreach, and content. Plan for slow compounding traffic, not a paid-ads launch.
3. **Legal review.** `Terms of Sale` and `Research Use Policy` are competent starting templates,
   not legal advice. Have a lawyer in your jurisdiction review them, plus your import/export
   position, before you open.
4. **Patented compounds.** Some popular peptides (GLP-1 analogs in particular) are under active
   patent and enforcement. Selling them invites both patent claims and regulator attention
   regardless of how the copy is worded. The sample catalog deliberately avoids them.
5. **Supplier documentation.** The whole conversion argument in this build is "we publish the COA
   for the lot you get." That only works if you actually hold lot-level certificates from your
   synthesiser and can re-test. If you can't, the trust modules are a liability, not an asset.

The site is designed so honest, documentation-led selling is the conversion strategy —
because for this category it is also the only defensible one.

## Repo layout

```
wp-content/
  themes/helix-research/      Theme (PHP templates, CSS, JS)
  plugins/research-commerce/  Plugin (PHP classes, CSS, JS)
data/sample-products.csv      WooCommerce importer file with research-only copy
docs/setup + guidelines       Install, copy rules, launch checklist
```

## Requirements

WordPress 6.2+, WooCommerce 7.0+, PHP 7.4+ (tested syntax on PHP 8.4). No build step, no
dependencies, no external services beyond Google Fonts.
