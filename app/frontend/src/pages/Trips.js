// import React, { useState, useEffect } from "react";
// import {
//   Box,
//   Typography,
//   Button,
//   Alert,
//   CircularProgress,
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   Paper,
//   Card,
//   CardContent,
//   Divider,
// } from "@mui/material";
// import { Plus, Calendar } from "lucide-react";
// import api from "../services/api";
// import TripCard from "../components/Trips/TripCard";
// import TripForm from "../components/Trips/TripForm";

// const Trips = () => {
//   const [trips, setTrips] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");
//   const [showForm, setShowForm] = useState(false);
//   const [activeTab, setActiveTab] = useState("upcoming");

//   useEffect(() => {
//     fetchTrips();
//   }, []);

//   const fetchTrips = async () => {
//     try {
//       setLoading(true);
//       const response = await api.get("/trips/");
//       setTrips(response.data || []);
//       setError("");
//     } catch (err) {
//       setError("Failed to load trips");
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleCreateTrip = async (tripData) => {
//     try {
//       await api.post("/trips/", tripData);
//       fetchTrips();
//       setShowForm(false);
//     } catch (err) {
//       setError("Failed to create trip");
//       console.error(err);
//     }
//   };

//   const handleDeleteTrip = async (tripId) => {
//     try {
//       await api.delete(`/trips/${tripId}`);
//       setTrips(trips.filter((trip) => trip.id !== tripId));
//     } catch (err) {
//       setError("Failed to delete trip");
//       console.error(err);
//     }
//   };

//   // Filter trips by dates
//   const today = new Date();
//   const upcomingTrips = trips.filter(
//     (trip) => new Date(trip.start_date) > today
//   );
//   const pastTrips = trips.filter((trip) => new Date(trip.end_date) < today);
//   const currentTrips = trips.filter(
//     (trip) =>
//       new Date(trip.start_date) <= today && new Date(trip.end_date) >= today
//   );

//   // Sort trips by date
//   upcomingTrips.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
//   pastTrips.sort((a, b) => new Date(b.end_date) - new Date(a.end_date));

//   // Function to determine which trips to display based on active tab
//   const getDisplayTrips = () => {
//     switch (activeTab) {
//       case "upcoming":
//         return upcomingTrips;
//       case "current":
//         return currentTrips;
//       case "past":
//         return pastTrips;
//       default:
//         return trips;
//     }
//   };

//   // Sample data for demo
//   const sampleTrip = {
//     id: "sample-1",
//     title: "Family trip",
//     destination: "Rome, Italy",
//     start_date: "2025-05-09",
//     end_date: "2025-05-16",
//     budget: 2000,
//     duration: 7,
//   };

//   // For demo purposes, if no trips, use sample
//   const displayTrips =
//     getDisplayTrips().length > 0
//       ? getDisplayTrips()
//       : activeTab === "upcoming"
//       ? [sampleTrip]
//       : [];

//   return (
//     <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, md: 3 }, py: 4 }}>
//       {/* Header */}
//       <Box sx={{ mb: 4 }}>
//         <Typography
//           variant="h4"
//           component="h1"
//           sx={{
//             fontWeight: 700,
//             mb: 0.5,
//           }}
//         >
//           My Trips
//         </Typography>
//         <Typography color="text.secondary">
//           Manage and plan your travel adventures
//         </Typography>
//       </Box>

//       {/* Main Content Card */}
//       <Card elevation={0} sx={{ borderRadius: 2, border: "1px solid #e0e0e0" }}>
//         <CardContent sx={{ p: 3 }}>
//           {/* Navigation Tabs with Add Button */}
//           <Box
//             sx={{
//               display: "flex",
//               justifyContent: "space-between",
//               alignItems: "center",
//               mb: 3,
//             }}
//           >
//             <Box sx={{ display: "flex", gap: 1 }}>
//               <Button
//                 onClick={() => setActiveTab("upcoming")}
//                 sx={{
//                   px: 2,
//                   py: 0.75,
//                   borderRadius: "20px",
//                   textTransform: "none",
//                   backgroundColor:
//                     activeTab === "upcoming"
//                       ? "rgba(25, 118, 210, 0.08)"
//                       : "transparent",
//                   color: activeTab === "upcoming" ? "#1976d2" : "#666",
//                   fontWeight: activeTab === "upcoming" ? 600 : 400,
//                   "&:hover": {
//                     backgroundColor:
//                       activeTab === "upcoming"
//                         ? "rgba(25, 118, 210, 0.12)"
//                         : "rgba(0, 0, 0, 0.04)",
//                   },
//                   position: "relative",
//                 }}
//               >
//                 Upcoming
//                 {upcomingTrips.length > 0 && (
//                   <Box
//                     component="span"
//                     sx={{
//                       ml: 1,
//                       px: 0.5,
//                       minWidth: "18px",
//                       height: "18px",
//                       fontSize: "0.7rem",
//                       backgroundColor:
//                         activeTab === "upcoming" ? "#1976d2" : "#666",
//                       color: "#fff",
//                       borderRadius: "9px",
//                       display: "inline-flex",
//                       alignItems: "center",
//                       justifyContent: "center",
//                     }}
//                   >
//                     {upcomingTrips.length}
//                   </Box>
//                 )}
//               </Button>

//               <Button
//                 onClick={() => setActiveTab("current")}
//                 sx={{
//                   px: 2,
//                   py: 0.75,
//                   borderRadius: "20px",
//                   textTransform: "none",
//                   backgroundColor:
//                     activeTab === "current"
//                       ? "rgba(25, 118, 210, 0.08)"
//                       : "transparent",
//                   color: activeTab === "current" ? "#1976d2" : "#666",
//                   fontWeight: activeTab === "current" ? 600 : 400,
//                   "&:hover": {
//                     backgroundColor:
//                       activeTab === "current"
//                         ? "rgba(25, 118, 210, 0.12)"
//                         : "rgba(0, 0, 0, 0.04)",
//                   },
//                 }}
//               >
//                 Current
//                 {currentTrips.length > 0 && (
//                   <Box
//                     component="span"
//                     sx={{
//                       ml: 1,
//                       px: 0.5,
//                       minWidth: "18px",
//                       height: "18px",
//                       fontSize: "0.7rem",
//                       backgroundColor:
//                         activeTab === "current" ? "#1976d2" : "#666",
//                       color: "#fff",
//                       borderRadius: "9px",
//                       display: "inline-flex",
//                       alignItems: "center",
//                       justifyContent: "center",
//                     }}
//                   >
//                     {currentTrips.length}
//                   </Box>
//                 )}
//               </Button>

//               <Button
//                 onClick={() => setActiveTab("past")}
//                 sx={{
//                   px: 2,
//                   py: 0.75,
//                   borderRadius: "20px",
//                   textTransform: "none",
//                   backgroundColor:
//                     activeTab === "past"
//                       ? "rgba(25, 118, 210, 0.08)"
//                       : "transparent",
//                   color: activeTab === "past" ? "#1976d2" : "#666",
//                   fontWeight: activeTab === "past" ? 600 : 400,
//                   "&:hover": {
//                     backgroundColor:
//                       activeTab === "past"
//                         ? "rgba(25, 118, 210, 0.12)"
//                         : "rgba(0, 0, 0, 0.04)",
//                   },
//                 }}
//               >
//                 Past
//                 {pastTrips.length > 0 && (
//                   <Box
//                     component="span"
//                     sx={{
//                       ml: 1,
//                       px: 0.5,
//                       minWidth: "18px",
//                       height: "18px",
//                       fontSize: "0.7rem",
//                       backgroundColor:
//                         activeTab === "past" ? "#1976d2" : "#666",
//                       color: "#fff",
//                       borderRadius: "9px",
//                       display: "inline-flex",
//                       alignItems: "center",
//                       justifyContent: "center",
//                     }}
//                   >
//                     {pastTrips.length}
//                   </Box>
//                 )}
//               </Button>
//             </Box>

//             <Button
//               variant="contained"
//               startIcon={<Plus size={18} />}
//               onClick={() => setShowForm(true)}
//               sx={{
//                 textTransform: "none",
//                 backgroundColor: "#1976d2",
//                 "&:hover": {
//                   backgroundColor: "#1565c0",
//                 },
//               }}
//             >
//               Add New Trip
//             </Button>
//           </Box>

//           <Divider sx={{ mb: 3 }} />

//           {/* Error Alert */}
//           {error && (
//             <Alert severity="error" sx={{ mb: 3 }}>
//               {error}
//             </Alert>
//           )}

//           {/* Trips Content */}
//           {loading ? (
//             <Box
//               sx={{
//                 display: "flex",
//                 justifyContent: "center",
//                 alignItems: "center",
//                 py: 8,
//               }}
//             >
//               <CircularProgress />
//             </Box>
//           ) : displayTrips.length === 0 ? (
//             <Paper
//               sx={{
//                 p: 6,
//                 textAlign: "center",
//                 backgroundColor: "#f9f9f9",
//                 border: "1px dashed #e0e0e0",
//                 borderRadius: 2,
//               }}
//             >
//               <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
//                 <Calendar size={48} sx={{ color: "#1976d2", opacity: 0.7 }} />
//               </Box>
//               <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
//                 You don't have any {activeTab} trips.
//               </Typography>
//               <Typography color="text.secondary" sx={{ mb: 3 }}>
//                 Start planning your next adventure
//               </Typography>
//               <Button
//                 variant="contained"
//                 startIcon={<Plus size={18} />}
//                 onClick={() => setShowForm(true)}
//                 sx={{ textTransform: "none" }}
//               >
//                 Plan a Trip
//               </Button>
//             </Paper>
//           ) : (
//             <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
//               {displayTrips.map((trip) => (
//                 <TripCard
//                   key={trip.id}
//                   trip={trip}
//                   onDelete={handleDeleteTrip}
//                 />
//               ))}
//             </Box>
//           )}
//         </CardContent>
//       </Card>

//       {/* Trip Form Dialog */}
//       <Dialog
//         open={showForm}
//         onClose={() => setShowForm(false)}
//         maxWidth="md"
//         fullWidth
//       >
//         <DialogTitle sx={{ fontWeight: 600 }}>Plan a New Trip</DialogTitle>
//         <DialogContent sx={{ pt: 2 }}>
//           <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
//             Create your next travel adventure
//           </Typography>
//           <TripForm
//             onSubmit={handleCreateTrip}
//             onCancel={() => setShowForm(false)}
//           />
//         </DialogContent>
//       </Dialog>
//     </Box>
//   );
// };

// export default Trips;

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  Paper,
  Card,
  CardContent,
  Divider,
} from "@mui/material";
import { Plus, Calendar } from "lucide-react";
import api from "../services/api";
import TripCard from "../components/Trips/TripCard";
import TripForm from "../components/Trips/TripForm";

