import React, { useMemo, useState } from 'react';
import {
  Box, Paper, Typography, Button, Chip, Alert, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import {
  CalendarMonth, InfoOutlined, FileDownload, PictureAsPdf,
} from '@mui/icons-material';
import {
  CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, AreaChart, Area, XAxis, YAxis,
} from 'recharts';
import { downloadCSV, getDateRangeReport } from '../../services/api';
import { downloadPDF } from '../../utils/reportUtils';

const tooltipStyle = { backgroundColor: '#fff', border: '2px solid #BDE8F5', borderRadius: 12, padding: 12 };

function scoreColor(value) {
  if (value >= 95) return '#16A34A';
  if (value >= 80) return '#CA8A04';
  return '#DC2626';
}

function toIsoDate(v) {
  return new Date(v).toISOString().slice(0, 10);
}

export function MonthlyReportsView({ monthlyMetrics }) {
  const today = new Date();
  const defaultEnd = toIsoDate(today);
  const defaultStart = toIsoDate(new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000));

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const handleGenerate = async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    setError('');
    try {
      const res = await getDateRangeReport(startDate, endDate);
      setRows(Array.isArray(res.data) ? res.data : []);
      setLoaded(true);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load date range report');
      setRows([]);
      setLoaded(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    const totalPeople = rows.reduce((s, r) => s + (Number(r.total_persons) || 0), 0);
    const totalViolations = rows.reduce((s, r) => s + (Number(r.violations) || 0), 0);
    const avgSafety = rows.length
      ? rows.reduce((s, r) => s + (Number(r.safety_score) || 0), 0) / rows.length
      : 0;
    const avgCompliance = rows.length
      ? rows.reduce((s, r) => s + (Number(r.compliance_score) || 0), 0) / rows.length
      : 0;

    downloadPDF({
      title: 'Date Range Safety Report',
      dateRange: `${startDate} to ${endDate}`,
      stats: {
        totalPeople,
        totalViolations,
        safetyScore: avgSafety,
        complianceScore: avgCompliance,
      },
      columns: ['Date', 'Total People', 'Violations', 'Safety Score', 'Compliance Score'],
      rows: rows.map((r) => [
        r.date,
        r.total_persons || 0,
        r.violations || 0,
        `${Number(r.safety_score || 0).toFixed(2)}%`,
        `${Number(r.compliance_score || 0).toFixed(2)}%`,
      ]),
      filename: `safety-report-${startDate}-to-${endDate}`,
    });
  };

  const derivedMetrics = useMemo(() => {
    if (!rows.length) return monthlyMetrics;

    const violations = rows.reduce((sum, r) => sum + (Number(r.violations) || 0), 0);
    const totalPeople = rows.reduce((sum, r) => sum + (Number(r.total_persons) || 0), 0);
    const score = totalPeople > 0 ? ((totalPeople - violations) / totalPeople) * 100 : 0;

    return {
      violations,
      avgComplianceScore: Number(score.toFixed(2)),
      avgSafetyScore: Number(score.toFixed(2)),
      totalPeople,
    };
  }, [rows, monthlyMetrics]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Paper elevation={0} sx={{ p: 3, border: '2px solid #BDE8F5', borderRadius: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <CalendarMonth sx={{ color: '#1C4D8D' }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0F2854' }}>Date Range Report</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto', flexWrap: 'wrap' }}>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '2px solid #BDE8F5', fontSize: '14px', fontFamily: 'inherit', outline: 'none' }}
            />
            <Typography variant="body2" color="text.secondary">to</Typography>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '2px solid #BDE8F5', fontSize: '14px', fontFamily: 'inherit', outline: 'none' }}
            />
            <Button
              variant="contained"
              onClick={handleGenerate}
              disabled={!startDate || !endDate || loading}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, background: 'linear-gradient(135deg,#1C4D8D,#4988C4)' }}
            >
              {loading ? 'Loading...' : 'Generate'}
            </Button>
            <Button
              variant="outlined"
              onClick={() => downloadCSV(startDate, endDate)}
              disabled={!loaded}
              startIcon={<FileDownload />}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, borderColor: '#1C4D8D', color: '#1C4D8D' }}
            >
              Download CSV
            </Button>
            <Button
              variant="contained"
              onClick={handleDownloadPDF}
              disabled={!loaded}
              startIcon={<PictureAsPdf />}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, background: 'linear-gradient(135deg,#1C4D8D,#4988C4)' }}
            >
              Download PDF
            </Button>
          </Box>
        </Box>
      </Paper>

      <Alert icon={<InfoOutlined fontSize="inherit" />} severity="info" sx={{ borderRadius: 3, border: '1px solid #BDE8F5', backgroundColor: '#F0F8FB' }}>
        Date range report aggregates daily compliance data between the selected dates. Use this for weekly or monthly reviews. CSV export includes every individual violation record with timestamp, zone, type, confidence and severity.
      </Alert>

      {error && <Alert severity="error" sx={{ borderRadius: 3 }}>{error}</Alert>}

      <Paper elevation={0} sx={{ p: 3, border: '2px solid #BDE8F5', borderRadius: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F2854', mb: 2 }}>Daily Violations Trend</Typography>
        {loading ? (
          <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={rows}>
              <defs>
                <linearGradient id="rangeViolationsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#EF4444" stopOpacity={0.08} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#BDE8F5" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fontWeight: 600 }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fontWeight: 600 }} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Area type="monotone" dataKey="violations" stroke="#EF4444" strokeWidth={3} fill="url(#rangeViolationsGrad)" name="Violations" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Paper>

      <Paper elevation={0} sx={{ p: 3, border: '2px solid #BDE8F5', borderRadius: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F2854', mb: 2 }}>Compliance vs Safety</Typography>
        {loading ? (
          <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" stroke="#BDE8F5" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fontWeight: 600 }} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fontWeight: 600 }} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Line type="monotone" dataKey="compliance_score" stroke="#10B981" strokeWidth={3} name="Compliance Score" dot={{ fill: '#10B981', r: 4, stroke: '#fff', strokeWidth: 2 }} />
              <Line type="monotone" dataKey="safety_score" stroke="#4988C4" strokeWidth={3} name="Safety Score" dot={{ fill: '#4988C4', r: 4, stroke: '#fff', strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Paper>

      <TableContainer component={Paper} elevation={0} sx={{ border: '2px solid #BDE8F5', borderRadius: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#F0F8FB' }}>
              <TableCell sx={{ fontWeight: 800, color: '#0F2854' }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#0F2854' }}>People</TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#0F2854' }}>Violations</TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#0F2854' }}>Safety Score</TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#0F2854' }}>Compliance</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 3, color: '#94a3b8' }}>
                  No range data loaded yet.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.date} hover>
                <TableCell>{r.date}</TableCell>
                <TableCell>{r.total_persons || 0}</TableCell>
                <TableCell>{r.violations || 0}</TableCell>
                <TableCell sx={{ fontWeight: 700, color: scoreColor(Number(r.safety_score) || 0) }}>
                  {Number(r.safety_score || 0).toFixed(2)}%
                </TableCell>
                <TableCell>{Number(r.compliance_score || 0).toFixed(2)}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Chip label={`Range: ${startDate} to ${endDate}`} sx={{ fontWeight: 700 }} />
        <Chip label={`Days loaded: ${rows.length}`} color="info" sx={{ fontWeight: 700 }} />
      </Box>
    </Box>
  );
}

export default MonthlyReportsView;
