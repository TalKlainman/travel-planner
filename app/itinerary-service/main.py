from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import httpx
import json
import os
import time
import re
from datetime import datetime, timedelta
import logging
import asyncpg
import uuid

# Configure logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("itinerary-service")

app = FastAPI(
    title="Itinerary Generator Service",
    description="AI-powered trip itinerary generation service using Groq with address coordinates",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost",
        "http://localhost:3000",
        "http://localhost:3001", 
        "http://127.0.0.1",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL")

# Configuration for Groq
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

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

# Database connection pool
db_pool = None

async def init_db_pool():
    """Initialize database connection pool"""
    global db_pool
    try:
        db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=10)
        logger.info("Database pool initialized")
        
        async with db_pool.acquire() as conn:
            await conn.execute("""
                ALTER TABLE trips 
                ADD COLUMN IF NOT EXISTS generation_status VARCHAR(20) DEFAULT 'pending',
                ADD COLUMN IF NOT EXISTS generation_id UUID,
                ADD COLUMN IF NOT EXISTS generation_started_at TIMESTAMP,
                ADD COLUMN IF NOT EXISTS generation_updated_at TIMESTAMP;
                
                CREATE INDEX IF NOT EXISTS idx_trips_generation_id ON trips(generation_id);
                CREATE INDEX IF NOT EXISTS idx_trips_generation_status ON trips(generation_status);
            """)
            logger.info("Itineraries table ready")
            
    except Exception as e:
        logger.error(f"Failed to initialize database pool: {e}")

async def close_db_pool():
    """Close database connection pool"""
    global db_pool
    if db_pool:
        await db_pool.close()
        logger.info("Database pool closed")

@app.on_event("startup")
async def startup_event():
    await init_db_pool()

@app.on_event("shutdown") 
async def shutdown_event():
    await close_db_pool()

@app.get("/")
async def read_root():
    """Health check endpoint"""
    return {"status": "healthy", "service": "itinerary-generator", "ai_provider": "groq"}

async def get_itinerary_from_db(trip_id: int):
    """Get itinerary from database using trips table"""
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT itinerary, generation_status, generation_id, generation_started_at FROM trips WHERE id = $1",
            trip_id
        )
        return row

async def save_itinerary_to_db(trip_id: int, content: dict, status: str = "completed", generation_id: str = None):
    """Save itinerary to trips table"""
    async with db_pool.acquire() as conn:
        await conn.execute(
            """UPDATE trips 
               SET itinerary = $1, generation_status = $2, generation_updated_at = NOW() 
               WHERE id = $3""",
            json.dumps(content), status, trip_id
        )

async def create_generation_record(trip_id: int):
    """Create a generation record and return generation ID"""
    generation_id = str(uuid.uuid4())
    async with db_pool.acquire() as conn:
        await conn.execute(
            """UPDATE trips 
               SET generation_status = $1, generation_id = $2, generation_started_at = NOW()
               WHERE id = $3""",
            "processing", generation_id, trip_id
        )
    return generation_id

async def generate_with_groq(prompt):
    """Generate text using Groq API - fast and intelligent"""
    if not GROQ_API_KEY:
        logger.error("GROQ_API_KEY not set - check environment variables")
        return None
        
    try:
        logger.info(f"Calling Groq API with prompt length: {len(prompt)}")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "llama3-70b-8192",  # Much smarter than local models
                    "messages": [
                        {"role": "system", "content": "You are a local travel expert with detailed knowledge of specific addresses and locations. You know the exact addresses of popular restaurants, attractions, and landmarks. Always include real, specific addresses in your recommendations."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.3,
                    "max_tokens": 6000  
                },
                timeout=45.0 
            )
            
            logger.info(f"Groq API response status: {response.status_code}")
            if response.status_code != 200:
                logger.error(f"Groq API error: {response.status_code} - {response.text}")
                return None
                
            result = response.json()
            response_text = result["choices"][0]["message"]["content"]
            logger.info(f"Groq response length: {len(response_text)}")
            return response_text
            
    except Exception as e:
        logger.error(f"Groq API error: {e}")
        return None

