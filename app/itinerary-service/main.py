# from fastapi import FastAPI, HTTPException, BackgroundTasks
# from pydantic import BaseModel
# from typing import List, Dict, Any, Optional
# import httpx
# import json
# import os
# import time
# import asyncio
# from datetime import datetime, timedelta
# import logging
# import asyncpg
# import uuid

# # Configure logging
# logging.basicConfig(level=logging.INFO, 
#                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
# logger = logging.getLogger("itinerary-service")

# app = FastAPI(
#     title="Itinerary Generator Service",
#     description="LLM-powered trip itinerary generation service using Ollama",
#     version="1.0.0",
# )

# # Database configuration
# DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@postgres-service:5432/traveldb")

# # Configuration for Ollama
# OLLAMA_URL = os.getenv("OLLAMA_URL", "http://ollama:11434")
# OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma2:2b")

# class ItineraryRequest(BaseModel):
#     destination: str
#     start_date: str
#     end_date: str
#     preferences: Optional[List[Dict[str, Any]]] = []
#     budget: Optional[float] = None

# class ItineraryResponse(BaseModel):
#     itinerary: Dict[str, Any]

# class StatusResponse(BaseModel):
#     status: str
#     message: str
#     eta: Optional[int] = None

# # Database connection pool
# db_pool = None

# async def init_db_pool():
#     """Initialize database connection pool"""
#     global db_pool
#     try:
#         db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=10)
#         logger.info("Database pool initialized")
        
#         # Add generation tracking columns to trips table if they don't exist
#         async with db_pool.acquire() as conn:
#             await conn.execute("""
#                 ALTER TABLE trips 
#                 ADD COLUMN IF NOT EXISTS generation_status VARCHAR(20) DEFAULT 'pending',
#                 ADD COLUMN IF NOT EXISTS generation_id UUID,
#                 ADD COLUMN IF NOT EXISTS generation_started_at TIMESTAMP,
#                 ADD COLUMN IF NOT EXISTS generation_updated_at TIMESTAMP;
                
#                 CREATE INDEX IF NOT EXISTS idx_trips_generation_id ON trips(generation_id);
#                 CREATE INDEX IF NOT EXISTS idx_trips_generation_status ON trips(generation_status);
#             """)
#             logger.info("Itineraries table ready")
            
#     except Exception as e:
#         logger.error(f"Failed to initialize database pool: {e}")

# async def close_db_pool():
#     """Close database connection pool"""
#     global db_pool
#     if db_pool:
#         await db_pool.close()
#         logger.info("Database pool closed")

# @app.on_event("startup")
# async def startup_event():
#     await init_db_pool()

# @app.on_event("shutdown") 
# async def shutdown_event():
#     await close_db_pool()

# @app.get("/")
# async def read_root():
#     """Health check endpoint"""
#     return {"status": "healthy", "service": "itinerary-generator"}

# async def get_itinerary_from_db(trip_id: int):
#     """Get itinerary from database using trips table"""
#     async with db_pool.acquire() as conn:
#         row = await conn.fetchrow(
#             "SELECT itinerary, generation_status, generation_id, generation_started_at FROM trips WHERE id = $1",
#             trip_id
#         )
#         return row

# async def save_itinerary_to_db(trip_id: int, content: dict, status: str = "completed", generation_id: str = None):
#     """Save itinerary to trips table"""
#     async with db_pool.acquire() as conn:
#         await conn.execute(
#             """UPDATE trips 
#                SET itinerary = $1, generation_status = $2, generation_updated_at = NOW() 
#                WHERE id = $3""",
#             json.dumps(content), status, trip_id
#         )

# async def create_generation_record(trip_id: int):
#     """Create a generation record and return generation ID"""
#     generation_id = str(uuid.uuid4())
#     async with db_pool.acquire() as conn:
#         await conn.execute(
#             """UPDATE trips 
#                SET generation_status = $1, generation_id = $2, generation_started_at = NOW()
#                WHERE id = $3""",
#             "processing", generation_id, trip_id
#         )
#     return generation_id

# async def get_generation_status(generation_id: str):
#     """Get generation status from trips table"""
#     async with db_pool.acquire() as conn:
#         row = await conn.fetchrow(
#             "SELECT generation_status, generation_started_at FROM trips WHERE generation_id = $1",
#             generation_id
#         )
#         return row

