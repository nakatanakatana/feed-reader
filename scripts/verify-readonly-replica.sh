#!/usr/bin/env bash
# End-to-end check: seed a primary SQLite DB, replicate to file:// via Litestream,
# serve with feed-reader-readonly, assert live-follow GET updates and POST 405.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SEED_TITLE="${SEED_TITLE:-Seed Feed}"
UPDATED_TITLE="${UPDATED_TITLE:-Updated Feed}"
DATABASE_NAME="${LITESTREAM_DATABASE_NAME:-feeds.db}"
POLL_INTERVAL="${LITESTREAM_POLL_INTERVAL:-200ms}"
READONLY_PORT="${READONLY_PORT:-18081}"
DOCKER_READONLY_IMAGE="${DOCKER_READONLY_IMAGE:-feed-reader:readonly}"

log() { printf 'verify-readonly-replica: %s\n' "$*" >&2; }
die() { printf 'verify-readonly-replica: ERROR: %s\n' "$*" >&2; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "required command not found: $1"
}

require_cmd litestream
require_cmd python3
require_cmd curl
require_cmd go

# Fail fast when Docker targets are not declared (Task 7 contract).
grep -Eq '^FROM .+ AS primary$' Dockerfile \
  || die "Dockerfile missing final stage 'primary' (add --target primary)"
grep -Eq '^FROM .+ AS readonly$' Dockerfile \
  || die "Dockerfile missing final stage 'readonly' (add --target readonly)"
grep -Eq 'VITE_READONLY=true' Dockerfile \
  || die "Dockerfile must build readonly frontend with VITE_READONLY=true"
grep -Eq 'feed-reader-readonly' Dockerfile \
  || die "Dockerfile must build feed-reader-readonly"

assert_dependency_absent() {
  local target="$1"
  local forbidden="$2"
  local dependencies
  dependencies="$(go list -buildvcs=false -deps "$target")" \
    || die "failed to inspect dependencies for $target"
  if grep -Fq "$forbidden" <<<"$dependencies"; then
    die "$target must not depend on $forbidden"
  fi
}

assert_dependency_absent ./cmd/feed-reader github.com/ncruces/go-sqlite3
assert_dependency_absent ./cmd/feed-reader github.com/mattn/go-sqlite3
assert_dependency_absent ./cmd/feed-reader github.com/psanford/sqlite3vfs
assert_dependency_absent ./cmd/feed-reader-readonly github.com/mattn/go-sqlite3
assert_dependency_absent ./cmd/feed-reader-readonly github.com/psanford/sqlite3vfs

readonly_direct_imports="$(go list -buildvcs=false -f '{{join .Imports " "}}' ./cmd/feed-reader-readonly)" \
  || die "failed to inspect direct imports for ./cmd/feed-reader-readonly"
if grep -Fq "modernc.org/sqlite" <<<"$readonly_direct_imports"; then
  die "./cmd/feed-reader-readonly must not directly import modernc.org/sqlite"
fi

WORKDIR="$(mktemp -d "${TMPDIR:-/tmp}/feed-reader-readonly-verify.XXXXXX")"
DIST_STUB_CREATED=0
DOCKER_CONTAINER_NAME=""
cleanup() {
  if [[ -n "${READONLY_PID:-}" ]] && kill -0 "$READONLY_PID" 2>/dev/null; then
    kill "$READONLY_PID" 2>/dev/null || true
    wait "$READONLY_PID" 2>/dev/null || true
  fi
  if [[ -n "${LITESTREAM_PID:-}" ]] && kill -0 "$LITESTREAM_PID" 2>/dev/null; then
    kill "$LITESTREAM_PID" 2>/dev/null || true
    wait "$LITESTREAM_PID" 2>/dev/null || true
  fi
  if [[ -n "${DOCKER_CONTAINER_NAME:-}" ]]; then
    docker rm -f "$DOCKER_CONTAINER_NAME" >/dev/null 2>&1 || true
    DOCKER_CONTAINER_NAME=""
  fi
  if [[ "${DIST_STUB_CREATED:-0}" -eq 1 ]]; then
    rm -f frontend/dist/index.html
    DIST_STUB_CREATED=0
  fi
  rm -rf "$WORKDIR"
}
trap cleanup EXIT

