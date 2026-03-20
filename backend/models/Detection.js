const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const detectionSchema = new mongoose.Schema({
    detection_id: {
        type: String,
        unique: true,
        default: () => uuidv4()
    },
    inference_id: {
        type: String,
        required: [true, 'Inference ID is required'],
        index: true
    },
    object_class: {
        type: String,
        required: [true, 'Object class is required']
    },
    confidence: {
        type: Number,
        min: 0,
        max: 1,
        required: true
    },
    bbox_x1: {
        type: Number,
        default: 0
    },
    bbox_y1: {
        type: Number,
        default: 0
    },
    bbox_x2: {
        type: Number,
        default: 0
    },
    bbox_y2: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

detectionSchema.index({ inference_id: 1 });

const Detection = mongoose.model('Detection', detectionSchema);

module.exports = Detection;
