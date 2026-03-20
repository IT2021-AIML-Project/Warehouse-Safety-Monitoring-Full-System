const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');

// Change employee password (must be before /:id routes)
router.post('/change-password', employeeController.changeEmployeePassword);

// Register a new employee
router.post('/', employeeController.registerEmployee);

// Get all employees
router.get('/', employeeController.getAllEmployees);

// Update employee profile (phone, etc.)
router.put('/:id/profile', employeeController.updateEmployeeProfile);

// Update an employee
router.put('/:id', employeeController.updateEmployee);

// Delete an employee
router.delete('/:id', employeeController.deleteEmployee);

module.exports = router;
