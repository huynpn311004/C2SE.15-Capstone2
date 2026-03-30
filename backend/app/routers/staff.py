from __future__ import annotations

import csv
from datetime import date, datetime
from io import BytesIO, StringIO
import re

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from openpyxl import load_workbook
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db

router = APIRouter(prefix="/staff", tags=["staff"])


def _dict_row(row) -> dict:
    return dict(row._mapping)


def _status_label(expiry_date: date) -> str:
    today = date.today()
    if expiry_date < today:
        return "Het Han"
    if (expiry_date - today).days <= 7:
        return "Sap Het Han"
    return "Moi"


def _parse_date_input(value) -> date:
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            raise ValueError("Ngay het han trong")
        for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
            try:
                return datetime.strptime(stripped, fmt).date()
            except ValueError:
                continue
    raise ValueError("Ngay het han khong hop le")


def _normalize_header(header: object) -> str:
    if header is None:
        return ""
    value = str(header).strip().lower()
    value = value.replace(" ", "_")
    value = value.replace("-", "_")
    return value


def _build_product_sku(name: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "", name.strip().lower())
    if not base:
        base = "product"
    return f"sku_{base[:20]}"


def _generate_unique_sku(db: Session, supermarket_id: int, product_name: str) -> str:
    base = _build_product_sku(product_name)
    candidate = base
    index = 1

    while True:
        exists = db.execute(
            text(
                """
                SELECT id
                FROM products
                WHERE supermarket_id = :supermarket_id
                  AND sku = :sku
                LIMIT 1
                """
            ),
            {"supermarket_id": supermarket_id, "sku": candidate},
        ).first()

        if not exists:
            return candidate

        index += 1
        candidate = f"{base}_{index}"


def _get_staff_scope(db: Session, user_id: int) -> dict[str, int]:
    user = db.execute(
        text(
            """
            SELECT id, role, store_id, supermarket_id
            FROM users
            WHERE id = :id
            LIMIT 1
            """
        ),
        {"id": user_id},
    ).first()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    role = (user.role or "").lower()
    if role != "store_staff":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tai khoan khong co quyen staff.",
        )

    if not user.store_id or not user.supermarket_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tai khoan staff chua duoc gan store.",
        )

    return {"store_id": int(user.store_id), "supermarket_id": int(user.supermarket_id)}


def _resolve_or_create_product(db: Session, supermarket_id: int, product_name: str) -> int:
    name = product_name.strip()
    product = db.execute(
        text(
            """
            SELECT id
            FROM products
            WHERE supermarket_id = :supermarket_id
              AND LOWER(name) = LOWER(:name)
            LIMIT 1
            """
        ),
        {"supermarket_id": supermarket_id, "name": name},
    ).first()

    if product:
        return int(product.id)

    sku = _generate_unique_sku(db, supermarket_id, name)
    result = db.execute(
        text(
            """
            INSERT INTO products (supermarket_id, category_id, sku, name, base_price, image_url)
            VALUES (:supermarket_id, NULL, :sku, :name, 0, NULL)
            """
        ),
        {"supermarket_id": supermarket_id, "sku": sku, "name": name},
    )
    return int(result.lastrowid)


def _upsert_inventory_lot(
    db: Session,
    *,
    store_id: int,
    supermarket_id: int,
    lot_code: str,
    product_name: str,
    quantity: int,
    expiry_date: date,
) -> str:
    lot = db.execute(
        text(
            """
            SELECT id
            FROM inventory_lots
            WHERE store_id = :store_id
              AND lot_code = :lot_code
            LIMIT 1
            """
        ),
        {"store_id": store_id, "lot_code": lot_code},
    ).first()

    product_id = _resolve_or_create_product(db, supermarket_id, product_name)
    lot_status = _status_label(expiry_date)

    if lot:
        db.execute(
            text(
                """
                UPDATE inventory_lots
                SET product_id = :product_id,
                    expiry_date = :expiry_date,
                    qty_on_hand = :qty_on_hand,
                    status = :status
                WHERE id = :id
                """
            ),
            {
                "product_id": product_id,
                "expiry_date": expiry_date,
                "qty_on_hand": quantity,
                "status": lot_status,
                "id": int(lot.id),
            },
        )
        return "updated"

    db.execute(
        text(
            """
            INSERT INTO inventory_lots
                (store_id, product_id, lot_code, expiry_date, qty_on_hand, qty_reserved, status)
            VALUES
                (:store_id, :product_id, :lot_code, :expiry_date, :qty_on_hand, 0, :status)
            """
        ),
        {
            "store_id": store_id,
            "product_id": product_id,
            "lot_code": lot_code,
            "expiry_date": expiry_date,
            "qty_on_hand": quantity,
            "status": lot_status,
        },
    )
    return "created"


