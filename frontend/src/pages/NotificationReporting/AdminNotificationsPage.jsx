import React, { useState, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Chip,
  Divider,
  Alert,
  Collapse,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Badge,
} from '@mui/material';
import {
  Send,
  WarningAmber,
  ErrorOutline,
  InfoOutlined,
  TaskAlt,
  Close,
  CheckCircle,
  AdminPanelSettings,
  AttachFile,
  PictureAsPdf,
  Image as ImageIcon,
  InsertDriveFile,
  FileUploadOutlined,
  DeleteOutline,
  Visibility,
  EditOutlined,
  Save,
  Inbox,
  MarkEmailRead,
  NotificationsNone,
} from '@mui/icons-material';

// ── Severity config ────────────────────────────────────────────────────────────
const SEVERITIES = [
  { value: 'info', label: 'Info', color: '#1d4ed8', bg: '#dbeafe', border: '#93c5fd', icon: InfoOutlined },
  { value: 'warning', label: 'Warning', color: '#a16207', bg: '#fef9c3', border: '#fcd34d', icon: WarningAmber },
  { value: 'danger', label: 'Alert', color: '#dc2626', bg: '#fee2e2', border: '#fca5a5', icon: ErrorOutline },
  { value: 'success', label: 'Success', color: '#16a34a', bg: '#dcfce7', border: '#86efac', icon: TaskAlt },
];

// ── File helpers ───────────────────────────────────────────────────────────────
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf',
];
const MAX_FILE_SIZE_MB = 10;
const MAX_FILES = 5;

