# Product images

`*.webp` in this folder are the originals as supplied. They are cut-outs with a
transparent background, and the vial occupies roughly 14% of the frame — a
catalog card rendered from one shows a small object lost in whitespace.

`web/` holds the versions the store uses: trimmed to the subject, padded,
squared and written at 1200 px on white.

Regenerate after adding new photographs:

```bash
python3 tools/prepare-product-images.py                     # white background
python3 tools/prepare-product-images.py --background transparent
python3 tools/prepare-product-images.py --size 1400 --pad 0.10
```

Name each original after the product and size — `tirzepatide-30mg.webp` — and
the `Images` column in `data/phantom-catalog.csv` points at `web/<same name>`.
