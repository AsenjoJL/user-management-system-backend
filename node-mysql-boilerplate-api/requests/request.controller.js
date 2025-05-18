const express = require('express');
const router = express.Router();
const Joi = require('joi');
const validateRequest = require('../_middleware/validate-request');
const authorize = require('../_middleware/authorize');
const Role = require('../_helpers/role');
const requestService = require('./request.service');

// Routes
router.post('/', authorize(), createSchema, create);
router.get('/', authorize(Role.Admin), getAll);
router.get('/:id', authorize(), getById);
router.get('/employee/:employeeId', authorize(), getByEmployeeId);
router.put('/:id', authorize(), updateSchema, update);
router.delete('/:id', authorize(Role.Admin), _delete);

module.exports = router;

// Schema validation functions
function createSchema(req, res, next) {
    console.log('Validating request schema:', req.body);
    const schema = Joi.object({
        type: Joi.string().required(),
        description: Joi.string().allow(null, ''),
        employeeId: Joi.number().integer().required(),
        requestItems: Joi.array().items(
            Joi.object({
                name: Joi.string().required(),
                quantity: Joi.number().integer().positive().required(),
                description: Joi.string().allow(null, '')
            })
        ).min(1).required()
    });
    
    validateRequest(req, next, schema);
}

function updateSchema(req, res, next) {
    const schema = Joi.object({
        type: Joi.string().empty(''),
        description: Joi.string().allow(null, ''),
        employeeId: Joi.number().integer().empty(''),
        status: Joi.string().valid('Pending', 'Approved', 'Rejected', 'Completed').empty(''),
        comments: Joi.string().allow(null, ''),
        requestItems: Joi.array().items(
            Joi.object({
                id: Joi.number().optional(),
                name: Joi.string().required(),
                quantity: Joi.number().integer().positive().required(),
                description: Joi.string().allow(null, '')
            })
        ).min(1)
    });
    validateRequest(req, next, schema);
}

// Route handler functions
function create(req, res, next) {
    console.log('=== Request Creation Started ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('User:', JSON.stringify(req.user, null, 2));
    
    requestService.create(req.body, req.user.id)
        .then(request => {
            console.log('Request created successfully:', JSON.stringify(request, null, 2));
            res.status(201).json(request);
        })
        .catch(error => {
            console.error('Error creating request:', error);
            // Send more detailed error response
            res.status(400).json({
                message: error.message || 'Failed to create request',
                error: process.env.NODE_ENV === 'development' ? error : undefined
            });
        });
}

function getAll(req, res, next) {
    requestService.getAll()
        .then(requests => res.json(requests))
        .catch(next);
}

function getById(req, res, next) {
    // First get the request
    requestService.getById(req.params.id)
        .then(request => {
            // Then check if user has permission to access it
            if (!request) {
                return res.status(404).json({ message: 'Request not found' });
            }
            
            // Only admins or the request's employee can access this request
            const isAdmin = req.user.role === Role.Admin;
            const isRequestor = request.employeeId === req.user.employeeId;
            
            if (!isAdmin && !isRequestor) {
                return res.status(403).json({ message: 'You do not have permission to access this request' });
            }
            
            return res.json(request);
        })
        .catch(next);
}

function getByEmployeeId(req, res, next) {
    // Check if user has permission to access these requests
    const isAdmin = req.user.role === Role.Admin;
    const isOwnEmployee = req.user.employeeId && (req.user.employeeId.toString() === req.params.employeeId);
    
    if (!isAdmin && !isOwnEmployee) {
        return res.status(403).json({ message: 'You do not have permission to access these requests' });
    }
    
    requestService.getByEmployeeId(req.params.employeeId)
        .then(requests => res.json(requests))
        .catch(next);
}

function update(req, res, next) {
    // Get the request first to check permissions
    requestService.getById(req.params.id)
        .then(request => {
            if (!request) {
                return res.status(404).json({ message: 'Request not found' });
            }
            
            // Only admins or the request creator can update it
            const isAdmin = req.user.role === Role.Admin;
            const isRequestor = request.employeeId === req.user.employeeId;
            
            if (!isAdmin && !isRequestor) {
                return res.status(403).json({ message: 'You do not have permission to update this request' });
            }
            
            // If not admin and trying to change status (except when it's 'Pending')
            if (!isAdmin && req.body.status && req.body.status !== 'Pending' && request.status !== req.body.status) {
                return res.status(403).json({ message: 'Only admins can change request status' });
            }
            
            // Process the update
            return requestService.update(req.params.id, req.body)
                .then(updatedRequest => res.json(updatedRequest));
        })
        .catch(next);
}

function _delete(req, res, next) {
    requestService.delete(req.params.id)
        .then(() => res.json({ message: 'Request deleted successfully' }))
        .catch(next);
}
