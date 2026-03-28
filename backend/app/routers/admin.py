from datetime import datetime, timedelta
from decimal import Decimal
import re

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import inspect, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_password_hash, verify_password

router = APIRouter(prefix="/admin", tags=["admin"])


def _dict_row(row) -> dict:
    return dict(row._mapping)


def _format_datetime(value) -> str | None:
    if not value:
        return None
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d %H:%M")
    return str(value)


def _format_date(value) -> str:
    if not value:
        return datetime.now().strftime("%Y-%m-%d")
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d")
    return str(value)[:10]


def _bool_from_db(value) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    return int(value) == 1


def _display_role(role: str | None) -> str:
    role_map = {
        "system_admin": "System Admin",
        "supermarket_admin": "Supermarket Admin",
        "store_staff": "Store Staff",
        "customer": "Customer",
        "charity": "Charity Organization",
        "delivery_partner": "Delivery Partner",
    }
    return role_map.get((role or "").lower(), role or "Unknown")


def _generate_username(db: Session, email: str, suffix: str) -> str:
    base = email.split("@", 1)[0].strip().lower() or "user"
    candidate = f"{base}_{suffix}".replace(" ", "")
    index = 1

    while True:
        existing = db.execute(
            text("SELECT id FROM users WHERE username = :username LIMIT 1"),
            {"username": candidate},
        ).first()
        if not existing:
            return candidate
        index += 1
        candidate = f"{base}_{suffix}_{index}".replace(" ", "")


def _get_supermarket_admin(db: Session, supermarket_id: int):
    return db.execute(
        text(
            """
            SELECT id, full_name, email, phone, is_active
            FROM users
            WHERE supermarket_id = :supermarket_id
              AND role = 'supermarket_admin'
            ORDER BY id
            LIMIT 1
            """
        ),
        {"supermarket_id": supermarket_id},
    ).first()


@router.get("/dashboard-summary")
def get_dashboard_summary(db: Session = Depends(get_db)):
    supermarkets_count = db.execute(text("SELECT COUNT(*) FROM supermarkets")).scalar() or 0
    charities_count = db.execute(text("SELECT COUNT(*) FROM charity_organizations")).scalar() or 0
    users_count = db.execute(
        text("SELECT COUNT(*) FROM users WHERE COALESCE(role, '') <> 'system_admin'")
    ).scalar() or 0

    pending_supermarkets = db.execute(
        text(
            """
            SELECT COUNT(*)
            FROM supermarkets s
            LEFT JOIN users u
              ON u.supermarket_id = s.id
             AND u.role = 'supermarket_admin'
            WHERE u.id IS NULL
            """
        )
    ).scalar() or 0

    pending_charities = db.execute(
        text(
            """
            SELECT COUNT(*)
            FROM charity_organizations c
            LEFT JOIN users u ON u.id = c.user_id
            WHERE u.id IS NULL
            """
        )
    ).scalar() or 0

    pending_deliveries = db.execute(
        text(
            """
            SELECT COUNT(*)
            FROM delivery_partners d
            LEFT JOIN users u ON u.id = d.user_id
            WHERE u.id IS NULL
            """
        )
    ).scalar() or 0

    return {
        "supermarkets": int(supermarkets_count),
        "charities": int(charities_count),
        "users": int(users_count),
        "pendingRequests": int(pending_supermarkets + pending_charities + pending_deliveries),
    }


