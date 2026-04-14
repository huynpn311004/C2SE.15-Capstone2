"""Staff service layer with business logic and helper functions."""

import csv
import os
import re
import unicodedata
from datetime import date, datetime, timedelta
from io import BytesIO, StringIO
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status
from openpyxl import load_workbook
from sqlalchemy import func, or_, and_
from sqlalchemy.orm import Session

from app.core.security import get_password_hash, verify_password
from app.models.user import User
from app.models.product import Product
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.category import Category
from app.models.inventory_lot import InventoryLot
from app.models.store import Store
from app.models.donation_offer import DonationOffer
from app.models.donation_request import DonationRequest
from app.models.delivery import Delivery
from app.models.delivery_partner import DeliveryPartner
from app.models.notification import Notification


# ========== Helper Functions ==========
def _dict_row(row) -> dict:
    """Convert SQLAlchemy row to dictionary."""
    return dict(row._mapping)


def _status_label(expiry_date: date) -> str:
    """Determine status based on expiry date."""
    today = date.today()
    if expiry_date < today:
        return "Het Han"
    if (expiry_date - today).days <= 7:
        return "Sap Het Han"
    return "Moi"


def _parse_date_input(value) -> date:
    """Parse date from various formats."""
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
    """Normalize Excel/CSV headers to snake_case."""
    if header is None:
        return ""
    value = unicodedata.normalize("NFKD", str(header).strip().lower())
    value = "".join(char for char in value if not unicodedata.combining(char))
    value = value.replace(" ", "_")
    value = value.replace("-", "_")
    return value


def _normalize_status_value(raw_status: object, expiry_date: date) -> str:
    """Normalize status value (Moi, Sap Het Han, Het Han)."""
    if raw_status is None:
        return _status_label(expiry_date)

    normalized = unicodedata.normalize("NFKD", str(raw_status).strip().lower())
    normalized = "".join(char for char in normalized if not unicodedata.combining(char))
    normalized = normalized.replace("_", " ")

    status_map = {
        "moi": "Moi",
        "sap het han": "Sap Het Han",
        "het han": "Het Han",
    }
    return status_map.get(normalized, _status_label(expiry_date))


def _parse_non_negative_float(value: object, field_name: str) -> float | None:
    """Parse non-negative float from various formats."""
    if value is None:
        return None
    if isinstance(value, str) and not value.strip():
        return None

    normalized = str(value).strip().replace(" ", "")
    if "," in normalized and "." in normalized:
        normalized = normalized.replace(",", "")
    elif "," in normalized and "." not in normalized:
        normalized = normalized.replace(",", ".")
    try:
        result = float(normalized)
    except ValueError as exc:
        raise ValueError(f"{field_name} khong hop le") from exc

    if result < 0:
        raise ValueError(f"{field_name} phai >= 0")
    return result


def _pick_field(row: dict[str, object], *keys: str) -> object:
    """Pick first non-empty field from row dictionary."""
    for key in keys:
        if key in row and row[key] not in (None, ""):
            return row[key]
    return None


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
        exists = db.query(Product.id).filter(
            Product.supermarket_id == supermarket_id,
            Product.sku == candidate
        ).first()

        if not exists:
            return candidate

        index += 1
        candidate = f"{base}_{index}"


def _get_staff_scope(db: Session, user_id: int) -> dict[str, int]:
    """Get staff's store_id and supermarket_id, validate role."""
    user = db.query(User).filter(User.id == user_id).first()

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


def _ensure_unique_sku_for_product(
    db: Session,
    supermarket_id: int,
    sku: str,
    current_product_id: int | None = None,
) -> None:
    """Check SKU uniqueness within supermarket."""
    query = db.query(Product.id).filter(
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


def _upsert_product_from_import(
    db: Session,
    *,
    supermarket_id: int,
    product_name_raw: object,
    sku_raw: object = None,
    base_price_raw: object = None,
    category_name_raw: object = None,
) -> tuple[int, str]:
    """Create or update product during import."""
    product_name = str(product_name_raw or "").strip()
    if not product_name:
        raise ValueError("Ten san pham khong duoc trong")

    sku = str(sku_raw or "").strip()
    if not sku:
        sku = None

    base_price = _parse_non_negative_float(base_price_raw, "Don gia")
    category_id = _resolve_or_create_category(db, category_name_raw)

    product = None
    if sku:
        product = db.query(Product.id, Product.sku, Product.base_price, Product.category_id).filter(
            Product.supermarket_id == supermarket_id,
            Product.sku == sku
        ).first()

    if not product:
        product = db.query(Product.id, Product.sku, Product.base_price, Product.category_id).filter(
            Product.supermarket_id == supermarket_id,
            func.lower(Product.name) == func.lower(product_name)
        ).first()

    if product:
        current_id = int(product.id)
        next_sku = str(product.sku)
        if sku and sku != next_sku:
            _ensure_unique_sku_for_product(db, supermarket_id, sku, current_product_id=current_id)
            next_sku = sku

        next_base_price = float(base_price) if base_price is not None else float(product.base_price or 0)
        next_category_id = category_id if category_id is not None else product.category_id

        db.query(Product).filter(Product.id == current_id).update(
            {
                Product.sku: next_sku,
                Product.name: product_name,
                Product.base_price: next_base_price,
                Product.category_id: next_category_id,
            },
            synchronize_session=False
        )
        db.commit()
        return current_id, "updated"

    next_sku = sku or _generate_unique_sku(db, supermarket_id, product_name)
    _ensure_unique_sku_for_product(db, supermarket_id, next_sku)
    new_product = Product(
        supermarket_id=supermarket_id,
        category_id=category_id,
        sku=next_sku,
        name=product_name,
        base_price=float(base_price) if base_price is not None else 0,
        image_url=None
    )
    db.add(new_product)
    db.flush()
    return int(new_product.id), "created"


def _upsert_inventory_lot(
    db: Session,
    *,
    store_id: int,
    supermarket_id: int,
    lot_code: str,
    product_name: str,
    quantity: int,
    expiry_date: date,
    manual_status: object = None,
    product_id: int | None = None,
) -> str:
    """Create or update inventory lot."""
    lot = db.query(InventoryLot.id).filter(
        InventoryLot.store_id == store_id,
        InventoryLot.lot_code == lot_code
    ).first()

    if product_id is None:
        product_id = _resolve_or_create_product(db, supermarket_id, product_name)
    lot_status = _normalize_status_value(manual_status, expiry_date)

    if lot:
        db.query(InventoryLot).filter(InventoryLot.id == lot.id).update(
            {
                InventoryLot.product_id: product_id,
                InventoryLot.expiry_date: expiry_date,
                InventoryLot.qty_on_hand: quantity,
                InventoryLot.status: lot_status,
            },
            synchronize_session=False
        )
        db.commit()
        return "updated"

    new_lot = InventoryLot(
        store_id=store_id,
        product_id=product_id,
        lot_code=lot_code,
        expiry_date=expiry_date,
        qty_on_hand=quantity,
        qty_reserved=0,
        status=lot_status
    )
    db.add(new_lot)
    db.commit()
    return "created"


def _extract_rows_from_xlsx(file_bytes: bytes) -> list[dict[str, object]]:
    """Extract data rows from Excel file."""
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
    """Extract data rows from CSV file."""
    text_stream = StringIO(file_bytes.decode("utf-8-sig"))
    reader = csv.DictReader(text_stream)
    rows = []
    for row in reader:
        normalized = {_normalize_header(k): v for k, v in row.items()}
        if any(str(v or "").strip() for v in normalized.values()):
            rows.append(normalized)
    return rows


def _read_import_rows(upload: UploadFile, file_bytes: bytes) -> list[dict[str, object]]:
    """Read and parse import file (.xlsx or .csv)."""
    filename = (upload.filename or "").lower()
    if filename.endswith(".xlsx"):
        return _extract_rows_from_xlsx(file_bytes)
    if filename.endswith(".csv"):
        return _extract_rows_from_csv(file_bytes)

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Chi ho tro file .xlsx hoac .csv",
    )