def clean_and_parse_json(llm_response: str) -> dict:
    """Enhanced JSON cleaning and parsing with multiple fallback strategies"""
    
    try:
        # Strategy 1: Try parsing as-is first
        return json.loads(llm_response.strip())
    except:
        pass
    
    try:
        # Strategy 2: Extract from code blocks
        cleaned_response = llm_response.strip()
        
        if "```json" in cleaned_response:
            logger.info("Extracting JSON from code block with json tag")
            json_str = cleaned_response.split("```json", 1)[1].split("```", 1)[0].strip()
            cleaned_response = json_str
        elif "```" in cleaned_response and cleaned_response.count("```") >= 2:
            logger.info("Extracting JSON from generic code block")
            json_str = cleaned_response.split("```", 1)[1].split("```", 1)[0].strip()
            cleaned_response = json_str
        
        # Strategy 3: Find JSON boundaries
        if '{' in cleaned_response:
            start_pos = cleaned_response.find('{')
            cleaned_response = cleaned_response[start_pos:]
        
        # Strategy 4: Fix malformed keys (Day 1 vs "Day 1")
        cleaned_response = re.sub(r'"Day\s*(\d+)"', r'"Day \1"', cleaned_response)
        cleaned_response = re.sub(r'{\s*"(\d+)":', r'{"Day \1":', cleaned_response)
        
        # Strategy 5: Handle truncated JSON by finding last complete day
        if not cleaned_response.endswith('}'):
            logger.info("JSON appears truncated, attempting to fix")
            # Find the last properly closed brace for a complete entry
            brace_count = 0
            last_valid_pos = 0
            
            for i, char in enumerate(cleaned_response):
                if char == '{':
                    brace_count += 1
                elif char == '}':
                    brace_count -= 1
                    if brace_count == 1:  # Back to main object level
                        last_valid_pos = i
            
            if last_valid_pos > 0:
                cleaned_response = cleaned_response[:last_valid_pos + 1] + '}'
        
        if '}' in cleaned_response and not cleaned_response.endswith('}'):
            end_pos = cleaned_response.rfind('}') + 1
            cleaned_response = cleaned_response[:end_pos]
        
        # Strategy 6: Fix trailing commas
        cleaned_response = re.sub(r',\s*}', '}', cleaned_response)
        cleaned_response = re.sub(r',\s*]', ']', cleaned_response)
        
        logger.info(f"Attempting to parse cleaned JSON: {cleaned_response[:200]}...")
        return json.loads(cleaned_response)
        
    except Exception as e:
        logger.error(f"JSON cleaning failed: {e}")
        logger.error(f"Problematic JSON: {cleaned_response[:500]}...")
    
    # Strategy 7: Smart content extraction - preserve real data from response
    try:
        logger.info("Attempting smart content extraction from malformed response")
        result = {}
        
        # Extract any districts/neighborhoods mentioned
        district_matches = re.findall(r'"district":\s*"([^"]*)"', llm_response)
        
        # Extract any place names mentioned  
        title_matches = re.findall(r'"title":\s*"([^"]*)"', llm_response)
        
        # Extract addresses
        address_matches = re.findall(r'"address":\s*"([^"]*)"', llm_response)
        
        # Extract dates
        date_matches = re.findall(r'"date":\s*"([^"]*)"', llm_response)
        
        # Try to group by days using any day indicators
        day_indicators = re.findall(r'(?:"Day (\d+)"|"(\d+)"|Day (\d+))', llm_response)
        
        # Flatten day numbers and get unique ones
        day_numbers = []
        for match in day_indicators:
            for num in match:
                if num and num not in day_numbers:
                    day_numbers.append(num)
        
        if district_matches and title_matches and len(day_numbers) > 0:
            logger.info(f"Found {len(district_matches)} districts, {len(title_matches)} places, {len(address_matches)} addresses, {len(day_numbers)} days")
            
            for i, day_num in enumerate(day_numbers):
                day_key = f"Day {day_num}"
                
                # Get district for this day
                district_idx = min(i, len(district_matches) - 1)
                district = district_matches[district_idx] if district_matches else "City Center"
                
                # Get date for this day  
                date_idx = min(i, len(date_matches) - 1)
                date = date_matches[date_idx] if date_matches else ""
                
                # Get titles for this day (5 activities per day)
                start_title_idx = i * 5
                day_titles = title_matches[start_title_idx:start_title_idx + 5]
                day_addresses = address_matches[start_title_idx:start_title_idx + 5] if address_matches else []
                
                while len(day_titles) < 5:
                    day_titles.append(f"Local activity in {district}")
                while len(day_addresses) < 5:
                    day_addresses.append(f"{district}, nearby")
                
                result[day_key] = {
                    "date": date,
                    "district": district,
                    "09:00": {"type": "breakfast", "title": day_titles[0], "location": district, "address": day_addresses[0]},
                    "11:00": {"type": "sightseeing", "title": day_titles[1], "location": district, "address": day_addresses[1]},
                    "13:00": {"type": "lunch", "title": day_titles[2], "location": district, "address": day_addresses[2]},
                    "15:30": {"type": "activity", "title": day_titles[3], "location": district, "address": day_addresses[3]},
                    "19:00": {"type": "dinner", "title": day_titles[4], "location": district, "address": day_addresses[4]}
                }
            
            if result:
                logger.info(f"Smart extraction created {len(result)} days with real place names and addresses")
                return result
                
    except Exception as e:
        logger.error(f"Smart content extraction failed: {e}")
    
    # Strategy 8: Return None to trigger fallback
    return None

