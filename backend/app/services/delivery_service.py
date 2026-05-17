from typing import Any
from datetime import datetime, timedelta
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status

from app.models.delivery import Delivery
from app.models.delivery_partner import DeliveryPartner
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.product import Product
from app.models.store import Store
from app.models.user import User
from app.models.inventory_lot import InventoryLot
from app.models.supermarket import Supermarket
from app.models.donation_request import DonationRequest
from app.models.charity_organization import CharityOrganization
from app.models.wallet_transaction import WalletTransaction
from app.core.security import get_password_hash, verify_password
from decimal import Decimal


# ========== Helper Functions ==========
def get_delivery_partner_user(db: Session, user_id: int):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy người dùng"
        )

    if user.role != "delivery_partner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền truy cập trang này"
        )

    dp = db.query(DeliveryPartner).filter(DeliveryPartner.user_id == user_id).first()
    if not dp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy thông tin delivery partner"
        )

    return dp


def get_order_items_detail(db: Session, order_id: int) -> tuple:
    items = (
        db.query(OrderItem, Product)
        .join(Product, OrderItem.product_id == Product.id)
        .filter(OrderItem.order_id == order_id)
        .all()
    )

    formatted_items = []
    items_list = []
    total_quantity = 0

    for item, product in items:
        item_str = f"{item.quantity} x {product.name}"
        formatted_items.append(item_str)
        items_list.append({
            "product_name": product.name,
            "quantity": item.quantity,
            "unit_price": float(item.unit_price)
        })
        total_quantity += item.quantity

    return ", ".join(formatted_items) if formatted_items else "Không có sản phẩm", items_list, total_quantity


def get_donation_items_detail(db: Session, donation_request_id: int) -> tuple:
    from app.models.donation_offer import DonationOffer
    from app.models.donation_request_item import DonationRequestItem
    from app.models.inventory_lot import InventoryLot

    items = (
        db.query(DonationRequestItem, Product)
        .join(DonationOffer, DonationRequestItem.offer_id == DonationOffer.id)
        .join(InventoryLot, DonationOffer.lot_id == InventoryLot.id)
        .join(Product, InventoryLot.product_id == Product.id)
        .filter(DonationRequestItem.request_id == donation_request_id)
        .all()
    )

    formatted_items = []
    items_list = []
    total_quantity = 0

    for item, product in items:
        item_str = f"{item.quantity} x {product.name}"
        formatted_items.append(item_str)
        items_list.append({
            "product_name": product.name,
            "quantity": item.quantity,
        })
        total_quantity += item.quantity

    return ", ".join(formatted_items) if formatted_items else "Không có sản phẩm", items_list, total_quantity


def calculate_reward(shipping_fee: Any) -> Decimal:
    # Shipper nhận 80% phí vận chuyển
    return Decimal(str(shipping_fee or 0)) * Decimal('0.8')


