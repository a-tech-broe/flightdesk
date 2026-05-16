from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class Aircraft(Base):
    __tablename__ = "aircraft"

    id = Column(Integer, primary_key=True, index=True)
    tail_number = Column(String, unique=True, index=True, nullable=False)
    make = Column(String, nullable=False)
    model = Column(String, nullable=False)
    year = Column(Integer)
    category = Column(String)
    aircraft_class = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    flights = relationship("Flight", back_populates="aircraft")
    bookings = relationship("Booking", back_populates="aircraft")
