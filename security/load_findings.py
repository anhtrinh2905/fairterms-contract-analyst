#!/usr/bin/env python3
"""
Data-lake loader cho Week 1 (SAST/DAST).

Đọc file kết quả quét (hiện hỗ trợ Semgrep JSON) và đẩy từng lỗ hổng vào
PostgreSQL, gom về một bảng thống nhất `security_findings`. Bảng được thiết kế
tổng quát (cột `tool`) để sau này chứa thêm kết quả DAST (OWASP ZAP), v.v.

Cách dùng:
    export DATABASE_URL="postgresql://fairterms:PASSWORD@localhost:5432/fairterms_dev"
    python security/load_findings.py --tool semgrep --input semgrep.json \
        --scan-ref "$(git rev-parse --short HEAD)"

Phụ thuộc:
    pip install "psycopg[binary]"
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from pathlib import Path

import psycopg  # psycopg 3


# --- SQL: tạo bảng nếu chưa có ------------------------------------------------
# JSONB `raw` giữ nguyên finding gốc để không mất thông tin (data-lake style).
# UNIQUE (fingerprint) + ON CONFLICT DO NOTHING => chạy lại không tạo bản trùng.
CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS security_findings (
    id           BIGSERIAL PRIMARY KEY,
    tool         TEXT        NOT NULL,          -- 'semgrep', 'zap', ...
    rule_id      TEXT,                          -- check_id / rule
    severity     TEXT,                          -- ERROR/WARNING/INFO -> HIGH/...
    title        TEXT,
    message      TEXT,
    file_path    TEXT,
    start_line   INTEGER,
    end_line     INTEGER,
    scan_ref     TEXT,                          -- git commit / branch / run id
    fingerprint  TEXT        NOT NULL,          -- khử trùng lặp
    raw          JSONB       NOT NULL,          -- finding gốc, đầy đủ
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (fingerprint)
);
"""

INSERT_SQL = """
INSERT INTO security_findings
    (tool, rule_id, severity, title, message,
     file_path, start_line, end_line, scan_ref, fingerprint, raw)
VALUES
    (%(tool)s, %(rule_id)s, %(severity)s, %(title)s, %(message)s,
     %(file_path)s, %(start_line)s, %(end_line)s, %(scan_ref)s,
     %(fingerprint)s, %(raw)s)
ON CONFLICT (fingerprint) DO NOTHING;
"""

# Map mức độ Semgrep sang thang chung (dễ báo cáo/lọc).
SEVERITY_MAP = {"ERROR": "HIGH", "WARNING": "MEDIUM", "INFO": "LOW"}


def parse_semgrep(data: dict, scan_ref: str) -> list[dict]:
    """Chuyển Semgrep JSON -> list bản ghi sẵn sàng insert."""
    rows: list[dict] = []
    for r in data.get("results", []):
        extra = r.get("extra", {}) or {}
        start = r.get("start", {}) or {}
        end = r.get("end", {}) or {}
        rule_id = r.get("check_id")
        file_path = r.get("path")
        start_line = start.get("line")
        raw_sev = (extra.get("severity") or "").upper()

        # fingerprint = định danh ổn định của 1 lỗi -> chạy lại không trùng.
        # KHÔNG dùng extra.fingerprint: bản Semgrep CLI miễn phí (chưa login)
        # trả về "requires login" cho MỌI finding => tất cả sẽ gộp làm 1.
        # Tự băm từ rule + file + vị trí (dòng/cột) để mỗi lỗi là duy nhất.
        fp_seed = "|".join(str(x) for x in (
            rule_id, file_path,
            start_line, start.get("col"),
            end.get("line"), end.get("col"),
        ))
        fp = "semgrep:" + hashlib.sha256(fp_seed.encode()).hexdigest()[:16]

        rows.append({
            "tool": "semgrep",
            "rule_id": rule_id,
            "severity": SEVERITY_MAP.get(raw_sev, raw_sev or None),
            "title": (rule_id or "").split(".")[-1] or None,
            "message": extra.get("message"),
            "file_path": file_path,
            "start_line": start_line,
            "end_line": end.get("line"),
            "scan_ref": scan_ref,
            "fingerprint": fp,
            "raw": json.dumps(r, ensure_ascii=False),
        })
    return rows


PARSERS = {"semgrep": parse_semgrep}


def main() -> int:
    ap = argparse.ArgumentParser(description="Load scan findings into Postgres.")
    ap.add_argument("--tool", choices=PARSERS.keys(), default="semgrep",
                    help="Loại tool đã tạo file (mặc định: semgrep)")
    ap.add_argument("--input", required=True, help="Đường dẫn file JSON kết quả")
    ap.add_argument("--scan-ref", default="local",
                    help="Nhãn cho lần quét (git SHA / branch / run id)")
    ap.add_argument("--database-url", default=os.environ.get("DATABASE_URL"),
                    help="Chuỗi kết nối Postgres (mặc định lấy từ $DATABASE_URL)")
    args = ap.parse_args()

    if not args.database_url:
        print("ERROR: thiếu DATABASE_URL (đặt env hoặc --database-url).",
              file=sys.stderr)
        return 2

    path = Path(args.input)
    if not path.is_file():
        print(f"ERROR: không tìm thấy file: {path}", file=sys.stderr)
        return 2

    data = json.loads(path.read_text(encoding="utf-8"))
    rows = PARSERS[args.tool](data, args.scan_ref)
    print(f"Đã đọc {len(rows)} findings từ {path} (tool={args.tool}).")

    with psycopg.connect(args.database_url) as conn:
        with conn.cursor() as cur:
            cur.execute(CREATE_TABLE_SQL)
            inserted = 0
            for row in rows:
                cur.execute(INSERT_SQL, row)
                inserted += cur.rowcount  # 1 nếu insert mới, 0 nếu đã tồn tại
        conn.commit()

    print(f"Đã ghi {inserted} findings MỚI vào bảng security_findings "
          f"(bỏ qua {len(rows) - inserted} bản trùng).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
