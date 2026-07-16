#!/usr/bin/env bash
# Periodic backup of the self-hosted Postgres container (replaces Cloud SQL's
# automated backups). Dumps each database to a compressed custom-format file and
# prunes backups older than RETENTION_DAYS.
#
# Manual run:   bash deploy/backup-postgres.sh
# Cron (daily 02:00), add to the VM's crontab:
#   0 2 * * * cd /home/fairterms-deploy/fairterms && bash deploy/backup-postgres.sh >> /var/log/fairterms-pgbackup.log 2>&1
set -euo pipefail

CONTAINER="${DEST_CONTAINER:-fairterms-db-postgres-1}"
DB_USER="${POSTGRES_USER:-fairterms}"
BACKUP_DIR="${BACKUP_DIR:-/home/fairterms-deploy/pg-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
DATABASES="${DATABASES:-fairterms_dev fairterms_main}"

# Timestamp comes from the host clock (not a hardcoded value).
STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

for db in $DATABASES; do
  out="${BACKUP_DIR}/${db}-${STAMP}.dump"
  echo ">> backing up ${db} -> ${out}"
  docker exec -t "$CONTAINER" pg_dump -Fc -U "$DB_USER" -d "$db" > "$out"
done

echo ">> pruning backups older than ${RETENTION_DAYS} days in ${BACKUP_DIR}"
find "$BACKUP_DIR" -name '*.dump' -type f -mtime "+${RETENTION_DAYS}" -delete

echo ">> backup complete"
