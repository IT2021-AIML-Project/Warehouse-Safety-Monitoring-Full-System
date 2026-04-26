import React, { useMemo, useState } from 'react';
import {
  Box, Paper, Typography, Button, Chip, Alert, CircularProgress,
} from '@mui/material';
import {
  AccessTime, InfoOutlined, FileDownload, PictureAsPdf,
} from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, ReferenceLine,
} from 'recharts';
import { downloadCSV, getHourlyReport } from '../../services/api';
import { downloadPDF } from '../../utils/reportUtils';

const tooltipStyle = { backgroundColor: '#fff', border: '2px solid #BDE8F5', borderRadius: 12, padding: 12 };

function scoreColor(value) {
  if (value >= 95) return 'success';
  if (value >= 80) return 'warning';
  return 'error';
}



export function DailyReportsView({ dailyMetrics }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hourlyRows, setHourlyRows] = useState([]);

  const handleLoad = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getHourlyReport(selectedDate);
      const rows = Array.isArray(res.data) ? res.data : [];
      setHourlyRows(rows);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load hourly report');
      setHourlyRows([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = () => {
    downloadCSV(selectedDate, selectedDate);
  };

  const handleDownloadPDF = () => {
    const totalPeople = hourlyRows.reduce((s, r) => s + (Number(r.total_persons) || 0), 0);
    const totalViolations = hourlyRows.reduce((s, r) => s + (Number(r.violations) || 0), 0);
    const avgSafety = hourlyRows.length
      ? hourlyRows.reduce((s, r) => s + (Number(r.safety_score) || 0), 0) / hourlyRows.length
      : 0;

    downloadPDF({
      title: 'Daily Hourly Safety Report',
      dateRange: selectedDate,
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
      filename: `hourly-report-${selectedDate}`,
    });
  };

  const derivedMetrics = useMemo(() => {
    if (!hourlyRows.length) return dailyMetrics;
    const totalViolations = hourlyRows.reduce((sum, r) => sum + (Number(r.violations) || 0), 0);
    const totalPeople = hourlyRows.reduce((sum, r) => sum + (Number(r.total_persons) || 0), 0);
    const score = totalPeople > 0 ? ((totalPeople - totalViolations) / totalPeople) * 100 : 0;
    return {
      violations: totalViolations,
      complianceScore: Number(score.toFixed(2)),
      safetyScore: Number(score.toFixed(2)),
      totalPeople,
    };
  }, [hourlyRows, dailyMetrics]);

  const summary = useMemo(() => {
    if (!hourlyRows.length) {
      return { worst: '--', best: '--', avg: 0 };
    }

    const sorted = [...hourlyRows].sort((a, b) => (a.safety_score || 0) - (b.safety_score || 0));
    const worst = sorted[0];
    const best = sorted[sorted.length - 1];
    const avg = hourlyRows.reduce((sum, r) => sum + (Number(r.safety_score) || 0), 0) / hourlyRows.length;

    return {
      worst: `${worst.hour} (${Number(worst.safety_score || 0).toFixed(1)}%)`,
      best: `${best.hour} (${Number(best.safety_score || 0).toFixed(1)}%)`,
      avg: Number(avg.toFixed(2)),
    };
  }, [hourlyRows]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Paper elevation={0} sx={{ p: 3, border: '2px solid #BDE8F5', borderRadius: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <AccessTime sx={{ color: '#1C4D8D' }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0F2854' }}>Hourly Report</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto', flexWrap: 'wrap' }}>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '2px solid #BDE8F5', fontSize: '14px', fontFamily: 'inherit', outline: 'none' }}
            />
            <Button
              variant="contained"
              onClick={handleLoad}
              disabled={loading}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, background: 'linear-gradient(135deg,#1C4D8D,#4988C4)' }}
            >
              {loading ? 'Loading...' : 'Load Report'}
            </Button>
            <Button
              variant="outlined"
              onClick={handleDownloadCSV}
              disabled={hourlyRows.length === 0}
              startIcon={<FileDownload />}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, borderColor: '#1C4D8D', color: '#1C4D8D' }}
            >
              Download CSV
            </Button>
            <Button
              variant="contained"
              onClick={handleDownloadPDF}
              disabled={hourlyRows.length === 0}
              startIcon={<PictureAsPdf />}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, background: 'linear-gradient(135deg,#1C4D8D,#4988C4)' }}
            >
              Download PDF
            </Button>
          </Box>
        </Box>
      </Paper>

      <Alert icon={<InfoOutlined fontSize="inherit" />} severity="info" sx={{ borderRadius: 3, border: '1px solid #BDE8F5', backgroundColor: '#F0F8FB' }}>
        Hourly report groups all inference windows for the selected date by hour. Each bar represents the total violations detected in that hour. Hover for full breakdown.
      </Alert>

      {error && <Alert severity="error" sx={{ borderRadius: 3 }}>{error}</Alert>}

      <Paper elevation={0} sx={{ p: 3, border: '2px solid #BDE8F5', borderRadius: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F2854', mb: 2 }}>Violations per Hour (9 AM - 5 PM)</Typography>
        {loading ? (
          <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={hourlyRows}>
              <CartesianGrid strokeDasharray="3 3" stroke="#BDE8F5" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 11, fontWeight: 600 }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fontWeight: 600 }} tickLine={false} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value, name, entry) => {
                  if (name === 'violations') {
                    return [
                      `${value} violations | ${entry.payload.total_persons || 0} people | ${Number(entry.payload.safety_score || 0).toFixed(2)}%`,
                      'Hour Summary',
                    ];
                  }
                  return [value, name];
                }}
              />
              <Legend />
              <Bar dataKey="violations" fill="#EF4444" radius={[8, 8, 0, 0]} name="Violations" maxBarSize={50} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Paper>

      <Paper elevation={0} sx={{ p: 3, border: '2px solid #BDE8F5', borderRadius: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F2854', mb: 2 }}>Safety Score per Hour</Typography>
        {loading ? (
          <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={hourlyRows}>
              <CartesianGrid strokeDasharray="3 3" stroke="#BDE8F5" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 11, fontWeight: 600 }} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fontWeight: 600 }} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <ReferenceLine y={95} stroke="#94a3b8" strokeDasharray="5 5" label={{ value: 'Target', position: 'insideTopRight', fill: '#64748b', fontSize: 11 }} />
              <Line type="monotone" dataKey="safety_score" stroke="#22C55E" strokeWidth={3} dot={{ fill: '#22C55E', r: 5, strokeWidth: 2, stroke: '#fff' }} name="Safety Score (%)" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Paper>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Chip label={`Worst Hour: ${summary.worst}`} color={scoreColor(hourlyRows.length ? Number((hourlyRows.reduce((m, r) => Math.min(m, Number(r.safety_score) || 0), 101)).toFixed(2)) : 0)} sx={{ fontWeight: 700 }} />
        <Chip label={`Best Hour: ${summary.best}`} color="success" sx={{ fontWeight: 700 }} />
        <Chip label={`Daily Average Score: ${summary.avg}%`} color={scoreColor(summary.avg)} sx={{ fontWeight: 700 }} />
      </Box>
    </Box>
  );
}

export default DailyReportsView;
