"""Product service layer with business logic."""

import re
from datetime import date, timedelta
from sqlalchemy import func
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.product import Product
from app.models.category import Category
from app.models.inventory_lot import InventoryLot
from app.services.audit_service import log_action
from app.core.audit_actions import (
    CREATE_PRODUCT,
    UPDATE_PRODUCT,
    DELETE_PRODUCT,
    UPDATE_PRICE,
    UPDATE_STOCK,
    ENTITY_PRODUCT,
)


# ========== Helper Functions ==========
def _build_product_sku(name: str) -> str:
    """Build SKU from product name."""
    base = re.sub(r"[^a-z0-9]+", "", name.strip().lower())
    if not base:
        base = "product"
    return f"sku_{base[:20]}"


def _generate_unique_sku(db: Session, supermarket_id: int, product_name: str) -> str:
    """Generate unique SKU for product within supermarket."""
    base = _build_product_sku(product_name)
    candidate = base
    index = 1

    while True:
        exists = db.query(Product).filter(
            Product.supermarket_id == supermarket_id,
            Product.sku == candidate
        ).first()

        if not exists:
            return candidate

        index += 1
        candidate = f"{base}_{index}"


def _ensure_unique_sku_for_product(
    db: Session,
    supermarket_id: int,
    sku: str,
    current_product_id: int | None = None,
) -> None:
    """Check SKU uniqueness within supermarket."""
    query = db.query(Product).filter(
        Product.supermarket_id == supermarket_id,
        Product.sku == sku
    )
    
    if current_product_id is not None:
        query = query.filter(Product.id != current_product_id)
    
    conflict = query.first()

    if conflict:
        raise ValueError(f"SKU '{sku}' da ton tai")


def _resolve_or_create_product(db: Session, supermarket_id: int, product_name: str) -> int:
    """Get or create product by name."""
    name = product_name.strip()
    product = db.query(Product.id).filter(
        Product.supermarket_id == supermarket_id,
        func.lower(Product.name) == func.lower(name)
    ).first()

    if product:
        return int(product.id)

    sku = _generate_unique_sku(db, supermarket_id, name)
    new_product = Product(
        supermarket_id=supermarket_id,
        category_id=None,
        sku=sku,
        name=name,
        base_price=0,
        image_url=None
    )
    db.add(new_product)
    db.flush()
    return int(new_product.id)


def _resolve_or_create_category(db: Session, category_name: object) -> int | None:
    """Get or create category by name."""
    name = str(category_name or "").strip()
    if not name:
        return None

    existing = db.query(Category.id).filter(
        func.lower(Category.name) == func.lower(name)
    ).first()

    if existing:
        return int(existing.id)

    new_category = Category(name=name)
    db.add(new_category)
    db.flush()
    return int(new_category.id)


def _status_label(expiry_date: date) -> str:
    """Determine lot status from expiry date."""
    today = date.today()
    if expiry_date < today:
        return "Het Han"
    if (expiry_date - today).days <= 7:
        return "Sap Het Han"
    return "Moi"


# ========== Product CRUD Services ==========
def list_products(db: Session, supermarket_id: int, category_filter: int | None, search: str | None) -> dict:
    """List products with optional category and search filters."""
    query = db.query(
        Product.id,
        Product.sku,
        Product.name,
        Product.base_price,
        Product.image_url,
        Category.name.label('category_name'),
        Category.id.label('category_id'),
        func.coalesce(func.sum(InventoryLot.qty_on_hand), 0).label('total_stock')
    ).outerjoin(
        Category, Category.id == Product.category_id
    ).outerjoin(
        InventoryLot, InventoryLot.product_id == Product.id
    ).filter(
        Product.supermarket_id == supermarket_id
    )

    if category_filter is not None:
        query = query.filter(Product.category_id == category_filter)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Product.name.ilike(search_term)) | (Product.sku.ilike(search_term))
        )

    query = query.group_by(
        Product.id, Product.sku, Product.name, Product.base_price, 
        Product.image_url, Category.name, Category.id
    ).order_by(Product.name.asc())

    rows = query.all()

    items = [
        {
            "id": row[0],
            "sku": row[1],
            "name": row[2],
            "basePrice": float(row[3]),
            "imageUrl": row[4],
            "categoryName": row[5] or "Chưa phân loại",
            "categoryId": row[6],
            "totalStock": int(row[7]),
        }
        for row in rows
    ]

    return {"items": items}


