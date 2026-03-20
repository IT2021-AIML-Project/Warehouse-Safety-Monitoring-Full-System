const mongoose = require('mongoose');

const zoneSchema = new mongoose.Schema({
    zoneId: {
        type: String,
        required: [true, 'Zone ID is required'],
        unique: true,
        trim: true
    },
    name: {
        type: String,
        required: [true, 'Zone name is required'],
        trim: true
    },
    type: {
        type: String,
        required: [true, 'Zone type is required'],
        enum: ['Storage', 'Loading', 'Restricted', 'Packing']
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive'],
        default: 'Active'
    }
}, {
    timestamps: true
});

zoneSchema.index({ zoneId: 1 });

const Zone = mongoose.model('Zone', zoneSchema);

module.exports = Zone;
