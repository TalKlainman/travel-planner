# from fastapi import APIRouter, Depends, HTTPException, status
# from sqlalchemy.orm import Session
# from typing import List, Optional
# from datetime import date

# import models
# from database import get_db
# from auth import get_current_active_user

# router = APIRouter(
#     prefix="/trips",
#     tags=["trips"],
#     responses={404: {"description": "Not found"}},
# )

# @router.post("/", response_model=models.Trip, status_code=status.HTTP_201_CREATED)
# def create_trip(
#     trip: models.TripCreate, 
#     db: Session = Depends(get_db),
#     current_user: models.DBUser = Depends(get_current_active_user)
# ):
#     db_trip = models.DBTrip(**trip.dict(), owner_id=current_user.id)
#     db.add(db_trip)
#     db.commit()
#     db.refresh(db_trip)
#     return db_trip

# @router.get("/", response_model=List[models.Trip])
# def read_trips(
#     skip: int = 0, 
#     limit: int = 100, 
#     db: Session = Depends(get_db),
#     current_user: models.DBUser = Depends(get_current_active_user)
# ):
#     trips = db.query(models.DBTrip).filter(
#         models.DBTrip.owner_id == current_user.id
#     ).offset(skip).limit(limit).all()
#     return trips

# @router.get("/{trip_id}", response_model=models.Trip)
# def read_trip(
#     trip_id: int, 
#     db: Session = Depends(get_db),
#     current_user: models.DBUser = Depends(get_current_active_user)
# ):
#     trip = db.query(models.DBTrip).filter(
#         models.DBTrip.id == trip_id, 
#         models.DBTrip.owner_id == current_user.id
#     ).first()
#     if trip is None:
#         raise HTTPException(status_code=404, detail="Trip not found")
#     return trip

# @router.put("/{trip_id}", response_model=models.Trip)
# def update_trip(
#     trip_id: int, 
#     trip: models.TripUpdate, 
#     db: Session = Depends(get_db),
#     current_user: models.DBUser = Depends(get_current_active_user)
# ):
#     db_trip = db.query(models.DBTrip).filter(
#         models.DBTrip.id == trip_id, 
#         models.DBTrip.owner_id == current_user.id
#     ).first()
#     if db_trip is None:
#         raise HTTPException(status_code=404, detail="Trip not found")
    
#     # Update trip fields (only if provided)
#     trip_data = trip.dict(exclude_unset=True)
#     for key, value in trip_data.items():
#         setattr(db_trip, key, value)
    
#     db.commit()
#     db.refresh(db_trip)
#     return db_trip

# @router.delete("/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
# def delete_trip(
#     trip_id: int, 
#     db: Session = Depends(get_db),
#     current_user: models.DBUser = Depends(get_current_active_user)
# ):
#     db_trip = db.query(models.DBTrip).filter(
#         models.DBTrip.id == trip_id, 
#         models.DBTrip.owner_id == current_user.id
#     ).first()
#     if db_trip is None:
#         raise HTTPException(status_code=404, detail="Trip not found")
    
#     db.delete(db_trip)
#     db.commit()
#     return None

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

import models
from database import get_db
from auth import get_current_active_user
from services.itinerary_service import ItineraryService

router = APIRouter(
    prefix="/trips",
    tags=["trips"],
    responses={404: {"description": "Not found"}},
)

# Initialize service
itinerary_service = ItineraryService()

@router.post("/", response_model=models.Trip, status_code=status.HTTP_201_CREATED)
async def create_trip(
    trip: models.TripCreate, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.DBUser = Depends(get_current_active_user)
):
    # Create trip without itinerary first
    db_trip = models.DBTrip(**trip.dict(), owner_id=current_user.id)
    db.add(db_trip)
    db.commit()
    db.refresh(db_trip)
    
    # Get user preferences for itinerary generation
    preferences = db.query(models.DBPreference).filter(
        models.DBPreference.user_id == current_user.id
    ).all()
    
    # Add background task to generate itinerary
    background_tasks.add_task(
        generate_and_save_itinerary,
        db_trip.id,
        db_trip.destination,
        str(db_trip.start_date),
        str(db_trip.end_date),
        [
            {"category": pref.category, "value": pref.value, "weight": pref.weight}
            for pref in preferences
        ],
        db_trip.budget,
        db
    )
    
    return db_trip

@router.get("/", response_model=List[models.Trip])
def read_trips(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: models.DBUser = Depends(get_current_active_user)
):
    trips = db.query(models.DBTrip).filter(
        models.DBTrip.owner_id == current_user.id
    ).offset(skip).limit(limit).all()
    return trips

@router.get("/{trip_id}", response_model=models.Trip)
def read_trip(
    trip_id: int, 
    db: Session = Depends(get_db),
    current_user: models.DBUser = Depends(get_current_active_user)
):
    trip = db.query(models.DBTrip).filter(
        models.DBTrip.id == trip_id, 
        models.DBTrip.owner_id == current_user.id
    ).first()
    if trip is None:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip

@router.put("/{trip_id}", response_model=models.Trip)
def update_trip(
    trip_id: int, 
    trip: models.TripUpdate, 
    db: Session = Depends(get_db),
    current_user: models.DBUser = Depends(get_current_active_user)
):
    db_trip = db.query(models.DBTrip).filter(
        models.DBTrip.id == trip_id, 
        models.DBTrip.owner_id == current_user.id
    ).first()
    if db_trip is None:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    # Update trip fields (only if provided)
    trip_data = trip.dict(exclude_unset=True)
    for key, value in trip_data.items():
        setattr(db_trip, key, value)
    
    db.commit()
    db.refresh(db_trip)
    return db_trip

@router.delete("/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_trip(
    trip_id: int, 
    db: Session = Depends(get_db),
    current_user: models.DBUser = Depends(get_current_active_user)
):
    db_trip = db.query(models.DBTrip).filter(
        models.DBTrip.id == trip_id, 
        models.DBTrip.owner_id == current_user.id
    ).first()
    if db_trip is None:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    db.delete(db_trip)
    db.commit()
    return None

async def generate_and_save_itinerary(
    trip_id: int,
    destination: str,
    start_date: str,
    end_date: str,
    preferences: List[dict],
    budget: Optional[float],
    db: Session
):
    """Background task to generate and save itinerary"""
    try:
        # Generate itinerary
        itinerary = await itinerary_service.generate_itinerary(
            destination, start_date, end_date, preferences, budget
        )
        
        # Update trip with itinerary
        db_trip = db.query(models.DBTrip).filter(models.DBTrip.id == trip_id).first()
        if db_trip:
            db_trip.itinerary = itinerary
            db.commit()
    except Exception as e:
        # Log error but don't crash
        print(f"Error generating itinerary: {str(e)}")