def _extract_rows_from_xlsx(file_bytes: bytes) -> list[dict[str, object]]:
    workbook = load_workbook(filename=BytesIO(file_bytes), data_only=True)
    sheet = workbook.active
    rows = list(sheet.iter_rows(values_only=True))
    if not rows:
        return []

    headers = [_normalize_header(h) for h in rows[0]]
    data_rows: list[dict[str, object]] = []
    for row in rows[1:]:
        if not row or all(cell is None or str(cell).strip() == "" for cell in row):
            continue
        item: dict[str, object] = {}
        for idx, value in enumerate(row):
            if idx < len(headers) and headers[idx]:
                item[headers[idx]] = value
        data_rows.append(item)
    return data_rows


def _extract_rows_from_csv(file_bytes: bytes) -> list[dict[str, object]]:
    text_stream = StringIO(file_bytes.decode("utf-8-sig"))
    reader = csv.DictReader(text_stream)
    rows = []
    for row in reader:
        normalized = {_normalize_header(k): v for k, v in row.items()}
        if any(str(v or "").strip() for v in normalized.values()):
            rows.append(normalized)
    return rows


def _read_import_rows(upload: UploadFile, file_bytes: bytes) -> list[dict[str, object]]:
    filename = (upload.filename or "").lower()
    if filename.endswith(".xlsx"):
        return _extract_rows_from_xlsx(file_bytes)
    if filename.endswith(".csv"):
        return _extract_rows_from_csv(file_bytes)

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Chi ho tro file .xlsx hoac .csv",
    )


def _pick_field(row: dict[str, object], *keys: str) -> object:
    for key in keys:
        if key in row and row[key] not in (None, ""):
            return row[key]
    return None


@router.get("/dashboard-summary")
def staff_dashboard_summary(
    user_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
):
    scope = _get_staff_scope(db, user_id)
    store_id = scope["store_id"]

    total_lots = db.execute(
        text("SELECT COUNT(*) FROM inventory_lots WHERE store_id = :store_id"),
        {"store_id": store_id},
    ).scalar() or 0

    near_expiry = db.execute(
        text(
            """
            SELECT COUNT(*)
            FROM inventory_lots
            WHERE store_id = :store_id
              AND expiry_date >= CURDATE()
              AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
              AND qty_on_hand > 0
            """
        ),
        {"store_id": store_id},
    ).scalar() or 0

    orders_today = db.execute(
        text(
            """
            SELECT COUNT(*)
            FROM orders
            WHERE store_id = :store_id
              AND DATE(created_at) = CURDATE()
            """
        ),
        {"store_id": store_id},
    ).scalar() or 0

    pending_requests = db.execute(
        text(
            """
            SELECT COUNT(*)
            FROM donation_requests dr
            JOIN donation_offers dof ON dof.id = dr.offer_id
            WHERE dof.store_id = :store_id
              AND LOWER(dr.status) = 'pending'
            """
        ),
        {"store_id": store_id},
    ).scalar() or 0

    return {
        "totalLots": int(total_lots),
        "nearExpiryProducts": int(near_expiry),
        "ordersToday": int(orders_today),
        "pendingRequests": int(pending_requests),
    }


@router.get("/inventory-lots")
def list_inventory_lots(
    user_id: int = Query(..., ge=1),
    status_filter: str = Query(default="all"),
    db: Session = Depends(get_db),
):
    scope = _get_staff_scope(db, user_id)
    store_id = scope["store_id"]

    rows = db.execute(
        text(
            """
            SELECT
                il.id,
                il.lot_code,
                il.qty_on_hand,
                il.expiry_date,
                p.name AS product_name
            FROM inventory_lots il
            JOIN products p ON p.id = il.product_id
            WHERE il.store_id = :store_id
            ORDER BY il.expiry_date ASC, il.id DESC
            """
        ),
        {"store_id": store_id},
    ).all()

    items = []
    for row in rows:
        item = _dict_row(row)
        computed_status = _status_label(item["expiry_date"])
        if status_filter != "all" and status_filter.strip().lower() != computed_status.lower():
            continue
        items.append(
            {
                "id": item["id"],
                "lotCode": item["lot_code"],
                "productName": item["product_name"],
                "quantity": int(item["qty_on_hand"] or 0),
                "expiryDate": item["expiry_date"].strftime("%Y-%m-%d"),
                "status": computed_status,
            }
        )

    return {"items": items}