# ========== Profile Business Logic ==========
def get_staff_profile(db: Session, user_id: int) -> dict:
    """Get staff profile by user ID."""
    user = db.query(
        User.id,
        User.username,
        User.email,
        User.full_name,
        User.phone,
        User.role,
        User.store_id,
        User.supermarket_id,
        Store.name.label('store_name'),
        Store.location.label('store_address')
    ).outerjoin(
        Store, Store.id == User.store_id
    ).filter(
        User.id == user_id
    ).first()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    return {
        "email": user.email,
        "fullName": user.full_name,
        "phone": user.phone,
        "role": user.role,
        "storeName": user.store_name or "Chưa gán cửa hàng",
        "storeAddress": user.store_address or "",
    }


def update_staff_profile(db: Session, user_id: int, full_name: str, email: str, phone: str) -> dict:
    """Update staff profile information."""
    full_name = full_name.strip()
    email = email.strip().lower()
    phone = phone.strip()

    if not full_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Họ tên không được trống")
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email không được trống")

    existing = db.query(User.id).filter(
        User.email == email,
        User.id != user_id
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email đã được sử dụng")

    db.query(User).filter(User.id == user_id).update(
        {
            User.full_name: full_name,
            User.email: email,
            User.phone: phone
        },
        synchronize_session=False
    )
    db.commit()
    return {"success": True}


def change_staff_password(db: Session, user_id: int, current_password: str, new_password: str) -> dict:
    """Change staff password with validation."""
    current_password = current_password or ""
    new_password = new_password or ""

    if not current_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vui lòng nhập mật khẩu hiện tại"
        )

    if len(new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu mới phải có ít nhất 6 ký tự"
        )

    row = db.query(User.password_hash).filter(User.id == user_id).first()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy người dùng"
        )

    if not verify_password(current_password, row.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu hiện tại không đúng"
        )

    db.query(User).filter(User.id == user_id).update(
        {User.password_hash: get_password_hash(new_password)},
        synchronize_session=False
    )
    db.commit()

    return {"message": "Đổi mật khẩu thành công!", "success": True}


# ========== Orders Business Logic ==========
def list_staff_orders(db: Session, store_id: int) -> dict:
    """List all orders for staff's store."""
    rows = db.query(
        Order.id, Order.status, Order.total_amount, Order.payment_status, Order.created_at, Order.delivered_at,
        User.full_name.label('customer_name')
    ).join(
        User, User.id == Order.customer_id
    ).filter(
        Order.store_id == store_id
    ).order_by(
        Order.created_at.desc()
    ).limit(100).all()

    items = []
    for row in rows:
        items.append({
            "id": f"DH-{row.id}",
            "orderId": row.id,
            "customer": row.customer_name,
            "status": row.status,
            "amount": f"{float(row.total_amount or 0):,.0f} VNĐ" if row.total_amount else "0 VNĐ",
            "paymentStatus": row.payment_status,
            "createdAt": row.created_at.strftime("%d/%m/%Y %H:%M"),
            "deliveredAt": row.delivered_at.strftime("%d/%m/%Y %H:%M") if row.delivered_at else None,
        })

    return {"items": items}


# ========== Delivery Assignment Functions ==========
def _find_available_delivery_partner(db: Session, store_id: int):
    """Find an available delivery partner for order assignment.
    
    Strategy: Get delivery partners ordered by least active deliveries.
    """
    partner = db.query(
        DeliveryPartner.id,
        DeliveryPartner.user_id,
        func.count(Delivery.id).label("active_count")
    ).outerjoin(
        Delivery,
        and_(
            Delivery.delivery_partner_id == DeliveryPartner.id,
            Delivery.status.in_(["assigned", "picking_up", "delivering"])
        )
    ).join(
        User,
        User.id == DeliveryPartner.user_id
    ).filter(
        User.is_active == True
    ).group_by(
        DeliveryPartner.id
    ).order_by(
        func.count(Delivery.id).asc()
    ).first()
    
    return partner


