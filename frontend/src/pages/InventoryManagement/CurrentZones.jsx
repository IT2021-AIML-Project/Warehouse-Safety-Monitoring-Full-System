import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
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
  Alert,
  Avatar,
  Checkbox,
  CircularProgress,
} from '@mui/material';
import {
  Search,
  Inventory,
  Edit,
  Delete,
  WarningAmber,
  Close,
  ChevronRight,
  ArrowBack,
  PersonAdd,
  Person,
  Construction,
  Hiking,
  Checkroom,
  Warehouse,
  LocalShipping,
  Inventory2,
  Lock,
} from '@mui/icons-material';
import {
  getPopulatedZones,
  getAllEmployees,
  updatePPEItem,
  deletePPEItem,
  bulkAssignEmployees,
  removeAssignmentByZoneEmployee,
} from '../../services/api';

const statusColorMap = {
  'In Stock': { bg: '#dcfce7', color: '#16a34a' },
  'Low Stock': { bg: '#fef9c3', color: '#a16207' },
  'Out of Stock': { bg: '#fee2e2', color: '#dc2626' },
};

const avatarColor = (name) => {
  const colors = ['#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b', '#10b981', '#ec4899'];
  return colors[name.charCodeAt(0) % colors.length];
};

// ══════════════════════════════════════════════════════════════
// Zone Detail View
// ══════════════════════════════════════════════════════════════
const ZoneDetail = ({ zone, onBack, onRefresh, allEmployees, allZones }) => {
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editQty, setEditQty] = useState('');
  const [editError, setEditError] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [addEmpOpen, setAddEmpOpen] = useState(false);
  const [empSearch, setEmpSearch] = useState('');
  const [selected, setSelected] = useState([]);
  const [removeEmpOpen, setRemoveEmpOpen] = useState(false);
  const [removeEmpTarget, setRemoveEmpTarget] = useState(null);
  const [assignError, setAssignError] = useState('');

  // ── Edit PPE quantity ──
  const openEdit = (item) => { setEditTarget(item); setEditQty(String(item.quantity)); setEditError(''); setEditOpen(true); };
  const closeEdit = () => { setEditOpen(false); setEditTarget(null); setEditError(''); };
  const handleEditSave = async () => {
    const qty = parseInt(editQty, 10);
    if (isNaN(qty) || qty < 0) { setEditError('Enter a valid quantity (0 or more).'); return; }
    // Prevent reducing below assigned employee count
    const empCount = zone.employees.length;
    if (qty < empCount) {
      setEditError(`Cannot reduce quantity below ${empCount}. There are ${empCount} employee(s) currently assigned to this zone.`);
      return;
    }
    try {
      await updatePPEItem(editTarget._id, { quantity: qty });
      closeEdit();
      onRefresh();
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update');
    }
  };

  // ── Delete PPE item ──
  const openDelete = (item) => { setDeleteTarget(item); setDeleteOpen(true); };
  const closeDelete = () => { setDeleteOpen(false); setDeleteTarget(null); };
  const handleDeleteConfirm = async () => {
    try {
      await deletePPEItem(deleteTarget._id);
      closeDelete();
      onRefresh();
    } catch (err) {
      console.error('Delete item error:', err);
    }
  };

  // ── Add employees ──
  // Build a map of employee ID → zone name for employees assigned to OTHER zones
  const assignedElsewhere = {};
  (allZones || []).forEach((z) => {
    if (z._id !== zone._id) {
      z.employees.forEach((emp) => {
        assignedElsewhere[emp._id] = z.name;
      });
    }
  });

  const availableToAdd = allEmployees.filter((emp) => !zone.employees.some((e) => e._id === emp._id));
  const filteredEmps = availableToAdd.filter((emp) =>
    emp.name.toLowerCase().includes(empSearch.toLowerCase()) ||
    emp.employeeId.toLowerCase().includes(empSearch.toLowerCase())
  );
  // PPE capacity: max employees = minimum PPE item quantity in this zone
  const minPPEQty = zone.items.length > 0
    ? Math.min(...zone.items.map((item) => item.quantity))
    : 0;
  const currentEmpCount = zone.employees.length;
  const availableSlots = Math.max(0, minPPEQty - currentEmpCount);
  const capacityFull = availableSlots <= 0;

  const toggleSelect = (emp) =>
    setSelected((prev) => {
      const alreadySelected = prev.some((e) => e._id === emp._id);
      if (alreadySelected) return prev.filter((e) => e._id !== emp._id);
      // Prevent selecting more than available slots
      if (prev.length >= availableSlots) {
        setAssignError(`Cannot select more employees. Only ${availableSlots} slot(s) available based on PPE capacity (min PPE qty: ${minPPEQty}).`);
        return prev;
      }
      setAssignError('');
      return [...prev, emp];
    });

  const handleAddEmployees = async () => {
    try {
      await bulkAssignEmployees({
        zone: zone._id,
        employees: selected.map((e) => e._id),
      });
      setSelected([]);
      setEmpSearch('');
      setAssignError('');
      setAddEmpOpen(false);
      onRefresh();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to assign employees';
      setAssignError(msg);
    }
  };

  // ── Remove employee ──
  const openRemoveEmp = (emp) => { setRemoveEmpTarget(emp); setRemoveEmpOpen(true); };
  const closeRemoveEmp = () => { setRemoveEmpOpen(false); setRemoveEmpTarget(null); };
  const handleRemoveEmp = async () => {
    try {
      await removeAssignmentByZoneEmployee(zone._id, removeEmpTarget._id);
      closeRemoveEmp();
      onRefresh();
    } catch (err) {
      console.error('Remove employee error:', err);
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      {/* Back + title */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <IconButton onClick={onBack} size="small" sx={{ color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          <ArrowBack fontSize="small" />
        </IconButton>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b', lineHeight: 1.2 }}>{zone.name}</Typography>
          <Typography variant="body2" sx={{ color: '#94a3b8', fontFamily: 'monospace' }}>{zone.zoneId}</Typography>
        </Box>
        <Chip label={zone.status} sx={{ ml: 1, fontWeight: 600, fontSize: '12px', backgroundColor: zone.status === 'Active' ? '#dcfce7' : '#fee2e2', color: zone.status === 'Active' ? '#16a34a' : '#dc2626', border: 'none' }} />
      </Box>

      {/* PPE Items Section */}
      <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '14px', mb: 3, overflow: 'hidden' }}>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Inventory sx={{ color: '#3b82f6', fontSize: 20 }} />
          <Typography sx={{ fontWeight: 700, color: '#1e293b', flex: 1 }}>PPE Items</Typography>
          <Chip label={`${zone.items.length} item type${zone.items.length !== 1 ? 's' : ''}`} sx={{ fontSize: '12px', fontWeight: 600, backgroundColor: '#dbeafe', color: '#1d4ed8', border: 'none' }} />
        </Box>

        {zone.items.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center', color: '#94a3b8' }}>
            <Inventory sx={{ fontSize: 44, mb: 1, opacity: 0.3 }} />
            <Typography variant="body2">No PPE items in this zone.</Typography>
          </Box>
        ) : (
          <Box sx={{ p: 3, display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
            {zone.items.map((item) => {
              const isHead = item.category.toLowerCase().includes('head');
              const isFoot = item.category.toLowerCase().includes('foot');
              const isBody = item.category.toLowerCase().includes('body');
              const ct = isHead ? { bg: '#dbeafe', iconColor: '#1d4ed8' } : isFoot ? { bg: '#fef9c3', iconColor: '#a16207' } : isBody ? { bg: '#dcfce7', iconColor: '#16a34a' } : { bg: '#f1f5f9', iconColor: '#64748b' };
              const categoryEmoji = isHead ? '🪖' : isFoot ? '🥾' : isBody ? '🦺' : '📦';
              return (
                <Paper key={item._id} elevation={0} sx={{ border: '1.5px solid #e2e8f0', borderRadius: '16px', p: 2.5, width: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 0.8, transition: 'all 0.15s', '&:hover': { borderColor: ct.iconColor, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', transform: 'translateY(-2px)' } }}>
                  <Box sx={{ width: 58, height: 58, borderRadius: '14px', backgroundColor: ct.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 0.5, fontSize: 28 }}>{categoryEmoji}</Box>
                  <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: '15px', lineHeight: 1.3 }}>{item.name}</Typography>
                  <Typography sx={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '11px' }}>{item.id}</Typography>
                  <Typography sx={{ color: '#64748b', fontSize: '12px' }}>{item.category}</Typography>
                  <Box sx={{ display: 'flex', gap: 0.6, flexWrap: 'wrap', justifyContent: 'center', mt: 0.5 }}>
                    <Chip label={`Qty: ${item.quantity}`} sx={{ fontSize: '11px', fontWeight: 600, backgroundColor: '#f1f5f9', color: '#334155', border: 'none', height: 24 }} />
                    <Chip label={item.status} sx={{ fontSize: '11px', fontWeight: 600, border: 'none', height: 24, backgroundColor: statusColorMap[item.status]?.bg, color: statusColorMap[item.status]?.color }} />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.8, mt: 0.5 }}>
                    <Tooltip title="Edit Quantity"><IconButton size="small" sx={{ color: '#3b82f6', border: '1px solid #dbeafe', borderRadius: '8px', p: '5px' }} onClick={() => openEdit(item)}><Edit sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                    <Tooltip title="Remove Item"><IconButton size="small" sx={{ color: '#ef4444', border: '1px solid #fee2e2', borderRadius: '8px', p: '5px' }} onClick={() => openDelete(item)}><Delete sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                  </Box>
                </Paper>
              );
            })}
          </Box>
        )}
      </Paper>

      {/* Employees Section */}
      <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Person sx={{ color: '#8b5cf6', fontSize: 20 }} />
          <Typography sx={{ fontWeight: 700, color: '#1e293b', flex: 1 }}>Assigned Employees</Typography>
          <Chip label={`${zone.employees.length} employee${zone.employees.length !== 1 ? 's' : ''}`} sx={{ fontSize: '12px', fontWeight: 600, backgroundColor: '#f3e8ff', color: '#7c3aed', border: 'none', mr: 1 }} />
          <Button variant="contained" startIcon={<PersonAdd />} size="small"
            onClick={() => { setSelected([]); setEmpSearch(''); setAddEmpOpen(true); }}
            sx={{ borderRadius: '8px', textTransform: 'none', fontSize: '13px', fontWeight: 600, backgroundColor: '#7c3aed', '&:hover': { backgroundColor: '#6d28d9' } }}>
            Add Employee
          </Button>
        </Box>
        {zone.employees.length === 0 ? (
          <Box sx={{ py: 5, textAlign: 'center', color: '#94a3b8' }}>
            <Person sx={{ fontSize: 40, mb: 1, opacity: 0.4 }} />
            <Typography variant="body2">No employees assigned to this zone yet.</Typography>
          </Box>
        ) : (
          <Box sx={{ p: 2, display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            {zone.employees.map((emp) => (
              <Box key={emp._id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, border: '1px solid #e2e8f0', borderRadius: '10px', px: 2, py: 1.2, backgroundColor: '#fafafa', minWidth: 200 }}>
                <Avatar sx={{ width: 34, height: 34, fontSize: '14px', fontWeight: 700, backgroundColor: avatarColor(emp.name) }}>{emp.name.charAt(0)}</Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontWeight: 600, color: '#1e293b', fontSize: '14px' }}>{emp.name}</Typography>
                  <Typography sx={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '12px' }}>{emp.id}</Typography>
                </Box>
                <Tooltip title="Remove from Zone"><IconButton size="small" sx={{ color: '#ef4444' }} onClick={() => openRemoveEmp(emp)}><Close fontSize="small" /></IconButton></Tooltip>
              </Box>
            ))}
          </Box>
        )}
      </Paper>

      {/* Edit Quantity Dialog */}
      <Dialog open={editOpen} onClose={closeEdit} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '12px', p: 1 } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Edit Quantity</Typography>
          <IconButton onClick={closeEdit} size="small" sx={{ color: '#64748b' }}><Close /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {editError && <Alert severity="error" sx={{ mb: 2 }}>{editError}</Alert>}
          <TextField disabled fullWidth label="Item Name" value={editTarget?.name || ''} variant="outlined" margin="normal" sx={{ mb: 1, '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: '#94a3b8' } }} />
          <TextField disabled fullWidth label="Item ID" value={editTarget?.id || ''} variant="outlined" margin="normal" sx={{ mb: 2, '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: '#94a3b8' } }} />
          <TextField fullWidth label="Quantity" type="number" value={editQty} onChange={(e) => { setEditQty(e.target.value); setEditError(''); }} variant="outlined" margin="normal" inputProps={{ min: 0 }} helperText="Status updates automatically based on quantity" />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={closeEdit} variant="outlined" sx={{ borderRadius: '8px', textTransform: 'none', minWidth: 100 }}>Cancel</Button>
          <Button onClick={handleEditSave} variant="contained" sx={{ borderRadius: '8px', textTransform: 'none', minWidth: 100, backgroundColor: '#1d4ed8', '&:hover': { backgroundColor: '#1e40af' } }}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Item Dialog */}
      <Dialog open={deleteOpen} onClose={closeDelete} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '12px', p: 1 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
          <WarningAmber sx={{ color: '#ef4444', fontSize: 28 }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Remove Item</Typography>
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ borderRadius: '8px', mb: 2 }}>This action cannot be undone.</Alert>
          <Typography variant="body2" sx={{ color: '#475569' }}>Remove <strong>{deleteTarget?.name}</strong> ({deleteTarget?.id}) from this zone?</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={closeDelete} variant="outlined" sx={{ borderRadius: '8px', textTransform: 'none', minWidth: 100 }}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} variant="contained" sx={{ borderRadius: '8px', textTransform: 'none', minWidth: 100, backgroundColor: '#ef4444', '&:hover': { backgroundColor: '#dc2626' } }}>Yes, Remove</Button>
        </DialogActions>
      </Dialog>

      {/* Add Employee Dialog */}
      <Dialog open={addEmpOpen} onClose={() => setAddEmpOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '14px' } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Add Employees</Typography>
            <Typography variant="body2" sx={{ color: '#64748b' }}>Select employees to assign to <strong>{zone.name}</strong></Typography>
          </Box>
          <IconButton onClick={() => { setAddEmpOpen(false); setAssignError(''); }} size="small" sx={{ color: '#64748b' }}><Close /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ pt: 2 }}>
          {/* Capacity info banner */}
          <Alert severity={capacityFull ? 'error' : 'info'} sx={{ mb: 2, borderRadius: '8px' }}>
            {zone.items.length === 0
              ? 'No PPE items in this zone. Please add PPE items before assigning employees.'
              : capacityFull
                ? `Zone is at full capacity (${currentEmpCount}/${minPPEQty} employees based on minimum PPE quantity).`
                : `Capacity: ${currentEmpCount}/${minPPEQty} employees assigned. ${availableSlots} slot(s) available.`
            }
          </Alert>
          {assignError && <Alert severity="error" sx={{ mb: 2, borderRadius: '8px' }}>{assignError}</Alert>}
          <TextField fullWidth size="small" placeholder="Search by name or ID..." value={empSearch} onChange={(e) => setEmpSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18, color: '#94a3b8' }} /></InputAdornment> }}
            sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '14px' } }} />
          {filteredEmps.length === 0 ? (
            <Box sx={{ py: 3, textAlign: 'center', color: '#94a3b8' }}>
              <Typography variant="body2">{availableToAdd.length === 0 ? 'All registered employees are already assigned to this zone.' : 'No employees match your search.'}</Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {filteredEmps.map((emp) => {
                const isSelected = selected.some((e) => e._id === emp._id);
                const frozenZone = assignedElsewhere[emp._id];
                const isFrozen = !!frozenZone;
                return (
                  <Box key={emp._id} onClick={() => !isFrozen && toggleSelect(emp)}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 1.5,
                      border: `1.5px solid ${isFrozen ? '#e2e8f0' : isSelected ? '#7c3aed' : '#e2e8f0'}`,
                      borderRadius: '10px', px: 2, py: 1.5,
                      cursor: isFrozen ? 'not-allowed' : 'pointer',
                      backgroundColor: isFrozen ? '#f8fafc' : isSelected ? '#faf5ff' : '#fff',
                      opacity: isFrozen ? 0.6 : 1,
                      transition: 'all 0.15s',
                      '&:hover': isFrozen ? {} : { borderColor: '#7c3aed', backgroundColor: '#faf5ff' },
                    }}>
                    <Avatar sx={{ width: 36, height: 36, fontSize: '14px', fontWeight: 700, backgroundColor: isFrozen ? '#94a3b8' : avatarColor(emp.name) }}>{emp.name.charAt(0)}</Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography sx={{ fontWeight: 600, color: isFrozen ? '#94a3b8' : '#1e293b', fontSize: '14px' }}>{emp.name}</Typography>
                        {isFrozen && <Lock sx={{ fontSize: 14, color: '#94a3b8' }} />}
                      </Box>
                      <Typography sx={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '12px' }}>{emp.employeeId}</Typography>
                      {isFrozen && (
                        <Typography sx={{ color: '#ef4444', fontSize: '11px', fontWeight: 600, mt: 0.3 }}>
                          Already assigned to "{frozenZone}"
                        </Typography>
                      )}
                    </Box>
                    {isFrozen ? (
                      <Lock sx={{ fontSize: 20, color: '#cbd5e1' }} />
                    ) : (
                      <Checkbox checked={isSelected} onChange={() => toggleSelect(emp)} onClick={(e) => e.stopPropagation()} sx={{ color: '#cbd5e1', '&.Mui-checked': { color: '#7c3aed' } }} />
                    )}
                  </Box>
                );
              })}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          {selected.length > 0 && <Typography variant="body2" sx={{ color: '#7c3aed', fontWeight: 600, flex: 1 }}>{selected.length} employee{selected.length !== 1 ? 's' : ''} selected</Typography>}
          <Button onClick={() => setAddEmpOpen(false)} variant="outlined" sx={{ borderRadius: '8px', textTransform: 'none', minWidth: 100 }}>Cancel</Button>
          <Button onClick={handleAddEmployees} variant="contained" disabled={selected.length === 0} sx={{ borderRadius: '8px', textTransform: 'none', minWidth: 120, backgroundColor: '#7c3aed', '&:hover': { backgroundColor: '#6d28d9' } }}>Add Selected</Button>
        </DialogActions>
      </Dialog>

      {/* Remove Employee Dialog */}
      <Dialog open={removeEmpOpen} onClose={closeRemoveEmp} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '12px', p: 1 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
          <WarningAmber sx={{ color: '#ef4444', fontSize: 28 }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Remove Employee</Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#475569' }}>Remove <strong>{removeEmpTarget?.name}</strong> from this zone?</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={closeRemoveEmp} variant="outlined" sx={{ borderRadius: '8px', textTransform: 'none', minWidth: 100 }}>Cancel</Button>
          <Button onClick={handleRemoveEmp} variant="contained" sx={{ borderRadius: '8px', textTransform: 'none', minWidth: 100, backgroundColor: '#ef4444', '&:hover': { backgroundColor: '#dc2626' } }}>Yes, Remove</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// ══════════════════════════════════════════════════════════════
// Zone card colour palette
// ══════════════════════════════════════════════════════════════
const zoneThemes = [
  { bg: '#eff6ff', iconBg: '#dbeafe', iconColor: '#1d4ed8' },
  { bg: '#fefce8', iconBg: '#fef9c3', iconColor: '#a16207' },
  { bg: '#fff1f2', iconBg: '#fee2e2', iconColor: '#dc2626' },
  { bg: '#f0fdf4', iconBg: '#dcfce7', iconColor: '#16a34a' },
];

// ══════════════════════════════════════════════════════════════
// Zone List View
// ══════════════════════════════════════════════════════════════
const CurrentZones = () => {
  const [zones, setZones] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [zonesRes, empsRes] = await Promise.all([
        getPopulatedZones(),
        getAllEmployees(),
      ]);
      setZones(zonesRes.data.zones);
      setEmployees(empsRes.data.employees);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = async () => {
    await loadData();
    // keep selected zone in sync
    if (selectedZone) {
      const res = await getPopulatedZones();
      const updated = res.data.zones.find(z => z._id === selectedZone._id);
      if (updated) setSelectedZone(updated);
      else setSelectedZone(null);
    }
  };

  if (selectedZone) {
    const liveZone = zones.find((z) => z._id === selectedZone._id) || selectedZone;
    return (
      <ZoneDetail
        zone={liveZone}
        onBack={() => setSelectedZone(null)}
        onRefresh={handleRefresh}
        allEmployees={employees}
        allZones={zones}
      />
    );
  }

  const filteredZones = zones.filter((z) =>
    z.name.toLowerCase().includes(search.toLowerCase()) ||
    z.zoneId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>Click a zone to view its PPE inventory and assigned employees.</Typography>
      </Box>
      <Box sx={{ mb: 3 }}>
        <TextField size="small" placeholder="Search zones..." value={search} onChange={(e) => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18, color: '#94a3b8' }} /></InputAdornment> }}
          sx={{ width: 300, '& .MuiOutlinedInput-root': { borderRadius: '8px', fontSize: '14px' } }} />
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3 }}>
          {filteredZones.map((zone, idx) => {
            const theme = zoneThemes[idx % zoneThemes.length];
            const name = zone.name.toLowerCase();
            const ZoneIcon =
              name.includes('storage') || name.includes('block') ? Warehouse :
                name.includes('loading') || name.includes('dock') ? LocalShipping :
                  name.includes('pack') ? Inventory2 :
                    name.includes('restricted') || name.includes('area') ? Lock :
                      Inventory;
            return (
              <Paper
                key={zone._id}
                elevation={0}
                onClick={() => setSelectedZone(zone)}
                sx={{
                  border: '1.5px solid #e2e8f0', borderRadius: '20px', p: 4, cursor: 'pointer',
                  textAlign: 'center', transition: 'all 0.18s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5,
                  '&:hover': { borderColor: theme.iconColor, backgroundColor: theme.bg, boxShadow: '0 6px 24px rgba(0,0,0,0.10)', transform: 'translateY(-3px)' },
                }}
              >
                <Box sx={{ width: 72, height: 72, borderRadius: '18px', backgroundColor: theme.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                  <ZoneIcon sx={{ fontSize: 36, color: theme.iconColor }} />
                </Box>
                <Typography sx={{ fontWeight: 700, color: '#1e293b', fontSize: '17px', lineHeight: 1.3 }}>{zone.name}</Typography>
                <Typography sx={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '13px' }}>{zone.zoneId}</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center', mt: 0.5 }}>
                  <Chip label={`${zone.items.length} item${zone.items.length !== 1 ? 's' : ''}`} sx={{ fontSize: '12px', fontWeight: 600, backgroundColor: '#dbeafe', color: '#1d4ed8', border: 'none' }} />
                  <Chip label={`${zone.employees.length} emp${zone.employees.length !== 1 ? 's' : ''}`} sx={{ fontSize: '12px', fontWeight: 600, backgroundColor: '#f3e8ff', color: '#7c3aed', border: 'none' }} />
                  <Chip label={zone.status} sx={{ fontSize: '12px', fontWeight: 600, backgroundColor: zone.status === 'Active' ? '#dcfce7' : '#fee2e2', color: zone.status === 'Active' ? '#16a34a' : '#dc2626', border: 'none' }} />
                </Box>
              </Paper>
            );
          })}

          {filteredZones.length === 0 && (
            <Box sx={{ gridColumn: '1 / -1', py: 6, textAlign: 'center', color: '#94a3b8' }}>
              <Inventory sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
              <Typography variant="body2">No zones found.</Typography>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default CurrentZones;