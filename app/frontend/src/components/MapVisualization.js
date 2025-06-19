// import React, { useState, useEffect } from "react";
// import {
//   MapPin,
//   Route,
//   Eye,
//   EyeOff,
//   Navigation,
//   Zap,
//   AlertCircle,
//   RefreshCw,
//   Calendar,
//   ExternalLink,
//   CheckCircle,
//   Clock,
// } from "lucide-react";

// // SOLUTION 1: Move cache outside component to persist across remounts
// const globalEnrichedCache = new Map();
// const globalProcessedTrips = new Set();

// // Helper functions - make sure these are complete
// const getDestinationCoords = async (destination) => {
//   if (!destination) return { lat: 41.3851, lng: 2.1734 };

//   try {
//     const response = await fetch(
//       `/api/map/search?query=${encodeURIComponent(destination)}`
//     );
//     if (response.ok) {
//       const results = await response.json();
//       if (results && results.length > 0) {
//         return { lat: results[0].lat, lng: results[0].lng };
//       }
//     }
//   } catch (error) {
//     console.error("Error fetching destination coordinates:", error);
//   }

//   return { lat: 41.3851, lng: 2.1734 }; // Fallback
// };

// // Helper function to calculate distance from city center
// const calculateDistanceFromCenter = (lat1, lng1, lat2, lng2) => {
//   const R = 6371000; // Earth radius in meters
//   const φ1 = (lat1 * Math.PI) / 180;
//   const φ2 = (lat2 * Math.PI) / 180;
//   const Δφ = ((lat2 - lat1) * Math.PI) / 180;
//   const Δλ = ((lng2 - lng1) * Math.PI) / 180;

//   const a =
//     Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
//     Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
//   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

//   return R * c; // Distance in meters
// };

// // NEW: Enhanced address-based coordinate search
// const getCoordinatesFromAddress = async (
//   address,
//   fallbackQuery,
//   destination
// ) => {
//   if (!address || address.length < 5) {
//     console.warn("Address too short or missing:", address);
//     return null;
//   }

//   const searchQueries = [
//     address, // Try exact address first
//     `${address}, ${destination}`, // Add destination for context
//     fallbackQuery, // Fallback to activity name
//   ];

//   for (const query of searchQueries) {
//     if (!query) continue;

//     try {
//       console.log(`🔍 Searching for address: "${query}"`);
//       const response = await fetch(
//         `/api/map/search?query=${encodeURIComponent(query)}`
//       );

//       if (response.ok) {
//         const results = await response.json();
//         if (results && results.length > 0) {
//           const result = results[0];
//           console.log(
//             `✅ Found coordinates for "${query}": ${result.lat}, ${result.lng}`
//           );
//           return {
//             lat: result.lat + (Math.random() - 0.5) * 0.0001, // Small random offset
//             lng: result.lng + (Math.random() - 0.5) * 0.0001,
//             source: "address",
//           };
//         }
//       }
//     } catch (error) {
//       console.warn(`Address search failed for: "${query}"`, error);
//       continue;
//     }

//     // Small delay between searches
//     await new Promise((resolve) => setTimeout(resolve, 100));
//   }

//   return null;
// };

// // Generic district offset calculation for any city
// const getGenericDistrictOffset = (district, index = 0) => {
//   // Create a simple hash of the district name for consistent positioning
//   const hash = district
//     .toLowerCase()
//     .split("")
//     .reduce((a, b) => {
//       a = (a << 5) - a + b.charCodeAt(0);
//       return a & a;
//     }, 0);

//   // Convert hash to coordinate offsets (small offsets from city center)
//   const offsetMagnitude = 0.01; // ~1km offset
//   const baseOffset = {
//     lat: (((hash % 100) - 50) / 100) * offsetMagnitude,
//     lng: ((((hash >> 8) % 100) - 50) / 100) * offsetMagnitude,
//   };

//   // Add small sequential offset for multiple activities in same district
//   return {
//     lat: baseOffset.lat + index * 0.001,
//     lng: baseOffset.lng + index * 0.001,
//   };
// };

// // Enhanced activity coordinate search using addresses
// const getActivityCoordinatesEnhanced = async (
//   activity,
//   destination,
//   district,
//   index,
//   destinationCoords
// ) => {
//   const activityName = activity.title || activity.name || "Unknown Activity";
//   const address = activity.address;

//   try {
//     // Strategy 1: Use address if available (NEW!)
//     if (address && address.length > 5) {
//       console.log(`Using address for ${activityName}: ${address}`);
//       const coords = await getCoordinatesFromAddress(
//         address,
//         activityName,
//         destination
//       );
//       if (coords) {
//         return {
//           ...coords,
//           searchMethod: "address",
//         };
//       }
//     }

//     // Strategy 2: Fall back to name-based search
//     console.log(`Falling back to name search for: ${activityName}`);
//     const searchQueries = [
//       `${activityName}, ${district}, ${destination}`,
//       `${activityName}, ${destination}`,
//       activityName,
//     ];

//     for (const query of searchQueries) {
//       try {
//         const response = await fetch(
//           `/api/map/search?query=${encodeURIComponent(query)}`
//         );

//         if (response.ok) {
//           const results = await response.json();
//           if (results && results.length > 0) {
//             const result = results[0];
//             const distanceFromCity = calculateDistanceFromCenter(
//               result.lat,
//               result.lng,
//               destinationCoords.lat,
//               destinationCoords.lng
//             );

//             // Walking distance check (5km max)
//             if (distanceFromCity < 5000) {
//               console.log(
//                 `✅ Found ${activityName}: ${Math.round(
//                   distanceFromCity / 1000
//                 )}km from center`
//               );
//               return {
//                 lat: result.lat + (Math.random() - 0.5) * 0.0001,
//                 lng: result.lng + (Math.random() - 0.5) * 0.0001,
//                 searchMethod: "name",
//               };
//             }
//           }
//         }
//       } catch (error) {
//         console.warn(`Search failed for: "${query}"`, error);
//         continue;
//       }

//       await new Promise((resolve) => setTimeout(resolve, 100));
//     }

//     // Strategy 3: District-based fallback
//     console.warn(`Using district fallback for ${activityName} in ${district}`);
//     const fallbackOffset = getGenericDistrictOffset(district, index);
//     return {
//       lat: destinationCoords.lat + fallbackOffset.lat,
//       lng: destinationCoords.lng + fallbackOffset.lng,
//       searchMethod: "fallback",
//     };
//   } catch (error) {
//     console.error(`Error searching for ${activityName}:`, error);
//     const fallbackOffset = getGenericDistrictOffset(district, index);
//     return {
//       lat: destinationCoords.lat + fallbackOffset.lat,
//       lng: destinationCoords.lng + fallbackOffset.lng,
//       searchMethod: "error",
//     };
//   }
// };

// // Extract data from itinerary formats
// const extractLocation = (dayData) => {
//   if (typeof dayData === "object" && dayData.district) {
//     return dayData.district;
//   }
//   return null;
// };

// const extractActivities = (dayData) => {
//   if (Array.isArray(dayData)) {
//     return dayData;
//   } else if (typeof dayData === "object") {
//     if (dayData.activities) {
//       return dayData.activities;
//     } else {
//       // Time-based format like {"09:00": {title: "...", type: "...", address: "..."}, "11:00": {...}}
//       return Object.entries(dayData)
//         .filter(([key]) => key !== "date" && key !== "district") // Filter out non-time keys
//         .map(([time, activity]) => ({
//           time,
//           title:
//             typeof activity === "string"
//               ? activity
//               : activity.title || activity.name || String(activity),
//           type: typeof activity === "object" ? activity.type : "attraction",
//           location: typeof activity === "object" ? activity.location : null,
//           address: typeof activity === "object" ? activity.address : null, // NEW!
//         }));
//     }
//   }
//   return [];
// };

// const extractDate = (dayData) => {
//   if (typeof dayData === "object" && dayData.date) return dayData.date;
//   return new Date().toISOString().split("T")[0];
// };

