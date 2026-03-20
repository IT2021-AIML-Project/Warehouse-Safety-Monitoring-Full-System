const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const inferenceController = require('../controllers/inferenceController');

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', 'uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `snapshot_${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only JPEG, PNG, and WebP images are allowed'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Run inference (upload image)
router.post('/', upload.single('image'), inferenceController.runInference);

// Get aggregated metrics (must be before /:id to avoid conflict)
router.get('/metrics', inferenceController.getInferenceMetrics);

// Get all inferences
router.get('/', inferenceController.getAllInferences);

// Get inferences by zone
router.get('/zone/:zoneId', inferenceController.getInferencesByZone);

// Get inference by ID
router.get('/:id', inferenceController.getInferenceById);

// Delete inference
router.delete('/:id', inferenceController.deleteInference);

module.exports = router;
