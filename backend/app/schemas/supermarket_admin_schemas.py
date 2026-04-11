"""Supermarket admin endpoint request and response schemas."""

from pydantic import BaseModel, Field


class StoreItem(BaseModel):
    id: int
    name: str
    address: str
    phone: str
    status: str
    staffCount: int
    code: str


class StoresListResponse(BaseModel):
    items: list[StoreItem]


# ========== Store Request Schemas ==========
class CreateStoreRequest(BaseModel):
    name: str = Field(..., min_length=1)
    address: str = Field(..., min_length=1)
    code: str = Field(default="", min_length=0)
    phone: str = Field(default="")
    status: str = Field(default="active")


class UpdateStoreRequest(BaseModel):
    name: str = Field(..., min_length=1)
    address: str = Field(..., min_length=1)
    phone: str = Field(default="")