def format_delivery_data(delivery: Delivery, db: Session, include_order_detail: bool = True) -> dict:
    delivery_type = None
    entity_id = None
    entity_data = {}
    
    if delivery.order_id:
        delivery_type = "order"
        order = delivery.order
        if not order:
            return None
        
        customer = db.query(User).filter(User.id == order.customer_id).first()
        store = db.query(Store).filter(Store.id == order.store_id).first()
        
        # Get supermarket name
        supermarket_name = ""
        if store and store.supermarket_id:
            supermarket = db.query(Supermarket).filter(Supermarket.id == store.supermarket_id).first()
            if supermarket:
                supermarket_name = supermarket.name
        
        # Get items detail
        items_str, items_list, total_quantity = get_order_items_detail(db, order.id)
        
        # Calculate reward
        reward = calculate_reward(float(order.shipping_fee or 0))
        
        entity_id = order.id
        entity_data = {
            "id": delivery.id,
            "delivery_code": delivery.delivery_code,
            "delivery_type": "order",
            "order_id": order.id,
            "order_code": f"DH-{order.id}",
            "customer_id": order.customer_id,
            "customer_name": customer.full_name if customer else "Không có",
            "customer_phone": delivery.receiver_phone or (customer.phone if customer else ""),
            "customer_address": delivery.receiver_address or "Không có địa chỉ",
            "store_id": store.id if store else 0,
            "store_name": store.name if store else "Không có",
            "store_address": store.location if store else "Không có",
            "store_code": store.code if store else "",
            "supermarket_name": supermarket_name,
            "items": items_str,
            "items_list": items_list,
            "quantity": total_quantity,
            "total_amount": float(order.total_amount or 0),
            "payment_method": order.payment_method or "cod",
            "payment_method_text": "Tiền mặt (COD)" if (order.payment_method or "cod") == "cod" 
                                   else ("Ví SEIMS" if order.payment_method == "wallet" 
                                   else ("VNPay" if order.payment_method == "vnpay" else order.payment_method)),
            "payment_status": order.payment_status or "pending",
            "order_status": order.status,
            "shipping_fee": float(order.shipping_fee or 0),
            "status": delivery.status,
            "assigned_at": delivery.assigned_at.strftime("%Y-%m-%d %H:%M:%S") if delivery.assigned_at else "",
            "delivered_at": delivery.delivered_at.strftime("%Y-%m-%d %H:%M:%S") if delivery.delivered_at else None,
            "completed_at": delivery.delivered_at.strftime("%Y-%m-%d %H:%M:%S") if delivery.delivered_at else None,
            "created_at": order.created_at.strftime("%Y-%m-%d %H:%M:%S") if order.created_at else "",
            "reward": reward,
        }
    
    elif delivery.donation_request_id:
        delivery_type = "donation"
        donation = delivery.donation_request
        if not donation:
            return None
        
        # Get charity organization info (donation.charity_id is user_id, not charity_organization.id)
        charity = db.query(CharityOrganization).filter(CharityOrganization.user_id == donation.charity_id).first()
        store = db.query(Store).filter(Store.id == delivery.store_id).first()
        
        # Get supermarket name
        supermarket_name = ""
        if store and store.supermarket_id:
            supermarket = db.query(Supermarket).filter(Supermarket.id == store.supermarket_id).first()
            if supermarket:
                supermarket_name = supermarket.name
        
        # Get donation items detail (similar to order items)
        items_str, items_list, total_quantity = get_donation_items_detail(db, donation.id)
        
        entity_id = donation.id
        entity_data = {
            "id": delivery.id,
            "delivery_code": delivery.delivery_code,
            "delivery_type": "donation",
            "order_id": None,
            "customer_id": donation.charity_id,
            "customer_name": delivery.receiver_name or (charity.org_name if charity else "Không có"),
            "customer_phone": delivery.receiver_phone or (charity.phone if charity else ""),
            "customer_address": delivery.receiver_address or (charity.address if charity else "Không có địa chỉ"),
            "donation_request_id": donation.id,
            "charity_id": donation.charity_id,
            "charity_name": charity.org_name if charity else "Không có",
            "charity_phone": delivery.receiver_phone or (charity.phone if charity else ""),
            "charity_address": delivery.receiver_address or (charity.address if charity else "Không có địa chỉ"),
            "receiver_name": delivery.receiver_name or (charity.org_name if charity else ""),
            "store_id": store.id if store else 0,
            "store_name": store.name if store else "Không có",
            "store_address": store.location if store else "Không có",
            "store_code": store.code if store else "",
            "supermarket_name": supermarket_name,
            "items": items_str,
            "items_list": items_list,
            "quantity": total_quantity,
            "total_amount": 0,
            "payment_method": "donation",
            "payment_status": "COD",
            "order_status": donation.status,
            "donation_status": donation.status,
            "status": delivery.status,
            "assigned_at": delivery.assigned_at.strftime("%Y-%m-%d %H:%M:%S") if delivery.assigned_at else "",
            "delivered_at": delivery.delivered_at.strftime("%Y-%m-%d %H:%M:%S") if delivery.delivered_at else None,
            "completed_at": delivery.delivered_at.strftime("%Y-%m-%d %H:%M:%S") if delivery.delivered_at else None,
            "created_at": donation.created_at.strftime("%Y-%m-%d %H:%M:%S") if donation.created_at else "",
            "shipping_fee": float(donation.shipping_fee or 0),
            "reward": calculate_reward(float(donation.shipping_fee or 0)),
        }
    
    else:
        return None
    
    return entity_data


