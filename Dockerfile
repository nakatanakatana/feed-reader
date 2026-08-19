# Shared frontend dependency install
FROM node:24-alpine@sha256:d32cdf619f63fe0471182d08996dd516c6275bb5fd31ae06e55a570bd9e1ad43 AS frontend-deps
WORKDIR /app
COPY package.json package-lock.json panda.config.ts postcss.config.cjs ./
RUN npm ci

# Primary frontend build (mutation UI enabled)
FROM frontend-deps AS frontend-builder-primary
COPY . .
RUN npm run build -- --emptyOutDir true

# Readonly frontend build (mutation controls omitted)
FROM frontend-deps AS frontend-builder-readonly
COPY . .
ENV VITE_READONLY=true
RUN npm run build -- --emptyOutDir true

# Shared Go module download (pure Go; no C compiler or libsqlite)
FROM golang:1.27-alpine@sha256:4c9fe60190a2a3350ddc51de80d0224b8a6698d12bdfc999fee45ea9d6c46dbc AS go-deps
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

# Primary backend binary (modernc.org/sqlite, CGO_ENABLED=0)
FROM go-deps AS backend-builder-primary
COPY . .
COPY --from=frontend-builder-primary /app/frontend/dist ./frontend/dist
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags "-w -s" -v -o feed-reader ./cmd/feed-reader
RUN mkdir /data && chown 65532:65532 /data

# Readonly backend binary (ncruces + Litestream VFS, CGO_ENABLED=0)
FROM go-deps AS backend-builder-readonly
COPY . .
COPY --from=frontend-builder-readonly /app/frontend/dist ./frontend/dist
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags "-w -s" -v -o feed-reader-readonly ./cmd/feed-reader-readonly

# Readonly runtime (distroless static)
FROM gcr.io/distroless/static-debian12@sha256:6447365a6337c3732f412d1b74357b30a633831955b2bc45552b0086be907687 AS readonly
WORKDIR /
COPY --from=backend-builder-readonly /app/feed-reader-readonly /feed-reader-readonly
USER nonroot
EXPOSE 8080
ENV PORT=8080
ENTRYPOINT ["/feed-reader-readonly"]

# Primary runtime (distroless static). Kept last so bare `docker build` stays primary-compatible.
FROM gcr.io/distroless/static-debian12@sha256:6447365a6337c3732f412d1b74357b30a633831955b2bc45552b0086be907687 AS primary
WORKDIR /
COPY --from=backend-builder-primary /app/feed-reader /feed-reader
COPY --from=backend-builder-primary --chown=nonroot:nonroot /data /data
USER nonroot
EXPOSE 8080
ENV PORT=8080
ENV DB_PATH=/data/feed-reader.db
VOLUME /data
ENTRYPOINT ["/feed-reader"]
