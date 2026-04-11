from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.supermarket_admin_schemas import (
    StoresListResponse,
    CreateStoreRequest,
    UpdateStoreRequest,
)
from app.services import supermarket_admin_service


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
