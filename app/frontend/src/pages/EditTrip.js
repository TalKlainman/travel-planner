// import { useState, useEffect } from "react";
// import { useParams, useNavigate, Link } from "react-router-dom";
// import {
//   Box,
//   Typography,
//   Button,
//   Paper,
//   Container,
//   CircularProgress,
//   Alert,
//   Breadcrumbs,
// } from "@mui/material";
// import { ArrowLeft, Edit, Info } from "lucide-react";
// import api from "../services/api";
// import TripForm from "../components/Trips/TripForm";
// import {
//   clearMapCache,
//   clearMapCacheByTripId,
// } from "../components/MapVisualization";

// const EditTrip = () => {
//   const { id } = useParams();
//   const navigate = useNavigate();
//   const [trip, setTrip] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");
//   const [showCacheWarning, setShowCacheWarning] = useState(false);

//   useEffect(() => {
//     const fetchTrip = async () => {
//       try {
//         setLoading(true);
//         const response = await api.get(`/trips/${id}`);
//         setTrip(response.data);
//       } catch (err) {
//         setError("Failed to load trip details");
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchTrip();
//   }, [id]);

//   // function to detect critical changes
//   const hasCriticalChanges = (originalTrip, updatedData) => {
//     const criticalFields = ["destination", "start_date", "end_date"];

//     return criticalFields.some((field) => {
//       if (field.includes("date")) {
//         const originalDate = originalTrip[field]
//           ? new Date(originalTrip[field]).toISOString().split("T")[0]
//           : null;
//         const updatedDate = updatedData[field]
//           ? new Date(updatedData[field]).toISOString().split("T")[0]
//           : null;
//         return originalDate !== updatedDate;
//       }
//       return originalTrip[field] !== updatedData[field];
//     });
//   };

//   const handleSubmit = async (tripData) => {
//     try {
//       // Check if critical data has changed
//       const needsItineraryReset = hasCriticalChanges(trip, tripData);

//       if (needsItineraryReset) {
//         setShowCacheWarning(true);

//         try {
//           const clearResponse = await fetch(
//             `http://localhost:8001/clear/${id}`,
//             {
//               method: "DELETE",
//             }
//           );
//         } catch (clearError) {}

//         try {
//           clearMapCache(id, trip.destination);
//           clearMapCacheByTripId(id);
//         } catch (mapCacheError) {}

//         // Update the trip
//         await api.put(`/trips/${id}`, tripData);

//         // Automatically regenerate itinerary with new trip data
//         try {
//           const generateResponse = await fetch(
//             `http://localhost:8001/generate/${id}`,
//             {
//               method: "POST",
//               headers: {
//                 "Content-Type": "application/json",
//               },
//               body: JSON.stringify({
//                 destination: tripData.destination,
//                 start_date: tripData.start_date,
//                 end_date: tripData.end_date,
//                 preferences: [],
//                 budget: tripData.budget,
//               }),
//             }
//           );

//           if (generateResponse.ok) {
//             try {
//               clearMapCache(id, tripData.destination);
//               clearMapCacheByTripId(id);
//             } catch (mapCacheError) {}

//             setShowCacheWarning(false);
//           }
//         } catch (genError) {}
//       } else {
//         // No critical changes detected - keeping existing itinerary

//         // Update the trip even if no critical changes
//         await api.put(`/trips/${id}`, tripData);
//       }

//       // Navigate back to trip details
//       navigate(`/trips/${id}`);
//     } catch (err) {
//       setError("Failed to update trip");
//     }
//   };

//   const handleCancel = () => {
//     navigate(`/trips/${id}`);
//   };

//   // Loading State
//   if (loading) {
//     return (
//       <Container maxWidth="lg" sx={{ py: 4 }}>
//         <Box
//           sx={{
//             display: "flex",
//             justifyContent: "center",
//             alignItems: "center",
//             flexDirection: "column",
//             minHeight: "60vh",
//           }}
//         >
//           <CircularProgress size={40} sx={{ mb: 2 }} />
//           <Typography color="text.secondary">
//             Loading trip details...
//           </Typography>
//         </Box>
//       </Container>
//     );
//   }

//   // Error State
//   if (error) {
//     return (
//       <Container maxWidth="lg" sx={{ py: 4 }}>
//         <Alert severity="error" sx={{ mb: 3 }}>
//           {error}
//         </Alert>
//         <Button
//           variant="outlined"
//           startIcon={<ArrowLeft size={16} />}
//           component={Link}
//           to="/trips"
//           sx={{
//             textTransform: "none",
//             mt: 2,
//           }}
//         >
//           Back to Trips
//         </Button>
//       </Container>
//     );
//   }

