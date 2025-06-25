from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

import models
from database import get_db
from auth import get_current_active_user

router = APIRouter(
    prefix="/preferences",
    tags=["preferences"],
    responses={404: {"description": "Not found"}},
)

@router.post("/", response_model=models.Preference, status_code=status.HTTP_201_CREATED)
def create_preference(
    preference: models.PreferenceCreate, 
    db: Session = Depends(get_db),
    current_user: models.DBUser = Depends(get_current_active_user)
):
    """Create a new preference for the authenticated user"""
    db_preference = models.DBPreference(**preference.dict(), user_id=current_user.id)
    db.add(db_preference)
    db.commit()
    db.refresh(db_preference)
    return db_preference

@router.get("/", response_model=List[models.Preference])
def read_preferences(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: models.DBUser = Depends(get_current_active_user)
):
    """Get all preferences for the authenticated user"""
    preferences = db.query(models.DBPreference).filter(
        models.DBPreference.user_id == current_user.id
    ).offset(skip).limit(limit).all()
    return preferences

@router.get("/{preference_id}", response_model=models.Preference)
def read_preference(
    preference_id: int, 
    db: Session = Depends(get_db),
    current_user: models.DBUser = Depends(get_current_active_user)
):
    """Get a specific preference by ID"""
    preference = db.query(models.DBPreference).filter(
        models.DBPreference.id == preference_id,
        models.DBPreference.user_id == current_user.id
    ).first()
    if preference is None:
        raise HTTPException(status_code=404, detail="Preference not found")
    return preference

@router.put("/{preference_id}", response_model=models.Preference)
def update_preference(
    preference_id: int, 
    preference: models.PreferenceCreate,  # Using PreferenceCreate as update model
    db: Session = Depends(get_db),
    current_user: models.DBUser = Depends(get_current_active_user)
):
    """Update a preference"""
    db_preference = db.query(models.DBPreference).filter(
        models.DBPreference.id == preference_id,
        models.DBPreference.user_id == current_user.id
    ).first()
    if db_preference is None:
        raise HTTPException(status_code=404, detail="Preference not found")
    
    # Update preference fields
    for key, value in preference.dict().items():
        setattr(db_preference, key, value)
    
    db.commit()
    db.refresh(db_preference)
    return db_preference

@router.delete("/{preference_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_preference(
    preference_id: int, 
    db: Session = Depends(get_db),
    current_user: models.DBUser = Depends(get_current_active_user)
):
    """Delete a preference"""
    db_preference = db.query(models.DBPreference).filter(
        models.DBPreference.id == preference_id,
        models.DBPreference.user_id == current_user.id
    ).first()
    if db_preference is None:
        raise HTTPException(status_code=404, detail="Preference not found")
    
    db.delete(db_preference)
    db.commit()
    return None

@router.get("/by-category/{category}", response_model=List[models.Preference])
def read_preferences_by_category(
    category: str,
    db: Session = Depends(get_db),
    current_user: models.DBUser = Depends(get_current_active_user)
):
    """Get all preferences for a specific category"""
    preferences = db.query(models.DBPreference).filter(
        models.DBPreference.user_id == current_user.id,
        models.DBPreference.category == category
    ).all()
    return preferences