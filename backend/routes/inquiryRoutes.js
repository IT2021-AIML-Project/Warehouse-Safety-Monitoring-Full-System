const express = require('express');
const router = express.Router();
const inquiryController = require('../controllers/inquiryController');

// Create a new inquiry
router.post('/', inquiryController.createInquiry);

// Get all inquiries (manager view)
router.get('/', inquiryController.getAllInquiries);

// Get inquiries by employeeId
router.get('/employee/:employeeId', inquiryController.getMyInquiries);

// Update an inquiry (employee edit)
router.put('/:id', inquiryController.updateInquiry);

// Respond to an inquiry (manager)
router.put('/:id/respond', inquiryController.respondToInquiry);

// Delete an inquiry
router.delete('/:id', inquiryController.deleteInquiry);

module.exports = router;
