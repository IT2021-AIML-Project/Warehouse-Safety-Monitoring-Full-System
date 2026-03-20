import React, { useState, useEffect } from 'react';
import { Snackbar, Alert } from '@mui/material';
import {
  AddCircleOutline,
  ShieldOutlined,
  CategoryOutlined,
  TagOutlined,
  Inventory2Outlined,
  LocationOnOutlined,
} from '@mui/icons-material';
import '../../styles/formStyles.css';
import { getAllZones, createPPEItem } from '../../services/api';

const ppeCategories = [
  { value: 'Head Protection', label: 'Head', desc: 'Helmets & hard hats', emoji: '🪖', bg: '#dbeafe' },
  { value: 'Foot Protection', label: 'Foot', desc: 'Boots & toe guards', emoji: '🥾', bg: '#fef9c3' },
  { value: 'Body Protection', label: 'Body', desc: 'Vests & jackets', emoji: '🦺', bg: '#dcfce7' },
];

const ppeItems = [
  { name: 'Safety Helmet', emoji: '⛑️', bg: '#dbeafe', defaultCategory: 'Head Protection' },
  { name: 'Safety Vest', emoji: '🦺', bg: '#dcfce7', defaultCategory: 'Body Protection' },
  { name: 'Safety Boots', emoji: '🥾', bg: '#fef9c3', defaultCategory: 'Foot Protection' },
  { name: 'Safety Gloves', emoji: '🧤', bg: '#f3e8ff', defaultCategory: 'Body Protection' },
  { name: 'Safety Goggles', emoji: '🥽', bg: '#e0f2fe', defaultCategory: 'Head Protection' },
  { name: 'Face Shield', emoji: '🛡️', bg: '#fee2e2', defaultCategory: 'Head Protection' },
];

