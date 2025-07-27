from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import httpx

app = FastAPI(
    title="Map Service",
    description="Location data and mapping service using OpenStreetMap",
    version="0.1.0",
)

class Location(BaseModel):
    name: str
    country: str
    lat: float
    lng: float
    description: Optional[str] = None
    image_url: Optional[str] = None

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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=True)