def create_geographic_prompt_with_addresses(request: ItineraryRequest, start_date: datetime, end_date: datetime, days_count: int) -> str:
    """Create a detailed geographic prompt that requests specific addresses"""
    
    prompt = f"""Create a {days_count}-day {request.destination} itinerary with SPECIFIC ADDRESSES.

CRITICAL REQUIREMENTS:
- Each day = ONE neighborhood/district only (walking distance)
- Include REAL, SPECIFIC street addresses for every location
- Use actual restaurant names, attraction names, and their real addresses
- Activities within 2-3km of each other per day

PREFERENCES:"""
    
    if request.preferences:
        for pref in request.preferences:
            value = pref.get('value', '')
            weight = pref.get('weight', 5)
            if weight >= 6:
                prompt += f"\n- {value}"
    else:
        prompt += "\n- Mix of sightseeing, local food, and cultural experiences"

    prompt += f"""

EXAMPLE ADDRESS FORMAT:
- "Ristorante Da Valentino, Via del Collegio Romano 20, Rome"
- "Pantheon, Piazza della Rotonda, Rome" 
- "Caffè Sant'Eustachio, Piazza di Sant'Eustachio 82, Rome"

JSON FORMAT (include real addresses):
{{"""

    for i in range(days_count):
        current_date = start_date + timedelta(days=i)
        
        if i > 0:
            prompt += ","
            
        prompt += f'''
  "Day {i+1}": {{
    "date": "{current_date.strftime('%Y-%m-%d')}",
    "district": "Real {request.destination} neighborhood name",
    "09:00": {{
      "type": "breakfast",
      "title": "Real cafe/restaurant name",
      "location": "Same district",
      "address": "Full street address with number and district"
    }},
    "11:00": {{
      "type": "sightseeing", 
      "title": "Real attraction/landmark name",
      "location": "Same district",
      "address": "Full street address or piazza name"
    }},
    "13:00": {{
      "type": "lunch",
      "title": "Real restaurant name", 
      "location": "Same district",
      "address": "Full street address with number"
    }},
    "15:30": {{
      "type": "activity",
      "title": "Real museum/activity/park name",
      "location": "Same district", 
      "address": "Full street address or location"
    }},
    "19:00": {{
      "type": "dinner",
      "title": "Real restaurant name",
      "location": "Same district",
      "address": "Full street address with number"
    }}
  }}'''

    prompt += f"""
}}

IMPORTANT: 
- Use your knowledge of real {request.destination} addresses
- Include street numbers when possible
- Restaurants should have real names and addresses
- Group activities by actual walking-distance neighborhoods
- Each address should be specific enough for map geocoding

Return ONLY valid JSON with real addresses."""

    return prompt

