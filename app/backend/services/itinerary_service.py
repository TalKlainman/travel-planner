import httpx
import os
from typing import Dict, Any, List, Optional, Tuple

class ItineraryService:
    def __init__(self):
        self.base_url = os.getenv("ITINERARY_SERVICE_URL", "http://itinerary-service:8001")
        
    async def generate_itinerary(self, 
                               trip_id: str,
                               destination: str, 
                               start_date: str,
                               end_date: str,
                               preferences: Optional[List[Dict[str, Any]]] = None,
                               budget: Optional[float] = None) -> Tuple[int, Dict[str, Any]]:
        """Generate a travel itinerary using the Itinerary Generator Service"""
        if preferences is None:
            preferences = []
            
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/generate/{trip_id}",
                json={
                    "destination": destination,
                    "start_date": start_date,
                    "end_date": end_date,
                    "preferences": preferences,
                    "budget": budget
                },
                timeout=30.0
            )
            
            return response.status_code, response.json() if response.status_code != 204 else {}
    
    async def get_itinerary_status(self, trip_id: str) -> Tuple[int, Dict[str, Any]]:
        """Check the status of an itinerary generation task"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/status/{trip_id}",
                timeout=10.0
            )
            
            return response.status_code, response.json() if response.status_code != 204 else {}
    
    async def get_itinerary(self, trip_id: str) -> Tuple[int, Dict[str, Any]]:
        """Get a generated itinerary"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.base_url}/itinerary/itinerary/{trip_id}",
                    timeout=10.0
                )
                
                if response.status_code < 400:
                    if response.status_code == 202:
                        # Still processing
                        return response.status_code, {
                            "status": "pending", 
                            "message": "Itinerary generation in progress"
                        }
                    return response.status_code, response.json() if response.status_code == 200 else {}
            except Exception:
                pass
                
            try:
                response = await client.get(
                    f"{self.base_url}/itinerary/{trip_id}",
                    timeout=10.0
                )
                
                if response.status_code == 202:
                    # Still processing
                    return response.status_code, {
                        "status": "pending", 
                        "message": "Itinerary generation in progress"
                    }
                    
                return response.status_code, response.json() if response.status_code == 200 else {}
            except Exception:
                pass
            
            response = await client.get(
                f"{self.base_url}/{trip_id}",
                timeout=10.0
            )
            
            if response.status_code == 202:
                # Still processing
                return response.status_code, {
                    "status": "pending", 
                    "message": "Itinerary generation in progress"
                }
                
            return response.status_code, response.json() if response.status_code == 200 else {}