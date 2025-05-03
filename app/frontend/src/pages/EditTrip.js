// import React, { useState, useEffect } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import api from '../services/api';
// import TripForm from '../components/Trips/TripForm';

// const EditTrip = () => {
//   const { id } = useParams();
//   const navigate = useNavigate();
//   const [trip, setTrip] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');

//   useEffect(() => {
//     const fetchTrip = async () => {
//       try {
//         setLoading(true);
//         const response = await api.get(`/trips/${id}`);
//         setTrip(response.data);
//       } catch (err) {
//         setError('Failed to load trip details');
//         console.error(err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchTrip();
//   }, [id]);

//   const handleSubmit = async (tripData) => {
//     try {
//       await api.put(`/trips/${id}`, tripData);
//       navigate(`/trips/${id}`);
//     } catch (err) {
//       setError('Failed to update trip');
//       console.error(err);
//     }
//   };

//   if (loading) {
//     return <div className="loading">Loading trip...</div>;
//   }

//   if (error) {
//     return <div className="error-container">{error}</div>;
//   }

//   if (!trip) {
//     return <div className="not-found">Trip not found</div>;
//   }

//   return (
//     <div className="edit-trip-container">
//       <h1>Edit Trip</h1>
//       <TripForm onSubmit={handleSubmit} initialData={trip} />
//     </div>
//   );
// };

// export default EditTrip;

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
  Breadcrumbs,
} from "@mui/material";
import { ArrowLeft, Edit } from "lucide-react";
import api from "../services/api";
import TripForm from "../components/Trips/TripForm";

const EditTrip = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const handleSubmit = async (tripData) => {
    try {
      await api.put(`/trips/${id}`, tripData);
      navigate(`/trips/${id}`);
    } catch (err) {
      setError("Failed to update trip");
      console.error(err);
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