//   // Not Found State
//   if (!trip) {
//     return (
//       <Container maxWidth="lg" sx={{ py: 4 }}>
//         <Box
//           sx={{
//             textAlign: "center",
//             py: 6,
//           }}
//         >
//           <Typography
//             variant="h4"
//             component="h2"
//             sx={{
//               fontWeight: 700,
//               mb: 2,
//             }}
//           >
//             Trip not found
//           </Typography>
//           <Typography color="text.secondary" sx={{ mb: 4 }}>
//             The trip you're trying to edit doesn't exist or has been removed.
//           </Typography>
//           <Button
//             variant="contained"
//             startIcon={<ArrowLeft size={16} />}
//             component={Link}
//             to="/trips"
//             sx={{
//               textTransform: "none",
//               fontWeight: 500,
//             }}
//           >
//             Back to Trips
//           </Button>
//         </Box>
//       </Container>
//     );
//   }

//   // Main Content
//   return (
//     <Container maxWidth="lg" sx={{ py: 4 }}>
//       {/* Breadcrumbs Navigation */}
//       <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
//         <Link
//           to="/trips"
//           style={{
//             textDecoration: "none",
//             color: "#666",
//             display: "flex",
//             alignItems: "center",
//           }}
//         >
//           <Typography variant="body2">My Trips</Typography>
//         </Link>
//         <Link
//           to={`/trips/${id}`}
//           style={{
//             textDecoration: "none",
//             color: "#666",
//             display: "flex",
//             alignItems: "center",
//           }}
//         >
//           <Typography variant="body2">{trip.title}</Typography>
//         </Link>
//         <Typography
//           variant="body2"
//           color="text.primary"
//           sx={{
//             display: "flex",
//             alignItems: "center",
//           }}
//         >
//           Edit
//         </Typography>
//       </Breadcrumbs>

//       {/* Page Header */}
//       <Box sx={{ mb: 4 }}>
//         <Button
//           variant="text"
//           startIcon={<ArrowLeft size={16} />}
//           component={Link}
//           to={`/trips/${id}`}
//           sx={{
//             textTransform: "none",
//             color: "text.secondary",
//             p: 0,
//             mb: 1,
//             "&:hover": {
//               backgroundColor: "transparent",
//               color: "text.primary",
//             },
//           }}
//         >
//           Back to Trip Details
//         </Button>
//         <Box sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
//           <Edit size={20} style={{ marginRight: 8, opacity: 0.7 }} />
//           <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
//             Edit Trip
//           </Typography>
//         </Box>
//         <Typography color="text.secondary">Update your trip details</Typography>
//       </Box>

//       {/* Cache Warning */}
//       {showCacheWarning && (
//         <Alert severity="info" sx={{ mb: 3 }} icon={<Info />}>
//           <Typography variant="body2">
//             <strong>Itinerary Regenerating:</strong> Your itinerary is being
//             automatically updated to match the new trip details.
//           </Typography>
//         </Alert>
//       )}

//       {/* Info Alert about regeneration */}
//       <Alert severity="info" sx={{ mb: 3 }} icon={<Info />}>
//         <Typography variant="body2">
//           <strong>Note:</strong> Changing the destination, start date, or end
//           date will automatically regenerate your itinerary to match the new
//           trip details.
//         </Typography>
//       </Alert>

//       {/* Form Container */}
//       <Paper
//         elevation={0}
//         sx={{
//           p: 4,
//           border: "1px solid #e0e0e0",
//           borderRadius: 1,
//           mb: 4,
//         }}
//       >
//         <TripForm
//           onSubmit={handleSubmit}
//           initialData={trip}
//           onCancel={handleCancel}
//         />
//       </Paper>
//     </Container>
//   );
// };

// export default EditTrip;

import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Paper,
  Container,
  CircularProgress,
  Alert,
  Breadcrumbs,
} from "@mui/material";
import { ArrowLeft, Edit, Info } from "lucide-react";
import api from "../services/api";
import TripForm from "../components/Trips/TripForm";

