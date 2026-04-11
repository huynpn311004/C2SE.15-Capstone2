from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date


# ========== Profile Schemas ==========

class CustomerProfileResponse(BaseModel):
	id: int
	username: str
	email: str
	fullName: str
	phone: str
	role: str
	createdAt: str


class UpdateProfileRequest(BaseModel):
	fullName: str = Field(min_length=1)
	email: str = Field(max_length=255)
	phone: Optional[str] = Field(default=None, max_length=20)


class ChangePasswordRequest(BaseModel):
	currentPassword: str = Field(min_length=1)
	newPassword: str = Field(min_length=6, max_length=128)


class SuccessResponse(BaseModel):
	success: bool
	message: str


# ========== Product Schemas ==========

class ProductResponse(BaseModel):
	id: int
	name: str
	sku: str
	originalPrice: float
	salePrice: float
	discount: float
	imageUrl: Optional[str]
	categoryId: int
	categoryName: str
	storeId: int
	storeName: str
	expiryDate: str
	daysLeft: int
	stock: int
	lotCode: str


class StoreLocationDetail(BaseModel):
	lotCode: str
	expiryDate: str
	quantity: int
	storeName: str
	storeAddress: str
	salePrice: float
	discount: float
	daysLeft: int


class ProductDetailResponse(BaseModel):
	id: int
	name: str
	sku: str
	originalPrice: float
	bestPrice: float
	bestDiscount: float
	imageUrl: Optional[str]
	categoryId: int
	categoryName: str
	supermarketId: Optional[int]
	supermarketName: str
	supermarketPhone: str
	totalStock: int
	stores: List[StoreLocationDetail]


class ProductListResponse(BaseModel):
	items: List[ProductResponse]


class NearExpiryProductResponse(BaseModel):
	id: int
	name: str
	sku: str
	originalPrice: float
	salePrice: float
	discount: float
	imageUrl: Optional[str]
	categoryName: str
	storeName: str
	expiryDate: str
	daysLeft: int
	stock: int
	lotCode: str


class NearExpiryProductListResponse(BaseModel):
	items: List[NearExpiryProductResponse]


# ========== Category & Supermarket Schemas ==========

class CategoryResponse(BaseModel):
	id: int
	name: str


class CategoryListResponse(BaseModel):
	items: List[CategoryResponse]


class SupermarketResponse(BaseModel):
	id: int
	name: str
	location: str
	phone: str


class SupermarketListResponse(BaseModel):
	items: List[SupermarketResponse]


# ========== Order Schemas ==========

class OrderItemResponse(BaseModel):
	name: str
	quantity: int
	unitPrice: float
	lotCode: Optional[str] = None
	expiryDate: Optional[str] = None


class OrderDeliveryInfo(BaseModel):
	status: Optional[str]
	deliveryCode: Optional[str]
	pickedAt: Optional[str]
	deliveredAt: Optional[str]


class OrderResponse(BaseModel):
	id: str
	orderId: int
	storeName: str
	storeAddress: str
	status: str
	totalAmount: float
	paymentMethod: str
	paymentStatus: str
	createdAt: str
	items: List[OrderItemResponse]


class OrderDetailResponse(BaseModel):
	id: str
	orderId: int
	storeName: str
	storeAddress: str
	status: str
	totalAmount: float
	paymentMethod: str
	paymentStatus: str
	createdAt: str
	items: List[OrderItemResponse]
	delivery: Optional[OrderDeliveryInfo]


class OrderListResponse(BaseModel):
	items: List[OrderResponse]


class OrderItemCreateRequest(BaseModel):
	productId: int
	quantity: int = Field(ge=1)
	lotCode: Optional[str] = None


class CreateOrderRequest(BaseModel):
	items: List[OrderItemCreateRequest]
	storeId: int
	paymentMethod: str = Field(default="cod")


class CreateOrderResponse(BaseModel):
	success: bool
	orderId: int
	orderCode: str
	message: str


class CancelOrderResponse(BaseModel):
	success: bool
	message: str


# ========== Dashboard Schemas ==========

class DashboardSummaryResponse(BaseModel):
	totalOrders: int
	pendingOrders: int
	completedOrders: int
	totalSpent: float
