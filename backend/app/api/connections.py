from __future__ import annotations

import base64
import hashlib
import hmac
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.models import NodeConfig, NodeType


router = APIRouter()


class ConnectionTestRequest(BaseModel):
    nodeType: NodeType = Field(alias="nodeType")
    config: NodeConfig = Field(default_factory=NodeConfig)


class ConnectionTestResponse(BaseModel):
    ok: bool
    message: str


_JDBC_THIN_RE = re.compile(
    r"^jdbc:oracle:thin:@(?:(?://)?)(?P<host>[^:/?#]+)(?::(?P<port>\d+))?/(?P<service>[^/?#]+)",
    re.IGNORECASE,
)


def _masked(s: str) -> bool:
    return ("â€¢" in s) or ("•" in s)


async def _test_oracle_dsn(host: str, port: str, service: str, username: str, password: str) -> None:
    import oracledb  # type: ignore

    dsn = f"{host}:{port}/{service}"
    conn = oracledb.connect(user=username, password=password, dsn=dsn)
    try:
        # Lightweight "real" validation beyond TCP: a round-trip query.
        cur = conn.cursor()
        cur.execute("select 1 from dual")
        cur.fetchone()
    finally:
        try:
            conn.close()
        except Exception:
            pass


def _adls_shared_key_auth_header(
    *,
    account: str,
    account_key_b64: str,
    method: str,
    canonicalized_resource: str,
    x_ms_date: str,
    x_ms_version: str,
) -> str:
    # https://learn.microsoft.com/en-us/rest/api/storageservices/authorize-with-shared-key
    canonicalized_headers = f"x-ms-date:{x_ms_date}\nx-ms-version:{x_ms_version}\n"
    string_to_sign = (
        f"{method}\n"  # VERB
        "\n"  # Content-Encoding
        "\n"  # Content-Language
        "\n"  # Content-Length
        "\n"  # Content-MD5
        "\n"  # Content-Type
        "\n"  # Date
        "\n"  # If-Modified-Since
        "\n"  # If-Match
        "\n"  # If-None-Match
        "\n"  # If-Unmodified-Since
        "\n"  # Range
        f"{canonicalized_headers}{canonicalized_resource}"
    )
    key = base64.b64decode(account_key_b64)
    sig = base64.b64encode(hmac.new(key, string_to_sign.encode("utf-8"), hashlib.sha256).digest()).decode("utf-8")
    return f"SharedKey {account}:{sig}"


async def _test_adls_container_list(account: str, key_b64: str, container: str) -> None:
    x_ms_date = datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S GMT")
    x_ms_version = "2020-10-02"

    canonicalized_resource = f"/{account}/{container}\ncomp:list\nmaxresults:1\nrestype:container"
    auth = _adls_shared_key_auth_header(
        account=account,
        account_key_b64=key_b64,
        method="GET",
        canonicalized_resource=canonicalized_resource,
        x_ms_date=x_ms_date,
        x_ms_version=x_ms_version,
    )

    url = f"https://{account}.blob.core.windows.net/{container}"
    params = {"restype": "container", "comp": "list", "maxresults": "1"}
    headers = {"x-ms-date": x_ms_date, "x-ms-version": x_ms_version, "Authorization": auth}

    async with httpx.AsyncClient(timeout=20.0) as client:
        r = await client.get(url, params=params, headers=headers)
        if r.status_code != 200:
            raise RuntimeError(f"ADLS list failed ({r.status_code}): {r.text[:300]}")