const AddPPEItem = () => {
  const [form, setForm] = useState({
    itemId: '',
    itemName: '',
    categories: '',
    quantity: '',
    zone: '',
  });

  const [errors, setErrors] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [zones, setZones] = useState([]);

  useEffect(() => {
    const fetchZones = async () => {
      try {
        const res = await getAllZones();
        setZones(res.data.zones.filter(z => z.status === 'Active'));
      } catch (err) {
        console.error('Failed to fetch zones:', err);
      }
    };
    fetchZones();
  }, []);

  const validate = () => {
    const newErrors = {};
    if (!form.itemId.trim()) newErrors.itemId = 'Item ID is required';
    if (!form.itemName) newErrors.itemName = 'Please select a PPE item';
    if (!form.categories) newErrors.categories = 'Please select a category';
    if (!form.quantity) newErrors.quantity = 'Quantity is required';
    else if (isNaN(form.quantity) || Number(form.quantity) < 0)
      newErrors.quantity = 'Enter a valid quantity (0 or more)';
    if (!form.zone) newErrors.zone = 'Please select a zone';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const set = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
    setErrors({ ...errors, [field]: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await createPPEItem({
        itemId: form.itemId,
        itemName: form.itemName,
        categories: [form.categories],
        quantity: form.quantity,
        zone: form.zone,
      });
      setSnackbar({ open: true, message: `"${form.itemName}" added successfully!`, severity: 'success' });
      setForm({ itemId: '', itemName: '', categories: '', quantity: '', zone: '' });
      setErrors({});
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to add PPE item';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    }
  };

  const handleReset = () => {
    setForm({ itemId: '', itemName: '', categories: '', quantity: '', zone: '' });
    setErrors({});
  };

  return (
    <div className="form-page">
      <div className="form-page-header">
        <p className="form-page-subtitle">Register a new Personal Protective Equipment item into the system.</p>
      </div>

      <div className="form-card">
        <div className="form-section-header">
          <ShieldOutlined style={{ color: '#3b82f6', fontSize: 20 }} />
          <p className="form-section-title">PPE Item Information</p>
        </div>
        <hr className="form-section-divider" />

        <form onSubmit={handleSubmit}>

          {/* Row 1: Item ID + Quantity */}
          <div className="form-grid" style={{ marginBottom: 22 }}>
            <div className="form-field">
              <label className="form-label">
                <span className="label-icon"><TagOutlined style={{ fontSize: 16 }} /></span>
                Item ID <span className="required-star">*</span>
              </label>
              <input
                className={`form-input${errors.itemId ? ' error' : ''}`}
                placeholder="e.g. PPE-001"
                value={form.itemId}
                onChange={set('itemId')}
              />
              <p className={`form-helper${errors.itemId ? ' error-text' : ''}`}>
                {errors.itemId || 'Unique identifier for the PPE item'}
              </p>
            </div>

            <div className="form-field">
              <label className="form-label">
                <span className="label-icon"><ShieldOutlined style={{ fontSize: 16 }} /></span>
                Quantity <span className="required-star">*</span>
              </label>
              <input
                type="number"
                min="0"
                className={`form-input${errors.quantity ? ' error' : ''}`}
                placeholder="e.g. 50"
                value={form.quantity}
                onChange={set('quantity')}
              />
              <p className={`form-helper${errors.quantity ? ' error-text' : ''}`}>
                {errors.quantity || 'Number of units available'}
              </p>
            </div>
          </div>

          {/* Item Name — visual card selector */}
          <div className="form-field" style={{ marginBottom: 22 }}>
            <label className="form-label">
              <span className="label-icon"><Inventory2Outlined style={{ fontSize: 16 }} /></span>
              Item Name <span className="required-star">*</span>
            </label>
            <div style={{ display: 'flex', overflowX: 'auto', gap: '16px', paddingBottom: '12px', overflowY: 'hidden', justifyContent: 'center' }}>
              {ppeItems.map((item) => (
                <div
                  key={item.name}
                  className={`type-card${form.itemName === item.name ? ' selected' : ''}`}
                  onClick={() => {
                    setForm({ ...form, itemName: item.name, categories: item.defaultCategory });
                    setErrors({ ...errors, itemName: '', categories: '' });
                  }}
                  style={{ flex: '0 0 auto', width: '140px', margin: 0 }}
                >
                  <div className="type-card-icon" style={{ backgroundColor: item.bg, fontSize: 34, width: 64, height: 64, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {item.emoji}
                  </div>
                  <p className="type-card-name">{item.name}</p>
                </div>
              ))}
            </div>
            {errors.itemName && <p className="form-helper error-text">{errors.itemName}</p>}
          </div>

          {/* Category cards — single select */}
          <div className="form-field" style={{ marginBottom: 22 }}>
            <label className="form-label">
              <span className="label-icon"><CategoryOutlined style={{ fontSize: 16 }} /></span>
              Select Category <span className="required-star">*</span>
            </label>
            <div className="card-select-grid cols-2" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {ppeCategories.map((cat) => (
                <div
                  key={cat.value}
                  className={`type-card${form.categories === cat.value ? ' selected' : ''}`}
                  onClick={() => {
                    setForm({ ...form, categories: cat.value });
                    setErrors({ ...errors, categories: '' });
                  }}
                >
                  <div className="type-card-icon" style={{ backgroundColor: cat.bg, fontSize: 30 }}>
                    {cat.emoji}
                  </div>
                  <p className="type-card-name">{cat.label}</p>
                  <p className="type-card-desc">{cat.desc}</p>
                </div>
              ))}
            </div>
            {errors.categories && <p className="form-helper error-text">{errors.categories}</p>}
          </div>

          {/* Zone */}
          <div className="form-field" style={{ marginBottom: 22 }}>
            <label className="form-label">
              <span className="label-icon"><LocationOnOutlined style={{ fontSize: 16 }} /></span>
              Assign to Zone <span className="required-star">*</span>
            </label>
            <select
              className={`form-select${errors.zone ? ' error' : ''}`}
              value={form.zone}
              onChange={(e) => { setForm({ ...form, zone: e.target.value }); setErrors({ ...errors, zone: '' }); }}
            >
              <option value="" disabled>Select a zone...</option>
              {zones.map((z) => (
                <option key={z._id} value={z._id}>{z.zoneId} — {z.name}</option>
              ))}
            </select>
            <p className={`form-helper${errors.zone ? ' error-text' : ''}`}>
              {errors.zone || 'Warehouse zone to store this item'}
            </p>
          </div>

          {/* Actions */}
          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={handleReset}>
              ↩ Reset
            </button>
            <button type="submit" className="btn btn-primary">
              <AddCircleOutline style={{ fontSize: 18 }} />
              Add PPE Item
            </button>
          </div>
        </form>
      </div>

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

export default AddPPEItem;
