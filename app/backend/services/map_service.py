from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import httpx
import os
import logging
from fastapi.middleware.cors import CORSMiddleware

# Configure logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("map-service")

app = FastAPI(
    title="Map Service",
    description="Location data and mapping service using OpenStreetMap",
    version="1.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class LocationRequest(BaseModel):
    name: str
    country: Optional[str] = None

class NearbyRequest(BaseModel):
    lat: float
    lng: float
    radius: Optional[int] = 1000  # Default 1km radius
    category: Optional[str] = None  # Type of POI

class Location(BaseModel):
    name: str
    country: str
    lat: float
    lng: float
    description: Optional[str] = None
    image_url: Optional[str] = None

class NearbyAttraction(BaseModel):
    name: str
    type: str
    lat: float
    lng: float
    distance: float

class AttractionsResponse(BaseModel):
    restaurants: List[Dict[str, Any]]
    cafes: List[Dict[str, Any]]
    museums: List[Dict[str, Any]]
    landmarks: List[Dict[str, Any]]
    parks: List[Dict[str, Any]]
    attractions: List[Dict[str, Any]]

@app.get("/")
async def read_root():
    """Health check endpoint"""
    return {"status": "healthy", "service": "map-service"}

@app.get("/search", response_model=List[Location])
async def search_locations(query: str, country: Optional[str] = None):
    """Search for locations by name and optionally filter by country"""
    try:
        # Use Nominatim API (OpenStreetMap's search API)
        params = {
            "q": query,
            "format": "json",
            "limit": 10,
        }
        
        if country:
            params["country"] = country
            
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://nominatim.openstreetmap.org/search",
                params=params,
                headers={"User-Agent": "TravelPlannerApp/1.0"}
            )
            
            if response.status_code != 200:
                logger.error(f"Nominatim API error: {response.status_code} - {response.text}")
                raise HTTPException(status_code=500, detail="Failed to search locations")
                
            results = response.json()
            
            locations = []
            for result in results:
                # Extract the first part of the display name as the location name
                name_parts = result.get("display_name", "").split(",")
                name = name_parts[0].strip() if name_parts else "Unknown Location"
                
                # Get country from address if available, otherwise from display name
                country = result.get("address", {}).get("country", "")
                if not country and len(name_parts) > 1:
                    country = name_parts[-1].strip()
                
                locations.append(Location(
                    name=name,
                    country=country or "Unknown",
                    lat=float(result.get("lat", 0)),
                    lng=float(result.get("lon", 0)),
                    description=result.get("display_name", "")
                ))
                
            return locations
    except Exception as e:
        logger.error(f"Location search failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Location search failed: {str(e)}")

@app.post("/nearby", response_model=List[NearbyAttraction])
async def find_nearby_attractions(request: NearbyRequest):
    """Find nearby attractions or points of interest"""
    try:
        # Use Overpass API (more powerful OpenStreetMap query API)
        radius = min(request.radius, 5000)  # Cap at 5km for performance
        
        # Build Overpass query
        overpass_query = f"""
        [out:json];
        (
          node["tourism"](around:{radius},{request.lat},{request.lng});
          node["amenity"="restaurant"](around:{radius},{request.lat},{request.lng});
          node["amenity"="cafe"](around:{radius},{request.lat},{request.lng});
          node["historic"](around:{radius},{request.lat},{request.lng});
          node["leisure"="park"](around:{radius},{request.lat},{request.lng});
        );
        out body;
        """
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://overpass-api.de/api/interpreter",
                data={"data": overpass_query}
            )
            
            if response.status_code != 200:
                logger.error(f"Overpass API error: {response.status_code} - {response.text}")
                raise HTTPException(status_code=500, detail="Failed to find nearby attractions")
                
            results = response.json()
            
            attractions = []
            for element in results.get("elements", []):
                tags = element.get("tags", {})
                name = tags.get("name")
                
                # Skip elements without names
                if not name:
                    continue
                
                # Determine the type of attraction
                attr_type = "attraction"
                if tags.get("amenity") == "restaurant":
                    attr_type = "restaurant"
                elif tags.get("amenity") == "cafe":
                    attr_type = "cafe"
                elif tags.get("tourism") == "museum":
                    attr_type = "museum"
                elif tags.get("historic"):
                    attr_type = "landmark"
                elif tags.get("leisure") == "park":
                    attr_type = "park"
                elif tags.get("tourism"):
                    attr_type = tags.get("tourism")
                
                # Calculate rough distance (not accounting for Earth's curvature)
                lat = element.get("lat")
                lng = element.get("lon")
                
                if not lat or not lng:
                    continue
                
                # Calculate distance using Haversine formula
                from math import radians, sin, cos, sqrt, asin
                
                def haversine(lat1, lon1, lat2, lon2):
                    R = 6371000  # Earth radius in meters
                    phi1 = radians(lat1)
                    phi2 = radians(lat2)
                    delta_phi = radians(lat2 - lat1)
                    delta_lambda = radians(lon2 - lon1)
                    
                    a = sin(delta_phi/2)**2 + cos(phi1) * cos(phi2) * sin(delta_lambda/2)**2
                    c = 2 * asin(sqrt(a))
                    
                    return R * c
                
                distance = haversine(request.lat, request.lng, lat, lng)
                
                attractions.append(NearbyAttraction(
                    name=name,
                    type=attr_type,
                    lat=lat,
                    lng=lng,
                    distance=distance
                ))
                
            # Sort by distance
            sorted_attractions = sorted(attractions, key=lambda x: x.distance)
            
            return sorted_attractions
    except Exception as e:
        logger.error(f"Nearby search failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Nearby search failed: {str(e)}")

