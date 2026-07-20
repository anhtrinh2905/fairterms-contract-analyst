#!/usr/bin/env python3
"""
Chuyển báo cáo OWASP ZAP baseline (JSON) sang SARIF 2.1.0 để upload lên
GitHub Security -> Code scanning (giống Semgrep).

ZAP không xuất SARIF sẵn; script này tự dựng cấu trúc SARIF tối thiểu mà
GitHub chấp nhận: mỗi ZAP alert -> 1 rule, mỗi URL dính lỗi -> 1 result.

Cách dùng:
    python security/zap_to_sarif.py --input zap.json --output zap.sarif
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

# riskcode ZAP -> (level SARIF, security-severity dạng số GitHub dùng để xếp hạng)
RISK_MAP = {
    "3": ("error", "8.0"),    # High
    "2": ("warning", "5.0"),  # Medium
    "1": ("note", "3.0"),     # Low
    "0": ("note", "1.0"),     # Informational
}

_TAGS = re.compile(r"<[^>]+>")
_SCHEME = re.compile(r"^[a-zA-Z][a-zA-Z0-9+.-]*://")


def strip_html(text: str) -> str:
    return _TAGS.sub("", text or "").strip()


def to_relative_uri(url: str) -> str:
    """GitHub code scanning bắt uri phải TƯƠNG ĐỐI (không có scheme http/https).

    DAST định vị theo URL nên bỏ scheme, đặt dưới prefix 'zap/' để nhìn biết
    ngay là kết quả DAST, không nhầm với file code thật trong repo.
    """
    path = _SCHEME.sub("", url or "unknown").strip("/") or "root"
    return f"zap/{path}"


def convert(data: dict) -> dict:
    rules: dict[str, dict] = {}   # pluginid -> rule (khử trùng)
    results: list[dict] = []

    for site in data.get("site", []):
        for alert in site.get("alerts", []):
            plugin_id = str(alert.get("pluginid") or "zap")
            name = alert.get("alert") or alert.get("name") or plugin_id
            level, sev = RISK_MAP.get(str(alert.get("riskcode")), ("note", "1.0"))

            # đăng ký rule (1 lần / pluginid)
            if plugin_id not in rules:
                rules[plugin_id] = {
                    "id": plugin_id,
                    "name": name,
                    "shortDescription": {"text": name},
                    "fullDescription": {"text": strip_html(alert.get("desc"))[:1000] or name},
                    "helpUri": (alert.get("reference") or "").split("\n")[0] or "https://www.zaproxy.org",
                    "properties": {"security-severity": sev},
                }

            # mỗi URL dính lỗi -> 1 result
            for inst in (alert.get("instances") or [{}]):
                url = inst.get("uri") or site.get("@name") or "unknown"
                method = inst.get("method", "")
                # giữ URL đầy đủ trong message (uri location phải tương đối)
                msg = (f"[{method} {url}] {name}: "
                       f"{strip_html(alert.get('desc'))[:300]}")
                results.append({
                    "ruleId": plugin_id,
                    "level": level,
                    "message": {"text": msg},
                    "locations": [{
                        "physicalLocation": {
                            "artifactLocation": {"uri": to_relative_uri(url)},
                            "region": {"startLine": 1},
                        }
                    }],
                })

    return {
        "$schema": "https://json.schemastore.org/sarif-2.1.0.json",
        "version": "2.1.0",
        "runs": [{
            "tool": {"driver": {
                "name": "OWASP ZAP",
                "informationUri": "https://www.zaproxy.org",
                "rules": list(rules.values()),
            }},
            "results": results,
        }],
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="ZAP JSON -> SARIF converter.")
    ap.add_argument("--input", required=True)
    ap.add_argument("--output", required=True)
    args = ap.parse_args()

    src = Path(args.input)
    if not src.is_file():
        print(f"ERROR: không thấy file {src}", file=sys.stderr)
        return 2

    sarif = convert(json.loads(src.read_text(encoding="utf-8")))
    Path(args.output).write_text(json.dumps(sarif, ensure_ascii=False, indent=2),
                                 encoding="utf-8")
    n = len(sarif["runs"][0]["results"])
    r = len(sarif["runs"][0]["tool"]["driver"]["rules"])
    print(f"Đã ghi {args.output}: {n} results / {r} rules.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
