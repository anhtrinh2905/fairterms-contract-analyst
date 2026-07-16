"""Offline prompt-evaluation harness.

Two modes, no HTTP server needed:

  contracts — OCR + structure + per-clause checklist evaluation + coverage for
              real contract files (pdf/docx). Results land in
              outputs/prompt_eval/<slug>/result.json.

      uv run python scripts/eval_prompts.py --mode contracts \
          --file "/path/hop_dong_thue.pdf:cho_thue_can_ho_chung_cu" \
          --file "/path/mua_ban.docx:mua_ban_can_ho_chung_cu"

  traps —     evaluate a JSONL benchmark of trap clauses against expected
              labels and print precision/recall/wrong-side metrics.

      uv run python scripts/eval_prompts.py --mode traps \
          --dataset tests/golden/trap_clauses_100.jsonl \
          --out outputs/prompt_eval/traps_report.json

Run with CHECKLIST_CACHE_ENABLED=false (the script forces it) so results always
reflect the current prompts, never the Redis cache.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import os
import re
import sys
import time
import unicodedata
from pathlib import Path

# Must be set before app.core.config is imported.
os.environ["CHECKLIST_CACHE_ENABLED"] = "false"

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_ROOT.parents[1]
DEFAULT_OUT_ROOT = REPO_ROOT / "outputs" / "prompt_eval"

MIME_BY_EXT = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".doc": "application/msword",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
}


def _slugify(name: str) -> str:
    text = unicodedata.normalize("NFKD", name)
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = re.sub(r"[^A-Za-z0-9]+", "_", text).strip("_")
    return text.lower() or "contract"


def _clause_text(clause) -> str:
    header = " ".join(p for p in (clause.article_no, clause.title) if p)
    body = "\n".join(clause.items)
    return f"{header}\n{body}".strip()


def _flags_of(verdict: dict) -> tuple[list[dict], list[dict]]:
    danh_gia = verdict.get("danh_gia") or {}
    return (
        danh_gia.get("matched_red_flags") or [],
        danh_gia.get("matched_unfair_clauses") or [],
    )


# ---------------------------------------------------------------- contracts

def run_contracts(specs: list[str], out_root: Path) -> None:
    from app.checklists.evaluator import evaluate_clause, evaluate_required_items
    from app.services.contract_structuring_service import (
        get_contract_structuring_service,
    )
    from app.services.gemini_ocr_service import get_gemini_ocr_service

    ocr = get_gemini_ocr_service()
    structurer = get_contract_structuring_service()

    for spec in specs:
        path_str, _, loai = spec.rpartition(":")
        if not path_str:
            raise SystemExit(f"--file must be <path>:<loai_hop_dong>, got: {spec}")
        path = Path(path_str).expanduser()
        if not path.is_file():
            raise SystemExit(f"File not found: {path}")

        slug = _slugify(path.stem)
        out_dir = out_root / slug
        out_dir.mkdir(parents=True, exist_ok=True)
        print(f"\n=== {path.name}  (loai={loai}) -> {out_dir}")

        started = time.perf_counter()
        ocr_result = ocr.process_contract(
            path.read_bytes(), path.name, MIME_BY_EXT.get(path.suffix.lower())
        )
        markdown = ocr_result.markdown
        (out_dir / "ocr.md").write_text(markdown, encoding="utf-8")
        extraction_method = (ocr_result.timings_ms or {}).get("extraction_method")
        print(f"  OCR ok: {len(markdown)} chars, method={extraction_method}")

        outcome = structurer.structure_contract(
            markdown, extraction_method=str(extraction_method or "")
        )
        clauses = outcome.contract.clauses
        print(f"  Structured: {len(clauses)} clauses (method={outcome.method})")

        clause_results = []
        for clause in clauses:
            text = _clause_text(clause)
            if not text or len(text) < 20:
                continue
            try:
                verdict = evaluate_clause(loai, text)
            except Exception as exc:  # keep going; record the failure
                clause_results.append(
                    {"article_no": clause.article_no, "error": str(exc)}
                )
                print(f"    {clause.article_no}: ERROR {exc}")
                continue
            red, unfair = _flags_of(verdict)
            clause_results.append(
                {
                    "article_no": clause.article_no,
                    "title": clause.title,
                    "clause_text": text,
                    "verdict": verdict,
                }
            )
            print(
                f"    {clause.article_no}: red={len(red)} unfair={len(unfair)} "
                f"risk={verdict.get('danh_gia', {}).get('muc_rui_ro_tong')}"
            )

        try:
            coverage = evaluate_required_items(loai, markdown)
            missing = [i for i in coverage["items"] if i["trang_thai"] == "thieu"]
            print(f"  Coverage: missing {len(missing)}/{len(coverage['items'])}")
        except Exception as exc:
            coverage = {"error": str(exc)}
            print(f"  Coverage ERROR: {exc}")

        elapsed = round(time.perf_counter() - started, 1)
        result = {
            "source_file": str(path),
            "loai_hop_dong": loai,
            "extraction_method": extraction_method,
            "structuring_method": outcome.method,
            "n_clauses": len(clauses),
            "elapsed_seconds": elapsed,
            "clauses": clause_results,
            "coverage": coverage,
        }
        (out_dir / "result.json").write_text(
            json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        print(f"  Done in {elapsed}s -> {out_dir / 'result.json'}")


# -------------------------------------------------------------------- traps

def _eval_one_trap(record: dict) -> dict:
    from app.checklists.evaluator import evaluate_clause

    expected = record.get("expected") or {}
    try:
        verdict = evaluate_clause(record["loai_hop_dong"], record["clause_text"])
    except Exception as exc:
        return {**record, "error": str(exc)}

    red, unfair = _flags_of(verdict)
    flagged = bool(red or unfair)
    matched_ids = [str(i.get("id")) for i in red + unfair]
    actual_type = "red_flag" if red else ("unfair" if unfair else None)

    should_flag = bool(expected.get("should_flag"))
    correct_flag = flagged == should_flag
    expected_ids = expected.get("expected_signal_ids") or []
    signal_hit = (
        any(i in matched_ids for i in expected_ids) if (should_flag and expected_ids) else None
    )
    type_match = (
        actual_type == expected.get("expected_type")
        if (should_flag and flagged and expected.get("expected_type"))
        else None
    )
    return {
        "id": record["id"],
        "trap_kind": record.get("trap_kind"),
        "loai_hop_dong": record["loai_hop_dong"],
        "should_flag": should_flag,
        "flagged": flagged,
        "correct_flag": correct_flag,
        "expected_signal_ids": expected_ids,
        "matched_ids": matched_ids,
        "signal_hit": signal_hit,
        "expected_type": expected.get("expected_type"),
        "actual_type": actual_type,
        "type_match": type_match,
        "muc_rui_ro_tong": (verdict.get("danh_gia") or {}).get("muc_rui_ro_tong"),
        "phan_tich": (verdict.get("danh_gia") or {}).get("phan_tich"),
        "danh_gia": verdict.get("danh_gia"),
    }


def run_traps(dataset: Path, out_path: Path, workers: int, limit: int | None) -> None:
    records = [
        json.loads(line)
        for line in dataset.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    if limit:
        records = records[:limit]
    print(f"Evaluating {len(records)} trap clauses with {workers} workers…")

    results: list[dict] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(_eval_one_trap, r): r["id"] for r in records}
        for i, future in enumerate(concurrent.futures.as_completed(futures), 1):
            res = future.result()
            results.append(res)
            status = "ERR" if "error" in res else ("OK " if res["correct_flag"] else "MISS")
            print(f"  [{i}/{len(records)}] {res['id']} {status}")

    results.sort(key=lambda r: r["id"])
    ok = [r for r in results if "error" not in r]
    errors = [r for r in results if "error" in r]

    positives = [r for r in ok if r["should_flag"]]
    negatives = [r for r in ok if not r["should_flag"]]
    recall = sum(r["flagged"] for r in positives) / len(positives) if positives else None
    fp_rate = sum(r["flagged"] for r in negatives) / len(negatives) if negatives else None

    by_kind: dict[str, dict] = {}
    for r in ok:
        kind = r.get("trap_kind") or "unknown"
        bucket = by_kind.setdefault(kind, {"n": 0, "correct": 0})
        bucket["n"] += 1
        bucket["correct"] += int(r["correct_flag"])
    for kind, bucket in by_kind.items():
        bucket["accuracy"] = round(bucket["correct"] / bucket["n"], 3)

    sig_evald = [r for r in ok if r["signal_hit"] is not None and r["flagged"]]
    signal_hit_rate = (
        sum(r["signal_hit"] for r in sig_evald) / len(sig_evald) if sig_evald else None
    )
    type_evald = [r for r in ok if r["type_match"] is not None]
    type_acc = (
        sum(r["type_match"] for r in type_evald) / len(type_evald) if type_evald else None
    )

    summary = {
        "total": len(records),
        "errors": len(errors),
        "flag_recall": round(recall, 3) if recall is not None else None,
        "false_positive_rate": round(fp_rate, 3) if fp_rate is not None else None,
        "signal_hit_rate_when_flagged": (
            round(signal_hit_rate, 3) if signal_hit_rate is not None else None
        ),
        "type_accuracy": round(type_acc, 3) if type_acc is not None else None,
        "by_trap_kind": by_kind,
    }
    print("\n===== SUMMARY =====")
    print(json.dumps(summary, ensure_ascii=False, indent=2))

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(
        json.dumps({"summary": summary, "results": results}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"\nReport -> {out_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mode", choices=["contracts", "traps"], required=True)
    parser.add_argument(
        "--file",
        action="append",
        default=[],
        help="contracts mode: <path>:<loai_hop_dong> (repeatable)",
    )
    parser.add_argument("--dataset", type=Path, help="traps mode: JSONL benchmark path")
    parser.add_argument("--out", type=Path, default=None, help="traps mode: report path")
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--limit", type=int, default=None, help="traps mode: cap records")
    args = parser.parse_args()

    if args.mode == "contracts":
        if not args.file:
            raise SystemExit("contracts mode needs at least one --file <path>:<loai>")
        run_contracts(args.file, DEFAULT_OUT_ROOT)
    else:
        if not args.dataset:
            raise SystemExit("traps mode needs --dataset")
        out = args.out or (DEFAULT_OUT_ROOT / "traps_report.json")
        run_traps(args.dataset, out, args.workers, args.limit)


if __name__ == "__main__":
    main()
