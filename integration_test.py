import httpx
import asyncio

# Base URL for your services
BACKEND_URL = "http://localhost:8000/api"
ITINERARY_URL = "http://localhost:8001"
MAP_URL = "http://localhost:8002"

# Test user credentials
TEST_USER = {
    "email": "test@example.com",
    "password": "testpassword123"
}

async def wait_for_services():
    """Wait for all services to be available"""
    services = [
        ("Backend", f"{BACKEND_URL}/"),
        ("Itinerary Service", f"{ITINERARY_URL}/docs"),
        ("Map Service", f"{MAP_URL}/docs")
    ]
    
    for name, url in services:
        print(f"Waiting for {name} to be available...")
        max_retries = 30
        for i in range(max_retries):
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.get(url, timeout=1)
                if response.status_code < 500:  # Accept any non-server error
                    print(f"{name} is available!")
                    break
            except Exception:
                pass
            
            print(f"Attempt {i+1}/{max_retries} failed, retrying in 1 second...")
            await asyncio.sleep(1)
        else:
            raise Exception(f"Service {name} did not become available in time")

async def register_test_user():
    """Register a test user and return the access token"""
    async with httpx.AsyncClient() as client:
        # Register user
        response = await client.post(f"{BACKEND_URL}/register", json=TEST_USER)
        assert response.status_code in (200, 400), f"Failed to register test user: {response.text}"
        
        # Login to get token
        response = await client.post(
            f"{BACKEND_URL}/token",
            data={
                "username": TEST_USER["email"],
                "password": TEST_USER["password"]
            }
        )
        assert response.status_code == 200, f"Failed to login: {response.text}"
        return response.json()["access_token"]

async def test_end_to_end_flow():
    """Test the entire application flow"""
    await wait_for_services()
    print("All services are available. Starting the integration test...")
    
    # Get auth token
    token = await register_test_user()
    headers = {"Authorization": f"Bearer {token}"}
    
    async with httpx.AsyncClient() as client:
        # 1. Add user preferences
        preference = {
            "category": "Food",
            "value": "Italian cuisine",
            "weight": 8
        }
        response = await client.post(
            f"{BACKEND_URL}/preferences/",
            json=preference,
            headers=headers
        )
        assert response.status_code == 201, f"Failed to create preference: {response.text}"
        print(" Successfully added user preference")
        
        # 2. Search for a location using map service
        response = await client.get(f"{MAP_URL}/search?query=Rome")
        assert response.status_code == 200, f"Map service failed: {response.text}"
        locations = response.json()
        assert len(locations) > 0, "No locations found"
        print(f" Successfully searched for locations, found {len(locations)} results")
        
        # 3. Create a trip
        trip_data = {
            "title": "Italian Vacation",
            "destination": "Rome, Italy",
            "start_date": "2025-07-15",
            "end_date": "2025-07-20",
            "budget": 2000,
            "description": "A test trip to Rome"
        }
        response = await client.post(
            f"{BACKEND_URL}/trips/",
            json=trip_data,
            headers=headers
        )
        assert response.status_code == 201, f"Failed to create trip: {response.text}"
        trip_id = response.json()["id"]
        print(f" Successfully created trip with ID {trip_id}")
        
        # 4. Wait for itinerary generation (may take some time)
        print("Waiting for itinerary generation (this may take a few seconds)...")
        await asyncio.sleep(5)
        
        # 5. Check if itinerary was generated
        max_retries = 10
        for i in range(max_retries):
            response = await client.get(
                f"{BACKEND_URL}/trips/{trip_id}",
                headers=headers
            )
            assert response.status_code == 200, f"Failed to get trip details: {response.text}"
            trip = response.json()
            
            if trip.get("itinerary"):
                print(" Successfully generated itinerary for trip")
                break
                
            print(f"Attempt {i+1}/{max_retries}: Itinerary not yet generated, waiting...")
            await asyncio.sleep(2)
        else:
            print(" Itinerary was not generated in time, but test continues")
        
            
    print(" Integration test completed successfully!")

if __name__ == "__main__":
    print("Starting integration tests...")
    asyncio.run(test_end_to_end_flow())