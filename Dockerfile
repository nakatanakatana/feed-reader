# Shared frontend dependency install
FROM node:26-alpine@sha256:8996bb5821d62a8fd9bb27c1cb07462f3fdce6e47d640c6a881ead0b064ce216 AS frontend-deps
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
FROM golang:1.27-alpine@sha256:eb61c3873c97416fff0116553fff65d67a3549f72e11d9758849a689cdd8b523 AS go-deps
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
FROM gcr.io/distroless/static-debian12@sha256:d75cdd72874d4790092fcb1b058493ecf6bb5bf2b2b897045b00ff01d91843f2 AS readonly
WORKDIR /
COPY --from=backend-builder-readonly /app/feed-reader-readonly /feed-reader-readonly
USER nonroot
EXPOSE 8080
ENV PORT=8080
ENTRYPOINT ["/feed-reader-readonly"]

# Primary runtime (distroless static). Kept last so bare `docker build` stays primary-compatible.
FROM gcr.io/distroless/static-debian12@sha256:d75cdd72874d4790092fcb1b058493ecf6bb5bf2b2b897045b00ff01d91843f2 AS primary
WORKDIR /
COPY --from=backend-builder-primary /app/feed-reader /feed-reader
COPY --from=backend-builder-primary --chown=nonroot:nonroot /data /data
USER nonroot
EXPOSE 8080
ENV PORT=8080
ENV DB_PATH=/data/feed-reader.db
VOLUME /data
ENTRYPOINT ["/feed-reader"]
