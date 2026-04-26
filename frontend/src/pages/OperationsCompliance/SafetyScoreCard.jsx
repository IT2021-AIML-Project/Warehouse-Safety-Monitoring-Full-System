import React from 'react';
import {
  Box, Typography, Paper, LinearProgress,
} from '@mui/material';
import {
  Warning, Construction, Air, Checkroom,
} from '@mui/icons-material';

const violationTypeDefs = [
  { label: 'No Helmet',      key: 'noHelmet',      icon: <Construction />,  color: '#EF4444', bg: 'linear-gradient(135deg,#EF4444,#DC2626)' },
  { label: 'No Mask',        key: 'noMask',        icon: <Air />,           color: '#F59E0B', bg: 'linear-gradient(135deg,#F59E0B,#D97706)' },
  { label: 'No Safety Vest', key: 'noSafetyVest',  icon: <Checkroom />,     color: '#8B5CF6', bg: 'linear-gradient(135deg,#8B5CF6,#7C3AED)' },
];

export function SafetyScoreCard({ totalPeople, violations, safetyScore, violationBreakdown }) {
  const safeEmployees = totalPeople - violations;
  const scoreColor    = safetyScore >= 95 ? '#22C55E' : safetyScore >= 90 ? '#EAB308' : '#EF4444';
  const progressColor = safetyScore >= 95 ? 'success' : safetyScore >= 90 ? 'warning' : 'error';

  return (
    <Paper elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 3, overflow: 'hidden', width: '100%' }}>
      <Box sx={{ p: 2.5 }}>

        {/* Row 1: score | safe employees | total violations — full width */}
        <Box sx={{ display: 'flex', alignItems: 'stretch', gap: 3, mb: 2.5, flexWrap: 'nowrap' }}>

          {/* Score + progress bar */}
          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 0.5 }}>
              <Typography sx={{ fontSize: '3.5rem', fontWeight: 900, color: scoreColor, lineHeight: 1 }}>
                {safetyScore}
              </Typography>
              <Typography variant="h6" sx={{ color: '#9CA3AF', fontWeight: 700 }}>%</Typography>
            </Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.8, mb: 1 }}>
              Compliance Rate
            </Typography>
            <LinearProgress
              variant="determinate" value={safetyScore} color={progressColor}
              sx={{ height: 10, borderRadius: 5, background: '#E5E7EB', '& .MuiLinearProgress-bar': { borderRadius: 5 } }}
            />
          </Box>

          {/* Safe Employees */}
          <Paper elevation={0} sx={{ px: 3, py: 2, flex: 1, background: 'linear-gradient(135deg,#F0FDF4,#DCFCE7)', border: '2px solid #BBF7D0', borderRadius: 3, display: 'flex', flexDirection: 'column', justifyContent: 'center', transition: 'all .3s', '&:hover': { boxShadow: 3, transform: 'translateY(-2px)' } }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#16A34A', textTransform: 'uppercase', letterSpacing: 0.6, display: 'block' }}>Safe Employees</Typography>
            <Typography sx={{ fontSize: '1.8rem', fontWeight: 900, color: '#16A34A', mt: 0.5, lineHeight: 1 }}>
              {safeEmployees}
              <Typography component="span" sx={{ fontSize: '1rem', fontWeight: 700, color: '#22C55E' }}> / {totalPeople}</Typography>
            </Typography>
          </Paper>

          {/* Total Violations */}
          <Paper elevation={0} sx={{ px: 3, py: 2, flex: 1, background: 'linear-gradient(135deg,#FFF1F2,#FFE4E6)', border: '2px solid #FECDD3', borderRadius: 3, display: 'flex', flexDirection: 'column', justifyContent: 'center', transition: 'all .3s', '&:hover': { boxShadow: 3, transform: 'translateY(-2px)' } }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', letterSpacing: 0.6, display: 'block' }}>Total Violations</Typography>
            <Typography sx={{ fontSize: '1.8rem', fontWeight: 900, color: '#DC2626', mt: 0.5, lineHeight: 1 }}>{violations}</Typography>
          </Paper>

        </Box>

        {/* Divider */}
        <Box sx={{ borderTop: '1px solid #F1F5F9', mb: 2.5 }} />

        {/* Row 2: Violation Breakdown — full width, larger cards */}
        <Box>
          <Typography sx={{ fontWeight: 700, color: '#374151', mb: 2, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 0.8 }}>
            <Warning sx={{ fontSize: 18, color: '#F59E0B' }} /> Violation Breakdown
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            {violationTypeDefs.map((type) => (
              <Paper elevation={0} key={type.label} sx={{ p: 2.5, border: `2px solid ${type.color}25`, borderRadius: 3, transition: 'all .3s', '&:hover': { boxShadow: 3, transform: 'translateY(-3px)', borderColor: `${type.color}60` }, display: 'flex', alignItems: 'center', gap: 2, flex: '1 1 160px', maxWidth: 220 }}>
                <Box sx={{ width: 56, height: 56, borderRadius: '50%', background: type.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0, '& svg': { fontSize: 28 } }}>
                  {type.icon}
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 600, color: '#6B7280', fontSize: '12px', lineHeight: 1.3, display: 'block' }}>{type.label}</Typography>
                  <Typography sx={{ fontSize: '2rem', fontWeight: 900, color: type.color, lineHeight: 1 }}>
                    {violationBreakdown?.[type.key] ?? 0}
                  </Typography>
                </Box>
              </Paper>
            ))}
          </Box>
        </Box>

      </Box>
    </Paper>
  );
}

export default SafetyScoreCard;
