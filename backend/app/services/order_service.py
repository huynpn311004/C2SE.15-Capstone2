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
from app.services.discount_policy_service import calculate_discount
from app.services.customer_service import _validate_and_calculate_coupon, _increment_coupon_usage, restore_expired_reserved_stock



# =======================
# HELPER
# =======================
def parse_item(item):
    if isinstance(item, dict):
        return item.get("productId"), int(item.get("quantity", 0))
    return getattr(item, "productId", None), int(getattr(item, "quantity", 0))


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
            pid, qty = parse_item(item)

            if not pid or qty <= 0:
                continue

            product = db.query(Product).filter(Product.id == pid).first()
            if not product:
                raise ValueError(f"Product {pid} not found")

            # LẤY LOT THEO FEFO (Sắp hết hạn lấy trước)
            lot = (
                db.query(InventoryLot)
                .filter(
                    InventoryLot.product_id == pid,
                    InventoryLot.store_id == store_id,
                    (InventoryLot.qty_on_hand - func.coalesce(InventoryLot.qty_reserved, 0)) >= qty,
                    InventoryLot.expiry_date >= datetime.now().date() # Chỉ lấy hàng chưa hết hạn
                )
                .order_by(InventoryLot.expiry_date.asc())
                .with_for_update()
                .first()
            )

            if not lot:
                raise ValueError(f"Not enough stock for product {pid}")

            # TÍNH GIÁ ĐÃ GIẢM THEO CHÍNH SÁCH CẬN HẠN
            base_price = float(product.base_price or 0)
            discount_result = calculate_discount(
                db,
                base_price=base_price,
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
            if coupon_info.get("valid"):
                applied_discount_amount = coupon_info.get("discount_amount", Decimal("0"))

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
            db.commit()
        else:
            db.flush()


        return {
            "orderId": order.id,
            "orderCode": f"SEIMS-{order.id:06d}",
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
            pid, qty = parse_item(item)
            product = db.query(Product.base_price).filter(Product.id == pid).first()
            if product:
                store_subtotal += Decimal(str(product.base_price or 0)) * qty
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
                store_allocated_discount = (total_coupon_discount * ratio).quantize(Decimal("0"))
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
            pid, qty = parse_item(item)

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


    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise e

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

        if order.status not in ["pending", "preparing", "ready"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail=f"Không thể hủy đơn hàng ở trạng thái: {order.status}"
            )

        old_status = order.status
        order.status = "cancelled"
        order.payment_status = "pending"
        order.cancelled_at = datetime.now()

        for item in items:
            lot = db.query(InventoryLot).filter(InventoryLot.id == item.lot_id).first()
            if lot:
                if old_status == "ready":
                    # Nếu đơn đã ở trạng thái ready (đã trừ on_hand), khi hủy phải cộng lại
                    lot.qty_on_hand = (lot.qty_on_hand or 0) + item.quantity
                else:
                    # Nếu đơn đang pending/preparing, chỉ cần giảm qty_reserved
                    lot.qty_reserved = max(0, (lot.qty_reserved or 0) - item.quantity)

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

    order = db.query(Order).filter(Order.id == data.order_id).first()
    if not order:
        raise ValueError("Order not found")

    # Cập nhật payment_method nếu order được tạo từ cart với default cod
    if order.payment_method != "vnpay":
        order.payment_method = "vnpay"
        db.commit()

    result = create_vnpay_payment(
        order_id=data.order_id,
        amount=float(order.total_amount),
        order_info=f"Thanh toan don hang {data.order_id}",
        ip_address=ip_address,
    )

    return PaymentResponse(
        payment_url=result["payment_url"],
        order_id=data.order_id,
    )


def handle_vnpay_ipn_handler(db: Session, params: dict) -> Dict:
    from app.services.vnpay_service import handle_vnpay_ipn
    return handle_vnpay_ipn(db, params)


def handle_vnpay_return_handler(db: Session, params: dict) -> Dict:
    from app.services.vnpay_service import handle_vnpay_return
    return handle_vnpay_return(db, params)