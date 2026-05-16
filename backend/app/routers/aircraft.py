from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.aircraft import Aircraft
from ..models.user import User
from ..schemas.aircraft import AircraftCreate, AircraftResponse
from ..auth.utils import get_current_user

router = APIRouter(prefix="/aircraft", tags=["aircraft"])


@router.get("/", response_model=List[AircraftResponse])
def list_aircraft(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Aircraft).order_by(Aircraft.tail_number).all()


@router.post("/", response_model=AircraftResponse, status_code=201)
def create_aircraft(aircraft: AircraftCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if db.query(Aircraft).filter(Aircraft.tail_number == aircraft.tail_number).first():
        raise HTTPException(status_code=400, detail="Aircraft with this tail number already exists")
    db_aircraft = Aircraft(**aircraft.model_dump())
    db.add(db_aircraft)
    db.commit()
    db.refresh(db_aircraft)
    return db_aircraft


@router.get("/{aircraft_id}", response_model=AircraftResponse)
def get_aircraft(aircraft_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    aircraft = db.query(Aircraft).filter(Aircraft.id == aircraft_id).first()
    if not aircraft:
        raise HTTPException(status_code=404, detail="Aircraft not found")
    return aircraft
