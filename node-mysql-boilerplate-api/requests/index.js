const express = require('express');
const router = express.Router();
const requestController = require('./request.controller');

// Forward all request routes to the request controller
router.use('/', requestController);

module.exports = router;