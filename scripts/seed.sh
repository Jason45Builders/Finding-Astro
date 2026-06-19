#!/usr/bin/env sh
set -eu

DB_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/finding_astro}"

psql "$DB_URL" -f ./database/schema.sql
psql "$DB_URL" -f ./database/seed.sql
