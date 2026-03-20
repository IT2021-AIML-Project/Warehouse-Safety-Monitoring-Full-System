import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  Divider,
  Tooltip,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import CloudUpload from '@mui/icons-material/CloudUpload';
import { runInference } from '../../services/api';

const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5000';

const UploadImage = ({ onInferenceComplete, zoneId, ppeItems = [] }) => {
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [lastInference, setLastInference] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [annotatedImage, setAnnotatedImage] = useState(null);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setLastInference(null);
    setShowSuccess(false);
    setErrorMsg('');
    setAnnotatedImage(null);
  };

  const handleRunInference = async () => {
    if (!file) return;
    setLoading(true);
    setShowSuccess(false);
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('source_type', 'image');
      if (zoneId) formData.append('zone_id', zoneId);
      // Always send PPE items so backend knows which classes to filter
      const ppeNames = ppeItems.map(item => item.name);
      formData.append('ppe_items', JSON.stringify(ppeNames));

      const response = await runInference(formData);
      const result = response.data;

      if (result.success) {
        const inference = result.inference;

        // Build frontend-compatible inference object
        const mappedInference = {
          inference_id: inference.inference_id,
          zone_id: inference.zone_id || zoneId,
          timestamp: inference.timestamp,
          processing_time_ms: inference.processing_time_ms,
          model_version: inference.model_version,
          total_persons: inference.total_persons,
          total_violations: inference.total_violations,
          snapshot_url: inference.snapshot_url,
          annotated_url: inference.annotated_url,
          detections: (inference.detections || []).map(d => ({
            detection_id: d.detection_id,
            object_class: d.object_class,
            confidence: d.confidence,
            is_violation: ['no-helmet', 'no-vest'].includes(d.object_class?.toLowerCase()),
            bbox_x1: d.bbox_x1,
            bbox_y1: d.bbox_y1,
            bbox_x2: d.bbox_x2,
            bbox_y2: d.bbox_y2,
          })),
          violations: inference.violations || [],
        };

        setLastInference(mappedInference);
        onInferenceComplete?.(mappedInference);
        setShowSuccess(true);

        // Show annotated image if available
        if (inference.annotated_url) {
          setAnnotatedImage(`${API_BASE}${inference.annotated_url}`);
        }
      } else {
        setErrorMsg(result.message || 'Inference failed');
      }
    } catch (err) {
      console.error('Inference error:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to run inference';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const steps = ['Upload Image', 'Click Run Analysis', 'View Safety Report'];

  return (
    <Card elevation={3} sx={{ borderRadius: '16px' }}>
      <CardContent sx={{ p: 4 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Run a Safety Check
        </Typography>

        <Stepper activeStep={preview ? (lastInference ? 2 : 1) : 0} sx={{ pt: 2, pb: 3 }}>
          <Step>
            <StepLabel>Step 1: Upload Image</StepLabel>
          </Step>
          <Step>
            <StepLabel>Step 2: Click Run Analysis</StepLabel>
          </Step>
          <Step>
            <StepLabel>Step 3: View Safety Report</StepLabel>
          </Step>
        </Stepper>

        <Divider sx={{ my: 2 }} />

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Upload a warehouse image to check safety compliance using the YOLO AI model.
        </Typography>

        <Box sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            component="label"
            startIcon={<CloudUpload />}
            sx={{ mb: 1 }}
          >
            Choose Image
            <input type="file" accept="image/*" hidden onChange={handleFileChange} />
          </Button>
        </Box>

        {preview && (
          <Box
            sx={{
              mt: 2,
              position: 'relative',
              display: 'inline-block',
              maxWidth: '100%',
            }}
          >
            <img
              src={annotatedImage || preview}
              alt="Preview"
              style={{ maxWidth: '100%', maxHeight: 420, borderRadius: 8, display: 'block', verticalAlign: 'top' }}
            />
          </Box>
        )}

        <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Tooltip title="The AI will analyze the image for safety equipment (helmets, vests) and flag any issues.">
            <span>
              <Button
                variant="contained"
                onClick={handleRunInference}
                disabled={!preview || loading}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
              >
                {loading ? 'Running Analysis…' : 'Run Analysis'}
              </Button>
            </span>
          </Tooltip>
          {loading && (
            <Typography variant="body2" color="text.secondary">
              Sending image to AI model for analysis…
            </Typography>
          )}
        </Box>

        {errorMsg && (
          <Alert severity="error" sx={{ mt: 3 }}>
            {errorMsg}
          </Alert>
        )}

        {showSuccess && lastInference && (
          <Alert severity="success" sx={{ mt: 3 }}>
            Safety check complete — {lastInference.detections?.length || 0} objects detected,{' '}
            {lastInference.total_violations || 0} violation(s) found.
            {lastInference.processing_time_ms && (
              <> Processed in {lastInference.processing_time_ms}ms.</>
            )}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default UploadImage;
