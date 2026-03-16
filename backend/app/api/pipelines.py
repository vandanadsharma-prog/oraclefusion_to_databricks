from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.core.config import settings


router = APIRouter()


_PIPELINE_ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$")


def _pipelines_dir() -> Path:
    base = Path(settings.pipelines_dir)
    if base.is_absolute():
        return base
    # Resolve relative paths from the project root (repo root), not the process CWD.
    project_root = Path(__file__).resolve().parents[3]
    return (project_root / base).resolve()


def _pipeline_path(pipeline_id: str) -> Path:
    if not _PIPELINE_ID_RE.fullmatch(pipeline_id or ""):
        raise HTTPException(status_code=400, detail="invalid pipeline_id")
    return _pipelines_dir() / f"{pipeline_id}.json"


class PipelineDocument(BaseModel):
    id: str
    name: str = "Untitled Pipeline"
    nodes: list[dict[str, Any]] = Field(default_factory=list)
    edges: list[dict[str, Any]] = Field(default_factory=list)
    updatedAtMs: int | None = None


@router.put("/pipelines/{pipeline_id}")
async def save_pipeline(pipeline_id: str, doc: PipelineDocument) -> dict[str, Any]:
    if doc.id != pipeline_id:
        raise HTTPException(status_code=400, detail="pipeline_id mismatch")

    out_dir = _pipelines_dir()
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = _pipeline_path(pipeline_id)
    tmp_path = out_path.with_suffix(".json.tmp")

    payload = doc.model_dump()
    tmp_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    tmp_path.replace(out_path)
    return {"ok": True, "path": str(out_path)}


@router.get("/pipelines/{pipeline_id}")
async def get_pipeline(pipeline_id: str) -> dict[str, Any]:
    path = _pipeline_path(pipeline_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail="pipeline not found")
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"failed to read pipeline: {e}") from e


@router.delete("/pipelines/{pipeline_id}")
async def delete_pipeline(pipeline_id: str) -> dict[str, Any]:
    path = _pipeline_path(pipeline_id)
    if not path.exists():
        return {"ok": True, "deleted": False}
    try:
        path.unlink()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"failed to delete pipeline: {e}") from e
    return {"ok": True, "deleted": True}


@router.get("/pipelines")
async def list_pipelines() -> dict[str, Any]:
    out_dir = _pipelines_dir()
    if not out_dir.exists():
        return {"pipelines": []}
    items = []
    for p in sorted(out_dir.glob("*.json")):
        items.append(p.stem)
    return {"pipelines": items}
