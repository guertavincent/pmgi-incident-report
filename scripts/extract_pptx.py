import json
import os
from pathlib import Path
from pptx import Presentation

PPTX_PATH = Path(r"c:\Users\PMGO170326C\Documents\PMGI INCIDENT REPORT SYSTEM\pmgi-incident-report\PMGI-OPS-GL-01 - Houskeeping Training Guidelines rev.1.pptx")
OUTPUT_DIR = Path(r"c:\Users\PMGO170326C\Documents\PMGI INCIDENT REPORT SYSTEM\pmgi-incident-report\public\housekeeping-guidelines")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

prs = Presentation(str(PPTX_PATH))
slides_data = []

for s_idx, slide in enumerate(prs.slides, start=1):
    slide_entry = {
        "index": s_idx,
        "texts": [],
        "images": [],
    }
    image_counter = 0

    for shape in slide.shapes:
        if hasattr(shape, "text"):
            text = shape.text.strip()
            if text:
                slide_entry["texts"].append(text)

        if shape.shape_type == 13:  # PICTURE
            image_counter += 1
            image = shape.image
            ext = image.ext or "bin"
            image_name = f"slide-{s_idx:02d}-img-{image_counter:02d}.{ext}"
            image_path = OUTPUT_DIR / image_name
            with open(image_path, "wb") as f:
                f.write(image.blob)
            slide_entry["images"].append(f"/housekeeping-guidelines/{image_name}")

    slides_data.append(slide_entry)

json_path = OUTPUT_DIR / "slides.json"
with open(json_path, "w", encoding="utf-8") as f:
    json.dump(slides_data, f, indent=2)

print(f"Extracted {len(slides_data)} slides to {OUTPUT_DIR}")
