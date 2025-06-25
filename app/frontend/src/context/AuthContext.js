import { createContext, useState, useEffect } from "react";
import api from "../services/api";

// Create the context
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem("token");

      if (token) {
        try {
          // Set auth header
          api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

          // Get user data
          const response = await api.get("/profile");
          setUser(response.data);
          setIsAuthenticated(true);
        } catch (err) {
          // Token might be expired or invalid
          console.error("Error loading user:", err);
          localStorage.removeItem("token");
          delete api.defaults.headers.common["Authorization"];
        }
      }

      setLoading(false);
    };

    loadUser();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    setAuthError(null);

    try {
      // Get JWT token
      const response = await api.post(
        "/token",
        new URLSearchParams({
          username: email,
          password: password,
        }),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      const { access_token } = response.data;

      // Save token in localStorage
      localStorage.setItem("token", access_token);

      // Set auth header
      api.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;

      // Get user data
      const userResponse = await api.get("/profile");
      setUser(userResponse.data);
      setIsAuthenticated(true);
      setLoading(false);

      return true;
    } catch (err) {
      console.error("Login error:", err);
      setAuthError(
        err.response?.data?.detail || "Login failed. Please try again."
      );
      setIsAuthenticated(false);
      setUser(null);
      setLoading(false);

      return false;
    }
  };

  const register = async (email, password) => {
    setLoading(true);
    setAuthError(null);

    try {
      // Register user
      const response = await api.post("/register", {
        email,
        password,
      });

      // Registration successful
      setLoading(false);
      return true;
    } catch (err) {
      console.error("Registration error:", err);
      setAuthError(
        err.response?.data?.detail || "Registration failed. Please try again."
      );
      setLoading(false);

      return false;
    }
  };

  const logout = () => {
    // Remove token from localStorage
    localStorage.removeItem("token");

    // Remove auth header
    delete api.defaults.headers.common["Authorization"];

    // Reset state
    setIsAuthenticated(false);
    setUser(null);
  };

  // Context value
  const contextValue = {
    isAuthenticated,
    loading,
    user,
    authError,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

export default AuthContext;
