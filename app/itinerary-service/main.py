from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import httpx
import json
import os
import time
import asyncio
from datetime import datetime, timedelta
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("itinerary-service")

app = FastAPI(
    title="Itinerary Generator Service",
    description="LLM-powered trip itinerary generation service using Ollama",
    version="1.0.0",
)

# In-memory storage for itineraries (in production, use a database)
itinerary_store = {}
generation_status = {}

# Configuration for Ollama
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://ollama:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")

class ItineraryRequest(BaseModel):
    destination: str
    start_date: str
    end_date: str
    preferences: Optional[List[Dict[str, Any]]] = []
    budget: Optional[float] = None

class ItineraryResponse(BaseModel):
    itinerary: Dict[str, Any]

class StatusResponse(BaseModel):
    status: str
    message: str
    eta: Optional[int] = None

@app.get("/")
async def read_root():
    """Health check endpoint"""
    return {"status": "healthy", "service": "itinerary-generator"}

async def generate_with_ollama(prompt):
    """Generate text using Ollama LLM service"""
    try:
        logger.info(f"Calling Ollama with prompt length: {len(prompt)}")
        model = OLLAMA_MODEL
        if ":" not in model:
            model = f"{model}:latest"  # Add :latest if not present
            
        async with httpx.AsyncClient() as client:
            logger.info(f"Sending request to: {OLLAMA_URL}/api/generate with model: {model}")
            response = await client.post(
                f"{OLLAMA_URL}/api/generate",
                json={
                    "model": model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.7,
                        "top_p": 0.9
                    }
                },
                timeout=180.0  # Increased timeout to 3 minutes
            )
            
            logger.info(f"Ollama response status: {response.status_code}")
            if response.status_code != 200:
                logger.error(f"Ollama API error: {response.status_code} - {response.text}")
                return None
                
            result = response.json()
            logger.info(f"Ollama response length: {len(result.get('response', ''))}")
            return result.get("response")
    except Exception as e:
        logger.error(f"Error calling Ollama: {str(e)}, type: {type(e)}")
        return None

# Background task for generating itineraries
async def generate_itinerary_task(trip_id, request):
    """Background task to generate an itinerary using Ollama"""
    try:
        # Update status to in-progress
        generation_status[trip_id] = {
            "status": "processing", 
            "started_at": time.time(),
            "message": "Creating your personalized itinerary with AI..."
        }
        
        # Parse dates
        start_date = datetime.fromisoformat(request.start_date.replace('Z', '+00:00') if 'Z' in request.start_date else request.start_date)
        end_date = datetime.fromisoformat(request.end_date.replace('Z', '+00:00') if 'Z' in request.end_date else request.end_date)
        days_count = (end_date - start_date).days + 1
        
        # Create a simplified prompt
        prompt = f"""Create a simple travel itinerary for {request.destination} for {days_count} days from {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}.

Format as JSON with this structure:
{{
  "Day 1": {{
    "date": "{start_date.strftime('%Y-%m-%d')}",
    "08:00": {{"type": "breakfast", "title": "Breakfast location", "location": "Area"}},
    "10:00": {{"type": "activity", "title": "Morning activity", "location": "Location"}},
    "13:00": {{"type": "lunch", "title": "Lunch spot", "location": "Area"}},
    "15:00": {{"type": "activity", "title": "Afternoon activity", "location": "Location"}},
    "19:00": {{"type": "dinner", "title": "Dinner restaurant", "location": "Area"}}
  }}
}}

Keep it very brief with just these key activities per day.
"""
        
        # Add budget if specified
        if request.budget:
            prompt += f"\n\nConsider a budget of ${request.budget} for the trip."
            
        # Add preferences if specified
        if request.preferences:
            prompt += "\n\nPlease consider these preferences: "
            for pref in request.preferences:
                prompt += f"{pref.get('category', '')}: {pref.get('value', '')}, "
        
        # Call Ollama
        logger.info(f"Sending prompt to Ollama for trip {trip_id}")
        llm_response = await generate_with_ollama(prompt)
        
        # Parse response
        if llm_response:
            logger.info(f"Received response from Ollama for trip {trip_id}")
            try:
                # Try to find JSON in the response
                if "```json" in llm_response and "```" in llm_response.split("```json", 1)[1]:
                    logger.info("Extracting JSON from code block with json tag")
                    json_str = llm_response.split("```json", 1)[1].split("```", 1)[0].strip()
                    itinerary_json = json.loads(json_str)
                elif "```" in llm_response and "```" in llm_response.split("```", 1)[1]:
                    logger.info("Extracting JSON from code block")
                    json_str = llm_response.split("```", 1)[1].split("```", 1)[0].strip()
                    itinerary_json = json.loads(json_str)
                else:
                    # Try to parse the whole response
                    logger.info("Attempting to parse entire response as JSON")
                    itinerary_json = json.loads(llm_response.strip())
                
                # Store the itinerary
                itinerary_store[trip_id] = itinerary_json
                generation_status[trip_id] = {"status": "completed", "completed_at": time.time()}
                logger.info(f"Successfully generated itinerary for trip {trip_id}")
                return
                
            except Exception as e:
                logger.error(f"Error parsing LLM response: {str(e)}")
                logger.error(f"Failed response content: {llm_response[:500]}...")
        else:
            logger.error(f"No response received from Ollama for trip {trip_id}")
        
        # Fallback: Create a template itinerary
        logger.info(f"Using fallback template itinerary for trip {trip_id}")
        itinerary = {}
        
        # Create a day-by-day itinerary
        for i in range(days_count):
            current_date = start_date + timedelta(days=i)
            day_key = f"Day {i+1}"
            
            # Create the day entry with date
            itinerary[day_key] = {
                "date": current_date.strftime("%Y-%m-%d")
            }
            
            # Morning: Breakfast
            itinerary[day_key]["08:00"] = {
                "type": "breakfast",
                "title": f"Breakfast at local café",
                "location": "Near accommodation"
            }
            
            # Morning activity
            itinerary[day_key]["10:00"] = {
                "type": "sightseeing",
                "title": f"Explore {request.destination}",
                "location": "City center"
            }
            
            # Lunch
            itinerary[day_key]["13:00"] = {
                "type": "lunch",
                "title": "Lunch at local restaurant",
                "location": "City center"
            }
            
            # Afternoon activity
            itinerary[day_key]["15:00"] = {
                "type": "sightseeing",
                "title": f"Visit local attractions in {request.destination}",
                "location": "Various locations"
            }
            
            # Dinner
            itinerary[day_key]["19:00"] = {
                "type": "dinner",
                "title": "Dinner at recommended restaurant",
                "location": "City center"
            }
        
        # Store the fallback itinerary
        itinerary_store[trip_id] = itinerary
        generation_status[trip_id] = {"status": "completed", "completed_at": time.time()}
        logger.info(f"Generated fallback itinerary for trip {trip_id}")
        
    except Exception as e:
        logger.error(f"Error generating itinerary: {str(e)}")
        generation_status[trip_id] = {"status": "failed", "error": str(e)}

