import React, { useState, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Chip,
  Divider,
  Avatar,
  Alert,
  Collapse,
  Tooltip,
  IconButton,
  InputAdornment,
} from '@mui/material';
import {
  Send,
  PersonAdd,
  Group,
  LocationOn,
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
  People,
  KeyboardArrowDown,
  KeyboardArrowUp,
  AlternateEmail,
  MarkEmailUnread,
  Engineering,
  Badge,
} from '@mui/icons-material';

// Employee and zone data (replace with API data)
const MOCK_EMPLOYEES = [];
const ZONES = [];

// Warehouse Staff data (frontend only)
const WAREHOUSE_STAFF = [
  { id: 'ws1', name: 'Nimal Perera', role: 'Warehouse Manager', email: 'nimal.perera@safetyfirst.lk', department: 'Operations', status: 'active' },
  { id: 'ws2', name: 'Suresh Kumar', role: 'Shift Supervisor', email: 'suresh.kumar@safetyfirst.lk', department: 'Operations', status: 'active' },
  { id: 'ws3', name: 'Amara Silva', role: 'Safety Officer', email: 'amara.silva@safetyfirst.lk', department: 'Safety', status: 'active' },
  { id: 'ws4', name: 'Dinesh Fernando', role: 'Inventory Lead', email: 'dinesh.fernando@safetyfirst.lk', department: 'Inventory', status: 'active' },
  { id: 'ws5', name: 'Priya Jayawardena', role: 'Forklift Operator', email: 'priya.jayawardena@safetyfirst.lk', department: 'Operations', status: 'on-leave' },
  { id: 'ws6', name: 'Ruwan Bandara', role: 'Quality Inspector', email: 'ruwan.bandara@safetyfirst.lk', department: 'Quality', status: 'active' },
];

const RECIPIENT_MODES = [
  { key: 'individual', label: 'Specific Employees', icon: PersonAdd },
  { key: 'zone', label: 'By Zone', icon: LocationOn },
  { key: 'all', label: 'All Employees', icon: Group },
];

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
  subject: '',
  body: '',
  cc: '',
  bcc: '',
  priority: 'normal',
  recipientMode: 'individual',
  selectedEmployees: [],
  selectedZones: [],
};

