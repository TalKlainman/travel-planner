// import React, { useContext } from 'react';
// import { Link, useNavigate } from 'react-router-dom';
// import { AuthContext } from '../../context/AuthContext';

// const Navbar = () => {
//   const { isAuthenticated, logout } = useContext(AuthContext);
//   const navigate = useNavigate();

//   const handleLogout = () => {
//     logout();
//     navigate('/');
//   };

//   return (
//     <nav className="navbar">
//       <div className="navbar-brand">
//         <Link to={isAuthenticated ? "/trips" : "/"}>Travel Planner</Link>
//       </div>
//       <ul className="navbar-nav">
//         {isAuthenticated ? (
//           <>
//             <li className="nav-item">
//               <Link to="/trips" className="nav-link">My Trips</Link>
//             </li>
//             <li className="nav-item">
//               <Link to="/profile" className="nav-link">Profile</Link>
//             </li>
//             <li className="nav-item">
//               <button onClick={handleLogout} className="nav-link btn-link">Logout</button>
//             </li>
//           </>
//         ) : (
//           <>
//             <li className="nav-item">
//               <Link to="/" className="nav-link">Home</Link>
//             </li>
//             <li className="nav-item">
//               <Link to="/login" className="nav-link">Login</Link>
//             </li>
//             <li className="nav-item">
//               <Link to="/register" className="nav-link">Register</Link>
//             </li>
//           </>
//         )}
//       </ul>
//     </nav>
//   );
// };

// export default Navbar;

import React, { useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
} from "@mui/material";
import { Plane } from "lucide-react";
import { AuthContext } from "../../context/AuthContext";

const Navbar = () => {
  const { isAuthenticated, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <AppBar
      position="static"
      color="transparent"
      elevation={0}
      sx={{ borderBottom: "1px solid #e0e0e0" }}
    >
      <Container maxWidth={false} disableGutters>
        <Toolbar
          disableGutters
          sx={{
            height: 64,
            justifyContent: "space-between",
            px: { xs: 2, md: 4 }, // add padding manually
          }}
        >
          {/* Logo */}
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Link
              to={isAuthenticated ? "/trips" : "/"}
              style={{
                textDecoration: "none",
                color: "inherit",
                display: "flex",
                alignItems: "center",
              }}
            >
              <Plane style={{ width: 20, height: 20, marginRight: 8 }} />
              <Typography
                variant="h6"
                sx={{ fontWeight: 500, fontSize: "1.1rem", color: "#333" }}
              >
                Travel Planner
              </Typography>
            </Link>
          </Box>

          {/* Navigation Links */}
          <Box>
            {isAuthenticated ? (
              <>
                <Button
                  component={Link}
                  to="/trips"
                  color="inherit"
                  sx={{ ml: 2, textTransform: "none" }}
                >
                  My Trips
                </Button>
                <Button
                  component={Link}
                  to="/profile"
                  color="inherit"
                  sx={{ ml: 2, textTransform: "none" }}
                >
                  Profile
                </Button>
                <Button
                  onClick={handleLogout}
                  color="inherit"
                  sx={{ ml: 2, textTransform: "none" }}
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button
                  component={Link}
                  to="/"
                  color="inherit"
                  sx={{ ml: 2, textTransform: "none" }}
                >
                  Home
                </Button>
                <Button
                  component={Link}
                  to="/login"
                  color="inherit"
                  sx={{ ml: 2, textTransform: "none" }}
                >
                  Login
                </Button>
                <Button
                  component={Link}
                  to="/register"
                  color="inherit"
                  sx={{ ml: 2, textTransform: "none" }}
                >
                  Register
                </Button>
              </>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navbar;
