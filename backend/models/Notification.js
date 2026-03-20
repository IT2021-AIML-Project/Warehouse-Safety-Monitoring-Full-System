const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
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
    severity: {
        type: String,
        enum: ['info', 'warning', 'danger', 'success'],
        default: 'info'
    },
    recipientMode: {
        type: String,
        enum: ['individual', 'zone', 'all'],
        default: 'individual'
    },
    recipients: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
    }],
    zones: [{
        type: String,
        trim: true
    }],
    readBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
    }]
}, {
    timestamps: true
});

notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ recipients: 1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
