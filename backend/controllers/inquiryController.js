const Inquiry = require('../models/Inquiry');

// Create a new inquiry (employee)
exports.createInquiry = async (req, res) => {
    try {
        const { subject, category, message, submittedBy, employeeId } = req.body;

        if (!subject || !category || !message || !submittedBy || !employeeId) {
            return res.status(400).json({
                success: false,
                message: 'Subject, category, message, submittedBy, and employeeId are required'
            });
        }

        const inquiry = new Inquiry({ subject, category, message, submittedBy, employeeId });
        await inquiry.save();

        res.status(201).json({
            success: true,
            message: 'Inquiry submitted successfully',
            inquiry
        });
    } catch (error) {
        console.error('Create inquiry error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating inquiry',
            error: error.message
        });
    }
};

// Get inquiries by employeeId (for employee view)
exports.getMyInquiries = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const inquiries = await Inquiry.find({ employeeId }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: inquiries.length,
            inquiries
        });
    } catch (error) {
        console.error('Get my inquiries error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching inquiries',
            error: error.message
        });
    }
};

// Get all inquiries (for inventory manager view)
exports.getAllInquiries = async (req, res) => {
    try {
        const inquiries = await Inquiry.find().sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: inquiries.length,
            inquiries
        });
    } catch (error) {
        console.error('Get all inquiries error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching inquiries',
            error: error.message
        });
    }
};

// Update an inquiry (employee edits their open inquiry)
exports.updateInquiry = async (req, res) => {
    try {
        const { id } = req.params;
        const { subject, category, message } = req.body;

        const inquiry = await Inquiry.findById(id);
        if (!inquiry) {
            return res.status(404).json({
                success: false,
                message: 'Inquiry not found'
            });
        }

        if (inquiry.status !== 'Open') {
            return res.status(400).json({
                success: false,
                message: 'Only open inquiries can be edited'
            });
        }

        if (subject) inquiry.subject = subject;
        if (category) inquiry.category = category;
        if (message) inquiry.message = message;

        await inquiry.save();

        res.status(200).json({
            success: true,
            message: 'Inquiry updated successfully',
            inquiry
        });
    } catch (error) {
        console.error('Update inquiry error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating inquiry',
            error: error.message
        });
    }
};

// Delete an inquiry (employee deletes their open inquiry)
exports.deleteInquiry = async (req, res) => {
    try {
        const { id } = req.params;

        const inquiry = await Inquiry.findById(id);
        if (!inquiry) {
            return res.status(404).json({
                success: false,
                message: 'Inquiry not found'
            });
        }

        if (inquiry.status !== 'Open') {
            return res.status(400).json({
                success: false,
                message: 'Only open inquiries can be deleted'
            });
        }

        await Inquiry.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: 'Inquiry deleted successfully'
        });
    } catch (error) {
        console.error('Delete inquiry error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting inquiry',
            error: error.message
        });
    }
};

// Respond to an inquiry (inventory manager)
exports.respondToInquiry = async (req, res) => {
    try {
        const { id } = req.params;
        const { response, status, respondedBy } = req.body;

        const inquiry = await Inquiry.findById(id);
        if (!inquiry) {
            return res.status(404).json({
                success: false,
                message: 'Inquiry not found'
            });
        }

        if (response !== undefined) inquiry.response = response;
        if (status) inquiry.status = status;
        if (respondedBy) inquiry.respondedBy = respondedBy;

        await inquiry.save();

        res.status(200).json({
            success: true,
            message: 'Response saved successfully',
            inquiry
        });
    } catch (error) {
        console.error('Respond to inquiry error:', error);
        res.status(500).json({
            success: false,
            message: 'Error responding to inquiry',
            error: error.message
        });
    }
};
