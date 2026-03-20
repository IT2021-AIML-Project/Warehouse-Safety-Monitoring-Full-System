const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const violationSchema = new mongoose.Schema({
    violation_id: {
        type: String,
        unique: true,
        default: () => uuidv4()
    },
    inference_id: {
        type: String,
        required: [true, 'Inference ID is required'],
        index: true
    },
    violation_type: {
        type: String,
        required: [true, 'Violation type is required']
    },
    severity: {
        type: String,
        enum: ['Low', 'Medium', 'High'],
        default: 'Medium'
    },
    confidence: {
        type: Number,
        min: 0,
        max: 1,
        default: 0
    },
    created_at: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

violationSchema.index({ inference_id: 1 });

const Violation = mongoose.model('Violation', violationSchema);

module.exports = Violation;
