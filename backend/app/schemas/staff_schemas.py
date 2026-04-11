"""Staff endpoint request and response schemas."""

from datetime import date, datetime
from pydantic import BaseModel, Field


# ========== Profile Schemas ==========
class StaffProfileResponse(BaseModel):
    email: str
    fullName: str
    phone: str
    role: str
    storeName: str
    storeAddress: str


class UpdateStaffProfileRequest(BaseModel):
    fullName: str = Field(..., min_length=1)
    email: str = Field(..., min_length=1)
    phone: str = ""


class ChangePasswordRequest(BaseModel):
    currentPassword: str = Field(..., min_length=1)
    newPassword: str = Field(..., min_length=6)


# ========== Orders Schemas ==========
class OrderItemDetail(BaseModel):
    productName: str
    quantity: int
    unitPrice: str
    subtotal: str


class OrderItem(BaseModel):
    id: str
    orderId: int
    customer: str
    status: str
    amount: str
    paymentStatus: str
    createdAt: str
    deliveredAt: str | None


class OrdersListResponse(BaseModel):
    items: list[OrderItem]


class UpdateOrderStatusRequest(BaseModel):
    status: str = Field(..., min_length=1)


class OrderDetailResponse(BaseModel):
    id: str
    orderId: int
    customer: str
    phone: str
    status: str
    amount: str
    paymentMethod: str
    paymentMethodText: str
    paymentStatus: str
    createdAt: str
    deliveredAt: str | None
    items: list[OrderItemDetail]


# ========== Notifications Schemas ==========
class NotificationItem(BaseModel):
    id: int
    type: str
    content: str
    isRead: bool
    createdAt: str


class NotificationsListResponse(BaseModel):
    items: list[NotificationItem]


# ========== Categories Schemas ==========
class CategoryItem(BaseModel):
    id: int
    name: str
    productCount: int


class CategoriesListResponse(BaseModel):
    items: list[CategoryItem]


class CreateCategoryRequest(BaseModel):
    name: str = Field(..., min_length=1)


class UpdateCategoryRequest(BaseModel):
    name: str = Field(..., min_length=1)


# ========== Category Stats Schemas ==========
class CategoryStatItem(BaseModel):
    name: str
    percent: int


class CategoryStatsResponse(BaseModel):
    items: list[CategoryStatItem]


# ========== Products Schemas ==========
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


# ========== Dashboard Schemas ==========
class DashboardSummaryResponse(BaseModel):
    totalLots: int
    nearExpiryProducts: int
    ordersToday: int
    pendingRequests: int


# ========== Inventory Lots Schemas ==========
class InventoryLotItem(BaseModel):
    id: int
    lotCode: str
    productName: str
    quantity: int
    expiryDate: str
    status: str


class InventoryLotsListResponse(BaseModel):
    items: list[InventoryLotItem]


class CreateInventoryLotRequest(BaseModel):
    lotCode: str = Field(..., min_length=1)
    productName: str = Field(..., min_length=1)
    quantity: int = Field(..., ge=0)
    expiryDate: str | date = Field(...)
    status: str | None = None
    actionNote: str = ""


class UpdateInventoryLotRequest(BaseModel):
    lotCode: str = Field(..., min_length=1)
    productName: str = Field(..., min_length=1)
    quantity: int = Field(..., ge=0)
    expiryDate: str | date = Field(...)
    status: str | None = None


# ========== File Import Response Schemas ==========
class ImportErrorItem(BaseModel):
    row: int
    message: str


class ImportInventoryLotsResponse(BaseModel):
    success: bool
    created: int
    updated: int
    failed: int
    errors: list[ImportErrorItem]
    productsCreated: int
    productsUpdated: int
    lotsCreated: int
    lotsUpdated: int


class ImportProductsResponse(BaseModel):
    success: bool
    productsCreated: int
    productsUpdated: int
    lotsCreated: int
    lotsUpdated: int
    failed: int
    errors: list[ImportErrorItem]


class UploadImageResponse(BaseModel):
    url: str
    image_url: str
