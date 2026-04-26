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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Avatar,
  CircularProgress,
} from '@mui/material';
import {
  HeadsetMic,
  FormatListBulleted,
  HelpOutline,
  ExpandMore,
  WarningAmber,
  CheckCircleOutline,
  HourglassEmpty,
  Reply,
  Inventory2,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { getAllInquiries, respondToInquiry } from '../../services/api';

const faqs = [
  { q: 'How should I handle urgent restock requests?', a: 'Mark the inquiry as Pending immediately and coordinate with the procurement team. Update the status to Resolved once the restock has been confirmed and processed.' },
  { q: 'What steps follow a Damaged Item Report?', a: 'Log the damage in the inventory system, remove the affected items from active inventory, and initiate a replacement order. Respond to the inquiry with a summary of actions taken.' },
  { q: 'How do I resolve Zone Assignment discrepancies?', a: 'Cross-check the system records with the physical inventory in the zone. Correct any mismatches in the system, then notify the employee and update the inquiry status.' },
  { q: 'Who should I escalate unresolvable inquiries to?', a: 'Escalate to the Warehouse Operations Manager. Attach all relevant photos, zone logs, and inventory records before escalating.' },
  { q: 'What is the target response time for inquiries?', a: 'All open inquiries should receive an initial response within 24 hours. Restock and damage inquiries require resolution within 48 hours.' },
];

const statusStyle = {
  Open: { bg: '#dbeafe', color: '#1d4ed8', icon: <HourglassEmpty sx={{ fontSize: 14 }} /> },
  Pending: { bg: '#fef9c3', color: '#a16207', icon: <WarningAmber sx={{ fontSize: 14 }} /> },
  Resolved: { bg: '#dcfce7', color: '#16a34a', icon: <CheckCircleOutline sx={{ fontSize: 14 }} /> },
};

const statusOptions = ['Open', 'Pending', 'Resolved'];
const statusOrder = { Open: 0, Pending: 1, Resolved: 2 };

// ─── Component ────────────────────────────────────────────────────────────────
const InventorySupportInquiries = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('inquiries');
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInq, setSelectedInq] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [respondError, setRespondError] = useState('');

  // Fetch all inquiries from backend
  const loadInquiries = async () => {
    try {
      setLoading(true);
      const res = await getAllInquiries();
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

  const openDialog = (inq) => {
    setSelectedInq(inq);
    setReplyText(inq.response || '');
    setNewStatus(inq.status);
    setRespondError('');
  };

  const closeDialog = () => {
    setSelectedInq(null);
    setReplyText('');
    setNewStatus('');
  };

  const handleSaveResponse = async () => {
    try {
      await respondToInquiry(selectedInq._id, {
        response: replyText,
        status: newStatus,
        respondedBy: user?.fullName || user?.username || 'Manager',
      });
      closeDialog();
      loadInquiries();
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to respond to inquiry';
      setRespondError(msg);
    }
  };

  const openCount = inquiries.filter((i) => i.status === 'Open').length;
  const pendCount = inquiries.filter((i) => i.status === 'Pending').length;
  const resolveCount = inquiries.filter((i) => i.status === 'Resolved').length;

  return (
    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', py: 4 }}>
      <Box sx={{ width: '100%', maxWidth: '1300px', px: { xs: 2, md: 4 } }}>

        {/* ── Page header ── */}
        <Paper
          elevation={0}
          sx={{
            border: '1px solid #e2e8f0', borderRadius: '16px', p: 3, mb: 3,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, backgroundColor: '#f8fafc',
          }}
        >
          <Box
            sx={{
              width: 48, height: 48, borderRadius: '12px',
              background: 'linear-gradient(135deg, #16a34a, #15803d)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <HeadsetMic sx={{ color: '#fff', fontSize: 26 }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, color: '#1e293b', fontSize: '22px', lineHeight: 1.2 }}>
              Inventory Support &amp; Inquiries
            </Typography>
            <Typography sx={{ color: '#64748b', fontSize: '14px' }}>
              View and respond to employee inquiries, or browse frequently asked questions.
            </Typography>
          </Box>
        </Paper>

        {/* ── Summary chips ── */}
        <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
          {[
            { label: `${openCount} Open`, bg: '#dbeafe', color: '#1d4ed8' },
            { label: `${pendCount} Pending`, bg: '#fef9c3', color: '#a16207' },
            { label: `${resolveCount} Resolved`, bg: '#dcfce7', color: '#16a34a' },
          ].map((c) => (
            <Chip key={c.label} label={c.label} sx={{ fontWeight: 700, fontSize: '13px', backgroundColor: c.bg, color: c.color, border: 'none', px: 0.5 }} />
          ))}
        </Box>

        {/* ── Tabs ── */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 3, borderBottom: '2px solid #e2e8f0', pb: '1px' }}>
          {[
            { key: 'inquiries', label: 'All Inquiries', icon: <FormatListBulleted sx={{ fontSize: 18 }} /> },
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
                  color: active ? '#16a34a' : '#64748b',
                  backgroundColor: active ? '#dcfce7' : 'transparent',
                  borderRadius: '10px 10px 0 0', px: 2.5, py: 1.2,
                  borderBottom: active ? '3px solid #16a34a' : '3px solid transparent',
                  '&:hover': { backgroundColor: '#f0fdf4', color: '#16a34a' },
                }}
              >
                {tab.label}
              </Button>
            );
          })}
        </Box>

        {/* ── Inquiries Tab ── */}
        {activeTab === 'inquiries' && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
              <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: '18px', display: 'flex', alignItems: 'center', gap: 1 }}>
                <FormatListBulleted sx={{ color: '#16a34a' }} /> Employee Inquiries
              </Typography>
              <Chip label={`${inquiries.length} total`} sx={{ fontWeight: 600, backgroundColor: '#dcfce7', color: '#16a34a', border: 'none' }} />
            </Box>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            ) : inquiries.length === 0 ? (
              <Paper elevation={0} sx={{ border: '1px dashed #e2e8f0', borderRadius: '16px', p: 6, textAlign: 'center' }}>
                <Inventory2 sx={{ fontSize: 48, color: '#86efac', mb: 1 }} />
                <Typography sx={{ color: '#94a3b8', fontSize: '15px' }}>No inquiries to display.</Typography>
              </Paper>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {inquiries.map((inq) => {
                  const s = statusStyle[inq.status];
                  return (
                    <Paper
                      key={inq._id}
                      elevation={0}
                      onClick={() => openDialog(inq)}
                      sx={{
                        border: '1px solid #e2e8f0', borderRadius: '14px', p: 3,
                        display: 'flex', alignItems: 'flex-start', gap: 2.5,
                        cursor: 'pointer',
                        '&:hover': { borderColor: '#86efac', boxShadow: '0 4px 16px rgba(22,163,74,0.08)' },
                        transition: 'all 0.15s',
                        ...(inq.status === 'Pending' ? { borderLeft: '4px solid #eab308' } : {}),
                        ...(inq.status === 'Open' ? { borderLeft: '4px solid #3b82f6' } : {}),
                        ...(inq.status === 'Resolved' ? { borderLeft: '4px solid #16a34a' } : {}),
                      }}
                    >
                      <Avatar sx={{ width: 38, height: 38, backgroundColor: '#dcfce7', color: '#16a34a', fontSize: '14px', fontWeight: 700, flexShrink: 0 }}>
                        {inq.submittedBy.split(' ').map((n) => n[0]).join('')}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.8, flexWrap: 'wrap' }}>
                          <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: '15px' }}>{inq.subject}</Typography>
                          <Chip label={inq.category} size="small" sx={{ fontSize: '11px', fontWeight: 600, backgroundColor: '#f1f5f9', color: '#475569', border: 'none' }} />
                        </Box>
                        <Typography sx={{ color: '#64748b', fontSize: '15px', lineHeight: 1.6 }}>{inq.message}</Typography>
                        <Typography sx={{ color: '#94a3b8', fontSize: '14px', mt: 1 }}>
                          Submitted {new Date(inq.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} &bull; By <strong>{inq.submittedBy}</strong>
                        </Typography>
                        {inq.response && (
                          <Box sx={{ mt: 1.5, p: 1.5, backgroundColor: '#f0fdf4', borderRadius: '8px', borderLeft: '3px solid #16a34a' }}>
                            <Typography sx={{ color: '#15803d', fontSize: '14px', fontWeight: 600, mb: 0.3 }}>Manager Response</Typography>
                            <Typography sx={{ color: '#166534', fontSize: '15px', lineHeight: 1.6 }}>{inq.response}</Typography>
                          </Box>
                        )}
                      </Box>
                      <Chip
                        icon={s.icon}
                        label={inq.status}
                        sx={{ fontWeight: 700, fontSize: '12px', backgroundColor: s.bg, color: s.color, border: 'none', px: 0.5, flexShrink: 0 }}
                      />
                    </Paper>
                  );
                })}
              </Box>
            )}
          </Box>
        )}

        {/* ── FAQ Tab ── */}
        {activeTab === 'faq' && (
          <Box>
            <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: '18px', mb: 2.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <HelpOutline sx={{ color: '#16a34a' }} /> Frequently Asked Questions
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {faqs.map((faq, i) => (
                <Accordion
                  key={i}
                  elevation={0}
                  sx={{
                    border: '1px solid #e2e8f0', borderRadius: '12px !important',
                    '&:before': { display: 'none' },
                    '&.Mui-expanded': { borderColor: '#86efac' },
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMore sx={{ color: '#16a34a' }} />} sx={{ px: 3, py: 0.5 }}>
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

        {/* ── Respond Dialog ── */}
        <Dialog
          open={Boolean(selectedInq)}
          onClose={closeDialog}
          PaperProps={{ sx: { borderRadius: '18px', p: 1, minWidth: 520 } }}
        >
          {selectedInq && (
            <>
              <DialogTitle sx={{ fontWeight: 800, color: '#1e293b', fontSize: '18px', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Reply sx={{ color: '#16a34a' }} /> Respond to Inquiry
              </DialogTitle>
              <Divider />
              <DialogContent sx={{ pt: '20px !important' }}>

                {/* Inquiry summary */}
                <Paper elevation={0} sx={{ p: 2.5, borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, flexWrap: 'wrap' }}>
                    <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: '15px' }}>{selectedInq.subject}</Typography>
                    <Chip label={selectedInq.category} size="small" sx={{ fontSize: '11px', fontWeight: 600, backgroundColor: '#f1f5f9', color: '#475569', border: 'none' }} />
                    <Chip
                      icon={statusStyle[selectedInq.status]?.icon}
                      label={selectedInq.status}
                      size="small"
                      sx={{ fontSize: '11px', fontWeight: 700, backgroundColor: statusStyle[selectedInq.status]?.bg, color: statusStyle[selectedInq.status]?.color, border: 'none' }}
                    />
                  </Box>
                  <Typography sx={{ color: '#64748b', fontSize: '13.5px', lineHeight: 1.7, mb: 1 }}>{selectedInq.message}</Typography>
                  <Typography sx={{ color: '#94a3b8', fontSize: '12px' }}>
                    Submitted {new Date(selectedInq.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} &bull; By <strong>{selectedInq.submittedBy}</strong>
                  </Typography>
                </Paper>

                {/* Response textarea */}
                <TextField
                  label="Your Response"
                  fullWidth
                  multiline
                  rows={4}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your response to this inquiry..."
                  disabled={selectedInq.status === 'Resolved'}
                  sx={{ mb: 2.5 }}
                />

                {respondError && (
                  <Paper elevation={0} sx={{ p: 1.5, mb: 2, backgroundColor: '#fee2e2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                    <Typography sx={{ color: '#dc2626', fontSize: '13px', fontWeight: 600 }}>{respondError}</Typography>
                  </Paper>
                )}

                {/* Status update — forward-only */}
                {selectedInq.status === 'Resolved' ? (
                  <Paper elevation={0} sx={{ p: 2, backgroundColor: '#dcfce7', borderRadius: '10px', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircleOutline sx={{ color: '#16a34a', fontSize: 20 }} />
                    <Typography sx={{ color: '#15803d', fontSize: '13px', fontWeight: 600 }}>This inquiry has been resolved and is now locked.</Typography>
                  </Paper>
                ) : (
                  <FormControl fullWidth size="small">
                    <InputLabel>Update Status</InputLabel>
                    <Select
                      label="Update Status"
                      value={newStatus}
                      onChange={(e) => { setNewStatus(e.target.value); setRespondError(''); }}
                    >
                      {statusOptions
                        .filter((s) => statusOrder[s] >= statusOrder[selectedInq.status])
                        .map((s) => (
                          <MenuItem key={s} value={s}>{s}</MenuItem>
                        ))}
                    </Select>
                  </FormControl>
                )}
              </DialogContent>

              <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                <Button
                  onClick={closeDialog}
                  sx={{ textTransform: 'none', color: '#64748b', fontWeight: 600 }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveResponse}
                  variant="contained"
                  disabled={!replyText.trim() || selectedInq.status === 'Resolved'}
                  sx={{
                    textTransform: 'none', fontWeight: 700,
                    backgroundColor: '#16a34a', borderRadius: '10px', px: 3,
                    '&:hover': { backgroundColor: '#15803d' },
                  }}
                >
                  {selectedInq.status === 'Resolved' ? 'Locked' : 'Save Response'}
                </Button>
              </DialogActions>
            </>
          )}
        </Dialog>

      </Box>
    </Box>
  );
};

export default InventorySupportInquiries;
