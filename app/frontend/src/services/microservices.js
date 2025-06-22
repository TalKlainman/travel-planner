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

// export const mapService = {
//   searchLocations: async (query, country = null) => {
//     let url = `/map/search?query=${encodeURIComponent(query)}`;
//     if (country) {
//       url += `&country=${encodeURIComponent(country)}`;
//     }

//     return api.get(url);
//   },

//   getNearbyAttractions: async (lat, lng, radius = 1000, category = null) => {
//     const params = { lat, lng, radius };
//     if (category) {
//       params.category = category;
//     }

//     return api.post("/map/nearby", params);
//   },
// };

// Enhanced map services for frontend
import api from "./api";

export const mapService = {
  // Existing services
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

  // NEW ENHANCED SERVICES FOR TRIP VISUALIZATION

  /**
   * Get complete visualization data for a trip
   * This integrates with your existing trip and itinerary data
   */
  getTripVisualization: async (tripId) => {
    try {
      const response = await api.get(`/map/trip/${tripId}/visualization-data`);
      return response;
    } catch (error) {
      console.error("Error fetching trip visualization:", error);
      throw error;
    }
  },

  /**
   * Process itinerary data for map visualization
   * Use this when you have itinerary data and want to visualize it
   */
  visualizeTripItinerary: async (tripId, itineraryData) => {
    try {
      const payload = {
        trip_id: tripId,
        itinerary: itineraryData,
      };
      const response = await api.post("/map/trip/visualize", payload);
      return response;
    } catch (error) {
      console.error("Error processing trip visualization:", error);
      throw error;
    }
  },

  /**
   * Optimize route for a day's activities
   */
  optimizeRoute: async (activities, optimizationType = "shortest") => {
    try {
      const payload = {
        activities: activities.map((activity) => ({
          name: activity.name,
          time: activity.time,
          type: activity.type || "attraction",
          lat: activity.lat,
          lng: activity.lng,
          location: activity.location,
          description: activity.description,
        })),
        optimization_type: optimizationType,
      };
      const response = await api.post("/map/trip/optimize-route", payload);
      return response;
    } catch (error) {
      console.error("Error optimizing route:", error);
      throw error;
    }
  },

  /**
   * Get nearby suggestions for adding to trip
   */
  getNearbyTripSuggestions: async (tripId, lat, lng, radius = 1000) => {
    try {
      const response = await api.get(
        `/map/trip/${tripId}/nearby-suggestions?lat=${lat}&lng=${lng}&radius=${radius}`
      );
      return response;
    } catch (error) {
      console.error("Error fetching nearby suggestions:", error);
      throw error;
    }
  },

  /**
   * Add activity to trip
   */
  addActivityToTrip: async (tripId, activity, day, insertAt = null) => {
    try {
      const payload = {
        name: activity.name,
        time: activity.time,
        type: activity.type || "attraction",
        lat: activity.lat,
        lng: activity.lng,
        location: activity.location,
        description: activity.description,
        day: day,
        insert_at: insertAt,
      };
      const response = await api.post(
        `/map/trip/${tripId}/add-activity`,
        payload
      );
      return response;
    } catch (error) {
      console.error("Error adding activity to trip:", error);
      throw error;
    }
  },
};

// Enhanced itinerary service with map integration
export const enhancedItineraryService = {
  // Existing services
  generateItinerary: async (tripId, tripData) => {
    return api.post(`/itinerary/generate/${tripId}`, tripData);
  },

  getItinerary: async (tripId) => {
    return api.get(`/itinerary/itinerary/${tripId}`);
  },

  checkStatus: async (tripId) => {
    return api.get(`/itinerary/status/${tripId}`);
  },

  // NEW: Get itinerary with visualization data
  getItineraryWithVisualization: async (tripId) => {
    try {
      // First get the itinerary
      const itineraryResponse = await api.get(`/itinerary/itinerary/${tripId}`);

      if (itineraryResponse.status === 200 && itineraryResponse.data) {
        // Then get visualization data
        try {
          const visualizationResponse = await mapService.getTripVisualization(
            tripId
          );
          return {
            itinerary: itineraryResponse.data,
            visualization: visualizationResponse.data,
            hasVisualization: true,
          };
        } catch (vizError) {
          console.warn("Visualization not available:", vizError);
          return {
            itinerary: itineraryResponse.data,
            visualization: null,
            hasVisualization: false,
          };
        }
      }

      return itineraryResponse;
    } catch (error) {
      console.error("Error fetching itinerary with visualization:", error);
      throw error;
    }
  },
};

