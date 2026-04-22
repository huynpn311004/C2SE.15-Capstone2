"""Product service layer with business logic."""

import re
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
