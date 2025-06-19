# app/backend/routers/microservice_routers.py
from fastapi import APIRouter, HTTPException, Depends, Request, Path, Query, Body
from fastapi.responses import JSONResponse
import httpx
import os
from typing import Optional, Any, Dict, List
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("microservice_routers")

# Create routers
map_router = APIRouter(
    prefix="/map",
    tags=["map service"],
)

itinerary_router = APIRouter(
    prefix="/itinerary",
    tags=["itinerary service"],
)

# Environment variables for service URLs (default to Docker service names)
MAP_SERVICE_URL = os.getenv("MAP_SERVICE_URL", "http://map-service:8002")
ITINERARY_SERVICE_URL = os.getenv("ITINERARY_SERVICE_URL", "http://itinerary-service:8001")

# Enable this for verbose debugging
DEBUG = True

async def log_request(method, url, **kwargs):
    """Helper function to log outgoing requests"""
    if DEBUG:
        logger.info(f"REQUEST: {method} {url}")
        if 'json' in kwargs:
            logger.info(f"REQUEST BODY: {json.dumps(kwargs['json'])}")
        if 'params' in kwargs:
            logger.info(f"REQUEST PARAMS: {kwargs['params']}")

async def log_response(url, response):
    """Helper function to log incoming responses"""
    if DEBUG:
        logger.info(f"RESPONSE FROM {url}: Status {response.status_code}")
        try:
            logger.info(f"RESPONSE BODY: {json.dumps(response.json())}")
        except:
            logger.info(f"RESPONSE TEXT: {response.text[:200]}")

# Map Service Routes
@map_router.post("/trip/visualize")
async def visualize_trip_route(request: Request):
    """Proxy to the map service trip visualization endpoint"""
    try:
        data = await request.json()
        url = f"{MAP_SERVICE_URL}/trip/visualize"
        await log_request("POST", url, json=data)
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                json=data,
                timeout=15.0
            )
            
            await log_response(url, response)
            
            return JSONResponse(
                content=response.json(),
                status_code=response.status_code
            )
    except Exception as e:
        logger.error(f"Error calling map service trip visualization: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error calling map service: {str(e)}")

@map_router.post("/trip/optimize-route")
async def optimize_trip_route(request: Request):
    """Proxy to the map service route optimization endpoint"""
    try:
        data = await request.json()
        url = f"{MAP_SERVICE_URL}/trip/optimize-route"
        await log_request("POST", url, json=data)
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                json=data,
                timeout=20.0  # Longer timeout for optimization
            )
            
            await log_response(url, response)
            
            return JSONResponse(
                content=response.json(),
                status_code=response.status_code
            )
    except Exception as e:
        logger.error(f"Error calling map service route optimization: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error calling map service: {str(e)}")

@map_router.get("/trip/{trip_id}/nearby-suggestions")
async def get_trip_nearby_suggestions(trip_id: str, lat: float, lng: float, radius: int = 1000):
    """Get nearby attraction suggestions for a trip"""
    try:
        url = f"{MAP_SERVICE_URL}/trip/{trip_id}/nearby-suggestions"
        params = {"lat": lat, "lng": lng, "radius": radius}
        await log_request("GET", url, params=params)
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                params=params,
                timeout=15.0
            )
            
            await log_response(url, response)
            
            return JSONResponse(
                content=response.json(),
                status_code=response.status_code
            )
    except Exception as e:
        logger.error(f"Error calling map service nearby suggestions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error calling map service: {str(e)}")

@map_router.post("/trip/{trip_id}/add-activity")
async def add_activity_to_trip(trip_id: str, request: Request):
    """Add a new activity to a trip"""
    try:
        data = await request.json()
        url = f"{MAP_SERVICE_URL}/trip/{trip_id}/add-activity"
        await log_request("POST", url, json=data)
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                json=data,
                timeout=10.0
            )
            
            await log_response(url, response)
            
            return JSONResponse(
                content=response.json(),
                status_code=response.status_code
            )
    except Exception as e:
        logger.error(f"Error calling map service add activity: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error calling map service: {str(e)}")