# async def generate_with_ollama(prompt):
#     """Generate text using Ollama LLM service"""
#     try:
#         logger.info(f"Calling Ollama with prompt length: {len(prompt)}")
#         model = OLLAMA_MODEL
#         if ":" not in model:
#             model = f"{model}:latest"
            
#         async with httpx.AsyncClient() as client:
#             logger.info(f"Sending request to: {OLLAMA_URL}/api/generate with model: {model}")
#             response = await client.post(
#                 f"{OLLAMA_URL}/api/generate",
#                 json={
#                     "model": model,
#                     "prompt": prompt,
#                     "stream": False,
#                     "options": {
#                         "temperature": 0.7,
#                         "top_p": 0.9
#                     }
#                 },
#                 timeout=600.0
#             )
            
#             logger.info(f"Ollama response status: {response.status_code}")
#             if response.status_code != 200:
#                 logger.error(f"Ollama API error: {response.status_code} - {response.text}")
#                 return None
                
#             result = response.json()
#             logger.info(f"Ollama response length: {len(result.get('response', ''))}")
#             return result.get("response")
#     except Exception as e:
#         logger.error(f"Error calling Ollama: {str(e)}, type: {type(e)}")
#         return None

# def create_geographic_prompt(request: ItineraryRequest, start_date: datetime, end_date: datetime, days_count: int) -> str:
#     """Create a simple prompt optimized for small models"""
    
#     prompt = f"""Create a {days_count} day travel itinerary for {request.destination} from {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}.

# RULES:
# - Each day stay in 1 neighborhood only
# - All activities walking distance from each other
# - Real specific places and restaurants"""

#     # Add preferences very simply
#     if request.preferences:
#         prompt += "\n\nUser wants:"
#         for pref in request.preferences:
#             value = pref.get('value', '')
#             weight = pref.get('weight', 5)
#             if weight >= 6:
#                 prompt += f"\n- {value} (important)"
#             else:
#                 prompt += f"\n- {value}"

#     prompt += f"""

# Generate exactly {days_count} days in JSON format:
# {{"""

#     for i in range(days_count):
#         current_date = start_date + timedelta(days=i)
#         if i > 0:
#             prompt += ","
#         prompt += f'''
#   "Day {i+1}": {{
#     "date": "{current_date.strftime('%Y-%m-%d')}",
#     "08:00": {{"type": "breakfast", "title": "Breakfast place", "location": "area"}},
#     "10:00": {{"type": "activity", "title": "Activity", "location": "same area"}},
#     "13:00": {{"type": "lunch", "title": "Lunch place", "location": "same area"}},
#     "15:00": {{"type": "activity", "title": "Activity", "location": "same area"}},
#     "19:00": {{"type": "dinner", "title": "Dinner place", "location": "same area"}}
#   }}'''

#     prompt += "\n}\n\nReturn only JSON."
    
#     return prompt

# async def generate_itinerary_task(trip_id: int, request: ItineraryRequest, generation_id: str):
#     """Background task to generate an itinerary using Ollama"""
#     try:
#         logger.info(f"Starting itinerary generation for trip {trip_id}, generation {generation_id}")
#         logger.info(f"Date range: {request.start_date} to {request.end_date}")
        
#         # Parse dates
#         start_date = datetime.fromisoformat(request.start_date.replace('Z', '+00:00') if 'Z' in request.start_date else request.start_date)
#         end_date = datetime.fromisoformat(request.end_date.replace('Z', '+00:00') if 'Z' in request.end_date else request.end_date)
#         days_count = (end_date - start_date).days + 1
        
#         logger.info(f"Calculated days_count: {days_count} (from {start_date.date()} to {end_date.date()})")
        
#         # Create geographically-aware prompt
#         prompt = create_geographic_prompt(request, start_date, end_date, days_count)
        
#         logger.info(f"Generated geographic prompt for {days_count} days")
        
#         # Call Ollama
#         logger.info(f"Sending prompt to Ollama for trip {trip_id}")
#         llm_response = await generate_with_ollama(prompt)
        
#         # Parse response with improved JSON handling
#         if llm_response:
#             logger.info(f"Received response from Ollama for trip {trip_id}")
#             try:
#                 # Clean the response
#                 cleaned_response = llm_response.strip()
                
