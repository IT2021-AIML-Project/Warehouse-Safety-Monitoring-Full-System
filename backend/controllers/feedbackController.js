const Feedback = require('../models/Feedback');

// Create a feedback
exports.createFeedback = async (req, res) => {
    try {
        const { category, rating, title, message, anonymous, submittedBy, submittedByName, attachments } = req.body;

        if (!title || !message || !rating) {
            return res.status(400).json({ success: false, message: 'Title, message, and rating are required' });
        }

        const feedback = new Feedback({
            category: category || 'general',
            rating,
            title: title.trim(),
            message: message.trim(),
            anonymous: anonymous || false,
            submittedBy: submittedBy || null,
            submittedByName: anonymous ? 'Anonymous' : (submittedByName || 'Employee'),
            status: 'new',
            attachments: attachments || [],
        });

        await feedback.save();

        res.status(201).json({
            success: true,
            message: 'Feedback submitted successfully',
            feedback: formatFeedback(feedback),
        });
    } catch (error) {
        console.error('Create feedback error:', error);
        res.status(500).json({ success: false, message: 'Error creating feedback', error: error.message });
    }
};

// Get all feedbacks (for manager view)
exports.getAllFeedbacks = async (req, res) => {
    try {
        const feedbacks = await Feedback.find({}).sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            count: feedbacks.length,
            feedbacks: feedbacks.map(formatFeedback),
        });
    } catch (error) {
        console.error('Get all feedbacks error:', error);
        res.status(500).json({ success: false, message: 'Error fetching feedbacks', error: error.message });
    }
};

// Get feedbacks by employee (for employee history)
exports.getFeedbacksByEmployee = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const feedbacks = await Feedback.find({ submittedBy: employeeId }).sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            count: feedbacks.length,
            feedbacks: feedbacks.map(formatFeedback),
        });
    } catch (error) {
        console.error('Get employee feedbacks error:', error);
        res.status(500).json({ success: false, message: 'Error fetching feedbacks', error: error.message });
    }
};

// Update feedback status (for manager)
exports.updateFeedbackStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['new', 'in-review', 'resolved'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status value' });
        }

        const feedback = await Feedback.findByIdAndUpdate(id, { status }, { new: true });
        if (!feedback) {
            return res.status(404).json({ success: false, message: 'Feedback not found' });
        }

        res.status(200).json({
            success: true,
            message: `Feedback status updated to ${status}`,
            feedback: formatFeedback(feedback),
        });
    } catch (error) {
        console.error('Update feedback status error:', error);
        res.status(500).json({ success: false, message: 'Error updating feedback', error: error.message });
    }
};

// Delete feedback
exports.deleteFeedback = async (req, res) => {
    try {
        const { id } = req.params;
        const feedback = await Feedback.findByIdAndDelete(id);
        if (!feedback) {
            return res.status(404).json({ success: false, message: 'Feedback not found' });
        }
        res.status(200).json({ success: true, message: 'Feedback deleted successfully' });
    } catch (error) {
        console.error('Delete feedback error:', error);
        res.status(500).json({ success: false, message: 'Error deleting feedback', error: error.message });
    }
};

// ── Helper ───────────────────────────────────────────────────────────────────
function formatFeedback(fb) {
    return {
        id: fb._id,
        category: fb.category,
        rating: fb.rating,
        title: fb.title,
        message: fb.message,
        anonymous: fb.anonymous,
        submittedBy: fb.submittedBy,
        submittedByName: fb.submittedByName,
        status: fb.status,
        attachments: fb.attachments || [],
        time: formatTimeAgo(fb.createdAt),
        createdAt: fb.createdAt,
    };
}

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