def _generate_delivery_code(db: Session) -> str:
    """Generate unique delivery code."""
    timestamp = datetime.now().strftime("%Y%m%d")
    count = db.query(func.count(Delivery.id)).filter(
        Delivery.delivery_code.like(f"GH-{timestamp}-%")
    ).scalar() or 0
    return f"GH-{timestamp}-{str(count + 1).zfill(4)}"


def _create_delivery_for_order(db: Session, order_id: int, store_id: int) -> dict:
    """Create delivery record when order is ready.
    
    Steps:
    1. Fetch order and customer details
    2. Find available delivery partner
    3. Create Delivery record
    4. Create notification for delivery partner
    """
    # Get order and customer
    order_row = db.query(
        Order.id,
        Order.customer_id,
        Order.shipping_address,
        User.full_name.label("customer_name"),
        User.phone.label("customer_phone"),
        Store.location.label("store_location")
    ).join(
        User, User.id == Order.customer_id
    ).join(
        Store, Store.id == Order.store_id
    ).filter(
        Order.id == order_id,
        Order.store_id == store_id
    ).first()
    
    if not order_row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Đơn hàng không tồn tại"
        )
    
    # Check if delivery already exists for this order
    existing_delivery = db.query(Delivery).filter(
        Delivery.order_id == order_id
    ).first()
    
    if existing_delivery:
        return {"delivery_id": existing_delivery.id}
    
    # Find available delivery partner
    partner = _find_available_delivery_partner(db, store_id)
    
    if not partner:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Không có nhân viên giao hàng khả dụng"
        )
    
    # Create delivery
    delivery_code = _generate_delivery_code(db)
    
    new_delivery = Delivery(
        delivery_code=delivery_code,
        order_id=order_id,
        store_id=store_id,
        delivery_partner_id=partner.id,
        receiver_name=order_row.customer_name,
        receiver_phone=order_row.customer_phone,
        receiver_address=order_row.shipping_address or order_row.store_location,
        status="assigned"
    )
    
    db.add(new_delivery)
    db.flush()
    delivery_id = new_delivery.id
    
    # Create notification for delivery partner
    notification_content = f"Có đơn giao hàng mới: {delivery_code} từ khách hàng {order_row.customer_name}"
    
    notification = Notification(
        user_id=partner.user_id,
        type="delivery_assigned",
        content=notification_content,
        is_read=False
    )
    
    db.add(notification)
    db.commit()
    
    return {"delivery_id": delivery_id, "delivery_code": delivery_code}



def update_staff_order_status(db: Session, order_id: int, store_id: int, new_status: str) -> dict:
    """Update order status - Staff can only update to 'ready'.
    
    Staff workflow:
    - pending/preparing → ready (chuẩn bị xong, lấy hàng xong)
    
    Delivery partner will handle:
    - ready → picking_up → delivering → completed/cancelled
    
    When status -> 'ready': Automatically create Delivery and notify delivery partner.
    """
    new_status = (new_status or "").strip().lower()

    # Staff chỉ được update thành "ready" - đúng nghiệp vụ
    if new_status != "ready":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Staff chỉ được cập nhật đơn hàng thành 'ready'. Trạng thái khác do Delivery Partner xác nhận."
        )
    
    # Check if order exists in staff's store
    order = db.query(Order.id, Order.status).filter(
        Order.id == order_id,
        Order.store_id == store_id
    ).first()
    
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Đơn hàng không tồn tại")
    
    # Only allow update from pending or preparing state
    if order.status not in ["pending", "preparing"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Không thể cập nhật từ trạng thái '{order.status}' thành 'ready'"
        )
    
    result = db.query(Order).filter(
        Order.id == order_id,
        Order.store_id == store_id
    ).update({Order.status: "ready"}, synchronize_session=False)
    db.commit()

    if result == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Đơn hàng không tồn tại")

    response = {"success": True, "status": "ready"}
    
    # Auto-create delivery when order is ready
    try:
        delivery_info = _create_delivery_for_order(db, order_id, store_id)
        response["delivery"] = {
            "delivery_id": delivery_info.get("delivery_id"),
            "delivery_code": delivery_info.get("delivery_code"),
            "message": "Đơn giao hàng đã được tạo và gửi cho nhân viên giao hàng"
        }
    except HTTPException as e:
        # If delivery creation fails, log it but don't fail the order status update
        response["delivery_error"] = e.detail
    
    return response


def get_staff_order_detail(db: Session, order_id: int, store_id: int) -> dict:
    """Get order detail with items."""
    # Lấy thông tin đơn hàng + khách hàng
    order_row = db.query(
        Order.id, Order.status, Order.total_amount, Order.payment_method, Order.payment_status,
        Order.created_at, Order.delivered_at,
        User.full_name.label("customer_name"),
        User.phone.label("customer_phone")
    ).join(User, User.id == Order.customer_id).filter(
        Order.id == order_id,
        Order.store_id == store_id
    ).first()

    if not order_row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Đơn hàng không tồn tại")

    # Lấy danh sách sản phẩm trong đơn hàng
    item_rows = db.query(
        OrderItem.quantity, OrderItem.unit_price,
        Product.name.label("product_name")
    ).join(Product, Product.id == OrderItem.product_id).filter(
        OrderItem.order_id == order_id
    ).all()

    items = []
    for row in item_rows:
        items.append({
            "productName": row.product_name,
            "quantity": row.quantity,
            "unitPrice": f"{float(row.unit_price):,.0f} VNĐ",
            "subtotal": f"{float(row.unit_price * row.quantity):,.0f} VNĐ",
        })

    return {
        "id": f"DH-{order_row.id}",
        "orderId": order_row.id,
        "customer": order_row.customer_name,
        "phone": order_row.customer_phone or "—",
        "status": order_row.status,
        "amount": f"{float(order_row.total_amount or 0):,.0f} VNĐ" if order_row.total_amount else "0 VNĐ",
        "paymentMethod": order_row.payment_method or "—",
        "paymentMethodText": "Tiền mặt" if order_row.payment_method == "cod"
                             else ("MoMo" if order_row.payment_method == "momo" else "—"),
        "paymentStatus": order_row.payment_status,
        "createdAt": order_row.created_at.strftime("%d/%m/%Y %H:%M"),
        "deliveredAt": order_row.delivered_at.strftime("%d/%m/%Y %H:%M") if order_row.delivered_at else None,
        "items": items,
    }


