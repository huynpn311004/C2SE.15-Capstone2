"""Product router - handles product CRUD operations for staff."""

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.product_schemas import (
    ProductsListResponse,
    CreateProductRequest,
    UpdateProductRequest,
    ProductCategoriesListResponse,
    SuccessResponse,
)
from app.services import product_service, staff_service


router = APIRouter(prefix="/products", tags=["products"])


# ========== Product CRUD Endpoints ==========
@router.get("", response_model=ProductsListResponse)
def list_products(
    supermarket_id: int = Query(..., ge=1),
    category_id: int = Query(default=None),
    search: str = Query(default=None),
    db: Session = Depends(get_db),
):
    return product_service.list_products(db, supermarket_id, category_id, search)


@router.post("", response_model=SuccessResponse)
def create_product(
    data: CreateProductRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
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


@router.put("/{product_id}", response_model=SuccessResponse)
def update_product(
    product_id: int,
    data: UpdateProductRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    scope = staff_service._get_staff_scope(db, current_user.id)
    
    return product_service.update_product(
        db,
        product_id,
        scope["supermarket_id"],
        scope["store_id"],
        current_user.id,
        data.name,
        data.basePrice,
        data.categoryId,
        data.imageUrl,
    )


@router.delete("/{product_id}", response_model=SuccessResponse)
def delete_product(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    scope = staff_service._get_staff_scope(db, current_user.id)
    
    return product_service.delete_product(
        db, product_id, scope["supermarket_id"], scope["store_id"], current_user.id
    )


# ========== Category Endpoints ==========
@router.get("/categories", response_model=ProductCategoriesListResponse)
def list_product_categories(
    supermarket_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
):
    return product_service.list_product_categories(db, supermarket_id)
