# Enhanced map service with trip visualization features
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import httpx
import os
import logging
from fastapi.middleware.cors import CORSMiddleware
import json

# Configure logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("enhanced-map-service")

app = FastAPI(
    title="Enhanced Map Service",
    description="Advanced location data and trip visualization service using OpenStreetMap",
    version="2.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Enhanced Models
class TripActivity(BaseModel):
    name: str
    time: str
    type: str
    lat: float
    lng: float
    location: Optional[str] = None
    description: Optional[str] = None

class DayItinerary(BaseModel):
    date: str
    activities: List[TripActivity]

class TripVisualizationRequest(BaseModel):
    trip_id: str
    itinerary: Dict[str, DayItinerary]

class RouteOptimizationRequest(BaseModel):
    activities: List[TripActivity]
    start_location: Optional[TripActivity] = None
    end_location: Optional[TripActivity] = None
    optimization_type: str = "shortest"  # shortest, fastest, balanced

class RouteSegment(BaseModel):
    from_activity: str
    to_activity: str
    distance: float  # in meters
    duration: float  # in minutes
    path_coordinates: List[List[float]]  # [[lat, lng], [lat, lng], ...]

class OptimizedRoute(BaseModel):
    optimized_activities: List[TripActivity]
    route_segments: List[RouteSegment]
    total_distance: float
    total_duration: float
    improvement_percentage: float

# Existing endpoints (keeping your current ones)
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

# NEW ENDPOINTS FOR TRIP VISUALIZATION

@app.post("/trip/visualize")
async def visualize_trip(request: TripVisualizationRequest):
    """
    Generate visualization data for a complete trip itinerary
    Returns map markers, route lines, and clustering information
    """
    try:
        visualization_data = {
            "trip_id": request.trip_id,
            "days": [],
            "overall_bounds": None,
            "activity_clusters": [],
            "route_statistics": {}
        }
        
        all_coordinates = []
        day_colors = [
            {"primary": "#3B82F6", "light": "#DBEAFE", "name": "Blue"},
            {"primary": "#EF4444", "light": "#FEE2E2", "name": "Red"},
            {"primary": "#10B981", "light": "#D1FAE5", "name": "Green"},
            {"primary": "#F59E0B", "light": "#FEF3C7", "name": "Amber"},
            {"primary": "#8B5CF6", "light": "#EDE9FE", "name": "Purple"}
        ]
        
        for day_index, (day_name, day_data) in enumerate(request.itinerary.items()):
            day_color = day_colors[day_index % len(day_colors)]
            
            # Process activities for this day
            day_activities = []
            for activity_index, activity in enumerate(day_data.activities):
                activity_data = {
                    "id": f"{request.trip_id}_{day_name}_{activity_index}",
                    "name": activity.name,
                    "time": activity.time,
                    "type": activity.type,
                    "lat": activity.lat,
                    "lng": activity.lng,
                    "location": activity.location,
                    "description": activity.description,
                    "sequence": activity_index + 1,
                    "day": day_name,
                    "color": day_color["primary"]
                }
                day_activities.append(activity_data)
                all_coordinates.append([activity.lat, activity.lng])
            
            # Calculate route segments for this day
            route_segments = []
            if len(day_activities) > 1:
                for i in range(len(day_activities) - 1):
                    current = day_activities[i]
                    next_activity = day_activities[i + 1]
                    
                    # Calculate straight-line distance (in a real app, use routing API)
                    distance = calculate_distance(
                        current["lat"], current["lng"],
                        next_activity["lat"], next_activity["lng"]
                    )
                    
                    route_segments.append({
                        "from": current["id"],
                        "to": next_activity["id"],
                        "distance": distance,
                        "coordinates": [
                            [current["lat"], current["lng"]],
                            [next_activity["lat"], next_activity["lng"]]
                        ]
                    })
            
            day_viz_data = {
                "day_name": day_name,
                "date": day_data.date,
                "activities": day_activities,
                "route_segments": route_segments,
                "color_scheme": day_color,
                "statistics": {
                    "total_activities": len(day_activities),
                    "estimated_walking_distance": sum(seg["distance"] for seg in route_segments),
                    "time_span": f"{day_activities[0]['time']} - {day_activities[-1]['time']}" if day_activities else ""
                }
            }
            visualization_data["days"].append(day_viz_data)
        
        # Calculate overall map bounds
        if all_coordinates:
            lats = [coord[0] for coord in all_coordinates]
            lngs = [coord[1] for coord in all_coordinates]
            visualization_data["overall_bounds"] = {
                "north": max(lats),
                "south": min(lats),
                "east": max(lngs),
                "west": min(lngs)
            }
        
        # Generate overall statistics
        total_activities = sum(len(day["activities"]) for day in visualization_data["days"])
        total_distance = sum(
            sum(seg["distance"] for seg in day["route_segments"]) 
            for day in visualization_data["days"]
        )
        
        visualization_data["route_statistics"] = {
            "total_activities": total_activities,
            "total_days": len(visualization_data["days"]),
            "total_walking_distance": round(total_distance, 2),
            "average_activities_per_day": round(total_activities / len(visualization_data["days"]), 1) if visualization_data["days"] else 0
        }
        
        return visualization_data
        
    except Exception as e:
        logger.error(f"Trip visualization failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Trip visualization failed: {str(e)}")

@app.post("/trip/optimize-route")
async def optimize_route(request: RouteOptimizationRequest):
    """
    Optimize the route for a day's activities using traveling salesman algorithm
    """
    try:
        if len(request.activities) < 2:
            return OptimizedRoute(
                optimized_activities=request.activities,
                route_segments=[],
                total_distance=0,
                total_duration=0,
                improvement_percentage=0
            )
        
        # Simple nearest neighbor optimization (in production, use more sophisticated algorithms)
        original_distance = calculate_route_distance(request.activities)
        optimized_activities = optimize_using_nearest_neighbor(request.activities)
        optimized_distance = calculate_route_distance(optimized_activities)
        
        # Generate route segments
        route_segments = []
        for i in range(len(optimized_activities) - 1):
            current = optimized_activities[i]
            next_activity = optimized_activities[i + 1]
            
            distance = calculate_distance(current.lat, current.lng, next_activity.lat, next_activity.lng)
            duration = estimate_walking_time(distance)  # Estimate walking time
            
            route_segments.append(RouteSegment(
                from_activity=current.name,
                to_activity=next_activity.name,
                distance=distance,
                duration=duration,
                path_coordinates=[[current.lat, current.lng], [next_activity.lat, next_activity.lng]]
            ))
        
        improvement = ((original_distance - optimized_distance) / original_distance * 100) if original_distance > 0 else 0
        
        return OptimizedRoute(
            optimized_activities=optimized_activities,
            route_segments=route_segments,
            total_distance=round(optimized_distance, 2),
            total_duration=round(sum(seg.duration for seg in route_segments), 1),
            improvement_percentage=round(improvement, 1)
        )
        
    except Exception as e:
        logger.error(f"Route optimization failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Route optimization failed: {str(e)}")

@app.get("/trip/{trip_id}/nearby-suggestions")
async def get_nearby_suggestions(trip_id: str, lat: float, lng: float, radius: int = 1000):
    """
    Get nearby attraction suggestions for adding to itinerary
    """
    try:
        # Use existing nearby search logic but format for trip planning
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
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://overpass-api.de/api/interpreter",
                data={"data": overpass_query}
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=500, detail="Failed to fetch suggestions")
                
            results = response.json()
            
            suggestions = []
            for element in results.get("elements", []):
                tags = element.get("tags", {})
                name = tags.get("name")
                
                if not name:
                    continue
                
                # Determine activity type and suggested time slot
                activity_type = "attraction"
                suggested_time = "flexible"
                
                if tags.get("amenity") == "restaurant":
                    activity_type = "restaurant"
                    suggested_time = "lunch" if "lunch" in name.lower() else "dinner"
                elif tags.get("amenity") == "cafe":
                    activity_type = "cafe"
                    suggested_time = "morning"
                elif tags.get("tourism") == "museum":
                    activity_type = "museum"
                    suggested_time = "afternoon"
                elif tags.get("historic"):
                    activity_type = "landmark"
                    suggested_time = "morning"
                elif tags.get("leisure") == "park":
                    activity_type = "park"
                    suggested_time = "afternoon"
                
                # Calculate distance from reference point
                distance = calculate_distance(lat, lng, element.get("lat"), element.get("lon"))
                
                suggestions.append({
                    "name": name,
                    "type": activity_type,
                    "lat": element.get("lat"),
                    "lng": element.get("lon"),
                    "distance": round(distance, 0),
                    "suggested_time": suggested_time,
                    "tags": tags,
                    "can_add_to_trip": True
                })
            
            # Sort by distance and limit results
            suggestions = sorted(suggestions, key=lambda x: x["distance"])[:20]
            
            return {
                "trip_id": trip_id,
                "reference_point": {"lat": lat, "lng": lng},
                "radius": radius,
                "suggestions": suggestions,
                "total_found": len(suggestions)
            }
            
    except Exception as e:
        logger.error(f"Nearby suggestions failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Nearby suggestions failed: {str(e)}")

