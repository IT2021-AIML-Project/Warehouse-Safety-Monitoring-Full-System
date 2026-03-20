import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
} from '@mui/material';
import {
  Warehouse,
  CheckCircle,
  People,
  PersonOff,
} from '@mui/icons-material';
import { getAllZones, getAllEmployees } from '../../services/api';

// ── Helpers ────────────────────────────────────────────────────
const typeColorMap = {
  Storage: { bg: '#dbeafe', color: '#1d4ed8' },
  Loading: { bg: '#fef9c3', color: '#a16207' },
  Restricted: { bg: '#fee2e2', color: '#dc2626' },
  Packing: { bg: '#dcfce7', color: '#16a34a' },
};

const avatarColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];
const getInitials = (name) => name.split(' ').map((n) => n[0]).join('').toUpperCase();

// ── Summary stat card ──────────────────────────────────────────
const StatCard = ({ icon, label, value, iconBg, valueColor }) => (
  <Paper
    elevation={0}
    sx={{
      border: '1px solid #e2e8f0',
      borderRadius: '14px',
      p: 2.5,
      display: 'flex',
      alignItems: 'center',
      gap: 2,
    }}
  >
    <Box
      sx={{
        width: 52,
        height: 52,
        borderRadius: '12px',
        backgroundColor: iconBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {icon}
    </Box>
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 800, color: valueColor || '#1e293b', lineHeight: 1 }}>
        {value}
      </Typography>
      <Typography sx={{ color: '#64748b', fontWeight: 500, fontSize: '14px', mt: 0.5 }}>
        {label}
      </Typography>
    </Box>
  </Paper>
);

