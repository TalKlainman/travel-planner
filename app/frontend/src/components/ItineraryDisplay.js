// import React, { useState, useEffect } from "react";
// import {
//   Calendar,
//   Clock,
//   Coffee,
//   Utensils,
//   BookOpen,
//   MapPin,
//   Bus,
//   Hotel,
//   Camera,
//   Landmark,
//   RefreshCw,
// } from "lucide-react";

// // Helper function to get icon based on activity type
// const getActivityIcon = (activityType) => {
//   const iconProps = { size: 18, strokeWidth: 2 };

//   switch (activityType?.toLowerCase()) {
//     case "breakfast":
//     case "brunch":
//       return <Coffee {...iconProps} />;
//     case "lunch":
//     case "dinner":
//       return <Utensils {...iconProps} />;
//     case "museum":
//       return <BookOpen {...iconProps} />;
//     case "sightseeing":
//     case "tour":
//       return <Camera {...iconProps} />;
//     case "transport":
//     case "transfer":
//       return <Bus {...iconProps} />;
//     case "accommodation":
//     case "check-in":
//     case "check-out":
//       return <Hotel {...iconProps} />;
//     case "landmark":
//     case "monument":
//       return <Landmark {...iconProps} />;
//     default:
//       return <MapPin {...iconProps} />;
//   }
// };

// // Format date for display
// const formatDate = (dateString) => {
//   if (!dateString) return "";

//   const options = { weekday: "long", month: "long", day: "numeric" };
//   return new Date(dateString).toLocaleDateString(undefined, options);
// };

// const ItineraryDisplay = ({ tripId }) => {
//   const [itinerary, setItinerary] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [status, setStatus] = useState(null);
//   const [pollInterval, setPollInterval] = useState(null);

//   // Function for initial itinerary generation (for new trips)
//   const generateItinerary = async () => {
//     try {
//       setLoading(true);
//       setError(null);

//       // Hard-code trip details for testing
//       const tripData = {
//         destination: "Sydney, Australia",
//         start_date: "2025-05-07",
//         end_date: "2025-05-21",
//         preferences: [],
//         budget: 3000,
//       };

//       // Request itinerary generation
//       const genResponse = await fetch(`/api/itinerary/generate/${tripId}`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify(tripData),
//       });

//       if (!genResponse.ok && genResponse.status !== 202) {
//         throw new Error("Failed to start itinerary generation");
//       }

//       // Start polling for status
//       startPolling();
//     } catch (err) {
//       console.error("Error generating itinerary:", err);
//       setError(err.message);
//       setLoading(false);
//     }
//   };

//   // Function for regenerating existing itinerary
//   const regenerateItinerary = async () => {
//     try {
//       setLoading(true);
//       setError(null);
//       setItinerary(null); // Clear current itinerary
//       setStatus({
//         status: "processing",
//         message: "Regenerating your itinerary...",
//       });

//       // Call the trips endpoint to regenerate
//       const response = await fetch(`/api/trips/${tripId}/generate-itinerary`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//       });

//       if (response.ok) {
//         // Start polling for the new itinerary
//         startPolling();
//       } else {
//         throw new Error("Failed to start regeneration");
//       }
//     } catch (err) {
//       console.error("Error regenerating itinerary:", err);
//       setError(err.message);
//       setLoading(false);
//     }
//   };

//   // Function to poll for status
//   const checkStatus = async () => {
//     try {
//       const statusResponse = await fetch(`/api/itinerary/status/${tripId}`);

//       if (statusResponse.ok) {
//         const statusData = await statusResponse.json();
//         setStatus(statusData);

//         // If completed, fetch the itinerary
//         if (statusData.status === "completed") {
//           stopPolling();
//           fetchItinerary();
//         } else if (statusData.status === "failed") {
//           stopPolling();
//           setError(`Generation failed: ${statusData.message}`);
//           setLoading(false);
//         }
//       } else {
//         // If status check fails, try fetching the itinerary directly
//         // This handles cases where status endpoint might not be available
//         fetchItinerary();
//       }
//     } catch (err) {
//       console.error("Error checking status:", err);
//       // Don't stop polling on transient errors
//     }
//   };

//   // Start polling
//   const startPolling = () => {
//     if (!pollInterval) {
//       const interval = setInterval(checkStatus, 3000); // Check every 3 seconds
//       setPollInterval(interval);
//     }
//   };

