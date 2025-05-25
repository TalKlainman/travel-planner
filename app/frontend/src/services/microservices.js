// In services/microservices.js
import api from "./api";

export const itineraryService = {
  generateItinerary: async (tripId, tripData) => {
    // This should match your backend endpoint
    return api.post(`/itinerary/generate/${tripId}`, tripData);
  },

  getItinerary: async (tripId) => {
    // This should match your backend endpoint
    return api.get(`/itinerary/itinerary/${tripId}`);
  },

  // Add this method to check generation status
  checkStatus: async (tripId) => {
    return api.get(`/itinerary/status/${tripId}`);
  },
};

export const mapService = {
  searchLocations: async (query, country = null) => {
    let url = `/map/search?query=${encodeURIComponent(query)}`;
    if (country) {
      url += `&country=${encodeURIComponent(country)}`;
    }

    return api.get(url);
  },

  getNearbyAttractions: async (lat, lng, radius = 1000, category = null) => {
    const params = { lat, lng, radius };
    if (category) {
      params.category = category;
    }

    return api.post("/map/nearby", params);
  },
};
