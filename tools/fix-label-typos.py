#!/usr/bin/env python3
"""Correct the two misspellings printed on the vial labels.

The labels are part of the product photography, so the fix is pixel surgery
rather than a text edit:

  TIRZAPETIDE -> TIRZEPATIDE   the A and the E trade places, so the two
                               glyphs are lifted and re-set in the other
                               order with the original letter spacing.
  SMG         -> 5MG           the photo set has no 5 on this vial, so the
                               digit is lifted from the 50MG label on the
                               GHK-Cu vial and scaled to this label's cap
                               height.

Each glyph is moved as a difference against a reconstructed label background,
which keeps the embossed highlight and its shadow intact and leaves the
label's own shading where it was. Every coordinate below was measured off the
photograph; the region a fix rewrites never reaches into a neighbouring
glyph, or that glyph is clipped.

Usage: python3 tools/fix-label-typos.py
"""

import pathlib
import sys

import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "product-images"

MARGIN = 5  # clean rows sampled above and below a line of type


def load(name):
    """Photo as float RGBA."""
    return np.asarray(Image.open(SRC / name).convert("RGBA")).astype(np.float64)


def save(arr, name):
    Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA").save(
        SRC / name, quality=95, method=6
    )


class Band:
    """One line of type: the pixels, and the bare label under them."""

    def __init__(self, arr, top, bottom, left, right):
        self.arr = arr
        self.top, self.bottom = top, bottom
        self.left, self.right = left, right
        self.bg = self._background()

    def _background(self):
        arr, top, bottom = self.arr, self.top, self.bottom
        left, right = self.left, self.right

        above = arr[top - MARGIN:top, left:right].mean(axis=0)
        below = arr[bottom + 1:bottom + 1 + MARGIN, left:right].mean(axis=0)

        ramp = np.linspace(0, 1, bottom - top + 1)[:, None, None]
        flat = above[None, :, :] * (1 - ramp) + below[None, :, :] * ramp

        # Carry the label's grain over from the clean rows below the type.
        clean = arr[bottom + 1:bottom + 1 + MARGIN, left:right]
        grain = np.resize(clean - clean.mean(axis=0, keepdims=True), flat.shape)

        out = flat + grain
        out[:, :, 3] = arr[top:bottom + 1, left:right, 3]
        return out

    def ink(self, x0, x1):
        """What a glyph adds to the bare label, as a signed patch."""
        patch = self.arr[self.top:self.bottom + 1, x0:x1 + 1, :3]
        under = self.bg[:, x0 - self.left:x1 - self.left + 1, :3]
        return patch - under

    def write(self, canvas):
        self.arr[self.top:self.bottom + 1, self.left:self.right, :3] = np.clip(
            canvas[:, :, :3], 0, 255
        )


def peak_ink(arr, top, bottom, left, right, box):
    """How bright a glyph's highlight runs on its own label."""
    return Band(arr, top, bottom, left, right).ink(*box).max()


def blend_in(canvas, ink, x, feather=2):
    """Add a glyph's ink at x, feathering the two vertical edges."""
    weight = np.ones(ink.shape[1])
    weight[:feather] = np.linspace(0, 1, feather)
    weight[-feather:] = np.linspace(1, 0, feather)
    canvas[:, x:x + ink.shape[1], :3] += ink * weight[None, :, None]


def fix_tirzepatide():
    """TIRZAPETIDE -> TIRZEPATIDE."""
    name = "tirzepatide-30mg.webp"
    arr = load(name)

    # Type sits on rows 532-557. The Z before it ends at x=730 and the T after
    # it starts at x=806, so the rewritten strip stops short of both.
    band = Band(arr, top=528, bottom=562, left=731, right=806)

    a_box, p_box, e_box = (732, 756), (761, 779), (785, 802)

    # The label kerns diagonals tight — Z and A sit a single pixel apart in
    # the original — so the re-set run keeps ZE and EP at the label's normal
    # 4px and pulls PA and AT in to 2px. The three glyphs and the four gaps
    # still add up to the same run, between the Z at 730 and the T at 806.
    canvas = band.bg.copy()
    x = 730 + 1 + 4 - band.left
    for ink, gap in ((band.ink(*e_box), 4), (band.ink(*p_box), 2), (band.ink(*a_box), 0)):
        blend_in(canvas, ink, x)
        x += ink.shape[1] + gap

    band.write(canvas)
    save(arr, name)
    return name


def fix_semaglutide():
    """SMG -> 5MG, borrowing the digit from the GHK-Cu vial."""
    name = "semaglutide-5mg.webp"
    arr = load(name)
    donor = load("ghk-cu-50mg.webp")

    # Only the S is rewritten: it ends at x=754 and the M starts at x=759.
    here = Band(arr, top=576, bottom=601, left=736, right=758)
    s_box = (741, 754)

    # The donor's 50MG line. Its 5 ends at x=743, the 0 starts at x=746.
    there = Band(donor, top=579, bottom=606, left=726, right=745)
    five_box = (731, 743)

    five = there.ink(*five_box)

    # Crop the digit to its own rows before scaling: 19 rows of donor type
    # against 17 here.
    five = five[584 - there.top:603 - there.top]
    scale = 17 / 19
    size = (
        max(1, int(round(five.shape[1] * scale))),
        max(1, int(round(five.shape[0] * scale))),
    )
    five = np.asarray(
        Image.fromarray(np.clip(five + 128, 0, 255).astype(np.uint8), "RGB").resize(
            size, Image.LANCZOS
        )
    ).astype(np.float64) - 128

    # Match this label's ink brightness. The donor vial is lit harder, and its
    # highlight clips; the M each line shares gives the ratio.
    # The M each line shares gives the ratio; each is measured on a strip
    # of its own so neither reads across into its neighbours.
    five *= (
        peak_ink(arr, 576, 601, 757, 779, (759, 776))
        / peak_ink(donor, 579, 606, 762, 786, (764, 783))
    )

    canvas = here.bg.copy()
    # Centre the digit in the slot the S leaves, on the same baseline.
    slot = s_box[1] - s_box[0] + 1
    x = s_box[0] - here.left + (slot - five.shape[1]) // 2
    y = 597 - here.top - five.shape[0] + 1
    canvas[y:y + five.shape[0], x:x + five.shape[1], :3] += five

    here.write(canvas)
    save(arr, name)
    return name


def main():
    for fix in (fix_tirzepatide, fix_semaglutide):
        print("rewrote", fix())
    return 0


if __name__ == "__main__":
    sys.exit(main())
