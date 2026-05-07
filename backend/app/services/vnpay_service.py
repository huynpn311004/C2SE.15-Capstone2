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
    order_id: int,
    amount: float,
    order_info: str = "",
    ip_address: str = "127.0.0.1",
) -> Dict[str, Any]:
    """
    Tạo URL thanh toán VNPay.

    Args:
        order_id: ID đơn hàng
        amount: Số tiền (VND)
        order_info: Mô tả đơn hàng
        ip_address: IP của khách hàng

    Returns:
        Dict chứa payment_url
    """
    vnp_Version = "2.1.0"
    vnp_Command = "pay"
    vnp_TmnCode = VNPAY_TMN_CODE
    vnp_Amount = int(amount * 100)  # VNPay yêu cầu amount * 100
    vnp_CurrCode = "VND"
    vnp_TxnRef = str(order_id)
    vnp_OrderInfo = order_info or f"Thanh toan don hang {order_id}"
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

    print(f"[VNPay] Generated URL: {payment_url}")

    return {
        "payment_url": payment_url,
        "order_id": order_id,
        "txn_ref": vnp_TxnRef,
    }


def verify_vnpay_callback(params: Dict[str, str]) -> bool:
    """
    Xác thực callback từ VNPay bằng cách kiểm tra chữ ký.

    Args:
        params: Dict các tham số VNPay trả về

    Returns:
        True nếu chữ ký hợp lệ
    """
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
    """
    Xử lý callback return URL từ VNPay.

    Args:
        db: Database session
        params: Query params từ VNPay redirect

    Returns:
        Dict kết quả
    """
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
        order_id = int(vnp_TxnRef)
    except (ValueError, TypeError):
        return {
            "success": False,
            "message": "Invalid order reference",
        }

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        return {
            "success": False,
            "message": "Order not found",
        }

    if vnp_ResponseCode == "00":
        # Thanh toán thành công: trạng thái + trừ kho
        order.payment_status = "paid"
        order.status = "preparing"
        _deduct_stock_for_order(db, order_id)
        db.commit()
        return {
            "success": True,
            "message": "Thanh toán thành công! Đơn hàng đang được chuẩn bị.",
            "order_id": order_id,
            "transaction_no": vnp_TransactionNo,
        }
    else:
        # Thanh toán thất bại: trạng thái + hoàn giữ chỗ
        order.payment_status = "failed"
        order.status = "cancelled"
        _release_reserved_for_order(db, order_id)
        db.commit()
        return {
            "success": False,
            "message": "Thanh toán thất bại. Vui lòng thử lại.",
            "order_id": order_id,
            "response_code": vnp_ResponseCode,
        }


def handle_vnpay_ipn(db: Session, params: Dict[str, str]) -> Dict[str, Any]:
    """
    Xử lý IPN (Instant Payment Notification) từ VNPay.

    Args:
        db: Database session
        params: IPN params từ VNPay

    Returns:
        Dict kết quả trả về cho VNPay
    """
    vnp_ResponseCode = params.get("vnp_ResponseCode", "")
    vnp_TxnRef = params.get("vnp_TxnRef", "")
    vnp_TransactionNo = params.get("vnp_TransactionNo", "")

    # Verify signature
    if not verify_vnpay_callback(dict(params)):
        return {"RspCode": "97", "Message": "Invalid signature"}

    try:
        order_id = int(vnp_TxnRef)
    except (ValueError, TypeError):
        return {"RspCode": "01", "Message": "Order not found"}

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        return {"RspCode": "01", "Message": "Order not found"}

    if order.payment_status == "paid":
        # Đã xử lý rồi
        return {"RspCode": "02", "Message": "Order already updated"}

    if vnp_ResponseCode == "00":
        order.payment_status = "paid"
        order.status = "preparing"
        _deduct_stock_for_order(db, order_id)
        db.commit()
        return {"RspCode": "00", "Message": "Confirmed"}
    else:
        order.payment_status = "failed"
        order.status = "cancelled"
        _release_reserved_for_order(db, order_id)
        db.commit()
        return {"RspCode": "00", "Message": "Confirmed"}


# =======================
# STOCK HELPERS
# =======================
def _deduct_stock_for_order(db: Session, order_id: int):
    """Chuyển từ giữ chỗ sang trừ kho thực tế."""
    item_rows = db.query(
        OrderItem.lot_id, OrderItem.quantity
    ).filter(OrderItem.order_id == order_id).all()
    for item in item_rows:
        db.query(InventoryLot).filter(
            InventoryLot.id == item.lot_id
        ).update({
            InventoryLot.qty_reserved: func.greatest(0, InventoryLot.qty_reserved - item.quantity),
            InventoryLot.qty_on_hand: func.greatest(0, InventoryLot.qty_on_hand - item.quantity)
        }, synchronize_session=False)


def _release_reserved_for_order(db: Session, order_id: int):
    """Hoàn trả giữ chỗ khi hủy/thất bại."""
    item_rows = db.query(
        OrderItem.lot_id, OrderItem.quantity
    ).filter(OrderItem.order_id == order_id).all()
    for item in item_rows:
        db.query(InventoryLot).filter(
            InventoryLot.id == item.lot_id
        ).update({
            InventoryLot.qty_reserved: func.greatest(0, InventoryLot.qty_reserved - item.quantity)
        }, synchronize_session=False)