@router.get("/reports")
def get_reports(
    range: str = Query(default="30d", pattern="^(7d|30d|90d)$"),
    db: Session = Depends(get_db),
):
    days_map = {"7d": 7, "30d": 30, "90d": 90}
    days = days_map[range]
    current_from = datetime.now() - timedelta(days=days)
    previous_from = datetime.now() - timedelta(days=days * 2)

    metrics_row = db.execute(
        text(
            """
            SELECT
                COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) AS revenue,
                COUNT(*) AS orders,
                COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) AS completed_orders
            FROM orders
            WHERE created_at >= :current_from
            """
        ),
        {"current_from": current_from},
    ).first()

    current_revenue = float(metrics_row.revenue or 0)
    current_orders = int(metrics_row.orders or 0)
    completed_orders = int(metrics_row.completed_orders or 0)
    delivered_rate = (completed_orders * 100.0 / current_orders) if current_orders else 0.0

    previous_orders = db.execute(
        text("SELECT COUNT(*) FROM orders WHERE created_at >= :prev_from AND created_at < :current_from"),
        {"prev_from": previous_from, "current_from": current_from},
    ).scalar() or 0

    revenue_trend = db.execute(
        text(
            """
            SELECT COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0)
            FROM orders
            WHERE created_at >= :prev_from AND created_at < :current_from
            """
        ),
        {"prev_from": previous_from, "current_from": current_from},
    ).scalar() or 0

    active_partners = db.execute(
        text("SELECT COUNT(*) FROM users WHERE role = 'delivery_partner' AND is_active = 1")
    ).scalar() or 0

    top_supermarkets = [
        _dict_row(row)
        for row in db.execute(
            text(
                """
                SELECT s.name, COUNT(o.id) AS orders
                FROM orders o
                JOIN stores st ON st.id = o.store_id
                JOIN supermarkets s ON s.id = st.supermarket_id
                WHERE o.created_at >= :current_from
                GROUP BY s.id, s.name
                ORDER BY orders DESC
                LIMIT 4
                """
            ),
            {"current_from": current_from},
        ).all()
    ]

    top_delivery = [
        _dict_row(row)
        for row in db.execute(
            text(
                """
                SELECT
                    COALESCE(u.full_name, CONCAT('Partner #', dp.id)) AS name,
                    COUNT(d.id) AS total_deliveries,
                    SUM(CASE WHEN d.status = 'delivered' THEN 1 ELSE 0 END) AS delivered_count,
                    AVG(
                        CASE
                            WHEN d.delivered_at IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, d.assigned_at, d.delivered_at)
                            ELSE NULL
                        END
                    ) AS avg_minutes
                FROM deliveries d
                JOIN delivery_partners dp ON dp.id = d.delivery_partner_id
                LEFT JOIN users u ON u.id = dp.user_id
                WHERE d.assigned_at >= :current_from
                GROUP BY dp.id, u.full_name
                ORDER BY delivered_count DESC
                LIMIT 3
                """
            ),
            {"current_from": current_from},
        ).all()
    ]

    previous_orders = int(previous_orders)
    previous_revenue = float(previous_orders and revenue_trend or 0)

    order_growth = ((current_orders - previous_orders) * 100.0 / previous_orders) if previous_orders else 0.0
    revenue_growth = ((current_revenue - previous_revenue) * 100.0 / previous_revenue) if previous_revenue else 0.0

    supermarket_rows = []
    for item in top_supermarkets:
        supermarket_rows.append(
            {
                "name": item["name"],
                "orders": int(item["orders"] or 0),
                "growth": "N/A",
            }
        )

    delivery_rows = []
    for item in top_delivery:
        total = int(item["total_deliveries"] or 0)
        completed = int(item["delivered_count"] or 0)
        completion = (completed * 100.0 / total) if total else 0.0
        delivery_rows.append(
            {
                "name": item["name"],
                "completion": f"{completion:.1f}%",
                "avgTime": f"{int(item['avg_minutes']) if item['avg_minutes'] else 0} phút",
            }
        )

    return {
        "metrics": {
            "revenue": f"{current_revenue:,.0f} VND".replace(",", "."),
            "orders": f"{current_orders:,}".replace(",", "."),
            "deliveredRate": f"{delivered_rate:.1f}%",
            "activePartners": str(int(active_partners)),
            "revenueTrend": f"{revenue_growth:+.1f}%",
            "ordersTrend": f"{order_growth:+.1f}%",
        },
        "supermarketTop": supermarket_rows,
        "deliveryTop": delivery_rows,
    }


