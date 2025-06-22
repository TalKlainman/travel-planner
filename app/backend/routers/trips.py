from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
import logging

import models
from database import get_db
from auth import get_current_active_user
from services.itinerary_service import ItineraryService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
    try:
        # Validate trip data before creating
        if not trip.destination or not trip.title:
            raise HTTPException(
                status_code=400, 
                detail="Destination and title are required"
            )
        
        if trip.start_date >= trip.end_date:
            raise HTTPException(
                status_code=400, 
                detail="End date must be after start date"
            )
        
        # Create trip with default itinerary - SAVE FIRST
        trip_data = trip.dict()
        db_trip = models.DBTrip(
            **trip_data, 
            owner_id=current_user.id, 
            itinerary={"status": "pending", "activities": []}
        )
        db.add(db_trip)
        db.commit()
        db.refresh(db_trip)
        
        logger.info(f"Trip created and saved with ID: {db_trip.id}")
        
        # Get user preferences for itinerary generation
        try:
            preferences = db.query(models.DBPreference).filter(
                models.DBPreference.user_id == current_user.id
            ).all()
            
            # Add background task with CORRECT parameters
            background_tasks.add_task(
                generate_and_save_itinerary,
                str(db_trip.id),  # trip_id as string (FIRST parameter)
                db_trip.destination,
                str(db_trip.start_date),
                str(db_trip.end_date),
                [
                    {"category": pref.category, "value": pref.value, "weight": pref.weight}
                    for pref in preferences
                ],
                db_trip.budget
            )
            logger.info(f"Background task scheduled for trip {db_trip.id}")
            
        except Exception as bg_error:
            logger.error(f"Failed to schedule background task: {str(bg_error)}")
            # Don't fail trip creation, just log the error
        
        return db_trip
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating trip: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=500, 
            detail="Error creating trip"
        )

@router.get("/", response_model=List[models.Trip])
def read_trips(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: models.DBUser = Depends(get_current_active_user)
):
    try:
        trips = db.query(models.DBTrip).filter(
            models.DBTrip.owner_id == current_user.id
        ).offset(skip).limit(limit).all()
        
        # Ensure each trip has a valid itinerary structure
        for trip in trips:
            if trip.itinerary is None:
                trip.itinerary = {"status": "pending", "activities": []}
            elif not isinstance(trip.itinerary, dict):
                logger.warning(f"Trip {trip.id} has invalid itinerary data: {trip.itinerary}")
                trip.itinerary = {"status": "error", "activities": [], "error": "Invalid data"}
        
        return trips
        
    except Exception as e:
        logger.error(f"Error reading trips: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="Error retrieving trips"
        )

@router.get("/{trip_id}", response_model=models.Trip)
def read_trip(
    trip_id: int, 
    db: Session = Depends(get_db),
    current_user: models.DBUser = Depends(get_current_active_user)
):
    try:
        trip = db.query(models.DBTrip).filter(
            models.DBTrip.id == trip_id, 
            models.DBTrip.owner_id == current_user.id
        ).first()
        
        if trip is None:
            raise HTTPException(status_code=404, detail="Trip not found")
        
        # Ensure valid itinerary structure and fix any remaining issues
        if trip.itinerary is None:
            trip.itinerary = {"status": "pending", "activities": []}
            db.commit()
            db.refresh(trip)
        elif not isinstance(trip.itinerary, dict):
            logger.warning(f"Trip {trip.id} has invalid itinerary data: {trip.itinerary}")
            trip.itinerary = {"status": "error", "activities": [], "error": "Invalid data"}
            db.commit()
            db.refresh(trip)
        elif isinstance(trip.itinerary, dict):
            # Ensure required fields exist
            if "status" not in trip.itinerary:
                trip.itinerary["status"] = "completed"
                db.commit()
                db.refresh(trip)
            if "activities" not in trip.itinerary:
                trip.itinerary["activities"] = []
                db.commit()
                db.refresh(trip)
            
        logger.info(f"Returning trip {trip_id} with itinerary status: {trip.itinerary.get('status', 'unknown')}")
        return trip
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reading trip {trip_id}: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="Error retrieving trip"
        )

@router.put("/{trip_id}", response_model=models.Trip)
def update_trip(
    trip_id: int, 
    trip: models.TripUpdate, 
    db: Session = Depends(get_db),
    current_user: models.DBUser = Depends(get_current_active_user)
):
    try:
        db_trip = db.query(models.DBTrip).filter(
            models.DBTrip.id == trip_id, 
            models.DBTrip.owner_id == current_user.id
        ).first()
        
        if db_trip is None:
            raise HTTPException(status_code=404, detail="Trip not found")
        
        # Validate update data
        trip_data = trip.dict(exclude_unset=True)
        
        # Validate dates if provided
        if 'start_date' in trip_data and 'end_date' in trip_data:
            if trip_data['start_date'] >= trip_data['end_date']:
                raise HTTPException(
                    status_code=400, 
                    detail="End date must be after start date"
                )
        elif 'start_date' in trip_data and db_trip.end_date:
            if trip_data['start_date'] >= db_trip.end_date:
                raise HTTPException(
                    status_code=400, 
                    detail="Start date must be before existing end date"
                )
        elif 'end_date' in trip_data and db_trip.start_date:
            if db_trip.start_date >= trip_data['end_date']:
                raise HTTPException(
                    status_code=400, 
                    detail="End date must be after existing start date"
                )
        
        # Update trip fields
        for key, value in trip_data.items():
            if key == 'itinerary' and value is not None:
                if not isinstance(value, dict):
                    raise HTTPException(
                        status_code=400, 
                        detail="Itinerary must be a valid JSON object"
                    )
            setattr(db_trip, key, value)
        
        db.commit()
        db.refresh(db_trip)
        return db_trip
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating trip {trip_id}: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=500, 
            detail="Error updating trip"
        )

