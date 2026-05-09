from datetime import datetime, date
from sqlalchemy import func, and_
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.core.security import get_password_hash, verify_password
from app.services.geocoding_service import calculate_distance
from app.models.user import User
from app.models.charity_organization import CharityOrganization
from app.models.donation_offer import DonationOffer
from app.models.donation_request import DonationRequest
from app.models.donation_request_item import DonationRequestItem
from app.models.inventory_lot import InventoryLot
from app.models.product import Product
from app.models.store import Store
from app.models.supermarket import Supermarket


# ========== Helper Functions ==========
def _dict_row(row) -> dict:
    return dict(row._mapping)


def _format_datetime(value) -> str | None:
    if not value:
        return None
    if isinstance(value, datetime):
        return value.strftime("%d/%m/%Y %H:%M")
    return str(value)


def _format_date(value) -> str:
    if not value:
        return datetime.now().strftime("%d/%m/%Y")
    if isinstance(value, datetime):
        return value.strftime("%d/%m/%Y")
    return str(value)[:10]


def _get_charity_user(db: Session, user_id: int):
    user = db.query(User.id, User.role, User.full_name, User.email, User.phone).filter(
        User.id == user_id,
        User.role == 'charity'
    ).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khong tim thay tai khoan charity")
    return user


# ========== Profile Management ==========
def get_charity_profile(db: Session, user_id: int) -> dict:
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

    if phone:
        existing_phone = db.query(User.id).filter(
            User.phone == phone,
            User.id != user_id
        ).first()
        if existing_phone:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Số điện thoại đã được sử dụng")

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
    _get_charity_user(db, user_id)

    total_received = db.query(func.count(DonationRequest.id)).filter(
        DonationRequest.charity_id == user_id,
        DonationRequest.status == 'RECEIVED'
    ).scalar() or 0

    total_pending = db.query(func.count(DonationRequest.id)).filter(
        DonationRequest.charity_id == user_id,
        DonationRequest.status == 'PENDING'
    ).scalar() or 0

    total_approved = db.query(func.count(DonationRequest.id)).filter(
        DonationRequest.charity_id == user_id,
        DonationRequest.status == 'APPROVED'
    ).scalar() or 0

    total_products = db.query(func.coalesce(func.sum(DonationRequestItem.quantity), 0)).join(
        DonationRequest, DonationRequest.id == DonationRequestItem.request_id
    ).filter(
        DonationRequest.charity_id == user_id,
        DonationRequest.status == 'RECEIVED'
    ).scalar() or 0

    unique_stores = db.query(func.count(Store.id.distinct())).join(
        DonationOffer, DonationOffer.store_id == Store.id
    ).join(
        DonationRequestItem, DonationRequestItem.offer_id == DonationOffer.id
    ).join(
        DonationRequest, DonationRequest.id == DonationRequestItem.request_id
    ).filter(
        DonationRequest.charity_id == user_id,
        DonationRequest.status == 'RECEIVED'
    ).scalar() or 0

    # Received list - sum quantities from items
    received_rows = db.query(
        DonationRequest.id,
        DonationRequest.status,
        DonationRequest.received_at,
        func.sum(DonationRequestItem.quantity).label('total_qty'),
    ).join(
        DonationRequestItem, DonationRequestItem.request_id == DonationRequest.id
    ).join(
        DonationOffer, DonationOffer.id == DonationRequestItem.offer_id
    ).filter(
        DonationRequest.charity_id == user_id,
        DonationRequest.status == 'RECEIVED'
    ).group_by(
        DonationRequest.id, DonationRequest.status, DonationRequest.received_at
    ).order_by(DonationRequest.received_at.desc()).limit(20).all()

    received_list = []
    for row in received_rows:
        received_list.append({
            "id": row.id,
            "qty": int(row.total_qty or 0),
            "date": row.received_at.strftime("%d/%m/%Y") if row.received_at else "-",
        })

    # Pending requests
    pending_rows = db.query(
        DonationRequest.id,
        DonationRequest.status,
        DonationRequest.created_at,
        func.sum(DonationRequestItem.quantity).label('total_qty'),
    ).join(
        DonationRequestItem, DonationRequestItem.request_id == DonationRequest.id
    ).join(
        DonationOffer, DonationOffer.id == DonationRequestItem.offer_id
    ).filter(
        DonationRequest.charity_id == user_id,
        DonationRequest.status == 'PENDING'
    ).group_by(
        DonationRequest.id, DonationRequest.status, DonationRequest.created_at
    ).order_by(DonationRequest.created_at.desc()).limit(20).all()

    pending_list = []
    for row in pending_rows:
        pending_list.append({
            "id": row.id,
            "qty": int(row.total_qty or 0),
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
    _get_charity_user(db, user_id)

    # Get charity location
    charity_org = db.query(CharityOrganization).filter(CharityOrganization.user_id == user_id).first()
    charity_lat = charity_org.latitude if charity_org else None
    charity_lng = charity_org.longitude if charity_org else None

    # Subquery to check if charity has pending/approved request for this offer
    from sqlalchemy import case
    
    base_query = db.query(
        DonationOffer.id,
        DonationOffer.offered_qty,
        DonationOffer.status,
        DonationOffer.created_at,
        Product.name.label('product_name'),
        InventoryLot.expiry_date,
        Store.name.label('store_name'),
        Supermarket.name.label('supermarket_name'),
        Supermarket.address.label('supermarket_address'),
        Store.latitude,
        Store.longitude,
        func.count(DonationRequestItem.id).label('request_count')
    ).join(
        InventoryLot, InventoryLot.id == DonationOffer.lot_id
    ).join(
        Product, Product.id == InventoryLot.product_id
    ).join(
        Store, Store.id == DonationOffer.store_id
    ).join(
        Supermarket, Supermarket.id == Store.supermarket_id
    ).outerjoin(
        DonationRequestItem, DonationRequestItem.offer_id == DonationOffer.id
    ).outerjoin(
        DonationRequest, and_(
            DonationRequest.id == DonationRequestItem.request_id,
            DonationRequest.charity_id == user_id
        )
    ).filter(
        DonationOffer.status == 'open',
        InventoryLot.expiry_date >= date.today(),
        func.date(DonationOffer.created_at) == date.today()
    ).group_by(
        DonationOffer.id, Product.name, InventoryLot.expiry_date, Store.name, Supermarket.name, Supermarket.address, Store.latitude, Store.longitude
    )

    rows = base_query.order_by(
        DonationOffer.created_at.desc()
    ).limit(200).all()

    items = []
    for row in rows:
        # Nếu charity có tọa độ → lọc theo bán kính 10km
        if charity_lat is not None and charity_lng is not None:
            if row.latitude is None or row.longitude is None:
                continue  # store không có tọa độ → loại bỏ
            dist = calculate_distance(charity_lat, charity_lng, row.latitude, row.longitude)
            if dist > 10.0:  # 10km
                continue  # quá xa → loại bỏ

        display_status = "available"
        if row.offered_qty <= 0:
            display_status = "out_of_stock"
        elif row.request_count > 0:
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
            "myRequestId": None,
            "myRequestStatus": "pending" if row.request_count > 0 else "",
        })

    return {"items": items}


