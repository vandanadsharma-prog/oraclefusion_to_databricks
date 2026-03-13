from __future__ import annotations

import asyncio
import os
import shutil
import subprocess
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
    install_path = str(getattr(gg.config, "installPath", ""))
    await log(manager, state.run_id, "info", f"[GG] installPath={install_path or '(not set)'}")

    if stop_requested(state):
        raise RuntimeError("stopped")

    ggsci: str | None = None
    if install_path:
        for name in ("ggsci", "ggsci.exe"):
            candidate = os.path.join(install_path, name)
            if os.path.exists(candidate):
                ggsci = candidate
                break
    if not ggsci:
        ggsci = shutil.which("ggsci")

    if not ggsci:
        await node_status(manager, state.run_id, "goldengate", "error")
        raise RuntimeError("GoldenGate ggsci not found (set installPath or add ggsci to PATH).")

    proc = subprocess.run(
        [ggsci],
        input="version\nexit\n",
        capture_output=True,
        text=True,
        timeout=20,
    )
    out = (proc.stdout or proc.stderr).strip()
    if out:
        await log(manager, state.run_id, "debug", out)
    await asyncio.sleep(0.3)

    await node_status(manager, state.run_id, "goldengate", "success")
    await node_status(manager, state.run_id, "databricks", "running")
    await progress(manager, state.run_id, 85)
    await log(manager, state.run_id, "warn", "Databricks delivery is a stub; wire GG Databricks connector config next.")
    await asyncio.sleep(0.3)
    await node_status(manager, state.run_id, "databricks", "success")
    await progress(manager, state.run_id, 100)
    return {"rowsExtracted": 0, "rowsLoaded": 0, "pipelineType": "goldengate"}