# ========== Delivery Orders ==========
def get_delivery_orders(db: Session, user_id: int) -> dict:
    dp = get_delivery_partner_user(db, user_id)

    deliveries = (
        db.query(Delivery)
        .filter(Delivery.delivery_partner_id == dp.id)
        .options(
            joinedload(Delivery.order).joinedload(Order.customer),
            joinedload(Delivery.order).joinedload(Order.store),
            joinedload(Delivery.store)
        )
        .order_by(Delivery.assigned_at.desc())
        .all()
    )

    orders = []
    for d in deliveries:
        order_data = format_delivery_data(d, db)
        if order_data:
            orders.append(order_data)

    return {"items": orders, "total": len(orders)}


def get_active_deliveries(db: Session, user_id: int) -> dict:
    dp = get_delivery_partner_user(db, user_id)

    deliveries = (
        db.query(Delivery)
        .filter(
            Delivery.delivery_partner_id == dp.id,
            Delivery.status.in_(["assigned", "picking_up", "delivering"])
        )
        .options(
            joinedload(Delivery.order).joinedload(Order.customer),
            joinedload(Delivery.order).joinedload(Order.store),
            joinedload(Delivery.store)
        )
        .order_by(Delivery.assigned_at.desc())
        .all()
    )

    orders = []
    for d in deliveries:
        order_data = format_delivery_data(d, db)
        if order_data:
            orders.append(order_data)

    return {"items": orders, "total": len(orders)}


def get_delivery_history(db: Session, user_id: int, filter: str = "all", search: str = None) -> dict:
    dp = get_delivery_partner_user(db, user_id)

    query = (
        db.query(Delivery)
        .filter(Delivery.delivery_partner_id == dp.id, Delivery.status == "completed")
        .options(
            joinedload(Delivery.order).joinedload(Order.customer),
            joinedload(Delivery.order).joinedload(Order.store),
            joinedload(Delivery.store)
        )
    )

    if filter == "today":
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        query = query.filter(Delivery.delivered_at >= today)
    elif filter == "week":
        week_ago = datetime.now() - timedelta(days=7)
        query = query.filter(Delivery.delivered_at >= week_ago)
    elif filter == "month":
        month_ago = datetime.now() - timedelta(days=30)
        query = query.filter(Delivery.delivered_at >= month_ago)

    if search:
        search_term = f"%{search}%"
        query = query.join(Store, Delivery.store_id == Store.id, isouter=True)
        query = query.join(Order, Delivery.order_id == Order.id, isouter=True)
        query = query.join(User, Order.customer_id == User.id, isouter=True)
        
        from sqlalchemy import or_
        query = query.filter(
            or_(
                Delivery.delivery_code.ilike(search_term),
                Store.name.ilike(search_term),
                User.full_name.ilike(search_term)
            )
        )

    deliveries = query.order_by(Delivery.delivered_at.desc()).all()

    orders = []
    for d in deliveries:
        order_data = format_delivery_data(d, db)
        if order_data:
            orders.append(order_data)

    return {"items": orders, "total": len(orders)}


