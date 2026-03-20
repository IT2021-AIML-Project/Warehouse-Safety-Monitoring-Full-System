const mongoose = require('mongoose');

const inquirySchema = new mongoose.Schema({
    subject: {
        type: String,
        required: [true, 'Subject is required'],
        trim: true
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: ['Equipment', 'Access', 'Training', 'Safety', 'Incident', 'Other']
    },
    message: {
        type: String,
        required: [true, 'Message is required'],
        trim: true
    },
    status: {
        type: String,
        enum: ['Open', 'Pending', 'Resolved'],
        default: 'Open'
    },
    submittedBy: {
        type: String,
        required: [true, 'Submitter name is required'],
        trim: true
    },
    employeeId: {
        type: String,
        required: [true, 'Employee ID is required'],
        trim: true
    },
    response: {
        type: String,
        default: '',
        trim: true
    },
    respondedBy: {
        type: String,
        default: '',
        trim: true
    }
}, {
    timestamps: true
});

inquirySchema.index({ employeeId: 1 });
inquirySchema.index({ status: 1 });

const Inquiry = mongoose.model('Inquiry', inquirySchema);

module.exports = Inquiry;