@router.post("/connections/test", response_model=ConnectionTestResponse)
async def test_connection(req: ConnectionTestRequest) -> ConnectionTestResponse:
    node_type = req.nodeType
    cfg: dict[str, Any] = req.config.model_dump()

    try:
        if node_type == "oracle-fusion":
            host = str(cfg.get("host") or "localhost")
            port = str(cfg.get("port") or "1521")
            service = str(cfg.get("serviceName") or "")
            username = str(cfg.get("username") or "")
            password = str(cfg.get("password") or "")
            if _masked(password):
                password = os.getenv("BACKEND_ORACLE_PASSWORD", "")
            if not service:
                raise RuntimeError("oracle-fusion.serviceName is required")
            if not username:
                raise RuntimeError("oracle-fusion.username is required")
            if not password:
                raise RuntimeError("oracle-fusion.password is required (or set BACKEND_ORACLE_PASSWORD)")
            await _test_oracle_dsn(host, port, service, username, password)
            return ConnectionTestResponse(ok=True, message="oracle connection ok")

        if node_type == "jdbc":
            jdbc_url = str(cfg.get("jdbcUrl") or "")
            username = str(cfg.get("username") or "")
            password = str(cfg.get("password") or "")
            if _masked(password):
                password = os.getenv("BACKEND_ORACLE_PASSWORD", "")
            if not jdbc_url:
                raise RuntimeError("jdbc.jdbcUrl is required")
            if not username:
                raise RuntimeError("jdbc.username is required")
            if not password:
                raise RuntimeError("jdbc.password is required (or set BACKEND_ORACLE_PASSWORD)")
            m = _JDBC_THIN_RE.match(jdbc_url)
            if not m:
                raise RuntimeError("only jdbc:oracle:thin URLs are supported for connection test")
            host = m.group("host")
            port = m.group("port") or "1521"
            service = m.group("service")
            await _test_oracle_dsn(host, port, service, username, password)
            return ConnectionTestResponse(ok=True, message="jdbc oracle connection ok")

        if node_type == "rest-api":
            endpoint = str(cfg.get("endpoint") or "")
            if not endpoint:
                raise RuntimeError("rest-api.endpoint is required")
            auth_type = str(cfg.get("authType") or "").lower()
            username = str(cfg.get("username") or "")
            password = str(cfg.get("password") or "")
            headers: dict[str, str] = {}
            auth: Any = None
            if auth_type == "basic" and username and password and not _masked(password):
                auth = (username, password)
            if auth_type == "bearer":
                token = str(cfg.get("clientSecret") or cfg.get("accessToken") or "")
                if _masked(token):
                    token = os.getenv("BACKEND_REST_API_BEARER_TOKEN", "")
                if token:
                    headers["Authorization"] = f"Bearer {token}"
            async with httpx.AsyncClient(timeout=20.0) as client:
                r = await client.get(endpoint, params={"limit": 1, "offset": 0}, headers=headers, auth=auth)
                if r.status_code >= 400:
                    raise RuntimeError(f"HTTP {r.status_code}: {r.text[:300]}")
            return ConnectionTestResponse(ok=True, message="rest api reachable")

        if node_type == "databricks":
            workspace_url = str(cfg.get("workspaceUrl") or "")
            token = str(cfg.get("accessToken") or "")
            if _masked(token):
                token = os.getenv("BACKEND_DATABRICKS_TOKEN", "")
            if not workspace_url:
                raise RuntimeError("databricks.workspaceUrl is required")
            if not token:
                raise RuntimeError("databricks.accessToken is required (or set BACKEND_DATABRICKS_TOKEN)")
            workspace_url = workspace_url.rstrip("/")
            url = f"{workspace_url}/api/2.0/clusters/list"
            async with httpx.AsyncClient(timeout=20.0) as client:
                r = await client.get(url, headers={"Authorization": f"Bearer {token}"})
                if r.status_code >= 400:
                    raise RuntimeError(f"Databricks API error ({r.status_code}): {r.text[:300]}")
            return ConnectionTestResponse(ok=True, message="databricks api ok")

        if node_type == "bicc":
            out = str(cfg.get("outputPath") or "")
            if not out:
                raise RuntimeError("bicc.outputPath is required")
            p = Path(out).expanduser()
            p.mkdir(parents=True, exist_ok=True)
            test_file = p / f".bicc_write_test_{os.getpid()}.tmp"
            test_file.write_text("ok", encoding="utf-8")
            test_file.unlink(missing_ok=True)
            return ConnectionTestResponse(ok=True, message="output path writable")

        if node_type == "goldengate":
            install = str(cfg.get("installPath") or "")
            trail = str(cfg.get("trailFileLocation") or "")
            if not install:
                raise RuntimeError("goldengate.installPath is required")
            if not Path(install).expanduser().exists():
                raise RuntimeError("goldengate.installPath not found on backend host")
            if trail and not Path(trail).expanduser().exists():
                raise RuntimeError("goldengate.trailFileLocation not found on backend host")
            return ConnectionTestResponse(ok=True, message="goldengate paths ok")

        if node_type == "cloud-storage":
            storage_type = str(cfg.get("storageType") or "").lower()
            if storage_type in ("", "adls"):
                account = str(cfg.get("accountName") or "")
                key = str(cfg.get("accessKey") or "")
                container = str(cfg.get("container") or "")
                if _masked(key):
                    key = os.getenv("BACKEND_ADLS_ACCESS_KEY", "")
                if not account:
                    raise RuntimeError("cloud-storage.accountName is required for ADLS")
                if not key:
                    raise RuntimeError("cloud-storage.accessKey is required for ADLS (or set BACKEND_ADLS_ACCESS_KEY)")
                if not container:
                    raise RuntimeError("cloud-storage.container is required for ADLS")
                await _test_adls_container_list(account, key, container)
                return ConnectionTestResponse(ok=True, message="adls container list ok")

            if storage_type == "local":
                base = str(cfg.get("path") or "")
                if not base:
                    raise RuntimeError("cloud-storage.path is required for local")
                p = Path(base).expanduser()
                p.mkdir(parents=True, exist_ok=True)
                test_file = p / f".local_write_test_{os.getpid()}.tmp"
                test_file.write_text("ok", encoding="utf-8")
                test_file.unlink(missing_ok=True)
                return ConnectionTestResponse(ok=True, message="local path writable")

            raise RuntimeError(f"storageType '{storage_type}' connection test not implemented")

        return ConnectionTestResponse(ok=False, message=f"unknown nodeType: {node_type}")
    except Exception as e:
        return ConnectionTestResponse(ok=False, message=str(e))
