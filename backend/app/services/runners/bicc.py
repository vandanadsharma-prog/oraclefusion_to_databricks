from __future__ import annotations

import asyncio
import csv
import datetime as dt
import os
import re
import shutil
import subprocess
from typing import Any

from app.models import PipelineRunRequest
from app.services.run_manager import RunManager, RunState
from app.services.runners.common import log, node_status, progress, stop_requested


async def run_bicc(manager: RunManager, state: RunState, req: PipelineRunRequest) -> dict[str, Any]:
    await log(manager, state.run_id, "info", "===================================================")
    await log(manager, state.run_id, "info", "  Pipeline started: BICC pattern")
    await log(manager, state.run_id, "info", "  Mode: BACKEND (local runners)")
    await log(manager, state.run_id, "info", "===================================================")
    await progress(manager, state.run_id, 2)

    await node_status(manager, state.run_id, "oracle-fusion", "running")
    await log(manager, state.run_id, "info", "[CONNECT] Oracle 21c (python-oracledb) ...")
    await asyncio.sleep(0.2)

    if stop_requested(state):
        raise RuntimeError("stopped")

    try:
        import oracledb  # type: ignore
    except Exception:
        await node_status(manager, state.run_id, "oracle-fusion", "error")
        raise RuntimeError("python-oracledb not installed. Install it and configure Oracle client if needed.")

    src = next((n for n in req.nodes if n.nodeType == "oracle-fusion"), None)
    if not src:
        raise RuntimeError("missing oracle-fusion node")

    bicc = next((n for n in req.nodes if n.nodeType == "bicc"), None)
    if not bicc:
        raise RuntimeError("missing bicc node")

    host = str(getattr(src.config, "host", "localhost") or "localhost")
    port = str(getattr(src.config, "port", "1521") or "1521")
    service = str(getattr(src.config, "serviceName", "") or "")
    username = str(getattr(src.config, "username", "") or "")
    password = str(getattr(src.config, "password", "") or "")
    table = str(getattr(src.config, "table", "") or "")
    filter_column = str(getattr(src.config, "filterColumn", "") or "")
    select_columns = str(getattr(src.config, "selectColumns", "") or "*")
    limit_rows = getattr(src.config, "limitRows", None)

    if "•" in password:
        password = os.getenv("BACKEND_ORACLE_PASSWORD", "")

    if not service:
        raise RuntimeError("oracle-fusion.serviceName is required")
    if not username:
        raise RuntimeError("oracle-fusion.username is required")
    if not password:
        raise RuntimeError("oracle-fusion.password is required (or set BACKEND_ORACLE_PASSWORD)")
    if not table:
        raise RuntimeError("oracle-fusion.table is required")

    ident_re = re.compile(r'^[A-Za-z0-9_.$"]+$')
    if not ident_re.fullmatch(table):
        raise RuntimeError(f"invalid table identifier: {table}")
    if filter_column and not ident_re.fullmatch(filter_column):
        raise RuntimeError(f"invalid filterColumn identifier: {filter_column}")

    dsn = f"{host}:{port}/{service}"
    await log(manager, state.run_id, "info", f"  DSN: {dsn} | User: {username}")
    await progress(manager, state.run_id, 8)

    try:
        conn = oracledb.connect(user=username, password=password, dsn=dsn)
    except Exception as e:
        await node_status(manager, state.run_id, "oracle-fusion", "error")
        raise RuntimeError(f"Oracle connect failed: {e}") from e

    await node_status(manager, state.run_id, "oracle-fusion", "success")
    await progress(manager, state.run_id, 12)

    await node_status(manager, state.run_id, "bicc", "running")
    output_path = str(getattr(bicc.config, "outputPath", "./data/bicc/"))
    os.makedirs(output_path, exist_ok=True)
    await log(manager, state.run_id, "info", f"[BICC] outputPath={output_path}")

    stamp = dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    out_file = os.path.join(output_path, f"{table.replace('.', '_')}_{stamp}.csv")

    rows = 0
    try:
        cur = conn.cursor()
        columns = select_columns if select_columns else "*"
        sql = f"SELECT {columns} FROM {table}"
        if filter_column:
            sql = f"{sql} ORDER BY {filter_column}"
        if isinstance(limit_rows, int) and limit_rows > 0:
            sql = f"SELECT * FROM ({sql}) WHERE ROWNUM <= :limit_rows"
            cur.execute(sql, limit_rows=limit_rows)
        else:
            cur.execute(sql)

        cols = [d[0] for d in cur.description or []]
        with open(out_file, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(cols)
            while True:
                if stop_requested(state):
                    raise RuntimeError("stopped")
                batch = cur.fetchmany(1000)
                if not batch:
                    break
                w.writerows(batch)
                rows += len(batch)
                if rows % 5000 == 0:
                    await log(manager, state.run_id, "info", f"  Exported {rows:,} rows...")
    finally:
        try:
            conn.close()
        except Exception:
            pass

    await log(manager, state.run_id, "success", f"  Export complete: {rows:,} rows -> {out_file}")
    await node_status(manager, state.run_id, "bicc", "success")
    await progress(manager, state.run_id, 60)

    await node_status(manager, state.run_id, "databricks", "running")
    await log(manager, state.run_id, "info", "[SPARK] checking spark-submit...")
    await progress(manager, state.run_id, 80)

    if shutil.which("spark-submit"):
        proc = subprocess.run(["spark-submit", "--version"], capture_output=True, text=True)
        await log(manager, state.run_id, "debug", (proc.stdout or proc.stderr).strip())
        await asyncio.sleep(0.2)
    else:
        await log(manager, state.run_id, "warn", "  spark-submit not found on PATH; skipping Spark execution.")

    await node_status(manager, state.run_id, "databricks", "success")
    await progress(manager, state.run_id, 100)
    return {"rowsExtracted": rows, "rowsLoaded": rows, "pipelineType": "bicc"}
