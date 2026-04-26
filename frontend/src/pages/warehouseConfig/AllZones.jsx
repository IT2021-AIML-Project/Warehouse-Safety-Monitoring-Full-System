import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Chip,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  MenuItem,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Search, ViewList, Edit, Delete, WarningAmber, Close, Lock } from '@mui/icons-material';
import { getAllZones as fetchZones, updateZone, deleteZone, getAllPPEItems, getPopulatedZones } from '../../services/api';

const typeColorMap = {
  Storage: { bg: '#dbeafe', color: '#1d4ed8' },
  Loading: { bg: '#fef9c3', color: '#a16207' },
  Restricted: { bg: '#fee2e2', color: '#dc2626' },
  Packing: { bg: '#dcfce7', color: '#16a34a' },
};

const zoneTypes = ['Storage', 'Loading', 'Restricted', 'Packing'];
const zoneStatuses = ['Active', 'Inactive'];

/* ── Colored icon box matching the screenshot style ────────────────── */
const ZoneIcon = ({ type }) => {
  const c = typeColorMap[type] || { bg: '#f1f5f9', color: '#64748b' };

  const paths = {
    Storage: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
    Loading: 'M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zm-.5 1.5 1.96 2.5H17V9.5h2.5zM6 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm13.5-1c0 .55-.45 1-1 1s-1-.45-1-1 .45-1 1-1 1 .45 1 1z',
    Restricted: 'M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4 5 2.18V11c0 3.5-2.33 6.79-5 7.93-2.67-1.14-5-4.43-5-7.93V7.18L12 5z',
    Packing: 'M18 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C8.96 2.54 8.05 2 7 2 5.34 2 4 3.34 4 5c0 .35.07.69.18 1H2v13h2v3h16v-3h2V6h-4zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM7 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z',
  };

  return (
    <Box sx={{
      width: 68, height: 68, borderRadius: '16px',
      backgroundColor: c.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: c.color, mb: 1.5, flexShrink: 0,
    }}>
      <svg viewBox="0 0 24 24" fill="currentColor" width="34" height="34">
        <path d={paths[type] || paths.Storage} />
      </svg>
    </Box>
  );
};

/* ══════════════════════════════════════════════════════════════════════ */

