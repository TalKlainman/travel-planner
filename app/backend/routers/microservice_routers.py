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