const db = require('../_helpers/db');

module.exports = {
    create,
    getAll,
    getById,
    update,
    delete: _delete,
    transfer
};

async function create(params) {
    try {
        // Validate required fields
        if (!params.employeeId) throw 'Employee ID is required';
        if (!params.userId) throw 'User ID is required';
        if (!params.position) throw 'Position is required';
        if (!params.departmentId) throw 'Department ID is required';
        if (!params.hireDate) throw 'Hire date is required';
        if (!params.status) throw 'Status is required';
        
        // Check if employeeId already exists
        const existingEmployee = await db.Employee.findOne({ 
            where: { employeeId: params.employeeId } 
        });
        
        if (existingEmployee) {
            throw 'Employee with this ID already exists';
        }
        
        // Check if the user is already associated with another employee
        const existingUserEmployee = await db.Employee.findOne({
            where: { userId: params.userId }
        });
        
        if (existingUserEmployee) {
            throw 'This user is already associated with another employee';
        }
        
        // Validate department exists
        if (params.departmentId) {
            const department = await db.Department.findByPk(params.departmentId);
            if (!department) throw 'Department not found';
        }
        
        // Create new employee
        const employee = await db.Employee.create({
            employeeId: params.employeeId,
            userId: params.userId,
            position: params.position,
            departmentId: params.departmentId,
            hireDate: params.hireDate,
            status: params.status,
            created: new Date()
        });
        
        // Create an onboarding workflow for the new employee
        try {
            if (db.Workflow) {
                const department = await db.Department.findByPk(params.departmentId);
                const departmentName = department ? department.name : 'New Department';
                
                await db.Workflow.create({
                    employeeId: employee.id,
                    type: 'Onboarding',
                    details: {
                        steps: [
                            { name: 'Welcome Package', completed: false },
                            { name: 'IT Setup', completed: false },
                            { name: 'HR Orientation', completed: false },
                            { name: `${departmentName} Orientation`, completed: false }
                        ],
                        department: departmentName
                    },
                    status: 'Pending',
                    createdDate: new Date()
                });
                console.log(`Onboarding workflow created for employee ID ${employee.id}`);
            } else {
                console.log('Workflow model not available, skipping workflow creation');
            }
        } catch (workflowError) {
            // Log the error but don't fail the employee creation
            console.error('Failed to create onboarding workflow:', workflowError);
        }
        
        return employee;
    } catch (error) {
        console.error('Employee creation error:', error);
        // Provide specific error messages
        if (error.name === 'SequelizeUniqueConstraintError') {
            throw 'Employee with this ID already exists';
        }
        throw error.message || error || 'Error creating employee';
    }
}

async function getAll() {
    try {
        // Fetch all employees with related models
        const employees = await db.Employee.findAll({
            include: [
                { model: db.Department, attributes: ['id', 'name'] },
                { model: db.Account, attributes: ['id', 'email', 'role', 'isActive'] }
            ]
        });
        
        return employees.map(e => {
            const json = e.get({ plain: true });
            // Format the response to match frontend expectations
            return {
                ...json,
                departmentName: json.Department ? json.Department.name : null,
                userEmail: json.Account ? json.Account.email : null
            };
        });
    } catch (error) {
        console.error('Error fetching employees:', error);
        throw error.message || error || 'Error fetching employees';
    }
}

async function getById(id) {
    try {
        // Find employee by ID with related data
        const employee = await db.Employee.findByPk(id, {
            include: [
                { model: db.Department, attributes: ['id', 'name'] },
                { model: db.Account, attributes: ['id', 'email', 'role', 'isActive'] }
            ]
        });
        
        if (!employee) throw 'Employee not found';
        
        const json = employee.get({ plain: true });
        return {
            ...json,
            departmentName: json.Department ? json.Department.name : null,
            userEmail: json.Account ? json.Account.email : null
        };
    } catch (error) {
        console.error(`Error fetching employee ID ${id}:`, error);
        throw error.message || error || 'Error fetching employee';
    }
}

async function update(id, params) {
    try {
        const employee = await getEmployee(id);
        
        // Check if employeeId is being changed and if it already exists
        if (params.employeeId && params.employeeId !== employee.employeeId) {
            const existingEmployee = await db.Employee.findOne({ 
                where: { employeeId: params.employeeId } 
            });
            
            if (existingEmployee) {
                throw 'Employee with this ID already exists';
            }
        }
        
        // Check if userId is being changed and if it's already associated with another employee
        if (params.userId && params.userId !== employee.userId) {
            const existingUserEmployee = await db.Employee.findOne({
                where: { userId: params.userId }
            });
            
            if (existingUserEmployee && existingUserEmployee.id !== parseInt(id)) {
                throw 'This user is already associated with another employee';
            }
        }
        
        // Copy params to employee and save
        Object.assign(employee, params);
        employee.updated = new Date();
        await employee.save();
        
        return employee;
    } catch (error) {
        console.error(`Error updating employee ID ${id}:`, error);
        throw error.message || error || 'Error updating employee';
    }
}

async function _delete(id) {
    try {
        const employee = await getEmployee(id);
        await employee.destroy();
    } catch (error) {
        console.error(`Error deleting employee ID ${id}:`, error);
        throw error.message || error || 'Error deleting employee';
    }
}

async function transfer(id, { departmentId }) {
    try {
        // Validate department ID
        if (!departmentId) throw 'Department ID is required';
        
        // Check if department exists
        const department = await db.Department.findByPk(departmentId);
        if (!department) throw 'Department not found';
        
        // Get employee and update department
        
        // Don't transfer if it's the same department
        const employee = await getEmployee(id);
        if (employee.departmentId === departmentId) {
            throw 'Employee is already in this department';
        }
        
        const oldDepartmentId = employee.departmentId;
        employee.departmentId = departmentId;
        employee.updated = new Date();
        await employee.save();
        
        // You could add workflow logic here
        // if (db.Workflow) {
        //    await db.Workflow.create({
        //        employeeId: employee.id,
        //        type: 'Transfer',
        //        details: { from: oldDepartmentId, to: departmentId },
        //        status: 'Completed'
        //    });
        // }
        
        return employee;
    } catch (error) {
        console.error(`Error transferring employee ID ${id}:`, error);
        throw error.message || error || 'Error transferring employee';
    }
}

// Helper functions
async function getEmployee(id) {
    const employee = await db.Employee.findByPk(id);
    if (!employee) throw 'Employee not found';
    return employee;
}
