const express = require('express');
const router = express.Router();
const zoneAssignmentController = require('../controllers/zoneAssignmentController');

// Get all zones populated with items and employees
router.get('/populated', zoneAssignmentController.getPopulatedZones);

// Assign employee to a zone
router.post('/', zoneAssignmentController.assignEmployee);

// Bulk assign employees to a zone
router.post('/bulk', zoneAssignmentController.bulkAssignEmployees);

// Get assignments by zone
router.get('/zone/:zoneId', zoneAssignmentController.getAssignmentsByZone);

// Get assignments by employee (zones + PPE items for that employee)
router.get('/employee/:employeeId', zoneAssignmentController.getAssignmentsByEmployee);

// Remove assignment by ID
router.delete('/:id', zoneAssignmentController.removeEmployee);

// Remove by zone + employee combo
router.delete('/zone/:zoneId/employee/:employeeId', zoneAssignmentController.removeByZoneAndEmployee);

module.exports = router;