@app.get("/attractions", response_model=AttractionsResponse)
async def get_attractions_by_destination(destination: str, radius: Optional[int] = 5000):
    """Get attractions by destination categorized by type"""
    try:
        # First, get location coordinates using Nominatim
        async with httpx.AsyncClient() as client:
            nom_response = await client.get(
                "https://nominatim.openstreetmap.org/search",
                params={
                    "q": destination,
                    "format": "json",
                    "limit": 1
                },
                headers={"User-Agent": "TravelPlannerApp/1.0"}
            )
            
            if nom_response.status_code != 200 or not nom_response.json():
                raise HTTPException(status_code=404, detail="Location not found")
            
            location = nom_response.json()[0]
            lat = float(location["lat"])
            lng = float(location["lon"])
            
            # Use Overpass API to get attractions
            radius = min(radius, 10000)  # Cap at 10km for performance
            
            overpass_query = f"""
            [out:json];
            (
              node["tourism"](around:{radius},{lat},{lng});
              node["amenity"="restaurant"](around:{radius},{lat},{lng});
              node["amenity"="cafe"](around:{radius},{lat},{lng});
              node["historic"](around:{radius},{lat},{lng});
              node["leisure"="park"](around:{radius},{lat},{lng});
            );
            out body;
            """
            
            overpass_response = await client.post(
                "https://overpass-api.de/api/interpreter",
                data={"data": overpass_query}
            )
            
            if overpass_response.status_code != 200:
                raise HTTPException(status_code=500, detail="Failed to fetch attractions")
            
            results = overpass_response.json()
            
            # Categorize attractions
            restaurants = []
            cafes = []
            museums = []
            landmarks = []
            parks = []
            attractions = []
            
            for element in results.get("elements", []):
                tags = element.get("tags", {})
                name = tags.get("name")
                
                # Skip elements without names
                if not name:
                    continue
                
                # Create attraction object
                attraction = {
                    "name": name,
                    "lat": element.get("lat"),
                    "lng": element.get("lon"),
                    "tags": tags
                }
                
                # Categorize by type
                if tags.get("amenity") == "restaurant":
                    attraction["type"] = "restaurant"
                    attraction["cuisine"] = tags.get("cuisine", "Local cuisine")
                    restaurants.append(attraction)
                elif tags.get("amenity") == "cafe":
                    attraction["type"] = "cafe"
                    cafes.append(attraction)
                elif tags.get("tourism") == "museum":
                    attraction["type"] = "museum"
                    museums.append(attraction)
                elif tags.get("historic"):
                    attraction["type"] = "landmark"
                    attraction["historic_type"] = tags.get("historic")
                    landmarks.append(attraction)
                elif tags.get("leisure") == "park":
                    attraction["type"] = "park"
                    parks.append(attraction)
                elif tags.get("tourism"):
                    attraction["type"] = tags.get("tourism", "attraction")
                    attractions.append(attraction)
            
            return {
                "restaurants": restaurants,
                "cafes": cafes,
                "museums": museums,
                "landmarks": landmarks,
                "parks": parks,
                "attractions": attractions
            }
    except Exception as e:
        logger.error(f"Attractions search failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Attractions search failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=True)