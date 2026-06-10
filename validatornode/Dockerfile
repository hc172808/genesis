FROM golang:1.22-alpine AS builder
RUN apk add --no-cache git ca-certificates tzdata make
WORKDIR /build
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -ldflags="-s -w -X main.version=1.0.0" -o /gyds-validatornode .

FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata curl
RUN addgroup -S gyds && adduser -S -G gyds gyds
WORKDIR /app
COPY --from=builder /gyds-validatornode /app/gyds-validatornode
RUN mkdir -p /app/data /app/keystore && chown -R gyds:gyds /app
USER gyds
VOLUME ["/app/data", "/app/keystore"]
ENV GYDS_CHAIN_ID=13370 \
    GYDS_NODE_MODE=validator \
    GYDS_LOG_LEVEL=info \
    GYDS_DATA_DIR=/app/data \
    GYDS_RPC_PORT=8545 \
    GYDS_RPC_HOST=127.0.0.1 \
    GYDS_P2P_PORT=30303
EXPOSE 30303
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -sf http://localhost:${GYDS_RPC_PORT}/health || exit 1
ENTRYPOINT ["/app/gyds-validatornode"]
CMD ["start"]
