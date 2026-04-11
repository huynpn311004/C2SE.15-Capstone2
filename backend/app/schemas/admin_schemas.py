from pydantic import BaseModel, Field
from typing import Optional, List


# ========== Dashboard & Reports ==========

class DashboardSummaryResponse(BaseModel):
	supermarkets: int
	charities: int
	users: int
	pendingRequests: int


class MetricsData(BaseModel):
	revenue: str
	orders: str
	deliveredRate: str
	activePartners: str
	revenueTrend: str
	ordersTrend: str


class SupermarketMetric(BaseModel):
	name: str
	orders: int
	growth: str


class DeliveryMetric(BaseModel):
	name: str
	completion: str
	avgTime: str


class ReportsResponse(BaseModel):
	metrics: MetricsData
	supermarketTop: List[SupermarketMetric]
	deliveryTop: List[DeliveryMetric]


# ========== Audit Log ==========

class AuditLogItem(BaseModel):
	id: int
	time: str
	actor: str
	action: str
	entityType: str
	entityId: Optional[int]
	oldValue: Optional[str]
	newValue: Optional[str]
	userId: Optional[int]


class AuditLogsResponse(BaseModel):
	items: List[AuditLogItem]


# ========== Users ==========

class UserItem(BaseModel):
	id: int
	username: str
	fullName: str
	email: str
	phone: Optional[str]
	role: str
	status: str
	joinDate: str
	lastLogin: str
	supermarket: str
	store: str


class UsersListResponse(BaseModel):
	items: List[UserItem]


class SuccessResponse(BaseModel):
	success: bool


# ========== Supermarket ==========

class SupermarketItem(BaseModel):
	id: int
	name: str
	email: str
	phone: str
	address: str
	requestDate: str
	status: str
	director: str
	isLocked: bool
	accountCreated: bool
	accountUsername: str
	accountStatus: str


class SupermarketsListResponse(BaseModel):
	items: List[SupermarketItem]


class UpdateSupermarketRequest(BaseModel):
	name: str = Field(min_length=1)
	director: str = Field(min_length=1)
	email: str = Field(max_length=255)
	phone: Optional[str] = Field(default=None, max_length=20)
	address: Optional[str] = Field(default=None)


class CreateSupermarketAccountRequest(BaseModel):
	name: str = Field(min_length=1)
	director: str = Field(min_length=1)
	email: str = Field(max_length=255)
	phone: Optional[str] = Field(default=None, max_length=20)
	address: Optional[str] = Field(default=None)
	password: str = Field(min_length=6, max_length=128)
	activityStatus: str = Field(default="active")


class CreateSupermarketResponse(BaseModel):
	success: bool
	supermarketId: int


# ========== Charity ==========

class CharityItem(BaseModel):
	id: int
	name: str
	email: str
	phone: str
	address: str
	requestDate: str
	director: str
	isLocked: bool
	accountCreated: bool
	accountUsername: str
	accountStatus: str
	passwordStatus: str


class CharitiesListResponse(BaseModel):
	items: List[CharityItem]


class UpdateCharityRequest(BaseModel):
	name: str = Field(min_length=1)
	director: str = Field(min_length=1)
	email: str = Field(max_length=255)
	phone: Optional[str] = Field(default=None, max_length=20)
	address: Optional[str] = Field(default=None)


class CreateCharityAccountRequest(BaseModel):
	name: str = Field(min_length=1)
	director: str = Field(min_length=1)
	email: str = Field(max_length=255)
	phone: Optional[str] = Field(default=None, max_length=20)
	address: Optional[str] = Field(default=None)
	password: str = Field(min_length=6, max_length=128)
	passwordStatus: str = Field(default="active")


class CreateCharityResponse(BaseModel):
	success: bool
	charityId: int


# ========== Delivery Partner ==========

class DeliveryPartnerItem(BaseModel):
	id: int
	name: str
	manager: str
	email: str
	phone: str
	vehicleType: str
	licensePlate: str
	requestDate: str
	isLocked: bool
	accountCreated: bool
	accountUsername: str
	accountStatus: str
	passwordStatus: str


class DeliveryPartnersListResponse(BaseModel):
	items: List[DeliveryPartnerItem]


class UpdateDeliveryPartnerRequest(BaseModel):
	manager: str = Field(min_length=1)
	email: str = Field(max_length=255)
	phone: str = Field(min_length=1)
	vehicleType: Optional[str] = None
	licensePlate: Optional[str] = None


class CreateDeliveryAccountRequest(BaseModel):
	manager: str = Field(min_length=1)
	email: str = Field(max_length=255)
	phone: str = Field(min_length=1)
	vehicleType: Optional[str] = None
	licensePlate: Optional[str] = None
	password: str = Field(min_length=6, max_length=128)
	passwordStatus: str = Field(default="active")


class CreateDeliveryResponse(BaseModel):
	success: bool
	deliveryId: int


# ========== User Management ==========

class UpdateUserRequest(BaseModel):
	username: Optional[str] = None
	fullName: str = Field(min_length=1)
	email: str = Field(max_length=255)
	phone: Optional[str] = Field(default=None, max_length=20)


class ChangePasswordRequest(BaseModel):
	currentPassword: str = Field(min_length=1)
	newPassword: str = Field(min_length=6, max_length=128)