const getFileIcon = (type) => {
  if (type === 'application/pdf') return PictureAsPdf;
  if (type?.startsWith('image/')) return ImageIcon;
  return InsertDriveFile;
};
const getFileColor = (type) => {
  if (type === 'application/pdf') return { color: '#dc2626', bg: '#fff1f2', border: '#fecaca' };
  if (type?.startsWith('image/')) return { color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd' };
  return { color: '#0f766e', bg: '#f0fdfa', border: '#5eead4' };
};
const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const sevCfgOf = (val) => SEVERITIES.find((s) => s.value === val) || SEVERITIES[0];

const initForm = { title: '', message: '', severity: 'info' };

// ─────────────────────────────────────────────────────────────────────────────
const AdminNotificationsPage = () => {
  // ── Compose state ──
  const [form, setForm] = useState(initForm);
  const [attachments, setAttachments] = useState([]);
  const [attachError, setAttachError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef(null);

  // ── Sent list state ──
  const [sent, setSent] = useState([]);
  const [readIds, setReadIds] = useState(new Set());

  // ── Edit dialog ──
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({});

  // ── Delete dialog ──
  const [deleteTarget, setDeleteTarget] = useState(null);

  // ── View dialog ──
  const [viewTarget, setViewTarget] = useState(null);

  // ── Active filter (null = all) ──
  const [filterSev, setFilterSev] = useState(null);

  // ── File processing ──
  const processFiles = (rawFiles) => {
    setAttachError('');
    const incoming = Array.from(rawFiles);
    const results = [];
    const errs = [];
    for (const file of incoming) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        errs.push(`"${file.name}" is not allowed.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        errs.push(`"${file.name}" exceeds ${MAX_FILE_SIZE_MB} MB.`);
        continue;
      }
      if (attachments.length + results.length >= MAX_FILES) {
        errs.push(`Max ${MAX_FILES} files allowed.`);
        break;
      }
      results.push({
        id: `${Date.now()}-${Math.random()}`,
        name: file.name, size: file.size, type: file.type,
        url: URL.createObjectURL(file), raw: file,
      });
    }
    if (errs.length) setAttachError(errs.join(' '));
    if (results.length) setAttachments((p) => [...p, ...results]);
  };

  const removeAttachment = (id) => setAttachments((p) => p.filter((a) => a.id !== id));

  // ── Validation ──
  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = 'Title is required.';
    if (!form.message.trim()) errs.message = 'Message is required.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Send ──
  const handleSend = () => {
    if (!validate()) return;
    const notif = {
      id: Date.now(),
      title: form.title.trim(),
      message: form.message.trim(),
      severity: form.severity,
      time: new Date().toLocaleString(),
      attachments: attachments.map(({ id, name, size, type, url }) => ({ id, name, size, type, url })),
    };
    setSent((p) => [notif, ...p]);
    setSuccessMsg(`Admin notification "${notif.title}" sent successfully!`);
    setForm(initForm);
    setAttachments([]);
    setAttachError('');
    setErrors({});
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  // ── Helpers ──
  const markRead = (id) => setReadIds((p) => new Set([...p, id]));
  const unreadCount = sent.filter((n) => !readIds.has(n.id)).length;
  const filtered = filterSev ? sent.filter((n) => n.severity === filterSev) : sent;

  const openEdit = (notif) => {
    setEditTarget(notif);
    setEditForm({ title: notif.title, message: notif.message, severity: notif.severity });
  };
  const saveEdit = () => {
    setSent((p) => p.map((n) => n.id === editTarget.id ? { ...n, ...editForm } : n));
    setEditTarget(null);
  };
  const confirmDelete = () => {
    setSent((p) => p.filter((n) => n.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const sevCfg = sevCfgOf(form.severity);
  const SevIcon = sevCfg.icon;

  // ── Count per severity for the filter row ──
  const countOf = (val) => sent.filter((n) => n.severity === val).length;

  return (
    <Box sx={{ width: '100%', px: { xs: 2, md: 3 }, py: 3, boxSizing: 'border-box' }}>

      {/* ── Page Header ── */}
      <Paper
        elevation={0}
        sx={{
          border: '1px solid #e2e8f0', borderRadius: '16px', p: 3, mb: 3,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          textAlign: 'center', gap: 1.5,
          background: 'linear-gradient(135deg, #f0f9ff 0%, #fff 60%)',
        }}
      >
        <Box
          sx={{
            width: 52, height: 52, borderRadius: '14px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <AdminPanelSettings sx={{ color: '#fff', fontSize: 28 }} />
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 800, color: '#1e293b', fontSize: '20px' }}>
            Admin Notifications
          </Typography>
          <Typography sx={{ color: '#64748b', fontSize: '14px', mt: 0.3 }}>
            Compose and manage internal admin-level notifications (no employee targeting).
          </Typography>
        </Box>
      </Paper>

      {/* ── Success Alert ── */}
      <Collapse in={!!successMsg}>
        <Alert
          icon={<CheckCircle />} severity="success"
          sx={{ mb: 3, borderRadius: '12px', fontWeight: 600 }}
          action={<IconButton size="small" onClick={() => setSuccessMsg('')}><Close fontSize="small" /></IconButton>}
        >
          {successMsg}
        </Alert>
      </Collapse>

      <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', lg: 'row' }, alignItems: 'flex-start' }}>

        {/* ══════════════════ LEFT — Compose Form ══════════════════ */}
        <Paper
          elevation={0}
          sx={{ flex: '0 0 480px', maxWidth: '100%', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden' }}
        >
          {/* Form header */}
          <Box sx={{ px: 3, pt: 2.5, pb: 2, borderBottom: '1px solid #f1f5f9', backgroundColor: '#fafbff' }}>
            <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: '15px' }}>
              Compose Admin Notification
            </Typography>
            <Typography sx={{ fontSize: '12px', color: '#94a3b8', mt: 0.3 }}>
              This notification is admin-level only — no employee recipient selection required.
            </Typography>
          </Box>

          <Box sx={{ p: 3 }}>
            {/* Severity picker */}
            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#475569', mb: 1 }}>
              Severity / Type
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2.5 }}>
              {SEVERITIES.map((s) => {
                const Icon = s.icon;
                const active = form.severity === s.value;
                return (
                  <Chip
                    key={s.value}
                    icon={<Icon sx={{ fontSize: 15, color: active ? s.color : '#94a3b8' }} />}
                    label={s.label}
                    onClick={() => setForm((f) => ({ ...f, severity: s.value }))}
                    sx={{
                      fontWeight: active ? 700 : 500, fontSize: '13px', cursor: 'pointer',
                      backgroundColor: active ? s.bg : '#f8fafc',
                      color: active ? s.color : '#64748b',
                      border: active ? `1.5px solid ${s.color}66` : '1.5px solid #e2e8f0',
                      '&:hover': { backgroundColor: s.bg, color: s.color },
                    }}
                  />
                );
              })}
            </Box>

            {/* Title */}
            <TextField
              fullWidth label="Notification Title"
              placeholder="e.g. System Maintenance Alert"
              value={form.title}
              onChange={(e) => { setForm((f) => ({ ...f, title: e.target.value })); setErrors((er) => ({ ...er, title: '' })); }}
              error={!!errors.title} helperText={errors.title}
              sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
            />

            {/* Message */}
            <TextField
              fullWidth multiline rows={4} label="Message"
              placeholder="Write the admin notification message here…"
              value={form.message}
              onChange={(e) => { setForm((f) => ({ ...f, message: e.target.value })); setErrors((er) => ({ ...er, message: '' })); }}
              error={!!errors.message} helperText={errors.message}
              sx={{ mb: 2.5, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
            />

            {/* ── Attachments ── */}
            <Box sx={{ mb: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                  Attachments
                </Typography>
                <Chip
                  icon={<AttachFile sx={{ fontSize: 13 }} />}
                  label={`${attachments.length} / ${MAX_FILES}`}
                  size="small"
                  sx={{
                    fontWeight: 700, fontSize: '11px',
                    backgroundColor: attachments.length > 0 ? '#eff6ff' : '#f1f5f9',
                    color: attachments.length > 0 ? '#1d4ed8' : '#94a3b8'
                  }}
                />
              </Box>

              <input
                ref={fileInputRef} type="file" multiple accept="image/*,application/pdf"
                style={{ display: 'none' }}
                onChange={(e) => processFiles(e.target.files)}
              />

              {/* Drop zone */}
              <Box
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); processFiles(e.dataTransfer.files); }}
                sx={{
                  border: `2px dashed ${dragOver ? '#3b82f6' : attachError ? '#fca5a5' : '#cbd5e1'}`,
                  borderRadius: '10px', p: 2.5, textAlign: 'center',
                  cursor: attachments.length >= MAX_FILES ? 'not-allowed' : 'pointer',
                  backgroundColor: dragOver ? '#eff6ff' : '#fafafa',
                  transition: 'all 0.2s',
                  '&:hover': attachments.length < MAX_FILES ? { borderColor: '#3b82f6', backgroundColor: '#eff6ff' } : {},
                }}
              >
                <FileUploadOutlined sx={{ fontSize: 28, color: dragOver ? '#3b82f6' : '#94a3b8', mb: 0.5 }} />
                <Typography sx={{ fontWeight: 600, color: dragOver ? '#3b82f6' : '#475569', fontSize: '13px' }}>
                  {attachments.length >= MAX_FILES ? `Max ${MAX_FILES} files reached` : 'Click or drag & drop'}
                </Typography>
                <Typography sx={{ fontSize: '11px', color: '#94a3b8' }}>JPG, PNG, GIF, WebP, PDF</Typography>
              </Box>

              {attachError && (
                <Alert severity="error" onClose={() => setAttachError('')} sx={{ mt: 1, borderRadius: '8px', fontSize: '12px' }}>
                  {attachError}
                </Alert>
              )}

              {/* File list */}
              {attachments.length > 0 && (
                <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {attachments.map((file) => {
                    const FileIcon = getFileIcon(file.type);
                    const clr = getFileColor(file.type);
                    const isImage = file.type?.startsWith('image/');
                    return (
                      <Paper key={file.id} elevation={0}
                        sx={{
                          border: `1.5px solid ${clr.border}`, borderRadius: '8px', p: 1.2,
                          display: 'flex', alignItems: 'center', gap: 1.2, backgroundColor: clr.bg
                        }}
                      >
                        {isImage ? (
                          <Box component="img" src={file.url} alt={file.name}
                            sx={{ width: 38, height: 38, borderRadius: '6px', objectFit: 'cover', border: `1px solid ${clr.border}`, flexShrink: 0 }} />
                        ) : (
                          <Box sx={{
                            width: 38, height: 38, borderRadius: '6px', backgroundColor: '#fff', border: `1px solid ${clr.border}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                          }}>
                            <FileIcon sx={{ fontSize: 20, color: clr.color }} />
                          </Box>
                        )}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 600, color: '#1e293b', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {file.name}
                          </Typography>
                          <Typography sx={{ fontSize: '11px', color: '#64748b' }}>
                            {file.type === 'application/pdf' ? 'PDF' : 'Image'} · {formatBytes(file.size)}
                          </Typography>
                        </Box>
                        <Tooltip title="Preview">
                          <IconButton size="small" onClick={() => window.open(file.url, '_blank')}
                            sx={{ border: '1px solid #e2e8f0', borderRadius: '6px', p: '4px', color: clr.color, backgroundColor: '#fff' }}>
                            <Visibility sx={{ fontSize: 13 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Remove">
                          <IconButton size="small" onClick={() => removeAttachment(file.id)}
                            sx={{ border: '1px solid #fecaca', borderRadius: '6px', p: '4px', color: '#ef4444', backgroundColor: '#fff1f2' }}>
                            <DeleteOutline sx={{ fontSize: 13 }} />
                          </IconButton>
                        </Tooltip>
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
                  sx={{
                    border: `1.5px solid ${sevCfg.color}33`, borderLeft: `5px solid ${sevCfg.color}`,
                    borderRadius: '10px', p: 2, backgroundColor: sevCfg.bg + '44', mb: 2
                  }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.2 }}>
                    <Box sx={{
                      width: 34, height: 34, borderRadius: '8px', backgroundColor: sevCfg.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      <SevIcon sx={{ fontSize: 18, color: sevCfg.color }} />
                    </Box>
                    <Box>
                      <Typography sx={{ fontWeight: 800, color: '#1e293b', fontSize: '14px', mb: 0.3 }}>
                        {form.title || <span style={{ color: '#94a3b8' }}>Title</span>}
                      </Typography>
                      <Typography sx={{ color: '#475569', fontSize: '13px', lineHeight: 1.6 }}>
                        {form.message || <span style={{ color: '#94a3b8' }}>Message…</span>}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </>
            )}

            {/* Actions */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
              <Button
                variant="outlined"
                onClick={() => { setForm(initForm); setErrors({}); setAttachments([]); setAttachError(''); }}
                sx={{
                  textTransform: 'none', fontWeight: 600, borderRadius: '10px', borderColor: '#e2e8f0', color: '#475569',
                  '&:hover': { borderColor: '#cbd5e1', backgroundColor: '#f8fafc' }
                }}
              >
                Clear
              </Button>
              <Button
                variant="contained"
                startIcon={<Send sx={{ fontSize: 17 }} />}
                onClick={handleSend}
                sx={{
                  textTransform: 'none', fontWeight: 700, borderRadius: '10px', fontSize: '14px', px: 3,
                  backgroundColor: '#1d4ed8', '&:hover': { backgroundColor: '#1e40af' }
                }}
              >
                Send Admin Notification
              </Button>
            </Box>
          </Box>
        </Paper>

        {/* ══════════════════ RIGHT — Sent Admin Notifications ══════════════════ */}
        <Box sx={{ flex: 1, minWidth: 0 }}>

          {/* Header with unread badge + filters */}
          <Paper elevation={0}
            sx={{
              border: '1px solid #e2e8f0', borderRadius: '16px', p: 2.5, mb: 2,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5
            }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Badge badgeContent={unreadCount} color="error"
                sx={{ '& .MuiBadge-badge': { fontSize: '11px', fontWeight: 700 } }}>
                <Box sx={{
                  width: 38, height: 38, borderRadius: '10px', backgroundColor: '#eff6ff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Inbox sx={{ fontSize: 20, color: '#1d4ed8' }} />
                </Box>
              </Badge>
              <Box>
                <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: '15px' }}>
                  Sent Admin Notifications
                </Typography>
                <Typography sx={{ fontSize: '12px', color: '#94a3b8' }}>
                  {sent.length} total · {unreadCount} unread
                </Typography>
              </Box>
            </Box>

            {/* Severity filter chips */}
            <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
              <Chip
                label={`All (${sent.length})`}
                onClick={() => setFilterSev(null)}
                size="small"
                sx={{
                  fontWeight: filterSev === null ? 700 : 500, fontSize: '12px', cursor: 'pointer',
                  backgroundColor: filterSev === null ? '#1d4ed8' : '#f1f5f9',
                  color: filterSev === null ? '#fff' : '#64748b',
                  '&:hover': { backgroundColor: '#1d4ed8', color: '#fff' }
                }}
              />
              {SEVERITIES.map((s) => {
                const Icon = s.icon;
                const active = filterSev === s.value;
                return (
                  <Chip
                    key={s.value}
                    icon={<Icon sx={{ fontSize: 13, color: active ? s.color : '#94a3b8' }} />}
                    label={`${s.label} (${countOf(s.value)})`}
                    onClick={() => setFilterSev(active ? null : s.value)}
                    size="small"
                    sx={{
                      fontWeight: active ? 700 : 500, fontSize: '12px', cursor: 'pointer',
                      backgroundColor: active ? s.bg : '#f8fafc',
                      color: active ? s.color : '#64748b',
                      border: active ? `1.5px solid ${s.color}55` : '1.5px solid #e2e8f0',
                      '&:hover': { backgroundColor: s.bg, color: s.color }
                    }}
                  />
                );
              })}
            </Box>
          </Paper>

          {/* Notification cards */}
          {filtered.length === 0 ? (
            <Paper elevation={0}
              sx={{
                border: '1px solid #e2e8f0', borderRadius: '16px', p: 5,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5
              }}>
              <Box sx={{
                width: 56, height: 56, borderRadius: '14px', backgroundColor: '#f1f5f9',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <NotificationsNone sx={{ fontSize: 28, color: '#94a3b8' }} />
              </Box>
              <Typography sx={{ fontWeight: 600, color: '#64748b', fontSize: '15px' }}>
                {filterSev ? `No ${sevCfgOf(filterSev).label} notifications yet` : 'No admin notifications sent yet'}
              </Typography>
              <Typography sx={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center' }}>
                Use the compose form to create and send an admin notification.
              </Typography>
            </Paper>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {filtered.map((notif) => {
                const cfg = sevCfgOf(notif.severity);
                const Icon = cfg.icon;
                const isRead = readIds.has(notif.id);
                return (
                  <Paper
                    key={notif.id}
                    elevation={0}
                    sx={{
                      border: `1.5px solid ${isRead ? '#e2e8f0' : cfg.color + '44'}`,
                      borderLeft: `5px solid ${cfg.color}`,
                      borderRadius: '14px',
                      overflow: 'hidden',
                      backgroundColor: isRead ? '#fff' : cfg.bg + '22',
                      transition: 'box-shadow 0.2s',
                      '&:hover': { boxShadow: '0 4px 16px #0001' },
                    }}
                  >
                    <Box sx={{ p: 2.5 }}>
                      {/* Top row */}
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                        <Box sx={{
                          width: 40, height: 40, borderRadius: '10px', backgroundColor: cfg.bg,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                          <Icon sx={{ fontSize: 20, color: cfg.color }} />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.4, flexWrap: 'wrap' }}>
                            <Typography sx={{ fontWeight: 800, color: '#1e293b', fontSize: '15px' }}>
                              {notif.title}
                            </Typography>
                            <Chip
                              label={cfg.label} size="small"
                              sx={{
                                fontWeight: 700, fontSize: '11px', backgroundColor: cfg.bg,
                                color: cfg.color, border: `1px solid ${cfg.border ?? cfg.color + '44'}`
                              }}
                            />
                            {!isRead && (
                              <Chip label="New" size="small"
                                sx={{
                                  fontWeight: 700, fontSize: '10px', backgroundColor: '#fef9c3',
                                  color: '#854d0e', border: '1px solid #fde68a'
                                }} />
                            )}
                          </Box>
                          <Typography sx={{ color: '#475569', fontSize: '13.5px', lineHeight: 1.6, mb: 1 }}>
                            {notif.message}
                          </Typography>

                          {/* Attachments strip */}
                          {notif.attachments?.length > 0 && (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mb: 1 }}>
                              {notif.attachments.map((file) => {
                                const FileIcon = getFileIcon(file.type);
                                const clr = getFileColor(file.type);
                                const isImg = file.type?.startsWith('image/');
                                return (
                                  <Tooltip key={file.id} title={`${file.name} (${formatBytes(file.size)})`}>
                                    <Box
                                      onClick={() => window.open(file.url, '_blank')}
                                      sx={{
                                        display: 'flex', alignItems: 'center', gap: 0.7,
                                        border: `1px solid ${clr.border}`, borderRadius: '7px',
                                        backgroundColor: clr.bg, px: 1, py: 0.5,
                                        cursor: 'pointer', '&:hover': { opacity: 0.8 }
                                      }}
                                    >
                                      {isImg ? (
                                        <Box component="img" src={file.url} alt={file.name}
                                          sx={{ width: 20, height: 20, borderRadius: '4px', objectFit: 'cover', border: `1px solid ${clr.border}` }} />
                                      ) : (
                                        <FileIcon sx={{ fontSize: 15, color: clr.color }} />
                                      )}
                                      <Typography sx={{
                                        fontSize: '11px', fontWeight: 600, color: clr.color,
                                        maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                      }}>
                                        {file.name}
                                      </Typography>
                                    </Box>
                                  </Tooltip>
                                );
                              })}
                            </Box>
                          )}

                          {/* Meta row */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <AdminPanelSettings sx={{ fontSize: 14, color: '#94a3b8' }} />
                              <Typography sx={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Admin Only</Typography>
                            </Box>
                            <Typography sx={{ fontSize: '12px', color: '#94a3b8' }}>🕐 {notif.time}</Typography>
                            {notif.attachments?.length > 0 && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                                <AttachFile sx={{ fontSize: 13, color: '#94a3b8' }} />
                                <Typography sx={{ fontSize: '12px', color: '#94a3b8' }}>
                                  {notif.attachments.length} attachment{notif.attachments.length !== 1 ? 's' : ''}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </Box>

                        {/* Action buttons */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8, flexShrink: 0 }}>
                          {!isRead && (
                            <Tooltip title="Mark as read">
                              <IconButton size="small" onClick={() => markRead(notif.id)}
                                sx={{
                                  border: '1px solid #bbf7d0', borderRadius: '8px', p: '5px',
                                  color: '#16a34a', backgroundColor: '#f0fdf4', '&:hover': { backgroundColor: '#dcfce7' }
                                }}>
                                <MarkEmailRead sx={{ fontSize: 15 }} />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="View details">
                            <IconButton size="small" onClick={() => setViewTarget(notif)}
                              sx={{
                                border: '1px solid #bfdbfe', borderRadius: '8px', p: '5px',
                                color: '#1d4ed8', backgroundColor: '#eff6ff', '&:hover': { backgroundColor: '#dbeafe' }
                              }}>
                              <Visibility sx={{ fontSize: 15 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => openEdit(notif)}
                              sx={{
                                border: '1px solid #bfdbfe', borderRadius: '8px', p: '5px',
                                color: '#1d4ed8', backgroundColor: '#eff6ff', '&:hover': { backgroundColor: '#dbeafe' }
                              }}>
                              <EditOutlined sx={{ fontSize: 15 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" onClick={() => setDeleteTarget(notif)}
                              sx={{
                                border: '1px solid #fecaca', borderRadius: '8px', p: '5px',
                                color: '#ef4444', backgroundColor: '#fff1f2', '&:hover': { backgroundColor: '#fee2e2' }
                              }}>
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
        </Box>
      </Box>

      {/* ── View Details Dialog ── */}
      <Dialog open={!!viewTarget} onClose={() => setViewTarget(null)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: '14px' } }}>
        {viewTarget && (() => {
          const cfg = sevCfgOf(viewTarget.severity);
          const Icon = cfg.icon;
          return (
            <>
              <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                  <Box sx={{
                    width: 36, height: 36, borderRadius: '8px', backgroundColor: cfg.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Icon sx={{ fontSize: 20, color: cfg.color }} />
                  </Box>
                  <Typography sx={{ fontWeight: 700, fontSize: '16px' }}>Notification Details</Typography>
                </Box>
                <IconButton onClick={() => setViewTarget(null)} size="small"><Close /></IconButton>
              </DialogTitle>
              <DialogContent>
                <Chip label={cfg.label} size="small"
                  sx={{
                    fontWeight: 700, fontSize: '12px', backgroundColor: cfg.bg,
                    color: cfg.color, border: `1px solid ${cfg.border ?? cfg.color + '44'}`, mb: 1.5
                  }} />
                <Typography sx={{ fontWeight: 800, color: '#1e293b', fontSize: '17px', mb: 1 }}>
                  {viewTarget.title}
                </Typography>
                <Typography sx={{ color: '#475569', fontSize: '14px', lineHeight: 1.7, mb: 2 }}>
                  {viewTarget.message}
                </Typography>
                {viewTarget.attachments?.length > 0 && (
                  <>
                    <Divider sx={{ mb: 1.5 }} />
                    <Typography sx={{ fontWeight: 700, color: '#475569', fontSize: '13px', mb: 1 }}>
                      Attachments ({viewTarget.attachments.length})
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {viewTarget.attachments.map((file) => {
                        const FileIcon = getFileIcon(file.type);
                        const clr = getFileColor(file.type);
                        return (
                          <Tooltip key={file.id} title={`Open ${file.name}`}>
                            <Box onClick={() => window.open(file.url, '_blank')}
                              sx={{
                                display: 'flex', alignItems: 'center', gap: 0.8,
                                border: `1px solid ${clr.border}`, borderRadius: '8px',
                                backgroundColor: clr.bg, px: 1.2, py: 0.7, cursor: 'pointer',
                                '&:hover': { opacity: 0.8 }
                              }}>
                              {file.type?.startsWith('image/') ? (
                                <Box component="img" src={file.url} alt={file.name}
                                  sx={{ width: 24, height: 24, borderRadius: '4px', objectFit: 'cover' }} />
                              ) : (
                                <FileIcon sx={{ fontSize: 18, color: clr.color }} />
                              )}
                              <Typography sx={{
                                fontSize: '12px', fontWeight: 600, color: clr.color,
                                maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                              }}>
                                {file.name}
                              </Typography>
                            </Box>
                          </Tooltip>
                        );
                      })}
                    </Box>
                  </>
                )}
                <Divider sx={{ my: 1.5 }} />
                <Typography sx={{ fontSize: '12px', color: '#94a3b8' }}>Sent: {viewTarget.time}</Typography>
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

      {/* ── Edit Dialog ── */}
      <Dialog open={!!editTarget} onClose={() => setEditTarget(null)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: '14px' } }}>
        {editTarget && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography sx={{ fontWeight: 700, fontSize: '16px' }}>Edit Admin Notification</Typography>
              <IconButton onClick={() => setEditTarget(null)} size="small"><Close /></IconButton>
            </DialogTitle>
            <DialogContent sx={{ pt: 1 }}>
              <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#475569', mb: 1 }}>Severity</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2.5 }}>
                {SEVERITIES.map((s) => {
                  const Icon = s.icon;
                  const active = editForm.severity === s.value;
                  return (
                    <Chip key={s.value}
                      icon={<Icon sx={{ fontSize: 14, color: active ? s.color : '#94a3b8' }} />}
                      label={s.label}
                      onClick={() => setEditForm((f) => ({ ...f, severity: s.value }))}
                      sx={{
                        fontWeight: active ? 700 : 500, fontSize: '12px', cursor: 'pointer',
                        backgroundColor: active ? s.bg : '#f8fafc', color: active ? s.color : '#64748b',
                        border: active ? `1.5px solid ${s.color}66` : '1.5px solid #e2e8f0',
                        '&:hover': { backgroundColor: s.bg, color: s.color }
                      }} />
                  );
                })}
              </Box>
              <TextField fullWidth label="Title" value={editForm.title}
                onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }} />
              <TextField fullWidth multiline rows={4} label="Message" value={editForm.message}
                onChange={(e) => setEditForm((f) => ({ ...f, message: e.target.value }))}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }} />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
              <Button onClick={() => setEditTarget(null)} variant="outlined"
                sx={{ textTransform: 'none', borderRadius: '9px', borderColor: '#e2e8f0', color: '#64748b' }}>
                Cancel
              </Button>
              <Button onClick={saveEdit} variant="contained" startIcon={<Save sx={{ fontSize: 16 }} />}
                disabled={!editForm.title?.trim() || !editForm.message?.trim()}
                sx={{
                  textTransform: 'none', fontWeight: 700, borderRadius: '9px',
                  backgroundColor: '#1d4ed8', '&:hover': { backgroundColor: '#1e40af' }
                }}>
                Save Changes
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ── Delete Confirm Dialog ── */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: '14px', p: 1 } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontWeight: 700, fontSize: '16px', color: '#ef4444' }}>Delete Notification?</Typography>
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
            sx={{
              textTransform: 'none', fontWeight: 700, borderRadius: '9px',
              backgroundColor: '#ef4444', '&:hover': { backgroundColor: '#dc2626' }
            }}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default AdminNotificationsPage;
