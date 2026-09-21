#!/usr/bin/env python3
"""Turn raw product photographs into square, web-ready catalog images.

Studio shots of a vial on white leave most of the frame empty, so a catalog
card renders a small object floating in whitespace. This trims to the subject,
pads it evenly, squares the canvas and writes a consistent size.

    python3 tools/prepare-product-images.py                 # data/product-images/*.webp
    python3 tools/prepare-product-images.py --size 1400 --pad 0.10

Originals are kept; output goes to data/product-images/web/.
"""

import argparse
import pathlib
import sys

try:
    from PIL import Image, ImageChops
except ImportError:
    sys.exit("Pillow is required:  pip install pillow")

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "product-images"
OUT = SRC / "web"


def subject_box(im, threshold=245):
    """Bounding box of the subject.

    Transparent backgrounds are read from the alpha channel; flat opaque
    backgrounds are measured against the corner colour, so this works on a
    cut-out PNG/WebP and on a studio shot on white alike.
    """
    if "A" in im.getbands():
        alpha = im.getchannel("A")
        box = alpha.point(lambda v: 255 if v > 8 else 0).getbbox()
        if box:
            return box

    rgb = im.convert("RGB")
    background = rgb.getpixel((0, 0))
    diff = ImageChops.difference(rgb, Image.new("RGB", rgb.size, background))
    mask = diff.convert("L").point(lambda v: 255 if v > (255 - threshold) + 8 else 0)
    return mask.getbbox()


def square(im, box, pad, size, background="white"):
    """Centre the subject on a square canvas, keeping any transparency intact."""
    left, top, right, bottom = box
    w, h = right - left, bottom - top
    side = int(max(w, h) * (1 + pad * 2))
    offset = (int(side / 2 - w / 2), int(side / 2 - h / 2))

    subject = im.crop(box)

    if background == "transparent":
        canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
        canvas.paste(subject.convert("RGBA"), offset, subject.convert("RGBA"))
        return canvas.resize((size, size), Image.LANCZOS)

    canvas = Image.new("RGB", (side, side), background)
    subject = subject.convert("RGBA")
    canvas.paste(subject, offset, subject)          # alpha as the paste mask
    return canvas.resize((size, size), Image.LANCZOS)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--size", type=int, default=1200, help="output edge in px (default 1200)")
    parser.add_argument("--pad", type=float, default=0.12, help="padding as a fraction of the subject (default 0.12)")
    parser.add_argument("--threshold", type=int, default=245, help="background cutoff, 0-255 (default 245)")
    parser.add_argument("--quality", type=int, default=88)
    parser.add_argument("--background", default="white",
                        help='"white" (default), "transparent", or any CSS colour such as "#0a0a0a"')
    args = parser.parse_args()

    files = sorted(p for p in SRC.glob("*.webp") if p.parent == SRC)
    files += sorted(p for p in SRC.glob("*.png") if p.parent == SRC)
    files += sorted(p for p in SRC.glob("*.jpg") if p.parent == SRC)

    if not files:
        sys.exit(f"no images found in {SRC.relative_to(ROOT)}/")

    OUT.mkdir(parents=True, exist_ok=True)

    for path in files:
        im = Image.open(path)
        box = subject_box(im, args.threshold)

        if box is None:
            print(f"{path.name:28} skipped — no subject found against the background")
            continue

        out = square(im, box, args.pad, args.size, args.background)
        dest = OUT / (path.stem + ".webp")
        out.save(dest, "WEBP", quality=args.quality, method=6)

        fill = ((box[2] - box[0]) * (box[3] - box[1])) / (im.width * im.height)
        print(f"{path.name:28} {im.width}x{im.height} → {args.size}x{args.size}  "
              f"subject filled {fill*100:.0f}% of the original  "
              f"{dest.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
