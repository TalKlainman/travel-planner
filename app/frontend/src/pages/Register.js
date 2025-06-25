import { useState, useContext } from 'react';
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
import { UserPlus } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { register, login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    // Simple validation
    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      // Register the user
      const registerSuccess = await register(email, password);
      
      if (registerSuccess) {
        // If registration is successful, login automatically
        const loginSuccess = await login(email, password);
        if (loginSuccess) {
          // Show a success message
          alert("Registration successful! Your account has been created!");
          navigate('/trips');
        } else {
          // Show a success message
          alert("Registration successful! Please log in with your new credentials");
          navigate('/login');
        }
      }
    } catch (err) {
      setError('Registration failed. Please try again.');
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
      minHeight: '90vh',
      px: 2
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
        <CardContent sx={{ p: 4 }}>
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <UserPlus size={40} color="#1976d2" />
            </Box>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 'bold', mb: 1 }}>
              Create an Account
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Enter your details to create a new account
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
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
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
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
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
              />
            </Box>

            <Box sx={{ mb: 4 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                Confirm Password
              </Typography>
              <TextField
                fullWidth
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                size="small"
                variant="outlined"
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
                borderRadius: 0.75
              }}
            >
              {isLoading ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          {/* Footer */}
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Already have an account?{" "}
              <Link 
                to="/login" 
                style={{ 
                  color: '#1976d2', 
                  textDecoration: 'none' 
                }}
              >
                Login
              </Link>
            </Typography>
          </Box>
        </CardContent>
      </Paper>
    </Box>
  );
};

export default Register;