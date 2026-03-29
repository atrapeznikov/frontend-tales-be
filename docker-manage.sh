#!/bin/bash

case "$1" in
  start)
    echo "Starting Docker containers in background..."
    docker compose up -d postgres redis
    ;;
  build)
    echo "Building images and starting containers..."
    docker compose up --build -d
    ;;
  stop)
    echo "Stopping running containers..."
    docker compose stop
    ;;
  down)
    echo "Stopping and removing containers..."
    docker compose down
    ;;
  clean)
    echo "Cleaning up unused containers, networks, and dangling images..."
    docker system prune -f
    ;;
  clean-all)
    echo "Deep cleaning: removing ALL unused images, volumes, and stopped containers..."
    docker system prune -a --volumes -f
    ;;
  *)
    echo "Usage: ./docker-manage.sh {start|build|stop|down|clean|clean-all}"
    echo "Commands:"
    echo "  start     - Запустить проект (docker compose up -d)"
    echo "  build     - Пересобрать образы и запустить (docker compose up --build -d)"
    echo "  stop      - Просто остановить контейнеры (docker compose stop)"
    echo "  down      - Остановить и удалить контейнеры (docker compose down)"
    echo "  clean     - Удалить ненужный кэш, остановленные контейнеры и 'висящие' (dangling) образы"
    echo "  clean-all - Полная глубокая очистка (удалит ВСЕ неиспользуемые образы и тома)"
    exit 1
esac