#                 if '{' in cleaned_response:
#                     cleaned_response = cleaned_response[cleaned_response.find('{'):]
                
#                 if '}' in cleaned_response:
#                     cleaned_response = cleaned_response[:cleaned_response.rfind('}') + 1]
                
#                 # Try to find JSON in code blocks
#                 if "```json" in llm_response:
#                     logger.info("Extracting JSON from code block with json tag")
#                     json_str = llm_response.split("```json", 1)[1].split("```", 1)[0].strip()
#                     cleaned_response = json_str
#                 elif "```" in llm_response and llm_response.count("```") >= 2:
#                     logger.info("Extracting JSON from generic code block")
#                     json_str = llm_response.split("```", 1)[1].split("```", 1)[0].strip()
#                     cleaned_response = json_str
                
#                 # Additional cleaning
#                 cleaned_response = cleaned_response.replace('\n', ' ')
#                 cleaned_response = ' '.join(cleaned_response.split())
                
#                 logger.info(f"Attempting to parse cleaned JSON of length: {len(cleaned_response)}")
#                 itinerary_json = json.loads(cleaned_response)
                
#                 # Save to database
#                 await save_itinerary_to_db(trip_id, itinerary_json, "completed", generation_id)
#                 logger.info(f"Successfully generated and saved itinerary for trip {trip_id}")
#                 return
                
#             except json.JSONDecodeError as e:
#                 logger.error(f"Error parsing LLM response for trip {trip_id}: {str(e)}")
#                 logger.error(f"Failed response content: {cleaned_response[:500]}...")
#             except Exception as e:
#                 logger.error(f"Unexpected error parsing response for trip {trip_id}: {str(e)}")
#         else:
#             logger.error(f"No response received from Ollama for trip {trip_id}")
        
#         # Fallback: Create template itinerary
#         logger.info(f"Using fallback template itinerary for trip {trip_id}")
#         itinerary = {}
        
#         for i in range(days_count):
#             current_date = start_date + timedelta(days=i)
#             day_key = f"Day {i+1}"
            
#             itinerary[day_key] = {
#                 "date": current_date.strftime("%Y-%m-%d"),
#                 "08:00": {"type": "breakfast", "title": "Breakfast at local café", "location": "City center"},
#                 "10:00": {"type": "sightseeing", "title": f"Explore {request.destination}", "location": "City center"},
#                 "13:00": {"type": "lunch", "title": "Lunch at local restaurant", "location": "City center"},
#                 "15:00": {"type": "sightseeing", "title": f"Visit local attractions in {request.destination}", "location": "City center"},
#                 "19:00": {"type": "dinner", "title": "Dinner at recommended restaurant", "location": "City center"}
#             }
        
#         # Save fallback itinerary
#         await save_itinerary_to_db(trip_id, itinerary, "completed", generation_id)
#         logger.info(f"Generated and saved fallback itinerary for trip {trip_id}")
        
#     except Exception as e:
#         logger.error(f"Error generating itinerary for trip {trip_id}: {str(e)}")
#         # Mark as failed in database
#         try:
#             await save_itinerary_to_db(trip_id, {"error": str(e)}, "failed", generation_id)
#         except:
#             pass

# @app.post("/generate/{trip_id}", status_code=202)
# async def start_itinerary_generation(trip_id: str, request: ItineraryRequest, background_tasks: BackgroundTasks):
#     """Start generating a personalized travel itinerary"""
    
#     try:
#         trip_id_int = int(trip_id)
#     except ValueError:
#         raise HTTPException(status_code=400, detail="Trip ID must be an integer")
    
#     # Check if itinerary already exists
#     existing = await get_itinerary_from_db(trip_id_int)
#     if existing and existing['generation_status'] == 'completed':
#         return {"message": "Itinerary already exists", "itinerary_id": trip_id}
    
#     # Check if generation is already in progress
#     if existing and existing['generation_status'] == 'processing':
#         return {"message": "Itinerary generation in progress", "itinerary_id": trip_id}
    
#     # Create new generation record
#     generation_id = await create_generation_record(trip_id_int)
    
#     # Start background task
#     background_tasks.add_task(generate_itinerary_task, trip_id_int, request, generation_id)
    
