import React, { useState } from 'react';
import { Box, Paper, Typography, Button } from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, AreaChart, Area,
} from 'recharts';
import { BarChart as BarChartIcon, TrendingUp, ShowChart } from '@mui/icons-material';

const tooltipStyle = { backgroundColor: '#fff', border: '2px solid #BDE8F5', borderRadius: 12, padding: 12 };

// Hardcoded data removed; now computed dynamically in the component.

export function ChartCard({ icon, iconBg, iconShadow, title, subtitle, children }) {
  return (
    <Paper elevation={0} sx={{ p: 3, border: '2px solid #BDE8F5', borderRadius: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Box sx={{ width: 48, height: 48, borderRadius: 3, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: `0 6px 16px ${iconShadow}` }}>
          {icon}
        </Box>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F2854' }}>{title}</Typography>
          <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
        </Box>
      </Box>
      {children}
    </Paper>
  );
}

export function AnalyticsView({ hourlyData, dailyData }) {
  const [view, setView] = useState('hourly');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Toggle */}
      <Paper elevation={0} sx={{ p: 0.75, border: '2px solid #BDE8F5', borderRadius: 3, display: 'inline-flex', width: 'fit-content' }}>
        {['hourly', 'daily'].map((v) => (
          <Button key={v} onClick={() => setView(v)} variant={view === v ? 'contained' : 'text'}
            sx={{
              px: 3, py: 1.1, borderRadius: 2.5, fontWeight: 700, textTransform: 'capitalize',
              ...(view === v
                ? { background: 'linear-gradient(135deg,#1C4D8D,#4988C4)', color: '#fff', boxShadow: '0 4px 12px rgba(28,77,141,0.35)', '&:hover': { background: 'linear-gradient(135deg,#1C4D8D,#4988C4)' } }
                : { color: '#555', '&:hover': { background: '#BDE8F520' } }
              ),
            }}
          >
            {v === 'hourly' ? 'Hourly View' : 'Daily View'}
          </Button>
        ))}
      </Paper>

      {view === 'hourly' ? (
        <>
          <ChartCard icon={<BarChartIcon />} iconBg="linear-gradient(135deg,#EF4444,#DC2626)" iconShadow="rgba(239,68,68,0.4)" title="Hourly Violations Trend" subtitle="Working hours: 9:00 AM - 5:00 PM">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={hourlyData}>
                <defs>
                  <linearGradient id="hourlyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#EF4444" stopOpacity={1} />
                    <stop offset="100%" stopColor="#DC2626" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#BDE8F5" vertical={false} />
                <XAxis dataKey="hour"       stroke="#1C4D8D" tick={{ fontSize: 12, fontWeight: 600 }} tickLine={false} />
                <YAxis                       stroke="#1C4D8D" tick={{ fontSize: 12, fontWeight: 600 }} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar dataKey="violations" fill="url(#hourlyGrad)" radius={[10, 10, 0, 0]} name="Violations" maxBarSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard icon={<TrendingUp />} iconBg="linear-gradient(135deg,#22C55E,#16A34A)" iconShadow="rgba(34,197,94,0.4)" title="Hourly Compliance Score" subtitle="Performance throughout the day">
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#BDE8F5" vertical={false} />
                <XAxis dataKey="hour"       stroke="#1C4D8D" tick={{ fontSize: 12, fontWeight: 600 }} tickLine={false} />
                <YAxis domain={[85, 100]}   stroke="#1C4D8D" tick={{ fontSize: 12, fontWeight: 600 }} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Line type="monotone" dataKey="complianceScore" stroke="#10B981" strokeWidth={3} name="Compliance Score (%)" dot={{ fill: '#10B981', r: 6, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      ) : (
        <>
          <ChartCard icon={<ShowChart />} iconBg="linear-gradient(135deg,#1C4D8D,#4988C4)" iconShadow="rgba(28,77,141,0.4)" title="Daily Violations Trend" subtitle="Last 7 days overview">
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="dailyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#EF4444" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#EF4444" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#BDE8F5" vertical={false} />
                <XAxis dataKey="date" stroke="#1C4D8D" tick={{ fontSize: 12, fontWeight: 600 }} tickLine={false} />
                <YAxis               stroke="#1C4D8D" tick={{ fontSize: 12, fontWeight: 600 }} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Area type="monotone" dataKey="violations" stroke="#EF4444" strokeWidth={3} fill="url(#dailyGrad)" name="Violations" dot={{ fill: '#EF4444', r: 5, strokeWidth: 2, stroke: '#fff' }} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard icon={<TrendingUp />} iconBg="linear-gradient(135deg,#8B5CF6,#7C3AED)" iconShadow="rgba(139,92,246,0.4)" title="Daily Score Comparison" subtitle="Compliance vs Safety scores">
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#BDE8F5" vertical={false} />
                <XAxis dataKey="date" stroke="#1C4D8D" tick={{ fontSize: 12, fontWeight: 600 }} tickLine={false} />
                <YAxis domain={[85, 100]} stroke="#1C4D8D" tick={{ fontSize: 12, fontWeight: 600 }} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Line type="monotone" dataKey="complianceScore" stroke="#10B981" strokeWidth={3} name="Compliance Score (%)" dot={{ fill: '#10B981', r: 5, strokeWidth: 2, stroke: '#fff' }} />
                <Line type="monotone" dataKey="safetyScore"     stroke="#4988C4" strokeWidth={3} name="Safety Score (%)"     dot={{ fill: '#4988C4', r: 5, strokeWidth: 2, stroke: '#fff' }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}

    </Box>
  );
}

export default AnalyticsView;
