import hashlib
import hmac
import urllib.parse
from datetime import datetime
from typing import Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.config.vnpay_config import (
    VNPAY_TMN_CODE,
    VNPAY_HASH_SECRET,
    VNPAY_URL,
    VNPAY_RETURN_URL,
)
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.inventory_lot import InventoryLot


def create_vnpay_payment(
    order_id: Any,  # Can be int or list of ints
    amount: float,
    order_info: str = "",
    ip_address: str = "127.0.0.1",
) -> Dict[str, Any]:
    vnp_Version = "2.1.0"
    vnp_Command = "pay"
    vnp_TmnCode = VNPAY_TMN_CODE
    vnp_Amount = int(amount * 100)  # VNPay yêu cầu amount * 100
    vnp_CurrCode = "VND"
    
    # Hỗ trợ thanh toán gộp cho nhiều đơn hàng (Multi-store)
    if isinstance(order_id, list):
        vnp_TxnRef = "MSG_" + "_".join(map(str, order_id))
        display_id = order_id[0]
    else:
        vnp_TxnRef = str(order_id)
        display_id = order_id

    vnp_OrderInfo = order_info or f"Thanh toan don hang {display_id}"
    vnp_OrderType = "other"
    vnp_Locale = "vn"
    vnp_ReturnUrl = VNPAY_RETURN_URL
    vnp_IpAddr = ip_address
    vnp_CreateDate = datetime.now().strftime("%Y%m%d%H%M%S")

    # Tạo dict params và sắp xếp theo key
    params = {
        "vnp_Version": vnp_Version,
        "vnp_Command": vnp_Command,
        "vnp_TmnCode": vnp_TmnCode,
        "vnp_Amount": vnp_Amount,
        "vnp_CurrCode": vnp_CurrCode,
        "vnp_TxnRef": vnp_TxnRef,
        "vnp_OrderInfo": vnp_OrderInfo,
        "vnp_OrderType": vnp_OrderType,
        "vnp_Locale": vnp_Locale,
        "vnp_ReturnUrl": vnp_ReturnUrl,
        "vnp_IpAddr": vnp_IpAddr,
        "vnp_CreateDate": vnp_CreateDate,
    }

    # Sắp xếp params theo key
    sorted_params = sorted(params.items())

    # Tạo query string
    query_string = urllib.parse.urlencode(sorted_params)

    # Tạo secure hash (HMAC-SHA512)
    secure_hash = hmac.new(
        VNPAY_HASH_SECRET.encode("utf-8"),
        query_string.encode("utf-8"),
        hashlib.sha512,
    ).hexdigest()

    # Thêm signature vào params
    params["vnp_SecureHash"] = secure_hash

    # Tạo URL hoàn chỉnh
    final_query = urllib.parse.urlencode(sorted(params.items()))
    payment_url = f"{VNPAY_URL}?{final_query}"

    print(f"[VNPay] Generated URL for {vnp_TxnRef}: {payment_url}")

    return {
        "payment_url": payment_url,
        "order_id": display_id,
        "txn_ref": vnp_TxnRef,
    }


def verify_vnpay_callback(params: Dict[str, str]) -> bool:
    if "vnp_SecureHash" not in params:
        return False

    received_hash = params.pop("vnp_SecureHash", None)
    # Loại bỏ vnp_SecureHashType nếu có
    params.pop("vnp_SecureHashType", None)

    # Sắp xếp params theo key
    sorted_params = sorted(params.items())
    query_string = urllib.parse.urlencode(sorted_params)

    # Tính secure hash
    computed_hash = hmac.new(
        VNPAY_HASH_SECRET.encode("utf-8"),
        query_string.encode("utf-8"),
        hashlib.sha512,
    ).hexdigest()

    return computed_hash == received_hash


