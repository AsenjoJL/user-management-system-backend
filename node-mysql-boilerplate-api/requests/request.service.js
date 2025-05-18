const db = require('../_helpers/db');

module.exports = {
    create,
    getAll,
    getById,
    getByEmployeeId,
    update,
    delete: _delete
};

async function create(params, userId) {
    try {
        console.log('Creating request with params:', JSON.stringify(params, null, 2));
        console.log('User ID:', userId);

        // Validate required fields
        if (!params.type) {
            throw new Error('Request type is required');
        }

        // First verify if user is associated with an employee
        let employee;
        
        if (params.employeeId) {
            // If employeeId is provided, use that
            employee = await db.Employee.findByPk(params.employeeId);
            if (!employee) {
                throw new Error('Employee not found');
            }
        } else {
            // Otherwise try to find the employee by userId
            employee = await db.Employee.findOne({ 
                where: { userId },
                include: [{
                    model: db.Account,
                    attributes: ['id', 'role']
                }]
            });
            if (!employee) {
                throw new Error('User is not registered as an employee');
            }
        }

        // Extract items from params
        const { requestItems, ...requestData } = params;
        
        // Validate request items
        if (!requestItems || !Array.isArray(requestItems) || requestItems.length === 0) {
            throw new Error('At least one request item is required');
        }

        // Validate each request item
        requestItems.forEach((item, index) => {
            if (!item.name) {
                throw new Error(`Request item ${index + 1} name is required`);
            }
            if (!item.quantity || item.quantity < 1) {
                throw new Error(`Request item ${index + 1} quantity must be at least 1`);
            }
        });

        console.log('Creating request with employee ID:', employee.id);
        console.log('Request data:', requestData);
        console.log('Request items:', requestItems);

        // Create request with validated data
        const request = await db.Request.create({
            employeeId: employee.id,
            type: requestData.type,
            description: requestData.description || '',
            status: 'Pending',
            createdDate: new Date()
        });

        console.log('Request created with ID:', request.id);

        // Create related request items
        const items = requestItems.map(item => ({
            requestId: request.id,
            name: item.name,
            quantity: item.quantity,
            description: item.description || ''
        }));

        console.log('Creating request items:', items);
        await db.RequestItem.bulkCreate(items);

        // Return the created request with items
        return getById(request.id);
    } catch (error) {
        console.error('Request creation error:', error);
        
        // Enhance error message for better debugging
        if (error.name === 'SequelizeValidationError') {
            const validationErrors = error.errors.map(e => e.message).join(', ');
            throw new Error(`Validation error: ${validationErrors}`);
        }
        if (error.name === 'SequelizeUniqueConstraintError') {
            throw new Error('A request with this information already exists');
        }
        if (error.name === 'SequelizeForeignKeyConstraintError') {
            throw new Error('Invalid reference: One or more referenced records do not exist');
        }
        if (error.name === 'SequelizeDatabaseError') {
            throw new Error('Database error occurred while creating request');
        }
        
        // If it's our own error, pass it through
        if (error.message) {
            throw error;
        }
        
        // For unknown errors, provide a generic message
        throw new Error('An unexpected error occurred while creating the request');
    }
}

async function getAll() {
    try {
        // Fetch all requests with related data
        const requests = await db.Request.findAll({
            include: [
                { 
                    model: db.Employee,
                    attributes: ['id', 'employeeId', 'userId', 'position'],
                    include: [{ 
                        model: db.Account, 
                        attributes: ['id', 'email', 'firstName', 'lastName', 'role'] 
                    }]
                },
                { 
                    model: db.RequestItem,
                    attributes: ['id', 'requestId', 'name', 'quantity', 'description']
                },
                { 
                    model: db.Account, 
                    as: 'Approver', 
                    foreignKey: 'approverId', 
                    attributes: ['id', 'email', 'firstName', 'lastName'] 
                }
            ],
            order: [['createdDate', 'DESC']]
        });

        console.log(`Found ${requests.length} requests`);
        return requests;
    } catch (error) {
        console.error('Error fetching requests:', error);
        if (error.name === 'SequelizeDatabaseError') {
            throw new Error('Database error: ' + error.message);
        }
        throw error.message || error || 'Error fetching requests';
    }
}

async function getById(id) {
    try {
        const request = await db.Request.findByPk(id, {
            include: [
                { 
                    model: db.Employee,
                    attributes: ['id', 'employeeId', 'userId', 'position'],
                    include: [{ 
                        model: db.Account, 
                        attributes: ['id', 'email', 'firstName', 'lastName'] 
                    }]
                },
                { 
                    model: db.RequestItem,
                    // Explicitly define the attributes to select
                    attributes: ['id', 'requestId', 'name', 'quantity', 'description']
                },
                { 
                    model: db.Account, 
                    as: 'Approver', 
                    foreignKey: 'approverId', 
                    attributes: ['id', 'email', 'firstName', 'lastName'] 
                }
            ]
        });

        if (!request) throw 'Request not found';
        return request;
    } catch (error) {
        console.error(`Error fetching request ID ${id}:`, error);
        throw error.message || error || 'Error fetching request';
    }
}

async function getByEmployeeId(employeeId) {
    try {
        // Verify if the employee exists
        const employee = await db.Employee.findByPk(employeeId);
        if (!employee) throw 'Employee not found';

        // Get requests for this employee
        const requests = await db.Request.findAll({
            where: { employeeId },
            include: [
                { 
                    model: db.RequestItem,
                    // Explicitly define the attributes to select
                    attributes: ['id', 'requestId', 'name', 'quantity', 'description']
                },
                { 
                    model: db.Account, 
                    as: 'Approver', 
                    foreignKey: 'approverId', 
                    attributes: ['id', 'email', 'firstName', 'lastName'] 
                }
            ],
            order: [['createdDate', 'DESC']]
        });

        return requests;
    } catch (error) {
        console.error(`Error fetching requests for employee ${employeeId}:`, error);
        throw error.message || error || 'Error fetching employee requests';
    }
}

async function update(id, params) {
    try {
        const request = await getRequestById(id);
        const { requestItems, ...requestData } = params;

        // Handle status changes
        if (requestData.status && requestData.status !== request.status) {
            if (requestData.status === 'Approved' || requestData.status === 'Rejected') {
                // Record the approver
                requestData.approverId = params.approverId;
            }
        }

        // Update the request
        Object.assign(request, requestData);
        request.updatedDate = new Date();
        await request.save();

        // Handle item updates
        if (requestItems && Array.isArray(requestItems)) {
            // Delete existing items
            await db.RequestItem.destroy({ where: { requestId: id } });
            
            // Create new items
            const items = requestItems.map(item => ({
                requestId: id,
                name: item.name,
                quantity: item.quantity || 1,
                description: item.description || ''
            }));

            await db.RequestItem.bulkCreate(items);
        }

        // Return the updated request with items
        return getById(id);
    } catch (error) {
        console.error(`Error updating request ID ${id}:`, error);
        throw error.message || error || 'Error updating request';
    }
}

async function _delete(id) {
    try {
        const request = await getRequestById(id);
        
        // Delete associated items first
        await db.RequestItem.destroy({ where: { requestId: id } });
        
        // Then delete the request
        await request.destroy();
    } catch (error) {
        console.error(`Error deleting request ID ${id}:`, error);
        throw error.message || error || 'Error deleting request';
    }
}

// Helper function
async function getRequestById(id) {
    const request = await db.Request.findByPk(id);
    if (!request) throw 'Request not found';
    return request;
}