//   // Stop polling
//   const stopPolling = () => {
//     if (pollInterval) {
//       clearInterval(pollInterval);
//       setPollInterval(null);
//     }
//   };

//   // Fetch the itinerary
//   const fetchItinerary = async () => {
//     try {
//       setLoading(true);

//       // Try the new endpoint format first
//       const response = await fetch(`/api/itinerary/itinerary/${tripId}`);

//       if (response.status === 202) {
//         // Still processing
//         setStatus({
//           status: "processing",
//           message: "Itinerary generation in progress",
//         });
//         startPolling();
//         return;
//       }

//       if (response.status === 404) {
//         // Itinerary doesn't exist - show the generation option
//         setItinerary(null);
//         setLoading(false);
//         return;
//       }

//       if (!response.ok) {
//         throw new Error(`Failed to fetch itinerary: ${response.statusText}`);
//       }

//       const data = await response.json();

//       // Handle different response formats
//       if (data.itinerary) {
//         setItinerary(data.itinerary);
//       } else {
//         // If the response is the itinerary directly
//         setItinerary(data);
//       }

//       setLoading(false);
//     } catch (err) {
//       console.error("Error fetching itinerary:", err);
//       // If there's an error, assume we need to generate the itinerary
//       setError(null);
//       setItinerary(null);
//       setLoading(false);
//     }
//   };

//   // Initial load
//   useEffect(() => {
//     fetchItinerary();

//     // Clean up on unmount
//     return () => stopPolling();
//   }, [tripId]);

//   // Loading state
//   if (loading && !status) {
//     return (
//       <div className="border border-gray-200 rounded">
//         <div className="p-4 border-b border-gray-200">
//           <h2 className="text-lg font-semibold">Trip Itinerary</h2>
//         </div>
//         <div className="p-4">
//           <div className="flex flex-col gap-4">
//             {[1, 2, 3].map((day) => (
//               <div key={day}>
//                 <div className="h-6 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
//                 <div className="h-24 bg-gray-200 rounded w-full animate-pulse"></div>
//               </div>
//             ))}
//           </div>
//         </div>
//       </div>
//     );
//   }

//   // Itinerary generation in progress
//   if (status && status.status === "processing") {
//     return (
//       <div className="p-4 border border-yellow-200 bg-yellow-50 rounded flex items-center justify-between">
//         <div className="flex items-center">
//           <div className="mr-3">
//             <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-700"></div>
//           </div>
//           <span className="text-yellow-800">
//             {status.message ||
//               "Your personalized itinerary is being generated with AI. Please wait..."}
//             {status.eta ? ` Estimated time: ${status.eta} seconds` : ""}
//           </span>
//         </div>
//       </div>
//     );
//   }

//   // Error state
//   if (error) {
//     return (
//       <div className="p-4 border border-red-200 bg-red-50 rounded flex items-center justify-between">
//         <span className="text-red-800">{error}</span>
//         <div className="flex gap-2">
//           <button
//             className="px-3 py-1 text-sm rounded bg-blue-500 text-white flex items-center gap-1"
//             onClick={generateItinerary}
//           >
//             <span>Generate Itinerary</span>
//           </button>
//         </div>
//       </div>
//     );
//   }

//   // No itinerary state
//   if (!itinerary || Object.keys(itinerary).length === 0) {
//     return (
//       <div className="border border-gray-200 rounded">
//         <div className="p-4 border-b border-gray-200">
//           <h2 className="text-lg font-semibold">Trip Itinerary</h2>
//         </div>
//         <div className="p-4">
//           <div className="p-3 bg-blue-50 border border-blue-100 text-blue-700 rounded mb-4">
//             No itinerary has been generated for this trip yet. Click the button
//             below to create one using AI.
//           </div>
//           <button
//             className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded hover:bg-blue-600"
//             onClick={generateItinerary}
//           >
//             Generate AI Itinerary
//           </button>
//         </div>
//       </div>
//     );
//   }

//   // Successfully loaded itinerary
//   return (
//     <div className="border border-gray-200 rounded">
//       <div className="p-4 border-b border-gray-200">
//         <h2 className="text-lg font-semibold">Your Trip Itinerary</h2>
//       </div>

