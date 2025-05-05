from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from sqlalchemy import or_

import models
from database import get_db
from auth import get_current_active_user

router = APIRouter(
    prefix="/locations",
    tags=["locations"],
    responses={404: {"description": "Not found"}},
)

@router.post("/", response_model=models.Location, status_code=status.HTTP_201_CREATED)
def create_location(
    location: models.LocationCreate, 
    db: Session = Depends(get_db),
    current_user: models.DBUser = Depends(get_current_active_user)
):
    """Create a new location (admin only in a real app)"""
    # In a real app, check if user is admin
    db_location = models.DBLocation(**location.dict())
    db.add(db_location)
    db.commit()
    db.refresh(db_location)
    return db_location

@router.get("/", response_model=List[models.Location])
def read_locations(
    skip: int = 0, 
    limit: int = 100,
    search: Optional[str] = None,
    country: Optional[str] = None,
    popular: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """
    Get all locations with optional filtering.
    This endpoint doesn't require authentication since location data is public.
    """
    query = db.query(models.DBLocation)
    
    # Apply filters if provided
    if search:
        query = query.filter(
            or_(
                models.DBLocation.name.ilike(f"%{search}%"),
                models.DBLocation.description.ilike(f"%{search}%")
            )
        )
    
    if country:
        query = query.filter(models.DBLocation.country == country)
        
    if popular is not None:
        query = query.filter(models.DBLocation.popular == popular)
    
    # Apply pagination
    locations = query.offset(skip).limit(limit).all()
    return locations

@router.get("/{location_id}", response_model=models.Location)
def read_location(
    location_id: int, 
    db: Session = Depends(get_db)
):
    """Get a specific location by ID"""
    location = db.query(models.DBLocation).filter(models.DBLocation.id == location_id).first()
    if location is None:
        raise HTTPException(status_code=404, detail="Location not found")
    return location

@router.put("/{location_id}", response_model=models.Location)
def update_location(
    location_id: int, 
    location: models.LocationCreate,
    db: Session = Depends(get_db),
    current_user: models.DBUser = Depends(get_current_active_user)
):
    """Update a location (admin only in a real app)"""
    # In a real app, check if user is admin
    db_location = db.query(models.DBLocation).filter(models.DBLocation.id == location_id).first()
    if db_location is None:
        raise HTTPException(status_code=404, detail="Location not found")
    
    # Update location fields
    for key, value in location.dict().items():
        setattr(db_location, key, value)
    
    db.commit()
    db.refresh(db_location)
    return db_location

@router.delete("/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_location(
    location_id: int, 
    db: Session = Depends(get_db),
    current_user: models.DBUser = Depends(get_current_active_user)
):
    """Delete a location (admin only in a real app)"""
    # In a real app, check if user is admin
    db_location = db.query(models.DBLocation).filter(models.DBLocation.id == location_id).first()
    if db_location is None:
        raise HTTPException(status_code=404, detail="Location not found")
    
    db.delete(db_location)
    db.commit()
    return None

@router.get("/countries/list", response_model=List[str])
def get_countries(db: Session = Depends(get_db)):
    """Get a list of all countries that have locations"""
    # Extract distinct countries from the locations table
    countries = [
        country[0] for country in 
        db.query(models.DBLocation.country).distinct().order_by(models.DBLocation.country).all()
    ]
    return countries

@router.get("/popular/list", response_model=List[models.Location])
def get_popular_locations(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """Get a list of popular travel destinations"""
    locations = db.query(models.DBLocation).filter(
        models.DBLocation.popular == True
    ).limit(limit).all()
    return locations