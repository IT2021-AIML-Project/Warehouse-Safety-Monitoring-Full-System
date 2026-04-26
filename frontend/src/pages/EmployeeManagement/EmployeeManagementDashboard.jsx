import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Typography,
  Avatar,
  Divider,
  Chip,
  Tabs,
  Tab,
  Tooltip,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Person,
  Lock,
  Badge,
  Email,
  Phone,
  Business,
  EditOutlined,
  CheckCircle,
  CameraAlt,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { changeEmployeePassword, updateEmployeeProfile } from '../../services/api';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import EmployeeDashboardHome from './EmployeeDashboardHome';
import EmployeeSupportInquiries from './EmployeeSupportInquiries';
import EmployeeNotificationsPage from './EmployeeNotificationsPage';
import EmployeeFeedbackPage from './EmployeeFeedbackPage';

// Notifications data
const INITIAL_NOTIFICATIONS = [];

const EmployeeManagementDashboard = () => {
  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileTab, setProfileTab] = useState(0);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', newPw: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [phone, setPhone] = useState(user?.phone || '+94 77 000 0000');
  const [phoneEditing, setPhoneEditing] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState('');
  const [phoneSuccess, setPhoneSuccess] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [photoSuccess, setPhotoSuccess] = useState(false);
  const photoInputRef = useRef(null);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [selectedNotifId, setSelectedNotifId] = useState(null);

  // Fetch employee notifications from API
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user?.id) return;
      try {
        const { getEmployeeNotifications } = await import('../../services/api');
        const res = await getEmployeeNotifications(user.id);
        setNotifications(res.data.notifications || []);
      } catch (err) {
        console.error('Failed to load notifications:', err);
      }
    };
    fetchNotifications();
  }, [user?.id]);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPhotoUrl(ev.target.result);
      setPhotoSuccess(true);
      setTimeout(() => setPhotoSuccess(false), 3000);
    };
    reader.readAsDataURL(file);
  };

  const handleMarkAllRead = async () => {
    try {
      const { markNotificationRead } = await import('../../services/api');
      const unread = notifications.filter(n => !n.read);
      await Promise.all(unread.map(n => markNotificationRead(n.id, user?.id)));
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error('Mark all read error:', err);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      const { markNotificationRead } = await import('../../services/api');
      await markNotificationRead(id, user?.id);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error('Mark read error:', err);
    }
  };

  const handleSeeAllNotifications = () => {
    setSelectedNotifId(null);
    setActiveTab(2);
  };

  const handleViewNotification = (id) => {
    setSelectedNotifId(id);
    setActiveTab(2);
    // Mark it as read when opening
    handleMarkRead(id);
  };

  const handleSavePhone = async () => {
    if (!phoneDraft.trim()) return;
    try {
      await updateEmployeeProfile(user?.id, { phone: phoneDraft.trim() });
      setPhone(phoneDraft.trim());
      setPhoneEditing(false);
      setPhoneSuccess(true);
      setTimeout(() => setPhoneSuccess(false), 3000);
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to update phone';
      setPhoneEditing(false);
      setPwError(msg);
      setTimeout(() => setPwError(''), 3000);
    }
  };

  const handleChangePassword = async () => {
    if (!passwords.current || !passwords.newPw || !passwords.confirm) {
      setPwError('All fields are required.'); return;
    }
    if (passwords.newPw !== passwords.confirm) {
      setPwError('New passwords do not match.'); return;
    }
    if (passwords.newPw.length < 6) {
      setPwError('Password must be at least 6 characters.'); return;
    }
    try {
      await changeEmployeePassword({
        employeeId: user?.employeeId || user?.username,
        currentPassword: passwords.current,
        newPassword: passwords.newPw,
      });
      setPwError('');
      setPwSuccess(true);
      setPasswords({ current: '', newPw: '', confirm: '' });
      setTimeout(() => setPwSuccess(false), 3000);
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to change password';
      setPwError(msg);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <Navbar
        user={user}
        onLogout={logout}
        onChangePassword={() => { setProfileOpen(true); setProfileTab(0); }}
        photoUrl={photoUrl}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        notifications={notifications}
        onMarkAllRead={handleMarkAllRead}
        onMarkRead={handleMarkRead}
        onSeeAllNotifications={handleSeeAllNotifications}
        onViewNotification={handleViewNotification}
      />

      <Box sx={{ flex: 1 }}>
        {activeTab === 0 && <EmployeeDashboardHome onGoToInquiries={() => setActiveTab(1)} />}
        {activeTab === 1 && <EmployeeSupportInquiries />}
        {activeTab === 2 && (
          <EmployeeNotificationsPage
            notifications={notifications}
            onMarkRead={handleMarkRead}
            onMarkAllRead={handleMarkAllRead}
            onBack={() => { setActiveTab(0); setSelectedNotifId(null); }}
            selectedNotifId={selectedNotifId}
          />
        )}
        {activeTab === 3 && <EmployeeFeedbackPage />}
      </Box>

      <Footer onProvideFeedback={() => setActiveTab(3)} />

      {/* ── Profile Dialog ── */}
      <Dialog
        open={profileOpen}
        onClose={() => { setProfileOpen(false); setPhoneEditing(false); }}
        PaperProps={{ sx: { borderRadius: '20px', minWidth: 500, overflow: 'hidden' } }}
      >
        {/* Header */}
        <Box sx={{ background: 'linear-gradient(135deg, #1e293b 0%, #2d3748 100%)', px: 4, py: 3.5, display: 'flex', alignItems: 'center', gap: 2.5 }}>
          {/* Clickable avatar upload */}
          <Tooltip title="Click to change photo" placement="bottom">
            <Box
              onClick={() => photoInputRef.current.click()}
              sx={{
                position: 'relative', cursor: 'pointer', flexShrink: 0,
                '&:hover .cam-overlay': { opacity: 1 },
              }}
            >
              <Avatar
                src={photoUrl || undefined}
                sx={{ width: 72, height: 72, fontSize: '28px', fontWeight: 800, background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#1e293b', border: '3px solid rgba(245,158,11,0.5)' }}
              >
                {!photoUrl && (user?.fullName || user?.username || 'E').charAt(0).toUpperCase()}
              </Avatar>
              {/* Camera overlay */}
              <Box
                className="cam-overlay"
                sx={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  backgroundColor: 'rgba(0,0,0,0.52)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  opacity: 0, transition: 'opacity 0.18s',
                }}
              >
                <CameraAlt sx={{ color: '#fff', fontSize: 22 }} />
                <Typography sx={{ color: '#fff', fontSize: '9px', fontWeight: 700, mt: 0.2 }}>CHANGE</Typography>
              </Box>
            </Box>
          </Tooltip>
          {/* Hidden file input */}
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handlePhotoChange}
          />
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 800, fontSize: '20px', color: '#fff' }}>
              {user?.fullName || user?.username || 'Employee'}
            </Typography>
            <Typography sx={{ fontSize: '13px', color: '#94a3b8', mt: 0.3 }}>
              {user?.email || 'employee@safetyfirst.lk'}
            </Typography>
            <Chip
              label={user?.role || 'Employee'}
              size="small"
              sx={{ mt: 0.8, backgroundColor: 'rgba(245,158,11,0.18)', color: '#f59e0b', fontWeight: 700, fontSize: '11px', border: 'none' }}
            />
          </Box>
        </Box>

        {/* Tabs */}
        <Tabs
          value={profileTab}
          onChange={(_, v) => { setProfileTab(v); setPwError(''); setPwSuccess(false); }}
          sx={{
            borderBottom: '1px solid #e2e8f0', px: 2,
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: '14px', minHeight: 48 },
            '& .Mui-selected': { color: '#d97706' },
            '& .MuiTabs-indicator': { backgroundColor: '#f59e0b', height: 3, borderRadius: '3px 3px 0 0' },
          }}
        >
          <Tab icon={<Person sx={{ fontSize: 18 }} />} iconPosition="start" label="Profile Details" />
          <Tab icon={<Lock sx={{ fontSize: 18 }} />} iconPosition="start" label="Change Password" />
        </Tabs>

        <DialogContent sx={{ px: 4, py: 3 }}>

          {/* ── Tab 0: Profile Details ── */}
          {profileTab === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: '15px', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <EditOutlined sx={{ color: '#d97706', fontSize: 18 }} /> Personal Information
              </Typography>

              {phoneSuccess && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, backgroundColor: '#dcfce7', borderRadius: '10px', px: 2, py: 1.5, border: '1px solid #bbf7d0' }}>
                  <CheckCircle sx={{ color: '#16a34a', fontSize: 18 }} />
                  <Typography sx={{ color: '#16a34a', fontSize: '13px', fontWeight: 600 }}>Phone number updated successfully!</Typography>
                </Box>
              )}
              {photoSuccess && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, backgroundColor: '#dcfce7', borderRadius: '10px', px: 2, py: 1.5, border: '1px solid #bbf7d0' }}>
                  <CheckCircle sx={{ color: '#16a34a', fontSize: 18 }} />
                  <Typography sx={{ color: '#16a34a', fontSize: '13px', fontWeight: 600 }}>Profile photo updated successfully!</Typography>
                </Box>
              )}

              {[
                { icon: Person, label: 'Full Name', value: user?.fullName || user?.username || '—' },
                { icon: Badge, label: 'Employee ID', value: user?.employeeId || 'EMP-001' },
                { icon: Email, label: 'Email', value: user?.email || 'employee@safetyfirst.lk' },
                { icon: Business, label: 'Department', value: user?.department || 'Warehouse Operations' },
              ].map(({ icon: RowIcon, label, value }) => (
                <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.8, borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <Box sx={{ width: 38, height: 38, borderRadius: '10px', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <RowIcon sx={{ fontSize: 19, color: '#d97706' }} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</Typography>
                    <Typography sx={{ fontSize: '14px', color: '#1e293b', fontWeight: 600 }}>{value}</Typography>
                  </Box>
                </Box>
              ))}

              {/* Editable Phone row */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.8, borderRadius: '12px', backgroundColor: phoneEditing ? '#fffbeb' : '#f8fafc', border: `1px solid ${phoneEditing ? '#f59e0b' : '#e2e8f0'}`, transition: 'all 0.15s' }}>
                <Box sx={{ width: 38, height: 38, borderRadius: '10px', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Phone sx={{ fontSize: 19, color: '#d97706' }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.3 }}>Phone</Typography>
                  {phoneEditing ? (
                    <TextField
                      autoFocus
                      size="small"
                      value={phoneDraft}
                      onChange={(e) => setPhoneDraft(e.target.value)}
                      placeholder="+94 77 000 0000"
                      variant="standard"
                      sx={{
                        width: '100%',
                        '& .MuiInput-root': { fontSize: '14px', fontWeight: 600, color: '#1e293b' },
                        '& .MuiInput-root:before': { borderBottomColor: '#f59e0b' },
                        '& .MuiInput-root:after': { borderBottomColor: '#d97706' },
                      }}
                    />
                  ) : (
                    <Typography sx={{ fontSize: '14px', color: '#1e293b', fontWeight: 600 }}>{phone}</Typography>
                  )}
                </Box>
                {phoneEditing ? (
                  <Box sx={{ display: 'flex', gap: 0.8 }}>
                    <Button
                      size="small"
                      onClick={handleSavePhone}
                      sx={{ textTransform: 'none', fontSize: '12px', fontWeight: 700, backgroundColor: '#f59e0b', color: '#1e293b', borderRadius: '7px', px: 1.5, minWidth: 0, '&:hover': { backgroundColor: '#d97706' } }}
                    >
                      Save
                    </Button>
                    <Button
                      size="small"
                      onClick={() => setPhoneEditing(false)}
                      sx={{ textTransform: 'none', fontSize: '12px', fontWeight: 600, color: '#64748b', borderRadius: '7px', px: 1.2, minWidth: 0 }}
                    >
                      Cancel
                    </Button>
                  </Box>
                ) : (
                  <Button
                    size="small"
                    onClick={() => { setPhoneDraft(phone); setPhoneEditing(true); }}
                    sx={{ textTransform: 'none', fontSize: '12px', fontWeight: 600, color: '#d97706', borderRadius: '7px', px: 1.5, minWidth: 0, border: '1px solid #fcd34d', '&:hover': { backgroundColor: '#fef3c7' } }}
                  >
                    Edit
                  </Button>
                )}
              </Box>
            </Box>
          )}

          {/* ── Tab 1: Change Password ── */}
          {profileTab === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: '15px', mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Lock sx={{ color: '#d97706', fontSize: 18 }} /> Update Password
              </Typography>

              {pwSuccess && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, backgroundColor: '#dcfce7', borderRadius: '10px', px: 2, py: 1.5, border: '1px solid #bbf7d0' }}>
                  <CheckCircle sx={{ color: '#16a34a', fontSize: 18 }} />
                  <Typography sx={{ color: '#16a34a', fontSize: '13px', fontWeight: 600 }}>Password updated successfully!</Typography>
                </Box>
              )}
              {pwError && (
                <Box sx={{ backgroundColor: '#fee2e2', borderRadius: '10px', px: 2, py: 1.5, border: '1px solid #fecaca' }}>
                  <Typography sx={{ color: '#dc2626', fontSize: '13px', fontWeight: 600 }}>{pwError}</Typography>
                </Box>
              )}

              {[
                { label: 'Current Password', key: 'current', show: showCurrent, toggle: () => setShowCurrent(!showCurrent) },
                { label: 'New Password', key: 'newPw', show: showNew, toggle: () => setShowNew(!showNew) },
                { label: 'Confirm New Password', key: 'confirm', show: showConfirm, toggle: () => setShowConfirm(!showConfirm) },
              ].map(({ label, key, show, toggle }) => (
                <TextField
                  key={key}
                  label={label}
                  type={show ? 'text' : 'password'}
                  size="small"
                  fullWidth
                  value={passwords[key]}
                  onChange={(e) => setPasswords((p) => ({ ...p, [key]: e.target.value }))}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={toggle}>
                          {show ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: '#f59e0b' },
                    '& .MuiInputLabel-root.Mui-focused': { color: '#d97706' },
                  }}
                />
              ))}
            </Box>
          )}
        </DialogContent>

        <Divider />
        <DialogActions sx={{ px: 4, py: 2.5, gap: 1.5 }}>
          <Button
            onClick={() => { setProfileOpen(false); setPwError(''); setPwSuccess(false); setPhoneEditing(false); }}
            sx={{ textTransform: 'none', color: '#64748b', fontWeight: 600, borderRadius: '8px' }}
          >
            Close
          </Button>
          {profileTab === 1 && (
            <Button
              onClick={handleChangePassword}
              variant="contained"
              sx={{ textTransform: 'none', fontWeight: 700, backgroundColor: '#f59e0b', color: '#1e293b', borderRadius: '8px', px: 3, '&:hover': { backgroundColor: '#d97706' } }}
            >
              Update Password
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EmployeeManagementDashboard;