#     return {"message": "Itinerary generation started", "itinerary_id": trip_id}

# @app.get("/status/{trip_id}", response_model=StatusResponse)
# async def get_generation_status_endpoint(trip_id: str):
#     """Get the status of an itinerary generation task"""
#     try:
#         trip_id_int = int(trip_id)
#     except ValueError:
#         raise HTTPException(status_code=400, detail="Trip ID must be an integer")
    
#     itinerary_data = await get_itinerary_from_db(trip_id_int)
    
#     if not itinerary_data:
#         raise HTTPException(status_code=404, detail="No generation task found for this trip")
    
#     status = itinerary_data['generation_status']
    
#     if status == 'processing':
#         # Calculate ETA
#         creation_time = itinerary_data.get('generation_started_at', datetime.now())
#         if hasattr(creation_time, 'timestamp'):
#             elapsed = time.time() - creation_time.timestamp()
#         else:
#             elapsed = 0
#         eta = max(1, int(45 - elapsed))
#         return {"status": "processing", "message": "Itinerary generation in progress", "eta": eta}
#     elif status == 'completed':
#         return {"status": "completed", "message": "Itinerary generation completed"}
#     else:
#         return {"status": "failed", "message": "Itinerary generation failed"}

# @app.get("/itinerary/{trip_id}", response_model=ItineraryResponse)
# async def get_itinerary(trip_id: str):
#     """Get a generated itinerary"""
#     try:
#         trip_id_int = int(trip_id)
#     except ValueError:
#         raise HTTPException(status_code=400, detail="Trip ID must be an integer")
    
#     itinerary_data = await get_itinerary_from_db(trip_id_int)
    
#     if not itinerary_data:
#         raise HTTPException(status_code=404, detail="Itinerary not found")
    
#     if itinerary_data['generation_status'] == 'processing':
#         raise HTTPException(status_code=202, detail="Itinerary generation in progress")
    
#     if itinerary_data['generation_status'] == 'failed':
#         raise HTTPException(status_code=500, detail="Itinerary generation failed")
    
#     # Parse JSON content
#     try:
#         content = json.loads(itinerary_data['itinerary']) if isinstance(itinerary_data['itinerary'], str) else itinerary_data['itinerary']
#     except:
#         content = itinerary_data['itinerary']
    
#     return {"itinerary": content}

# # Alias endpoints
# @app.get("/{trip_id}", response_model=ItineraryResponse)
# async def get_itinerary_root(trip_id: str):
#     return await get_itinerary(trip_id)

# @app.get("/itinerary/itinerary/{trip_id}", response_model=ItineraryResponse)
# async def get_itinerary_alternate(trip_id: str):
#     return await get_itinerary(trip_id)

# # Admin endpoints for testing
# @app.delete("/clear/{trip_id}")
# async def clear_itinerary(trip_id: str):
#     """Clear itinerary for a specific trip"""
#     try:
#         trip_id_int = int(trip_id)
#     except ValueError:
#         raise HTTPException(status_code=400, detail="Trip ID must be an integer")
    
#     async with db_pool.acquire() as conn:
#         await conn.execute(
#             """UPDATE trips 
#                SET itinerary = NULL, generation_status = 'pending', generation_id = NULL, 
#                    generation_started_at = NULL, generation_updated_at = NULL 
#                WHERE id = $1""", 
#             trip_id_int
#         )
    
#     return {"message": f"Cleared itinerary for trip {trip_id}"}

# @app.delete("/clear-all")
# async def clear_all_itineraries():
#     """Clear all itineraries (for testing)"""
#     async with db_pool.acquire() as conn:
#         await conn.execute(
#             """UPDATE trips 
#                SET itinerary = NULL, generation_status = 'pending', generation_id = NULL,
#                    generation_started_at = NULL, generation_updated_at = NULL"""
#         )
    
#     return {"message": "Cleared all itineraries"}

# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)

