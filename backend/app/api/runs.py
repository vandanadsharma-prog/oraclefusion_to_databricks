from __future__ import annotations

import asyncio

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.models import PipelineRunRequest, RunStartedResponse
from app.services.run_manager import run_manager
from app.services.runners.run_pipeline import execute_pipeline

router = APIRouter()


@router.post("/runs", response_model=RunStartedResponse)
async def start_run(req: PipelineRunRequest) -> RunStartedResponse:
    state = run_manager.create_run()
    asyncio.create_task(execute_pipeline(run_manager, state, req))
    return RunStartedResponse(run_id=state.run_id)


@router.get("/runs/{run_id}/events")
async def run_events(run_id: str) -> StreamingResponse:
    return StreamingResponse(run_manager.stream_sse(run_id), media_type="text/event-stream")


@router.post("/runs/{run_id}/stop")
async def stop_run(run_id: str) -> dict[str, str]:
    ok = run_manager.request_stop(run_id)
    if not ok:
        raise HTTPException(status_code=404, detail="run not found")
    await run_manager.publish(
        run_id,
        {"event": "log", "data": {"timestamp": "00:00:00.000", "level": "warn", "message": "Stop requested by user."}},
    )
    return {"status": "stopping"}