def update_delivery_status(db: Session, delivery_id: int, new_status: str, user_id: int) -> dict:
    dp = get_delivery_partner_user(db, user_id)

    delivery = (
        db.query(Delivery)
        .filter(Delivery.id == delivery_id, Delivery.delivery_partner_id == dp.id)
        .first()
    )

    if not delivery:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy đơn giao hàng"
        )

    valid_statuses = ["assigned", "picking_up", "delivering", "completed", "cancelled"]
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Trạng thái không hợp lệ. Các trạng thái hợp lệ: {', '.join(valid_statuses)}"
        )

    delivery.status = new_status

    if new_status == "picking_up":
        # Khi shipper bắt đầu đi lấy hàng
        if delivery.order_id:
            order = db.query(Order).filter(Order.id == delivery.order_id).first()
            if order and order.status == "ready":
                pass # Giữ nguyên status 'ready' vì hàng đã được trừ kho ở bước này
        if delivery.donation_request_id:
            donation = db.query(DonationRequest).filter(DonationRequest.id == delivery.donation_request_id).first()
            if donation:
                donation.status = "APPROVED"

    # Đảm bảo wallet_balance không bị NULL trước khi tính toán
    if dp.wallet_balance is None:
        dp.wallet_balance = Decimal('0')

    if new_status == "picking_up":
        # Kiểm tra số dư nếu là đơn COD
        if delivery.order_id:
            order = db.query(Order).filter(Order.id == delivery.order_id).first()
            if order and order.payment_method == "cod":
                ship_fee = Decimal(str(order.shipping_fee or 0))
                order_amount = Decimal(str(order.total_amount or 0))
                # Shipper cần đủ tiền để trả: Tiền hàng + 20% ship (hoa hồng hệ thống)
                # Tương đương: Total - 80% ship
                required_amount = order_amount - (ship_fee * Decimal('0.8'))
                
                if dp.wallet_balance < required_amount:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Số dư ví không đủ để nhận đơn COD này. Cần tối thiểu {float(required_amount):,.0f}đ"
                    )
        # Kiểm tra số dư cho đơn Charity (Luôn là COD)
        elif delivery.donation_request_id:
            donation = db.query(DonationRequest).filter(DonationRequest.id == delivery.donation_request_id).first()
            if donation:
                ship_fee = Decimal(str(donation.shipping_fee or 0))
                platform_profit = ship_fee * Decimal('0.2')
                if dp.wallet_balance < platform_profit:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Số dư ví không đủ để trả phí nền tảng (20%). Cần tối thiểu {float(platform_profit):,.0f}đ"
                    )

    elif new_status == "delivering":
        # Khi shipper xác nhận đã lấy hàng và bắt đầu đi giao
        if delivery.order_id:
            order = db.query(Order).filter(Order.id == delivery.order_id).first()
            if order:
                order.status = "shipped"
                
                # NẾU LÀ ĐƠN COD - TRỪ TIỀN VÍ NGAY LÚC NÀY (GIỐNG GRAB)
                if order.payment_method == "cod":
                    store = db.query(Store).filter(Store.id == order.store_id).first()
                    if store and store.supermarket_id:
                        supermarket = db.query(Supermarket).filter(Supermarket.id == store.supermarket_id).first()
                        if supermarket:
                            if supermarket.wallet_balance is None:
                                supermarket.wallet_balance = Decimal('0')
                            
                            ship_fee = Decimal(str(order.shipping_fee or 0))
                            order_amount = Decimal(str(order.total_amount or 0))
                            platform_profit = ship_fee * Decimal('0.2')
                            
                            # Cửa hàng/Siêu thị nhận: Tiền hàng
                            # Hệ thống nhận: 20% phí ship
                            # Shipper giữ lại: 80% phí ship (nên deduction = Total - 80% Ship)
                            deduction = order_amount - (ship_fee * Decimal('0.8'))
                            # Sử dụng wallet_service để đảm bảo đồng bộ số dư và lịch sử
                            from app.services import wallet_service
                            
                            # 1. Shipper trả tiền hàng + 20% phí ship
                            wallet_service.add_transaction(
                                db, entity_type='shipper', entity_id=dp.id, amount=deduction,
                                transaction_type='order_settlement', reference_id=order.id, reference_type='order',
                                description=f"Thanh toán lấy đơn COD #{order.id} từ Store (Hàng + 20% ship)"
                            )
                            
                            # 2. Siêu thị nhận tiền hàng
                            product_price = order_amount - ship_fee
                            wallet_service.add_transaction(
                                db, entity_type='supermarket', entity_id=supermarket.id, amount=product_price,
                                transaction_type='order_payment', reference_id=order.id, reference_type='order',
                                description=f"Nhận tiền hàng đơn COD #{order.id} khi Shipper lấy hàng"
                            )

        # Đơn quyên góp Charity (Cũng trừ phí 20% ngay khi lấy hàng)
        elif delivery.donation_request_id:
            donation = db.query(DonationRequest).filter(DonationRequest.id == delivery.donation_request_id).first()
            if donation:
                donation.status = "SHIPPING"  # Cập nhật trạng thái đang giao
                ship_fee = Decimal(str(donation.shipping_fee or 0))
                platform_profit = ship_fee * Decimal('0.2')
                from app.services import wallet_service
                wallet_service.add_transaction(
                    db, entity_type='shipper', entity_id=dp.id, amount=platform_profit,
                    transaction_type='commission', reference_id=donation.id, reference_type='donation',
                    description=f"Khấu trừ hoa hồng đơn Charity #{donation.id} khi lấy hàng (20% ship)"
                )

    elif new_status == "completed":
        delivery.delivered_at = datetime.now()

        # Update order status and handle VNPay settlement
        if delivery.order_id:
            order = db.query(Order).filter(Order.id == delivery.order_id).first()
            if order:
                order.status = "completed"
                order.delivered_at = datetime.now()
                order.payment_status = "paid"  # Khi giao thành công thì chắc chắn là đã thanh toán (dù là COD hay Prepaid)
                
                # Nếu là VNPay thì mới cộng tiền lúc này (vì COD đã xử lý lúc lấy hàng)
                if order.payment_method != "cod":
                    store = db.query(Store).filter(Store.id == order.store_id).first()
                    if store and store.supermarket_id:
                        supermarket = db.query(Supermarket).filter(Supermarket.id == store.supermarket_id).first()
                        if supermarket:
                            if supermarket.wallet_balance is None:
                                supermarket.wallet_balance = Decimal('0')
                            
                            ship_fee = Decimal(str(order.shipping_fee or 0))
                            order_amount = Decimal(str(order.total_amount or 0))
                            shipper_reward = ship_fee * Decimal('0.8')
                            
                            from app.services import wallet_service
                            
                            shipper_reward = ship_fee * Decimal('0.8')
                            product_price = order_amount - ship_fee
                            
                            # 1. Shipper nhận 80% phí ship
                            wallet_service.add_transaction(
                                db, entity_type='shipper', entity_id=dp.id, amount=shipper_reward,
                                transaction_type='shipping_fee', reference_id=order.id, reference_type='order',
                                description=f"Thù lao giao đơn VNPay #{order.id} (80% ship)"
                            )
                            
                            # 2. Siêu thị nhận tiền hàng
                            wallet_service.add_transaction(
                                db, entity_type='supermarket', entity_id=supermarket.id, amount=product_price,
                                transaction_type='order_payment', reference_id=order.id, reference_type='order',
                                description=f"Nhận tiền hàng đơn VNPay #{order.id}"
                            )
        
        # Cập nhật trạng thái Charity (Tiền phí đã trừ lúc lấy hàng rồi)
        if delivery.donation_request_id:
            donation = db.query(DonationRequest).filter(DonationRequest.id == delivery.donation_request_id).first()
            if donation:
                donation.status = "RECEIVED"
                donation.received_at = datetime.now()

    elif new_status == "cancelled":
        # Xử lý hoàn tiền cho đơn quyên góp nếu đã bị trừ trước đó
        if delivery.donation_request_id:
            donation = db.query(DonationRequest).filter(DonationRequest.id == delivery.donation_request_id).first()
            if donation:
                # Nếu đã ở trạng thái lấy hàng (đã trừ 20%), thì hoàn lại
                if delivery.status in ["delivering", "shipped"]:
                    ship_fee = Decimal(str(donation.shipping_fee or 0))
                    platform_profit = ship_fee * Decimal('0.2')
                    from app.services import wallet_service
                    wallet_service.add_transaction(
                        db, entity_type='shipper', entity_id=dp.id, amount=platform_profit,
                        transaction_type='refund', reference_id=donation.id, reference_type='donation',
                        description=f"Hoàn phí 20% đơn Charity #{donation.id} do đơn bị hủy"
                    )
                
                # Trả lại trạng thái APPROVED để người khác có thể nhận
                donation.status = "APPROVED"

        # Nếu là đơn hàng Order bình thường (đã có logic hoàn tiền bên order_service.cancel_customer_order)
        # Ở đây chỉ cần đảm bảo status đơn hàng cũng được đồng bộ nếu cần
        if delivery.order_id:
            order = db.query(Order).filter(Order.id == delivery.order_id).first()
            if order and order.status != "cancelled":
                order.status = "cancelled"
                order.cancelled_at = datetime.now()

    db.commit()

    return {
        "message": f"Cập nhật trạng thái đơn {delivery.delivery_code} thành công!",
        "success": True
    }