// Utility functions for working with map data
export const mapUtils = {
  /**
   * Transform itinerary data from your format to map visualization format
   */
  transformItineraryForMap: (itineraryData) => {
    if (!itineraryData || typeof itineraryData !== "object") {
      return {};
    }

    const transformed = {};

    Object.entries(itineraryData).forEach(([dayKey, dayData]) => {
      if (!dayKey.includes("Day")) return;

      let activities = [];

      if (Array.isArray(dayData)) {
        // Array format
        activities = dayData.map((activity, index) => ({
          name:
            typeof activity === "string"
              ? activity
              : activity.name || activity.title,
          time: activity.time || `${9 + index * 2}:00`,
          type: activity.type || "attraction",
          lat: activity.lat || 41.3851 + index * 0.01, // Default to Barcelona area
          lng: activity.lng || 2.1734 + index * 0.01,
          location: activity.location || "Barcelona",
        }));
      } else if (typeof dayData === "object") {
        // Object format - could be time-based or activities array
        if (dayData.activities) {
          activities = dayData.activities.map((activity, index) => ({
            name:
              typeof activity === "string"
                ? activity
                : activity.name || activity.title,
            time: activity.time || `${9 + index * 2}:00`,
            type: activity.type || "attraction",
            lat: activity.lat || 41.3851 + index * 0.01,
            lng: activity.lng || 2.1734 + index * 0.01,
            location: activity.location || "Barcelona",
          }));
        } else {
          // Time-based format like {"09:00": "Activity Name"}
          activities = Object.entries(dayData)
            .filter(([key]) => key !== "date")
            .map(([time, activity]) => ({
              name:
                typeof activity === "string"
                  ? activity
                  : activity.name || activity.title,
              time: time,
              type:
                (typeof activity === "object" ? activity.type : null) ||
                "attraction",
              lat:
                (typeof activity === "object" ? activity.lat : null) || 41.3851,
              lng:
                (typeof activity === "object" ? activity.lng : null) || 2.1734,
              location:
                (typeof activity === "object" ? activity.location : null) ||
                "Barcelona",
            }));
        }
      }

      transformed[dayKey] = {
        date: dayData.date || new Date().toISOString().split("T")[0],
        activities: activities,
      };
    });

    return transformed;
  },

  /**
   * Calculate bounds for map fitting
   */
  calculateBounds: (activities) => {
    if (!activities || activities.length === 0) {
      return null;
    }

    const lats = activities.map((a) => a.lat).filter((lat) => lat != null);
    const lngs = activities.map((a) => a.lng).filter((lng) => lng != null);

    if (lats.length === 0 || lngs.length === 0) {
      return null;
    }

    return {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs),
    };
  },

  /**
   * Generate day colors for consistent visualization
   */
  getDayColors: () => [
    { primary: "#3B82F6", light: "#DBEAFE", name: "Blue" },
    { primary: "#EF4444", light: "#FEE2E2", name: "Red" },
    { primary: "#10B981", light: "#D1FAE5", name: "Green" },
    { primary: "#F59E0B", light: "#FEF3C7", name: "Amber" },
    { primary: "#8B5CF6", light: "#EDE9FE", name: "Purple" },
  ],

  /**
   * Get activity icon emoji
   */
  getActivityIcon: (type) => {
    const iconMap = {
      cafe: "☕",
      restaurant: "🍽️",
      landmark: "🏛️",
      shopping: "🛍️",
      park: "🌳",
      market: "🏪",
      walk: "🚶",
      beach: "🏖️",
      port: "⚓",
      museum: "🖼️",
      district: "🏙️",
      hotel: "🏨",
      attraction: "📍",
    };
    return iconMap[type?.toLowerCase()] || "📍";
  },

  /**
   * Calculate distance between two points (Haversine formula)
   */
  calculateDistance: (lat1, lng1, lat2, lng2) => {
    const R = 6371000; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  },

  /**
   * Format distance for display
   */
  formatDistance: (distanceMeters) => {
    if (distanceMeters < 1000) {
      return `${Math.round(distanceMeters)}m`;
    } else {
      return `${(distanceMeters / 1000).toFixed(1)}km`;
    }
  },

  /**
   * Estimate walking time
   */
  estimateWalkingTime: (distanceMeters) => {
    const walkingSpeed = 1.39; // m/s (5 km/h)
    const timeSeconds = distanceMeters / walkingSpeed;
    const timeMinutes = Math.round(timeSeconds / 60);

    if (timeMinutes < 60) {
      return `${timeMinutes} min`;
    } else {
      const hours = Math.floor(timeMinutes / 60);
      const minutes = timeMinutes % 60;
      return `${hours}h ${minutes}m`;
    }
  },
};

// React hooks for map functionality
export const useMapVisualization = (tripId) => {
  const [visualization, setVisualization] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const loadVisualization = React.useCallback(async () => {
    if (!tripId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await mapService.getTripVisualization(tripId);
      setVisualization(response.data);
    } catch (err) {
      setError(err.message || "Failed to load visualization");
      console.error("Visualization loading error:", err);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  React.useEffect(() => {
    loadVisualization();
  }, [loadVisualization]);

  return {
    visualization,
    loading,
    error,
    reload: loadVisualization,
  };
};

export const useRouteOptimization = () => {
  const [optimizing, setOptimizing] = React.useState(false);
  const [optimizedRoute, setOptimizedRoute] = React.useState(null);

  const optimizeRoute = React.useCallback(
    async (activities, type = "shortest") => {
      setOptimizing(true);
      try {
        const response = await mapService.optimizeRoute(activities, type);
        setOptimizedRoute(response.data);
        return response.data;
      } catch (error) {
        console.error("Route optimization error:", error);
        throw error;
      } finally {
        setOptimizing(false);
      }
    },
    []
  );

  return {
    optimizeRoute,
    optimizing,
    optimizedRoute,
    clearOptimizedRoute: () => setOptimizedRoute(null),
  };
};

// Export everything
export default mapService;
