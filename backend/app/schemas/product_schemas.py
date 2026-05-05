"""Product endpoint request and response schemas."""

from pydantic import BaseModel, Field


# ========== Product Schemas ==========
class ProductItem(BaseModel):
    id: int
    sku: str
    name: str
    basePrice: float
    imageUrl: str | None
    categoryName: str
    categoryId: int | None
    totalStock: int


class ProductsListResponse(BaseModel):
    items: list[ProductItem]


class CreateProductRequest(BaseModel):
    name: str = Field(..., min_length=1)
    sku: str = Field(..., min_length=1)
    basePrice: float = Field(..., ge=0)
    categoryId: int | None = None
    imageUrl: str | None = None


class UpdateProductRequest(BaseModel):
    name: str = Field(..., min_length=1)
    basePrice: float = Field(..., ge=0)
    categoryId: int | None = None
    imageUrl: str | None = None 
class ProductCategoryItem(BaseModel):
    id: int
    name: str


class ProductCategoriesListResponse(BaseModel):
    items: list[ProductCategoryItem]


class SuccessResponse(BaseModel):
    message: str
