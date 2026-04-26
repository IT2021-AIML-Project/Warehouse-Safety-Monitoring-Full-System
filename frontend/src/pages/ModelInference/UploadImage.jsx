import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Button, Card, CardContent, Typography, Alert,
  CircularProgress, Divider, Tooltip, Stepper, Step, StepLabel,
  FormGroup, FormControlLabel, Checkbox, Chip, LinearProgress, Grid,
} from '@mui/material';
import CloudUpload from '@mui/icons-material/CloudUpload';
import VideoFile from '@mui/icons-material/VideoFile';
import ImageIcon from '@mui/icons-material/Image';
import { runInference } from '../../services/api';

const API_BASE    = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5000';
const AI_BASE     = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:5001';

const ALL_CLASSES = ['person', 'helmet', 'no-helmet', 'vest', 'no-vest'];
const CLASS_COLORS = {
  person:      '#1976D2',
  helmet:      '#16a34a',
  'no-helmet': '#dc2626',
  vest:        '#16a34a',
  'no-vest':   '#dc2626',
};

function deriveDefaultClasses(ppeItems) {
  const selected = new Set(['person']);
  (ppeItems || []).forEach(item => {
    const name = item.name?.toLowerCase() || '';
    if (name.includes('helmet')) { selected.add('helmet'); selected.add('no-helmet'); }
    if (name.includes('vest'))   { selected.add('vest');   selected.add('no-vest');   }
  });
  return selected;
}

const VIDEO_EXTS = ['mp4', 'avi', 'mov', 'mkv', 'webm'];

