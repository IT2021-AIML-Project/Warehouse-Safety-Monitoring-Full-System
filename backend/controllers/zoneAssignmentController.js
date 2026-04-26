const ZoneAssignment = require('../models/ZoneAssignment');
const Zone = require('../models/Zone');
const Employee = require('../models/Employee');
const PPEItem = require('../models/PPEItem');

// Helper: recalculate PPE item statuses for a zone
const recalcPPEStatuses = async (zoneId) => {
    const items = await PPEItem.find({ zone: zoneId });
    for (const item of items) {
        await item.save(); // triggers pre-save hook which recalculates status
    }
};

// Assign employee to a zone
exports.assignEmployee = async (req, res) => {
    try {
        const { zone, employee } = req.body;

        if (!zone || !employee) {
            return res.status(400).json({ success: false, message: 'Zone and Employee are required' });
        }

        // Verify zone and employee exist
        const zoneDoc = await Zone.findById(zone);
        if (!zoneDoc) return res.status(404).json({ success: false, message: 'Zone not found' });

        const empDoc = await Employee.findById(employee);
        if (!empDoc) return res.status(404).json({ success: false, message: 'Employee not found' });

        // Check if employee is already assigned to ANY zone
        const existingAssignment = await ZoneAssignment.findOne({ employee }).populate('zone', 'name');
        if (existingAssignment) {
            const zoneName = existingAssignment.zone?.name || 'another zone';
            return res.status(400).json({
                success: false,
                message: `Employee is already assigned to "${zoneName}". An employee can only be assigned to one zone.`
            });
        }

        // Check PPE capacity — max employees = minimum PPE item quantity in this zone
        const ppeItems = await PPEItem.find({ zone });
        if (ppeItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot assign employees — no PPE items are registered in this zone yet.'
            });
        }
        const minPPEQty = Math.min(...ppeItems.map(item => item.quantity));
        const currentAssignments = await ZoneAssignment.countDocuments({ zone });
        if (currentAssignments >= minPPEQty) {
            return res.status(400).json({
                success: false,
                message: `Cannot assign more employees. This zone has PPE capacity for ${minPPEQty} employee(s) and already has ${currentAssignments} assigned.`
            });
        }

        const assignment = new ZoneAssignment({ zone, employee });
        await assignment.save();

        // Recalculate PPE statuses for this zone
        await recalcPPEStatuses(zone);

        const populated = await ZoneAssignment.findById(assignment._id)
            .populate('zone', 'zoneId name type status')
            .populate('employee', 'employeeId name email status');

        res.status(201).json({ success: true, message: 'Employee assigned successfully', assignment: populated });
    } catch (error) {
        console.error('Assign employee error:', error);
        res.status(500).json({ success: false, message: 'Error assigning employee', error: error.message });
    }
};

