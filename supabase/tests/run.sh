#!/usr/bin/env bash
# Runs the database tests against a throwaway PostgreSQL database.
#
#   DATABASE_URL=postgres://... supabase/tests/run.sh   # use an existing server (CI)
#   supabase/tests/run.sh                               # start a temporary local cluster
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
migrations="$here/../migrations"
tmp=""

cleanup() {
  if [[ -n "$tmp" ]]; then
    runuser -u postgres -- "$PG_BIN/pg_ctl" -D "$tmp/data" -m immediate stop >/dev/null 2>&1 || true
    rm -rf "$tmp"
  fi
}
trap cleanup EXIT

if [[ -z "${DATABASE_URL:-}" ]]; then
  PG_BIN="${PG_BIN:-$(ls -d /usr/lib/postgresql/*/bin | sort -V | tail -1)}"
  tmp="$(mktemp -d)"
  chown postgres "$tmp"
  runuser -u postgres -- "$PG_BIN/initdb" -D "$tmp/data" -A trust -U postgres >/dev/null
  runuser -u postgres -- "$PG_BIN/pg_ctl" -D "$tmp/data" -o "-p 54329 -k $tmp -c listen_addresses=''" -w start >/dev/null
  DATABASE_URL="postgresql://postgres@/postgres?host=$tmp&port=54329"
fi

psql_run() { psql "$DATABASE_URL" -X -q -v ON_ERROR_STOP=1 "$@"; }

psql_run -c 'drop schema if exists public cascade; create schema public;' >/dev/null
psql_run -f "$here/00_supabase_shim.sql" >/dev/null
for f in "$migrations"/*.sql; do
  psql_run -f "$f" >/dev/null
done

status=0
for t in "$here"/*.test.sql; do
  echo "== $(basename "$t")"
  if ! psql_run -f "$t" 2>&1 | sed -n 's/^psql:.*NOTICE:  //p; s/^psql:.*ERROR:  /ERROR: /p'; then
    status=1
  fi
  [[ ${PIPESTATUS[0]} -eq 0 ]] || status=1
done
exit $status