def get_delivery_detail(db: Session, delivery_id: int, user_id: int) -> dict:
    dp = get_delivery_partner_user(db, user_id)

    delivery = (
        db.query(Delivery)
        .filter(Delivery.id == delivery_id, Delivery.delivery_partner_id == dp.id)
        .options(
            joinedload(Delivery.order).joinedload(Order.customer),
            joinedload(Delivery.order).joinedload(Order.store),
            joinedload(Delivery.store)
        )
        .first()
    )

    if not delivery:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy đơn giao hàng"
        )

    order_data = format_delivery_data(delivery, db)
    if not order_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy đơn hàng liên quan"
        )

    return order_data


# ========== Delivery Statistics ==========
def get_delivery_stats(db: Session, user_id: int) -> dict:
    dp = get_delivery_partner_user(db, user_id)

    # 1. Đếm số lượng đơn bằng các query riêng biệt để chính xác và nhanh
    total_orders = db.query(Delivery).filter(Delivery.delivery_partner_id == dp.id).count()
    completed_orders = db.query(Delivery).filter(
        Delivery.delivery_partner_id == dp.id, 
        Delivery.status == "completed"
    ).count()
    active_orders = db.query(Delivery).filter(
        Delivery.delivery_partner_id == dp.id,
        Delivery.status.in_(["assigned", "picking_up", "delivering"])
    ).count()

    # 2. Tính tổng thu nhập (80% phí ship) - Tối ưu bằng cách join trực tiếp
    # Tính từ đơn hàng thương mại
    order_earnings = db.query(func.sum(Order.shipping_fee)).join(
        Delivery, Delivery.order_id == Order.id
    ).filter(
        Delivery.delivery_partner_id == dp.id,
        Delivery.status == "completed"
    ).scalar() or 0

    # Tính từ đơn quyên góp
    donation_earnings = db.query(func.sum(DonationRequest.shipping_fee)).join(
        Delivery, Delivery.donation_request_id == DonationRequest.id
    ).filter(
        Delivery.delivery_partner_id == dp.id,
        Delivery.status == "completed"
    ).scalar() or 0

    # Tổng thu nhập = 80% của tổng phí ship (có bảo vệ phí sàn 15k cho mỗi đơn)
    # Tuy nhiên để đơn giản và chính xác theo logic calculate_reward, chúng ta nên lấy từng đơn
    # Nhưng nếu muốn nhanh thì dùng công thức 0.8 * total_shipping_fee là xấp xỉ đúng 
    # Ở đây tôi sẽ dùng logic chính xác nhất:
    
    total_earnings = Decimal('0')
    completed_deliveries = db.query(Delivery).filter(
        Delivery.delivery_partner_id == dp.id, 
        Delivery.status == "completed"
    ).options(joinedload(Delivery.order), joinedload(Delivery.donation_request)).all()

    for d in completed_deliveries:
        ship_fee = 0
        if d.order:
            ship_fee = d.order.shipping_fee
        elif d.donation_request:
            ship_fee = d.donation_request.shipping_fee
        
        total_earnings += calculate_reward(ship_fee)

    average_earning = total_earnings / completed_orders if completed_orders > 0 else Decimal('0')

    return {
        "total_orders": total_orders,
        "completed_orders": completed_orders,
        "active_orders": active_orders,
        "total_earnings": float(total_earnings),
        "average_earning": float(average_earning),
        "wallet_balance": float(dp.wallet_balance or 0),
    }


