---
title: "Mass Spectrometry Identity Confirmation, Explained for Purchasers"
slug: mass-spectrometry-identity-confirmation
category: Analytical Methods
tags: [mass-spectrometry, identity, analytical-methods]
excerpt: "HPLC says the material is one thing. Mass spectrometry says which thing. How to check the MS section of a certificate against the sequence yourself."
meta_description: "Understanding ESI-MS on a peptide COA: theoretical vs observed mass, multiply charged ions, average vs monoisotopic mass, and common discrepancies."
target_query: "peptide mass spectrometry identity confirmation coa"
---

Purity and identity are separate questions, answered by separate instruments. A chromatogram showing one dominant peak tells you the material is largely a single species. It does not tell you that species is the peptide you ordered. Mass spectrometry closes that gap, and the MS section of a certificate is the part a purchaser can most easily verify without any equipment.

## How the measurement works

In electrospray ionization mass spectrometry (ESI-MS), the sample is sprayed from solution through a charged capillary, producing gas-phase ions that the analyser separates by mass-to-charge ratio (m/z). Peptides ionize readily by picking up protons at basic sites — the N-terminus, and the side chains of lysine, arginine and histidine.

Because a peptide has several such sites, it usually appears not as one ion but as a **charge envelope**: a series of peaks corresponding to the same molecule carrying different numbers of protons.

For a peptide of mass M, the singly protonated ion appears at m/z ≈ M+1, the doubly protonated at (M+2)/2, the triply protonated at (M+3)/3, and so on. A 1400 Da peptide might show ions near 1401, 701 and 468 — three peaks, one molecule. Software deconvolutes the envelope back to a single mass figure, which is what the certificate reports as the **observed mass**.

## Average versus monoisotopic mass

This is the most common source of apparent discrepancies on certificates, and it is usually a reporting error rather than a material problem.

**Monoisotopic mass** is calculated using the single most abundant isotope of each element — carbon-12, nitrogen-14, and so on. **Average mass** uses the natural isotopic distribution, weighted by abundance. For a small peptide the two differ by a fraction of a dalton; for a larger one they diverge by several daltons.

A certificate should state which convention it uses, and should compare like with like. When a document reports a monoisotopic theoretical mass against an average observed mass, the mismatch looks alarming and means nothing. When it does not say which it used, ask.

## The check a purchaser can run

You need no instrument for this — only the certificate and a free peptide mass calculator.

1. **Copy the sequence** exactly as printed on the certificate, including any N-terminal acetylation or C-terminal amidation. Modifications change the mass: acetylation adds about 42 Da, amidation changes the C-terminus by about −1 Da relative to the free acid.
2. **Calculate the theoretical mass** in both conventions.
3. **Compare against the certificate's stated theoretical mass.** They should agree in one convention or the other.
4. **Compare the observed mass** against the theoretical. Agreement within the instrument's stated tolerance — often a fraction of a dalton on a high-resolution instrument, a dalton or two on a lower-resolution one — is a pass.

A mismatch at step 3 is the informative one. If the sequence printed on the document does not produce the theoretical mass printed on the same document, the two fields came from different places. That is a documentation failure regardless of what the material actually is, and it warrants a direct question before purchase.

## What MS confirms, and what it does not

**Confirms:** that a species of the expected molecular mass is present and dominant in the sample.

**Does not confirm:** the sequence order. Two peptides containing the same residues in a different order have identical masses. Distinguishing them requires tandem MS (MS/MS), where a selected ion is fragmented and the fragment masses are used to read the sequence. Most commercial certificates do not include MS/MS; for most purchasing decisions the combination of an appropriate synthesis route, HPLC purity and a matching parent mass is considered sufficient. If sequence order is critical to your work, ask whether MS/MS data exists.

**Does not confirm:** stereochemistry. D- and L- amino acids have identical masses. Diastereomeric impurities are an HPLC question, and only if the gradient resolves them.

**Does not confirm:** quantity. MS response is not linearly proportional to amount in the way a purity measurement needs, and identity confirmation is a qualitative result.

## Reading the spectrum image

If the certificate includes the spectrum rather than only a summary table, two things are worth looking at:

**The charge envelope should be coherent.** The peaks should be consistent with one molecule at successive charge states. A spectrum with prominent peaks that do not fit any charge state of the stated mass indicates a co-eluting species.

**Common adducts are normal.** Sodium adds about 22 Da relative to a proton, potassium about 38 Da. Small satellite peaks at those offsets are routine and are not impurity in a meaningful sense.

## When identity and purity disagree

Occasionally a certificate shows excellent HPLC purity and an MS result that is off by a specific, interpretable amount. Those offsets are diagnostic:

| Offset | Common explanation |
| --- | --- |
| +16 Da | Oxidation, typically at methionine |
| +42 Da | Acetylation, intended or residual from synthesis |
| −18 Da | Loss of water, often via cyclization |
| −71, −113, −128 Da etc. | A deletion sequence missing one residue |

A supplier who can explain which of these applies to a minor peak on their own chromatogram is doing real analytical work. One who cannot is reselling documents.

Every product referenced here is a reference material supplied for laboratory research use only. It is not a drug, supplement or food and is not supplied for human or veterinary use.
