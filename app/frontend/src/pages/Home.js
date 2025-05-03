// import React from 'react';
// import { Link } from 'react-router-dom';

// const Home = () => {
//   return (
//     <div className="home-container">
//       <div className="welcome-section">
//         <h1>Welcome to Travel Planner</h1>
//         <p>Plan your next adventure with ease.</p>

//         <div className="home-buttons">
//           <Link to="/login" className="btn btn-primary">
//             Login
//           </Link>
//           <Link to="/register" className="btn btn-secondary">
//             Register
//           </Link>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Home;

import React from "react";
import { Link } from "react-router-dom";
import { Box, Typography, Button, Grid, Paper, Container } from "@mui/material";
import { PlaneLanding, MapPin, Calendar, Compass } from "lucide-react";
import { styled } from "@mui/material/styles";

// Custom styled components
const FeatureCard = styled(Paper)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: theme.spacing(3),
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
  boxShadow: theme.shadows[1],
  transition: "box-shadow 0.3s ease-in-out",
  "&:hover": {
    boxShadow: theme.shadows[3],
  },
}));

const PrimaryButton = styled(Button)(({ theme }) => ({
  padding: "10px 24px",
  textTransform: "none",
  fontWeight: 600,
  fontSize: "1rem",
  [theme.breakpoints.down("sm")]: {
    width: "100%",
  },
}));

const Home = () => {
  return (
    <Container maxWidth="lg">
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "80vh",
          textAlign: "center",
          px: 2,
        }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth: "lg",
            animation: "fadeIn 0.5s ease-in-out",
          }}
        >
          {/* Header Section */}
          <Box sx={{ mb: 6 }}>
            <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
              <PlaneLanding
                style={{ width: "80px", height: "80px", color: "#1976d2" }}
              />
            </Box>

            <Typography
              variant="h2"
              component="h1"
              sx={{
                fontWeight: 800,
                mb: 2,
                letterSpacing: "-0.02em",
                fontSize: { xs: "2.5rem", sm: "3rem", md: "3.5rem" },
              }}
            >
              Welcome to Travel Planner
            </Typography>

            <Typography
              variant="h5"
              color="text.secondary"
              sx={{
                maxWidth: "md",
                mx: "auto",
                mb: 6,
                fontSize: { xs: "1.1rem", md: "1.25rem" },
              }}
            >
              Plan your next adventure with ease. Organize trips, manage
              itineraries, and keep track of your travel preferences.
            </Typography>
          </Box>

          {/* Feature Cards with right padding to shift them rightward */}
          <Box sx={{ pl: { xs: 0, md: 8 }, pr: { xs: 0, md: 2 }, mb: 6 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <FeatureCard>
                  <MapPin
                    sx={{ width: 32, height: 32, color: "primary.main", mb: 2 }}
                  />
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    Discover Destinations
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Find your next perfect travel destination.
                  </Typography>
                </FeatureCard>
              </Grid>

              <Grid item xs={12} md={4}>
                <FeatureCard>
                  <Calendar
                    sx={{ width: 32, height: 32, color: "primary.main", mb: 2 }}
                  />
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    Plan Itineraries
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Create detailed day-by-day travel plans.
                  </Typography>
                </FeatureCard>
              </Grid>

              <Grid item xs={12} md={4}>
                <FeatureCard>
                  <Compass
                    sx={{ width: 32, height: 32, color: "primary.main", mb: 2 }}
                  />
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    Travel Better
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Personalize trips based on your preferences.
                  </Typography>
                </FeatureCard>
              </Grid>
            </Grid>
          </Box>

          {/* CTA Buttons */}
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
            }}
          >
            <PrimaryButton
              component={Link}
              to="/login"
              variant="contained"
              size="large"
              disableElevation
            >
              Login
            </PrimaryButton>

            <PrimaryButton
              component={Link}
              to="/register"
              variant="outlined"
              size="large"
            >
              Create Account
            </PrimaryButton>
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default Home;
