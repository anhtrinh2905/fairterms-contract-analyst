#!/usr/bin/env bash
# Start local FairTerms dev stack (Cloud SQL Proxy + backend + frontend).
#
# Usage (from repo root):
#   bash scripts/dev-local.sh setup   # one-time: deps + npm install
#   bash scripts/dev-local.sh start   # run all services (default)
#   bash scripts/dev-local.sh stop    # stop services started by this script
#   bash scripts/dev-local.sh status  # show running dev processes
#
# Environment overrides:
#   PROXY_PORT=5433              # if local Postgres uses 5432
#   CLOUD_SQL_INSTANCE=...       # default: contract-analysis-g145-vinuni:asia-southeast1:fairterms-db
#   SKIP_MIGRATE=1               # skip prisma migrate deploy on start
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$REPO_ROOT/src/backend"
FRONTEND_DIR="$REPO_ROOT/src/frontend"
STATE_DIR="$REPO_ROOT/.dev-local"
ADC_FILE="${GCP_ADC_FILE:-$HOME/.config/gcloud/application_default_credentials.json}"
CLOUD_SQL_INSTANCE="${CLOUD_SQL_INSTANCE:-contract-analysis-g145-vinuni:asia-southeast1:fairterms-db}"
PROXY_PORT="${PROXY_PORT:-5432}"
BACKEND_PORT=8010
FRONTEND_PORT=3000

PROXY_STARTED_BY_US=0
BACKEND_STARTED_BY_US=0
FRONTEND_STARTED_BY_US=0

log() { printf '==> %s\n' "$*"; }
warn() { printf '!!> %s\n' "$*" >&2; }
die() { warn "$*"; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing command: $1"
}

port_in_use() {
  lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
}

proxy_already_running() {
  pgrep -f "cloud-sql-proxy.*${CLOUD_SQL_INSTANCE}" >/dev/null 2>&1
}

wait_for_port() {
  local port=$1
  local attempts=30
  local i=0
  while ! nc -z 127.0.0.1 "$port" >/dev/null 2>&1; do
    sleep 1
    i=$((i + 1))
    if (( i >= attempts )); then
      die "Timed out waiting for 127.0.0.1:$port (see $STATE_DIR/cloud-sql-proxy.log)"
    fi
  done
}

load_env() {
  if [[ ! -f "$REPO_ROOT/.env" ]]; then
    die "Missing .env — run: bash scripts/dev-local.sh setup"
  fi
  # shellcheck disable=SC1091
  set -a
  source "$REPO_ROOT/.env"
  set +a
  [[ -n "${DATABASE_URL:-}" ]] || die "DATABASE_URL is not set in .env"
}

patch_database_url_port() {
  local port=$1
  export DATABASE_URL
  DATABASE_URL="$(printf '%s' "$DATABASE_URL" | sed -E \
    -e "s/@127\\.0\\.0\\.1:[0-9]+/@127.0.0.1:${port}/" \
    -e "s/@localhost:[0-9]+/@127.0.0.1:${port}/")"
}

ensure_state_dir() {
  mkdir -p "$STATE_DIR"
}

write_pid() {
  local name=$1
  local pid=$2
  echo "$pid" >"$STATE_DIR/${name}.pid"
}

read_pid() {
  local name=$1
  local file="$STATE_DIR/${name}.pid"
  if [[ -f "$file" ]]; then
    cat "$file"
  fi
}

stop_pid_file() {
  local name=$1
  local pid
  pid="$(read_pid "$name" || true)"
  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
    log "Stopping $name (pid $pid)..."
    kill "$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true
  fi
  rm -f "$STATE_DIR/${name}.pid"
}

resolve_proxy_port() {
  if port_in_use "$PROXY_PORT"; then
    if proxy_already_running; then
      log "Cloud SQL Proxy already listening on port $PROXY_PORT"
      return
    fi
    if [[ "$PROXY_PORT" == "5432" ]]; then
      warn "Port 5432 is in use (often local Homebrew Postgres)."
      warn "Trying PROXY_PORT=5433 — or run: brew services stop postgresql@16"
      PROXY_PORT=5433
      if port_in_use "$PROXY_PORT"; then
        die "Port $PROXY_PORT is also in use. Set PROXY_PORT to a free port."
      fi
    else
      die "Port $PROXY_PORT is in use."
    fi
  fi
}

start_proxy() {
  if proxy_already_running && port_in_use "$PROXY_PORT"; then
    log "Using existing Cloud SQL Proxy on port $PROXY_PORT"
    return
  fi

  resolve_proxy_port
  require_cmd cloud-sql-proxy
  [[ -f "$ADC_FILE" ]] || die "GCP credentials not found at $ADC_FILE — run: gcloud auth application-default login"

  log "Starting Cloud SQL Proxy on 127.0.0.1:$PROXY_PORT ..."
  cloud-sql-proxy "$CLOUD_SQL_INSTANCE" --port "$PROXY_PORT" \
    >"$STATE_DIR/cloud-sql-proxy.log" 2>&1 &
  write_pid cloud-sql-proxy "$!"
  PROXY_STARTED_BY_US=1
  wait_for_port "$PROXY_PORT"
  log "Cloud SQL Proxy ready"
}