# Add a new endpoint to integrate with your existing trip data
@map_router.get("/trip/{trip_id}/visualization-data")
async def get_trip_visualization_data(trip_id: str):
    """
    Get visualization data for a specific trip by fetching from your trip database
    and processing it for map display
    """
    try:
        # In a real implementation, you would:
        # 1. Fetch the trip from your database
        # 2. Get the itinerary data (possibly from the itinerary service)
        # 3. Transform it into the format needed for visualization
        
        # For now, let's create a sample implementation that you can adapt:
        
        # Mock getting trip data from your database
        # Replace this with actual database calls
        trip_data = {
            "id": trip_id,
            "destination": "Barcelona, Spain",
            "start_date": "2025-06-19",
            "end_date": "2025-06-21"
        }
        
        # Mock getting itinerary from itinerary service
        # This should call your existing itinerary service
        try:
            itinerary_url = f"{ITINERARY_SERVICE_URL}/itinerary/{trip_id}"
            async with httpx.AsyncClient() as client:
                itinerary_response = await client.get(itinerary_url, timeout=10.0)
                
                if itinerary_response.status_code == 200:
                    itinerary_data = itinerary_response.json()
                    
                    # Transform itinerary data into visualization format
                    visualization_request = transform_itinerary_for_visualization(trip_id, itinerary_data)
                    
                    # Send to map service for visualization processing
                    map_viz_url = f"{MAP_SERVICE_URL}/trip/visualize"
                    viz_response = await client.post(
                        map_viz_url,
                        json=visualization_request,
                        timeout=15.0
                    )
                    
                    if viz_response.status_code == 200:
                        return JSONResponse(content=viz_response.json())
                    else:
                        # Fallback to basic trip info
                        return JSONResponse(content={
                            "trip_id": trip_id,
                            "message": "Itinerary found but visualization processing failed",
                            "trip_data": trip_data
                        })
                else:
                    # No itinerary yet, return empty visualization
                    return JSONResponse(content={
                        "trip_id": trip_id,
                        "message": "No itinerary available for visualization",
                        "trip_data": trip_data,
                        "has_itinerary": False
                    })
                    
        except Exception as itinerary_error:
            logger.warning(f"Could not fetch itinerary for trip {trip_id}: {str(itinerary_error)}")
            return JSONResponse(content={
                "trip_id": trip_id,
                "message": "Trip found but itinerary unavailable",
                "trip_data": trip_data,
                "has_itinerary": False
            })
            
    except Exception as e:
        logger.error(f"Error getting trip visualization data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting trip visualization data: {str(e)}")

