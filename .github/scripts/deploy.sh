#!/bin/bash
set -e
DEPLOY_ALL=${1:-false}
SERVICES=${2:-""}
APP_DIR="/opt/crud-app"
echo "=== CRUD Application Deployment ==="
echo "Deploy All: $DEPLOY_ALL"
echo "Services: $SERVICES"
cd "$APP_DIR"
git fetch origin
git reset --hard origin/main

# Support both docker compose and docker-compose
if command -v docker-compose &> /dev/null; then
    DC="docker-compose"
else
    DC="docker compose"
fi
echo "Using: $DC"

wait_for_service() {
    local service=$1
    local max_attempts=30
    local attempt=1
    echo "Waiting for $service..."
    while [ $attempt -le $max_attempts ]; do
        if $DC ps | grep "$service" | grep -q "Up"; then
            echo "✓ $service is up"
            return 0
        fi
        echo "Attempt $attempt/$max_attempts..."
        sleep 10
        attempt=$((attempt + 1))
    done
    echo "❌ $service timed out"
    return 1
}
deploy_all_services() {
    echo "Deploying all services..."
    $DC down
    $DC up -d --build
    wait_for_service "db"
    wait_for_service "redis"
    wait_for_service "backend"
    wait_for_service "frontend"
    echo "✓ All services deployed"
}
deploy_specific_services() {
    local services=($1)
    for service in "${services[@]}"; do
        [ -z "$service" ] && continue
        echo "Deploying: $service"
        if [ "$service" = "backend" ]; then
            $DC up -d db redis
            wait_for_service "db"
            wait_for_service "redis"
        fi
        $DC up -d --build --no-deps "$service"
        wait_for_service "$service"
        echo "✓ $service deployed"
    done
}
if [ "$DEPLOY_ALL" = "true" ]; then
    deploy_all_services
else
    if [ -n "$SERVICES" ]; then
        deploy_specific_services "$SERVICES"
    else
        echo "No services to deploy"
    fi
fi
echo "=== Deployment complete ==="
$DC ps
