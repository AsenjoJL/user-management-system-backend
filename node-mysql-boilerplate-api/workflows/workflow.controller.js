const express = require('express');
const router = express.Router();
const Joi = require('joi');
const validateRequest = require('../_middleware/validate-request');
const authorize = require('../_middleware/authorize');
const Role = require('../_helpers/role');
const workflowService = require('./workflow.service');

// Routes
router.post('/', authorize(Role.Admin), createSchema, create);
router.get('/', authorize(), getAll);
router.get('/:id', authorize(), getById);
router.get('/employee/:employeeId', authorize(), getByEmployeeId);
router.put('/:id', authorize(Role.Admin), updateSchema, update);
router.put('/:id/status', authorize(Role.Admin), updateStatusSchema, updateStatus);
router.delete('/:id', authorize(Role.Admin), _delete);
router.post('/onboarding', authorize(Role.Admin), onboardingSchema, createOnboarding);
router.get('/recent-onboardings', authorize(Role.Admin), getRecentOnboardings);

module.exports = router;

// Schema validation functions
function createSchema(req, res, next) {
    const schema = Joi.object({
        employeeId: Joi.number().integer().required(),
        type: Joi.string().required(),
        details: Joi.object().default({}),
        status: Joi.string().valid('Pending', 'Approved', 'Rejected').default('Pending'),
        comments: Joi.string().allow(null, '')
    });
    validateRequest(req, next, schema);
}

function updateSchema(req, res, next) {
    const schema = Joi.object({
        employeeId: Joi.number().integer().empty(''),
        type: Joi.string().empty(''),
        details: Joi.object().default({}),
        status: Joi.string().valid('Pending', 'Approved', 'Rejected').empty(''),
        comments: Joi.string().allow(null, '').empty('')
    });
    validateRequest(req, next, schema);
}

function updateStatusSchema(req, res, next) {
    const schema = Joi.object({
        status: Joi.string().valid('Pending', 'Approved', 'Rejected').required(),
        comments: Joi.string().allow(null, '').empty('')
    });
    validateRequest(req, next, schema);
}

function onboardingSchema(req, res, next) {
    const schema = Joi.object({
        employeeId: Joi.number().integer().required(),
        details: Joi.object().default({})
    });
    validateRequest(req, next, schema);
}

// Route handler functions
function create(req, res, next) {
    console.log('Creating workflow with data:', req.body);
    workflowService.create(req.body)
        .then(workflow => {
            console.log('Workflow created successfully');
            res.status(201).json(workflow);
        })
        .catch(error => {
            console.error('Error in workflow controller create:', error);
            next(error);
        });
}

function getAll(req, res, next) {
    workflowService.getAll()
        .then(workflows => res.json(workflows))
        .catch(next);
}

function getById(req, res, next) {
    workflowService.getById(req.params.id)
        .then(workflow => workflow ? res.json(workflow) : res.sendStatus(404))
        .catch(next);
}

function getByEmployeeId(req, res, next) {
    console.log(`Getting workflows for employee ${req.params.employeeId}`);
    workflowService.getByEmployeeId(req.params.employeeId)
        .then(workflows => {
            console.log(`Found ${workflows.length} workflows for employee ${req.params.employeeId}`);
            res.json(workflows);
        })
        .catch(error => {
            console.error(`Error fetching workflows for employee ${req.params.employeeId}:`, error);
            next(error);
        });
}

function update(req, res, next) {
    workflowService.update(req.params.id, req.body)
        .then(workflow => res.json(workflow))
        .catch(next);
}

function updateStatus(req, res, next) {
    console.log(`Updating workflow ${req.params.id} status to ${req.body.status}`);
    workflowService.updateStatus(req.params.id, req.body)
        .then(workflow => {
            console.log('Workflow status updated successfully');
            res.json(workflow);
        })
        .catch(error => {
            console.error(`Error updating workflow ${req.params.id} status:`, error);
            next(error);
        });
}

function _delete(req, res, next) {
    workflowService.delete(req.params.id)
        .then(() => res.json({ message: 'Workflow deleted successfully' }))
        .catch(next);
}

function createOnboarding(req, res, next) {
    console.log('Creating onboarding workflow for employee:', req.body.employeeId);
    
    // Validation for missing employeeId
    if (!req.body.employeeId) {
        return res.status(400).json({ message: 'Employee ID is required' });
    }
    
    workflowService.createOnboarding(req.body)
        .then(workflow => {
            console.log('Onboarding workflow created successfully');
            res.status(201).json(workflow);
        })
        .catch(error => {
            console.error('Error creating onboarding workflow:', error);
            next(error);
        });
}

function getRecentOnboardings(req, res, next) {
    // Default to 30 days if not specified
    const days = req.query.days ? parseInt(req.query.days) : 30;
    
    workflowService.getRecentOnboardings(days)
        .then(workflows => res.json(workflows))
        .catch(next);
}
