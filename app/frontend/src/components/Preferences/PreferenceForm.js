// import React, { useState } from 'react';

// const PreferenceForm = ({ onSubmit, initialData = {}, onCancel }) => {
//   const [formData, setFormData] = useState({
//     category: initialData.category || '',
//     value: initialData.value || '',
//     weight: initialData.weight || 5
//   });
//   const [errors, setErrors] = useState({});

//   // Predefined categories and example values
//   const categories = [
//     'Food',
//     'Accommodation',
//     'Activities',
//     'Transportation',
//     'Climate',
//     'Budget',
//     'Pace',
//     'Accessibility'
//   ];

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData({
//       ...formData,
//       [name]: name === 'weight' ? parseInt(value) : value
//     });
//   };

//   const validate = () => {
//     const newErrors = {};
//     if (!formData.category) newErrors.category = 'Category is required';
//     if (!formData.value) newErrors.value = 'Preference value is required';
    
//     setErrors(newErrors);
//     return Object.keys(newErrors).length === 0;
//   };

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     if (validate()) {
//       onSubmit(formData);
//     }
//   };

//   return (
//     <form onSubmit={handleSubmit} className="preference-form">
//       <div className="form-group">
//         <label htmlFor="category">Category</label>
//         <select
//           id="category"
//           name="category"
//           value={formData.category}
//           onChange={handleChange}
//           className={`form-control ${errors.category ? 'is-invalid' : ''}`}
//         >
//           <option value="">Select category</option>
//           {categories.map(category => (
//             <option key={category} value={category}>{category}</option>
//           ))}
//         </select>
//         {errors.category && <div className="invalid-feedback">{errors.category}</div>}
//       </div>

//       <div className="form-group">
//         <label htmlFor="value">Preference</label>
//         <input
//           type="text"
//           id="value"
//           name="value"
//           value={formData.value}
//           onChange={handleChange}
//           className={`form-control ${errors.value ? 'is-invalid' : ''}`}
//           placeholder="e.g., Italian food, Luxury hotels, etc."
//         />
//         {errors.value && <div className="invalid-feedback">{errors.value}</div>}
//       </div>

//       <div className="form-group">
//         <label htmlFor="weight">Importance (1-10)</label>
//         <div className="weight-slider">
//           <input
//             type="range"
//             id="weight"
//             name="weight"
//             min="1"
//             max="10"
//             value={formData.weight}
//             onChange={handleChange}
//             className="form-control-range"
//           />
//           <span className="weight-value">{formData.weight}</span>
//         </div>
//       </div>

//       <div className="form-buttons">
//         <button type="submit" className="btn btn-primary">
//           {initialData.id ? 'Update Preference' : 'Save Preference'}
//         </button>
//         {onCancel && (
//           <button type="button" className="btn btn-secondary ml-2" onClick={onCancel}>
//             Cancel
//           </button>
//         )}
//       </div>
//     </form>
//   );
// };

// export default PreferenceForm;

import React, { useState } from 'react';
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