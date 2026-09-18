#!/usr/bin/env bash
# Pre-migration backup of the linked Supabase project.
#
# Runs through `supabase db dump`, which executes the correct pg_dump inside
# Docker against the linked project. Nothing has to be installed locally, and
# pg_dump's major version always matches the remote (RFQ-main is Postgres 17).
# The previous version of this script called a bare `pg_dump "$DATABASE_URL"`,
# which needed Postgres client tools on PATH and an env var that `npm run` does
# not load.
#
# Schema and data are dumped separately because `supabase db dump` defaults to
# schema-only: a single plain invocation would write a "backup" containing no
# rows. Each dump lands on a .part file and is renamed only once pg_dump exits
# clean, so an interrupted run can never leave behind a file that looks like a
# usable backup.
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p backups

stamp=$(date +%Y%m%d%H%M%S)
schema="backups/backup_${stamp}.schema.sql"
data="backups/backup_${stamp}.data.sql"

trap 'rm -f "${schema}.part" "${data}.part"' EXIT

echo "==> Dumping schema from the linked project"
supabase db dump --linked -f "${schema}.part"
mv "${schema}.part" "$schema"

echo "==> Dumping data from the linked project"
supabase db dump --linked --data-only --use-copy -f "${data}.part"
mv "${data}.part" "$data"

echo
echo "Backup complete:"
ls -lh "$schema" "$data"
