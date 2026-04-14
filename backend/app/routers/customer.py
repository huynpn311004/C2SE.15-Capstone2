from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.customer_schemas import (
	CustomerProfileResponse,
	UpdateProfileRequest,
	ChangePasswordRequest,
	ProductListResponse,
	ProductDetailResponse,
	NearExpiryProductListResponse,
	CategoryListResponse,
	SupermarketListResponse,
	OrderListResponse,
	OrderDetailResponse,
	CreateOrderRequest,
	CreateOrderResponse,
	CancelOrderResponse,
	DashboardSummaryResponse,
	SuccessResponse,
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
	list_customer_orders,
	get_customer_order_detail,
	create_customer_order,
	cancel_customer_order,
	customer_dashboard_summary,
)

router = APIRouter(prefix="/customer", tags=["customer"])


# ========== Profile Endpoints ==========

@router.get("/profile", response_model=CustomerProfileResponse)
def get_profile(
	user_id: int = Query(..., ge=1),
	db: Session = Depends(get_db),
):
	return get_customer_profile(db, user_id)


@router.put("/profile", response_model=SuccessResponse)
def update_profile(
	data: UpdateProfileRequest,
	user_id: int = Query(..., ge=1),
	db: Session = Depends(get_db),
):
	return update_customer_profile(
		db,
		user_id,
		data.fullName,
		data.email,
		data.phone or ""
	)


@router.post("/change-password", response_model=SuccessResponse)
def change_password(
	data: ChangePasswordRequest,
	user_id: int = Query(..., ge=1),
	db: Session = Depends(get_db),
):
	return change_customer_password(
		db,
		user_id,
		data.currentPassword,
		data.newPassword
	)


# ========== Product Endpoints ==========

@router.get("/products", response_model=ProductListResponse)
def list_products(
	supermarket_id: int = Query(default=None),
	category_id: int = Query(default=None),
	search: str = Query(default=None),
	db: Session = Depends(get_db),
):
	return list_customer_products(db, supermarket_id, category_id, search)


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


# ========== Order Endpoints ==========

@router.get("/orders", response_model=OrderListResponse)
def list_orders(
	user_id: int = Query(..., ge=1),
	status_filter: str = Query(default="all"),
	db: Session = Depends(get_db),
):
	return list_customer_orders(db, user_id, status_filter)


@router.get("/orders/{order_id}", response_model=OrderDetailResponse)
def get_order_detail(
	order_id: int,
	user_id: int = Query(..., ge=1),
	db: Session = Depends(get_db),
):
	return get_customer_order_detail(db, order_id, user_id)


@router.post("/orders", response_model=CreateOrderResponse)
def create_order(
	data: CreateOrderRequest,
	user_id: int = Query(..., ge=1),
	db: Session = Depends(get_db),
):
	return create_customer_order(
		db,
		user_id,
		data.items,
		data.storeId,
		data.paymentMethod,
		data.shippingAddress
	)


@router.put("/orders/{order_id}/cancel", response_model=CancelOrderResponse)
def cancel_order(
	order_id: int,
	user_id: int = Query(..., ge=1),
	db: Session = Depends(get_db),
):
	return cancel_customer_order(db, order_id, user_id)


# ========== Dashboard Endpoints ==========

@router.get("/dashboard-summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
	user_id: int = Query(..., ge=1),
	db: Session = Depends(get_db),
):
	return customer_dashboard_summary(db, user_id)