@router.get("/audit-logs")
def list_audit_logs(
    action: str | None = Query(default=None),
    entity_type: str | None = Query(default=None),
    user_keyword: str | None = Query(default=None),
    from_date: str | None = Query(default=None),
    to_date: str | None = Query(default=None),
    limit: int = Query(default=200, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    where_clauses = []
    params: dict[str, object] = {"limit": limit}

    if action:
        where_clauses.append("a.action = :action")
        params["action"] = action.strip()

    if entity_type:
        where_clauses.append("a.entity_type = :entity_type")
        params["entity_type"] = entity_type.strip()

    if user_keyword:
        keyword = f"%{user_keyword.strip()}%"
        where_clauses.append("(u.username LIKE :keyword OR u.full_name LIKE :keyword OR u.email LIKE :keyword)")
        params["keyword"] = keyword

    if from_date:
        where_clauses.append("a.created_at >= :from_date")
        params["from_date"] = from_date

    if to_date:
        where_clauses.append("a.created_at < DATE_ADD(:to_date, INTERVAL 1 DAY)")
        params["to_date"] = to_date

    where_sql = ""
    if where_clauses:
        where_sql = "WHERE " + " AND ".join(where_clauses)

    rows = db.execute(
        text(
            f"""
            SELECT
                a.id,
                a.user_id,
                a.action,
                a.entity_type,
                a.entity_id,
                a.old_value,
                a.new_value,
                a.created_at,
                u.username,
                u.full_name,
                u.email
            FROM audit_logs a
            LEFT JOIN users u ON u.id = a.user_id
            {where_sql}
            ORDER BY a.created_at DESC, a.id DESC
            LIMIT :limit
            """
        ),
        params,
    ).all()

    items = []
    for row in rows:
        item = _dict_row(row)
        actor = item["full_name"] or item["username"] or item["email"] or "System"
        items.append(
            {
                "id": item["id"],
                "time": _format_datetime(item["created_at"]) or "-",
                "actor": actor,
                "action": item["action"] or "-",
                "entityType": item["entity_type"] or "-",
                "entityId": item["entity_id"],
                "oldValue": item["old_value"],
                "newValue": item["new_value"],
                "userId": item["user_id"],
            }
        )

    return {"items": items}


@router.get("/users")
def list_users(db: Session = Depends(get_db)):
    rows = db.execute(
        text(
            """
            SELECT
                u.id,
                u.username,
                u.full_name,
                u.email,
                u.phone,
                u.role,
                u.is_active,
                u.created_at,
                u.last_login_at,
                s.name AS supermarket_name,
                st.name AS store_name
            FROM users u
            LEFT JOIN supermarkets s ON s.id = u.supermarket_id
            LEFT JOIN stores st ON st.id = u.store_id
            WHERE u.role <> 'system_admin'
            ORDER BY u.created_at DESC, u.id DESC
            """
        )
    ).all()

    data = []
    for row in rows:
        item = _dict_row(row)
        data.append(
            {
                "id": item["id"],
                "username": item["username"],
                "fullName": item["full_name"],
                "email": item["email"],
                "phone": item["phone"],
                "role": _display_role(item["role"]),
                "status": "active" if _bool_from_db(item["is_active"]) else "inactive",
                "joinDate": _format_date(item["created_at"]),
                "lastLogin": _format_datetime(item["last_login_at"]) or "-",
                "supermarket": item["supermarket_name"] or "N/A",
                "store": item["store_name"] or "-",
            }
        )

    return {"items": data}


@router.patch("/users/{user_id}/toggle-lock")
def toggle_user_lock(user_id: int, db: Session = Depends(get_db)):
    user = db.execute(
        text("SELECT id, is_active, role FROM users WHERE id = :id LIMIT 1"),
        {"id": user_id},
    ).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if (user.role or "").lower() == "system_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Không thể khóa tài khoản System Admin.",
        )

    next_active = 0 if _bool_from_db(user.is_active) else 1
    db.execute(
        text(
            """
            UPDATE users
            SET is_active = :next_active,
                failed_login_attempts = CASE WHEN :next_active = 1 THEN 0 ELSE failed_login_attempts END,
                locked_at = CASE WHEN :next_active = 1 THEN NULL ELSE NOW() END
            WHERE id = :id
            """
        ),
        {"next_active": next_active, "id": user_id},
    )
    db.commit()

    return {"success": True}


@router.put("/users/{user_id}")
def update_user(user_id: int, payload: dict, db: Session = Depends(get_db)):
    row = db.execute(
        text("SELECT id, username FROM users WHERE id = :id LIMIT 1"),
        {"id": user_id},
    ).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    raw_username = payload.get("username")
    username = row.username if raw_username is None else str(raw_username).strip()
    full_name = (payload.get("fullName") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    phone = (payload.get("phone") or "").strip()

    if not username or not full_name or not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid data")

    if not re.fullmatch(r"[a-zA-Z0-9._-]{3,100}", username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username phải từ 3-100 ký tự và chỉ gồm chữ, số, dấu chấm, gạch dưới, gạch ngang.",
        )

    existing_username = db.execute(
        text("SELECT id FROM users WHERE username = :username AND id <> :id LIMIT 1"),
        {"username": username, "id": user_id},
    ).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tên đăng nhập đã tồn tại.",
        )

    existing_email = db.execute(
        text("SELECT id FROM users WHERE email = :email AND id <> :id LIMIT 1"),
        {"email": email, "id": user_id},
    ).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email đã tồn tại.",
        )

    db.execute(
        text(
            """
            UPDATE users
            SET username = :username,
                full_name = :full_name,
                email = :email,
                phone = :phone
            WHERE id = :id
            """
        ),
        {
            "username": username,
            "full_name": full_name,
            "email": email,
            "phone": phone or None,
            "id": user_id,
        },
    )
    db.commit()
    return {"success": True}


@router.post("/users/{user_id}/change-password")
def change_user_password(user_id: int, payload: dict, db: Session = Depends(get_db)):
    current_password = payload.get("currentPassword") or ""
    new_password = payload.get("newPassword") or ""

    if len(new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu mới phải có ít nhất 6 ký tự.",
        )

    row = db.execute(
        text("SELECT id, password_hash FROM users WHERE id = :id LIMIT 1"),
        {"id": user_id},
    ).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if not verify_password(current_password, row.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu hiện tại không đúng.",
        )

    db.execute(
        text(
            """
            UPDATE users
            SET password_hash = :password_hash,
                failed_login_attempts = 0,
                locked_at = NULL
            WHERE id = :id
            """
        ),
        {"password_hash": get_password_hash(new_password), "id": user_id},
    )
    db.commit()
    return {"success": True}


@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.execute(
        text("SELECT id, role FROM users WHERE id = :id LIMIT 1"),
        {"id": user_id},
    ).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if (user.role or "").lower() == "system_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Không thể xóa tài khoản System Admin.",
        )

    db.execute(text("DELETE FROM users WHERE id = :id"), {"id": user_id})
    db.commit()
    return {"success": True}