//       <div className="p-4">
//         {Object.entries(itinerary).map(([day, activities], index) => (
//           <div key={day} className="mb-6">
//             <div className="flex items-center mb-2">
//               <Calendar size={18} className="mr-2 opacity-70" />
//               <h3 className="text-lg font-medium">
//                 {day.includes("Day") ? day : `Day ${index + 1}`}:{" "}
//                 {activities.date ? formatDate(activities.date) : ""}
//               </h3>
//             </div>

//             <div className="border border-gray-200 rounded mb-4 bg-white">
//               <ul className="divide-y divide-gray-200">
//                 {/* Handle different itinerary formats */}
//                 {Array.isArray(activities) ? (
//                   // Format 1: Array of activities
//                   activities.map((activity, actIdx) => (
//                     <li key={actIdx} className="py-3 px-4">
//                       <div className="flex items-start">
//                         <div className="mr-3 pt-0.5">
//                           {getActivityIcon(activity.type)}
//                         </div>
//                         <div className="flex-1">
//                           <p className="font-medium">
//                             {activity.title ||
//                               activity.name ||
//                               activity.description}
//                           </p>
//                           <div className="flex items-center mt-1">
//                             {activity.time && (
//                               <div className="flex items-center mr-3">
//                                 <Clock size={14} className="mr-1 opacity-70" />
//                                 <span className="text-sm text-gray-600">
//                                   {activity.time}
//                                 </span>
//                               </div>
//                             )}
//                             {activity.location && (
//                               <span className="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700">
//                                 {activity.location}
//                               </span>
//                             )}
//                           </div>
//                         </div>
//                       </div>
//                     </li>
//                   ))
//                 ) : typeof activities === "object" ? (
//                   // Format 2: Object with time keys
//                   Object.entries(activities).map(([time, activity], actIdx) => {
//                     // Skip the date field if present
//                     if (time === "date") return null;

//                     return (
//                       <li key={time} className="py-3 px-4">
//                         <div className="flex items-start">
//                           <div className="mr-3 pt-0.5">
//                             {getActivityIcon(
//                               typeof activity === "string" ? "" : activity.type
//                             )}
//                           </div>
//                           <div className="flex-1">
//                             <p className="font-medium">
//                               {typeof activity === "string"
//                                 ? activity
//                                 : activity.title ||
//                                   activity.name ||
//                                   activity.description}
//                             </p>
//                             <div className="flex items-center mt-1">
//                               <div className="flex items-center mr-3">
//                                 <Clock size={14} className="mr-1 opacity-70" />
//                                 <span className="text-sm text-gray-600">
//                                   {time}
//                                 </span>
//                               </div>
//                               {typeof activity === "object" &&
//                                 activity.location && (
//                                   <span className="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700">
//                                     {activity.location}
//                                   </span>
//                                 )}
//                             </div>
//                           </div>
//                         </div>
//                       </li>
//                     );
//                   })
//                 ) : (
//                   // Format 3: Simple string
//                   <li className="py-3 px-4">
//                     <div className="flex items-start">
//                       <div className="mr-3 pt-0.5">
//                         <MapPin size={18} />
//                       </div>
//                       <div>
//                         <p className="font-medium">{activities}</p>
//                       </div>
//                     </div>
//                   </li>
//                 )}
//               </ul>
//             </div>
//           </div>
//         ))}

//         <div className="mt-6 text-center text-sm text-gray-500">
//           <p>
//             This itinerary was generated using AI based on your trip
//             preferences.
//           </p>
//           <button
//             className="mt-2 px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded hover:bg-blue-50"
//             onClick={regenerateItinerary}
//           >
//             Regenerate Itinerary
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ItineraryDisplay;

import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  Coffee,
  Utensils,
  BookOpen,
  MapPin,
  Bus,
  Hotel,
  Camera,
  Landmark,
  RefreshCw,
  Loader2,
  Sparkles,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

