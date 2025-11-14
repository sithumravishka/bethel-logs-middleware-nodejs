#!/usr/bin/env bash
set -e  # Exit immediately if a command exits with a non-zero status

echo "Building and starting Gateway..."
docker-compose build gateway-service
docker-compose up -d gateway-service

echo "Building and starting User Service..."
docker-compose build user-service
docker-compose up -d user-service

echo "Building and starting Upload Service..."
docker-compose build upload-service
docker-compose up -d upload-service

echo "Building and starting Chunk Service..."
docker-compose build chunk-service
docker-compose up -d chunk-service

echo "Building and starting Claim Service..."
docker-compose build claim-service
docker-compose up -d claim-service

echo "Building and starting Logger Service..."
docker-compose build logger-service
docker-compose up -d logger-service

echo "Building and starting Point Service..."
docker-compose build point-service
docker-compose up -d point-service

echo "All services have been built and started sequentially."
