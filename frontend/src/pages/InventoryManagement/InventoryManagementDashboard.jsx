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
  Lock,
  Person,
  Dashboard,
  Inventory,
  AddBox,
  LocationOn,
  Close,
  Visibility,
  VisibilityOff,
  HeadsetMic,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import InventoryDashboardHome from './InventoryDashboardHome';
import CurrentZones from './CurrentZones';
import AddPPEItem from './AddPPEItem';
import InventorySupportInquiries from './InventorySupportInquiries';

const drawerWidth = 240;

const pageMeta = [
  { label: 'Dashboard',          icon: <Dashboard   sx={{ fontSize: 20, color: '#3b82f6' }} /> },
  { label: 'Current Zones',      icon: <LocationOn  sx={{ fontSize: 20, color: '#3b82f6' }} /> },
  { label: 'Add PPE Items',      icon: <AddBox      sx={{ fontSize: 20, color: '#3b82f6' }} /> },
  { label: 'Support Inquiries',  icon: <HeadsetMic  sx={{ fontSize: 20, color: '#16a34a' }} /> },
];

const navItems = [
  { label: 'Dashboard',         icon: Dashboard,  color: '#3b82f6' },
  { label: 'Current Zones',     icon: LocationOn, color: '#3b82f6' },
  { label: 'Add PPE Items',     icon: AddBox,     color: '#3b82f6' },
  { label: 'Support Inquiries', icon: HeadsetMic, color: '#16a34a' },
];

const InventoryManagementDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(0);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const handleLogout = () => { logout(); navigate('/'); };

  const handleChangePasswordOpen = () => {
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
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setPasswordSuccess('Password changed successfully!');
      setTimeout(() => handleChangePasswordClose(), 2000);
    } catch {
      setPasswordError('Failed to change password. Please try again.');
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>

      {/* ── Sidebar ── */}
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
        {/* Logo */}
        <Box sx={{ p: 3, borderBottom: '1px solid #e2e8f0' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 40, height: 40,
                backgroundColor: '#16a34a',
                borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
              }}
            >
              <Inventory sx={{ fontSize: 24 }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '15px' }}>
              Inventory Manager
            </Typography>
          </Box>
        </Box>

        {/* Nav */}
        <List sx={{ pt: 2 }}>
          {navItems.map((item, index) => {
            const IconComp = item.icon;
            return (
              <ListItem
                key={index}
                button
                selected={activeTab === index}
                onClick={() => setActiveTab(index)}
                sx={{
                  mx: 2, mb: 1, borderRadius: '8px',
                  '&.Mui-selected': {
                    backgroundColor: '#dcfce7', color: '#16a34a',
                    '& .MuiListItemIcon-root': { color: '#16a34a' },
                  },
                }}
              >
                <ListItemIcon>
                  <IconComp sx={{ color: activeTab === index ? '#16a34a' : '#64748b' }} />
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ fontWeight: activeTab === index ? 600 : 400, fontSize: '14px' }}
                />
              </ListItem>
            );
          })}
        </List>

        {/* Bottom buttons */}
        <Box sx={{ mt: 'auto', p: 2, borderTop: '1px solid #e2e8f0' }}>
          <Button
            fullWidth variant="outlined" startIcon={<Lock />}
            onClick={handleChangePasswordOpen}
            sx={{ mb: 1, borderRadius: '8px', textTransform: 'none', fontSize: '14px' }}
          >
            Change Password
          </Button>
          <Button
            fullWidth variant="contained" startIcon={<ExitToApp />}
            onClick={handleLogout}
            sx={{
              borderRadius: '8px', backgroundColor: '#ef4444',
              textTransform: 'none', fontSize: '14px',
              '&:hover': { backgroundColor: '#dc2626' },
            }}
          >
            Logout
          </Button>
        </Box>
      </Drawer>

      {/* ── Main Content ── */}
      <Box
        component="main"
        sx={{ flexGrow: 1, minHeight: '100vh', backgroundColor: '#f8fafc', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
      >
        {/* Top AppBar */}
        <AppBar
          position="sticky" elevation={0}
          sx={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', zIndex: 1 }}
        >
          <Toolbar sx={{ justifyContent: 'space-between', minHeight: '64px !important', px: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 36, height: 36, borderRadius: '50%',
                  backgroundColor: '#dcfce7',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {pageMeta[activeTab]?.icon}
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '18px' }}>
                {pageMeta[activeTab]?.label}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ width: 32, height: 32, backgroundColor: '#dcfce7', color: '#16a34a', fontSize: '14px' }}>
                <Person sx={{ fontSize: 18 }} />
              </Avatar>
              <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
                Welcome, {user?.name || user?.username || user?.email || 'Manager'}
              </Typography>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Pages */}
        {activeTab === 0 && <InventoryDashboardHome />}
        {activeTab === 1 && <CurrentZones />}
        {activeTab === 2 && <AddPPEItem />}
        {activeTab === 3 && <InventorySupportInquiries />}
      </Box>

      {/* ── Change Password Dialog ── */}
      <Dialog
        open={changePasswordOpen} onClose={handleChangePasswordClose}
        maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: '12px', padding: '8px' } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Change Password</Typography>
          <IconButton onClick={handleChangePasswordClose} sx={{ color: '#64748b' }}><Close /></IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 1 }}>
          {passwordError   && <Alert severity="error"   sx={{ mb: 2 }}>{passwordError}</Alert>}
          {passwordSuccess && <Alert severity="success" sx={{ mb: 2 }}>{passwordSuccess}</Alert>}

          {[
            { field: 'currentPassword', label: 'Current Password', key: 'current' },
            { field: 'newPassword',     label: 'New Password',     key: 'new'     },
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
            onClick={handleChangePassword} variant="contained" disabled={passwordSuccess !== ''}
            sx={{ borderRadius: '8px', textTransform: 'none', minWidth: 100, backgroundColor: '#16a34a', '&:hover': { backgroundColor: '#15803d' } }}
          >
            Change Password
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InventoryManagementDashboard;
