"""Charity service layer with business logic."""

from datetime import datetime
from sqlalchemy import text
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.core.security import get_password_hash, verify_password


# ========== Helper Functions ==========
def _dict_row(row) -> dict:
    """Convert SQLAlchemy row to dictionary."""
    return dict(row._mapping)


def _format_datetime(value) -> str | None:
    """Format datetime to string."""
    if not value:
        return None
    if isinstance(value, datetime):
        return value.strftime("%d/%m/%Y %H:%M")
    return str(value)


def _format_date(value) -> str:
    """Format date to string."""
    if not value:
        return datetime.now().strftime("%d/%m/%Y")
    if isinstance(value, datetime):
        return value.strftime("%d/%m/%Y")
    return str(value)[:10]


def _get_charity_user(db: Session, user_id: int):
    """Get and validate charity user."""
    user = db.execute(
        text(
            """
            SELECT id, role, full_name, email, phone
            FROM users
            WHERE id = :user_id
              AND role = 'charity'
            LIMIT 1
            """
        ),
        {"user_id": user_id},
    ).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khong tim thay tai khoan charity")
    return user


# ========== Profile Management ==========
def get_charity_profile(db: Session, user_id: int) -> dict:
    """Get charity organization profile."""
    user = _get_charity_user(db, user_id)

    charity = db.execute(
        text(
            """
            SELECT c.id, c.org_name, c.phone, u.username, u.email, u.full_name, u.created_at
            FROM charity_organizations c
            JOIN users u ON u.id = c.user_id
            WHERE c.user_id = :user_id
            LIMIT 1
            """
        ),
        {"user_id": user_id},
    ).first()

    if not charity:
        return {
            "id": None,
            "orgName": "",
            "fullName": user.full_name,
            "username": "",
            "email": user.email,
            "phone": user.phone,
            "createdAt": _format_date(user.created_at) if hasattr(user, 'created_at') else "",
        }

    item = _dict_row(charity)
    return {
        "id": item["id"],
        "orgName": item["org_name"] or "",
        "fullName": item["full_name"] or "",
        "username": item["username"] or "",
        "email": item["email"] or "",
        "phone": item["phone"] or "",
        "createdAt": _format_date(item.get("created_at")),
    }


def update_charity_profile(db: Session, user_id: int, full_name: str, email: str, phone: str, org_name: str) -> dict:
    """Update charity profile information."""
    user = _get_charity_user(db, user_id)

    full_name = (full_name or "").strip()
    email = (email or "").strip().lower()
    phone = (phone or "").strip()
    org_name = (org_name or "").strip()

    if not full_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ho ten khong duoc trong")
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email khong duoc trong")

    existing_email = db.execute(
        text("SELECT id FROM users WHERE email = :email AND id != :user_id LIMIT 1"),
        {"email": email, "user_id": user_id},
    ).first()
    if existing_email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email da duoc su dung")

    db.execute(
        text("UPDATE users SET full_name = :full_name, email = :email, phone = :phone WHERE id = :user_id"),
        {"full_name": full_name, "email": email, "phone": phone or None, "user_id": user_id},
    )

    if org_name:
        db.execute(
            text(
                """
                UPDATE charity_organizations SET org_name = :org_name, phone = :phone
                WHERE user_id = :user_id
                """
            ),
            {"org_name": org_name, "phone": phone or None, "user_id": user_id},
        )

    db.commit()
    return {"success": True}


def change_charity_password(db: Session, user_id: int, current_password: str, new_password: str) -> dict:
    """Change charity account password."""
    user = _get_charity_user(db, user_id)

    current_password = current_password or ""
    new_password = new_password or ""

    if len(new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mat khau moi phai co it nhat 6 ky tu.",
        )

    row = db.execute(
        text("SELECT password_hash FROM users WHERE id = :user_id LIMIT 1"),
        {"user_id": user_id},
    ).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khong tim thay tai khoan")

    if not verify_password(current_password, row.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mat khau hien tai khong dung.",
        )

    db.execute(
        text(
            """
            UPDATE users
            SET password_hash = :password_hash,
                failed_login_attempts = 0,
                locked_at = NULL
            WHERE id = :user_id
            """
        ),
        {"password_hash": get_password_hash(new_password), "user_id": user_id},
    )
    db.commit()
    return {"success": True}


