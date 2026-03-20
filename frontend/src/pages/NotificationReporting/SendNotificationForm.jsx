import React, { useState, useRef, useEffect } from 'react';
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
  LinearProgress,
} from '@mui/material';
import {
  Send,
  PersonAdd,
  Group,
  WarningAmber,
  ErrorOutline,
  InfoOutlined,
  TaskAlt,
  Close,
  CheckCircle,
  NotificationsActive,
  LocationOn,
  KeyboardArrowDown,
  KeyboardArrowUp,
  People,
  AttachFile,
  PictureAsPdf,
  Image as ImageIcon,
  InsertDriveFile,
  FileUploadOutlined,
  DeleteOutline,
  Visibility,
} from '@mui/icons-material';

// ── Severity config ──────────────────────────────────────────────────────────
const SEVERITIES = [
  { value: 'info', label: 'Info', color: '#1d4ed8', bg: '#dbeafe', icon: InfoOutlined },
  { value: 'warning', label: 'Warning', color: '#a16207', bg: '#fef9c3', icon: WarningAmber },
  { value: 'danger', label: 'Alert', color: '#dc2626', bg: '#fee2e2', icon: ErrorOutline },
  { value: 'success', label: 'Success', color: '#16a34a', bg: '#dcfce7', icon: TaskAlt },
];

// Zone color themes
const ZONE_COLORS = [
  { color: '#1d4ed8', bg: '#dbeafe', border: '#93c5fd', lightBg: '#eff6ff' },
  { color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd', lightBg: '#faf5ff' },
  { color: '#059669', bg: '#d1fae5', border: '#6ee7b7', lightBg: '#ecfdf5' },
  { color: '#dc2626', bg: '#fee2e2', border: '#fca5a5', lightBg: '#fef2f2' },
  { color: '#d97706', bg: '#fef3c7', border: '#fcd34d', lightBg: '#fffbeb' },
];

const RECIPIENT_MODES = [
  { key: 'individual', label: 'Specific Employees', icon: PersonAdd },
  { key: 'zone', label: 'By Zone', icon: LocationOn },
  { key: 'all', label: 'All Employees', icon: Group },
];

// ── Allowed file types ────────────────────────────────────────────────────────
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
];
const MAX_FILE_SIZE_MB = 10;
const MAX_FILES = 5;

const getFileIcon = (type) => {
  if (type === 'application/pdf') return PictureAsPdf;
  if (type.startsWith('image/')) return ImageIcon;
  return InsertDriveFile;
};

