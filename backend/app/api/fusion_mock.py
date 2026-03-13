from __future__ import annotations

from datetime import date, datetime
from typing import Any

from fastapi import APIRouter, Query

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


@router.get("/fscmRestApi/resources/11.13.18.05/invoices")
def invoices(
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
    lastUpdateDate: str | None = Query(None, description="ISO date or datetime"),
) -> dict[str, Any]:
    since = _parse_date(lastUpdateDate)
    items = _mock_invoices()
    if since:
        filtered: list[dict[str, Any]] = []
        for r in items:
            d = _parse_date(r.get("LastUpdateDate"))
            if d and d >= since:
                filtered.append(r)
        items = filtered

    page = items[offset : offset + limit]
    has_more = offset + limit < len(items)
    return {
        "items": page,
        "count": len(page),
        "hasMore": has_more,
        "offset": offset,
        "limit": limit,
        "totalResults": len(items),
    }

