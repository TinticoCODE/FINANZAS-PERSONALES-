#!/usr/bin/env python3
"""Genera íconos PWA desde public/logo.png."""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
LOGO = ROOT / "public" / "logo.png"
OUT_DIR = ROOT / "public" / "icons"
BG = (10, 10, 10, 255)

def main() -> None:
    logo = Image.open(LOGO).convert("RGBA")
    size = max(logo.size)
    canvas = Image.new("RGBA", (size, size), BG)
    offset = ((size - logo.size[0]) // 2, (size - logo.size[1]) // 2)
    canvas.paste(logo, offset, logo)
    square = canvas.convert("RGB")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for dim, name in [
        (192, "icon-192x192.png"),
        (512, "icon-512x512.png"),
        (180, "apple-touch-icon.png"),
    ]:
        square.resize((dim, dim), Image.Resampling.LANCZOS).save(
            OUT_DIR / name, optimize=True
        )
        print(f"Wrote {OUT_DIR / name}")


if __name__ == "__main__":
    main()
