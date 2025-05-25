import React, { useState, useEffect, useCallback } from "react";
import { Search, MapPin, Coffee, Utensils, Hotel, Camera, BookOpen, Plus, RefreshCw, Landmark } from "lucide-react";

// OpenStreetMap integration component
const OpenStreetMap = ({ center, markers, height = 300 }) => {
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = React.useRef(null);
  const mapInstanceRef = React.useRef(null);

  useEffect(() => {
    // Load OpenStreetMap libraries
    const loadMapLibraries = async () => {
      if (window.L) {
        // Leaflet already loaded
        setMapLoaded(true);
        return;
      }

      try {
        // Create a script element to load Leaflet CSS
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(cssLink);

        // Create a script element to load Leaflet JS
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.async = true;
        
        // Set up event listeners for the script
        script.onload = () => {
          setMapLoaded(true);
        };
        
        script.onerror = (error) => {
          console.error('Error loading map library:', error);
        };
        
        document.body.appendChild(script);
      } catch (error) {
        console.error('Failed to load map libraries:', error);
      }
    };

    loadMapLibraries();

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Initialize map when libraries are loaded and when center changes
  useEffect(() => {
    if (!mapLoaded || !center) return;

    const initializeMap = () => {
      try {
        // If map already exists, remove it first
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
        }

        // Create a new map instance
        const map = window.L.map(mapRef.current).setView(
          [center.lat, center.lng], 
          13 // Zoom level
        );

        // Add OpenStreetMap tile layer
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        // Add markers to the map
        if (markers && markers.length > 0) {
          markers.forEach(marker => {
            if (marker.lat && marker.lng) {
              const markerIcon = window.L.divIcon({
                html: `<div style="background-color: #1976d2; width: 12px; height: 12px; border-radius: 50%;"></div>`,
                className: 'custom-div-icon',
                iconSize: [12, 12],
                iconAnchor: [6, 6]
              });

              const mapMarker = window.L.marker([marker.lat, marker.lng], { icon: markerIcon }).addTo(map);
              
              if (marker.name) {
                mapMarker.bindPopup(marker.name);
              }
            }
          });
        }

        // Store the map instance for later cleanup
        mapInstanceRef.current = map;
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };

    // Short timeout to ensure DOM is ready
    const timer = setTimeout(() => {
      if (mapRef.current) {
        initializeMap();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [mapLoaded, center, markers]);

  return (
    <div
      ref={mapRef}
      className="w-full relative bg-blue-50 rounded overflow-hidden border border-blue-200"
      style={{ height }}
    >
      {!mapLoaded && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="mb-2 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
          <p className="text-gray-500 text-sm">Loading map...</p>
        </div>
      )}
    </div>
  );
};

// Get icon for attraction type
const getAttractionIcon = (type) => {
  const props = { size: 18, strokeWidth: 2 };

  switch (type?.toLowerCase()) {
    case "restaurant":
    case "food":
      return <Utensils {...props} />;
    case "cafe":
    case "coffee":
      return <Coffee {...props} />;
    case "hotel":
    case "hostel":
    case "accommodation":
      return <Hotel {...props} />;
    case "museum":
      return <BookOpen {...props} />;
    case "attraction":
    case "landmark":
      return <Landmark {...props} />;
    case "tourism":
      return <Camera {...props} />;
    default:
      return <MapPin {...props} />;
  }
};

const MapVisualization = ({ tripId, destination }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [nearbyAttractions, setNearbyAttractions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Default to destination if provided
  useEffect(() => {
    if (destination && !selectedLocation) {
      handleSearch(destination);
    }
  }, [destination]);

  // Search locations using the backend proxy to Nominatim API
  const handleSearch = useCallback(async (query) => {
    if (!query) return;

    setLoading(true);
    setError(null);

    try {
      // Use backend proxy
      const response = await fetch(`/api/map/search?query=${encodeURIComponent(query)}`);

      if (!response.ok) {
        throw new Error("Failed to search locations");
      }

      const data = await response.json();
      
      // Transform the data if needed
      setSearchResults(data);

      // Select the first result automatically
      if (data.length > 0) {
        setSelectedLocation(data[0]);
        fetchNearbyAttractions(data[0]);
      }
    } catch (err) {
      console.error("Error searching locations:", err);
      setError("Failed to search locations. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch nearby attractions using the backend proxy to Overpass API
  const fetchNearbyAttractions = useCallback(
    async (location, radius = 2000) => {
      if (!location || !location.lat || !location.lng) return;

      setLoading(true);

      try {
        // Use backend proxy
        const response = await fetch(`/api/map/nearby`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            lat: location.lat,
            lng: location.lng,
            radius
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch nearby attractions");
        }

        const data = await response.json();
        setNearbyAttractions(data);
      } catch (err) {
        console.error("Error fetching nearby attractions:", err);
        setError("Failed to fetch nearby attractions. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const handleRefresh = () => {
    if (selectedLocation) {
      fetchNearbyAttractions(selectedLocation);
    }
  };
  
  // Add attraction to itinerary
  const addToItinerary = (attraction) => {
    // In a real app, this would make an API call to add the attraction to the trip's itinerary
    console.log(`Adding ${attraction.name} to itinerary for trip ${tripId}`);
    
    // Show a success message (would use a proper toast notification in a real app)
    alert(`Added ${attraction.name} to your itinerary!`);
  };

  return (
    <div className="border border-gray-200 rounded overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-semibold">Destination Map</h2>
        <button
          className="px-3 py-1 text-sm rounded border border-gray-300 flex items-center gap-1 disabled:opacity-50"
          onClick={handleRefresh}
          disabled={loading || !selectedLocation}
        >
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>
      
      <div className="p-4">
        {/* Search Box */}
        <div className="mb-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-500" />
            </div>
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search for a location"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleSearch(searchQuery);
                }
              }}
            />
            {loading && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Map Visualization */}
        {selectedLocation ? (
          <OpenStreetMap
            center={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
            markers={[selectedLocation, ...nearbyAttractions]}
            height={300}
          />
        ) : (
          <div
            className="flex justify-center items-center bg-gray-100 border border-dashed border-gray-300 rounded"
            style={{ height: 300 }}
          >
            <p className="text-gray-500">Search for a location to display the map</p>
          </div>
        )}

        {/* Location Information */}
        {selectedLocation && (
          <div className="mt-4">
            <div className="flex items-center mb-1">
              <MapPin size={18} className="mr-2 text-blue-600" />
              <h3 className="text-lg font-medium">
                {selectedLocation.name}, {selectedLocation.country}
              </h3>
            </div>

            {selectedLocation.description && (
              <p className="text-gray-600 mb-3 text-sm">
                {selectedLocation.description}
              </p>
            )}

            <hr className="my-3" />

            {/* Nearby Attractions */}
            <div>
              <h4 className="text-md font-medium mb-2">Nearby Attractions</h4>

              {loading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : nearbyAttractions.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {nearbyAttractions.map((attraction, index) => (
                    <li key={index} className="py-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-start">
                          <div className="flex-shrink-0 pt-1">
                            {getAttractionIcon(attraction.type)}
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium">{attraction.name}</p>
                            <div className="flex items-center mt-1">
                              <span className="text-xs text-gray-500">
                                {(attraction.distance / 1000).toFixed(1)} km away
                              </span>
                              <span 
                                className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700"
                              >
                                {attraction.type}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button 
                          className="p-1 rounded-full hover:bg-gray-100"
                          onClick={() => addToItinerary(attraction)}
                          title="Add to itinerary"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-3 bg-blue-50 border border-blue-100 text-blue-700 rounded text-sm">
                  No attractions found nearby. Try searching for a more specific location or expanding the search radius.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapVisualization;