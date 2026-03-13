from __future__ import annotations

from fastapi import APIRouter

from app.api.fusion_mock import router as fusion_mock_router
from app.api.runs import router as runs_router

router = APIRouter()
router.include_router(runs_router, prefix="/api", tags=["runs"])
router.include_router(fusion_mock_router, tags=["fusion-mock"])

