from __future__ import annotations

import asyncio
import json
import secrets
import time
from dataclasses import dataclass, field
from typing import Any, AsyncIterator


@dataclass
class RunState:
    run_id: str
    created_at_ms: int
    queue: "asyncio.Queue[dict[str, Any]]" = field(default_factory=asyncio.Queue)
    stop_requested: asyncio.Event = field(default_factory=asyncio.Event)
    finished: asyncio.Event = field(default_factory=asyncio.Event)


class RunManager:
    def __init__(self) -> None:
        self._runs: dict[str, RunState] = {}

    def create_run(self) -> RunState:
        run_id = secrets.token_urlsafe(12)
        state = RunState(run_id=run_id, created_at_ms=int(time.time() * 1000))
        self._runs[run_id] = state
        return state

    def get(self, run_id: str) -> RunState | None:
        return self._runs.get(run_id)

    def request_stop(self, run_id: str) -> bool:
        state = self._runs.get(run_id)
        if not state:
            return False
        state.stop_requested.set()
        return True

    async def publish(self, run_id: str, payload: dict[str, Any]) -> None:
        state = self._runs.get(run_id)
        if not state:
            return
        await state.queue.put(payload)

    async def stream_sse(self, run_id: str) -> AsyncIterator[bytes]:
        state = self._runs.get(run_id)
        if not state:
            yield b"data: " + json.dumps({"event": "done", "data": {"status": "error", "error": "run_not_found"}}).encode("utf-8") + b"\n\n"
            return

        yield b"data: " + json.dumps({"event": "ready", "data": {"run_id": run_id}}).encode("utf-8") + b"\n\n"
        while True:
            if state.finished.is_set() and state.queue.empty():
                break
            try:
                item = await asyncio.wait_for(state.queue.get(), timeout=1.0)
            except asyncio.TimeoutError:
                yield b": keep-alive\n\n"
                continue
            yield b"data: " + json.dumps(item).encode("utf-8") + b"\n\n"


run_manager = RunManager()

