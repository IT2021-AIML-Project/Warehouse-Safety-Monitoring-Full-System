import React, { useState, useRef } from 'react';
import emailjs from '@emailjs/browser';
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
  InputAdornment,
} from '@mui/material';
import {
  Send,
  Close,
  CheckCircle,
  Email,
  AttachFile,
  PictureAsPdf,
  Image as ImageIcon,
  InsertDriveFile,
  FileUpload,
  DeleteOutline,
  Visibility,
  AlternateEmail,
  MarkEmailUnread,
} from '@mui/icons-material';
import CircularProgress from '@mui/material/CircularProgress';

const PRIORITIES = [
  { value: 'normal', label: 'Normal', color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' },
  { value: 'high', label: 'High', color: '#b45309', bg: '#fef3c7', border: '#fcd34d' },
  { value: 'urgent', label: 'Urgent', color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' },
];

// ── File helpers ──────────────────────────────────────────────────────────────
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
const MAX_FILE_SIZE_MB = 10;
const MAX_FILES = 5;

const getFileIcon = (t) => t === 'application/pdf' ? PictureAsPdf : t?.startsWith('image/') ? ImageIcon : InsertDriveFile;
const getFileColor = (t) => t === 'application/pdf'
  ? { color: '#dc2626', bg: '#fff1f2', border: '#fecaca' }
  : t?.startsWith('image/')
    ? { color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd' }
    : { color: '#0f766e', bg: '#f0fdfa', border: '#5eead4' };
const formatBytes = (b) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;

const initForm = {
  to_email: '',
  subject: '',
  body: '',
  cc: '',
  bcc: '',
  priority: 'normal',
};

// ─────────────────────────────────────────────────────────────────────────────
const SendEmailForm = () => {
  const [form, setForm] = useState(initForm);
  const [attachments, setAttachments] = useState([]);
  const [attachError, setAttachError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [sentEmails, setSentEmails] = useState([]);
  const fileInputRef = useRef(null);

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
    if (!form.to_email.trim()) errs.to_email = 'Recipient email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.to_email.trim())) errs.to_email = 'Enter a valid email address.';
    if (!form.subject.trim()) errs.subject = 'Subject is required.';
    if (!form.body.trim()) errs.body = 'Email body is required.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Send via EmailJS ──
  const handleSend = async () => {
    if (!validate()) return;
    setSending(true);
    setErrorMsg('');

    try {
      await emailjs.send(
        'service_qb5plfc',       // EmailJS Service ID
        'template_ntnjg4o',      // EmailJS Template ID
        {
          to_email: form.to_email.trim(),
          subject: form.subject.trim(),
          message: form.body.trim(),
          cc: form.cc.trim() || undefined,
          bcc: form.bcc.trim() || undefined,
          priority: form.priority,
        },
        'VKHkQqmX2pODopYgG'      // EmailJS Public Key
      );

      const email = {
        id: Date.now(),
        to_email: form.to_email.trim(),
        subject: form.subject.trim(),
        body: form.body.trim(),
        cc: form.cc.trim(),
        bcc: form.bcc.trim(),
        priority: form.priority,
        attachments: attachments.map(({ id, name, size, type, url }) => ({ id, name, size, type, url })),
        time: new Date().toLocaleString(),
      };

      setSentEmails((p) => [email, ...p]);
      setSuccessMsg(`Email sent to ${form.to_email.trim()} successfully!`);
      setForm(initForm);
      setAttachments([]);
      setAttachError('');
      setErrors({});
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (error) {
      console.error('EmailJS error:', error);
      setErrorMsg(error?.text || 'Failed to send email. Please try again.');
      setTimeout(() => setErrorMsg(''), 6000);
    } finally {
      setSending(false);
    }
  };

  const priority = PRIORITIES.find((p) => p.value === form.priority) || PRIORITIES[0];

  return (
    <Box sx={{ width: '100%', px: { xs: 2, md: 3 }, py: 3, boxSizing: 'border-box' }}>

      {/* ── Page Header ── */}
      <Paper elevation={0}
        sx={{
          border: '1px solid #e2e8f0', borderRadius: '16px', p: 3, mb: 3,
          display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 1.5,
          background: 'linear-gradient(135deg, #f0f9ff 0%, #fff 60%)'
        }}>
        <Box sx={{
          width: 52, height: 52, borderRadius: '14px',
          background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Email sx={{ color: '#fff', fontSize: 28 }} />
        </Box>
        <Typography sx={{ fontWeight: 800, color: '#1e293b', fontSize: '20px' }}>
          Send Email
        </Typography>
        <Typography sx={{ color: '#64748b', fontSize: '14px' }}>
          Compose and send email notifications to warehouse staff.
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

      {/* ── Error Alert ── */}
      <Collapse in={!!errorMsg}>
        <Alert severity="error"
          sx={{ mb: 3, borderRadius: '12px', fontWeight: 600 }}
          action={<IconButton size="small" onClick={() => setErrorMsg('')}><Close fontSize="small" /></IconButton>}>
          {errorMsg}
        </Alert>
      </Collapse>

      {/* ── Main Card ── */}
      <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden' }}>

        {/* ── Section: Email Details ── */}
        <Box sx={{ p: 3, borderBottom: '1px solid #f1f5f9' }}>
          <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: '15px', mb: 2 }}>
            Email Details
          </Typography>

          {/* Priority */}
          <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#475569', mb: 1 }}>Priority</Typography>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 2.5 }}>
            {PRIORITIES.map((p) => {
              const active = form.priority === p.value;
              return (
                <Chip key={p.value} label={p.label}
                  onClick={() => setForm((f) => ({ ...f, priority: p.value }))}
                  sx={{
                    fontWeight: active ? 700 : 500, fontSize: '13px', cursor: 'pointer',
                    backgroundColor: active ? p.bg : '#f8fafc',
                    color: active ? p.color : '#64748b',
                    border: active ? `1.5px solid ${p.border}` : '1.5px solid #e2e8f0',
                    '&:hover': { backgroundColor: p.bg, color: p.color }
                  }} />
              );
            })}
          </Box>

          {/* To (recipient) */}
          <TextField fullWidth label="To (Recipient Email) *"
            placeholder="employee@warehouse.com"
            value={form.to_email}
            onChange={(e) => { setForm((f) => ({ ...f, to_email: e.target.value })); setErrors((er) => ({ ...er, to_email: '' })); }}
            error={!!errors.to_email} helperText={errors.to_email}
            InputProps={{ startAdornment: <InputAdornment position="start"><Email sx={{ fontSize: 18, color: '#94a3b8' }} /></InputAdornment> }}
            sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }} />

          {/* Subject */}
          <TextField fullWidth label="Subject *"
            placeholder="e.g. Monthly Safety Briefing – March 2026"
            value={form.subject}
            onChange={(e) => { setForm((f) => ({ ...f, subject: e.target.value })); setErrors((er) => ({ ...er, subject: '' })); }}
            error={!!errors.subject} helperText={errors.subject}
            InputProps={{ startAdornment: <InputAdornment position="start"><MarkEmailUnread sx={{ fontSize: 18, color: '#94a3b8' }} /></InputAdornment> }}
            sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }} />

          {/* CC */}
          <TextField fullWidth label="CC (optional)"
            placeholder="cc@example.com, another@example.com"
            value={form.cc}
            onChange={(e) => setForm((f) => ({ ...f, cc: e.target.value }))}
            InputProps={{ startAdornment: <InputAdornment position="start"><AlternateEmail sx={{ fontSize: 17, color: '#94a3b8' }} /></InputAdornment> }}
            sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }} />

          {/* BCC */}
          <TextField fullWidth label="BCC (optional)"
            placeholder="bcc@example.com"
            value={form.bcc}
            onChange={(e) => setForm((f) => ({ ...f, bcc: e.target.value }))}
            InputProps={{ startAdornment: <InputAdornment position="start"><AlternateEmail sx={{ fontSize: 17, color: '#94a3b8' }} /></InputAdornment> }}
            sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }} />

          {/* Body */}
          <TextField fullWidth multiline rows={6} label="Email Body *"
            placeholder="Write your email message here…"
            value={form.body}
            onChange={(e) => { setForm((f) => ({ ...f, body: e.target.value })); setErrors((er) => ({ ...er, body: '' })); }}
            error={!!errors.body} helperText={errors.body}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }} />
        </Box>

        {/* ── Section: Attachments ── */}
        <Box sx={{ p: 3, borderBottom: '1px solid #f1f5f9' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Box>
              <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: '15px' }}>Attachments</Typography>
              <Typography sx={{ fontSize: '12px', color: '#94a3b8', mt: 0.3 }}>
                Images & PDFs — max {MAX_FILE_SIZE_MB} MB each, up to {MAX_FILES} files
              </Typography>
            </Box>
            <Chip icon={<AttachFile sx={{ fontSize: 15 }} />}
              label={`${attachments.length} / ${MAX_FILES}`} size="small"
              sx={{
                fontWeight: 700, fontSize: '12px',
                backgroundColor: attachments.length > 0 ? '#f0f9ff' : '#f1f5f9',
                color: attachments.length > 0 ? '#0284c7' : '#94a3b8'
              }} />
          </Box>

          <input ref={fileInputRef} type="file" multiple accept="image/*,application/pdf"
            style={{ display: 'none' }} onChange={(e) => processFiles(e.target.files)} />

          {/* Drop zone */}
          <Box
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); processFiles(e.dataTransfer.files); }}
            sx={{
              border: `2px dashed ${dragOver ? '#0284c7' : attachError ? '#fca5a5' : '#cbd5e1'}`,
              borderRadius: '12px', p: 3, textAlign: 'center',
              cursor: attachments.length >= MAX_FILES ? 'not-allowed' : 'pointer',
              backgroundColor: dragOver ? '#f0f9ff' : '#fafafa', transition: 'all 0.2s',
              '&:hover': attachments.length < MAX_FILES ? { borderColor: '#0284c7', backgroundColor: '#f0f9ff' } : {}
            }}>
            <FileUpload sx={{ fontSize: 36, color: dragOver ? '#0284c7' : '#94a3b8', mb: 1 }} />
            <Typography sx={{ fontWeight: 600, color: dragOver ? '#0284c7' : '#475569', fontSize: '14px' }}>
              {attachments.length >= MAX_FILES ? `Maximum ${MAX_FILES} files reached` : 'Click or drag & drop files here'}
            </Typography>
            <Typography sx={{ fontSize: '12px', color: '#94a3b8', mt: 0.5 }}>
              Supported: JPG, PNG, GIF, WebP, PDF
            </Typography>
          </Box>

          {attachError && (
            <Alert severity="error" onClose={() => setAttachError('')} sx={{ mt: 1.5, borderRadius: '10px', fontSize: '13px' }}>
              {attachError}
            </Alert>
          )}

          {/* File list */}
          {attachments.length > 0 && (
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1.2 }}>
              {attachments.map((file) => {
                const FileIcon = getFileIcon(file.type);
                const clr = getFileColor(file.type);
                const isImage = file.type?.startsWith('image/');
                return (
                  <Paper key={file.id} elevation={0}
                    sx={{
                      border: `1.5px solid ${clr.border}`, borderRadius: '10px', p: 1.5,
                      display: 'flex', alignItems: 'center', gap: 1.5, backgroundColor: clr.bg
                    }}>
                    {isImage
                      ? <Box component="img" src={file.url} alt={file.name}
                        sx={{ width: 44, height: 44, borderRadius: '8px', objectFit: 'cover', border: `1px solid ${clr.border}`, flexShrink: 0 }} />
                      : <Box sx={{
                        width: 44, height: 44, borderRadius: '8px', backgroundColor: '#fff', border: `1px solid ${clr.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                      }}>
                        <FileIcon sx={{ fontSize: 24, color: clr.color }} />
                      </Box>
                    }
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 600, color: '#1e293b', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {file.name}
                      </Typography>
                      <Typography sx={{ fontSize: '11px', color: '#64748b' }}>
                        {isImage ? 'Image' : 'PDF Document'} · {formatBytes(file.size)}
                      </Typography>
                    </Box>
                    <Tooltip title="Preview">
                      <IconButton size="small" onClick={() => window.open(file.url, '_blank')}
                        sx={{ border: '1px solid #e2e8f0', borderRadius: '7px', p: '5px', color: clr.color, backgroundColor: '#fff' }}>
                        <Visibility sx={{ fontSize: 15 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Remove">
                      <IconButton size="small" onClick={() => removeAttachment(file.id)}
                        sx={{ border: '1px solid #fecaca', borderRadius: '7px', p: '5px', color: '#ef4444', backgroundColor: '#fff1f2' }}>
                        <DeleteOutline sx={{ fontSize: 15 }} />
                      </IconButton>
                    </Tooltip>
                  </Paper>
                );
              })}
            </Box>
          )}
        </Box>



        {/* ── Email Preview ── */}
        {(form.subject || form.body) && (
          <>
            <Divider sx={{ borderColor: '#f1f5f9' }} />
            <Box sx={{ p: 3 }}>
              <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: '15px', mb: 1.5 }}>
                Email Preview
              </Typography>
              <Paper elevation={0}
                sx={{ border: '1.5px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                {/* Email header bar */}
                <Box sx={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', px: 3, py: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography sx={{ fontSize: '12px', color: '#94a3b8', width: 36 }}>From:</Typography>
                    <Typography sx={{ fontSize: '13px', color: '#475569', fontWeight: 600 }}>admin@safetyfirst.lk</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography sx={{ fontSize: '12px', color: '#94a3b8', width: 36 }}>To:</Typography>
                    <Typography sx={{ fontSize: '13px', color: '#475569' }}>
                      {form.to_email || <span style={{ color: '#94a3b8' }}>— no recipient —</span>}
                    </Typography>
                  </Box>
                  {form.cc && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography sx={{ fontSize: '12px', color: '#94a3b8', width: 36 }}>CC:</Typography>
                      <Typography sx={{ fontSize: '13px', color: '#475569' }}>{form.cc}</Typography>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontSize: '12px', color: '#94a3b8', width: 36 }}>Sub:</Typography>
                    <Typography sx={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
                      {form.subject || <span style={{ color: '#94a3b8' }}>No subject</span>}
                    </Typography>
                    {form.priority !== 'normal' && (
                      <Chip label={priority.label} size="small"
                        sx={{ fontSize: '10px', fontWeight: 700, backgroundColor: priority.bg, color: priority.color, border: `1px solid ${priority.border}`, ml: 1 }} />
                    )}
                  </Box>
                </Box>
                {/* Email body */}
                <Box sx={{ px: 3, py: 2.5 }}>
                  <Typography sx={{ color: '#475569', fontSize: '14px', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                    {form.body || <span style={{ color: '#94a3b8' }}>Email body will appear here…</span>}
                  </Typography>
                  {attachments.length > 0 && (
                    <>
                      <Divider sx={{ my: 2, borderColor: '#f1f5f9' }} />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 1 }}>
                        <AttachFile sx={{ fontSize: 15, color: '#94a3b8' }} />
                        <Typography sx={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>
                          {attachments.length} Attachment{attachments.length !== 1 ? 's' : ''}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                        {attachments.map((file) => {
                          const FileIcon = getFileIcon(file.type);
                          const clr = getFileColor(file.type);
                          return (
                            <Box key={file.id}
                              sx={{
                                display: 'flex', alignItems: 'center', gap: 0.7,
                                border: `1px solid ${clr.border}`, borderRadius: '7px',
                                backgroundColor: clr.bg, px: 1, py: 0.5
                              }}>
                              <FileIcon sx={{ fontSize: 14, color: clr.color }} />
                              <Typography sx={{
                                fontSize: '11px', fontWeight: 600, color: clr.color,
                                maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                              }}>
                                {file.name}
                              </Typography>
                            </Box>
                          );
                        })}
                      </Box>
                    </>
                  )}
                </Box>
              </Paper>
            </Box>
          </>
        )}

        {/* ── Footer actions ── */}
        <Box sx={{ px: 3, pb: 3, pt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1.5, borderTop: '1px solid #f1f5f9' }}>
          <Button variant="outlined"
            onClick={() => { setForm(initForm); setErrors({}); setAttachments([]); setAttachError(''); }}
            sx={{
              textTransform: 'none', fontWeight: 600, borderRadius: '10px', borderColor: '#e2e8f0', color: '#475569',
              '&:hover': { borderColor: '#cbd5e1', backgroundColor: '#f8fafc' }
            }}>
            Clear
          </Button>
          <Button variant="contained"
            startIcon={sending ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : <Send sx={{ fontSize: 18 }} />}
            onClick={handleSend}
            disabled={sending}
            sx={{
              textTransform: 'none', fontWeight: 700, borderRadius: '10px', fontSize: '14px', px: 3,
              backgroundColor: '#0284c7', '&:hover': { backgroundColor: '#0369a1' },
              '&.Mui-disabled': { backgroundColor: '#7dd3fc', color: '#fff' }
            }}>
            {sending ? 'Sending...' : 'Send Email'}
          </Button>
        </Box>
      </Paper>

      {/* ── Sent Emails Log ── */}
      {sentEmails.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: '15px', mb: 1.5 }}>
            Recently Sent ({sentEmails.length})
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
            {sentEmails.map((mail) => {
              const p = PRIORITIES.find((x) => x.value === mail.priority) || PRIORITIES[0];
              return (
                <Paper key={mail.id} elevation={0}
                  sx={{ border: '1.5px solid #e2e8f0', borderLeft: '5px solid #0284c7', borderRadius: '12px', p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{
                        width: 38, height: 38, borderRadius: '10px', backgroundColor: '#f0f9ff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                      }}>
                        <Email sx={{ fontSize: 20, color: '#0284c7' }} />
                      </Box>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap' }}>
                          <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: '14px' }}>{mail.subject}</Typography>
                          {mail.priority !== 'normal' && (
                            <Chip label={p.label} size="small"
                              sx={{ fontWeight: 700, fontSize: '10px', backgroundColor: p.bg, color: p.color, border: `1px solid ${p.border}` }} />
                          )}
                        </Box>
                        <Typography sx={{ fontSize: '12px', color: '#64748b' }}>
                          Sent{mail.attachments?.length > 0 ? ` · ${mail.attachments.length} attachment(s)` : ''}
                        </Typography>
                      </Box>
                    </Box>
                    <Typography sx={{ fontSize: '12px', color: '#94a3b8' }}>🕐 {mail.time}</Typography>
                  </Box>
                </Paper>
              );
            })}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default SendEmailForm;