from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import httpx
import json
import os
import time
import asyncio
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
    description="AI-powered trip itinerary generation service using Groq",
    version="1.0.0",
)

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@postgres-service:5432/traveldb")

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
        
        # Add generation tracking columns to trips table if they don't exist
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
                        {"role": "system", "content": "You are a travel expert who creates geographically logical itineraries. Always return valid JSON with real place names."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.3,
                    "max_tokens": 4000  # Increased for longer itineraries
                },
                timeout=30.0  
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
            logger.info(f"Found {len(district_matches)} districts, {len(title_matches)} places, {len(day_numbers)} days")
            
            # Distribute content across days
            districts_per_day = len(district_matches) // len(day_numbers) if len(day_numbers) > 0 else 1
            titles_per_day = len(title_matches) // len(day_numbers) if len(day_numbers) > 0 else 5
            
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
                
                # Pad with generic titles if not enough
                while len(day_titles) < 5:
                    day_titles.append(f"Local activity in {district}")
                
                result[day_key] = {
                    "date": date,
                    "district": district,
                    "09:00": {"type": "breakfast", "title": day_titles[0], "location": district},
                    "11:00": {"type": "sightseeing", "title": day_titles[1], "location": district},
                    "13:00": {"type": "lunch", "title": day_titles[2], "location": district},
                    "15:30": {"type": "activity", "title": day_titles[3], "location": district},
                    "19:00": {"type": "dinner", "title": day_titles[4], "location": district}
                }
            
            if result:
                logger.info(f"Smart extraction created {len(result)} days with real place names")
                return result
                
    except Exception as e:
        logger.error(f"Smart content extraction failed: {e}")
    
    # Strategy 8: Return None to trigger fallback
    return None

def create_geographic_prompt(request: ItineraryRequest, start_date: datetime, end_date: datetime, days_count: int) -> str:
    """Create a concise geographic prompt to avoid token limits"""
    
    prompt = f"""Create a {days_count}-day {request.destination} itinerary.

RULES:
- Each day = ONE neighborhood only
- Walking distance activities  
- Real place names only

PREFERENCES:"""
    
    if request.preferences:
        for pref in request.preferences:
            value = pref.get('value', '')
            weight = pref.get('weight', 5)
            if weight >= 6:
                prompt += f"\n- {value}"
    else:
        prompt += "\n- Sightseeing & local food"

    prompt += f"""

JSON format:
{{"""

    for i in range(days_count):
        current_date = start_date + timedelta(days=i)
        
        if i > 0:
            prompt += ","
            
        prompt += f'''
  "Day {i+1}": {{
    "date": "{current_date.strftime('%Y-%m-%d')}",
    "district": "Real {request.destination} neighborhood",
    "09:00": {{"type": "breakfast", "title": "Real cafe name", "location": "Same district"}},
    "11:00": {{"type": "sightseeing", "title": "Real attraction", "location": "Same district"}},
    "13:00": {{"type": "lunch", "title": "Real restaurant", "location": "Same district"}},
    "15:30": {{"type": "activity", "title": "Real activity", "location": "Same district"}},
    "19:00": {{"type": "dinner", "title": "Real restaurant", "location": "Same district"}}
  }}'''

    prompt += f"""
}}

Return only valid JSON."""

    return prompt

