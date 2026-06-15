BINARY    := gyds-validatornode
VERSION   := 1.0.0
BUILD_DIR := bin

.PHONY: all build run keygen clean tidy docker

all: build

build:
	@mkdir -p $(BUILD_DIR)
	go build -ldflags="-s -w -X main.version=$(VERSION)" -o $(BUILD_DIR)/$(BINARY) .

run: build
	./$(BUILD_DIR)/$(BINARY) start

keygen: build
	./$(BUILD_DIR)/$(BINARY) keygen

tidy:
	go mod tidy

clean:
	rm -rf $(BUILD_DIR)

docker:
	docker compose build --no-cache
	docker compose up -d

test:
	go test ./...
