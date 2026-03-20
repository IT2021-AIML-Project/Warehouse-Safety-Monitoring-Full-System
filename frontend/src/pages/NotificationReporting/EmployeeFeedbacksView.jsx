import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Divider,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Badge,
  Alert,
  TextField,
  Avatar,
} from '@mui/material';
import {
  Feedback,
  WarningAmber,
  BugReport,
  SupportAgent,
  Category,
  Star,
  StarBorder,
  Person,
  Schedule,
  AttachFile,
  PictureAsPdf,
  Image as ImageIcon,
  InsertDriveFile,
  DeleteOutline,
  Close,
  Visibility,
  CheckCircle,
  HourglassEmpty,
  FiberNew,
  Flag,
  Inbox,
  FilterList,
  Refresh,
} from '@mui/icons-material';


// ── Categories ─────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: 'general',    label: 'General Feedback',   color: '#1d4ed8', bg: '#dbeafe', border: '#93c5fd', icon: Feedback     },
  { key: 'safety',     label: 'Safety Concern',      color: '#dc2626', bg: '#fee2e2', border: '#fca5a5', icon: WarningAmber },
  { key: 'equipment',  label: 'Equipment Issue',     color: '#b45309', bg: '#fef3c7', border: '#fcd34d', icon: BugReport    },
  { key: 'supervisor', label: 'Supervisor Feedback', color: '#7c3aed', bg: '#ede9fe', border: '#c4b5fd', icon: SupportAgent },
  { key: 'other',      label: 'Other',              color: '#0f766e', bg: '#ccfbf1', border: '#5eead4', icon: Category     },
];

const STATUS_CFG = {
  new:         { label: 'New',          icon: FiberNew,       color: '#1d4ed8', bg: '#dbeafe', border: '#93c5fd' },
  'in-review': { label: 'Under Review', icon: HourglassEmpty, color: '#b45309', bg: '#fef3c7', border: '#fcd34d' },
  resolved:    { label: 'Resolved',     icon: CheckCircle,    color: '#16a34a', bg: '#dcfce7', border: '#86efac' },
};

const catOf    = (key) => CATEGORIES.find((c) => c.key === key) || CATEGORIES[0];
const statusOf = (key) => STATUS_CFG[key]  || STATUS_CFG.new;

