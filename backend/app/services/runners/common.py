from __future__ import annotations

import time
from typing import Any, Literal

from app.services.run_manager import RunManager, RunState

LogLevel = Literal["info", "success", "error", "warn", "debug"]


def now_ts() -> str:
    t = time.localtime()
    ms = int((time.time() * 1000) % 1000)
    return time.strftime("%H:%M:%S", t) + f".{ms:03d}"


async def log(manager: RunManager, run_id: str, level: LogLevel, message: str) -> None:
    await manager.publish(run_id, {"event": "log", "data": {"timestamp": now_ts(), "level": level, "message": message}})


async def progress(manager: RunManager, run_id: str, value: int) -> None:
    await manager.publish(run_id, {"event": "progress", "data": {"progress": int(value)}})


async def node_status(manager: RunManager, run_id: str, node_type: str, status: str) -> None:
    await manager.publish(run_id, {"event": "node_status", "data": {"nodeType": node_type, "status": status}})


def stop_requested(state: RunState) -> bool:
    return state.stop_requested.is_set()

