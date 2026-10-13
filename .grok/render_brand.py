"""Studio share card + X banner for 树脂块微缩岛屿. Code-drawn (image APIs unavailable)."""
from __future__ import annotations

import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path("/workspace/.grok")
FONT_PATH = "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"

OFF = (243, 239, 230)  # #f3efe6
TEAL = (26, 163, 154)  # #1aa39a
DEEP = (12, 79, 82)  # #0c4f52
SAND = (228, 208, 168)  # #e4d0a8
SAND_HI = (242, 228, 196)
CLIFF = (110, 103, 95)  # #6e675f
CLIFF_DK = (78, 73, 67)
CLIFF_LT = (142, 134, 122)
LEAF = (63, 107, 58)  # #3f6b3a
LEAF_DK = (42, 74, 40)
LEAF_LT = (92, 138, 78)
INK = (12, 79, 82)


def font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_PATH, size, index=0)


def vertical_gradient(w: int, h: int, top: tuple[int, int, int], bottom: tuple[int, int, int]) -> Image.Image:
    t = np.linspace(0.0, 1.0, h, dtype=np.float32)[:, None, None]
    arr = (np.array(top, np.float32) * (1 - t) + np.array(bottom, np.float32) * t)
    arr = np.repeat(arr, w, axis=1)
    return Image.fromarray(arr.astype(np.uint8), "RGB")


def text_width(text: str, fnt: ImageFont.FreeTypeFont, tracking: float) -> float:
    return sum(fnt.getlength(ch) for ch in text) + tracking * max(0, len(text) - 1)


def draw_tracked(
    draw: ImageDraw.ImageDraw,
    xy: tuple[float, float],
    text: str,
    fnt: ImageFont.FreeTypeFont,
    fill: tuple,
    tracking: float,
) -> None:
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=fnt, fill=fill)
        x += fnt.getlength(ch) + tracking


def rounded_layer(size: tuple[int, int], box: tuple, radius: int, fill) -> Image.Image:
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).rounded_rectangle(box, radius=radius, fill=fill)
    return layer