@router.get("/supermarkets")
def list_supermarkets(db: Session = Depends(get_db)):
    rows = db.execute(
        text(
            """
            SELECT
                s.id,
                s.name,
                s.contact_email,
                s.contact_phone,
                s.address,
                s.status,
                s.created_at,
                admin.id AS admin_user_id,
                admin.username AS admin_username,
                admin.full_name AS director,
                admin.email AS admin_email,
                admin.is_active AS admin_is_active
            FROM supermarkets s
            LEFT JOIN users admin
              ON admin.id = (
                    SELECT u2.id
                    FROM users u2
                    WHERE u2.supermarket_id = s.id
                      AND u2.role = 'supermarket_admin'
                    ORDER BY u2.id
                    LIMIT 1
              )
            ORDER BY s.created_at DESC, s.id DESC
            """
        )
    ).all()

    data = []
    for row in rows:
        item = _dict_row(row)
        account_created = item["admin_user_id"] is not None
        is_locked = account_created and (not _bool_from_db(item["admin_is_active"]))
        data.append(
            {
                "id": item["id"],
                "name": item["name"],
                "email": item["admin_email"] or item["contact_email"] or "",
                "phone": item["contact_phone"] or "",
                "address": item["address"] or "",
                "requestDate": _format_date(item["created_at"]),
                "status": item["status"] or "active",
                "director": item["director"] or "",
                "isLocked": bool(is_locked),
                "accountCreated": bool(account_created),
                "accountUsername": item["admin_username"] or "",
                "accountStatus": "inactive" if is_locked else ("active" if account_created else ""),
            }
        )

    return {"items": data}


@router.put("/supermarkets/{supermarket_id}")
def update_supermarket(supermarket_id: int, payload: dict, db: Session = Depends(get_db)):
    name = (payload.get("name") or "").strip()
    director = (payload.get("director") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    phone = (payload.get("phone") or "").strip()
    address = (payload.get("address") or "").strip()

    if not name or not email or not director:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid data")

    db.execute(
        text(
            """
            UPDATE supermarkets
            SET name = :name,
                contact_email = :email,
                contact_phone = :phone,
                address = :address
            WHERE id = :id
            """
        ),
        {
            "name": name,
            "email": email,
            "phone": phone,
            "address": address,
            "id": supermarket_id,
        },
    )

    admin = _get_supermarket_admin(db, supermarket_id)
    if admin:
        db.execute(
            text(
                """
                UPDATE users
                SET full_name = :full_name,
                    email = :email,
                    phone = :phone
                WHERE id = :id
                """
            ),
            {"full_name": director, "email": email, "phone": phone or None, "id": admin.id},
        )

    db.commit()
    return {"success": True}


@router.post("/supermarkets/{supermarket_id}/create-account")
def create_supermarket_account(supermarket_id: int, payload: dict, db: Session = Depends(get_db)):
    name = (payload.get("name") or "").strip()
    director = (payload.get("director") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    phone = (payload.get("phone") or "").strip()
    password = payload.get("password") or ""
    activity_status = (payload.get("activityStatus") or "active").strip().lower()

    if not name or not director or not email or len(password) < 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid data")

    try:
        db.execute(
            text(
                """
                UPDATE supermarkets
                SET name = :name,
                    contact_email = :email,
                    contact_phone = :phone
                WHERE id = :id
                """
            ),
            {
                "name": name,
                "email": email,
                "phone": phone,
                "id": supermarket_id,
            },
        )

        is_active = 0 if activity_status == "locked" else 1
        password_hash = get_password_hash(password)
        admin = _get_supermarket_admin(db, supermarket_id)

        if admin:
            db.execute(
                text(
                    """
                    UPDATE users
                    SET full_name = :full_name,
                        email = :email,
                        phone = :phone,
                        is_active = :is_active,
                        password_hash = :password_hash,
                        failed_login_attempts = 0,
                        locked_at = CASE WHEN :is_active = 1 THEN NULL ELSE NOW() END
                    WHERE id = :id
                    """
                ),
                {
                    "full_name": director,
                    "email": email,
                    "phone": phone or None,
                    "is_active": is_active,
                    "password_hash": password_hash,
                    "id": admin.id,
                },
            )
        else:
            username = _generate_username(db, email, f"sm{supermarket_id}")
            db.execute(
                text(
                    """
                    INSERT INTO users
                        (supermarket_id, username, email, password_hash, full_name, phone, role, is_active, failed_login_attempts)
                    VALUES
                        (:supermarket_id, :username, :email, :password_hash, :full_name, :phone, 'supermarket_admin', :is_active, 0)
                    """
                ),
                {
                    "supermarket_id": supermarket_id,
                    "username": username,
                    "email": email,
                    "password_hash": password_hash,
                    "full_name": director,
                    "phone": phone or None,
                    "is_active": is_active,
                },
            )

        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể tạo/cập nhật tài khoản siêu thị. Kiểm tra email hoặc dữ liệu trùng.",
        ) from exc
    return {"success": True}


@router.post("/supermarkets/create-account")
def create_supermarket_with_account(payload: dict, db: Session = Depends(get_db)):
    name = (payload.get("name") or "").strip()
    director = (payload.get("director") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    phone = (payload.get("phone") or "").strip()
    password = payload.get("password") or ""
    activity_status = (payload.get("activityStatus") or "active").strip().lower()

    if not name or not director or not email or len(password) < 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid data")

    try:
        db.execute(
            text(
                """
                INSERT INTO supermarkets (name, contact_email, contact_phone, status)
                VALUES (:name, :email, :phone, 'active')
                """
            ),
            {
                "name": name,
                "email": email,
                "phone": phone or None,
            },
        )

        supermarket_id = db.execute(text("SELECT LAST_INSERT_ID() AS id")).scalar()
        if not supermarket_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không thể tạo siêu thị mới.",
            )

        is_active = 0 if activity_status == "locked" else 1
        password_hash = get_password_hash(password)
        username = _generate_username(db, email, f"sm{int(supermarket_id)}")

        db.execute(
            text(
                """
                INSERT INTO users
                    (supermarket_id, username, email, password_hash, full_name, phone, role, is_active, failed_login_attempts)
                VALUES
                    (:supermarket_id, :username, :email, :password_hash, :full_name, :phone, 'supermarket_admin', :is_active, 0)
                """
            ),
            {
                "supermarket_id": int(supermarket_id),
                "username": username,
                "email": email,
                "password_hash": password_hash,
                "full_name": director,
                "phone": phone or None,
                "is_active": is_active,
            },
        )

        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể tạo tài khoản siêu thị. Kiểm tra email hoặc dữ liệu trùng.",
        ) from exc

    return {"success": True, "supermarketId": int(supermarket_id)}