async def generate_itinerary_task(trip_id: int, request: ItineraryRequest, generation_id: str):
    """Background task to generate an itinerary using Groq with robust parsing"""
    try:
        logger.info(f"Starting itinerary generation for trip {trip_id}, generation {generation_id}")
        logger.info(f"Date range: {request.start_date} to {request.end_date}")
        
        # Parse dates
        start_date = datetime.fromisoformat(request.start_date.replace('Z', '+00:00') if 'Z' in request.start_date else request.start_date)
        end_date = datetime.fromisoformat(request.end_date.replace('Z', '+00:00') if 'Z' in request.end_date else request.end_date)
        days_count = (end_date - start_date).days + 1
        
        logger.info(f"Calculated days_count: {days_count} (from {start_date.date()} to {end_date.date()})")
        
        # Create geographically-aware prompt
        prompt = create_geographic_prompt(request, start_date, end_date, days_count)
        
        logger.info(f"Generated geographic prompt for {days_count} days")
        
        # Call Groq API
        logger.info(f"Sending prompt to Groq for trip {trip_id}")
        llm_response = await generate_with_groq(prompt)
        
        # Parse response with ROBUST JSON handling
        if llm_response:
            logger.info(f"Received response from Groq for trip {trip_id}")
            logger.info(f"Raw response preview: {llm_response[:200]}...")
            
            # Use robust JSON parser
            itinerary_json = clean_and_parse_json(llm_response)
            
            if itinerary_json:
                # Save to database
                await save_itinerary_to_db(trip_id, itinerary_json, "completed", generation_id)
                logger.info(f"Successfully generated and saved itinerary for trip {trip_id}")
                return
            else:
                logger.error("All JSON parsing strategies failed")
        else:
            logger.error(f"No response received from Groq for trip {trip_id}")
        
        # Fallback: Create template itinerary with neighborhood logic
        logger.info(f"Using enhanced fallback template itinerary for trip {trip_id}")
        
        # Generic neighborhood names that work for any city
        generic_neighborhoods = [
            "City Center", "Historic District", "Old Town", 
            "Cultural Quarter", "Arts District", "Waterfront Area",
            "Downtown", "Business District", "Shopping District",
            "Entertainment District", "Riverside", "Uptown"
        ]
        
        itinerary = {}
        
        for i in range(days_count):
            current_date = start_date + timedelta(days=i)
            day_key = f"Day {i+1}"
            neighborhood = generic_neighborhoods[i % len(generic_neighborhoods)]
            
            itinerary[day_key] = {
                "date": current_date.strftime("%Y-%m-%d"),
                "district": neighborhood,
                "09:00": {"type": "breakfast", "title": f"Local breakfast spot in {neighborhood}", "location": neighborhood},
                "11:00": {"type": "sightseeing", "title": f"Main attraction in {neighborhood}", "location": neighborhood},
                "13:00": {"type": "lunch", "title": f"Restaurant in {neighborhood}", "location": neighborhood},
                "15:30": {"type": "activity", "title": f"Secondary attraction in {neighborhood}", "location": neighborhood},
                "19:00": {"type": "dinner", "title": f"Dinner restaurant in {neighborhood}", "location": neighborhood}
            }
        
        # Save fallback itinerary
        await save_itinerary_to_db(trip_id, itinerary, "completed", generation_id)
        logger.info(f"Generated and saved enhanced fallback itinerary for trip {trip_id}")
        
    except Exception as e:
        logger.error(f"Error generating itinerary for trip {trip_id}: {str(e)}")
        # Mark as failed in database
        try:
            await save_itinerary_to_db(trip_id, {"error": str(e)}, "failed", generation_id)
        except:
            pass

@app.post("/generate/{trip_id}", status_code=202)
async def start_itinerary_generation(trip_id: str, request: ItineraryRequest, background_tasks: BackgroundTasks):
    """Start generating a personalized travel itinerary"""
    
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
        # Calculate ETA - Groq is much faster
        creation_time = itinerary_data.get('generation_started_at', datetime.now())
        if hasattr(creation_time, 'timestamp'):
            elapsed = time.time() - creation_time.timestamp()
        else:
            elapsed = 0
        eta = max(1, int(10 - elapsed))  # Groq usually takes 5-10 seconds
        return {"status": "processing", "message": "Itinerary generation in progress", "eta": eta}
    elif status == 'completed':
        return {"status": "completed", "message": "Itinerary generation completed"}
    else:
        return {"status": "failed", "message": "Itinerary generation failed"}

@app.get("/itinerary/{trip_id}", response_model=ItineraryResponse)
async def get_itinerary(trip_id: str):
    """Get a generated itinerary"""
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

# Alias endpoints
@app.get("/{trip_id}", response_model=ItineraryResponse)
async def get_itinerary_root(trip_id: str):
    return await get_itinerary(trip_id)

@app.get("/itinerary/itinerary/{trip_id}", response_model=ItineraryResponse)
async def get_itinerary_alternate(trip_id: str):
    return await get_itinerary(trip_id)

# Admin endpoints for testing
@app.delete("/clear/{trip_id}")
async def clear_itinerary(trip_id: str):
    """Clear itinerary for a specific trip"""
    try:
        trip_id_int = int(trip_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Trip ID must be an integer")
    
    async with db_pool.acquire() as conn:
        await conn.execute(
            """UPDATE trips 
               SET itinerary = NULL, generation_status = 'pending', generation_id = NULL, 
                   generation_started_at = NULL, generation_updated_at = NULL 
               WHERE id = $1""", 
            trip_id_int
        )
    
    return {"message": f"Cleared itinerary for trip {trip_id}"}

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)