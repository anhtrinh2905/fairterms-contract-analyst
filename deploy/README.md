# Deploy — FairTerms CI/CD

Domain: **c2-app-145.io.vn** · Server: `35.198.241.72`

## Subdomains

| Host | Stack | Container port |
|------|-------|----------------|
| `dev.c2-app-145.io.vn` | frontend dev | 3000 |
| `api-dev.c2-app-145.io.vn` | backend dev | 8000 |
| `c2-app-145.io.vn` | frontend main | 3001 |
| `api.c2-app-145.io.vn` | backend main | 8001 |

## PostgreSQL (Cloud SQL)

Database: **`fairterms-db`** on GCP Cloud SQL (`contract-analysis-g145-vinuni:asia-southeast1:fairterms-db`).

VM deploy uses **Cloud SQL Auth Proxy** in Docker (same pattern as `docker-compose.local.yml`):

- `cloud-sql-proxy` service connects to Cloud SQL inside the Docker network.
- `DATABASE_URL` in `.env.dev` / `.env.main` uses `127.0.0.1:5432` (same as local `.env`).
- Frontend entrypoint rewrites the host to `cloud-sql-proxy` and runs `prisma migrate deploy` on startup.

**VM service account:** grant **`roles/cloudsql.client`** on the VM’s attached service account (metadata auth — no JSON key file needed on the server).

```bash
# Example (adjust SA email for your VM)
gcloud projects add-iam-policy-binding contract-analysis-g145-vinuni \
  --member="serviceAccount:YOUR_VM_SA@contract-analysis-g145-vinuni.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"
```

## GCP firewall

Đã tạo rules (project `contract-analysis-g145-vinuni`):

- `fairterms-allow-http` — TCP 80 → tag `http-server`
- `fairterms-allow-https` — TCP 443 → tag `https-server`
- `fairterms-allow-frontend` — TCP 3000 (legacy)

VM `fairterms-vm` đã có tags `http-server`, `https-server`.

## DNS

Xem **[DNS.md](./DNS.md)** — Cloud DNS zone `fairterms-zone` đã có đủ A records.  
Cần **đổi NS tại Tenten** sang Google nameservers (hoặc thêm A records thủ công tại Tenten).

## GitHub Secrets

| Secret | Value |
|--------|-------|
| `SSH_HOST` | `35.198.241.72` |
| `SSH_USER` | `fairterms-deploy` |
| `SSH_PRIVATE_KEY` | Contents of `deploy/ssh/fairterms-deploy` |
| `DEV_ENV_FILE` | Full contents of `deploy/.env.dev` (see `.env.dev.example`) |
| `MAIN_ENV_FILE` | Full contents of `deploy/.env.main` (see `.env.main.example`) |

**`DATABASE_URL` in secrets** — same format as local:

```env
DATABASE_URL=postgresql://USER:PASSWORD@127.0.0.1:5432/fairterms?schema=public
```

Also set `NEXT_PUBLIC_BACKEND_URL` (not `NEXT_PUBLIC_API_URL`) to the public API URL for each stack.

Images push lên **GHCR** dùng `GITHUB_TOKEN` tự động — không cần Docker Hub token.

Sau lần push đầu: GitHub → Packages → `fairterms` → **Change visibility → Public** (để server pull không cần login).

## CI/CD flow

```
push dev  → test → build *-dev images → push GHCR → SSH deploy → health check
push main → test → build *-main images → push GHCR → SSH deploy → health check
```

Deploy script starts `cloud-sql-proxy` before pulling app containers so migrations can reach the database.

**OCR uploads (PDF / multi-image):** nginx default `client_max_body_size` is 1m — too small for scanned contracts. API blocks in `nginx/fairterms.conf` use **55m** (backend `GEMINI_MAX_UPLOAD_MB=50`). After certbot rewrites the site to HTTPS, run once (or on every deploy via CI):

```bash
sudo bash ~/fairterms/deploy/patch-nginx-upload-limits.sh
```

## One-time server setup

```bash
ssh -F deploy/ssh/config fairterms
# After first CI deploy uploads files to ~/fairterms/deploy:
sudo bash ~/fairterms/deploy/setup-server.sh
sudo bash ~/fairterms/deploy/setup-ssl.sh   # after DNS propagates
```

## Manual deploy (dev)

```bash
cd ~/fairterms/deploy
docker compose -f docker-compose.dev.yml up -d cloud-sql-proxy
sleep 8
docker compose -f docker-compose.dev.yml pull
docker compose -f docker-compose.dev.yml up -d
```

Backend Docker image ships **LibreOffice** (`LIBREOFFICE_BINARY=/usr/bin/soffice`) so legacy `.doc` uploads work after rebuild/push.
