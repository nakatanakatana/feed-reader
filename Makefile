.PHONY: setup gen dev frontend test lint build

setup-aqua:
	aqua install -l

setup-npm:
	npm ci

setup: setup-aqua setup-npm

gen-buf:
	buf generate

gen-sqlc:
	sqlc generate

gen: gen-buf gen-sqlc

dev-backend:
	go run .

dev-frontend:
	npm run dev

dev-frontend-mock:
	npm run dev:mock

dev: dev-backend dev-frontend

test-backend: sync-assets
	go test ./...

test-frontend:
	npm run test

test: test-backend test-frontend

lint-backend:
	golangci-lint run

lint-frontend:
	npm run lint

sync-assets:
	mkdir -p cmd/feed-reader/dist
	cp -r frontend/dist/* cmd/feed-reader/dist/

build-backend: sync-assets
	go build -o dist/ ./cmd/...

build-frontend:
	npm run build

build: build-frontend build-backend

clean:
	rm -rf frontend/dist dist/ cmd/feed-reader/dist/
