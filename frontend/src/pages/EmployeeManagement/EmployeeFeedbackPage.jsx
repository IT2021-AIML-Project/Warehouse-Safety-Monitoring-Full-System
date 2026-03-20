import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Chip,
  Alert,
  Collapse,
  Tooltip,
  IconButton,
  Divider,
  Avatar,
} from '@mui/material';
import {
  Feedback,
  Send,
  Star,
  StarBorder,
  Close,
  CheckCircle,
  AttachFile,
  PictureAsPdf,
  Image as ImageIcon,
  InsertDriveFile,
  FileUploadOutlined,
  DeleteOutline,
  Visibility,
  WarningAmber,
  BugReport,
  SupportAgent,
  Category,
  History,
  Person,
  Schedule,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';


// ── Categories ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: 'general',   label: 'General Feedback',    color: '#1d4ed8', bg: '#dbeafe', border: '#93c5fd', icon: Feedback     },
  { key: 'safety',    label: 'Safety Concern',       color: '#dc2626', bg: '#fee2e2', border: '#fca5a5', icon: WarningAmber },
  { key: 'equipment', label: 'Equipment Issue',      color: '#b45309', bg: '#fef3c7', border: '#fcd34d', icon: BugReport    },
  { key: 'supervisor',label: 'Supervisor Feedback',  color: '#7c3aed', bg: '#ede9fe', border: '#c4b5fd', icon: SupportAgent },
  { key: 'other',     label: 'Other',               color: '#0f766e', bg: '#ccfbf1', border: '#5eead4', icon: Category     },
];

const catOf = (key) => CATEGORIES.find((c) => c.key === key) || CATEGORIES[0];

// ── File helpers ──────────────────────────────────────────────────────────────
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
const MAX_FILE_SIZE_MB = 10;
const MAX_FILES = 5;

