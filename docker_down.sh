#!/usr/bin/env bash
set -e  # Exit immediately if a command exits with a non-zero status

echo "Building and starting Gateway..."
docker-compose down gateway-service

echo "Building and starting User Service..."
docker-compose down user-service

echo "Building and starting Upload Service..."
docker-compose down upload-service

echo "Building and starting Chunk Service..."
docker-compose down chunk-service

echo "Building and starting Claim Service..."
docker-compose down claim-service

echo "Building and starting Logger Service..."
docker-compose down logger-service

echo "Building and starting Point Service..."
docker-compose down point-service

echo "All services have been built and started sequentially."
