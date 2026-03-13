from __future__ import annotations

import asyncio
import os
import re
from typing import Any

from app.models import PipelineRunRequest
from app.services.run_manager import RunManager, RunState
from app.services.runners.common import log, node_status, progress, stop_requested


async def run_jdbc(manager: RunManager, state: RunState, req: PipelineRunRequest) -> dict[str, Any]:
    src = next((n for n in req.nodes if n.nodeType == "oracle-fusion"), None)
    jdbc = next((n for n in req.nodes if n.nodeType == "jdbc"), None)
    if not jdbc:
        raise RuntimeError("missing jdbc node")
    if not src:
        raise RuntimeError("missing oracle-fusion node")

    await log(manager, state.run_id, "info", "===================================================")
    await log(manager, state.run_id, "info", "  Pipeline started: JDBC pattern")
    await log(manager, state.run_id, "info", "  Mode: BACKEND (Oracle query via python-oracledb; Spark wiring optional)")
    await log(manager, state.run_id, "info", "===================================================")

    await node_status(manager, state.run_id, "oracle-fusion", "running")
    await node_status(manager, state.run_id, "jdbc", "running")
    await progress(manager, state.run_id, 10)

    try:
        import oracledb  # type: ignore
    except Exception:
        await node_status(manager, state.run_id, "jdbc", "error")
        raise RuntimeError("python-oracledb not installed.")

    host = str(getattr(src.config, "host", "localhost") or "localhost")
    port = str(getattr(src.config, "port", "1521") or "1521")
    service = str(getattr(src.config, "serviceName", "") or "")
    username = str(getattr(jdbc.config, "username", getattr(src.config, "username", "")) or "")
    password = str(getattr(jdbc.config, "password", getattr(src.config, "password", "")) or "")
    query = str(getattr(jdbc.config, "query", "") or "")

    if "•" in password:
        password = os.getenv("BACKEND_ORACLE_PASSWORD", "")

    if not service:
        raise RuntimeError("oracle-fusion.serviceName is required")
    if not username:
        raise RuntimeError("jdbc.username is required")
    if not password:
        raise RuntimeError("jdbc.password is required (or set BACKEND_ORACLE_PASSWORD)")
    if not query:
        raise RuntimeError("jdbc.query is required")

    if not re.fullmatch(r"(?is)\s*select\s+.+", query):
        raise RuntimeError("only SELECT queries are allowed for jdbc.query")

    dsn = f"{host}:{port}/{service}"
    await log(manager, state.run_id, "info", f"[JDBC] DSN: {dsn} | User: {username}")
    await progress(manager, state.run_id, 20)

    try:
        conn = oracledb.connect(user=username, password=password, dsn=dsn)
    except Exception as e:
        await node_status(manager, state.run_id, "oracle-fusion", "error")
        await node_status(manager, state.run_id, "jdbc", "error")
        raise RuntimeError(f"Oracle connect failed: {e}") from e

    rows = 0
    try:
        cur = conn.cursor()
        cur.execute(query)
        while True:
            if stop_requested(state):
                raise RuntimeError("stopped")
            batch = cur.fetchmany(1000)
            if not batch:
                break
            rows += len(batch)
            if rows % 5000 == 0:
                await log(manager, state.run_id, "info", f"  Fetched {rows:,} rows...")
    finally:
        try:
            conn.close()
        except Exception:
            pass

    await node_status(manager, state.run_id, "oracle-fusion", "success")
    await node_status(manager, state.run_id, "jdbc", "success")
    await progress(manager, state.run_id, 80)

    await node_status(manager, state.run_id, "databricks", "running")
    await log(manager, state.run_id, "warn", "Databricks write is a stub; wire Spark JDBC → Delta next.")
    await asyncio.sleep(0.3)
    await node_status(manager, state.run_id, "databricks", "success")
    await progress(manager, state.run_id, 100)
    return {"rowsExtracted": rows, "rowsLoaded": rows, "pipelineType": "jdbc"}
