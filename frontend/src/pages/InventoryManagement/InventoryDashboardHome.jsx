import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
} from '@mui/material';
import {
  Shield,
  CheckCircle,
  Warning,
  LocalShipping,
  Inventory,
} from '@mui/icons-material';
import { getAllPPEItems, getPopulatedZones } from '../../services/api';

// ── Helpers ─────────────────────────────────────────────────────
const statusColorMap = {
  'In Stock': { bg: '#dcfce7', color: '#16a34a' },
  'Low Stock': { bg: '#fef9c3', color: '#a16207' },
  'Out of Stock': { bg: '#fee2e2', color: '#dc2626' },
};

// ── Stat Card ───────────────────────────────────────────────────
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
      flex: 1,
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

// ── Main ────────────────────────────────────────────────────────
const InventoryDashboardHome = () => {
  const [ppeItems, setPpeItems] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [itemsRes, zonesRes] = await Promise.all([
          getAllPPEItems(),
          getPopulatedZones(),
        ]);
        setPpeItems(itemsRes.data.items);
        setZones(zonesRes.data.zones);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalItems = ppeItems.length;
  const inStock = ppeItems.filter((i) => i.status === 'In Stock').length;
  const lowStock = ppeItems.filter((i) => i.status === 'Low Stock').length;
  const outOfStock = ppeItems.filter((i) => i.status === 'Out of Stock').length;

  const recentZones = [...zones].slice(0, 4);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 64px)' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3, minHeight: 'calc(100vh - 64px)', boxSizing: 'border-box', width: '100%' }}>

      {/* ── Stat Cards ── */}
      <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
        <StatCard icon={<Shield sx={{ color: '#1d4ed8', fontSize: 28 }} />} label="Total PPE Items" value={totalItems} iconBg="#dbeafe" valueColor="#1d4ed8" />
        <StatCard icon={<CheckCircle sx={{ color: '#16a34a', fontSize: 28 }} />} label="In Stock" value={inStock} iconBg="#dcfce7" valueColor="#16a34a" />
        <StatCard icon={<Warning sx={{ color: '#a16207', fontSize: 28 }} />} label="Low Stock" value={lowStock} iconBg="#fef9c3" valueColor="#a16207" />
        <StatCard icon={<LocalShipping sx={{ color: '#dc2626', fontSize: 28 }} />} label="Out of Stock" value={outOfStock} iconBg="#fee2e2" valueColor="#dc2626" />
      </Box>

      {/* ── Tables ── */}
      <Box sx={{ display: 'flex', gap: 3, flexGrow: 1, alignItems: 'stretch', width: '100%' }}>

        {/* Zone Employee Overview */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ px: 3, py: 2.5, borderBottom: '1px solid #e2e8f0' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '17px' }}>
                Zone Employee Overview
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8', fontSize: '13px' }}>
                Employees assigned per zone
              </Typography>
            </Box>
            <TableContainer sx={{ flexGrow: 1 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                    <TableCell sx={{ fontWeight: 700, color: '#64748b', fontSize: '14px', py: 2 }}>Zone</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#64748b', fontSize: '14px', py: 2 }}>Employees</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#64748b', fontSize: '14px', py: 2 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {zones.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center" sx={{ py: 6, color: '#94a3b8' }}>No zones found.</TableCell>
                    </TableRow>
                  ) : (
                    zones.map((zone) => (
                      <TableRow key={zone._id} sx={{ '&:hover': { backgroundColor: '#f8fafc' }, '&:last-child td': { border: 0 } }}>
                        <TableCell sx={{ py: 2 }}>
                          <Typography sx={{ fontWeight: 600, color: '#1e293b', fontSize: '15px' }}>{zone.name}</Typography>
                          <Typography sx={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '13px' }}>{zone.zoneId}</Typography>
                        </TableCell>
                        <TableCell sx={{ py: 2 }}>
                          <Chip
                            label={`${zone.employees.length} emp${zone.employees.length !== 1 ? 's' : ''}`}
                            sx={{
                              fontWeight: 700, fontSize: '13px', height: '28px', border: 'none',
                              backgroundColor: zone.employees.length === 0 ? '#f1f5f9' : '#ede9fe',
                              color: zone.employees.length === 0 ? '#94a3b8' : '#7c3aed',
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ py: 2 }}>
                          <Chip
                            label={zone.status}
                            sx={{ fontWeight: 700, fontSize: '13px', height: '28px', border: 'none', backgroundColor: zone.status === 'Active' ? '#dcfce7' : '#fee2e2', color: zone.status === 'Active' ? '#16a34a' : '#dc2626' }}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>

        {/* Zone Inventory Overview – 2×2 card grid */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ px: 3, py: 2.5, borderBottom: '1px solid #e2e8f0' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', fontSize: '17px' }}>
                Zone Inventory Overview
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8', fontSize: '13px' }}>
                PPE distribution across zones
              </Typography>
            </Box>

            <Box sx={{ p: 2, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
              {recentZones.map((zone) => {
                const name = zone.name.toLowerCase();
                const iconPaths = {
                  storage: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
                  loading: 'M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zm-.5 1.5 1.96 2.5H17V9.5h2.5zM6 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm13.5-1c0 .55-.45 1-1 1s-1-.45-1-1 .45-1 1-1 1 .45 1 1z',
                  restricted: 'M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4 5 2.18V11c0 3.5-2.33 6.79-5 7.93-2.67-1.14-5-4.43-5-7.93V7.18L12 5z',
                  packing: 'M18 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C8.96 2.54 8.05 2 7 2 5.34 2 4 3.34 4 5c0 .35.07.69.18 1H2v13h2v3h16v-3h2V6h-4zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM7 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z',
                };
                const theme =
                  name.includes('storage') ? { bg: '#dbeafe', color: '#1d4ed8', path: iconPaths.storage } :
                    name.includes('loading') ? { bg: '#fef9c3', color: '#a16207', path: iconPaths.loading } :
                      name.includes('restricted') ? { bg: '#fee2e2', color: '#dc2626', path: iconPaths.restricted } :
                        { bg: '#dcfce7', color: '#16a34a', path: iconPaths.packing };

                return (
                  <Paper
                    key={zone._id}
                    elevation={0}
                    sx={{
                      border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden',
                      display: 'flex', flexDirection: 'column', transition: 'box-shadow 0.2s, transform 0.2s',
                      '&:hover': { boxShadow: '0 6px 20px rgba(0,0,0,0.08)', transform: 'translateY(-2px)' },
                    }}
                  >
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 2.5, pb: 1.5, px: 1.5, backgroundColor: '#fff' }}>
                      <Box sx={{ width: 56, height: 56, borderRadius: '14px', backgroundColor: theme.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.color, mb: 1 }}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                          <path d={theme.path} />
                        </svg>
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b', textAlign: 'center', fontSize: '13px', lineHeight: 1.3 }}>
                        {zone.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '11px', letterSpacing: 0.8, mt: 0.3 }}>
                        {zone.zoneId}
                      </Typography>
                    </Box>

                    <Box sx={{ height: '1px', backgroundColor: '#e2e8f0' }} />

                    <Box sx={{ backgroundColor: '#f8fafc', px: 1.5, py: 1, display: 'flex', flexDirection: 'column', gap: 0.6 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography sx={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Items</Typography>
                        <Chip
                          label={`${zone.items.length} type${zone.items.length !== 1 ? 's' : ''}`}
                          size="small"
                          sx={{ fontWeight: 600, fontSize: '10px', height: 18, border: 'none', backgroundColor: '#dbeafe', color: '#1d4ed8' }}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography sx={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Status</Typography>
                        <Chip
                          label={zone.status}
                          size="small"
                          sx={{ fontWeight: 600, fontSize: '10px', height: 18, border: 'none', backgroundColor: zone.status === 'Active' ? '#dcfce7' : '#fee2e2', color: zone.status === 'Active' ? '#16a34a' : '#dc2626' }}
                        />
                      </Box>
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          </Paper>
        </Box>

      </Box>
    </Box>
  );
};

export default InventoryDashboardHome;
