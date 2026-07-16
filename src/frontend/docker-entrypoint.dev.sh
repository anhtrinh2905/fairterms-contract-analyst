#!/bin/sh
set -e

cd /workspace/src/frontend

LOCK_MARKER=node_modules/.docker-seed-lock

if [ ! -d node_modules/next ]; then
  echo ">> Seeding node_modules from Docker image (no npm download)..."
  mkdir -p node_modules
  cp -a /opt/node_modules_seed/. node_modules/
  cp package-lock.json "$LOCK_MARKER"
fi

if [ ! -f "$LOCK_MARKER" ] || ! cmp -s package-lock.json "$LOCK_MARKER"; then
  echo ">> package-lock.json changed - refreshing dependencies..."
  npm ci --prefer-offline --no-audit --no-fund \
    || npm ci --no-audit --no-fund
  cp package-lock.json "$LOCK_MARKER"
fi

exec "$@"
