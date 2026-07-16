#!/bin/sh
set -e

if [ -n "${DATABASE_URL:-}" ]; then
  export DATABASE_URL
  # Rewrite loopback host → the self-hosted `postgres` service on the Docker
  # network (shared fairterms-db-net on the VM, or the local `postgres` service).
  DATABASE_URL="$(printf '%s' "$DATABASE_URL" | sed -E \
    -e 's/@(127\.0\.0\.1|localhost|172\.17\.0\.1):[0-9]+/@postgres:5432/')"
  export DATABASE_URL
fi

if [ "${SKIP_MIGRATE:-0}" != "1" ] && [ -d ./prisma/migrations ]; then
  # The DB lives in a separate compose project (docker-compose.db.yml) that this
  # stack cannot depends_on, so retry until Postgres accepts connections.
  echo ">> prisma migrate deploy"
  attempt=1
  max_attempts="${MIGRATE_MAX_ATTEMPTS:-30}"
  until prisma migrate deploy --config ./prisma.config.deploy.mjs; do
    if [ "$attempt" -ge "$max_attempts" ]; then
      echo "!! prisma migrate deploy failed after ${attempt} attempts"
      exit 1
    fi
    echo ">> migrate attempt ${attempt}/${max_attempts} failed (DB not ready?), retrying in 2s"
    attempt=$((attempt + 1))
    sleep 2
  done
fi

exec "$@"