def create_product(db: Session, supermarket_id: int, store_id: int, user_id: int,
                   name: str, sku: str, base_price: float,
                   category_id: int | None, image_url: str | None) -> dict:
    """Create new product and log the action."""
    name = name.strip()
    sku = sku.strip()
    image_url = (image_url or "").strip() or None

    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tên sản phẩm không được trống")
    if not sku:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="SKU không được trống")
    if base_price is None or float(base_price) < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Giá không hợp lệ")

    existing = db.query(Product.id).filter(
        Product.supermarket_id == supermarket_id,
        Product.sku == sku
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="SKU đã tồn tại")

    new_product = Product(
        supermarket_id=supermarket_id,
        category_id=category_id if category_id else None,
        sku=sku,
        name=name,
        base_price=float(base_price),
        image_url=image_url
    )
    db.add(new_product)
    db.flush()
    product_id = new_product.id
    db.commit()

    log_action(db, user_id=user_id, store_id=store_id,
               action=CREATE_PRODUCT, entity_type=ENTITY_PRODUCT, entity_id=product_id)

    return {"message": "Tạo sản phẩm thành công"}


def update_product(db: Session, product_id: int, supermarket_id: int, store_id: int, user_id: int,
                   name: str, base_price: float,
                   category_id: int | None, image_url: str | None) -> dict:
    """Update product information and log the action."""
    name = name.strip()
    image_url = (image_url or "").strip() or None

    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tên sản phẩm không được trống")
    if base_price is None or float(base_price) < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Giá không hợp lệ")

    product = db.query(Product).filter(
        Product.id == product_id,
        Product.supermarket_id == supermarket_id
    ).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sản phẩm không tìm thấy")

    old_price = float(product.base_price)
    new_price = float(base_price)

    db.query(Product).filter(Product.id == product_id).update({
        Product.name: name,
        Product.base_price: new_price,
        Product.category_id: category_id if category_id else None,
        Product.image_url: image_url
    }, synchronize_session=False)
    db.commit()

    log_action(db, user_id=user_id, store_id=store_id,
               action=UPDATE_PRODUCT, entity_type=ENTITY_PRODUCT, entity_id=product_id)

    if old_price != new_price:
        log_action(db, user_id=user_id, store_id=store_id,
                   action=UPDATE_PRICE, entity_type=ENTITY_PRODUCT, entity_id=product_id)

    return {"message": "Cập nhật sản phẩm thành công"}


def delete_product(db: Session, product_id: int, supermarket_id: int,
                   store_id: int, user_id: int) -> dict:
    """Delete product if no inventory lots reference it, then log the action."""
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.supermarket_id == supermarket_id
    ).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sản phẩm không tìm thấy")

    has_lots = db.query(func.count(InventoryLot.id)).filter(
        InventoryLot.product_id == product_id
    ).scalar() or 0

    if has_lots > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Không thể xóa: có {has_lots} lô hàng liên quan đến sản phẩm này"
        )

    db.query(Product).filter(Product.id == product_id).delete()
    db.commit()

    log_action(db, user_id=user_id, store_id=store_id,
               action=DELETE_PRODUCT, entity_type=ENTITY_PRODUCT, entity_id=product_id)

    return {"message": "Xóa sản phẩm thành công"}


