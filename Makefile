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
	go run ./cmd/feed-reader

dev-frontend:
	npm run dev

dev-frontend-mock:
	npm run dev:mock

dev: dev-backend dev-frontend

sync-assets:
	mkdir -p frontend/dist
	touch frontend/dist/index.html

test-backend: sync-assets
	go test ./...

test-update-backend: sync-assets
	go test ./... -args -update

test-frontend:
	npm run test

test-update-frontend:
	npm run test -- -u

test: test-backend test-frontend

test-update: test-update-backend test-update-frontend

lint-backend:
	golangci-lint run

lint-frontend:
	npm run lint

fix-backend:
	go fix ./...

fix-frontend:
	npm run format

fix: fix-backend fix-frontend

build-backend:
	go build -o dist/ ./cmd/...

build-frontend:
	npm run build

build: build-frontend
	go build -o dist/ ./cmd/...

clean:
	rm -rf frontend/dist dist/ cmd/feed-reader/dist/
