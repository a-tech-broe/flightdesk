from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class Flight(Base):
    __tablename__ = "flights"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    aircraft_id = Column(Integer, ForeignKey("aircraft.id"), nullable=True)

    date = Column(Date, nullable=False)
    departure = Column(String(4), nullable=False)
    destination = Column(String(4), nullable=False)
    departure_time = Column(String(5))
    arrival_time = Column(String(5))

    total_time = Column(Float, default=0.0)
    pic_time = Column(Float, default=0.0)
    dual_received = Column(Float, default=0.0)
    night = Column(Float, default=0.0)
    instrument = Column(Float, default=0.0)
    cross_country = Column(Float, default=0.0)

    day_landings = Column(Integer, default=0)
    night_landings = Column(Integer, default=0)

    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    pilot = relationship("User", back_populates="flights")
    aircraft = relationship("Aircraft", back_populates="flights")
