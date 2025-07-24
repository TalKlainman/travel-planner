import { useState, useEffect } from "react";
import {
  Box,
  TextField,
  Button,
  Grid,
  FormHelperText,
  MenuItem,
  InputAdornment,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { Save, X, Calendar, MapPin, DollarSign } from "lucide-react";

const TripForm = ({ onSubmit, initialData = {}, onCancel }) => {
  const parseDate = (dateString) => {
    if (!dateString) return null;
    // Create date object ensuring correct format
    const date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return null;
    }
    return date;
  };

  // Add state for locations
  const [locations, setLocations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [locationsError, setLocationsError] = useState(null);

  useEffect(() => {
    // Fetch locations from backend API
    const fetchLocations = async () => {
      setLoadingLocations(true);
      setLocationsError(null);
      try {
        // Adjust the URL if your API base path is different
        const response = await fetch("/api/locations");
        if (!response.ok) throw new Error("Failed to fetch locations");
        const data = await response.json();
        setLocations(data);
      } catch (err) {
        setLocationsError("Could not load locations");
      } finally {
        setLoadingLocations(false);
      }
    };
    fetchLocations();
  }, []);

  const [formData, setFormData] = useState({
    title: initialData.title || "",
    destination: initialData.destination || "",
    start_date: parseDate(initialData.start_date),
    end_date: parseDate(initialData.end_date),
    budget: initialData.budget || "",
    description: initialData.description || "",
  });



  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    // Clear error when field is edited
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: "",
      });
    }
  };

  const handleDateChange = (date, fieldName) => {
    setFormData({
      ...formData,
      [fieldName]: date,
    });

    // Clear error when field is edited
    if (errors[fieldName]) {
      setErrors({
        ...errors,
        [fieldName]: "",
      });
    }

    // If updating start date and it's after end date, update end date too
    if (
      fieldName === "start_date" &&
      formData.end_date &&
      date > formData.end_date
    ) {
      setFormData((prev) => ({
        ...prev,
        end_date: date,
      }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.title) newErrors.title = "Title is required";
    if (!formData.destination)
      newErrors.destination = "Destination is required";
    if (!formData.start_date) newErrors.start_date = "Start date is required";
    if (!formData.end_date) newErrors.end_date = "End date is required";

    // Check if end date is after start date
    if (
      formData.start_date &&
      formData.end_date &&
      formData.end_date < formData.start_date
    ) {
      newErrors.end_date = "End date must be after start date";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (validate()) {
      // Format dates for API without timezone issues
      const formattedData = {
        ...formData,
        start_date: formData.start_date
          ? formData.start_date.toLocaleDateString('en-CA') 
          : null,
        end_date: formData.end_date
          ? formData.end_date.toLocaleDateString('en-CA') 
          : null,
        budget: formData.budget ? Number(formData.budget) : undefined,
      };

      onSubmit(formattedData);

    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Trip Title */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Trip Title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              error={!!errors.title}
              helperText={errors.title || ""}
              placeholder="Summer Vacation"
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <MapPin size={18} color="#666" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          {/* Destination */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              select
              label="Destination"
              name="destination"
              value={formData.destination}
              onChange={handleChange}
              error={!!errors.destination}
              helperText={errors.destination || locationsError || ""}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <MapPin size={18} color="#666" />
                  </InputAdornment>
                ),
              }}
              disabled={loadingLocations || !!locationsError}
            >
              <MenuItem value="">
                <em>{loadingLocations ? "Loading..." : "Select a destination"}</em>
              </MenuItem>
              {locations.map((location) => (
                <MenuItem
                  key={location.id}
                  value={`${location.name}, ${location.country}`}
                >
                  {location.name}, {location.country}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Date Range */}
          <Grid item xs={12} sm={6}>
            <DatePicker
              label="Start Date"
              value={formData.start_date}
              onChange={(date) => handleDateChange(date, "start_date")}
              slotProps={{
                textField: {
                  size: "small",
                  fullWidth: true,
                  error: !!errors.start_date,
                  helperText: errors.start_date || "",
                  InputProps: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Calendar size={18} color="#666" />
                      </InputAdornment>
                    ),
                  },
                },
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <DatePicker
              label="End Date"
              value={formData.end_date}
              onChange={(date) => handleDateChange(date, "end_date")}
              minDate={formData.start_date || undefined}
              slotProps={{
                textField: {
                  size: "small",
                  fullWidth: true,
                  error: !!errors.end_date,
                  helperText: errors.end_date || "",
                  InputProps: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Calendar size={18} color="#666" />
                      </InputAdornment>
                    ),
                  },
                },
              }}
            />
          </Grid>

          {/* Budget */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Budget"
              name="budget"
              type="number"
              value={formData.budget}
              onChange={handleChange}
              placeholder="0"
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <DollarSign size={18} color="#666" />
                  </InputAdornment>
                ),
              }}
            />
            <FormHelperText>Optional</FormHelperText>
          </Grid>

          {/* Description */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Add details about your trip..."
              multiline
              rows={3}
              size="small"
            />
            <FormHelperText>Optional</FormHelperText>
          </Grid>
        </Grid>

        {/* Form Actions */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            mt: 3,
            gap: 2,
          }}
        >
          <Button
            variant="outlined"
            onClick={handleCancel}
            startIcon={<X size={16} />}
            sx={{
              textTransform: "none",
              color: "#666",
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disableElevation
            startIcon={<Save size={16} />}
            sx={{
              textTransform: "none",
              fontWeight: 500,
            }}
          >
            {initialData.id ? "Update Trip" : "Create Trip"}
          </Button>
        </Box>
      </form>
    </LocalizationProvider>
  );
};

export default TripForm;
