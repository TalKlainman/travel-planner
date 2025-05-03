// import React from 'react';
// import { Link } from 'react-router-dom';

// const TripCard = ({ trip, onDelete }) => {
//   const { id, title, destination, start_date, end_date, budget, description } = trip;

//   const formatDate = (dateString) => {
//     const options = { year: 'numeric', month: 'long', day: 'numeric' };
//     return new Date(dateString).toLocaleDateString(undefined, options);
//   };

//   const handleDelete = () => {
//     if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
//       onDelete(id);
//     }
//   };

//   // Calculate trip duration
//   const startDate = new Date(start_date);
//   const endDate = new Date(end_date);
//   const durationDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

//   return (
//     <div className="trip-card">
//       <div className="trip-card-header">
//         <h3>{title}</h3>
//         <div className="trip-actions">
//           <Link to={`/trips/edit/${id}`} className="btn-icon edit">
//             <i className="fa fa-edit"></i>
//           </Link>
//           <button className="btn-icon delete" onClick={handleDelete}>
//             <i className="fa fa-trash"></i>
//           </button>
//         </div>
//       </div>
      
//       <div className="trip-card-body">
//         <p className="destination">
//           <i className="fa fa-map-marker"></i> {destination}
//         </p>
//         <p className="dates">
//           <i className="fa fa-calendar"></i> {formatDate(start_date)} - {formatDate(end_date)}
//           <span className="duration"> ({durationDays} days)</span>
//         </p>
//         {budget && (
//           <p className="budget">
//             <i className="fa fa-money"></i> Budget: ${budget}
//           </p>
//         )}
//         {description && (
//           <p className="description">{description}</p>
//         )}
//       </div>
      
//       <div className="trip-card-footer">
//         <Link to={`/trips/${id}`} className="btn btn-primary">
//           View Details
//         </Link>
//       </div>
//     </div>
//   );
// };

 

// export default TripCard;

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Button, 
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Paper,
  Chip
} from '@mui/material';
import { 
  MapPin, 
  Calendar, 
  Clock, 
  DollarSign, 
  Edit, 
  Trash,
  CalendarCheck,
  CalendarClock
} from 'lucide-react';

const TripCard = ({ trip, onDelete }) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "Date not specified";
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Get trip status
  const getTripStatus = () => {
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
  
  const status = getTripStatus();

  // Handle delete confirmation
  const handleConfirmDelete = () => {
    onDelete(trip.id);
    setDeleteDialogOpen(false);
  };

  return (
    <>
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          border: '1px solid #e0e0e0',
          borderRadius: 1,
          overflow: 'hidden',
          transition: 'box-shadow 0.2s',
          '&:hover': {
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }
        }}
      >
        <Box sx={{ p: 2 }}>
          {/* Trip Title & Status */}
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 1
            }}
          >
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 600,
                fontSize: '1.25rem' 
              }}
            >
              {trip.title}
            </Typography>
            
            {status === "upcoming" && (
              <Chip
                size="small"
                label="Upcoming"
                sx={{ 
                  bgcolor: 'rgba(25, 118, 210, 0.08)',
                  color: '#1976d2',
                  fontWeight: 500,
                  fontSize: '0.75rem',
                  height: 24
                }}
                icon={<CalendarClock size={14} />}
              />
            )}
            
            {status === "current" && (
              <Chip
                size="small"
                label="Active"
                sx={{ 
                  bgcolor: 'rgba(46, 125, 50, 0.08)',
                  color: '#2e7d32',
                  fontWeight: 500,
                  fontSize: '0.75rem',
                  height: 24
                }}
                icon={<CalendarCheck size={14} />}
              />
            )}
            
            {status === "past" && (
              <Chip
                size="small"
                label="Past"
                sx={{ 
                  bgcolor: 'rgba(97, 97, 97, 0.08)',
                  color: '#616161',
                  fontWeight: 500,
                  fontSize: '0.75rem',
                  height: 24
                }}
                icon={<Calendar size={14} />}
              />
            )}
          </Box>
          
          {/* Trip Details */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, my: 2 }}>
            {/* Destination */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <MapPin size={16} color="#666" style={{ marginRight: 8 }} />
              <Typography variant="body2" color="text.secondary">
                {trip.destination}
              </Typography>
            </Box>

            {/* Date Range */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Calendar size={16} color="#666" style={{ marginRight: 8 }} />
              <Typography variant="body2" color="text.secondary">
                {formatDate(trip.start_date)} - {formatDate(trip.end_date)}
              </Typography>
            </Box>

            {/* Duration */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Clock size={16} color="#666" style={{ marginRight: 8 }} />
              <Typography variant="body2" color="text.secondary">
                {trip.duration ? `${trip.duration} days` : `${Math.ceil((new Date(trip.end_date) - new Date(trip.start_date)) / (1000 * 60 * 60 * 24))} days`}
              </Typography>
            </Box>

            {/* Budget (if available) */}
            {trip.budget && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <DollarSign size={16} color="#666" style={{ marginRight: 8 }} />
                <Typography variant="body2" color="text.secondary">
                  Budget: ${Number(trip.budget).toLocaleString()}
                </Typography>
              </Box>
            )}
          </Box>
          
          {/* Description (if available) */}
          {trip.description && (
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ 
                mb: 2,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {trip.description}
            </Typography>
          )}
          
          {/* Actions */}
          <Box 
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mt: 2,
              pt: 2,
              borderTop: '1px solid #f0f0f0'
            }}
          >
            <Box>
              <IconButton
                component={Link}
                to={`/trips/${trip.id}/edit`}
                size="small"
                sx={{ color: '#666', mr: 1 }}
              >
                <Edit size={18} />
              </IconButton>
              <IconButton
                onClick={() => setDeleteDialogOpen(true)}
                size="small"
                sx={{ color: '#d32f2f' }}
              >
                <Trash size={18} />
              </IconButton>
            </Box>
            
            <Button
              variant="outlined"
              size="small"
              component={Link}
              to={`/trips/${trip.id}`}
              sx={{ 
                textTransform: 'none',
                borderColor: '#1976d2',
                color: '#1976d2'
              }}
            >
              View Details
            </Button>
          </Box>
        </Box>
      </Paper>

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
            onClick={handleConfirmDelete}
            variant="contained"
            color="error"
            sx={{ textTransform: 'none' }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TripCard;