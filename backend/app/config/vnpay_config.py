import os

VNPAY_TMN_CODE = os.getenv("VNP_TMNCODE", "YOUR_TMN_CODE")
VNPAY_HASH_SECRET = os.getenv("VNP_HASH_SECRET", "YOUR_HASH_SECRET")
VNPAY_URL = os.getenv("VNP_URL", "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html")
VNPAY_RETURN_URL = os.getenv("VNP_RETURN_URL", "http://localhost:5173/payment/vnpay/return")
VNPAY_IPN_URL = os.getenv("VNP_IPN_URL", "http://localhost:8000/api/payment/vnpay/ipn")
VNPAY_API_URL = os.getenv("VNPAY_API_URL", "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction")
