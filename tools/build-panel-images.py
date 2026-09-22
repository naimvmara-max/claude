#!/usr/bin/env python3
"""Compose a panel image from the vials it contains.

A panel is several vials sold together, and a buyer cannot tell that from a
single-vial photograph. This lays the component images out side by side on a
square canvas, so the listing shows what actually arrives.

    python3 tools/build-panel-images.py
"""

import csv
import pathlib
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow is required:  pip install pillow")

ROOT = pathlib.Path(__file__).resolve().parent.parent
PRODUCTS = ROOT / "data" / "product-images" / "web"
OUT = ROOT / "data" / "product-images" / "panels"
SIZE = 1200


def component_images(items, catalog):
    """Image paths for each SKU in a panel, skipping any without artwork."""
    found = []
    for sku in items:
        row = catalog.get(sku)
        if not row or not row.get("Images"):
            continue
        path = ROOT / "data" / row["Images"]
        if path.exists():
            found.append(path)
    return found


def compose(paths, size=SIZE, background="transparent"):
    """Lay the vials out in a row, scaled to fit, centred on a square canvas."""
    mode = "RGBA" if background == "transparent" else "RGB"
    fill = (0, 0, 0, 0) if background == "transparent" else background
    canvas = Image.new(mode, (size, size), fill)

    count = len(paths)
    margin = int(size * 0.05)
    overlap = int(size * 0.02)          # vials sit close enough to read as a set
    height = int(size * 0.88)
    usable = size - margin * 2 + overlap * (count - 1)
    column = usable // count

    vials = []
    for path in paths:
        vial = Image.open(path).convert("RGBA")
        # Trim the transparent margin each source image carries, so the glass
        # fills its column instead of the padding around it.
        box = vial.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
        if box:
            vial = vial.crop(box)
        ratio = min(column / vial.width, height / vial.height)
        vials.append(vial.resize((max(1, int(vial.width * ratio)), max(1, int(vial.height * ratio))), Image.LANCZOS))

    total = sum(v.width for v in vials) - overlap * (count - 1)
    x = (size - total) // 2

    for vial in vials:
        y = (size - vial.height) // 2
        canvas.paste(vial, (x, y), vial)
        x += vial.width - overlap

    return canvas


def main():
    stacks = ROOT / "data" / "phantom-stacks.csv"
    catalog_rows = list(csv.DictReader(open(ROOT / "data" / "phantom-catalog.csv")))
    catalog = {r["SKU"]: r for r in catalog_rows}

    OUT.mkdir(parents=True, exist_ok=True)

    for row in csv.DictReader(open(stacks)):
        items = [s.strip() for s in row["panel_items"].split(",")]
        paths = component_images(items, catalog)

        if not paths:
            print(f"{row['sku']:18} skipped — no component artwork")
            continue

        if len(paths) < len(items):
            print(f"{row['sku']:18} warning — {len(items) - len(paths)} component(s) have no image")

        image = compose(paths)
        dest = OUT / (row["sku"].lower() + ".webp")
        image.save(dest, "WEBP", quality=88, method=6)
        print(f"{row['sku']:18} {len(paths)} vials → {dest.relative_to(ROOT)}  {dest.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