# ========== Donation Requests (New Architecture) ==========
def create_charity_donation_request(db: Session, user_id: int, items: list) -> dict:
    _get_charity_user(db, user_id)

    if not items or len(items) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Danh sach san pham trong")

    validated_items = []
    offer_ids = []
    for idx, item in enumerate(items):
        offer_id = getattr(item, 'offer_id', None)
        quantity = getattr(item, 'quantity', None)

        if not offer_id or not quantity or quantity < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Item {idx + 1}: Du lieu khong hop le"
            )

        try:
            quantity = int(quantity)
        except (TypeError, ValueError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Item {idx + 1}: So luong khong hop le"
            )

        validated_items.append((offer_id, quantity))
        offer_ids.append(offer_id)

    # Check for duplicate offers in same request
    if len(offer_ids) != len(set(offer_ids)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Khong the yeu cau trung lap cung mot san pham"
        )

    # Lock all requested offers to prevent concurrent over-request
    offers = db.query(DonationOffer).filter(DonationOffer.id.in_(offer_ids)).with_for_update().all()
    offers_map = {offer.id: offer for offer in offers}

    if len(offers) != len(offer_ids):
        missing = set(offer_ids) - set(offers_map.keys())
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Donation offer(s) khong ton tai: {', '.join(str(o) for o in missing)}"
        )

    try:
        # Validate all items first
        for offer_id, quantity in validated_items:
            offer = offers_map.get(offer_id)
            if not offer:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Donation offer {offer_id} khong ton tai"
                )
            if offer.status != "open":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Donation offer {offer_id} da dong"
                )

            total_requested = db.query(func.coalesce(func.sum(DonationRequestItem.quantity), 0)).join(
                DonationRequest, DonationRequest.id == DonationRequestItem.request_id
            ).filter(
                DonationRequestItem.offer_id == offer_id,
                DonationRequest.status.in_(['PENDING', 'APPROVED'])
            ).scalar() or 0

            remaining_qty = int(offer.offered_qty or 0) - int(total_requested)
            if quantity > remaining_qty:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"San pham {offer_id}: So luong vuot qua. Con lai: {remaining_qty}"
                )

        # Group items by store_id
        items_by_store = {}  # {store_id: [(offer_id, quantity, offer_obj)]}
        for offer_id, quantity in validated_items:
            offer = offers_map.get(offer_id)
            store_id = offer.store_id
            if store_id not in items_by_store:
                items_by_store[store_id] = []
            items_by_store[store_id].append((offer_id, quantity, offer))

        # Get store names
        store_ids = list(items_by_store.keys())
        stores = db.query(Store.id, Store.name).filter(Store.id.in_(store_ids)).all()
        store_names = {s.id: s.name for s in stores}

        # Create one DonationRequest per store
        created_requests = []
        for store_id, store_items in items_by_store.items():
            total_qty = sum(qty for _, qty, _ in store_items)
            new_request = DonationRequest(
                charity_id=user_id,
                request_qty=total_qty,
                status='PENDING'
            )
            db.add(new_request)
            db.flush()  # Get request ID

            for offer_id, quantity, offer in store_items:
                new_item = DonationRequestItem(
                    request_id=new_request.id,
                    offer_id=offer_id,
                    quantity=quantity,
                    status='PENDING'
                )
                db.add(new_item)

            created_requests.append({
                "request_id": new_request.id,
                "store_id": store_id,
                "store_name": store_names.get(store_id, f"Cua hang {store_id}"),
                "item_count": len(store_items),
                "total_qty": total_qty
            })

        db.commit()

        total_requests = len(created_requests)
        return {
            "success": True,
            "message": f"Tao {total_requests} yeu cau tu {len(items_by_store)} cua hang thanh cong",
            "total_requests": total_requests,
            "requests": created_requests
        }
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Khong the tao yeu cau donation. Vui long thu lai.",
        ) from exc


