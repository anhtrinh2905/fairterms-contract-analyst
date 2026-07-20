# Week 1 — SAST/CI-CD Integration & Data Lake

Báo cáo tóm tắt phần đã hoàn thành: tích hợp **SAST (Semgrep)** vào CI/CD và
gom kết quả quét vào **PostgreSQL** (data lake thống nhất).

## 1. Mục tiêu

- Quét tĩnh mã nguồn (Python backend + Next.js/TS frontend) tìm lỗ hổng bảo mật.
- Tự động chạy scan trong CI/CD (GitHub Actions), tool chạy trong Docker.
- Gom output JSON thô về một bảng DB duy nhất để phân tích/báo cáo.

## 2. Thành phần đã làm

| File | Vai trò |
|------|---------|
| `.github/workflows/sast-semgrep.yml` | Workflow CI: chạy Semgrep trong container, xuất SARIF + JSON, upload lên tab Security + artifact |
| `security/load_findings.py` | Đọc `semgrep.json` → đẩy vào bảng `security_findings` (Postgres) |
| Bảng `security_findings` | Data lake: 1 bảng cho nhiều tool (cột `tool`), giữ finding gốc ở JSONB `raw`, khử trùng lặp bằng `fingerprint` |

## 3. Kết quả (lần quét gần nhất)

- Quét **326 files**, chạy **509 rules**.
- Tìm **23 findings**: **1 HIGH**, **11 MEDIUM**, **11 LOW**.
- Lỗi HIGH: `subprocess-shell-true` tại `scripts/log_hook.py:18`.

## 4. Lệnh chạy

### 4.1. Quét thử ở máy (Docker local)

```bash
# Từ thư mục gốc project
docker run --rm -v "${PWD}:/src" semgrep/semgrep \
  semgrep scan --config=auto --json --output=/src/semgrep.json /src
```

### 4.2. CI tự chạy

Push code lên branch `main`/`dev` hoặc mở PR → workflow `SAST - Semgrep` tự chạy.
Xem kết quả:
- **Security → Code scanning** (đổi bộ lọc `Branch` cho đúng branch đang chạy).
- **Actions → job semgrep → Artifacts** → tải `semgrep-results` (chứa `semgrep.json`).

### 4.3. Đẩy findings vào Postgres (data lake)

```bash
pip install "psycopg[binary]"

export DATABASE_URL="postgresql://fairterms:PASSWORD@localhost:5432/fairterms_dev"
python security/load_findings.py \
  --tool semgrep --input semgrep.json \
  --scan-ref "$(git rev-parse --short HEAD)"
```

Chạy lại nhiều lần an toàn: trùng fingerprint sẽ bị bỏ qua (không nhân bản).

### 4.4. Xem dữ liệu bằng dashboard web (Adminer)

```bash
# Postgres tạm để thử (port 55432) — dùng biến môi trường cho password
export PGPW="$(python3 -c 'import secrets;print(secrets.token_hex(8))')"
docker network create ft-sec-net
docker run -d --name ft-sec-pg --network ft-sec-net \
  -e POSTGRES_USER=fairterms -e "POSTGRES_PASSWORD=$PGPW" -e POSTGRES_DB=fairterms_dev \
  -p 55432:5432 postgres:16-alpine

# Adminer (dashboard) tại http://localhost:8090
docker run -d --name ft-sec-adminer --network ft-sec-net -p 8090:8080 adminer:latest

# Nạp dữ liệu
export DATABASE_URL="postgresql://fairterms:$PGPW@localhost:55432/fairterms_dev"
python security/load_findings.py --tool semgrep --input semgrep.json --scan-ref local

echo "Password Adminer: $PGPW"   # đăng nhập: System=PostgreSQL, Server=ft-sec-pg, DB=fairterms_dev
```

Dọn dẹp khi xong:

```bash
docker rm -f ft-sec-pg ft-sec-adminer && docker network rm ft-sec-net
```

## 5. Truy vấn báo cáo mẫu

```sql
-- Đếm theo mức độ
SELECT severity, COUNT(*) FROM security_findings GROUP BY severity ORDER BY 2 DESC;

-- Top file nhiều lỗi nhất
SELECT file_path, COUNT(*) AS n FROM security_findings
GROUP BY file_path ORDER BY n DESC LIMIT 10;

-- Chi tiết lỗi HIGH
SELECT rule_id, file_path, start_line, message
FROM security_findings WHERE severity = 'HIGH';
```

## 6. Bước tiếp theo (chưa làm)

- Nối loader vào CI để tự đẩy vào DB thật (self-hosted runner / artifact + cron).
- Thêm **DAST (OWASP ZAP)** quét app đang chạy, viết `parse_zap()` cho cùng bảng.
- Siết pipeline: fail khi có lỗi HIGH/CRITICAL.
