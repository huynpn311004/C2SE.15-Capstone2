"""Product service layer with business logic."""

import re
from sqlalchemy import text
from sqlalchemy.orm import Session
from fastapi import HTTPException, status


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


def _ensure_unique_sku_for_product(
    db: Session,
    supermarket_id: int,
    sku: str,
    current_product_id: int | None = None,
) -> None:
    """Check SKU uniqueness within supermarket."""
    conflict = db.execute(
        text(
            """
            SELECT id
            FROM products
            WHERE supermarket_id = :supermarket_id
              AND sku = :sku
              AND (:current_product_id IS NULL OR id != :current_product_id)
            LIMIT 1
            """
        ),
        {
            "supermarket_id": supermarket_id,
            "sku": sku,
            "current_product_id": current_product_id,
        },
    ).first()

    if conflict:
        raise ValueError(f"SKU '{sku}' da ton tai")


def _resolve_or_create_product(db: Session, supermarket_id: int, product_name: str) -> int:
    """Get or create product by name."""
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


def _resolve_or_create_category(db: Session, category_name: object) -> int | None:
    """Get or create category by name."""
    name = str(category_name or "").strip()
    if not name:
        return None

    existing = db.execute(
        text(
            """
            SELECT id
            FROM categories
            WHERE LOWER(name) = LOWER(:name)
            LIMIT 1
            """
        ),
        {"name": name},
    ).first()

    if existing:
        return int(existing.id)

    result = db.execute(
        text("INSERT INTO categories (name) VALUES (:name)"),
        {"name": name},
    )
    return int(result.lastrowid)


# ========== Product CRUD Services ==========
def list_products(db: Session, supermarket_id: int, category_filter: int | None, search: str | None) -> dict:
    """List products with optional category and search filters."""
    query = """
        SELECT p.id, p.sku, p.name, p.base_price, p.image_url,
               c.name AS category_name, c.id AS category_id,
               COALESCE(SUM(il.qty_on_hand), 0) AS total_stock
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN inventory_lots il ON il.product_id = p.id
        WHERE p.supermarket_id = :supermarket_id
    """
    params = {"supermarket_id": supermarket_id}

    if category_filter is not None:
        query += " AND p.category_id = :category_id"
        params["category_id"] = category_filter

    if search:
        query += " AND (p.name LIKE :search OR p.sku LIKE :search)"
        params["search"] = f"%{search}%"

    query += " GROUP BY p.id, p.sku, p.name, p.base_price, p.image_url, c.name, c.id ORDER BY p.name ASC"

    rows = db.execute(text(query), params).all()

    items = [
        {
            "id": row.id,
            "sku": row.sku,
            "name": row.name,
            "basePrice": float(row.base_price),
            "imageUrl": row.image_url,
            "categoryName": row.category_name or "Chưa phân loại",
            "categoryId": row.category_id,
            "totalStock": int(row.total_stock),
        }
        for row in rows
    ]

    return {"items": items}


def create_product(db: Session, supermarket_id: int, name: str, sku: str, base_price: float,
                   category_id: int | None, image_url: str | None) -> dict:
    """Create new product."""
    name = name.strip()
    sku = sku.strip()
    image_url = (image_url or "").strip() or None

    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tên sản phẩm không được trống")
    if not sku:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="SKU không được trống")
    if base_price is None or float(base_price) < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Giá không hợp lệ")

    existing = db.execute(
        text("SELECT id FROM products WHERE supermarket_id = :sm AND sku = :sku LIMIT 1"),
        {"sm": supermarket_id, "sku": sku},
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="SKU đã tồn tại")

    db.execute(
        text(
            "INSERT INTO products (supermarket_id, category_id, sku, name, base_price, image_url) "
            "VALUES (:sm, :cat, :sku, :name, :price, :img)"
        ),
        {
            "sm": supermarket_id,
            "cat": category_id if category_id else None,
            "sku": sku,
            "name": name,
            "price": float(base_price),
            "img": image_url,
        },
    )
    db.commit()

    return {"message": "Tạo sản phẩm thành công"}


def update_product(db: Session, product_id: int, supermarket_id: int, name: str, base_price: float,
                   category_id: int | None, image_url: str | None) -> dict:
    """Update product information."""
    name = name.strip()
    image_url = (image_url or "").strip() or None

    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tên sản phẩm không được trống")
    if base_price is None or float(base_price) < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Giá không hợp lệ")

    product = db.execute(
        text("SELECT id FROM products WHERE id = :id AND supermarket_id = :sm LIMIT 1"),
        {"id": product_id, "sm": supermarket_id},
    ).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sản phẩm không tìm thấy")

    db.execute(
        text(
            "UPDATE products SET name = :name, base_price = :price, "
            "category_id = :cat, image_url = :img WHERE id = :id"
        ),
        {
            "name": name,
            "price": float(base_price),
            "cat": category_id if category_id else None,
            "img": image_url,
            "id": product_id,
        },
    )
    db.commit()

    return {"message": "Cập nhật sản phẩm thành công"}


def delete_product(db: Session, product_id: int, supermarket_id: int) -> dict:
    """Delete product if no inventory lots reference it."""
    product = db.execute(
        text("SELECT id FROM products WHERE id = :id AND supermarket_id = :sm LIMIT 1"),
        {"id": product_id, "sm": supermarket_id},
    ).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sản phẩm không tìm thấy")

    has_lots = db.execute(
        text("SELECT COUNT(*) FROM inventory_lots WHERE product_id = :product_id"),
        {"product_id": product_id},
    ).scalar() or 0

    if has_lots > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Không thể xóa: có {has_lots} lô hàng liên quan đến sản phẩm này"
        )

    db.execute(text("DELETE FROM products WHERE id = :id"), {"id": product_id})
    db.commit()

    return {"message": "Xóa sản phẩm thành công"}


def list_product_categories(db: Session, supermarket_id: int) -> dict:
    """List all categories used by products."""
    rows = db.execute(
        text(
            """
            SELECT DISTINCT c.id, c.name
            FROM categories c
            LEFT JOIN products p ON p.category_id = c.id AND p.supermarket_id = :sm
            WHERE c.id IN (SELECT category_id FROM products WHERE supermarket_id = :sm)
               OR c.id NOT IN (SELECT DISTINCT category_id FROM products WHERE supermarket_id = :sm AND category_id IS NOT NULL)
            ORDER BY c.name ASC
            """
        ),
        {"sm": supermarket_id},
    ).all()

    items = [{"id": row.id, "name": row.name} for row in rows]
    return {"items": items}
