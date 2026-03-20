const Employee = require('../models/Employee');

// Register a new employee
exports.registerEmployee = async (req, res) => {
    try {
        const { employeeId, name, email, password } = req.body;

        // Validate required fields
        if (!employeeId || !name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Employee ID, Name, Email, and Password are required'
            });
        }

        // Check if employee ID or email already exists
        const existingEmployee = await Employee.findOne({
            $or: [{ employeeId }, { email }]
        });

        if (existingEmployee) {
            if (existingEmployee.employeeId === employeeId) {
                return res.status(400).json({
                    success: false,
                    message: 'Employee ID already exists'
                });
            }
            if (existingEmployee.email === email.toLowerCase()) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already registered'
                });
            }
        }

        // Create new employee
        const newEmployee = new Employee({
            employeeId,
            name,
            email,
            password
        });

        await newEmployee.save();

        // Return employee data (excluding password)
        const employeeResponse = {
            _id: newEmployee._id,
            employeeId: newEmployee.employeeId,
            name: newEmployee.name,
            email: newEmployee.email,
            status: newEmployee.status,
            createdAt: newEmployee.createdAt
        };

        res.status(201).json({
            success: true,
            message: 'Employee registered successfully',
            employee: employeeResponse
        });

    } catch (error) {
        console.error('Register employee error:', error);

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
            message: 'Error registering employee',
            error: error.message
        });
    }
};

// Get all employees
exports.getAllEmployees = async (req, res) => {
    try {
        const employees = await Employee.find({}, '-password').sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: employees.length,
            employees
        });
    } catch (error) {
        console.error('Get employees error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching employees',
            error: error.message
        });
    }
};

// Update an employee
exports.updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const { email, status } = req.body;

        const employee = await Employee.findById(id);
        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        // Check email uniqueness if changed
        if (email && email !== employee.email) {
            const emailExists = await Employee.findOne({ email, _id: { $ne: id } });
            if (emailExists) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already in use by another employee'
                });
            }
            employee.email = email;
        }

        if (status !== undefined) employee.status = status;

        await employee.save();

        // Return without password
        const employeeResponse = {
            _id: employee._id,
            employeeId: employee.employeeId,
            name: employee.name,
            email: employee.email,
            status: employee.status,
            createdAt: employee.createdAt,
            updatedAt: employee.updatedAt
        };

        res.status(200).json({
            success: true,
            message: 'Employee updated successfully',
            employee: employeeResponse
        });

    } catch (error) {
        console.error('Update employee error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating employee',
            error: error.message
        });
    }
};

// Delete an employee
exports.deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;

        const employee = await Employee.findByIdAndDelete(id);
        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Employee deleted successfully'
        });

    } catch (error) {
        console.error('Delete employee error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting employee',
            error: error.message
        });
    }
};

// Change employee password
exports.changeEmployeePassword = async (req, res) => {
    try {
        const { employeeId, currentPassword, newPassword } = req.body;

        // Validate required fields
        if (!employeeId || !currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Employee ID, current password, and new password are required'
            });
        }

        // Validate new password length
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters long'
            });
        }

        // Find employee by employeeId
        const employee = await Employee.findOne({ employeeId });

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        // Verify current password
        if (employee.password !== currentPassword) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Update password
        employee.password = newPassword;
        await employee.save();

        res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Change employee password error:', error);
        res.status(500).json({
            success: false,
            message: 'Error changing password',
            error: error.message
        });
    }
};

// Update employee profile (phone, etc.)
exports.updateEmployeeProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const { phone } = req.body;

        const employee = await Employee.findById(id);
        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        if (phone !== undefined) employee.phone = phone;

        await employee.save();

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            employee: {
                _id: employee._id,
                employeeId: employee.employeeId,
                name: employee.name,
                email: employee.email,
                phone: employee.phone,
                status: employee.status
            }
        });

    } catch (error) {
        console.error('Update employee profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating profile',
            error: error.message
        });
    }
};
