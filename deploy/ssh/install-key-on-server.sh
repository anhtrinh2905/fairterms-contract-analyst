#!/usr/bin/env bash
# Install public key on server (run once after filling SERVER_HOST in deploy/.env.deploy)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/deploy/.env.deploy"
PUB_KEY="$ROOT/deploy/ssh/fairterms-deploy.pub"
PRIV_KEY="$ROOT/deploy/ssh/fairterms-deploy"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Create deploy/.env.deploy with SERVER_HOST and SERVER_USER" >&2
  exit 1
fi

# shellcheck disable=SC1091
source "$ENV_FILE"

SERVER_USER="${SERVER_USER:-fairterms-deploy}"
SERVER_PORT="${SERVER_PORT:-22}"

if [[ -z "${SERVER_HOST:-}" ]]; then
  echo "Set SERVER_HOST in deploy/.env.deploy" >&2
  exit 1
fi

PUB_LINE="$(tr -d '\r\n' < "$PUB_KEY")"

echo "Installing key for ${SERVER_USER}@${SERVER_HOST}..."
ssh -i "$PRIV_KEY" -p "$SERVER_PORT" -o IdentitiesOnly=yes \
  "${SERVER_USER}@${SERVER_HOST}" \
  "mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo '${PUB_LINE}' > ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"

echo "Done. Test: ssh -F deploy/ssh/config fairterms"
