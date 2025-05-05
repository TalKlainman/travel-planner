from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, Date, Text, JSON
from sqlalchemy.orm import relationship
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import date
from database import Base

# SQLAlchemy Models (for database)
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
    itinerary = Column(JSON)  # Store the itinerary as JSON
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

class Trip(TripBase):
    id: int
    owner_id: int
    itinerary: Optional[Dict[str, Any]] = None
    
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

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    
    class Config:
        orm_mode = True