# ========== Notifications Business Logic ==========
def list_staff_notifications(db: Session, user_id: int) -> dict:
    """List notifications for user."""
    from app.models.notification import Notification
    rows = db.query(
        Notification.id, Notification.type, Notification.content, Notification.is_read, Notification.created_at
    ).filter(Notification.user_id == user_id).order_by(Notification.created_at.desc()).all()

    items = []
    for row in rows:
        items.append({
            "id": row.id,
            "type": row.type or "info",
            "content": row.content or "",
            "isRead": bool(row.is_read),
            "createdAt": row.created_at.strftime("%d/%m/%Y %H:%M"),
        })

    return {"items": items}


def mark_notification_as_read(db: Session, notification_id: int, user_id: int) -> dict:
    """Mark notification as read."""
    from app.models.notification import Notification
    db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == user_id
    ).update(
        {Notification.is_read: 1},
        synchronize_session=False
    )
    db.commit()

    return {"success": True}


# ========== Categories Business Logic ==========
def staff_category_stats(db: Session, store_id: int) -> dict:
    """Get inventory stats by category for near-expiry items."""
    rows = db.query(
        func.coalesce(Category.name, 'Khác').label('category_name'),
        func.count(InventoryLot.id).label('lot_count')
    ).join(
        Product, Product.id == InventoryLot.product_id
    ).outerjoin(
        Category, Category.id == Product.category_id
    ).filter(
        InventoryLot.store_id == store_id,
        InventoryLot.expiry_date >= date.today(),
        InventoryLot.expiry_date <= date.today() + timedelta(days=7)
    ).group_by(
        Category.id, Category.name
    ).order_by(
        func.count(InventoryLot.id).desc()
    ).limit(10).all()

    total = sum(row.lot_count for row in rows) or 1
    items = []
    for row in rows:
        items.append({
            "name": row.category_name,
            "percent": int((row.lot_count / total) * 100),
        })

    return {"items": items}


def list_categories(db: Session, supermarket_id: int) -> dict:
    """List all categories."""
    rows = db.query(
        Category.id,
        Category.name,
        func.count(Product.id).label('product_count')
    ).outerjoin(
        Product, and_(Product.category_id == Category.id, Product.supermarket_id == supermarket_id)
    ).group_by(
        Category.id, Category.name
    ).order_by(
        Category.name.asc()
    ).all()

    items = [
        {"id": row.id, "name": row.name, "productCount": row.product_count}
        for row in rows
    ]

    return {"items": items}


