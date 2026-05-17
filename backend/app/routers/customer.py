from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi import status as http_status
from sqlalchemy.orm import Session
from app.schemas.payment_schemas import PaymentRequest
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.customer_schemas import (
	CustomerProfileResponse,
	UpdateProfileRequest,
	ChangePasswordRequest,
	ProductListResponse,
	ProductDetailResponse,
	NearExpiryProductListResponse,
	CategoryListResponse,
	SupermarketListResponse,
	StoreListResponse,
	OrderListResponse,
	OrderDetailResponse,
	CreateOrderRequest,
	CreateOrderResponse,
	CreateMultiStoreOrderResponse,
	CancelOrderResponse,
	DashboardSummaryResponse,
	SuccessResponse,
	ValidateCartRequest,
	ValidateCartResponse,
	CouponListResponse,
	EstimateShippingRequest,
	EstimateShippingResponse,
	WalletDepositRequest,
	WalletDepositResponse,
	ConfirmPaymentRequest,
)
from app.services.customer_service import (
	get_customer_profile,
	update_customer_profile,
	change_customer_password,
	list_customer_products,
	get_customer_product_detail,
	list_near_expiry_products,
	list_customer_categories,
	list_customer_supermarkets,
	list_customer_stores,
	list_customer_orders,
	get_customer_order_detail,
	customer_dashboard_summary,
	confirm_customer_order,
	deposit_money,
)

from app.services.order_service import create_customer_order, create_multi_store_order, cancel_customer_order

router = APIRouter(prefix="/customer", tags=["customer"])


# ========== Profile Endpoints ==========

