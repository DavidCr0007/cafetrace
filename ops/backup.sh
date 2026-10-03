#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL is required}"
DESTINATION="${1:-./backups}"
mkdir -p "$DESTINATION"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
case "$DATABASE_URL" in
  sqlite:////*) cp "${DATABASE_URL#sqlite:///}" "$DESTINATION/cafetrace-$STAMP.sqlite3" ;;
  postgresql://*) pg_dump "$DATABASE_URL" > "$DESTINATION/cafetrace-$STAMP.sql" ;;
  *) echo "Unsupported DATABASE_URL" >&2; exit 2 ;;
esac
echo "Backup created in $DESTINATION"
