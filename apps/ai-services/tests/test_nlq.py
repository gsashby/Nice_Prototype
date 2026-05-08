import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_health():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_nlq_suggestions():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/v1/ai/nlq/suggestions")
    assert resp.status_code == 200
    assert "suggestions" in resp.json()


@pytest.mark.asyncio
async def test_nlq_query():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post(
            "/api/v1/ai/nlq/query",
            json={"query": "Show recent violations", "tenant_id": "test-tenant"},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert "sql" in data
    assert "results" in data
