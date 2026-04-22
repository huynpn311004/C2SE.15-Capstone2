"""Charity service layer with business logic."""

from datetime import datetime
from sqlalchemy import func
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.core.security import get_password_hash, verify_password
from app.models.user import User
from app.models.charity_organization import CharityOrganization
from app.models.donation_offer import DonationOffer
from app.models.donation_request import DonationRequest
from app.models.inventory_lot import InventoryLot
from app.models.product import Product
from app.models.store import Store
from app.models.supermarket import Supermarket


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
    user = db.query(User.id, User.role, User.full_name, User.email, User.phone).filter(
        User.id == user_id,
        User.role == 'charity'
    ).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khong tim thay tai khoan charity")
    return user


# ========== Profile Management ==========
def get_charity_profile(db: Session, user_id: int) -> dict:
    """Get charity organization profile."""
    user = _get_charity_user(db, user_id)

    charity = db.query(
        CharityOrganization.id,
        CharityOrganization.org_name,
        CharityOrganization.phone,
        CharityOrganization.address,
        User.username,
        User.email,
        User.full_name,
        User.created_at
    ).join(
        User, User.id == CharityOrganization.user_id
    ).filter(
        CharityOrganization.user_id == user_id
    ).first()

    if not charity:
        return {
            "id": None,
            "orgName": "",
            "fullName": user.full_name,
            "username": "",
            "email": user.email,
            "phone": user.phone,
            "address": "",
            "createdAt": _format_date(user.created_at) if hasattr(user, 'created_at') else "",
        }

    return {
        "id": charity.id,
        "orgName": charity.org_name or "",
        "fullName": charity.full_name or "",
        "username": charity.username or "",
        "email": charity.email or "",
        "phone": charity.phone or "",
        "address": charity.address or "",
        "createdAt": _format_date(charity.created_at),
    }