const getFileColor = (type) => {
  if (type === 'application/pdf') return { color: '#dc2626', bg: '#fff1f2', border: '#fecaca' };
  if (type.startsWith('image/')) return { color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd' };
  return { color: '#0f766e', bg: '#f0fdfa', border: '#5eead4' };
};

const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const initForm = {
  title: '',
  message: '',
  severity: 'info',
  recipientMode: 'individual',
  selectedEmployees: [],
  selectedZones: [],
};

// ── Component ────────────────────────────────────────────────────────────────
const SendNotificationForm = ({ onNotificationSent }) => {
  const [form, setForm] = useState(initForm);
  const [attachments, setAttachments] = useState([]);
  const [attachError, setAttachError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errors, setErrors] = useState({});
  const [expandedZones, setExpandedZones] = useState({});
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef(null);

  // ── Dynamic data from API ──
  const [employees, setEmployees] = useState([]);
  const [zones, setZones] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { getPopulatedZones } = await import('../../services/api');
        const res = await getPopulatedZones();
        const populatedZones = res.data.zones || [];

        // Build employees list from zone assignments
        const empMap = new Map();
        populatedZones.forEach(z => {
          (z.employees || []).forEach(e => {
            if (!empMap.has(e._id)) {
              empMap.set(e._id, { id: e._id, name: e.name, email: e.email, zone: z.name, role: 'Warehouse Staff' });
            }
          });
        });
        setEmployees(Array.from(empMap.values()));

        // Build zones list
        setZones(populatedZones.map((z, i) => {
          const theme = ZONE_COLORS[i % ZONE_COLORS.length];
          return {
            id: z._id,
            label: z.name,
            description: z.type || 'Zone',
            ...theme,
          };
        }));
      } catch (err) {
        console.error('Failed to load employees/zones:', err);
      }
    };
    fetchData();
  }, []);

  // ── File helpers ──
  const processFiles = (rawFiles) => {
    setAttachError('');
    const incoming = Array.from(rawFiles);
    const results = [];
    const errs = [];

    for (const file of incoming) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        errs.push(`"${file.name}" is not allowed. Only images and PDFs are accepted.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        errs.push(`"${file.name}" exceeds the ${MAX_FILE_SIZE_MB} MB limit.`);
        continue;
      }
      if (attachments.length + results.length >= MAX_FILES) {
        errs.push(`Maximum ${MAX_FILES} files allowed.`);
        break;
      }
      results.push({
        id: `${Date.now()}-${Math.random()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file),
        raw: file,
      });
    }
    if (errs.length) setAttachError(errs.join(' '));
    if (results.length) setAttachments((prev) => [...prev, ...results]);
  };

  const removeAttachment = (id) =>
    setAttachments((prev) => prev.filter((a) => a.id !== id));

  const sevCfg = SEVERITIES.find((s) => s.value === form.severity) || SEVERITIES[0];
  const SevIcon = sevCfg.icon;

  // ── Filter employees ──
  const filteredEmployees = employees.filter(
    (e) =>
      !form.selectedEmployees.includes(e.id) &&
      (e.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
        (e.zone || '').toLowerCase().includes(employeeSearch.toLowerCase())),
  );

  const addEmployee = (id) => {
    setForm((f) => ({ ...f, selectedEmployees: [...f.selectedEmployees, id] }));
    setErrors((e) => ({ ...e, recipients: '' }));
  };

  const removeEmployee = (id) =>
    setForm((f) => ({ ...f, selectedEmployees: f.selectedEmployees.filter((x) => x !== id) }));

  // ── Zone helpers ──
  const toggleZone = (zoneId) => {
    setForm((f) => ({
      ...f,
      selectedZones: f.selectedZones.includes(zoneId)
        ? f.selectedZones.filter((z) => z !== zoneId)
        : [...f.selectedZones, zoneId],
    }));
    setErrors((er) => ({ ...er, recipients: '' }));
  };

  const zoneEmployees = (zoneId) => {
    const z = zones.find(z => z.id === zoneId);
    return z ? employees.filter(e => e.zone === z.label) : [];
  };

  const zoneRecipients = employees.filter((e) => {
    return form.selectedZones.some(zid => {
      const z = zones.find(z => z.id === zid);
      return z && e.zone === z.label;
    });
  });

  const toggleZoneExpand = (zoneId) =>
    setExpandedZones((prev) => ({ ...prev, [zoneId]: !prev[zoneId] }));

  // ── Validation ──
  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = 'Title is required.';
    if (!form.message.trim()) errs.message = 'Message is required.';
    if (form.recipientMode === 'individual' && form.selectedEmployees.length === 0)
      errs.recipients = 'Select at least one employee.';
    if (form.recipientMode === 'zone' && form.selectedZones.length === 0)
      errs.recipients = 'Select at least one zone.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit ──
  const handleSend = async () => {
    if (!validate()) return;
    setSending(true);

    try {
      const { sendNotification } = await import('../../services/api');

      let recipientIds;
      if (form.recipientMode === 'all') recipientIds = employees.map(e => e.id);
      else if (form.recipientMode === 'zone') recipientIds = zoneRecipients.map(e => e.id);
      else recipientIds = form.selectedEmployees;

      const payload = {
        title: form.title.trim(),
        message: form.message.trim(),
        severity: form.severity,
        recipientMode: form.recipientMode,
        recipients: recipientIds,
        zones: form.recipientMode === 'zone' ? form.selectedZones : [],
      };

      const res = await sendNotification(payload);
      const saved = res.data.notification;

      onNotificationSent?.(saved);

      const label =
        form.recipientMode === 'all'
          ? 'all employees'
          : form.recipientMode === 'zone'
            ? `${recipientIds.length} employee${recipientIds.length !== 1 ? 's' : ''} across ${form.selectedZones.length} zone${form.selectedZones.length !== 1 ? 's' : ''}`
            : `${recipientIds.length} employee${recipientIds.length !== 1 ? 's' : ''}`;

      setSuccessMsg(`Notification sent to ${label} successfully!`);
      setForm(initForm);
      setAttachments([]);
      setAttachError('');
      setEmployeeSearch('');
      setExpandedZones({});
      setErrors({});
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      console.error('Send notification error:', err);
      setErrors({ submit: err.response?.data?.message || 'Failed to send notification' });
    } finally {
      setSending(false);
    }
  };

  return (
    <Box sx={{ width: '100%', px: { xs: 2, md: 3 }, py: 3, boxSizing: 'border-box' }}>

      {/* ── Page header ── */}
      <Paper
        elevation={0}
        sx={{
          border: '1px solid #e2e8f0', borderRadius: '16px', p: 3, mb: 3,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 1.5, textAlign: 'center',
          background: 'linear-gradient(135deg, #fff5f5 0%, #fff 60%)',
        }}
      >
        <Box
          sx={{
            width: 52, height: 52, borderRadius: '14px',
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <NotificationsActive sx={{ color: '#fff', fontSize: 28 }} />
        </Box>
        <Box>
          <Typography sx={{ color: '#64748b', fontSize: '14px' }}>
            Compose and send a notification to one or more warehouse employees.
          </Typography>
        </Box>
      </Paper>

      {/* ── Success alert ── */}
      <Collapse in={!!successMsg}>
        <Alert
          icon={<CheckCircle />}
          severity="success"
          sx={{ mb: 3, borderRadius: '12px', fontWeight: 600 }}
          action={
            <IconButton size="small" onClick={() => setSuccessMsg('')}>
              <Close fontSize="small" />
            </IconButton>
          }
        >
          {successMsg}
        </Alert>
      </Collapse>

      {/* ── Main form card ── */}
      <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden' }}>

        {/* Section: Notification Details */}
        <Box sx={{ p: 3, borderBottom: '1px solid #f1f5f9' }}>
          <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: '15px', mb: 2 }}>
            Notification Details
          </Typography>

          {/* Severity picker */}
          <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#475569', mb: 1 }}>
            Severity / Type
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 2.5 }}>
            {SEVERITIES.map((s) => {
              const Icon = s.icon;
              const active = form.severity === s.value;
              return (
                <Chip
                  key={s.value}
                  icon={<Icon sx={{ fontSize: 16, color: active ? s.color : '#94a3b8' }} />}
                  label={s.label}
                  onClick={() => setForm((f) => ({ ...f, severity: s.value }))}
                  sx={{
                    fontWeight: active ? 700 : 500,
                    fontSize: '13px',
                    cursor: 'pointer',
                    backgroundColor: active ? s.bg : '#f8fafc',
                    color: active ? s.color : '#64748b',
                    border: active ? `1.5px solid ${s.color}44` : '1.5px solid #e2e8f0',
                    '&:hover': { backgroundColor: s.bg, color: s.color },
                  }}
                />
              );
            })}
          </Box>

          {/* Title */}
          <TextField
            fullWidth
            label="Notification Title"
            placeholder="e.g. PPE Inspection Required"
            value={form.title}
            onChange={(e) => { setForm((f) => ({ ...f, title: e.target.value })); setErrors((er) => ({ ...er, title: '' })); }}
            error={!!errors.title}
            helperText={errors.title}
            sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
          />

          {/* Message */}
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Message"
            placeholder="Write the notification message here…"
            value={form.message}
            onChange={(e) => { setForm((f) => ({ ...f, message: e.target.value })); setErrors((er) => ({ ...er, message: '' })); }}
            error={!!errors.message}
            helperText={errors.message}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
          />
        </Box>

        {/* ── Section: Attachments ── */}
        <Box sx={{ p: 3, borderBottom: '1px solid #f1f5f9' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Box>
              <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: '15px' }}>Attachments</Typography>
              <Typography sx={{ fontSize: '12px', color: '#94a3b8', mt: 0.3 }}>
                Images (JPG, PNG, GIF, WebP) &amp; PDFs — max {MAX_FILE_SIZE_MB} MB each, up to {MAX_FILES} files
              </Typography>
            </Box>
            <Chip
              icon={<AttachFile sx={{ fontSize: 15 }} />}
              label={`${attachments.length} / ${MAX_FILES}`}
              size="small"
              sx={{ fontWeight: 700, fontSize: '12px', backgroundColor: attachments.length > 0 ? '#eff6ff' : '#f1f5f9', color: attachments.length > 0 ? '#1d4ed8' : '#94a3b8' }}
            />
          </Box>

          {/* Drop zone */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,application/pdf"
            style={{ display: 'none' }}
            onChange={(e) => processFiles(e.target.files)}
          />
          <Box
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); processFiles(e.dataTransfer.files); }}
            sx={{
              border: `2px dashed ${dragOver ? '#1d4ed8' : attachError ? '#fca5a5' : '#cbd5e1'}`,
              borderRadius: '12px',
              p: 3,
              textAlign: 'center',
              cursor: attachments.length >= MAX_FILES ? 'not-allowed' : 'pointer',
              backgroundColor: dragOver ? '#eff6ff' : '#fafafa',
              transition: 'all 0.2s',
              '&:hover': attachments.length < MAX_FILES ? { borderColor: '#1d4ed8', backgroundColor: '#eff6ff' } : {},
            }}
          >
            <FileUploadOutlined sx={{ fontSize: 36, color: dragOver ? '#1d4ed8' : '#94a3b8', mb: 1 }} />
            <Typography sx={{ fontWeight: 600, color: dragOver ? '#1d4ed8' : '#475569', fontSize: '14px' }}>
              {attachments.length >= MAX_FILES ? `Maximum ${MAX_FILES} files reached` : 'Click or drag & drop files here'}
            </Typography>
            <Typography sx={{ fontSize: '12px', color: '#94a3b8', mt: 0.5 }}>
              Supported: JPG, PNG, GIF, WebP, PDF
            </Typography>
          </Box>

          {/* Error message */}
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
                const isImage = file.type.startsWith('image/');
                return (
                  <Paper
                    key={file.id}
                    elevation={0}
                    sx={{ border: `1.5px solid ${clr.border}`, borderRadius: '10px', p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, backgroundColor: clr.bg }}
                  >
                    {/* Thumbnail or icon */}
                    {isImage ? (
                      <Box
                        component="img"
                        src={file.url}
                        alt={file.name}
                        sx={{ width: 44, height: 44, borderRadius: '8px', objectFit: 'cover', border: `1px solid ${clr.border}`, flexShrink: 0 }}
                      />
                    ) : (
                      <Box sx={{ width: 44, height: 44, borderRadius: '8px', backgroundColor: '#fff', border: `1px solid ${clr.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <FileIcon sx={{ fontSize: 24, color: clr.color }} />
                      </Box>
                    )}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 600, color: '#1e293b', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {file.name}
                      </Typography>
                      <Typography sx={{ fontSize: '11px', color: '#64748b' }}>
                        {file.type === 'application/pdf' ? 'PDF Document' : 'Image'} · {formatBytes(file.size)}
                      </Typography>
                    </Box>
                    {isImage && (
                      <Tooltip title="Preview">
                        <IconButton size="small" onClick={() => window.open(file.url, '_blank')}
                          sx={{ border: '1px solid #e2e8f0', borderRadius: '7px', p: '5px', color: clr.color, backgroundColor: '#fff' }}>
                          <Visibility sx={{ fontSize: 15 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                    {file.type === 'application/pdf' && (
                      <Tooltip title="Open PDF">
                        <IconButton size="small" onClick={() => window.open(file.url, '_blank')}
                          sx={{ border: '1px solid #e2e8f0', borderRadius: '7px', p: '5px', color: clr.color, backgroundColor: '#fff' }}>
                          <Visibility sx={{ fontSize: 15 }} />
                        </IconButton>
                      </Tooltip>
                    )}
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

        {/* Section: Recipients */}
        <Box sx={{ p: 3 }}>
          <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: '15px', mb: 1.5 }}>
            Recipients
          </Typography>

          {/* Mode toggle */}
          <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5, flexWrap: 'wrap' }}>
            {RECIPIENT_MODES.map((m) => {
              const Icon = m.icon;
              const active = form.recipientMode === m.key;
              return (
                <Chip
                  key={m.key}
                  icon={<Icon sx={{ fontSize: 16, color: active ? '#ef4444' : '#94a3b8' }} />}
                  label={m.label}
                  onClick={() => {
                    setForm((f) => ({ ...f, recipientMode: m.key, selectedEmployees: [], selectedZones: [] }));
                    setExpandedZones({});
                    setErrors((er) => ({ ...er, recipients: '' }));
                  }}
                  sx={{
                    fontWeight: active ? 700 : 500,
                    fontSize: '13px',
                    cursor: 'pointer',
                    backgroundColor: active ? '#fff1f2' : '#f8fafc',
                    color: active ? '#ef4444' : '#64748b',
                    border: active ? '1.5px solid #fecaca' : '1.5px solid #e2e8f0',
                    '&:hover': { backgroundColor: '#fff1f2', color: '#ef4444' },
                  }}
                />
              );
            })}
          </Box>

          {/* ── Zone mode ── */}
          {form.recipientMode === 'zone' && (
            <Box>
              {/* Zone cards */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: errors.recipients ? 0.5 : 0 }}>
                {zones.map((zone) => {
                  const emps = zoneEmployees(zone.id);
                  const selected = form.selectedZones.includes(zone.id);
                  const expanded = expandedZones[zone.id];
                  return (
                    <Paper
                      key={zone.id}
                      elevation={0}
                      sx={{
                        border: `1.5px solid ${selected ? zone.border : '#e2e8f0'}`,
                        borderLeft: `5px solid ${zone.color}`,
                        borderRadius: '12px',
                        overflow: 'hidden',
                        backgroundColor: selected ? zone.lightBg : '#fff',
                        transition: 'all 0.2s',
                      }}
                    >
                      {/* Zone header row */}
                      <Box
                        onClick={() => toggleZone(zone.id)}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: 1.5,
                          px: 2, py: 1.6, cursor: 'pointer',
                          '&:hover': { backgroundColor: zone.bg + '55' },
                        }}
                      >
                        <Box
                          sx={{
                            width: 38, height: 38, borderRadius: '10px',
                            backgroundColor: zone.bg,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}
                        >
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
                            <Chip
                              label="Selected"
                              size="small"
                              sx={{ fontSize: '11px', fontWeight: 700, backgroundColor: zone.bg, color: zone.color, border: `1px solid ${zone.border}` }}
                            />
                          )}
                          <IconButton
                            size="small"
                            onClick={(e) => { e.stopPropagation(); toggleZoneExpand(zone.id); }}
                            sx={{ color: '#94a3b8' }}
                          >
                            {expanded ? <KeyboardArrowUp fontSize="small" /> : <KeyboardArrowDown fontSize="small" />}
                          </IconButton>
                        </Box>
                      </Box>

                      {/* Expanded employee list */}
                      {expanded && (
                        <Box sx={{ borderTop: `1px solid ${zone.border}44`, backgroundColor: zone.bg + '33' }}>
                          {emps.length === 0 ? (
                            <Typography sx={{ px: 2.5, py: 1.5, color: '#94a3b8', fontSize: '13px' }}>
                              No employees assigned to this zone.
                            </Typography>
                          ) : (
                            emps.map((emp, idx) => (
                              <React.Fragment key={emp.id}>
                                {idx > 0 && <Divider sx={{ borderColor: zone.border + '44', mx: 2 }} />}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, py: 1.2 }}>
                                  <Avatar
                                    sx={{
                                      width: 30, height: 30, fontSize: '12px',
                                      bgcolor: zone.bg, color: zone.color, fontWeight: 700,
                                      border: `1.5px solid ${zone.border}`,
                                    }}
                                  >
                                    {emp.name[0]}
                                  </Avatar>
                                  <Box>
                                    <Typography sx={{ fontWeight: 600, color: '#1e293b', fontSize: '13px' }}>
                                      {emp.name}
                                    </Typography>
                                    <Typography sx={{ fontSize: '11px', color: '#64748b' }}>
                                      {emp.role}
                                    </Typography>
                                  </Box>
                                </Box>
                              </React.Fragment>
                            ))
                          )}
                        </Box>
                      )}
                    </Paper>
                  );
                })}
              </Box>

              {errors.recipients && (
                <Typography sx={{ color: '#ef4444', fontSize: '12px', mt: 0.8, ml: 0.5 }}>
                  {errors.recipients}
                </Typography>
              )}

              {/* Summary of selected zones */}
              {form.selectedZones.length > 0 && (
                <Paper
                  elevation={0}
                  sx={{ mt: 2, border: '1.5px solid #bbf7d0', backgroundColor: '#f0fdf4', borderRadius: '12px', p: 2 }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CheckCircle sx={{ fontSize: 17, color: '#16a34a' }} />
                    <Typography sx={{ fontWeight: 700, color: '#166534', fontSize: '13.5px' }}>
                      {zoneRecipients.length} employee{zoneRecipients.length !== 1 ? 's' : ''} will receive this notification
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                    {form.selectedZones.map((zid) => {
                      const z = zones.find((z) => z.id === zid);
                      const cnt = zoneEmployees(zid).length;
                      return z ? (
                        <Chip
                          key={zid}
                          icon={<LocationOn sx={{ fontSize: 14, color: z.color }} />}
                          label={`${z.label} (${cnt})`}
                          onDelete={() => toggleZone(zid)}
                          size="small"
                          sx={{ fontSize: '12px', fontWeight: 600, backgroundColor: z.bg, color: z.color, border: `1px solid ${z.border}` }}
                        />
                      ) : null;
                    })}
                  </Box>
                </Paper>
              )}
            </Box>
          )}

          {/* All employees banner */}
          {form.recipientMode === 'all' && (
            <Paper
              elevation={0}
              sx={{
                border: '1.5px solid #bbf7d0', backgroundColor: '#f0fdf4',
                borderRadius: '12px', p: 2, display: 'flex', alignItems: 'center', gap: 1.5,
              }}
            >
              <Group sx={{ color: '#16a34a', fontSize: 22 }} />
              <Box>
                <Typography sx={{ fontWeight: 700, color: '#166534', fontSize: '14px' }}>
                  All Employees Selected
                </Typography>
                <Typography sx={{ color: '#16a34a', fontSize: '13px' }}>
                  This notification will be sent to all {employees.length} registered warehouse employees.
                </Typography>
              </Box>
            </Paper>
          )}

          {/* Individual search + list */}
          {form.recipientMode === 'individual' && (
            <Box>
              <TextField
                fullWidth
                size="small"
                placeholder="Search by name or zone…"
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
              />

              {/* Selected chips */}
              {form.selectedEmployees.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
                  {form.selectedEmployees.map((id) => {
                    const emp = employees.find((e) => e.id === id);
                    return emp ? (
                      <Chip
                        key={id}
                        avatar={<Avatar sx={{ width: 22, height: 22, fontSize: '11px', bgcolor: '#fecaca', color: '#dc2626' }}>{emp.name[0]}</Avatar>}
                        label={emp.name}
                        onDelete={() => removeEmployee(id)}
                        sx={{ fontSize: '13px', fontWeight: 600, backgroundColor: '#fff1f2', color: '#dc2626', border: '1px solid #fecaca' }}
                      />
                    ) : null;
                  })}
                </Box>
              )}

              {/* Dropdown list */}
              <Paper
                elevation={0}
                sx={{
                  border: `1.5px solid ${errors.recipients ? '#fca5a5' : '#e2e8f0'}`,
                  borderRadius: '12px',
                  maxHeight: 240,
                  overflowY: 'auto',
                }}
              >
                {filteredEmployees.length === 0 ? (
                  <Typography sx={{ p: 2.5, color: '#94a3b8', fontSize: '14px', textAlign: 'center' }}>
                    {employeeSearch ? 'No employees match your search.' : 'All employees are selected.'}
                  </Typography>
                ) : (
                  filteredEmployees.map((emp, idx) => (
                    <React.Fragment key={emp.id}>
                      {idx > 0 && <Divider sx={{ borderColor: '#f1f5f9' }} />}
                      <Box
                        onClick={() => addEmployee(emp.id)}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.4,
                          cursor: 'pointer', transition: 'all 0.15s',
                          '&:hover': { backgroundColor: '#fff5f5' },
                        }}
                      >
                        <Avatar sx={{ width: 34, height: 34, fontSize: '13px', bgcolor: '#fecaca', color: '#dc2626', fontWeight: 700 }}>
                          {emp.name[0]}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ fontWeight: 600, color: '#1e293b', fontSize: '14px' }}>
                            {emp.name}
                          </Typography>
                          <Typography sx={{ fontSize: '12px', color: '#64748b' }}>
                            {emp.role} · {emp.zone}
                          </Typography>
                        </Box>
                        <Chip
                          label="Add"
                          size="small"
                          sx={{ fontSize: '11px', fontWeight: 700, backgroundColor: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', cursor: 'pointer' }}
                        />
                      </Box>
                    </React.Fragment>
                  ))
                )}
              </Paper>
              {errors.recipients && (
                <Typography sx={{ color: '#ef4444', fontSize: '12px', mt: 0.8, ml: 1.5 }}>
                  {errors.recipients}
                </Typography>
              )}
            </Box>
          )}
        </Box>

        {/* ── Preview card ── */}
        {(form.title || form.message) && (
          <>
            <Divider sx={{ borderColor: '#f1f5f9' }} />
            <Box sx={{ p: 3 }}>
              <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: '15px', mb: 1.5 }}>
                Preview
              </Typography>
              <Paper
                elevation={0}
                sx={{
                  border: `1.5px solid ${sevCfg.color}33`,
                  borderLeft: `5px solid ${sevCfg.color}`,
                  borderRadius: '12px',
                  p: 2.5,
                  backgroundColor: sevCfg.bg + '44',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  <Box sx={{ width: 40, height: 40, borderRadius: '10px', backgroundColor: sevCfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <SevIcon sx={{ fontSize: 20, color: sevCfg.color }} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontWeight: 800, color: '#1e293b', fontSize: '15px', mb: 0.4 }}>
                      {form.title || <span style={{ color: '#94a3b8' }}>Notification Title</span>}
                    </Typography>
                    <Typography sx={{ color: '#475569', fontSize: '13.5px', lineHeight: 1.6 }}>
                      {form.message || <span style={{ color: '#94a3b8' }}>Your message will appear here…</span>}
                    </Typography>
                    <Typography sx={{ mt: 1, fontSize: '12px', color: '#94a3b8' }}>🕐 Just now</Typography>
                  </Box>
                </Box>
              </Paper>
            </Box>
          </>
        )}

        {/* ── Footer actions ── */}
        <Box
          sx={{
            px: 3, pb: 3, pt: 2,
            display: 'flex', justifyContent: 'flex-end', gap: 1.5,
            borderTop: '1px solid #f1f5f9',
          }}
        >
          <Button
            variant="outlined"
            onClick={() => { setForm(initForm); setErrors({}); setAttachments([]); setAttachError(''); setEmployeeSearch(''); setExpandedZones({}); }}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '10px', borderColor: '#e2e8f0', color: '#475569', '&:hover': { borderColor: '#cbd5e1', backgroundColor: '#f8fafc' } }}
          >
            Clear
          </Button>
          <Tooltip title={
            form.recipientMode === 'all'
              ? `Send to all ${employees.length} employees`
              : form.recipientMode === 'zone' && form.selectedZones.length > 0
                ? `Send to ${zoneRecipients.length} employee${zoneRecipients.length !== 1 ? 's' : ''} across ${form.selectedZones.length} zone${form.selectedZones.length !== 1 ? 's' : ''}`
                : form.selectedEmployees.length > 0
                  ? `Send to ${form.selectedEmployees.length} employee${form.selectedEmployees.length > 1 ? 's' : ''}`
                  : 'Select recipients first'
          }>
            <span>
              <Button
                variant="contained"
                startIcon={<Send sx={{ fontSize: 18 }} />}
                onClick={handleSend}
                sx={{
                  textTransform: 'none', fontWeight: 700, borderRadius: '10px',
                  backgroundColor: '#ef4444', fontSize: '14px', px: 3,
                  '&:hover': { backgroundColor: '#dc2626' },
                }}
              >
                Send Notification
              </Button>
            </span>
          </Tooltip>
        </Box>
      </Paper>
    </Box>
  );
};

export default SendNotificationForm;