async def generate_itinerary_task(trip_id: int, request: ItineraryRequest, generation_id: str):
    """Background task to generate an itinerary using Groq with address information"""
    try:
        logger.info(f"Starting itinerary generation for trip {trip_id}, generation {generation_id}")
        logger.info(f"Date range: {request.start_date} to {request.end_date}")
        
        # Parse dates
        start_date = datetime.fromisoformat(request.start_date.replace('Z', '+00:00') if 'Z' in request.start_date else request.start_date)
        end_date = datetime.fromisoformat(request.end_date.replace('Z', '+00:00') if 'Z' in request.end_date else request.end_date)
        days_count = (end_date - start_date).days + 1
        
        logger.info(f"Calculated days_count: {days_count} (from {start_date.date()} to {end_date.date()})")
        
        # Create detailed prompt with address requirements
        prompt = create_geographic_prompt_with_addresses(request, start_date, end_date, days_count)
        
        logger.info(f"Generated address-enhanced prompt for {days_count} days")
        
        # Call Groq API
        logger.info(f"Sending address-enhanced prompt to Groq for trip {trip_id}")
        llm_response = await generate_with_groq(prompt)
        
        # Parse response with ROBUST JSON handling
        if llm_response:
            logger.info(f"Received response from Groq for trip {trip_id}")
            logger.info(f"Raw response preview: {llm_response[:300]}...")
            
            # Use robust JSON parser
            itinerary_json = clean_and_parse_json(llm_response)
            
            if itinerary_json:
                # Validate that addresses were included
                has_addresses = False
                for day_key, day_data in itinerary_json.items():
                    if isinstance(day_data, dict):
                        for time_key, activity in day_data.items():
                            if isinstance(activity, dict) and 'address' in activity:
                                has_addresses = True
                                break
                        if has_addresses:
                            break
                
                if has_addresses:
                    logger.info(f" Successfully generated itinerary with addresses for trip {trip_id}")
                else:
                    logger.warning(f" Generated itinerary lacks address information for trip {trip_id}")
                
                # Save to database
                await save_itinerary_to_db(trip_id, itinerary_json, "completed", generation_id)
                logger.info(f"Successfully generated and saved itinerary for trip {trip_id}")
                return
            else:
                logger.error("All JSON parsing strategies failed")
        else:
            logger.error(f"No response received from Groq for trip {trip_id}")
        
        # fallback: Create template itinerary with sample addresses
        logger.info(f"Using enhanced fallback template itinerary with sample addresses for trip {trip_id}")
        
        # City-specific fallback data 
        city_data = {
            "rome": {
                "neighborhoods": ["Trastevere", "Centro Storico", "Vatican", "Testaccio", "Monti"],
                "sample_addresses": [
                    "Via dei Cappuccini 15",
                    "Piazza Navona 25", 
                    "Via del Corso 100",
                    "Via Nazionale 50",
                    "Piazza di Spagna 10"
                ]
            },
            "paris": {
                "neighborhoods": ["Marais", "Saint-Germain", "Montmartre", "Latin Quarter", "Champs-Élysées"],
                "sample_addresses": [
                    "Rue de Rivoli 15",
                    "Boulevard Saint-Germain 25",
                    "Place du Tertre 5",
                    "Rue Mouffetard 30",
                    "Avenue des Champs-Élysées 100"
                ]
            },
            "barcelona": {
                "neighborhoods": ["Gràcia", "Gothic Quarter", "Eixample", "Born", "Barceloneta"],
                "sample_addresses": [
                    "Carrer Gran de Gràcia 15",
                    "Plaça del Pi 5",
                    "Passeig de Gràcia 100", 
                    "Carrer Montcada 25",
                    "Passeig Marítim 10"
                ]
            }
        }
        
        destination_key = request.destination.lower()
        city_info = city_data.get(destination_key, {
            "neighborhoods": ["City Center", "Historic District", "Arts Quarter", "Waterfront", "Old Town"],
            "sample_addresses": ["Main Street 100", "Central Square 25", "Historic Avenue 50", "Riverside Road 75", "Culture Street 30"]
        })
        
        itinerary = {}
        
        for i in range(days_count):
            current_date = start_date + timedelta(days=i)
            day_key = f"Day {i+1}"
            neighborhood = city_info["neighborhoods"][i % len(city_info["neighborhoods"])]
            base_address = city_info["sample_addresses"][i % len(city_info["sample_addresses"])]
            
            itinerary[day_key] = {
                "date": current_date.strftime("%Y-%m-%d"),
                "district": neighborhood,
                "09:00": {
                    "type": "breakfast", 
                    "title": f"Local breakfast café in {neighborhood}", 
                    "location": neighborhood,
                    "address": f"Breakfast Café, {base_address}, {neighborhood}"
                },
                "11:00": {
                    "type": "sightseeing", 
                    "title": f"Main attraction in {neighborhood}", 
                    "location": neighborhood,
                    "address": f"Historic Site, {base_address.replace('100', '25')}, {neighborhood}"
                },
                "13:00": {
                    "type": "lunch", 
                    "title": f"Traditional restaurant in {neighborhood}", 
                    "location": neighborhood,
                    "address": f"Local Restaurant, {base_address.replace('100', '50')}, {neighborhood}"
                },
                "15:30": {
                    "type": "activity", 
                    "title": f"Cultural activity in {neighborhood}", 
                    "location": neighborhood,
                    "address": f"Cultural Center, {base_address.replace('100', '75')}, {neighborhood}"
                },
                "19:00": {
                    "type": "dinner", 
                    "title": f"Dinner restaurant in {neighborhood}", 
                    "location": neighborhood,
                    "address": f"Evening Restaurant, {base_address.replace('100', '90')}, {neighborhood}"
                }
            }
        
        # Save fallback itinerary with addresses
        await save_itinerary_to_db(trip_id, itinerary, "completed", generation_id)
        logger.info(f"Generated and saved enhanced fallback itinerary with addresses for trip {trip_id}")
        
    except Exception as e:
        logger.error(f"Error generating itinerary for trip {trip_id}: {str(e)}")
        # Mark as failed in database
        try:
            await save_itinerary_to_db(trip_id, {"error": str(e)}, "failed", generation_id)
        except:
            pass

