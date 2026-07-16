#!/usr/bin/env bash
# Build all 4 images: backend/frontend × dev/main tags
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEPLOY="$ROOT/deploy"

build_backend() {
  local tag="$1"
  docker build -t "fairterms-backend:${tag}" "$ROOT/src/backend"
}

build_frontend() {
  local tag="$1"
  local api_url="$2"
  docker build \
    --build-arg "NEXT_PUBLIC_BACKEND_URL=${api_url}" \
    -t "fairterms-frontend:${tag}" \
    "$ROOT/src/frontend"
}

# Load API URLs from env files when present
DEV_API_URL="${NEXT_PUBLIC_BACKEND_URL:-http://localhost:8000}"
MAIN_API_URL="${NEXT_PUBLIC_BACKEND_URL:-https://api.example.com}"
if [[ -f "$DEPLOY/.env.dev" ]]; then
  # shellcheck disable=SC1091
  source <(grep -E '^NEXT_PUBLIC_BACKEND_URL=' "$DEPLOY/.env.dev" | sed 's/^/export /')
  DEV_API_URL="${NEXT_PUBLIC_BACKEND_URL:-$DEV_API_URL}"
fi
if [[ -f "$DEPLOY/.env.main" ]]; then
  # shellcheck disable=SC1091
  source <(grep -E '^NEXT_PUBLIC_BACKEND_URL=' "$DEPLOY/.env.main" | sed 's/^/export /')
  MAIN_API_URL="${NEXT_PUBLIC_BACKEND_URL:-$MAIN_API_URL}"
fi

echo "==> fairterms-backend:dev"
build_backend dev

echo "==> fairterms-backend:main"
build_backend main

echo "==> fairterms-frontend:dev (API=${DEV_API_URL})"
build_frontend dev "$DEV_API_URL"

echo "==> fairterms-frontend:main (API=${MAIN_API_URL})"
build_frontend main "$MAIN_API_URL"

echo ""
echo "Done. Images:"
docker images --format '  {{.Repository}}:{{.Tag}}' | grep '^  fairterms-' || true