const EditTrip = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCacheWarning, setShowCacheWarning] = useState(false);

  useEffect(() => {
    const fetchTrip = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/trips/${id}`);
        setTrip(response.data);
      } catch (err) {
        setError("Failed to load trip details");
      } finally {
        setLoading(false);
      }
    };

    fetchTrip();
  }, [id]);

  // function to detect critical changes
  const hasCriticalChanges = (originalTrip, updatedData) => {
    const criticalFields = ["destination", "start_date", "end_date"];

    return criticalFields.some((field) => {
      if (field.includes("date")) {
        const originalDate = originalTrip[field]
          ? new Date(originalTrip[field]).toISOString().split("T")[0]
          : null;
        const updatedDate = updatedData[field]
          ? new Date(updatedData[field]).toISOString().split("T")[0]
          : null;
        return originalDate !== updatedDate;
      }
      return originalTrip[field] !== updatedData[field];
    });
  };

  // Helper function to clear map cache via backend API
  const clearMapCacheForTrip = async (tripId) => {
    try {
      await fetch(`/api/map/trip/${tripId}`, {
        method: "DELETE",
      });
      console.log(`Map cache cleared for trip ${tripId}`);
    } catch (error) {
      console.warn(`Failed to clear map cache for trip ${tripId}:`, error);
      // Don't throw - this is not critical for the trip update
    }
  };

  const handleSubmit = async (tripData) => {
    try {
      // Check if critical data has changed
      const needsItineraryReset = hasCriticalChanges(trip, tripData);

      if (needsItineraryReset) {
        setShowCacheWarning(true);

        // Clear old itinerary from itinerary service
        try {
          const clearResponse = await fetch(
            `http://localhost:8001/clear/${id}`,
            {
              method: "DELETE",
            }
          );
        } catch (clearError) {
          console.warn("Failed to clear itinerary cache:", clearError);
        }

        // Clear map cache via backend API
        await clearMapCacheForTrip(id);

        // Update the trip
        await api.put(`/trips/${id}`, tripData);

        // Automatically regenerate itinerary with new trip data
        try {
          const generateResponse = await fetch(
            `/api/itinerary/generate/${id}`, // Use the gateway endpoint
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                destination: tripData.destination,
                start_date: tripData.start_date,
                end_date: tripData.end_date,
                preferences: [],
                budget: tripData.budget,
              }),
            }
          );

          if (generateResponse.ok) {
            // Map will be auto-generated by the new backend system
            console.log("Itinerary and map regenerated successfully");
            setShowCacheWarning(false);
          }
        } catch (genError) {
          console.warn("Failed to regenerate itinerary:", genError);
        }
      } else {
        // No critical changes detected - keeping existing itinerary
        // Update the trip even if no critical changes
        await api.put(`/trips/${id}`, tripData);
      }

      // Navigate back to trip details
      navigate(`/trips/${id}`);
    } catch (err) {
      setError("Failed to update trip");
    }
  };

  const handleCancel = () => {
    navigate(`/trips/${id}`);
  };

  // Loading State
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
            minHeight: "60vh",
          }}
        >
          <CircularProgress size={40} sx={{ mb: 2 }} />
          <Typography color="text.secondary">
            Loading trip details...
          </Typography>
        </Box>
      </Container>
    );
  }

  // Error State
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowLeft size={16} />}
          component={Link}
          to="/trips"
          sx={{
            textTransform: "none",
            mt: 2,
          }}
        >
          Back to Trips
        </Button>
      </Container>
    );
  }

  // Not Found State
  if (!trip) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box
          sx={{
            textAlign: "center",
            py: 6,
          }}
        >
          <Typography
            variant="h4"
            component="h2"
            sx={{
              fontWeight: 700,
              mb: 2,
            }}
          >
            Trip not found
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 4 }}>
            The trip you're trying to edit doesn't exist or has been removed.
          </Typography>
          <Button
            variant="contained"
            startIcon={<ArrowLeft size={16} />}
            component={Link}
            to="/trips"
            sx={{
              textTransform: "none",
              fontWeight: 500,
            }}
          >
            Back to Trips
          </Button>
        </Box>
      </Container>
    );
  }

  // Main Content
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Breadcrumbs Navigation */}
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <Link
          to="/trips"
          style={{
            textDecoration: "none",
            color: "#666",
            display: "flex",
            alignItems: "center",
          }}
        >
          <Typography variant="body2">My Trips</Typography>
        </Link>
        <Link
          to={`/trips/${id}`}
          style={{
            textDecoration: "none",
            color: "#666",
            display: "flex",
            alignItems: "center",
          }}
        >
          <Typography variant="body2">{trip.title}</Typography>
        </Link>
        <Typography
          variant="body2"
          color="text.primary"
          sx={{
            display: "flex",
            alignItems: "center",
          }}
        >
          Edit
        </Typography>
      </Breadcrumbs>

      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Button
          variant="text"
          startIcon={<ArrowLeft size={16} />}
          component={Link}
          to={`/trips/${id}`}
          sx={{
            textTransform: "none",
            color: "text.secondary",
            p: 0,
            mb: 1,
            "&:hover": {
              backgroundColor: "transparent",
              color: "text.primary",
            },
          }}
        >
          Back to Trip Details
        </Button>
        <Box sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
          <Edit size={20} style={{ marginRight: 8, opacity: 0.7 }} />
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            Edit Trip
          </Typography>
        </Box>
        <Typography color="text.secondary">Update your trip details</Typography>
      </Box>

      {/* Cache Warning */}
      {showCacheWarning && (
        <Alert severity="info" sx={{ mb: 3 }} icon={<Info />}>
          <Typography variant="body2">
            <strong>Itinerary Regenerating:</strong> Your itinerary and map are
            being automatically updated to match the new trip details.
          </Typography>
        </Alert>
      )}

      {/* Info Alert about regeneration */}
      <Alert severity="info" sx={{ mb: 3 }} icon={<Info />}>
        <Typography variant="body2">
          <strong>Note:</strong> Changing the destination, start date, or end
          date will automatically regenerate your itinerary and map to match the
          new trip details.
        </Typography>
      </Alert>

      {/* Form Container */}
      <Paper
        elevation={0}
        sx={{
          p: 4,
          border: "1px solid #e0e0e0",
          borderRadius: 1,
          mb: 4,
        }}
      >
        <TripForm
          onSubmit={handleSubmit}
          initialData={trip}
          onCancel={handleCancel}
        />
      </Paper>
    </Container>
  );
};

export default EditTrip;
