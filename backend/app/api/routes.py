from __future__ import annotations

from fastapi import APIRouter

from app.api.fusion_mock import router as fusion_mock_router
from app.api.pipelines import router as pipelines_router
from app.api.runs import router as runs_router
from app.api.connections import router as connections_router

router = APIRouter()
router.include_router(runs_router, prefix="/api", tags=["runs"])
router.include_router(pipelines_router, prefix="/api", tags=["pipelines"])
router.include_router(connections_router, prefix="/api", tags=["connections"])
router.include_router(fusion_mock_router, tags=["fusion-mock"])
