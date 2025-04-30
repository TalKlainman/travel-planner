import requests
import pytest
import time
import os
import json
from datetime import date, timedelta

# Base URL of your API when running in Docker
BASE_URL = "http://localhost:8000"

def test_api_available():
    """Test if the API is available"""
    # Retry logic in case the API is still starting up
    max_retries = 5
    retry_delay = 2  # seconds
    
    for i in range(max_retries):
        try:
            response = requests.get(f"{BASE_URL}/")
            if response.status_code == 200:
                return
        except requests.exceptions.ConnectionError:
            pass
        
        if i < max_retries - 1:
            time.sleep(retry_delay)
    
    # If we get here, we failed to connect
    pytest.fail("Could not connect to API after multiple attempts")

def test_user_registration_and_authentication():
    """Test the complete user flow: register, login, get token"""
    # Register a new user
    user_data = {
        "email": f"testuser_{int(time.time())}@example.com",  # Use timestamp to ensure uniqueness
        "password": "integration_test_password"
    }
    
    register_response = requests.post(f"{BASE_URL}/register", json=user_data)
    assert register_response.status_code == 200
    user = register_response.json()
    assert user["email"] == user_data["email"]
    
    # Login and get token
    login_data = {
        "username": user_data["email"],
        "password": user_data["password"]
    }
    token_response = requests.post(f"{BASE_URL}/token", data=login_data)
    assert token_response.status_code == 200
    token_data = token_response.json()
    assert "access_token" in token_data
    access_token = token_data["access_token"]
    
    # Save token for other tests
    return {
        "Authorization": f"Bearer {access_token}",
        "user_email": user_data["email"]
    }

def test_trip_management_workflow():
    """Test the entire trip management workflow"""
    # Get authentication
    auth_headers = test_user_registration_and_authentication()
    
    # 1. Create a trip
    trip_data = {
        "title": "Integration Test Trip",
        "destination": "Test City, Test Country",
        "start_date": str(date.today() + timedelta(days=30)),
        "end_date": str(date.today() + timedelta(days=37)),
        "budget": 1500.0,
        "description": "This is a test trip created by the integration test"
    }
    
    create_response = requests.post(
        f"{BASE_URL}/trips/", 
        json=trip_data,
        headers=auth_headers
    )
    assert create_response.status_code == 201
    created_trip = create_response.json()
    trip_id = created_trip["id"]
    
    # 2. Get the created trip
    get_response = requests.get(
        f"{BASE_URL}/trips/{trip_id}",
        headers=auth_headers
    )
    assert get_response.status_code == 200
    retrieved_trip = get_response.json()
    assert retrieved_trip["title"] == trip_data["title"]
    
    # 3. Update the trip
    update_data = {
        "title": "Updated Integration Test Trip",
        "budget": 2000.0
    }
    update_response = requests.put(
        f"{BASE_URL}/trips/{trip_id}",
        json=update_data,
        headers=auth_headers
    )
    assert update_response.status_code == 200
    updated_trip = update_response.json()
    assert updated_trip["title"] == update_data["title"]
    assert updated_trip["budget"] == update_data["budget"]
    
    # 4. Get all trips for the user
    list_response = requests.get(
        f"{BASE_URL}/trips/",
        headers=auth_headers
    )
    assert list_response.status_code == 200
    trips = list_response.json()
    assert len(trips) >= 1
    assert any(trip["id"] == trip_id for trip in trips)
    
    # 5. Delete the trip
    delete_response = requests.delete(
        f"{BASE_URL}/trips/{trip_id}",
        headers=auth_headers
    )
    assert delete_response.status_code == 204
    
    # 6. Verify trip is deleted
    verify_response = requests.get(
        f"{BASE_URL}/trips/{trip_id}",
        headers=auth_headers
    )
    assert verify_response.status_code == 404

