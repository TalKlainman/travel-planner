// import React, { useState, useContext } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { AuthContext } from '../context/AuthContext';

// const Login = () => {
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [error, setError] = useState('');
//   const { login } = useContext(AuthContext);
//   const navigate = useNavigate();

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError('');
    
//     if (!email || !password) {
//       setError('Please enter both email and password');
//       return;
//     }

//     const success = await login(email, password);
//     if (success) {
//       navigate('/trips');
//     } else {
//       setError('Invalid email or password');
//     }
//   };

//   return (
//     <div className="auth-container">
//       <h2>Login</h2>
//       {error && <div className="alert alert-danger">{error}</div>}
//       <form onSubmit={handleSubmit}>
//         <div className="form-group">
//           <label>Email</label>
//           <input
//             type="email"
//             value={email}
//             onChange={(e) => setEmail(e.target.value)}
//             className="form-control"
//             required
//           />
//         </div>
//         <div className="form-group">
//           <label>Password</label>
//           <input
//             type="password"
//             value={password}
//             onChange={(e) => setPassword(e.target.value)}
//             className="form-control"
//             required
//           />
//         </div>
//         <button type="submit" className="btn btn-primary">Login</button>
//       </form>
//     </div>
//   );
// };

// export default Login;

import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Alert,
  Paper,
  CardContent
} from '@mui/material';
import { LogIn } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    if (!email || !password) {
      setError('Please enter both email and password');
      setIsLoading(false);
      return;
    }

    try {
      const success = await login(email, password);
      
      if (success) {
        navigate('/trips');
      } else {
        setError('Invalid email or password');
      }
    } catch (err) {
      setError('An error occurred during login. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '80vh',
      px: 2,
      py: 4
    }}>
      <Paper
        elevation={1}
        sx={{
          width: '100%',
          maxWidth: 450,
          borderRadius: 1,
          overflow: 'hidden'
        }}
      >
        <CardContent sx={{ p: 4, pt: 5 }}>
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
              <LogIn size={32} color="#1976d2" />
            </Box>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 'bold', mb: 1.5 }}>
              Login
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Enter your credentials to access your account
            </Typography>
          </Box>

          {/* Error alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <Box sx={{ mb: 3.5 }}>
              <Typography variant="body1" sx={{ mb: 1, fontWeight: 500 }}>
                Email
              </Typography>
              <TextField
                fullWidth
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                size="small"
                variant="outlined"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0.5 } }}
              />
            </Box>

            <Box sx={{ mb: 4 }}>
              <Typography variant="body1" sx={{ mb: 1, fontWeight: 500 }}>
                Password
              </Typography>
              <TextField
                fullWidth
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                size="small"
                variant="outlined"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0.5 } }}
              />
            </Box>

            <Button 
              type="submit" 
              fullWidth 
              variant="contained" 
              disabled={isLoading}
              disableElevation
              sx={{ 
                py: 1.5,
                textTransform: 'none',
                borderRadius: 0.5,
                bgcolor: '#1976d2',
                fontWeight: 500,
                fontSize: '0.95rem',
                mb: 3
              }}
            >
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </form>

          {/* Footer */}
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Don't have an account?{" "}
              <Link 
                to="/register" 
                style={{ 
                  color: '#1976d2', 
                  textDecoration: 'none' 
                }}
              >
                Sign up
              </Link>
            </Typography>
          </Box>
        </CardContent>
      </Paper>
    </Box>
  );
};

export default Login;