DB_PATH="$WORKDIR/primary.db"
REPLICA_DIR="$WORKDIR/replica"
mkdir -p "$REPLICA_DIR"
REPLICA_URL="file://${REPLICA_DIR}"

# Minimal embeddable assets so go build succeeds without a full Vite build.
mkdir -p frontend/dist
if [[ ! -f frontend/dist/index.html ]]; then
  printf '<!doctype html><title>readonly-verify</title>\n' >frontend/dist/index.html
  DIST_STUB_CREATED=1
fi

resolve_readonly_bin() {
  if [[ -n "${VERIFY_READONLY_BIN:-}" ]]; then
    [[ -x "$VERIFY_READONLY_BIN" ]] || die "VERIFY_READONLY_BIN is not executable: $VERIFY_READONLY_BIN"
    printf '%s\n' "$VERIFY_READONLY_BIN"
    return
  fi

  if command -v docker >/dev/null 2>&1 && docker image inspect "$DOCKER_READONLY_IMAGE" >/dev/null 2>&1; then
    # Prefer a locally built image when present; extract the binary for host-side file:// access.
    local extracted="$WORKDIR/feed-reader-readonly-from-docker"
    # Name the container before create so EXIT cleanup can docker rm -f on any failure path.
    DOCKER_CONTAINER_NAME="fr-readonly-verify-$$"
    docker create --name "$DOCKER_CONTAINER_NAME" "$DOCKER_READONLY_IMAGE" >/dev/null
    docker cp "${DOCKER_CONTAINER_NAME}:/feed-reader-readonly" "$extracted"
    docker rm -f "$DOCKER_CONTAINER_NAME" >/dev/null
    DOCKER_CONTAINER_NAME=""
    chmod +x "$extracted"
    printf '%s\n' "$extracted"
    return
  fi

  require_cmd go
  local built="$WORKDIR/feed-reader-readonly"
  log "building local feed-reader-readonly (CGO_ENABLED=0)"
  CGO_ENABLED=0 go build -buildvcs=false -o "$built" ./cmd/feed-reader-readonly
  printf '%s\n' "$built"
}

log "seeding primary database at $DB_PATH"
python3 - "$DB_PATH" "$SEED_TITLE" <<'PY'
import sqlite3
import sys
from pathlib import Path

db_path, title = sys.argv[1], sys.argv[2]
schema = Path("sql/schema.sql").read_text()
conn = sqlite3.connect(db_path)
try:
    conn.executescript(schema)
    conn.execute(
        "INSERT INTO feeds (id, url, title) VALUES (?, ?, ?)",
        ("feed-1", "https://example.com/feed.xml", title),
    )
    conn.commit()
finally:
    conn.close()
PY

log "initial litestream replicate to $REPLICA_URL"
litestream replicate -once "$DB_PATH" "$REPLICA_URL"

READONLY_BIN="$(resolve_readonly_bin)"
log "starting readonly binary: $READONLY_BIN"
PORT="$READONLY_PORT" \
  LITESTREAM_REPLICA_URL="$REPLICA_URL" \
  LITESTREAM_DATABASE_NAME="$DATABASE_NAME" \
  LITESTREAM_POLL_INTERVAL="$POLL_INTERVAL" \
  CORS_ALLOWED_ORIGINS="http://localhost:3000" \
  "$READONLY_BIN" >"$WORKDIR/readonly.log" 2>&1 &
READONLY_PID=$!

wait_http() {
  local url="$1"
  local attempts="${2:-50}"
  local i
  for ((i = 1; i <= attempts; i++)); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    if ! kill -0 "$READONLY_PID" 2>/dev/null; then
      die "readonly process exited early; log:\n$(cat "$WORKDIR/readonly.log")"
    fi
    sleep 0.1
  done
  die "timeout waiting for $url; log:\n$(cat "$WORKDIR/readonly.log")"
}