@router.delete("/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_trip(
    trip_id: int, 
    db: Session = Depends(get_db),
    current_user: models.DBUser = Depends(get_current_active_user)
):
    try:
        db_trip = db.query(models.DBTrip).filter(
            models.DBTrip.id == trip_id, 
            models.DBTrip.owner_id == current_user.id
        ).first()
        
        if db_trip is None:
            raise HTTPException(status_code=404, detail="Trip not found")
        
        db.delete(db_trip)
        db.commit()
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting trip {trip_id}: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=500, 
            detail="Error deleting trip"
        )

# Add endpoint to manually trigger itinerary generation
@router.post("/{trip_id}/generate-itinerary", response_model=models.Trip)
async def generate_trip_itinerary(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: models.DBUser = Depends(get_current_active_user)
):
    try:
        # Get the trip
        trip = db.query(models.DBTrip).filter(
            models.DBTrip.id == trip_id,
            models.DBTrip.owner_id == current_user.id
        ).first()
        
        if not trip:
            raise HTTPException(status_code=404, detail="Trip not found")
        
        # Set generating status
        trip.itinerary = {"status": "generating", "activities": []}
        db.commit()
        
        # Get user preferences
        preferences = db.query(models.DBPreference).filter(
            models.DBPreference.user_id == current_user.id
        ).all()
        
        try:
            # Call itinerary service with CORRECT parameters
            status_code, itinerary = await itinerary_service.generate_itinerary(
                str(trip_id),  # trip_id as string
                trip.destination,
                str(trip.start_date),
                str(trip.end_date),
                [{"category": p.category, "value": p.value, "weight": p.weight} for p in preferences],
                trip.budget
            )
            
            if status_code == 200 and itinerary and isinstance(itinerary, dict):
                trip.itinerary = itinerary
            elif status_code == 202:
                trip.itinerary = {"status": "generating", "activities": [], "message": "Generation in progress"}
            else:
                raise ValueError(f"Service returned status {status_code}: {itinerary}")
                
        except Exception as e:
            logger.error(f"Itinerary generation failed: {str(e)}")
            trip.itinerary = {
                "status": "error",
                "activities": [],
                "error": f"Failed to generate: {str(e)}"
            }
        
        db.commit()
        db.refresh(trip)
        return trip
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating itinerary: {str(e)}")
        raise HTTPException(status_code=500, detail="Error generating itinerary")

async def generate_and_save_itinerary(
    trip_id: str,  # Now correctly accepts trip_id as first parameter
    destination: str,
    start_date: str,
    end_date: str,
    preferences: List[dict],
    budget: Optional[float]
):
    """Background task to generate and save itinerary with CORRECT service call"""
    from database import SessionLocal
    db = SessionLocal()
    
    try:
        logger.info(f"🔍 DEBUG: Starting itinerary generation for trip {trip_id}")
        logger.info(f"🔍 DEBUG: Parameters - trip_id: {trip_id}, destination: {destination}")
        
        # Set generating status
        db_trip = db.query(models.DBTrip).filter(models.DBTrip.id == int(trip_id)).first()
        if not db_trip:
            logger.error(f"Trip {trip_id} not found")
            return
            
        db_trip.itinerary = {"status": "generating", "activities": []}
        db.commit()
        
        # Call service with CORRECT parameters and handle response
        try:
            status_code, itinerary = await itinerary_service.generate_itinerary(
                trip_id,  # trip_id as string (correct)
                destination,
                start_date,
                end_date,
                preferences,
                budget
            )
            
            logger.info(f"Itinerary service returned status {status_code} for trip {trip_id}")
            
            if status_code == 200 and itinerary and isinstance(itinerary, dict):
                db_trip.itinerary = itinerary
                logger.info(f"Successfully saved itinerary for trip {trip_id}")
            elif status_code == 202:
                db_trip.itinerary = {"status": "generating", "activities": [], "message": "Still processing"}
                logger.info(f"Itinerary generation still in progress for trip {trip_id}")
            else:
                raise Exception(f"Service returned {status_code}: {itinerary}")
                
        except Exception as e:
            logger.error(f"Itinerary generation failed for trip {trip_id}: {str(e)}")
            db_trip.itinerary = {
                "status": "error", 
                "activities": [], 
                "error": f"Generation failed: {str(e)[:200]}"
            }
        
        db.commit()
        
    except Exception as e:
        logger.error(f"Background task failed for trip {trip_id}: {str(e)}")
    finally:
        db.close()