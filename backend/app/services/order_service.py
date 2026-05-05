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
    payment_method: str = "cod",
    shipping_address: str = "",
    shipping_phone: str = "",
    coupon_id: Optional[int] = None,
) -> Dict:
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

            #LẤY LOT TRƯỚC
            lot = (
            db.query(InventoryLot)
            .filter(
            InventoryLot.product_id == pid,
            InventoryLot.store_id == store_id,
            (InventoryLot.qty_on_hand - func.coalesce(InventoryLot.qty_reserved, 0)) >= qty, )
            .with_for_update()
            .first()
)

            if not lot:
                raise ValueError(f"Not enough stock for product {pid}")

            price = Decimal(str(product.base_price or 0))

            total_amount += price * qty

            order_items_data.append({
                "product_id": pid,
                "quantity": qty,
                "price": price,
                "lot": lot
            })

        if not order_items_data:
            raise ValueError("No valid items")

        # ===== CREATE ORDER =====
        order = Order(
            store_id=store_id,
            customer_id=customer_id,
            coupon_id=coupon_id,
            total_amount=total_amount,
            payment_method=payment_method,
            payment_status="paid" if payment_method == "cod" else "pending",
            shipping_address=shipping_address,
            shipping_phone=shipping_phone,
            status="pending"
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

        db.commit()

        return {
            "orderId": order.id,
            "orderCode": f"SEIMS-{order.id:06d}",
            "totalAmount": float(total_amount)
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

    results = []

    # ===== PROCESS EACH STORE =====
    for store_id, group_items in store_map.items():

        order = create_customer_order(
            db,
            customer_id,
            group_items,
            store_id,
            payment_method,
            shipping_address,
            shipping_phone,
            coupon_id
        )

        #  KHÔNG QUERY LẠI DB NỮA
        items_response = []

        for item in group_items:
            pid, qty = parse_item(item)

            product = db.query(Product).filter(Product.id == pid).first()

            items_response.append({
                "productId": pid,
                "name": product.name if product else "",
                "quantity": qty,
                "unitPrice": float(product.base_price) if product else 0
            })

        results.append({
            "storeId": store_id,
            "storeName": f"Store {store_id}",
            "orderId": order["orderId"],
            "orderCode": order["orderCode"],
            "totalAmount": order["totalAmount"],
            "items": items_response
        })

    return {
        "success": True,
        "message": "Create multi-store order successfully",
        "orderGroups": results,
        "totalOrders": len(results),
        "totalAmount": sum(o["totalAmount"] for o in results)
    }

# =======================
# CONFIRM ORDER
# =======================
def confirm_customer_order(db: Session, order_id: int, customer_id: int):

    order = db.query(Order).filter(
        Order.id == order_id,
        Order.customer_id == customer_id
    ).first()

    if not order:
        raise ValueError("Order not found")

    if order.status != "pending":
        return {
            "success": False,
            "message": f"Order cannot confirm because status is {order.status}"
        }

    order.status = "preparing"
    order.payment_status = "paid"

    db.commit()

    return {"success": True}

# =======================
# CANCEL ORDER
# =======================
def cancel_customer_order(db: Session, order_id: int, customer_id: int):

    order = db.query(Order).filter(
        Order.id == order_id,
        Order.customer_id == customer_id,
        Order.status.in_(["pending", "preparing"])
    ).first()

    if not order:
        raise ValueError("Order cannot be cancelled")

    order.status = "cancelled"
    order.payment_status = "failed"

    items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()

    for item in items:
        lot = db.query(InventoryLot).filter(
            InventoryLot.id == item.lot_id
        ).first()

        if lot:
            lot.qty_reserved = max(0, (lot.qty_reserved or 0) - item.quantity)

    db.commit()

    return {"success": True}