def list_charity_donation_requests_new(db: Session, user_id: int) -> dict:
    _get_charity_user(db, user_id)

    rows = db.query(DonationRequest).filter(
        DonationRequest.charity_id == user_id
    ).order_by(DonationRequest.created_at.desc()).limit(200).all()

    items = []
    for req in rows:
        # Get charity info
        user = db.query(User).filter(User.id == req.charity_id).first()
        from app.models.charity_organization import CharityOrganization
        charity_org = db.query(CharityOrganization).filter(
            CharityOrganization.user_id == req.charity_id
        ).first()

        item_details = []
        for item in req.items or []:
            offer = db.query(DonationOffer).filter(DonationOffer.id == item.offer_id).first()
            product_name = None
            expiry_date = None
            store_name = None
            supermarket_name = None
            if offer:
                lot = db.query(InventoryLot).filter(InventoryLot.id == offer.lot_id).first()
                if lot:
                    product = db.query(Product).filter(Product.id == lot.product_id).first()
                    product_name = product.name if product else None
                    expiry_date = _format_date(lot.expiry_date) if lot.expiry_date else None

                store = db.query(Store).filter(Store.id == offer.store_id).first()
                if store:
                    store_name = store.name
                    supermarket = db.query(Supermarket).filter(Supermarket.id == store.supermarket_id).first()
                    supermarket_name = supermarket.name if supermarket else None

            item_details.append({
                "id": item.id,
                "offer_id": item.offer_id,
                "product_name": product_name,
                "qty": item.quantity,
                "status": item.status,
                "expiry_date": expiry_date,
                "store_name": store_name,
                "supermarket_name": supermarket_name,
            })

        items.append({
            "id": req.id,
            "charity_id": req.charity_id,
            "charity_name": user.full_name if user else None,
            "charity_org_name": charity_org.org_name if charity_org else None,
            "charity_phone": user.phone if user else None,
            "charity_address": charity_org.address if charity_org else None,
            "status": req.status.lower() if req.status else "pending",
            "total_items": len(item_details),
            "created_at": _format_date(req.created_at),
            "received_at": _format_datetime(req.received_at) if req.received_at else None,
            "items": item_details,
        })

    return {"items": items}


