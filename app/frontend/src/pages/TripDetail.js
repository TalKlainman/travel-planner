// import React, { useState, useEffect } from "react";
// import { useParams, useNavigate, Link } from "react-router-dom";
// import api from "../services/api";

// const TripDetail = () => {
//   const { id } = useParams();
//   const navigate = useNavigate();
//   const [trip, setTrip] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   useEffect(() => {
//     const fetchTrip = async () => {
//       try {
//         setLoading(true);
//         const response = await api.get(`/trips/${id}`);
//         setTrip(response.data);
//       } catch (err) {
//         setError("Failed to load trip details");
//         console.error(err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchTrip();
//   }, [id]);

//   const handleDelete = async () => {
//     if (window.confirm("Are you sure you want to delete this trip?")) {
//       try {
//         await api.delete(`/trips/${id}`);
//         navigate("/trips");
//       } catch (err) {
//         setError("Failed to delete trip");
//         console.error(err);
//       }
//     }
//   };

//   const formatDate = (dateString) => {
//     const options = { year: "numeric", month: "long", day: "numeric" };
//     return new Date(dateString).toLocaleDateString(undefined, options);
//   };

//   if (loading) {
//     return <div className="loading-container">Loading trip details...</div>;
//   }

//   if (error) {
//     return <div className="error-container">{error}</div>;
//   }

//   if (!trip) {
//     return <div className="not-found">Trip not found</div>;
//   }

//   // Calculate trip duration
//   const startDate = new Date(trip.start_date);
//   const endDate = new Date(trip.end_date);
//   const durationDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

//   // Calculate days until trip
//   const today = new Date();
//   const daysUntilTrip = Math.ceil((startDate - today) / (1000 * 60 * 60 * 24));

//   // Generate an array of dates for the trip
//   const tripDates = [];
//   for (let i = 0; i < durationDays; i++) {
//     const date = new Date(startDate);
//     date.setDate(date.getDate() + i);
//     tripDates.push(date);
//   }

//   return (
//     <div className="trip-detail-container">
//       {/* Trip Header */}
//       <div className="trip-detail-header">
//         <div className="trip-detail-title">
//           <h1>{trip.title}</h1>
//           <p className="trip-destination">{trip.destination}</p>
//         </div>
//         <div className="trip-actions">
//           <Link to={`/trips/edit/${trip.id}`} className="btn btn-primary">
//             Edit Trip
//           </Link>
//           <button onClick={handleDelete} className="btn btn-danger ml-2">
//             Delete Trip
//           </button>
//         </div>
//       </div>

//       {/* Trip Summary Card */}
//       <div className="trip-summary-card">
//         <div className="trip-summary-header">
//           <h2>Trip Summary</h2>
//           {daysUntilTrip > 0 ? (
//             <div className="trip-countdown">
//               <span className="countdown-value">{daysUntilTrip}</span>
//               <span className="countdown-label">days until your trip</span>
//             </div>
//           ) : (
//             <div className="trip-status">
//               {daysUntilTrip === 0 ? "Today is the day!" : "Trip in progress"}
//             </div>
//           )}
//         </div>

//         <div className="trip-summary-details">
//           <div className="summary-item">
//             <div className="summary-label">Dates</div>
//             <div className="summary-value">
//               {formatDate(trip.start_date)} - {formatDate(trip.end_date)}
//             </div>
//           </div>

//           <div className="summary-item">
//             <div className="summary-label">Duration</div>
//             <div className="summary-value">{durationDays} days</div>
//           </div>

//           {trip.budget && (
//             <div className="summary-item">
//               <div className="summary-label">Budget</div>
//               <div className="summary-value">${trip.budget}</div>
//               {/* Budget progress placeholder - will be implemented in Exercise 3 */}
//               <div className="budget-progress-container">
//                 <div
//                   className="budget-progress-bar"
//                   style={{ width: "0%" }}
//                 ></div>
//                 <div className="budget-progress-text">$0 spent</div>
//               </div>
//             </div>
//           )}
//         </div>

//         {trip.description && (
//           <div className="trip-description">
//             <h3>Description</h3>
//             <p>{trip.description}</p>
//           </div>
//         )}
//       </div>

