#!/bin/bash
set -e

echo "▶ Pulling latest code..."
git pull origin master

echo "▶ Building fresh images..."
docker compose build --no-cache --pull

echo "▶ Restarting containers..."
docker compose up -d --force-recreate

echo "▶ Cleaning up..."
docker system prune -a --volumes -f

echo "▶ Showing container status..."
docker compose ps

echo "▶ Showing disk usage..."
docker system df

echo "✅ Deploy complete"