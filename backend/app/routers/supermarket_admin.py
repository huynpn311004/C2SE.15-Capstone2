from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.supermarket_admin_schemas import (
    StoresListResponse,
    CreateStoreRequest,
    UpdateStoreRequest,
)
from app.services import supermarket_admin_service, product_service


router = APIRouter(prefix="/supermarket-admin", tags=["supermarket-admin"])


# ========== Store Management ==========
@router.get("/stores", response_model=StoresListResponse)
def list_stores(user_id: int = Query(...), db: Session = Depends(get_db)):
    return supermarket_admin_service.list_stores(db, user_id)


@router.post("/stores")
def create_store(
    data: CreateStoreRequest,
    user_id: int = Query(...),
    db: Session = Depends(get_db),
):
    return supermarket_admin_service.create_store(
        db,
        user_id,
        data.name,
        data.address,
        data.code,
        data.phone,
    )


@router.put("/stores/{store_id}")
def update_store(
    store_id: int,
    data: UpdateStoreRequest,
    user_id: int = Query(...),
    db: Session = Depends(get_db),
):
    return supermarket_admin_service.update_store(
        db,
        user_id,
        store_id,
        data.name,
        data.address,
        data.phone,
    )


@router.delete("/stores/{store_id}")
def delete_store(
    store_id: int,
    user_id: int = Query(...),
    db: Session = Depends(get_db),
):
    return supermarket_admin_service.delete_store(db, user_id, store_id)


# ========== Products & Categories for Policy Configuration ==========
@router.get("/products")
def list_all_products(
    user_id: int = Query(...),
    db: Session = Depends(get_db),
):
    """Get all products for supermarket admin (no inventory filtering)"""
    scope = supermarket_admin_service._get_supermarket_scope(db, user_id)
    return product_service.list_products(db, scope, None, None)


@router.get("/categories")
def list_all_categories(
    user_id: int = Query(...),
    db: Session = Depends(get_db),
):
    """Get all categories for supermarket admin"""
    scope = supermarket_admin_service._get_supermarket_scope(db, user_id)
    return product_service.list_product_categories(db, scope)


# ========== Donation Monitoring ==========
@router.get("/donations")
def list_donation_monitoring(
    user_id: int = Query(...),
    status_filter: str = Query(default="all"),
    db: Session = Depends(get_db),
):
    return supermarket_admin_service.list_donation_monitoring(db, user_id, status_filter)


@router.put("/donations/{request_id}/status")
def update_donation_status(
    request_id: int,
    status: str = Query(...),
    user_id: int = Query(...),
    db: Session = Depends(get_db),
):
    return supermarket_admin_service.update_donation_request_status(db, user_id, request_id, status)