wait_http "http://127.0.0.1:${READONLY_PORT}/readyz"

body="$(curl -fsS "http://127.0.0.1:${READONLY_PORT}/api/v2/feeds")"
printf '%s' "$body" | grep -Fq "$SEED_TITLE" \
  || die "GET /api/v2/feeds missing seeded title ${SEED_TITLE}: $body"
log "seeded GET ok"

log "starting continuous litestream replicate for live-follow"
litestream replicate "$DB_PATH" "$REPLICA_URL" >"$WORKDIR/litestream.log" 2>&1 &
LITESTREAM_PID=$!
sleep 0.5

log "publishing primary title update"
python3 - "$DB_PATH" "$UPDATED_TITLE" <<'PY'
import sqlite3
import sys

db_path, title = sys.argv[1], sys.argv[2]
conn = sqlite3.connect(db_path)
try:
    conn.execute("UPDATE feeds SET title = ? WHERE id = ?", (title, "feed-1"))
    conn.commit()
finally:
    conn.close()
PY

observed=0
for _ in $(seq 1 50); do
  body="$(curl -fsS "http://127.0.0.1:${READONLY_PORT}/api/v2/feeds" || true)"
  if printf '%s' "$body" | grep -Fq "$UPDATED_TITLE"; then
    observed=1
    break
  fi
  sleep 0.2
done
[[ "$observed" -eq 1 ]] || die "live-follow GET never observed ${UPDATED_TITLE}; last body: ${body:-<empty>}; litestream log:\n$(cat "$WORKDIR/litestream.log")"
log "live-follow GET ok"

status="$(curl -sS -o /dev/null -w '%{http_code}' \
  -X POST "http://127.0.0.1:${READONLY_PORT}/api/v2/feeds" \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com/other.xml","tagIds":[]}')"
[[ "$status" == "405" ]] || die "expected POST /api/v2/feeds => 405, got $status"
log "POST 405 ok"

head_status="$(curl -sS -o /dev/null -w '%{http_code}' \
  -X HEAD "http://127.0.0.1:${READONLY_PORT}/api/v2/feeds")"
[[ "$head_status" == "200" ]] || die "expected HEAD /api/v2/feeds => 200, got $head_status"
log "HEAD 200 ok"

options_status="$(curl -sS -o /dev/null -w '%{http_code}' \
  -X OPTIONS "http://127.0.0.1:${READONLY_PORT}/api/v2/feeds" \
  -H 'Origin: http://localhost:3000' \
  -H 'Access-Control-Request-Method: GET')"
[[ "$options_status" == "204" ]] || die "expected OPTIONS /api/v2/feeds => 204, got $options_status"
log "OPTIONS preflight 204 ok"

options_origin="$(curl -sS -D - -o /dev/null \
  -X OPTIONS "http://127.0.0.1:${READONLY_PORT}/api/v2/feeds" \
  -H 'Origin: http://localhost:3000' \
  -H 'Access-Control-Request-Method: GET' \
  | grep -i 'access-control-allow-origin' | tr -d '\r')"
printf '%s' "$options_origin" | grep -Fq 'http://localhost:3000' \
  || die "expected Access-Control-Allow-Origin: http://localhost:3000, got: $options_origin"
log "CORS Allow-Origin header ok"

options_methods="$(curl -sS -D - -o /dev/null \
  -X OPTIONS "http://127.0.0.1:${READONLY_PORT}/api/v2/feeds" \
  -H 'Origin: http://localhost:3000' \
  -H 'Access-Control-Request-Method: GET' \
  | grep -i 'access-control-allow-methods' | tr -d '\r')"
printf '%s' "$options_methods" | grep -Fq 'GET, HEAD, OPTIONS' \
  || die "expected Access-Control-Allow-Methods to include GET, HEAD, OPTIONS, got: $options_methods"
log "CORS Allow-Methods readonly ok"

log "PASS"