const getFileIcon  = (type) => { if (type === 'application/pdf') return PictureAsPdf; if (type?.startsWith('image/')) return ImageIcon; return InsertDriveFile; };
const getFileColor = (type) => { if (type === 'application/pdf') return { color: '#dc2626', bg: '#fff1f2', border: '#fecaca' }; if (type?.startsWith('image/')) return { color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd' }; return { color: '#0f766e', bg: '#f0fdfa', border: '#5eead4' }; };
const formatBytes  = (b) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`;

const initForm = { category: 'general', rating: 0, title: '', message: '', anonymous: false };

// ─────────────────────────────────────────────────────────────────────────────
const EmployeeFeedbackPage = () => {
  const { user } = useAuth();

  const [form, setForm]               = useState(initForm);
  const [hoverRating, setHoverRating] = useState(0);
  const [attachments, setAttachments] = useState([]);
  const [attachError, setAttachError] = useState('');
  const [dragOver, setDragOver]       = useState(false);
  const [errors, setErrors]           = useState({});
  const [successMsg, setSuccessMsg]   = useState('');
  const [history, setHistory]         = useState([]);
  const fileInputRef                  = useRef(null);

  // Load history from API on mount
  useEffect(() => {
    const fetchHistory = async () => {
      if (!user?.id) return;
      try {
        const { getEmployeeFeedbacks } = await import('../../services/api');
        const res = await getEmployeeFeedbacks(user.id);
        setHistory(res.data.feedbacks || []);
      } catch (err) {
        console.error('Failed to load feedback history:', err);
      }
    };
    fetchHistory();
  }, [user]);

  // ── File processing ──
  const processFiles = (rawFiles) => {
    setAttachError('');
    const results = []; const errs = [];
    for (const file of Array.from(rawFiles)) {
      if (!ALLOWED_TYPES.includes(file.type)) { errs.push(`"${file.name}" is not allowed.`); continue; }
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) { errs.push(`"${file.name}" exceeds ${MAX_FILE_SIZE_MB} MB.`); continue; }
      if (attachments.length + results.length >= MAX_FILES) { errs.push(`Max ${MAX_FILES} files.`); break; }
      results.push({ id: `${Date.now()}-${Math.random()}`, name: file.name, size: file.size, type: file.type, url: URL.createObjectURL(file) });
    }
    if (errs.length) setAttachError(errs.join(' '));
    if (results.length) setAttachments((p) => [...p, ...results]);
  };
  const removeAttachment = (id) => setAttachments((p) => p.filter((a) => a.id !== id));

  // ── Validation ──
  const validate = () => {
    const errs = {};
    if (!form.title.trim())   errs.title   = 'Title is required.';
    if (!form.message.trim()) errs.message = 'Message is required.';
    if (form.rating === 0)    errs.rating  = 'Please select a rating.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit ──
  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      const { createFeedback } = await import('../../services/api');
      const payload = {
        category: form.category,
        rating: form.rating,
        title: form.title.trim(),
        message: form.message.trim(),
        anonymous: form.anonymous,
        submittedBy: user?.id || null,
        submittedByName: form.anonymous ? 'Anonymous' : (user?.fullName || user?.username || 'Employee'),
        attachments: attachments.map(({ name, size, type }) => ({ name, size, type })),
      };

      const res = await createFeedback(payload);
      const saved = res.data.feedback;
      setHistory((prev) => [saved, ...prev]);
      setSuccessMsg('Your feedback has been submitted successfully! The admin team will review it shortly.');
      setForm(initForm);
      setAttachments([]);
      setAttachError('');
      setErrors({});
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err) {
      console.error('Submit feedback error:', err);
      setErrors({ submit: err.response?.data?.message || 'Failed to submit feedback' });
    }
  };

  const cat = catOf(form.category);
  const CatIcon = cat.icon;

  const statusCfg = {
    new:         { label: 'New',          color: '#1d4ed8', bg: '#dbeafe', border: '#93c5fd' },
    'in-review': { label: 'Under Review', color: '#b45309', bg: '#fef3c7', border: '#fcd34d' },
    resolved:    { label: 'Resolved',     color: '#16a34a', bg: '#dcfce7', border: '#86efac' },
  };

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
        <Typography sx={{ fontWeight: 800, color: '#1e293b', fontSize: '22px' }}>
          Submit Feedback
        </Typography>
        <Typography sx={{ color: '#64748b', fontSize: '14px', maxWidth: 480 }}>
          Share your thoughts, report issues, or raise safety concerns. Your feedback helps us improve.
        </Typography>
      </Paper>

      {/* ── Success Alert ── */}
      <Collapse in={!!successMsg}>
        <Alert icon={<CheckCircle />} severity="success"
          sx={{ mb: 3, borderRadius: '12px', fontWeight: 600 }}
          action={<IconButton size="small" onClick={() => setSuccessMsg('')}><Close fontSize="small" /></IconButton>}>
          {successMsg}
        </Alert>
      </Collapse>

      <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' }, alignItems: 'flex-start' }}>

        {/* ══════════════ LEFT: Compose Form ══════════════ */}
        <Paper elevation={0}
          sx={{ flex: '1 1 0%', minWidth: 0, border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden' }}>

          <Box sx={{ px: 3, pt: 2.5, pb: 2, borderBottom: '1px solid #f1f5f9', backgroundColor: '#fafbff' }}>
            <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: '15px' }}>Feedback Form</Typography>
            <Typography sx={{ fontSize: '12px', color: '#94a3b8', mt: 0.3 }}>
              All fields marked with * are required.
            </Typography>
          </Box>

          <Box sx={{ p: 3 }}>

            {/* Category */}
            <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#475569', mb: 1 }}>
              Category *
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2.5 }}>
              {CATEGORIES.map((c) => {
                const Icon = c.icon;
                const active = form.category === c.key;
                return (
                  <Chip key={c.key}
                    icon={<Icon sx={{ fontSize: 15, color: active ? c.color : '#94a3b8' }} />}
                    label={c.label}
                    onClick={() => setForm((f) => ({ ...f, category: c.key }))}
                    sx={{ fontWeight: active ? 700 : 500, fontSize: '12px', cursor: 'pointer',
                      backgroundColor: active ? c.bg : '#f8fafc', color: active ? c.color : '#64748b',
                      border: active ? `1.5px solid ${c.color}66` : '1.5px solid #e2e8f0',
                      '&:hover': { backgroundColor: c.bg, color: c.color } }} />
                );
              })}
            </Box>

            {/* Star Rating */}
            <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#475569', mb: 0.8 }}>
              Overall Rating *
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: errors.rating ? 0.5 : 2.5 }}>
              {[1, 2, 3, 4, 5].map((star) => {
                const filled = star <= (hoverRating || form.rating);
                return (
                  <IconButton key={star} size="small"
                    onClick={() => { setForm((f) => ({ ...f, rating: star })); setErrors((e) => ({ ...e, rating: '' })); }}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    sx={{ color: filled ? '#f59e0b' : '#d1d5db', p: '2px', '&:hover': { backgroundColor: 'transparent' } }}>
                    {filled
                      ? <Star sx={{ fontSize: 30 }} />
                      : <StarBorder sx={{ fontSize: 30 }} />}
                  </IconButton>
                );
              })}
              {form.rating > 0 && (
                <Typography sx={{ ml: 1, fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
                  {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][form.rating]}
                </Typography>
              )}
            </Box>
            {errors.rating && <Typography sx={{ color: '#ef4444', fontSize: '12px', mb: 2 }}>{errors.rating}</Typography>}

            {/* Title */}
            <TextField fullWidth label="Subject / Title *"
              placeholder="e.g. Broken equipment in Zone A"
              value={form.title}
              onChange={(e) => { setForm((f) => ({ ...f, title: e.target.value })); setErrors((er) => ({ ...er, title: '' })); }}
              error={!!errors.title} helperText={errors.title}
              sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }} />

            {/* Message */}
            <TextField fullWidth multiline rows={5} label="Details / Description *"
              placeholder="Describe your feedback in detail…"
              value={form.message}
              onChange={(e) => { setForm((f) => ({ ...f, message: e.target.value })); setErrors((er) => ({ ...er, message: '' })); }}
              error={!!errors.message} helperText={errors.message}
              sx={{ mb: 2.5, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }} />

            {/* Anonymous toggle */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5, p: 1.8,
              borderRadius: '10px', backgroundColor: form.anonymous ? '#f5f3ff' : '#f8fafc',
              border: `1.5px solid ${form.anonymous ? '#c4b5fd' : '#e2e8f0'}`, cursor: 'pointer' }}
              onClick={() => setForm((f) => ({ ...f, anonymous: !f.anonymous }))}>
              <Box sx={{ width: 38, height: 22, borderRadius: '11px', backgroundColor: form.anonymous ? '#7c3aed' : '#d1d5db',
                position: 'relative', transition: 'all 0.2s', flexShrink: 0 }}>
                <Box sx={{ position: 'absolute', top: '3px', left: form.anonymous ? '19px' : '3px',
                  width: 16, height: 16, borderRadius: '50%', backgroundColor: '#fff', transition: 'all 0.2s', boxShadow: '0 1px 3px #0003' }} />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 700, color: form.anonymous ? '#7c3aed' : '#475569', fontSize: '13px' }}>
                  Submit Anonymously
                </Typography>
                <Typography sx={{ fontSize: '11px', color: '#94a3b8' }}>
                  Your name will be hidden from the admin review
                </Typography>
              </Box>
            </Box>

            {/* Attachments */}
            <Box sx={{ mb: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography sx={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>Attachments</Typography>
                <Chip icon={<AttachFile sx={{ fontSize: 12 }} />} label={`${attachments.length} / ${MAX_FILES}`} size="small"
                  sx={{ fontWeight: 700, fontSize: '11px',
                    backgroundColor: attachments.length > 0 ? '#f5f3ff' : '#f1f5f9',
                    color: attachments.length > 0 ? '#7c3aed' : '#94a3b8' }} />
              </Box>
              <input ref={fileInputRef} type="file" multiple accept="image/*,application/pdf"
                style={{ display: 'none' }} onChange={(e) => processFiles(e.target.files)} />
              <Box onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); processFiles(e.dataTransfer.files); }}
                sx={{ border: `2px dashed ${dragOver ? '#7c3aed' : attachError ? '#fca5a5' : '#cbd5e1'}`,
                  borderRadius: '10px', p: 2.5, textAlign: 'center',
                  cursor: attachments.length >= MAX_FILES ? 'not-allowed' : 'pointer',
                  backgroundColor: dragOver ? '#f5f3ff' : '#fafafa', transition: 'all 0.2s',
                  '&:hover': attachments.length < MAX_FILES ? { borderColor: '#7c3aed', backgroundColor: '#f5f3ff' } : {} }}>
                <FileUploadOutlined sx={{ fontSize: 28, color: dragOver ? '#7c3aed' : '#94a3b8', mb: 0.5 }} />
                <Typography sx={{ fontWeight: 600, color: dragOver ? '#7c3aed' : '#475569', fontSize: '13px' }}>
                  {attachments.length >= MAX_FILES ? `Max ${MAX_FILES} files reached` : 'Click or drag & drop'}
                </Typography>
                <Typography sx={{ fontSize: '11px', color: '#94a3b8' }}>JPG, PNG, GIF, WebP, PDF</Typography>
              </Box>
              {attachError && <Alert severity="error" onClose={() => setAttachError('')} sx={{ mt: 1, borderRadius: '8px', fontSize: '12px' }}>{attachError}</Alert>}
              {attachments.length > 0 && (
                <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {attachments.map((file) => {
                    const FileIcon = getFileIcon(file.type);
                    const clr = getFileColor(file.type);
                    const isImg = file.type?.startsWith('image/');
                    return (
                      <Paper key={file.id} elevation={0}
                        sx={{ border: `1.5px solid ${clr.border}`, borderRadius: '8px', p: 1.2,
                          display: 'flex', alignItems: 'center', gap: 1.2, backgroundColor: clr.bg }}>
                        {isImg
                          ? <Box component="img" src={file.url} alt={file.name}
                              sx={{ width: 36, height: 36, borderRadius: '6px', objectFit: 'cover', border: `1px solid ${clr.border}`, flexShrink: 0 }} />
                          : <Box sx={{ width: 36, height: 36, borderRadius: '6px', backgroundColor: '#fff', border: `1px solid ${clr.border}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <FileIcon sx={{ fontSize: 19, color: clr.color }} />
                            </Box>
                        }
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 600, color: '#1e293b', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</Typography>
                          <Typography sx={{ fontSize: '11px', color: '#64748b' }}>{isImg ? 'Image' : 'PDF'} · {formatBytes(file.size)}</Typography>
                        </Box>
                        <Tooltip title="Preview"><IconButton size="small" onClick={() => window.open(file.url, '_blank')}
                          sx={{ border: '1px solid #e2e8f0', borderRadius: '6px', p: '4px', color: clr.color, backgroundColor: '#fff' }}>
                          <Visibility sx={{ fontSize: 13 }} />
                        </IconButton></Tooltip>
                        <Tooltip title="Remove"><IconButton size="small" onClick={() => removeAttachment(file.id)}
                          sx={{ border: '1px solid #fecaca', borderRadius: '6px', p: '4px', color: '#ef4444', backgroundColor: '#fff1f2' }}>
                          <DeleteOutline sx={{ fontSize: 13 }} />
                        </IconButton></Tooltip>
                      </Paper>
                    );
                  })}
                </Box>
              )}
            </Box>

            {/* Preview */}
            {(form.title || form.message) && (
              <>
                <Divider sx={{ borderColor: '#f1f5f9', mb: 2 }} />
                <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: '13px', mb: 1 }}>Preview</Typography>
                <Paper elevation={0}
                  sx={{ border: `1.5px solid ${cat.color}33`, borderLeft: `4px solid ${cat.color}`,
                    borderRadius: '10px', p: 2, backgroundColor: cat.bg + '44', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.2 }}>
                    <Box sx={{ width: 34, height: 34, borderRadius: '8px', backgroundColor: cat.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CatIcon sx={{ fontSize: 18, color: cat.color }} />
                    </Box>
                    <Box>
                      <Typography sx={{ fontWeight: 800, color: '#1e293b', fontSize: '14px', mb: 0.2 }}>
                        {form.title || <span style={{ color: '#94a3b8' }}>Subject</span>}
                      </Typography>
                      <Typography sx={{ color: '#475569', fontSize: '13px', lineHeight: 1.6 }}>
                        {form.message || <span style={{ color: '#94a3b8' }}>Description…</span>}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </>
            )}

            {/* Actions */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
              <Button variant="outlined"
                onClick={() => { setForm(initForm); setErrors({}); setAttachments([]); setAttachError(''); }}
                sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '10px',
                  borderColor: '#e2e8f0', color: '#475569', '&:hover': { borderColor: '#cbd5e1', backgroundColor: '#f8fafc' } }}>
                Clear
              </Button>
              <Button variant="contained" startIcon={<Send sx={{ fontSize: 17 }} />} onClick={handleSubmit}
                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px', fontSize: '14px', px: 3,
                  backgroundColor: '#7c3aed', '&:hover': { backgroundColor: '#6d28d9' } }}>
                Submit Feedback
              </Button>
            </Box>
          </Box>
        </Paper>

        {/* ══════════════ RIGHT: My Feedback History ══════════════ */}
        <Box sx={{ flex: '1 1 0%', minWidth: 0 }}>
          <Paper elevation={0}
            sx={{ border: '1px solid #e2e8f0', borderRadius: '16px', p: 2.5, mb: 2,
              display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 38, height: 38, borderRadius: '10px', backgroundColor: '#f5f3ff',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <History sx={{ fontSize: 20, color: '#7c3aed' }} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: '15px' }}>My Feedback History</Typography>
              <Typography sx={{ fontSize: '12px', color: '#94a3b8' }}>{history.length} submission{history.length !== 1 ? 's' : ''}</Typography>
            </Box>
          </Paper>

          {history.length === 0 ? (
            <Paper elevation={0}
              sx={{ border: '1px solid #e2e8f0', borderRadius: '16px', p: 5,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 52, height: 52, borderRadius: '14px', backgroundColor: '#f1f5f9',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Feedback sx={{ fontSize: 26, color: '#94a3b8' }} />
              </Box>
              <Typography sx={{ fontWeight: 600, color: '#64748b', fontSize: '15px' }}>No feedback submitted yet</Typography>
              <Typography sx={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center' }}>
                Your submitted feedbacks will appear here so you can track their status.
              </Typography>
            </Paper>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {history.map((fb) => {
                const c   = catOf(fb.category);
                const Icon = c.icon;
                const st  = statusCfg[fb.status] || statusCfg.new;
                return (
                  <Paper key={fb.id} elevation={0}
                    sx={{ border: `1.5px solid ${c.color}33`, borderLeft: `5px solid ${c.color}`,
                      borderRadius: '14px', p: 2.5, backgroundColor: '#fff',
                      '&:hover': { boxShadow: '0 4px 16px #0001' }, transition: 'box-shadow 0.2s' }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                      <Box sx={{ width: 38, height: 38, borderRadius: '10px', backgroundColor: c.bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon sx={{ fontSize: 19, color: c.color }} />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.4 }}>
                          <Typography sx={{ fontWeight: 800, color: '#1e293b', fontSize: '14px' }}>{fb.title}</Typography>
                          <Chip label={c.label} size="small"
                            sx={{ fontWeight: 700, fontSize: '10px', backgroundColor: c.bg, color: c.color, border: `1px solid ${c.border}` }} />
                          <Chip label={st.label} size="small"
                            sx={{ fontWeight: 700, fontSize: '10px', backgroundColor: st.bg, color: st.color, border: `1px solid ${st.border}` }} />
                        </Box>
                        <Typography sx={{ color: '#475569', fontSize: '13px', lineHeight: 1.6, mb: 1 }}>{fb.message}</Typography>
                        {/* Stars */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, mb: 1 }}>
                          {[1,2,3,4,5].map((s) => (
                            <Star key={s} sx={{ fontSize: 14, color: s <= fb.rating ? '#f59e0b' : '#e2e8f0' }} />
                          ))}
                          <Typography sx={{ fontSize: '11px', color: '#64748b', ml: 0.5, fontWeight: 600 }}>
                            {['','Poor','Fair','Good','Very Good','Excellent'][fb.rating]}
                          </Typography>
                        </Box>
                        {/* Meta */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Person sx={{ fontSize: 13, color: '#94a3b8' }} />
                            <Typography sx={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                              {fb.anonymous ? 'Anonymous' : fb.submittedByName}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Schedule sx={{ fontSize: 13, color: '#94a3b8' }} />
                            <Typography sx={{ fontSize: '11px', color: '#94a3b8' }}>{fb.time}</Typography>
                          </Box>
                          {fb.attachments?.length > 0 && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                              <AttachFile sx={{ fontSize: 13, color: '#94a3b8' }} />
                              <Typography sx={{ fontSize: '11px', color: '#94a3b8' }}>
                                {fb.attachments.length} file{fb.attachments.length !== 1 ? 's' : ''}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default EmployeeFeedbackPage;
