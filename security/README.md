# Week 1 — SAST/DAST CI-CD Integration & Data Lake

Báo cáo tóm tắt phần đã hoàn thành: tích hợp **SAST (Semgrep)** + **DAST (OWASP
ZAP)** vào CI/CD và gom kết quả quét vào **PostgreSQL** (data lake thống nhất).

## 1. Mục tiêu

- Quét tĩnh mã nguồn (Python backend + Next.js/TS frontend) tìm lỗ hổng bảo mật.
- Tự động chạy scan trong CI/CD (GitHub Actions), tool chạy trong Docker.
- Gom output JSON thô về một bảng DB duy nhất để phân tích/báo cáo.

## 2. Thành phần đã làm

| File | Vai trò |
|------|---------|
| `.github/workflows/sast-semgrep.yml` | Workflow CI SAST: chạy Semgrep trong container, xuất SARIF + JSON, upload lên tab Security + artifact |
| `.github/workflows/dast-zap.yml` | Workflow CI DAST: chạy OWASP ZAP baseline quét site staging đang chạy, xuất JSON + artifact |
| `security/load_findings.py` | Đọc `semgrep.json` / `zap.json` → đẩy vào bảng `security_findings` (Postgres). `--tool semgrep|zap` |
| `security/zap_to_sarif.py` | Convert ZAP JSON → SARIF để DAST hiện ở tab Security (ZAP không xuất SARIF sẵn) |
| Bảng `security_findings` | Data lake: 1 bảng cho nhiều tool (cột `tool`), giữ finding gốc ở JSONB `raw`, khử trùng lặp bằng `fingerprint` |

**Trong CI (tự động):** cả 2 workflow đều: (1) upload SARIF lên **Security → Code scanning**
(Semgrep category mặc định, ZAP category `zap-dast`), (2) upload artifact JSON,
(3) nạp vào Postgres nếu có secret `DATABASE_URL` (xem mục 6).

## 3. Kết quả (lần quét gần nhất)

**SAST (Semgrep)** — quét **326 files** / **509 rules**:
- **23 findings**: 1 HIGH, 11 MEDIUM, 11 LOW.
- Lỗi HIGH: `subprocess-shell-true` tại `scripts/log_hook.py:18`.

**DAST (OWASP ZAP)** — quét `dev.fairterms.xyz`:
- **11 loại cảnh báo** → **58 dòng** (mỗi URL bị dính là 1 dòng): 10 MEDIUM, 34 LOW, 14 INFO.
- Nổi bật (MEDIUM): thiếu **Content Security Policy**, thiếu **Anti-clickjacking header**.
- LOW: lộ thông tin server (`X-Powered-By`, `Server`), thiếu `X-Content-Type-Options`, `Strict-Transport-Security`.

Data lake tổng cộng: **81 findings** từ 2 tool trong 1 bảng.

## 4. Lệnh chạy

### 4.1. Quét thử ở máy (Docker local)

```bash
# Từ thư mục gốc project
docker run --rm -v "${PWD}:/src" semgrep/semgrep \
  semgrep scan --config=auto --json --output=/src/semgrep.json /src
```

### 4.1b. Quét DAST thử ở máy (OWASP ZAP)

```bash
# Quét site đang chạy (chỉ quét site của mình!)
docker run --rm -v "${PWD}:/zap/wrk:rw" -t zaproxy/zap-stable \
  zap-baseline.py -t https://dev.fairterms.xyz -J zap.json -m 2

# Nạp vào cùng bảng data lake
python security/load_findings.py --tool zap --input zap.json \
  --scan-ref "dast-$(git rev-parse --short HEAD)"
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

## 6. Tự động nạp DB trong CI (secret `DATABASE_URL`)

Cả 2 workflow có bước **"Load findings into data lake"**: chỉ chạy khi repo có
secret `DATABASE_URL`, nếu không có thì tự bỏ qua (không làm fail pipeline).

Đặt secret:

```bash
# DB phải TỚI ĐƯỢC từ runner. Ví dụ Postgres cloud (Neon/Supabase) hoặc VM có mở port.
gh secret set DATABASE_URL --body "postgresql://user:pass@host:5432/dbname"
```

Chọn nơi chạy runner tùy DB nằm đâu:

| DB nằm ở đâu | Cấu hình |
|-------------|----------|
| Postgres cloud / VM có publish port | Giữ `runs-on: ubuntu-latest`, đặt secret `DATABASE_URL` là xong |
| **DB riêng trên VM** (chỉ trong mạng `fairterms-db-net`, không mở port) | Cài **self-hosted runner** trên VM, đổi `runs-on: self-hosted`, dùng host `postgres:5432` |

> GitHub-hosted runner KHÔNG với tới được `deploy/docker-compose.db.yml` hiện tại
> (port không publish) → phải chọn 1 trong 2 cách trên.

## 7. Bước tiếp theo (chưa làm)

- Cài self-hosted runner trên VM để nạp thẳng vào DB thật (persistent lake).
- Siết pipeline: `fail_action: true` / bỏ `|| true` để chặn khi có lỗi HIGH/CRITICAL.
- Phân tích attack surface thủ công (mục cuối của đề Week 1).
