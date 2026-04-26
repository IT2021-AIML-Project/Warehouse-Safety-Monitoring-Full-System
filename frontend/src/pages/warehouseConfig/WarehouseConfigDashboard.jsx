import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
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
} from '@mui/material';
import {
  ExitToApp,
  Warehouse,
  Lock,
  Add,
  Person,
  PersonAdd,
  Dashboard,
  ViewList,
  Close,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import AllZones from './AllZones';
import AllEmployees from './AllEmployees';
import CreateZone from './CreateZone';
import EmployeeRegister from './EmployeeRegister';
import DashboardHome from './DashboardHome';

const WarehouseConfigDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // Tab management
  const [activeTab, setActiveTab] = useState(0);
  
  // Change password dialog state
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleChangePasswordOpen = () => {
    setChangePasswordOpen(true);
    setPasswordError('');
    setPasswordSuccess('');
  };

  const handleChangePasswordClose = () => {
    setChangePasswordOpen(false);
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setPasswordError('');
    setPasswordSuccess('');
  };

  const handlePasswordInputChange = (field) => (event) => {
    setPasswordForm({
      ...passwordForm,
      [field]: event.target.value
    });
    setPasswordError('');
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords({
      ...showPasswords,
      [field]: !showPasswords[field]
    });
  };

  const validatePasswordForm = () => {
    if (!passwordForm.currentPassword) {
      setPasswordError('Current password is required');
      return false;
    }
    if (!passwordForm.newPassword) {
      setPasswordError('New password is required');
      return false;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return false;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match');
      return false;
    }
    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setPasswordError('New password must be different from current password');
      return false;
    }
    return true;
  };

  const handleChangePassword = async () => {
    if (!validatePasswordForm()) {
      return;
    }

    try {
      // TODO: Integrate with backend changePassword API endpoint
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setPasswordSuccess('Password changed successfully!');
      setTimeout(() => {
        handleChangePasswordClose();
      }, 2000);
    } catch (error) {
      setPasswordError('Failed to change password. Please try again.');
    }
  };

  const drawerWidth = 240;

  const pageMeta = [
    { label: 'Dashboard',         icon: <Dashboard sx={{ fontSize: 20, color: '#3b82f6' }} /> },
    { label: 'Warehouse Zones',   icon: <ViewList   sx={{ fontSize: 20, color: '#3b82f6' }} /> },
    { label: 'All Employees',     icon: <Person     sx={{ fontSize: 20, color: '#3b82f6' }} /> },
    { label: 'Create Zone',       icon: <Add        sx={{ fontSize: 20, color: '#3b82f6' }} /> },
    { label: 'Employee Register', icon: <PersonAdd  sx={{ fontSize: 20, color: '#3b82f6' }} /> },
  ];

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Sidebar Navigation */}
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
          },
        }}
      >
        {/* Logo/Header */}
        <Box sx={{ p: 3, borderBottom: '1px solid #e2e8f0' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                backgroundColor: '#3b82f6',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
              }}
            >
              <Warehouse sx={{ fontSize: 24 }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
              Warehouse Manager
            </Typography>
          </Box>
        </Box>

        {/* Navigation Menu */}
        <List sx={{ pt: 2 }}>
          <ListItem 
            button 
            selected={activeTab === 0}
            onClick={() => setActiveTab(0)}
            sx={{
              mx: 2,
              mb: 1,
              borderRadius: '8px',
              '&.Mui-selected': {
                backgroundColor: '#dbeafe',
                color: '#1d4ed8',
                '& .MuiListItemIcon-root': {
                  color: '#1d4ed8',
                },
              },
            }}
          >
            <ListItemIcon>
              <Dashboard sx={{ color: activeTab === 0 ? '#1d4ed8' : '#64748b' }} />
            </ListItemIcon>
            <ListItemText 
              primary="Dashboard" 
              primaryTypographyProps={{
                fontWeight: activeTab === 0 ? 600 : 400,
                fontSize: '14px',
              }}
            />
          </ListItem>
          
          <ListItem 
            button 
            selected={activeTab === 1}
            onClick={() => setActiveTab(1)}
            sx={{
              mx: 2,
              mb: 1,
              borderRadius: '8px',
              '&.Mui-selected': {
                backgroundColor: '#dbeafe',
                color: '#1d4ed8',
                '& .MuiListItemIcon-root': {
                  color: '#1d4ed8',
                },
              },
            }}
          >
            <ListItemIcon>
              <ViewList sx={{ color: activeTab === 1 ? '#1d4ed8' : '#64748b' }} />
            </ListItemIcon>
            <ListItemText 
              primary="Warehouse zones" 
              primaryTypographyProps={{
                fontWeight: activeTab === 1 ? 600 : 400,
                fontSize: '14px',
              }}
            />
          </ListItem>

          <ListItem 
            button 
            selected={activeTab === 2}
            onClick={() => setActiveTab(2)}
            sx={{
              mx: 2,
              mb: 1,
              borderRadius: '8px',
              '&.Mui-selected': {
                backgroundColor: '#dbeafe',
                color: '#1d4ed8',
                '& .MuiListItemIcon-root': {
                  color: '#1d4ed8',
                },
              },
            }}
          >
            <ListItemIcon>
              <Person sx={{ color: activeTab === 2 ? '#1d4ed8' : '#64748b' }} />
            </ListItemIcon>
            <ListItemText 
              primary="All Employees" 
              primaryTypographyProps={{
                fontWeight: activeTab === 2 ? 600 : 400,
                fontSize: '14px',
              }}
            />
          </ListItem>
          
          <ListItem 
            button 
            selected={activeTab === 3}
            onClick={() => setActiveTab(3)}
            sx={{
              mx: 2,
              mb: 1,
              borderRadius: '8px',
              '&.Mui-selected': {
                backgroundColor: '#dbeafe',
                color: '#1d4ed8',
                '& .MuiListItemIcon-root': {
                  color: '#1d4ed8',
                },
              },
            }}
          >
            <ListItemIcon>
              <Add sx={{ color: activeTab === 3 ? '#1d4ed8' : '#64748b' }} />
            </ListItemIcon>
            <ListItemText 
              primary="Create Zone" 
              primaryTypographyProps={{
                fontWeight: activeTab === 3 ? 600 : 400,
                fontSize: '14px',
              }}
            />
          </ListItem>

          <ListItem 
            button 
            selected={activeTab === 4}
            onClick={() => setActiveTab(4)}
            sx={{
              mx: 2,
              mb: 1,
              borderRadius: '8px',
              '&.Mui-selected': {
                backgroundColor: '#dbeafe',
                color: '#1d4ed8',
                '& .MuiListItemIcon-root': {
                  color: '#1d4ed8',
                },
              },
            }}
          >
            <ListItemIcon>
              <PersonAdd sx={{ color: activeTab === 4 ? '#1d4ed8' : '#64748b' }} />
            </ListItemIcon>
            <ListItemText 
              primary="Employee Register" 
              primaryTypographyProps={{
                fontWeight: activeTab === 4 ? 600 : 400,
                fontSize: '14px',
              }}
            />
          </ListItem>
        </List>

        <Box sx={{ mt: 'auto', p: 2, borderTop: '1px solid #e2e8f0' }}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<Lock />}
            onClick={handleChangePasswordOpen}
            sx={{ 
              mb: 1, 
              borderRadius: '8px',
              textTransform: 'none',
              fontSize: '14px',
            }}
          >
            Change Password
          </Button>
          <Button
            fullWidth
            variant="contained"
            startIcon={<ExitToApp />}
            onClick={handleLogout}
            sx={{
              borderRadius: '8px',
              backgroundColor: '#ef4444',
              textTransform: 'none',
              fontSize: '14px',
              '&:hover': {
                backgroundColor: '#dc2626',
              },
            }}
          >
            Logout
          </Button>
        </Box>
      </Drawer>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: '100vh',
          backgroundColor: '#f8fafc',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Top Navbar */}
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            zIndex: 1,
          }}
        >
          <Toolbar sx={{ justifyContent: 'space-between', minHeight: '64px !important', px: 3 }}>
            {/* Left: page icon + title */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  backgroundColor: '#dbeafe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {pageMeta[activeTab]?.icon}
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '18px' }}>
                {pageMeta[activeTab]?.label}
              </Typography>
            </Box>

            {/* Right: welcome + avatar */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  backgroundColor: '#dbeafe',
                  color: '#1d4ed8',
                  fontSize: '14px',
                }}
              >
                <Person sx={{ fontSize: 18 }} />
              </Avatar>
              <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
                Welcome, {user?.name || user?.username || user?.email || 'Manager'}
              </Typography>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Page Content */}
        {activeTab === 0 && <DashboardHome />}
        {activeTab === 1 && <AllZones />}
        {activeTab === 2 && <AllEmployees />}
        {activeTab === 3 && <CreateZone />}
        {activeTab === 4 && <EmployeeRegister />}
      </Box>

      {/* Change Password Dialog */}
      <Dialog 
        open={changePasswordOpen} 
        onClose={handleChangePasswordClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '12px',
            padding: '8px'
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          pb: 2
        }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Change Password
          </Typography>
          <IconButton 
            onClick={handleChangePasswordClose}
            sx={{ color: '#64748b' }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ pt: 1 }}>
          {passwordError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {passwordError}
            </Alert>
          )}
          {passwordSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {passwordSuccess}
            </Alert>
          )}
          
          <TextField
            fullWidth
            label="Current Password"
            type={showPasswords.current ? 'text' : 'password'}
            value={passwordForm.currentPassword}
            onChange={handlePasswordInputChange('currentPassword')}
            variant="outlined"
            margin="normal"
            InputProps={{
              endAdornment: (
                <IconButton
                  onClick={() => togglePasswordVisibility('current')}
                  edge="end"
                >
                  {showPasswords.current ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              ),
            }}
            sx={{ mb: 2 }}
          />
          
          <TextField
            fullWidth
            label="New Password"
            type={showPasswords.new ? 'text' : 'password'}
            value={passwordForm.newPassword}
            onChange={handlePasswordInputChange('newPassword')}
            variant="outlined"
            margin="normal"
            InputProps={{
              endAdornment: (
                <IconButton
                  onClick={() => togglePasswordVisibility('new')}
                  edge="end"
                >
                  {showPasswords.new ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              ),
            }}
            sx={{ mb: 2 }}
          />
          
          <TextField
            fullWidth
            label="Confirm New Password"
            type={showPasswords.confirm ? 'text' : 'password'}
            value={passwordForm.confirmPassword}
            onChange={handlePasswordInputChange('confirmPassword')}
            variant="outlined"
            margin="normal"
            InputProps={{
              endAdornment: (
                <IconButton
                  onClick={() => togglePasswordVisibility('confirm')}
                  edge="end"
                >
                  {showPasswords.confirm ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              ),
            }}
          />
        </DialogContent>
        
        <DialogActions sx={{ px: 3, pb: 3, pt: 2 }}>
          <Button 
            onClick={handleChangePasswordClose}
            variant="outlined"
            sx={{ 
              borderRadius: '8px',
              textTransform: 'none',
              minWidth: '100px'
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleChangePassword}
            variant="contained"
            sx={{ 
              borderRadius: '8px',
              textTransform: 'none',
              minWidth: '100px',
              backgroundColor: '#1d4ed8',
              '&:hover': {
                backgroundColor: '#1e40af',
              },
            }}
            disabled={passwordSuccess !== ''}
          >
            Change Password
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WarehouseConfigDashboard;