const AllZones = () => {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ _id: '', zoneId: '', name: '', type: '', status: '' });
  const [editErrors, setEditErrors] = useState({});
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [zoneToDelete, setZoneToDelete] = useState(null);
  const [lockedZoneIds, setLockedZoneIds] = useState(new Set());

  // Fetch zones + determine which are locked
  const loadZones = async () => {
    try {
      setLoading(true);
      const [zonesRes, ppeRes, assignRes] = await Promise.all([
        fetchZones(),
        getAllPPEItems(),
        getPopulatedZones(),
      ]);
      setZones(zonesRes.data.zones);

      // Build set of zone IDs that have PPE items or employee assignments
      const locked = new Set();
      (ppeRes.data.ppeItems || []).forEach(item => {
        if (item.zone) locked.add(typeof item.zone === 'object' ? item.zone._id : item.zone);
      });
      (assignRes.data.zones || []).forEach(z => {
        if (z.employees && z.employees.length > 0) locked.add(z._id);
      });
      setLockedZoneIds(locked);
    } catch (error) {
      console.error('Failed to fetch zones:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadZones();
  }, []);

  const filtered = zones.filter(z =>
    z.name.toLowerCase().includes(search.toLowerCase()) ||
    z.zoneId.toLowerCase().includes(search.toLowerCase()) ||
    z.type.toLowerCase().includes(search.toLowerCase())
  );

  /* ── Edit ─────────────────────────────────────────────────────────── */
  const openEdit = (zone) => {
    setEditForm({ _id: zone._id, zoneId: zone.zoneId, name: zone.name, type: zone.type, status: zone.status });
    setEditErrors({});
    setEditOpen(true);
  };
  const closeEdit = () => { setEditOpen(false); setEditErrors({}); };

  const handleEditChange = (field) => (e) => {
    setEditForm(prev => ({ ...prev, [field]: e.target.value }));
    setEditErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validateEdit = () => {
    const errs = {};
    if (!editForm.name.trim()) errs.name = 'Zone Name is required';
    if (!editForm.type) errs.type = 'Zone Type is required';
    if (!editForm.status) errs.status = 'Zone Status is required';
    setEditErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleEditSave = async () => {
    if (!validateEdit()) return;
    try {
      await updateZone(editForm._id, {
        name: editForm.name,
        type: editForm.type,
        status: editForm.status,
      });
      closeEdit();
      loadZones();
    } catch (error) {
      console.error('Failed to update zone:', error);
    }
  };

  /* ── Delete ───────────────────────────────────────────────────────── */
  const openDelete = (zone) => { setZoneToDelete(zone); setDeleteOpen(true); };
  const closeDelete = () => { setDeleteOpen(false); setZoneToDelete(null); };

  const handleConfirmDelete = async () => {
    try {
      await deleteZone(zoneToDelete._id);
      closeDelete();
      loadZones();
    } catch (error) {
      console.error('Failed to delete zone:', error);
    }
  };

  /* ── Render ───────────────────────────────────────────────────────── */
  return (
    <Box sx={{ p: 3 }}>

      {/* ── Toolbar ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <ViewList sx={{ color: '#3b82f6', fontSize: 22 }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1e293b', flex: 1 }}>
          Zone List
        </Typography>
        <TextField
          size="small"
          placeholder="Search by name, ID or type…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ fontSize: 18, color: '#94a3b8' }} />
              </InputAdornment>
            ),
          }}
          sx={{ width: 280, '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '14px' } }}
        />
      </Box>

      {/* ── Loading ── */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : filtered.length === 0 ? (
        <Typography sx={{ color: '#94a3b8', textAlign: 'center', py: 8 }}>No zones found.</Typography>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, width: '100%' }}>
          {filtered.map((zone) => {
            const c = typeColorMap[zone.type] || { bg: '#f1f5f9', color: '#64748b' };
            const isLocked = lockedZoneIds.has(zone._id);
            return (
              <Paper
                key={zone._id}
                elevation={0}
                sx={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'box-shadow 0.2s, transform 0.2s',
                  '&:hover': { boxShadow: '0 6px 24px rgba(0,0,0,0.08)', transform: 'translateY(-2px)' },
                }}
              >
                {/* ── Card Top: icon + name + id ── */}
                <Box sx={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  pt: 3, pb: 2, px: 2, backgroundColor: '#fff',
                }}>
                  <ZoneIcon type={zone.type} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b', textAlign: 'center', lineHeight: 1.3 }}>
                    {zone.name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#94a3b8', letterSpacing: 1, mt: 0.4, fontFamily: 'monospace' }}>
                    {zone.zoneId}
                  </Typography>
                </Box>

                {/* ── Divider ── */}
                <Box sx={{ height: '1px', backgroundColor: '#e2e8f0' }} />

                {/* ── Card Bottom: details table ── */}
                <TableContainer sx={{ backgroundColor: '#f8fafc' }}>
                  <Table size="small">
                    <TableBody>

                      {/* Type */}
                      <TableRow sx={{ '& td': { borderBottom: '1px solid #e2e8f0', py: 0.9, px: 2 } }}>
                        <TableCell sx={{ color: '#64748b', fontSize: '12px', fontWeight: 600, width: '38%' }}>Type</TableCell>
                        <TableCell>
                          <Chip label={zone.type} size="small"
                            sx={{ fontWeight: 600, fontSize: '11px', height: 20, border: 'none', backgroundColor: c.bg, color: c.color }} />
                        </TableCell>
                      </TableRow>

                      {/* Status */}
                      <TableRow sx={{ '& td': { borderBottom: '1px solid #e2e8f0', py: 0.9, px: 2 } }}>
                        <TableCell sx={{ color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Status</TableCell>
                        <TableCell>
                          <Chip label={zone.status} size="small"
                            sx={{
                              fontWeight: 600, fontSize: '11px', height: 20, border: 'none',
                              backgroundColor: zone.status === 'Active' ? '#dcfce7' : '#fee2e2',
                              color: zone.status === 'Active' ? '#16a34a' : '#dc2626',
                            }} />
                        </TableCell>
                      </TableRow>

                      {/* Created */}
                      <TableRow sx={{ '& td': { borderBottom: '1px solid #e2e8f0', py: 0.9, px: 2 } }}>
                        <TableCell sx={{ color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Created</TableCell>
                        <TableCell sx={{ color: '#475569', fontSize: '12px' }}>
                          {new Date(zone.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>

                      {/* Actions */}
                      <TableRow sx={{ '& td': { py: 0.9, px: 2, border: 0 } }}>
                        <TableCell sx={{ color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Actions</TableCell>
                        <TableCell>
                          {isLocked ? (
                            <Tooltip title="Cannot edit or delete — PPE items or employees are assigned to this zone">
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Lock sx={{ fontSize: 14, color: '#94a3b8' }} />
                                <Typography sx={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Locked</Typography>
                              </Box>
                            </Tooltip>
                          ) : (
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <Tooltip title="Edit">
                                <IconButton size="small" onClick={() => openEdit(zone)}
                                  sx={{ color: '#3b82f6', backgroundColor: '#eff6ff', borderRadius: '6px', p: '4px', '&:hover': { backgroundColor: '#dbeafe' } }}>
                                  <Edit sx={{ fontSize: 14 }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton size="small" onClick={() => openDelete(zone)}
                                  sx={{ color: '#ef4444', backgroundColor: '#fff1f2', borderRadius: '6px', p: '4px', '&:hover': { backgroundColor: '#fee2e2' } }}>
                                  <Delete sx={{ fontSize: 14 }} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          )}
                        </TableCell>
                      </TableRow>

                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            );
          })}
        </Box>
      )}

      {/* ════════════ Edit Dialog ════════════ */}
      <Dialog open={editOpen} onClose={closeEdit} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '12px', p: 1 } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Edit Zone</Typography>
          <IconButton onClick={closeEdit} size="small" sx={{ color: '#64748b' }}><Close /></IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 2 }}>
          <TextField fullWidth label="Zone ID" value={editForm.zoneId} disabled variant="outlined" margin="normal"
            helperText="Zone ID cannot be changed" sx={{ mb: 1 }} />
          <TextField fullWidth label="Zone Name" value={editForm.name} onChange={handleEditChange('name')}
            error={!!editErrors.name} helperText={editErrors.name || ''} variant="outlined" margin="normal" sx={{ mb: 1 }} />
          <TextField select fullWidth label="Zone Type" value={editForm.type} onChange={handleEditChange('type')}
            error={!!editErrors.type} helperText={editErrors.type || ''} variant="outlined" margin="normal" sx={{ mb: 1 }}>
            {zoneTypes.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </TextField>
          <TextField select fullWidth label="Zone Status" value={editForm.status} onChange={handleEditChange('status')}
            error={!!editErrors.status} helperText={editErrors.status || ''} variant="outlined" margin="normal">
            {zoneStatuses.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </TextField>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={closeEdit} variant="outlined" sx={{ borderRadius: '8px', textTransform: 'none', minWidth: 100 }}>Cancel</Button>
          <Button onClick={handleEditSave} variant="contained"
            sx={{ borderRadius: '8px', textTransform: 'none', minWidth: 100, backgroundColor: '#1d4ed8', '&:hover': { backgroundColor: '#1e40af' } }}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* ════════════ Delete Dialog ════════════ */}
      <Dialog open={deleteOpen} onClose={closeDelete} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '12px', p: 1 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
          <WarningAmber sx={{ color: '#ef4444', fontSize: 28 }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Delete Zone</Typography>
        </DialogTitle>

        <DialogContent>
          <Alert severity="error" sx={{ borderRadius: '8px', mb: 2 }}>This action cannot be undone.</Alert>
          <Typography variant="body2" sx={{ color: '#475569' }}>
            Are you sure you want to delete <strong>{zoneToDelete?.name}</strong> ({zoneToDelete?.zoneId})?
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={closeDelete} variant="outlined" sx={{ borderRadius: '8px', textTransform: 'none', minWidth: 100 }}>Cancel</Button>
          <Button onClick={handleConfirmDelete} variant="contained"
            sx={{ borderRadius: '8px', textTransform: 'none', minWidth: 100, backgroundColor: '#ef4444', '&:hover': { backgroundColor: '#dc2626' } }}>
            Yes, Delete
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default AllZones;