@router.patch("/supermarkets/{supermarket_id}/toggle-lock")
def toggle_supermarket_lock(supermarket_id: int, db: Session = Depends(get_db)):
    users = db.execute(
        text(
            """
            SELECT id, is_active
            FROM users
            WHERE supermarket_id = :supermarket_id
              AND role IN ('supermarket_admin', 'store_staff')
            """
        ),
        {"supermarket_id": supermarket_id},
    ).all()

    if not users:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No users for this supermarket")

    any_active = any(_bool_from_db(row.is_active) for row in users)
    next_active = 0 if any_active else 1

    db.execute(
        text(
            """
            UPDATE users
            SET is_active = :next_active,
                failed_login_attempts = CASE WHEN :next_active = 1 THEN 0 ELSE failed_login_attempts END,
                locked_at = CASE WHEN :next_active = 1 THEN NULL ELSE NOW() END
            WHERE supermarket_id = :supermarket_id
              AND role IN ('supermarket_admin', 'store_staff')
            """
        ),
        {"next_active": next_active, "supermarket_id": supermarket_id},
    )

    db.commit()
    return {"success": True}


@router.delete("/supermarkets/{supermarket_id}")
def delete_supermarket(supermarket_id: int, db: Session = Depends(get_db)):
    try:
        db.execute(text("DELETE FROM users WHERE supermarket_id = :id"), {"id": supermarket_id})
        db.execute(text("DELETE FROM supermarkets WHERE id = :id"), {"id": supermarket_id})
        db.commit()
        return {"success": True}
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete supermarket with related data",
        ) from exc


@router.get("/charities")
def list_charities(db: Session = Depends(get_db)):
    rows = db.execute(
        text(
            """
            SELECT
                c.id,
                c.org_name,
                c.phone,
                c.user_id,
                u.username,
                u.full_name,
                u.email,
                u.phone AS user_phone,
                u.is_active,
                u.created_at
            FROM charity_organizations c
            LEFT JOIN users u ON u.id = c.user_id
            ORDER BY c.id DESC
            """
        )
    ).all()

    data = []
    for row in rows:
        item = _dict_row(row)
        account_created = item["user_id"] is not None
        is_locked = account_created and (not _bool_from_db(item["is_active"]))
        data.append(
            {
                "id": item["id"],
                "name": item["org_name"],
                "email": item["email"] or "",
                "phone": item["phone"] or item["user_phone"] or "",
                "address": "",
                "requestDate": _format_date(item["created_at"]),
                "director": item["full_name"] or "",
                "isLocked": bool(is_locked),
                "accountCreated": bool(account_created),
                "accountUsername": item["username"] or "",
                "accountStatus": "inactive" if is_locked else ("active" if account_created else ""),
                "passwordStatus": "locked" if is_locked else ("active" if account_created else ""),
            }
        )

    return {"items": data}