def test_preferences_workflow():
    """Test the user preferences workflow"""
    # Get authentication
    auth_headers = test_user_registration_and_authentication()
    
    # 1. Create preferences
    preferences = [
        {"category": "Food", "value": "Italian", "weight": 9},
        {"category": "Accommodation", "value": "Boutique Hotel", "weight": 8},
        {"category": "Activities", "value": "Sightseeing", "weight": 7}
    ]
    
    created_prefs = []
    for pref in preferences:
        response = requests.post(
            f"{BASE_URL}/preferences/",
            json=pref,
            headers=auth_headers
        )
        assert response.status_code == 201
        created_pref = response.json()
        assert created_pref["category"] == pref["category"]
        assert created_pref["value"] == pref["value"]
        created_prefs.append(created_pref)
    
    # 2. Get all preferences
    list_response = requests.get(
        f"{BASE_URL}/preferences/",
        headers=auth_headers
    )
    assert list_response.status_code == 200
    prefs = list_response.json()
    assert len(prefs) >= len(preferences)
    
    # 3. Filter preferences by category
    category_response = requests.get(
        f"{BASE_URL}/preferences/by-category/Food",
        headers=auth_headers
    )
    assert category_response.status_code == 200
    food_prefs = category_response.json()
    assert len(food_prefs) >= 1
    assert all(pref["category"] == "Food" for pref in food_prefs)
    
    # 4. Update a preference
    food_pref_id = next(pref["id"] for pref in food_prefs)
    update_data = {
        "category": "Food",
        "value": "French",
        "weight": 10
    }
    update_response = requests.put(
        f"{BASE_URL}/preferences/{food_pref_id}",
        json=update_data,
        headers=auth_headers
    )
    assert update_response.status_code == 200
    updated_pref = update_response.json()
    assert updated_pref["value"] == "French"
    assert updated_pref["weight"] == 10
    
    # 5. Clean up - delete all created preferences
    for pref in created_prefs:
        delete_response = requests.delete(
            f"{BASE_URL}/preferences/{pref['id']}",
            headers=auth_headers
        )
        assert delete_response.status_code == 204

def test_locations_integration():
    """Test the locations endpoints"""
    # 1. Get all locations (public endpoint, no auth needed)
    list_response = requests.get(f"{BASE_URL}/locations/")
    assert list_response.status_code == 200
    locations = list_response.json()
    
    # We should have some locations from the test data
    # but in integration testing against a running server, 
    # we don't control the initial DB state, so just check format
    assert isinstance(locations, list)
    if locations:
        assert "name" in locations[0]
        assert "country" in locations[0]
        assert "lat" in locations[0]
        assert "lng" in locations[0]
    
    # 2. Get popular locations
    popular_response = requests.get(f"{BASE_URL}/locations/popular/list")
    assert popular_response.status_code == 200
    popular = popular_response.json()
    assert isinstance(popular, list)
    if popular:
        assert all(loc["popular"] for loc in popular)
    
    # 3. Get countries list
    countries_response = requests.get(f"{BASE_URL}/locations/countries/list")
    assert countries_response.status_code == 200
    countries = countries_response.json()
    assert isinstance(countries, list)
    
    # 4. Add a new location (requires auth)
    auth_headers = test_user_registration_and_authentication()
    
    location_data = {
        "name": "Barcelona",
        "country": "Spain",
        "description": "Vibrant city with amazing architecture",
        "lat": 41.3851,
        "lng": 2.1734,
        "image_url": "https://example.com/barcelona.jpg"
    }
    
    create_response = requests.post(
        f"{BASE_URL}/locations/",
        json=location_data,
        headers=auth_headers
    )
    assert create_response.status_code == 201
    created_location = create_response.json()
    assert created_location["name"] == location_data["name"]
    location_id = created_location["id"]
    
    # 5. Get the created location (public endpoint)
    get_response = requests.get(f"{BASE_URL}/locations/{location_id}")
    assert get_response.status_code == 200
    retrieved_location = get_response.json()
    assert retrieved_location["name"] == location_data["name"]
    assert retrieved_location["country"] == location_data["country"]

def test_end_to_end_trip_planning():
    """Test a complete trip planning workflow with all components"""
    # Get authentication
    auth_headers = test_user_registration_and_authentication()
    
    # 1. Set user preferences
    preferences = [
        {"category": "Food", "value": "Local Cuisine", "weight": 10},
        {"category": "Accommodation", "value": "Mid-range Hotel", "weight": 7},
        {"category": "Activities", "value": "Cultural", "weight": 9},
        {"category": "Budget", "value": "Moderate", "weight": 8}
    ]
    
    for pref in preferences:
        requests.post(f"{BASE_URL}/preferences/", json=pref, headers=auth_headers)
    
    # 2. Get available locations
    locations_response = requests.get(f"{BASE_URL}/locations/")
    locations = locations_response.json()
    
    # If we have locations, pick one for our trip
    if locations:
        destination = locations[0]["name"] + ", " + locations[0]["country"]
    else:
        destination = "Paris, France"  # Default if no locations in DB
    
    # 3. Create a trip
    today = date.today()
    trip_data = {
        "title": "E2E Test Vacation",
        "destination": destination,
        "start_date": str(today + timedelta(days=45)),
        "end_date": str(today + timedelta(days=52)),
        "budget": 2500.0,
        "description": "End-to-end test trip for integration testing"
    }
    
    trip_response = requests.post(f"{BASE_URL}/trips/", json=trip_data, headers=auth_headers)
    assert trip_response.status_code == 201
    trip = trip_response.json()
    trip_id = trip["id"]
    
    # 4. Update trip with an itinerary 
    # In a real application, this would come from the itinerary generator microservice
    itinerary = {
        "days": [
            {
                "day": 1,
                "activities": [
                    {"time": "09:00", "activity": "Breakfast at hotel", "cost": 20},
                    {"time": "10:30", "activity": "Visit main attractions", "cost": 50},
                    {"time": "13:00", "activity": "Lunch at local restaurant", "cost": 30},
                    {"time": "15:00", "activity": "Museum tour", "cost": 25},
                    {"time": "19:00", "activity": "Dinner", "cost": 40}
                ]
            },
            {
                "day": 2,
                "activities": [
                    {"time": "09:00", "activity": "Breakfast at hotel", "cost": 20},
                    {"time": "10:00", "activity": "Day trip to nearby town", "cost": 100},
                    {"time": "19:00", "activity": "Dinner", "cost": 45}
                ]
            }
        ],
        "totalCost": 330
    }
    
    update_data = {
        "itinerary": itinerary
    }
    
    update_response = requests.put(f"{BASE_URL}/trips/{trip_id}", json=update_data, headers=auth_headers)
    assert update_response.status_code == 200
    updated_trip = update_response.json()
    assert "itinerary" in updated_trip
    assert updated_trip["itinerary"]["totalCost"] == 330
    
    # 5. Verify the final trip with itinerary
    get_response = requests.get(f"{BASE_URL}/trips/{trip_id}", headers=auth_headers)
    assert get_response.status_code == 200
    final_trip = get_response.json()
    assert final_trip["title"] == trip_data["title"]
    assert final_trip["destination"] == trip_data["destination"]
    assert "itinerary" in final_trip
    assert len(final_trip["itinerary"]["days"]) == 2
    
    # Clean up - delete the trip
    delete_response = requests.delete(f"{BASE_URL}/trips/{trip_id}", headers=auth_headers)
    assert delete_response.status_code == 204

