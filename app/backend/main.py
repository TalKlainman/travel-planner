from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine
import models
from routers import trips, preferences, locations, auth
from routers.microservice_routers import map_router, itinerary_router

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Travel Planner API",
    description="Backend API for Smart Travel Planner with AI Itinerary Generator",
    version="0.1.0",
)

# Configure CORS
origins = [
    "http://localhost",
    "http://localhost:3000",  # For React frontend
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(trips.router, prefix="/api")
app.include_router(preferences.router, prefix="/api")
app.include_router(locations.router, prefix="/api")
app.include_router(map_router, prefix="/api")
app.include_router(itinerary_router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "Welcome to Travel Planner API. See /docs for API documentation."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)