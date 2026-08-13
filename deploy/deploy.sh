#!/usr/bin/env bash
set -euo pipefail

# Deployment script run by GitHub Actions on the EC2 box.
# Pulls the latest image from GHCR and restarts the app container.

APP_DIR="/opt/rentry"
IMAGE="ghcr.io/nebiyuu/rentry-backend:latest"
CONTAINER="rentry-backend"
PORT="${APP_PORT:-5000}"

mkdir -p "$APP_DIR"

# Authenticate to GHCR using a token passed via env from the CI runner.
if [[ -n "${GHCR_TOKEN:-}" ]]; then
  echo "$GHCR_TOKEN" | docker login ghcr.io -u "${GHCR_USERNAME:-$CI_JOB_USER}" --password-stdin
fi

echo "Pulling image: $IMAGE"
docker pull "$IMAGE"

# Stop and remove the old container if it exists.
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "Stopping old container: $CONTAINER"
  docker stop "$CONTAINER" || true
  docker rm "$CONTAINER" || true
fi

echo "Starting container: $CONTAINER"
docker run -d \
  --name "$CONTAINER" \
  --restart unless-stopped \
  -p "${PORT}:5000" \
  --env-file "$APP_DIR/.env" \
  "$IMAGE"

echo "Deploy complete. App listening on port $PORT."
