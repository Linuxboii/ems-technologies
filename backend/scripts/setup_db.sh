#!/usr/bin/env bash
# Provision the Postgres role + database for the EMS portal.
#
# Run ON THE VPS as a user that can reach the postgres superuser, e.g.:
#   sudo -u postgres bash backend/scripts/setup_db.sh
#
# Idempotent: safe to re-run. Override defaults with env vars:
#   DB_NAME (default: ems_portal)
#   DB_USER (default: admin)
#   DB_PASSWORD (default: Parzival@1477)  -- must match backend/.env DATABASE_URL
#
# This script does NOT run the app or seed data. After it succeeds:
#   - app startup creates the tables (Base.metadata.create_all)
#   - POST /api/seed loads the initial content + admin account (once)
set -euo pipefail

DB_NAME="${DB_NAME:-ems_portal}"
DB_USER="${DB_USER:-admin}"
DB_PASSWORD="${DB_PASSWORD:-Parzival@1477}"

# Escape single quotes for the SQL string literal.
ESC_PW="${DB_PASSWORD//\'/\'\'}"

# Create or update the login role.
psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} LOGIN PASSWORD '${ESC_PW}';
  ELSE
    ALTER ROLE ${DB_USER} WITH LOGIN PASSWORD '${ESC_PW}';
  END IF;
END
\$\$;
SQL

# CREATE DATABASE cannot run inside a DO block / transaction; guard with a check.
if ! psql -tAc "SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'" | grep -q 1; then
  psql -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
  echo "Created database ${DB_NAME} owned by ${DB_USER}."
else
  echo "Database ${DB_NAME} already exists; left as-is."
fi

echo "Role and database ready."
echo "Next: start the app (tables auto-create on startup), then POST /api/seed once."
