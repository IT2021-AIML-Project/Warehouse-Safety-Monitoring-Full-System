import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Button, Card, CardContent, Typography, Chip,
  TextField, FormGroup, FormControlLabel, Checkbox,
  Alert, CircularProgress, Grid, Divider,
} from '@mui/material';
import {
  FiberManualRecord, Stop, PlayArrow, Videocam, Router,
} from '@mui/icons-material';

const AI_BASE = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:5001';

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

export default function LiveStreamPanel({ type, ppeItems }) {
  const isWebcam = type === 'webcam';
  const startEndpoint = isWebcam ? '/webcam/start' : '/cctv/start';
  const stopEndpoint  = isWebcam ? '/webcam/stop'  : '/cctv/stop';
  const feedEndpoint  = isWebcam ? '/webcam/feed'  : '/cctv/feed';
  const logsEndpoint  = isWebcam ? '/webcam/logs'  : '/cctv/logs';

  const [active, setActive]       = useState(false);
  const [streamUrl, setStreamUrl] = useState(null);
  const [cctvUrl, setCctvUrl]     = useState('');
  const [logs, setLogs]           = useState([]);
  const [error, setError]         = useState('');
  const [starting, setStarting]   = useState(false);
  const [modelInfo, setModelInfo] = useState(null);
  const [modelInfoErr, setModelInfoErr] = useState('');

  const logsRef    = useRef(null);
  const pollRef    = useRef(null);
  const imgRef     = useRef(null);

  // Read-only model info (current AI model path + classes)
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

  // Keep stream running across page navigation; stop only on explicit user action.
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Poll detection logs while active
  useEffect(() => {
    if (!active) return;
    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`${AI_BASE}${logsEndpoint}`);
        const data = await res.json();
        setLogs(data.logs || []);
        if (!data.active) {
          setActive(false);
          setStreamUrl(null);
        }
      } catch (_) {}
    }, 2000);
    return () => clearInterval(pollRef.current);
  }, [active, logsEndpoint]);

  // Scroll logs to top when new entries arrive
  useEffect(() => {
    if (logsRef.current) logsRef.current.scrollTop = 0;
  }, [logs]);

  const toggleClass = (cls) => {
    // Class filtering is now handled by zones
  };

  const callStop = async () => {
    try {
      await fetch(`${AI_BASE}${stopEndpoint}`, { method: 'POST' });
    } catch (_) {}
  };

  const handleStart = async () => {
    setError('');
    setStarting(true);
    try {
      const body = {};
      if (!isWebcam) {
        if (!cctvUrl.trim()) { setError('Please enter a camera URL.'); setStarting(false); return; }
        body.url = cctvUrl.trim();
      }
      const res  = await fetch(`${AI_BASE}${startEndpoint}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to start stream'); setStarting(false); return; }

      // Small delay so capture thread can open the camera before we try to stream
      await new Promise(r => setTimeout(r, 1200));
      setActive(true);
      setLogs([]);
      setStreamUrl(`${AI_BASE}${feedEndpoint}?t=${Date.now()}`);
    } catch (err) {
      setError(`Connection error: ${err.message}. Is the AI service running on port 5001?`);
    } finally {
      setStarting(false);
    }
  };

  const handleStop = async () => {
    await callStop();
    setActive(false);
    setStreamUrl(null);
    setLogs([]);
  };

  return (
    <Box>
      {/* ── Controls ─────────────────────────────────────────── */}
      <Card elevation={0} sx={{ borderRadius: '12px', border: '1px solid #e2e8f0', mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
            Monitoring Settings
          </Typography>

          {/* CCTV URL input */}
          {!isWebcam && (
            <TextField
              fullWidth
              size="small"
              label="Camera URL"
              placeholder="http://192.168.x.x:8080/video  or  rtsp://user:pass@ip:554/stream"
              value={cctvUrl}
              onChange={e => setCctvUrl(e.target.value)}
              disabled={active}
              sx={{ mb: 2 }}
              helperText="Use a valid RTSP or HTTP camera stream URL."
            />
          )}

          {/* Model info */}
          <Typography variant="body2" fontWeight={700} sx={{ mb: 1 }}>
            Model Status
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            {modelInfoErr ? 'Model service unavailable.' : (modelInfo ? 'AI model loaded and ready.' : 'Loading model status...')}
          </Typography>

          {/* Start / Stop */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={starting ? <CircularProgress size={16} color="inherit" /> : <PlayArrow />}
              onClick={handleStart}
              disabled={active || starting}
              sx={{ borderRadius: '8px', textTransform: 'none' }}
            >
              {starting ? 'Starting…' : 'Start Monitoring'}
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<Stop />}
              onClick={handleStop}
              disabled={!active}
              sx={{ borderRadius: '8px', textTransform: 'none' }}
            >
              Stop
            </Button>
            <Chip
              icon={active ? <FiberManualRecord sx={{ fontSize: '12px !important' }} /> : undefined}
              label={active ? 'Live' : 'Offline'}
              color={active ? 'success' : 'default'}
              size="small"
              sx={{ fontWeight: 600 }}
            />
          </Box>

          {error && <Alert severity="error" sx={{ mt: 2, borderRadius: '8px' }}>{error}</Alert>}
        </CardContent>
      </Card>

      {/* ── Live Stream ───────────────────────────────────────── */}
      {active && streamUrl && (
        <Card
          elevation={0}
          sx={{
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            mb: 3,
            overflow: 'hidden',
            maxWidth: 1120,
            width: '100%',
            mx: 'auto',
          }}
        >
          <Box sx={{ p: 2, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 1 }}>
            {isWebcam ? <Videocam sx={{ color: '#1976D2', fontSize: 18 }} /> : <Router sx={{ color: '#1976D2', fontSize: 18 }} />}
            <Typography variant="subtitle2" fontWeight={700}>
              {isWebcam ? 'Live Webcam Feed' : 'Live CCTV Feed'}
            </Typography>
            <Chip label="LIVE" size="small" color="error"
              icon={<FiberManualRecord sx={{ fontSize: '10px !important', animation: 'blink 1.2s infinite' }} />}
              sx={{ ml: 'auto', fontWeight: 700, fontSize: '10px' }}
            />
          </Box>
          <Box
            sx={{
              backgroundColor: '#0f172a',
              display: 'flex',
              justifyContent: 'center',
              p: 2,
              px: { xs: 2, md: 4 },
              // Keep a stable area so MJPEG frames don't cause layout jitter.
              height: 480,
            }}
          >
            <img
              ref={imgRef}
              src={streamUrl}
              alt="Live AI detection feed"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                borderRadius: 6,
                display: 'block',
              }}
              onError={() => setError('Stream connection lost. The AI service may have closed the feed.')}
            />
          </Box>
        </Card>
      )}

      {/* Waiting for stream */}
      {active && !streamUrl && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress size={32} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Connecting to camera…
          </Typography>
        </Box>
      )}

      {/* ── Detection Logs ────────────────────────────────────── */}
      {active && (
        <Card elevation={0} sx={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <Box sx={{ p: 2, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="subtitle2" fontWeight={700}>
              Real-time Detection Log
            </Typography>
            <Chip label={`${logs.length} entries`} size="small" sx={{ fontSize: '11px' }} />
          </Box>
          <Box
            ref={logsRef}
            sx={{ maxHeight: 280, overflowY: 'auto', p: 0 }}
          >
            {logs.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                <Typography variant="body2" color="text.secondary" component="span">
                  Waiting for detections…
                </Typography>
              </Box>
            ) : (
              logs.map((log, i) => (
                <Box
                  key={log.id || i}
                  sx={{
                    px: 2, py: 1.25,
                    borderBottom: i < logs.length - 1 ? '1px solid #f1f5f9' : 'none',
                    backgroundColor: log.category === 'violation' ? '#fef2f2' : 'transparent',
                    transition: 'background-color 0.2s',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <Chip
                      label={log.timestamp}
                      size="small"
                      sx={{ fontSize: '10px', height: 18, flexShrink: 0, mt: 0.25 }}
                    />
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: '12px',
                        color: log.category === 'violation' ? '#dc2626' : '#1e293b',
                        fontWeight: log.category === 'violation' ? 600 : 400,
                        lineHeight: 1.5,
                      }}
                    >
                      {log.message}
                    </Typography>
                  </Box>
                </Box>
              ))
            )}
          </Box>
        </Card>
      )}
    </Box>
  );
}
