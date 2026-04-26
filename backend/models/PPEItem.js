const mongoose = require('mongoose');

const ppeItemSchema = new mongoose.Schema({
    itemId: {
        type: String,
        required: [true, 'Item ID is required'],
        unique: true,
        trim: true
    },
    name: {
        type: String,
        required: [true, 'Item name is required'],
        trim: true
    },
    categories: [{
        type: String,
        enum: ['Head Protection', 'Foot Protection', 'Body Protection']
    }],
    quantity: {
        type: Number,
        required: [true, 'Quantity is required'],
        min: [0, 'Quantity cannot be negative'],
        default: 0
    },
    status: {
        type: String,
        enum: ['In Stock', 'Low Stock', 'Out of Stock'],
        default: 'In Stock'
    },
    zone: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Zone',
        required: [true, 'Zone is required']
    }
}, {
    timestamps: true
});

// Auto-compute status based on surplus (quantity - assigned employees)
ppeItemSchema.pre('save', async function () {
    const ZoneAssignment = mongoose.model('ZoneAssignment');
    const assignedCount = await ZoneAssignment.countDocuments({ zone: this.zone });
    const surplus = this.quantity - assignedCount;

    if (surplus <= 0) this.status = 'Out of Stock';
    else if (surplus <= 3) this.status = 'Low Stock';
    else this.status = 'In Stock';
});

ppeItemSchema.index({ itemId: 1 });
ppeItemSchema.index({ zone: 1 });
ppeItemSchema.index({ name: 1, zone: 1 }, { unique: true });

const PPEItem = mongoose.model('PPEItem', ppeItemSchema);

module.exports = PPEItem;
