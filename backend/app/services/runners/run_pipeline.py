from __future__ import annotations

import time

from app.models import PipelineRunRequest
from app.services.run_manager import RunManager, RunState
from app.services.runners.bicc import run_bicc
from app.services.runners.dispatch import detect_pipeline_type
from app.services.runners.goldengate import run_goldengate
from app.services.runners.jdbc import run_jdbc
from app.services.runners.rest_api import run_rest_api
from app.services.runners.common import log, progress


async def execute_pipeline(manager: RunManager, state: RunState, req: PipelineRunRequest) -> None:
    start = time.time()
    pipeline_type = detect_pipeline_type(req)
    try:
        if pipeline_type == "bicc":
            summary = await run_bicc(manager, state, req)
        elif pipeline_type == "goldengate":
            summary = await run_goldengate(manager, state, req)
        elif pipeline_type == "rest-api":
            summary = await run_rest_api(manager, state, req)
        elif pipeline_type == "jdbc":
            summary = await run_jdbc(manager, state, req)
        else:
            await log(manager, state.run_id, "warn", "Custom pipelines are not yet implemented in backend.")
            await progress(manager, state.run_id, 100)
            summary = {"rowsExtracted": 0, "rowsLoaded": 0, "pipelineType": "custom"}

        time_taken_ms = int((time.time() - start) * 1000)
        await manager.publish(state.run_id, {"event": "summary", "data": {**summary, "timeTakenMs": time_taken_ms}})
        await manager.publish(state.run_id, {"event": "done", "data": {"status": "success"}})
    except Exception as e:
        await manager.publish(state.run_id, {"event": "done", "data": {"status": "error", "error": str(e)}})
    finally:
        state.finished.set()

