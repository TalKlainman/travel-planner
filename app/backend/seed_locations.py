import requests

ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiZXhwIjoxNzUzMzYxOTQwfQ.GgqQ6BW4W9beGjewqBEaSVc0MfIGCdlPKg0qwuCVahc"
API_URL = "http://localhost:8000/api/locations/"

headers = {
    "Authorization": f"Bearer {ACCESS_TOKEN}",
    "Content-Type": "application/json"
}

locations = [
    { "name": "Rome", "country": "Italy", "lat": 41.9028, "lng": 12.4964 },
    { "name": "Paris", "country": "France", "lat": 48.8566, "lng": 2.3522 },
    { "name": "Barcelona", "country": "Spain", "lat": 41.3851, "lng": 2.1734 },
    { "name": "London", "country": "United Kingdom", "lat": 51.5074, "lng": -0.1278 },
    { "name": "Berlin", "country": "Germany", "lat": 52.52, "lng": 13.405 },
    { "name": "Tokyo", "country": "Japan", "lat": 35.6895, "lng": 139.6917 },
    { "name": "New York", "country": "USA", "lat": 40.7128, "lng": -74.006 },
    { "name": "Sydney", "country": "Australia", "lat": -33.8688, "lng": 151.2093 },
    { "name": "Cairo", "country": "Egypt", "lat": 30.0444, "lng": 31.2357 },
    { "name": "Rio de Janeiro", "country": "Brazil", "lat": -22.9068, "lng": -43.1729 }
]

for loc in locations:
    loc["description"] = f"A beautiful city in {loc['country']}"
    loc["popular"] = True
    loc["image_url"] = f"https://example.com/{loc['name'].lower().replace(' ', '-')}.jpg"
    
    response = requests.post(API_URL, headers=headers, json=loc)
    if response.status_code == 201:
        print(f" Added {loc['name']}")
    else:
        print(f" Failed to add {loc['name']}: {response.status_code} - {response.text}")
