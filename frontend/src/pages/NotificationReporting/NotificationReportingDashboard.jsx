import React, { useState, useEffect } from 'react';
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
  Close,
  Visibility as VisibilityIcon,
  VisibilityOff,
  Campaign,
  Send,
  History,
  AdminPanelSettings,
  Feedback,
  Email,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import SendNotificationForm from './SendNotificationForm';
import SentNotificationsList from './SentNotificationsList';
import AdminNotificationsPage from './AdminNotificationsPage';
import EmployeeFeedbacksView from './EmployeeFeedbacksView';
import SendEmailForm from './SendEmailForm';

const drawerWidth = 260;

const navItems = [
  { label: 'Send Notification',   icon: Send               },
  { label: 'Sent Notifications',  icon: History            },
  { label: 'Admin Notifications', icon: AdminPanelSettings },
  { label: 'Employee Feedbacks',  icon: Feedback           },
  { label: 'Send Email',          icon: Email              },
];

const NotificationReportingDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab]       = useState(0); // 0 = Send Notification
  const [sentNotifications, setSentNotifications] = useState([]);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  // Fetch sent notifications from API on mount
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { getAllNotifications } = await import('../../services/api');
        const res = await getAllNotifications();
        setSentNotifications(res.data.notifications || []);
      } catch (err) {
        console.error('Failed to load notifications:', err);
      }
    };
    fetchNotifications();
  }, []);

  const handleNotificationSent = (notification) => {
    setSentNotifications((prev) => [notification, ...prev]);
  };

  const handleDeleteNotification = async (id) => {
    try {
      const { deleteNotification } = await import('../../services/api');
      await deleteNotification(id);
      setSentNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error('Delete notification error:', err);
    }
  };

  const handleEditNotification = async (updated) => {
    try {
      const { updateNotification } = await import('../../services/api');
      await updateNotification(updated.id, {
        title: updated.title,
        message: updated.message,
        severity: updated.severity,
      });
      setSentNotifications((prev) => prev.map((n) => (n.id === updated.id ? { ...n, ...updated } : n)));
    } catch (err) {
      console.error('Edit notification error:', err);
    }
  };
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [passwordError, setPasswordError]   = useState('');
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
    if (!passwordForm.newPassword)     { setPasswordError('New password is required'); return false; }
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
                backgroundColor: '#ef4444',
                borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
              }}
            >
              <Campaign sx={{ fontSize: 22 }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '13px', lineHeight: 1.3 }}>
              Notification &amp; Reporting
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
                  mx: 1.5, mb: 0.5, borderRadius: '8px',
                  '&.Mui-selected': {
                    backgroundColor: '#fef2f2', color: '#ef4444',
                    '& .MuiListItemIcon-root': { color: '#ef4444' },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <IconComp sx={{ color: activeTab === index ? '#ef4444' : '#64748b', fontSize: 20 }} />
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ fontWeight: activeTab === index ? 600 : 400, fontSize: '13px' }}
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
            sx={{ mb: 1, borderRadius: '8px', textTransform: 'none', fontSize: '13px', borderColor: '#ef4444', color: '#ef4444' }}
          >
            Change Password
          </Button>
          <Button
            fullWidth variant="contained" startIcon={<ExitToApp />}
            onClick={handleLogout}
            sx={{ borderRadius: '8px', backgroundColor: '#ef4444', textTransform: 'none', fontSize: '13px', '&:hover': { backgroundColor: '#dc2626' } }}
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
        <AppBar position="sticky" elevation={0} sx={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', zIndex: 1 }}>
          <Toolbar sx={{ justifyContent: 'space-between', minHeight: '64px !important', px: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '18px' }}>
                {navItems[activeTab]?.label}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ width: 32, height: 32, backgroundColor: '#fef2f2', color: '#ef4444', fontSize: '14px' }}>
                <Person sx={{ fontSize: 18 }} />
              </Avatar>
              <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
                Welcome, {user?.name || user?.username || user?.email || 'Officer'}
              </Typography>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Pages */}
        {activeTab === 0 && (
          <SendNotificationForm
            onNotificationSent={(notif) => {
              handleNotificationSent(notif);
              setActiveTab(1);
            }}
          />
        )}
        {activeTab === 1 && (
          <SentNotificationsList
            notifications={sentNotifications}
            onDelete={handleDeleteNotification}
            onEdit={handleEditNotification}
          />
        )}
        {activeTab === 2 && <AdminNotificationsPage />}
        {activeTab === 3 && <EmployeeFeedbacksView />}
        {activeTab === 4 && <SendEmailForm />}
      </Box>

      {/* ── Change Password Dialog ── */}
      <Dialog open={changePasswordOpen} onClose={handleChangePasswordClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '12px', padding: '8px' } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Change Password</Typography>
          <IconButton onClick={handleChangePasswordClose} sx={{ color: '#64748b' }}><Close /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          {passwordError   && <Alert severity="error"   sx={{ mb: 2 }}>{passwordError}</Alert>}
          {passwordSuccess && <Alert severity="success" sx={{ mb: 2 }}>{passwordSuccess}</Alert>}
          {[
            { field: 'currentPassword', label: 'Current Password',     key: 'current' },
            { field: 'newPassword',     label: 'New Password',         key: 'new'     },
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
                    {showPasswords[key] ? <VisibilityOff /> : <VisibilityIcon />}
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
            sx={{ borderRadius: '8px', textTransform: 'none', minWidth: 100, backgroundColor: '#ef4444', '&:hover': { backgroundColor: '#dc2626' } }}
          >
            Change Password
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NotificationReportingDashboard;
