from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import httpx

app = FastAPI(
    title="Map Service",
    description="Location data and mapping service using OpenStreetMap",
    version="0.1.0",
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
                raise HTTPException(status_code=500, detail="Failed to search locations")
                
            results = response.json()
            
            locations = []
            for result in results:
                locations.append(Location(
                    name=result.get("display_name", "").split(",")[0],
                    country=result.get("address", {}).get("country", "Unknown"),
                    lat=float(result.get("lat", 0)),
                    lng=float(result.get("lon", 0)),
                    description=result.get("display_name", "")
                ))
                
            return locations
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Location search failed: {str(e)}")

@app.post("/nearby", response_model=List[NearbyAttraction])
async def find_nearby_attractions(request: NearbyRequest):
    """Find nearby attractions or points of interest"""
    try:
        # Use Overpass API (more powerful OpenStreetMap query API)
        radius = min(request.radius, 5000)  # Cap at 5km for performance
        
        # Build Overpass query
        query_type = "node"
        if request.category:
            query_type += f'["tourism"="{request.category}"]'
        
        overpass_query = f"""
        [out:json];
        {query_type}(around:{radius},{request.lat},{request.lng});
        out center;
        """
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://overpass-api.de/api/interpreter",
                data={"data": overpass_query}
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=500, detail="Failed to find nearby attractions")
                
            results = response.json()
            
            attractions = []
            for element in results.get("elements", []):
                lat = element.get("lat") or element.get("center", {}).get("lat", 0)
                lng = element.get("lon") or element.get("center", {}).get("lon", 0)
                
                # Calculate rough distance (not accounting for Earth's curvature)
                dx = 111.32 * (request.lat - lat)  # km per degree latitude
                dy = 111.32 * (request.lng - lng) * abs(request.lat) / 90  # km per degree longitude
                distance = (dx**2 + dy**2)**0.5 * 1000  # convert to meters
                
                attractions.append(NearbyAttraction(
                    name=element.get("tags", {}).get("name", "Unnamed"),
                    type=element.get("tags", {}).get("tourism", "attraction"),
                    lat=lat,
                    lng=lng,
                    distance=distance
                ))
                
            return sorted(attractions, key=lambda x: x.distance)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Nearby search failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=True)