def update_charity_profile(db: Session, user_id: int, full_name: str, email: str, phone: str, org_name: str, address: str = "") -> dict:
    """Update charity profile information."""
    user = _get_charity_user(db, user_id)

    full_name = (full_name or "").strip()
    email = (email or "").strip().lower()
    phone = (phone or "").strip()
    org_name = (org_name or "").strip()
    address = (address or "").strip()

    if not full_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ho ten khong duoc trong")
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email khong duoc trong")

    existing_email = db.query(User.id).filter(
        User.email == email,
        User.id != user_id
    ).first()
    if existing_email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email da duoc su dung")

    db.query(User).filter(User.id == user_id).update(
        {User.full_name: full_name, User.email: email, User.phone: phone or None},
        synchronize_session=False
    )

    if org_name:
        db.query(CharityOrganization).filter(
            CharityOrganization.user_id == user_id
        ).update(
            {
                CharityOrganization.org_name: org_name,
                CharityOrganization.phone: phone or None,
                CharityOrganization.address: address or None,
            },
            synchronize_session=False
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

    row = db.query(User.password_hash).filter(User.id == user_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khong tim thay tai khoan")

    if not verify_password(current_password, row.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mat khau hien tai khong dung.",
        )

    db.query(User).filter(User.id == user_id).update(
        {
            User.password_hash: get_password_hash(new_password),
            User.failed_login_attempts: 0,
            User.locked_at: None
        },
        synchronize_session=False
    )
    db.commit()
    return {"success": True}


# ========== Dashboard ==========
def get_charity_dashboard_summary(db: Session, user_id: int) -> dict:
    """Get charity dashboard statistics."""
    _get_charity_user(db, user_id)

    total_received = db.query(func.count(DonationRequest.id)).filter(
        DonationRequest.charity_id == user_id,
        func.lower(DonationRequest.status) == 'received'
    ).scalar() or 0

    total_pending = db.query(func.count(DonationRequest.id)).filter(
        DonationRequest.charity_id == user_id,
        func.lower(DonationRequest.status) == 'pending'
    ).scalar() or 0

    total_approved = db.query(func.count(DonationRequest.id)).filter(
        DonationRequest.charity_id == user_id,
        func.lower(DonationRequest.status) == 'approved'
    ).scalar() or 0

    total_products = db.query(func.coalesce(func.sum(DonationRequest.request_qty), 0)).filter(
        DonationRequest.charity_id == user_id,
        func.lower(DonationRequest.status) == 'received'
    ).scalar() or 0

    unique_stores = db.query(func.count(Store.id.distinct())).join(
        DonationOffer, DonationOffer.store_id == Store.id
    ).join(
        DonationRequest, DonationRequest.offer_id == DonationOffer.id
    ).filter(
        DonationRequest.charity_id == user_id,
        func.lower(DonationRequest.status) == 'received'
    ).scalar() or 0

    # Received list
    received_rows = db.query(
        DonationRequest.id,
        DonationRequest.request_qty,
        DonationRequest.status,
        DonationRequest.received_at,
        Product.name.label('product_name'),
        Store.name.label('store_name'),
        DonationOffer.lot_id,
    ).join(
        DonationOffer, DonationOffer.id == DonationRequest.offer_id
    ).join(
        Store, Store.id == DonationOffer.store_id
    ).join(
        InventoryLot, InventoryLot.id == DonationOffer.lot_id
    ).join(
        Product, Product.id == InventoryLot.product_id
    ).filter(
        DonationRequest.charity_id == user_id,
        func.lower(DonationRequest.status) == 'received'
    ).order_by(DonationRequest.received_at.desc()).limit(20).all()

    received_list = []
    for row in received_rows:
        received_list.append({
            "id": row.id,
            "product": row.product_name,
            "qty": row.request_qty,
            "store": row.store_name,
            "date": row.received_at.strftime("%d/%m/%Y") if row.received_at else "-",
        })

    # Pending requests
    pending_rows = db.query(
        DonationRequest.id,
        DonationRequest.request_qty,
        DonationRequest.status,
        DonationRequest.created_at,
        Product.name.label('product_name'),
        Store.name.label('store_name'),
    ).join(
        DonationOffer, DonationOffer.id == DonationRequest.offer_id
    ).join(
        Store, Store.id == DonationOffer.store_id
    ).join(
        InventoryLot, InventoryLot.id == DonationOffer.lot_id
    ).join(
        Product, Product.id == InventoryLot.product_id
    ).filter(
        DonationRequest.charity_id == user_id,
        func.lower(DonationRequest.status) == 'pending'
    ).order_by(DonationRequest.created_at.desc()).limit(20).all()

    pending_list = []
    for row in pending_rows:
        pending_list.append({
            "id": row.id,
            "product": row.product_name,
            "qty": row.request_qty,
            "store": row.store_name,
            "date": row.created_at.strftime("%d/%m/%Y"),
        })

    return {
        "totalReceived": int(total_received),
        "totalPending": int(total_pending),
        "totalApproved": int(total_approved),
        "totalProducts": int(total_products),
        "uniqueStores": int(unique_stores),
        "receivedList": received_list,
        "pendingList": pending_list,
    }


# ========== Donation Offers ==========
def list_charity_donation_offers(db: Session, user_id: int) -> dict:
    """List available donation offers for charity."""
    _get_charity_user(db, user_id)

    rows = db.query(
        DonationOffer.id,
        DonationOffer.offered_qty,
        DonationOffer.status,
        DonationOffer.created_at,
        Product.name.label('product_name'),
        InventoryLot.expiry_date,
        Store.name.label('store_name'),
        Supermarket.name.label('supermarket_name'),
        Supermarket.address.label('supermarket_address'),
        func.coalesce(DonationRequest.id, 0).label('my_request_id'),
        func.coalesce(DonationRequest.status, '').label('my_request_status')
    ).join(
        InventoryLot, InventoryLot.id == DonationOffer.lot_id
    ).join(
        Product, Product.id == InventoryLot.product_id
    ).join(
        Store, Store.id == DonationOffer.store_id
    ).join(
        Supermarket, Supermarket.id == Store.supermarket_id
    ).outerjoin(
        DonationRequest,
        (DonationRequest.offer_id == DonationOffer.id) & (DonationRequest.charity_id == user_id)
    ).filter(
        DonationOffer.status == 'open'
    ).order_by(
        DonationOffer.created_at.desc()
    ).limit(200).all()

    items = []
    for row in rows:
        display_status = "available"
        if row.offered_qty <= 0:
            display_status = "out_of_stock"
        elif row.my_request_status == "pending":
            display_status = "pending_full"

        items.append({
            "id": row.id,
            "name": row.product_name,
            "qty": int(row.offered_qty or 0),
            "exp": _format_date(row.expiry_date),
            "store": row.store_name or "",
            "supermarket": row.supermarket_name or "",
            "supermarketAddress": row.supermarket_address or "",
            "status": display_status,
            "myRequestId": int(row.my_request_id) if row.my_request_id else None,
            "myRequestStatus": row.my_request_status,
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

    offer = db.query(DonationOffer.id, DonationOffer.offered_qty, DonationOffer.status).filter(
        DonationOffer.id == offer_id
    ).first()
    if not offer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Donation offer khong ton tai")
    if offer.status != "open":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Donation offer da dong")
    
    # Calculate total already requested (pending + approved) to prevent overbooking
    total_requested = db.query(func.sum(DonationRequest.request_qty)).filter(
        DonationRequest.offer_id == offer_id,
        DonationRequest.status.in_(['pending', 'approved'])
    ).scalar() or 0
    
    available_qty = int(offer.offered_qty or 0) - int(total_requested)
    if request_qty > available_qty:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"So luong vuot qua so luong co san. Con lai: {available_qty}")

    existing = db.query(DonationRequest.id).filter(
        DonationRequest.offer_id == offer_id,
        DonationRequest.charity_id == user_id
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ban da gui yeu cau nhan hang cho offer nay roi",
        )

    new_request = DonationRequest(
        offer_id=offer_id,
        charity_id=user_id,
        request_qty=request_qty,
        status='pending'
    )
    db.add(new_request)
    db.commit()

    return {"success": True, "message": "Gui yeu cau nhan hang thanh cong"}


def list_charity_donation_requests(db: Session, user_id: int) -> dict:
    """List charity's donation requests."""
    _get_charity_user(db, user_id)

    rows = db.query(
        DonationRequest.id,
        DonationRequest.request_qty,
        DonationRequest.status,
        DonationRequest.received_at,
        DonationRequest.created_at,
        DonationOffer.id.label('offer_id'),
        Product.name.label('product_name'),
        InventoryLot.expiry_date,
        Store.name.label('store_name'),
        Supermarket.name.label('supermarket_name'),
        Supermarket.address.label('supermarket_address'),
        DonationOffer.offered_qty.label('original_qty'),
        DonationOffer.created_at.label('offer_created_at')
    ).join(
        DonationOffer, DonationOffer.id == DonationRequest.offer_id
    ).join(
        InventoryLot, InventoryLot.id == DonationOffer.lot_id
    ).join(
        Product, Product.id == InventoryLot.product_id
    ).join(
        Store, Store.id == DonationOffer.store_id
    ).join(
        Supermarket, Supermarket.id == Store.supermarket_id
    ).filter(
        DonationRequest.charity_id == user_id
    ).order_by(
        DonationRequest.created_at.desc()
    ).limit(200).all()

    items = []
    for row in rows:
        items.append({
            "dbId": row.id,
            "id": row.id,
            "item": row.product_name,
            "product": row.product_name,
            "reqQty": int(row.request_qty or 0),
            "qty": int(row.request_qty or 0),
            "status": row.status.lower() if row.status else "pending",
            "exp": _format_date(row.expiry_date),
            "store": row.store_name or "",
            "supermarket": row.supermarket_name or "",
            "supermarketAddress": row.supermarket_address or "",
            "date": _format_date(row.created_at),
            "createdAt": _format_date(row.created_at),
            "approvedDate": _format_date(row.created_at) if row.status and row.status.lower() in ['approved', 'received'] else "-",
            "receivedDate": _format_date(row.received_at) if row.received_at else "-",
        })

    return {"items": items}


def confirm_received_donation(db: Session, user_id: int, request_id: int) -> dict:
    """Confirm received donation request."""
    _get_charity_user(db, user_id)

    request = db.query(
        DonationRequest.id,
        DonationRequest.charity_id,
        DonationRequest.status
    ).filter(
        DonationRequest.id == request_id
    ).first()

    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Donation request khong ton tai")
    if request.charity_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Khong co quyen truy cap")
    if request.status != "approved":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Chi co the nhan hang khi trang thai la approved")

    db.query(DonationRequest).filter(
        DonationRequest.id == request_id
    ).update(
        {DonationRequest.status: 'received', DonationRequest.received_at: datetime.now()},
        synchronize_session=False
    )
    db.commit()

    return {"success": True, "message": "Xac nhan nhan hang thanh cong"}
