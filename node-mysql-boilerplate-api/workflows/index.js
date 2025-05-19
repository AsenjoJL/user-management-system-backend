const express = require('express');
const router = express.Router();
const workflowController = require('./workflow.controller');

// Forward all workflow routes to the workflow controller
router.use('/', workflowController);

module.exports = router;
