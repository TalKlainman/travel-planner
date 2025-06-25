import { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  MenuItem,
  FormControl,
  FormHelperText,
  InputLabel,
  Select,
  Slider,
  Typography
} from '@mui/material';
import { Save, X } from 'lucide-react';

const PreferenceForm = ({ onSubmit, initialData = {}, onCancel }) => {
  const [formData, setFormData] = useState({
    category: initialData.category || '',
    value: initialData.value || '',
    weight: initialData.weight || 5
  });
  const [errors, setErrors] = useState({});

  // Predefined categories
  const categories = [
    'Food',
    'Accommodation',
    'Activities',
    'Transportation',
    'Climate',
    'Budget',
    'Pace',
    'Accessibility'
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  const handleSliderChange = (event, newValue) => {
    setFormData({
      ...formData,
      weight: newValue
    });
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.value) newErrors.value = 'Preference value is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <FormControl error={!!errors.category} fullWidth>
          <InputLabel id="category-label">Category</InputLabel>
          <Select
            labelId="category-label"
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            label="Category"
          >
            {categories.map(category => (
              <MenuItem key={category} value={category}>
                {category}
              </MenuItem>
            ))}
          </Select>
          {errors.category && <FormHelperText>{errors.category}</FormHelperText>}
        </FormControl>

        <TextField
          fullWidth
          label="Preference"
          name="value"
          value={formData.value}
          onChange={handleChange}
          error={!!errors.value}
          helperText={errors.value}
          placeholder="e.g., Italian food, Luxury hotels, etc."
        />

        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Importance (1-10)
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {formData.weight}
            </Typography>
          </Box>
          <Slider
            value={formData.weight}
            onChange={handleSliderChange}
            min={1}
            max={10}
            step={1}
            marks
            sx={{
              color: '#1976d2',
              '& .MuiSlider-thumb': {
                backgroundColor: '#1976d2',
              },
              '& .MuiSlider-track': {
                backgroundColor: '#1976d2',
              },
              '& .MuiSlider-rail': {
                backgroundColor: '#e0e0e0',
              },
            }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Less important
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Very important
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, pt: 2 }}>
          {onCancel && (
            <Button
              variant="outlined"
              onClick={onCancel}
              startIcon={<X size={18} />}
              sx={{ textTransform: 'none' }}
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            variant="contained"
            startIcon={<Save size={18} />}
            sx={{ 
              textTransform: 'none',
              backgroundColor: '#1976d2',
              '&:hover': {
                backgroundColor: '#1565c0',
              }
            }}
          >
            {initialData.id ? 'Update Preference' : 'Save Preference'}
          </Button>
        </Box>
      </Box>
    </form>
  );
};

export default PreferenceForm;