// const guessActivityType = (activityName) => {
//   const name = activityName.toLowerCase();
//   if (
//     name.includes("cafe") ||
//     name.includes("coffee") ||
//     name.includes("caffè")
//   )
//     return "cafe";
//   if (
//     name.includes("restaurant") ||
//     name.includes("ristorante") ||
//     name.includes("trattoria") ||
//     name.includes("osteria") ||
//     name.includes("lunch") ||
//     name.includes("dinner")
//   )
//     return "restaurant";
//   if (name.includes("museum") || name.includes("gallery")) return "museum";
//   if (name.includes("park") || name.includes("garden")) return "park";
//   if (name.includes("shopping") || name.includes("market")) return "shopping";
//   if (name.includes("beach")) return "beach";
//   if (name.includes("church") || name.includes("cathedral")) return "landmark";
//   return "attraction";
// };

// // Main enrichment function - NOW WITH ADDRESS SUPPORT
// const enrichItineraryWithCoordinates = async (rawItinerary, destination) => {
//   const destinationCoords = await getDestinationCoords(destination);
//   const enriched = {};

//   // Handle the wrapper format {itinerary: {...}}
//   let itineraryData = rawItinerary;
//   if (rawItinerary.itinerary) {
//     itineraryData = rawItinerary.itinerary;
//   }

//   console.log("Processing itinerary data with address support:", itineraryData);

//   // Extract unique districts from itinerary data
//   const uniqueDistricts = new Set();
//   Object.values(itineraryData).forEach((dayData) => {
//     const district = extractLocation(dayData);
//     if (district && district !== destination) {
//       uniqueDistricts.add(district);
//     }
//   });

//   // Find real coordinates for each district
//   const districtCoords = {};
//   for (const district of uniqueDistricts) {
//     try {
//       console.log(`🔍 Searching for district: ${district}`);
//       const response = await fetch(
//         `/api/map/search?query=${encodeURIComponent(
//           `${district}, ${destination}`
//         )}`
//       );

//       if (response.ok) {
//         const results = await response.json();
//         if (results && results.length > 0) {
//           const result = results[0];
//           districtCoords[district] = {
//             lat: result.lat,
//             lng: result.lng,
//           };
//           console.log(`📍 Found district: ${district}`);
//         }
//       }
//     } catch (error) {
//       console.warn(`Failed to find district coordinates for: ${district}`);
//     }

//     if (!districtCoords[district]) {
//       const offset = getGenericDistrictOffset(district);
//       districtCoords[district] = {
//         lat: destinationCoords.lat + offset.lat,
//         lng: destinationCoords.lng + offset.lng,
//       };
//     }

//     await new Promise((resolve) => setTimeout(resolve, 200));
//   }

//   // Process each day
//   for (const [dayKey, dayData] of Object.entries(itineraryData)) {
//     if (!dayKey.toLowerCase().includes("day")) continue;

//     const activities = extractActivities(dayData);
//     const enrichedActivities = [];

//     const dayDistrict = extractLocation(dayData) || destination;

//     console.log(`Processing ${dayKey} in ${dayDistrict}:`, activities);

//     for (let i = 0; i < activities.length; i++) {
//       const activity = activities[i];

//       try {
//         const coords = await getActivityCoordinatesEnhanced(
//           activity,
//           destination,
//           dayDistrict,
//           i,
//           destinationCoords
//         );

//         enrichedActivities.push({
//           name: activity.title || activity.name || "Unknown Activity",
//           time: activity.time || `${String(9 + i * 2).padStart(2, "0")}:00`,
//           type: activity.type || guessActivityType(activity.title || ""),
//           lat: coords.lat,
//           lng: coords.lng,
//           location: activity.location || dayDistrict || destination,
//           district: dayDistrict,
//           address: activity.address || null, // Include original address
//           searchMethod: coords.searchMethod, // Track how coordinates were found
//         });

//         // Delay between searches
//         if (i < activities.length - 1) {
//           await new Promise((resolve) => setTimeout(resolve, 300));
//         }
//       } catch (error) {
//         console.warn(`Failed to get coordinates for ${activity.title}:`, error);
//         const fallbackOffset = getGenericDistrictOffset(dayDistrict, i);
//         enrichedActivities.push({
//           name: activity.title || "Unknown Activity",
//           time: activity.time || `${String(9 + i * 2).padStart(2, "0")}:00`,
//           type: activity.type || "attraction",
//           lat: destinationCoords.lat + fallbackOffset.lat,
//           lng: destinationCoords.lng + fallbackOffset.lng,
//           location: activity.location || dayDistrict || destination,
//           district: dayDistrict,
//           address: activity.address || null,
//           searchMethod: "fallback",
//         });
//       }
//     }

//     if (enrichedActivities.length > 0) {
//       enriched[dayKey] = {
//         date: extractDate(dayData),
//         activities: enrichedActivities,
//         district: dayDistrict,
//       };
//     }
//   }

//   console.log("Enriched itinerary with addresses:", enriched);
//   return enriched;
// };

// // Main component
// const MapVisualization = ({ tripId, destination }) => {
//   const [itinerary, setItinerary] = useState(null);
//   const [selectedDays, setSelectedDays] = useState([]);
//   const [showRoutes, setShowRoutes] = useState(true);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [mapLoaded, setMapLoaded] = useState(false);
//   const [enrichmentStatus, setEnrichmentStatus] = useState("");
//   const mapRef = React.useRef(null);
//   const mapInstanceRef = React.useRef(null);

//   // Get destination coordinates for fallback centering
//   const [destinationCoords, setDestinationCoords] = useState({
//     lat: 41.3851,
//     lng: 2.1734,
//   });

//   // Create cache key for this specific trip
//   const cacheKey = `${tripId}_${destination}`;

//   // Fetch destination coordinates using OpenStreetMap
//   useEffect(() => {
//     const fetchDestinationCoords = async () => {
//       if (!destination) return;

//       try {
//         const response = await fetch(
//           `/api/map/search?query=${encodeURIComponent(destination)}`
//         );
//         if (response.ok) {
//           const results = await response.json();
//           if (results && results.length > 0) {
//             setDestinationCoords({
//               lat: results[0].lat,
//               lng: results[0].lng,
//             });
//           }
//         }
//       } catch (error) {
//         console.error("Error fetching destination coordinates:", error);
//       }
//     };

//     fetchDestinationCoords();
//   }, [destination]);

//   // Load real itinerary data from your itinerary service
//   useEffect(() => {
//     const loadItinerary = async () => {
//       // Check global cache first
//       if (
//         globalEnrichedCache.has(cacheKey) &&
//         globalProcessedTrips.has(cacheKey)
//       ) {
//         console.log("✅ Using cached itinerary data - no processing needed");
//         const cached = globalEnrichedCache.get(cacheKey);
//         setItinerary(cached.itinerary);
//         setSelectedDays(cached.selectedDays);
//         setDestinationCoords(cached.destinationCoords);
//         setLoading(false);
//         return;
//       }

//       setLoading(true);
//       setError(null);
//       setEnrichmentStatus("Fetching itinerary...");

//       try {
//         // Fetch itinerary from your actual itinerary service
//         const response = await fetch(`/api/itinerary/itinerary/${tripId}`);

//         if (response.status === 202) {
//           setError("Itinerary is still being generated. Please wait...");
//           setLoading(false);
//           return;
//         }

//         if (!response.ok) {
//           if (response.status === 404) {
//             setError("No itinerary found. Generate an itinerary first.");
//           } else {
//             throw new Error(
//               `Failed to fetch itinerary: ${response.statusText}`
//             );
//           }
//           setLoading(false);
//           return;
//         }

//         const data = await response.json();
//         console.log("Raw itinerary data:", data);

//         // Only process coordinates if we haven't done it before
//         if (!globalProcessedTrips.has(cacheKey)) {
//           console.log("🔄 Processing coordinates with address support...");
//           setEnrichmentStatus("Adding coordinates using addresses...");

//           // Get destination coordinates
//           const destCoords = await getDestinationCoords(destination);
//           setDestinationCoords(destCoords);

//           // Transform the itinerary data to include coordinates using addresses
//           const transformedItinerary = await enrichItineraryWithCoordinates(
//             data,
//             destination
//           );