// ── File helpers ───────────────────────────────────────────────────────────────
const getFileIcon  = (type) => { if (type === 'application/pdf') return PictureAsPdf; if (type?.startsWith('image/')) return ImageIcon; return InsertDriveFile; };
const getFileColor = (type) => { if (type === 'application/pdf') return { color: '#dc2626', bg: '#fff1f2', border: '#fecaca' }; if (type?.startsWith('image/')) return { color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd' }; return { color: '#0f766e', bg: '#f0fdfa', border: '#5eead4' }; };
const formatBytes  = (b) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`;



// ─────────────────────────────────────────────────────────────────────────────
const EmployeeFeedbacksView = () => {
  const [feedbacks, setFeedbacks]   = useState([]);
  const [filterCat, setFilterCat]   = useState(null);
  const [filterSt,  setFilterSt]    = useState(null);
  const [searchQ,   setSearchQ]     = useState('');
  const [viewTarget, setViewTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const { getAllFeedbacks } = await import('../../services/api');
      const res = await getAllFeedbacks();
      setFeedbacks(res.data.feedbacks || []);
    } catch (err) {
      console.error('Failed to load feedbacks:', err);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // ── Status update ──
  const setStatus = async (id, status) => {
    try {
      const { updateFeedbackStatus } = await import('../../services/api');
      await updateFeedbackStatus(id, status);
      setFeedbacks((prev) => prev.map((f) => f.id === id ? { ...f, status } : f));
      if (viewTarget?.id === id) setViewTarget((v) => ({ ...v, status }));
    } catch (err) {
      console.error('Update status error:', err);
    }
  };

  // ── Delete ──
  const confirmDelete = async () => {
    try {
      const { deleteFeedback } = await import('../../services/api');
      await deleteFeedback(deleteTarget.id);
      setFeedbacks((prev) => prev.filter((f) => f.id !== deleteTarget.id));
      if (viewTarget?.id === deleteTarget.id) setViewTarget(null);
      setDeleteTarget(null);
    } catch (err) {
      console.error('Delete feedback error:', err);
    }
  };

  // ── Filtered list ──
  const filtered = feedbacks.filter((f) => {
    if (filterCat && f.category !== filterCat) return false;
    if (filterSt  && f.status   !== filterSt)  return false;
    if (searchQ && !f.title.toLowerCase().includes(searchQ.toLowerCase())
                && !f.message.toLowerCase().includes(searchQ.toLowerCase())
                && !f.submittedByName?.toLowerCase().includes(searchQ.toLowerCase())) return false;
    return true;
  });

  const countOf    = (key, type) => feedbacks.filter((f) => (type === 'cat' ? f.category : f.status) === key).length;
  const newCount   = feedbacks.filter((f) => f.status === 'new').length;

  return (
    <Box sx={{ width: '100%', px: { xs: 2, md: 3 }, py: 3, boxSizing: 'border-box' }}>

      {/* ── Page Header ── */}
      <Paper elevation={0}
        sx={{ border: '1px solid #e2e8f0', borderRadius: '16px', p: 3, mb: 3,
          display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 1.5,
          background: 'linear-gradient(135deg, #f5f3ff 0%, #fff 60%)' }}>
        <Box sx={{ width: 52, height: 52, borderRadius: '14px',
          background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Feedback sx={{ color: '#fff', fontSize: 28 }} />
        </Box>
        <Typography sx={{ fontWeight: 800, color: '#1e293b', fontSize: '20px' }}>Employee Feedbacks</Typography>
        <Typography sx={{ color: '#64748b', fontSize: '14px' }}>
          Review, manage status, and act on employee-submitted feedbacks.
        </Typography>
      </Paper>

      {/* ── Toolbar row ── */}
      <Paper elevation={0}
        sx={{ border: '1px solid #e2e8f0', borderRadius: '16px', p: 2.5, mb: 2 }}>

        {/* Top: counts + refresh + search */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Badge badgeContent={newCount} color="error"
              sx={{ '& .MuiBadge-badge': { fontSize: '11px', fontWeight: 700 } }}>
              <Box sx={{ width: 38, height: 38, borderRadius: '10px', backgroundColor: '#f5f3ff',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Inbox sx={{ fontSize: 20, color: '#7c3aed' }} />
              </Box>
            </Badge>
            <Box>
              <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: '15px' }}>
                {filtered.length} feedback{filtered.length !== 1 ? 's' : ''}
              </Typography>
              <Typography sx={{ fontSize: '12px', color: '#94a3b8' }}>
                {newCount} new · {feedbacks.filter((f) => f.status === 'in-review').length} under review · {feedbacks.filter((f) => f.status === 'resolved').length} resolved
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField size="small" placeholder="Search feedbacks…"
              value={searchQ} onChange={(e) => setSearchQ(e.target.value)}
              sx={{ width: 200, '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '13px' } }} />
            <Tooltip title="Refresh">
              <IconButton onClick={refresh} size="small"
                sx={{ border: '1px solid #e2e8f0', borderRadius: '8px', p: '6px', color: '#64748b' }}>
                <Refresh sx={{ fontSize: 17 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Status filter */}
        <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap', mb: 1.5 }}>
          <Chip label={`All (${feedbacks.length})`} size="small"
            onClick={() => setFilterSt(null)}
            sx={{ fontWeight: filterSt === null ? 700 : 500, fontSize: '12px', cursor: 'pointer',
              backgroundColor: filterSt === null ? '#7c3aed' : '#f1f5f9',
              color: filterSt === null ? '#fff' : '#64748b',
              '&:hover': { backgroundColor: '#7c3aed', color: '#fff' } }} />
          {Object.entries(STATUS_CFG).map(([key, cfg]) => {
            const active = filterSt === key;
            const Icon = cfg.icon;
            return (
              <Chip key={key}
                icon={<Icon sx={{ fontSize: 13, color: active ? cfg.color : '#94a3b8' }} />}
                label={`${cfg.label} (${countOf(key, 'st')})`} size="small"
                onClick={() => setFilterSt(active ? null : key)}
                sx={{ fontWeight: active ? 700 : 500, fontSize: '12px', cursor: 'pointer',
                  backgroundColor: active ? cfg.bg : '#f8fafc', color: active ? cfg.color : '#64748b',
                  border: active ? `1.5px solid ${cfg.border}` : '1.5px solid #e2e8f0',
                  '&:hover': { backgroundColor: cfg.bg, color: cfg.color } }} />
            );
          })}
        </Box>

        {/* Category filter */}
        <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: 0.5 }}>
            <FilterList sx={{ fontSize: 14, color: '#94a3b8' }} />
            <Typography sx={{ fontSize: '12px', color: '#94a3b8' }}>Category:</Typography>
          </Box>
          {CATEGORIES.map((c) => {
            const active = filterCat === c.key;
            const Icon = c.icon;
            return (
              <Chip key={c.key}
                icon={<Icon sx={{ fontSize: 12, color: active ? c.color : '#94a3b8' }} />}
                label={`${c.label} (${countOf(c.key, 'cat')})`} size="small"
                onClick={() => setFilterCat(active ? null : c.key)}
                sx={{ fontWeight: active ? 700 : 500, fontSize: '11px', cursor: 'pointer',
                  backgroundColor: active ? c.bg : '#f8fafc', color: active ? c.color : '#64748b',
                  border: active ? `1.5px solid ${c.border}` : '1.5px solid #e2e8f0',
                  '&:hover': { backgroundColor: c.bg, color: c.color } }} />
            );
          })}
        </Box>
      </Paper>

      {/* ── Feedback cards ── */}
      {filtered.length === 0 ? (
        <Paper elevation={0}
          sx={{ border: '1px solid #e2e8f0', borderRadius: '16px', p: 6,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 56, height: 56, borderRadius: '14px', backgroundColor: '#f1f5f9',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Feedback sx={{ fontSize: 28, color: '#94a3b8' }} />
          </Box>
          <Typography sx={{ fontWeight: 600, color: '#64748b', fontSize: '15px' }}>No feedbacks found</Typography>
          <Typography sx={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center' }}>
            {feedbacks.length === 0
              ? 'No employee feedbacks have been submitted yet.'
              : 'Try adjusting your filters or search query.'}
          </Typography>
          {feedbacks.length > 0 && (
            <Button size="small" variant="outlined" onClick={() => { setFilterCat(null); setFilterSt(null); setSearchQ(''); }}
              sx={{ textTransform: 'none', borderRadius: '8px', mt: 0.5, borderColor: '#e2e8f0', color: '#64748b' }}>
              Clear Filters
            </Button>
          )}
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {filtered.map((fb) => {
            const c   = catOf(fb.category);
            const Icon = c.icon;
            const st  = statusOf(fb.status);
            const StIcon = st.icon;
            return (
              <Paper key={fb.id} elevation={0}
                sx={{ border: `1.5px solid ${fb.status === 'new' ? c.color + '44' : '#e2e8f0'}`,
                  borderLeft: `5px solid ${c.color}`, borderRadius: '14px',
                  backgroundColor: fb.status === 'new' ? c.bg + '18' : '#fff',
                  '&:hover': { boxShadow: '0 4px 16px #0001' }, transition: 'box-shadow 0.2s' }}>
                <Box sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>

                    {/* Category icon */}
                    <Box sx={{ width: 42, height: 42, borderRadius: '10px', backgroundColor: c.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon sx={{ fontSize: 21, color: c.color }} />
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      {/* Title row */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.4 }}>
                        <Typography sx={{ fontWeight: 800, color: '#1e293b', fontSize: '15px' }}>{fb.title}</Typography>
                        <Chip label={c.label} size="small"
                          sx={{ fontWeight: 700, fontSize: '10px', backgroundColor: c.bg, color: c.color, border: `1px solid ${c.border}` }} />
                        <Chip
                          icon={<StIcon sx={{ fontSize: 11, color: st.color }} />}
                          label={st.label} size="small"
                          sx={{ fontWeight: 700, fontSize: '10px', backgroundColor: st.bg, color: st.color, border: `1px solid ${st.border}` }} />
                        {fb.anonymous && (
                          <Chip label="Anonymous" size="small"
                            sx={{ fontWeight: 700, fontSize: '10px', backgroundColor: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' }} />
                        )}
                      </Box>

                      {/* Message */}
                      <Typography sx={{ color: '#475569', fontSize: '13.5px', lineHeight: 1.6, mb: 1,
                        overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {fb.message}
                      </Typography>

                      {/* Stars */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, mb: 1 }}>
                        {[1,2,3,4,5].map((s) => (
                          <Star key={s} sx={{ fontSize: 14, color: s <= fb.rating ? '#f59e0b' : '#e2e8f0' }} />
                        ))}
                        <Typography sx={{ fontSize: '11px', color: '#64748b', ml: 0.5, fontWeight: 600 }}>
                          {['','Poor','Fair','Good','Very Good','Excellent'][fb.rating]}
                        </Typography>
                      </Box>

                      {/* Attachments strip */}
                      {fb.attachments?.length > 0 && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.7, mb: 1 }}>
                          {fb.attachments.map((file) => {
                            const FileIcon = getFileIcon(file.type);
                            const clr = getFileColor(file.type);
                            return (
                              <Box key={file.id}
                                sx={{ display: 'flex', alignItems: 'center', gap: 0.6,
                                  border: `1px solid ${clr.border}`, borderRadius: '6px',
                                  backgroundColor: clr.bg, px: 1, py: 0.4 }}>
                                <FileIcon sx={{ fontSize: 13, color: clr.color }} />
                                <Typography sx={{ fontSize: '11px', fontWeight: 600, color: clr.color,
                                  maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {file.name}
                                </Typography>
                                <Typography sx={{ fontSize: '10px', color: '#94a3b8' }}>{formatBytes(file.size)}</Typography>
                              </Box>
                            );
                          })}
                        </Box>
                      )}

                      {/* Meta row */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Avatar sx={{ width: 18, height: 18, fontSize: '9px', backgroundColor: c.bg, color: c.color, fontWeight: 700 }}>
                            {(fb.submittedByName || '?')[0]}
                          </Avatar>
                          <Typography sx={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                            {fb.submittedByName || 'Unknown'}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Schedule sx={{ fontSize: 13, color: '#94a3b8' }} />
                          <Typography sx={{ fontSize: '12px', color: '#94a3b8' }}>{fb.time}</Typography>
                        </Box>
                        {fb.attachments?.length > 0 && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                            <AttachFile sx={{ fontSize: 13, color: '#94a3b8' }} />
                            <Typography sx={{ fontSize: '12px', color: '#94a3b8' }}>
                              {fb.attachments.length} attachment{fb.attachments.length !== 1 ? 's' : ''}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Box>

                    {/* Action buttons */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8, flexShrink: 0 }}>
                      <Tooltip title="View details">
                        <IconButton size="small" onClick={() => setViewTarget(fb)}
                          sx={{ border: '1px solid #bfdbfe', borderRadius: '8px', p: '5px',
                            color: '#1d4ed8', backgroundColor: '#eff6ff', '&:hover': { backgroundColor: '#dbeafe' } }}>
                          <Visibility sx={{ fontSize: 15 }} />
                        </IconButton>
                      </Tooltip>
                      {fb.status !== 'in-review' && fb.status !== 'resolved' && (
                        <Tooltip title="Mark as Under Review">
                          <IconButton size="small" onClick={() => setStatus(fb.id, 'in-review')}
                            sx={{ border: '1px solid #fcd34d', borderRadius: '8px', p: '5px',
                              color: '#b45309', backgroundColor: '#fef9c3', '&:hover': { backgroundColor: '#fef3c7' } }}>
                            <HourglassEmpty sx={{ fontSize: 15 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                      {fb.status !== 'resolved' && (
                        <Tooltip title="Mark as Resolved">
                          <IconButton size="small" onClick={() => setStatus(fb.id, 'resolved')}
                            sx={{ border: '1px solid #86efac', borderRadius: '8px', p: '5px',
                              color: '#16a34a', backgroundColor: '#f0fdf4', '&:hover': { backgroundColor: '#dcfce7' } }}>
                            <CheckCircle sx={{ fontSize: 15 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                      {fb.status === 'resolved' && (
                        <Tooltip title="Re-open (set to New)">
                          <IconButton size="small" onClick={() => setStatus(fb.id, 'new')}
                            sx={{ border: '1px solid #93c5fd', borderRadius: '8px', p: '5px',
                              color: '#1d4ed8', backgroundColor: '#eff6ff', '&:hover': { backgroundColor: '#dbeafe' } }}>
                            <Flag sx={{ fontSize: 15 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => setDeleteTarget(fb)}
                          sx={{ border: '1px solid #fecaca', borderRadius: '8px', p: '5px',
                            color: '#ef4444', backgroundColor: '#fff1f2', '&:hover': { backgroundColor: '#fee2e2' } }}>
                          <DeleteOutline sx={{ fontSize: 15 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </Box>
              </Paper>
            );
          })}
        </Box>
      )}

      {/* ── View Details Dialog ── */}
      <Dialog open={!!viewTarget} onClose={() => setViewTarget(null)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: '14px' } }}>
        {viewTarget && (() => {
          const c    = catOf(viewTarget.category);
          const Icon = c.icon;
          const st   = statusOf(viewTarget.status);
          const StIcon = st.icon;
          return (
            <>
              <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                  <Box sx={{ width: 36, height: 36, borderRadius: '8px', backgroundColor: c.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon sx={{ fontSize: 20, color: c.color }} />
                  </Box>
                  <Typography sx={{ fontWeight: 700, fontSize: '16px' }}>Feedback Details</Typography>
                </Box>
                <IconButton onClick={() => setViewTarget(null)} size="small"><Close /></IconButton>
              </DialogTitle>
              <DialogContent>
                {/* Chips */}
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                  <Chip label={c.label} size="small"
                    sx={{ fontWeight: 700, fontSize: '12px', backgroundColor: c.bg, color: c.color, border: `1px solid ${c.border}` }} />
                  <Chip icon={<StIcon sx={{ fontSize: 12, color: st.color }} />} label={st.label} size="small"
                    sx={{ fontWeight: 700, fontSize: '12px', backgroundColor: st.bg, color: st.color, border: `1px solid ${st.border}` }} />
                  {viewTarget.anonymous && <Chip label="Anonymous" size="small"
                    sx={{ fontWeight: 700, fontSize: '12px', backgroundColor: '#f1f5f9', color: '#64748b' }} />}
                </Box>

                <Typography sx={{ fontWeight: 800, color: '#1e293b', fontSize: '17px', mb: 1 }}>{viewTarget.title}</Typography>
                <Typography sx={{ color: '#475569', fontSize: '14px', lineHeight: 1.7, mb: 2 }}>{viewTarget.message}</Typography>

                {/* Stars */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, mb: 2 }}>
                  {[1,2,3,4,5].map((s) => (
                    <Star key={s} sx={{ fontSize: 20, color: s <= viewTarget.rating ? '#f59e0b' : '#e2e8f0' }} />
                  ))}
                  <Typography sx={{ fontSize: '13px', color: '#64748b', ml: 1, fontWeight: 600 }}>
                    {['','Poor','Fair','Good','Very Good','Excellent'][viewTarget.rating]}
                  </Typography>
                </Box>

                {/* Attachments */}
                {viewTarget.attachments?.length > 0 && (
                  <>
                    <Divider sx={{ mb: 1.5 }} />
                    <Typography sx={{ fontWeight: 700, color: '#475569', fontSize: '13px', mb: 1 }}>
                      Attachments ({viewTarget.attachments.length})
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                      {viewTarget.attachments.map((file) => {
                        const FileIcon = getFileIcon(file.type);
                        const clr = getFileColor(file.type);
                        return (
                          <Box key={file.id}
                            sx={{ display: 'flex', alignItems: 'center', gap: 0.8,
                              border: `1px solid ${clr.border}`, borderRadius: '8px',
                              backgroundColor: clr.bg, px: 1.2, py: 0.7 }}>
                            <FileIcon sx={{ fontSize: 16, color: clr.color }} />
                            <Box>
                              <Typography sx={{ fontSize: '12px', fontWeight: 600, color: clr.color,
                                maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {file.name}
                              </Typography>
                              <Typography sx={{ fontSize: '10px', color: '#94a3b8' }}>{formatBytes(file.size)}</Typography>
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  </>
                )}

                <Divider sx={{ mb: 1.5 }} />
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                    <Person sx={{ fontSize: 15, color: '#94a3b8' }} />
                    <Typography sx={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>{viewTarget.submittedByName}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                    <Schedule sx={{ fontSize: 15, color: '#94a3b8' }} />
                    <Typography sx={{ fontSize: '12px', color: '#94a3b8' }}>{viewTarget.time}</Typography>
                  </Box>
                </Box>

                {/* Status actions inside dialog */}
                <Divider sx={{ my: 1.5 }} />
                <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#475569', mb: 1 }}>Update Status</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {Object.entries(STATUS_CFG).map(([key, cfg]) => {
                    const SIcon = cfg.icon;
                    const active = viewTarget.status === key;
                    return (
                      <Chip key={key}
                        icon={<SIcon sx={{ fontSize: 13, color: active ? cfg.color : '#94a3b8' }} />}
                        label={cfg.label} size="small"
                        onClick={() => setStatus(viewTarget.id, key)}
                        sx={{ fontWeight: active ? 700 : 500, fontSize: '12px', cursor: 'pointer',
                          backgroundColor: active ? cfg.bg : '#f8fafc', color: active ? cfg.color : '#64748b',
                          border: active ? `1.5px solid ${cfg.border}` : '1.5px solid #e2e8f0',
                          '&:hover': { backgroundColor: cfg.bg, color: cfg.color } }} />
                    );
                  })}
                </Box>
              </DialogContent>
              <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={() => setViewTarget(null)} variant="outlined"
                  sx={{ textTransform: 'none', borderRadius: '8px', borderColor: '#e2e8f0', color: '#475569' }}>
                  Close
                </Button>
              </DialogActions>
            </>
          );
        })()}
      </Dialog>

      {/* ── Delete Confirm Dialog ── */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: '14px', p: 1 } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontWeight: 700, fontSize: '16px', color: '#ef4444' }}>Delete Feedback?</Typography>
          <IconButton onClick={() => setDeleteTarget(null)} size="small"><Close /></IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: '#475569', fontSize: '14px' }}>
            Are you sure you want to delete <strong>"{deleteTarget?.title}"</strong>? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setDeleteTarget(null)} variant="outlined"
            sx={{ textTransform: 'none', borderRadius: '9px', borderColor: '#e2e8f0', color: '#64748b' }}>
            Cancel
          </Button>
          <Button onClick={confirmDelete} variant="contained" startIcon={<DeleteOutline sx={{ fontSize: 16 }} />}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '9px',
              backgroundColor: '#ef4444', '&:hover': { backgroundColor: '#dc2626' } }}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EmployeeFeedbacksView;
