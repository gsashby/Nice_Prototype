from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class ReportRequest(BaseModel):
    tenant_id: str
    period_start: str
    period_end: str
    report_type: str = "executive_summary"


@router.post("/generate")
async def generate_report(request: ReportRequest) -> dict:
    """Kick off async board report generation via Celery."""
    return {"status": "queued", "task_id": "stub-task-id", "estimated_seconds": 30}


@router.get("/{task_id}/status")
async def get_report_status(task_id: str) -> dict:
    """Poll report generation status."""
    return {"task_id": task_id, "status": "pending"}
