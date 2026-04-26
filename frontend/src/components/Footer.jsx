import React, { useState } from 'react';
import { Box, Typography, Button, IconButton } from '@mui/material';
import { Language, Phone, ChevronLeft, ChevronRight, Shield } from '@mui/icons-material';


// ── Calendar helpers ─────────────────────────────────────────────
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfWeek(year, month) {
  // 0=Sun…6=Sat → remap to Mon=0
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

// ── Component ────────────────────────────────────────────────────
const Footer = ({ onProvideFeedback }) => {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDayOfWk = getFirstDayOfWeek(viewYear, viewMonth);

  // Build grid cells (null = empty)
  const cells = [
    ...Array(firstDayOfWk).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const isToday = (day) =>
    day &&
    viewYear === today.getFullYear() &&
    viewMonth === today.getMonth() &&
    day === today.getDate();

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: '#2d3748',
        mt: 'auto',
        borderTop: '3px solid #f59e0b',
      }}
    >
      <Box
        sx={{
          maxWidth: '1400px',
          mx: 'auto',
          px: { xs: 3, md: 6 },
          py: 4,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 300px' },
          gap: 5,
          alignItems: 'start',
        }}
      >

        {/* ── Column 1: Support ── */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>

          {/* Logo / brand */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <Box sx={{ width: 32, height: 32, borderRadius: '8px', background: 'linear-gradient(135deg, #1e293b, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield sx={{ color: '#fff', fontSize: 18 }} />
            </Box>
            <Typography sx={{ fontWeight: 800, color: '#e2e8f0', fontSize: '16px' }}>SafetyFirst</Typography>
          </Box>

          {/* Heading */}
          <Typography sx={{ color: '#94a3b8', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', mb: 0.5 }}>
            Do you need any
          </Typography>
          <Typography sx={{ color: '#ffffff', fontSize: '30px', fontWeight: 800, lineHeight: 1, mb: 2.5 }}>
            SUPPORT ?
          </Typography>

          {/* Contact info */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 32, height: 32, borderRadius: '8px', backgroundColor: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Language sx={{ color: '#f59e0b', fontSize: 17 }} />
              </Box>
              <Typography
                sx={{ color: '#60a5fa', fontSize: '14px', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
              >
                support.safetyfirst.lk
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 32, height: 32, borderRadius: '8px', backgroundColor: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Phone sx={{ color: '#f59e0b', fontSize: 17 }} />
              </Box>
              <Typography sx={{ color: '#cbd5e1', fontSize: '14px' }}>
                +94 11 754 4801
              </Typography>
            </Box>
          </Box>

          <Button
            variant="outlined"
            onClick={onProvideFeedback}
            sx={{
              borderColor: '#f59e0b', color: '#f59e0b', textTransform: 'none',
              fontWeight: 700, fontSize: '14px', borderRadius: '8px', px: 3, py: 1,
              '&:hover': { backgroundColor: '#f59e0b', color: '#1e293b' },
            }}
          >
            Provide Feedback
          </Button>

        </Box>
        {/* ── Calendar ── */}
        <Box sx={{ width: 300 }}>
          <Typography sx={{ color: '#ffffff', fontSize: '16px', fontWeight: 700, borderBottom: '2px solid #f59e0b', pb: 0.5, mb: 2, display: 'inline-block' }}>
            Calendar
          </Typography>

          {/* Month nav */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <IconButton onClick={prevMonth} size="small" sx={{ color: '#f59e0b', p: 0 }}>
              <ChevronLeft sx={{ fontSize: 22 }} />
            </IconButton>
            <Typography sx={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 600 }}>
              {MONTHS[viewMonth]} {viewYear}
            </Typography>
            <IconButton onClick={nextMonth} size="small" sx={{ color: '#f59e0b', p: 0 }}>
              <ChevronRight sx={{ fontSize: 22 }} />
            </IconButton>
          </Box>

          {/* Day headers – 7 equal columns */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {DAYS.map((d) => (
              <Box key={d} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 32 }}>
                <Typography sx={{ color: '#94a3b8', fontSize: '11px', fontWeight: 700 }}>
                  {d}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Date cells – square: each cell 32×32 */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {cells.map((day, i) => (
              <Box
                key={i}
                sx={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '100%', aspectRatio: '1 / 1',
                }}
              >
                {day && (
                  <Box
                    sx={{
                      width: 28, height: 28,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: '50%',
                      backgroundColor: isToday(day) ? '#f59e0b' : 'transparent',
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: isToday(day) ? '#f59e0b' : 'rgba(245,158,11,0.2)' },
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '13px',
                        fontWeight: isToday(day) ? 800 : 400,
                        color: isToday(day) ? '#1e293b' : '#cbd5e1',
                        lineHeight: 1,
                        userSelect: 'none',
                      }}
                    >
                      {day}
                    </Typography>
                  </Box>
                )}
              </Box>
            ))}
          </Box>

          {/* Full calendar link */}
          <Typography
            sx={{ color: '#f59e0b', fontSize: '13px', mt: 1.5, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
          >
            Full calendar
          </Typography>
        </Box>

      </Box>

      {/* ── Bottom copyright bar ── */}
      <Box
        sx={{
          borderTop: '1px solid rgba(255,255,255,0.08)',
          py: 1.5,
          textAlign: 'center',
        }}
      >
        <Typography sx={{ color: '#64748b', fontSize: '12px' }}>
          © {new Date().getFullYear()} Warehouse Safety Monitoring System
        </Typography>
      </Box>

    </Box>
  );
};

export default Footer;
