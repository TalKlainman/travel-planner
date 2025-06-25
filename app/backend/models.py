from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, Date, Text, JSON
from sqlalchemy.orm import relationship
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
from datetime import date
from database import Base

class DBUser(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    
    trips = relationship("DBTrip", back_populates="owner")
    preferences = relationship("DBPreference", back_populates="user")

class DBTrip(Base):
    __tablename__ = "trips"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    destination = Column(String, index=True)
    start_date = Column(Date)
    end_date = Column(Date)
    budget = Column(Float)
    description = Column(Text)
    itinerary = Column(JSON, default=None)  # Store the itinerary as JSON
    owner_id = Column(Integer, ForeignKey("users.id"))
    
    owner = relationship("DBUser", back_populates="trips")

class DBPreference(Base):
    __tablename__ = "preferences"
    
    id = Column(Integer, primary_key=True, index=True)
    category = Column(String, index=True)  # E.g., "Food", "Adventure", "Culture"
    value = Column(String)  # E.g., "Italian", "Hiking", "Museums"
    weight = Column(Integer)  # Importance from 1-10
    user_id = Column(Integer, ForeignKey("users.id"))
    
    user = relationship("DBUser", back_populates="preferences")

class DBLocation(Base):
    __tablename__ = "locations"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    country = Column(String, index=True)
    description = Column(Text)
    lat = Column(Float)
    lng = Column(Float)
    popular = Column(Boolean, default=False)
    image_url = Column(String, nullable=True)

# Pydantic Models (for API)
class UserBase(BaseModel):
    email: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_active: bool
    
    class Config:
        orm_mode = True

class PreferenceBase(BaseModel):
    category: str
    value: str
    weight: int = Field(ge=1, le=10)

class PreferenceCreate(PreferenceBase):
    pass

class Preference(PreferenceBase):
    id: int
    user_id: int
    
    class Config:
        orm_mode = True

class TripBase(BaseModel):
    title: str
    destination: str
    start_date: date
    end_date: date
    budget: Optional[float] = None
    description: Optional[str] = None
    
    @validator('end_date')
    def end_date_must_be_after_start_date(cls, v, values):
        if 'start_date' in values and v <= values['start_date']:
            raise ValueError('end_date must be after start_date')
        return v
    
    @validator('title')
    def title_must_not_be_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('title cannot be empty')
        return v.strip()
    
    @validator('destination')
    def destination_must_not_be_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('destination cannot be empty')
        return v.strip()

class TripCreate(TripBase):
    pass

class TripUpdate(BaseModel):
    title: Optional[str] = None
    destination: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget: Optional[float] = None
    description: Optional[str] = None
    itinerary: Optional[Dict[str, Any]] = None
    
    @validator('title')
    def title_must_not_be_empty(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('title cannot be empty')
        return v.strip() if v else v
    
    @validator('destination')
    def destination_must_not_be_empty(cls, v):
        if v is not None and (not v or not v.strip()):
            raise ValueError('destination cannot be empty')
        return v.strip() if v else v
    
    @validator('itinerary')
    def itinerary_must_be_dict(cls, v):
        if v is not None and not isinstance(v, dict):
            raise ValueError('itinerary must be a valid JSON object')
        return v

class Trip(TripBase):
    id: int
    owner_id: int
    itinerary: Optional[Dict[str, Any]] = None
    
    @validator('itinerary', pre=True)
    def ensure_itinerary_is_dict_or_none(cls, v):
        """Ensure itinerary is always a dict or None, never invalid data"""
        if v is None:
            return None
        if isinstance(v, dict):
            return v
        if isinstance(v, (list, tuple)) and len(v) == 2:
            # Handle error responses like [422, {...}] that got stored incorrectly
            return {"status": "error", "activities": [], "error": "Invalid data format"}
        # For any other invalid format
        return {"status": "error", "activities": [], "error": "Corrupted data"}
    
    class Config:
        orm_mode = True

class LocationBase(BaseModel):
    name: str
    country: str
    description: Optional[str] = None
    lat: float
    lng: float
    image_url: Optional[str] = None

class LocationCreate(LocationBase):
    pass

class Location(LocationBase):
    id: int
    popular: bool
    
    class Config:
        orm_mode = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    
    class Config:
        orm_mode = True

# Additional models for better error handling
class ErrorResponse(BaseModel):
    detail: str
    error_code: Optional[str] = None

class ItineraryStatus(BaseModel):
    status: str  # "pending", "generating", "completed", "error"
    activities: List[Dict[str, Any]] = []
    error: Optional[str] = None
    progress: Optional[int] = None  # 0-100 percentage