# ========== Donation Deliveries ==========
def get_donation_deliveries(db: Session, user_id: int) -> dict:
    dp = get_delivery_partner_user(db, user_id)

    deliveries = (
        db.query(Delivery)
        .filter(Delivery.delivery_partner_id == dp.id, Delivery.donation_request_id.isnot(None))
        .options(
            joinedload(Delivery.donation_request),
            joinedload(Delivery.store)
        )
        .order_by(Delivery.assigned_at.desc())
        .all()
    )

    donations = []
    for d in deliveries:
        donation_data = format_delivery_data(d, db)
        if donation_data:
            donations.append(donation_data)

    return {"items": donations, "total": len(donations)}


def get_active_donation_deliveries(db: Session, user_id: int) -> dict:
    dp = get_delivery_partner_user(db, user_id)

    deliveries = (
        db.query(Delivery)
        .filter(
            Delivery.delivery_partner_id == dp.id,
            Delivery.donation_request_id.isnot(None),
            Delivery.status.in_(["assigned", "picking_up", "delivering"])
        )
        .options(
            joinedload(Delivery.donation_request),
            joinedload(Delivery.store)
        )
        .order_by(Delivery.assigned_at.desc())
        .all()
    )

    donations = []
    for d in deliveries:
        donation_data = format_delivery_data(d, db)
        if donation_data:
            donations.append(donation_data)

    return {"items": donations, "total": len(donations)}


