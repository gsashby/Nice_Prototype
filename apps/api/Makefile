.PHONY: run build seed test tidy

run:
	go run ./cmd/server/main.go

build:
	go build -o bin/api ./cmd/server/main.go

seed:
	go run ./cmd/seed/main.go

test:
	go test ./... -v

tidy:
	go mod tidy
