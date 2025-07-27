from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
import httpx
import logging
from fastapi.middleware.cors import CORSMiddleware

# Configure logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("enhanced-map-service")

app = FastAPI(
    title="Enhanced Map Service",
    description="Advanced location data and trip visualization service using OpenStreetMap",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def read_root():
    """Health check endpoint"""
    return {"status": "healthy", "service": "enhanced-map-service", "version": "2.0.0"}

@app.get("/search")
async def search_locations(query: str, country: Optional[str] = None):
    """Search for locations by name and optionally filter by country"""
    try:
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
                headers={"User-Agent": "TravelPlannerApp/2.0"}
            )
            
            if response.status_code != 200:
                logger.error(f"Nominatim API error: {response.status_code} - {response.text}")
                raise HTTPException(status_code=500, detail="Failed to search locations")
                
            results = response.json()
            
            locations = []
            for result in results:
                name_parts = result.get("display_name", "").split(",")
                name = name_parts[0].strip() if name_parts else "Unknown Location"
                
                country = result.get("address", {}).get("country", "")
                if not country and len(name_parts) > 1:
                    country = name_parts[-1].strip()
                
                locations.append({
                    "name": name,
                    "country": country or "Unknown",
                    "lat": float(result.get("lat", 0)),
                    "lng": float(result.get("lon", 0)),
                    "description": result.get("display_name", "")
                })
                
            return locations
    except Exception as e:
        logger.error(f"Location search failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Location search failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=True)