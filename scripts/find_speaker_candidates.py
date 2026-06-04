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
        mean = sum(stat.mean) / 3
        var = sum(stat.var) / 3
        channel_spread = max(stat.mean) - min(stat.mean)
        candidates.append(((channel_spread, var, mean), p.name))
    except Exception:
        continue

candidates.sort(key=lambda x: (x[0][0], x[0][1], -x[0][2]))
for score, name in candidates[:25]:
    print(name, score)