const Trips = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState("upcoming");

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      const response = await api.get("/trips/");
      setTrips(response.data || []);
      setError("");
    } catch (err) {
      setError("Failed to load trips");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrip = async (tripData) => {
    try {
      await api.post("/trips/", tripData);
      fetchTrips();
      setShowForm(false);
    } catch (err) {
      setError("Failed to create trip");
      console.error(err);
    }
  };

  const handleDeleteTrip = async (tripId) => {
    try {
      await api.delete(`/trips/${tripId}`);
      setTrips(trips.filter((trip) => trip.id !== tripId));
    } catch (err) {
      setError("Failed to delete trip");
      console.error(err);
    }
  };

  // Filter trips by dates
  const today = new Date();
  const upcomingTrips = trips.filter(
    (trip) => new Date(trip.start_date) > today
  );
  const pastTrips = trips.filter((trip) => new Date(trip.end_date) < today);
  const currentTrips = trips.filter(
    (trip) =>
      new Date(trip.start_date) <= today && new Date(trip.end_date) >= today
  );

  // Sort trips by date
  upcomingTrips.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
  pastTrips.sort((a, b) => new Date(b.end_date) - new Date(a.end_date));

  // Function to determine which trips to display based on active tab
  const getDisplayTrips = () => {
    switch (activeTab) {
      case "upcoming":
        return upcomingTrips;
      case "current":
        return currentTrips;
      case "past":
        return pastTrips;
      default:
        return trips;
    }
  };

  // Get trips to display without any sample data
  const displayTrips = getDisplayTrips();

  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, md: 3 }, py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontWeight: 700,
            mb: 0.5,
          }}
        >
          My Trips
        </Typography>
        <Typography color="text.secondary">
          Manage and plan your travel adventures
        </Typography>
      </Box>

      {/* Main Content Card */}
      <Card elevation={0} sx={{ borderRadius: 2, border: "1px solid #e0e0e0" }}>
        <CardContent sx={{ p: 3 }}>
          {/* Navigation Tabs with Add Button */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 3,
            }}
          >
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                onClick={() => setActiveTab("upcoming")}
                sx={{
                  px: 2,
                  py: 0.75,
                  borderRadius: "20px",
                  textTransform: "none",
                  backgroundColor:
                    activeTab === "upcoming"
                      ? "rgba(25, 118, 210, 0.08)"
                      : "transparent",
                  color: activeTab === "upcoming" ? "#1976d2" : "#666",
                  fontWeight: activeTab === "upcoming" ? 600 : 400,
                  "&:hover": {
                    backgroundColor:
                      activeTab === "upcoming"
                        ? "rgba(25, 118, 210, 0.12)"
                        : "rgba(0, 0, 0, 0.04)",
                  },
                  position: "relative",
                }}
              >
                Upcoming
                {upcomingTrips.length > 0 && (
                  <Box
                    component="span"
                    sx={{
                      ml: 1,
                      px: 0.5,
                      minWidth: "18px",
                      height: "18px",
                      fontSize: "0.7rem",
                      backgroundColor:
                        activeTab === "upcoming" ? "#1976d2" : "#666",
                      color: "#fff",
                      borderRadius: "9px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {upcomingTrips.length}
                  </Box>
                )}
              </Button>

              <Button
                onClick={() => setActiveTab("current")}
                sx={{
                  px: 2,
                  py: 0.75,
                  borderRadius: "20px",
                  textTransform: "none",
                  backgroundColor:
                    activeTab === "current"
                      ? "rgba(25, 118, 210, 0.08)"
                      : "transparent",
                  color: activeTab === "current" ? "#1976d2" : "#666",
                  fontWeight: activeTab === "current" ? 600 : 400,
                  "&:hover": {
                    backgroundColor:
                      activeTab === "current"
                        ? "rgba(25, 118, 210, 0.12)"
                        : "rgba(0, 0, 0, 0.04)",
                  },
                }}
              >
                Current
                {currentTrips.length > 0 && (
                  <Box
                    component="span"
                    sx={{
                      ml: 1,
                      px: 0.5,
                      minWidth: "18px",
                      height: "18px",
                      fontSize: "0.7rem",
                      backgroundColor:
                        activeTab === "current" ? "#1976d2" : "#666",
                      color: "#fff",
                      borderRadius: "9px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {currentTrips.length}
                  </Box>
                )}
              </Button>

              <Button
                onClick={() => setActiveTab("past")}
                sx={{
                  px: 2,
                  py: 0.75,
                  borderRadius: "20px",
                  textTransform: "none",
                  backgroundColor:
                    activeTab === "past"
                      ? "rgba(25, 118, 210, 0.08)"
                      : "transparent",
                  color: activeTab === "past" ? "#1976d2" : "#666",
                  fontWeight: activeTab === "past" ? 600 : 400,
                  "&:hover": {
                    backgroundColor:
                      activeTab === "past"
                        ? "rgba(25, 118, 210, 0.12)"
                        : "rgba(0, 0, 0, 0.04)",
                  },
                }}
              >
                Past
                {pastTrips.length > 0 && (
                  <Box
                    component="span"
                    sx={{
                      ml: 1,
                      px: 0.5,
                      minWidth: "18px",
                      height: "18px",
                      fontSize: "0.7rem",
                      backgroundColor:
                        activeTab === "past" ? "#1976d2" : "#666",
                      color: "#fff",
                      borderRadius: "9px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {pastTrips.length}
                  </Box>
                )}
              </Button>
            </Box>

            <Button
              variant="contained"
              startIcon={<Plus size={18} />}
              onClick={() => setShowForm(true)}
              sx={{
                textTransform: "none",
                backgroundColor: "#1976d2",
                "&:hover": {
                  backgroundColor: "#1565c0",
                },
              }}
            >
              Add New Trip
            </Button>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Trips Content */}
          {loading ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                py: 8,
              }}
            >
              <CircularProgress />
            </Box>
          ) : displayTrips.length === 0 ? (
            <Paper
              sx={{
                p: 6,
                textAlign: "center",
                backgroundColor: "#f9f9f9",
                border: "1px dashed #e0e0e0",
                borderRadius: 2,
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
                <Calendar size={48} sx={{ color: "#1976d2", opacity: 0.7 }} />
              </Box>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                You don't have any {activeTab} trips.
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                Start planning your next adventure
              </Typography>
              <Button
                variant="contained"
                startIcon={<Plus size={18} />}
                onClick={() => setShowForm(true)}
                sx={{ textTransform: "none" }}
              >
                Plan a Trip
              </Button>
            </Paper>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {displayTrips.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  onDelete={handleDeleteTrip}
                />
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Trip Form Dialog */}
      <Dialog
        open={showForm}
        onClose={() => setShowForm(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Plan a New Trip</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create your next travel adventure
          </Typography>
          <TripForm
            onSubmit={handleCreateTrip}
            onCancel={() => setShowForm(false)}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Trips;
