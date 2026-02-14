# Stage 1: Frontend Builder
FROM node:24-alpine@sha256:4f696fbf39f383c1e486030ba6b289a5d9af541642fc78ab197e584a113b9c03 AS frontend-builder
WORKDIR /app
COPY package.json package-lock.json panda.config.ts postcss.config.cjs ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Backend Builder
FROM golang:1.26-alpine@sha256:d4c4845f5d60c6a974c6000ce58ae079328d03ab7f721a0734277e69905473e5 AS backend-builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist
RUN CGO_ENABLED=0 GOOS=linux go build -v -o feed-reader ./cmd/feed-reader
RUN mkdir /data && chown 65532:65532 /data

# Stage 3: Final Image
FROM gcr.io/distroless/static-debian12@sha256:20bc6c0bc4d625a22a8fde3e55f6515709b32055ef8fb9cfbddaa06d1760f838
WORKDIR /
COPY --from=backend-builder /app/feed-reader /feed-reader
COPY --from=backend-builder --chown=nonroot:nonroot /data /data

USER nonroot
EXPOSE 8080
ENV DB_PATH=/data/feed-reader.db
VOLUME /data
ENTRYPOINT ["/feed-reader"]
