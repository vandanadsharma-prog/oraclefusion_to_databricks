from __future__ import annotations

import asyncio
from typing import Any

import httpx

from app.models import PipelineRunRequest
from app.services.run_manager import RunManager, RunState
from app.services.runners.common import log, node_status, progress, stop_requested


async def run_rest_api(manager: RunManager, state: RunState, req: PipelineRunRequest) -> dict[str, Any]:
    api = next((n for n in req.nodes if n.nodeType == "rest-api"), None)
    if not api:
        raise RuntimeError("missing rest-api node")

    base_url = str(getattr(api.config, "baseUrl", ""))
    if not base_url:
        raise RuntimeError("rest-api baseUrl is required")

    page_size = int(getattr(api.config, "pageSize", 200) or 200)
    filter_param = str(getattr(api.config, "filterParam", "lastUpdateDate") or "lastUpdateDate")
    filter_value = str(getattr(api.config, "filterValue", "") or "")
    auth_type = str(getattr(api.config, "authType", "") or "").lower()
    username = str(getattr(api.config, "username", "") or "")
    password = str(getattr(api.config, "password", "") or "")
    token_value = str(getattr(api.config, "tokenValue", "") or "")

    await log(manager, state.run_id, "info", "===================================================")
    await log(manager, state.run_id, "info", "  Pipeline started: REST-API pattern")
    await log(manager, state.run_id, "info", "  Mode: BACKEND (HTTP client)")
    await log(manager, state.run_id, "info", "===================================================")

    await node_status(manager, state.run_id, "rest-api", "running")
    await progress(manager, state.run_id, 10)

    total = 0
    offset = 0
    async with httpx.AsyncClient(timeout=30.0) as client:
        while True:
            if stop_requested(state):
                raise RuntimeError("stopped")

            params: dict[str, Any] = {"limit": page_size, "offset": offset}
            if filter_value:
                params[filter_param] = filter_value
            headers: dict[str, str] = {}
            auth: Any = None
            if auth_type == "basic" and username and password:
                auth = (username, password)
            if auth_type == "token" and token_value:
                headers["Authorization"] = f"Bearer {token_value}"

            r = await client.get(base_url, params=params, headers=headers, auth=auth)
            r.raise_for_status()
            payload = r.json()
            items = payload.get("items", [])
            total += len(items)
            await log(manager, state.run_id, "info", f"[API] fetched {len(items)} items (offset={offset})")
            await asyncio.sleep(0.05)

            if not payload.get("hasMore") or not items:
                break
            offset += page_size
            await progress(manager, state.run_id, min(70, 10 + int((offset / max(1, payload.get("totalResults", 1))) * 60)))

    await node_status(manager, state.run_id, "rest-api", "success")
    await progress(manager, state.run_id, 75)

    await node_status(manager, state.run_id, "databricks", "running")
    await log(manager, state.run_id, "warn", "Databricks write is a stub; wire Delta/Unity Catalog write next.")
    await asyncio.sleep(0.3)
    await node_status(manager, state.run_id, "databricks", "success")
    await progress(manager, state.run_id, 100)

    return {"rowsExtracted": total, "rowsLoaded": total, "pipelineType": "rest-api"}
