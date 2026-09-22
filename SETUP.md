# Setup

From empty WordPress to a working store in about 30 minutes.

## 1. Install WordPress and WooCommerce

Any standard host works (SiteGround, Cloudways, Hostinger, a $6 VPS). Requirements:
WordPress 6.2+, PHP 7.4+ (8.1+ preferred), MySQL 5.7+ or MariaDB 10.4+, HTTPS.

Install WooCommerce from **Plugins → Add New** and run its onboarding wizard. Set your
country, currency and units; skip the payment step for now.

## 2. Install the theme and plugin

**By upload (easiest)**

```bash
cd wp-content/themes && zip -r helix-research.zip helix-research
cd ../plugins && zip -r research-commerce.zip research-commerce
```

Then **Appearance → Themes → Add New → Upload** and **Plugins → Add New → Upload**.

**By file copy (SFTP / SSH)**

Copy `wp-content/themes/helix-research/` and `wp-content/plugins/research-commerce/`
into the matching folders of your install, keeping the folder names exactly as they are.

Activate the theme, then activate **Research Commerce for WooCommerce**.

## 3. Build the store pages

**Products → Research settings → Create storefront pages.**

This creates Home (front page), COA Lookup, Bulk & Institutional Orders, Shipping & Storage,
Research Use Policy, Terms of Sale, FAQ and Contact, assigns them to the primary and footer
menus, and leaves any page you already had untouched.

Check the result under **Appearance → Menus** — the primary, footer documentation, footer
legal and footer catalog locations should all be filled.

## 4. Configure the compliance and commerce settings

Still on **Products → Research settings**:

| Setting | Suggested value |
| --- | --- |
| Acknowledgement on first visit | On |
| Remember acknowledgement for | 30 days |
| Decline destination | Any neutral external site |
| Short / full / checkout notices | Leave blank to use the built-in wording, or paste your lawyer's |
| Quantity price breaks | `3:5, 5:10, 10:15` |
| Stack discount tiers | `2:6, 3:12` — the panel builder's set discount |
| Panel builder presets | One per line, `Label: SKU, SKU` |
| Free shipping threshold | Match the amount in your WooCommerce free-shipping rule (0 hides the meter) |
| Quote requests go to | Your sales inbox |

The two tier fields answer different questions. Quantity price breaks reward buying more of one
vial and discount that line. The stack tiers reward buying a set: once an order holds that many
**different** compounds, the discount comes off as a cart-level line. Both can apply to the same
order, which is deliberate. Put `[rc_panel_builder]` on a page to merchandise the stack tiers;
the rule itself works whether or not a buyer ever sees that page.

The threshold field only draws the progress meter. Create the actual rule in
**WooCommerce → Settings → Shipping → your zone → Free shipping → minimum order amount.**

## 5. Brand it

**Appearance → Customize → Store Content** holds every headline, trust point, stat and footer
detail. **Brand Colors** sets the accent, heading and dark-section colors. Upload your logo
under **Site Identity** (260×60 works well; it flexes).

Replace the hero image under **Homepage Hero** with a real photograph of your own vials,
labels or lab. Stock images of scientists are the fastest way to look like everyone else.

## 6. Load the catalog

**Products → All Products → Import**, choose `data/sample-products.csv`, and let WooCommerce
map the columns — the `Meta: _rc_*` columns map straight onto the research fields.

Then, product by product:

1. Open the **Research data** tab and replace every value with the real figures from your
   supplier's certificate. **The sample specs are placeholders. Do not sell against them.**
2. Upload the actual COA PDF to **Media** and paste its URL into *COA file URL*.
3. Photograph the real vial and label for the product image.

The product list shows a red **COA missing** flag on any listing with a lot but no certificate.

## 7. Record the certificates

**Products → Certificates → Add certificate**, one per lot: lot number exactly as printed on
the label, material name, purity result, method, testing facility, test date, file URL.

That is what the COA Lookup page searches. Keep old lots published — being able to verify a
lot from two years ago is a real differentiator when a lab audits you.

## 8. Payments, shipping, tax

- **Payments:** apply for a high-risk merchant account before launch (see README). Add the
  gateway plugin your processor provides, and keep bank transfer enabled as a fallback for
  institutional orders.
- **Shipping:** flat rate plus a free-shipping threshold converts better than calculated rates
  for a low-weight catalog. Set handling to match your 2:00 PM cutoff claim, or edit the claim.
- **Tax:** enable **WooCommerce → Settings → General → Enable taxes** and set rates for the
  jurisdictions you ship to.

## 9. Pre-launch

Work through `docs/launch-checklist.md`. The copy rules in `docs/copy-guidelines.md` are the
part that keeps the store alive — read them before you write a single product description.

## Updating

Both folders are plain files with no build step. Edit, re-upload, done. If you want to change
the theme's design without losing your edits on the next update, create a child theme with
`Template: helix-research` in its `style.css` header.