def list_charity_donation_requests(db: Session, user_id: int) -> dict:
    _get_charity_user(db, user_id)

    rows = db.query(
        DonationRequest.id,
        DonationRequest.status,
        DonationRequest.received_at,
        DonationRequest.created_at,
    ).filter(
        DonationRequest.charity_id == user_id
    ).order_by(
        DonationRequest.created_at.desc()
    ).limit(200).all()

    items = []
    for row in rows:
        # Get items for this request
        request_items = db.query(DonationRequestItem).filter(
            DonationRequestItem.request_id == row.id
        ).all()

        # Build item details
        item_details = []
        for item in request_items:
            offer = db.query(DonationOffer).filter(DonationOffer.id == item.offer_id).first()
            product_name = None
            expiry_date = None
            if offer:
                lot = db.query(InventoryLot).filter(InventoryLot.id == offer.lot_id).first()
                if lot:
                    product = db.query(Product).filter(Product.id == lot.product_id).first()
                    product_name = product.name if product else None
                    expiry_date = _format_date(lot.expiry_date) if lot.expiry_date else None

            item_details.append({
                "id": item.id,
                "product": product_name or "",
                "qty": item.quantity,
                "status": item.status,
                "exp": expiry_date or "",
                "offer_id": item.offer_id,
            })

        items.append({
            "dbId": row.id,
            "id": row.id,
            "status": row.status.lower() if row.status else "pending",
            "createdAt": _format_date(row.created_at),
            "receivedDate": _format_datetime(row.received_at) if row.received_at else "-",
            "items": item_details,
            "totalItems": len(item_details),
        })

    return {"items": items}


def confirm_received_donation(db: Session, user_id: int, request_id: int) -> dict:
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
    if request.status != "APPROVED":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Chi co the nhan hang khi trang thai la approved")

    db.query(DonationRequest).filter(
        DonationRequest.id == request_id
    ).update(
        {DonationRequest.status: 'RECEIVED', DonationRequest.received_at: datetime.now()},
        synchronize_session=False
    )

    # Update all items status
    db.query(DonationRequestItem).filter(
        DonationRequestItem.request_id == request_id
    ).update(
        {DonationRequestItem.status: 'RECEIVED'},
        synchronize_session=False
    )

    db.commit()

    return {"success": True, "message": "Xac nhan nhan hang thanh cong"}


def get_charity_donation_request_detail(db: Session, user_id: int, request_id: int) -> dict:
    _get_charity_user(db, user_id)

    request = db.query(DonationRequest).filter(
        DonationRequest.id == request_id,
        DonationRequest.charity_id == user_id
    ).first()

    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Donation request khong ton tai")

    # Get charity org info
    user = db.query(User).filter(User.id == request.charity_id).first()
    charity_org = db.query(CharityOrganization).filter(
        CharityOrganization.user_id == request.charity_id
    ).first()

    # Get items with product details
    items_query = db.query(DonationRequestItem).filter(
        DonationRequestItem.request_id == request_id
    ).all()

    items = []
    for item in items_query:
        offer = db.query(DonationOffer).filter(DonationOffer.id == item.offer_id).first()
        product_name = None
        lot_code = None
        expiry_date = None
        store_name = None

        if offer:
            lot = db.query(InventoryLot).filter(InventoryLot.id == offer.lot_id).first()
            if lot:
                product = db.query(Product).filter(Product.id == lot.product_id).first()
                product_name = product.name if product else None
                lot_code = lot.lot_code
                expiry_date = _format_date(lot.expiry_date) if lot.expiry_date else None
            store = db.query(Store).filter(Store.id == offer.store_id).first()
            store_name = store.name if store else None

        items.append({
            "id": item.id,
            "offer_id": item.offer_id,
            "product_name": product_name,
            "lot_code": lot_code,
            "quantity": item.quantity,
            "status": item.status,
            "expiry_date": expiry_date,
            "store_name": store_name,
        })

    return {
        "id": request.id,
        "charity_id": request.charity_id,
        "charity_name": user.full_name if user else None,
        "charity_org_name": charity_org.org_name if charity_org else None,
        "charity_phone": user.phone if user else None,
        "charity_address": charity_org.address if charity_org else None,
        "status": request.status,
        "total_items": len(items),
        "created_at": _format_datetime(request.created_at),
        "received_at": _format_datetime(request.received_at) if request.received_at else None,
        "items": items,
    }
