---
title: "What an HPLC Purity Number Actually Tells You"
slug: hplc-purity-what-it-means
category: Analytical Methods
tags: [hplc, purity, analytical-methods]
excerpt: "99% purity by HPLC is an area percent of UV absorbance under one set of conditions — not a statement about the mass in your vial. What the number covers, and what it misses."
meta_description: "RP-HPLC peptide purity explained: area percent vs mass percent, detection at 214 nm vs 280 nm, gradient effects, and the impurities HPLC cannot see."
target_query: "hplc purity peptide meaning"
---

Reverse-phase HPLC is the standard purity method for synthetic peptides, and the number it produces is the number most buyers make decisions on. It is a useful number. It is also narrower than most people assume, and understanding its boundaries changes how you compare suppliers.

## What the measurement is

In RP-HPLC, the sample is injected onto a hydrophobic stationary phase — usually a C18 column — and eluted with a gradient that increases the proportion of organic solvent, typically acetonitrile in water with an acid modifier. Components elute in order of hydrophobicity. A UV detector at the column outlet records absorbance over time, producing the chromatogram.

Purity is then calculated as **area percent**: the area under the main peak divided by the total area under all integrated peaks, expressed as a percentage.

That definition contains three constraints worth stating explicitly.

## Constraint 1: it is area, not mass

Area percent assumes that everything present absorbs UV at the detection wavelength in roughly comparable proportion to its mass. For peptide-related impurities — deletion sequences, truncations, oxidation products — that assumption is reasonable, because they contain the same peptide bonds as the target.

It breaks for anything that does not absorb at the detection wavelength. Water does not. Inorganic salts do not. Trifluoroacetic acid counter-ions contribute negligibly. So a vial can be 99% pure by HPLC area percent while a meaningful fraction of its gross mass is water and counter-ion.

**Practical consequence:** purity and content are different questions. If you need to know how much peptide you are weighing out, you need net peptide content — determined by amino acid analysis, elemental analysis or a nitrogen determination — not an HPLC figure. See the article on net peptide content for the arithmetic.

## Constraint 2: it only sees what the detector detects

Detection wavelength matters more than almost any other method parameter.

- **214 nm** targets the amide bond of the peptide backbone. Every peptide and every peptide-related impurity absorbs here. This is the standard for purity determination.
- **280 nm** targets aromatic side chains — tryptophan, tyrosine, and weakly phenylalanine. A peptide with no aromatic residues barely absorbs at all, and impurities lacking aromatics are invisible.

A purity figure measured at 280 nm on a sequence with one tyrosine is a much weaker claim than the same figure at 214 nm, because the denominator is missing whatever the detector could not see. When a certificate does not state the wavelength, the figure is not comparable to one that does.

## Constraint 3: it only resolves what the gradient separates

Two components that co-elute appear as one peak. A shallow gradient over a long run separates closely related species — a deletion sequence missing one residue, a diastereomer, an oxidized methionine — that a steep, fast gradient merges into the main peak.

This creates a perverse incentive: a shorter, steeper method produces a *higher* purity number on the same material, because impurities hide under the main peak. Two suppliers reporting 99.0% and 98.2% may be reporting the same material, with the higher figure coming from the less demanding method.

This is why method detail is not a formality. Without the column, gradient and run time, two purity numbers are not comparable.

## What HPLC purity does not cover at all

Even a well-run 214 nm method with a thorough gradient is silent on:

- **Identity.** Purity says one component dominates; it does not say which component. Mass spectrometry answers that.
- **Water content.** Karl Fischer titration answers that.
- **Counter-ion content and identity.** Ion chromatography or a dedicated method answers that.
- **Endotoxin, bioburden, residual solvents.** Separate assays, relevant to some in-vitro work.
- **Stability over time.** A purity figure describes the test date. Degradation after that date is a storage question.

A complete analytical package therefore has several documents behind it, and a supplier who only ever produces an HPLC number is showing you one facet of the material.

## How to compare two suppliers' purity claims

Ask for these, in this order:

1. **The wavelength.** If it is not 214 nm or equivalent, the numbers are not comparable.
2. **The gradient and run time.** A 30-minute shallow gradient and a 6-minute fast method produce different numbers from identical material.
3. **The chromatogram itself.** Peak shape, baseline and the size of the minor peaks tell you more than the summary figure.
4. **Whether the figure is per-lot or nominal.** "≥98%" as a specification is a promise about future lots. "99.1%" against a named lot is a measurement. Only the second one describes the vial you will receive.

## A note on specification versus result

Catalogs often list a specification — "≥99%" — while certificates report a result — "99.4%". Both are legitimate and they answer different questions. The specification is the threshold below which the supplier should not release material. The result is what was measured on your lot.

A supplier who only publishes specifications, never results, has not shown you a measurement.

All products referenced on this site are reference materials supplied for laboratory research use only. They are not drugs, supplements or foods, and they are not supplied for human or veterinary use.
