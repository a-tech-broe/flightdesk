from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import Base, engine
from . import models  # registers all models with Base
from .routers import auth, flights, aircraft, bookings

Base.metadata.create_all(bind=engine)

app = FastAPI(title="FlightDesk API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(flights.router)
app.include_router(aircraft.router)
app.include_router(bookings.router)


@app.get("/health")
def health():
    return {"status": "ok"}
