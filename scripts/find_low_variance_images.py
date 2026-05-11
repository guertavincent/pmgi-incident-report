from pathlib import Path
from PIL import Image, ImageStat

folder = Path("public/housekeeping-guidelines")
images = [p for p in folder.iterdir() if p.suffix.lower() in {".png", ".jpg", ".jpeg"}]

candidates = []
for p in images:
    try:
        img = Image.open(p).convert("RGB")
        img.thumbnail((128, 128))
        stat = ImageStat.Stat(img)
        var = sum(stat.var) / 3
        mean = sum(stat.mean) / 3
        candidates.append((var, mean, p.name))
    except Exception:
        continue

candidates.sort(key=lambda x: (x[0], -x[1]))
for var, mean, name in candidates[:30]:
    print(f"{name} var={var:.1f} mean={mean:.1f}")
