# Smart Travel Planner API

This is the backend API for a Smart Travel Planner application that allows users to create and manage travel itineraries.

## Features

- Create, read, update, and delete travel plans
- Store user preferences for trip customization
- Search and browse destinations
- Set budgets and date ranges for trips

## Tech Stack

- FastAPI for the REST API framework
- SQLAlchemy for ORM
- Pydantic for data validation
- SQLite for development database
- Docker for containerization
- pytest for testing

## Getting Started

### Prerequisites

- Docker
- Python 3.9+

### Running with Docker

1. Build the Docker image: docker build -t travel-planner-api .
2. Run the container: docker run -d -p 8000:8000 --name travel-planner-api travel-planner-api
3. The API is now available at http://localhost:8000

### API Documentation

Once the server is running, you can access:

- Interactive API documentation (Swagger UI): http://localhost:8000/docs
- Alternative API documentation (ReDoc): http://localhost:8000/redoc

### Running Tests

To run unit tests: python -m pytest app/unit_tests.py -v

To run integration tests (with the API running): python -m pytest integration_test.py -v

## Project Structure

- `/app` - Main application code
  - `main.py` - FastAPI application entrypoint
  - `models.py` - Pydantic and SQLAlchemy models
  - `database.py` - Database connection management
  - `/routers` - API endpoint routers
- `integration_test.py` - Integration tests for the API
- `Dockerfile` - Docker configuration

## API Endpoints

- `GET /` - API welcome message and health check
- `GET /trips` - List all trips for the user
- `POST /trips` - Create a new trip
- `GET /trips/{trip_id}` - Get details of a specific trip
- `PUT /trips/{trip_id}` - Update a trip
- `DELETE /trips/{trip_id}` - Delete a trip
- (Similar endpoints for preferences and locations)