// ─────────────────────────────────────────────────────────────────────────────
const SendEmailForm = () => {
  const [form, setForm] = useState(initForm);
  const [attachments, setAttachments] = useState([]);
  const [attachError, setAttachError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [expandedZones, setExpandedZones] = useState({});
  const [errors, setErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState('');
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

  // ── Helpers ──
  const zoneEmployees = (zoneId) => MOCK_EMPLOYEES.filter((e) => e.zone === zoneId);
  const zoneRecipients = MOCK_EMPLOYEES.filter((e) => form.selectedZones.includes(e.zone));

  const addEmployee = (id) => {
    setForm((f) => ({ ...f, selectedEmployees: [...f.selectedEmployees, id] }));
    setErrors((e) => ({ ...e, recipients: '' }));
  };
  const removeEmployee = (id) => setForm((f) => ({ ...f, selectedEmployees: f.selectedEmployees.filter((x) => x !== id) }));

  const toggleZone = (zoneId) => {
    setForm((f) => ({
      ...f,
      selectedZones: f.selectedZones.includes(zoneId)
        ? f.selectedZones.filter((z) => z !== zoneId)
        : [...f.selectedZones, zoneId],
    }));
    setErrors((e) => ({ ...e, recipients: '' }));
  };

  const toggleZoneExpand = (zoneId) =>
    setExpandedZones((p) => ({ ...p, [zoneId]: !p[zoneId] }));

  const filteredEmployees = MOCK_EMPLOYEES.filter(
    (e) => !form.selectedEmployees.includes(e.id) &&
      (e.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
        e.role.toLowerCase().includes(employeeSearch.toLowerCase()) ||
        e.email.toLowerCase().includes(employeeSearch.toLowerCase()) ||
        e.zone.toLowerCase().includes(employeeSearch.toLowerCase())),
  );

  // ── Validation ──
  const validate = () => {
    const errs = {};
    if (!form.subject.trim()) errs.subject = 'Subject is required.';
    if (!form.body.trim()) errs.body = 'Email body is required.';
    if (form.recipientMode === 'individual' && form.selectedEmployees.length === 0)
      errs.recipients = 'Select at least one recipient.';
    if (form.recipientMode === 'zone' && form.selectedZones.length === 0)
      errs.recipients = 'Select at least one zone.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Send ──
  const handleSend = () => {
    if (!validate()) return;

    let recipients;
    if (form.recipientMode === 'all') recipients = MOCK_EMPLOYEES;
    else if (form.recipientMode === 'zone') recipients = zoneRecipients;
    else recipients = MOCK_EMPLOYEES.filter((e) => form.selectedEmployees.includes(e.id));

    const email = {
      id: Date.now(),
      subject: form.subject.trim(),
      body: form.body.trim(),
      cc: form.cc.trim(),
      bcc: form.bcc.trim(),
      priority: form.priority,
      recipientMode: form.recipientMode,
      recipients,
      zones: form.recipientMode === 'zone' ? form.selectedZones : [],
      attachments: attachments.map(({ id, name, size, type, url }) => ({ id, name, size, type, url })),
      time: new Date().toLocaleString(),
    };

    setSentEmails((p) => [email, ...p]);

    const label = form.recipientMode === 'all'
      ? `all ${MOCK_EMPLOYEES.length} employees`
      : form.recipientMode === 'zone'
        ? `${recipients.length} employee(s) across ${form.selectedZones.length} zone(s)`
        : `${recipients.length} employee(s)`;

    setSuccessMsg(`Email sent to ${label} successfully!`);
    setForm(initForm);
    setAttachments([]);
    setAttachError('');
    setEmployeeSearch('');
    setExpandedZones({});
    setErrors({});
    setTimeout(() => setSuccessMsg(''), 5000);
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
          Compose and send an email to individual employees, zones, or all warehouse staff.
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

        {/* ── Section: Send Email Type ── */}
        <Box sx={{ p: 3 }}>
          <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: '15px', mb: 0.5 }}>
            Send Email Type
          </Typography>
          <Typography sx={{ fontSize: '13px', color: '#94a3b8', mb: 2 }}>
            Choose how you want to send this email
          </Typography>

          {/* Type cards */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5, mb: 2.5 }}>
            {[
              { key: 'individual', label: 'Individual', sub: 'Send to specific employees', Icon: PersonAdd, color: '#0284c7', bg: '#f0f9ff', border: '#7dd3fc', lightBg: '#e0f2fe' },
              { key: 'zone', label: 'By Zone', sub: 'Target a warehouse zone', Icon: LocationOn, color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd', lightBg: '#ede9fe' },
              { key: 'all', label: 'Broadcast', sub: 'Send to all employees', Icon: Group, color: '#0f766e', bg: '#f0fdfa', border: '#5eead4', lightBg: '#ccfbf1' },
            ].map(({ key, label, sub, Icon, color, bg, border, lightBg }) => {
              const active = form.recipientMode === key;
              return (
                <Paper key={key} elevation={0} onClick={() => {
                  setForm((f) => ({ ...f, recipientMode: key, selectedEmployees: [], selectedZones: [] }));
                  setExpandedZones({});
                  setErrors((er) => ({ ...er, recipients: '' }));
                }}
                  sx={{
                    border: `2px solid ${active ? border : '#e2e8f0'}`, borderRadius: '14px', p: 2,
                    cursor: 'pointer', backgroundColor: active ? lightBg : '#fafafa',
                    transition: 'all 0.18s',
                    '&:hover': { borderColor: border, backgroundColor: lightBg }
                  }}>
                  <Box sx={{
                    width: 42, height: 42, borderRadius: '11px',
                    backgroundColor: active ? bg : '#f1f5f9',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5
                  }}>
                    <Icon sx={{ fontSize: 22, color: active ? color : '#94a3b8' }} />
                  </Box>
                  <Typography sx={{ fontWeight: 700, fontSize: '14px', color: active ? color : '#1e293b', mb: 0.4 }}>
                    {label}
                  </Typography>
                  <Typography sx={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
                    {sub}
                  </Typography>
                  {active && (
                    <Box sx={{ mt: 1.2, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CheckCircle sx={{ fontSize: 14, color }} />
                      <Typography sx={{ fontSize: '11px', fontWeight: 700, color }}>Selected</Typography>
                    </Box>
                  )}
                </Paper>
              );
            })}
          </Box>

          {/* ── Individual mode ── */}
          {form.recipientMode === 'individual' && (
            <Box>
              <TextField fullWidth size="small"
                placeholder="Search by name, role, email or zone…"
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }} />

              {/* Selected chips */}
              {form.selectedEmployees.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
                  {form.selectedEmployees.map((id) => {
                    const emp = MOCK_EMPLOYEES.find((e) => e.id === id);
                    return emp ? (
                      <Tooltip key={id} title={emp.email}>
                        <Chip
                          avatar={<Avatar sx={{ width: 22, height: 22, fontSize: '11px', bgcolor: '#bae6fd', color: '#0284c7' }}>{emp.name[0]}</Avatar>}
                          label={emp.name}
                          onDelete={() => removeEmployee(id)}
                          sx={{ fontSize: '13px', fontWeight: 600, backgroundColor: '#f0f9ff', color: '#0284c7', border: '1px solid #7dd3fc' }} />
                      </Tooltip>
                    ) : null;
                  })}
                </Box>
              )}

              {/* Employee list */}
              <Paper elevation={0}
                sx={{ border: `1.5px solid ${errors.recipients ? '#fca5a5' : '#e2e8f0'}`, borderRadius: '12px', maxHeight: 260, overflowY: 'auto' }}>
                {filteredEmployees.length === 0 ? (
                  <Typography sx={{ p: 2.5, color: '#94a3b8', fontSize: '14px', textAlign: 'center' }}>
                    {employeeSearch ? 'No employees match your search.' : 'All employees are selected.'}
                  </Typography>
                ) : (
                  filteredEmployees.map((emp, idx) => (
                    <React.Fragment key={emp.id}>
                      {idx > 0 && <Divider sx={{ borderColor: '#f1f5f9' }} />}
                      <Box onClick={() => addEmployee(emp.id)}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.4,
                          cursor: 'pointer', '&:hover': { backgroundColor: '#f0f9ff' }
                        }}>
                        <Avatar sx={{ width: 36, height: 36, fontSize: '13px', bgcolor: '#bae6fd', color: '#0284c7', fontWeight: 700 }}>
                          {emp.name[0]}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ fontWeight: 600, color: '#1e293b', fontSize: '14px' }}>{emp.name}</Typography>
                          <Typography sx={{ fontSize: '12px', color: '#64748b' }}>{emp.email} · {emp.zone}</Typography>
                        </Box>
                        <Chip label="Add" size="small"
                          sx={{ fontSize: '11px', fontWeight: 700, backgroundColor: '#f0f9ff', color: '#0284c7', border: '1px solid #7dd3fc', cursor: 'pointer' }} />
                      </Box>
                    </React.Fragment>
                  ))
                )}
              </Paper>
              {errors.recipients && (
                <Typography sx={{ color: '#ef4444', fontSize: '12px', mt: 0.8, ml: 1.5 }}>{errors.recipients}</Typography>
              )}
            </Box>
          )}

          {/* ── Zone mode ── */}
          {form.recipientMode === 'zone' && (
            <Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {ZONES.map((zone) => {
                  const emps = zoneEmployees(zone.id);
                  const selected = form.selectedZones.includes(zone.id);
                  const expanded = expandedZones[zone.id];
                  return (
                    <Paper key={zone.id} elevation={0}
                      sx={{
                        border: `1.5px solid ${selected ? zone.border : '#e2e8f0'}`,
                        borderLeft: `5px solid ${zone.color}`, borderRadius: '12px', overflow: 'hidden',
                        backgroundColor: selected ? zone.lightBg : '#fff', transition: 'all 0.2s'
                      }}>
                      <Box onClick={() => toggleZone(zone.id)}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.6, cursor: 'pointer',
                          '&:hover': { backgroundColor: zone.bg + '55' }
                        }}>
                        <Box sx={{
                          width: 38, height: 38, borderRadius: '10px', backgroundColor: zone.bg,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                          <LocationOn sx={{ fontSize: 20, color: zone.color }} />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: '14px' }}>
                            {zone.label}
                            <Typography component="span" sx={{ fontWeight: 400, color: '#64748b', fontSize: '13px', ml: 1 }}>
                              — {zone.description}
                            </Typography>
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mt: 0.3 }}>
                            <People sx={{ fontSize: 14, color: zone.color }} />
                            <Typography sx={{ fontSize: '12px', color: zone.color, fontWeight: 600 }}>
                              {emps.length} employee{emps.length !== 1 ? 's' : ''} assigned
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {selected && (
                            <Chip label="Selected" size="small"
                              sx={{ fontSize: '11px', fontWeight: 700, backgroundColor: zone.bg, color: zone.color, border: `1px solid ${zone.border}` }} />
                          )}
                          <IconButton size="small"
                            onClick={(e) => { e.stopPropagation(); toggleZoneExpand(zone.id); }}
                            sx={{ color: '#94a3b8' }}>
                            {expanded ? <KeyboardArrowUp fontSize="small" /> : <KeyboardArrowDown fontSize="small" />}
                          </IconButton>
                        </Box>
                      </Box>

                      {expanded && (
                        <Box sx={{ borderTop: `1px solid ${zone.border}44`, backgroundColor: zone.bg + '33' }}>
                          {emps.map((emp, idx) => (
                            <React.Fragment key={emp.id}>
                              {idx > 0 && <Divider sx={{ borderColor: zone.border + '44', mx: 2 }} />}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, py: 1.2 }}>
                                <Avatar sx={{ width: 30, height: 30, fontSize: '12px', bgcolor: zone.bg, color: zone.color, fontWeight: 700, border: `1.5px solid ${zone.border}` }}>
                                  {emp.name[0]}
                                </Avatar>
                                <Box>
                                  <Typography sx={{ fontWeight: 600, color: '#1e293b', fontSize: '13px' }}>{emp.name}</Typography>
                                  <Typography sx={{ fontSize: '11px', color: '#64748b' }}>{emp.email}</Typography>
                                </Box>
                              </Box>
                            </React.Fragment>
                          ))}
                        </Box>
                      )}
                    </Paper>
                  );
                })}
              </Box>

              {errors.recipients && (
                <Typography sx={{ color: '#ef4444', fontSize: '12px', mt: 0.8, ml: 0.5 }}>{errors.recipients}</Typography>
              )}

              {form.selectedZones.length > 0 && (
                <Paper elevation={0}
                  sx={{ mt: 2, border: '1.5px solid #bae6fd', backgroundColor: '#f0f9ff', borderRadius: '12px', p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CheckCircle sx={{ fontSize: 17, color: '#0284c7' }} />
                    <Typography sx={{ fontWeight: 700, color: '#075985', fontSize: '13.5px' }}>
                      {zoneRecipients.length} employee{zoneRecipients.length !== 1 ? 's' : ''} will receive this email
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                    {form.selectedZones.map((zid) => {
                      const z = ZONES.find((z) => z.id === zid);
                      return z ? (
                        <Chip key={zid}
                          icon={<LocationOn sx={{ fontSize: 14, color: z.color }} />}
                          label={`${z.label} (${zoneEmployees(zid).length})`}
                          onDelete={() => toggleZone(zid)}
                          size="small"
                          sx={{ fontSize: '12px', fontWeight: 600, backgroundColor: z.bg, color: z.color, border: `1px solid ${z.border}` }} />
                      ) : null;
                    })}
                  </Box>
                </Paper>
              )}
            </Box>
          )}

          {/* ── All employees ── */}
          {form.recipientMode === 'all' && (
            <Paper elevation={0}
              sx={{
                border: '1.5px solid #bae6fd', backgroundColor: '#f0f9ff', borderRadius: '12px', p: 2,
                display: 'flex', alignItems: 'center', gap: 1.5
              }}>
              <Group sx={{ color: '#0284c7', fontSize: 22 }} />
              <Box>
                <Typography sx={{ fontWeight: 700, color: '#075985', fontSize: '14px' }}>
                  All Employees Selected
                </Typography>
                <Typography sx={{ color: '#0284c7', fontSize: '13px' }}>
                  This email will be sent to all {MOCK_EMPLOYEES.length} registered warehouse employees.
                </Typography>
              </Box>
            </Paper>
          )}
        </Box>

        {/* ── Section: Warehouse Staff ── */}
        <Box sx={{ p: 3, borderBottom: '1px solid #f1f5f9' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Box sx={{
              width: 38, height: 38, borderRadius: '10px',
              background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Engineering sx={{ color: '#fff', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: '15px' }}>
                Warehouse Staff
              </Typography>
              <Typography sx={{ fontSize: '12px', color: '#94a3b8' }}>
                Active warehouse team members and their roles
              </Typography>
            </Box>
          </Box>

          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
            gap: 2, mt: 2
          }}>
            {WAREHOUSE_STAFF.map((staff) => (
              <Paper key={staff.id} elevation={0}
                sx={{
                  border: '1.5px solid #e2e8f0', borderRadius: '14px', p: 2,
                  transition: 'all 0.2s', cursor: 'default',
                  '&:hover': { borderColor: '#fdba74', backgroundColor: '#fff7ed', transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(249,115,22,0.08)' }
                }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  <Avatar sx={{
                    width: 42, height: 42, fontSize: '15px', fontWeight: 700,
                    bgcolor: '#fff7ed', color: '#ea580c', border: '2px solid #fdba74'
                  }}>
                    {staff.name.split(' ').map(n => n[0]).join('')}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: '14px', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {staff.name}
                    </Typography>
                    <Typography sx={{ fontSize: '12px', color: '#ea580c', fontWeight: 600 }}>
                      {staff.role}
                    </Typography>
                  </Box>
                </Box>
                <Divider sx={{ borderColor: '#f1f5f9', mb: 1.2 }} />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                    <Email sx={{ fontSize: 13, color: '#94a3b8' }} />
                    <Typography sx={{ fontSize: '11.5px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {staff.email}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.5 }}>
                    <Chip label={staff.department} size="small"
                      sx={{ fontSize: '10.5px', fontWeight: 600, height: 22, backgroundColor: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa' }} />
                    <Chip
                      label={staff.status === 'active' ? 'Active' : 'On Leave'}
                      size="small"
                      sx={{
                        fontSize: '10.5px', fontWeight: 700, height: 22,
                        backgroundColor: staff.status === 'active' ? '#f0fdf4' : '#fef3c7',
                        color: staff.status === 'active' ? '#16a34a' : '#d97706',
                        border: `1px solid ${staff.status === 'active' ? '#bbf7d0' : '#fde68a'}`
                      }} />
                  </Box>
                </Box>
              </Paper>
            ))}
          </Box>
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
                      {form.recipientMode === 'all'
                        ? `All Employees (${MOCK_EMPLOYEES.length})`
                        : form.recipientMode === 'zone' && form.selectedZones.length > 0
                          ? form.selectedZones.join(', ')
                          : form.selectedEmployees.length > 0
                            ? `${form.selectedEmployees.length} selected employee(s)`
                            : <span style={{ color: '#94a3b8' }}>— no recipients selected —</span>}
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
            onClick={() => { setForm(initForm); setErrors({}); setAttachments([]); setAttachError(''); setEmployeeSearch(''); setExpandedZones({}); }}
            sx={{
              textTransform: 'none', fontWeight: 600, borderRadius: '10px', borderColor: '#e2e8f0', color: '#475569',
              '&:hover': { borderColor: '#cbd5e1', backgroundColor: '#f8fafc' }
            }}>
            Clear
          </Button>
          <Tooltip title={
            form.recipientMode === 'all'
              ? `Send to all ${MOCK_EMPLOYEES.length} employees`
              : form.recipientMode === 'zone' && form.selectedZones.length > 0
                ? `Send to ${zoneRecipients.length} employee(s)`
                : form.selectedEmployees.length > 0
                  ? `Send to ${form.selectedEmployees.length} employee(s)`
                  : 'Select recipients first'
          }>
            <span>
              <Button variant="contained"
                startIcon={<Send sx={{ fontSize: 18 }} />}
                onClick={handleSend}
                sx={{
                  textTransform: 'none', fontWeight: 700, borderRadius: '10px', fontSize: '14px', px: 3,
                  backgroundColor: '#0284c7', '&:hover': { backgroundColor: '#0369a1' }
                }}>
                Send Email
              </Button>
            </span>
          </Tooltip>
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
                          To: {mail.recipientMode === 'all' ? `All Employees (${MOCK_EMPLOYEES.length})` : mail.recipientMode === 'zone' ? mail.zones.join(', ') : `${mail.recipients.length} employee(s)`}
                          {mail.attachments.length > 0 && ` · ${mail.attachments.length} attachment(s)`}
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
