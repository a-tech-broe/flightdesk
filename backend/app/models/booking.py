from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    aircraft_id = Column(Integer, ForeignKey("aircraft.id"), nullable=False)

    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    purpose = Column(String)
    notes = Column(Text)
    status = Column(String, default="confirmed")

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    pilot = relationship("User", back_populates="bookings")
    aircraft = relationship("Aircraft", back_populates="bookings")