def test_unauthorized_access():
    """Test that unauthorized access is properly handled"""
    # 1. Try to access trips without authentication
    response = requests.get(f"{BASE_URL}/trips/")
    assert response.status_code == 401
    
    # 2. Try to access preferences without authentication
    response = requests.get(f"{BASE_URL}/preferences/")
    assert response.status_code == 401
    
    # 3. Try to create a trip without authentication
    trip_data = {
        "title": "Unauthorized Trip",
        "destination": "Nowhere",
        "start_date": str(date.today()),
        "end_date": str(date.today() + timedelta(days=5)),
        "budget": 0
    }
    response = requests.post(f"{BASE_URL}/trips/", json=trip_data)
    assert response.status_code == 401
    
    # 4. Verify public endpoints still accessible
    response = requests.get(f"{BASE_URL}/")
    assert response.status_code == 200
    
    response = requests.get(f"{BASE_URL}/locations/")
    assert response.status_code == 200

def test_invalid_data_handling():
    """Test how the API handles invalid data"""
    # Get authentication
    auth_headers = test_user_registration_and_authentication()
    
    # 1. Test invalid trip data (end date before start date)
    invalid_trip = {
        "title": "Invalid Trip",
        "destination": "Nowhere",
        "start_date": str(date.today() + timedelta(days=10)),
        "end_date": str(date.today() + timedelta(days=5)),  # Before start date
        "budget": 1000
    }
    response = requests.post(f"{BASE_URL}/trips/", json=invalid_trip, headers=auth_headers)
    # FastAPI should validate this with pydantic, but we haven't added this validation yet
    # For now, just check that we don't get a 500 error
    assert response.status_code != 500
    
    # 2. Test invalid preference weight (outside range 1-10)
    invalid_pref = {
        "category": "Invalid",
        "value": "Test",
        "weight": 15  # Should be 1-10
    }
    response = requests.post(f"{BASE_URL}/preferences/", json=invalid_pref, headers=auth_headers)
    # Again, should be validated by pydantic
    assert response.status_code == 422  # Unprocessable Entity
    
    # 3. Try to access a non-existent trip
    response = requests.get(f"{BASE_URL}/trips/999999", headers=auth_headers)
    assert response.status_code == 404
    
    # 4. Try to update a non-existent trip
    update_data = {"title": "Updated Title"}
    response = requests.put(f"{BASE_URL}/trips/999999", json=update_data, headers=auth_headers)
    assert response.status_code == 404

if __name__ == "__main__":
    # If run directly, execute all tests
    test_api_available()
    print("API is available")
    
    auth_data = test_user_registration_and_authentication()
    print("Authentication works")
    
    test_trip_management_workflow()
    print("Trip management workflow works")
    
    test_preferences_workflow()
    print("Preferences workflow works")
    
    test_locations_integration()
    print("Locations integration works")
    
    test_end_to_end_trip_planning()
    print("End-to-end trip planning works")
    
    test_unauthorized_access()
    print("Unauthorized access properly handled")
    
    test_invalid_data_handling()
    print("Invalid data handling works")
    
    print("All integration tests passed successfully!")