def get_donation_delivery_history(db: Session, user_id: int, filter: str = "all") -> dict:
    dp = get_delivery_partner_user(db, user_id)

    query = (
        db.query(Delivery)
        .filter(
            Delivery.delivery_partner_id == dp.id,
            Delivery.donation_request_id.isnot(None),
            Delivery.status == "completed"
        )
        .options(
            joinedload(Delivery.donation_request),
            joinedload(Delivery.store)
        )
    )

    if filter == "today":
        today = datetime.now().date()
        query = query.filter(Delivery.delivered_at >= today)
    elif filter == "week":
        week_ago = datetime.now() - timedelta(days=7)
        query = query.filter(Delivery.delivered_at >= week_ago)
    elif filter == "month":
        month_ago = datetime.now() - timedelta(days=30)
        query = query.filter(Delivery.delivered_at >= month_ago)

    deliveries = query.order_by(Delivery.delivered_at.desc()).all()

    donations = []
    for d in deliveries:
        donation_data = format_delivery_data(d, db)
        if donation_data:
            donations.append(donation_data)

    return {"items": donations, "total": len(donations)}


def get_donation_delivery_detail(db: Session, delivery_id: int, user_id: int) -> dict:
    dp = get_delivery_partner_user(db, user_id)

    delivery = (
        db.query(Delivery)
        .filter(
            Delivery.id == delivery_id,
            Delivery.delivery_partner_id == dp.id,
            Delivery.donation_request_id.isnot(None)
        )
        .options(
            joinedload(Delivery.donation_request),
            joinedload(Delivery.store)
        )
        .first()
    )

    if not delivery:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy đơn giao hàng quyên góp"
        )

    donation_data = format_delivery_data(delivery, db)
    if not donation_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy yêu cầu quyên góp liên quan"
        )

    return donation_data


# ========== Profile Management ==========
def get_delivery_profile(db: Session, user_id: int) -> dict:
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role != "delivery_partner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền truy cập"
        )

    dp = db.query(DeliveryPartner).filter(DeliveryPartner.user_id == user_id).first()

    return {
        "id": dp.id if dp else None,
        "user_id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "vehicle_type": dp.vehicle_type if dp else None,
        "vehicle_plate": dp.vehicle_plate if dp else None,
        "wallet_balance": float(dp.wallet_balance) if dp else 0,
        "is_active": dp.is_active if dp else False,
        "created_at": user.created_at.strftime("%Y-%m-%d %H:%M:%S") if user.created_at else None,
    }


def update_delivery_profile(db: Session, user_id: int, full_name: str, email: str, phone: str) -> dict:
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role != "delivery_partner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền truy cập"
        )

    full_name = (full_name or "").strip()
    email = (email or "").strip().lower()
    phone = (phone or "").strip()

    if not full_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Họ tên không được để trống"
        )
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email không được để trống"
        )

    existing_email = db.query(User).filter(User.email == email, User.id != user_id).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email đã được sử dụng"
        )

    if phone:
        existing_phone = db.query(User).filter(User.phone == phone, User.id != user_id).first()
        if existing_phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Số điện thoại đã được sử dụng"
            )

    user.full_name = full_name
    user.email = email
    user.phone = phone
    db.commit()

    return {"success": True}


def change_delivery_password(db: Session, user_id: int, current_password: str, new_password: str) -> dict:
    user = db.query(User).filter(User.id == user_id).first()
    if not user or user.role != "delivery_partner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền truy cập"
        )

    if len(new_password or "") < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu mới phải có ít nhất 6 ký tự"
        )

    if not verify_password(current_password or "", user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu hiện tại không đúng"
        )

    user.password_hash = get_password_hash(new_password)
    db.commit()

    return {"success": True, "message": "Đổi mật khẩu thành công"}


def top_up_wallet(db: Session, user_id: int, amount: float) -> dict:
    dp = get_delivery_partner_user(db, user_id)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Số tiền nạp phải lớn hơn 0")

    amount_decimal = Decimal(str(amount))
    if dp.wallet_balance is None:
        dp.wallet_balance = Decimal('0')
    dp.wallet_balance += amount_decimal

    # Ghi lại lịch sử
    db.add(WalletTransaction(
        entity_type='shipper',
        entity_id=dp.id,
        amount=amount_decimal,
        transaction_type='deposit',
        description="Tự nạp tiền vào ví"
    ))
    db.commit()

    return {
        "success": True, 
        "message": f"Đã nạp {amount:,.0f}đ thành công!",
        "new_balance": float(dp.wallet_balance)
    }
