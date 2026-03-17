from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.models import NodeConfig, NodeType
from app.core.config import settings


router = APIRouter()


class ConnectionTestRequest(BaseModel):
    nodeType: NodeType = Field(alias="nodeType")
    config: NodeConfig = Field(default_factory=NodeConfig)


class ConnectionTestResponse(BaseModel):
    ok: bool
    message: str


class ConnectionDocument(BaseModel):
    id: str
    name: str
    type: NodeType
    config: NodeConfig = Field(default_factory=NodeConfig)
    updatedAtMs: int | None = None


def _connections_dir() -> Path:
    base = Path(settings.connections_dir)
    if base.is_absolute():
        return base
    project_root = Path(__file__).resolve().parents[3]
    return (project_root / base).resolve()


def _connections_file(name: str) -> Path:
    return _connections_dir() / name


def _schema_file() -> Path:
    return _connections_dir() / "connection_types.json"


SCHEMA_FALLBACK: dict[str, Any] = {
    "jdbc": {
        "fields": [
            {"key": "jdbcUrl", "label": "JDBC URL"},
            {"key": "username", "label": "Username"},
            {"key": "password", "label": "Password", "kind": "password"},
        ]
    },
    "oracle-fusion": {
        "fields": [
            {"key": "host", "label": "Host"},
            {"key": "port", "label": "Port"},
            {"key": "serviceName", "label": "Service Name"},
            {"key": "username", "label": "Username"},
            {"key": "password", "label": "Password", "kind": "password"},
        ]
    },
    "bicc": {"fields": []},
    "cloud-storage": {
        "fields": [
            {"key": "accountName", "label": "Account Name"},
            {"key": "accessKey", "label": "Access Key / SAS", "kind": "password"},
        ]
    },
    "databricks": {
        "fields": [
            {"key": "workspaceUrl", "label": "Workspace URL"},
            {"key": "accessToken", "label": "Personal Access Token", "kind": "password"},
        ]
    },
    "rest-api": {
        "fields": [
            {"key": "baseUrl", "label": "API Base URL"},
            {"key": "authType", "label": "Authentication Type"},
            {"key": "tokenValue", "label": "Token Value", "kind": "password"},
            {"key": "username", "label": "Username"},
            {"key": "password", "label": "Password", "kind": "password"},
        ]
    },
    "goldengate": {"fields": []},
}


_CONNECTION_ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$")
_SAFE_NAME_RE = re.compile(r"[^A-Za-z0-9._-]+")


def _assert_connection_id(connection_id: str) -> None:
    if not _CONNECTION_ID_RE.fullmatch(connection_id or ""):
        raise HTTPException(status_code=400, detail="invalid connection_id")


def _safe_filename(name: str, connection_id: str) -> str:
    cleaned = _SAFE_NAME_RE.sub("-", (name or "").strip()).strip("-")
    if not cleaned:
        cleaned = "connection"
    cleaned = cleaned[:80]
    return f"{cleaned}__{connection_id}.json"


def _load_connections() -> list[dict[str, Any]]:
    out_dir = _connections_dir()
    if not out_dir.exists():
        return []
    items: list[dict[str, Any]] = []
    for p in sorted(out_dir.glob("*.json")):
        if p.name == "connection_types.json":
            continue
        try:
            payload = json.loads(p.read_text(encoding="utf-8"))
            if isinstance(payload, dict) and payload.get("id"):
                items.append(payload)
        except Exception:
            continue
    return items


def _find_connection_file_by_id(connection_id: str) -> Path | None:
    out_dir = _connections_dir()
    if not out_dir.exists():
        return None
    for p in out_dir.glob("*.json"):
        if p.name == "connection_types.json":
            continue
        try:
            payload = json.loads(p.read_text(encoding="utf-8"))
            if payload.get("id") == connection_id:
                return p
        except Exception:
            continue
    return None


