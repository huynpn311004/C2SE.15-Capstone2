"""Charity endpoint request and response schemas."""

from pydantic import BaseModel


class CharityProfileResponse(BaseModel):
    id: int | None
    orgName: str
    fullName: str
    username: str
    email: str
    phone: str
    createdAt: str


class DashboardSummaryResponse(BaseModel):
    totalReceived: int
    totalPending: int
    totalApproved: int
    totalProducts: int
    uniqueStores: int


class DonationOfferItem(BaseModel):
    id: int
    name: str
    qty: int
    exp: str
    store: str
    supermarket: str
    status: str
    myRequestId: int | None
    myRequestStatus: str


class DonationOffersResponse(BaseModel):
    items: list[DonationOfferItem]


class DonationRequestItem(BaseModel):
    id: int
    product: str
    qty: int
    status: str
    exp: str
    store: str
    supermarket: str
    createdAt: str


class DonationRequestsResponse(BaseModel):
    items: list[DonationRequestItem]
