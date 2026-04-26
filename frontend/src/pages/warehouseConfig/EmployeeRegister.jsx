import React, { useState } from 'react';
import { Snackbar, Alert } from '@mui/material';
import emailjs from '@emailjs/browser';
import {
  PersonAdd,
  Visibility,
  VisibilityOff,
  BadgeOutlined,
  PersonOutlined,
  EmailOutlined,
  LockOutlined,
} from '@mui/icons-material';
import '../../styles/formStyles.css';
import { registerEmployee } from '../../services/api';

const EmployeeRegister = () => {
  const [form, setForm] = useState({
    employeeId: '',
    name: '',
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const validate = () => {
    const newErrors = {};
    if (!form.employeeId.trim()) newErrors.employeeId = 'Employee ID is required';
    if (!form.name.trim()) newErrors.name = 'Full name is required';
    if (!form.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Enter a valid email address';
    }
    if (!form.password) {
      newErrors.password = 'Password is required';
    } else if (form.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
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
      await registerEmployee({
        employeeId: form.employeeId,
        name: form.name,
        email: form.email,
        password: form.password,
      });

      // Send welcome email with login credentials via EmailJS
      try {
        await emailjs.send(
          'service_qb5plfc',      // TODO: Replace with your EmailJS Service ID
          'template_ojsg1wn',     // TODO: Replace with your EmailJS Template ID
          {
            name: form.name,
            employeeId: form.employeeId,
            email: form.email,
            password: form.password,
          },
          'VKHkQqmX2pODopYgG'       // TODO: Replace with your EmailJS Public Key
        );
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
      }

      setSnackbar({ open: true, message: `Employee "${form.name}" registered and welcome email sent successfully! 🎉`, severity: 'success' });
      setForm({ employeeId: '', name: '', email: '', password: '' });
      setErrors({});
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to register employee';
      setSnackbar({ open: true, message: msg, severity: 'error' });
    }
  };

  const handleReset = () => {
    setForm({ employeeId: '', name: '', email: '', password: '' });
    setErrors({});
  };

  return (
    <div className="form-page">
      {/* Page header */}
      <div className="form-page-header">
        <p className="form-page-subtitle">Register a new employee into the warehouse system.</p>
      </div>

      <div className="form-card">
        {/* Section header */}
        <div className="form-section-header">
          <PersonAdd sx={{ color: '#3b82f6', fontSize: 20 }} />
          <p className="form-section-title">Employee Information</p>
        </div>
        <hr className="form-section-divider" />

        <form onSubmit={handleSubmit}>

          {/* Row 1: Employee ID + Full Name */}
          <div className="form-grid" style={{ marginBottom: 22 }}>
            <div className="form-field">
              <label className="form-label">
                <span className="label-icon"><BadgeOutlined sx={{ fontSize: 16 }} /></span>
                Employee ID <span className="required-star">*</span>
              </label>
              <input
                className={`form-input${errors.employeeId ? ' error' : ''}`}
                placeholder="e.g. EMP-0012"
                value={form.employeeId}
                onChange={set('employeeId')}
              />
              <p className={`form-helper${errors.employeeId ? ' error-text' : ''}`}>
                {errors.employeeId || 'Unique employee identifier'}
              </p>
            </div>

            <div className="form-field">
              <label className="form-label">
                <span className="label-icon"><PersonOutlined sx={{ fontSize: 16 }} /></span>
                Full Name <span className="required-star">*</span>
              </label>
              <input
                className={`form-input${errors.name ? ' error' : ''}`}
                placeholder="e.g. John Doe"
                value={form.name}
                onChange={set('name')}
              />
              <p className={`form-helper${errors.name ? ' error-text' : ''}`}>
                {errors.name || 'First and last name'}
              </p>
            </div>
          </div>

          {/* Row 2: Email (full width) */}
          <div className="form-field" style={{ marginBottom: 22 }}>
            <label className="form-label">
              <span className="label-icon"><EmailOutlined sx={{ fontSize: 16 }} /></span>
              Employee Email <span className="required-star">*</span>
            </label>
            <input
              type="email"
              className={`form-input${errors.email ? ' error' : ''}`}
              placeholder="john.doe@warehouse.com"
              value={form.email}
              onChange={set('email')}
            />
            <p className={`form-helper${errors.email ? ' error-text' : ''}`}>
              {errors.email || 'Work email address'}
            </p>
          </div>

          {/* Row 3: Password (full width) */}
          <div className="form-field" style={{ marginBottom: 8 }}>
            <label className="form-label">
              <span className="label-icon"><LockOutlined sx={{ fontSize: 16 }} /></span>
              Password <span className="required-star">*</span>
            </label>
            <div className="form-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                className={`form-input${errors.password ? ' error' : ''}`}
                placeholder="Minimum 6 characters"
                value={form.password}
                onChange={set('password')}
              />
              <button
                type="button"
                className="form-input-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword
                  ? <VisibilityOff sx={{ fontSize: 20 }} />
                  : <Visibility sx={{ fontSize: 20 }} />}
              </button>
            </div>
            <p className={`form-helper${errors.password ? ' error-text' : ''}`}>
              {errors.password || 'Minimum 6 characters'}
            </p>
          </div>

          {/* Actions */}
          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={handleReset}>
              ↩ Reset
            </button>
            <button type="submit" className="btn btn-primary">
              <PersonAdd sx={{ fontSize: 18 }} />
              Register Employee
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

export default EmployeeRegister;
