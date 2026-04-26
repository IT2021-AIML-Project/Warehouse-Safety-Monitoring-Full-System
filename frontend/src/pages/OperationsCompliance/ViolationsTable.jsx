import React, { useState } from 'react';
import {
  Box, Typography, Paper, Button, Chip, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Select, MenuItem, InputLabel,
  FormControl, Grid, Divider, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Tooltip,
} from '@mui/material';
import {
  Visibility, Edit, Delete, Add, FileDownload, Close, Warning, PictureAsPdf,
} from '@mui/icons-material';
import { downloadPDF } from '../../utils/reportUtils';

function getStatusColor(status) {
  if (status === 'Pending') return 'warning';
  if (status === 'Verified') return 'error';
  if (status === 'False Positive') return 'default';
  return 'default';
}

const violationTypes = ['No Helmet', 'No Mask', 'No Safety Vest'];
const statusOptions = ['Pending', 'Verified', 'False Positive'];

const defaultNew = {
  date: new Date().toISOString().split('T')[0],
  section: '',
  employee: '',
  type: '',
  confidence: 90,
  status: 'Pending',
  timestamp: new Date().toISOString(),
  hourlyTimestamp: '09:00',
};

const labelSx = { fontWeight: 700, color: '#0F2854', mb: 0.5 };
const inputSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2,
    '&.Mui-focused fieldset': { borderColor: '#1C4D8D' },
  },
};

