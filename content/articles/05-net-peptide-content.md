---
title: "Why a 5 mg Vial Does Not Contain 5 mg of Peptide"
slug: net-peptide-content-vs-gross-weight
category: Analytical Methods
tags: [net-peptide-content, tfa, water-content, quantitation]
excerpt: "Gross weight includes water and counter-ions. Net peptide content is the fraction that is actually peptide — and the two can differ by 15–30% on a basic sequence."
meta_description: "Net peptide content vs gross weight for lyophilized peptides: TFA counter-ions, residual water, how the correction is measured and how to apply it."
target_query: "net peptide content vs gross weight"
---

A vial labelled 5 mg contains 5 mg of lyophilized solid. It does not contain 5 mg of peptide. The difference is not a trick — it is a consequence of how synthetic peptides are purified and dried — but it is routinely missed, and it silently corrupts any calculation that assumes the label weight is peptide mass.

## Where the missing mass goes

Three components share the gross weight.

**The peptide itself.** The target molecule.

**Counter-ions.** Synthetic peptides are typically purified by RP-HPLC using trifluoroacetic acid (TFA) as a mobile-phase modifier. TFA is acidic and binds to basic sites — the N-terminus and the side chains of lysine, arginine and histidine. After lyophilization, that TFA remains, as a salt. The more basic residues in the sequence, the more counter-ion the material carries. A sequence with several lysines and arginines can carry substantially more TFA by mass than one with none.

**Water.** Lyophilized peptides are hygroscopic. Residual moisture after freeze-drying, plus whatever the powder picks up during handling, is typically a few percent and can be higher for hygroscopic sequences or poorly sealed vials.

Together, these commonly account for 10–30% of the gross weight of a TFA-salt peptide with several basic residues. For a neutral sequence with few basic sites, the correction is smaller.

## Purity does not capture this

This is the crucial point, and it is why net peptide content is a separate line on a thorough certificate.

HPLC purity is area percent of UV absorbance. Water and TFA contribute essentially nothing to absorbance at 214 nm. They are therefore *invisible* to the purity measurement. A vial can legitimately report 99% purity by HPLC and still be 75% peptide by mass.

The two figures answer different questions:

- **Purity:** of the peptide-related material present, what fraction is the target? → 99%
- **Net peptide content:** of the total mass in the vial, what fraction is peptide? → perhaps 75–85%

Neither is wrong. Using the first where you needed the second is what produces a systematically wrong concentration.

## How net peptide content is measured

**Amino acid analysis (AAA)** is the reference method. The peptide is hydrolysed into free amino acids, which are quantified against standards. The result gives the absolute amount of peptide in the sample, independent of what else is in the vial. It is the most accurate approach and the most expensive.

**Elemental (nitrogen) analysis** determines total nitrogen and back-calculates peptide content from the sequence's known nitrogen composition. Cheaper, slightly less precise, and confounded if a nitrogen-containing counter-ion is present.

**UV quantitation at 280 nm** works only for sequences containing tryptophan or tyrosine, using the calculated molar extinction coefficient. Fast and cheap when applicable, useless for sequences with no aromatic residues.

A supplier may also report **water content by Karl Fischer** and **TFA content by ion chromatography** separately, allowing you to calculate the balance yourself.

## Applying the correction

If your certificate gives net peptide content, the arithmetic is one line.

To prepare a solution at a target concentration, the mass of solid you need is:

```
mass of solid = (target concentration × volume) ÷ net peptide content
```

Worked example. You want 2 mg/mL in 1 mL, and the certificate reports 80% net peptide content:

```
mass of solid = (2 mg/mL × 1 mL) ÷ 0.80 = 2.5 mg of solid
```

Weighing out 2.0 mg instead would give a solution at 1.6 mg/mL — a 20% error, reproducible run to run, invisible in the data, and entirely attributable to the label.

If you are dissolving an entire vial rather than weighing from bulk, the same correction applies to the vial's nominal content:

```
actual peptide in a 5 mg vial at 80% net content = 4.0 mg
```

## When it matters and when it does not

**It matters** whenever an absolute concentration influences your result: concentration–response curves in cell culture, binding constants, enzyme kinetics, quantitative reference standards, or any work you intend to compare against published values or against a future lot.

**It matters less** for qualitative work, method development where you are optimizing chromatography rather than measuring a response, or a screen where relative comparisons within one lot are all you need.

**It always matters across lots.** Two lots of the same peptide at the same purity can have different counter-ion and water content. If your concentrations are derived from gross weight, lot changes introduce a step change in your effective concentration that looks like a biological or chemical effect and is not.

## Acetate salts and salt exchange

Some material is supplied as an acetate salt rather than TFA, produced by an ion-exchange step after purification. Acetate is lighter than TFA, so the same molar counter-ion load costs less mass, and for some in-vitro systems TFA itself is undesirable. Salt form should be stated on the certificate; if it is not, ask, because it changes both the mass correction and what the material contributes to your buffer.

## What to ask a supplier

1. Is net peptide content available for this lot, and by which method?
2. What is the salt form, and what is the counter-ion content?
3. What is the water content by Karl Fischer?
4. Is the label weight gross or net?

That last question is the one that resolves everything else. Suppliers who label by net peptide weight exist, and their vials cost more for the same number on the label — for a good reason.

All materials referenced here are reference materials supplied for laboratory research use only. They are not drugs, supplements or foods, and are not supplied for human or veterinary use.
