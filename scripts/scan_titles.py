import json
import re
from pathlib import Path

p = Path("public/housekeeping-guidelines/slides.json")
slides = json.loads(p.read_text(encoding="utf-8"))


def clean_text(t: str) -> str:
    return re.sub(r"\s+", " ", t).strip()


candidates = []
for s in slides:
    texts = [clean_text(t) for t in s["texts"] if "Page " not in t]
    if not texts:
        continue
    for t in texts:
        if len(t) <= 60 and t.upper() == t:
            candidates.append((s["index"], t))
            break

for idx, t in candidates:
    print(idx, t)
