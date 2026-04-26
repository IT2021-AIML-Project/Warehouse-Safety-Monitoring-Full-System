const Inference = require('../models/Inference');
const Detection = require('../models/Detection');
const Violation = require('../models/Violation');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const AI_API_URL = process.env.AI_API_URL || 'http://localhost:5001';

// Run inference on an uploaded image
exports.runInference = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Image file is required'
            });
        }

        const { zone_id, source_type, camera_id } = req.body;


        // Always build allowed classes - Person is always included
        // Only add PPE classes for items actually assigned to this zone
        const classSet = new Set(['person']);
        const { ppe_items } = req.body;
        if (ppe_items) {
            try {
                const ppeNames = JSON.parse(ppe_items);
                for (const name of ppeNames) {
                    const lower = name.toLowerCase();
                    // Canonicalize PPE names so AI class filtering/violation counting works.
                    // Example model may be trained on "Hardhat" but UI expects "helmet/no-helmet".
                    if (lower.includes('helmet') || lower.includes('hardhat') || lower.includes('head')) {
                        classSet.add('helmet');
                        classSet.add('no-helmet');
                    }
                    if (lower.includes('vest') || lower.includes('body') || lower.includes('jacket')) {
                        classSet.add('vest');
                        classSet.add('no-vest');
                    }
                }
            } catch (e) {
                console.error('Failed to parse ppe_items:', e);
            }
        }
        const allowedClasses = classSet;


        // Send image + allowed classes to Flask AI API
        const FormData = require('form-data');
        const formData = new FormData();
        formData.append('image', fs.createReadStream(req.file.path));
        if (allowedClasses) {
            formData.append('allowed_classes', JSON.stringify([...allowedClasses]));
        }

        let aiResponse;
        try {
            aiResponse = await axios.post(`${AI_API_URL}/predict`, formData, {
                headers: {
                    ...formData.getHeaders()
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });
        } catch (aiError) {
            console.error('AI API error:', aiError.message);
            return res.status(503).json({
                success: false,
                message: 'AI inference service is unavailable. Make sure the Flask AI server is running.',
                error: aiError.message
            });
        }

        const aiResult = aiResponse.data;

        // Save snapshot with relative URL
        const snapshotUrl = `/uploads/${req.file.filename}`;

        // Flask already filters, but double-check on backend side too
        let allDetections = aiResult.detections || [];
        const detections = allowedClasses
            ? allDetections.filter(d => allowedClasses.has(d.class_name?.toLowerCase()))
            : allDetections;

        // Count persons and violations from filtered detections
        const totalPersons = detections.filter(d =>
            d.class_name?.toLowerCase() === 'person'
        ).length;

        const violations = detections.filter(d =>
            ['no-helmet', 'no-vest'].includes(d.class_name?.toLowerCase())
        );
        const totalViolations = violations.length;

        // Create Inference record
        const inference = new Inference({
            source_type: source_type || 'image',
            camera_id: camera_id || null,
            zone_id: zone_id || null,
            model_version: aiResult.model_version || 'yolo26n',
            processing_time_ms: aiResult.processing_time_ms || 0,
            snapshot_url: snapshotUrl,
            total_persons: totalPersons,
            total_violations: totalViolations
        });
        await inference.save();

        // Create Detection records
        const detectionDocs = [];
        for (const det of detections) {
            const detection = new Detection({
                inference_id: inference.inference_id,
                object_class: det.class_name,
                confidence: det.confidence,
                bbox_x1: det.bbox?.[0] || 0,
                bbox_y1: det.bbox?.[1] || 0,
                bbox_x2: det.bbox?.[2] || 0,
                bbox_y2: det.bbox?.[3] || 0
            });
            await detection.save();
            detectionDocs.push(detection);
        }

        // Create Violation records for non-compliance detections
        const violationDocs = [];
        for (const det of violations) {
            const violationType = det.class_name?.toLowerCase() === 'no-helmet'
                ? 'Missing Helmet'
                : 'No Vest';

            const severity = det.confidence >= 0.8 ? 'High'
                : det.confidence >= 0.5 ? 'Medium'
                : 'Low';

            const violation = new Violation({
                inference_id: inference.inference_id,
                violation_type: violationType,
                severity: severity,
                confidence: det.confidence
            });
            await violation.save();
            violationDocs.push(violation);
        }

        // Save annotated image if provided
        if (aiResult.annotated_image) {
            const annotatedFilename = `annotated_${req.file.filename}`;
            const annotatedPath = path.join(__dirname, '..', 'uploads', annotatedFilename);
            const imageBuffer = Buffer.from(aiResult.annotated_image, 'base64');
            fs.writeFileSync(annotatedPath, imageBuffer);
            inference.annotated_url = `/uploads/${annotatedFilename}`;
            await inference.save();
        }

        res.status(201).json({
            success: true,
            message: 'Inference completed successfully',
            inference: {
                ...inference.toObject(),
                detections: detectionDocs,
                violations: violationDocs,
                annotated_url: inference.annotated_url || null
            }
        });

    } catch (error) {
        console.error('Run inference error:', error);
        res.status(500).json({
            success: false,
            message: 'Error running inference',
            error: error.message
        });
    }
};