@app.post("/generate/{trip_id}", status_code=202)
async def start_itinerary_generation(trip_id: str, request: ItineraryRequest, background_tasks: BackgroundTasks):
    """Start generating a personalized travel itinerary with addresses"""
    
    try:
        trip_id_int = int(trip_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Trip ID must be an integer")
    
    # Check if itinerary already exists
    existing = await get_itinerary_from_db(trip_id_int)
    if existing and existing['generation_status'] == 'completed':
        return {"message": "Itinerary already exists", "itinerary_id": trip_id}
    
    # Check if generation is already in progress
    if existing and existing['generation_status'] == 'processing':
        return {"message": "Itinerary generation in progress", "itinerary_id": trip_id}
    
    # Create new generation record
    generation_id = await create_generation_record(trip_id_int)
    
    # Start background task
    background_tasks.add_task(generate_itinerary_task, trip_id_int, request, generation_id)
    
    return {"message": "Itinerary generation started", "itinerary_id": trip_id}

@app.get("/status/{trip_id}", response_model=StatusResponse)
async def get_generation_status_endpoint(trip_id: str):
    """Get the status of an itinerary generation task"""
    try:
        trip_id_int = int(trip_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Trip ID must be an integer")
    
    itinerary_data = await get_itinerary_from_db(trip_id_int)
    
    if not itinerary_data:
        raise HTTPException(status_code=404, detail="No generation task found for this trip")
    
    status = itinerary_data['generation_status']
    
    if status == 'processing':
        creation_time = itinerary_data.get('generation_started_at', datetime.now())
        if hasattr(creation_time, 'timestamp'):
            elapsed = time.time() - creation_time.timestamp()
        else:
            elapsed = 0
        eta = max(1, int(15 - elapsed)) 
        return {"status": "processing", "message": "Itinerary generation in progress", "eta": eta}
    elif status == 'completed':
        return {"status": "completed", "message": "Itinerary generation completed"}
    else:
        return {"status": "failed", "message": "Itinerary generation failed"}

@app.get("/itinerary/{trip_id}", response_model=ItineraryResponse)
async def get_itinerary(trip_id: str):
    """Get a generated itinerary with addresses"""
    try:
        trip_id_int = int(trip_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Trip ID must be an integer")
    
    itinerary_data = await get_itinerary_from_db(trip_id_int)
    
    if not itinerary_data:
        raise HTTPException(status_code=404, detail="Itinerary not found")
    
    if itinerary_data['generation_status'] == 'processing':
        raise HTTPException(status_code=202, detail="Itinerary generation in progress")
    
    if itinerary_data['generation_status'] == 'failed':
        raise HTTPException(status_code=500, detail="Itinerary generation failed")
    
    # Parse JSON content
    try:
        content = json.loads(itinerary_data['itinerary']) if isinstance(itinerary_data['itinerary'], str) else itinerary_data['itinerary']
    except:
        content = itinerary_data['itinerary']
    
    return {"itinerary": content}

@app.get("/{trip_id}", response_model=ItineraryResponse)
async def get_itinerary_root(trip_id: str):
    return await get_itinerary(trip_id)

@app.get("/itinerary/itinerary/{trip_id}", response_model=ItineraryResponse)
async def get_itinerary_alternate(trip_id: str):
    return await get_itinerary(trip_id)

@app.delete("/clear/{trip_id}")
async def clear_itinerary(trip_id: str):
    """Clear itinerary for a specific trip - Fixed version"""
    try:
        trip_id_int = int(trip_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Trip ID must be an integer")
    
    try:
        async with db_pool.acquire() as conn:
            # First check if the trip exists 
            trip_exists = await conn.fetchval(
                "SELECT EXISTS(SELECT 1 FROM trips WHERE id = $1)",
                trip_id_int
            )
            
            if not trip_exists:
                logger.info(f"Trip {trip_id} not found, but clearing is idempotent")
                return {"message": f"Cleared itinerary for trip {trip_id} (trip not found, but operation successful)"}
            
            # Clear the itinerary
            result = await conn.execute(
                """UPDATE trips 
                   SET itinerary = NULL, generation_status = 'pending', generation_id = NULL, 
                       generation_started_at = NULL, generation_updated_at = NULL 
                   WHERE id = $1""", 
                trip_id_int
            )
            
            logger.info(f"Successfully cleared itinerary for trip {trip_id}")
            return {"message": f"Cleared itinerary for trip {trip_id}"}
            
    except Exception as e:
        logger.error(f"Error clearing itinerary for trip {trip_id}: {e}")
        return {"message": f"Cleared itinerary for trip {trip_id} (with warning: {str(e)})"}

@app.delete("/clear-all")
async def clear_all_itineraries():
    """Clear all itineraries (for testing)"""
    async with db_pool.acquire() as conn:
        await conn.execute(
            """UPDATE trips 
               SET itinerary = NULL, generation_status = 'pending', generation_id = NULL,
                   generation_started_at = NULL, generation_updated_at = NULL"""
        )
    
    return {"message": "Cleared all itineraries"}

@app.get("/test")
async def test_endpoint():
    """Test endpoint to verify CORS is working"""
    return {"message": "CORS is working!", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)