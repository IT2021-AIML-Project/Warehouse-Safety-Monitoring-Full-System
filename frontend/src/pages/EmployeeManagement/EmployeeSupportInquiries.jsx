import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  HeadsetMic,
  Add,
  FormatListBulleted,
  HelpOutline,
  ExpandMore,
  WarningAmber,
  CheckCircleOutline,
  HourglassEmpty,
  EditOutlined,
  DeleteOutline,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { createInquiry, getMyInquiries, updateInquiry, deleteInquiry } from '../../services/api';

const faqs = [
  { q: 'How do I request replacement PPE?', a: 'Submit a new inquiry under the "Equipment" category. Your supervisor will be notified and process the request within 24 hours.' },
  { q: 'What should I do in case of an emergency?', a: 'Follow the emergency evacuation plan posted in your zone. Use the emergency call button and notify your supervisor immediately.' },
  { q: 'How often are safety inspections conducted?', a: 'Safety inspections are conducted monthly for all zones. Special inspections may be triggered by incidents or regulatory requirements.' },
  { q: 'Who do I contact for zone access issues?', a: 'Submit an inquiry under the "Access" category or contact your floor supervisor directly for urgent access problems.' },
  { q: 'How do I report a near-miss incident?', a: 'Use the "Incident" category when submitting a new inquiry. Include the date, time, location, and a description of what happened.' },
];

const statusStyle = {
  Open: { bg: '#dbeafe', color: '#1d4ed8', icon: <HourglassEmpty sx={{ fontSize: 14 }} /> },
  Pending: { bg: '#fef9c3', color: '#a16207', icon: <WarningAmber sx={{ fontSize: 14 }} /> },
  Resolved: { bg: '#dcfce7', color: '#16a34a', icon: <CheckCircleOutline sx={{ fontSize: 14 }} /> },
};

const categories = ['Equipment', 'Access', 'Training', 'Safety', 'Incident', 'Other'];

