import React, { useState, useEffect } from "react";

const globalEnrichedCache = new Map();
const globalProcessedTrips = new Set();

export const clearMapCache = (tripId, destination) => {
  const cacheKey = `${tripId}_${destination}`;
  globalEnrichedCache.delete(cacheKey);
  globalProcessedTrips.delete(cacheKey);
};

export const clearMapCacheByTripId = (tripId) => {
  for (const [key] of globalEnrichedCache.entries()) {
    if (key.startsWith(`${tripId}_`)) {
      globalEnrichedCache.delete(key);
    }
  }
  for (const key of globalProcessedTrips) {
    if (key.startsWith(`${tripId}_`)) {
      globalProcessedTrips.delete(key);
    }
  }
};

// Helper function to calculate distance from city center
const calculateDistanceFromCenter = (lat1, lng1, lat2, lng2) => {
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
};

// coordinate validation - check distance from specific district/area
const validateDistrictCoordinates = (
  lat,
  lng,
  districtCoords,
  districtName,
  maxDistanceKm = 5
) => {
  if (!districtCoords || !districtCoords.lat || !districtCoords.lng) {
    return true; // Allow if we don't have district coords
  }

  // Calculate distance from district center
  const distanceFromDistrict = calculateDistanceFromCenter(
    lat,
    lng,
    districtCoords.lat,
    districtCoords.lng
  );

  const isValid = distanceFromDistrict <= maxDistanceKm * 1000; // Convert to meters
  return isValid;
};

const validateCityCoordinates = (
  lat,
  lng,
  destinationCoords,
  maxDistanceKm = 15
) => {
  // Calculate distance from city center
  const distanceFromCenter = calculateDistanceFromCenter(
    lat,
    lng,
    destinationCoords.lat,
    destinationCoords.lng
  );

  const isValid = distanceFromCenter <= maxDistanceKm * 1000; // Convert to meters
  return isValid;
};

// destination coordinate fetching with city name storage
const getDestinationCoords = async (destination) => {
  if (!destination) return { lat: 41.3851, lng: 2.1734, cityName: "Unknown" };

  try {
    const response = await fetch(
      `/api/map/search?query=${encodeURIComponent(destination)}`
    );
    if (response.ok) {
      const results = await response.json();
      if (results && results.length > 0) {
        return {
          lat: results[0].lat,
          lng: results[0].lng,
          cityName: destination,
        };
      }
    }
  } catch (error) {
    // Error handling
  }

  return { lat: 41.3851, lng: 2.1734, cityName: destination }; // Fallback
};

