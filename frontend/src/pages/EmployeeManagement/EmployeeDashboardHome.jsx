import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Divider,
  Button,
  CircularProgress,
} from '@mui/material';
import {
  LocationOn,
  CheckCircleOutline,
  WarningAmber,
  InfoOutlined,
  SecurityOutlined,
  HealthAndSafety,
  HeadsetMic,
  ArrowForward,
  QrCode2,
  CalendarToday,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { getMyAssignedZones } from '../../services/api';

// ─── Helpers ────────────────────────────────────────────────────────────────


const getCategoryTheme = (category) => {
  const c = category.toLowerCase();
  if (c.includes('head')) return { bg: '#dbeafe', color: '#1d4ed8', emoji: '🪖' };
  if (c.includes('foot')) return { bg: '#fef9c3', color: '#a16207', emoji: '🥾' };
  if (c.includes('body')) return { bg: '#dcfce7', color: '#16a34a', emoji: '🦺' };
  return { bg: '#f1f5f9', color: '#64748b', emoji: '🛡️' };
};


//  Safety Guidelines 
const guidelines = [
  { icon: HealthAndSafety, color: '#1d4ed8', bg: '#dbeafe', text: 'Always wear assigned PPE before entering any zone.' },
  { icon: CheckCircleOutline, color: '#16a34a', bg: '#dcfce7', text: 'Inspect PPE for damage before each use.' },
  { icon: WarningAmber, color: '#a16207', bg: '#fef9c3', text: 'Report low-stock items to your supervisor immediately.' },
  { icon: SecurityOutlined, color: '#1d4ed8', bg: '#dbeafe', text: 'Keep emergency exits clear at all times.' },
  { icon: InfoOutlined, color: '#0891b2', bg: '#e0f2fe', text: 'Log any incident within 24 hours via the system.' },
];

//  Component 
const EmployeeDashboardHome = ({ onGoToInquiries }) => {
  const { user } = useAuth();
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchZones = async () => {
      if (!user?.id) { setLoading(false); return; }
      try {
        const res = await getMyAssignedZones(user.id);
        setZones(res.data.zones || []);
      } catch (err) {
        console.error('Failed to load assigned zones:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchZones();
  }, [user?.id]);

  return (
    <Box sx={{ maxWidth: '1400px', mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>
      <Box sx={{ display: 'flex', gap: 3, alignItems: 'stretch' }}>

        {/*  LEFT: Zone + PPE cards  */}
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>

          {/* Loading state */}
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10 }}>
              <CircularProgress sx={{ color: '#1d4ed8' }} />
            </Box>
          )}

          {/* Empty state */}
          {!loading && zones.length === 0 && (
            <Paper elevation={0} sx={{ border: '1.5px dashed #cbd5e1', borderRadius: '16px', p: 5, textAlign: 'center', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
              <Box sx={{ width: 64, height: 64, borderRadius: '16px', background: 'linear-gradient(135deg, #dbeafe, #eff6ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                <Inventory2Outlined sx={{ fontSize: 32, color: '#1d4ed8' }} />
              </Box>
              <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: '18px', mb: 0.5 }}>No Zones Assigned Yet</Typography>
              <Typography sx={{ color: '#64748b', fontSize: '14px' }}>You haven't been assigned to any warehouse zones. Contact your supervisor for zone assignment.</Typography>
            </Paper>
          )}

          {/* Zone cards */}
          {!loading && zones.map((zone) => (
            <Paper key={zone.id} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden' }}>
              {/* Zone header */}
              <Box sx={{ px: 3, py: 2.5, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 1.5, background: 'linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)' }}>
                <Box sx={{ width: 42, height: 42, borderRadius: '10px', background: 'linear-gradient(135deg, #1e293b, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <LocationOn sx={{ color: '#fff', fontSize: 22 }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: '16px' }}>{zone.name}</Typography>
                  <Typography sx={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '12px' }}>{zone.id}</Typography>
                </Box>
                <Chip label={zone.status} sx={{ fontWeight: 600, fontSize: '12px', backgroundColor: '#dcfce7', color: '#16a34a', border: 'none' }} />
                <Chip label={`${zone.ppeItems.length} PPE types`} sx={{ fontWeight: 600, fontSize: '12px', backgroundColor: '#dbeafe', color: '#1d4ed8', border: 'none' }} />
              </Box>

              {/* PPE Items - card grid */}
              <Box sx={{ p: 3 }}>
                <Typography sx={{ fontWeight: 600, color: '#64748b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 2.5, textAlign: 'center' }}>
                  Assigned PPE Items
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
                  {zone.ppeItems.map((item, i) => {
                    const theme = getCategoryTheme(item.category);
                    return (
                      <Paper key={i} elevation={0} sx={{ border: '1.5px solid #e2e8f0', borderRadius: '18px', p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 1.5, transition: 'all 0.18s', cursor: 'default', '&:hover': { borderColor: theme.color, boxShadow: `0 6px 24px rgba(0,0,0,0.10)`, transform: 'translateY(-3px)' } }}>
                        <Box sx={{ width: 72, height: 72, borderRadius: '18px', backgroundColor: theme.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '38px', flexShrink: 0 }}>
                          {theme.emoji}
                        </Box>
                        <Box>
                          <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: '14px', lineHeight: 1.3 }}>{item.name}</Typography>
                          <Typography sx={{ color: '#64748b', fontSize: '12px', mt: 0.3 }}>{item.category}</Typography>
                        </Box>

                        {/* ── PPE Detail Boxes ── */}
                        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1, mt: 0.5 }}>


                          {/* Item ID */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', px: 1.5, py: 1 }}>
                            <QrCode2 sx={{ fontSize: 15, color: '#94a3b8', flexShrink: 0 }} />
                            <Box sx={{ textAlign: 'left', minWidth: 0 }}>
                              <Typography sx={{ fontSize: '9px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Item ID</Typography>
                              <Typography sx={{ fontSize: '12px', color: '#1e293b', fontWeight: 700, fontFamily: 'monospace' }}>{item.serialId}</Typography>
                            </Box>
                          </Box>

                          {/* Assigned Date */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', px: 1.5, py: 1 }}>
                            <CalendarToday sx={{ fontSize: 15, color: '#94a3b8', flexShrink: 0 }} />
                            <Box sx={{ textAlign: 'left' }}>
                              <Typography sx={{ fontSize: '9px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assigned Date</Typography>
                              <Typography sx={{ fontSize: '12px', color: '#1e293b', fontWeight: 700 }}>{item.assignedDate}</Typography>
                            </Box>
                          </Box>
                        </Box>
                      </Paper>
                    );
                  })}
                </Box>
              </Box>
            </Paper>
          ))}

          {/* CTA Banner */}
          <Paper elevation={0} sx={{ border: '1.5px dashed #93c5fd', borderRadius: '16px', p: 3, background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ width: 52, height: 52, borderRadius: '14px', background: 'linear-gradient(135deg, #1e293b, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <HeadsetMic sx={{ color: '#fff', fontSize: 26 }} />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: '16px' }}>Have a question or concern?</Typography>
                <Typography sx={{ color: '#1d4ed8', fontSize: '13px', mt: 0.3 }}>Send an inquiry and our team will get back to you shortly.</Typography>
              </Box>
            </Box>
            <Button
              onClick={onGoToInquiries}
              endIcon={<ArrowForward />}
              sx={{ background: 'linear-gradient(135deg, #1e293b, #1d4ed8)', color: '#fff', fontWeight: 700, fontSize: '14px', px: 3, py: 1.2, borderRadius: '10px', textTransform: 'none', whiteSpace: 'nowrap', '&:hover': { background: 'linear-gradient(135deg, #0f172a, #1e40af)' } }}
            >
              Send Inquiry
            </Button>
          </Paper>

        </Box>

        {/*  RIGHT: Guidelines  */}
        <Box sx={{ width: 440, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2.5 }}>

          {/* Safety Guidelines */}
          <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ px: 3, py: 2.5, background: 'linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <SecurityOutlined sx={{ color: '#1d4ed8', fontSize: 28 }} />
              <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: '20px' }}>Safety Guidelines</Typography>
            </Box>
            <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5, flex: 1, justifyContent: 'space-evenly' }}>
              {guidelines.map((g, i) => {
                const GIcon = g.icon;
                return (
                  <React.Fragment key={i}>
                    <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'center' }}>
                      <Box sx={{ width: 54, height: 54, borderRadius: '14px', backgroundColor: g.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <GIcon sx={{ fontSize: 28, color: g.color }} />
                      </Box>
                      <Typography sx={{ fontSize: '15px', color: '#475569', lineHeight: 1.7, fontWeight: 500 }}>{g.text}</Typography>
                    </Box>
                    {i < guidelines.length - 1 && <Divider sx={{ borderColor: '#f1f5f9' }} />}
                  </React.Fragment>
                );
              })}
            </Box>
          </Paper>

        </Box>
      </Box>
    </Box>
  );
};

export default EmployeeDashboardHome;
