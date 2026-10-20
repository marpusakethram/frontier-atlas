.PHONY: help setup dev-api dev-web migrate seed test lint build docker-up docker-down

help:
	@echo "Frontier Atlas — Institutional Deep-Tech Investment Intelligence Platform"
	@echo "Targets:"
	@echo "  make setup        Install backend (uv) and frontend (npm) dependencies"
	@echo "  make migrate      Run Alembic database migrations"
	@echo "  make seed         Seed deterministic fixtures and flagship case studies"
	@echo "  make dev-api      Start FastAPI server on http://localhost:8000"
	@echo "  make dev-web      Start Next.js server on http://localhost:3000"
	@echo "  make test         Run backend pytest suite and evaluation tests"
	@echo "  make lint         Run ruff linter and frontend TypeScript strict checks"
	@echo "  make build        Build Next.js production bundle"
	@echo "  make docker-up    Start full stack via Docker Compose"
	@echo "  make docker-down  Stop Docker Compose stack"

setup:
	cd services/api && uv sync --all-extras
	cd apps/web && npm install

migrate:
	cd services/api && uv run alembic upgrade head

seed:
	cd services/api && uv run python -m app.db.seed

dev-api:
	cd services/api && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

dev-web:
	cd apps/web && npm run dev

test:
	cd services/api && uv run pytest -v

lint:
	cd services/api && uv run ruff check .
	cd apps/web && npm run typecheck

build:
	cd apps/web && npm run build

docker-up:
	docker compose up --build -d

docker-down:
	docker compose down
