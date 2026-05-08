from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict, Any

router = APIRouter()


class NlqRequest(BaseModel):
    query: str
    tenant_id: str


class NlqResponse(BaseModel):
    sql: str
    explanation: str
    results: List[Dict[str, Any]]


@router.post("/query", response_model=NlqResponse)
async def natural_language_query(request: NlqRequest) -> NlqResponse:
    """Convert plain English to SQL and execute against governance data."""
    # LangChain NLQ pipeline goes here — stub for now
    return NlqResponse(
        sql="SELECT * FROM audit_events LIMIT 10",
        explanation="Fetching the 10 most recent audit events.",
        results=[],
    )


@router.get("/suggestions")
async def get_query_suggestions() -> Dict[str, List[str]]:
    """Return pre-built query suggestions for the NLQ UI."""
    return {
        "suggestions": [
            "Show me all policy violations in the last 7 days",
            "Which AI agents have the lowest confidence scores?",
            "How many customer interactions used AI assistance this week?",
            "List models with bias score above threshold",
            "Show compliance rate by business unit",
        ]
    }
