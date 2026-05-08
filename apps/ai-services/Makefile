.PHONY: run test lint

run:
	.venv/bin/uvicorn app.main:app --reload --port 8001

test:
	.venv/bin/pytest tests/ -v

lint:
	.venv/bin/ruff check app/