def paint_diorama(w: int, h: int) -> Image.Image:
    """Miniature cliff island in teal water, local to the cube's front window."""
    yy = np.linspace(0, 1, h, dtype=np.float32)[:, None, None]
    top = np.array([46, 176, 168], np.float32)
    mid = np.array(TEAL, np.float32)
    bot = np.array(DEEP, np.float32)
    col = np.where(yy < 0.42, top * (1 - yy / 0.42) + mid * (yy / 0.42), mid * (1 - (yy - 0.42) / 0.58) + bot * ((yy - 0.42) / 0.58))
    arr = np.repeat(col, w, axis=1).astype(np.uint8)
    # edge thickness: darken toward the rim
    xs = np.linspace(-1, 1, w, dtype=np.float32)[None, :]
    ys = np.linspace(-1, 1, h, dtype=np.float32)[:, None]
    dist = np.sqrt(xs**2 * 0.85 + ys**2)
    shade = np.clip((dist - 0.55) / 0.7, 0, 1) * 0.45
    arr = (arr.astype(np.float32) * (1 - shade[..., None])).astype(np.uint8)
    base = Image.fromarray(arr, "RGB").convert("RGBA")
    d = ImageDraw.Draw(base, "RGBA")

    # surface sheen
    d.ellipse((int(w * 0.08), int(h * 0.06), int(w * 0.92), int(h * 0.28)), fill=(210, 244, 238, 70))

    # sand beach
    d.ellipse((int(-w * 0.05), int(h * 0.62), int(w * 1.05), int(h * 1.18)), fill=SAND + (255,))
    d.ellipse((int(w * 0.05), int(h * 0.66), int(w * 0.95), int(h * 0.92)), fill=SAND_HI + (255,))
    # wet sand line
    d.ellipse((int(-w * 0.02), int(h * 0.60), int(w * 1.02), int(h * 0.78)), fill=(196, 168, 122, 180))

    # cliff masses
    rocks = [
        (0.08, 0.48, 0.62, 0.92, CLIFF_DK),
        (0.18, 0.34, 0.58, 0.78, CLIFF),
        (0.30, 0.22, 0.62, 0.70, CLIFF_LT),
        (0.48, 0.40, 0.78, 0.86, CLIFF_DK),
        (0.52, 0.30, 0.74, 0.62, CLIFF),
    ]
    for x0, y0, x1, y1, col in rocks:
        d.ellipse((int(w * x0), int(h * y0), int(w * x1), int(h * y1)), fill=col + (255,))
    # cliff light plane
    d.polygon(
        [
            (int(w * 0.30), int(h * 0.30)),
            (int(w * 0.46), int(h * 0.24)),
            (int(w * 0.50), int(h * 0.55)),
            (int(w * 0.28), int(h * 0.58)),
        ],
        fill=CLIFF_LT + (210,),
    )

    # foliage mounds
    rng = np.random.default_rng(11)
    bushes = [
        (0.36, 0.30, 0.11, LEAF_DK),
        (0.44, 0.26, 0.13, LEAF),
        (0.52, 0.32, 0.10, LEAF_LT),
        (0.30, 0.38, 0.09, LEAF),
        (0.60, 0.36, 0.12, LEAF_DK),
        (0.66, 0.42, 0.08, LEAF),
        (0.40, 0.36, 0.07, LEAF_LT),
    ]
    for cx, cy, r, col in bushes:
        rw, rh = int(w * r), int(h * r * 0.85)
        x, y = int(w * cx), int(h * cy)
        d.ellipse((x - rw, y - rh, x + rw, y + int(rh * 0.7)), fill=col + (255,))
        # a few leaf specks
        for _ in range(4):
            px = x + int(rng.integers(-rw, rw))
            py = y + int(rng.integers(-rh // 2, rh // 2))
            pr = max(2, int(min(w, h) * 0.012))
            d.ellipse((px - pr, py - pr, px + pr, py + pr), fill=LEAF_LT + (180,))

    # pebbles
    for px, py, pr in ((0.72, 0.78, 0.018), (0.78, 0.82, 0.012), (0.22, 0.80, 0.014), (0.84, 0.76, 0.01)):
        x, y, r = int(w * px), int(h * py), int(w * pr)
        d.ellipse((x - r, y - r, x + r, y + int(r * 0.7)), fill=(120, 110, 96, 230))

    # caustics
    caut = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    cd = ImageDraw.Draw(caut)
    for i in range(7):
        y = int(h * (0.62 + i * 0.045))
        pts = []
        for x in range(0, w, max(4, w // 80)):
            yy = y + math.sin(x / (w * 0.08) + i) * (h * 0.018) + math.sin(x / (w * 0.03) + i * 0.7) * (h * 0.008)
            pts.append((x, yy))
        cd.line(pts, fill=(255, 255, 245, 70), width=max(2, w // 180))
    caut = caut.filter(ImageFilter.GaussianBlur(radius=max(1, w // 200)))
    base.alpha_composite(caut)

    # a few bubbles
    bd = ImageDraw.Draw(base, "RGBA")
    for bx, by, br in ((0.22, 0.22, 0.025), (0.74, 0.18, 0.016), (0.18, 0.40, 0.012), (0.80, 0.34, 0.02)):
        x, y, r = int(w * bx), int(h * by), int(w * br)
        bd.ellipse((x - r, y - r, x + r, y + r), outline=(255, 255, 255, 140), width=max(1, r // 5))
        bd.ellipse((x - r // 2, y - r // 2, x - r // 5, y - r // 5), fill=(255, 255, 255, 160))

    return base


def paint_cube(canvas: Image.Image, box: tuple[int, int, int, int], radius: int) -> None:
    """Soft jelly resin cube. box is the front window."""
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    size = canvas.size
    dx, dy = int(w * 0.12), int(-h * 0.09)

    # contact shadow
    shadow = Image.new("RGBA", size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.ellipse(
        (x0 + int(w * 0.08), y1 - int(h * 0.04), x1 + dx + int(w * 0.06), y1 + int(h * 0.16)),
        fill=(90, 72, 52, 90),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=max(8, w // 18)))
    canvas.alpha_composite(shadow)

    # depth slabs — jelly thickness
    back = (x0 + dx, y0 + dy, x1 + dx, y1 + dy)
    mid = (x0 + dx // 2, y0 + dy // 2, x1 + dx // 2, y1 + dy // 2)
    canvas.alpha_composite(rounded_layer(size, back, radius, (8, 70, 72, 255)))
    canvas.alpha_composite(rounded_layer(size, mid, radius, (16, 120, 116, 255)))

    # front water
    diorama = paint_diorama(w, h)
    masked = Image.new("RGBA", size, (0, 0, 0, 0))
    masked.paste(diorama, (x0, y0))
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((x0, y0, x1, y1), radius=radius, fill=255)
    front = Image.new("RGBA", size, (0, 0, 0, 0))
    front.paste(masked, (0, 0))
    # apply mask
    front.putalpha(Image.fromarray(np.minimum(np.array(front.getchannel("A")), np.array(mask))))
    canvas.alpha_composite(front)

    # glass rim + specular
    glass = Image.new("RGBA", size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glass)
    gd.rounded_rectangle((x0, y0, x1, y1), radius=radius, outline=(255, 255, 255, 170), width=max(3, w // 80))
    gd.rounded_rectangle(
        (x0 + dx, y0 + dy, x1 + dx, y1 + dy),
        radius=radius,
        outline=(255, 255, 255, 60),
        width=max(2, w // 140),
    )
    # top-left specular blob
    gd.ellipse(
        (x0 + int(w * 0.08), y0 + int(h * 0.06), x0 + int(w * 0.42), y0 + int(h * 0.28)),
        fill=(255, 255, 255, 70),
    )
    glass = glass.filter(ImageFilter.GaussianBlur(radius=max(1, w // 160)))
    # re-stroke a crisp thin rim so the blur doesn't eat the edge
    crisp = Image.new("RGBA", size, (0, 0, 0, 0))
    ImageDraw.Draw(crisp).rounded_rectangle(
        (x0, y0, x1, y1), radius=radius, outline=(255, 255, 255, 200), width=max(2, w // 120)
    )
    canvas.alpha_composite(glass)
    canvas.alpha_composite(crisp)


def studio_bg(w: int, h: int) -> Image.Image:
    bg = vertical_gradient(w, h, (247, 244, 236), (232, 222, 202)).convert("RGBA")
    # warm floor pool
    floor = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(floor).ellipse(
        (int(-w * 0.1), int(h * 0.55), int(w * 1.1), int(h * 1.25)),
        fill=(226, 210, 180, 80),
    )
    floor = floor.filter(ImageFilter.GaussianBlur(radius=max(12, w // 40)))
    bg.alpha_composite(floor)
    return bg


def render_og() -> Image.Image:
    scale = 3
    W, H = 1200 * scale, 630 * scale
    canvas = studio_bg(W, H)
    # cube — hero, upper center, room below for the lockup
    cw, ch = 430 * scale, 300 * scale
    x0 = (W - cw) // 2 - 18 * scale
    y0 = 52 * scale
    paint_cube(canvas, (x0, y0, x0 + cw, y0 + ch), radius=52 * scale)

    fnt = font(96 * scale)
    tracking = 10 * scale
    lines = ["树脂块", "微缩岛屿"]
    # measure and place as a centered lockup under the cube
    gap = 8 * scale
    line_h = 96 * scale
    block_h = line_h * 2 + gap
    y = y0 + ch + 26 * scale
    # keep the block off the bottom edge
    max_y = H - 36 * scale - block_h
    if y > max_y:
        y = max_y
    draw = ImageDraw.Draw(canvas)
    for i, line in enumerate(lines):
        tw = text_width(line, fnt, tracking)
        x = (W - tw) / 2
        draw_tracked(draw, (x, y + i * (line_h + gap)), line, fnt, INK, tracking)
    # hairline under the lockup, centered, short
    tw = text_width(lines[1], fnt, tracking)
    rule_w = int(tw * 0.28)
    ry = y + block_h + 10 * scale
    if ry < H - 28 * scale:
        draw.line(
            ((W - rule_w) / 2, ry, (W + rule_w) / 2, ry),
            fill=(26, 163, 154, 220),
            width=max(2, 3 * scale // 2),
        )
    out = canvas.convert("RGB").resize((1200, 630), Image.Resampling.LANCZOS)
    return out


def render_banner() -> Image.Image:
    scale = 3
    W, H = 1200 * scale, 264 * scale
    canvas = studio_bg(W, H)
    # cube lives in the right half; title lockup in the left half, above midline
    cw, ch = 250 * scale, 188 * scale
    x0 = 760 * scale
    y0 = 34 * scale
    paint_cube(canvas, (x0, y0, x0 + cw, y0 + ch), radius=34 * scale)

    fnt = font(58 * scale)
    tracking = 4 * scale
    lines = ["树脂块", "微缩岛屿"]
    gap = 4 * scale
    line_h = 58 * scale
    # sit in the upper-left, clear of the bottom fifth and the right half
    x = 64 * scale
    y = 36 * scale
    draw = ImageDraw.Draw(canvas)
    for i, line in enumerate(lines):
        draw_tracked(draw, (x, y + i * (line_h + gap)), line, fnt, INK, tracking)
    # short teal rule under the lockup, still inside the safe zone
    tw = text_width(lines[1], fnt, tracking)
    rule_y = y + line_h * 2 + gap + 12 * scale
    draw.line((x, rule_y, x + tw * 0.34, rule_y), fill=(26, 163, 154, 220), width=max(2, scale))
    out = canvas.convert("RGB").resize((1200, 264), Image.Resampling.LANCZOS)
    return out


def main() -> None:
    og = render_og()
    banner = render_banner()
    og.save(ROOT / "og-raw.png", "PNG")
    banner.save(ROOT / "banner-raw.png", "PNG")
    print("og", og.size, "banner", banner.size)


if __name__ == "__main__":
    main()
