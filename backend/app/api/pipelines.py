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
_SAFE_NAME_RE = re.compile(r"[^A-Za-z0-9._-]+")


def _pipelines_dir() -> Path:
    base = Path(settings.pipelines_dir)
    if base.is_absolute():
        return base
    # Resolve relative paths from the project root (repo root), not the process CWD.
    project_root = Path(__file__).resolve().parents[3]
    return (project_root / base).resolve()


def _assert_pipeline_id(pipeline_id: str) -> None:
    if not _PIPELINE_ID_RE.fullmatch(pipeline_id or ""):
        raise HTTPException(status_code=400, detail="invalid pipeline_id")


def _safe_filename(name: str, pipeline_id: str) -> str:
    cleaned = _SAFE_NAME_RE.sub("-", (name or "").strip()).strip("-")
    if not cleaned:
        cleaned = "pipeline"
    cleaned = cleaned[:80]
    return f"{cleaned}__{pipeline_id}.json"


def _find_pipeline_file_by_id(pipeline_id: str) -> Path | None:
    out_dir = _pipelines_dir()
    if not out_dir.exists():
        return None
    for p in out_dir.glob("*.json"):
        try:
            payload = json.loads(p.read_text(encoding="utf-8"))
            if payload.get("id") == pipeline_id:
                return p
        except Exception:
            continue
    return None


class PipelineDocument(BaseModel):
    id: str
    name: str = "Untitled Pipeline"
    nodes: list[dict[str, Any]] = Field(default_factory=list)
    edges: list[dict[str, Any]] = Field(default_factory=list)
    updatedAtMs: int | None = None


@router.put("/pipelines/{pipeline_id}")
async def save_pipeline(pipeline_id: str, doc: PipelineDocument) -> dict[str, Any]:
    _assert_pipeline_id(pipeline_id)
    if doc.id != pipeline_id:
        raise HTTPException(status_code=400, detail="pipeline_id mismatch")

    out_dir = _pipelines_dir()
    out_dir.mkdir(parents=True, exist_ok=True)

    existing_path = _find_pipeline_file_by_id(pipeline_id)
    out_path = out_dir / _safe_filename(doc.name, pipeline_id)
    if existing_path and existing_path.resolve() != out_path.resolve():
        try:
            existing_path.replace(out_path)
        except Exception:
            # fallback: write to new path, leaving old file in place
            pass

    tmp_path = out_path.with_suffix(".json.tmp")

    payload = doc.model_dump()
    tmp_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    tmp_path.replace(out_path)
    return {"ok": True, "path": str(out_path)}


@router.get("/pipelines/{pipeline_id}")
async def get_pipeline(pipeline_id: str) -> dict[str, Any]:
    _assert_pipeline_id(pipeline_id)
    path = _find_pipeline_file_by_id(pipeline_id)
    if not path:
        raise HTTPException(status_code=404, detail="pipeline not found")
    if not path.exists():
        raise HTTPException(status_code=404, detail="pipeline not found")
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"failed to read pipeline: {e}") from e


@router.delete("/pipelines/{pipeline_id}")
async def delete_pipeline(pipeline_id: str) -> dict[str, Any]:
    _assert_pipeline_id(pipeline_id)
    path = _find_pipeline_file_by_id(pipeline_id)
    if not path or not path.exists():
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
    items: list[dict[str, Any]] = []
    for p in sorted(out_dir.glob("*.json")):
        item: dict[str, Any] = {"id": p.stem}
        try:
            payload = json.loads(p.read_text(encoding="utf-8"))
            item["id"] = payload.get("id") or p.stem
            item["name"] = payload.get("name") or item["id"]
            item["updatedAtMs"] = payload.get("updatedAtMs")
            item["fileName"] = p.name
        except Exception:
            item["id"] = p.stem
            item["name"] = p.stem
            item["fileName"] = p.name
        items.append(item)
    return {"pipelines": items}