//           if (Object.keys(transformedItinerary).length === 0) {
//             setError("No valid itinerary data found.");
//           } else {
//             const selectedDaysList = Object.keys(transformedItinerary);

//             // Cache the enriched data globally
//             globalEnrichedCache.set(cacheKey, {
//               itinerary: transformedItinerary,
//               selectedDays: selectedDaysList,
//               destinationCoords: destCoords,
//             });
//             globalProcessedTrips.add(cacheKey);

//             setItinerary(transformedItinerary);
//             setSelectedDays(selectedDaysList);
//             setEnrichmentStatus("");
//             console.log(
//               "✅ Coordinates processed with address support and cached!"
//             );
//           }
//         } else {
//           const cached = globalEnrichedCache.get(cacheKey);
//           if (cached) {
//             setItinerary(cached.itinerary);
//             setSelectedDays(cached.selectedDays);
//             setDestinationCoords(cached.destinationCoords);
//           }
//         }
//       } catch (err) {
//         console.error("Error loading itinerary:", err);
//         setError(`Failed to load itinerary: ${err.message}`);
//         setEnrichmentStatus("");
//       } finally {
//         setLoading(false);
//       }
//     };

//     if (tripId) {
//       loadItinerary();
//     }
//   }, [tripId, destination, cacheKey]);

//   // Load map libraries
//   useEffect(() => {
//     if (window.L) {
//       setMapLoaded(true);
//       return;
//     }

//     const loadMapLibraries = async () => {
//       try {
//         const cssLink = document.createElement("link");
//         cssLink.rel = "stylesheet";
//         cssLink.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
//         document.head.appendChild(cssLink);

//         const script = document.createElement("script");
//         script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
//         script.async = true;
//         script.onload = () => setMapLoaded(true);
//         document.body.appendChild(script);
//       } catch (error) {
//         console.error("Failed to load map libraries:", error);
//       }
//     };

//     loadMapLibraries();
//   }, []);

//   // Initialize map with real destination coordinates
//   useEffect(() => {
//     if (!mapLoaded || !mapRef.current || !itinerary) return;

//     const initMap = () => {
//       // Only create map if it doesn't exist
//       if (!mapInstanceRef.current) {
//         console.log("Creating new map instance");
//         const map = window.L.map(mapRef.current).setView(
//           [destinationCoords.lat, destinationCoords.lng],
//           13
//         );

//         window.L.tileLayer(
//           "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
//           {
//             attribution: "&copy; OpenStreetMap contributors",
//           }
//         ).addTo(map);

//         mapInstanceRef.current = map;
//       }

//       // Always update markers when itinerary changes
//       updateMapMarkers();
//     };

//     initMap();
//   }, [mapLoaded, itinerary, destinationCoords]);

//   // Update markers when display options change
//   useEffect(() => {
//     if (mapInstanceRef.current && itinerary) {
//       updateMapMarkers();
//     }
//   }, [selectedDays, showRoutes]);

//   const updateMapMarkers = () => {
//     if (!mapInstanceRef.current || !window.L || !itinerary) return;

//     // Clear existing markers
//     mapInstanceRef.current.eachLayer((layer) => {
//       if (
//         layer instanceof window.L.Marker ||
//         layer instanceof window.L.Polyline
//       ) {
//         mapInstanceRef.current.removeLayer(layer);
//       }
//     });

//     const dayColors = ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6"];
//     const allMarkers = [];

//     Object.entries(itinerary).forEach(([dayName, dayData], dayIndex) => {
//       if (!selectedDays.includes(dayName)) return;

//       const dayColor = dayColors[dayIndex % dayColors.length];
//       const activities = dayData.activities || [];

//       // Add markers for each activity
//       activities.forEach((activity, actIndex) => {
//         if (!activity.lat || !activity.lng) return;

//         // Different icon styles based on search method
//         const getIconStyle = (searchMethod) => {
//           const baseStyle = `
//             background: ${dayColor};
//             color: white;
//             width: 28px;
//             height: 28px;
//             border-radius: 50%;
//             display: flex;
//             align-items: center;
//             justify-content: center;
//             font-weight: bold;
//             font-size: 12px;
//             border: 2px solid white;
//             box-shadow: 0 2px 4px rgba(0,0,0,0.3);
//           `;

//           if (searchMethod === "address") {
//             return baseStyle + `border: 3px solid #10B981;`; // Green border for address-based
//           } else if (searchMethod === "name") {
//             return baseStyle + `border: 3px solid #F59E0B;`; // Orange border for name-based
//           } else {
//             return baseStyle + `border: 3px solid #EF4444;`; // Red border for fallback
//           }
//         };

//         const marker = window.L.marker([activity.lat, activity.lng], {
//           icon: window.L.divIcon({
//             html: `<div style="${getIconStyle(activity.searchMethod)}">${
//               actIndex + 1
//             }</div>`,
//             className: "custom-div-icon",
//             iconSize: [28, 28],
//             iconAnchor: [14, 14],
//           }),
//         }).addTo(mapInstanceRef.current);

//         // Enhanced popup with address and search method info
//         const distanceFromCenter = calculateDistanceFromCenter(
//           activity.lat,
//           activity.lng,
//           destinationCoords.lat,
//           destinationCoords.lng
//         );

//         const searchMethodIcon = {
//           address: "📍",
//           name: "🔍",
//           fallback: "📌",
//         };

//         const searchMethodText = {
//           address: "Found by address",
//           name: "Found by name search",
//           fallback: "Estimated location",
//         };

//         marker.bindPopup(`
//           <div style="min-width: 220px;">
//             <div style="font-weight: bold; color: ${dayColor}; margin-bottom: 4px;">
//               ${dayName} - Activity ${actIndex + 1}
//             </div>
//             <div style="font-size: 16px; margin-bottom: 4px;">
//               <strong>${activity.name}</strong>
//             </div>
//             <div style="color: #666; font-size: 14px; margin-bottom: 4px;">
//               🕐 ${activity.time} • ${activity.type}
//             </div>
//             ${
//               activity.address
//                 ? `
//               <div style="color: #666; font-size: 12px; margin-bottom: 4px;">
//                 📬 ${activity.address}
//               </div>
//             `
//                 : ""
//             }
//             <div style="color: #888; font-size: 12px; margin-bottom: 4px;">
//               📍 ${activity.location}
//             </div>
//             <div style="color: #666; font-size: 12px; margin-bottom: 4px;">
//               🚶 ${
//                 Math.round((distanceFromCenter / 1000) * 10) / 10
//               }km from center
//             </div>
//             <div style="color: #555; font-size: 11px;">
//               ${searchMethodIcon[activity.searchMethod]} ${
//           searchMethodText[activity.searchMethod]
//         }
//             </div>
//           </div>
//         `);

//         allMarkers.push(marker);
//       });

//       // Add walking route lines between activities
//       if (showRoutes && activities.length > 1) {
//         for (let i = 0; i < activities.length - 1; i++) {
//           const current = activities[i];
//           const next = activities[i + 1];

//           if (current.lat && current.lng && next.lat && next.lng) {
//             const walkingDistance = calculateDistanceFromCenter(
//               current.lat,
//               current.lng,
//               next.lat,
//               next.lng
//             );

//             // Only show route if it's a reasonable walking distance
//             if (walkingDistance < 3000) {
//               // 3km max between activities
//               window.L.polyline(
//                 [
//                   [current.lat, current.lng],
//                   [next.lat, next.lng],
//                 ],
//                 {
//                   color: dayColor,
//                   weight: 3,
//                   opacity: 0.7,
//                   dashArray: "5, 5",
//                 }
//               ).addTo(mapInstanceRef.current);
//             } else {
//               // Show dashed line for longer distances
//               window.L.polyline(
//                 [
//                   [current.lat, current.lng],
//                   [next.lat, next.lng],
//                 ],
//                 {
//                   color: "#FF6B6B",
//                   weight: 2,
//                   opacity: 0.5,
//                   dashArray: "10, 10",
//                 }
//               ).addTo(mapInstanceRef.current);
//             }
//           }
//         }
//       }
//     });

//     // Fit map to markers
//     if (allMarkers.length > 0) {
//       const group = new window.L.featureGroup(allMarkers);
//       mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1));
//     }
//   };

