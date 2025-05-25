import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Paper,
  Container,
  CircularProgress,
  Alert,
  Divider,
  Grid,
  Chip,
  Card,
  CardHeader,
  CardContent,
  Stack,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Tabs,
  Tab,
} from "@mui/material";
import {
  ArrowLeft,
  Edit,
  Trash,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  Check as CalendarCheck,
  CalendarDays,
  Globe,
  Navigation as Route,
} from "lucide-react";
import api from "../services/api";

// Import our new components
import ItineraryDisplay from "../components/ItineraryDisplay";
import MapVisualization from "../components/MapVisualization";

const TripDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const fetchTrip = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/trips/${id}`);
        setTrip(response.data);
      } catch (err) {
        setError("Failed to load trip details");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTrip();
  }, [id]);

  const handleDelete = async () => {
    try {
      await api.delete(`/trips/${id}`);
      navigate("/trips");
    } catch (err) {
      setError("Failed to delete trip");
      console.error(err);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "Date not specified";
    const options = { year: "numeric", month: "long", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Get trip status
  const getTripStatus = () => {
    if (!trip || !trip.start_date || !trip.end_date) return "unknown";

    const today = new Date();
    const startDate = new Date(trip.start_date);
    const endDate = new Date(trip.end_date);

    if (startDate > today) {
      return "upcoming";
    } else if (endDate < today) {
      return "past";
    } else {
      return "current";
    }
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
            The trip you're looking for doesn't exist or has been removed.
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

  // Calculate status for display
  const status = getTripStatus();

  // Calculate trip duration
  const startDate = new Date(trip.start_date);
  const endDate = new Date(trip.end_date);
  const durationDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

  // Calculate days until trip
  const today = new Date();
  const daysUntilTrip = Math.ceil((startDate - today) / (1000 * 60 * 60 * 24));

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header with Actions */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          flexDirection: { xs: "column", sm: "row" },
          gap: { xs: 2, sm: 0 },
          mb: 3,
        }}
      >
        <Box>
          <Button
            variant="text"
            startIcon={<ArrowLeft size={16} />}
            component={Link}
            to="/trips"
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
            Back to Trips
          </Button>
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 700,
              mb: 0.5,
            }}
          >
            {trip.title}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <MapPin size={16} color="#666" />
            <Typography variant="body1" color="text.secondary">
              {trip.destination}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Edit size={16} />}
            component={Link}
            to={`/trips/${id}/edit`}
            sx={{
              textTransform: "none",
              fontWeight: 500,
            }}
          >
            Edit Trip
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<Trash size={16} />}
            onClick={() => setDeleteDialogOpen(true)}
            sx={{
              textTransform: "none",
              fontWeight: 500,
            }}
          >
            Delete Trip
          </Button>
        </Box>
      </Box>

      {/* Trip Summary Card */}
      <Card
        elevation={0}
        sx={{
          border: "1px solid #e0e0e0",
          borderRadius: 1,
          mb: 3,
        }}
      >
        <CardHeader
          title="Trip Summary"
          titleTypographyProps={{ fontWeight: 700 }}
          action={
            status === "upcoming" ? (
              <Chip
                size="small"
                label={`${daysUntilTrip} ${
                  daysUntilTrip === 1 ? "day" : "days"
                } until departure`}
                sx={{
                  bgcolor: "rgba(25, 118, 210, 0.08)",
                  color: "#1976d2",
                  fontWeight: 500,
                  fontSize: "0.75rem",
                  height: 24,
                }}
                icon={<Clock size={14} />}
              />
            ) : status === "current" ? (
              <Chip
                size="small"
                label="In Progress"
                sx={{
                  bgcolor: "rgba(46, 125, 50, 0.08)",
                  color: "#2e7d32",
                  fontWeight: 500,
                  fontSize: "0.75rem",
                  height: 24,
                }}
                icon={<CalendarCheck size={14} />}
              />
            ) : (
              <Chip
                size="small"
                label="Completed"
                sx={{
                  bgcolor: "rgba(97, 97, 97, 0.08)",
                  color: "#616161",
                  fontWeight: 500,
                  fontSize: "0.75rem",
                  height: 24,
                }}
                icon={<Calendar size={14} />}
              />
            )
          }
        />
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Dates
                </Typography>
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}
                >
                  <CalendarDays size={16} color="#666" />
                  <Typography variant="body1">
                    {formatDate(trip.start_date)} - {formatDate(trip.end_date)}
                  </Typography>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} md={4}>
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Duration
                </Typography>
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}
                >
                  <Clock size={16} color="#666" />
                  <Typography variant="body1">
                    {durationDays} {durationDays === 1 ? "day" : "days"}
                  </Typography>
                </Box>
              </Box>
            </Grid>

            {trip.budget && (
              <Grid item xs={12} md={4}>
                <Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Budget
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 2,
                    }}
                  >
                    <DollarSign size={16} color="#666" />
                    <Typography variant="body1">
                      ${Number(trip.budget).toLocaleString()}
                    </Typography>
                  </Box>

                  {/* Budget progress placeholder */}
                  <Box sx={{ mt: 1 }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 0.5,
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        $0 spent
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={0}
                      sx={{ height: 6, borderRadius: 1 }}
                    />
                  </Box>
                </Box>
              </Grid>
            )}
          </Grid>

          {trip.description && (
            <>
              <Divider sx={{ my: 3 }} />
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Description
                </Typography>
                <Typography variant="body1">{trip.description}</Typography>
              </Box>
            </>
          )}
        </CardContent>
      </Card>

      {/* Tabs for Itinerary and Map */}
      <Box sx={{ mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            "& .MuiTab-root": {
              textTransform: "none",
              fontWeight: 500,
              py: 1.5,
            },
          }}
        >
          <Tab
            icon={<Route size={16} />}
            label="Itinerary"
            iconPosition="start"
          />
          <Tab
            icon={<Globe size={16} />}
            label="Map & Attractions"
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {/* Tab Content */}
      <Box sx={{ mt: 3 }}>
        {/* Itinerary Tab */}
        {activeTab === 0 && <ItineraryDisplay tripId={id} />}

        {/* Map Tab */}
        {activeTab === 1 && (
          <MapVisualization tripId={id} destination={trip.destination} />
        )}
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Are you sure?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete your trip to{" "}
            <strong>{trip.destination}</strong>. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            variant="outlined"
            sx={{ textTransform: "none" }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            variant="contained"
            color="error"
            sx={{ textTransform: "none" }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TripDetail;