//       {/* Itinerary Section Placeholder */}
//       <div className="trip-itinerary-section">
//         <div className="section-header">
//           <h2>Itinerary</h2>
//           <div className="placeholder-message">
//             <p>
//               Your day-by-day itinerary will be available in the next update.
//             </p>
//             <p className="coming-soon">
//               Coming soon: AI-powered itinerary suggestions based on your
//               preferences!
//             </p>
//           </div>
//         </div>

//         {/* Itinerary placeholder */}
//         <div className="itinerary-placeholder">
//           <div className="day-cards-container">
//             {tripDates.map((date, index) => (
//               <div key={index} className="day-card">
//                 <div className="day-header">
//                   <h3>Day {index + 1}</h3>
//                   <div className="day-date">
//                     {date.toLocaleDateString(undefined, {
//                       weekday: "short",
//                       month: "short",
//                       day: "numeric",
//                     })}
//                   </div>
//                 </div>
//                 <div className="activities-placeholder">
//                   <p>No activities planned yet</p>
//                   <button className="btn btn-outline btn-sm" disabled>
//                     Add Activities
//                   </button>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>
//       </div>

//       {/* Map Placeholder */}
//       <div className="trip-map-section">
//         <h2>Destination Map</h2>
//         <div className="map-placeholder">
//           <div className="map-placeholder-text">
//             <p>Map view will be available in the next update.</p>
//           </div>
//         </div>
//       </div>

//       <div className="back-link">
//         <Link to="/trips">← Back to All Trips</Link>
//       </div>
//     </div>
//   );
// };

// export default TripDetail;

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
  DialogActions
} from '@mui/material';
import { 
  ArrowLeft,
  Edit, 
  Trash, 
  MapPin, 
  Calendar, 
  Clock, 
  DollarSign,
  CalendarCheck,
  CalendarDays,
  Globe
} from 'lucide-react';
import api from '../services/api';

const TripDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    const fetchTrip = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/trips/${id}`);
        setTrip(response.data);
      } catch (err) {
        setError('Failed to load trip details');
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
      navigate('/trips');
    } catch (err) {
      setError('Failed to delete trip');
      console.error(err);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "Date not specified";
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Format short date for itinerary
  const formatShortDate = (date) => {
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return date.toLocaleDateString(undefined, options);
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
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            flexDirection: 'column',
            minHeight: '60vh'
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
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
        >
          {error}
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowLeft size={16} />}
          component={Link}
          to="/trips"
          sx={{ 
            textTransform: 'none',
            mt: 2
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
            textAlign: 'center',
            py: 6
          }}
        >
          <Typography 
            variant="h4" 
            component="h2" 
            sx={{ 
              fontWeight: 700,
              mb: 2
            }}
          >
            Trip not found
          </Typography>
          <Typography 
            color="text.secondary"
            sx={{ mb: 4 }}
          >
            The trip you're looking for doesn't exist or has been removed.
          </Typography>
          <Button
            variant="contained"
            startIcon={<ArrowLeft size={16} />}
            component={Link}
            to="/trips"
            sx={{ 
              textTransform: 'none',
              fontWeight: 500
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

  // Generate trip dates array
  const tripDates = [];
  for (let i = 0; i < durationDays; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    tripDates.push(date);
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header with Actions */}
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 2, sm: 0 },
          mb: 3
        }}
      >
        <Box>
          <Button
            variant="text"
            startIcon={<ArrowLeft size={16} />}
            component={Link}
            to="/trips"
            sx={{ 
              textTransform: 'none',
              color: 'text.secondary',
              p: 0,
              mb: 1,
              '&:hover': {
                backgroundColor: 'transparent',
                color: 'text.primary',
              }
            }}
          >
            Back to Trips
          </Button>
          <Typography 
            variant="h4" 
            component="h1" 
            sx={{ 
              fontWeight: 700,
              mb: 0.5
            }}
          >
            {trip.title}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MapPin size={16} color="#666" />
            <Typography variant="body1" color="text.secondary">
              {trip.destination}
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Edit size={16} />}
            component={Link}
            to={`/trips/${id}/edit`}
            sx={{ 
              textTransform: 'none',
              fontWeight: 500
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
              textTransform: 'none',
              fontWeight: 500
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
          border: '1px solid #e0e0e0',
          borderRadius: 1,
          mb: 3
        }}
      >
        <CardHeader
          title="Trip Summary" 
          titleTypographyProps={{ fontWeight: 700 }}
          action={
            status === "upcoming" ? (
              <Chip
                size="small"
                label={`${daysUntilTrip} ${daysUntilTrip === 1 ? 'day' : 'days'} until departure`}
                sx={{ 
                  bgcolor: 'rgba(25, 118, 210, 0.08)',
                  color: '#1976d2',
                  fontWeight: 500,
                  fontSize: '0.75rem',
                  height: 24
                }}
                icon={<Clock size={14} />}
              />
            ) : status === "current" ? (
              <Chip
                size="small"
                label="In Progress"
                sx={{ 
                  bgcolor: 'rgba(46, 125, 50, 0.08)',
                  color: '#2e7d32',
                  fontWeight: 500,
                  fontSize: '0.75rem',
                  height: 24
                }}
                icon={<CalendarCheck size={14} />}
              />
            ) : (
              <Chip
                size="small"
                label="Completed"
                sx={{ 
                  bgcolor: 'rgba(97, 97, 97, 0.08)',
                  color: '#616161',
                  fontWeight: 500,
                  fontSize: '0.75rem',
                  height: 24
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Clock size={16} color="#666" />
                  <Typography variant="body1">
                    {durationDays} {durationDays === 1 ? 'day' : 'days'}
                  </Typography>
                </Box>
              </Box>
            </Grid>
            
            {trip.budget && (
              <Grid item xs={12} md={4}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Budget
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <DollarSign size={16} color="#666" />
                    <Typography variant="body1">
                      ${Number(trip.budget).toLocaleString()}
                    </Typography>
                  </Box>
                  
                  {/* Budget progress placeholder */}
                  <Box sx={{ mt: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
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
                <Typography variant="body1">
                  {trip.description}
                </Typography>
              </Box>
            </>
          )}
        </CardContent>
      </Card>

      {/* Itinerary Section */}
      <Card 
        elevation={0}
        sx={{
          border: '1px solid #e0e0e0',
          borderRadius: 1,
          mb: 3
        }}
      >
        <CardHeader
          title="Itinerary"
          titleTypographyProps={{ fontWeight: 700 }}
        />
        <CardContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            Your day-by-day itinerary will be available in the next update.
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              color: 'primary.main',
              fontStyle: 'italic',
              mb: 3
            }}
          >
            Coming soon: AI-powered itinerary suggestions based on your preferences!
          </Typography>
          
          <Box 
            sx={{ 
              display: 'flex',
              overflowX: 'auto',
              gap: 2,
              pb: 2,
              // Hide scrollbar
              '&::-webkit-scrollbar': {
                display: 'none'
              },
              msOverflowStyle: 'none',
              scrollbarWidth: 'none'
            }}
          >
            {tripDates.map((date, index) => (
              <Card 
                key={index}
                elevation={0}
                sx={{ 
                  minWidth: 220,
                  border: '1px solid #e0e0e0',
                  borderRadius: 1,
                  flexShrink: 0
                }}
              >
                <CardHeader
                  title={`Day ${index + 1}`}
                  titleTypographyProps={{ 
                    variant: 'subtitle1', 
                    fontWeight: 600 
                  }}
                  subheader={formatShortDate(date)}
                  subheaderTypographyProps={{ 
                    variant: 'caption', 
                    color: 'text.secondary' 
                  }}
                  sx={{ pb: 1 }}
                />
                <CardContent sx={{ pt: 0, textAlign: 'center' }}>
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    No activities planned yet
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    disabled
                    sx={{ 
                      textTransform: 'none',
                      fontSize: '0.75rem'
                    }}
                  >
                    Add Activities
                  </Button>
                </CardContent>
              </Card>
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Map Placeholder */}
      <Card 
        elevation={0}
        sx={{
          border: '1px solid #e0e0e0',
          borderRadius: 1,
          mb: 3
        }}
      >
        <CardHeader
          title="Destination Map"
          titleTypographyProps={{ fontWeight: 700 }}
        />
        <CardContent>
          <Box 
            sx={{ 
              height: 300,
              bgcolor: '#f5f5f5',
              borderRadius: 1,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <Typography color="text.secondary">
              Map view will be available in the next update.
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Are you sure?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete your trip to <strong>{trip.destination}</strong>.
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button 
            onClick={() => setDeleteDialogOpen(false)}
            variant="outlined"
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDelete}
            variant="contained"
            color="error"
            sx={{ textTransform: 'none' }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TripDetail;