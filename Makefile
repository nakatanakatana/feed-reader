.PHONY: setup gen dev frontend test lint build

setup:
	aqua install -l && npm install

gen:
	buf generate && sqlc generate

dev:
	go run ./cmd/feed-reader

frontend:
	npm run dev

test:
	go test ./...

lint:
	golangci-lint run

build:
	go build -o dist/ ./cmd/...