def transform_itinerary_for_visualization(trip_id: str, itinerary_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Transform your itinerary data format into the format expected by the map visualization service
    You'll need to adapt this based on your actual itinerary data structure
    """
    try:
        visualization_request = {
            "trip_id": trip_id,
            "itinerary": {}
        }
        
        # Handle different possible itinerary formats
        if isinstance(itinerary_data, dict):
            if "itinerary" in itinerary_data:
                raw_itinerary = itinerary_data["itinerary"]
            else:
                raw_itinerary = itinerary_data
            
            # Transform each day
            for day_key, day_data in raw_itinerary.items():
                if not day_key.startswith("Day"):
                    continue
                    
                # Extract activities - handle different formats
                activities = []
                if isinstance(day_data, dict):
                    if "activities" in day_data:
                        raw_activities = day_data["activities"]
                    else:
                        # Handle time-based format like {"09:00": "Cafe Milans", "11:00": "Casa Batlló"}
                        raw_activities = []
                        for time_key, activity_value in day_data.items():
                            if time_key == "date":
                                continue
                            raw_activities.append({
                                "time": time_key,
                                "name": activity_value if isinstance(activity_value, str) else activity_value.get("name", str(activity_value))
                            })
                elif isinstance(day_data, list):
                    raw_activities = day_data
                else:
                    continue
                
                # Convert to standardized format
                for i, activity in enumerate(raw_activities):
                    if isinstance(activity, str):
                        # Simple string format
                        activity_obj = {
                            "name": activity,
                            "time": f"{9 + i * 2:02d}:00",  # Estimate times
                            "type": "attraction",
                            "lat": 41.3851 + (i * 0.01),  # Mock coordinates for Barcelona
                            "lng": 2.1734 + (i * 0.01),
                            "location": "Barcelona"
                        }
                    elif isinstance(activity, dict):
                        # Dictionary format
                        activity_obj = {
                            "name": activity.get("name", activity.get("title", "Unknown Activity")),
                            "time": activity.get("time", f"{9 + i * 2:02d}:00"),
                            "type": activity.get("type", "attraction"),
                            "lat": activity.get("lat", 41.3851 + (i * 0.01)),
                            "lng": activity.get("lng", 2.1734 + (i * 0.01)),
                            "location": activity.get("location", "Barcelona"),
                            "description": activity.get("description")
                        }
                    else:
                        continue
                    
                    activities.append(activity_obj)
                
                # Add day to visualization request
                visualization_request["itinerary"][day_key] = {
                    "date": day_data.get("date", "2025-06-19") if isinstance(day_data, dict) else "2025-06-19",
                    "activities": activities
                }
        
        return visualization_request
        
    except Exception as e:
        logger.error(f"Error transforming itinerary for visualization: {str(e)}")
        # Return a basic format if transformation fails
        return {
            "trip_id": trip_id,
            "itinerary": {
                "Day 1": {
                    "date": "2025-06-19",
                    "activities": [
                        {
                            "name": "Trip Activities",
                            "time": "09:00",
                            "type": "attraction", 
                            "lat": 41.3851,
                            "lng": 2.1734,
                            "location": "Destination"
                        }
                    ]
                }
            }
        }
    
@map_router.get("/search")
async def search_locations(query: str, country: Optional[str] = None):
    """Proxy to the map service search endpoint"""
    params = {"query": query}
    if country:
        params["country"] = country
        
    try:
        url = f"{MAP_SERVICE_URL}/search"
        await log_request("GET", url, params=params)
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                params=params,
                timeout=10.0
            )
            
            await log_response(url, response)
            
            return JSONResponse(
                content=response.json(),
                status_code=response.status_code
            )
    except Exception as e:
        logger.error(f"Error calling map service: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error calling map service: {str(e)}")

@map_router.post("/nearby")
async def nearby_attractions(request: Request):
    """Proxy to the map service nearby endpoint"""
    try:
        data = await request.json()
        url = f"{MAP_SERVICE_URL}/nearby"
        await log_request("POST", url, json=data)
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                json=data,
                timeout=10.0
            )
            
            await log_response(url, response)
            
            return JSONResponse(
                content=response.json(),
                status_code=response.status_code
            )
    except Exception as e:
        logger.error(f"Error calling map service: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error calling map service: {str(e)}")

@map_router.get("/attractions")
async def get_attractions(destination: str, radius: Optional[int] = 5000):
    """Proxy to the map service attractions endpoint"""
    params = {
        "destination": destination,
        "radius": radius
    }
    
    try:
        url = f"{MAP_SERVICE_URL}/attractions"
        await log_request("GET", url, params=params)
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                params=params,
                timeout=15.0
            )
            
            await log_response(url, response)
            
            return JSONResponse(
                content=response.json(),
                status_code=response.status_code
            )
    except Exception as e:
        logger.error(f"Error calling map service: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error calling map service: {str(e)}")

# Itinerary Service Routes - Original route (may remove or modify this)
@itinerary_router.post("/generate")
async def generate_itinerary(request: Request):
    """Proxy to the itinerary service generate endpoint (legacy)"""
    try:
        data = await request.json()
        url = f"{ITINERARY_SERVICE_URL}/generate"
        await log_request("POST", url, json=data)
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                json=data,
                timeout=30.0  # Longer timeout for itinerary generation
            )
            
            await log_response(url, response)
            
            return JSONResponse(
                content=response.json(),
                status_code=response.status_code
            )
    except Exception as e:
        logger.error(f"Error calling itinerary service: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error calling itinerary service: {str(e)}")

# New Ollama-integrated itinerary routes
@itinerary_router.post("/generate/{trip_id}")
async def generate_trip_itinerary(
    trip_id: str = Path(..., description="Trip ID to generate itinerary for"),
    request_data: Dict[str, Any] = Body(..., description="Trip data including destination and dates")
):
    """Generate an itinerary for a specific trip using the Itinerary Generator service with Ollama"""
    try:
        url = f"{ITINERARY_SERVICE_URL}/generate/{trip_id}"
        await log_request("POST", url, json=request_data)
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                json=request_data,
                timeout=30.0  # Longer timeout for LLM-based generation
            )
            
            await log_response(url, response)
            
            # Return the response as is
            return JSONResponse(
                content=response.json() if response.status_code != 204 else {},
                status_code=response.status_code
            )
    except Exception as e:
        logger.error(f"Error calling itinerary generation service: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error calling itinerary generation service: {str(e)}")

@itinerary_router.get("/status/{trip_id}")
async def check_itinerary_status(
    trip_id: str = Path(..., description="Trip ID to check status for")
):
    """Check the status of an ongoing itinerary generation"""
    try:
        url = f"{ITINERARY_SERVICE_URL}/status/{trip_id}"
        await log_request("GET", url)
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                timeout=10.0
            )
            
            await log_response(url, response)
            
            return JSONResponse(
                content=response.json(),
                status_code=response.status_code
            )
    except Exception as e:
        logger.error(f"Error checking itinerary status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error checking itinerary status: {str(e)}")

@itinerary_router.get("/itinerary/{trip_id}")
async def get_trip_itinerary(trip_id: str):
    """Get the generated itinerary for a trip"""
    try:
        # Try multiple possible endpoints in the itinerary service
        endpoints = [
            f"/itinerary/{trip_id}",  # The standard endpoint as per the service
            f"/{trip_id}",            # The root endpoint alias
        ]
        
        last_error = None
        async with httpx.AsyncClient() as client:
            for endpoint in endpoints:
                url = f"{ITINERARY_SERVICE_URL}{endpoint}"
                logger.info(f"Trying to fetch itinerary from: {url}")
                
                try:
                    response = await client.get(url, timeout=10.0)
                    logger.info(f"Response from {url}: Status {response.status_code}")
                    
                    if response.status_code == 202:
                        # Still processing
                        return JSONResponse(
                            content={"status": "pending", "message": "Itinerary generation in progress"},
                            status_code=202
                        )
                    
                    if response.status_code < 400:
                        # Success!
                        try:
                            content = response.json()
                            return JSONResponse(content=content, status_code=response.status_code)
                        except ValueError:
                            logger.warning(f"Non-JSON response from {url}: {response.text[:100]}...")
                    
                    last_error = response
                except Exception as e:
                    logger.warning(f"Error with endpoint {endpoint}: {str(e)}")
                    last_error = e
        
        # If we get here, all endpoints failed
        if isinstance(last_error, httpx.Response):
            status_code = last_error.status_code
            try:
                detail = last_error.json()
            except:
                detail = {"error": "Error retrieving itinerary", "detail": last_error.text}
        else:
            status_code = 500
            detail = {"error": "Error retrieving itinerary", "detail": str(last_error)}
        
        logger.error(f"All itinerary endpoints failed. Last error: {detail}")
        return JSONResponse(content=detail, status_code=status_code)
    
    except Exception as e:
        logger.error(f"Unexpected error retrieving itinerary: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving itinerary: {str(e)}")
    
    # Add this to your microservice_routers.py file:

@itinerary_router.get("/itinerary/itinerary/{trip_id}")
async def get_trip_itinerary_alternate(trip_id: str):
    """Alternative endpoint to match frontend request pattern"""
    try:
        url = f"{ITINERARY_SERVICE_URL}/itinerary/itinerary/{trip_id}"
        await log_request("GET", url)
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                timeout=10.0
            )
            
            await log_response(url, response)
            
            if response.status_code == 202:
                # Still processing
                return JSONResponse(
                    content={"status": "pending", "message": "Itinerary generation in progress"},
                    status_code=202
                )
            
            # Forward the response regardless of status code
            try:
                return JSONResponse(
                    content=response.json(),
                    status_code=response.status_code
                )
            except ValueError:
                # If response is not JSON, return the text
                return JSONResponse(
                    content={"error": "Invalid response format", "detail": response.text},
                    status_code=500
                )
    except Exception as e:
        logger.error(f"Error retrieving itinerary: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving itinerary: {str(e)}")