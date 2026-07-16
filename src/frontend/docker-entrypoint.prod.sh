#!/bin/sh
set -e

if [ -n "${DATABASE_URL:-}" ]; then
  export DATABASE_URL
  DATABASE_URL="$(printf '%s' "$DATABASE_URL" | sed -E \
    -e 's/@(127\.0\.0\.1|localhost|172\.17\.0\.1):[0-9]+/@cloud-sql-proxy:5432/')"
  export DATABASE_URL
fi

if [ "${SKIP_MIGRATE:-0}" != "1" ] && [ -d ./prisma/migrations ]; then
  echo ">> prisma migrate deploy"
  if ! prisma migrate deploy --config ./prisma.config.deploy.mjs; then
    echo "!! prisma migrate deploy failed"
    exit 1
  fi
fi

exec "$@"
