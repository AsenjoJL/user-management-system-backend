const config = require('../config.json');
const mysql = require('mysql2/promise');

async function fixEmployeeTable() {
    try {
        const { host, port, user, password, database } = config.database;
        console.log(`Connecting to MySQL at ${host}:${port} and database ${database}`);
        
        // Connect to the database
        const connection = await mysql.createConnection({
            host,
            port,
            user,
            password,
            database
        });
        
        // First, drop any existing foreign keys on the employees table
        console.log('Getting existing foreign keys on employees table...');
        const [fkResults] = await connection.query(`
            SELECT CONSTRAINT_NAME
            FROM information_schema.TABLE_CONSTRAINTS
            WHERE CONSTRAINT_TYPE = 'FOREIGN KEY'
            AND TABLE_NAME = 'employees'
            AND TABLE_SCHEMA = ?
        `, [database]);
        
        // Drop each foreign key
        for (const fk of fkResults) {
            console.log(`Dropping foreign key: ${fk.CONSTRAINT_NAME}`);
            await connection.query(`
                ALTER TABLE employees
                DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\`
            `);
        }
        
        // Now modify departmentId to be nullable
        console.log('Modifying departmentId column to be nullable...');
        await connection.query(`
            ALTER TABLE employees
            MODIFY departmentId INT NULL
        `);
        
        // Now add the foreign key constraint back
        console.log('Adding foreign key constraint back...');
        await connection.query(`
            ALTER TABLE employees
            ADD CONSTRAINT fk_employees_department
            FOREIGN KEY (departmentId) 
            REFERENCES departments(id)
            ON DELETE SET NULL
            ON UPDATE CASCADE
        `);
        
        console.log('Employee table fixed successfully!');
        console.log('You can now restart your application.');
        
        // Close the connection
        await connection.end();
        process.exit(0);
    } catch (error) {
        console.error('Error fixing employee table:', error);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run the fix
fixEmployeeTable();
