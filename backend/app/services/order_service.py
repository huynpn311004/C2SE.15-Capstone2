from datetime import datetime
from sqlalchemy.orm import Session
from decimal import Decimal
from typing import List, Dict, Any, Optional
from collections import defaultdict
from sqlalchemy import func

from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.inventory_lot import InventoryLot
from app.models.user import User
from app.models.product import Product
from app.models.store import Store
from app.models.supermarket import Supermarket
from app.models.delivery_partner import DeliveryPartner
from app.models.wallet_transaction import WalletTransaction
from app.services.discount_policy_service import calculate_discount
from app.services.customer_service import _validate_and_calculate_coupon, _increment_coupon_usage, restore_expired_reserved_stock



# =======================
# HELPER
# =======================
def parse_item(item):
    if isinstance(item, dict):
        return item.get("productId"), int(item.get("quantity", 0)), item.get("lotCode") or item.get("lot_code")
    return getattr(item, "productId", None), int(getattr(item, "quantity", 0)), getattr(item, "lotCode", getattr(item, "lot_code", None))


# =======================
# CREATE ORDER
# =======================
def create_customer_order(
    db: Session,
    customer_id: int,
    items: List[Any],
    store_id: int,
    payment_method: Optional[str] = None,
    shipping_address: str = "",
    shipping_phone: str = "",
    coupon_id: Optional[int] = None,
    commit: bool = True,
    allocated_discount: Decimal = Decimal("0")
) -> Dict:
    # Auto-cleanup expired reservations
    restore_expired_reserved_stock(db, timeout_minutes=3)
    
    if not coupon_id or coupon_id == "":
        coupon_id = None
    else:
        coupon_id = int(coupon_id)
    customer = db.query(User).filter(User.id == customer_id).first()
    if not customer:
        raise ValueError("Customer not found")

    try:
        total_amount = Decimal("0")
        order_items_data = []

        # ===== VALIDATE + PREPARE =====
        for item in items:
            pid, qty, lot_code = parse_item(item)

            if not pid or qty <= 0:
                continue

            product = db.query(Product).filter(Product.id == pid).first()
            if not product:
                raise ValueError(f"Product {pid} not found")

            # LẤY LOT THEO FEFO HOẶC THEO LOT_CODE CỤ THỂ
            query = db.query(InventoryLot).filter(
                InventoryLot.product_id == pid,
                InventoryLot.store_id == store_id,
                (InventoryLot.qty_on_hand - func.coalesce(InventoryLot.qty_reserved, 0)) >= qty,
                InventoryLot.expiry_date >= datetime.now().date()
            )

            if lot_code:
                query = query.filter(InventoryLot.lot_code == lot_code)
            
            lot = query.order_by(InventoryLot.expiry_date.asc()).with_for_update().first()

            if not lot:
                raise ValueError(f"Not enough stock for product {pid}")

            # TÍNH GIÁ ĐÃ GIẢM THEO CHÍNH SÁCH CẬN HẠN
            base_price = Decimal(str(product.base_price or 0))
            discount_result = calculate_discount(
                db,
                base_price=float(base_price),
                expiry_date=lot.expiry_date.strftime("%Y-%m-%d"),
                supermarket_id=product.supermarket_id,
                product_id=pid
            )
            
            price = Decimal(str(discount_result.get("finalPrice", base_price)))

            total_amount += price * qty

            order_items_data.append({
                "product_id": pid,
                "quantity": qty,
                "price": price,
                "lot": lot
            })

        # ===== CALCULATE COUPON DISCOUNT (If not pre-allocated) =====
        applied_discount_amount = allocated_discount
        if coupon_id and applied_discount_amount == 0:
            coupon_info = _validate_and_calculate_coupon(db, coupon_id, store_id, total_amount)
            if not coupon_info.get("valid"):
                raise ValueError(coupon_info.get("error", "Mã coupon không hợp lệ"))
            applied_discount_amount = coupon_info.get("discount_amount", Decimal("0"))

        if applied_discount_amount > total_amount:
            import logging
            logging.getLogger(__name__).warning(
                f"[COUPON] allocated_discount ({applied_discount_amount}) > total_amount "
                f"({total_amount}) tại store {store_id}. Clamp lại bằng total_amount."
            )
            applied_discount_amount = total_amount

        if not order_items_data:
            raise ValueError("No valid items")


        # ===== CALCULATE SHIPPING FEE =====
        shipping_fee_value = Decimal("0")
        delivery_distance_value = None
        if shipping_address:
            try:
                from app.services.shipping_service import calculate_shipping_fee_sync
                shipping_result = calculate_shipping_fee_sync(
                    db, store_id, shipping_address, float(total_amount)
                )
                if shipping_result.get("deliverable", True):
                    shipping_fee_value = Decimal(str(shipping_result.get("fee", 0) or 0))
                    delivery_distance_value = shipping_result.get("distance_km")
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(f"Shipping calc failed: {e}")

        # Tính tổng tiền cuối cùng (Hàng - Giảm giá + Ship)
        final_total = max(Decimal("0"), total_amount - applied_discount_amount) + shipping_fee_value

        order = Order(
            store_id=store_id,
            customer_id=customer_id,
            coupon_id=coupon_id,
            total_amount=final_total,
            discount_amount=applied_discount_amount,
            shipping_fee=shipping_fee_value,
            delivery_distance=delivery_distance_value,
            payment_method=payment_method,
            payment_status="pending",
            shipping_address=shipping_address,
            shipping_phone=shipping_phone,
            status="pending",
            reserved_at=datetime.now()
        )


        db.add(order)
        db.flush()

        # ===== CREATE ORDER ITEMS =====
        for data in order_items_data:
            lot = data["lot"]

            order_item = OrderItem(
                order_id=order.id,
                lot_id=lot.id,   # FIX CHÍNH Ở ĐÂY
                product_id=data["product_id"],
                quantity=data["quantity"],
                unit_price=data["price"]
            )

            db.add(order_item)

            # reserve stock
            lot.qty_reserved = (lot.qty_reserved or 0) + data["quantity"]

        if commit:
            # Chỉ increment lượt dùng coupon khi đây là đơn hàng đơn lẻ 
            # (Đơn đa cửa hàng sẽ increment một lần duy nhất ở hàm cha)
            if coupon_id and allocated_discount == 0:
                _increment_coupon_usage(db, coupon_id)
            
            # XỬ LÝ THANH TOÁN VÍ (WALLET) CHO ĐƠN LẺ
            pay_method = (payment_method or "cod").lower()
            if pay_method == "wallet":
                from app.services.wallet_service import add_transaction
                user = db.query(User).filter(User.id == customer_id).with_for_update().first()
                if not user or (user.wallet_balance or 0) < final_total:
                    db.rollback()
                    from fastapi import HTTPException
                    raise HTTPException(status_code=400, detail=f"Số dư ví không đủ (Cần {final_total:,.0f}đ)")
                
                add_transaction(
                    db, entity_type='user', entity_id=customer_id,
                    amount=final_total, transaction_type='payment',
                    description=f"Thanh toán đơn hàng DH-{order.id}",
                    reference_id=order.id, reference_type='order'
                )
                order.payment_status = "paid"
                order.status = "preparing"

            db.commit()
        else:
            db.flush()


        return {
            "orderId": order.id,
            "orderCode": f"DH-{order.id}",
            "totalAmount": float(final_total),
            "discountAmount": float(applied_discount_amount),
            "shippingFee": float(shipping_fee_value),
            "deliveryDistance": delivery_distance_value,
            "_items_data": order_items_data
        }


    except Exception as e:
        db.rollback()
        raise e


