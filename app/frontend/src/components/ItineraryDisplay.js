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
} from "lucide-react";

// Helper function to get icon based on activity type
const getActivityIcon = (activityType) => {
  const iconProps = { size: 18, strokeWidth: 2 };

  switch (activityType?.toLowerCase()) {
    case "breakfast":
    case "brunch":
      return <Coffee {...iconProps} />;
    case "lunch":
    case "dinner":
      return <Utensils {...iconProps} />;
    case "museum":
      return <BookOpen {...iconProps} />;
    case "sightseeing":
    case "tour":
      return <Camera {...iconProps} />;
    case "transport":
    case "transfer":
      return <Bus {...iconProps} />;
    case "accommodation":
    case "check-in":
    case "check-out":
      return <Hotel {...iconProps} />;
    case "landmark":
    case "monument":
      return <Landmark {...iconProps} />;
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

  // Function to generate itinerary
  // const generateItinerary = async () => {
  //   try {
  //     setLoading(true);
  //     setError(null);

  //     // Get trip details first
  //     const tripResponse = await fetch(`/api/trips/${tripId}`);
  //     if (!tripResponse.ok) {
  //       throw new Error("Failed to fetch trip details");
  //     }

  //     const tripData = await tripResponse.json();

  //     // Request itinerary generation
  //     const genResponse = await fetch(`/api/itinerary/generate/${tripId}`, {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify({
  //         destination: tripData.destination,
  //         start_date: tripData.start_date,
  //         end_date: tripData.end_date,
  //         preferences: tripData.preferences || [],
  //         budget: tripData.budget,
  //       }),
  //     });

  //     if (!genResponse.ok && genResponse.status !== 202) {
  //       throw new Error("Failed to start itinerary generation");
  //     }

  //     // Start polling for status
  //     startPolling();
  //   } catch (err) {
  //     console.error("Error generating itinerary:", err);
  //     setError(err.message);
  //     setLoading(false);
  //   }
  // };

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

  // Function to poll for status
  const checkStatus = async () => {
    try {
      const statusResponse = await fetch(`/api/itinerary/status/${tripId}`);

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setStatus(statusData);

        // If completed, fetch the itinerary
        if (statusData.status === "completed") {
          stopPolling();
          fetchItinerary();
        } else if (statusData.status === "failed") {
          stopPolling();
          setError(`Generation failed: ${statusData.message}`);
          setLoading(false);
        }
      } else {
        // If status check fails, try fetching the itinerary directly
        // This handles cases where status endpoint might not be available
        fetchItinerary();
      }
    } catch (err) {
      console.error("Error checking status:", err);
      // Don't stop polling on transient errors
    }
  };

  // Start polling
  const startPolling = () => {
    if (!pollInterval) {
      const interval = setInterval(checkStatus, 3000); // Check every 3 seconds
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

      // Try the new endpoint format first
      const response = await fetch(`/api/itinerary/itinerary/${tripId}`);

      if (response.status === 202) {
        // Still processing
        setStatus({
          status: "processing",
          message: "Itinerary generation in progress",
        });
        startPolling();
        return;
      }

      if (response.status === 404) {
        // Itinerary doesn't exist - show the generation option
        setItinerary(null);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch itinerary: ${response.statusText}`);
      }

      const data = await response.json();

      // Handle different response formats
      if (data.itinerary) {
        setItinerary(data.itinerary);
      } else {
        // If the response is the itinerary directly
        setItinerary(data);
      }

      setLoading(false);
    } catch (err) {
      console.error("Error fetching itinerary:", err);
      // If there's an error, assume we need to generate the itinerary
      setError(null);
      setItinerary(null);
      setLoading(false);
    }
  };

  // Handle manual refresh
  const handleRefresh = () => {
    stopPolling();
    fetchItinerary();
  };

  // Initial load
  useEffect(() => {
    fetchItinerary();

    // Clean up on unmount
    return () => stopPolling();
  }, [tripId]);

  // Loading state
  if (loading && !status) {
    return (
      <div className="border border-gray-200 rounded">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Trip Itinerary</h2>
        </div>
        <div className="p-4">
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((day) => (
              <div key={day}>
                <div className="h-6 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
                <div className="h-24 bg-gray-200 rounded w-full animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Itinerary generation in progress
  if (status && status.status === "processing") {
    return (
      <div className="p-4 border border-yellow-200 bg-yellow-50 rounded flex items-center justify-between">
        <div className="flex items-center">
          <div className="mr-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-700"></div>
          </div>
          <span className="text-yellow-800">
            {status.message ||
              "Your personalized itinerary is being generated with AI. Please wait..."}
            {status.eta ? ` Estimated time: ${status.eta} seconds` : ""}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            className="px-3 py-1 text-sm rounded border border-gray-300 flex items-center gap-1"
            onClick={handleRefresh}
          >
            <RefreshCw size={14} />
            <span>Check Status</span>
          </button>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4 border border-red-200 bg-red-50 rounded flex items-center justify-between">
        <span className="text-red-800">{error}</span>
        <div className="flex gap-2">
          <button
            className="px-3 py-1 text-sm rounded border border-gray-300 flex items-center gap-1"
            onClick={handleRefresh}
          >
            <RefreshCw size={14} />
            <span>Retry</span>
          </button>
          <button
            className="px-3 py-1 text-sm rounded bg-blue-500 text-white flex items-center gap-1"
            onClick={generateItinerary}
          >
            <span>Generate Itinerary</span>
          </button>
        </div>
      </div>
    );
  }

  // No itinerary state
  if (!itinerary || Object.keys(itinerary).length === 0) {
    return (
      <div className="border border-gray-200 rounded">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Trip Itinerary</h2>
        </div>
        <div className="p-4">
          <div className="p-3 bg-blue-50 border border-blue-100 text-blue-700 rounded mb-4">
            No itinerary has been generated for this trip yet. Click the button
            below to create one using AI.
          </div>
          <button
            className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded hover:bg-blue-600"
            onClick={generateItinerary}
          >
            Generate AI Itinerary
          </button>
        </div>
      </div>
    );
  }

  // Successfully loaded itinerary
  return (
    <div className="border border-gray-200 rounded">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-semibold">Your Trip Itinerary</h2>
        <button
          className="px-3 py-1 text-sm rounded border border-gray-300 flex items-center gap-1"
          onClick={handleRefresh}
        >
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="p-4">
        {Object.entries(itinerary).map(([day, activities], index) => (
          <div key={day} className="mb-6">
            <div className="flex items-center mb-2">
              <Calendar size={18} className="mr-2 opacity-70" />
              <h3 className="text-lg font-medium">
                {day.includes("Day") ? day : `Day ${index + 1}`}:{" "}
                {activities.date ? formatDate(activities.date) : ""}
              </h3>
            </div>

            <div className="border border-gray-200 rounded mb-4 bg-white">
              <ul className="divide-y divide-gray-200">
                {/* Handle different itinerary formats */}
                {Array.isArray(activities) ? (
                  // Format 1: Array of activities
                  activities.map((activity, actIdx) => (
                    <li key={actIdx} className="py-3 px-4">
                      <div className="flex items-start">
                        <div className="mr-3 pt-0.5">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">
                            {activity.title ||
                              activity.name ||
                              activity.description}
                          </p>
                          <div className="flex items-center mt-1">
                            {activity.time && (
                              <div className="flex items-center mr-3">
                                <Clock size={14} className="mr-1 opacity-70" />
                                <span className="text-sm text-gray-600">
                                  {activity.time}
                                </span>
                              </div>
                            )}
                            {activity.location && (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700">
                                {activity.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))
                ) : typeof activities === "object" ? (
                  // Format 2: Object with time keys
                  Object.entries(activities).map(([time, activity], actIdx) => {
                    // Skip the date field if present
                    if (time === "date") return null;

                    return (
                      <li key={time} className="py-3 px-4">
                        <div className="flex items-start">
                          <div className="mr-3 pt-0.5">
                            {getActivityIcon(
                              typeof activity === "string" ? "" : activity.type
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">
                              {typeof activity === "string"
                                ? activity
                                : activity.title ||
                                  activity.name ||
                                  activity.description}
                            </p>
                            <div className="flex items-center mt-1">
                              <div className="flex items-center mr-3">
                                <Clock size={14} className="mr-1 opacity-70" />
                                <span className="text-sm text-gray-600">
                                  {time}
                                </span>
                              </div>
                              {typeof activity === "object" &&
                                activity.location && (
                                  <span className="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700">
                                    {activity.location}
                                  </span>
                                )}
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })
                ) : (
                  // Format 3: Simple string
                  <li className="py-3 px-4">
                    <div className="flex items-start">
                      <div className="mr-3 pt-0.5">
                        <MapPin size={18} />
                      </div>
                      <div>
                        <p className="font-medium">{activities}</p>
                      </div>
                    </div>
                  </li>
                )}
              </ul>
            </div>
          </div>
        ))}

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            This itinerary was generated using AI based on your trip
            preferences.
          </p>
          <button
            className="mt-2 px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded hover:bg-blue-50"
            onClick={generateItinerary}
          >
            Regenerate Itinerary
          </button>
        </div>
      </div>
    </div>
  );
};

export default ItineraryDisplay;