def handle_vnpay_return(db: Session, params: Dict[str, str]) -> Dict[str, Any]:
    vnp_ResponseCode = params.get("vnp_ResponseCode", "")
    vnp_TxnRef = params.get("vnp_TxnRef", "")
    vnp_TransactionNo = params.get("vnp_TransactionNo", "")

    # Verify signature
    if not verify_vnpay_callback(dict(params)):
        return {
            "success": False,
            "message": "Invalid signature",
        }

    try:
        if vnp_TxnRef.startswith("MSG_"):
            order_ids = [int(x) for x in vnp_TxnRef.replace("MSG_", "").split("_")]
        else:
            order_ids = [int(vnp_TxnRef)]
    except (ValueError, TypeError):
        return {
            "success": False,
            "message": "Invalid order reference",
        }

    orders = db.query(Order).filter(Order.id.in_(order_ids)).all()
    if not orders:
        return {
            "success": False,
            "message": "Order not found",
        }

    if vnp_ResponseCode == "00":
        # Thanh toán thành công: chỉ cập nhật trạng thái cho tất cả các đơn trong nhóm
        for order in orders:
            order.payment_status = "paid"
            order.status = "preparing"
        
        db.commit()
        return {
            "success": True,
            "message": "Thanh toán thành công!",
            "order_id": order_ids[0],
            "order_code": f"DH-{order_ids[0]}",
            "transaction_no": vnp_TransactionNo,
        }



    else:
        # Thanh toán thất bại: huỷ các đơn trong nhóm + hoàn giữ chỗ kho
        for order in orders:
            order.payment_status = "pending"
            order.status = "cancelled"
            _release_reserved_for_order(db, order.id)

            # Restore coupon usage
            if order.coupon_id:
                from app.models.coupon import Coupon
                coupon = db.query(Coupon).filter(Coupon.id == order.coupon_id).with_for_update().first()
                if coupon and coupon.current_uses > 0:
                    coupon.current_uses -= 1

        db.commit()
        return {
            "success": False,
            "message": "Thanh toán thất bại. Vui lòng thử lại.",
            "order_id": order_ids[0],
            "response_code": vnp_ResponseCode,
        }



def handle_vnpay_ipn(db: Session, params: Dict[str, str]) -> Dict[str, Any]:
    vnp_ResponseCode = params.get("vnp_ResponseCode", "")
    vnp_TxnRef = params.get("vnp_TxnRef", "")
    vnp_TransactionNo = params.get("vnp_TransactionNo", "")

    # Verify signature
    if not verify_vnpay_callback(dict(params)):
        return {"RspCode": "97", "Message": "Invalid signature"}

    try:
        if vnp_TxnRef.startswith("MSG_"):
            order_ids = [int(x) for x in vnp_TxnRef.replace("MSG_", "").split("_")]
        else:
            order_ids = [int(vnp_TxnRef)]
    except (ValueError, TypeError):
        return {"RspCode": "01", "Message": "Order not found"}

    orders = db.query(Order).filter(Order.id.in_(order_ids)).all()
    if not orders:
        return {"RspCode": "01", "Message": "Order not found"}

    # Kiểm tra xem đơn đầu tiên đã paid chưa (đại diện cho cả nhóm)
    if orders[0].payment_status == "paid":
        # Đã xử lý rồi
        return {"RspCode": "02", "Message": "Order already updated"}

    if vnp_ResponseCode == "00":
        for order in orders:
            order.payment_status = "paid"
            order.status = "preparing"
        db.commit()
        return {"RspCode": "00", "Message": "Confirmed"}
    else:
        # Thanh toán thất bại: huỷ các đơn trong nhóm + hoàn giữ chỗ kho
        for order in orders:
            order.payment_status = "pending"
            order.status = "cancelled"
            _release_reserved_for_order(db, order.id)

            # Restore coupon usage
            if order.coupon_id:
                from app.models.coupon import Coupon
                coupon = db.query(Coupon).filter(Coupon.id == order.coupon_id).with_for_update().first()
                if coupon and coupon.current_uses > 0:
                    coupon.current_uses -= 1

        db.commit()
        return {"RspCode": "00", "Message": "Confirmed"}


# =======================
# STOCK HELPERS
# =======================


def _release_reserved_for_order(db: Session, order_id: int):
    item_rows = db.query(
        OrderItem.lot_id, OrderItem.quantity
    ).filter(OrderItem.order_id == order_id).all()
    for item in item_rows:
        db.query(InventoryLot).filter(
            InventoryLot.id == item.lot_id
        ).update({
            InventoryLot.qty_reserved: func.greatest(0, InventoryLot.qty_reserved - item.quantity)
        }, synchronize_session=False)