# UTILITY FUNCTIONS

def calculate_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance between two points using Haversine formula"""
    from math import radians, sin, cos, sqrt, asin
    
    R = 6371000  # Earth radius in meters
    phi1 = radians(lat1)
    phi2 = radians(lat2)
    delta_phi = radians(lat2 - lat1)
    delta_lambda = radians(lng2 - lng1)
    
    a = sin(delta_phi/2)**2 + cos(phi1) * cos(phi2) * sin(delta_lambda/2)**2
    c = 2 * asin(sqrt(a))
    
    return R * c

def calculate_route_distance(activities: List[TripActivity]) -> float:
    """Calculate total distance for a route through all activities"""
    if len(activities) < 2:
        return 0
    
    total_distance = 0
    for i in range(len(activities) - 1):
        current = activities[i]
        next_activity = activities[i + 1]
        total_distance += calculate_distance(current.lat, current.lng, next_activity.lat, next_activity.lng)
    
    return total_distance

def optimize_using_nearest_neighbor(activities: List[TripActivity]) -> List[TripActivity]:
    """
    Simple nearest neighbor optimization for route planning
    In production, use more sophisticated algorithms like Genetic Algorithm or Simulated Annealing
    """
    if len(activities) <= 2:
        return activities
    
    # Start with first activity
    optimized = [activities[0]]
    remaining = activities[1:].copy()
    
    while remaining:
        current = optimized[-1]
        
        # Find nearest unvisited activity
        nearest_idx = 0
        min_distance = float('inf')
        
        for i, activity in enumerate(remaining):
            distance = calculate_distance(current.lat, current.lng, activity.lat, activity.lng)
            if distance < min_distance:
                min_distance = distance
                nearest_idx = i
        
        # Add nearest activity to optimized route
        optimized.append(remaining.pop(nearest_idx))
    
    return optimized

def estimate_walking_time(distance_meters: float) -> float:
    """Estimate walking time in minutes (assuming 5 km/h walking speed)"""
    walking_speed_mps = 1.39  # 5 km/h in meters per second
    time_seconds = distance_meters / walking_speed_mps
    return time_seconds / 60  # Convert to minutes

@app.post("/trip/{trip_id}/add-activity")
async def add_activity_to_trip(trip_id: str, activity: TripActivity, day: str, insert_at: Optional[int] = None):
    """
    Add a new activity to an existing trip day
    This would integrate with your trip database in production
    """
    try:
        # In production, this would:
        # 1. Validate trip_id exists and user has permission
        # 2. Insert activity into database
        # 3. Optionally re-optimize the route
        # 4. Return updated day itinerary
        
        return {
            "trip_id": trip_id,
            "day": day,
            "added_activity": activity.dict(),
            "insert_position": insert_at,
            "message": f"Activity '{activity.name}' added to {day}",
            "route_optimization_suggested": True
        }
        
    except Exception as e:
        logger.error(f"Add activity failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to add activity: {str(e)}")

# Keep your existing endpoints
@app.post("/nearby")
async def find_nearby_attractions(request: dict):
    """Find nearby attractions or points of interest (existing endpoint)"""
    try:
        lat = request.get("lat")
        lng = request.get("lng")
        radius = min(request.get("radius", 1000), 5000)
        
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
                tags = element.get("tags", {})
                name = tags.get("name")
                
                if not name:
                    continue
                
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
                
                element_lat = element.get("lat")
                element_lng = element.get("lon")
                
                if not element_lat or not element_lng:
                    continue
                
                distance = calculate_distance(lat, lng, element_lat, element_lng)
                
                attractions.append({
                    "name": name,
                    "type": attr_type,
                    "lat": element_lat,
                    "lng": element_lng,
                    "distance": distance
                })
                
            return sorted(attractions, key=lambda x: x["distance"])
            
    except Exception as e:
        logger.error(f"Nearby search failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Nearby search failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=True)