// address-based coordinate search with district-based validation
const getCoordinatesFromAddress = async (
  address,
  fallbackQuery,
  destination,
  destinationCoords,
  district = null,
  districtCoords = null
) => {
  if (!address || address.length < 5) {
    return null;
  }

  // Generic search queries that work for any city
  const searchQueries = [
    `${address}, ${destination}`, // Most specific
    `${address}`, // Try exact address
    `${fallbackQuery}, ${destination}`, // Fallback with city
  ];

  for (const query of searchQueries) {
    if (!query) continue;

    try {
      const response = await fetch(
        `/api/map/search?query=${encodeURIComponent(query)}`
      );

      if (response.ok) {
        const results = await response.json();
        if (results && results.length > 0) {
          // Sort results by distance from district center if available, otherwise city center
          const referenceCoords = districtCoords || destinationCoords;
          const sortedResults = results
            .map((result) => ({
              ...result,
              distanceFromReference: calculateDistanceFromCenter(
                result.lat,
                result.lng,
                referenceCoords.lat,
                referenceCoords.lng
              ),
            }))
            .sort((a, b) => a.distanceFromReference - b.distanceFromReference);

          // Try the closest results first with district-based validation
          for (const result of sortedResults.slice(0, 3)) {
            // Check top 3 closest

            // Priority 1: District-based validation (5km from district)
            if (districtCoords && district) {
              if (
                validateDistrictCoordinates(
                  result.lat,
                  result.lng,
                  districtCoords,
                  district,
                  5
                )
              ) {
                return {
                  lat: result.lat + (Math.random() - 0.5) * 0.0002,
                  lng: result.lng + (Math.random() - 0.5) * 0.0002,
                  source: "address",
                  distanceFromReference: result.distanceFromReference,
                };
              }
            } else {
              // Fallback: City-based validation (15km from city center)
              if (
                validateCityCoordinates(
                  result.lat,
                  result.lng,
                  destinationCoords,
                  15
                )
              ) {
                return {
                  lat: result.lat + (Math.random() - 0.5) * 0.0002,
                  lng: result.lng + (Math.random() - 0.5) * 0.0002,
                  source: "address",
                  distanceFromReference: result.distanceFromReference,
                };
              }
            }
          }
        }
      }
    } catch (error) {
      continue;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return null;
};

// Generic district offset calculation for any city
const getGenericDistrictOffset = (district, index = 0) => {
  // Create a simple hash of the district name for consistent positioning
  const hash = district
    .toLowerCase()
    .split("")
    .reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);

  // Convert hash to coordinate offsets (small offsets from city center)
  const offsetMagnitude = 0.01; // ~1km offset
  const baseOffset = {
    lat: (((hash % 100) - 50) / 100) * offsetMagnitude,
    lng: ((((hash >> 8) % 100) - 50) / 100) * offsetMagnitude,
  };

  // Add small sequential offset for multiple activities in same district
  return {
    lat: baseOffset.lat + index * 0.001,
    lng: baseOffset.lng + index * 0.001,
  };
};

// activity coordinate search with district-based validation
const getActivityCoordinatesEnhanced = async (
  activity,
  destination,
  district,
  index,
  destinationCoords,
  districtCoords = {}
) => {
  const activityName = activity.title || activity.name || "Unknown Activity";
  const address = activity.address;

  // Get district coordinates for validation
  const currentDistrictCoords = districtCoords[district];

  try {
    // Strategy 1: Use address if available
    if (address && address.length > 5) {
      const coords = await getCoordinatesFromAddress(
        address,
        activityName,
        destination,
        destinationCoords,
        district,
        currentDistrictCoords
      );
      if (coords) {
        return {
          ...coords,
          searchMethod: "address",
        };
      }
    }

    // Strategy 2: Fall back to name-based search with district validation
    const searchQueries = [
      `${activityName}, ${district}, ${destination}`,
      `${activityName}, ${destination}`,
      activityName,
    ];

    for (const query of searchQueries) {
      try {
        const response = await fetch(
          `/api/map/search?query=${encodeURIComponent(query)}`
        );

        if (response.ok) {
          const results = await response.json();
          if (results && results.length > 0) {
            // Sort by distance from district center if available, otherwise city center
            const referenceCoords = currentDistrictCoords || destinationCoords;
            const sortedResults = results
              .map((result) => ({
                ...result,
                distanceFromReference: calculateDistanceFromCenter(
                  result.lat,
                  result.lng,
                  referenceCoords.lat,
                  referenceCoords.lng
                ),
              }))
              .sort(
                (a, b) => a.distanceFromReference - b.distanceFromReference
              );

            // Find first valid result using district-based validation
            for (const result of sortedResults.slice(0, 3)) {
              // First try district-based validation (3km from district)
              if (currentDistrictCoords) {
                if (
                  validateDistrictCoordinates(
                    result.lat,
                    result.lng,
                    currentDistrictCoords,
                    district,
                    3
                  )
                ) {
                  return {
                    lat: result.lat + (Math.random() - 0.5) * 0.0001,
                    lng: result.lng + (Math.random() - 0.5) * 0.0001,
                    searchMethod: "name",
                    distanceFromReference: result.distanceFromReference,
                  };
                }
              } else {
                // Fallback to city-based validation if no district coords
                if (
                  validateCityCoordinates(
                    result.lat,
                    result.lng,
                    destinationCoords,
                    15
                  )
                ) {
                  return {
                    lat: result.lat + (Math.random() - 0.5) * 0.0001,
                    lng: result.lng + (Math.random() - 0.5) * 0.0001,
                    searchMethod: "name",
                    distanceFromReference: result.distanceFromReference,
                  };
                }
              }
            }
          }
        }
      } catch (error) {
        continue;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Strategy 3: District-based fallback
    const fallbackOffset = getGenericDistrictOffset(district, index);
    const baseCoords = currentDistrictCoords || destinationCoords;
    const fallbackDistance =
      Math.sqrt(fallbackOffset.lat ** 2 + fallbackOffset.lng ** 2) * 111000; // Rough conversion to meters
    return {
      lat: baseCoords.lat + fallbackOffset.lat,
      lng: baseCoords.lng + fallbackOffset.lng,
      searchMethod: "fallback",
      distanceFromReference: fallbackDistance,
    };
  } catch (error) {
    const fallbackOffset = getGenericDistrictOffset(district, index);
    const baseCoords = currentDistrictCoords || destinationCoords;
    const fallbackDistance =
      Math.sqrt(fallbackOffset.lat ** 2 + fallbackOffset.lng ** 2) * 111000;
    return {
      lat: baseCoords.lat + fallbackOffset.lat,
      lng: baseCoords.lng + fallbackOffset.lng,
      searchMethod: "error",
      distanceFromReference: fallbackDistance,
    };
  }
};

// Extract data from itinerary formats
const extractLocation = (dayData) => {
  if (typeof dayData === "object" && dayData.district) {
    return dayData.district;
  }
  return null;
};

const extractActivities = (dayData) => {
  if (Array.isArray(dayData)) {
    return dayData;
  } else if (typeof dayData === "object") {
    if (dayData.activities) {
      return dayData.activities;
    } else {
      // Time-based format like {"09:00": {title: "...", type: "...", address: "..."}, "11:00": {...}}
      const timeBasedActivities = Object.entries(dayData)
        .filter(([key]) => key !== "date" && key !== "district") // Filter out non-time keys
        .map(([time, activity]) => {
          return {
            time,
            title:
              typeof activity === "string"
                ? activity
                : activity.title || activity.name || String(activity),
            type: typeof activity === "object" ? activity.type : "attraction",
            location: typeof activity === "object" ? activity.location : null,
            address: typeof activity === "object" ? activity.address : null,
          };
        });

      return timeBasedActivities;
    }
  }
  return [];
};

const extractDate = (dayData) => {
  if (typeof dayData === "object" && dayData.date) return dayData.date;
  return new Date().toISOString().split("T")[0];
};

const guessActivityType = (activityName) => {
  const name = activityName.toLowerCase();
  if (
    name.includes("cafe") ||
    name.includes("coffee") ||
    name.includes("caffè")
  )
    return "cafe";
  if (
    name.includes("restaurant") ||
    name.includes("ristorante") ||
    name.includes("trattoria") ||
    name.includes("osteria") ||
    name.includes("lunch") ||
    name.includes("dinner")
  )
    return "restaurant";
  if (name.includes("museum") || name.includes("gallery")) return "museum";
  if (name.includes("park") || name.includes("garden")) return "park";
  if (name.includes("shopping") || name.includes("market")) return "shopping";
  if (name.includes("beach")) return "beach";
  if (name.includes("church") || name.includes("cathedral")) return "landmark";
  return "attraction";
};

// Main enrichment function with generic validation
const enrichItineraryWithCoordinates = async (rawItinerary, destination) => {
  const destinationCoords = await getDestinationCoords(destination);
  const enriched = {};

  // Handle the wrapper format {itinerary: {...}}
  let itineraryData = rawItinerary;
  if (rawItinerary.itinerary) {
    itineraryData = rawItinerary.itinerary;
  }

  // Extract unique districts from itinerary data
  const uniqueDistricts = new Set();
  Object.values(itineraryData).forEach((dayData) => {
    const district = extractLocation(dayData);
    if (district && district !== destination) {
      uniqueDistricts.add(district);
    }
  });

  // Find real coordinates for each district with validation
  const districtCoords = {};
  for (const district of uniqueDistricts) {
    try {
      const response = await fetch(
        `/api/map/search?query=${encodeURIComponent(
          `${district}, ${destination}`
        )}`
      );

      if (response.ok) {
        const results = await response.json();
        if (results && results.length > 0) {
          // Sort by distance from city center and validate
          const sortedResults = results
            .map((result) => ({
              ...result,
              distanceFromCenter: calculateDistanceFromCenter(
                result.lat,
                result.lng,
                destinationCoords.lat,
                destinationCoords.lng
              ),
            }))
            .sort((a, b) => a.distanceFromCenter - b.distanceFromCenter);

          // Find first valid district result
          for (const result of sortedResults.slice(0, 3)) {
            if (
              validateCityCoordinates(
                result.lat,
                result.lng,
                destinationCoords,
                10
              )
            ) {
              // Slightly larger radius for districts (10km)
              districtCoords[district] = {
                lat: result.lat,
                lng: result.lng,
              };
              break;
            }
          }
        }
      }
    } catch (error) {}

    if (!districtCoords[district]) {
      const offset = getGenericDistrictOffset(district);
      districtCoords[district] = {
        lat: destinationCoords.lat + offset.lat,
        lng: destinationCoords.lng + offset.lng,
      };
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  // Process each day
  for (const [dayKey, dayData] of Object.entries(itineraryData)) {
    if (!dayKey.toLowerCase().includes("day")) continue;

    const activities = extractActivities(dayData);
    const enrichedActivities = [];

    const dayDistrict = extractLocation(dayData) || destination;

    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i];

      try {
        const coords = await getActivityCoordinatesEnhanced(
          activity,
          destination,
          dayDistrict,
          i,
          destinationCoords,
          districtCoords
        );

        // Check for duplicate coordinates within the same day and add small offset
        const isDuplicate = enrichedActivities.some(
          (existingActivity) =>
            Math.abs(existingActivity.lat - coords.lat) < 0.0001 &&
            Math.abs(existingActivity.lng - coords.lng) < 0.0001
        );

        if (isDuplicate) {
          coords.lat += (Math.random() - 0.5) * 0.002; // ~200m offset
          coords.lng += (Math.random() - 0.5) * 0.002;
        }

        enrichedActivities.push({
          name: activity.title || activity.name || "Unknown Activity",
          time: activity.time || `${String(9 + i * 2).padStart(2, "0")}:00`,
          type: activity.type || guessActivityType(activity.title || ""),
          lat: coords.lat,
          lng: coords.lng,
          location: activity.location || dayDistrict || destination,
          district: dayDistrict,
          address: activity.address || null,
          searchMethod: coords.searchMethod,
          distanceFromCenter: coords.distanceFromReference || 0,
        });

        // Delay between searches
        if (i < activities.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      } catch (error) {
        const fallbackOffset = getGenericDistrictOffset(dayDistrict, i);
        const fallbackDistance =
          Math.sqrt(fallbackOffset.lat ** 2 + fallbackOffset.lng ** 2) * 111000;
        enrichedActivities.push({
          name: activity.title || "Unknown Activity",
          time: activity.time || `${String(9 + i * 2).padStart(2, "0")}:00`,
          type: activity.type || "attraction",
          lat: destinationCoords.lat + fallbackOffset.lat,
          lng: destinationCoords.lng + fallbackOffset.lng,
          location: activity.location || dayDistrict || destination,
          district: dayDistrict,
          address: activity.address || null,
          searchMethod: "fallback",
          distanceFromCenter: fallbackDistance,
        });
      }
    }

    if (enrichedActivities.length > 0) {
      enriched[dayKey] = {
        date: extractDate(dayData),
        activities: enrichedActivities,
        district: dayDistrict,
      };
    }
  }

  return enriched;
};

function MapVisualization(props) {
  const { tripId, destination } = props;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [itinerary, setItinerary] = useState(null);
  const [selectedDays, setSelectedDays] = useState([]);
  const [showRoutes, setShowRoutes] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [enrichmentStatus, setEnrichmentStatus] = useState("");
  const mapRef = React.useRef(null);
  const mapInstance = React.useRef(null);

  // Get destination coordinates for fallback centering
  const [destinationCoords, setDestinationCoords] = useState({
    lat: 41.3851,
    lng: 2.1734,
    cityName: "Unknown",
  });

  // Create cache key for this specific trip
  const cacheKey = `${tripId}_${destination}`;

  // Fetch destination coordinates using OpenStreetMap
  useEffect(() => {
    const fetchDestinationCoords = async () => {
      if (!destination) return;

      try {
        const coords = await getDestinationCoords(destination);
        setDestinationCoords(coords);
      } catch (error) {
        // Error handling
      }
    };

    fetchDestinationCoords();
  }, [destination]);

  // Load itinerary data
  useEffect(() => {
    if (!tripId) return;

    async function loadData() {
      // Check global cache first
      if (
        globalEnrichedCache.has(cacheKey) &&
        globalProcessedTrips.has(cacheKey)
      ) {
        const cached = globalEnrichedCache.get(cacheKey);
        setItinerary(cached.itinerary);
        setSelectedDays(cached.selectedDays);
        setDestinationCoords(cached.destinationCoords);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setEnrichmentStatus("Fetching itinerary...");

      try {
        // Fetch itinerary from your actual itinerary service
        const response = await fetch(`/api/itinerary/itinerary/${tripId}`);

        if (response.status === 202) {
          setError("Itinerary is still being generated. Please wait...");
          setLoading(false);
          return;
        }

        if (!response.ok) {
          if (response.status === 404) {
            setError("No itinerary found. Generate an itinerary first.");
          } else {
            setError("Failed to load itinerary");
          }
          setLoading(false);
          return;
        }

        const data = await response.json();

        // Only process coordinates if we haven't done it before
        if (!globalProcessedTrips.has(cacheKey)) {
          setEnrichmentStatus("Adding coordinates with validation...");

          // Get destination coordinates
          const destCoords = await getDestinationCoords(destination);
          setDestinationCoords(destCoords);

          // Transform the itinerary data to include coordinates with validation
          const transformedItinerary = await enrichItineraryWithCoordinates(
            data,
            destination
          );

          if (Object.keys(transformedItinerary).length === 0) {
            setError("No valid itinerary data found.");
          } else {
            const selectedDaysList = Object.keys(transformedItinerary);

            // Cache the enriched data globally
            globalEnrichedCache.set(cacheKey, {
              itinerary: transformedItinerary,
              selectedDays: selectedDaysList,
              destinationCoords: destCoords,
            });
            globalProcessedTrips.add(cacheKey);

            setItinerary(transformedItinerary);
            setSelectedDays(selectedDaysList);
            setEnrichmentStatus("");
          }
        } else {
          const cached = globalEnrichedCache.get(cacheKey);
          if (cached) {
            setItinerary(cached.itinerary);
            setSelectedDays(cached.selectedDays);
            setDestinationCoords(cached.destinationCoords);
          }
        }
      } catch (err) {
        setError(`Failed to load itinerary: ${err.message}`);
        setEnrichmentStatus("");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [tripId, destination, cacheKey]);

  // Load Leaflet
  useEffect(() => {
    if (window.L) {
      setMapLoaded(true);
      return;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = function () {
      setMapLoaded(true);
    };
    document.body.appendChild(script);
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !itinerary) return;

    if (!mapInstance.current) {
      const map = window.L.map(mapRef.current).setView(
        [destinationCoords.lat, destinationCoords.lng],
        13
      );
      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);
      mapInstance.current = map;
    }

    updateMap();
  }, [mapLoaded, itinerary, selectedDays, showRoutes, destinationCoords]);

  function updateMap() {
    if (!mapInstance.current || !itinerary) return;

    // Clear existing
    mapInstance.current.eachLayer(function (layer) {
      if (
        layer instanceof window.L.Marker ||
        layer instanceof window.L.Polyline
      ) {
        mapInstance.current.removeLayer(layer);
      }
    });

    const colors = ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6"];
    const allMarkers = [];

    Object.entries(itinerary).forEach(([dayName, dayData], dayIndex) => {
      if (!selectedDays.includes(dayName)) return;

      const color = colors[dayIndex % colors.length];
      const activities = dayData.activities || [];

      activities.forEach((activity, actIndex) => {
        if (!activity.lat || !activity.lng) return;

        const marker = window.L.marker([activity.lat, activity.lng], {
          icon: window.L.divIcon({
            html:
              '<div style="background: ' +
              color +
              '; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">' +
              (actIndex + 1) +
              "</div>",
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          }),
        }).addTo(mapInstance.current);

        marker.bindPopup(
          '<div><div style="font-weight: bold; color: ' +
            color +
            ';">' +
            dayName +
            " - " +
            (actIndex + 1) +
            '</div><div style="margin: 4px 0;"><strong>' +
            activity.name +
            '</strong></div><div style="color: #666; font-size: 14px;">' +
            activity.time +
            " • " +
            activity.type +
            "</div></div>"
        );

        allMarkers.push(marker);
      });

      // Add routes
      if (showRoutes && activities.length > 1) {
        for (let i = 0; i < activities.length - 1; i++) {
          const current = activities[i];
          const next = activities[i + 1];
          if (current.lat && current.lng && next.lat && next.lng) {
            window.L.polyline(
              [
                [current.lat, current.lng],
                [next.lat, next.lng],
              ],
              { color: color, weight: 2, opacity: 0.7, dashArray: "5, 5" }
            ).addTo(mapInstance.current);
          }
        }
      }
    });

    if (allMarkers.length > 0) {
      const group = new window.L.featureGroup(allMarkers);
      mapInstance.current.fitBounds(group.getBounds().pad(0.1));
    }
  }

  function toggleDay(day) {
    setSelectedDays(function (prev) {
      return prev.includes(day)
        ? prev.filter(function (d) {
            return d !== day;
          })
        : prev.concat([day]);
    });
  }

  if (loading) {
    return React.createElement(
      "div",
      {
        style: {
          background: "white",
          borderRadius: "8px",
          border: "1px solid #e5e7eb",
          padding: "32px",
          textAlign: "center",
        },
      },
      [
        React.createElement(
          "div",
          {
            style: {
              fontSize: "1.25rem",
              fontWeight: "700",
              fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
              lineHeight: 1.6,
              letterSpacing: "0.0075em",
            },
          },
          "Loading trip map..."
        ),
      ]
    );
  }

  if (error) {
    return React.createElement(
      "div",
      {
        style: {
          background: "white",
          borderRadius: "8px",
          border: "1px solid #e5e7eb",
          padding: "32px",
        },
      },
      [
        React.createElement(
          "div",
          {
            key: "error",
            style: { color: "#dc2626" },
          },
          error
        ),
        error.includes("Generate an itinerary")
          ? React.createElement(
              "button",
              {
                key: "button",
                onClick: function () {
                  window.location.hash = "itinerary";
                },
                style: {
                  marginTop: "16px",
                  padding: "8px 16px",
                  background: "#2563eb",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                },
              },
              "Go to Itinerary Tab"
            )
          : null,
      ]
    );
  }

  if (!itinerary || Object.keys(itinerary).length === 0) {
    return React.createElement(
      "div",
      {
        style: {
          background: "white",
          borderRadius: "8px",
          border: "1px solid #e5e7eb",
          padding: "32px",
          textAlign: "center",
        },
      },
      [
        React.createElement(
          "div",
          {
            key: "title",
            style: { fontSize: "18px", fontWeight: "500", marginBottom: "8px" },
          },
          "No Itinerary Available"
        ),
        React.createElement(
          "div",
          {
            key: "desc",
            style: { color: "#6b7280", marginBottom: "16px" },
          },
          "Generate an itinerary first to see your trip on the map."
        ),
        React.createElement(
          "button",
          {
            key: "button",
            onClick: function () {
              window.location.hash = "itinerary";
            },
            style: {
              padding: "8px 16px",
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            },
          },
          "Generate Itinerary"
        ),
      ]
    );
  }

  return React.createElement(
    "div",
    {
      style: {
        background: "white",
        borderRadius: "8px",
        border: "1px solid #e5e7eb",
        overflow: "hidden",
      },
    },
    [
      // Header
      React.createElement(
        "div",
        {
          key: "header",
          style: {
            padding: "24px",
            borderBottom: "1px solid #e5e7eb",
            background: "linear-gradient(to right, #eff6ff, #e0e7ff)",
          },
        },
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            },
          },
          [
            React.createElement(
              "h2",
              {
                key: "title",
                style: {
                  fontSize: "1.25rem",
                  fontWeight: "700",
                  margin: 0,
                  fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
                  lineHeight: 1.6,
                  letterSpacing: "0.0075em",
                },
              },
              "Trip Map - " + (destination || destinationCoords.cityName)
            ),
            React.createElement(
              "div",
              {
                key: "buttons",
                style: { display: "flex", gap: "12px" },
              },
              React.createElement(
                "button",
                {
                  onClick: function () {
                    setShowRoutes(!showRoutes);
                  },
                  style: {
                    padding: "8px 16px",
                    borderRadius: "6px",
                    border: "1px solid #d1d5db",
                    background: showRoutes ? "#2563eb" : "white",
                    color: showRoutes ? "white" : "#4b5563",
                    cursor: "pointer",
                    fontSize: "14px",
                  },
                },
                showRoutes ? "Hide Routes" : "Show Routes"
              )
            ),
          ]
        )
      ),

      // Day Selection
      React.createElement(
        "div",
        {
          key: "days",
          style: {
            padding: "16px",
            background: "#f9fafb",
            borderBottom: "1px solid #e5e7eb",
          },
        },
        React.createElement(
          "div",
          {
            style: { display: "flex", flexWrap: "wrap", gap: "8px" },
          },
          Object.entries(itinerary).map(([dayName, dayData], index) => {
            const isSelected = selectedDays.includes(dayName);
            const colors = [
              "#3B82F6",
              "#EF4444",
              "#10B981",
              "#F59E0B",
              "#8B5CF6",
            ];
            const dayColor = colors[index % colors.length];

            return React.createElement(
              "button",
              {
                key: dayName,
                onClick: function () {
                  toggleDay(dayName);
                },
                style: {
                  padding: "8px 16px",
                  borderRadius: "6px",
                  border: isSelected ? "none" : "1px solid #d1d5db",
                  background: isSelected ? dayColor : "white",
                  color: isSelected ? "white" : "#4b5563",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500",
                },
              },
              dayName
            );
          })
        )
      ),

      // Map
      React.createElement(
        "div",
        {
          key: "map",
          style: { position: "relative" },
        },
        React.createElement(
          "div",
          {
            ref: mapRef,
            style: {
              width: "100%",
              height: "500px",
              background: "#f3f4f6",
            },
          },
          !mapLoaded
            ? React.createElement(
                "div",
                {
                  style: {
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  },
                },
                "Loading map..."
              )
            : null
        )
      ),
    ]
  );
}

export default MapVisualization;
