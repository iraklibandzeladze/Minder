#!/usr/bin/env bash
# Nightly dump of every project DB on this server. Cron (deploy user):
#   0 3 * * * /var/www/minder/deploy/backup.sh >> /var/log/db-backup.log 2>&1
# Requires ~/.pgpass (chmod 600) with a line per DB:
#   127.0.0.1:5432:minder:minder:<password>
#   127.0.0.1:5432:pillars:pillars:<password>
set -euo pipefail

DEST=/var/backups/db
KEEP_DAYS=14
DBS=(minder pillars)

mkdir -p "$DEST"
for db in "${DBS[@]}"; do
  if pg_dump -h 127.0.0.1 -U "$db" "$db" | gzip > "$DEST/$db-$(date +%F).sql.gz"; then
    echo "$(date -Is) ok $db"
  else
    echo "$(date -Is) FAILED $db" >&2
  fi
done
find "$DEST" -name '*.sql.gz' -mtime +"$KEEP_DAYS" -delete

# Off-site copy (configure rclone remote first, e.g. Cloudflare R2 / Backblaze B2):
# rclone copy "$DEST" r2:server-backups/db --min-age 1h