// Helper function to get icon based on activity type
const getActivityIcon = (activityType) => {
  const iconProps = { size: 20, className: "text-blue-600" };

  switch (activityType?.toLowerCase()) {
    case "breakfast":
    case "brunch":
      return <Coffee {...iconProps} className="text-amber-600" />;
    case "lunch":
    case "dinner":
      return <Utensils {...iconProps} className="text-green-600" />;
    case "museum":
      return <BookOpen {...iconProps} className="text-purple-600" />;
    case "sightseeing":
    case "tour":
      return <Camera {...iconProps} className="text-pink-600" />;
    case "transport":
    case "transfer":
      return <Bus {...iconProps} className="text-indigo-600" />;
    case "accommodation":
    case "check-in":
    case "check-out":
      return <Hotel {...iconProps} className="text-red-600" />;
    case "landmark":
    case "monument":
      return <Landmark {...iconProps} className="text-yellow-600" />;
    default:
      return <MapPin {...iconProps} />;
  }
};

// Format date for display
const formatDate = (dateString) => {
  if (!dateString) return "";
  const options = { weekday: "long", month: "long", day: "numeric" };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

const ItineraryDisplay = ({ tripId }) => {
  const [itinerary, setItinerary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const [pollInterval, setPollInterval] = useState(null);

  // Function for initial itinerary generation (for new trips)
  const generateItinerary = async () => {
    try {
      setLoading(true);
      setError(null);

      // Hard-code trip details for testing
      const tripData = {
        destination: "Sydney, Australia",
        start_date: "2025-05-07",
        end_date: "2025-05-21",
        preferences: [],
        budget: 3000,
      };

      // Request itinerary generation
      const genResponse = await fetch(`/api/itinerary/generate/${tripId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(tripData),
      });

      if (!genResponse.ok && genResponse.status !== 202) {
        throw new Error("Failed to start itinerary generation");
      }

      // Start polling for status
      startPolling();
    } catch (err) {
      console.error("Error generating itinerary:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  // Function for regenerating existing itinerary
  const regenerateItinerary = async () => {
    try {
      setLoading(true);
      setError(null);
      setItinerary(null);
      setStatus({
        status: "processing",
        message: "Regenerating your itinerary...",
      });

      const response = await fetch(`/api/trips/${tripId}/generate-itinerary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        startPolling();
      } else {
        throw new Error("Failed to start regeneration");
      }
    } catch (err) {
      console.error("Error regenerating itinerary:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  // Function to poll for status
  const checkStatus = async () => {
    try {
      const statusResponse = await fetch(`/api/itinerary/status/${tripId}`);

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setStatus(statusData);

        if (statusData.status === "completed") {
          stopPolling();
          fetchItinerary();
        } else if (statusData.status === "failed") {
          stopPolling();
          setError(`Generation failed: ${statusData.message}`);
          setLoading(false);
        }
      } else {
        fetchItinerary();
      }
    } catch (err) {
      console.error("Error checking status:", err);
    }
  };

  // Start polling
  const startPolling = () => {
    if (!pollInterval) {
      const interval = setInterval(checkStatus, 3000);
      setPollInterval(interval);
    }
  };

  // Stop polling
  const stopPolling = () => {
    if (pollInterval) {
      clearInterval(pollInterval);
      setPollInterval(null);
    }
  };

  // Fetch the itinerary
  const fetchItinerary = async () => {
    try {
      setLoading(true);

      const response = await fetch(`/api/itinerary/itinerary/${tripId}`);

      if (response.status === 202) {
        setStatus({
          status: "processing",
          message: "Itinerary generation in progress",
        });
        startPolling();
        return;
      }

      if (response.status === 404) {
        setItinerary(null);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch itinerary: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.itinerary) {
        setItinerary(data.itinerary);
      } else {
        setItinerary(data);
      }

      setLoading(false);
    } catch (err) {
      console.error("Error fetching itinerary:", err);
      setError(null);
      setItinerary(null);
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchItinerary();
    return () => stopPolling();
  }, [tripId]);

  // Loading state with skeleton
  if (loading && !status) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header skeleton */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
            <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
          </div>

          {/* Content skeleton */}
          <div className="p-6 space-y-8">
            {[1, 2, 3].map((day) => (
              <div key={day} className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                  <div className="h-6 bg-gray-200 rounded w-64 animate-pulse"></div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  {[1, 2, 3].map((activity) => (
                    <div key={activity} className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse mt-1"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-5 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Processing state
  if (status && status.status === "processing") {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Sparkles className="w-12 h-12 text-blue-600 animate-pulse" />
              <Loader2 className="w-6 h-6 text-blue-400 animate-spin absolute -top-1 -right-1" />
            </div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Creating Your Perfect Itinerary
          </h3>
          <p className="text-gray-600 mb-4">
            {status.message ||
              "Our AI is crafting a personalized travel experience just for you..."}
          </p>
          {status.eta && (
            <p className="text-sm text-blue-600">
              Estimated time remaining: {status.eta} seconds
            </p>
          )}
          <div className="mt-6 max-w-md mx-auto bg-white rounded-full h-2 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 text-lg">⚠</span>
              </div>
              <div>
                <h3 className="font-medium text-red-900">
                  Something went wrong
                </h3>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
            <button
              onClick={generateItinerary}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No itinerary state
  if (!itinerary || Object.keys(itinerary).length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Your Trip Itinerary
            </h2>
          </div>

          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Ready to Plan Your Adventure?
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Let our AI create a personalized itinerary tailored to your
              preferences and travel style.
            </p>
            <button
              onClick={generateItinerary}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-lg shadow-sm"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Generate AI Itinerary
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Successfully loaded itinerary
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Sparkles className="w-6 h-6 mr-2 text-blue-600" />
              Your Trip Itinerary
            </h2>
            <button
              onClick={regenerateItinerary}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate
            </button>
          </div>
        </div>

        {/* Itinerary Content */}
        <div className="p-6">
          <div className="space-y-8">
            {Object.entries(itinerary).map(([day, activities], index) => (
              <div key={day} className="relative">
                {/* Day header */}
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                    <span className="text-blue-600 font-semibold text-sm">
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {day.includes("Day") ? day : `Day ${index + 1}`}
                    </h3>
                    {activities.date && (
                      <p className="text-gray-600 text-sm">
                        {formatDate(activities.date)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Activities */}
                <div className="ml-14">
                  <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                    {/* Handle different itinerary formats */}
                    {Array.isArray(activities) ? (
                      // Format 1: Array of activities
                      activities.map((activity, actIdx) => (
                        <div key={actIdx} className="group">
                          <div className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                            <div className="flex items-start space-x-4">
                              <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                {getActivityIcon(activity.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-gray-900 mb-1">
                                  {activity.title ||
                                    activity.name ||
                                    activity.description}
                                </h4>
                                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                                  {activity.time && (
                                    <div className="flex items-center">
                                      <Clock className="w-4 h-4 mr-1" />
                                      {activity.time}
                                    </div>
                                  )}
                                  {activity.location && (
                                    <div className="flex items-center">
                                      <MapPin className="w-4 h-4 mr-1" />
                                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                        {activity.location}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <ChevronRight className="w-5 h-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        </div>
                      ))
                    ) : typeof activities === "object" ? (
                      // Format 2: Object with time keys
                      Object.entries(activities).map(
                        ([time, activity], actIdx) => {
                          if (time === "date") return null;

                          return (
                            <div key={time} className="group">
                              <div className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                                <div className="flex items-start space-x-4">
                                  <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                    {getActivityIcon(
                                      typeof activity === "string"
                                        ? ""
                                        : activity.type
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-gray-900 mb-1">
                                      {typeof activity === "string"
                                        ? activity
                                        : activity.title ||
                                          activity.name ||
                                          activity.description}
                                    </h4>
                                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                                      <div className="flex items-center">
                                        <Clock className="w-4 h-4 mr-1" />
                                        {time}
                                      </div>
                                      {typeof activity === "object" &&
                                        activity.location && (
                                          <div className="flex items-center">
                                            <MapPin className="w-4 h-4 mr-1" />
                                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                              {activity.location}
                                            </span>
                                          </div>
                                        )}
                                    </div>
                                  </div>
                                  <ChevronRight className="w-5 h-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              </div>
                            </div>
                          );
                        }
                      )
                    ) : (
                      // Format 3: Simple string
                      <div className="group">
                        <div className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                          <div className="flex items-start space-x-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                              <MapPin className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">
                                {activities}
                              </h4>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Connector line */}
                {index < Object.entries(itinerary).length - 1 && (
                  <div className="absolute left-5 top-16 w-px h-8 bg-gray-200"></div>
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600 mb-2">
                ✨ This itinerary was crafted by AI based on your travel
                preferences
              </p>
              <p className="text-xs text-gray-500">
                Powered by advanced travel planning algorithms
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItineraryDisplay;
