const express = require('express');
const router = express.Router();
const departmentController = require('./department.controller');

// Forward all department routes to the department controller
router.use('/', departmentController);

module.exports = router;