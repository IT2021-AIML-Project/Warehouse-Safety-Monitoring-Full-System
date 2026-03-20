import React, { useState } from 'react';
import { Snackbar, Alert } from '@mui/material';
import {
  Inventory,
  LocalShipping,
  Block,
  AllInbox,
  Tag,
  LabelOutlined,
  CategoryOutlined,
  ToggleOnOutlined,
  AddCircleOutline,
} from '@mui/icons-material';
import '../../styles/formStyles.css';
import { createZone } from '../../services/api';

const zoneTypes = [
  { value: 'Storage', label: 'Storage', desc: 'General storage space', icon: <Inventory sx={{ fontSize: 26, color: '#1d4ed8' }} />, bg: '#dbeafe', color: '#1d4ed8' },
  { value: 'Loading', label: 'Loading', desc: 'Loading & unloading dock', icon: <LocalShipping sx={{ fontSize: 26, color: '#a16207' }} />, bg: '#fef9c3', color: '#a16207' },
  { value: 'Restricted', label: 'Restricted', desc: 'Restricted access area', icon: <Block sx={{ fontSize: 26, color: '#dc2626' }} />, bg: '#fee2e2', color: '#dc2626' },
  { value: 'Packing', label: 'Packing', desc: 'Order packing station', icon: <AllInbox sx={{ fontSize: 26, color: '#16a34a' }} />, bg: '#dcfce7', color: '#16a34a' },
];

const CreateZone = () => {
  const [form, setForm] = useState({
    zoneId: '',
    zoneName: '',
    zoneType: '',
    isActive: true,
  });

  const [errors, setErrors] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const validate = () => {
    const newErrors = {};
    if (!form.zoneId.trim()) newErrors.zoneId = 'Zone ID is required';
    if (!form.zoneName.trim()) newErrors.zoneName = 'Zone Name is required';
    if (!form.zoneType) newErrors.zoneType = 'Please select a Zone Type';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await createZone({
        zoneId: form.zoneId,
        zoneName: form.zoneName,
        zoneType: form.zoneType,
        isActive: form.isActive,
      });
      setSnackbar({ open: true, message: 'Zone created successfully!', severity: 'success' });
      setForm({ zoneId: '', zoneName: '', zoneType: '', isActive: true });
      setErrors({});
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to create zone';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    }
  };

  const handleReset = () => {
    setForm({ zoneId: '', zoneName: '', zoneType: '', isActive: true });
    setErrors({});
  };

  return (
    <div className="form-page">
      {/* Page header */}
      <div className="form-page-header">
        <p className="form-page-subtitle">Fill in the details below to add a new warehouse zone.</p>
      </div>

      <div className="form-card">
        {/* Section header */}
        <div className="form-section-header">
          <AddCircleOutline sx={{ color: '#3b82f6', fontSize: 20 }} />
          <p className="form-section-title">Zone Information</p>
        </div>
        <hr className="form-section-divider" />

        <form onSubmit={handleSubmit}>

          {/* Row 1: Zone ID + Zone Name */}
          <div className="form-grid" style={{ marginBottom: 22 }}>
            <div className="form-field">
              <label className="form-label">
                <span className="label-icon"><Tag sx={{ fontSize: 16 }} /></span>
                Zone ID <span className="required-star">*</span>
              </label>
              <input
                className={`form-input${errors.zoneId ? ' error' : ''}`}
                placeholder="e.g. ZONE-001"
                value={form.zoneId}
                onChange={(e) => { setForm({ ...form, zoneId: e.target.value }); setErrors({ ...errors, zoneId: '' }); }}
              />
              <p className={`form-helper${errors.zoneId ? ' error-text' : ''}`}>
                {errors.zoneId || 'Unique identifier for the zone'}
              </p>
            </div>

            <div className="form-field">
              <label className="form-label">
                <span className="label-icon"><LabelOutlined sx={{ fontSize: 16 }} /></span>
                Zone Name <span className="required-star">*</span>
              </label>
              <input
                className={`form-input${errors.zoneName ? ' error' : ''}`}
                placeholder="e.g. Storage Block A"
                value={form.zoneName}
                onChange={(e) => { setForm({ ...form, zoneName: e.target.value }); setErrors({ ...errors, zoneName: '' }); }}
              />
              <p className={`form-helper${errors.zoneName ? ' error-text' : ''}`}>
                {errors.zoneName || 'Descriptive name for the zone'}
              </p>
            </div>
          </div>

          {/* Zone Type cards */}
          <div className="form-field" style={{ marginBottom: 22 }}>
            <label className="form-label">
              <span className="label-icon"><CategoryOutlined sx={{ fontSize: 16 }} /></span>
              Select Zone Type <span className="required-star">*</span>
            </label>
            <div className="card-select-grid cols-4">
              {zoneTypes.map((t) => (
                <div
                  key={t.value}
                  className={`type-card${form.zoneType === t.value ? ' selected' : ''}`}
                  onClick={() => { setForm({ ...form, zoneType: t.value }); setErrors({ ...errors, zoneType: '' }); }}
                >
                  <div className="type-card-icon" style={{ backgroundColor: t.bg }}>
                    {t.icon}
                  </div>
                  <p className="type-card-name">{t.label}</p>
                  <p className="type-card-desc">{t.desc}</p>
                </div>
              ))}
            </div>
            {errors.zoneType && <p className="form-helper error-text">{errors.zoneType}</p>}
          </div>

          {/* Active checkbox */}
          <div className="form-field" style={{ marginBottom: 8 }}>
            <label className="form-label">
              <span className="label-icon"><ToggleOnOutlined sx={{ fontSize: 16 }} /></span>
              Zone Status
            </label>
            <label
              className="form-checkbox-row"
              style={{ maxWidth: 420 }}
            >
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              <p className="form-checkbox-label">
                <strong>Active</strong> — Make this zone available for operations
              </p>
            </label>
          </div>

          {/* Actions */}
          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={handleReset}>
              ↩ Reset
            </button>
            <button type="submit" className="btn btn-primary">
              <AddCircleOutline sx={{ fontSize: 18 }} />
              Create Zone
            </button>
          </div>
        </form>
      </div>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ borderRadius: '8px' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default CreateZone;