// Bulk assign employees to a zone
exports.bulkAssignEmployees = async (req, res) => {
    try {
        const { zone, employees } = req.body;

        if (!zone || !employees || employees.length === 0) {
            return res.status(400).json({ success: false, message: 'Zone and Employees list are required' });
        }

        const results = [];
        const skipped = [];

        // Check PPE capacity — max employees = minimum PPE item quantity in this zone
        const ppeItems = await PPEItem.find({ zone });
        if (ppeItems.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot assign employees — no PPE items are registered in this zone yet.'
            });
        }
        const minPPEQty = Math.min(...ppeItems.map(item => item.quantity));
        const currentAssignments = await ZoneAssignment.countDocuments({ zone });
        const availableSlots = minPPEQty - currentAssignments;

        if (availableSlots <= 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot assign more employees. This zone has PPE capacity for ${minPPEQty} employee(s) and already has ${currentAssignments} assigned.`
            });
        }

        for (const employeeId of employees) {
            // Check if employee is already assigned to ANY zone
            const existingAssignment = await ZoneAssignment.findOne({ employee: employeeId }).populate('zone', 'name');
            if (existingAssignment) {
                skipped.push({
                    employee: employeeId,
                    reason: `Already assigned to "${existingAssignment.zone?.name || 'another zone'}"`
                });
                continue;
            }
            // Check if capacity reached during loop
            if (results.length >= availableSlots) {
                skipped.push({
                    employee: employeeId,
                    reason: `Zone PPE capacity reached (max ${minPPEQty})`
                });
                continue;
            }
            const assignment = new ZoneAssignment({ zone, employee: employeeId });
            await assignment.save();
            results.push(assignment);
        }

        if (results.length === 0 && skipped.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'All selected employees are already assigned to other zones.',
                skipped
            });
        }

        // Recalculate PPE statuses for this zone before responding
        await recalcPPEStatuses(zone);

        res.status(201).json({
            success: true,
            message: `${results.length} employee(s) assigned successfully${skipped.length > 0 ? `, ${skipped.length} skipped (already assigned)` : ''}`,
            count: results.length,
            skipped
        });
    } catch (error) {
        console.error('Bulk assign error:', error);
        res.status(500).json({ success: false, message: 'Error assigning employees', error: error.message });
    }
};

// Remove employee from a zone
exports.removeEmployee = async (req, res) => {
    try {
        const { id } = req.params;

        const assignment = await ZoneAssignment.findByIdAndDelete(id);
        if (!assignment) {
            return res.status(404).json({ success: false, message: 'Assignment not found' });
        }

        // Recalculate PPE statuses for the zone
        await recalcPPEStatuses(assignment.zone);

        res.status(200).json({ success: true, message: 'Employee removed from zone successfully' });
    } catch (error) {
        console.error('Remove employee error:', error);
        res.status(500).json({ success: false, message: 'Error removing employee', error: error.message });
    }
};

// Remove employee by zone + employee ID combo
exports.removeByZoneAndEmployee = async (req, res) => {
    try {
        const { zoneId, employeeId } = req.params;

        const assignment = await ZoneAssignment.findOneAndDelete({ zone: zoneId, employee: employeeId });
        if (!assignment) {
            return res.status(404).json({ success: false, message: 'Assignment not found' });
        }

        // Recalculate PPE statuses for the zone
        await recalcPPEStatuses(zoneId);

        res.status(200).json({ success: true, message: 'Employee removed from zone successfully' });
    } catch (error) {
        console.error('Remove by zone+employee error:', error);
        res.status(500).json({ success: false, message: 'Error removing employee', error: error.message });
    }
};

// Get assignments by zone
exports.getAssignmentsByZone = async (req, res) => {
    try {
        const { zoneId } = req.params;
        const assignments = await ZoneAssignment.find({ zone: zoneId })
            .populate('employee', 'employeeId name email status');

        res.status(200).json({
            success: true,
            count: assignments.length,
            assignments
        });
    } catch (error) {
        console.error('Get assignments error:', error);
        res.status(500).json({ success: false, message: 'Error fetching assignments', error: error.message });
    }
};

// Get all zones populated with PPE items and assigned employees
exports.getPopulatedZones = async (req, res) => {
    try {
        const zones = await Zone.find({}).sort({ createdAt: -1 });

        const populatedZones = await Promise.all(
            zones.map(async (zone) => {
                const items = await PPEItem.find({ zone: zone._id });
                const assignments = await ZoneAssignment.find({ zone: zone._id })
                    .populate('employee', 'employeeId name email status');

                return {
                    _id: zone._id,
                    zoneId: zone.zoneId,
                    name: zone.name,
                    type: zone.type,
                    status: zone.status,
                    createdAt: zone.createdAt,
                    items: items.map(item => ({
                        _id: item._id,
                        id: item.itemId,
                        name: item.name,
                        category: item.categories.join(', '),
                        quantity: item.quantity,
                        status: item.status
                    })),
                    employees: assignments.map(a => ({
                        _id: a.employee._id,
                        id: a.employee.employeeId,
                        name: a.employee.name,
                        email: a.employee.email,
                        assignmentId: a._id
                    }))
                };
            })
        );

        res.status(200).json({ success: true, count: populatedZones.length, zones: populatedZones });
    } catch (error) {
        console.error('Get populated zones error:', error);
        res.status(500).json({ success: false, message: 'Error fetching populated zones', error: error.message });
    }
};

// Get zones assigned to a specific employee, with PPE items
exports.getAssignmentsByEmployee = async (req, res) => {
    try {
        const { employeeId } = req.params;

        // Find all zone assignments for this employee
        const assignments = await ZoneAssignment.find({ employee: employeeId })
            .populate('zone', 'zoneId name type status');

        // Derive condition label from PPE status
        const conditionFromStatus = (status) => {
            if (status === 'In Stock') return 'Good';
            if (status === 'Low Stock') return 'Fair';
            return 'Poor';
        };

        // For each assigned zone, fetch PPE items
        const zones = await Promise.all(
            assignments
                .filter(a => a.zone) // guard against deleted zones
                .map(async (a) => {
                    const zone = a.zone;
                    const items = await PPEItem.find({ zone: zone._id });

                    return {
                        id: zone.zoneId,
                        name: zone.name,
                        type: zone.type,
                        status: zone.status,
                        ppeItems: items.map(item => ({
                            name: item.name,
                            category: (item.categories && item.categories.length) ? item.categories[0] : 'General',
                            serialId: item.itemId,
                            assignedDate: new Date(a.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
                            condition: conditionFromStatus(item.status),
                            quantity: item.quantity,
                            stockStatus: item.status,
                        })),
                    };
                })
        );

        res.status(200).json({ success: true, count: zones.length, zones });
    } catch (error) {
        console.error('Get assignments by employee error:', error);
        res.status(500).json({ success: false, message: 'Error fetching employee assignments', error: error.message });
    }
};