# =======================
# MULTI STORE ORDER
# =======================
def create_multi_store_order(
    db: Session,
    customer_id: int,
    items: List[Any],
    payment_method: str = "cod",
    shipping_address: str = "",
    shipping_phone: str = "",
    coupon_id: Optional[int] = None
) -> Dict:

    store_map = defaultdict(list)

    # ===== GROUP BY STORE =====
    for item in items:
        if isinstance(item, dict):
            store_id = item.get("storeId") or item.get("store_id")
        else:
            store_id = getattr(item, "storeId", getattr(item, "store_id", None))

        if store_id:
            store_map[store_id].append(item)

    if not store_map:
        raise ValueError("No valid store items")

    # ===== CALCULATE TOTAL SUB-TOTAL FOR PRO-RATA DISCOUNT =====
    total_cart_subtotal = Decimal("0")
    store_subtotals = {}
    
    for store_id, group_items in store_map.items():
        store_subtotal = Decimal("0")
        for item in group_items:
            pid, qty, lot_code = parse_item(item)
            product = db.query(Product).filter(Product.id == pid).first()
            if product:
                query = db.query(InventoryLot).filter(
                    InventoryLot.product_id == pid,
                    InventoryLot.store_id == store_id,
                    InventoryLot.expiry_date >= datetime.now().date()
                )
                if lot_code:
                    query = query.filter(InventoryLot.lot_code == lot_code)
                lot = query.order_by(InventoryLot.expiry_date.asc()).first()
                
                if lot:
                    dr = calculate_discount(
                        db,
                        base_price=float(product.base_price or 0),
                        expiry_date=lot.expiry_date.strftime("%Y-%m-%d"),
                        supermarket_id=product.supermarket_id,
                        product_id=pid
                    )
                    sale_price = Decimal(str(dr.get("finalPrice", product.base_price or 0)))
                else:
                    sale_price = Decimal(str(product.base_price or 0))
                
                store_subtotal += sale_price * qty
        store_subtotals[store_id] = store_subtotal
        total_cart_subtotal += store_subtotal

    # ===== VALIDATE COUPON FOR ENTIRE CART =====
    total_coupon_discount = Decimal("0")
    if coupon_id:
        coupon_info = _validate_and_calculate_coupon(db, coupon_id, None, total_cart_subtotal)
        if not coupon_info.get("valid"):
            raise ValueError(coupon_info.get("error", "Coupon không hợp lệ"))
        total_coupon_discount = coupon_info.get("discount_amount", Decimal("0"))

    results = []
    used_discount_amount = Decimal("0")
    
    # ===== PROCESS EACH STORE =====
    store_ids = list(store_map.keys())
    for i, store_id in enumerate(store_ids):
        group_items = store_map[store_id]
        
        # Allocate discount using pro-rata logic
        if i == len(store_ids) - 1:
            # Last store takes the remainder to avoid rounding issues
            store_allocated_discount = total_coupon_discount - used_discount_amount
        else:
            if total_cart_subtotal > 0:
                ratio = store_subtotals[store_id] / total_cart_subtotal
                store_allocated_discount = (total_coupon_discount * ratio).quantize(
                    Decimal("1"), rounding="ROUND_FLOOR"
                )
            else:
                store_allocated_discount = Decimal("0")
        
        # Ensure we don't allocate more than the store subtotal (unlikely but safe)
        store_allocated_discount = min(store_allocated_discount, store_subtotals[store_id])
        used_discount_amount += store_allocated_discount

        order = create_customer_order(
            db,
            customer_id,
            group_items,
            store_id,
            payment_method,
            shipping_address,
            shipping_phone,
            coupon_id,
            commit=False,
            allocated_discount=store_allocated_discount
        )

        # Get store name from database
        store = db.query(Store).filter(Store.id == store_id).first()
        store_name = store.name if store else f"Store {store_id}"

        # Build price map from order_items_data (giá thực tế đã tính discount)
        price_map = {d["product_id"]: float(d["price"]) for d in order["_items_data"]} if order.get("_items_data") else {}

        items_response = []
        for item in group_items:
            pid, qty, _ = parse_item(item)

            product = db.query(Product).filter(Product.id == pid).first()

            items_response.append({
                "productId": pid,
                "name": product.name if product else "",
                "quantity": qty,
                "unitPrice": price_map.get(pid, float(product.base_price) if product else 0)
            })

        results.append({
            "storeId": store_id,
            "storeName": store_name,
            "orderId": order["orderId"],
            "orderCode": order["orderCode"],
            "totalAmount": order["totalAmount"],
            "discountAmount": float(order["discountAmount"]),
            "shippingFee": order.get("shippingFee", 0),
            "deliveryDistance": order.get("deliveryDistance"),
            "items": items_response
        })

    # ===== FINALIZE =====
    if coupon_id and used_discount_amount > 0:
        _increment_coupon_usage(db, coupon_id)

    # ===== XỬ LÝ THANH TOÁN VÍ (WALLET) TẬP TRUNG =====
    pay_method = (payment_method or "cod").lower()
    if pay_method == "wallet":
        from app.services.wallet_service import add_transaction
        
        # Khóa dòng user để tránh tranh chấp số dư
        user = db.query(User).filter(User.id == customer_id).with_for_update().first()
        total_grand_amount = sum(o["totalAmount"] for o in results)
        
        if not user or (user.wallet_balance or 0) < total_grand_amount:
            db.rollback()
            from fastapi import HTTPException
            raise HTTPException(
                status_code=400, 
                detail=f"Số dư ví không đủ (Cần {total_grand_amount:,.0f}đ, hiện có {getattr(user, 'wallet_balance', 0):,.0f}đ)"
            )
        
        # Trừ tiền ví một lần cho tổng giỏ hàng
        add_transaction(
            db, entity_type='user', entity_id=customer_id,
            amount=total_grand_amount, transaction_type='payment',
            description=f"Thanh toán giỏ hàng đa cửa hàng ({len(results)} đơn hàng)",
            reference_id=None, reference_type='multi_order'
        )
        
        # Cập nhật trạng thái 'paid' và 'preparing' cho tất cả đơn vừa tạo
        order_ids = [o["orderId"] for o in results]
        db.query(Order).filter(Order.id.in_(order_ids)).update({
            Order.payment_status: "paid",
            Order.status: "preparing",
            Order.payment_method: pay_method
        }, synchronize_session=False)
    else:
        # Nếu không phải wallet (ví dụ COD), vẫn cần cập nhật đúng phương thức thanh toán
        order_ids = [o["orderId"] for o in results]
        db.query(Order).filter(Order.id.in_(order_ids)).update({
            Order.payment_method: pay_method
        }, synchronize_session=False)

    db.commit()


    total_shipping = sum(o.get("shippingFee", 0) for o in results)

    response_data = {
        "success": True,
        "message": "Đặt hàng đa cửa hàng thành công",
        "orderGroups": results,
        "totalOrders": len(results),
        "totalAmount": sum(o["totalAmount"] for o in results),
        "totalDiscount": float(total_coupon_discount),
        "totalShippingFee": total_shipping
    }

    return response_data

