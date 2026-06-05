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
wait_for_service() {
    local service=$1
    local max_attempts=30
    local attempt=1
    echo "Waiting for $service..."
    while [ $attempt -le $max_attempts ]; do
        if docker-compose ps | grep "$service" | grep -q "Up"; then
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
    docker-compose down
    docker-compose up -d --build
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
            docker-compose up -d db redis
            wait_for_service "db"
            wait_for_service "redis"
        fi
        docker-compose up -d --build --no-deps "$service"
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
docker-compose ps