const UploadImage = ({ onInferenceComplete, zoneId, ppeItems = [] }) => {
  const [preview, setPreview]             = useState(null);
  const [file, setFile]                   = useState(null);
  const [fileType, setFileType]           = useState(null); // 'image' | 'video'
  const [lastInference, setLastInference] = useState(null);
  const [loading, setLoading]             = useState(false);
  const [showSuccess, setShowSuccess]     = useState(false);
  const [errorMsg, setErrorMsg]           = useState('');
  const [annotatedImage, setAnnotatedImage] = useState(null);
  const [videoStats, setVideoStats]       = useState(null);
  const [processingMsg, setProcessingMsg] = useState('');
  const [videoRunning, setVideoRunning] = useState(false);
  const [videoFps, setVideoFps] = useState(5); // how many frames per second to send for AI detection
  const [modelInfo, setModelInfo] = useState(null);
  const [modelInfoErr, setModelInfoErr] = useState('');

  // Show currently loaded model info (read-only UI)
  useEffect(() => {
    let cancelled = false;
    const loadModelInfo = async () => {
      try {
        const res = await fetch(`${AI_BASE}/model-info`);
        const data = await res.json();
        if (!cancelled && res.ok) setModelInfo(data);
        if (!cancelled && !res.ok) setModelInfoErr(data?.error || 'Failed to load model info');
      } catch (e) {
        if (!cancelled) setModelInfoErr('Model info unavailable');
      }
    };
    loadModelInfo();
    return () => { cancelled = true; };
  }, []);

  const videoRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const offscreenCanvasRef = useRef(null);
  const videoLoopRunningRef = useRef(false);

  const toggleClass = cls => {
    // Class filtering is now handled by zones
  };

  const handleFileChange = e => {
    const f = e.target.files?.[0];
    if (!f) return;
    const ext = f.name.split('.').pop().toLowerCase();
    const isVideo = VIDEO_EXTS.includes(ext);
    setFile(f);
    setFileType(isVideo ? 'video' : 'image');
    setPreview(URL.createObjectURL(f));
    setLastInference(null);
    setShowSuccess(false);
    setErrorMsg('');
    setAnnotatedImage(null);
    setVideoStats(null);
    setVideoRunning(false);
    videoLoopRunningRef.current = false;
  };

  // ── Image inference → Node backend → saves to DB ──────────────────────────
  const handleImageInference = async () => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('source_type', 'image');
    if (zoneId) formData.append('zone_id', zoneId);
    formData.append('ppe_items', JSON.stringify(ppeItems.map(i => i.name)));

    setProcessingMsg('Sending image to AI model…');
    const response = await runInference(formData);
    const result   = response.data;

    if (result.success) {
      const inference = result.inference;
      const mapped = {
        inference_id:       inference.inference_id,
        zone_id:            inference.zone_id || zoneId,
        timestamp:          inference.timestamp,
        processing_time_ms: inference.processing_time_ms,
        model_version:      inference.model_version,
        total_persons:      inference.total_persons,
        total_violations:   inference.total_violations,
        snapshot_url:       inference.snapshot_url,
        annotated_url:      inference.annotated_url,
        detections: (inference.detections || []).map(d => ({
          detection_id: d.detection_id,
          object_class: d.object_class,
          confidence:   d.confidence,
          is_violation: ['no-helmet', 'no-vest'].includes(d.object_class?.toLowerCase()),
          bbox_x1: d.bbox_x1, bbox_y1: d.bbox_y1,
          bbox_x2: d.bbox_x2, bbox_y2: d.bbox_y2,
        })),
        violations: inference.violations || [],
      };
      setLastInference(mapped);
      onInferenceComplete?.(mapped);
      setShowSuccess(true);
      if (inference.annotated_url) {
        setAnnotatedImage(`${API_BASE}${inference.annotated_url}`);
      }
    } else {
      throw new Error(result.message || 'Inference failed');
    }
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // ── Video inference → real-time frame loop + overlay boxes ───────────────
  const handleVideoRealtimeInference = async () => {
    if (!videoRef.current) return;
    if (!file) return;

    setProcessingMsg('Starting live video detection…');

    // Reset runtime
    videoLoopRunningRef.current = true;
    setVideoRunning(true);
    setShowSuccess(false);

    // Wait for metadata so we know dimensions
    const waitForMetadata = () => new Promise(resolve => {
      const v = videoRef.current;
      if (!v) return resolve();
      if (v.readyState >= 2) return resolve();
      const handler = () => {
        v.removeEventListener('loadedmetadata', handler);
        resolve();
      };
      v.addEventListener('loadedmetadata', handler);
    });

    await waitForMetadata();

    const v = videoRef.current;
    const targetW = v.videoWidth || 640;
    const targetH = v.videoHeight || 360;

    if (!offscreenCanvasRef.current) offscreenCanvasRef.current = document.createElement('canvas');
    const off = offscreenCanvasRef.current;
    off.width = targetW;
    off.height = targetH;
    const offCtx = off.getContext('2d');

    if (!overlayCanvasRef.current) return;

    // Force overlay canvas to mount correct size before drawing
    const overlay = overlayCanvasRef.current;

    // Reset playback
    try {
      v.currentTime = 0;
    } catch (_) {}
    try {
      v.muted = true;
      await v.play();
    } catch (_) {}

    let frames = 0;
    let totalDetections = 0;
    let totalViolations = 0;
    let totalCompliant = 0;
    let totalInferMs = 0;
    const t0 = performance.now();

    const intervalMs = 1000 / Math.max(1, videoFps); // throttle for browser + backend load

    while (videoLoopRunningRef.current) {
      if (!videoRef.current) break;
      if (videoRef.current.ended) break;

      const iterStart = performance.now();

      // If frame isn't ready yet, wait a bit.
      if (videoRef.current.readyState < 2) {
        await sleep(50);
        continue;
      }

      // Capture JPEG from current video frame
      offCtx.drawImage(videoRef.current, 0, 0, targetW, targetH);
      const blob = await new Promise(resolve => off.toBlob(resolve, 'image/jpeg', 0.7));
      if (!blob) {
        await sleep(50);
        continue;
      }

      const formData = new FormData();
      formData.append('image', blob, 'frame.jpg');

      const res = await fetch(`${AI_BASE}/predict`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'Live prediction failed');
      }

      // Draw boxes
      const rect = overlay.getBoundingClientRect();
      const dispW = Math.max(1, Math.round(rect.width));
      const dispH = Math.max(1, Math.round(rect.height));
      overlay.width = dispW;
      overlay.height = dispH;

      const sx = dispW / (data.image_size?.width || targetW);
      const sy = dispH / (data.image_size?.height || targetH);

      const ctx = overlay.getContext('2d');
      ctx.clearRect(0, 0, dispW, dispH);

      const dets = data.detections || [];
      dets.forEach(d => {
        const cls = (d.class_name || '').toLowerCase();
        const validClasses = ['person', 'helmet', 'no-helmet', 'vest', 'no-vest'];
        if (!validClasses.includes(cls)) return;
        const color = CLASS_COLORS[cls] || '#94a3b8';
        const [x1, y1, x2, y2] = d.bbox || [0, 0, 0, 0];
        const X1 = x1 * sx;
        const Y1 = y1 * sy;
        const X2 = x2 * sx;
        const Y2 = y2 * sy;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(X1, Y1, X2 - X1, Y2 - Y1);

        const conf = typeof d.confidence === 'number' ? d.confidence : 0;
        const label = `${d.class_name} ${(conf * 100).toFixed(1)}%`;
        ctx.font = '12px Arial';
        const metrics = ctx.measureText(label);
        const bgW = metrics.width + 8;
        ctx.fillStyle = color;
        ctx.fillRect(X1, Math.max(0, Y1 - 16), bgW, 16);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, X1 + 4, Math.max(12, Y1 - 4));
      });

      // Update stats
      frames += 1;
      totalDetections += data.total_detections || 0;
      totalViolations += (data.violations || []).length;
      totalCompliant += (data.compliant || []).length;
      const inferMs = data.inferenceTime?.total_ms ?? data.processing_time_ms ?? 0;
      totalInferMs += inferMs;

      const elapsedSec = (performance.now() - t0) / 1000;
      const fps = elapsedSec > 0 ? frames / elapsedSec : 0;
      setVideoStats({
        frames,
        detections: totalDetections,
        violations: totalViolations,
        compliant: totalCompliant,
        avgMs: frames ? Math.round((totalInferMs / frames) * 100) / 100 : 0,
        fps: Math.round(fps * 10) / 10,
      });

      const iterElapsed = performance.now() - iterStart;
      const delay = Math.max(0, intervalMs - iterElapsed);
      await sleep(delay);
    }

    setVideoRunning(false);
    setShowSuccess(true);
    setProcessingMsg('');
    videoLoopRunningRef.current = false;
  };

  const handleStopVideo = async () => {
    videoLoopRunningRef.current = false;
    setVideoRunning(false);
    try {
      if (videoRef.current) videoRef.current.pause();
    } catch (_) {}
    // Clear overlay
    if (overlayCanvasRef.current) {
      const c = overlayCanvasRef.current.getContext('2d');
      c.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
    }
  };

  const handleRunInference = async () => {
    if (!file) return;
    setLoading(true);
    setShowSuccess(false);
    setErrorMsg('');
    setAnnotatedImage(null);
    setVideoStats(null);
    setVideoRunning(false);
    videoLoopRunningRef.current = false;

    try {
      if (fileType === 'video') {
        await handleVideoRealtimeInference();
      } else {
        await handleImageInference();
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to run inference';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
      setProcessingMsg('');
    }
  };

  const activeStep = preview ? (showSuccess ? 2 : 1) : 0;

  return (
    <Card elevation={3} sx={{ borderRadius: '16px' }}>
      <CardContent sx={{ p: 4 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Run a Safety Check
        </Typography>

        <Stepper activeStep={activeStep} sx={{ pt: 2, pb: 3 }}>
          {['Upload File', 'Click Run Analysis', 'View Safety Report'].map(label => (
            <Step key={label}><StepLabel>{label}</StepLabel></Step>
          ))}
        </Stepper>
        <Divider sx={{ my: 2 }} />

        {/* ── Model Info ────────────────────────────────────────── */}
        <Typography variant="body2" fontWeight={700} sx={{ mb: 1 }}>
          Model Status
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
          {modelInfoErr ? 'Model service unavailable.' : (modelInfo ? 'AI model loaded and ready.' : 'Loading model status...')}
        </Typography>
        <Divider sx={{ my: 2 }} />

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
          Upload an image or video to run PPE compliance analysis.
        </Typography>

        {/* ── File picker ──────────────────────────────────────── */}
        <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.25, flexWrap: 'wrap' }}>
          <Button
            variant={file ? 'contained' : 'outlined'}
            component="label"
            startIcon={file ? (fileType === 'video' ? <VideoFile /> : <ImageIcon />) : <CloudUpload />}
            sx={{ textTransform: 'none', borderRadius: '10px' }}
          >
            {file ? 'Re-upload Image or Video' : 'Choose Image or Video'}
            <input
              type="file"
              accept="image/*,video/mp4,video/avi,video/mov,video/mkv,video/webm"
              hidden
              onChange={handleFileChange}
            />
          </Button>

          {file && (
            <Chip
              label={fileType === 'video' ? 'Video selected' : 'Image selected'}
              size="small"
              icon={fileType === 'video' ? <VideoFile sx={{ fontSize: '14px !important' }} /> : <ImageIcon sx={{ fontSize: '14px !important' }} />}
              sx={{ fontSize: '11px' }}
            />
          )}
        </Box>

        {/* ── Preview ──────────────────────────────────────────── */}
        {preview && fileType === 'image' && (
          <Box sx={{ mt: 2, width: '100%', display: 'flex', justifyContent: 'center' }}>
            <img
              src={annotatedImage || preview}
              alt="Preview"
              style={{ maxWidth: '100%', maxHeight: 420, borderRadius: 10, display: 'block' }}
            />
          </Box>
        )}

        {preview && fileType === 'image' && annotatedImage && (
          <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', mt: 0.75 }}>
            <Chip label="AI annotated" size="small" color="success" sx={{ fontSize: '11px' }} />
          </Box>
        )}

        {preview && fileType === 'image' && !annotatedImage && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
            Uploaded image preview
          </Typography>
        )}

        {/* ── Video view (original + live overlay) ─────────────────── */}
        {preview && fileType === 'video' && (
          <Box sx={{ mt: 2, width: '100%', maxWidth: 900, mx: 'auto' }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block', textAlign: 'center' }}>
              LIVE BOUNDING BOX OVERLAY (frame-by-frame)
            </Typography>
            <Box sx={{ position: 'relative' }}>
              <video
                ref={videoRef}
                src={preview}
                controls
                style={{
                  width: '100%',
                  maxHeight: 420,
                  borderRadius: 8,
                  display: 'block',
                  backgroundColor: '#000',
                }}
              />
              <canvas
                ref={overlayCanvasRef}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                }}
              />
            </Box>

            {/* ── Frame rate control ─────────────────────────────── */}
            <Box sx={{ mt: 2, px: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Frames sent to AI (FPS): <strong>{videoFps}</strong>
              </Typography>
              {/* Slider kept simple to avoid extra dependencies */}
              <input
                type="range"
                min={1}
                max={15}
                step={1}
                value={videoFps}
                disabled={videoRunning || loading}
                onChange={(e) => setVideoFps(parseInt(e.target.value, 10))}
                style={{ width: '100%' }}
              />
            </Box>
          </Box>
        )}

        {/* ── Run button ───────────────────────────────────────── */}
        <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Tooltip title="AI will analyse all selected classes and flag PPE violations.">
            <span>
              <Button
                variant="contained"
                onClick={handleRunInference}
                disabled={!preview || loading || (fileType === 'video' && videoRunning)}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
              >
                {loading ? 'Running Analysis…' : 'Run Analysis'}
              </Button>
            </span>
          </Tooltip>
          {fileType === 'video' && videoRunning && (
            <Button
              variant="outlined"
              color="error"
              onClick={handleStopVideo}
              startIcon={<LinearProgress color="error" />}
              disabled={loading}
              sx={{ borderRadius: '8px', textTransform: 'none' }}
            >
              Stop
            </Button>
          )}
          {loading && (
            <Typography variant="body2" color="text.secondary">{processingMsg}</Typography>
          )}
        </Box>

        {loading && fileType === 'video' && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              Processing video frames… FPS + boxes update live on the overlay.
            </Typography>
          </Box>
        )}

        {errorMsg && (
          <Alert severity="error" sx={{ mt: 3 }}>{errorMsg}</Alert>
        )}

        {/* ── Image success summary ─────────────────────────────── */}
        {showSuccess && lastInference && fileType === 'image' && (
          <Alert severity="success" sx={{ mt: 3 }}>
            Safety check complete — {lastInference.detections?.length || 0} object(s) detected,{' '}
            {lastInference.total_violations || 0} violation(s) found.
            {lastInference.processing_time_ms && (
              <> Processed in {lastInference.processing_time_ms}ms.</>
            )}
          </Alert>
        )}

        {/* ── Video success summary ─────────────────────────────── */}
        {showSuccess && videoStats && fileType === 'video' && (
          <Box sx={{ mt: 3 }}>
            <Alert severity={videoStats.violations > 0 ? 'warning' : 'success'} sx={{ mb: 2 }}>
              Video processed — <strong>{videoStats.frames}</strong> frames analysed.
            </Alert>
            {videoStats.fps != null && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Approx FPS: <strong>{videoStats.fps}</strong>
              </Typography>
            )}
            <Grid container spacing={1.5}>
              <Grid item xs={6} md={3}>
                <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                  <CardContent sx={{ py: 1.5 }}>
                    <Typography variant="h6" fontWeight={700}>{videoStats.frames}</Typography>
                    <Typography variant="caption" color="text.secondary">Frames processed</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} md={3}>
                <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                  <CardContent sx={{ py: 1.5 }}>
                    <Typography variant="h6" fontWeight={700}>{videoStats.detections}</Typography>
                    <Typography variant="caption" color="text.secondary">Total detections</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} md={3}>
                <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                  <CardContent sx={{ py: 1.5 }}>
                    <Typography variant="h6" fontWeight={700} color={videoStats.violations > 0 ? 'error.main' : 'text.primary'}>
                      {videoStats.violations}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Total violations</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} md={3}>
                <Card elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                  <CardContent sx={{ py: 1.5 }}>
                    <Typography variant="h6" fontWeight={700}>{videoStats.avgMs} ms</Typography>
                    <Typography variant="caption" color="text.secondary">Avg inference</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default UploadImage;