# =======================
# CANCEL ORDER
# =======================
def cancel_customer_order(db: Session, order_id: int, customer_id: int):
    from fastapi import HTTPException, status
    
    try:
        order = db.query(Order).filter(
            Order.id == order_id,
            Order.customer_id == customer_id
        ).first()

        if not order:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy đơn hàng")

        if order.status not in ["pending", "preparing", "ready", "shipped", "delivering"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail=f"Không thể hủy đơn hàng ở trạng thái: {order.status}"
            )

        old_status = order.status
        order.status = "cancelled"
        order.cancelled_at = datetime.now()

        # ===== HOÀN KHO (INVENTORY RESTORATION) =====
        for item in order.items:
            if item.lot_id:
                lot = db.query(InventoryLot).filter(InventoryLot.id == item.lot_id).with_for_update().first()
                if lot:
                    if old_status in ["ready", "shipped", "delivering"]:
                        # Đơn đã xuất kho -> Hoàn lại qty_on_hand
                        lot.qty_on_hand = (lot.qty_on_hand or 0) + item.quantity
                    else:
                        # Đơn chưa xuất kho -> Giảm qty_reserved
                        lot.qty_reserved = max(0, (lot.qty_reserved or 0) - item.quantity)

        # ===== HOÀN TIỀN VÍ (WALLET REFUND) =====
        # 1. Nếu đơn COD đã bị trừ tiền ví (ở trạng thái shipped/delivering)
        if order.payment_method == "cod" and old_status in ["shipped", "delivering"]:
            # ... (giữ nguyên logic COD hiện có)
            from app.models.delivery import Delivery
            delivery = db.query(Delivery).filter(Delivery.order_id == order.id).first()
            if delivery:
                delivery.status = "cancelled"
                dp = db.query(DeliveryPartner).filter(DeliveryPartner.id == delivery.delivery_partner_id).first()
                store = db.query(Store).filter(Store.id == order.store_id).first()
                supermarket = db.query(Supermarket).filter(Supermarket.id == store.supermarket_id).first() if store else None

                if dp and supermarket:
                    ship_fee = Decimal(str(order.shipping_fee or 0))
                    order_amount = Decimal(str(order.total_amount or 0))
                    platform_profit = ship_fee * Decimal('0.2')
                    # Shipper được hoàn lại đúng số tiền đã bị trừ (Hàng + 20% Ship)
                    # Hoặc = Total - 80% Ship
                    refund_amount = order_amount - (ship_fee * Decimal('0.8'))
                    product_amount = order_amount - ship_fee

                    from app.services import wallet_service
                    # Hoàn tiền cho Shipper (Tiền hàng + 20% Ship)
                    wallet_service.add_transaction(
                        db, entity_type='shipper', entity_id=dp.id, amount=refund_amount,
                        transaction_type='refund', reference_id=order.id, reference_type='order',
                        description=f"Hoàn tiền đơn COD #{order.id} do đơn bị hủy"
                    )

                    # Trừ lại tiền của Siêu thị (Chỉ trừ tiền hàng)
                    # Lưu ý: Dùng transaction_type='withdrawal' để thực hiện phép trừ trong wallet_service
                    wallet_service.add_transaction(
                        db, entity_type='supermarket', entity_id=supermarket.id, amount=product_amount,
                        transaction_type='withdrawal', reference_id=order.id, reference_type='order',
                        description=f"Khấu trừ tiền hàng đơn COD #{order.id} do đơn bị hủy"
                    )

        # 2. MỚI: Nếu đơn VNPay hoặc Ví đã thanh toán (payment_status == 'paid') -> Hoàn tiền vào ví Customer
        elif (order.payment_method or "").lower() in ["vnpay", "wallet"] and order.payment_status == "paid":
            from app.services.wallet_service import add_transaction
            refund_amount = Decimal(str(order.total_amount or 0))
            
            if refund_amount > 0:
                add_transaction(
                    db, 
                    entity_type='user', 
                    entity_id=customer_id, 
                    amount=refund_amount,
                    transaction_type='refund',
                    reference_id=order.id,
                    reference_type='order',
                    description=f"Hoàn tiền đơn hàng #{order.id} vào ví do đơn bị hủy (PTTT: {order.payment_method.upper()})"
                )

        # ===== RESTORE COUPON USAGE =====
        if order.coupon_id:
            from app.models.coupon import Coupon
            coupon = db.query(Coupon).filter(Coupon.id == order.coupon_id).with_for_update().first()
            if coupon and coupon.current_uses > 0:
                coupon.current_uses -= 1

        db.commit()

        return {"success": True, "message": "Hủy đơn hàng thành công"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Lỗi hệ thống: {str(e)}")


# =======================
# VNPAY PAYMENT
# =======================
def initiate_vnpay_payment(db: Session, data, ip_address: str = "127.0.0.1") -> Dict:
    from app.services.vnpay_service import create_vnpay_payment
    from app.schemas.payment_schemas import PaymentResponse

    # Hỗ trợ cả single order (int) và multi-store order (list)
    order_ids = data.order_id if isinstance(data.order_id, list) else [data.order_id]
    
    orders = db.query(Order).filter(Order.id.in_(order_ids)).all()
    if not orders:
        raise ValueError("Order not found")

    total_payment_amount = Decimal("0")
    for order in orders:
        # Cập nhật payment_method nếu chưa đúng
        if order.payment_method != "vnpay":
            order.payment_method = "vnpay"
        total_payment_amount += Decimal(str(order.total_amount or 0))
    
    db.commit()

    result = create_vnpay_payment(
        order_id=data.order_id,
        amount=float(total_payment_amount),
        order_info=f"Thanh toan don hang {'_'.join(map(str, order_ids)) if isinstance(data.order_id, list) else data.order_id}",
        ip_address=ip_address,
    )

    return PaymentResponse(
        payment_url=result["payment_url"],
        order_id=order_ids[0], # Return lead order ID
    )


def handle_vnpay_ipn_handler(db: Session, params: dict) -> Dict:
    from app.services.vnpay_service import handle_vnpay_ipn
    return handle_vnpay_ipn(db, params)


def handle_vnpay_return_handler(db: Session, params: dict) -> Dict:
    from app.services.vnpay_service import handle_vnpay_return
    return handle_vnpay_return(db, params)