# Smart Travel Planner

A microservices-based travel planning application that helps users create and manage trip itineraries with AI-generated recommendations based on personal preferences.

## System Architecture Diagram

![System Architecture](assets/system-architecture.png)

## Demo

[Watch the demo video](https://youtu.be/0Sz5CaqTw7M)

## Architecture

The application is built using a microservices architecture with the following components:

- **Frontend**: React-based UI for user interaction
- **Backend**: FastAPI service for core functionality and data persistence
- **Itinerary Service**: AI-powered trip itinerary generator using Groq (LLaMA 3)
- **Map Service**: Itinerary-based attractions and routes using OpenStreetMap
- **Database**: PostgreSQL for data storage

## Features

- User authentication (login/registration)
- Trip planning with date ranges and locations
- Personal preference management
- AI-generated itineraries based on preferences
- Interactive map view of itinerary attractions and travel routes

## Getting Started

## Environment Setup

Before running the application, you need to create a `.env` file in the root directory.

Then, fill in your actual values for each variable:

```
POSTGRES_PASSWORD=your_postgres_password
DATABASE_URL=postgresql://postgres:postgres@postgres-service:5432/traveldb
GROQ_API_KEY=your_groq_api_key
JWT_SECRET_KEY=your_jwt_secret_key
```

### Prerequisites

- Docker and Docker Compose
- Git

### Installation

1. Clone the repository:
   git clone https://github.com/EASS-HIT-PART-A-2025-CLASS-VII/travel-planner.git
   cd travel-planner

2. Start the application:
   docker-compose up -d

3. Access the application:

- Frontend: http://localhost
- Backend API: http://localhost:8000/docs
- Itinerary Service API: http://localhost:8001/docs
- Map Service API: http://localhost:8002/docs

### Running Tests

To run the integration tests:
python integration_test.py

## Microservices

### Backend Service (Port 8000)

FastAPI application that handles core functionality:

- User authentication
- Trip management
- Preference storage
- API gateway to other services

### Itinerary Service (Port 8001)

Generates AI-powered trip itineraries using Groq:

- Day-by-day activity planning
- Smart location clustering by neighborhood
- Preference-based customization

### Map Service (Port 8002)

Provides itinerary-based map visualization using OpenStreetMap:

- Interactive map showing daily trip routes and attractions
- Day-by-day location grouping
- Custom marker clustering per day

### Frontend Service (Port 80)

- React-based frontend application with Material UI components

### Postgres Service (Port 5432)

- Relational database for storing all trip data

## Project Structure

```text
travel-planner/
  app/
    backend/                # Core FastAPI application
    frontend/               # React frontend
    itinerary-service/      # Itinerary generation microservice
    map-service/            # Map visualization microservice
  integration_test.py       # Integration test script
  docker-compose.yml        # Docker Compose configuration
  README.md                 # Project documentation
```

## Technologies Used

- **Frontend**: React, Material UI, React Router
- **Backend**: FastAPI, SQLAlchemy, JWT Authentication
- **Database**: PostgreSQL
- **AI**: Groq (Llama 3)
- **Map**: OpenStreetMap APIs
- **Containerization**: Docker, Docker Compose
- **Testing**: httpx, pytest
