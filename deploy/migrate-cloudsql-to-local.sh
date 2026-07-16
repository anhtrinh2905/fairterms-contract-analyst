#!/usr/bin/env bash
# One-time data migration: Cloud SQL  ->  self-hosted Postgres container.
#
# Run this ONCE on the VM (or anywhere with access to both), BEFORE cutting the
# app stacks over to the self-hosted DB. It dumps each source database from
# Cloud SQL through a temporary cloud-sql-proxy and restores it into the new
# `postgres` container on the fairterms-db-net network.
#
# Prereqs:
#   - deploy/docker-compose.db.yml already up (docker compose -f ... up -d)
#   - cloud-sql-proxy binary available, or use the dockerized proxy (see below)
#   - The VM/service account still has roles/cloudsql.client
#
# Configure via env vars, then run:  bash deploy/migrate-cloudsql-to-local.sh
set -euo pipefail

CLOUD_SQL_INSTANCE="${CLOUD_SQL_INSTANCE:-contract-analysis-g145-vinuni:asia-southeast1:fairterms-db}"
PROXY_PORT="${PROXY_PORT:-6543}"                 # temp host port for the proxy
SRC_USER="${SRC_USER:?set SRC_USER (Cloud SQL user)}"
SRC_PASSWORD="${SRC_PASSWORD:?set SRC_PASSWORD (Cloud SQL password)}"

# Map: <source db on Cloud SQL> -> <target db in the container>
# Adjust the source names if dev/main used different Cloud SQL databases.
declare -A DB_MAP=(
  ["fairterms"]="fairterms_dev"
  # ["fairterms_main"]="fairterms_main"   # uncomment/adjust if a second source db exists
)

DEST_CONTAINER="${DEST_CONTAINER:-fairterms-db-postgres-1}"   # `docker ps` name
DEST_USER="${POSTGRES_USER:-fairterms}"

echo ">> starting temporary cloud-sql-proxy on 127.0.0.1:${PROXY_PORT}"
cloud-sql-proxy "$CLOUD_SQL_INSTANCE" --address 127.0.0.1 --port "$PROXY_PORT" &
PROXY_PID=$!
trap 'kill "$PROXY_PID" 2>/dev/null || true' EXIT
sleep 6

for src in "${!DB_MAP[@]}"; do
  dest="${DB_MAP[$src]}"
  dump="/tmp/${src}.dump"
  echo ">> dumping ${src} from Cloud SQL -> ${dump}"
  PGPASSWORD="$SRC_PASSWORD" pg_dump -Fc \
    -h 127.0.0.1 -p "$PROXY_PORT" -U "$SRC_USER" -d "$src" -f "$dump"

  echo ">> restoring ${dump} -> container ${DEST_CONTAINER} db ${dest}"
  docker exec -i "$DEST_CONTAINER" \
    pg_restore --clean --if-exists --no-owner --role="$DEST_USER" \
    -U "$DEST_USER" -d "$dest" < "$dump"

  echo ">> done ${src} -> ${dest}"
done

echo ">> migration complete. Verify row counts before cutting over the app stacks."
