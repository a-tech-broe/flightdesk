from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class AircraftCreate(BaseModel):
    tail_number: str
    make: str
    model: str
    year: Optional[int] = None
    category: Optional[str] = None
    aircraft_class: Optional[str] = None


class AircraftResponse(AircraftCreate):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}
