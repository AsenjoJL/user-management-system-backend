const express = require('express');
const router = express.Router();
const Joi = require('joi');
const validateRequest = require('../_middleware/validate-request');
const authorize = require('../_middleware/authorize');
const Role = require('../_helpers/role');
const employeeService = require('./employee.service');

// Routes
router.post('/', authorize(Role.Admin), createSchema, create);
router.get('/', authorize(), getAll);
router.get('/:id', authorize(), getById);
router.put('/:id', authorize(Role.Admin), updateSchema, update);
router.delete('/:id', authorize(Role.Admin), _delete);
router.post('/:id/transfer', authorize(Role.Admin), transferSchema, transfer);

module.exports = router;

// Schema validation functions
function createSchema(req, res, next) {
    const schema = Joi.object({
        employeeId: Joi.string().required(),
        userId: Joi.number().integer().required(),
        position: Joi.string().required(),
        departmentId: Joi.number().integer().required(),
        hireDate: Joi.string().required(),
        status: Joi.string().required()
    });
    validateRequest(req, next, schema);
}

function updateSchema(req, res, next) {
    const schema = Joi.object({
        employeeId: Joi.string().empty(''),
        userId: Joi.number().integer().empty(''),
        position: Joi.string().empty(''),
        departmentId: Joi.number().integer().empty(''),
        hireDate: Joi.string().empty(''),
        status: Joi.string().empty('')
    });
    validateRequest(req, next, schema);
}

function transferSchema(req, res, next) {
    const schema = Joi.object({
        departmentId: Joi.number().integer().required()
    });
    validateRequest(req, next, schema);
}

// Route handler functions
function create(req, res, next) {
    console.log('Creating employee with data:', req.body);
    employeeService.create(req.body)
        .then(employee => {
            console.log('Employee created successfully');
            res.status(201).json(employee);
        })
        .catch(error => {
            console.error('Error in employee controller create:', error);
            next(error);
        });
}

function getAll(req, res, next) {
    console.log('Fetching all employees');
    employeeService.getAll()
        .then(employees => {
            console.log(`Found ${employees.length} employees`);
            res.json(employees);
        })
        .catch(error => {
            console.error('Error fetching employees:', error);
            next(error);
        });
}

function getById(req, res, next) {
    employeeService.getById(req.params.id)
        .then(employee => employee ? res.json(employee) : res.sendStatus(404))
        .catch(next);
}

function update(req, res, next) {
    employeeService.update(req.params.id, req.body)
        .then(employee => res.json(employee))
        .catch(next);
}

function _delete(req, res, next) {
    employeeService.delete(req.params.id)
        .then(() => res.json({ message: 'Employee deleted successfully' }))
        .catch(next);
}

function transfer(req, res, next) {
    employeeService.transfer(req.params.id, req.body)
        .then(employee => res.json({ 
            message: 'Employee transferred successfully',
            employee
        }))
        .catch(next);
}
