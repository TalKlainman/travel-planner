import React, { useState, useEffect } from "react";
import api from "../services/api";
import PreferenceForm from "../components/Preferences/PreferenceForm";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton,
  CircularProgress,
  Divider
} from '@mui/material';
import { PlusCircle, Trash2, Edit, UserCircle } from 'lucide-react';

const Profile = () => {
  const [preferences, setPreferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingPreference, setEditingPreference] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [preferenceToDelete, setPreferenceToDelete] = useState(null);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const response = await api.get("/preferences/");
      setPreferences(response.data);
      setError("");
    } catch (err) {
      setError("Failed to load preferences");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePreference = async (preferenceData) => {
    try {
      await api.post("/preferences/", preferenceData);
      fetchPreferences();
      setShowAddDialog(false);
    } catch (err) {
      setError("Failed to create preference");
      console.error(err);
    }
  };

  const handleUpdatePreference = async (preferenceData) => {
    try {
      if (editingPreference) {
        await api.put(`/preferences/${editingPreference.id}`, preferenceData);
        fetchPreferences();
        setEditingPreference(null);
        setShowEditDialog(false);
      }
    } catch (err) {
      setError("Failed to update preference");
      console.error(err);
    }
  };

  const handleDeletePreference = async () => {
    try {
      if (preferenceToDelete) {
        await api.delete(`/preferences/${preferenceToDelete.id}`);
        setPreferences(preferences.filter((pref) => pref.id !== preferenceToDelete.id));
        setDeleteConfirmOpen(false);
        setPreferenceToDelete(null);
      }
    } catch (err) {
      setError("Failed to delete preference");
      console.error(err);
    }
  };

  const handleEditClick = (preference) => {
    setEditingPreference(preference);
    setShowEditDialog(true);
  };

  const handleDeleteClick = (preference) => {
    setPreferenceToDelete(preference);
    setDeleteConfirmOpen(true);
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, md: 3 }, py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography 
            variant="h4" 
            component="h1" 
            sx={{ 
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            <UserCircle size={32} />
            My Profile
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Manage your account and travel preferences
          </Typography>
        </Box>
      </Box>

      <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid #e0e0e0' }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Travel Preferences
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tell us what you like to customize your travel experiences
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<PlusCircle size={18} />}
              onClick={() => setShowAddDialog(true)}
              sx={{ 
                textTransform: 'none',
                backgroundColor: '#1976d2',
                '&:hover': {
                  backgroundColor: '#1565c0',
                }
              }}
            >
              Add Preference
            </Button>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : preferences.length === 0 ? (
            <Paper sx={{ 
              p: 6, 
              textAlign: 'center', 
              backgroundColor: '#f9f9f9',
              border: '1px dashed #e0e0e0',
              borderRadius: 2
            }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                You haven't set any travel preferences yet.
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                Add your preferences to get personalized travel recommendations
              </Typography>
              <Button
                variant="contained"
                startIcon={<PlusCircle size={18} />}
                onClick={() => setShowAddDialog(true)}
                sx={{ textTransform: 'none' }}
              >
                Add Your First Preference
              </Button>
            </Paper>
          ) : (
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Preference</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Importance</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {preferences.map((pref) => (
                    <TableRow 
                      key={pref.id} 
                      sx={{ '&:last-child td': { border: 0 } }}
                    >
                      <TableCell sx={{ fontWeight: 500 }}>{pref.category}</TableCell>
                      <TableCell>{pref.value}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, maxWidth: 180 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={(pref.weight / 10) * 100} 
                            sx={{ 
                              flexGrow: 1, 
                              height: 8, 
                              borderRadius: 4,
                              backgroundColor: '#e0e0e0',
                              '& .MuiLinearProgress-bar': {
                                backgroundColor: '#1976d2',
                                borderRadius: 4
                              }
                            }} 
                          />
                          <Typography variant="body2" sx={{ minWidth: '50px' }}>
                            {pref.weight}/10
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                          <IconButton
                            onClick={() => handleEditClick(pref)}
                            size="small"
                            sx={{ color: '#1976d2' }}
                          >
                            <Edit size={18} />
                          </IconButton>
                          <IconButton
                            onClick={() => handleDeleteClick(pref)}
                            size="small"
                            sx={{ color: '#d32f2f' }}
                          >
                            <Trash2 size={18} />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Add Preference Dialog */}
      <Dialog 
        open={showAddDialog} 
        onClose={() => setShowAddDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Add New Preference</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Set your travel preferences to help us tailor your experiences.
          </Typography>
          <PreferenceForm onSubmit={handleCreatePreference} onCancel={() => setShowAddDialog(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit Preference Dialog */}
      <Dialog 
        open={showEditDialog} 
        onClose={() => setShowEditDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Edit Preference</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Update your travel preference details.
          </Typography>
          {editingPreference && (
            <PreferenceForm 
              initialData={editingPreference} 
              onSubmit={handleUpdatePreference} 
              onCancel={() => setShowEditDialog(false)} 
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Are you sure?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will delete your preference for "{preferenceToDelete?.value}" ({preferenceToDelete?.category}).
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeletePreference} 
            color="error" 
            variant="contained"
            sx={{ textTransform: 'none' }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Profile;