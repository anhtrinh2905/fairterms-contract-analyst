#!/bin/sh
# Runs once on first container init (empty data dir), via
# /docker-entrypoint-initdb.d. Creates the two application databases owned by
# the main POSTGRES_USER. Idempotent — safe if re-run.
set -e

create_db() {
  db="$1"
  echo ">> ensuring database ${db}"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<-SQL
    SELECT 'CREATE DATABASE ${db} OWNER ${POSTGRES_USER}'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${db}')\gexec
SQL
}

create_db fairterms_dev
create_db fairterms_main