//   const toggleDay = (day) => {
//     setSelectedDays((prev) =>
//       prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
//     );
//   };

//   const openInMaps = () => {
//     if (destinationCoords) {
//       const url = `https://www.openstreetmap.org/#map=13/${destinationCoords.lat}/${destinationCoords.lng}`;
//       window.open(url, "_blank");
//     }
//   };

//   // Force refresh
//   const forceRefresh = () => {
//     globalEnrichedCache.delete(cacheKey);
//     globalProcessedTrips.delete(cacheKey);
//     setItinerary(null);
//     setLoading(true);
//     console.log("🔄 Forced refresh - cache cleared");
//   };

//   const forceRefreshCoordinates = () => {
//     if (window.confirm("This will re-fetch all coordinates. Continue?")) {
//       forceRefresh();
//     }
//   };

//   // Calculate success rate and search method stats
//   const calculateSearchStats = () => {
//     if (!itinerary)
//       return { addressBased: 0, nameBased: 0, fallback: 0, total: 0 };

//     let addressBased = 0;
//     let nameBased = 0;
//     let fallback = 0;
//     let total = 0;

//     Object.values(itinerary).forEach((day) => {
//       if (day.activities) {
//         day.activities.forEach((activity) => {
//           total++;
//           if (activity.searchMethod === "address") addressBased++;
//           else if (activity.searchMethod === "name") nameBased++;
//           else fallback++;
//         });
//       }
//     });

//     return { addressBased, nameBased, fallback, total };
//   };

//   // Calculate walking stats
//   const calculateWalkingStats = () => {
//     if (!itinerary) return { totalWalking: 0, avgDistance: 0, maxDistance: 0 };

//     let totalWalking = 0;
//     let routeCount = 0;
//     let maxDistance = 0;

//     Object.values(itinerary).forEach((day) => {
//       if (day.activities && day.activities.length > 1) {
//         for (let i = 0; i < day.activities.length - 1; i++) {
//           const current = day.activities[i];
//           const next = day.activities[i + 1];

//           if (current.lat && current.lng && next.lat && next.lng) {
//             const distance = calculateDistanceFromCenter(
//               current.lat,
//               current.lng,
//               next.lat,
//               next.lng
//             );
//             totalWalking += distance;
//             routeCount++;
//             maxDistance = Math.max(maxDistance, distance);
//           }
//         }
//       }
//     });

//     return {
//       totalWalking: Math.round((totalWalking / 1000) * 10) / 10, // km
//       avgDistance:
//         routeCount > 0
//           ? Math.round((totalWalking / routeCount / 1000) * 10) / 10
//           : 0, // km
//       maxDistance: Math.round((maxDistance / 1000) * 10) / 10, // km
//     };
//   };

//   if (loading) {
//     return (
//       <div className="bg-white rounded-lg border border-gray-200 p-8">
//         <div className="flex items-center justify-center">
//           <RefreshCw className="w-6 h-6 animate-spin mr-2" />
//           <div>
//             <span>Loading trip map...</span>
//             {enrichmentStatus && (
//               <div className="text-sm text-gray-600 mt-1">
//                 {enrichmentStatus}
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="bg-white rounded-lg border border-gray-200 p-8">
//         <div className="flex items-center text-red-600">
//           <AlertCircle className="w-6 h-6 mr-2" />
//           <span>{error}</span>
//         </div>
//         {error.includes("Generate an itinerary") && (
//           <div className="mt-4">
//             <button
//               onClick={() => (window.location.hash = "itinerary")}
//               className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
//             >
//               Go to Itinerary Tab
//             </button>
//           </div>
//         )}
//       </div>
//     );
//   }

//   if (!itinerary || Object.keys(itinerary).length === 0) {
//     return (
//       <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
//         <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
//         <h3 className="text-lg font-medium text-gray-900 mb-2">
//           No Itinerary Available
//         </h3>
//         <p className="text-gray-600 mb-4">
//           Generate an itinerary first to see your trip on the map.
//         </p>
//         <button
//           onClick={() => (window.location.hash = "itinerary")}
//           className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
//         >
//           Generate Itinerary
//         </button>
//       </div>
//     );
//   }

//   const walkingStats = calculateWalkingStats();
//   const searchStats = calculateSearchStats();

//   return (
//     <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
//       {/* Header */}
//       <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
//         <div className="flex justify-between items-center">
//           <h2 className="text-xl font-semibold text-gray-900 flex items-center">
//             <MapPin className="w-6 h-6 mr-2 text-blue-600" />
//             Smart Address-Based Map
//             {/* Cache status indicator */}
//             {globalProcessedTrips.has(cacheKey) && (
//               <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
//                 Cached
//               </span>
//             )}
//           </h2>
//           <div className="flex items-center space-x-2">
//             <button
//               onClick={() => setShowRoutes(!showRoutes)}
//               className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
//                 showRoutes
//                   ? "bg-blue-600 text-white"
//                   : "bg-white text-gray-600 border border-gray-300"
//               }`}
//             >
//               {showRoutes ? (
//                 <Eye size={16} className="mr-1" />
//               ) : (
//                 <EyeOff size={16} className="mr-1" />
//               )}
//               Routes
//             </button>
//             <button
//               onClick={forceRefreshCoordinates}
//               className="flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-orange-100 text-orange-700 border border-orange-300 hover:bg-orange-200"
//               title="Re-fetch all coordinates (for testing)"
//             >
//               <RefreshCw size={16} className="mr-1" />
//               Re-fetch
//             </button>
//             <button
//               onClick={openInMaps}
//               className="flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
//             >
//               <ExternalLink size={16} className="mr-1" />
//               Open in Maps
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* Day Selection */}
//       <div className="p-4 border-b border-gray-200 bg-gray-50">
//         <div className="flex flex-wrap gap-2">
//           {Object.entries(itinerary).map(([dayName, dayData], index) => {
//             const isSelected = selectedDays.includes(dayName);
//             const dayColors = [
//               "#3B82F6",
//               "#EF4444",
//               "#10B981",
//               "#F59E0B",
//               "#8B5CF6",
//             ];
//             const dayColor = dayColors[index % dayColors.length];

//             return (
//               <button
//                 key={dayName}
//                 onClick={() => toggleDay(dayName)}
//                 className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all ${
//                   isSelected
//                     ? "text-white shadow-md"
//                     : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
//                 }`}
//                 style={isSelected ? { backgroundColor: dayColor } : {}}
//               >
//                 <Calendar size={16} className="mr-1" />
//                 {dayName}
//                 <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-white bg-opacity-20">
//                   {dayData.activities?.length || 0}
//                 </span>
//               </button>
//             );
//           })}
//         </div>
//       </div>

//       {/* Map */}
//       <div className="relative">
//         <div
//           ref={mapRef}
//           className="w-full bg-blue-50"
//           style={{ height: "400px" }}
//         >
//           {!mapLoaded && (
//             <div className="absolute inset-0 flex items-center justify-center bg-blue-50">
//               <div className="text-center">
//                 <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
//                 <p className="text-gray-600">Loading map...</p>
//               </div>
//             </div>
//           )}
//         </div>

//         {/* Enhanced Legend */}
//         <div className="absolute top-4 right-4 bg-white p-3 rounded-lg shadow-lg">
//           <h4 className="font-medium text-sm mb-2">Legend</h4>

//           {/* Day colors */}
//           <div className="space-y-1 mb-3">
//             {Object.keys(itinerary).map((dayName, index) => {
//               const dayColors = [
//                 "#3B82F6",
//                 "#EF4444",
//                 "#10B981",
//                 "#F59E0B",
//                 "#8B5CF6",
//               ];
//               const dayColor = dayColors[index % dayColors.length];
//               return (
//                 <div key={dayName} className="flex items-center text-xs">
//                   <div
//                     className="w-3 h-3 rounded-full mr-2"
//                     style={{ backgroundColor: dayColor }}
//                   ></div>
//                   <span>{dayName}</span>
//                 </div>
//               );
//             })}
//           </div>