def create_category(db: Session, name: str) -> dict:
    """Create new category."""
    name = name.strip()
    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tên danh mục không được trống")

    existing = db.query(Category.id).filter(
        func.lower(Category.name) == func.lower(name)
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Danh mục đã tồn tại")

    new_category = Category(name=name)
    db.add(new_category)
    db.commit()

    return {"message": "Tạo danh mục thành công", "name": name}


def update_category(db: Session, category_id: int, name: str) -> dict:
    """Update category name."""
    name = name.strip()
    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tên danh mục không được trống")

    existing = db.query(Category.id).filter(
        func.lower(Category.name) == func.lower(name),
        Category.id != category_id
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Danh mục đã tồn tại")

    db.query(Category).filter(Category.id == category_id).update(
        {Category.name: name},
        synchronize_session=False
    )
    db.commit()

    return {"message": "Cập nhật danh mục thành công"}


def delete_category(db: Session, category_id: int) -> dict:
    """Delete category if no products use it."""
    has_products = db.query(func.count(Product.id)).filter(
        Product.category_id == category_id
    ).scalar() or 0

    if has_products > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Không thể xóa: có {has_products} sản phẩm đang sử dụng danh mục này"
        )

    db.query(Category).filter(Category.id == category_id).delete()
    db.commit()

    return {"message": "Xóa danh mục thành công"}


# ========== Products Business Logic ==========
def list_products(db: Session, supermarket_id: int, category_filter: int | None, search: str | None) -> dict:
    """List products with optional category and search filters."""
    base_query = db.query(
        Product.id, Product.sku, Product.name, Product.base_price, Product.image_url,
        Category.name.label("category_name"), Category.id.label("category_id"),
        func.coalesce(func.sum(InventoryLot.qty_on_hand), 0).label("total_stock")
    ).outerjoin(Category, Category.id == Product.category_id)\
     .outerjoin(InventoryLot, InventoryLot.product_id == Product.id)\
     .filter(Product.supermarket_id == supermarket_id)

    if category_filter is not None:
        base_query = base_query.filter(Product.category_id == category_filter)

    if search:
        base_query = base_query.filter(
            or_(Product.name.ilike(f"%{search}%"), Product.sku.ilike(f"%{search}%"))
        )

    rows = base_query.group_by(
        Product.id, Product.sku, Product.name, Product.base_price, Product.image_url, 
        Category.name, Category.id
    ).order_by(Product.name.asc()).all()

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

    product = db.query(Product.id).filter(
        Product.id == product_id,
        Product.supermarket_id == supermarket_id
    ).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sản phẩm không tìm thấy")

    db.query(Product).filter(Product.id == product_id).update(
        {
            Product.name: name,
            Product.base_price: float(base_price),
            Product.category_id: category_id if category_id else None,
            Product.image_url: image_url,
        },
        synchronize_session=False
    )
    db.commit()

    return {"message": "Cập nhật sản phẩm thành công"}


def delete_product(db: Session, product_id: int, supermarket_id: int) -> dict:
    """Delete product if no inventory lots reference it."""
    product = db.query(Product.id).filter(
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

    return {"message": "Xóa sản phẩm thành công"}


def list_product_categories(db: Session, supermarket_id: int) -> dict:
    """List all categories used by products."""
    rows = db.query(Category.id, Category.name).distinct().join(
        Product, Product.category_id == Category.id
    ).filter(
        Product.supermarket_id == supermarket_id
    ).order_by(Category.name.asc()).all()

    items = [{"id": row.id, "name": row.name} for row in rows]
    return {"items": items}


# ========== Dashboard Business Logic ==========
def staff_dashboard_summary(db: Session, store_id: int) -> dict:
    """Get dashboard summary statistics."""
    total_lots = db.query(func.count(InventoryLot.id)).filter(
        InventoryLot.store_id == store_id
    ).scalar() or 0

    near_expiry = db.query(func.count(InventoryLot.id)).filter(
        InventoryLot.store_id == store_id,
        InventoryLot.expiry_date >= date.today(),
        InventoryLot.expiry_date <= date.today() + timedelta(days=7),
        InventoryLot.qty_on_hand > 0
    ).scalar() or 0

    orders_today = db.query(func.count(Order.id)).filter(
        Order.store_id == store_id,
        func.date(Order.created_at) == date.today()
    ).scalar() or 0

    pending_requests = db.query(func.count(DonationRequest.id)).join(
        DonationOffer, DonationOffer.id == DonationRequest.offer_id
    ).filter(
        DonationOffer.store_id == store_id,
        func.lower(DonationRequest.status) == 'pending'
    ).scalar() or 0

    return {
        "totalLots": int(total_lots),
        "nearExpiryProducts": int(near_expiry),
        "ordersToday": int(orders_today),
        "pendingRequests": int(pending_requests),
    }


# ========== Donation Offers Business Logic ==========
def list_near_expiry_lots(db: Session, store_id: int) -> dict:
    """List inventory lots that are near expiry (3-7 days left) and have stock."""
    today = date.today()
    rows = db.query(
        InventoryLot.id,
        InventoryLot.lot_code,
        InventoryLot.qty_on_hand,
        InventoryLot.expiry_date,
        Product.id.label('product_id'),
        Product.name.label('product_name'),
        Product.base_price,
    ).join(
        Product, Product.id == InventoryLot.product_id
    ).filter(
        InventoryLot.store_id == store_id,
        InventoryLot.qty_on_hand > 0,
        InventoryLot.expiry_date >= today + timedelta(days=3),
        InventoryLot.expiry_date <= today + timedelta(days=30)  # Mở rộng lô gần hết hạn
    ).order_by(
        InventoryLot.expiry_date.asc()
    ).limit(200).all()

    items = []
    for row in rows:
        days_left = (row.expiry_date - today).days
        items.append({
            "id": row.id,
            "productId": row.product_id,
            "productName": row.product_name,
            "lotCode": row.lot_code,
            "quantity": int(row.qty_on_hand),
            "expiryDate": row.expiry_date.strftime("%Y-%m-%d"),
            "daysLeft": days_left,
            "basePrice": float(row.base_price or 0),
        })

    return {"items": items}


def create_donation_offer(db: Session, user_id: int, lot_id: int, offered_qty: int) -> dict:
    """Create a new donation offer from an inventory lot."""
    scope = _get_staff_scope(db, user_id)
    store_id = scope["store_id"]

    # Validate lot exists and belongs to staff's store
    lot = db.query(
        InventoryLot.id,
        InventoryLot.qty_on_hand,
        InventoryLot.lot_code,
        Product.name.label('product_name'),
        Product.id.label('product_id')
    ).join(
        Product, Product.id == InventoryLot.product_id
    ).filter(
        InventoryLot.id == lot_id,
        InventoryLot.store_id == store_id
    ).first()

    if not lot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lô hàng không tồn tại hoặc không thuộc cửa hàng"
        )

    if lot.qty_on_hand < offered_qty:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Số lượng donate vượt quá tồn kho"
        )

    if offered_qty <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Số lượng phải lớn hơn 0"
        )

    # Create donation offer
    new_offer = DonationOffer(
        store_id=store_id,
        lot_id=lot_id,
        offered_qty=offered_qty,
        status='open',
        created_by=user_id
    )
    db.add(new_offer)
    db.commit()
    db.refresh(new_offer)

    return {
        "success": True,
        "message": "Tạo donation offer thành công",
        "offerId": new_offer.id,
        "productName": lot.product_name,
        "lotCode": lot.lot_code,
        "offeredQty": offered_qty,
    }


def create_bulk_donation_offers(db: Session, user_id: int, items: list[dict]) -> dict:
    """Create multiple donation offers from inventory lots in bulk."""
    scope = _get_staff_scope(db, user_id)
    store_id = scope["store_id"]

    if not items:
        raise HTTPException(status_code=400, detail="Danh sách sản phẩm không được trống")

    created_offers = []
    errors = []

    for idx, item in enumerate(items):
        lot_id = item.get("lot_id")
        offered_qty = item.get("offered_qty")

        try:
            if not lot_id or not offered_qty:
                errors.append({"row": idx + 1, "message": "Thiếu lot_id hoặc offered_qty"})
                continue

            # Validate lot exists and belongs to staff's store
            lot = db.query(
                InventoryLot.id,
                InventoryLot.qty_on_hand,
                InventoryLot.lot_code,
                Product.name.label('product_name')
            ).join(
                Product, Product.id == InventoryLot.product_id
            ).filter(
                InventoryLot.id == lot_id,
                InventoryLot.store_id == store_id
            ).first()

            if not lot:
                errors.append({"row": idx + 1, "message": f"Lô hàng {lot_id} không tồn tại hoặc không thuộc cửa hàng"})
                continue

            if lot.qty_on_hand < offered_qty:
                errors.append({"row": idx + 1, "message": f"Lô {lot.lot_code}: số lượng donate ({offered_qty}) vượt quá tồn kho ({lot.qty_on_hand})"})
                continue

            if offered_qty <= 0:
                errors.append({"row": idx + 1, "message": f"Lô {lot.lot_code}: số lượng phải lớn hơn 0"})
                continue

            # Create donation offer
            new_offer = DonationOffer(
                store_id=store_id,
                lot_id=lot_id,
                offered_qty=offered_qty,
                status='open',
                created_by=user_id
            )
            db.add(new_offer)
            db.flush()  # Get ID without committing yet

            created_offers.append({
                "offerId": new_offer.id,
                "productName": lot.product_name,
                "lotCode": lot.lot_code,
                "offeredQty": offered_qty,
            })

        except Exception as e:
            errors.append({"row": idx + 1, "message": str(e)})

    if errors:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "Có lỗi khi tạo donation offers",
                "errors": errors
            }
        )

    db.commit()

    return {
        "success": True,
        "message": f"Đã tạo {len(created_offers)} đề nghị quyên góp thành công",
        "created": len(created_offers),
        "offers": created_offers,
    }


