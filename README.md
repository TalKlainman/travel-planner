# Travel Planner Application

This application consists of a FastAPI backend and a React frontend, containerized with Docker. This guide explains how to run both services so they can communicate properly over HTTP.

## Prerequisites

- Docker installed on your computer

## Running the Application

### 1. Create a Docker Network

First, create a Docker network to allow the containers to communicate:
docker network create travel-planner-network

### 2. Build and Run the Backend

# Navigate to the backend directory

cd travel-planner/app/backend

# Build the backend Docker image

docker build -t travel-planner-backend .

# Run the backend container

docker run -d --name backend --network travel-planner-network -p 8000:8000 travel-planner-backend

### 3. Build and Run the Frontend

# Navigate to the frontend directory

cd ../frontend

# Build the frontend Docker image

docker build -t travel-planner-frontend .

# Run the frontend container

docker run -d --name frontend --network travel-planner-network -p 80:80 travel-planner-frontend

### 4. Access the Application

- Frontend: http://localhost
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## Stopping the Application

To stop and remove the containers:
docker stop frontend backend
docker rm frontend backend

To remove the network when done:
docker network rm travel-planner-network

## Project Structure

- `travel-planner/app/backend/`: FastAPI backend service
- `travel-planner/app/frontend/`: React frontend application