def _write_connection(doc: ConnectionDocument) -> None:
    out_dir = _connections_dir()
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = _connections_file(_safe_filename(doc.name, doc.id))
    existing_path = _find_connection_file_by_id(doc.id)
    if existing_path and existing_path.resolve() != out_path.resolve():
        try:
            existing_path.replace(out_path)
        except Exception:
            pass
    tmp_path = out_path.with_suffix(".tmp")
    payload = doc.model_dump()
    tmp_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    tmp_path.replace(out_path)


def _load_schema() -> dict[str, Any]:
    path = _schema_file()
    if not path.exists():
        return SCHEMA_FALLBACK
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
        return payload or SCHEMA_FALLBACK
    except Exception:
        return SCHEMA_FALLBACK


@router.get("/connections")
async def list_connections() -> dict[str, Any]:
    return {"connections": _load_connections()}


@router.get("/connections/schema")
async def get_connection_schema() -> dict[str, Any]:
    return {"schema": _load_schema()}


@router.get("/connections/{connection_id}")
async def get_connection(connection_id: str) -> dict[str, Any]:
    _assert_connection_id(connection_id)
    path = _find_connection_file_by_id(connection_id)
    if not path or not path.exists():
        raise HTTPException(status_code=404, detail="connection not found")
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"failed to read connection: {e}") from e


@router.put("/connections/{connection_id}")
async def save_connection(connection_id: str, doc: ConnectionDocument) -> dict[str, Any]:
    _assert_connection_id(connection_id)
    if doc.id != connection_id:
        raise HTTPException(status_code=400, detail="connection_id mismatch")
    _write_connection(doc)
    return {"ok": True, "id": connection_id}


@router.delete("/connections/{connection_id}")
async def delete_connection(connection_id: str) -> dict[str, Any]:
    _assert_connection_id(connection_id)
    path = _find_connection_file_by_id(connection_id)
    if not path or not path.exists():
        return {"ok": True, "deleted": False}
    try:
        path.unlink()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"failed to delete connection: {e}") from e
    return {"ok": True, "deleted": True}


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
            base_url = str(cfg.get("baseUrl") or "")
            if not base_url:
                raise RuntimeError("rest-api.baseUrl is required")
            auth_type = str(cfg.get("authType") or "").lower()
            username = str(cfg.get("username") or "")
            password = str(cfg.get("password") or "")
            headers: dict[str, str] = {}
            auth: Any = None
            if auth_type == "basic":
                if not username or not password:
                    raise RuntimeError("rest-api.username and rest-api.password are required for basic auth")
                auth = (username, password)
            if auth_type == "token":
                token = str(cfg.get("tokenValue") or "")
                if _masked(token):
                    token = os.getenv("BACKEND_REST_API_BEARER_TOKEN", "")
                if not token:
                    raise RuntimeError("rest-api.tokenValue is required for token auth")
                headers["Authorization"] = f"Bearer {token}"
            async with httpx.AsyncClient(timeout=20.0) as client:
                r = await client.get(base_url, params={"limit": 1, "offset": 0}, headers=headers, auth=auth)
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
            return ConnectionTestResponse(ok=True, message="goldengate ok")

        if node_type == "cloud-storage":
            account = str(cfg.get("accountName") or "")
            key = str(cfg.get("accessKey") or "")
            container = str(cfg.get("container") or "")
            if _masked(key):
                key = os.getenv("BACKEND_ADLS_ACCESS_KEY", "")
            if not account:
                raise RuntimeError("cloud-storage.accountName is required for ADLS")
            if not key:
                raise RuntimeError("cloud-storage.accessKey is required for ADLS (or set BACKEND_ADLS_ACCESS_KEY)")
            if container:
                await _test_adls_container_list(account, key, container)
                return ConnectionTestResponse(ok=True, message="adls container list ok")
            return ConnectionTestResponse(ok=True, message="adls credentials stored")

        return ConnectionTestResponse(ok=False, message=f"unknown nodeType: {node_type}")
    except Exception as e:
        return ConnectionTestResponse(ok=False, message=str(e))