def list_staff_donation_offers(db: Session, user_id: int, status_filter: str = "all") -> dict:
    """List donation offers for staff's store."""
    scope = _get_staff_scope(db, user_id)
    store_id = scope["store_id"]

    query = db.query(
        DonationOffer.id,
        DonationOffer.lot_id,
        DonationOffer.offered_qty,
        DonationOffer.status,
        DonationOffer.created_at,
        InventoryLot.lot_code,
        InventoryLot.expiry_date,
        Product.name.label('product_name'),
        func.count(DonationRequest.id).label('request_count')
    ).join(
        InventoryLot, InventoryLot.id == DonationOffer.lot_id
    ).join(
        Product, Product.id == InventoryLot.product_id
    ).outerjoin(
        DonationRequest, DonationRequest.offer_id == DonationOffer.id
    ).filter(
        DonationOffer.store_id == store_id
    )

    if status_filter != "all":
        query = query.filter(DonationOffer.status == status_filter)

    rows = query.group_by(
        DonationOffer.id, InventoryLot.lot_code, InventoryLot.expiry_date, Product.name
    ).order_by(
        DonationOffer.created_at.desc()
    ).limit(200).all()

    items = []
    for row in rows:
        # Calculate remaining quantity
        total_requested = db.query(func.sum(DonationRequest.request_qty)).filter(
            DonationRequest.offer_id == row.id
        ).scalar() or 0
        remaining = row.offered_qty - int(total_requested)

        items.append({
            "id": row.id,
            "lotId": row.lot_id,
            "productName": row.product_name,
            "lotCode": row.lot_code,
            "offeredQty": row.offered_qty,
            "remainingQty": max(0, remaining),
            "expiryDate": row.expiry_date.isoformat() if row.expiry_date else None,
            "status": row.status,
            "createdAt": row.created_at.strftime("%d/%m/%Y %H:%M"),
            "requestCount": row.request_count,
        })

    return {"items": items}


def update_donation_offer_status(db: Session, user_id: int, offer_id: int, new_status: str) -> dict:
    """Update donation offer status (approve/reject)."""
    scope = _get_staff_scope(db, user_id)
    store_id = scope["store_id"]

    valid_statuses = ['open', 'approved', 'rejected', 'closed']
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Trạng thái không hợp lệ"
        )

    offer = db.query(DonationOffer).filter(
        DonationOffer.id == offer_id,
        DonationOffer.store_id == store_id
    ).first()

    if not offer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Donation offer không tồn tại"
        )

    offer.status = new_status
    db.commit()

    status_text = {
        'approved': 'duyệt',
        'rejected': 'từ chối',
        'closed': 'đóng'
    }.get(new_status, new_status)

    return {
        "success": True,
        "message": f"Đã {status_text} donation offer",
        "status": new_status
    }


# ========== Donation Requests Business Logic ==========
def list_staff_donation_requests(db: Session, user_id: int, status_filter: str = "all") -> dict:
    """List donation requests for staff's store."""
    scope = _get_staff_scope(db, user_id)
    store_id = scope["store_id"]

    query = db.query(
        DonationRequest.id,
        DonationRequest.offer_id,
        DonationRequest.charity_id,
        DonationRequest.request_qty,
        DonationRequest.status,
        DonationRequest.received_at,
        DonationRequest.created_at,
        User.full_name.label('charity_name'),
        User.phone.label('charity_phone'),
        InventoryLot.lot_code,
        Product.name.label('product_name'),
        DonationOffer.offered_qty.label('original_offered_qty'),
    ).join(
        DonationOffer, DonationOffer.id == DonationRequest.offer_id
    ).join(
        InventoryLot, InventoryLot.id == DonationOffer.lot_id
    ).join(
        Product, Product.id == InventoryLot.product_id
    ).join(
        User, User.id == DonationRequest.charity_id
    ).filter(
        DonationOffer.store_id == store_id
    )

    if status_filter != "all":
        query = query.filter(DonationRequest.status == status_filter)

    rows = query.order_by(
        DonationRequest.created_at.desc()
    ).limit(200).all()

    items = []
    for row in rows:
        items.append({
            "id": row.id,
            "offerId": row.offer_id,
            "organization": row.charity_name,
            "charityName": row.charity_name,
            "charityPhone": row.charity_phone,
            "request": f"{row.product_name} - {row.request_qty} sản phẩm",
            "productName": row.product_name,
            "lotCode": row.lot_code,
            "requestedQty": row.request_qty,
            "originalOfferedQty": row.original_offered_qty,
            "status": row.status,
            "receivedAt": row.received_at.strftime("%d/%m/%Y %H:%M") if row.received_at else None,
            "createdAt": row.created_at.strftime("%d/%m/%Y %H:%M"),
        })

    return {"items": items}