export function ViolationsTable({ violations, onUpdate, onDelete, onAdd }) {
  const [viewDialog, setViewDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [addDialog, setAddDialog] = useState(false);
  const [selected, setSelected] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [newV, setNewV] = useState(defaultNew);

  const handleExportCSV = () => {
    const header = ['Date', 'Section', 'Type', 'Confidence', 'Status'];
    const rows = violations.map((v) => [v.date, v.section, v.type, v.confidence + '%', v.status]);
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'violations.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    const totalViolations = violations.length;
    const avgConf = totalViolations
      ? violations.reduce((s, v) => s + (Number(v.confidence) || 0), 0) / totalViolations
      : 0;

    downloadPDF({
      title: 'Violations Log Report',
      dateRange: violations.length
        ? `${violations[violations.length - 1]?.date || ''} to ${violations[0]?.date || ''}`
        : 'All records',
      stats: {
        totalPeople: '—',
        totalViolations,
        safetyScore: avgConf,
        complianceScore: totalViolations === 0 ? 100 : Math.max(0, 100 - (avgConf * totalViolations) / 10),
      },
      columns: ['Date', 'Section', 'Violation Type', 'Confidence', 'Status'],
      rows: violations.map((v) => [
        v.date,
        v.section,
        v.type,
        `${v.confidence}%`,
        v.status,
      ]),
      filename: `violations-log-${new Date().toISOString().slice(0, 10)}`,
    });
  };

  const handleSaveEdit = () => { onUpdate(editForm); setEditDialog(false); };
  const handleAddNew = () => {
    const id = `VIO-${Date.now()}`;
    onAdd({ ...newV, id, timestamp: new Date().toISOString() });
    setNewV(defaultNew);
    setAddDialog(false);
  };

  const DetailItem = ({ label, value }) => (
    <Box sx={{ p: 2, background: '#F0F8FB', borderRadius: 2, border: '1px solid #BDE8F5' }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body1" sx={{ fontWeight: 700, color: '#0F2854' }}>{value}</Typography>
    </Box>
  );

  const FormField = ({ label, children }) => (
    <Box>
      <Typography variant="caption" sx={labelSx}>{label}</Typography>
      {children}
    </Box>
  );

  return (
    <Box>
      {/* Toolbar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F2854' }}>
          <Warning sx={{ mr: 1, verticalAlign: 'middle', color: '#EF4444' }} />
          Violations Log
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small" variant="outlined" startIcon={<FileDownload />}
            onClick={handleExportCSV}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, borderColor: '#1C4D8D', color: '#1C4D8D' }}
          >
            Export CSV
          </Button>
          <Button
            size="small" variant="contained" startIcon={<PictureAsPdf />}
            onClick={handleExportPDF}
            disabled={violations.length === 0}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, background: 'linear-gradient(135deg,#1C4D8D,#4988C4)' }}
          >
            Export PDF
          </Button>
          <Button
            size="small" variant="contained" startIcon={<Add />}
            onClick={() => setAddDialog(true)}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, background: 'linear-gradient(135deg,#7c3aed,#9f5ff1)' }}
          >
            Add Violation
          </Button>
        </Box>
      </Box>

      {/* Table */}
      <TableContainer component={Paper} elevation={0} sx={{ border: '2px solid #BDE8F5', borderRadius: 3, overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#F0F8FB' }}>
              {['Date', 'Section', 'Type', 'Confidence', 'Status', 'Actions'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 800, color: '#0F2854', fontSize: '12px', py: 1.5 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {violations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: '#94a3b8' }}>No violations recorded.</TableCell>
              </TableRow>
            ) : (
              violations.map((v) => (
                <TableRow key={v.id} hover sx={{ '&:hover': { backgroundColor: '#F0F8FB' } }}>
                  <TableCell sx={{ fontSize: '13px' }}>{v.date}</TableCell>
                  <TableCell sx={{ fontSize: '13px' }}>{v.section}</TableCell>
                  <TableCell>
                    <Chip label={v.type} size="small" sx={{ fontSize: '11px', fontWeight: 600, backgroundColor: '#FEE2E2', color: '#DC2626' }} />
                  </TableCell>
                  <TableCell sx={{ fontSize: '13px' }}>{v.confidence}%</TableCell>
                  <TableCell>
                    <Chip label={v.status} size="small" color={getStatusColor(v.status)} sx={{ fontWeight: 600 }} />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="View">
                        <IconButton size="small" onClick={() => { setSelected(v); setViewDialog(true); }} sx={{ color: '#1C4D8D' }}>
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => { setEditForm({ ...v }); setEditDialog(true); }} sx={{ color: '#7c3aed' }}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => onDelete(v.id)} sx={{ color: '#EF4444' }}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* View Dialog */}
      <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg,#1C4D8D,#4988C4)', color: '#fff' }}>
          <Typography fontWeight={800}>Violation Details</Typography>
          <IconButton onClick={() => setViewDialog(false)} sx={{ color: '#fff' }}><Close /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {selected && (
            <Grid container spacing={2}>
              {[
                ['Date', selected.date],
                ['Section', selected.section],
                ['Violation Type', selected.type],
                ['Confidence', `${selected.confidence}%`],
                ['Status', selected.status],
              ].map(([label, value]) => (
                <Grid item xs={6} key={label}><DetailItem label={label} value={value} /></Grid>
              ))}
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setViewDialog(false)} variant="contained" sx={{ borderRadius: 2, textTransform: 'none', background: 'linear-gradient(135deg,#1C4D8D,#4988C4)' }}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography fontWeight={800} color="#0F2854">Edit Violation</Typography>
          <IconButton onClick={() => setEditDialog(false)} sx={{ color: '#64748b' }}><Close /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {editForm && (
            <Grid container spacing={2} sx={{ mt: 0 }}>

              <Grid item xs={12} sm={6}>
                <FormField label="Section">
                  <TextField fullWidth size="small" sx={inputSx} value={editForm.section} onChange={(e) => setEditForm({ ...editForm, section: e.target.value })} />
                </FormField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormField label="Violation Type">
                  <FormControl fullWidth size="small" sx={inputSx}>
                    <Select value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}>
                      {violationTypes.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                    </Select>
                  </FormControl>
                </FormField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormField label="Status">
                  <FormControl fullWidth size="small" sx={inputSx}>
                    <Select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                      {statusOptions.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                    </Select>
                  </FormControl>
                </FormField>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setEditDialog(false)} variant="outlined" sx={{ borderRadius: 2, textTransform: 'none' }}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained" sx={{ borderRadius: 2, textTransform: 'none', background: 'linear-gradient(135deg,#1C4D8D,#4988C4)' }}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Add Dialog */}
      <Dialog open={addDialog} onClose={() => setAddDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography fontWeight={800} color="#0F2854">Add New Violation</Typography>
          <IconButton onClick={() => setAddDialog(false)} sx={{ color: '#64748b' }}><Close /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12} sm={6}>
              <FormField label="Date">
                <TextField fullWidth size="small" type="date" sx={inputSx} value={newV.date} onChange={(e) => setNewV({ ...newV, date: e.target.value })} />
              </FormField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormField label="Section">
                <TextField fullWidth size="small" sx={inputSx} placeholder="Zone / Section" value={newV.section} onChange={(e) => setNewV({ ...newV, section: e.target.value })} />
              </FormField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormField label="Violation Type">
                <FormControl fullWidth size="small" sx={inputSx}>
                  <Select value={newV.type} displayEmpty onChange={(e) => setNewV({ ...newV, type: e.target.value })}>
                    <MenuItem value="" disabled>Select type</MenuItem>
                    {violationTypes.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                  </Select>
                </FormControl>
              </FormField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormField label="Status">
                <FormControl fullWidth size="small" sx={inputSx}>
                  <Select value={newV.status} onChange={(e) => setNewV({ ...newV, status: e.target.value })}>
                    {statusOptions.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </Select>
                </FormControl>
              </FormField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormField label="Confidence (%)">
                <TextField fullWidth size="small" type="number" sx={inputSx} value={newV.confidence} onChange={(e) => setNewV({ ...newV, confidence: Number(e.target.value) })} inputProps={{ min: 0, max: 100 }} />
              </FormField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setAddDialog(false)} variant="outlined" sx={{ borderRadius: 2, textTransform: 'none' }}>Cancel</Button>
          <Button onClick={handleAddNew} variant="contained" disabled={!newV.type} sx={{ borderRadius: 2, textTransform: 'none', background: 'linear-gradient(135deg,#1C4D8D,#4988C4)' }}>Add</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ViolationsTable;