# ========== Dashboard ==========
def get_charity_dashboard_summary(db: Session, user_id: int) -> dict:
    """Get charity dashboard statistics."""
    _get_charity_user(db, user_id)

    total_received = db.execute(
        text(
            """
            SELECT COUNT(*) FROM donation_requests
            WHERE charity_id = :user_id AND LOWER(status) = 'received'
            """
        ),
        {"user_id": user_id},
    ).scalar() or 0

    total_pending = db.execute(
        text(
            """
            SELECT COUNT(*) FROM donation_requests
            WHERE charity_id = :user_id AND LOWER(status) = 'pending'
            """
        ),
        {"user_id": user_id},
    ).scalar() or 0

    total_approved = db.execute(
        text(
            """
            SELECT COUNT(*) FROM donation_requests
            WHERE charity_id = :user_id AND LOWER(status) = 'approved'
            """
        ),
        {"user_id": user_id},
    ).scalar() or 0

    total_products = db.execute(
        text(
            """
            SELECT COALESCE(SUM(dr.request_qty), 0)
            FROM donation_requests dr
            WHERE dr.charity_id = :user_id AND LOWER(dr.status) = 'received'
            """
        ),
        {"user_id": user_id},
    ).scalar() or 0

    unique_stores = db.execute(
        text(
            """
            SELECT COUNT(DISTINCT dof.store_id)
            FROM donation_requests dr
            JOIN donation_offers dof ON dof.id = dr.offer_id
            WHERE dr.charity_id = :user_id AND LOWER(dr.status) = 'received'
            """
        ),
        {"user_id": user_id},
    ).scalar() or 0

    return {
        "totalReceived": int(total_received),
        "totalPending": int(total_pending),
        "totalApproved": int(total_approved),
        "totalProducts": int(total_products),
        "uniqueStores": int(unique_stores),
    }


# ========== Donation Offers ==========
def list_charity_donation_offers(db: Session, user_id: int) -> dict:
    """List available donation offers for charity."""
    _get_charity_user(db, user_id)

    rows = db.execute(
        text(
            """
            SELECT
                dof.id,
                dof.offered_qty,
                dof.status,
                dof.created_at,
                p.name AS product_name,
                il.expiry_date,
                s.name AS store_name,
                sm.name AS supermarket_name,
                COALESCE(dr_my.id, 0) AS my_request_id,
                COALESCE(dr_my.status, '') AS my_request_status
            FROM donation_offers dof
            JOIN inventory_lots il ON il.id = dof.lot_id
            JOIN products p ON p.id = il.product_id
            JOIN stores s ON s.id = dof.store_id
            JOIN supermarkets sm ON sm.id = s.supermarket_id
            LEFT JOIN donation_requests dr_my ON dr_my.offer_id = dof.id AND dr_my.charity_id = :user_id
            WHERE dof.status = 'open'
            ORDER BY dof.created_at DESC
            LIMIT 200
            """
        ),
        {"user_id": user_id},
    ).all()

    items = []
    for row in rows:
        item = _dict_row(row)
        display_status = "available"
        if item["offered_qty"] <= 0:
            display_status = "out_of_stock"
        elif item["my_request_status"] == "pending":
            display_status = "pending_full"

        items.append({
            "id": item["id"],
            "name": item["product_name"],
            "qty": int(item["offered_qty"] or 0),
            "exp": _format_date(item["expiry_date"]),
            "store": item["store_name"] or "",
            "supermarket": item["supermarket_name"] or "",
            "status": display_status,
            "myRequestId": int(item["my_request_id"]) if item["my_request_id"] else None,
            "myRequestStatus": item["my_request_status"],
        })

    return {"items": items}


