# feed-reader

![Coverage](https://raw.githubusercontent.com/nakatanakatana/octocov-central/main/badges/nakatanakatana/feed-reader/coverage.svg)
![Code to Test Ratio](https://raw.githubusercontent.com/nakatanakatana/octocov-central/main/badges/nakatanakatana/feed-reader/ratio.svg)
![Test Execution Time](https://raw.githubusercontent.com/nakatanakatana/octocov-central/main/badges/nakatanakatana/feed-reader/time.svg)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/nakatanakatana/feed-reader)

A self-hosted, full-stack RSS/Atom feed reader application.

## usage

### docker (primary)

The primary image is a writable feed-reader process. Production deployments that also run a readonly replica should configure **Litestream replication** on the primary database so contiguous LTX files are published to object storage (or another supported replica destination). Keep primary `l0-retention` long enough that a lagging replica can still fetch every L0 file it needs.

```sh
docker build --target primary -t feed-reader:primary .
docker run --rm -p 8080:8080 feed-reader:primary
```

or with a persistent volume:

```sh
mkdir data
chmod 777 data
docker run --rm -p 8080:8080 -v $PWD/data:/data -e "DB_PATH=/data/feed-reader.db" feed-reader:primary
```

Published images (for example `ghcr.io/nakatanakatana/feed-reader:latest`) follow the same `DB_PATH` / `/data` contract as the local `feed-reader:primary` tag.

A bare `docker build .` (no `--target`) still produces the primary image and preserves the existing `DB_PATH` / `/data` volume workflow.

### docker (readonly replica)

The readonly image serves the UI and read APIs from a Litestream VFS replica. It never opens a local writable database, never runs migrations, feed polling, fetchers, worker pools, or the write queue, and the frontend is built with `VITE_READONLY=true` so mutation controls are omitted from the DOM.

```sh
docker build --target readonly -t feed-reader:readonly .
docker run --rm -p 8080:8080 \
  -e LITESTREAM_REPLICA_URL='s3://bucket/path?region=ap-northeast-1' \
  -e LITESTREAM_DATABASE_NAME=feed-reader.db \
  feed-reader:readonly
```

Local live-follow smoke check (seeds a primary DB, replicates to `file://`, asserts GET follow + POST 405):

```sh
bash scripts/verify-readonly-replica.sh
```

#### Readonly environment variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `LITESTREAM_REPLICA_URL` | yes | — | Replica URL. Production: `s3://…` (S3-compatible endpoints via URL query params such as `endpoint`, `region`, `forcePathStyle`). `file://` is for local tests. |
| `LITESTREAM_DATABASE_NAME` | yes | — | Logical database name used in the ncruces DSN (`file:<name>?vfs=…&mode=ro`). Must not contain characters that can alter the SQLite URI syntax (specifically `?`, `&`, `#`, `=`, `%`, `;`, or null bytes). |
| `LITESTREAM_POLL_INTERVAL` | no | `1s` | How often each open SQLite connection's VFS wrapper polls for new LTX files. Must be a positive duration (zero or negative intervals are rejected). |
| `LITESTREAM_CACHE_SIZE_BYTES` | no | `10485760` | Per-connection page cache size for the VFS wrapper. |
| `LITESTREAM_MAX_OPEN_CONNECTIONS` | no | `4` | Max open SQL connections. **Each open connection starts one replica poller**, so keep this bounded. |
| `PORT` | no | `8080` | HTTP listen port. |
| `CORS_ALLOWED_ORIGINS` | no | empty | Comma-separated allowed origins. |

#### AWS / S3-compatible credentials

For `s3://` replicas, supply standard AWS SDK credentials to the container (for example `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` / `AWS_DEFAULT_REGION`, and optional `AWS_SESSION_TOKEN`). Point S3-compatible stores (MinIO, R2, etc.) with replica URL query parameters such as `endpoint=https://…` and `forcePathStyle=true` as required by the store.

#### Operational notes

- **Startup before the first snapshot:** `/readyz` stays non-ready until the VFS can open a readable replica snapshot. `/healthz` only confirms the process is up.
- **VFS lag:** a read transaction sees one immutable wrapper snapshot. Newly published LTX files become visible on the **next** read transaction after the poller observes them (up to about one `LITESTREAM_POLL_INTERVAL`, plus object-store delay).
- **Cost model:** one Litestream replica poller runs per open SQLite connection; prefer a small `LITESTREAM_MAX_OPEN_CONNECTIONS`.
- **Shutdown ordering:** the process stops HTTP traffic, closes `sql.DB` (stopping pollers), then unregisters the VFS.
- **Contiguous LTX + primary retention:** the replica must see a contiguous LTX sequence. Configure adequate primary Litestream `l0-retention` so L0 files are not deleted before lagging replicas catch up.
- **Latest follow only:** the readonly process always follows the latest replica tip. Time-travel / PITR queries through the VFS are **not** supported.
- **No writes:** only `GET`, `HEAD`, and `OPTIONS` are accepted; every other method returns `405`. Historical analysis or heavy analytics should restore a database from Litestream instead of querying the live VFS replica.
