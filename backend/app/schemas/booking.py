from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class BookingCreate(BaseModel):
    aircraft_id: int
    start_time: datetime
    end_time: datetime
    purpose: Optional[str] = None
    notes: Optional[str] = None


class BookingUpdate(BaseModel):
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    purpose: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class BookingResponse(BookingCreate):
    id: int
    user_id: int
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
