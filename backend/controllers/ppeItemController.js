const PPEItem = require('../models/PPEItem');
const Zone = require('../models/Zone');
const ZoneAssignment = require('../models/ZoneAssignment');

// Create a new PPE item
exports.createPPEItem = async (req, res) => {
    try {
        const { itemId, itemName, categories, quantity, zone } = req.body;

        if (!itemId || !itemName || !categories || categories.length === 0 || quantity === undefined || !zone) {
            return res.status(400).json({
                success: false,
                message: 'Item ID, Item Name, Categories, Quantity, and Zone are required'
            });
        }

        // Check duplicate itemId
        const existing = await PPEItem.findOne({ itemId });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Item ID already exists' });
        }

        // Check duplicate itemName + zone combination
        const duplicateInZone = await PPEItem.findOne({ name: itemName, zone });
        if (duplicateInZone) {
            return res.status(400).json({
                success: false,
                message: 'This item already exists in the selected zone. Please choose a different item or zone.'
            });
        }

        // Verify zone exists
        const zoneDoc = await Zone.findById(zone);
        if (!zoneDoc) {
            return res.status(400).json({ success: false, message: 'Zone not found' });
        }

        const newItem = new PPEItem({
            itemId,
            name: itemName,
            categories,
            quantity: Number(quantity),
            zone
        });

        await newItem.save();

        const populated = await PPEItem.findById(newItem._id).populate('zone', 'zoneId name type status');

        res.status(201).json({
            success: true,
            message: 'PPE item created successfully',
            item: populated
        });
    } catch (error) {
        console.error('Create PPE item error:', error);
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ success: false, message: 'Validation failed', errors });
        }
        res.status(500).json({ success: false, message: 'Error creating PPE item', error: error.message });
    }
};

// Get all PPE items
exports.getAllPPEItems = async (req, res) => {
    try {
        const items = await PPEItem.find({}).populate('zone', 'zoneId name type status').sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: items.length, items });
    } catch (error) {
        console.error('Get PPE items error:', error);
        res.status(500).json({ success: false, message: 'Error fetching PPE items', error: error.message });
    }
};

// Get PPE items by zone
exports.getItemsByZone = async (req, res) => {
    try {
        const { zoneId } = req.params;
        const items = await PPEItem.find({ zone: zoneId }).populate('zone', 'zoneId name type status').sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: items.length, items });
    } catch (error) {
        console.error('Get items by zone error:', error);
        res.status(500).json({ success: false, message: 'Error fetching items by zone', error: error.message });
    }
};

// Update a PPE item (quantity)
exports.updatePPEItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity } = req.body;

        const item = await PPEItem.findById(id);
        if (!item) {
            return res.status(404).json({ success: false, message: 'PPE item not found' });
        }

        if (quantity !== undefined) {
            const newQty = Number(quantity);

            // Check if reducing quantity below assigned employee count
            const assignedCount = await ZoneAssignment.countDocuments({ zone: item.zone });
            if (newQty < assignedCount) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot reduce quantity below ${assignedCount}. There are ${assignedCount} employee(s) currently assigned to this zone.`
                });
            }

            item.quantity = newQty;
        }

        await item.save(); // triggers pre-save hook for status

        const populated = await PPEItem.findById(item._id).populate('zone', 'zoneId name type status');
        res.status(200).json({ success: true, message: 'PPE item updated successfully', item: populated });
    } catch (error) {
        console.error('Update PPE item error:', error);
        res.status(500).json({ success: false, message: 'Error updating PPE item', error: error.message });
    }
};

// Delete a PPE item
exports.deletePPEItem = async (req, res) => {
    try {
        const { id } = req.params;
        const item = await PPEItem.findByIdAndDelete(id);
        if (!item) {
            return res.status(404).json({ success: false, message: 'PPE item not found' });
        }
        res.status(200).json({ success: true, message: 'PPE item deleted successfully' });
    } catch (error) {
        console.error('Delete PPE item error:', error);
        res.status(500).json({ success: false, message: 'Error deleting PPE item', error: error.message });
    }
};
