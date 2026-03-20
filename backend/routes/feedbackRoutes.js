const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');

// Create feedback
router.post('/', feedbackController.createFeedback);

// Get all feedbacks (manager view)
router.get('/', feedbackController.getAllFeedbacks);

// Get feedbacks by employee
router.get('/employee/:employeeId', feedbackController.getFeedbacksByEmployee);

// Update feedback status
router.put('/:id/status', feedbackController.updateFeedbackStatus);

// Delete feedback
router.delete('/:id', feedbackController.deleteFeedback);

module.exports = router;
