import React, { useCallback, useMemo, useState } from 'react';
import {
  AppBar,
  Toolbar,
  Box,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Button,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Sensors,
  AccessTime,
  CalendarMonth,
  Warning,
  Download,
  ExitToApp,
  Info,
  FiberManualRecord,
  Refresh,
  CheckCircle,
  Construction,
  Masks,
  Checkroom,
  FrontHand,
  Hiking,
  ArrowBack,
  PictureAsPdf,
} from '@mui/icons-material';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  AreaChart,
  Area,
  ReferenceLine,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  downloadCSV,
  getAllInferences,
  getDateRangeReport,
  getHourlyReport,
  getLiveSummary,
} from '../../services/api';
import { downloadPDF } from '../../utils/reportUtils';
import usePolling from '../../hooks/usePolling';

const drawerWidth = 260;
const cardBorderSx = { border: '2px solid #BDE8F5', borderRadius: 3 };
const tooltipStyle = { backgroundColor: '#fff', border: '2px solid #BDE8F5', borderRadius: 12, padding: 12 };

function toIsoDate(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function toTime(ts) {
  if (!ts) return '--:--';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function relativeTime(ts) {
  const t = new Date(ts).getTime();
  if (Number.isNaN(t)) return 'unknown time';
  const diff = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (diff < 60) return `${diff}s ago`;
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function scoreColor(score) {
  if (score >= 95) return '#22C55E';
  if (score >= 80) return '#EAB308';
  return '#EF4444';
}

function violationIcon(type) {
  const name = String(type || '').toLowerCase();
  if (name.includes('helmet')) return <Construction sx={{ fontSize: 20 }} />;
  if (name.includes('mask')) return <Masks sx={{ fontSize: 20 }} />;
  if (name.includes('vest')) return <Checkroom sx={{ fontSize: 20 }} />;
  if (name.includes('glove')) return <FrontHand sx={{ fontSize: 20 }} />;
  if (name.includes('boot')) return <Hiking sx={{ fontSize: 20 }} />;
  return <Warning sx={{ fontSize: 20 }} />;
}

const navItems = [
  { label: 'Live Overview', icon: <Sensors /> },
  { label: 'Hourly Report', icon: <AccessTime /> },
  { label: 'Date Range Report', icon: <CalendarMonth /> },
];

export default function LiveComplianceDashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [activePage, setActivePage] = useState(0);
  const [summary, setSummary] = useState({ total_persons: 0, total_violations: 0, safety_score: 0, compliance_score: 0, last_updated: null });
  const [summaryLoading, setSummaryLoading] = useState(true);

  const [windows, setWindows] = useState([]);
  const [hourlyDate, setHourlyDate] = useState(toIsoDate(new Date()));
  const [hourlyRows, setHourlyRows] = useState([]);
  const [hourlyLoading, setHourlyLoading] = useState(false);

  const [rangeStart, setRangeStart] = useState(toIsoDate(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)));
  const [rangeEnd, setRangeEnd] = useState(toIsoDate(new Date()));
  const [rangeRows, setRangeRows] = useState([]);
  const [rangeLoading, setRangeLoading] = useState(false);
  const [rangeLoaded, setRangeLoaded] = useState(false);

  const loadSummary = useCallback(async () => {
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    try {
      const res = await getLiveSummary(since);
      setSummary({
        total_persons: Number(res.data?.total_persons || 0),
        total_violations: Number(res.data?.total_violations || 0),
        safety_score: Number(res.data?.safety_score || 0),
        compliance_score: Number(res.data?.compliance_score || 0),
        last_updated: res.data?.last_updated || null,
      });
    } catch {
      // keep last data
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const loadWindowsAndViolations = useCallback(async () => {
    try {
      const res = await getAllInferences();
      const all = Array.isArray(res?.data?.inferences) ? res.data.inferences : [];
      const live = all
        .filter((inf) => ['webcam', 'cctv'].includes(String(inf.source_type || '').toLowerCase()))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      const last12 = live.slice(0, 12).reverse().map((inf) => {
        const persons = Number(inf.total_persons || 0);
        const violations = Number(inf.total_violations || 0);
        let safety_score = 100; // empty frame = fully compliant
        if (persons > 0) {
            const cappedViolations = Math.min(violations, persons);
            safety_score = Math.round(((persons - cappedViolations) / persons) * 100);
        }
        return {
          time: toTime(inf.timestamp),
          violations,
          total_persons: persons,
          safety_score,
        };
      });
      setWindows(last12);
    } catch {
      // keep last data
    }
  }, []);

  const loadHourly = useCallback(async () => {
    setHourlyLoading(true);
    try {
      const res = await getHourlyReport(hourlyDate);
      setHourlyRows(Array.isArray(res.data) ? res.data : []);
    } catch {
      setHourlyRows([]);
    } finally {
      setHourlyLoading(false);
    }
  }, [hourlyDate]);

  const loadRange = useCallback(async () => {
    setRangeLoading(true);
    try {
      const res = await getDateRangeReport(rangeStart, rangeEnd);
      setRangeRows(Array.isArray(res.data) ? res.data : []);
      setRangeLoaded(true);
    } catch {
      setRangeRows([]);
      setRangeLoaded(false);
    } finally {
      setRangeLoading(false);
    }
  }, [rangeStart, rangeEnd]);

  const handleDownloadHourlyPDF = () => {
    const totalPeople = hourlyRows.reduce((s, r) => s + (Number(r.total_persons) || 0), 0);
    const totalViolations = hourlyRows.reduce((s, r) => s + (Number(r.violations) || 0), 0);
    const avgSafety = hourlyRows.length
      ? hourlyRows.reduce((s, r) => s + (Number(r.safety_score) || 0), 0) / hourlyRows.length
      : 0;

    downloadPDF({
      title: 'Live Daily Hourly Safety Report',
      dateRange: hourlyDate,
      stats: {
        totalPeople,
        totalViolations,
        safetyScore: avgSafety,
        complianceScore: avgSafety,
      },
      columns: ['Hour', 'Total People', 'Violations', 'Safety Score'],
      rows: hourlyRows.map((r) => [
        r.hour,
        r.total_persons || 0,
        r.violations || 0,
        `${Number(r.safety_score || 0).toFixed(2)}%`,
      ]),
      filename: `live-hourly-report-${hourlyDate}`,
    });
  };

  const handleDownloadRangePDF = () => {
    const totalPeople = rangeRows.reduce((s, r) => s + (Number(r.total_persons) || 0), 0);
    const totalViolations = rangeRows.reduce((s, r) => s + (Number(r.violations) || 0), 0);
    const avgSafety = rangeRows.length
      ? rangeRows.reduce((s, r) => s + (Number(r.safety_score) || 0), 0) / rangeRows.length
      : 0;
    const avgCompliance = rangeRows.length
      ? rangeRows.reduce((s, r) => s + (Number(r.compliance_score) || 0), 0) / rangeRows.length
      : 0;

    downloadPDF({
      title: 'Live Date Range Safety Report',
      dateRange: `${rangeStart} to ${rangeEnd}`,
      stats: {
        totalPeople,
        totalViolations,
        safetyScore: avgSafety,
        complianceScore: avgCompliance,
      },
      columns: ['Date', 'Total People', 'Violations', 'Safety Score', 'Compliance Score'],
      rows: rangeRows.map((r) => [
        r.date,
        r.total_persons || 0,
        r.violations || 0,
        `${Number(r.safety_score || 0).toFixed(2)}%`,
        `${Number(r.compliance_score || 0).toFixed(2)}%`,
      ]),
      filename: `live-safety-report-${rangeStart}-to-${rangeEnd}`,
    });
  };



  usePolling(loadSummary, 15000, true);
  usePolling(loadWindowsAndViolations, 30000, true);

  const isLive = useMemo(() => {
    if (!summary.last_updated) return false;
    const t = new Date(summary.last_updated).getTime();
    if (Number.isNaN(t)) return false;
    return Date.now() - t < 60000;
  }, [summary.last_updated]);

  const hourlySummary = useMemo(() => {
    if (!hourlyRows.length) return { worst: '--', best: '--', avg: 0 };
    const sorted = [...hourlyRows].sort((a, b) => Number(a.safety_score || 0) - Number(b.safety_score || 0));
    const worst = sorted[0];
    const best = sorted[sorted.length - 1];
    const avg = hourlyRows.reduce((sum, r) => sum + Number(r.safety_score || 0), 0) / hourlyRows.length;
    return {
      worst: `${worst.hour} (${Number(worst.safety_score || 0).toFixed(1)}%)`,
      best: `${best.hour} (${Number(best.safety_score || 0).toFixed(1)}%)`,
      avg: Number(avg.toFixed(2)),
    };
  }, [hourlyRows]);

  const currentTitle = navItems[activePage]?.label || 'Live Compliance';
  const currentIcon = navItems[activePage]?.icon || <Sensors />;

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
          <Typography sx={{ fontWeight: 800, color: '#1C4D8D' }}>Live Compliance</Typography>
        </Box>

        <List sx={{ pt: 2 }}>
          {navItems.map((item, idx) => {
            const selected = activePage === idx;
            return (
              <ListItem
                key={item.label}
                button
                selected={selected}
                onClick={() => setActivePage(idx)}
                sx={{
                  mx: 1.5,
                  mb: 0.5,
                  borderRadius: '8px',
                  '&.Mui-selected': {
                    backgroundColor: '#E8F0FB',
                    '& .MuiListItemIcon-root': { color: '#1C4D8D' },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: selected ? '#1C4D8D' : '#64748b' }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 13, fontWeight: selected ? 700 : 500 }} />
              </ListItem>
            );
          })}
        </List>

        <Box sx={{ mt: 'auto', p: 2, borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => navigate('/model-inference')}
            sx={{ textTransform: 'none', borderColor: '#1C4D8D', color: '#1C4D8D' }}
          >
            Model Inference
          </Button>
          <Button
            fullWidth
            variant="contained"
            startIcon={<ExitToApp />}
            onClick={() => { logout(); navigate('/'); }}
            sx={{ textTransform: 'none', backgroundColor: '#EF4444', '&:hover': { backgroundColor: '#DC2626' } }}
          >
            Logout
          </Button>
        </Box>
      </Drawer>

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <AppBar position="sticky" elevation={0} sx={{ backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0', color: '#0F2854' }}>
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: '#E8F0FB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1C4D8D' }}>
                {currentIcon}
              </Box>
              <Typography sx={{ fontWeight: 800 }}>{currentTitle}</Typography>
            </Box>

            <Chip
              label={isLive ? 'Live' : 'Offline'}
              icon={<FiberManualRecord sx={{ fontSize: '10px !important' }} />}
              sx={{
                fontWeight: 700,
                color: isLive ? '#166534' : '#64748b',
                backgroundColor: isLive ? '#DCFCE7' : '#E2E8F0',
                '& .MuiChip-icon': {
                  color: isLive ? '#22C55E' : '#94A3B8',
                  animation: isLive ? 'pulse 1.25s infinite' : 'none',
                },
                '@keyframes pulse': {
                  '0%': { opacity: 0.4 },
                  '50%': { opacity: 1 },
                  '100%': { opacity: 0.4 },
                },
              }}
            />
          </Toolbar>
        </AppBar>

        <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {activePage === 0 && (
            <>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4,1fr)' }, gap: 2 }}>
                {[
                  { title: 'Safety Score %', value: `${Number(summary.safety_score || 0).toFixed(2)}%`, sub: 'Last 15 minutes', bg: 'linear-gradient(135deg,#22C55E,#16A34A)' },
                  { title: 'Total People', value: summary.total_persons, sub: 'Active now', bg: 'linear-gradient(135deg,#1C4D8D,#4988C4)' },
                  { title: 'Total Violations', value: summary.total_violations, sub: 'Last 15 minutes', bg: 'linear-gradient(135deg,#EF4444,#DC2626)' },
                  { title: 'Compliance Score %', value: `${Number(summary.compliance_score || 0).toFixed(2)}%`, sub: 'Last 15 minutes', bg: 'linear-gradient(135deg,#8B5CF6,#7C3AED)' },
                ].map((kpi) => (
                  <Paper key={kpi.title} elevation={3} sx={{ p: 2.5, color: '#fff', borderRadius: 3, background: kpi.bg }}>
                    <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 0.7, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{kpi.title}</Typography>
                    <Typography sx={{ fontWeight: 900, fontSize: '2rem', lineHeight: 1.1, mt: 0.5 }}>{kpi.value}</Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)' }}>{kpi.sub}</Typography>
                  </Paper>
                ))}
              </Box>

              <Paper elevation={0} sx={{ ...cardBorderSx, p: 2, backgroundColor: '#F0F8FB', display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <Info sx={{ color: '#1C4D8D', mt: 0.2 }} />
                <Typography variant="caption" sx={{ fontStyle: 'italic', color: '#0F2854', lineHeight: 1.65 }}>
                  Safety Score = compliant workers ÷ total detected × 100. A worker is compliant if no PPE violation is detected for them in this window. Confidence threshold: 65% — detections below this are ignored to reduce false positives.
                </Typography>
              </Paper>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '3fr 2fr' }, gap: 2 }}>
                <Paper elevation={0} sx={{ ...cardBorderSx, p: 3 }}>
                  <Typography sx={{ fontWeight: 800, color: '#0F2854', mb: 2 }}>This Hour: Violations per 30s Window</Typography>
                  {summaryLoading ? (
                    <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></Box>
                  ) : windows.length === 0 ? (
                    <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Waiting for data...</Box>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={windows}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#BDE8F5" vertical={false} />
                        <XAxis dataKey="time" tick={{ fontSize: 11, fontWeight: 600 }} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fontWeight: 600 }} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="violations" fill="#EF4444" radius={[8, 8, 0, 0]} maxBarSize={38} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </Paper>

                <Paper elevation={0} sx={{ ...cardBorderSx, p: 3, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <Typography sx={{ fontWeight: 800, color: '#0F2854', mb: 2 }}>Current Safety Score</Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                      <CircularProgress variant="determinate" value={100} size={170} thickness={4.5} sx={{ color: '#E2E8F0' }} />
                      <CircularProgress variant="determinate" value={Math.max(0, Math.min(100, Number(summary.safety_score || 0)))} size={170} thickness={4.5} sx={{ color: scoreColor(Number(summary.safety_score || 0)), position: 'absolute', left: 0 }} />
                      <Box sx={{ top: 0, left: 0, right: 0, bottom: 0, position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography sx={{ fontWeight: 900, fontSize: '1.9rem', color: '#0F2854' }}>{Number(summary.safety_score || 0).toFixed(1)}%</Typography>
                      </Box>
                    </Box>
                  </Box>
                  <Typography variant="caption" sx={{ color: '#64748b', textAlign: 'center' }}>Score updates every 30s</Typography>
                </Paper>
              </Box>
            </>
          )}

          {activePage === 1 && (
            <>
              <Paper elevation={0} sx={{ ...cardBorderSx, p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <AccessTime sx={{ color: '#1C4D8D' }} />
                <Typography sx={{ fontWeight: 700, color: '#0F2854' }}>Hourly report groups all inference windows for the selected date by hour. Each bar represents the total violations detected in that hour. Hover for full breakdown.</Typography>
              </Paper>

              <Paper elevation={0} sx={{ ...cardBorderSx, p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <input type="date" value={hourlyDate} onChange={(e) => setHourlyDate(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '2px solid #BDE8F5' }} />
                  <Button variant="contained" onClick={loadHourly} disabled={hourlyLoading} sx={{ textTransform: 'none', backgroundColor: '#1C4D8D' }}>{hourlyLoading ? 'Loading...' : 'Load Report'}</Button>
                  <Button variant="outlined" onClick={() => downloadCSV(hourlyDate, hourlyDate)} disabled={hourlyRows.length === 0} startIcon={<Download />} sx={{ textTransform: 'none', borderColor: '#1C4D8D', color: '#1C4D8D' }}>Download CSV</Button>
                  <Button variant="contained" onClick={handleDownloadHourlyPDF} disabled={hourlyRows.length === 0} startIcon={<PictureAsPdf />} sx={{ textTransform: 'none', backgroundColor: '#1C4D8D' }}>Download PDF</Button>
                </Box>
              </Paper>

              <Paper elevation={0} sx={{ ...cardBorderSx, p: 3 }}>
                <Typography sx={{ fontWeight: 800, color: '#0F2854', mb: 2 }}>Violations per Hour (9AM-5PM)</Typography>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={hourlyRows}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#BDE8F5" vertical={false} />
                    <XAxis dataKey="hour" tick={{ fontSize: 11, fontWeight: 600 }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fontWeight: 600 }} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="violations" fill="#EF4444" radius={[8, 8, 0, 0]} maxBarSize={42} />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>

              <Paper elevation={0} sx={{ ...cardBorderSx, p: 3 }}>
                <Typography sx={{ fontWeight: 800, color: '#0F2854', mb: 2 }}>Safety Score per Hour</Typography>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={hourlyRows}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#BDE8F5" vertical={false} />
                    <XAxis dataKey="hour" tick={{ fontSize: 11, fontWeight: 600 }} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fontWeight: 600 }} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <ReferenceLine y={95} stroke="#94a3b8" strokeDasharray="5 5" label={{ value: 'Target', position: 'insideTopRight', fill: '#64748b', fontSize: 11 }} />
                    <Line type="monotone" dataKey="safety_score" stroke="#22C55E" strokeWidth={3} dot={{ fill: '#22C55E', r: 5, strokeWidth: 2, stroke: '#fff' }} />
                  </LineChart>
                </ResponsiveContainer>
              </Paper>

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip label={`Worst Hour: ${hourlySummary.worst}`} sx={{ fontWeight: 700 }} />
                <Chip label={`Best Hour: ${hourlySummary.best}`} color="success" sx={{ fontWeight: 700 }} />
                <Chip label={`Daily Average Score: ${hourlySummary.avg}%`} color="info" sx={{ fontWeight: 700 }} />
              </Box>
            </>
          )}

          {activePage === 2 && (
            <>
              <Paper elevation={0} sx={{ ...cardBorderSx, p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <CalendarMonth sx={{ color: '#1C4D8D' }} />
                <Typography sx={{ fontWeight: 700, color: '#0F2854' }}>Date range report aggregates daily compliance data between the selected dates. Use this for weekly or monthly reviews. CSV export includes every individual violation record with timestamp, zone, type, confidence and severity.</Typography>
              </Paper>

              <Paper elevation={0} sx={{ ...cardBorderSx, p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <input type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '2px solid #BDE8F5' }} />
                  <input type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '2px solid #BDE8F5' }} />
                  <Button variant="contained" onClick={loadRange} disabled={rangeLoading} sx={{ textTransform: 'none', backgroundColor: '#1C4D8D' }}>{rangeLoading ? 'Loading...' : 'Generate'}</Button>
                  <Button variant="outlined" onClick={() => downloadCSV(rangeStart, rangeEnd)} disabled={!rangeLoaded} startIcon={<Download />} sx={{ textTransform: 'none', borderColor: '#1C4D8D', color: '#1C4D8D' }}>Download CSV</Button>
                  <Button variant="contained" onClick={handleDownloadRangePDF} disabled={!rangeLoaded} startIcon={<PictureAsPdf />} sx={{ textTransform: 'none', backgroundColor: '#1C4D8D' }}>Download PDF</Button>
                </Box>
              </Paper>

              <Paper elevation={0} sx={{ ...cardBorderSx, p: 3 }}>
                <Typography sx={{ fontWeight: 800, color: '#0F2854', mb: 2 }}>Daily Violations Trend</Typography>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={rangeRows}>
                    <defs>
                      <linearGradient id="standaloneRangeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#EF4444" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#EF4444" stopOpacity={0.08} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#BDE8F5" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fontWeight: 600 }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fontWeight: 600 }} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="violations" stroke="#EF4444" strokeWidth={3} fill="url(#standaloneRangeGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </Paper>

              <Paper elevation={0} sx={{ ...cardBorderSx, p: 3 }}>
                <Typography sx={{ fontWeight: 800, color: '#0F2854', mb: 2 }}>Compliance vs Safety</Typography>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={rangeRows}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#BDE8F5" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fontWeight: 600 }} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fontWeight: 600 }} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="compliance_score" stroke="#10B981" strokeWidth={3} dot={{ fill: '#10B981', r: 4, stroke: '#fff', strokeWidth: 2 }} />
                    <Line type="monotone" dataKey="safety_score" stroke="#4988C4" strokeWidth={3} dot={{ fill: '#4988C4', r: 4, stroke: '#fff', strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Paper>

              <Paper elevation={0} sx={{ ...cardBorderSx, overflow: 'hidden' }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1fr', px: 2, py: 1.5, backgroundColor: '#F0F8FB', fontWeight: 800, color: '#0F2854', fontSize: 13 }}>
                  <Box>Date</Box><Box>People</Box><Box>Violations</Box><Box>Safety Score</Box><Box>Compliance</Box>
                </Box>
                {!rangeRows.length && (
                  <Box sx={{ px: 2, py: 2, color: '#94a3b8' }}>No data loaded yet.</Box>
                )}
                {rangeRows.map((row) => (
                  <Box key={row.date} sx={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1fr', px: 2, py: 1.2, fontSize: 13, borderTop: '1px solid #F1F5F9' }}>
                    <Box>{row.date}</Box>
                    <Box>{row.total_persons || 0}</Box>
                    <Box>{row.violations || 0}</Box>
                    <Box sx={{ fontWeight: 700, color: scoreColor(Number(row.safety_score || 0)) }}>{Number(row.safety_score || 0).toFixed(2)}%</Box>
                    <Box>{Number(row.compliance_score || 0).toFixed(2)}%</Box>
                  </Box>
                ))}
              </Paper>
            </>
          )}


        </Box>
      </Box>
    </Box>
  );
}
