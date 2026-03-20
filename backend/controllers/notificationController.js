const Notification = require('../models/Notification');
const Employee = require('../models/Employee');
const ZoneAssignment = require('../models/ZoneAssignment');
const Zone = require('../models/Zone');

// Create a notification
exports.createNotification = async (req, res) => {
    try {
        const { title, message, severity, recipientMode, recipients, zones } = req.body;

        if (!title || !message) {
            return res.status(400).json({ success: false, message: 'Title and message are required' });
        }

        let resolvedRecipients = [];
        let zoneNames = [];

        if (recipientMode === 'all') {
            // Send to all active employees
            const allEmployees = await Employee.find({ status: 'Active' }, '_id');
            resolvedRecipients = allEmployees.map(e => e._id);
        } else if (recipientMode === 'zone') {
            // Find employees assigned to the specified zones
            if (!zones || zones.length === 0) {
                return res.status(400).json({ success: false, message: 'At least one zone is required' });
            }
            // zones are Zone ObjectIds
            const assignments = await ZoneAssignment.find({ zone: { $in: zones } });
            resolvedRecipients = [...new Set(assignments.map(a => a.employee.toString()))];
            // Fetch zone names for display
            const zoneDocs = await Zone.find({ _id: { $in: zones } }, 'name');
            zoneNames = zoneDocs.map(z => z.name);
        } else {
            // individual
            if (!recipients || recipients.length === 0) {
                return res.status(400).json({ success: false, message: 'At least one recipient is required' });
            }
            resolvedRecipients = recipients;
        }

        const notification = new Notification({
            title,
            message,
            severity: severity || 'info',
            recipientMode: recipientMode || 'individual',
            recipients: resolvedRecipients,
            zones: zoneNames,
            readBy: [],
        });

        await notification.save();

        res.status(201).json({
            success: true,
            message: `Notification sent to ${resolvedRecipients.length} employee(s)`,
            notification: {
                id: notification._id,
                title: notification.title,
                message: notification.message,
                severity: notification.severity,
                recipientMode: notification.recipientMode,
                recipients: notification.recipients,
                zones: notification.zones,
                time: 'Just now',
                createdAt: notification.createdAt,
            },
        });
    } catch (error) {
        console.error('Create notification error:', error);
        res.status(500).json({ success: false, message: 'Error creating notification', error: error.message });
    }
};

// Get all notifications (for manager's Sent list)
exports.getAllNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({})
            .sort({ createdAt: -1 })
            .populate('recipients', 'employeeId name email');

        const formatted = notifications.map(n => ({
            id: n._id,
            title: n.title,
            message: n.message,
            severity: n.severity,
            recipientMode: n.recipientMode,
            recipients: n.recipients.map(r => ({ _id: r._id, id: r.employeeId, name: r.name, email: r.email })),
            zones: n.zones,
            readBy: n.readBy,
            time: formatTimeAgo(n.createdAt),
            createdAt: n.createdAt,
        }));

        res.status(200).json({ success: true, count: formatted.length, notifications: formatted });
    } catch (error) {
        console.error('Get all notifications error:', error);
        res.status(500).json({ success: false, message: 'Error fetching notifications', error: error.message });
    }
};

// Get notifications for a specific employee
exports.getNotificationsByEmployee = async (req, res) => {
    try {
        const { employeeId } = req.params;

        const notifications = await Notification.find({ recipients: employeeId })
            .sort({ createdAt: -1 });

        const formatted = notifications.map(n => ({
            id: n._id,
            title: n.title,
            message: n.message,
            severity: n.severity,
            time: formatTimeAgo(n.createdAt),
            read: n.readBy.some(id => id.toString() === employeeId),
            createdAt: n.createdAt,
        }));

        res.status(200).json({ success: true, count: formatted.length, notifications: formatted });
    } catch (error) {
        console.error('Get employee notifications error:', error);
        res.status(500).json({ success: false, message: 'Error fetching notifications', error: error.message });
    }
};

// Update a notification
exports.updateNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, message, severity } = req.body;

        const notification = await Notification.findById(id);
        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        if (title) notification.title = title;
        if (message) notification.message = message;
        if (severity) notification.severity = severity;

        await notification.save();

        res.status(200).json({
            success: true,
            message: 'Notification updated successfully',
            notification: {
                id: notification._id,
                title: notification.title,
                message: notification.message,
                severity: notification.severity,
                recipientMode: notification.recipientMode,
                recipients: notification.recipients,
                zones: notification.zones,
                time: formatTimeAgo(notification.createdAt),
                createdAt: notification.createdAt,
            },
        });
    } catch (error) {
        console.error('Update notification error:', error);
        res.status(500).json({ success: false, message: 'Error updating notification', error: error.message });
    }
};

// Delete a notification
exports.deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;

        const notification = await Notification.findByIdAndDelete(id);
        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        res.status(200).json({ success: true, message: 'Notification deleted successfully' });
    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({ success: false, message: 'Error deleting notification', error: error.message });
    }
};

// Mark notification as read by an employee
exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const { employeeId } = req.body;

        if (!employeeId) {
            return res.status(400).json({ success: false, message: 'Employee ID is required' });
        }

        const notification = await Notification.findById(id);
        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        // Add to readBy if not already present
        if (!notification.readBy.some(rid => rid.toString() === employeeId)) {
            notification.readBy.push(employeeId);
            await notification.save();
        }

        res.status(200).json({ success: true, message: 'Notification marked as read' });
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({ success: false, message: 'Error marking notification as read', error: error.message });
    }
};

// ── Helper ───────────────────────────────────────────────────────────────────
function formatTimeAgo(date) {
    const now = new Date();
    const diff = now - new Date(date);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
