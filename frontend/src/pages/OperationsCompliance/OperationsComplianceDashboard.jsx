import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  Paper,
  Chip,
  CircularProgress,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  ExitToApp,
  Lock,
  Person,
  Close,
  Visibility,
  VisibilityOff,
  Warning,
  AccessTime,
  CalendarMonth,
  ShowChart,
  Assignment,
  Sensors,
  InfoOutlined,
  BarChart as BarChartIcon,
  FiberManualRecord,
  Dashboard,
  Shield,
  Videocam,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  getAllInferences,
  getDateRangeReport,
  getHourlyReport,
  getLiveSummary,
} from '../../services/api';
import { ViolationsTable } from './ViolationsTable';
import { DailyReportsView } from './DailyReportsView';
import { MonthlyReportsView } from './MonthlyReportsView';
import { AnalyticsView, ChartCard } from './AnalyticsView';

const drawerWidth = 260;
const tooltipStyle = { backgroundColor: '#fff', border: '2px solid #BDE8F5', borderRadius: 12, padding: 12 };

const pageMeta = [
  { label: 'Daily Reports', icon: <AccessTime sx={{ fontSize: 20, color: '#7c3aed' }} /> },
  { label: 'Monthly Reports', icon: <CalendarMonth sx={{ fontSize: 20, color: '#7c3aed' }} /> },
  { label: 'Analytics', icon: <ShowChart sx={{ fontSize: 20, color: '#7c3aed' }} /> },
  { label: 'Violations Log', icon: <Warning sx={{ fontSize: 20, color: '#7c3aed' }} /> },
];

const navItems = [
  { label: 'Daily Reports', Icon: AccessTime },
  { label: 'Monthly Reports', Icon: CalendarMonth },
  { label: 'Analytics', Icon: ShowChart },
  { label: 'Violations Log', Icon: Warning },
];