def update_donation_request_status(db: Session, user_id: int, request_id: int, new_status: str) -> dict:
    """Update donation request status (approve/reject)."""
    scope = _get_staff_scope(db, user_id)
    store_id = scope["store_id"]

    valid_statuses = ['pending', 'approved', 'rejected']
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Trạng thái không hợp lệ"
        )

    # Get request with offer and lot
    request = db.query(DonationRequest).join(
        DonationOffer, DonationOffer.id == DonationRequest.offer_id
    ).filter(
        DonationRequest.id == request_id,
        DonationOffer.store_id == store_id
    ).first()

    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Donation request không tồn tại"
        )

    if request.status != 'pending':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chỉ có thể xử lý request đang ở trạng thái pending"
        )

    if new_status == 'approved':
        # Check if offer has enough remaining quantity
        offer = db.query(DonationOffer).filter(DonationOffer.id == request.offer_id).first()
        total_requested = db.query(func.sum(DonationRequest.request_qty)).filter(
            DonationRequest.offer_id == request.offer_id,
            DonationRequest.id != request_id,  # exclude current request
            DonationRequest.status == 'approved'
        ).scalar() or 0

        available_qty = offer.offered_qty - int(total_requested)
        if request.request_qty > available_qty:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Không đủ số lượng. Còn lại: {available_qty}"
            )

        # Approve the request
        request.status = 'approved'
        db.commit()

        return {
            "success": True,
            "message": "Đã duyệt yêu cầu nhận donation",
            "status": "approved"
        }
    else:
        # Reject the request
        request.status = 'rejected'
        db.commit()

        return {
            "success": True,
            "message": "Đã từ chối yêu cầu nhận donation",
            "status": "rejected"
        }


# ========== File Upload & Import Business Logic ==========
def list_inventory_lots(db: Session, store_id: int, status_filter: str = "all") -> dict:
    """List inventory lots with optional status filter + pricing from discount policies."""
    from app.services import discount_policy_service
    from datetime import date, timedelta
    
    rows = db.query(
        InventoryLot.id,
        InventoryLot.lot_code,
        InventoryLot.qty_on_hand,
        InventoryLot.expiry_date,
        InventoryLot.status,
        Product.id.label('product_id'),
        Product.name.label('product_name'),
        Product.base_price,
        Product.supermarket_id
    ).join(
        Product, Product.id == InventoryLot.product_id
    ).filter(
        InventoryLot.store_id == store_id
    ).order_by(
        InventoryLot.expiry_date.asc(), InventoryLot.id.desc()
    ).all()

    items = []
    for row in rows:
        item = _dict_row(row)
        current_status = _normalize_status_value(item.get("status"), item["expiry_date"])
        if status_filter != "all" and status_filter.strip().lower() != current_status.lower():
            continue
        
        # Calculate discount and prices from discount policy
        base_price = float(item["base_price"] or 0)
        expiry_date = item["expiry_date"]
        days_left = (expiry_date - date.today()).days
        
        # Get discount from policy (3-level priority: product > category > supermarket)
        discount_result = discount_policy_service.calculate_discount(
            db,
            base_price,
            expiry_date.strftime("%Y-%m-%d"),
            item["supermarket_id"],
            item["product_id"]
        )
        discount_percent = discount_result.get("discountPercent", 0)
        sale_price = discount_result.get("finalPrice", base_price)
        
        items.append(
            {
                "id": item["id"],
                "lotCode": item["lot_code"],
                "productName": item["product_name"],
                "quantity": int(item["qty_on_hand"] or 0),
                "expiryDate": expiry_date.strftime("%Y-%m-%d"),
                "status": current_status,
                "basePrice": base_price,
                "salePrice": sale_price,
                "discount": discount_percent,
                "daysLeft": days_left,
            }
        )

    return {"items": items}


def create_inventory_lot(db: Session, store_id: int, supermarket_id: int, lot_code: str, product_name: str,
                        quantity: int, expiry_date: date, manual_status: object, action_note: str) -> dict:
    """Create new inventory lot."""
    lot_code = lot_code.strip()
    product_name = product_name.strip()

    if not lot_code or not product_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Du lieu khong hop le")

    action = _upsert_inventory_lot(
        db,
        store_id=store_id,
        supermarket_id=supermarket_id,
        lot_code=lot_code,
        product_name=product_name,
        quantity=quantity,
        expiry_date=expiry_date,
        manual_status=manual_status,
    )
    db.commit()

    return {"success": True, "action": action, "actionNote": action_note}


def update_inventory_lot(db: Session, lot_id: int, store_id: int, supermarket_id: int, lot_code: str,
                        product_name: str, quantity: int, expiry_date: date, manual_status: object) -> dict:
    """Update inventory lot."""
    lot_code = lot_code.strip()
    product_name = product_name.strip()

    if not lot_code or not product_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Du lieu khong hop le")

    exists = db.query(InventoryLot.id).filter(
        InventoryLot.id == lot_id,
        InventoryLot.store_id == store_id
    ).first()
    if not exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lo hang khong ton tai")

    product_id = _resolve_or_create_product(db, supermarket_id, product_name)
    next_status = _normalize_status_value(manual_status, expiry_date)

    db.query(InventoryLot).filter(
        InventoryLot.id == lot_id,
        InventoryLot.store_id == store_id
    ).update(
        {
            InventoryLot.lot_code: lot_code,
            InventoryLot.product_id: product_id,
            InventoryLot.qty_on_hand: quantity,
            InventoryLot.expiry_date: expiry_date,
            InventoryLot.status: next_status,
        },
        synchronize_session=False
    )
    db.commit()

    return {"success": True}


def delete_inventory_lot(db: Session, lot_id: int, store_id: int) -> dict:
    """Delete inventory lot."""
    result = db.query(InventoryLot).filter(
        InventoryLot.id == lot_id,
        InventoryLot.store_id == store_id
    ).delete()
    db.commit()

    if result == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lo hang khong ton tai")

    return {"success": True}


