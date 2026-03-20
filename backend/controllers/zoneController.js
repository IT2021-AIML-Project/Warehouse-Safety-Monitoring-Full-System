const Zone = require('../models/Zone');

// Create a new zone
exports.createZone = async (req, res) => {
    try {
        const { zoneId, zoneName, zoneType, isActive } = req.body;

        // Validate required fields
        if (!zoneId || !zoneName || !zoneType) {
            return res.status(400).json({
                success: false,
                message: 'Zone ID, Zone Name, and Zone Type are required'
            });
        }

        // Check if zone ID already exists
        const existingZone = await Zone.findOne({ zoneId });
        if (existingZone) {
            return res.status(400).json({
                success: false,
                message: 'Zone ID already exists'
            });
        }

        // Create new zone
        const newZone = new Zone({
            zoneId,
            name: zoneName,
            type: zoneType,
            status: isActive !== false ? 'Active' : 'Inactive'
        });

        await newZone.save();

        res.status(201).json({
            success: true,
            message: 'Zone created successfully',
            zone: newZone
        });

    } catch (error) {
        console.error('Create zone error:', error);

        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error creating zone',
            error: error.message
        });
    }
};

// Get all zones
exports.getAllZones = async (req, res) => {
    try {
        const zones = await Zone.find({}).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: zones.length,
            zones
        });
    } catch (error) {
        console.error('Get zones error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching zones',
            error: error.message
        });
    }
};

// Update a zone
exports.updateZone = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, type, status } = req.body;

        const zone = await Zone.findById(id);
        if (!zone) {
            return res.status(404).json({
                success: false,
                message: 'Zone not found'
            });
        }

        // Update fields
        if (name !== undefined) zone.name = name;
        if (type !== undefined) zone.type = type;
        if (status !== undefined) zone.status = status;

        await zone.save();

        res.status(200).json({
            success: true,
            message: 'Zone updated successfully',
            zone
        });

    } catch (error) {
        console.error('Update zone error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating zone',
            error: error.message
        });
    }
};

// Delete a zone
exports.deleteZone = async (req, res) => {
    try {
        const { id } = req.params;

        const zone = await Zone.findByIdAndDelete(id);
        if (!zone) {
            return res.status(404).json({
                success: false,
                message: 'Zone not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Zone deleted successfully'
        });

    } catch (error) {
        console.error('Delete zone error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting zone',
            error: error.message
        });
    }
};
