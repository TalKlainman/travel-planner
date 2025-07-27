from fastapi import APIRouter, HTTPException, Request, Path, Body
from fastapi.responses import JSONResponse
import httpx
import os
from typing import Optional, Any, Dict
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
                timeout=30.0  
            )
            
            await log_response(url, response)
            
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