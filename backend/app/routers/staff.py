"""Staff router with clean endpoint handlers."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Query, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
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
)
from app.services import staff_service

router = APIRouter(prefix="/staff", tags=["staff"])


# ========== Profile Management ==========
@router.get("/profile", response_model=StaffProfileResponse)
def get_staff_profile(
    user_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
):
    return staff_service.get_staff_profile(db, user_id)


@router.put("/profile", response_model=StaffProfileResponse)
def update_staff_profile(
    data: UpdateStaffProfileRequest,
    user_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
):
    return staff_service.update_staff_profile(
        db, user_id,
        data.fullName,
        data.email,
        data.phone
    )


@router.post("/change-password")
def change_staff_password(
    data: ChangePasswordRequest,
    user_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
):
    return staff_service.change_staff_password(
        db, user_id,
        data.currentPassword,
        data.newPassword
    )


# ========== Orders Management ==========
@router.get("/orders", response_model=OrdersListResponse)
def list_staff_orders(
    user_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
):
    scope = staff_service._get_staff_scope(db, user_id)
    return staff_service.list_staff_orders(db, scope["store_id"])


@router.put("/orders/{order_id}/status")
def update_staff_order_status(
    order_id: int,
    data: UpdateOrderStatusRequest,
    user_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
):
    scope = staff_service._get_staff_scope(db, user_id)
    return staff_service.update_staff_order_status(db, order_id, scope["store_id"], data.status)


@router.get("/orders/{order_id}", response_model=OrderDetailResponse)
def get_staff_order_detail(
    order_id: int,
    user_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
):
    scope = staff_service._get_staff_scope(db, user_id)
    return staff_service.get_staff_order_detail(db, order_id, scope["store_id"])


# ========== Notifications ==========
@router.get("/notifications", response_model=NotificationsListResponse)
def list_staff_notifications(
    user_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
):
    return staff_service.list_staff_notifications(db, user_id)


@router.put("/notifications/{notification_id}/read")
def mark_notification_as_read(
    notification_id: int,
    user_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
):
    return staff_service.mark_notification_as_read(db, notification_id, user_id)


# ========== Categories ==========
@router.get("/category-stats", response_model=CategoryStatsResponse)
def staff_category_stats(
    user_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
):
    scope = staff_service._get_staff_scope(db, user_id)
    return staff_service.staff_category_stats(db, scope["store_id"])


@router.get("/categories", response_model=CategoriesListResponse)
def list_categories(
    user_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
):
    scope = staff_service._get_staff_scope(db, user_id)
    return staff_service.list_categories(db, scope["supermarket_id"])


@router.post("/categories")
def create_category(
    data: CreateCategoryRequest,
    user_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
):
    staff_service._get_staff_scope(db, user_id)
    return staff_service.create_category(db, data.name)


@router.put("/categories/{category_id}")
def update_category(
    category_id: int,
    data: UpdateCategoryRequest,
    user_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
):
    staff_service._get_staff_scope(db, user_id)
    return staff_service.update_category(db, category_id, data.name)


@router.delete("/categories/{category_id}")
def delete_category(
    category_id: int,
    user_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
):
    staff_service._get_staff_scope(db, user_id)
    return staff_service.delete_category(db, category_id)


# ========== Products (delegated to product_service) ==========
@router.get("/products", response_model=ProductsListResponse)
def list_products(
	user_id: int = Query(..., ge=1),
	category_filter: int = Query(default=None),
	search: str = Query(default=None),
	db: Session = Depends(get_db),
):
	from app.services import product_service
	scope = staff_service._get_staff_scope(db, user_id)
	return product_service.list_products(db, scope["supermarket_id"], category_filter, search)


@router.post("/products")
def create_product(
	data: CreateProductRequest,
	user_id: int = Query(..., ge=1),
	db: Session = Depends(get_db),
):
	from app.services import product_service
	scope = staff_service._get_staff_scope(db, user_id)
	return product_service.create_product(
		db, scope["supermarket_id"],
		data.name,
		data.sku,
		data.basePrice,
		data.categoryId,
		data.imageUrl
	)


@router.put("/products/{product_id}")
def update_product(
	product_id: int,
	data: UpdateProductRequest,
	user_id: int = Query(..., ge=1),
	db: Session = Depends(get_db),
):
	from app.services import product_service
	scope = staff_service._get_staff_scope(db, user_id)
	return product_service.update_product(
		db, product_id, scope["supermarket_id"],
		data.name,
		data.basePrice,
		data.categoryId,
		data.imageUrl
	)


@router.delete("/products/{product_id}")
def delete_product(
	product_id: int,
	user_id: int = Query(..., ge=1),
	db: Session = Depends(get_db),
):
	from app.services import product_service
	scope = staff_service._get_staff_scope(db, user_id)
	return product_service.delete_product(db, product_id, scope["supermarket_id"])


@router.get("/products/categories", response_model=ProductCategoriesListResponse)
def list_product_categories(
	user_id: int = Query(..., ge=1),
	db: Session = Depends(get_db),
):
	from app.services import product_service
	scope = staff_service._get_staff_scope(db, user_id)
	return product_service.list_product_categories(db, scope["supermarket_id"])


# ========== Dashboard ==========
@router.get("/dashboard-summary", response_model=DashboardSummaryResponse)
def staff_dashboard_summary(
    user_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
):
    scope = staff_service._get_staff_scope(db, user_id)
    return staff_service.staff_dashboard_summary(db, scope["store_id"])


# ========== Inventory Lots ==========
@router.get("/inventory-lots", response_model=InventoryLotsListResponse)
def list_inventory_lots(
    user_id: int = Query(..., ge=1),
    status_filter: str = Query(default="all"),
    db: Session = Depends(get_db),
):
    scope = staff_service._get_staff_scope(db, user_id)
    return staff_service.list_inventory_lots(db, scope["store_id"], status_filter)


@router.post("/inventory-lots")
def create_inventory_lot(
    data: CreateInventoryLotRequest,
    user_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
):
    scope = staff_service._get_staff_scope(db, user_id)
    return staff_service.create_inventory_lot(
        db, scope["store_id"], scope["supermarket_id"],
        data.lotCode,
        data.productName,
        data.quantity,
        data.expiryDate,
        data.status,
        data.actionNote
    )


@router.put("/inventory-lots/{lot_id}")
def update_inventory_lot(
    lot_id: int,
    data: UpdateInventoryLotRequest,
    user_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
):
    scope = staff_service._get_staff_scope(db, user_id)
    return staff_service.update_inventory_lot(
        db, lot_id, scope["store_id"], scope["supermarket_id"],
        data.lotCode,
        data.productName,
        data.quantity,
        data.expiryDate,
        data.status
    )


@router.delete("/inventory-lots/{lot_id}")
def delete_inventory_lot(
    lot_id: int,
    user_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
):
    scope = staff_service._get_staff_scope(db, user_id)
    return staff_service.delete_inventory_lot(db, lot_id, scope["store_id"])


# ========== File Upload & Import ==========
@router.post("/inventory-lots/import-excel", response_model=ImportInventoryLotsResponse)
async def import_inventory_lots_from_excel(
    user_id: int = Query(..., ge=1),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    scope = staff_service._get_staff_scope(db, user_id)
    return await staff_service.import_inventory_lots_from_excel(db, scope["store_id"], scope["supermarket_id"], file)


@router.post("/products/import-excel", response_model=ImportProductsResponse)
async def import_products_from_excel(
    user_id: int = Query(..., ge=1),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    scope = staff_service._get_staff_scope(db, user_id)
    return await staff_service.import_products_from_excel(db, scope["store_id"], scope["supermarket_id"], file)


@router.post("/upload-product-image", response_model=UploadImageResponse)
async def upload_product_image(
    user_id: int = Query(..., ge=1),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    return await staff_service.upload_product_image(db, user_id, file)
