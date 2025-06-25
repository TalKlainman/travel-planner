import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Trips from './pages/Trips';
import TripDetail from './pages/TripDetail';
import EditTrip from './pages/EditTrip';
import Profile from './pages/Profile';
import Navbar from './components/Navigation/Navbar';

// Auth context
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/Auth/PrivateRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <div className="container">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/trips" element={
              <PrivateRoute>
                <Trips />
              </PrivateRoute>
            } />
            <Route path="/trips/:id" element={
              <PrivateRoute>
                <TripDetail />
              </PrivateRoute>
            } />
            <Route path="/trips/:id/edit" element={
              <PrivateRoute>
                <EditTrip />
              </PrivateRoute>
            } />
            <Route path="/profile" element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            } />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
