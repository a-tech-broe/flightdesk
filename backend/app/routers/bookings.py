from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.booking import Booking
from ..models.user import User
from ..schemas.booking import BookingCreate, BookingUpdate, BookingResponse
from ..auth.utils import get_current_user

router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.get("", response_model=List[BookingResponse])
def list_bookings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Booking).order_by(Booking.start_time.asc()).all()


@router.post("", response_model=BookingResponse, status_code=201)
def create_booking(booking: BookingCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    conflict = db.query(Booking).filter(
        Booking.aircraft_id == booking.aircraft_id,
        Booking.status == "confirmed",
        Booking.start_time < booking.end_time,
        Booking.end_time > booking.start_time,
    ).first()
    if conflict:
        raise HTTPException(status_code=409, detail="Aircraft already booked for this time slot")
    db_booking = Booking(**booking.model_dump(), user_id=current_user.id)
    db.add(db_booking)
    db.commit()
    db.refresh(db_booking)
    return db_booking


@router.put("/{booking_id}", response_model=BookingResponse)
def update_booking(booking_id: int, booking: BookingUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_booking = db.query(Booking).filter(Booking.id == booking_id, Booking.user_id == current_user.id).first()
    if not db_booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    for key, value in booking.model_dump(exclude_unset=True).items():
        setattr(db_booking, key, value)
    db.commit()
    db.refresh(db_booking)
    return db_booking


@router.delete("/{booking_id}", status_code=204)
def delete_booking(booking_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_booking = db.query(Booking).filter(Booking.id == booking_id, Booking.user_id == current_user.id).first()
    if not db_booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    db.delete(db_booking)
    db.commit()
