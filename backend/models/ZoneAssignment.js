const mongoose = require('mongoose');

const zoneAssignmentSchema = new mongoose.Schema({
    zone: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Zone',
        required: [true, 'Zone is required']
    },
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: [true, 'Employee is required']
    }
}, {
    timestamps: true
});

// Prevent duplicate assignments
zoneAssignmentSchema.index({ zone: 1, employee: 1 }, { unique: true });

const ZoneAssignment = mongoose.model('ZoneAssignment', zoneAssignmentSchema);

module.exports = ZoneAssignment;
