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
  Loader2,
  Sparkles,
  Activity,
  Sun,
  Moon,
} from "lucide-react";

// Helper function to get icon based on activity type
const getActivityIcon = (activityType) => {
  const iconProps = { size: 16, className: "text-current" }; // Back to 16

  switch (activityType?.toLowerCase()) {
    case "breakfast":
    case "brunch":
      return <Coffee {...iconProps} />;
    case "lunch":
    case "dinner":
      return <Utensils {...iconProps} />;
    case "museum":
      return <BookOpen {...iconProps} />;
    case "activity":
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

// Clean location name by removing city and postcode
const cleanLocationName = (location) => {
  if (!location) return "";
  // Split by comma and take only the first part
  return location.split(",")[0].trim();
};

// Get column background color based on time slot
const getColumnBackground = (timeSlot) => {
  const backgrounds = {
    breakfast: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)", // Warm yellow
    morning: "linear-gradient(135deg, #fef9e7 0%, #fef3c7 100%)", // Light yellow
    lunch: "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)", // Light green
    afternoon: "linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)", // Light purple
    dinner: "linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)", // Light indigo
  };
  return backgrounds[timeSlot] || "white";
};

// Get day background color matching the map colors
const getDayBackgroundColor = (dayIndex) => {
  const dayColors = ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6"]; // Same as map colors
  const baseColor = dayColors[dayIndex % dayColors.length];

  // Convert hex to RGB and create a very light version for background
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  };

  const rgb = hexToRgb(baseColor);
  if (!rgb) return "rgba(248, 250, 252, 0.5)";

  // Create a very light version (97% white mixed with 3% of the day color)
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.04)`;
};

// Get activity by time slot - Enhanced for better data extraction
const getActivityByTimeSlot = (dayData, timeSlot) => {
  if (!dayData) return null;

  console.log(`DEBUG: Processing ${timeSlot} for day:`, dayData);

  // Handle different data formats from your API
  const activities = dayData.activities || [];

  // Format 1: Array of activities
  if (Array.isArray(activities) && activities.length > 0) {
    console.log(`DEBUG: Found activities array:`, activities);

    const timeSlotMap = {
      breakfast: activities.find(
        (a) =>
          a.type === "breakfast" ||
          a.name?.toLowerCase().includes("breakfast") ||
          a.title?.toLowerCase().includes("breakfast") ||
          a.time?.includes("09:") ||
          a.time?.includes("08:") ||
          a.time?.includes("07:")
      ),
      morning: activities.find(
        (a) =>
          (a.type === "activity" || a.type === "tour" || a.type === "museum") &&
          (a.time?.includes("10:") ||
            a.time?.includes("11:") ||
            !a.time?.includes("1"))
      ),
      lunch: activities.find(
        (a) =>
          a.type === "lunch" ||
          a.name?.toLowerCase().includes("lunch") ||
          a.title?.toLowerCase().includes("lunch") ||
          a.time?.includes("12:") ||
          a.time?.includes("13:")
      ),
      afternoon: activities.find(
        (a) =>
          (a.type === "activity" ||
            a.type === "museum" ||
            a.type === "attraction") &&
          (a.time?.includes("14:") ||
            a.time?.includes("15:") ||
            a.time?.includes("16:") ||
            a.time?.includes("17:"))
      ),
      dinner: activities.find(
        (a) =>
          a.type === "dinner" ||
          a.name?.toLowerCase().includes("dinner") ||
          a.title?.toLowerCase().includes("dinner") ||
          a.time?.includes("18:") ||
          a.time?.includes("19:") ||
          a.time?.includes("20:")
      ),
    };

    const foundActivity = timeSlotMap[timeSlot];
    if (foundActivity) {
      console.log(`DEBUG: Found ${timeSlot} activity:`, foundActivity);
      return foundActivity;
    }

    // Fallback: assign by index
    const slotIndex = {
      breakfast: 0,
      morning: 1,
      lunch: 2,
      afternoon: 3,
      dinner: 4,
    }[timeSlot];
    if (activities[slotIndex]) {
      console.log(
        `DEBUG: Using fallback index ${slotIndex} for ${timeSlot}:`,
        activities[slotIndex]
      );
      return activities[slotIndex];
    }
  }

  // Format 2: Time-based object format (like "09:00": {...})
  const timeSlotMap = {
    breakfast: ["07:00", "08:00", "09:00", "9:00"],
    morning: ["10:00", "11:00", "11:30", "10:30"],
    lunch: ["12:00", "12:30", "13:00", "13:30"],
    afternoon: ["14:00", "15:00", "15:30", "16:00", "16:30"],
    dinner: ["18:00", "19:00", "20:00", "19:30"],
  };

  for (const time of timeSlotMap[timeSlot]) {
    if (dayData[time]) {
      const activity = dayData[time];
      console.log(`DEBUG: Found time-based activity at ${time}:`, activity);
      return {
        time,
        title:
          typeof activity === "string"
            ? activity
            : activity.title || activity.name || String(activity),
        type:
          typeof activity === "object"
            ? activity.type
            : timeSlot === "breakfast"
            ? "breakfast"
            : timeSlot === "lunch"
            ? "lunch"
            : timeSlot === "dinner"
            ? "dinner"
            : "activity",
        location: typeof activity === "object" ? activity.location : null,
        address: typeof activity === "object" ? activity.address : null,
      };
    }
  }

  // Format 3: Direct properties on dayData
  const directPropertyMap = {
    breakfast: dayData.breakfast,
    morning: dayData.morning || dayData.activity,
    lunch: dayData.lunch,
    afternoon: dayData.afternoon || dayData.activity,
    dinner: dayData.dinner,
  };

  if (directPropertyMap[timeSlot]) {
    console.log(
      `DEBUG: Found direct property for ${timeSlot}:`,
      directPropertyMap[timeSlot]
    );
    const activity = directPropertyMap[timeSlot];
    return {
      title:
        typeof activity === "string"
          ? activity
          : activity.title || activity.name || String(activity),
      type: typeof activity === "object" ? activity.type : timeSlot,
      location: typeof activity === "object" ? activity.location : null,
      address: typeof activity === "object" ? activity.address : null,
    };
  }

  console.log(`DEBUG: No activity found for ${timeSlot}`);
  return null;
};

const ItineraryDisplay = ({ tripId }) => {
  const [itinerary, setItinerary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const [pollInterval, setPollInterval] = useState(null);

  // Start polling
  const startPolling = () => {
    const interval = setInterval(() => {
      checkStatus();
    }, 3000);
    setPollInterval(interval);
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

  // Function for initial itinerary generation (for new trips)
  const generateItinerary = async () => {
    try {
      setLoading(true);
      setError(null);

      // Request itinerary generation - uses trip data from your database
      const genResponse = await fetch(`/api/itinerary/generate/${tripId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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

  // Initial load
  useEffect(() => {
    if (tripId) {
      fetchItinerary();
    }
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [tripId]);

  // Loading state with skeleton - UPDATED WITH CONSISTENT FONT
  if (loading && !status) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header skeleton */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
            <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
          </div>

          {/* Loading text that matches Map component */}
          <div
            className="p-8 text-center border-b border-gray-200"
            style={{
              fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
              lineHeight: 1.6,
              letterSpacing: "0.0075em",
            }}
          >
            <div
              style={{
                fontSize: "1.25rem",
                fontWeight: "700",
                fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
                lineHeight: 1.6,
                letterSpacing: "0.0075em",
                color: "#374151",
              }}
            >
              Loading itinerary...
            </div>
          </div>

          {/* Table skeleton */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left">
                    <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                  </th>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <th key={i} className="px-6 py-4 text-center min-w-48">
                      <div className="h-4 bg-gray-200 rounded w-20 mx-auto animate-pulse"></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3].map((day) => (
                  <tr key={day} className="border-b border-gray-100">
                    <td className="px-6 py-6">
                      <div className="space-y-2">
                        <div className="h-5 bg-gray-200 rounded w-16 animate-pulse"></div>
                        <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                      </div>
                    </td>
                    {[1, 2, 3, 4, 5].map((slot) => (
                      <td
                        key={slot}
                        className="px-6 py-6 border-l border-gray-100"
                      >
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                          <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Processing state
  if (status && status.status === "processing") {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Sparkles className="w-12 h-12 text-blue-600 animate-pulse" />
              <Loader2 className="w-6 h-6 text-blue-400 animate-spin absolute -top-1 -right-1" />
            </div>
          </div>
          <h3
            className="text-xl font-semibold text-gray-900 mb-2"
            style={{
              fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
              lineHeight: 1.6,
              letterSpacing: "0.0075em",
            }}
          >
            Creating Your Perfect Itinerary
          </h3>
          <p
            className="text-gray-600 mb-4"
            style={{
              fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
              lineHeight: 1.6,
              letterSpacing: "0.0075em",
            }}
          >
            {status.message ||
              "Our AI is crafting a personalized travel experience just for you..."}
          </p>
          {status.eta && (
            <p
              className="text-sm text-blue-600"
              style={{
                fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
                lineHeight: 1.6,
                letterSpacing: "0.0075em",
              }}
            >
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
      <div className="max-w-7xl mx-auto p-6">
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
      <div className="max-w-7xl mx-auto p-6">
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

  // Successfully loaded itinerary - Bordered Table format
  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
        <h2
          className="text-xl font-bold text-gray-900 flex items-center"
          style={{
            fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
            lineHeight: 1.6,
            letterSpacing: "0.0075em",
          }}
        >
          <Sparkles className="w-6 h-6 mr-2 text-blue-600" />
          Your Trip Itinerary
        </h2>
      </div>

      {/* Bordered Table */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table
            className="w-full"
            style={{
              borderCollapse: "separate",
              borderSpacing: 0,
              border: "2px solid #e5e7eb",
            }}
          >
            {/* Table Header */}
            <thead>
              <tr style={{ backgroundColor: "#f8fafc" }}>
                <th
                  style={{
                    padding: "16px 20px",
                    textAlign: "center",
                    fontWeight: "700",
                    fontSize: "14px",
                    color: "#374151",
                    borderRight: "2px solid #e5e7eb",
                    borderBottom: "2px solid #e5e7eb",
                    minWidth: "160px",
                    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
                    lineHeight: 1.6,
                    letterSpacing: "0.0075em",
                  }}
                >
                  Day
                </th>
                <th
                  style={{
                    padding: "16px 20px",
                    textAlign: "center",
                    fontWeight: "700",
                    fontSize: "16px",
                    color: "#374151",
                    borderRight: "2px solid #e5e7eb",
                    borderBottom: "2px solid #e5e7eb",
                    minWidth: "180px",
                    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
                    lineHeight: 1.6,
                    letterSpacing: "0.0075em",
                  }}
                >
                  Breakfast
                </th>
                <th
                  style={{
                    padding: "16px 20px",
                    textAlign: "center",
                    fontWeight: "700",
                    fontSize: "16px",
                    color: "#374151",
                    borderRight: "2px solid #e5e7eb",
                    borderBottom: "2px solid #e5e7eb",
                    minWidth: "180px",
                    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
                    lineHeight: 1.6,
                    letterSpacing: "0.0075em",
                  }}
                >
                  Activity
                </th>
                <th
                  style={{
                    padding: "16px 20px",
                    textAlign: "center",
                    fontWeight: "700",
                    fontSize: "16px",
                    color: "#374151",
                    borderRight: "2px solid #e5e7eb",
                    borderBottom: "2px solid #e5e7eb",
                    minWidth: "180px",
                    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
                    lineHeight: 1.6,
                    letterSpacing: "0.0075em",
                  }}
                >
                  Lunch
                </th>
                <th
                  style={{
                    padding: "16px 20px",
                    textAlign: "center",
                    fontWeight: "700",
                    fontSize: "16px",
                    color: "#374151",
                    borderRight: "2px solid #e5e7eb",
                    borderBottom: "2px solid #e5e7eb",
                    minWidth: "180px",
                    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
                    lineHeight: 1.6,
                    letterSpacing: "0.0075em",
                  }}
                >
                  Activity
                </th>
                <th
                  style={{
                    padding: "16px 20px",
                    textAlign: "center",
                    fontWeight: "700",
                    fontSize: "16px",
                    color: "#374151",
                    borderBottom: "2px solid #e5e7eb",
                    minWidth: "180px",
                    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
                    lineHeight: 1.6,
                    letterSpacing: "0.0075em",
                  }}
                >
                  Dinner
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody>
              {Object.entries(itinerary).map(([dayKey, dayData], dayIndex) => {
                console.log(`Rendering day: ${dayKey}`, dayData); // Debug log

                const timeSlots = [
                  "breakfast",
                  "morning",
                  "lunch",
                  "afternoon",
                  "dinner",
                ];
                const isLastRow =
                  dayIndex === Object.entries(itinerary).length - 1;

                return (
                  <tr
                    key={dayKey}
                    className="hover:bg-opacity-20 transition-colors"
                    style={{
                      backgroundColor: getDayBackgroundColor(dayIndex),
                    }}
                  >
                    {/* Day Column */}
                    <td
                      style={{
                        padding: "20px",
                        verticalAlign: "top",
                        background: `linear-gradient(135deg, ${getDayBackgroundColor(
                          dayIndex
                        )} 0%, rgba(248, 250, 252, 0.3) 100%)`,
                        borderRight: "2px solid #e5e7eb",
                        borderBottom: isLastRow ? "none" : "2px solid #e5e7eb",
                      }}
                    >
                      <div className="space-y-4">
                        {/* Day Title */}
                        <div className="font-medium text-gray-900 text-base leading-tight">
                          {dayKey.includes("Day")
                            ? dayKey
                            : `Day ${dayIndex + 1}`}
                        </div>

                        {/* Date - treated like time */}
                        {dayData.date && (
                          <div className="flex items-center text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">
                            {formatDate(dayData.date)}
                          </div>
                        )}

                        {/* Location - treated like address */}
                        {(dayData.district || dayData.location) && (
                          <div className="text-xs text-gray-500 leading-relaxed p-2 bg-gray-50 rounded">
                            <span>
                              {cleanLocationName(
                                dayData.district || dayData.location
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Activity Columns */}
                    {timeSlots.map((timeSlot, slotIndex) => {
                      const activity = getActivityByTimeSlot(dayData, timeSlot);
                      const isLastColumn = slotIndex === timeSlots.length - 1;

                      return (
                        <td
                          key={timeSlot}
                          style={{
                            padding: "20px",
                            verticalAlign: "top",
                            background: `linear-gradient(135deg, ${getDayBackgroundColor(
                              dayIndex
                            )} 0%, rgba(255, 255, 255, 0.7) 100%)`,
                            borderRight: isLastColumn
                              ? "none"
                              : "2px solid #e5e7eb",
                            borderBottom: isLastRow
                              ? "none"
                              : "2px solid #e5e7eb",
                          }}
                        >
                          {activity ? (
                            <div className="space-y-3">
                              {/* Activity Title */}
                              <div className="font-medium text-gray-900 text-base leading-tight">
                                {cleanLocationName(
                                  activity.title || activity.name || "Activity"
                                )}
                              </div>

                              {/* Time */}
                              {activity.time && (
                                <div className="flex items-center text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {activity.time}
                                </div>
                              )}

                              {/* Address */}
                              {activity.address && (
                                <div className="text-xs text-gray-500 leading-relaxed p-2 bg-gray-50 rounded">
                                  <div className="flex items-start">
                                    <MapPin className="w-3 h-3 mr-1 mt-0.5 text-gray-400" />
                                    <span>
                                      {cleanLocationName(activity.address)}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center text-gray-400 py-6">
                              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                {getActivityIcon(timeSlot)}
                              </div>
                              <div
                                className="text-xs"
                                style={{
                                  fontFamily:
                                    '"Roboto", "Helvetica", "Arial", sans-serif',
                                }}
                              >
                                No activity planned
                              </div>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div
          style={{
            background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
            padding: "16px 24px",
            borderTop: "2px solid #e5e7eb",
          }}
        >
          <div className="flex items-center justify-between">
            <div
              className="text-sm text-gray-600 flex items-center"
              style={{
                fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
              }}
            >
              <Sparkles className="w-4 h-4 mr-2 text-blue-500" />
              This itinerary was crafted by AI based on your travel preferences
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItineraryDisplay;

