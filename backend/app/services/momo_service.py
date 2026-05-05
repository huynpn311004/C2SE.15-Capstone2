import json
import hmac
import hashlib
import requests
from app.config.momo_config import *

def create_momo_payment(order_id: int, amount: float):
    requestId = str(order_id)
    orderId = str(order_id)

    orderInfo = f"Thanh toán đơn hàng {order_id}"
    requestType = "captureWallet"
    extraData = ""

    raw_signature = (
        f"accessKey={MOMO_ACCESS_KEY}"
        f"&amount={amount}"
        f"&extraData={extraData}"
        f"&ipnUrl={MOMO_IPN_URL}"
        f"&orderId={orderId}"
        f"&orderInfo={orderInfo}"
        f"&partnerCode={MOMO_PARTNER_CODE}"
        f"&redirectUrl={MOMO_REDIRECT_URL}"
        f"&requestId={requestId}"
        f"&requestType={requestType}"
    )

    signature = hmac.new(
        MOMO_SECRET_KEY.encode(),
        raw_signature.encode(),
        hashlib.sha256
    ).hexdigest()

    payload = {
        "partnerCode": MOMO_PARTNER_CODE,
        "accessKey": MOMO_ACCESS_KEY,
        "requestId": requestId,
        "amount": int(amount),
        "orderId": orderId,
        "orderInfo": orderInfo,
        "redirectUrl": MOMO_REDIRECT_URL,
        "ipnUrl": MOMO_IPN_URL,
        "requestType": requestType,
        "signature": signature,
        "lang": "vi"
    }

    response = requests.post(MOMO_ENDPOINT, json=payload)

    return response.json()