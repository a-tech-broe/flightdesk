from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.flight import Flight
from ..models.user import User
from ..schemas.flight import FlightCreate, FlightUpdate, FlightResponse
from ..auth.utils import get_current_user

router = APIRouter(prefix="/flights", tags=["flights"])


@router.get("/", response_model=List[FlightResponse])
def list_flights(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Flight).filter(Flight.user_id == current_user.id).order_by(Flight.date.desc()).all()


@router.post("/", response_model=FlightResponse, status_code=201)
def create_flight(flight: FlightCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_flight = Flight(**flight.model_dump(), user_id=current_user.id)
    db.add(db_flight)
    db.commit()
    db.refresh(db_flight)
    return db_flight


@router.get("/{flight_id}", response_model=FlightResponse)
def get_flight(flight_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    flight = db.query(Flight).filter(Flight.id == flight_id, Flight.user_id == current_user.id).first()
    if not flight:
        raise HTTPException(status_code=404, detail="Flight not found")
    return flight


@router.put("/{flight_id}", response_model=FlightResponse)
def update_flight(flight_id: int, flight: FlightUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_flight = db.query(Flight).filter(Flight.id == flight_id, Flight.user_id == current_user.id).first()
    if not db_flight:
        raise HTTPException(status_code=404, detail="Flight not found")
    for key, value in flight.model_dump(exclude_unset=True).items():
        setattr(db_flight, key, value)
    db.commit()
    db.refresh(db_flight)
    return db_flight


@router.delete("/{flight_id}", status_code=204)
def delete_flight(flight_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_flight = db.query(Flight).filter(Flight.id == flight_id, Flight.user_id == current_user.id).first()
    if not db_flight:
        raise HTTPException(status_code=404, detail="Flight not found")
    db.delete(db_flight)
    db.commit()
