const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// Create notification
router.post('/', notificationController.createNotification);

// Get all notifications (manager view)
router.get('/', notificationController.getAllNotifications);

// Get notifications for a specific employee
router.get('/employee/:employeeId', notificationController.getNotificationsByEmployee);

// Update notification
router.put('/:id', notificationController.updateNotification);

// Delete notification
router.delete('/:id', notificationController.deleteNotification);

// Mark notification as read
router.put('/:id/read', notificationController.markAsRead);

module.exports = router;
