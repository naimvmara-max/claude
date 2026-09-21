---
title: "Stock Solution and Dilution Arithmetic for Laboratory Peptide Work"
slug: stock-solution-and-dilution-arithmetic
category: Handling
tags: [dilution, molarity, laboratory-practice, quantitation]
excerpt: "The four calculations that cover almost all bench work with a lyophilized reference material: mass to concentration, C1V1 = C2V2, mg/mL to molarity, and the net-content correction."
meta_description: "Peptide stock solution calculations: converting mg/mL to molarity, serial dilutions with C1V1 = C2V2, and correcting for net peptide content."
target_query: "peptide stock solution dilution calculation mg/ml molarity"
---

Four calculations cover nearly everything a laboratory does with a lyophilized reference material. None is difficult; all of them are routinely got wrong in the same three ways — forgetting the net-content correction, mixing mass and molar units, and losing track of the dilution factor across a series.

Everything below is laboratory arithmetic for in-vitro work.

## 1. Mass to concentration

The base relationship:

```
concentration (mg/mL) = mass (mg) ÷ volume (mL)
```

Dissolving a 5 mg vial in 1 mL gives 5 mg/mL. In 2.5 mL, 2 mg/mL.

Rearranged for the volume needed to hit a target:

```
volume (mL) = mass (mg) ÷ target concentration (mg/mL)
```

To take that same 5 mg vial to 1 mg/mL: 5 ÷ 1 = 5 mL of solvent.

## 2. The net peptide content correction

This is the step that is skipped, and skipping it biases every downstream number in the same direction.

Gross weight includes water and counter-ion. If the certificate reports net peptide content, apply it before anything else:

```
actual peptide (mg) = gross mass (mg) × net peptide content
```

A 5 mg vial at 80% net content holds 4 mg of peptide. Dissolved in 1 mL, that solution is 4 mg/mL, not 5.

To prepare a specific concentration from bulk powder:

```
mass of solid to weigh (mg) = (target mg/mL × volume mL) ÷ net content
```

For 2 mg/mL in 1 mL at 80% net content: (2 × 1) ÷ 0.80 = 2.5 mg of solid.

If the certificate does not report net content, the honest position is that your concentration carries an unknown systematic error of roughly 10–30%, and you should label the stock as derived from gross weight so that nobody later compares it against a net-corrected figure.

## 3. mg/mL to molarity

Assays are usually specified in molar units; vials are labelled in mass. The conversion needs the molecular weight from the certificate.

```
molarity (mol/L) = concentration (g/L) ÷ molecular weight (g/mol)
```

Since 1 mg/mL = 1 g/L, a 4 mg/mL solution of a peptide with MW 1419.5 g/mol is:

```
4 ÷ 1419.5 = 0.00282 mol/L = 2.82 mM
```

Going the other way, to prepare a target molarity:

```
concentration (mg/mL) = molarity (mol/L) × MW (g/mol)
```

A 1 mM solution of the same peptide is 0.001 × 1419.5 = 1.42 mg/mL.

Two cautions. Use the **free peptide** molecular weight for molarity, not the salt-inclusive mass — the counter-ion is not part of the molecule you are counting. And check whether the certificate's MW is average or monoisotopic; for molarity work, average mass is the correct one.

## 4. Serial dilution: C₁V₁ = C₂V₂

The workhorse. To make a less concentrated solution from a more concentrated one:

```
C₁V₁ = C₂V₂
```

where C₁ and V₁ are the concentration and volume of the stock you take, and C₂ and V₂ the concentration and final volume you want. Solved for the volume of stock to take:

```
V₁ = (C₂ × V₂) ÷ C₁
```

From a 2.82 mM stock, to make 500 µL at 100 µM:

```
V₁ = (0.1 mM × 500 µL) ÷ 2.82 mM = 17.7 µL of stock
```

made up to 500 µL total — so 17.7 µL of stock plus 482.3 µL of diluent. The diluent volume is the difference, not the final volume; adding 500 µL to 17.7 µL gives 517.7 µL at the wrong concentration.

Units must match on both sides. mM with mM, µL with µL. Mixing them is the most common error in this calculation and it produces errors of exactly 1000×, which at least makes them easy to spot.

### Running a series

For a tenfold series, each step transfers a fixed volume into nine times that volume of diluent. Carry the dilution factor explicitly:

| Step | Dilution from previous | Cumulative factor | Concentration from 100 µM |
| --- | --- | --- | --- |
| 1 | — | 1× | 100 µM |
| 2 | 1:10 | 10× | 10 µM |
| 3 | 1:10 | 100× | 1 µM |
| 4 | 1:10 | 1000× | 100 nM |
| 5 | 1:10 | 10 000× | 10 nM |

Mix at each step before transferring. An unmixed transfer propagates through every subsequent point, and the resulting curve looks like a real effect.

## Practical notes

**Adsorption at low concentration.** Peptides adsorb to plastic and glass. At low nanomolar concentrations a meaningful fraction can be lost to the tube wall. Low-binding consumables, a carrier protein where the assay allows it, and preparing dilute working solutions fresh rather than storing them all mitigate this.

**Solvent carryover.** When a DMSO stock is diluted into aqueous buffer, the DMSO goes with it. Track the final solvent percentage across a dilution series — it changes with every step unless you compensate — and include a vehicle control at the matching concentration.

**Record what you did, not what you intended.** Log the actual mass weighed, the actual volume added, the lot number and the date. A stock labelled "2 mg/mL" with no lot and no date is unusable evidence six months later.

## Worked end-to-end example

A vial reports: 5 mg gross, 99.1% HPLC purity, 82% net peptide content, MW 1419.5 g/mol.

1. **Peptide present:** 5 mg × 0.82 = 4.1 mg
2. **Dissolve in 1 mL:** 4.1 mg/mL
3. **As molarity:** 4.1 ÷ 1419.5 = 2.89 mM
4. **To make 1 mL at 50 µM:** V₁ = (0.05 mM × 1000 µL) ÷ 2.89 mM = 17.3 µL of stock into 982.7 µL of buffer

Had the net-content correction been skipped, step 2 would have read 5 mg/mL, step 3 would have read 3.52 mM, and every working solution downstream would have been about 22% more dilute than recorded.

All materials referenced here are reference materials supplied for laboratory research use only, and the calculations above are laboratory preparation arithmetic for in-vitro work. These materials are not supplied for human or veterinary use.
