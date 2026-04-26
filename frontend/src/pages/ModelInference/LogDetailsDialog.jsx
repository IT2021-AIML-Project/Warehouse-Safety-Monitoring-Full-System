import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Box,
  Alert,
  Tooltip,
  Divider,
} from '@mui/material';

const LogDetailsDialog = ({ open, onClose, inference }) => {
  if (!inference) return null;

  const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5000';

  const violations = inference.violations || [];
  const detections = inference.detections || [];
  const hasViolations = violations.length > 0 ||
    detections.some((d) => ['no-helmet', 'no-vest'].includes(d.object_class?.toLowerCase()));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Safety Scan Report</DialogTitle>
      <DialogContent>
        {(inference.snapshot_url || inference.annotated_url) && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Saved Images
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                {inference.snapshot_url ? (
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                      Snapshot
                    </Typography>
                    <img
                      src={`${API_BASE}${inference.snapshot_url}`}
                      alt="Snapshot"
                      style={{
                        width: '100%',
                        maxHeight: 240,
                        objectFit: 'cover',
                        borderRadius: 8,
                        display: 'block',
                      }}
                    />
                  </Box>
                ) : (
                  <Typography variant="caption" color="text.secondary">No snapshot saved.</Typography>
                )}
              </Grid>
              <Grid item xs={12} md={6}>
                {inference.annotated_url ? (
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                      Annotated Output
                    </Typography>
                    <img
                      src={`${API_BASE}${inference.annotated_url}`}
                      alt="Annotated"
                      style={{
                        width: '100%',
                        maxHeight: 240,
                        objectFit: 'cover',
                        borderRadius: 8,
                        display: 'block',
                      }}
                    />
                  </Box>
                ) : (
                  <Typography variant="caption" color="text.secondary">No annotated image saved.</Typography>
                )}
              </Grid>
            </Grid>
          </Box>
        )}

        {hasViolations ? (
          <Alert severity="error" sx={{ mb: 3 }}>
            <strong>Safety issues detected</strong> — Immediate attention recommended.
          </Alert>
        ) : (
          <Alert severity="success" sx={{ mb: 3 }}>
            All workers appear compliant.
          </Alert>
        )}

        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>Scan ID:</strong> {inference.inference_id}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Date & time:</strong> {new Date(inference.timestamp).toLocaleString()}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Processing time:</strong> {inference.processing_time_ms || 0}ms &nbsp;|&nbsp;
            <strong>Model:</strong> {inference.model_version || 'yolo26n'} &nbsp;|&nbsp;
            <strong>Persons:</strong> {inference.total_persons ?? 0} &nbsp;|&nbsp;
            <strong>Violations:</strong> {inference.total_violations ?? violations.length}
          </Typography>
        </Box>

        {/* Detections Table */}
        <Typography variant="subtitle2" sx={{ mb: 1 }}>Detections ({detections.length})</Typography>
        <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Detection ID</TableCell>
                <TableCell>Object Class</TableCell>
                <TableCell>
                  <Tooltip title="Higher percentage means stronger confidence in the detection.">
                    <span>Confidence</span>
                  </Tooltip>
                </TableCell>
                <TableCell>Bounding Box</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {detections.map((d) => {
                const isViolation = d.is_violation ||
                  ['no-helmet', 'no-vest'].includes(d.object_class?.toLowerCase());
                return (
                  <TableRow key={d.detection_id}>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {d.detection_id?.slice(0, 8)}...
                    </TableCell>
                    <TableCell>{d.object_class}</TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">{(d.confidence * 100).toFixed(1)}%</Typography>
                        <Typography variant="caption" color="text.secondary">
                          AI certainty level
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>
                      [{d.bbox_x1}, {d.bbox_y1}, {d.bbox_x2}, {d.bbox_y2}]
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={isViolation ? '⚠ Action Required' : '✔ Safe'}
                        size="small"
                        color={isViolation ? 'error' : 'success'}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Violations Table */}
        {violations.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" sx={{ mb: 1, color: '#d32f2f' }}>
              Violations ({violations.length})
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Violation ID</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>Confidence</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {violations.map((v) => (
                    <TableRow key={v.violation_id}>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {v.violation_id?.slice(0, 8)}...
                      </TableCell>
                      <TableCell>{v.violation_type}</TableCell>
                      <TableCell>
                        <Chip
                          label={v.severity}
                          size="small"
                          color={
                            v.severity === 'High' ? 'error' :
                            v.severity === 'Medium' ? 'warning' : 'default'
                          }
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell>{(v.confidence * 100).toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LogDetailsDialog;