def adjust_product_stock(
    db: Session,
    product_id: int,
    supermarket_id: int,
    store_id: int,
    user_id: int,
    target_quantity: int,
    reason: str | None = None,
) -> dict:
    """Adjust total stock of a product by redistributing across inventory lots."""
    if target_quantity < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Số lượng mục tiêu phải >= 0")

    product = db.query(Product).filter(
        Product.id == product_id,
        Product.supermarket_id == supermarket_id
    ).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sản phẩm không tìm thấy")

    lots = db.query(InventoryLot).filter(
        InventoryLot.store_id == store_id,
        InventoryLot.product_id == product_id
    ).order_by(
        InventoryLot.expiry_date.asc(),
        InventoryLot.id.asc()
    ).all()

    current_total = sum(int(lot.qty_on_hand or 0) for lot in lots)
    delta = target_quantity - current_total

    if delta == 0:
        return {
            "message": "Số lượng tồn kho không thay đổi",
            "productId": product_id,
            "oldTotalStock": current_total,
            "newTotalStock": target_quantity,
            "changedBy": 0,
        }

    # Build per-lot allocation plan (preview) then apply
    plan = []
    if delta > 0:
        # try to find candidate lot to add into
        candidate_lot = None
        for lot in lots:
            if lot.expiry_date >= date.today():
                candidate_lot = lot
                break
        if candidate_lot is None and lots:
            candidate_lot = lots[-1]

        if candidate_lot is None:
            expiry = date.today() + timedelta(days=365)
            auto_lot_code = f"AUTO-{product_id}-{date.today().strftime('%Y%m%d')}"
            suffix = 1
            while db.query(InventoryLot.id).filter(
                InventoryLot.store_id == store_id,
                InventoryLot.lot_code == auto_lot_code,
            ).first():
                suffix += 1
                auto_lot_code = f"AUTO-{product_id}-{date.today().strftime('%Y%m%d')}-{suffix}"

            # Prepare new lot plan
            plan.append({
                "lot": None,
                "lot_code": auto_lot_code,
                "old_qty": 0,
                "new_qty": delta,
                "note": "auto_created"
            })
        else:
            plan.append({
                "lot": candidate_lot,
                "lot_code": candidate_lot.lot_code,
                "old_qty": int(candidate_lot.qty_on_hand or 0),
                "new_qty": int(candidate_lot.qty_on_hand or 0) + delta,
                "note": "increment"
            })
    else:
        qty_to_reduce = abs(delta)
        max_reducible = sum(max(int(lot.qty_on_hand or 0) - int(lot.qty_reserved or 0), 0) for lot in lots)
        if max_reducible < qty_to_reduce:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Không thể giảm tồn kho xuống mức yêu cầu vì một phần hàng đang được giữ chỗ "
                    "hoặc không đủ số lượng khả dụng."
                ),
            )

        for lot in lots:
            if qty_to_reduce <= 0:
                break
            available = max(int(lot.qty_on_hand or 0) - int(lot.qty_reserved or 0), 0)
            if available <= 0:
                continue

            remove_qty = min(available, qty_to_reduce)
            plan.append({
                "lot": lot,
                "lot_code": lot.lot_code,
                "old_qty": int(lot.qty_on_hand or 0),
                "new_qty": int(lot.qty_on_hand or 0) - remove_qty,
                "note": "decrement"
            })
            qty_to_reduce -= remove_qty

    # Apply the plan
    created_lot_obj = None
    for step in plan:
        if step["lot"] is None:
            # create new lot
            new_lot = InventoryLot(
                store_id=store_id,
                product_id=product_id,
                lot_code=step["lot_code"],
                expiry_date=date.today() + timedelta(days=365),
                manufacturing_date=None,
                qty_on_hand=step["new_qty"],
                qty_reserved=0,
                status=_status_label(date.today() + timedelta(days=365)),
            )
            db.add(new_lot)
            created_lot_obj = new_lot
        else:
            lot_obj = step["lot"]
            lot_obj.qty_on_hand = step["new_qty"]
            lot_obj.status = _status_label(lot_obj.expiry_date)

    db.commit()

    # Build per-lot diffs for audit
    per_lot_changes = []
    for step in plan:
        per_lot_changes.append({
            "lotCode": step.get("lot_code"),
            "oldQty": int(step.get("old_qty" or 0)),
            "newQty": int(step.get("new_qty" or 0)),
            "note": step.get("note")
        })

    log_action(
        db,
        user_id=user_id,
        store_id=store_id,
        action=UPDATE_STOCK,
        entity_type=ENTITY_PRODUCT,
        entity_id=product_id,
        old_value={
            "total_stock": current_total,
            "per_lot": [{"lotCode": p["lot_code"], "old": p["old_qty"]} for p in plan],
            "reason": reason,
        },
        new_value={
            "total_stock": target_quantity,
            "changed_by": delta,
            "per_lot": per_lot_changes,
            "reason": reason,
        },
    )

    return {
        "message": "Cập nhật tồn kho thành công",
        "productId": product_id,
        "oldTotalStock": current_total,
        "newTotalStock": target_quantity,
        "changedBy": delta,
    }


