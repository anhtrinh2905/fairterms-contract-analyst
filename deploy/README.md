# Deploy — FairTerms CI/CD

Domain: **fairterms.xyz** (Namecheap) · Server (AWS EC2, ap-southeast-1): `52.77.14.171`

## Subdomains

| Host | Stack | Container port |
|------|-------|----------------|
| `dev.fairterms.xyz` | frontend dev | 3000 |
| `api-dev.fairterms.xyz` | backend dev | 8000 |
| `fairterms.xyz` | frontend main | 3001 |
| `api.fairterms.xyz` | backend main | 8001 |

## PostgreSQL (self-hosted, one container on the VM)

Postgres runs as a **single container on the same VM** as the app (no Cloud SQL),
shared by both stacks with **two databases**: `fairterms_dev` and `fairterms_main`.

Defined in **`docker-compose.db.yml`** — it owns the DB and exposes an external
Docker network `fairterms-db-net` that both app stacks join. App containers reach
it as host **`postgres:5432`** (the frontend entrypoint rewrites `127.0.0.1` → `postgres`).
The port is **not** published to the host — the DB is reachable only from
containers on `fairterms-db-net`.

Start it **before** the app stacks:

```bash
cd ~/fairterms/deploy
cp .env.db.example .env.db   # set a strong POSTGRES_PASSWORD
docker compose -f docker-compose.db.yml up -d
```

- `POSTGRES_USER` / `POSTGRES_PASSWORD` in `.env.db` **must match** the
  `user:password` embedded in `DATABASE_URL` of `.env.dev` (db `fairterms_dev`)
  and `.env.main` (db `fairterms_main`).
- Data persists in the `pgdata` Docker volume.
- Cloud SQL is no longer used — you may **remove `roles/cloudsql.client`** from the
  VM service account.

**Migrating existing Cloud SQL data (one-time):** after the DB container is up but
before cutting the app over, run `bash deploy/migrate-cloudsql-to-local.sh`
(configure `SRC_USER` / `SRC_PASSWORD` and the `DB_MAP` inside). Verify row counts
before switching.

**Backups (replaces Cloud SQL automated backups):** schedule `deploy/backup-postgres.sh`
via cron on the VM (example inside the script — daily `pg_dump` with retention).

## AWS Security Group

Security Group của EC2 instance chỉ cần 3 inbound rule:

- **SSH** — TCP 22 → source **My IP** (không mở `0.0.0.0/0`)
- **HTTP** — TCP 80 → source `0.0.0.0/0` (certbot + redirect 80→443)
- **HTTPS** — TCP 443 → source `0.0.0.0/0`

Các port ứng dụng (3000/3001, 8000/8001) **không** mở ra internet — nginx trên
host reverse-proxy qua 443, các stack truy cập nội bộ qua Docker network.

## DNS

Xem **[DNS.md](./DNS.md)** — thêm A records tại **Namecheap** (Advanced DNS) trỏ 5 host
(`@`, `www`, `dev`, `api-dev`, `api`) về Elastic IP EC2. Dùng BasicDNS, không cần đổi nameserver.

## GitHub Secrets

| Secret | Value |
|--------|-------|
| `SSH_HOST` | `52.77.14.171` |
| `SSH_USER` | `fairterms-deploy` |
| `SSH_PRIVATE_KEY` | Contents of `deploy/ssh/fairterms-deploy` |
| `DEV_ENV_FILE` | Full contents of `deploy/.env.dev` (see `.env.dev.example`) |
| `MAIN_ENV_FILE` | Full contents of `deploy/.env.main` (see `.env.main.example`) |
| `DB_ENV_FILE` | Full contents of `deploy/.env.db` (see `.env.db.example`) — `POSTGRES_USER`/`POSTGRES_PASSWORD` for the shared Postgres |

**`DATABASE_URL` in secrets** — host stays `127.0.0.1` (entrypoint rewrites to
`postgres`); use the per-stack database name and credentials matching `.env.db`:

```env
# DEV_ENV_FILE
DATABASE_URL=postgresql://USER:PASSWORD@127.0.0.1:5432/fairterms_dev?schema=public
# MAIN_ENV_FILE
DATABASE_URL=postgresql://USER:PASSWORD@127.0.0.1:5432/fairterms_main?schema=public
```

Also set `NEXT_PUBLIC_BACKEND_URL` (not `NEXT_PUBLIC_API_URL`) to the public API URL for each stack.

Images push lên **GHCR** dùng `GITHUB_TOKEN` tự động — không cần Docker Hub token.

Sau lần push đầu: GitHub → Packages → `fairterms` → **Change visibility → Public** (để server pull không cần login).

## CI/CD flow

```
push dev  → test → build *-dev images → push GHCR → SSH deploy → health check
push main → test → build *-main images → push GHCR → SSH deploy → health check
```

Deploy script starts the `docker-compose.db.yml` Postgres stack before pulling app containers so migrations can reach the database.

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
docker compose -f docker-compose.db.yml up -d      # shared Postgres (idempotent)
docker compose -f docker-compose.dev.yml pull
docker compose -f docker-compose.dev.yml up -d
```

Backend Docker image ships **LibreOffice** (`LIBREOFFICE_BINARY=/usr/bin/soffice`) so legacy `.doc` uploads work after rebuild/push.
