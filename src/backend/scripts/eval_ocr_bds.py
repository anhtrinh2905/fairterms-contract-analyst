"""Offline OCR evaluation for BĐS contracts (developer tool).

Add annotated samples under tests/golden/ocr_bds/:
  sample.pdf
  sample.critical_fields.json  # optional expected fields

Run:
  cd src/backend
  uv run python scripts/eval_ocr_bds.py --dir tests/golden/ocr_bds
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

MIME_BY_EXT = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
}


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate OCR on BĐS contract samples")
    parser.add_argument("--dir", type=Path, required=True, help="Directory with contract files")
    parser.add_argument("--out", type=Path, default=None, help="Write JSON report here")
    args = parser.parse_args()

    sample_dir: Path = args.dir
    if not sample_dir.is_dir():
        raise SystemExit(f"Directory not found: {sample_dir}")

    from app.services.contract_local_structuring import parse_contract_info
    from app.services.contract_kind import detect_contract_kind
    from app.services.gemini_ocr_service import get_gemini_ocr_service

    ocr = get_gemini_ocr_service()
    reports: list[dict] = []

    for path in sorted(sample_dir.iterdir()):
        if path.suffix.lower() not in MIME_BY_EXT:
            continue
        print(f"Processing {path.name}...")
        file_bytes = path.read_bytes()
        result = ocr.process_contract(
            file_bytes=file_bytes,
            source_filename=path.name,
            content_type=MIME_BY_EXT[path.suffix.lower()],
        )
        info = parse_contract_info(result.markdown)
        detection = detect_contract_kind(text=result.markdown[:4000], filename=path.name)
        expected_path = path.with_suffix(".critical_fields.json")
        expected = {}
        if expected_path.is_file():
            expected = json.loads(expected_path.read_text(encoding="utf-8"))

        reports.append(
            {
                "file": path.name,
                "detected_kind": detection.kind.value,
                "detection_confidence": detection.confidence,
                "timings_ms": result.timings_ms,
                "extracted": info.model_dump(),
                "expected": expected,
                "markdown_chars": len(result.markdown),
            }
        )

    if not reports:
        print("No supported contract files found. Add PDF/DOCX/PNG samples to the directory.")
        return

    out_path = args.out or (sample_dir / "last_eval_report.json")
    out_path.write_text(json.dumps(reports, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote report: {out_path} ({len(reports)} files)")


if __name__ == "__main__":
    main()