def preview_adjust_product_stock(
    db: Session,
    product_id: int,
    supermarket_id: int,
    store_id: int,
    target_quantity: int,
) -> dict:
    """Compute allocation plan for adjusting total stock without applying changes."""
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.supermarket_id == supermarket_id
    ).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sản phẩm không tìm thấy")

    lots = db.query(InventoryLot).filter(
        InventoryLot.store_id == store_id,
        InventoryLot.product_id == product_id
    ).order_by(
        InventoryLot.expiry_date.asc(),
        InventoryLot.id.asc()
    ).all()

    current_total = sum(int(lot.qty_on_hand or 0) for lot in lots)
    delta = target_quantity - current_total

    if delta == 0:
        return {"items": [], "oldTotal": current_total, "newTotal": target_quantity}

    plan = []
    if delta > 0:
        candidate_lot = None
        for lot in lots:
            if lot.expiry_date >= date.today():
                candidate_lot = lot
                break
        if candidate_lot is None and lots:
            candidate_lot = lots[-1]

        if candidate_lot is None:
            auto_lot_code = f"AUTO-{product_id}-{date.today().strftime('%Y%m%d')}"
            # ensure unique code but don't write DB
            plan.append({"lotId": None, "lotCode": auto_lot_code, "oldQty": 0, "newQty": delta, "note": "auto_created"})
        else:
            plan.append({"lotId": int(candidate_lot.id), "lotCode": candidate_lot.lot_code, "oldQty": int(candidate_lot.qty_on_hand or 0), "newQty": int(candidate_lot.qty_on_hand or 0) + delta, "note": "increment"})
    else:
        qty_to_reduce = abs(delta)
        max_reducible = sum(max(int(lot.qty_on_hand or 0) - int(lot.qty_reserved or 0), 0) for lot in lots)
        if max_reducible < qty_to_reduce:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=("Không thể giảm tồn kho xuống mức yêu cầu vì một phần hàng đang được giữ chỗ hoặc không đủ số lượng khả dụng."))

        for lot in lots:
            if qty_to_reduce <= 0:
                break
            available = max(int(lot.qty_on_hand or 0) - int(lot.qty_reserved or 0), 0)
            if available <= 0:
                continue
            remove_qty = min(available, qty_to_reduce)
            plan.append({"lotId": int(lot.id), "lotCode": lot.lot_code, "oldQty": int(lot.qty_on_hand or 0), "newQty": int(lot.qty_on_hand or 0) - remove_qty, "note": "decrement"})
            qty_to_reduce -= remove_qty

    return {"items": plan, "oldTotal": current_total, "newTotal": target_quantity}


def list_product_categories(db: Session, supermarket_id: int) -> dict:
    """List all categories used by products."""
    # Get all distinct categories used by products in this supermarket
    categories = db.query(
        Category.id, Category.name
    ).filter(
        Category.id.in_(
            db.query(Product.category_id).filter(
                Product.supermarket_id == supermarket_id,
                Product.category_id.isnot(None)
            ).distinct()
        )
    ).order_by(Category.name.asc()).all()

    items = [{"id": row[0], "name": row[1]} for row in categories]
    return {"items": items}
