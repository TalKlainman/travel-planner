import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import date, timedelta
import os

from main import app
from database import Base, get_db
import models
from auth import get_password_hash

# Create test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def test_db():
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    # Create test data
    db = TestingSessionLocal()
    
    # Add a test user
    hashed_password = get_password_hash("testpassword")
    test_user = models.DBUser(email="test@example.com", hashed_password=hashed_password)
    db.add(test_user)
    db.commit()
    
    # Add some test locations
    locations = [
        models.DBLocation(
            name="Paris", 
            country="France",
            description="City of lights",
            lat=48.8566,
            lng=2.3522,
            popular=True,
            image_url="https://example.com/paris.jpg"
        ),
        models.DBLocation(
            name="London", 
            country="United Kingdom",
            description="Historic city on the Thames",
            lat=51.5074,
            lng=-0.1278,
            popular=True,
            image_url="https://example.com/london.jpg"
        ),
        models.DBLocation(
            name="Tokyo", 
            country="Japan",
            description="Modern and traditional Japanese capital",
            lat=35.6762,
            lng=139.6503,
            popular=True,
            image_url="https://example.com/tokyo.jpg"
        )
    ]
    for location in locations:
        db.add(location)
    
    db.commit()
    db.close()
    
    # Run tests
    yield
    
    # Clean up - properly close all connections before removing file
    try:
        # Close any lingering connections
        db = TestingSessionLocal()
        db.close()
        
        # Dispose of engine to close all connections
        engine.dispose()
        
        # Drop all tables
        Base.metadata.drop_all(bind=engine)
        
        # Try to remove the file, but don't fail if we can't
        if os.path.exists("./test.db"):
            try:
                os.remove("./test.db")
            except PermissionError:
                print("Warning: Could not remove test.db file - it may be in use")
    except Exception as e:
        print(f"Error during test cleanup: {e}")

@pytest.fixture
def client(test_db):
    def override_get_db():
        try:
            db = TestingSessionLocal()
            yield db
        finally:
            db.close()
    
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides = {}

@pytest.fixture
def auth_headers(client):
    """Get authentication headers for test user"""
    login_data = {
        "username": "test@example.com",
        "password": "testpassword"
    }
    response = client.post("/token", data=login_data)
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def user_id(client, auth_headers):
    """Get the user_id of the test user"""
    # In real application, you would decode the JWT token
    # For simplicity, we'll just get the user from the database
    db = TestingSessionLocal()
    user = db.query(models.DBUser).filter(models.DBUser.email == "test@example.com").first()
    db.close()
    return user.id

# Auth Tests
def test_login(client):
    """Test user login and token generation"""
    login_data = {
        "username": "test@example.com",
        "password": "testpassword"
    }
    response = client.post("/token", data=login_data)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_register_user(client):
    """Test user registration"""
    user_data = {
        "email": "newuser@example.com",
        "password": "newpassword123"
    }
    response = client.post("/register", json=user_data)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == user_data["email"]
    assert "id" in data

def test_register_duplicate_email(client):
    """Test registration with an email that already exists"""
    user_data = {
        "email": "test@example.com",  # This email already exists
        "password": "password123"
    }
    response = client.post("/register", json=user_data)
    assert response.status_code == 400
    assert "Email already registered" in response.json()["detail"]

# Trip Tests
def test_create_trip(client, auth_headers):
    """Test creating a new trip"""
    trip_data = {
        "title": "Paris Vacation",
        "destination": "Paris, France",
        "start_date": str(date.today() + timedelta(days=30)),
        "end_date": str(date.today() + timedelta(days=37)),
        "budget": 2000.0,
        "description": "A romantic week in Paris"
    }
    
    response = client.post("/trips/", json=trip_data, headers=auth_headers)
    
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == trip_data["title"]
    assert data["destination"] == trip_data["destination"]
    assert "id" in data