//           {/* Search method indicators */}
//           <div className="pt-3 border-t border-gray-200">
//             <h5 className="font-medium text-xs mb-1">Accuracy</h5>
//             <div className="space-y-1 text-xs">
//               <div className="flex items-center">
//                 <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-green-500 mr-2"></div>
//                 <span>Address-based</span>
//               </div>
//               <div className="flex items-center">
//                 <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-orange-500 mr-2"></div>
//                 <span>Name search</span>
//               </div>
//               <div className="flex items-center">
//                 <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-red-500 mr-2"></div>
//                 <span>Estimated</span>
//               </div>
//             </div>
//           </div>

//           {/* Routes legend */}
//           <div className="mt-3 pt-3 border-t border-gray-200">
//             <h5 className="font-medium text-xs mb-1">Routes</h5>
//             <div className="space-y-1 text-xs">
//               <div className="flex items-center">
//                 <div
//                   className="w-4 h-0.5 bg-blue-500 mr-2"
//                   style={{ borderTop: "3px dashed" }}
//                 ></div>
//                 <span>Walking (&lt;3km)</span>
//               </div>
//               <div className="flex items-center">
//                 <div
//                   className="w-4 h-0.5 bg-red-400 mr-2"
//                   style={{ borderTop: "2px dashed" }}
//                 ></div>
//                 <span>Long distance</span>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Enhanced Stats with Address Accuracy */}
//       <div className="p-4 border-t border-gray-200 bg-white">
//         <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
//           <div>
//             <div className="text-2xl font-bold text-blue-600">
//               {Object.values(itinerary).reduce(
//                 (total, day) => total + (day.activities?.length || 0),
//                 0
//               )}
//             </div>
//             <div className="text-sm text-gray-600">Activities</div>
//           </div>
//           <div>
//             <div className="text-2xl font-bold text-green-600">
//               {searchStats.addressBased}
//             </div>
//             <div className="text-sm text-gray-600">Address-based</div>
//           </div>
//           <div>
//             <div className="text-2xl font-bold text-purple-600">
//               {walkingStats.totalWalking}km
//             </div>
//             <div className="text-sm text-gray-600">Total Walking</div>
//           </div>
//           <div>
//             <div className="text-2xl font-bold text-orange-600">
//               {Math.round((searchStats.addressBased / searchStats.total) * 100)}
//               %
//             </div>
//             <div className="text-sm text-gray-600">Accuracy Rate</div>
//           </div>
//         </div>

//         {/* Detailed accuracy breakdown */}
//         <div className="mt-4 pt-4 border-t border-gray-100">
//           <div className="grid grid-cols-3 gap-4 text-center text-sm">
//             <div>
//               <div className="text-green-600 font-semibold">
//                 {searchStats.addressBased}
//               </div>
//               <div className="text-gray-500">📍 Address-based</div>
//             </div>
//             <div>
//               <div className="text-orange-600 font-semibold">
//                 {searchStats.nameBased}
//               </div>
//               <div className="text-gray-500">🔍 Name search</div>
//             </div>
//             <div>
//               <div className="text-red-600 font-semibold">
//                 {searchStats.fallback}
//               </div>
//               <div className="text-gray-500">📌 Estimated</div>
//             </div>
//           </div>
//         </div>

//         {/* Status and info */}
//         <div className="mt-4 pt-4 border-t border-gray-100 text-center space-y-2">
//           {globalProcessedTrips.has(cacheKey) && (
//             <p className="text-xs text-green-600">
//               ✅ Map data cached - no regeneration needed when switching tabs
//             </p>
//           )}

//           {searchStats.addressBased > 0 && (
//             <p className="text-xs text-green-600">
//               🎯 Using AI-generated addresses for improved accuracy
//             </p>
//           )}

//           {walkingStats.maxDistance > 3 && (
//             <p className="text-xs text-orange-600">
//               ⚠️ Some routes exceed 3km - consider transport options
//             </p>
//           )}

//           <p className="text-xs text-gray-500">
//             🗺️ Powered by OpenStreetMap • Address-enhanced geocoding
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default MapVisualization;

import React, { useState, useEffect } from "react";
import {
  MapPin,
  Route,
  Eye,
  EyeOff,
  Navigation,
  Zap,
  AlertCircle,
  RefreshCw,
  Calendar,
  ExternalLink,
  CheckCircle,
  Clock,
} from "lucide-react";

// SOLUTION 1: Move cache outside component to persist across remounts
const globalEnrichedCache = new Map();
const globalProcessedTrips = new Set();

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

// GENERIC coordinate validation for any city destination
const validateCityCoordinates = (
  lat,
  lng,
  destinationCoords,
  maxDistanceKm = 25
) => {
  // Calculate distance from city center
  const distanceFromCenter = calculateDistanceFromCenter(
    lat,
    lng,
    destinationCoords.lat,
    destinationCoords.lng
  );

  const isValid = distanceFromCenter <= maxDistanceKm * 1000; // Convert to meters

  if (!isValid) {
    console.warn(
      `⚠️ Coordinates too far from ${
        destinationCoords.cityName || "city center"
      }: ${Math.round(distanceFromCenter / 1000)}km (max: ${maxDistanceKm}km)`
    );
  }

  return isValid;
};

// Enhanced destination coordinate fetching with city name storage
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
    console.error("Error fetching destination coordinates:", error);
  }

  return { lat: 41.3851, lng: 2.1734, cityName: destination }; // Fallback
};

