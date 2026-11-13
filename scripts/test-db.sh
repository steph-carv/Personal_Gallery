#!/usr/bin/env bash
# Test the Supabase migrations on a local Postgres (15 or later), using a
# small stand-in for Supabase's auth schema. Creates a fresh database each run.
#
#   PGHOST=/path/to/socket PGPORT=5432 PGUSER=postgres scripts/test-db.sh
set -euo pipefail
cd "$(dirname "$0")/.."
DB=salon_test
psql -q -d postgres -c "drop database if exists $DB" -c "create database $DB" 2>&1 | grep -v "does not exist" || true
# Roles are cluster-wide; ignore "already exists" from earlier runs.
psql -q -d "$DB" -v ON_ERROR_STOP=0 -f supabase/tests/supabase-stub.sql 2>&1 | grep -v "already exists" || true
for f in supabase/migrations/*.sql; do
  psql -q -d "$DB" -v ON_ERROR_STOP=1 -f "$f"
done
psql -q -d "$DB" -v ON_ERROR_STOP=1 -f supabase/tests/rules.test.sql 2>&1 | sed 's/^psql:[^ ]* NOTICE:  //'
echo "All database tests passed."