// ─── Component ────────────────────────────────────────────────────────────────
const EmployeeSupportInquiries = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('inquiries');
  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState({ subject: '', category: categories[0], message: '' });
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ subject: '', category: categories[0], message: '' });

  // Fetch inquiries from backend
  const loadInquiries = async () => {
    try {
      setLoading(true);
      const empId = user?.employeeId || user?.username;
      const res = await getMyInquiries(empId);
      setInquiries(res.data.inquiries);
    } catch (error) {
      console.error('Failed to fetch inquiries:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInquiries();
  }, []);

  const handleOpenEdit = (inq) => {
    setEditTarget(inq);
    setEditForm({ subject: inq.subject, category: inq.category, message: inq.message });
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editForm.subject.trim() || !editForm.message.trim()) return;
    try {
      await updateInquiry(editTarget._id, {
        subject: editForm.subject,
        category: editForm.category,
        message: editForm.message,
      });
      setEditOpen(false);
      setEditTarget(null);
      loadInquiries();
    } catch (error) {
      console.error('Failed to update inquiry:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteInquiry(id);
      loadInquiries();
    } catch (error) {
      console.error('Failed to delete inquiry:', error);
    }
  };

  const handleSubmit = async () => {
    if (!form.subject.trim() || !form.message.trim()) return;
    try {
      await createInquiry({
        subject: form.subject,
        category: form.category,
        message: form.message,
        submittedBy: user?.fullName || user?.username || 'Employee',
        employeeId: user?.employeeId || user?.username,
      });
      setForm({ subject: '', category: categories[0], message: '' });
      setNewOpen(false);
      setActiveTab('inquiries');
      loadInquiries();
    } catch (error) {
      console.error('Failed to create inquiry:', error);
    }
  };

  return (
    <Box sx={{ maxWidth: '1100px', mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>

      {/* ── Page header ── */}
      <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '16px', p: 3, mb: 3, display: 'flex', alignItems: 'center', gap: 2, backgroundColor: '#f8fafc' }}>
        <Box sx={{ width: 48, height: 48, borderRadius: '12px', background: 'linear-gradient(135deg, #1e293b 0%, #1d4ed8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <HeadsetMic sx={{ color: '#fff', fontSize: 26 }} />
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 800, color: '#1e293b', fontSize: '22px', lineHeight: 1.2 }}>
            Support &amp; Inquiries
          </Typography>
          <Typography sx={{ color: '#64748b', fontSize: '14px' }}>
            Submit a request, track your inquiries, or browse our FAQ.
          </Typography>
        </Box>
      </Paper>

      {/* ── Tabs ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 3, borderBottom: '2px solid #e2e8f0', pb: '1px' }}>
        {[
          { key: 'inquiries', label: 'My Inquiries', icon: <FormatListBulleted sx={{ fontSize: 18 }} /> },
          { key: 'faq', label: 'FAQ', icon: <HelpOutline sx={{ fontSize: 18 }} /> },
        ].map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Button
              key={tab.key}
              startIcon={tab.icon}
              onClick={() => setActiveTab(tab.key)}
              sx={{
                textTransform: 'none', fontWeight: active ? 700 : 500, fontSize: '14px',
                color: active ? '#1d4ed8' : '#64748b',
                backgroundColor: active ? '#dbeafe' : 'transparent',
                borderRadius: '10px 10px 0 0', px: 2.5, py: 1.2,
                borderBottom: active ? '3px solid #1d4ed8' : '3px solid transparent',
                '&:hover': { backgroundColor: '#eff6ff', color: '#1d4ed8' },
              }}
            >
              {tab.label}
            </Button>
          );
        })}

        {/* New Inquiry button on right */}
        <Button
          startIcon={<Add />}
          onClick={() => setNewOpen(true)}
          variant="contained"
          sx={{
            ml: 'auto', textTransform: 'none', fontWeight: 700, fontSize: '14px',
            backgroundColor: '#1d4ed8', borderRadius: '10px', px: 2.5, py: 1,
            '&:hover': { backgroundColor: '#1e40af' },
          }}
        >
          New Inquiry
        </Button>
      </Box>

      {/* ── My Inquiries tab ── */}
      {activeTab === 'inquiries' && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
            <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: '18px', display: 'flex', alignItems: 'center', gap: 1 }}>
              <FormatListBulleted sx={{ color: '#1d4ed8' }} /> Your Inquiries
            </Typography>
            <Chip label={`${inquiries.length} total`} sx={{ fontWeight: 600, backgroundColor: '#dbeafe', color: '#1d4ed8', border: 'none' }} />
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : inquiries.length === 0 ? (
            <Paper elevation={0} sx={{ border: '1px dashed #e2e8f0', borderRadius: '16px', p: 6, textAlign: 'center' }}>
              <HeadsetMic sx={{ fontSize: 48, color: '#93c5fd', mb: 1 }} />
              <Typography sx={{ color: '#94a3b8', fontSize: '15px' }}>No inquiries yet. Submit your first one!</Typography>
            </Paper>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {inquiries.map((inq) => {
                const s = statusStyle[inq.status];
                return (
                  <Paper key={inq._id} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '14px', p: 3, display: 'flex', alignItems: 'flex-start', gap: 2.5, '&:hover': { borderColor: '#93c5fd', boxShadow: '0 4px 16px rgba(29,78,216,0.10)' }, transition: 'all 0.15s' }}>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.8, flexWrap: 'wrap' }}>
                        <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: '15px' }}>{inq.subject}</Typography>
                        <Chip label={inq.category} size="small" sx={{ fontSize: '11px', fontWeight: 600, backgroundColor: '#f1f5f9', color: '#475569', border: 'none' }} />
                      </Box>
                      <Typography sx={{ color: '#64748b', fontSize: '13px', lineHeight: 1.6 }}>{inq.message}</Typography>
                      <Typography sx={{ color: '#94a3b8', fontSize: '12px', mt: 1 }}>
                        Submitted {new Date(inq.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </Typography>
                      {inq.response && (
                        <Box sx={{ mt: 1.5, p: 1.5, backgroundColor: '#f0fdf4', borderRadius: '8px', borderLeft: '3px solid #16a34a' }}>
                          <Typography sx={{ color: '#15803d', fontSize: '12px', fontWeight: 600, mb: 0.3 }}>Manager Response</Typography>
                          <Typography sx={{ color: '#166534', fontSize: '13px', lineHeight: 1.6 }}>{inq.response}</Typography>
                        </Box>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                      <Chip
                        icon={s.icon}
                        label={inq.status}
                        sx={{ fontWeight: 700, fontSize: '12px', backgroundColor: s.bg, color: s.color, border: 'none', px: 0.5 }}
                      />
                      {inq.status === 'Open' && (
                        <>
                          <Tooltip title="Edit inquiry">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenEdit(inq)}
                              sx={{ border: '1px solid #e2e8f0', borderRadius: '8px', p: '5px', color: '#1d4ed8', backgroundColor: '#eff6ff', '&:hover': { backgroundColor: '#dbeafe', borderColor: '#93c5fd' } }}
                            >
                              <EditOutlined sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete inquiry">
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(inq._id)}
                              sx={{ border: '1px solid #e2e8f0', borderRadius: '8px', p: '5px', color: '#ef4444', backgroundColor: '#fff5f5', '&:hover': { backgroundColor: '#fee2e2', borderColor: '#fca5a5' } }}
                            >
                              <DeleteOutline sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          )}
        </Box>
      )}

      {/* ── FAQ tab ── */}
      {activeTab === 'faq' && (
        <Box>
          <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: '18px', mb: 2.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <HelpOutline sx={{ color: '#1d4ed8' }} /> Frequently Asked Questions
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {faqs.map((faq, i) => (
              <Accordion key={i} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '12px !important', '&:before': { display: 'none' }, '&.Mui-expanded': { borderColor: '#93c5fd' } }}>
                <AccordionSummary expandIcon={<ExpandMore sx={{ color: '#1d4ed8' }} />} sx={{ px: 3, py: 0.5 }}>
                  <Typography sx={{ fontWeight: 600, color: '#1e293b', fontSize: '14px' }}>{faq.q}</Typography>
                </AccordionSummary>
                <Divider />
                <AccordionDetails sx={{ px: 3, py: 2 }}>
                  <Typography sx={{ color: '#64748b', fontSize: '14px', lineHeight: 1.7 }}>{faq.a}</Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        </Box>
      )}

      {/* ── Edit Inquiry Dialog ── */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} PaperProps={{ sx: { borderRadius: '18px', p: 1, minWidth: 480 } }}>
        <DialogTitle sx={{ fontWeight: 800, color: '#1e293b', fontSize: '18px', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <EditOutlined sx={{ color: '#1d4ed8' }} /> Edit Inquiry
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '20px !important' }}>
          <TextField
            label="Subject"
            size="small"
            fullWidth
            value={editForm.subject}
            onChange={(e) => setEditForm((f) => ({ ...f, subject: e.target.value }))}
          />
          <TextField
            select
            label="Category"
            size="small"
            fullWidth
            value={editForm.category}
            onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
            SelectProps={{ native: true }}
          >
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </TextField>
          <TextField
            label="Message"
            size="small"
            fullWidth
            multiline
            rows={4}
            value={editForm.message}
            onChange={(e) => setEditForm((f) => ({ ...f, message: e.target.value }))}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setEditOpen(false)} sx={{ textTransform: 'none', color: '#64748b', fontWeight: 600 }}>Cancel</Button>
          <Button
            onClick={handleEditSave}
            variant="contained"
            disabled={!editForm.subject.trim() || !editForm.message.trim()}
            sx={{ textTransform: 'none', fontWeight: 700, backgroundColor: '#1d4ed8', borderRadius: '10px', px: 3, '&:hover': { backgroundColor: '#1e40af' } }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── New Inquiry Dialog ── */}
      <Dialog open={newOpen} onClose={() => setNewOpen(false)} PaperProps={{ sx: { borderRadius: '18px', p: 1, minWidth: 480 } }}>
        <DialogTitle sx={{ fontWeight: 800, color: '#1e293b', fontSize: '18px', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Add sx={{ color: '#1d4ed8' }} /> New Inquiry
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '20px !important' }}>
          <TextField
            label="Subject"
            size="small"
            fullWidth
            value={form.subject}
            onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            placeholder="Brief description of your inquiry"
          />
          <TextField
            select
            label="Category"
            size="small"
            fullWidth
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            SelectProps={{ native: true }}
          >
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </TextField>
          <TextField
            label="Message"
            size="small"
            fullWidth
            multiline
            rows={4}
            value={form.message}
            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            placeholder="Describe your issue or request in detail..."
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setNewOpen(false)} sx={{ textTransform: 'none', color: '#64748b', fontWeight: 600 }}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!form.subject.trim() || !form.message.trim()}
            sx={{ textTransform: 'none', fontWeight: 700, backgroundColor: '#1d4ed8', borderRadius: '10px', px: 3, '&:hover': { backgroundColor: '#1e40af' } }}
          >
            Submit Inquiry
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default EmployeeSupportInquiries;
