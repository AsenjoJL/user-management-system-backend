const config = require('../config.json');
const mysql = require('mysql2/promise');

async function resetTables() {
    try {
        const { host, port, user, password, database } = config.database;
        console.log(`Connecting to database: ${database} on ${host}:${port}`);
        
        // Connect to the database
        const connection = await mysql.createConnection({
            host,
            port,
            user, 
            password,
            database
        });
        
        console.log('Connected to database');
        
        // Drop existing employees table to remove FK constraints
        try {
            console.log('Dropping employees table if exists...');
            await connection.query('DROP TABLE IF EXISTS employees');
            console.log('Employees table dropped');
        } catch (err) {
            console.error('Error dropping employees table:', err.message);
        }
        
        // Create employees table with nullable departmentId
        try {
            console.log('Creating employees table...');
            await connection.query(`
                CREATE TABLE employees (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    employeeId VARCHAR(50) NOT NULL UNIQUE,
                    userId INT NOT NULL UNIQUE,
                    position VARCHAR(100) NOT NULL,
                    departmentId INT NULL,  /* THIS MUST BE NULL */
                    hireDate DATE NOT NULL,
                    status VARCHAR(20) NOT NULL DEFAULT 'Active',
                    created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated DATETIME,
                    FOREIGN KEY (userId) REFERENCES accounts(id) ON DELETE CASCADE,
                    FOREIGN KEY (departmentId) REFERENCES departments(id) ON DELETE SET NULL
                )
            `);
            console.log('Employees table created successfully');
        } catch (err) {
            console.error('Error creating employees table:', err.message);
        }
        
        console.log('Database reset completed');
        await connection.end();
        process.exit(0);
    } catch (err) {
        console.error('Database reset failed:', err);
        process.exit(1);
    }
}

resetTables();
