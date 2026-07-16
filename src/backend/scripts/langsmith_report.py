"""Aggregate LangSmith traces for latency/cost reporting.

Usage (from src/backend):
  uv run python scripts/langsmith_report.py
  uv run python scripts/langsmith_report.py --hours 6
"""

from __future__ import annotations

import argparse
import statistics
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parents[3]
load_dotenv(REPO_ROOT / ".env")


def _percentile(values: list[float], p: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    idx = (len(ordered) - 1) * p
    lo = int(idx)
    hi = min(lo + 1, len(ordered) - 1)
    if lo == hi:
        return ordered[lo]
    return ordered[lo] + (ordered[hi] - ordered[lo]) * (idx - lo)


def main() -> None:
    parser = argparse.ArgumentParser(description="LangSmith latency/cost report")
    parser.add_argument("--hours", type=int, default=24, help="Look back window")
    parser.add_argument("--project", default=None, help="LangSmith project name")
    args = parser.parse_args()

    import os

    api_key = os.getenv("LANGSMITH_API_KEY", "")
    if not api_key:
        raise SystemExit("LANGSMITH_API_KEY not set in repo root .env")

    from langsmith import Client

    project = args.project or os.getenv("LANGSMITH_PROJECT", "fairterms")
    since = datetime.now(timezone.utc) - timedelta(hours=args.hours)
    client = Client(api_key=api_key)

    runs = list(
        client.list_runs(
            project_name=project,
            start_time=since,
            is_root=True,
            limit=100,
        )
    )

    by_name: dict[str, list[dict]] = defaultdict(list)
    for run in runs:
        latency = float(run.latency or 0)
        tokens = int(run.total_tokens or 0)
        cost = float(run.total_cost or 0)
        by_name[run.name or "unknown"].append(
            {
                "start": run.start_time,
                "end": run.end_time,
                "latency_s": latency,
                "tokens": tokens,
                "cost": cost,
                "status": run.status,
            }
        )

    print(f"Project: {project}")
    print(f"Window: last {args.hours}h | Root runs: {len(runs)}")
    print("=" * 72)

    grand_latency = 0.0
    grand_cost = 0.0
    grand_tokens = 0

    for name in sorted(by_name, key=lambda n: (-len(by_name[n]), n)):
        items = by_name[name]
        lats = [i["latency_s"] for i in items]
        toks = [i["tokens"] for i in items]
        costs = [i["cost"] for i in items]
        starts = [i["start"] for i in items if i["start"]]
        ends = [i["end"] for i in items if i["end"]]
        wall = (max(ends) - min(starts)).total_seconds() if starts and ends else 0.0

        sum_lat = sum(lats)
        sum_cost = sum(costs)
        sum_tok = sum(toks)
        grand_latency += sum_lat
        grand_cost += sum_cost
        grand_tokens += sum_tok

        print(f"\n{name}")
        print(f"  count       : {len(items)}")
        print(f"  latency sum : {sum_lat:.2f}s")
        print(f"  latency avg : {statistics.mean(lats):.2f}s")
        print(f"  latency p50 : {_percentile(lats, 0.5):.2f}s")
        print(f"  latency p95 : {_percentile(lats, 0.95):.2f}s")
        print(f"  latency min : {min(lats):.2f}s | max: {max(lats):.2f}s")
        if len(items) > 1 and wall > 0:
            print(f"  wall-clock  : {wall:.2f}s (parallel batch)")
            print(f"  efficiency  : {sum_lat / wall:.1f}x (sum/wall)")
        print(f"  tokens total: {sum_tok:,}")
        print(f"  cost total  : ${sum_cost:.6f}")

    print("\n" + "=" * 72)
    print(f"ALL ROOT RUNS — sum latency: {grand_latency:.2f}s | tokens: {grand_tokens:,} | cost: ${grand_cost:.6f}")

    checklist = by_name.get("checklist_evaluate_clause", [])
    if checklist:
        print("\n--- Latest checklist batch (2-min window) ---")
        checklist_sorted = sorted(
            checklist,
            key=lambda x: x["start"] or datetime.min.replace(tzinfo=timezone.utc),
        )

        def bucket(t: datetime | None) -> int:
            if not t:
                return 0
            return int(t.timestamp()) // 120

        groups: list[list[dict]] = []
        current: list[dict] = []
        current_key: int | None = None
        for item in checklist_sorted:
            key = bucket(item["start"])
            if current_key is None or key == current_key:
                current.append(item)
                current_key = key
            else:
                groups.append(current)
                current = [item]
                current_key = key
        if current:
            groups.append(current)

        latest = groups[-1]
        lats = [x["latency_s"] for x in latest]
        costs = [x["cost"] for x in latest]
        toks = [x["tokens"] for x in latest]
        starts = [x["start"] for x in latest if x["start"]]
        ends = [x["end"] for x in latest if x["end"]]
        wall = (max(ends) - min(starts)).total_seconds() if starts and ends else 0.0

        print(f"  clauses     : {len(latest)}")
        print(f"  wall-clock  : {wall:.2f}s")
        print(f"  sum latency : {sum(lats):.2f}s")
        print(f"  tokens      : {sum(toks):,}")
        print(f"  cost        : ${sum(costs):.6f}")
        print(f"  avg/clause  : {statistics.mean(lats):.2f}s | ${statistics.mean(costs):.6f}")


if __name__ == "__main__":
    main()
