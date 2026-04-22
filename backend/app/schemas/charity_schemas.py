"""Charity endpoint request and response schemas."""

from pydantic import BaseModel


class CharityProfileResponse(BaseModel):
    id: int | None
    orgName: str
    fullName: str
    username: str
    email: str
    phone: str
    address: str
    createdAt: str


class DashboardSummaryResponse(BaseModel):
    totalReceived: int
    totalPending: int
    totalApproved: int
    totalProducts: int
    uniqueStores: int
    receivedList: list


class DonationOfferItem(BaseModel):
    id: int
    name: str
    qty: int
    exp: str
    store: str
    supermarket: str
    supermarketAddress: str
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
    supermarketAddress: str
    createdAt: str


class DonationRequestsResponse(BaseModel):
    items: list[DonationRequestItem]


class CreateDonationRequestRequest(BaseModel):
    offerId: int
    requestQty: int
    note: str = ""
