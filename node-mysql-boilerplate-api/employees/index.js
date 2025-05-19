const express = require('express');
const router = express.Router();
const employeeController = require('./employee.controller');

// Forward all employee routes to the employee controller
router.use('/', employeeController);

module.exports = router;