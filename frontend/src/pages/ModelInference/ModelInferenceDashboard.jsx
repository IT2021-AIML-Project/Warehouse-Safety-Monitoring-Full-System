import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getInferencesByZone, deleteInferenceApi, changeUserPassword } from '../../services/api';
import {
  Typography,
  Box,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Drawer,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  IconButton,
  AppBar,
  Toolbar,
  Avatar,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  Tabs,
  Tab,
  Collapse,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  ExitToApp,
  Lock,
  Person,
  Security,
  Close,
  Visibility,
  VisibilityOff,
  CloudUpload,
  Videocam,
  Schedule,
  ArrowBack,
  Dashboard,
  ExpandLess,
  ExpandMore,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import UploadImage from './UploadImage';
import InferenceTable from './InferenceTable';
import LiveStreamPanel from './LiveStreamPanel';

// Category → emoji + color mapping for PPE items
const ppeCategoryDisplay = {
  'Head Protection': { emoji: '⛑️', bg: '#dbeafe' },
  'Body Protection': { emoji: '🦺', bg: '#dcfce7' },
};
const getPPEDisplay = (category) => ppeCategoryDisplay[category] || { emoji: '🔧', bg: '#f1f5f9' };

const typeColorMap = {
  Storage: { bg: '#dbeafe', color: '#1d4ed8' },
  Loading: { bg: '#fef9c3', color: '#a16207' },
  Restricted: { bg: '#fee2e2', color: '#dc2626' },
  Packing: { bg: '#dcfce7', color: '#16a34a' },
};

const zoneSvgPaths = {
  Storage: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
  Loading: 'M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zm-.5 1.5 1.96 2.5H17V9.5h2.5zM6 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm13.5-1c0 .55-.45 1-1 1s-1-.45-1-1 .45-1 1-1 1 .45 1 1z',
  Restricted: 'M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4 5 2.18V11c0 3.5-2.33 6.79-5 7.93-2.67-1.14-5-4.43-5-7.93V7.18L12 5z',
  Packing: 'M18 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C8.96 2.54 8.05 2 7 2 5.34 2 4 3.34 4 5c0 .35.07.69.18 1H2v13h2v3h16v-3h2V6h-4zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM7 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z',
};

const ZoneIconBox = ({ type, size = 56 }) => {
  const c = typeColorMap[type] || { bg: '#f1f5f9', color: '#64748b' };
  return (
    <Box sx={{
      width: size, height: size, borderRadius: '14px',
      backgroundColor: c.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: c.color, flexShrink: 0,
    }}>
      <svg viewBox="0 0 24 24" fill="currentColor" width={size * 0.55} height={size * 0.55}>
        <path d={zoneSvgPaths[type] || zoneSvgPaths.Storage} />
      </svg>
    </Box>
  );
};


const drawerWidth = 260;

const ModelInferenceDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [selectedZone, setSelectedZone] = useState(null);
  const [allZones, setAllZones] = useState([]);
  const [mode, setMode] = useState(0);
  const [inferences, setInferences] = useState([]);
  const [zonesLoading, setZonesLoading] = useState(true);
  const [inferencesLoading, setInferencesLoading] = useState(false);

  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [historyCollapsed, setHistoryCollapsed] = useState(false);
  const [profileMenuAnchor, setProfileMenuAnchor] = useState(null);


  const addInference = (inference) => setInferences((prev) => [inference, ...prev]);
  const deleteInference = async (inferenceId) => {
    try {
      await deleteInferenceApi(inferenceId);
      setInferences((prev) => prev.filter((inf) => inf.inference_id !== inferenceId));
    } catch (err) {
      console.error('Failed to delete inference:', err);
    }
  };

  // Load existing inferences when a zone is selected
  const loadZoneInferences = useCallback(async (zoneId) => {
    if (!zoneId) return;
    setInferencesLoading(true);
    try {
      const res = await getInferencesByZone(zoneId);
      setInferences(res.data.inferences || []);
    } catch (err) {
      console.error('Failed to load inferences:', err);
      setInferences([]);
    } finally {
      setInferencesLoading(false);
    }
  }, []);

  // Fetch zones with PPE items from API
  useEffect(() => {
    const fetchZones = async () => {
      try {
        const { getPopulatedZones } = await import('../../services/api');
        const res = await getPopulatedZones();
        const zones = (res.data.zones || []).map(z => ({
          id: z._id,
          zoneId: z.zoneId,
          name: z.name,
          type: z.type,
          status: z.status,
          items: z.items || [],
        }));
        setAllZones(zones);
      } catch (err) {
        console.error('Failed to load zones:', err);
      } finally {
        setZonesLoading(false);
      }
    };
    fetchZones();
  }, []);

  const activeZones = allZones.filter((z) => z.status === 'Active');

  // Filter inferences to only show the selected zone's results
  const zoneInferences = useMemo(() => {
    if (!selectedZone) return [];
    return inferences.filter(
      (inf) => inf.zone_id === selectedZone.zoneId || inf.zone_id === selectedZone.id
    );
  }, [inferences, selectedZone]);

  const handleLogout = () => {
    setProfileMenuAnchor(null);
    logout();
    navigate('/login');
  };

  const handleOpenProfileMenu = (event) => setProfileMenuAnchor(event.currentTarget);
  const handleCloseProfileMenu = () => setProfileMenuAnchor(null);
  const handleNavigateTo = (path) => {
    setProfileMenuAnchor(null);
    navigate(path);
  };

  const handleChangePasswordOpen = () => {
    setProfileMenuAnchor(null);
    setChangePasswordOpen(true);
    setPasswordError('');
    setPasswordSuccess('');
  };
  const handleChangePasswordClose = () => {
    setChangePasswordOpen(false);
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordError('');
    setPasswordSuccess('');
  };
  const handlePasswordInputChange = (field) => (e) =>
    setPasswordForm({ ...passwordForm, [field]: e.target.value });
  const togglePasswordVisibility = (field) =>
    setShowPasswords({ ...showPasswords, [field]: !showPasswords[field] });

  const validatePasswordForm = () => {
    if (!passwordForm.currentPassword) { setPasswordError('Current password is required'); return false; }
    if (!passwordForm.newPassword) { setPasswordError('New password is required'); return false; }
    if (passwordForm.newPassword.length < 6) { setPasswordError('New password must be at least 6 characters'); return false; }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { setPasswordError('New passwords do not match'); return false; }
    if (passwordForm.currentPassword === passwordForm.newPassword) { setPasswordError('New password must be different from current password'); return false; }
    return true;
  };
  const handleChangePassword = async () => {
    if (!validatePasswordForm()) return;
    setPasswordSaving(true);
    try {
      await changeUserPassword({
        username: user?.username || user?.employeeId,
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordSuccess('Password changed successfully!');
      setTimeout(() => handleChangePasswordClose(), 2000);
    } catch (err) {
      setPasswordError(err?.response?.data?.message || 'Failed to change password. Please try again.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleZoneClick = (zone) => {
    setSelectedZone(zone);
    setMode(0);
    setInferences([]);
    setHistoryCollapsed(false);
    loadZoneInferences(zone.zoneId);
  };
  const handleBackToZones = () => {
    setSelectedZone(null);
    setInferences([]);
    setHistoryCollapsed(false);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>

      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            backgroundColor: '#ffffff',
            borderRight: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            overflowX: 'hidden',
          },
        }}
      >
        {/* Logo */}
        <Box sx={{ p: 3, borderBottom: '1px solid #e2e8f0' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{
              width: 40, height: 40, backgroundColor: '#1976D2',
              borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
            }}>
              <Security sx={{ fontSize: 24 }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '14px', lineHeight: 1.3 }}>
              Model Inference
            </Typography>
          </Box>
        </Box>

        {/* Active Zones label */}
        <Box sx={{ px: 3, pt: 2.5, pb: 1 }}>
          <Typography variant="overline" sx={{ color: '#94a3b8', fontWeight: 700, fontSize: '11px', letterSpacing: '0.08em' }}>
            Active Zones
          </Typography>
        </Box>

        {/* Zone list */}
        <List sx={{ px: 1, pb: 1, flexGrow: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {activeZones.map((zone) => {
            const c = typeColorMap[zone.type] || { bg: '#f1f5f9', color: '#64748b' };
            const isSelected = selectedZone?.id === zone.id;
            return (
              <ListItem
                key={zone.id}
                button
                selected={isSelected}
                onClick={() => handleZoneClick(zone)}
                sx={{
                  mx: 1, mb: 0.5, borderRadius: '8px',
                  '&.Mui-selected': { backgroundColor: c.bg },
                  '&:hover': { backgroundColor: isSelected ? c.bg : '#f1f5f9' },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <Box sx={{
                    width: 28, height: 28, borderRadius: '7px',
                    backgroundColor: isSelected ? c.bg : '#f1f5f9',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: isSelected ? c.color : '#64748b',
                    border: isSelected ? `1.5px solid ${c.color}` : '1.5px solid transparent',
                  }}>
                    <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
                      <path d={zoneSvgPaths[zone.type] || zoneSvgPaths.Storage} />
                    </svg>
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primary={zone.name}
                  secondary={zone.type}
                  primaryTypographyProps={{
                    fontSize: '13px',
                    fontWeight: isSelected ? 600 : 400,
                    color: isSelected ? c.color : '#1e293b',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  secondaryTypographyProps={{
                    fontSize: '11px',
                    color: isSelected ? c.color : '#94a3b8',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                />
              </ListItem>
            );
          })}
        </List>
      </Drawer>

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, minHeight: '100vh', backgroundColor: '#f8fafc', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* Top AppBar */}
        <AppBar position="sticky" elevation={0} sx={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', zIndex: 1 }}>
          <Toolbar sx={{ justifyContent: 'space-between', minHeight: '64px !important', px: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {selectedZone && (
                <IconButton size="small" onClick={handleBackToZones} sx={{ mr: 0.5, color: '#64748b' }}>
                  <ArrowBack sx={{ fontSize: 20 }} />
                </IconButton>
              )}
              <Box sx={{
                width: 36, height: 36, borderRadius: '50%',
                backgroundColor: selectedZone ? (typeColorMap[selectedZone.type]?.bg || '#dbeafe') : '#dbeafe',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {selectedZone ? (
                  <svg viewBox="0 0 24 24" fill={typeColorMap[selectedZone.type]?.color || '#1976D2'} width="18" height="18">
                    <path d={zoneSvgPaths[selectedZone.type] || zoneSvgPaths.Storage} />
                  </svg>
                ) : (
                  <Dashboard sx={{ fontSize: 18, color: '#1976D2' }} />
                )}
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '16px', lineHeight: 1.2 }}>
                  {selectedZone ? selectedZone.name : 'Active Zones'}
                </Typography>
                {selectedZone && (
                  <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '11px' }}>
                    {selectedZone.type} Zone  AI Safety Monitoring
                  </Typography>
                )}
              </Box>
            </Box>
            <Button
              variant="text"
              onClick={handleOpenProfileMenu}
              sx={{
                textTransform: 'none',
                color: '#64748b',
                px: 1,
                borderRadius: '10px',
                minWidth: 0,
                '&:hover': { backgroundColor: '#f1f5f9' },
              }}
            >
              <Avatar sx={{ width: 32, height: 32, backgroundColor: '#dbeafe', color: '#1976D2', fontSize: '14px', mr: 1.25 }}>
                <Person sx={{ fontSize: 18 }} />
              </Avatar>
              <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
                Welcome, {user?.name || user?.username || user?.email || 'User'}
              </Typography>
            </Button>
          </Toolbar>
        </AppBar>

        <Menu
          anchorEl={profileMenuAnchor}
          open={Boolean(profileMenuAnchor)}
          onClose={handleCloseProfileMenu}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          PaperProps={{ sx: { borderRadius: '12px', minWidth: 220, mt: 1 } }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b' }}>
              {user?.name || user?.fullName || user?.username || 'User'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
              {user?.email || 'Account'}
            </Typography>
          </Box>
          <Divider />
          <MenuItem onClick={() => handleNavigateTo('/model-inference')} sx={{ py: 1.2 }}>
            <Dashboard sx={{ fontSize: 18, mr: 1.2, color: '#64748b' }} />
            Go to Model Inference
          </MenuItem>
          <MenuItem onClick={() => handleNavigateTo('/operations-dashboard')} sx={{ py: 1.2 }}>
            <Security sx={{ fontSize: 18, mr: 1.2, color: '#64748b' }} />
            Go to Operations Compliance
          </MenuItem>
          <MenuItem onClick={() => handleNavigateTo('/live-dashboard')} sx={{ py: 1.2 }}>
            <Videocam sx={{ fontSize: 18, mr: 1.2, color: '#64748b' }} />
            Go to Live Dashboard
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleChangePasswordOpen} sx={{ py: 1.2 }}>
            <Lock sx={{ fontSize: 18, mr: 1.2, color: '#64748b' }} />
            Change Password
          </MenuItem>
          <MenuItem onClick={handleLogout} sx={{ py: 1.2, color: '#dc2626' }}>
            <ExitToApp sx={{ fontSize: 18, mr: 1.2 }} />
            Logout
          </MenuItem>
        </Menu>

        {/* Zone Grid (home) */}
        {!selectedZone && (
          <Box sx={{ p: 4, flexGrow: 1 }}>
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b', mb: 0.5 }}>
                Active Zones
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b' }}>
                Select a zone to begin AI safety monitoring for that area.
              </Typography>
            </Box>

            <Grid container spacing={3}>
              {activeZones.map((zone) => {
                const c = typeColorMap[zone.type] || { bg: '#f1f5f9', color: '#64748b' };
                return (
                  <Grid item xs={12} sm={6} md={4} key={zone.id}>
                    <Card
                      elevation={0}
                      sx={{
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                        transition: 'all 0.2s ease',
                        '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', borderColor: c.color },
                        overflow: 'hidden',
                      }}
                    >
                      <CardActionArea onClick={() => handleZoneClick(zone)} sx={{ p: 0 }}>
                        <Box sx={{ height: 6, backgroundColor: c.color }} />
                        <CardContent sx={{ p: 3 }}>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                            <ZoneIconBox type={zone.type} size={60} />
                            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b', lineHeight: 1.3, mb: 0.5 }}>
                                {zone.name}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#64748b' }}>
                                {zone.zoneId}
                              </Typography>
                            </Box>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Chip label={zone.type} size="small" sx={{ backgroundColor: c.bg, color: c.color, fontWeight: 600, fontSize: '11px' }} />
                            <Chip label="Active" size="small" sx={{ backgroundColor: '#dcfce7', color: '#16a34a', fontWeight: 600, fontSize: '11px' }} />
                          </Box>
                          <Box sx={{ mt: 2.5, p: 1.5, borderRadius: '8px', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Security sx={{ fontSize: 16, color: '#1976D2' }} />
                            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>
                              Click to start AI monitoring
                            </Typography>
                          </Box>
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        )}

        {/* Zone Monitoring (inside a zone) */}
        {selectedZone && (
          <Box sx={{ flexGrow: 1 }}>

            {/* Assigned PPE Items */}
            {selectedZone && (() => {
              const ppeItems = selectedZone.items || [];
              return (
                <Box sx={{ px: 4, pt: 3, pb: 2, backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <Typography variant="overline" sx={{ color: '#94a3b8', fontWeight: 700, fontSize: '11px', letterSpacing: '0.08em', display: 'block', mb: 2, textAlign: 'center' }}>
                    Assigned PPE Items
                  </Typography>
                  {ppeItems.length === 0 ? (
                    <Typography variant="body2" sx={{ textAlign: 'center', color: '#94a3b8', py: 2 }}>
                      No PPE items assigned to this zone yet.
                    </Typography>
                  ) : (
                    <Grid container spacing={2} justifyContent="center">
                      {ppeItems.map((item) => {
                        const display = getPPEDisplay(item.category);
                        return (
                          <Grid item xs={6} sm={4} md={2} key={item._id || item.name}>
                            <Card elevation={0} sx={{ borderRadius: '16px', border: '1px solid #e2e8f0', textAlign: 'center', p: 2, backgroundColor: '#ffffff', transition: 'box-shadow 0.2s', '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,0.08)' } }}>
                              <Box sx={{ width: 64, height: 64, borderRadius: '14px', backgroundColor: display.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5, fontSize: '32px' }}>
                                {display.emoji}
                              </Box>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b', mb: 0.25 }}>{item.name}</Typography>
                              <Typography variant="caption" sx={{ color: '#1976D2', fontWeight: 500 }}>{item.category}</Typography>
                            </Card>
                          </Grid>
                        );
                      })}
                    </Grid>
                  )}
                </Box>
              );
            })()}

            {/* Mode Tabs */}
            <Box sx={{ pt: 3, pb: 0, backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0' }}>
              <Tabs
                value={mode}
                onChange={(_, v) => setMode(v)}
                centered
                sx={{ '& .MuiTab-root': { fontWeight: 600, fontSize: '14px', textTransform: 'none', minHeight: 48 } }}
              >
                <Tab icon={<CloudUpload sx={{ fontSize: 18 }} />} iconPosition="start" label="Upload Image" />
                <Tab icon={<Videocam sx={{ fontSize: 18 }} />} iconPosition="start" label="Live Webcam" />
                <Tab icon={<Schedule sx={{ fontSize: 18 }} />} iconPosition="start" label="CCTV / IP Camera" />
              </Tabs>
            </Box>

            {/* Mode 0: Upload Image */}
            {mode === 0 && (
              <Box sx={{ p: 4 }}>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', mb: 0.5 }}>
                    Manual Safety Scan  {selectedZone.name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    Upload a warehouse image to perform a one-time AI safety analysis for this zone.
                  </Typography>
                </Box>
                <UploadImage key={selectedZone?.zoneId} onInferenceComplete={addInference} zoneId={selectedZone?.zoneId} ppeItems={selectedZone?.items || []} />
              </Box>
            )}

            {/* Mode 1: Live Webcam */}
            {mode === 1 && (
              <Box sx={{ p: 4 }}>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', mb: 0.5 }}>
                    Live Webcam Monitoring
                  </Typography>
                </Box>
                <LiveStreamPanel
                  key={`webcam-${selectedZone?.id}`}
                  type="webcam"
                  ppeItems={selectedZone?.items || []}
                />
              </Box>
            )}

            {/* Mode 2: CCTV / IP Camera */}
            {mode === 2 && (
              <Box sx={{ p: 4 }}>
                
                <LiveStreamPanel
                  key={`cctv-${selectedZone?.id}`}
                  type="cctv"
                  ppeItems={selectedZone?.items || []}
                />
              </Box>
            )}

            {/* Safety Scan History */}
            <Box sx={{ px: 4, pb: 5 }}>
              <Box sx={{ mb: 2, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b' }}>Safety Scan History</Typography>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>Previous AI safety analyses for {selectedZone.name}.</Typography>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setHistoryCollapsed((prev) => !prev)}
                  endIcon={historyCollapsed ? <ExpandMore /> : <ExpandLess />}
                  sx={{
                    textTransform: 'none',
                    borderRadius: '8px',
                    minWidth: 130,
                    alignSelf: 'center',
                  }}
                >
                  {historyCollapsed ? 'Show History' : 'Hide History'}
                </Button>
              </Box>
              <Collapse in={!historyCollapsed} timeout="auto" unmountOnExit>
                <Card elevation={0} sx={{ borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <CardContent sx={{ p: 3 }}>
                    <InferenceTable inferences={zoneInferences} onDelete={deleteInference} />
                  </CardContent>
                </Card>
                <Typography variant="caption" sx={{ display: 'block', mt: 2, color: '#94a3b8', fontStyle: 'italic' }}>
                  AI decisions should be reviewed by a safety supervisor before disciplinary action.
                </Typography>
              </Collapse>
            </Box>
          </Box>
        )}
      </Box>

      {/* Change Password Dialog */}
      <Dialog open={changePasswordOpen} onClose={handleChangePasswordClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '12px', padding: '8px' } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Change Password</Typography>
          <IconButton onClick={handleChangePasswordClose} sx={{ color: '#64748b' }}><Close /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          {passwordError && <Alert severity="error" sx={{ mb: 2 }}>{passwordError}</Alert>}
          {passwordSuccess && <Alert severity="success" sx={{ mb: 2 }}>{passwordSuccess}</Alert>}
          {[
            { field: 'currentPassword', label: 'Current Password', key: 'current' },
            { field: 'newPassword', label: 'New Password', key: 'new' },
            { field: 'confirmPassword', label: 'Confirm New Password', key: 'confirm' },
          ].map(({ field, label, key }) => (
            <TextField
              key={field} fullWidth label={label} margin="normal" sx={{ mb: 2 }}
              type={showPasswords[key] ? 'text' : 'password'}
              value={passwordForm[field]}
              onChange={handlePasswordInputChange(field)}
              InputProps={{
                endAdornment: (
                  <IconButton onClick={() => togglePasswordVisibility(key)} edge="end">
                    {showPasswords[key] ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                ),
              }}
            />
          ))}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 2 }}>
          <Button onClick={handleChangePasswordClose} variant="outlined" sx={{ borderRadius: '8px', textTransform: 'none', minWidth: 100 }}>
            Cancel
          </Button>
          <Button
            onClick={handleChangePassword} variant="contained" disabled={passwordSuccess !== '' || passwordSaving}
            sx={{ borderRadius: '8px', textTransform: 'none', minWidth: 100, backgroundColor: '#1976D2', '&:hover': { backgroundColor: '#1565c0' } }}
          >
            {passwordSaving ? 'Saving...' : 'Change Password'}
          </Button>
        </DialogActions>
      </Dialog>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </Box>
  );
};

export default ModelInferenceDashboard;
