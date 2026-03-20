const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    category: {
        type: String,
        enum: ['general', 'safety', 'equipment', 'supervisor', 'other'],
        default: 'general'
    },
    rating: {
        type: Number,
        required: [true, 'Rating is required'],
        min: 1,
        max: 5
    },
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true
    },
    message: {
        type: String,
        required: [true, 'Message is required'],
        trim: true
    },
    anonymous: {
        type: Boolean,
        default: false
    },
    submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
    },
    submittedByName: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['new', 'in-review', 'resolved'],
        default: 'new'
    },
    attachments: [{
        name: String,
        size: Number,
        type: String,
    }]
}, {
    timestamps: true
});

feedbackSchema.index({ createdAt: -1 });
feedbackSchema.index({ submittedBy: 1 });
feedbackSchema.index({ status: 1 });

const Feedback = mongoose.model('Feedback', feedbackSchema);

module.exports = Feedback;
