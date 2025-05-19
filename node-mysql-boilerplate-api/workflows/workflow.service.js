const db = require('../_helpers/db');

module.exports = {
    create,
    getAll,
    getById,
    getByEmployeeId,
    update,
    updateStatus,
    delete: _delete,
    createOnboarding,
    getRecentOnboardings
};

async function create(params) {
    try {
        // Validate required fields
        if (!params.employeeId) throw 'Employee ID is required';
        if (!params.type) throw 'Workflow type is required';
        
        // Verify if the employee exists
        const employee = await db.Employee.findByPk(params.employeeId);
        if (!employee) throw 'Employee not found';
        
        // Create workflow with validated data
        const workflow = await db.Workflow.create({
            employeeId: params.employeeId,
            type: params.type,
            details: params.details || {},
            status: params.status || 'Pending',
            comments: params.comments,
            createdDate: new Date()
        });
        
        return workflow;
    } catch (error) {
        console.error('Workflow creation error:', error);
        throw error.message || error || 'Error creating workflow';
    }
}

async function getAll() {
    try {
        // Fetch all workflows with related employee data
        const workflows = await db.Workflow.findAll({
            include: [{ 
                model: db.Employee,
                attributes: ['id', 'employeeId', 'position', 'departmentId'],
                include: [{ 
                    model: db.Department, 
                    attributes: ['id', 'name'] 
                }]
            }],
            order: [['createdDate', 'DESC']]
        });
        
        return workflows;
    } catch (error) {
        console.error('Error fetching workflows:', error);
        throw error.message || error || 'Error fetching workflows';
    }
}

async function getById(id) {
    try {
        const workflow = await db.Workflow.findByPk(id, {
            include: [{ 
                model: db.Employee,
                attributes: ['id', 'employeeId', 'position', 'departmentId'],
                include: [{ 
                    model: db.Department, 
                    attributes: ['id', 'name'] 
                }]
            }]
        });
        
        if (!workflow) throw 'Workflow not found';
        
        return workflow;
    } catch (error) {
        console.error(`Error fetching workflow ID ${id}:`, error);
        throw error.message || error || 'Error fetching workflow';
    }
}

async function getByEmployeeId(employeeId) {
    try {
        // Verify if the employee exists
        const employee = await db.Employee.findByPk(employeeId);
        if (!employee) throw 'Employee not found';
        
        // Get workflows for this employee
        const workflows = await db.Workflow.findAll({
            where: { employeeId },
            order: [['createdDate', 'DESC']]
        });
        
        return workflows;
    } catch (error) {
        console.error(`Error fetching workflows for employee ${employeeId}:`, error);
        throw error.message || error || 'Error fetching employee workflows';
    }
}

async function update(id, params) {
    try {
        const workflow = await getWorkflow(id);
        
        // Copy params to workflow and save
        Object.assign(workflow, params);
        workflow.updatedDate = new Date();
        await workflow.save();
        
        return workflow;
    } catch (error) {
        console.error(`Error updating workflow ID ${id}:`, error);
        throw error.message || error || 'Error updating workflow';
    }
}

async function updateStatus(id, { status, comments }) {
    try {
        // Validate the status value
        if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
            throw 'Invalid status. Must be Pending, Approved, or Rejected';
        }
        
        const workflow = await getWorkflow(id);
        
        // Update status and comments
        workflow.status = status;
        if (comments) workflow.comments = comments;
        workflow.updatedDate = new Date();
        await workflow.save();
        
        return workflow;
    } catch (error) {
        console.error(`Error updating status for workflow ID ${id}:`, error);
        throw error.message || error || 'Error updating workflow status';
    }
}

async function _delete(id) {
    try {
        const workflow = await getWorkflow(id);
        await workflow.destroy();
    } catch (error) {
        console.error(`Error deleting workflow ID ${id}:`, error);
        throw error.message || error || 'Error deleting workflow';
    }
}

async function createOnboarding(params) {
    try {
        // Validate required fields
        if (!params.employeeId) throw 'Employee ID is required';
        
        // Verify if the employee exists
        const employee = await db.Employee.findByPk(params.employeeId, {
            include: [{ model: db.Department }]
        });
        
        if (!employee) throw 'Employee not found';
        
        // Get employee department name
        let departmentName = 'Unknown Department';
        if (employee.Department) {
            departmentName = employee.Department.name;
        } else if (employee.departmentId) {
            const department = await db.Department.findByPk(employee.departmentId);
            if (department) {
                departmentName = department.name;
            }
        }
        
        // Check if employee already has an onboarding workflow
        const existingWorkflow = await db.Workflow.findOne({
            where: { 
                employeeId: params.employeeId,
                type: 'Onboarding'
            }
        });
        
        if (existingWorkflow) {
            // Return the existing workflow instead of creating a duplicate
            console.log(`Employee ${params.employeeId} already has an onboarding workflow`);
            return existingWorkflow;
        }
        
        // Create onboarding workflow with customizable steps
        const onboardingSteps = params.details?.steps || [
            { name: 'Welcome Package', completed: false },
            { name: 'IT Setup', completed: false },
            { name: 'HR Orientation', completed: false },
            { name: `${departmentName} Orientation`, completed: false }
        ];
        
        // Create onboarding workflow
        const workflow = await db.Workflow.create({
            employeeId: params.employeeId,
            type: 'Onboarding',
            details: {
                steps: onboardingSteps,
                department: departmentName,
                ...params.details
            },
            status: 'Pending',
            comments: params.comments || 'Automated onboarding workflow created',
            createdDate: new Date()
        });
        
        return workflow;
    } catch (error) {
        console.error('Error creating onboarding workflow:', error);
        throw error.message || error || 'Error creating onboarding workflow';
    }
}

async function getRecentOnboardings(days = 30) {
    try {
        const date = new Date();
        date.setDate(date.getDate() - days);
        
        const workflows = await db.Workflow.findAll({
            where: {
                type: 'Onboarding',
                createdDate: {
                    [db.Sequelize.Op.gte]: date
                }
            },
            include: [{ 
                model: db.Employee,
                attributes: ['id', 'employeeId', 'position', 'userId', 'departmentId'],
                include: [
                    { model: db.Department, attributes: ['id', 'name'] },
                    { model: db.Account, attributes: ['id', 'email', 'firstName', 'lastName'] }
                ]
            }],
            order: [['createdDate', 'DESC']]
        });
        
        // Format the response for frontend
        return workflows.map(w => {
            const json = w.get({ plain: true });
            
            // Add helper fields
            return {
                ...json,
                employeeName: json.Employee?.Account ? 
                    `${json.Employee.Account.firstName} ${json.Employee.Account.lastName}` : 
                    'Unknown',
                departmentName: json.Employee?.Department?.name || 'No Department',
                email: json.Employee?.Account?.email || 'No Email'
            };
        });
    } catch (error) {
        console.error('Error fetching recent onboardings:', error);
        throw error.message || error || 'Error fetching recent onboardings';
    }
}

// Helper function
async function getWorkflow(id) {
    const workflow = await db.Workflow.findByPk(id);
    if (!workflow) throw 'Workflow not found';
    return workflow;
}