// ENHANCED address-based coordinate search with generic validation
const getCoordinatesFromAddress = async (
  address,
  fallbackQuery,
  destination,
  destinationCoords
) => {
  if (!address || address.length < 5) {
    console.warn("Address too short or missing:", address);
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
      console.log(`🔍 Searching for address: "${query}"`);
      const response = await fetch(
        `/api/map/search?query=${encodeURIComponent(query)}`
      );

      if (response.ok) {
        const results = await response.json();
        if (results && results.length > 0) {
          // Sort results by distance from city center
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

          // Try the closest results first
          for (const result of sortedResults.slice(0, 3)) {
            // Check top 3 closest
            if (
              validateCityCoordinates(result.lat, result.lng, destinationCoords)
            ) {
              console.log(
                `✅ Valid coordinates for "${query}": ${result.lat}, ${
                  result.lng
                } (${Math.round(
                  result.distanceFromCenter / 1000
                )}km from center)`
              );
              return {
                lat: result.lat + (Math.random() - 0.5) * 0.0002,
                lng: result.lng + (Math.random() - 0.5) * 0.0002,
                source: "address",
                distanceFromCenter: result.distanceFromCenter,
              };
            }
          }

          console.warn(`❌ All results for "${query}" failed validation`);
        }
      }
    } catch (error) {
      console.warn(`Address search failed for: "${query}"`, error);
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

// Enhanced activity coordinate search with generic validation
const getActivityCoordinatesEnhanced = async (
  activity,
  destination,
  district,
  index,
  destinationCoords
) => {
  const activityName = activity.title || activity.name || "Unknown Activity";
  const address = activity.address;

  console.log(`🔍 DEBUG - Processing activity:`, {
    name: activityName,
    address: address,
    fullActivity: activity,
  });

  try {
    // Strategy 1: Use address if available
    if (address && address.length > 5) {
      console.log(`✅ Using address for ${activityName}: ${address}`);
      const coords = await getCoordinatesFromAddress(
        address,
        activityName,
        destination,
        destinationCoords
      );
      if (coords) {
        return {
          ...coords,
          searchMethod: "address",
        };
      }
      console.log(`❌ Address search failed for: ${address}`);
    } else {
      console.log(
        `⚠️ No valid address found for ${activityName}. Address:`,
        address
      );
    }

    // Strategy 2: Fall back to name-based search with validation
    console.log(`📛 Falling back to name search for: ${activityName}`);
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
            // Sort by distance from city center
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

            // Find first valid result
            for (const result of sortedResults.slice(0, 3)) {
              if (
                validateCityCoordinates(
                  result.lat,
                  result.lng,
                  destinationCoords
                )
              ) {
                console.log(
                  `✅ Found ${activityName}: ${Math.round(
                    result.distanceFromCenter / 1000
                  )}km from center`
                );
                return {
                  lat: result.lat + (Math.random() - 0.5) * 0.0001,
                  lng: result.lng + (Math.random() - 0.5) * 0.0001,
                  searchMethod: "name",
                  distanceFromCenter: result.distanceFromCenter,
                };
              }
            }
          }
        }
      } catch (error) {
        console.warn(`Search failed for: "${query}"`, error);
        continue;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Strategy 3: District-based fallback
    console.warn(`Using district fallback for ${activityName} in ${district}`);
    const fallbackOffset = getGenericDistrictOffset(district, index);
    const fallbackDistance =
      Math.sqrt(fallbackOffset.lat ** 2 + fallbackOffset.lng ** 2) * 111000; // Rough conversion to meters
    return {
      lat: destinationCoords.lat + fallbackOffset.lat,
      lng: destinationCoords.lng + fallbackOffset.lng,
      searchMethod: "fallback",
      distanceFromCenter: fallbackDistance,
    };
  } catch (error) {
    console.error(`Error searching for ${activityName}:`, error);
    const fallbackOffset = getGenericDistrictOffset(district, index);
    const fallbackDistance =
      Math.sqrt(fallbackOffset.lat ** 2 + fallbackOffset.lng ** 2) * 111000;
    return {
      lat: destinationCoords.lat + fallbackOffset.lat,
      lng: destinationCoords.lng + fallbackOffset.lng,
      searchMethod: "error",
      distanceFromCenter: fallbackDistance,
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
  console.log(`🔍 DEBUG - extractActivities input:`, dayData);

  if (Array.isArray(dayData)) {
    return dayData;
  } else if (typeof dayData === "object") {
    if (dayData.activities) {
      console.log(`🔍 DEBUG - Found activities array:`, dayData.activities);
      return dayData.activities;
    } else {
      // Time-based format like {"09:00": {title: "...", type: "...", address: "..."}, "11:00": {...}}
      const timeBasedActivities = Object.entries(dayData)
        .filter(([key]) => key !== "date" && key !== "district") // Filter out non-time keys
        .map(([time, activity]) => {
          console.log(`🔍 DEBUG - Processing time ${time}:`, activity);

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

      console.log(
        `🔍 DEBUG - Extracted time-based activities:`,
        timeBasedActivities
      );
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

  console.log("Processing itinerary data with address support:", itineraryData);

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
      console.log(`🔍 Searching for district: ${district}`);
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
                30
              )
            ) {
              // Slightly larger radius for districts
              districtCoords[district] = {
                lat: result.lat,
                lng: result.lng,
              };
              console.log(
                `📍 Found district: ${district} (${Math.round(
                  result.distanceFromCenter / 1000
                )}km from center)`
              );
              break;
            }
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to find district coordinates for: ${district}`);
    }

    if (!districtCoords[district]) {
      const offset = getGenericDistrictOffset(district);
      districtCoords[district] = {
        lat: destinationCoords.lat + offset.lat,
        lng: destinationCoords.lng + offset.lng,
      };
      console.log(`📌 Using fallback coordinates for district: ${district}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  // Process each day
  for (const [dayKey, dayData] of Object.entries(itineraryData)) {
    if (!dayKey.toLowerCase().includes("day")) continue;

    const activities = extractActivities(dayData);
    const enrichedActivities = [];

    const dayDistrict = extractLocation(dayData) || destination;

    console.log(`Processing ${dayKey} in ${dayDistrict}:`, activities);

    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i];

      try {
        const coords = await getActivityCoordinatesEnhanced(
          activity,
          destination,
          dayDistrict,
          i,
          destinationCoords
        );

        // Check for duplicate coordinates within the same day and add small offset
        const isDuplicate = enrichedActivities.some(
          (existingActivity) =>
            Math.abs(existingActivity.lat - coords.lat) < 0.0001 &&
            Math.abs(existingActivity.lng - coords.lng) < 0.0001
        );

        if (isDuplicate) {
          console.log(
            `⚠️ Duplicate coordinates detected for ${activity.title}, adding offset`
          );
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
          distanceFromCenter: coords.distanceFromCenter || 0,
        });

        // Delay between searches
        if (i < activities.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      } catch (error) {
        console.warn(`Failed to get coordinates for ${activity.title}:`, error);
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

  console.log("Enriched itinerary with addresses:", enriched);
  return enriched;
};

// Main component
const MapVisualization = ({ tripId, destination }) => {
  const [itinerary, setItinerary] = useState(null);
  const [selectedDays, setSelectedDays] = useState([]);
  const [showRoutes, setShowRoutes] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [enrichmentStatus, setEnrichmentStatus] = useState("");
  const mapRef = React.useRef(null);
  const mapInstanceRef = React.useRef(null);

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
        console.error("Error fetching destination coordinates:", error);
      }
    };

    fetchDestinationCoords();
  }, [destination]);

  // Load real itinerary data from your itinerary service
  useEffect(() => {
    const loadItinerary = async () => {
      // Check global cache first
      if (
        globalEnrichedCache.has(cacheKey) &&
        globalProcessedTrips.has(cacheKey)
      ) {
        console.log("✅ Using cached itinerary data - no processing needed");
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
            throw new Error(
              `Failed to fetch itinerary: ${response.statusText}`
            );
          }
          setLoading(false);
          return;
        }

        const data = await response.json();
        console.log("Raw itinerary data:", data);

        // Only process coordinates if we haven't done it before
        if (!globalProcessedTrips.has(cacheKey)) {
          console.log("🔄 Processing coordinates with generic validation...");
          setEnrichmentStatus("Adding coordinates with validation...");

          // Get destination coordinates
          const destCoords = await getDestinationCoords(destination);
          setDestinationCoords(destCoords);

          // DEBUG: Check if the itinerary actually has addresses
          let hasAnyAddresses = false;
          let totalActivities = 0;
          let activitiesWithAddresses = 0;

          console.log(
            "🔍 DEBUG - Checking for addresses in raw itinerary:",
            data
          );

          const checkData = data.itinerary || data;
          Object.entries(checkData).forEach(([dayKey, dayData]) => {
            if (dayKey.toLowerCase().includes("day")) {
              const activities = extractActivities(dayData);
              activities.forEach((activity) => {
                totalActivities++;
                if (activity.address && activity.address.length > 5) {
                  activitiesWithAddresses++;
                  hasAnyAddresses = true;
                }
              });
            }
          });

          console.log(
            `🔍 DEBUG - Address analysis: ${activitiesWithAddresses}/${totalActivities} activities have addresses`
          );

          if (!hasAnyAddresses) {
            console.log(
              "⚠️ WARNING: No addresses found in itinerary! AI may not have generated addresses."
            );
            setEnrichmentStatus(
              "⚠️ Itinerary lacks addresses - using name-based search with validation..."
            );
          } else {
            console.log(
              `✅ Found addresses in ${activitiesWithAddresses}/${totalActivities} activities`
            );
            setEnrichmentStatus(
              `Processing ${activitiesWithAddresses} address-based locations with validation...`
            );
          }

          // Transform the itinerary data to include coordinates with validation
          const transformedItinerary = await enrichItineraryWithCoordinates(
            data,
            destination
          );

          if (Object.keys(transformedItinerary).length === 0) {
            setError("No valid itinerary data found.");
          } else {
            const selectedDaysList = Object.keys(transformedItinerary);
            console.log(`🔍 DEBUG - Final enriched days:`, selectedDaysList);
            console.log(
              `🔍 DEBUG - Transformed itinerary:`,
              transformedItinerary
            );

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
            console.log("✅ Coordinates processed with validation and cached!");
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
        console.error("Error loading itinerary:", err);
        setError(`Failed to load itinerary: ${err.message}`);
        setEnrichmentStatus("");
      } finally {
        setLoading(false);
      }
    };

    if (tripId) {
      loadItinerary();
    }
  }, [tripId, destination, cacheKey]);

  // Load map libraries
  useEffect(() => {
    if (window.L) {
      setMapLoaded(true);
      return;
    }

    const loadMapLibraries = async () => {
      try {
        const cssLink = document.createElement("link");
        cssLink.rel = "stylesheet";
        cssLink.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(cssLink);

        const script = document.createElement("script");
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.async = true;
        script.onload = () => setMapLoaded(true);
        document.body.appendChild(script);
      } catch (error) {
        console.error("Failed to load map libraries:", error);
      }
    };

    loadMapLibraries();
  }, []);

  // Initialize map with real destination coordinates
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !itinerary) return;

    const initMap = () => {
      // Only create map if it doesn't exist
      if (!mapInstanceRef.current) {
        console.log("Creating new map instance");
        const map = window.L.map(mapRef.current).setView(
          [destinationCoords.lat, destinationCoords.lng],
          13
        );

        window.L.tileLayer(
          "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            attribution: "&copy; OpenStreetMap contributors",
          }
        ).addTo(map);

        mapInstanceRef.current = map;
      }

      // Always update markers when itinerary changes
      updateMapMarkers();
    };

    initMap();
  }, [mapLoaded, itinerary, destinationCoords]);

  // Update markers when display options change
  useEffect(() => {
    if (mapInstanceRef.current && itinerary) {
      updateMapMarkers();
    }
  }, [selectedDays, showRoutes]);

  const updateMapMarkers = () => {
    if (!mapInstanceRef.current || !window.L || !itinerary) return;

    // Clear existing markers
    mapInstanceRef.current.eachLayer((layer) => {
      if (
        layer instanceof window.L.Marker ||
        layer instanceof window.L.Polyline
      ) {
        mapInstanceRef.current.removeLayer(layer);
      }
    });

    const dayColors = ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6"];
    const allMarkers = [];

    console.log(
      `🔍 DEBUG - updateMapMarkers called with selectedDays:`,
      selectedDays
    );
    console.log(`🔍 DEBUG - Available itinerary days:`, Object.keys(itinerary));

    Object.entries(itinerary).forEach(([dayName, dayData], dayIndex) => {
      console.log(
        `🔍 DEBUG - Processing ${dayName}, selected: ${selectedDays.includes(
          dayName
        )}`
      );

      if (!selectedDays.includes(dayName)) return;

      const dayColor = dayColors[dayIndex % dayColors.length];
      const activities = dayData.activities || [];

      console.log(
        `🔍 DEBUG - ${dayName} has ${activities.length} activities, using color ${dayColor}`
      );

      // Add markers for each activity
      activities.forEach((activity, actIndex) => {
        if (!activity.lat || !activity.lng) return;

        // Different icon styles based on search method
        const getIconStyle = (searchMethod) => {
          const baseStyle = `
            background: ${dayColor};
            color: white;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 12px;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          `;

          if (searchMethod === "address") {
            return baseStyle + `border: 3px solid #10B981;`; // Green border for address-based
          } else if (searchMethod === "name") {
            return baseStyle + `border: 3px solid #F59E0B;`; // Orange border for name-based
          } else {
            return baseStyle + `border: 3px solid #EF4444;`; // Red border for fallback
          }
        };

        const marker = window.L.marker([activity.lat, activity.lng], {
          icon: window.L.divIcon({
            html: `<div style="${getIconStyle(activity.searchMethod)}">${
              actIndex + 1
            }</div>`,
            className: "custom-div-icon",
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          }),
        }).addTo(mapInstanceRef.current);

        // Enhanced popup with address and search method info
        const distanceFromCenter =
          activity.distanceFromCenter ||
          calculateDistanceFromCenter(
            activity.lat,
            activity.lng,
            destinationCoords.lat,
            destinationCoords.lng
          );

        const searchMethodIcon = {
          address: "📍",
          name: "🔍",
          fallback: "📌",
        };

        const searchMethodText = {
          address: "Found by address",
          name: "Found by name search",
          fallback: "Estimated location",
        };

        marker.bindPopup(`
          <div style="min-width: 220px;">
            <div style="font-weight: bold; color: ${dayColor}; margin-bottom: 4px;">
              ${dayName} - Activity ${actIndex + 1}
            </div>
            <div style="font-size: 16px; margin-bottom: 4px;">
              <strong>${activity.name}</strong>
            </div>
            <div style="color: #666; font-size: 14px; margin-bottom: 4px;">
              🕐 ${activity.time} • ${activity.type}
            </div>
            ${
              activity.address
                ? `
              <div style="color: #666; font-size: 12px; margin-bottom: 4px;">
                📬 ${activity.address}
              </div>
            `
                : ""
            }
            <div style="color: #888; font-size: 12px; margin-bottom: 4px;">
              📍 ${activity.location}
            </div>
            <div style="color: #666; font-size: 12px; margin-bottom: 4px;">
              🚶 ${
                Math.round((distanceFromCenter / 1000) * 10) / 10
              }km from center
            </div>
            <div style="color: #555; font-size: 11px;">
              ${searchMethodIcon[activity.searchMethod]} ${
          searchMethodText[activity.searchMethod]
        }
            </div>
          </div>
        `);

        allMarkers.push(marker);
      });

      // Add walking route lines between activities
      if (showRoutes && activities.length > 1) {
        for (let i = 0; i < activities.length - 1; i++) {
          const current = activities[i];
          const next = activities[i + 1];

          if (current.lat && current.lng && next.lat && next.lng) {
            const walkingDistance = calculateDistanceFromCenter(
              current.lat,
              current.lng,
              next.lat,
              next.lng
            );

            // Only show route if it's a reasonable walking distance
            if (walkingDistance < 3000) {
              // 3km max between activities
              window.L.polyline(
                [
                  [current.lat, current.lng],
                  [next.lat, next.lng],
                ],
                {
                  color: dayColor,
                  weight: 3,
                  opacity: 0.7,
                  dashArray: "5, 5",
                }
              ).addTo(mapInstanceRef.current);
            } else {
              // Show dashed line for longer distances
              window.L.polyline(
                [
                  [current.lat, current.lng],
                  [next.lat, next.lng],
                ],
                {
                  color: "#FF6B6B",
                  weight: 2,
                  opacity: 0.5,
                  dashArray: "10, 10",
                }
              ).addTo(mapInstanceRef.current);
            }
          }
        }
      }
    });

    // Fit map to markers
    if (allMarkers.length > 0) {
      const group = new window.L.featureGroup(allMarkers);
      mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1));
    }
  };

  const toggleDay = (day) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const openInMaps = () => {
    if (destinationCoords) {
      const url = `https://www.openstreetmap.org/#map=13/${destinationCoords.lat}/${destinationCoords.lng}`;
      window.open(url, "_blank");
    }
  };

  // Force refresh
  const forceRefresh = () => {
    globalEnrichedCache.delete(cacheKey);
    globalProcessedTrips.delete(cacheKey);
    setItinerary(null);
    setLoading(true);
    console.log("🔄 Forced refresh - cache cleared");
  };

  const forceRefreshCoordinates = () => {
    if (window.confirm("This will re-fetch all coordinates. Continue?")) {
      forceRefresh();
    }
  };

  // Enhanced stats calculation with distance validation
  const calculateSearchStats = () => {
    if (!itinerary)
      return {
        addressBased: 0,
        nameBased: 0,
        fallback: 0,
        total: 0,
        avgDistance: 0,
        maxDistance: 0,
        validationPassed: 0,
      };

    let addressBased = 0;
    let nameBased = 0;
    let fallback = 0;
    let total = 0;
    let totalDistance = 0;
    let maxDistance = 0;
    let validationPassed = 0;

    Object.values(itinerary).forEach((day) => {
      if (day.activities) {
        day.activities.forEach((activity) => {
          total++;
          const distance = activity.distanceFromCenter || 0;
          totalDistance += distance;
          maxDistance = Math.max(maxDistance, distance);

          if (activity.searchMethod === "address") {
            addressBased++;
            if (distance < 25000) validationPassed++; // Within 25km
          } else if (activity.searchMethod === "name") {
            nameBased++;
            if (distance < 25000) validationPassed++;
          } else {
            fallback++;
          }
        });
      }
    });

    return {
      addressBased,
      nameBased,
      fallback,
      total,
      avgDistance:
        total > 0 ? Math.round((totalDistance / total / 1000) * 10) / 10 : 0,
      maxDistance: Math.round((maxDistance / 1000) * 10) / 10,
      validationPassed,
    };
  };

  // Calculate walking stats with improved distance tracking
  const calculateWalkingStats = () => {
    if (!itinerary) return { totalWalking: 0, avgDistance: 0, maxDistance: 0 };

    let totalWalking = 0;
    let routeCount = 0;
    let maxDistance = 0;

    Object.values(itinerary).forEach((day) => {
      if (day.activities && day.activities.length > 1) {
        for (let i = 0; i < day.activities.length - 1; i++) {
          const current = day.activities[i];
          const next = day.activities[i + 1];

          if (current.lat && current.lng && next.lat && next.lng) {
            const distance = calculateDistanceFromCenter(
              current.lat,
              current.lng,
              next.lat,
              next.lng
            );
            totalWalking += distance;
            routeCount++;
            maxDistance = Math.max(maxDistance, distance);
          }
        }
      }
    });

    return {
      totalWalking: Math.round((totalWalking / 1000) * 10) / 10, // km
      avgDistance:
        routeCount > 0
          ? Math.round((totalWalking / routeCount / 1000) * 10) / 10
          : 0, // km
      maxDistance: Math.round((maxDistance / 1000) * 10) / 10, // km
    };
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin mr-2" />
          <div>
            <span>Loading trip map...</span>
            {enrichmentStatus && (
              <div className="text-sm text-gray-600 mt-1">
                {enrichmentStatus}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="flex items-center text-red-600">
          <AlertCircle className="w-6 h-6 mr-2" />
          <span>{error}</span>
        </div>
        {error.includes("Generate an itinerary") && (
          <div className="mt-4">
            <button
              onClick={() => (window.location.hash = "itinerary")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go to Itinerary Tab
            </button>
          </div>
        )}
      </div>
    );
  }

  if (!itinerary || Object.keys(itinerary).length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No Itinerary Available
        </h3>
        <p className="text-gray-600 mb-4">
          Generate an itinerary first to see your trip on the map.
        </p>
        <button
          onClick={() => (window.location.hash = "itinerary")}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Generate Itinerary
        </button>
      </div>
    );
  }

  const walkingStats = calculateWalkingStats();
  const searchStats = calculateSearchStats();

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <MapPin className="w-6 h-6 mr-2 text-blue-600" />
            Smart Address-Based Map ({destinationCoords.cityName})
            {/* Cache status indicator */}
            {globalProcessedTrips.has(cacheKey) && (
              <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                Cached
              </span>
            )}
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowRoutes(!showRoutes)}
              className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                showRoutes
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 border border-gray-300"
              }`}
            >
              {showRoutes ? (
                <Eye size={16} className="mr-1" />
              ) : (
                <EyeOff size={16} className="mr-1" />
              )}
              Routes
            </button>
            <button
              onClick={forceRefreshCoordinates}
              className="flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-orange-100 text-orange-700 border border-orange-300 hover:bg-orange-200"
              title="Re-fetch all coordinates (for testing)"
            >
              <RefreshCw size={16} className="mr-1" />
              Re-fetch
            </button>
            <button
              onClick={openInMaps}
              className="flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
            >
              <ExternalLink size={16} className="mr-1" />
              Open in Maps
            </button>
          </div>
        </div>
      </div>

      {/* Day Selection */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-wrap gap-2">
          {Object.entries(itinerary).map(([dayName, dayData], index) => {
            const isSelected = selectedDays.includes(dayName);
            const dayColors = [
              "#3B82F6",
              "#EF4444",
              "#10B981",
              "#F59E0B",
              "#8B5CF6",
            ];
            const dayColor = dayColors[index % dayColors.length];

            return (
              <button
                key={dayName}
                onClick={() => toggleDay(dayName)}
                className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isSelected
                    ? "text-white shadow-md"
                    : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
                }`}
                style={isSelected ? { backgroundColor: dayColor } : {}}
              >
                <Calendar size={16} className="mr-1" />
                {dayName}
                <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-white bg-opacity-20">
                  {dayData.activities?.length || 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Map */}
      <div className="relative">
        <div
          ref={mapRef}
          className="w-full bg-blue-50"
          style={{ height: "400px" }}
        >
          {!mapLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-blue-50">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-gray-600">Loading map...</p>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Legend */}
        <div className="absolute top-4 right-4 bg-white p-3 rounded-lg shadow-lg">
          <h4 className="font-medium text-sm mb-2">Legend</h4>

          {/* Day colors */}
          <div className="space-y-1 mb-3">
            {Object.keys(itinerary).map((dayName, index) => {
              const dayColors = [
                "#3B82F6",
                "#EF4444",
                "#10B981",
                "#F59E0B",
                "#8B5CF6",
              ];
              const dayColor = dayColors[index % dayColors.length];
              return (
                <div key={dayName} className="flex items-center text-xs">
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: dayColor }}
                  ></div>
                  <span>{dayName}</span>
                </div>
              );
            })}
          </div>

          {/* Search method indicators */}
          <div className="pt-3 border-t border-gray-200">
            <h5 className="font-medium text-xs mb-1">Accuracy</h5>
            <div className="space-y-1 text-xs">
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-green-500 mr-2"></div>
                <span>Address-based</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-orange-500 mr-2"></div>
                <span>Name search</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-red-500 mr-2"></div>
                <span>Estimated</span>
              </div>
            </div>
          </div>

          {/* Routes legend */}
          <div className="mt-3 pt-3 border-t border-gray-200">
            <h5 className="font-medium text-xs mb-1">Routes</h5>
            <div className="space-y-1 text-xs">
              <div className="flex items-center">
                <div
                  className="w-4 h-0.5 bg-blue-500 mr-2"
                  style={{ borderTop: "3px dashed" }}
                ></div>
                <span>Walking (&lt;3km)</span>
              </div>
              <div className="flex items-center">
                <div
                  className="w-4 h-0.5 bg-red-400 mr-2"
                  style={{ borderTop: "2px dashed" }}
                ></div>
                <span>Long distance</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Stats with Validation Success Rate */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {Object.values(itinerary).reduce(
                (total, day) => total + (day.activities?.length || 0),
                0
              )}
            </div>
            <div className="text-sm text-gray-600">Activities</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {searchStats.addressBased}
            </div>
            <div className="text-sm text-gray-600">Address-based</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">
              {walkingStats.totalWalking}km
            </div>
            <div className="text-sm text-gray-600">Total Walking</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">
              {searchStats.total > 0
                ? Math.round(
                    (searchStats.validationPassed / searchStats.total) * 100
                  )
                : 0}
              %
            </div>
            <div className="text-sm text-gray-600">Within City</div>
          </div>
        </div>

        {/* Detailed accuracy breakdown */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <div className="text-green-600 font-semibold">
                {searchStats.addressBased}
              </div>
              <div className="text-gray-500">📍 Address-based</div>
            </div>
            <div>
              <div className="text-orange-600 font-semibold">
                {searchStats.nameBased}
              </div>
              <div className="text-gray-500">🔍 Name search</div>
            </div>
            <div>
              <div className="text-red-600 font-semibold">
                {searchStats.fallback}
              </div>
              <div className="text-gray-500">📌 Estimated</div>
            </div>
          </div>
        </div>

        {/* Status and info */}
        <div className="mt-4 pt-4 border-t border-gray-100 text-center space-y-2">
          {globalProcessedTrips.has(cacheKey) && (
            <p className="text-xs text-green-600">
              ✅ Map data cached - no regeneration needed when switching tabs
            </p>
          )}

          {searchStats.addressBased > 0 && (
            <p className="text-xs text-green-600">
              🎯 Using AI-generated addresses for improved accuracy
            </p>
          )}

          {searchStats.validationPassed < searchStats.total && (
            <p className="text-xs text-orange-600">
              ⚠️ {searchStats.total - searchStats.validationPassed} locations
              may be outside city bounds
            </p>
          )}

          {walkingStats.maxDistance > 3 && (
            <p className="text-xs text-orange-600">
              ⚠️ Some routes exceed 3km - consider transport options
            </p>
          )}

          <p className="text-xs text-gray-500">
            🗺️ Powered by OpenStreetMap • Generic validation for any city (max
            25km from center)
          </p>
        </div>
      </div>
    </div>
  );
};

export default MapVisualization;
