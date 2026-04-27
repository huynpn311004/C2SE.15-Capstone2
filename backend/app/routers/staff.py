"""Staff router with clean endpoint handlers."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Query, UploadFile, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.staff_schemas import (
    StaffProfileResponse,
    UpdateStaffProfileRequest,
    ChangePasswordRequest,
    OrdersListResponse,
    UpdateOrderStatusRequest,
    OrderDetailResponse,
    NotificationsListResponse,
    CategoriesListResponse,
    CategoryStatsResponse,
    CreateCategoryRequest,
    UpdateCategoryRequest,
    ProductsListResponse,
    CreateProductRequest,
    UpdateProductRequest,
    ProductCategoriesListResponse,
    DashboardSummaryResponse,
    InventoryLotsListResponse,
    CreateInventoryLotRequest,
    UpdateInventoryLotRequest,
    ImportInventoryLotsResponse,
    ImportProductsResponse,
    UploadImageResponse,
    CreateBulkDonationOffersRequest,
    UpdateDonationRequestStatusRequest,
)
from app.services import staff_service

router = APIRouter(prefix="/staff", tags=["staff"])


# ========== Profile Management ==========
@router.get("/profile", response_model=StaffProfileResponse)
def get_staff_profile(
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
    return staff_service.get_staff_profile(db, current_user.id)


@router.put("/profile", response_model=StaffProfileResponse)
def update_staff_profile(
    data: UpdateStaffProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return staff_service.update_staff_profile(
        db, current_user.id,
        data.fullName,
        data.email,
        data.phone
    )


@router.post("/change-password")
def change_staff_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return staff_service.change_staff_password(
        db, current_user.id,
        data.currentPassword,
        data.newPassword
    )


# ========== Orders Management ==========
@router.get("/orders", response_model=OrdersListResponse)
def list_staff_orders(
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
    scope = staff_service._get_staff_scope(db, current_user.id)
    return staff_service.list_staff_orders(db, scope["store_id"])


@router.put("/orders/{order_id}/status")
def update_staff_order_status(
    order_id: int,
    data: UpdateOrderStatusRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    scope = staff_service._get_staff_scope(db, current_user.id)
    return staff_service.update_staff_order_status(
        db, order_id, scope["store_id"], data.status,
        user_id=current_user.id
    )


@router.get("/orders/{order_id}", response_model=OrderDetailResponse)
def get_staff_order_detail(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    scope = staff_service._get_staff_scope(db, current_user.id)
    return staff_service.get_staff_order_detail(db, order_id, scope["store_id"])


# ========== Notifications ==========
@router.get("/notifications", response_model=NotificationsListResponse)
def list_staff_notifications(
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
    return staff_service.list_staff_notifications(db, current_user.id)


@router.put("/notifications/{notification_id}/read")
def mark_notification_as_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return staff_service.mark_notification_as_read(db, notification_id, current_user.id)


# ========== Categories ==========
@router.get("/category-stats", response_model=CategoryStatsResponse)
def staff_category_stats(
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
    scope = staff_service._get_staff_scope(db, current_user.id)
    return staff_service.staff_category_stats(db, scope["store_id"])


@router.get("/categories", response_model=CategoriesListResponse)
def list_categories(
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
    scope = staff_service._get_staff_scope(db, current_user.id)
    return staff_service.list_categories(db, scope["supermarket_id"])


@router.post("/categories")
def create_category(
    data: CreateCategoryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    scope = staff_service._get_staff_scope(db, current_user.id)
    return staff_service.create_category(
        db,
        data.name,
        user_id=current_user.id,
        store_id=scope["store_id"]
    )


@router.put("/categories/{category_id}")
def update_category(
    category_id: int,
    data: UpdateCategoryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    scope = staff_service._get_staff_scope(db, current_user.id)
    return staff_service.update_category(
        db, category_id, data.name,
        user_id=current_user.id,
        store_id=scope["store_id"]
    )


@router.delete("/categories/{category_id}")
def delete_category(
    category_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    scope = staff_service._get_staff_scope(db, current_user.id)
    return staff_service.delete_category(
        db, category_id,
        user_id=current_user.id,
        store_id=scope["store_id"]
    )


# ========== Products (delegated to product_service) ==========
@router.get("/products", response_model=ProductsListResponse)
def list_products(
	current_user: User = Depends(get_current_user),
	category_filter: int = Query(default=None),
	search: str = Query(default=None),
	db: Session = Depends(get_db),
):
	from app.services import product_service
	scope = staff_service._get_staff_scope(db, current_user.id)
	return product_service.list_products(db, scope["supermarket_id"], category_filter, search)


@router.post("/products")
def create_product(
	data: CreateProductRequest,
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
	from app.services import product_service
	scope = staff_service._get_staff_scope(db, current_user.id)
	return product_service.create_product(
		db,
		scope["supermarket_id"],
		scope["store_id"],
		current_user.id,
		data.name,
		data.sku,
		data.basePrice,
		data.categoryId,
		data.imageUrl,
	)


@router.put("/products/{product_id}")
def update_product(
	product_id: int,
	data: UpdateProductRequest,
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
	from app.services import product_service
	scope = staff_service._get_staff_scope(db, current_user.id)
	return product_service.update_product(
		db, product_id, scope["supermarket_id"],
		scope["store_id"],
		current_user.id,
		data.name,
		data.basePrice,
		data.categoryId,
		data.imageUrl,
	)


@router.delete("/products/{product_id}")
def delete_product(
	product_id: int,
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
	from app.services import product_service
	scope = staff_service._get_staff_scope(db, current_user.id)
	return product_service.delete_product(
		db, product_id, scope["supermarket_id"],
		scope["store_id"],
		current_user.id,
	)


@router.get("/products/categories", response_model=ProductCategoriesListResponse)
def list_product_categories(
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
	from app.services import product_service
	scope = staff_service._get_staff_scope(db, current_user.id)
	return product_service.list_product_categories(db, scope["supermarket_id"])


# ========== Dashboard ==========
@router.get("/dashboard-summary", response_model=DashboardSummaryResponse)
def staff_dashboard_summary(
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
    scope = staff_service._get_staff_scope(db, current_user.id)
    return staff_service.staff_dashboard_summary(db, scope["store_id"])


# ========== Donation Offers ==========
@router.get("/donation-offers")
def list_staff_donation_offers(
	status_filter: str = Query(default="all"),
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
    return staff_service.list_staff_donation_offers(db, current_user.id, status_filter)


@router.post("/donation-offers")
def create_staff_donation_offer(
	lot_id: int = Query(...),
	offered_qty: int = Query(...),
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
    return staff_service.create_donation_offer(db, current_user.id, lot_id, offered_qty)


@router.post("/donation-offers/bulk")
def create_bulk_donation_offers(
	data: CreateBulkDonationOffersRequest,
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
    if not data.items:
        raise HTTPException(status_code=400, detail="Danh sách sản phẩm không được trống")
    return staff_service.create_bulk_donation_offers(db, current_user.id, data.items)


@router.put("/donation-offers/{offer_id}/status")
def update_staff_donation_offer_status(
	offer_id: int,
	new_status: str = Query(...),
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
    return staff_service.update_donation_offer_status(db, current_user.id, offer_id, new_status)


# ========== Donation Requests ==========
@router.get("/donation-requests")
def list_staff_donation_requests(
	status_filter: str = Query(default="all"),
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
    return staff_service.list_staff_donation_requests(db, current_user.id, status_filter)


@router.put("/donation-requests/{request_id}/status")
def update_staff_donation_request_status(
	request_id: int,
	data: UpdateDonationRequestStatusRequest,
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
    return staff_service.update_donation_request_status(db, current_user.id, request_id, data.status)


# ========== Inventory Lots ==========
@router.get("/inventory-lots", response_model=InventoryLotsListResponse)
def list_inventory_lots(
	status_filter: str = Query(default="all"),
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
    scope = staff_service._get_staff_scope(db, current_user.id)
    return staff_service.list_inventory_lots(db, scope["store_id"], status_filter)


@router.post("/inventory-lots")
def create_inventory_lot(
	data: CreateInventoryLotRequest,
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
    scope = staff_service._get_staff_scope(db, current_user.id)
    return staff_service.create_inventory_lot(
        db, scope["store_id"], scope["supermarket_id"],
        data.lotCode,
        data.productName,
        data.quantity,
        data.expiryDate,
        data.status,
        data.actionNote,
        data.manufacturingDate
    )


@router.put("/inventory-lots/{lot_id}")
def update_inventory_lot(
	lot_id: int,
	data: UpdateInventoryLotRequest,
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
    scope = staff_service._get_staff_scope(db, current_user.id)
    return staff_service.update_inventory_lot(
        db, lot_id, scope["store_id"], scope["supermarket_id"],
        data.lotCode,
        data.productName,
        data.quantity,
        data.expiryDate,
        data.status,
        data.manufacturingDate
    )


@router.delete("/inventory-lots/{lot_id}")
def delete_inventory_lot(
	lot_id: int,
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
    scope = staff_service._get_staff_scope(db, current_user.id)
    return staff_service.delete_inventory_lot(db, lot_id, scope["store_id"])


# ========== File Upload & Import ==========
@router.post("/inventory-lots/import-excel", response_model=ImportInventoryLotsResponse)
async def import_inventory_lots_from_excel(
	file: UploadFile = File(...),
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
    scope = staff_service._get_staff_scope(db, current_user.id)
    return await staff_service.import_inventory_lots_from_excel(db, scope["store_id"], scope["supermarket_id"], file)


@router.post("/products/import-excel", response_model=ImportProductsResponse)
async def import_products_from_excel(
	file: UploadFile = File(...),
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
    scope = staff_service._get_staff_scope(db, current_user.id)
    return await staff_service.import_products_from_excel(db, scope["store_id"], scope["supermarket_id"], file)


@router.post("/upload-product-image", response_model=UploadImageResponse)
async def upload_product_image(
	file: UploadFile = File(...),
	current_user: User = Depends(get_current_user),
	db: Session = Depends(get_db),
):
    return await staff_service.upload_product_image(db, current_user.id, file)