# ========== Donation Requests ==========
def create_charity_donation_request(db: Session, user_id: int, offer_id: int, request_qty: int) -> dict:
    """Create a donation request for an offer."""
    _get_charity_user(db, user_id)

    if not offer_id or not request_qty:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Du lieu khong hop le")

    try:
        request_qty = int(request_qty)
        if request_qty < 1:
            raise ValueError
    except (TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="So luong khong hop le")

    offer = db.execute(
        text("SELECT id, offered_qty, status FROM donation_offers WHERE id = :offer_id LIMIT 1"),
        {"offer_id": offer_id},
    ).first()
    if not offer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Donation offer khong ton tai")
    if offer.status != "open":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Donation offer da dong")
    if request_qty > int(offer.offered_qty or 0):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="So luong vuot qua so luong co san")

    existing = db.execute(
        text(
            "SELECT id FROM donation_requests WHERE offer_id = :offer_id AND charity_id = :user_id LIMIT 1"
        ),
        {"offer_id": offer_id, "user_id": user_id},
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ban da gui yeu cau nhan hang cho offer nay roi",
        )

    db.execute(
        text(
            """
            INSERT INTO donation_requests (offer_id, charity_id, request_qty, status)
            VALUES (:offer_id, :charity_id, :request_qty, 'pending')
            """
        ),
        {"offer_id": offer_id, "charity_id": user_id, "request_qty": request_qty},
    )
    db.commit()

    return {"success": True, "message": "Gui yeu cau nhan hang thanh cong"}


def list_charity_donation_requests(db: Session, user_id: int) -> dict:
    """List charity's donation requests."""
    _get_charity_user(db, user_id)

    rows = db.execute(
        text(
            """
            SELECT
                dr.id,
                dr.request_qty,
                dr.status,
                dr.proof_image_url,
                dr.received_at,
                dr.created_at,
                dof.id AS offer_id,
                p.name AS product_name,
                il.expiry_date,
                s.name AS store_name,
                sm.name AS supermarket_name,
                dof.offered_qty AS original_qty,
                dof.created_at AS offer_created_at
            FROM donation_requests dr
            JOIN donation_offers dof ON dof.id = dr.offer_id
            JOIN inventory_lots il ON il.id = dof.lot_id
            JOIN products p ON p.id = il.product_id
            JOIN stores s ON s.id = dof.store_id
            JOIN supermarkets sm ON sm.id = s.supermarket_id
            WHERE dr.charity_id = :user_id
            ORDER BY dr.created_at DESC
            LIMIT 200
            """
        ),
        {"user_id": user_id},
    ).all()

    items = []
    for row in rows:
        item = _dict_row(row)
        items.append({
            "id": item["id"],
            "product": item["product_name"],
            "qty": int(item["request_qty"] or 0),
            "status": item["status"],
            "exp": _format_date(item["expiry_date"]),
            "store": item["store_name"] or "",
            "supermarket": item["supermarket_name"] or "",
            "createdAt": _format_date(item["created_at"]),
        })

    return {"items": items}


def confirm_received_donation(db: Session, user_id: int, request_id: int) -> dict:
    """Confirm received donation request."""
    _get_charity_user(db, user_id)

    request = db.execute(
        text(
            """
            SELECT id, charity_id, status
            FROM donation_requests
            WHERE id = :request_id
            LIMIT 1
            """
        ),
        {"request_id": request_id},
    ).first()

    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Donation request khong ton tai")
    if request.charity_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Khong co quyen truy cap")
    if request.status != "approved":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Chi co the nhan hang khi trang thai la approved")

    db.execute(
        text(
            """
            UPDATE donation_requests
            SET status = 'received', received_at = NOW()
            WHERE id = :request_id
            """
        ),
        {"request_id": request_id},
    )
    db.commit()

    return {"success": True, "message": "Xac nhan nhan hang thanh cong"}
