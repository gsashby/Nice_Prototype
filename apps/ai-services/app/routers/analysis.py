from fastapi import APIRouter

router = APIRouter()


@router.get("/models/{model_id}/bias")
async def get_model_bias_analysis(model_id: str) -> dict:
    """Return bias analysis for a specific AI model."""
    return {"model_id": model_id, "bias_score": 0.0, "analysis": "stub"}


@router.get("/models/{model_id}/drift")
async def get_model_drift(model_id: str) -> dict:
    """Return concept drift metrics for a model."""
    return {"model_id": model_id, "drift_score": 0.0, "status": "stable"}
