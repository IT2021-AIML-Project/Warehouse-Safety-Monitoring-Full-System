const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const inferenceSchema = new mongoose.Schema({
    inference_id: {
        type: String,
        unique: true,
        default: () => uuidv4()
    },
    source_type: {
        type: String,
        enum: ['image', 'video', 'webcam', 'cctv'],
        required: [true, 'Source type is required']
    },
    camera_id: {
        type: String,
        default: null
    },
    zone_id: {
        type: String,
        default: null
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    model_version: {
        type: String,
        default: 'yolo26n'
    },
    processing_time_ms: {
        type: Number,
        default: 0
    },
    snapshot_url: {
        type: String,
        default: null
    },
    annotated_url: {
        type: String,
        default: null
    },
    total_persons: {
        type: Number,
        default: 0
    },
    total_violations: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

inferenceSchema.index({ inference_id: 1 });
inferenceSchema.index({ zone_id: 1 });

const Inference = mongoose.model('Inference', inferenceSchema);

module.exports = Inference;
