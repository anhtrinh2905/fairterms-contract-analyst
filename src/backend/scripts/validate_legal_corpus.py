"""Validate the legal corpus in app/rag/data/ before ingestion.

Checks every ``*.md`` file (non-recursive, so ``_archive/`` is skipped):

- YAML frontmatter parses and contains the required fields.
- ``so_hieu`` is not a placeholder ("Chưa rõ", "TBD", ...).
- ``ngay_ban_hanh`` / ``ngay_hieu_luc`` are valid ISO dates.
- ``trang_thai`` is one of the known statuses.
- The body parses into at least one article (``### Điều N.``).
- No leftover OCR error markers in the body.
- Cross-reference: ``sua_doi_luat`` / ``bi_sua_doi_boi`` ids resolve to
  files present in the corpus (warning only).

Exit code is non-zero when any error is found, so this can gate CI.

Usage::

    uv run python scripts/validate_legal_corpus.py [--data-dir app/rag/data]
"""

from __future__ import annotations

import argparse
import re
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.rag.parser import _extract_frontmatter, parse_legal_markdown  # noqa: E402

REQUIRED_FIELDS = (
    "id",
    "title",
    "so_hieu",
    "ngay_ban_hanh",
    "ngay_hieu_luc",
    "co_quan_ban_hanh",
    "loai_van_ban",
    "trang_thai",
)
PLACEHOLDER_RE = re.compile(r"chưa rõ|tbd|todo|yyyy-mm-dd|n/a", re.IGNORECASE)
OCR_ERROR_RE = re.compile(r"LỖI TRANG|Error code:|insufficient_quota")
VALID_TRANG_THAI = {
    "Có hiệu lực",
    "Còn hiệu lực",
    "Chưa có hiệu lực",
    "Hết hiệu lực",
    "Hết hiệu lực một phần",
}


def _as_date(value: object) -> date | None:
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        try:
            return date.fromisoformat(value.strip())
        except ValueError:
            return None
    return None


def validate_file(path: Path, corpus_ids: set[str]) -> tuple[list[str], list[str]]:
    """Return (errors, warnings) for one markdown file."""
    errors: list[str] = []
    warnings: list[str] = []
    raw = path.read_text(encoding="utf-8")

    meta, body = _extract_frontmatter(raw)
    if not meta:
        errors.append("thiếu hoặc không parse được YAML frontmatter")
        return errors, warnings

    for field in REQUIRED_FIELDS:
        value = meta.get(field)
        if value in (None, ""):
            errors.append(f"frontmatter thiếu field bắt buộc: {field}")
        elif isinstance(value, str) and PLACEHOLDER_RE.search(value):
            errors.append(f"frontmatter field {field} là placeholder: {value!r}")

    for field in ("ngay_ban_hanh", "ngay_hieu_luc"):
        if meta.get(field) and _as_date(meta[field]) is None:
            errors.append(f"frontmatter {field} không phải ngày hợp lệ: {meta[field]!r}")

    trang_thai = meta.get("trang_thai")
    if trang_thai and trang_thai not in VALID_TRANG_THAI:
        warnings.append(
            f"trang_thai {trang_thai!r} ngoài danh sách chuẩn {sorted(VALID_TRANG_THAI)}"
        )

    if OCR_ERROR_RE.search(body):
        errors.append("thân văn bản còn marker lỗi OCR (LỖI TRANG / Error code / insufficient_quota)")

    try:
        parents, children = parse_legal_markdown(path)
    except Exception as exc:  # noqa: BLE001
        errors.append(f"parse_legal_markdown lỗi: {exc}")
        return errors, warnings

    if not parents:
        errors.append("không parse được Điều nào (kiểm tra heading ##/### theo convention)")
    elif not children:
        warnings.append("parse được Điều nhưng không có Khoản nào")

    # Article-sequence sanity: laws number articles 1..N contiguously, so gaps
    # or out-of-range numbers signal lost content or OCR-garbage headings.
    numbers = sorted(
        {
            int(m.group(1))
            for m in re.finditer(r"^### Điều (\d+)\b", body, re.MULTILINE)
        }
    )
    if numbers:
        so_dieu = meta.get("so_hieu", "")
        # Appendix/template articles (e.g. contract-form decrees) restart
        # numbering, so only warn — a human decides if the gap is real.
        expected = set(range(1, numbers[-1] + 1))
        missing = sorted(expected - set(numbers))
        if numbers[-1] > 2000:
            warnings.append(f"số điều bất thường (Điều {numbers[-1]}) — nghi heading rác OCR")
        if missing and len(missing) <= 50:
            warnings.append(
                f"thiếu {len(missing)} điều trong dãy 1..{numbers[-1]} "
                f"({so_dieu}): {missing[:15]}{'...' if len(missing) > 15 else ''}"
            )
        elif missing:
            warnings.append(
                f"thiếu {len(missing)} điều trong dãy 1..{numbers[-1]} ({so_dieu}) "
                "— văn bản có thể mất phần lớn nội dung"
            )

    for ref_field in ("sua_doi_luat", "bi_sua_doi_boi"):
        refs = meta.get(ref_field)
        if not refs:
            continue
        refs = refs if isinstance(refs, list) else [refs]
        for ref in refs:
            if ref not in corpus_ids:
                warnings.append(f"{ref_field} tham chiếu id {ref!r} không có trong corpus")

    return errors, warnings


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", default="app/rag/data", type=Path)
    args = parser.parse_args()

    files = sorted(args.data_dir.glob("*.md"))
    if not files:
        print(f"Không tìm thấy file .md nào trong {args.data_dir}", file=sys.stderr)
        return 1

    corpus_ids: set[str] = set()
    for path in files:
        meta, _ = _extract_frontmatter(path.read_text(encoding="utf-8"))
        if meta.get("id"):
            corpus_ids.add(meta["id"])

    total_errors = 0
    for path in files:
        errors, warnings = validate_file(path, corpus_ids)
        status = "OK" if not errors else "LỖI"
        print(f"[{status}] {path.name}")
        for err in errors:
            print(f"    ERROR: {err}")
        for warn in warnings:
            print(f"    WARN:  {warn}")
        total_errors += len(errors)

    print(f"\n{len(files)} file, {total_errors} lỗi.")
    return 1 if total_errors else 0


if __name__ == "__main__":
    sys.exit(main())
