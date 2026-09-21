---
title: "How to Read a Peptide Certificate of Analysis"
slug: how-to-read-a-peptide-certificate-of-analysis
category: Documentation
tags: [certificate-of-analysis, hplc, mass-spectrometry, quality]
excerpt: "A certificate of analysis is a test record, not a marketing document. Here is what each field means, which ones matter, and what a complete certificate must contain."
meta_description: "Line-by-line guide to reading a peptide certificate of analysis: lot number, HPLC purity, MS identity, water content, net peptide content and test date."
target_query: "how to read a peptide certificate of analysis"
---

A certificate of analysis (COA) is a record of what a laboratory measured on a specific batch of material on a specific date. It is not a quality badge, and it is not a guarantee about any material other than the lot it names. Most purchasing mistakes in this category come from reading a COA as a general statement about a supplier rather than as a dated measurement of one lot.

This guide walks through the fields on a peptide COA, what each one is actually telling you, and which omissions should stop a purchase.

## The header: who tested what, and when

Four fields in the header carry most of the document's weight.

**Product name and identifier.** The name on the certificate should match the name on the vial label and on the purchase order. A certificate that identifies the material only by an internal code you cannot cross-reference is not verifiable.

**Lot or batch number.** This is the single most important field. It ties the measurements below to a defined quantity of material. If the lot number on the certificate does not match the lot number printed on the vial you received, the certificate describes different material and tells you nothing about what is in your hand.

**Test date.** Analytical results describe the material as it was on the day of testing. A certificate dated three years ago, for a lyophilizate that has been through unknown storage conditions since, is a weaker document than the same certificate dated last month. The gap between test date and ship date is a legitimate question to ask a supplier.

**Testing facility.** A named laboratory, ideally with an accreditation reference such as ISO/IEC 17025, means the result can in principle be traced and challenged. "Third-party tested" with no facility named is an unverifiable claim. So is a certificate on unbranded letterhead with no analyst signature.

## Purity by HPLC

Peptide purity is almost always established by reverse-phase high-performance liquid chromatography (RP-HPLC). The certificate should report a numeric result and enough method detail for the number to mean something:

- **Column** — typically a C18 stationary phase, with dimensions and particle size.
- **Mobile phase and gradient** — usually water and acetonitrile, each with a small percentage of an acid modifier, run over a stated gradient and time.
- **Detection wavelength** — 214 nm detects the peptide bond itself and is the standard for purity work; 280 nm only sees aromatic residues (tryptophan, tyrosine, phenylalanine) and will miss impurities that lack them.
- **Result** — reported as area percent of the main peak.

That last point deserves emphasis, because it is the most widely misread number in the category. **HPLC purity is area percent, not mass percent.** It says that the main peak accounts for, say, 99.1% of the total UV absorbance detected in the run. It does not say the vial contains 99.1% peptide by weight. Water, residual solvent and counter-ions are not UV-active at 214 nm in the way the peptide is, and a chromatogram cannot see what it cannot detect.

A purity figure with no method attached is a number without units. Ask for the chromatogram.

## Identity by mass spectrometry

HPLC tells you the material is one predominant thing. It does not tell you that thing is the peptide you ordered. Mass spectrometry does.

The certificate should show a **theoretical mass** calculated from the sequence and an **observed mass** from the instrument, usually by electrospray ionization (ESI-MS). For peptides, you will often see multiply charged ions — [M+2H]²⁺, [M+3H]³⁺ — because the molecule picks up more than one proton. The observed values should deconvolute to the theoretical mass within the instrument's stated tolerance.

Two practical checks:

1. **Does the theoretical mass match the sequence on the certificate?** You can verify this yourself with any peptide mass calculator. A mismatch between the stated sequence and the stated theoretical mass is a document that was assembled carelessly, at best.
2. **Average or monoisotopic?** These differ by a few daltons on a peptide of moderate size. A certificate that reports one and compares it against the other will look like a discrepancy when it is really a units error — but it is still an error worth asking about.

## Water content and net peptide content

These two fields separate a thorough certificate from a minimal one, and they are the reason a "5 mg" vial does not always contain 5 mg of peptide.

**Water content**, usually by Karl Fischer titration, reports how much of the vial's mass is water. Lyophilized peptides are hygroscopic; a few percent residual moisture is normal.

**Net peptide content** reports the fraction of the gross weight that is actually peptide, after water and counter-ions are accounted for. Synthetic peptides purified by RP-HPLC with a trifluoroacetic acid modifier typically carry TFA as a counter-ion, bound to basic residues. Depending on how many basic residues the sequence has, the TFA and water together can account for a meaningful share of the gross weight.

The consequence: a vial can honestly report 99% HPLC purity and still contain noticeably less peptide by mass than the label weight suggests. If your work requires an accurate concentration, you need net peptide content, not just purity. Most suppliers will not volunteer it. Ask.

## Appearance and other checks

Minor fields, but they catch real problems. Appearance ("white lyophilized powder") flags gross contamination and, for coloured complexes, confirms the expected form. Solubility notes tell you which laboratory solvents were used successfully. Some certificates add residual solvent analysis or endotoxin testing, which matter for specific in-vitro applications.

## What should stop a purchase

Consider these disqualifying rather than negotiable:

- No lot number, or a lot number that does not match the vial.
- No test date, or a date so old the material's storage history is unknown.
- No named testing facility.
- A purity figure with no method, no chromatogram and no wavelength.
- A stated sequence that does not match the stated theoretical mass.
- A certificate that cannot be produced *before* purchase. If the document only appears after payment, it cannot influence your decision — which is usually the point.

## A short checklist

Before you order, confirm you can see: the lot number, the test date, the testing facility, the HPLC method and result, the MS theoretical and observed masses, and the appearance. Before you use the material, confirm the lot number on the vial matches the certificate you were shown.

Everything sold on this site is a reference material supplied for laboratory research use only. It is not a drug, supplement or food, and it is not supplied for human or veterinary use. This article describes analytical documentation and nothing else.