@router.get("/profile", response_model=CustomerProfileResponse)
def get_profile(
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
	return get_customer_profile(db, current_user.id)


@router.put("/profile", response_model=SuccessResponse)
def update_profile(
	data: UpdateProfileRequest,
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
	return update_customer_profile(
		db,
		current_user.id,
		data.fullName,
		data.email,
		data.phone or "",
		data.address or ""
	)

@router.post("/change-password", response_model=SuccessResponse)
def change_password(
	data: ChangePasswordRequest,
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
	return change_customer_password(
		db,
		current_user.id,
		data.currentPassword,
		data.newPassword
	)


@router.post("/wallet/deposit", response_model=WalletDepositResponse)
def deposit_to_wallet(
	data: WalletDepositRequest,
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
	"""Endpoint nạp tiền giả lập vào ví (Dành cho dự án tốt nghiệp)"""
	return deposit_money(db, current_user.id, data.amount)


@router.get("/wallet/history")
def get_wallet_history_endpoint(
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
	limit: int = 50
):
	"""Lấy lịch sử giao dịch ví của khách hàng."""
	from app.services import wallet_service
	return wallet_service.get_wallet_history(db, "user", current_user.id, limit)


# ========== Product Endpoints ==========

@router.get("/products", response_model=ProductListResponse)
def list_products(
	supermarket_id: int = Query(default=None),
	store_id: int = Query(default=None),
	category_id: int = Query(default=None),
	search: str = Query(default=None),
	latitude: float = Query(default=None),
	longitude: float = Query(default=None),
	sort_price: str = Query(default=None, description="'asc' for low to high, 'desc' for high to low"),
	db: Session = Depends(get_db),
):
	return list_customer_products(db, supermarket_id, store_id, category_id, search, latitude, longitude, sort_price=sort_price)


@router.get("/products/{product_id}", response_model=ProductDetailResponse)
def get_product_detail(
	product_id: int,
	db: Session = Depends(get_db),
):
	return get_customer_product_detail(db, product_id)


@router.get("/near-expiry-products", response_model=NearExpiryProductListResponse)
def list_near_expiry(
	supermarket_id: int = Query(default=None),
	max_days: int = Query(default=7),
	db: Session = Depends(get_db),
):
	return list_near_expiry_products(db, supermarket_id, max_days)


# ========== Category & Supermarket Endpoints ==========

@router.get("/categories", response_model=CategoryListResponse)
def list_categories(
	supermarket_id: int = Query(default=None),
	db: Session = Depends(get_db),
):
	return list_customer_categories(db, supermarket_id)


@router.get("/supermarkets", response_model=SupermarketListResponse)
def list_supermarkets(
	db: Session = Depends(get_db),
):
	return list_customer_supermarkets(db)


@router.get("/stores", response_model=StoreListResponse)
def list_stores(
	latitude: float = Query(default=None),
	longitude: float = Query(default=None),
	db: Session = Depends(get_db),
):
	return list_customer_stores(db, latitude, longitude)


# ========== Order Endpoints ==========

@router.get("/orders", response_model=OrderListResponse)
def list_orders(
	status_filter: str = Query(default="all"),
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
	return list_customer_orders(db, current_user.id, status_filter)


@router.get("/orders/{order_id}", response_model=OrderDetailResponse)
def get_order_detail(
	order_id: int,
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
	return get_customer_order_detail(db, order_id, current_user.id)


@router.post("/orders", response_model=CreateOrderResponse)
def create_order(
	data: CreateOrderRequest,
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
	# Validate storeId is required for single order creation
	if not data.storeId:
		raise HTTPException(status_code=http_status.HTTP_400_BAD_REQUEST, detail="storeId is required for single order")
	return create_customer_order(
		db,
		current_user.id,
		data.items,
		data.storeId,
		data.paymentMethod or 'cod',
		data.shippingAddress or '',
		data.shippingPhone or '',
		data.couponId
	)


@router.post("/orders/multi-store", response_model=CreateMultiStoreOrderResponse)
def create_multi_store(
	data: CreateOrderRequest,
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
	"""
	Create multiple orders from cart - one order per store.
	Each item in the cart should have storeId attribute.
	"""
	return create_multi_store_order(
		db,
		current_user.id,
		data.items,
		data.paymentMethod,
		data.shippingAddress or '',
		data.shippingPhone or '',
		data.couponId
	)


@router.put("/orders/{order_id}/cancel", response_model=CancelOrderResponse)
def cancel_order(
	order_id: int,
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
	return cancel_customer_order(db, order_id, current_user.id)


@router.put("/orders/{order_id}/confirm-payment", response_model=SuccessResponse)
def confirm_payment(
	order_id: int,
	data: ConfirmPaymentRequest = ConfirmPaymentRequest(),
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
	"""Confirm order payment - convert reserved stock to confirmed deduction"""
	return confirm_customer_order(db, order_id, current_user.id, data.paymentMethod)



# ========== Dashboard Endpoints ==========

@router.get("/dashboard-summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
	return customer_dashboard_summary(db, current_user.id)


# ========== Cart Validation Endpoints ==========

@router.post("/cart/validate", response_model=ValidateCartResponse)
def validate_cart_items(
	data: ValidateCartRequest,
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
	"""
	Validate cart items before adding to cart or checkout.
	Checks real-time stock availability using pessimistic locking.
	Returns availability status for each item.
	"""
	from app.services.customer_service import validate_cart_stock

	return validate_cart_stock(db, data.items, current_user.id)


# ========== Coupon Endpoints ==========

@router.get("/coupons", response_model=CouponListResponse)
def list_available_coupons(
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
	"""
	Get all available coupons for the customer.
	Returns coupons that are active, not expired, and have remaining uses.
	"""
	from app.services.customer_service import list_available_coupons

	return list_available_coupons(db)


# ========== Shipping Estimation Endpoints ==========

@router.post("/estimate-shipping", response_model=EstimateShippingResponse)
async def estimate_shipping(
	data: EstimateShippingRequest,
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
	"""
	Ước tính phí vận chuyển từ cửa hàng đến địa chỉ khách hàng.
	Sử dụng geocoding để tính khoảng cách và áp dụng bảng phí theo bậc.
	"""
	from app.services.shipping_service import estimate_shipping_for_store

	result = await estimate_shipping_for_store(
		db,
		store_id=data.storeId,
		address=data.address,
		order_amount=data.orderAmount or 0,
	)

	return EstimateShippingResponse(
		fee=result.get("fee"),
		originalFee=result.get("original_fee"),
		distanceKm=result.get("distance_km", 0),
		zone=result.get("zone", "blocked"),
		deliverable=result.get("deliverable", False),
		freeShipping=result.get("free_shipping", False),
		freeShippingThreshold=result.get("free_shipping_threshold"),
		message=result.get("message", ""),
		storeId=result.get("store_id"),
		storeName=result.get("store_name"),
	)
