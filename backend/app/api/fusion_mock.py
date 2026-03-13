from __future__ import annotations

from datetime import date, datetime
from typing import Any

from fastapi import APIRouter, HTTPException, Query, Request
from urllib.parse import urlencode

from app.core.config import settings

router = APIRouter()


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value).date()
    except ValueError:
        try:
            return date.fromisoformat(value)
        except ValueError:
            return None


def _mock_invoices() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    base = date(2026, 1, 1)
    for i in range(1, 1001):
        rows.append(
            {
                "InvoiceId": i,
                "InvoiceNumber": f"INV-{i:06d}",
                "InvoiceAmount": float((i % 97) * 113.25),
                "CurrencyCode": "USD",
                "SupplierName": f"Supplier {((i - 1) % 25) + 1}",
                "LastUpdateDate": (base.replace(day=((i - 1) % 28) + 1)).isoformat(),
            }
        )
    return rows


def _parse_bool(value: str | None) -> bool:
    if not value:
        return False
    return value.strip().lower() in {"1", "true", "yes", "y", "on"}


def _apply_q_filter(items: list[dict[str, Any]], q: str) -> list[dict[str, Any]]:
    """
    Minimal Fusion-like `q=` support.

    Supported examples:
    - q=LastUpdateDate>=2026-01-01
    - q=InvoiceId=123
    - q=InvoiceNumber=INV-000123

    Multiple clauses can be separated by ';'
    """
    clauses = [c.strip() for c in q.split(";") if c.strip()]
    for clause in clauses:
        op = None
        for candidate in (">=", "<=", "=", ">", "<"):
            if candidate in clause:
                op = candidate
                break
        if not op:
            continue
        field, raw = [s.strip() for s in clause.split(op, 1)]

        if field.lower() == "lastupdatedate":
            target = _parse_date(raw)
            if not target:
                continue

            def ok(row: dict[str, Any]) -> bool:
                d = _parse_date(row.get("LastUpdateDate"))
                if not d:
                    return False
                if op == ">=":
                    return d >= target
                if op == "<=":
                    return d <= target
                if op == ">":
                    return d > target
                if op == "<":
                    return d < target
                return d == target

            items = [r for r in items if ok(r)]
            continue

        if field.lower() == "invoiceid":
            try:
                target_int = int(raw)
            except ValueError:
                continue
            if op != "=":
                continue
            items = [r for r in items if int(r.get("InvoiceId", -1)) == target_int]
            continue

        if field.lower() == "invoicenumber":
            if op != "=":
                continue
            items = [r for r in items if str(r.get("InvoiceNumber", "")) == raw]
            continue

    return items


def _apply_fields(items: list[dict[str, Any]], fields: str) -> list[dict[str, Any]]:
    cols = [c.strip() for c in fields.split(",") if c.strip()]
    if not cols:
        return items
    return [{k: r.get(k) for k in cols} for r in items]


@router.get("/fscmRestApi/resources/11.13.18.05/invoices")
def invoices(
    request: Request,
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
    lastUpdateDate: str | None = Query(None, description="ISO date or datetime"),
    q: str | None = Query(None, description="Fusion-style query (minimal subset supported)"),
    fields: str | None = Query(None, description="Comma-separated field projection"),
    onlyData: str | None = Query(None, description="If true, return only the items array"),
) -> dict[str, Any]:
    if settings.fusion_mock_require_auth and not request.headers.get("Authorization"):
        raise HTTPException(status_code=401, detail="Unauthorized")

    since = _parse_date(lastUpdateDate)
    items = _mock_invoices()
    if since:
        filtered: list[dict[str, Any]] = []
        for r in items:
            d = _parse_date(r.get("LastUpdateDate"))
            if d and d >= since:
                filtered.append(r)
        items = filtered

    if q:
        items = _apply_q_filter(items, q)

    if fields:
        items = _apply_fields(items, fields)

    page = items[offset : offset + limit]
    has_more = offset + limit < len(items)

    if _parse_bool(onlyData):
        return {"items": page}

    base = str(request.url).split("?", 1)[0]
    links: list[dict[str, str]] = [{"rel": "self", "href": str(request.url)}]
    if has_more:
        next_q = dict(request.query_params)
        next_q["offset"] = str(offset + limit)
        next_href = base + "?" + urlencode(next_q)
        links.append({"rel": "next", "href": next_href})

    return {
        "items": page,
        "count": len(page),
        "hasMore": has_more,
        "offset": offset,
        "limit": limit,
        "totalResults": len(items),
        "links": links,
    }
