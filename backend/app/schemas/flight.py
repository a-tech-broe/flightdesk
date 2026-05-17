from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional


class FlightCreate(BaseModel):
    aircraft_id: Optional[int] = None
    date: date
    departure: str
    destination: str
    departure_time: Optional[str] = None
    arrival_time: Optional[str] = None
    total_time: float = 0.0
    pic_time: float = 0.0
    dual_received: float = 0.0
    night: float = 0.0
    instrument: float = 0.0
    cross_country: float = 0.0
    day_landings: int = 0
    night_landings: int = 0
    instrument_approaches: Optional[int] = 0
    solo: Optional[float] = 0.0
    simulated_instrument: Optional[float] = 0.0
    notes: Optional[str] = None


class FlightUpdate(FlightCreate):
    pass


class FlightResponse(FlightCreate):
    id: int
    user_id: int
    created_at: datetime

    model_config = {"from_attributes": True}