// ── Main Dashboard ─────────────────────────────────────────────
const DashboardHome = () => {
  const [zones, setZones] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [zonesRes, employeesRes] = await Promise.all([
          getAllZones(),
          getAllEmployees(),
        ]);
        setZones(zonesRes.data.zones);
        setEmployees(employeesRes.data.employees);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalZones = zones.length;
  const activeZones = zones.filter((z) => z.status === 'Active').length;
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter((e) => e.status === 'Active').length;

  const recentZones = [...zones].slice(0, 4);
  const recentEmployees = [...employees].slice(0, 5);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 64px)' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3, minHeight: 'calc(100vh - 64px)', boxSizing: 'border-box', width: '100%' }}>

      {/* ── Top stat cards row ── */}
      <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
        <Box sx={{ flex: 1 }}>
          <StatCard icon={<Warehouse sx={{ color: '#1d4ed8', fontSize: 28 }} />} label="Total Zones" value={totalZones} iconBg="#dbeafe" valueColor="#1d4ed8" />
        </Box>
        <Box sx={{ flex: 1 }}>
          <StatCard icon={<CheckCircle sx={{ color: '#16a34a', fontSize: 28 }} />} label="Active Zones" value={activeZones} iconBg="#dcfce7" valueColor="#16a34a" />
        </Box>
        <Box sx={{ flex: 1 }}>
          <StatCard icon={<People sx={{ color: '#7c3aed', fontSize: 28 }} />} label="Total Employees" value={totalEmployees} iconBg="#ede9fe" valueColor="#7c3aed" />
        </Box>
        <Box sx={{ flex: 1 }}>
          <StatCard icon={<PersonOff sx={{ color: '#dc2626', fontSize: 28 }} />} label="Inactive Employees" value={totalEmployees - activeEmployees} iconBg="#fee2e2" valueColor="#dc2626" />
        </Box>
      </Box>

      {/* ── Tables section ── */}
      <Box sx={{ display: 'flex', gap: 3, flexGrow: 1, alignItems: 'stretch', width: '100%' }}>

        {/* Recent Zones – 2-col card grid */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <Box sx={{ px: 3, py: 2.5, borderBottom: '1px solid #e2e8f0' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '17px' }}>
                Recent Zones
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8', fontSize: '13px' }}>
                Last {recentZones.length} added zones
              </Typography>
            </Box>

            {/* 2-Column Card Grid */}
            <Box sx={{ p: 2, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
              {recentZones.map((zone) => {
                const c = typeColorMap[zone.type] || { bg: '#f1f5f9', color: '#64748b' };
                const iconPaths = {
                  Storage: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
                  Loading: 'M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zm-.5 1.5 1.96 2.5H17V9.5h2.5zM6 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm13.5-1c0 .55-.45 1-1 1s-1-.45-1-1 .45-1 1-1 1 .45 1 1z',
                  Restricted: 'M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4 5 2.18V11c0 3.5-2.33 6.79-5 7.93-2.67-1.14-5-4.43-5-7.93V7.18L12 5z',
                  Packing: 'M18 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C8.96 2.54 8.05 2 7 2 5.34 2 4 3.34 4 5c0 .35.07.69.18 1H2v13h2v3h16v-3h2V6h-4zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM7 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z',
                };
                return (
                  <Paper
                    key={zone._id}
                    elevation={0}
                    sx={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '14px',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'box-shadow 0.2s, transform 0.2s',
                      '&:hover': { boxShadow: '0 6px 20px rgba(0,0,0,0.08)', transform: 'translateY(-2px)' },
                    }}
                  >
                    {/* Icon + Name */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 2.5, pb: 1.5, px: 1.5, backgroundColor: '#fff' }}>
                      <Box sx={{ width: 56, height: 56, borderRadius: '14px', backgroundColor: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.color, mb: 1 }}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                          <path d={iconPaths[zone.type] || iconPaths.Storage} />
                        </svg>
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b', textAlign: 'center', lineHeight: 1.3, fontSize: '13px' }}>
                        {zone.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#94a3b8', letterSpacing: 0.8, mt: 0.3, fontFamily: 'monospace', fontSize: '11px' }}>
                        {zone.zoneId}
                      </Typography>
                    </Box>

                    {/* Divider */}
                    <Box sx={{ height: '1px', backgroundColor: '#e2e8f0' }} />

                    {/* Details */}
                    <Box sx={{ backgroundColor: '#f8fafc', px: 1.5, py: 1, display: 'flex', flexDirection: 'column', gap: 0.6 }}>
                      {/* Type */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography sx={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Type</Typography>
                        <Chip label={zone.type} size="small" sx={{ fontWeight: 600, fontSize: '10px', height: 18, border: 'none', backgroundColor: c.bg, color: c.color }} />
                      </Box>
                      {/* Status */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography sx={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Status</Typography>
                        <Chip
                          label={zone.status} size="small"
                          sx={{
                            fontWeight: 600, fontSize: '10px', height: 18, border: 'none',
                            backgroundColor: zone.status === 'Active' ? '#dcfce7' : '#fee2e2',
                            color: zone.status === 'Active' ? '#16a34a' : '#dc2626',
                          }}
                        />
                      </Box>
                      {/* Created */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography sx={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Created</Typography>
                        <Typography sx={{ fontSize: '11px', color: '#475569' }}>
                          {new Date(zone.createdAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          </Paper>
        </Box>


        {/* Recent Employees */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ px: 3, py: 2.5, borderBottom: '1px solid #e2e8f0' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '17px' }}>
                Recent Employees
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8', fontSize: '13px' }}>
                Last {recentEmployees.length} registered employees
              </Typography>
            </Box>
            <TableContainer sx={{ flexGrow: 1 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                    <TableCell sx={{ fontWeight: 700, color: '#64748b', fontSize: '14px', py: 2 }}>Employee</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#64748b', fontSize: '14px', py: 2 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentEmployees.map((emp, index) => (
                    <TableRow
                      key={emp._id}
                      sx={{ '&:hover': { backgroundColor: '#f8fafc' }, '&:last-child td': { border: 0 } }}
                    >
                      <TableCell sx={{ py: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar
                            sx={{
                              width: 40,
                              height: 40,
                              fontSize: '14px',
                              fontWeight: 700,
                              backgroundColor: avatarColors[index % avatarColors.length],
                            }}
                          >
                            {getInitials(emp.name)}
                          </Avatar>
                          <Box>
                            <Typography sx={{ fontWeight: 600, color: '#1e293b', fontSize: '15px' }}>
                              {emp.name}
                            </Typography>
                            <Typography sx={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '13px' }}>
                              {emp.employeeId}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ py: 2 }}>
                        <Chip
                          label={emp.status}
                          sx={{
                            fontWeight: 700,
                            fontSize: '13px',
                            height: '30px',
                            backgroundColor: emp.status === 'Active' ? '#dcfce7' : '#fee2e2',
                            color: emp.status === 'Active' ? '#16a34a' : '#dc2626',
                            border: 'none',
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>

      </Box>
    </Box>
  );
};

export default DashboardHome;