@router.put("/charities/{charity_id}")
def update_charity(charity_id: int, payload: dict, db: Session = Depends(get_db)):
    name = (payload.get("name") or "").strip()
    director = (payload.get("director") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    phone = (payload.get("phone") or "").strip()

    if not name or not director or not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid data")

    charity = db.execute(
        text("SELECT id, user_id FROM charity_organizations WHERE id = :id LIMIT 1"),
        {"id": charity_id},
    ).first()
    if not charity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Charity not found")

    db.execute(
        text("UPDATE charity_organizations SET org_name = :name, phone = :phone WHERE id = :id"),
        {"name": name, "phone": phone or None, "id": charity_id},
    )

    if charity.user_id:
        db.execute(
            text(
                """
                UPDATE users
                SET full_name = :full_name,
                    email = :email,
                    phone = :phone
                WHERE id = :id
                """
            ),
            {"full_name": director, "email": email, "phone": phone or None, "id": charity.user_id},
        )

    db.commit()
    return {"success": True}


@router.post("/charities/{charity_id}/create-account")
def create_charity_account(charity_id: int, payload: dict, db: Session = Depends(get_db)):
    name = (payload.get("name") or "").strip()
    director = (payload.get("director") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    phone = (payload.get("phone") or "").strip()
    password = payload.get("password") or ""
    password_status = (payload.get("passwordStatus") or "active").strip().lower()

    if not name or not director or not email or len(password) < 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid data")

    charity = db.execute(
        text("SELECT id, user_id FROM charity_organizations WHERE id = :id LIMIT 1"),
        {"id": charity_id},
    ).first()
    if not charity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Charity not found")

    is_active = 0 if password_status == "locked" else 1
    password_hash = get_password_hash(password)

    try:
        db.execute(
            text("UPDATE charity_organizations SET org_name = :name, phone = :phone WHERE id = :id"),
            {"name": name, "phone": phone or None, "id": charity_id},
        )

        if charity.user_id:
            db.execute(
                text(
                    """
                    UPDATE users
                    SET full_name = :full_name,
                        email = :email,
                        phone = :phone,
                        is_active = :is_active,
                        password_hash = :password_hash,
                        role = 'charity',
                        failed_login_attempts = 0,
                        locked_at = CASE WHEN :is_active = 1 THEN NULL ELSE NOW() END
                    WHERE id = :id
                    """
                ),
                {
                    "full_name": director,
                    "email": email,
                    "phone": phone or None,
                    "is_active": is_active,
                    "password_hash": password_hash,
                    "id": charity.user_id,
                },
            )
        else:
            username = _generate_username(db, email, f"charity{charity_id}")
            result = db.execute(
                text(
                    """
                    INSERT INTO users
                        (username, email, password_hash, full_name, phone, role, is_active, failed_login_attempts)
                    VALUES
                        (:username, :email, :password_hash, :full_name, :phone, 'charity', :is_active, 0)
                    """
                ),
                {
                    "username": username,
                    "email": email,
                    "password_hash": password_hash,
                    "full_name": director,
                    "phone": phone or None,
                    "is_active": is_active,
                },
            )
            db.execute(
                text("UPDATE charity_organizations SET user_id = :user_id WHERE id = :id"),
                {"user_id": int(result.lastrowid), "id": charity_id},
            )

        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể tạo/cập nhật tài khoản charity. Kiểm tra email hoặc dữ liệu trùng.",
        ) from exc
    return {"success": True}


@router.post("/charities/create-account")
def create_charity_with_account(payload: dict, db: Session = Depends(get_db)):
    name = (payload.get("name") or "").strip()
    director = (payload.get("director") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    phone = (payload.get("phone") or "").strip()
    password = payload.get("password") or ""
    password_status = (payload.get("passwordStatus") or "active").strip().lower()

    if not name or not director or not email or len(password) < 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid data")

    is_active = 0 if password_status == "locked" else 1
    password_hash = get_password_hash(password)

    try:
        username = _generate_username(db, email, "charity")
        user_result = db.execute(
            text(
                """
                INSERT INTO users
                    (username, email, password_hash, full_name, phone, role, is_active, failed_login_attempts)
                VALUES
                    (:username, :email, :password_hash, :full_name, :phone, 'charity', :is_active, 0)
                """
            ),
            {
                "username": username,
                "email": email,
                "password_hash": password_hash,
                "full_name": director,
                "phone": phone or None,
                "is_active": is_active,
            },
        )

        user_id = int(user_result.lastrowid)
        db.execute(
            text(
                """
                INSERT INTO charity_organizations (user_id, org_name, phone)
                VALUES (:user_id, :org_name, :phone)
                """
            ),
            {
                "user_id": user_id,
                "org_name": name,
                "phone": phone or None,
            },
        )

        charity_id = db.execute(text("SELECT LAST_INSERT_ID() AS id")).scalar()
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể tạo tài khoản charity. Kiểm tra email hoặc dữ liệu trùng.",
        ) from exc

    return {"success": True, "charityId": int(charity_id or 0)}


@router.patch("/charities/{charity_id}/toggle-lock")
def toggle_charity_lock(charity_id: int, db: Session = Depends(get_db)):
    row = db.execute(
        text(
            """
            SELECT u.id, u.is_active
            FROM charity_organizations c
            JOIN users u ON u.id = c.user_id
            WHERE c.id = :id
            LIMIT 1
            """
        ),
        {"id": charity_id},
    ).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Charity account not found")

    next_active = 0 if _bool_from_db(row.is_active) else 1
    db.execute(
        text(
            """
            UPDATE users
            SET is_active = :next_active,
                failed_login_attempts = CASE WHEN :next_active = 1 THEN 0 ELSE failed_login_attempts END,
                locked_at = CASE WHEN :next_active = 1 THEN NULL ELSE NOW() END
            WHERE id = :id
            """
        ),
        {"next_active": next_active, "id": row.id},
    )
    db.commit()
    return {"success": True}


@router.delete("/charities/{charity_id}")
def delete_charity(charity_id: int, db: Session = Depends(get_db)):
    row = db.execute(
        text("SELECT user_id FROM charity_organizations WHERE id = :id LIMIT 1"),
        {"id": charity_id},
    ).first()
    if row and row.user_id:
        db.execute(text("DELETE FROM users WHERE id = :id"), {"id": row.user_id})
    db.execute(text("DELETE FROM charity_organizations WHERE id = :id"), {"id": charity_id})
    db.commit()
    return {"success": True}


@router.get("/deliveries")
def list_delivery_partners(db: Session = Depends(get_db)):
    rows = db.execute(
        text(
            """
            SELECT
                d.id,
                d.phone,
                d.vehicle_type,
                d.vehicle_plate,
                d.user_id,
                u.username,
                u.full_name,
                u.email,
                u.is_active,
                u.created_at
            FROM delivery_partners d
            LEFT JOIN users u ON u.id = d.user_id
            ORDER BY d.id DESC
            """
        )
    ).all()

    data = []
    for row in rows:
        item = _dict_row(row)
        account_created = item["user_id"] is not None
        is_locked = account_created and (not _bool_from_db(item["is_active"]))
        data.append(
            {
                "id": item["id"],
                "name": item["full_name"] or f"Delivery #{item['id']}",
                "manager": item["full_name"] or "",
                "email": item["email"] or "",
                "phone": item["phone"] or "",
                "vehicleType": item["vehicle_type"] or "",
                "licensePlate": item["vehicle_plate"] or "",
                "requestDate": _format_date(item["created_at"]),
                "isLocked": bool(is_locked),
                "accountCreated": bool(account_created),
                "accountUsername": item["username"] or "",
                "accountStatus": "inactive" if is_locked else ("active" if account_created else ""),
                "passwordStatus": "locked" if is_locked else ("active" if account_created else ""),
            }
        )

    return {"items": data}


@router.put("/deliveries/{delivery_id}")
def update_delivery_partner(delivery_id: int, payload: dict, db: Session = Depends(get_db)):
    manager = (payload.get("manager") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    phone = (payload.get("phone") or "").strip()
    vehicle_type = (payload.get("vehicleType") or "").strip()
    license_plate = (payload.get("licensePlate") or "").strip()

    if not manager or not email or not phone:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid data")

    row = db.execute(
        text("SELECT id, user_id FROM delivery_partners WHERE id = :id LIMIT 1"),
        {"id": delivery_id},
    ).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Delivery partner not found")

    db.execute(
        text(
            """
            UPDATE delivery_partners
            SET phone = :phone,
                vehicle_type = :vehicle_type,
                vehicle_plate = :license_plate
            WHERE id = :id
            """
        ),
        {
            "phone": phone,
            "vehicle_type": vehicle_type or None,
            "license_plate": license_plate or None,
            "id": delivery_id,
        },
    )

    if row.user_id:
        db.execute(
            text(
                """
                UPDATE users
                SET full_name = :full_name,
                    email = :email,
                    phone = :phone
                WHERE id = :id
                """
            ),
            {
                "full_name": manager,
                "email": email,
                "phone": phone,
                "id": row.user_id,
            },
        )

    db.commit()
    return {"success": True}


@router.post("/deliveries/{delivery_id}/create-account")
def create_delivery_account(delivery_id: int, payload: dict, db: Session = Depends(get_db)):
    manager = (payload.get("manager") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    phone = (payload.get("phone") or "").strip()
    vehicle_type = (payload.get("vehicleType") or "").strip()
    license_plate = (payload.get("licensePlate") or "").strip()
    password = payload.get("password") or ""
    password_status = (payload.get("passwordStatus") or "active").strip().lower()

    if not manager or not email or not phone or len(password) < 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid data")

    row = db.execute(
        text("SELECT id, user_id FROM delivery_partners WHERE id = :id LIMIT 1"),
        {"id": delivery_id},
    ).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Delivery partner not found")

    is_active = 0 if password_status == "locked" else 1
    password_hash = get_password_hash(password)

    try:
        db.execute(
            text(
                """
                UPDATE delivery_partners
                SET phone = :phone,
                    vehicle_type = :vehicle_type,
                    vehicle_plate = :license_plate
                WHERE id = :id
                """
            ),
            {
                "phone": phone,
                "vehicle_type": vehicle_type or None,
                "license_plate": license_plate or None,
                "id": delivery_id,
            },
        )

        if row.user_id:
            db.execute(
                text(
                    """
                    UPDATE users
                    SET full_name = :full_name,
                        email = :email,
                        phone = :phone,
                        role = 'delivery_partner',
                        is_active = :is_active,
                        password_hash = :password_hash,
                        failed_login_attempts = 0,
                        locked_at = CASE WHEN :is_active = 1 THEN NULL ELSE NOW() END
                    WHERE id = :id
                    """
                ),
                {
                    "full_name": manager,
                    "email": email,
                    "phone": phone,
                    "is_active": is_active,
                    "password_hash": password_hash,
                    "id": row.user_id,
                },
            )
        else:
            username = _generate_username(db, email, f"delivery{delivery_id}")
            result = db.execute(
                text(
                    """
                    INSERT INTO users
                        (username, email, password_hash, full_name, phone, role, is_active, failed_login_attempts)
                    VALUES
                        (:username, :email, :password_hash, :full_name, :phone, 'delivery_partner', :is_active, 0)
                    """
                ),
                {
                    "username": username,
                    "email": email,
                    "password_hash": password_hash,
                    "full_name": manager,
                    "phone": phone,
                    "is_active": is_active,
                },
            )
            db.execute(
                text("UPDATE delivery_partners SET user_id = :user_id WHERE id = :id"),
                {"user_id": int(result.lastrowid), "id": delivery_id},
            )

        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể tạo/cập nhật tài khoản giao hàng. Kiểm tra email hoặc dữ liệu trùng.",
        ) from exc
    return {"success": True}


@router.post("/deliveries/create-account")
def create_delivery_with_account(payload: dict, db: Session = Depends(get_db)):
    manager = (payload.get("manager") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    phone = (payload.get("phone") or "").strip()
    vehicle_type = (payload.get("vehicleType") or "").strip()
    license_plate = (payload.get("licensePlate") or "").strip()
    password = payload.get("password") or ""
    password_status = (payload.get("passwordStatus") or "active").strip().lower()

    if not manager or not email or not phone or len(password) < 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid data")

    is_active = 0 if password_status == "locked" else 1
    password_hash = get_password_hash(password)

    try:
        username = _generate_username(db, email, "delivery")
        user_result = db.execute(
            text(
                """
                INSERT INTO users
                    (username, email, password_hash, full_name, phone, role, is_active, failed_login_attempts)
                VALUES
                    (:username, :email, :password_hash, :full_name, :phone, 'delivery_partner', :is_active, 0)
                """
            ),
            {
                "username": username,
                "email": email,
                "password_hash": password_hash,
                "full_name": manager,
                "phone": phone,
                "is_active": is_active,
            },
        )

        user_id = int(user_result.lastrowid)
        db.execute(
            text(
                """
                INSERT INTO delivery_partners (user_id, phone, vehicle_type, vehicle_plate)
                VALUES (:user_id, :phone, :vehicle_type, :license_plate)
                """
            ),
            {
                "user_id": user_id,
                "phone": phone,
                "vehicle_type": vehicle_type or None,
                "license_plate": license_plate or None,
            },
        )

        delivery_id = db.execute(text("SELECT LAST_INSERT_ID() AS id")).scalar()
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể tạo tài khoản giao hàng. Kiểm tra email hoặc dữ liệu trùng.",
        ) from exc

    return {"success": True, "deliveryId": int(delivery_id or 0)}


@router.patch("/deliveries/{delivery_id}/toggle-lock")
def toggle_delivery_lock(delivery_id: int, db: Session = Depends(get_db)):
    row = db.execute(
        text(
            """
            SELECT u.id, u.is_active
            FROM delivery_partners d
            JOIN users u ON u.id = d.user_id
            WHERE d.id = :id
            LIMIT 1
            """
        ),
        {"id": delivery_id},
    ).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Delivery account not found")

    next_active = 0 if _bool_from_db(row.is_active) else 1
    db.execute(
        text(
            """
            UPDATE users
            SET is_active = :next_active,
                failed_login_attempts = CASE WHEN :next_active = 1 THEN 0 ELSE failed_login_attempts END,
                locked_at = CASE WHEN :next_active = 1 THEN NULL ELSE NOW() END
            WHERE id = :id
            """
        ),
        {"next_active": next_active, "id": row.id},
    )
    db.commit()
    return {"success": True}


@router.delete("/deliveries/{delivery_id}")
def delete_delivery_partner(delivery_id: int, db: Session = Depends(get_db)):
    row = db.execute(
        text("SELECT user_id FROM delivery_partners WHERE id = :id LIMIT 1"),
        {"id": delivery_id},
    ).first()
    if row and row.user_id:
        db.execute(text("DELETE FROM users WHERE id = :id"), {"id": row.user_id})
    db.execute(text("DELETE FROM delivery_partners WHERE id = :id"), {"id": delivery_id})
    db.commit()
    return {"success": True}
