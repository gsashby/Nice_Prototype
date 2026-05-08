from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import nlq, reports, analysis

app = FastAPI(
    title="AI Trust Center — AI Services",
    version="1.0.0",
    description="NLQ, report generation, and AI analysis services",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(nlq.router, prefix="/api/v1/ai/nlq", tags=["NLQ"])
app.include_router(reports.router, prefix="/api/v1/ai/reports", tags=["Reports"])
app.include_router(analysis.router, prefix="/api/v1/ai/analysis", tags=["Analysis"])


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "ai-services"}
