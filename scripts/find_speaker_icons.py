from pathlib import Path
from PIL import Image

folder = Path("public/housekeeping-guidelines")
base = folder / "slide-06-img-01.png"


def ahash(img, size=8):
    img = img.convert("L").resize((size, size))
    pixels = list(img.getdata())
    avg = sum(pixels) / len(pixels)
    return [1 if p >= avg else 0 for p in pixels]


def hamming(a, b):
    return sum(x != y for x, y in zip(a, b))


base_hash = ahash(Image.open(base))

matches = []
for p in folder.iterdir():
    if p.suffix.lower() not in {".png", ".jpg", ".jpeg"}:
        continue
    try:
        bits = ahash(Image.open(p))
    except Exception:
        continue
    dist = hamming(base_hash, bits)
    if dist <= 6:
        matches.append((dist, p.name))

for dist, name in sorted(matches):
    print(dist, name)