# ========== File Upload & Import Business Logic ==========
async def import_inventory_lots_from_excel(db: Session, store_id: int, supermarket_id: int,
                                          file: UploadFile) -> dict:
    """Import inventory lots from Excel file."""
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File trong")

    rows = _read_import_rows(file, file_bytes)
    if not rows:
        return {
            "success": True,
            "created": 0,
            "updated": 0,
            "failed": 0,
            "errors": [],
            "productsCreated": 0,
            "productsUpdated": 0,
            "lotsCreated": 0,
            "lotsUpdated": 0,
        }

    products_created = 0
    products_updated = 0
    lots_created = 0
    lots_updated = 0
    errors: list[dict[str, object]] = []

    for idx, row in enumerate(rows, start=2):
        lot_code_raw = _pick_field(row, "lot_code", "lotcode", "ma_lo", "ma_lo_hang")
        product_name_raw = _pick_field(row, "product_name", "product", "name", "ten_san_pham", "san_pham")
        quantity_raw = _pick_field(row, "quantity", "qty", "so_luong")
        expiry_raw = _pick_field(row, "expiry_date", "expiry", "ngay_het_han", "han_su_dung")
        status_raw = _pick_field(row, "status", "trang_thai")
        sku_raw = _pick_field(row, "sku", "ma_sku")
        base_price_raw = _pick_field(row, "base_price", "price", "don_gia", "gia")
        category_raw = _pick_field(row, "category", "category_name", "danh_muc")

        try:
            lot_code = str(lot_code_raw or "").strip()
            product_name = str(product_name_raw or "").strip()
            if not lot_code or not product_name:
                raise ValueError("Thieu ma lo hoac ten san pham")

            quantity = int(quantity_raw)
            if quantity < 0:
                raise ValueError("So luong phai >= 0")

            expiry_date = _parse_date_input(expiry_raw)
            product_id, product_action = _upsert_product_from_import(
                db,
                supermarket_id=supermarket_id,
                product_name_raw=product_name,
                sku_raw=sku_raw,
                base_price_raw=base_price_raw,
                category_name_raw=category_raw,
            )
            if product_action == "created":
                products_created += 1
            else:
                products_updated += 1

            lot_action = _upsert_inventory_lot(
                db,
                store_id=store_id,
                supermarket_id=supermarket_id,
                lot_code=lot_code,
                product_name=product_name,
                quantity=quantity,
                expiry_date=expiry_date,
                manual_status=status_raw,
                product_id=product_id,
            )

            if lot_action == "created":
                lots_created += 1
            else:
                lots_updated += 1
        except Exception as exc:  # noqa: BLE001
            errors.append({"row": idx, "message": str(exc)})

    db.commit()

    return {
        "success": True,
        "created": lots_created,
        "updated": lots_updated,
        "failed": len(errors),
        "errors": errors,
        "productsCreated": products_created,
        "productsUpdated": products_updated,
        "lotsCreated": lots_created,
        "lotsUpdated": lots_updated,
    }


async def import_products_from_excel(db: Session, store_id: int, supermarket_id: int,
                                    file: UploadFile) -> dict:
    """Import products from Excel file, optionally creating inventory lots."""
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File trong")

    rows = _read_import_rows(file, file_bytes)
    if not rows:
        return {
            "success": True,
            "productsCreated": 0,
            "productsUpdated": 0,
            "lotsCreated": 0,
            "lotsUpdated": 0,
            "failed": 0,
            "errors": [],
        }

    products_created = 0
    products_updated = 0
    lots_created = 0
    lots_updated = 0
    errors: list[dict[str, object]] = []

    for idx, row in enumerate(rows, start=2):
        product_name_raw = _pick_field(row, "product_name", "product", "name", "ten_san_pham", "san_pham")
        sku_raw = _pick_field(row, "sku", "ma_sku")
        base_price_raw = _pick_field(row, "base_price", "price", "don_gia", "gia")
        category_raw = _pick_field(row, "category", "category_name", "danh_muc")

        lot_code_raw = _pick_field(row, "lot_code", "lotcode", "ma_lo", "ma_lo_hang")
        quantity_raw = _pick_field(row, "quantity", "qty", "so_luong")
        expiry_raw = _pick_field(row, "expiry_date", "expiry", "ngay_het_han", "han_su_dung")
        status_raw = _pick_field(row, "status", "trang_thai")

        try:
            product_id, product_action = _upsert_product_from_import(
                db,
                supermarket_id=supermarket_id,
                product_name_raw=product_name_raw,
                sku_raw=sku_raw,
                base_price_raw=base_price_raw,
                category_name_raw=category_raw,
            )
            product_name = str(product_name_raw or "").strip()

            if product_action == "created":
                products_created += 1
            else:
                products_updated += 1

            has_lot_data = any(
                value not in (None, "")
                for value in (lot_code_raw, quantity_raw, expiry_raw)
            )
            if has_lot_data:
                lot_code = str(lot_code_raw or "").strip()
                if not lot_code:
                    raise ValueError("Thieu ma lo de tao ton kho")

                quantity = int(quantity_raw)
                if quantity < 0:
                    raise ValueError("So luong phai >= 0")

                expiry_date = _parse_date_input(expiry_raw)

                lot_action = _upsert_inventory_lot(
                    db,
                    store_id=store_id,
                    supermarket_id=supermarket_id,
                    lot_code=lot_code,
                    product_name=product_name,
                    quantity=quantity,
                    expiry_date=expiry_date,
                    manual_status=status_raw,
                    product_id=product_id,
                )
                if lot_action == "created":
                    lots_created += 1
                else:
                    lots_updated += 1
        except Exception as exc:  # noqa: BLE001
            errors.append({"row": idx, "message": str(exc)})

    db.commit()

    return {
        "success": True,
        "productsCreated": products_created,
        "productsUpdated": products_updated,
        "lotsCreated": lots_created,
        "lotsUpdated": lots_updated,
        "failed": len(errors),
        "errors": errors,
    }


async def upload_product_image(db: Session, user_id: int, file: UploadFile) -> dict:
    """Upload product image and return URL."""
    _get_staff_scope(db, user_id)

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chi chap nhan file hinh anh"
        )

    file_ext = os.path.splitext(file.filename or "")[1] or ".jpg"
    if file_ext.lower() not in (".jpg", ".jpeg", ".png", ".gif", ".webp"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chi chap nhan dinh dang jpg, png, gif, webp"
        )

    uploads_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "products")
    os.makedirs(uploads_dir, exist_ok=True)

    unique_name = f"{uuid4()}{file_ext}"
    file_path = os.path.join(uploads_dir, unique_name)

    contents = await file.read()
    max_size = 5 * 1024 * 1024
    if len(contents) > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File qua lon (toi da 5MB)"
        )

    with open(file_path, "wb") as f:
        f.write(contents)

    image_url = f"/uploads/products/{unique_name}"
    return {"url": image_url, "image_url": image_url}
