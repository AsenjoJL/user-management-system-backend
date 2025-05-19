const db = require('../_helpers/db');

module.exports = {
    create,
    getAll,
    getById,
    update,
    delete: _delete
};

async function create(params) {
    try {
        // Simple validation
        if (!params.name) throw 'Department name is required';
        if (!params.description) throw 'Department description is required';
        
        // Create department
        const department = await db.Department.create({
            name: params.name,
            description: params.description,
            created: new Date()
        });
        
        return department;
    } catch (error) {
        console.error('Department creation error:', error);
        // Provide a better error message
        if (error.name === 'SequelizeUniqueConstraintError') {
            throw 'Department name already exists';
        }
        throw error.message || error || 'Unknown error creating department';
    }
}

async function getAll() {
    try {
        // First check if Employee model exists
        if (!db.Employee) {
            // Just return departments without employee count
            return await db.Department.findAll();
        }
        
        // Get departments with employee count if Employee model exists
        const departments = await db.Department.findAll({
            include: [{ 
                model: db.Employee, 
                attributes: ['id'],
                required: false 
            }]
        });
        
        // Transform the result to include employee count
        return departments.map(d => {
            const json = d.get({ plain: true });
            return {
                ...json,
                employeeCount: json.Employees ? json.Employees.length : 0,
                // Remove the Employees array from the response
                Employees: undefined
            };
        });
    } catch (error) {
        console.error('Error fetching departments:', error);
        throw 'Error fetching departments';
    }
}

async function getById(id) {
    try {
        let department;
        
        // First check if Employee model exists
        if (!db.Employee) {
            department = await db.Department.findByPk(id);
        } else {
            department = await db.Department.findByPk(id, {
                include: [{ 
                    model: db.Employee, 
                    attributes: ['id'],
                    required: false 
                }]
            });
        }
        
        if (!department) throw 'Department not found';
        
        const json = department.get({ plain: true });
        
        // Add employee count if Employees field exists
        if (json.Employees) {
            json.employeeCount = json.Employees.length;
            // Remove the Employees array from the response
            delete json.Employees;
        }
        
        return json;
    } catch (error) {
        console.error(`Error fetching department ID ${id}:`, error);
        throw error.message || error;
    }
}

async function update(id, params) {
    try {
        const department = await getDepartment(id);
        
        // Copy params to department and save
        Object.assign(department, params);
        department.updated = new Date();
        await department.save();
        
        return department;
    } catch (error) {
        console.error(`Error updating department ID ${id}:`, error);
        throw error.message || error;
    }
}

async function _delete(id) {
    try {
        const department = await getDepartment(id);
        await department.destroy();
    } catch (error) {
        console.error(`Error deleting department ID ${id}:`, error);
        throw error.message || error;
    }
}

// Helper functions
async function getDepartment(id) {
    const department = await db.Department.findByPk(id);
    if (!department) throw 'Department not found';
    return department;
}