@app.post("/generate/{trip_id}", status_code=202)
async def start_itinerary_generation(trip_id: str, request: ItineraryRequest, background_tasks: BackgroundTasks):
    """Start generating a personalized travel itinerary based on preferences"""
    
    # Check if itinerary already exists
    if trip_id in itinerary_store:
        return {"message": "Itinerary already exists", "itinerary_id": trip_id}
    
    # Check if generation is already in progress
    if trip_id in generation_status and generation_status[trip_id]["status"] == "processing":
        return {"message": "Itinerary generation in progress", "itinerary_id": trip_id}
    
    # Start background task to generate itinerary
    background_tasks.add_task(generate_itinerary_task, trip_id, request)
    
    # Return accepted status
    return {"message": "Itinerary generation started", "itinerary_id": trip_id}

@app.get("/status/{trip_id}", response_model=StatusResponse)
async def get_generation_status(trip_id: str):
    """Get the status of an itinerary generation task"""
    if trip_id not in generation_status:
        raise HTTPException(status_code=404, detail="No generation task found for this trip")
    
    status = generation_status[trip_id]
    
    if status["status"] == "processing":
        # Calculate ETA (estimate 45 seconds total processing time for LLM)
        elapsed = time.time() - status["started_at"]
        eta = max(1, int(45 - elapsed))
        return {
            "status": "processing", 
            "message": status.get("message", "Itinerary generation in progress"), 
            "eta": eta
        }
    elif status["status"] == "completed":
        return {"status": "completed", "message": "Itinerary generation completed"}
    else:
        return {
            "status": "failed", 
            "message": f"Itinerary generation failed: {status.get('error', 'Unknown error')}"
        }

@app.get("/itinerary/{trip_id}", response_model=ItineraryResponse)
async def get_itinerary(trip_id: str):
    """Get a generated itinerary"""
    if trip_id not in itinerary_store:
        # Check if generation is in progress
        if trip_id in generation_status and generation_status[trip_id]["status"] == "processing":
            raise HTTPException(status_code=202, detail="Itinerary generation in progress")
        raise HTTPException(status_code=404, detail="Itinerary not found")
    
    return {"itinerary": itinerary_store[trip_id]}

# Add this new endpoint
@app.get("/{trip_id}", response_model=ItineraryResponse)
async def get_itinerary_root(trip_id: str):
    """Get a generated itinerary - alias endpoint"""
    return await get_itinerary(trip_id)  # Reuse the existing function

# Add this new endpoint right before the "if __name__ == "__main__":" line
@app.get("/itinerary/itinerary/{trip_id}", response_model=ItineraryResponse)
async def get_itinerary_alternate(trip_id: str):
    """Alternate endpoint to match the frontend request pattern"""
    return await get_itinerary(trip_id)  # Reuse the existing function

@app.get("/test-ollama")
async def test_ollama():
    """Test Ollama connectivity"""
    logger.info("Testing Ollama connection")
    
    # Simple, short prompt
    prompt = "Hello! Please generate a one-sentence itinerary for a trip to Sydney."
    
    # Try both model names
    model_names = ["llama3", "llama3:latest"]
    results = {}
    
    for model in model_names:
        try:
            # Direct call to Ollama
            async with httpx.AsyncClient() as client:
                logger.info(f"Sending request to: {OLLAMA_URL}/api/generate with model: {model}")
                response = await client.post(
                    f"{OLLAMA_URL}/api/generate",
                    json={
                        "model": model,
                        "prompt": prompt,
                        "stream": False,
                        "options": {
                            "temperature": 0.7,
                            "top_p": 0.9
                        }
                    },
                    timeout=180.0  # Extended timeout
                )
                
                logger.info(f"Ollama response status for {model}: {response.status_code}")
                
                if response.status_code == 200:
                    result = response.json()
                    results[model] = {"success": True, "response": result.get("response")}
                else:
                    logger.error(f"Ollama error for {model}: {response.status_code} - {response.text}")
                    results[model] = {"success": False, "error": f"Status: {response.status_code}, Detail: {response.text}"}
        except Exception as e:
            logger.error(f"Exception testing Ollama with {model}: {str(e)}")
            results[model] = {"success": False, "error": str(e)}
    
    return results

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)