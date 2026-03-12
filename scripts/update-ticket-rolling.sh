#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/ritel/apps/ticket-rolling}"
IMAGE_NAME="${IMAGE_NAME:-ticket-rolling:latest}"
CONTAINER_NAME="${CONTAINER_NAME:-ticket-rolling}"
HOST_PORT="${HOST_PORT:-8790}"
CONTAINER_PORT="${CONTAINER_PORT:-8787}"
BASE_PATH="${BASE_PATH:-/ticket-rolling/}"
ALLOWED_ORIGIN="${ALLOWED_ORIGIN:-https://ritelt.com}"
DATA_DIR="${DATA_DIR:-$APP_DIR/apps/api/data}"

echo "[1/6] Entering app directory: $APP_DIR"
cd "$APP_DIR"

echo "[2/6] Pulling latest code"
git pull --ff-only

mkdir -p "$DATA_DIR"

echo "[3/6] Building Docker image: $IMAGE_NAME"
sudo docker build \
  --build-arg VITE_BASE_PATH="$BASE_PATH" \
  -t "$IMAGE_NAME" \
  .

echo "[4/6] Replacing container: $CONTAINER_NAME"
sudo docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true

sudo docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  -p "127.0.0.1:${HOST_PORT}:${CONTAINER_PORT}" \
  -e NODE_ENV=production \
  -e PORT="${CONTAINER_PORT}" \
  -e ALLOWED_ORIGINS="${ALLOWED_ORIGIN}" \
  -v "${DATA_DIR}:/app/apps/api/data" \
  "$IMAGE_NAME" >/dev/null

echo "[5/6] Waiting for service"
sleep 3

echo "[6/6] Health check"
curl -fsS "http://127.0.0.1:${HOST_PORT}/health"
echo
echo "Update complete."
