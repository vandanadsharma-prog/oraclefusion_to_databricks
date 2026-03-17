from __future__ import annotations

import asyncio
from typing import Any

from app.models import PipelineRunRequest
from app.services.run_manager import RunManager, RunState
from app.services.runners.common import log, node_status, progress, stop_requested


async def run_goldengate(manager: RunManager, state: RunState, req: PipelineRunRequest) -> dict[str, Any]:
    await log(manager, state.run_id, "info", "===================================================")
    await log(manager, state.run_id, "info", "  Pipeline started: GOLDENGATE pattern")
    await log(manager, state.run_id, "info", "  Mode: BACKEND (local runners)")
    await log(manager, state.run_id, "info", "===================================================")
    await progress(manager, state.run_id, 2)

    await node_status(manager, state.run_id, "oracle-fusion", "running")
    await asyncio.sleep(0.3)
    await node_status(manager, state.run_id, "oracle-fusion", "success")
    await progress(manager, state.run_id, 14)

    gg = next((n for n in req.nodes if n.nodeType == "goldengate"), None)
    if not gg:
        raise RuntimeError("missing goldengate node")

    await node_status(manager, state.run_id, "goldengate", "running")
    await progress(manager, state.run_id, 25)
    await log(manager, state.run_id, "info", "[GG] configuration accepted (no extra parameters required).")
    if stop_requested(state):
        raise RuntimeError("stopped")
    await asyncio.sleep(0.2)

    await node_status(manager, state.run_id, "goldengate", "success")
    await node_status(manager, state.run_id, "databricks", "running")
    await progress(manager, state.run_id, 85)
    await log(manager, state.run_id, "warn", "Databricks delivery is a stub; wire GG Databricks connector config next.")
    await asyncio.sleep(0.3)
    await node_status(manager, state.run_id, "databricks", "success")
    await progress(manager, state.run_id, 100)
    return {"rowsExtracted": 0, "rowsLoaded": 0, "pipelineType": "goldengate"}
