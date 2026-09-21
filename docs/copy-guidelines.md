# Copy guidelines — research-only language

One rule governs every word on this site:

> Describe the **material**, its **analysis**, its **handling** and its **logistics**.
> Never describe an effect, a dose, a route of administration, or an outcome in a person
> or an animal.

This is not only a legal position. It is the conversion strategy: a lab buyer wants purity,
identity, lot traceability and dispatch speed. Those are the things you are allowed to say,
and they are the things that actually close the sale.

## The four safe categories

**1. Composition** — sequence, molecular formula, molecular weight, CAS number, salt form,
counter-ion, physical form, fill weight, container.

**2. Analysis** — purity figure and method (RP-HPLC, UV detection), identity confirmation
(ESI-MS against theoretical mass), appearance, water content, testing facility, test date,
lot number, certificate availability.

**3. Laboratory handling** — storage temperature, desiccation, light protection,
equilibration before opening, reconstitution *in the laboratory* with named solvents,
aliquoting, freeze–thaw avoidance, PPE, institutional waste disposal.

**4. Commerce** — price, quantity breaks, stock status, dispatch cutoff, packaging,
tracking, international shipping constraints, returns, institutional purchasing, support
response time.

## Banned, no exceptions

| Never write | Why |
| --- | --- |
| dose, dosage, dosing, mg/kg, "per day", cycle | Implies administration |
| inject, injection, subcutaneous, intramuscular, oral | Route of administration |
| consume, ingest, take, use on yourself, "for you", "your body" | Human use |
| treat, therapy, therapeutic, cure, heal, prevent, manage | Drug claim |
| weight loss, fat loss, muscle growth, recovery, anti-aging, performance | Outcome claim |
| supplement, nutraceutical, prescription, pharmaceutical grade | Product-category claim |
| side effects, safety profile, "safe for humans", contraindication | Implies human use |
| before/after images, testimonials about effects | Outcome claim by proxy |
| "research shows it helps…" | An effect claim with a citation attached is still an effect claim |

The plugin scans product titles, descriptions and excerpts on save and warns you when any
of these appear. The warning never blocks saving — it is a prompt to rewrite, and the list
is filterable via `rc_flagged_terms`.

## Rewrites

| Weak or unsafe | Compliant and stronger |
| --- | --- |
| "Highest quality peptides for your goals" | "Reference materials assayed at ≥99% by RP-HPLC, with the lot certificate published before purchase" |
| "Supports recovery and repair" | *(delete — no replacement; say nothing about effects)* |
| "Third-party tested" | "Assayed by an independent ISO/IEC 17025 laboratory; facility, method and test date on every certificate" |
| "99% pure" | "99.1% by RP-HPLC (lot HX-24-0918, tested 2024-09-18)" |
| "Fast shipping" | "Dispatched the same business day on orders placed before 2:00 PM CT, tracked" |
| "Store in a cool dry place" | "Store sealed at -20 °C, desiccated; equilibrate to room temperature before opening" |
| "Trusted by thousands" | "Purchase orders and net-30 terms for universities, hospitals and CROs" |

## Reviews and social proof

Ask for reviews about what you are allowed to publish: packaging condition, documentation
quality, label accuracy, dispatch speed, support responsiveness, whether the material matched
the certificate. Moderate out anything describing effects or personal use — an unmoderated
review section is how compliant stores end up with non-compliant claims on their own domain.

Suggested review prompt in your dispatch email:

> "How did the packaging, paperwork and delivery hold up? Did the material match the
> certificate? Please keep feedback to the product and the service — we can't publish
> comments about use."

## Support replies

Answer: composition, analysis, solubility in laboratory solvents, storage, lot history,
shipping, invoicing.

Decline, in one line, every time: "We supply these materials for laboratory research only
and can't advise on administration or any non-laboratory use." Then stop. Do not soften it,
do not hint, do not continue the conversation in DMs. One helpful-sounding reply from a
support inbox can undo every compliant word on the site.

## SEO without claims

Rank for what researchers search: compound name + "HPLC purity", + "CAS", + "molecular
weight", + "reference standard", + "certificate of analysis", + "storage conditions",
+ "solubility". Write genuinely useful analytical content — method notes, storage stability,
how to read a COA, how to spot a fabricated one. That content is safe, it is what your buyers
actually search, and paid ads are closed to you anyway.