@router.post("/inventory-lots")
def create_inventory_lot(
    payload: dict,
    user_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
):
    scope = _get_staff_scope(db, user_id)

    lot_code = (payload.get("lotCode") or "").strip()
    product_name = (payload.get("productName") or "").strip()
    quantity_raw = payload.get("quantity")
    expiry_date_raw = payload.get("expiryDate")

    if not lot_code or not product_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Du lieu khong hop le")

    try:
        quantity = int(quantity_raw)
        if quantity < 0:
            raise ValueError
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="So luong khong hop le") from exc

    try:
        expiry_date = _parse_date_input(expiry_date_raw)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    action = _upsert_inventory_lot(
        db,
        store_id=scope["store_id"],
        supermarket_id=scope["supermarket_id"],
        lot_code=lot_code,
        product_name=product_name,
        quantity=quantity,
        expiry_date=expiry_date,
    )
    db.commit()

    return {"success": True, "action": action}


@router.put("/inventory-lots/{lot_id}")
def update_inventory_lot(
    lot_id: int,
    payload: dict,
    user_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
):
    scope = _get_staff_scope(db, user_id)

    exists = db.execute(
        text(
            """
            SELECT id
            FROM inventory_lots
            WHERE id = :lot_id
              AND store_id = :store_id
            LIMIT 1
            """
        ),
        {"lot_id": lot_id, "store_id": scope["store_id"]},
    ).first()
    if not exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lo hang khong ton tai")

    lot_code = (payload.get("lotCode") or "").strip()
    product_name = (payload.get("productName") or "").strip()
    quantity_raw = payload.get("quantity")
    expiry_date_raw = payload.get("expiryDate")

    if not lot_code or not product_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Du lieu khong hop le")

    try:
        quantity = int(quantity_raw)
        if quantity < 0:
            raise ValueError
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="So luong khong hop le") from exc

    try:
        expiry_date = _parse_date_input(expiry_date_raw)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    product_id = _resolve_or_create_product(db, scope["supermarket_id"], product_name)
    next_status = _status_label(expiry_date)

    db.execute(
        text(
            """
            UPDATE inventory_lots
            SET lot_code = :lot_code,
                product_id = :product_id,
                qty_on_hand = :qty_on_hand,
                expiry_date = :expiry_date,
                status = :status
            WHERE id = :lot_id
              AND store_id = :store_id
            """
        ),
        {
            "lot_code": lot_code,
            "product_id": product_id,
            "qty_on_hand": quantity,
            "expiry_date": expiry_date,
            "status": next_status,
            "lot_id": lot_id,
            "store_id": scope["store_id"],
        },
    )
    db.commit()

    return {"success": True}


@router.delete("/inventory-lots/{lot_id}")
def delete_inventory_lot(
    lot_id: int,
    user_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
):
    scope = _get_staff_scope(db, user_id)

    result = db.execute(
        text(
            """
            DELETE FROM inventory_lots
            WHERE id = :lot_id
              AND store_id = :store_id
            """
        ),
        {"lot_id": lot_id, "store_id": scope["store_id"]},
    )
    db.commit()

    if (result.rowcount or 0) == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lo hang khong ton tai")

    return {"success": True}


@router.post("/inventory-lots/import-excel")
async def import_inventory_lots_from_excel(
    user_id: int = Query(..., ge=1),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    scope = _get_staff_scope(db, user_id)

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File trong")

    rows = _read_import_rows(file, file_bytes)
    if not rows:
        return {"success": True, "created": 0, "updated": 0, "failed": 0, "errors": []}

    created = 0
    updated = 0
    errors: list[dict[str, object]] = []

    for idx, row in enumerate(rows, start=2):
        lot_code_raw = _pick_field(row, "lot_code", "lotcode", "ma_lo", "ma_lo_hang")
        product_name_raw = _pick_field(row, "product_name", "product", "ten_san_pham", "san_pham")
        quantity_raw = _pick_field(row, "quantity", "qty", "so_luong")
        expiry_raw = _pick_field(row, "expiry_date", "expiry", "ngay_het_han", "han_su_dung")

        try:
            lot_code = str(lot_code_raw or "").strip()
            product_name = str(product_name_raw or "").strip()
            if not lot_code or not product_name:
                raise ValueError("Thieu ma lo hoac ten san pham")

            quantity = int(quantity_raw)
            if quantity < 0:
                raise ValueError("So luong phai >= 0")

            expiry_date = _parse_date_input(expiry_raw)
            action = _upsert_inventory_lot(
                db,
                store_id=scope["store_id"],
                supermarket_id=scope["supermarket_id"],
                lot_code=lot_code,
                product_name=product_name,
                quantity=quantity,
                expiry_date=expiry_date,
            )

            if action == "created":
                created += 1
            else:
                updated += 1
        except Exception as exc:  # noqa: BLE001
            errors.append({"row": idx, "message": str(exc)})

    db.commit()

    return {
        "success": True,
        "created": created,
        "updated": updated,
        "failed": len(errors),
        "errors": errors,
    }