run_migrate() {
  log "Generating Prisma client..."
  (
    cd "$FRONTEND_DIR"
    npx prisma generate
  )

  if [[ "${SKIP_MIGRATE:-}" == "1" ]]; then
    log "Skipping prisma migrate deploy (SKIP_MIGRATE=1)"
    return
  fi

  log "Applying database migrations..."
  (
    cd "$FRONTEND_DIR"
    npx prisma migrate deploy
  )
}

start_backend() {
  if port_in_use "$BACKEND_PORT"; then
    warn "Backend port $BACKEND_PORT already in use — skipping backend start"
    return
  fi
  require_cmd uv
  log "Starting backend on http://127.0.0.1:$BACKEND_PORT ..."
  (
    cd "$BACKEND_DIR"
    uv run uvicorn app.main:app --reload --host 127.0.0.1 --port "$BACKEND_PORT"
  ) >"$STATE_DIR/backend.log" 2>&1 &
  write_pid backend "$!"
  BACKEND_STARTED_BY_US=1
  wait_for_port "$BACKEND_PORT"
  log "Backend ready (docs: http://127.0.0.1:$BACKEND_PORT/docs)"
}

start_frontend() {
  if port_in_use "$FRONTEND_PORT"; then
    warn "Frontend port $FRONTEND_PORT already in use — skipping frontend start"
    return
  fi
  require_cmd npm
  log "Starting frontend on http://localhost:$FRONTEND_PORT ..."
  (
    cd "$FRONTEND_DIR"
    npm run dev
  ) >"$STATE_DIR/frontend.log" 2>&1 &
  write_pid frontend "$!"
  FRONTEND_STARTED_BY_US=1
  wait_for_port "$FRONTEND_PORT"
  log "Frontend ready (app: http://localhost:$FRONTEND_PORT/app)"
}

cleanup() {
  echo
  log "Shutting down dev stack..."
  if (( FRONTEND_STARTED_BY_US )); then stop_pid_file frontend; fi
  if (( BACKEND_STARTED_BY_US )); then stop_pid_file backend; fi
  if (( PROXY_STARTED_BY_US )); then stop_pid_file cloud-sql-proxy; fi
  exit 0
}

cmd_setup() {
  cd "$REPO_ROOT"
  if [[ ! -f .env ]]; then
    cp .env.example .env
    log "Created .env from .env.example — fill in API keys and DATABASE_URL"
  fi

  require_cmd uv
  require_cmd npm
  require_cmd cloud-sql-proxy
  require_cmd gcloud

  if [[ ! -f "$ADC_FILE" ]]; then
    warn "GCP Application Default Credentials not found."
    warn "Run: gcloud auth application-default login"
    warn "     gcloud config set project contract-analysis-g145-vinuni"
  fi

  log "Installing backend dependencies..."
  (cd "$BACKEND_DIR" && uv sync --group dev)

  log "Installing frontend dependencies..."
  (cd "$FRONTEND_DIR" && npm install)

  log "Setup complete."
  log "Edit .env if needed, then run: bash scripts/dev-local.sh start"
}

cmd_start() {
  cd "$REPO_ROOT"
  ensure_state_dir
  load_env
  patch_database_url_port "$PROXY_PORT"

  trap cleanup INT TERM

  start_proxy
  run_migrate
  start_backend
  start_frontend

  echo
  log "All services running. Press Ctrl+C to stop."
  log "Logs: $STATE_DIR/*.log"
  echo

  # Wait on background jobs; Ctrl+C triggers cleanup
  wait
}

cmd_stop() {
  ensure_state_dir
  log "Stopping dev services..."
  stop_pid_file frontend
  stop_pid_file backend
  stop_pid_file cloud-sql-proxy
  log "Done."
}

cmd_status() {
  ensure_state_dir
  for name in cloud-sql-proxy backend frontend; do
    local pid
    pid="$(read_pid "$name" || true)"
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      printf '  %-16s running (pid %s)\n' "$name" "$pid"
    else
      printf '  %-16s stopped\n' "$name"
    fi
  done
  if proxy_already_running; then
    log "Cloud SQL Proxy process detected (may have been started outside this script)"
  fi
}

main() {
  local cmd="${1:-start}"
  case "$cmd" in
    setup) cmd_setup ;;
    start) cmd_start ;;
    stop) cmd_stop ;;
    status) cmd_status ;;
    -h|--help|help)
      sed -n '2,12p' "$0"
      ;;
    *)
      die "Unknown command: $cmd (use: setup | start | stop | status)"
      ;;
  esac
}

main "$@"