def test_get_trips(client, auth_headers):
    """Test getting all trips for a user"""
    # First create a trip
    trip_data = {
        "title": "Tokyo Adventure",
        "destination": "Tokyo, Japan",
        "start_date": str(date.today() + timedelta(days=60)),
        "end_date": str(date.today() + timedelta(days=70)),
        "budget": 3000.0,
        "description": "Exploring Tokyo"
    }
    client.post("/trips/", json=trip_data, headers=auth_headers)
    
    # Get trips
    response = client.get("/trips/", headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    assert any(trip["title"] == "Tokyo Adventure" for trip in data)

def test_get_trip_by_id(client, auth_headers):
    """Test getting a specific trip by ID"""
    # First create a trip
    trip_data = {
        "title": "London Weekend",
        "destination": "London, UK",
        "start_date": str(date.today() + timedelta(days=15)),
        "end_date": str(date.today() + timedelta(days=17)),
        "budget": 1000.0,
        "description": "Weekend in London"
    }
    create_response = client.post("/trips/", json=trip_data, headers=auth_headers)
    trip_id = create_response.json()["id"]
    
    # Get the trip
    response = client.get(f"/trips/{trip_id}", headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == trip_data["title"]
    assert data["id"] == trip_id

def test_update_trip(client, auth_headers):
    """Test updating a trip"""
    # First create a trip
    trip_data = {
        "title": "Beach Vacation",
        "destination": "Bali, Indonesia",
        "start_date": str(date.today() + timedelta(days=90)),
        "end_date": str(date.today() + timedelta(days=100)),
        "budget": 2500.0,
        "description": "Relaxing in Bali"
    }
    create_response = client.post("/trips/", json=trip_data, headers=auth_headers)
    trip_id = create_response.json()["id"]
    
    # Update the trip
    update_data = {
        "title": "Bali Adventure",
        "budget": 3000.0
    }
    response = client.put(f"/trips/{trip_id}", json=update_data, headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == update_data["title"]
    assert data["budget"] == update_data["budget"]
    assert data["destination"] == trip_data["destination"]  # Unchanged field

def test_delete_trip(client, auth_headers):
    """Test deleting a trip"""
    # First create a trip
    trip_data = {
        "title": "Mountain Retreat",
        "destination": "Swiss Alps",
        "start_date": str(date.today() + timedelta(days=120)),
        "end_date": str(date.today() + timedelta(days=127)),
        "budget": 4000.0,
        "description": "Hiking in the Alps"
    }
    create_response = client.post("/trips/", json=trip_data, headers=auth_headers)
    trip_id = create_response.json()["id"]
    
    # Delete the trip
    response = client.delete(f"/trips/{trip_id}", headers=auth_headers)
    assert response.status_code == 204
    
    # Verify it's gone
    get_response = client.get(f"/trips/{trip_id}", headers=auth_headers)
    assert get_response.status_code == 404

# Preference Tests
def test_create_preference(client, auth_headers):
    """Test creating a user preference"""
    pref_data = {
        "category": "Food",
        "value": "Italian",
        "weight": 8
    }
    
    response = client.post("/preferences/", json=pref_data, headers=auth_headers)
    
    assert response.status_code == 201
    data = response.json()
    assert data["category"] == pref_data["category"]
    assert data["value"] == pref_data["value"]
    assert data["weight"] == pref_data["weight"]
    assert "id" in data

def test_get_preferences(client, auth_headers):
    """Test getting all preferences for a user"""
    # First create some preferences
    preferences = [
        {"category": "Accommodation", "value": "Hotel", "weight": 7},
        {"category": "Activities", "value": "Museums", "weight": 9},
        {"category": "Food", "value": "Local Cuisine", "weight": 10}
    ]
    
    for pref in preferences:
        client.post("/preferences/", json=pref, headers=auth_headers)
    
    # Get preferences
    response = client.get("/preferences/", headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= len(preferences)
    assert any(p["category"] == "Activities" and p["value"] == "Museums" for p in data)

def test_get_preference_by_id(client, auth_headers):
    """Test getting a specific preference by ID"""
    # First create a preference
    pref_data = {
        "category": "Budget",
        "value": "Luxury",
        "weight": 6
    }
    create_response = client.post("/preferences/", json=pref_data, headers=auth_headers)
    pref_id = create_response.json()["id"]
    
    # Get the preference
    response = client.get(f"/preferences/{pref_id}", headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["category"] == pref_data["category"]
    assert data["value"] == pref_data["value"]
    assert data["id"] == pref_id

def test_update_preference(client, auth_headers):
    """Test updating a preference"""
    # First create a preference
    pref_data = {
        "category": "Climate",
        "value": "Warm",
        "weight": 5
    }
    create_response = client.post("/preferences/", json=pref_data, headers=auth_headers)
    pref_id = create_response.json()["id"]
    
    # Update the preference
    update_data = {
        "category": "Climate",
        "value": "Tropical",
        "weight": 7
    }
    response = client.put(f"/preferences/{pref_id}", json=update_data, headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["value"] == update_data["value"]
    assert data["weight"] == update_data["weight"]

def test_delete_preference(client, auth_headers):
    """Test deleting a preference"""
    # First create a preference
    pref_data = {
        "category": "Transportation",
        "value": "Train",
        "weight": 8
    }
    create_response = client.post("/preferences/", json=pref_data, headers=auth_headers)
    pref_id = create_response.json()["id"]
    
    # Delete the preference
    response = client.delete(f"/preferences/{pref_id}", headers=auth_headers)
    assert response.status_code == 204
    
    # Verify it's gone
    get_response = client.get(f"/preferences/{pref_id}", headers=auth_headers)
    assert get_response.status_code == 404

# Location Tests
def test_get_locations(client):
    """Test getting locations (no auth required)"""
    response = client.get("/locations/")
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 3  # We added 3 test locations
    assert any(loc["name"] == "Paris" for loc in data)
    assert any(loc["name"] == "London" for loc in data)
    assert any(loc["name"] == "Tokyo" for loc in data)

def test_get_location_by_id(client):
    """Test getting a specific location by ID"""
    # First get all locations to find an ID
    response = client.get("/locations/")
    locations = response.json()
    location_id = next(loc["id"] for loc in locations if loc["name"] == "Paris")
    
    # Get the location by ID
    response = client.get(f"/locations/{location_id}")
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Paris"
    assert data["country"] == "France"

def test_create_location(client, auth_headers):
    """Test creating a new location (requires auth)"""
    location_data = {
        "name": "Rome",
        "country": "Italy",
        "description": "Eternal city with ancient ruins",
        "lat": 41.9028,
        "lng": 12.4964,
        "image_url": "https://example.com/rome.jpg"
    }
    
    response = client.post("/locations/", json=location_data, headers=auth_headers)
    
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == location_data["name"]
    assert data["country"] == location_data["country"]
    assert data["lat"] == location_data["lat"]
    assert "id" in data

def test_update_location(client, auth_headers):
    """Test updating a location (requires auth)"""
    # First get all locations to find an ID
    response = client.get("/locations/")
    locations = response.json()
    location_id = next(loc["id"] for loc in locations if loc["name"] == "London")
    
    # Update the location
    update_data = {
        "name": "London",
        "country": "United Kingdom",
        "description": "Updated description: Capital of England",
        "lat": 51.5074,
        "lng": -0.1278,
        "image_url": "https://example.com/london_updated.jpg"
    }
    response = client.put(f"/locations/{location_id}", json=update_data, headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["description"] == update_data["description"]
    assert data["image_url"] == update_data["image_url"]

def test_get_popular_locations(client):
    """Test getting popular locations"""
    response = client.get("/locations/popular/list")
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 3  # All our test locations are marked as popular
    assert all(loc["popular"] for loc in data)

def test_get_countries_list(client):
    """Test getting list of countries"""
    response = client.get("/locations/countries/list")
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 3  # We have locations from 3 different countries
    assert "France" in data
    assert "United Kingdom" in data
    assert "Japan" in data

def test_unauthenticated_access(client):
    """Test that protected endpoints reject unauthenticated access"""
    # Try to create a trip without authentication
    trip_data = {
        "title": "Unauthorized Trip",
        "destination": "Nowhere",
        "start_date": str(date.today()),
        "end_date": str(date.today() + timedelta(days=1)),
        "budget": 0
    }
    response = client.post("/trips/", json=trip_data)
    assert response.status_code == 401
    
    # Try to get trips without authentication
    response = client.get("/trips/")
    assert response.status_code == 401
    
    # Try to create a preference without authentication
    pref_data = {
        "category": "Unauthorized",
        "value": "Nothing",
        "weight": 1
    }
    response = client.post("/preferences/", json=pref_data)
    assert response.status_code == 401