// Get all inferences
exports.getAllInferences = async (req, res) => {
    try {
        const inferences = await Inference.find({}).sort({ timestamp: -1 });

        // Populate detections and violations for each inference
        const populatedInferences = await Promise.all(
            inferences.map(async (inf) => {
                const detections = await Detection.find({ inference_id: inf.inference_id });
                const violations = await Violation.find({ inference_id: inf.inference_id });
                return {
                    ...inf.toObject(),
                    detections,
                    violations
                };
            })
        );

        res.status(200).json({
            success: true,
            count: populatedInferences.length,
            inferences: populatedInferences
        });
    } catch (error) {
        console.error('Get inferences error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching inferences',
            error: error.message
        });
    }
};

// Get inference by ID
exports.getInferenceById = async (req, res) => {
    try {
        const { id } = req.params;
        const inference = await Inference.findOne({ inference_id: id });

        if (!inference) {
            return res.status(404).json({
                success: false,
                message: 'Inference not found'
            });
        }

        const detections = await Detection.find({ inference_id: id });
        const violations = await Violation.find({ inference_id: id });

        res.status(200).json({
            success: true,
            inference: {
                ...inference.toObject(),
                detections,
                violations
            }
        });
    } catch (error) {
        console.error('Get inference error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching inference',
            error: error.message
        });
    }
};

// Get inferences by zone
exports.getInferencesByZone = async (req, res) => {
    try {
        const { zoneId } = req.params;
        const inferences = await Inference.find({ zone_id: zoneId }).sort({ timestamp: -1 });

        const populatedInferences = await Promise.all(
            inferences.map(async (inf) => {
                const detections = await Detection.find({ inference_id: inf.inference_id });
                const violations = await Violation.find({ inference_id: inf.inference_id });
                return {
                    ...inf.toObject(),
                    detections,
                    violations
                };
            })
        );

        res.status(200).json({
            success: true,
            count: populatedInferences.length,
            inferences: populatedInferences
        });
    } catch (error) {
        console.error('Get inferences by zone error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching inferences',
            error: error.message
        });
    }
};

// Get aggregated metrics
exports.getInferenceMetrics = async (req, res) => {
    try {
        const { zone_id } = req.query;
        const filter = zone_id ? { zone_id } : {};

        const inferences = await Inference.find(filter);

        const totalScans = inferences.length;
        const totalDetections = await Detection.countDocuments(
            zone_id
                ? { inference_id: { $in: inferences.map(i => i.inference_id) } }
                : {}
        );
        const totalViolations = inferences.reduce((sum, inf) => sum + (inf.total_violations || 0), 0);
        const totalPersons = inferences.reduce((sum, inf) => sum + (inf.total_persons || 0), 0);
        const avgProcessingTime = totalScans > 0
            ? Math.round(inferences.reduce((sum, inf) => sum + (inf.processing_time_ms || 0), 0) / totalScans)
            : 0;

        res.status(200).json({
            success: true,
            metrics: {
                totalScans,
                totalDetections,
                totalViolations,
                totalPersons,
                avgProcessingTime
            }
        });
    } catch (error) {
        console.error('Get metrics error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching metrics',
            error: error.message
        });
    }
};

// Delete inference and its related records
exports.deleteInference = async (req, res) => {
    try {
        const { id } = req.params;
        const inference = await Inference.findOne({ inference_id: id });

        if (!inference) {
            return res.status(404).json({
                success: false,
                message: 'Inference not found'
            });
        }

        // Delete related detections and violations
        await Detection.deleteMany({ inference_id: id });
        await Violation.deleteMany({ inference_id: id });

        // Delete snapshot file if exists
        if (inference.snapshot_url) {
            const rel = String(inference.snapshot_url).replace(/^\/+/, '');
            const filePath = path.join(__dirname, '..', rel);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        // Delete annotated image if exists
        if (inference.annotated_url) {
            const rel = String(inference.annotated_url).replace(/^\/+/, '');
            const annotatedPath = path.join(__dirname, '..', rel);
            if (fs.existsSync(annotatedPath)) {
                fs.unlinkSync(annotatedPath);
            }
        }

        await Inference.deleteOne({ inference_id: id });

        res.status(200).json({
            success: true,
            message: 'Inference and related records deleted successfully'
        });
    } catch (error) {
        console.error('Delete inference error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting inference',
            error: error.message
        });
    }
};