function toLocalTimeLabel(ts) {
  if (!ts) return '--:--';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function scoreColor(score) {
  if (score >= 95) return '#22C55E';
  if (score >= 80) return '#EAB308';
  return '#EF4444';
}

const OperationsComplianceDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const [dailyMetrics, setDailyMetrics] = useState({ violations: 0, complianceScore: 0, safetyScore: 0, totalPeople: 0 });
  const [monthlyMetrics, setMonthlyMetrics] = useState({ violations: 0, avgComplianceScore: 0, avgSafetyScore: 0, totalPeople: 0 });

  const [violations, setViolations] = useState([]);
  const [hourlyData, setHourlyData] = useState([]);
  const [dailyData, setDailyData] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const handleUpdateViolation = (updated) =>
    setViolations((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
  const handleDeleteViolation = (id) =>
    setViolations((prev) => prev.filter((v) => v.id !== id));
  const handleAddViolation = (newV) =>
    setViolations((prev) => [newV, ...prev]);

  const loadSummary = useCallback(async () => {
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    try {
      const res = await getLiveSummary(since);
      const data = res.data || {};
      const next = {
        violations: Number(data.total_violations || 0),
        complianceScore: Number(data.compliance_score || 0),
        safetyScore: Number(data.safety_score || 0),
        totalPeople: Number(data.total_persons || 0),
      };
      setDailyMetrics(next);
      setLastUpdated(data.last_updated || null);
      setSummaryError('');
    } catch (err) {
      setSummaryError(err?.response?.data?.message || 'Failed to fetch live summary');
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const loadRecentWindowsAndViolations = useCallback(async () => {
    try {
      const res = await getAllInferences();
      const all = Array.isArray(res?.data?.inferences) ? res.data.inferences : [];
      const live = all
        .filter((inf) => ['webcam', 'cctv'].includes(String(inf.source_type || '').toLowerCase()))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      const flattened = live
        .flatMap((inf) => (inf.violations || []).map((v, idx) => ({
          id: v.violation_id || `${inf.inference_id}-${idx}`,
          date: inf.timestamp ? new Date(inf.timestamp).toISOString().slice(0, 10) : '',
          employee: 'N/A',
          section: inf.zone_id || inf.camera_id || 'Unassigned',
          type: v.violation_type || 'Unknown Violation',
          confidence: Math.round((Number(v.confidence || 0)) * 100),
          status: 'Pending',
          timestamp: v.created_at || inf.timestamp,
          severity: v.severity || 'Low',
          inference_id: inf.inference_id,
        })))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 50);

      setViolations(flattened);
    } catch {
      // keep last known UI data
    }
  }, []);

  const loadAnalytics = useCallback(async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const hourlyRes = await getHourlyReport(today);
      const hourlyRows = Array.isArray(hourlyRes.data) ? hourlyRes.data : [];
      setHourlyData(hourlyRows.map((r) => ({
        hour: r.hour,
        violations: Number(r.violations || 0),
        complianceScore: Number(r.safety_score || 0),
      })));

      const end = new Date();
      const start = new Date(end.getTime() - 6 * 24 * 60 * 60 * 1000);
      const startIso = start.toISOString().slice(0, 10);
      const endIso = end.toISOString().slice(0, 10);
      const rangeRes = await getDateRangeReport(startIso, endIso);
      const rows = Array.isArray(rangeRes.data) ? rangeRes.data : [];
      setDailyData(rows.map((r) => ({
        date: r.date,
        violations: Number(r.violations || 0),
        complianceScore: Number(r.compliance_score || 0),
        safetyScore: Number(r.safety_score || 0),
      })));

      const totalV = rows.reduce((sum, r) => sum + Number(r.violations || 0), 0);
      const totalP = rows.reduce((sum, r) => sum + Number(r.total_persons || 0), 0);
      const avg = totalP > 0 ? ((totalP - totalV) / totalP) * 100 : 0;
      setMonthlyMetrics({
        violations: totalV,
        avgComplianceScore: Number(avg.toFixed(2)),
        avgSafetyScore: Number(avg.toFixed(2)),
        totalPeople: totalP,
      });
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    loadSummary();
    const id = setInterval(loadSummary, 15000);
    return () => clearInterval(id);
  }, [loadSummary]);

  useEffect(() => {
    loadRecentWindowsAndViolations();
    const id = setInterval(loadRecentWindowsAndViolations, 30000);
    return () => clearInterval(id);
  }, [loadRecentWindowsAndViolations]);

  useEffect(() => {
    loadAnalytics();
    const id = setInterval(loadAnalytics, 60000);
    return () => clearInterval(id);
  }, [loadAnalytics]);

  const liveIsActive = useMemo(() => {
    if (!lastUpdated) return false;
    const t = new Date(lastUpdated).getTime();
    if (Number.isNaN(t)) return false;
    return (Date.now() - t) < 60000;
  }, [lastUpdated]);

  const currentSafety = Number(dailyMetrics.safetyScore || 0);

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
            overflow: 'hidden',
          },
        }}
      >
        <Box sx={{ p: 3, borderBottom: '1px solid #e2e8f0' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 40, height: 40, backgroundColor: '#7c3aed', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <Assignment sx={{ fontSize: 22 }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '13px', lineHeight: 1.3 }}>
              Operations &amp; Compliance
            </Typography>
          </Box>
        </Box>

        <List sx={{ pt: 2 }}>
          {navItems.map((item, index) => {
            const { Icon } = item;
            const isSelected = activeTab === index;
            return (
              <ListItem
                key={item.label}
                button
                selected={isSelected}
                onClick={() => setActiveTab(index)}
                sx={{
                  mx: 1.5, mb: 0.5, borderRadius: '8px',
                  '&.Mui-selected': {
                    backgroundColor: '#ede9fe', color: '#7c3aed',
                    '& .MuiListItemIcon-root': { color: '#7c3aed' },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <Icon sx={{ color: isSelected ? '#7c3aed' : '#64748b', fontSize: 20 }} />
                </ListItemIcon>
                <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: isSelected ? 700 : 400, fontSize: '13px' }} />
              </ListItem>
            );
          })}
        </List>

        <Box sx={{ mt: 'auto', p: 2, borderTop: '1px solid #e2e8f0' }}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<Sensors />}
            onClick={() => navigate('/live-dashboard')}
            sx={{
              mb: 1,
              borderRadius: '8px',
              textTransform: 'none',
              fontSize: '13px',
              backgroundColor: '#1C4D8D',
              '&:hover': { backgroundColor: '#163d70' },
            }}
          >
            Switch to Live Dashboard
          </Button>
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, minHeight: '100vh', backgroundColor: '#f8fafc', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <AppBar position="sticky" elevation={0} sx={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', zIndex: 1 }}>
          <Toolbar sx={{ justifyContent: 'space-between', minHeight: '64px !important', px: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {pageMeta[activeTab]?.icon}
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '18px' }}>
                {pageMeta[activeTab]?.label}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Button
                onClick={handleMenuOpen}
                sx={{ textTransform: 'none', color: '#64748b', display: 'flex', alignItems: 'center', gap: 1.5, borderRadius: '20px', px: 1 }}
              >
                <Avatar sx={{ width: 32, height: 32, backgroundColor: '#ede9fe', color: '#7c3aed', fontSize: '14px' }}>
                  <Person sx={{ fontSize: 18 }} />
                </Avatar>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Welcome, {user?.name || user?.username || user?.email || 'Officer'}
                </Typography>
              </Button>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                PaperProps={{
                  elevation: 3,
                  sx: { mt: 1, minWidth: 260, borderRadius: '12px' }
                }}
              >
                <Box sx={{ px: 2, py: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f2854', textTransform: 'capitalize' }}>
                    {user?.role || 'Administrator'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    {user?.email || 'No email provided'}
                  </Typography>
                </Box>
                <Divider />
                <MenuItem onClick={() => { handleMenuClose(); navigate('/model-inference'); }} sx={{ py: 1.5, gap: 1.5, color: '#475569' }}>
                  <Dashboard sx={{ fontSize: 20 }} />
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>Go to Model Inference</Typography>
                </MenuItem>
                <MenuItem onClick={() => { handleMenuClose(); navigate('/operations-dashboard'); }} sx={{ py: 1.5, gap: 1.5, color: '#475569' }}>
                  <Shield sx={{ fontSize: 20 }} />
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>Go to Operations Compliance</Typography>
                </MenuItem>
                <MenuItem onClick={() => { handleMenuClose(); navigate('/live-dashboard'); }} sx={{ py: 1.5, gap: 1.5, color: '#475569' }}>
                  <Videocam sx={{ fontSize: 20 }} />
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>Go to Live Dashboard</Typography>
                </MenuItem>
                <Divider />
                <MenuItem onClick={() => { handleMenuClose(); handleChangePasswordOpen(); }} sx={{ py: 1.5, gap: 1.5, color: '#475569' }}>
                  <Lock sx={{ fontSize: 20 }} />
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>Change Password</Typography>
                </MenuItem>
                <MenuItem onClick={() => { handleMenuClose(); handleLogout(); }} sx={{ py: 1.5, gap: 1.5, color: '#ef4444' }}>
                  <ExitToApp sx={{ fontSize: 20 }} />
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>Logout</Typography>
                </MenuItem>
              </Menu>
              <Chip
                size="small"
                label={liveIsActive ? 'Live' : 'Offline'}
                icon={<FiberManualRecord sx={{ fontSize: '10px !important' }} />}
                sx={{
                  ml: 1,
                  fontWeight: 700,
                  color: liveIsActive ? '#166534' : '#64748b',
                  backgroundColor: liveIsActive ? '#DCFCE7' : '#E2E8F0',
                  '& .MuiChip-icon': {
                    color: liveIsActive ? '#22C55E' : '#94A3B8',
                    animation: liveIsActive ? 'pulse 1.25s infinite' : 'none',
                  },
                  '@keyframes pulse': {
                    '0%': { opacity: 0.4 },
                    '50%': { opacity: 1 },
                    '100%': { opacity: 0.4 },
                  },
                }}
              />
            </Box>
          </Toolbar>
        </AppBar>

        <Box sx={{ px: 3, pt: 3, pb: 0 }}>
          {summaryError && <Alert severity="warning" sx={{ mb: 2 }}>{summaryError}</Alert>}
        </Box>

        <Box sx={{ p: 3, flexGrow: 1 }}>
          {activeTab === 0 && (
            <DailyReportsView dailyMetrics={dailyMetrics} />
          )}

          {activeTab === 1 && (
            <MonthlyReportsView monthlyMetrics={monthlyMetrics} />
          )}

          {activeTab === 2 && (
            <AnalyticsView hourlyData={hourlyData} dailyData={dailyData} />
          )}

          {activeTab === 3 && (
            <ViolationsTable
              violations={violations}
              onUpdate={handleUpdateViolation}
              onDelete={handleDeleteViolation}
              onAdd={handleAddViolation}
            />
          )}
        </Box>
      </Box>

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
              key={field}
              fullWidth
              label={label}
              margin="normal"
              sx={{ mb: 2 }}
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
          <Button onClick={handleChangePassword} variant="contained" disabled={passwordSuccess !== ''} sx={{ borderRadius: '8px', textTransform: 'none', minWidth: 100, backgroundColor: '#7c3aed', '&:hover': { backgroundColor: '#6d28d9' } }}>
            Change Password
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OperationsComplianceDashboard;
